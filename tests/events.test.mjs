// World events: villagers hear them, and can react to one that happens at a place.
// Regression: "A fire breaks out at The Crooked Mug Tavern!" reached everyone's memories, but no option
// referred to it and the speech prompt left it out, so nobody went, helped, fled or talked about it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, api } from './harness.mjs';
import { speakerBlock } from '../public/src/ai/speech/prompt.js';
import { writeLine } from '../public/src/ai/speech/write.js';
import { startElection } from '../public/src/village/politics.js';
import { strangerTheft } from '../public/src/village/storyteller.js';

const FIRE = 'A fire breaks out at The Crooked Mug Tavern!';
const TAVERN = 'The Crooked Mug Tavern';

// A stand-in for Jev that records what it was sent and answers the event question with `reaction`.
function fakeJev(sent, reaction) {
  return async (url, opts) => {
    const body = JSON.parse(opts.body);
    sent.push(body);
    const keys = Object.keys(body.questions.action.criteria);
    const answers = { action: { probabilities: Object.fromEntries(keys.map(k => [k, /Tavern/.test(k) ? 0 : 1 / keys.length])) } };
    if (body.questions.event_reaction) answers.event_reaction = { probabilities: { [reaction]: 1 } };
    return { ok: true, json: async () => ({ answers }) };
  };
}

async function thinkWithJev(sim, npc, reaction, sent = []) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeJev(sent, reaction);
  sim.ai = true;
  try { return await api.think(npc); } finally { sim.ai = false; globalThis.fetch = realFetch; }
}

const awayFromTavern = sim => sim.npcs.find(n => n.age >= 16 && sim.placeAt(n.x, n.y)?.name !== TAVERN && sim.homeOf(n)?.name !== TAVERN);

test('a world event at a place gives each adult options to go there or keep away', () => {
  const sim = newWorld(31);
  api.worldEventAll(FIRE);
  const npc = awayFromTavern(sim);
  const keys = api.buildOptions(npc).map(o => o.key);
  assert.ok(keys.includes(`Rush to ${TAVERN}`));
  assert.ok(keys.includes(`Keep away from ${TAVERN}`));
});

test('Jev is told about the event and asked once how the villager reacts', async () => {
  const sim = newWorld(32);
  const npc = awayFromTavern(sim);
  api.worldEventAll(FIRE);
  const sent = [];
  const { act } = await thinkWithJev(sim, npc, 'help', sent);
  assert.ok(sent[0].state.recent_events.some(e => e.startsWith(FIRE)));
  assert.ok(sent[0].questions.event_reaction);
  assert.equal(act.type, 'move');
  assert.equal(act.target, TAVERN);
  await thinkWithJev(sim, npc, 'help', sent);
  assert.equal(sent[1].questions.event_reaction, undefined, 'asked only once');
});

test('a villager can decide to keep away', async () => {
  const sim = newWorld(33);
  const npc = awayFromTavern(sim);
  api.worldEventAll(FIRE);
  const { act } = await thinkWithJev(sim, npc, 'keep_away');
  assert.deepEqual(act, { type: 'move', target: sim.homeOf(npc).name });
});

test('helping out is remembered and appreciated, and not offered again', () => {
  const sim = newWorld(34);
  const tavern = sim.findPlace(TAVERN);
  const owner = sim.findNpc(tavern.biz?.owner || tavern.owner);
  const helper = sim.npcs.find(n => n.age >= 16 && n !== owner);
  api.worldEventAll(FIRE);
  Object.assign(helper, { x: tavern.x, y: tavern.y, action: null });
  const help = api.buildOptions(helper).find(o => o.key === `Help at ${TAVERN}`);
  assert.ok(help, 'offered to help on the spot');
  api.startAction(helper, help.act);
  helper.action.until = sim.time;
  api.stepNpc(helper, 1);
  assert.ok(helper.memory.some(m => m.text.includes(`You helped out at ${TAVERN}`)));
  if (owner) assert.ok(api.opinion(owner, helper.name) > 0);
  assert.ok(!api.buildOptions(helper).some(o => o.key === `Help at ${TAVERN}`));
});

test('the speech prompt carries the event, so villagers talk about it', () => {
  const sim = newWorld(35);
  const npc = sim.npcs.find(n => n.age >= 16);
  assert.doesNotMatch(speakerBlock(npc), /fire/);
  api.worldEventAll(FIRE);
  assert.match(speakerBlock(npc), /A fire breaks out at The Crooked Mug Tavern/);
});

// Regression: world events only reached memories, so a forced election or a second robbery left no trace
// in the chronicle, and the player saw nothing happen.
test('world events show in the chronicle', () => {
  const sim = newWorld(36);
  startElection('The gods demand a vote.');
  assert.match(sim.log.at(-1).text, /^🗳️ An election for village leader has been called!/);
  sim.npcs[0].inv.coins = sim.npcs[1].inv.coins = 50;
  strangerTheft();
  const logged = sim.log.length;
  strangerTheft(); // the robbery problem already exists, so no "New problem" entry either
  assert.equal(sim.log.length, logged + 1);
  assert.match(sim.log.at(-1).text, /has been robbed/);
});

// Regression: "Rewrite the world" changed what Jev saw, but speech still assumed a medieval village.
test('speech is written for the current world lore', async () => {
  const sim = newWorld(37);
  sim.lore = 'Oakhollow floats on a cloud above a sea of stars.';
  let sent = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { sent = JSON.parse(opts.body); return { ok: true, json: async () => ({ text: '{"line": "Hello."}' }) }; };
  try { await writeLine(sim.npcs[0], { type: 'say', intent: 'greet' }, sim.npcs[1]); } finally { globalThis.fetch = realFetch; }
  assert.match(sent.prompt, /WORLD: Oakhollow floats on a cloud/);
  assert.doesNotMatch(sent.system, /medieval/);
});

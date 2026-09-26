// The Voice: whispers get a reaction, and villagers who answer show up in Voices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, api } from './harness.mjs';

// A stand-in for Jev: every option but the Voice ones gets an equal share, and the reaction question gets `reaction`.
function fakeJev(reaction) {
  return async (url, opts) => {
    const { questions } = JSON.parse(opts.body);
    const keys = Object.keys(questions.action.criteria);
    const answers = { action: { probabilities: Object.fromEntries(keys.map(k => [k, /Voice/.test(k) ? 0 : 1 / keys.length])) } };
    if (questions.voice_reaction) answers.voice_reaction = { probabilities: { [reaction]: 1 } };
    return { ok: true, json: async () => ({ answers }) };
  };
}

async function thinkWithJev(sim, npc, reaction) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeJev(reaction);
  sim.ai = true;
  try { return await api.think(npc); } finally { sim.ai = false; globalThis.fetch = realFetch; }
}

test('a whisper asks the villager how they react, once', async () => {
  const sim = newWorld(21);
  const mira = sim.findNpc('Mira');
  api.whisper(mira, 'The old ruins are calling you.');
  assert.ok(api.buildQuestions(mira, api.buildOptions(mira), []).voice_reaction);
  await api.think(mira);
  assert.equal(api.buildQuestions(mira, api.buildOptions(mira), []).voice_reaction, undefined);
});

// Regression: Jev scored "Speak aloud to the Voice" 0 among the everyday options, so nobody ever answered.
test('a villager who answers the voice speaks to it, even when Jev scores the voice options 0', async () => {
  const sim = newWorld(22);
  const mira = sim.findNpc('Mira');
  api.whisper(mira, 'Can you hear me?');
  const { act } = await thinkWithJev(sim, mira, 'answer_aloud');
  assert.deepEqual(act, { type: 'voice', mode: 'speak' });
  mira.action = null;
  api.startAction(mira, act);
  assert.equal(sim.voiceMessages.length, 1);
  assert.equal(sim.voiceMessages[0].from, 'Mira');
});

test('a villager can answer the voice in thought, unheard by anyone nearby', async () => {
  const sim = newWorld(24);
  const [elena, others] = [sim.findNpc('Elena'), sim.npcs.filter(n => n.name !== 'Elena')];
  for (const o of others) { o.x = elena.x + 5; o.y = elena.y; }
  api.whisper(elena, 'I never left.');
  const { act } = await thinkWithJev(sim, elena, 'answer_in_thought');
  elena.action = null;
  api.startAction(elena, act);
  assert.equal(sim.voiceMessages.at(-1).from, 'Elena');
  assert.ok(others.every(o => !o.memory.some(m => /talking to the sky/.test(m.text))), 'nobody overheard it');
});

test('a villager can keep a whisper to themselves', async () => {
  const sim = newWorld(23);
  const bram = sim.findNpc('Bram');
  api.whisper(bram, 'Can you hear me?');
  const { act } = await thinkWithJev(sim, bram, 'keep_quiet');
  assert.notEqual(act.type, 'voice');
  assert.equal(api.buildQuestions(bram, api.buildOptions(bram), []).voice_reaction, undefined);
});

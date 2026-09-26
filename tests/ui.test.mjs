// UI smoke tests: draw the map and fill every panel in many village states, headless.
// They catch crashes, NaN coordinates and "undefined"/"NaN" leaking into the text.
// They don't judge how things look: that still needs a glance in the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';
import { newWorld, run, api } from './harness.mjs';

const { ctx, get } = installFakeDom();
const { resize } = await import('../public/src/ui/canvas.js');
const { render } = await import('../public/src/ui/render.js');
const { renderVillage } = await import('../public/src/ui/panels/village.js');
const { renderRoster, renderInspector } = await import('../public/src/ui/panels/people.js');
const { renderLog, renderVoices, renderTop } = await import('../public/src/ui/panels/feeds.js');

const BAD_TEXT = /undefined|NaN|\[object Object\]/;

function renderEverything(sim) {
  render();
  renderVillage(); renderRoster(); renderLog(); renderVoices(); renderTop();
  for (const npc of sim.npcs) { sim.selected = npc; render(); renderInspector(true); checkPanels(`inspecting ${npc.name}`); }
  sim.selected = null;
  checkPanels('village');
}

function checkPanels(when) {
  for (const id of ['villageInfo', 'roster', 'inspector', 'log', 'voices', 'clock', 'stats']) {
    const text = get(id).innerHTML + get(id).textContent;
    const bad = text.match(BAD_TEXT);
    assert.equal(bad, null, `#${id} shows "${bad?.[0]}" (${when}): …${text.slice(Math.max(0, bad?.index - 80), bad?.index + 40)}…`);
  }
  assert.deepEqual(ctx.__log.badArgs.slice(0, 3), [], `drawing with non-finite numbers (${when})`);
}

// Make the rarer states happen so their drawing and panel code runs too.
function stirThingsUp(sim) {
  const [a, b, c] = sim.npcs;
  a.partner = b.name; b.partner = a.name; a.spouse = b.name; b.spouse = a.name;
  api.startPregnancy(a, b);
  c.sick = { severity: 3, since: sim.time };
  c.health = 30;
  sim.places.find(p => p.type === 'house').condition = 25;
  sim.weather.kind = 'storm';
  sim.findPlace('Old Ruins').glowUntil = sim.time + 60;
  api.makePromise(a, c, { what: 'pay back 5 coins', kind: 'give', item: 'coins', amount: 5, hours: 10 });
  api.whisper(c, 'The ruins remember you.');
  api.die(sim.npcs[sim.npcs.length - 1], 'old age');
}

test('the map and every panel render without errors over two days', async () => {
  const sim = newWorld(31);
  resize();
  renderEverything(sim);
  for (let h = 0; h < 48; h += 6) { await run(360); renderEverything(sim); }
  assert.ok(ctx.__log.calls > 10000, 'the map was actually drawn');
});

test('rare states render too: storm, pregnancy, sickness, damage, promises, the Voice, a death', async () => {
  const sim = newWorld(32);
  resize();
  await run(600);
  stirThingsUp(sim);
  renderEverything(sim);
  sim.time += 13 * 60; // night
  renderEverything(sim);
  assert.match(get('villageInfo').innerHTML, /Expecting/);
  assert.match(get('villageInfo').innerHTML, /Damaged/);
  assert.match(get('villageInfo').innerHTML, /died on day/);
  assert.match(get('villageInfo').innerHTML, /pay back 5 coins/);
});

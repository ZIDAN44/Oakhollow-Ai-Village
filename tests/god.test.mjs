// The God panel's tools, driven through the same functions its buttons call.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newWorld } from './harness.mjs';
import { compileCustom } from '../public/src/ai/invent/imagine.js';
import { damagePlace } from '../public/src/world/buildings.js';

// A stand-in for the text model that designs one fair invention.
const fakeText = async () => ({
  ok: true,
  json: async () => ({ text: JSON.stringify({ inventions: [{ kind: 'action', label: 'x', text: 'writes a love letter', minutes: 30, where: null, target: true, effects: [{ type: 'mood', who: 'target', amount: 1 }] }] }) }),
});

// Regression: a possibility the player added was logged twice, once as "The world came up with a new idea".
test('a possibility added in God is not credited to the world', async () => {
  const sim = newWorld(41);
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeText;
  sim.speech = true;
  const logged = sim.log.length;
  try {
    const inv = await compileCustom('Write a love letter', 'writes a love letter by candlelight', null);
    assert.ok(inv?.fromPlayer);
  } finally { sim.speech = false; globalThis.fetch = realFetch; }
  assert.equal(sim.log.length, logged, 'the God panel writes the one chronicle entry itself');
  assert.equal(sim.inventions.at(-1).label, 'Write a love letter');
});

// Regression: "Surprise me" logged "A fire damaged the Hugo's Cottage", and robberies read "the The Crooked Mug Tavern".
test('place names read naturally in event text', () => {
  const sim = newWorld(42);
  const cottage = sim.places.find(p => /'s /.test(p.name));
  damagePlace(cottage, 10, 'a fire');
  assert.equal(sim.log.at(-1).text, `🏚️ A fire damaged ${cottage.name}.`);
  damagePlace(sim.findPlace('The Crooked Mug Tavern'), 10, 'the storm');
  assert.equal(sim.log.at(-1).text, '🏚️ The storm damaged The Crooked Mug Tavern.');
  damagePlace(sim.findPlace('Market'), 10, 'the storm');
  assert.equal(sim.log.at(-1).text, '🏚️ The storm damaged the Market.');
});

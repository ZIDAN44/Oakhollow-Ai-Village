// The God panel's tools, driven through the same functions its buttons call.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newWorld } from './harness.mjs';
import { compileCustom } from '../public/src/ai/invent/imagine.js';

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

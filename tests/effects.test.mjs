import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, api } from './harness.mjs';
import { EFFECT_DOCS } from '../public/src/effects/index.js';

test('values are clamped to safe ranges', () => {
  newWorld(1);
  const [e] = api.validateEffects([{ type: 'health', who: 'target', amount: 9999 }]);
  assert.equal(e.amount, 30);
  const [m] = api.validateEffects([{ type: 'mood', amount: -50 }]);
  assert.equal(m.amount, -2);
});

test('nothing comes from nothing: free gains are capped by what is spent', () => {
  newWorld(1);
  const free = api.validateEffects([{ type: 'item', who: 'self', item: 'coins', amount: 5 }]);
  assert.ok(free[0].amount <= 4, 'at most a small free gain');
  const paid = api.validateEffects([{ type: 'item', who: 'self', item: 'wood', amount: -3 }, { type: 'item', who: 'self', item: 'stool', amount: 2 }]);
  assert.equal(paid.find(e => e.item === 'stool').amount, 2);
});

test('invalid ideas are reported, not silently accepted', () => {
  newWorld(1);
  const issues = [];
  assert.deepEqual(api.validateEffects([{ type: 'teleport' }], {}, issues), []);
  assert.match(issues[0], /unknown effect type/);
  const issues2 = [];
  api.validateEffects([{ type: 'law', text: 'No singing' }], { allowLaw: false }, issues2);
  assert.match(issues2[0], /leader/);
  const issues3 = [];
  api.validateEffects([{ type: 'later', hours: 2, effects: [{ type: 'later', effects: [] }] }], {}, issues3);
  assert.ok(issues3.some(i => /nested/.test(i)));
});

test('every effect type is documented for the text model', () => {
  for (const t of ['item', 'transfer', 'need', 'build', 'rumor', 'sway', 'summon', 'later', 'status', 'gathering', 'law']) {
    assert.match(EFFECT_DOCS, new RegExp(`"type":"${t}"`), `${t} is missing from EFFECT_DOCS`);
  }
});

test('applying effects changes the world as described', () => {
  const sim = newWorld(1);
  const [mira, bram] = [sim.findNpc('Mira'), sim.findNpc('Bram')];
  const coins = mira.inv.coins;
  api.applyEffects(mira, bram, api.validateEffects([{ type: 'transfer', from: 'self', item: 'coins', amount: 3 }]), 'test');
  assert.equal(mira.inv.coins, coins - 3);
  const places = sim.places.length;
  api.applyEffects(bram, null, api.validateEffects([{ type: 'build', name: 'Bird Hide', desc: 'A hide' }]), 'test');
  assert.equal(sim.places.length, places + 1);
});

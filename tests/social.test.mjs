import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, api } from './harness.mjs';
import { addMod, relLabel } from '../public/src/social/relationships.js';
import { checkPromises } from '../public/src/social/promises.js';
import { marketPrice } from '../public/src/economy/market.js';

test('opinion reasons fade with their half-life', () => {
  const sim = newWorld(1);
  const [mira, bram] = [sim.findNpc('Mira'), sim.findNpc('Bram')];
  const base = api.opinion(mira, 'Bram');
  addMod(mira, 'Bram', 'test insult', { aff: -40 }, 10);
  const hit = base - api.opinion(mira, 'Bram');
  sim.time += 10 * 60;
  const later = base - api.opinion(mira, 'Bram');
  assert.ok(Math.abs(later - hit / 2) < 1, `after one half-life the effect halves (${hit} -> ${later})`);
  assert.equal(relLabel(bram, 'Nobody'), 'stranger');
});

test('romance respects attraction', () => {
  const sim = newWorld(1);
  assert.equal(api.canRomance(sim.findNpc('Bram'), sim.findNpc('Elena')), true);
  assert.equal(api.canRomance(sim.findNpc('Elena'), sim.findNpc('Bram')), false);
});

test('kept promises build trust; broken ones cost it', () => {
  const sim = newWorld(2);
  const [tob, sera, bram] = [sim.findNpc('Tobias'), sim.findNpc('Sera'), sim.findNpc('Bram')];
  api.makePromise(tob, sera, { kind: 'give', item: 'coins', amount: 5, what: 'pay for music', hours: 2 });
  api.keepPromise(sim.promises[0]);
  assert.ok(api.opinion(sera, 'Tobias', 'trust') > 0);
  const before = api.opinion(sera, 'Bram', 'trust');
  api.makePromise(bram, sera, { kind: 'help', what: 'fix the roof', hours: 2 });
  sim.time += 3 * 60;
  checkPromises();
  assert.ok(api.opinion(sera, 'Bram', 'trust') < before);
});

test('scarcity raises market prices', () => {
  const sim = newWorld(1);
  sim.market.food = 20;
  const cheap = marketPrice('food');
  sim.market.food = 0;
  assert.ok(marketPrice('food') > cheap);
});

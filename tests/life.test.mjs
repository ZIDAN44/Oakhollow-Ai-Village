import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, run, api } from './harness.mjs';
import { recover, fallSick } from '../public/src/life/health.js';
import { dailyArrivalsAndShortages } from '../public/src/village/daily.js';
import { GOMPERTZ_A, GOMPERTZ_B } from '../public/src/life/biology.js';

const marry = (a, b) => { a.spouse = b.name; b.spouse = a.name; a.partner = b.name; b.partner = a.name; };

test('a pregnancy leads to labour and a baby', async () => {
  const sim = newWorld(5);
  const [tob, sera] = [sim.findNpc('Tobias'), sim.findNpc('Sera')];
  marry(tob, sera);
  assert.ok(api.startPregnancy(tob, sera));
  assert.ok(sera.pregnancy, 'Sera (who can carry) is the one expecting');
  await run(Math.ceil((sera.pregnancy.due - sim.time) + 60));
  const baby = sim.npcs.find(n => n.parents.includes('Sera'));
  assert.ok(baby || sim.log.some(l => /stillborn/.test(l.text)), 'a baby is born (or, rarely, stillborn)');
  assert.ok(sim.log.some(l => /labour/.test(l.text)));
});

test('a couple who cannot conceive can adopt a foundling', async () => {
  const sim = newWorld(6);
  const [elena, sera] = [sim.findNpc('Elena'), sim.findNpc('Sera')];
  marry(elena, sera);
  assert.equal(api.canConceive(elena, sera), false);
  assert.equal(api.startPregnancy(elena, sera), false);
  sim.scheduled.push({ at: sim.time + 5, kind: 'foundling', parents: ['Elena', 'Sera'] });
  await run(10);
  const kid = sim.npcs.find(n => n.guardian === 'Elena');
  assert.ok(kid, 'a foundling was adopted');
});

test('a death brings a funeral the next day', () => {
  const sim = newWorld(7);
  api.die(sim.findNpc('Hugo'), 'old age');
  assert.ok(sim.gatherings.some(g => g.kind === 'funeral' && g.about === 'Hugo'));
  assert.ok(sim.findPlace('Graveyard').graves.includes('Hugo'));
});

test('recovering gives temporary immunity (SIR)', () => {
  const sim = newWorld(8);
  const bram = sim.findNpc('Bram');
  fallSick(bram, 'test');
  recover(bram, 'test');
  assert.ok(bram.immuneUntil > sim.time);
});

test('mortality risk rises with age (Gompertz)', () => {
  const h = age => GOMPERTZ_A * Math.exp(GOMPERTZ_B * age);
  assert.ok(h(80) > h(50) && h(50) > h(20));
  assert.ok(h(28) / h(20) > 1.8 && h(28) / h(20) < 2.2, 'roughly doubles every 8 years');
});

test('a bare farm warns the village about food (regression)', () => {
  const sim = newWorld(9);
  sim.findPlace('Hale Farm').res.amount = 2;
  dailyArrivalsAndShortages();
  assert.ok(sim.npcs.every(n => n.memory.some(m => /Food is getting scarce/.test(m.text))), 'everyone hears about it');
});

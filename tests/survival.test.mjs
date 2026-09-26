// Long-run invariants: the village should stay healthy and physically consistent for a week.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, run, api } from './harness.mjs';

for (const seed of [11, 22]) {
  test(`a week in the village keeps its invariants (seed ${seed})`, async () => {
    const sim = newWorld(seed);
    await run(1440 * 7);
    const starved = sim.dead.filter(d => /starvation|thirst/.test(d.cause));
    assert.deepEqual(starved.map(d => d.name), [], 'nobody starves or dies of thirst');
    for (const n of sim.npcs) {
      for (const v of [n.x, n.y, n.health, n.needs.hunger, n.needs.thirst, n.needs.energy]) assert.ok(Number.isFinite(v), `${n.name} has a non-finite value`);
      assert.ok(n.x >= 0 && n.x <= 1200 && n.y >= 0 && n.y <= 800, `${n.name} is off the map`);
      for (const [k, v] of Object.entries(n.inv)) assert.ok(v >= 0, `${n.name} has negative ${k}`);
      if (n.action?.type === 'move' || !n.action) {
        const inside = sim.placeAt(n.x, n.y);
        assert.ok(!(inside?.type === 'river' && (n.y < 375 || n.y > 415) && !sim.bridgeBroken && n.action?.type === 'move'), `${n.name} is swimming`);
      }
    }
    assert.ok(sim.log.length > 300, 'plenty happened');
    assert.ok(api.sim.npcs.length >= 4, 'the village is still populated');
  });
}

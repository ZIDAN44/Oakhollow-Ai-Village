import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, api } from './harness.mjs';

const SOLID = new Set(['house', 'tavern', 'hall', 'built']);
const centre = p => ({ x: p.x + p.w / 2, y: p.y + p.h / 2 });

function walk(sim, from, to) {
  const path = api.findPath(from.x, from.y, to.x, to.y);
  const fromPl = sim.placeAt(from.x, from.y), toPl = sim.placeAt(to.x, to.y);
  let p = { ...from };
  const hits = new Set();
  let swam = false;
  for (const [x, y] of path) {
    const n = Math.ceil(Math.hypot(x - p.x, y - p.y) / 4);
    for (let i = 1; i <= n; i++) {
      const qx = p.x + (x - p.x) * i / n, qy = p.y + (y - p.y) * i / n;
      for (const pl of sim.places) {
        if (SOLID.has(pl.type) && pl !== fromPl && pl !== toPl && qx > pl.x + 3 && qx < pl.x + pl.w - 3 && qy > pl.y + 3 && qy < pl.y + pl.h - 3) hits.add(pl.name);
      }
      if (qx > 892 && qx < 958 && (qy < 381 || qy > 409)) swam = true;
    }
    p = { x, y };
  }
  return { path, hits: [...hits], swam, arrives: Math.hypot(p.x - to.x, p.y - to.y) < 1 };
}

test('paths go around buildings and cross the river only by the bridge', () => {
  const sim = newWorld(1);
  const P = n => centre(sim.findPlace(n));
  const routes = [["Bram's Cabin", 'Eastern Road'], ["Hugo's Cottage", 'Common Fields'], ['Common Fields', "Mira's House"], ['Graveyard', 'Hale Farm'], ["Elena's House", 'The Crooked Mug Tavern']];
  for (const [a, b] of routes) {
    const r = walk(sim, P(a), P(b));
    assert.ok(r.arrives, `${a} -> ${b} should arrive`);
    assert.deepEqual(r.hits, [], `${a} -> ${b} walks through ${r.hits}`);
    assert.equal(r.swam, false, `${a} -> ${b} swam across the river`);
  }
});

test('walking to the river itself does not loop at the bridge (regression)', () => {
  const sim = newWorld(1);
  const r = walk(sim, centre(sim.findPlace('Whisperwood Forest')), { x: 920, y: 700 });
  assert.ok(r.arrives && r.path.length < 10);
});

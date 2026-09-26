// Test harness: runs the village headless in Node, deterministically.
// Math.random is replaced by a seeded PRNG (mulberry32) so every run with the same seed is identical,
// which lets us compare behaviour before and after a refactor (golden master testing).
import * as api from '../public/src/api.js';

export { api };

export function seedRandom(seed = 12345) {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A fresh offline world (no network: Jev and speech are off).
export function newWorld(seed = 12345) {
  seedRandom(seed);
  const { sim } = api;
  sim.ai = false; sim.speech = false;
  sim.nextId = 1;
  api.resetWorld();
  return sim;
}

// Advance the simulation by `minutes` game minutes, one minute at a time.
// Minds are asked sequentially (deterministic), unlike the browser, which asks several in parallel.
export async function run(minutes) {
  const { sim } = api;
  for (let m = 0; m < minutes; m++) {
    api.tickLife(1);
    for (const npc of [...sim.npcs]) {
      if (!sim.npcs.includes(npc)) continue;
      if (npc.action) { api.stepNpc(npc, 1); continue; }
      if (npc.age < 4) continue;
      if (sim.time >= npc.nextThinkAt) {
        const { act } = await api.think(npc);
        if (!npc.action && sim.npcs.includes(npc)) api.startAction(npc, act);
        npc.nextThinkAt = Math.max(npc.nextThinkAt, sim.time + 3);
      }
    }
    api.separate(1);
    api.updateSightings();
  }
  return sim;
}

// A compact fingerprint of the world, for golden-master comparison.
export function fingerprint(sim) {
  const people = sim.npcs.map(n => [n.name, n.age, Math.round(n.x), Math.round(n.y), Math.round(n.health), Math.round(n.needs.hunger),
    Object.entries(n.inv).filter(([, v]) => v).map(([k, v]) => k + v).join(','), n.action?.type || '-', n.memory.length]);
  return {
    time: sim.time,
    people,
    dead: sim.dead.map(d => [d.name, d.cause]),
    places: sim.places.map(p => [p.name, Math.round(p.condition ?? 100), p.res ? Math.round(p.res.amount) : null]),
    log: sim.log.length,
    lastLog: sim.log.slice(-15).map(l => l.text),
    problems: sim.problems.map(p => [p.title, Math.round(p.progress), p.solved]),
    inventions: sim.inventions.map(i => [i.label, i.uses]),
    gatherings: sim.gatherings.length, promises: sim.promises.length, leader: sim.leader,
  };
}

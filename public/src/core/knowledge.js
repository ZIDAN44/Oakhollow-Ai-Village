// Who has seen whom: last known positions instead of omniscience.
import { sim } from './state.js';

// People only know where others are if they've seen them (last known position), not by magic.
export function updateSightings() {
  const range = sim.sight();
  for (let i = 0; i < sim.npcs.length; i++) {
    const a = sim.npcs[i];
    for (let j = i + 1; j < sim.npcs.length; j++) {
      const b = sim.npcs[j];
      if (sim.dist(a, b) > range) continue;
      const pa = sim.placeAt(a.x, a.y)?.name || 'the open fields', pb = sim.placeAt(b.x, b.y)?.name || 'the open fields';
      if (a.action?.type !== 'sleep') (a.seen ||= {})[b.name] = { x: b.x, y: b.y, place: pb, at: sim.time };
      if (b.action?.type !== 'sleep') (b.seen ||= {})[a.name] = { x: a.x, y: a.y, place: pa, at: sim.time };
    }
  }
}

export function lastSeenText(npc, name) {
  const s = npc.seen?.[name];
  if (!s) return 'whereabouts unknown';
  const h = Math.round((sim.time - s.at) / 60);
  return s.guess ? `probably at ${s.place}` : h < 1 ? `just seen at ${s.place}` : `last seen at ${s.place} ${h}h ago`;
}

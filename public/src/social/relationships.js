// Relationships: a slow base plus fading reasons (Crusader Kings-style opinions).
import { sim } from '../core/state.js';
import { clamp } from '../core/util.js';
import { P, attractedTo } from '../identity/identity.js';

// ------------------------------------------------------------------ Relationships
// Opinions are a slow-moving base plus reasons ("modifiers") that fade with a half-life,
// like Crusader Kings. So grudges heal, and you can always see *why* someone feels as they do.

export function rel(a, bName) {
  a.rel = a.rel || {};
  if (!a.rel[bName]) a.rel[bName] = { met: false, base: { aff: 0, trust: 0, rom: 0 }, mods: [] };
  return a.rel[bName];
}

export function opinion(a, bName, key = 'aff') {
  const r = a.rel?.[bName];
  if (!r) return 0;
  let v = r.base[key] || 0;
  for (const m of r.mods) v += (m[key] || 0) * decay(m);
  return clamp(v, -100, 100);
}

export function decay(m) {
  if (!m.hl) return 1;
  return Math.pow(0.5, (sim.time - m.at) / 60 / m.hl);
}

// Add a reason to feel something. hl = half-life in game hours (0 = never fades).
export function addMod(a, bName, why, delta, hl = 48) {
  if (!a || !bName || a.name === bName) return;
  const r = rel(a, bName);
  r.met = true;
  const same = r.mods.find(m => m.why === why && sim.time - m.at < 360);
  if (same) {
    for (const k of ['aff', 'trust', 'rom']) if (delta[k]) same[k] = clamp((same[k] || 0) * decay(same) + delta[k], -60, 60);
    same.at = sim.time;
  } else {
    r.mods.push({ why, ...delta, at: sim.time, hl });
  }
  r.mods = r.mods.filter(m => Math.abs((m.aff || 0) + (m.trust || 0) + (m.rom || 0)) * decay(m) >= 0.5).slice(-12);
}

// Nudge the permanent base (used when Jev re-judges how someone feels).
export function driftBase(a, bName, key, target, rate) {
  const r = rel(a, bName);
  r.met = true;
  r.base[key] = clamp(r.base[key] + (target - opinion(a, bName, key)) * rate, -100, 100);
}

export function isFamily(a, b) {
  if (!a || !b) return false;
  if (a.parents?.includes(b.name) || b.parents?.includes(a.name)) return true;
  return Boolean(a.parents?.length && a.parents.some(p => b.parents?.includes(p)));
}

export function canRomance(a, b) {
  return a.age >= 18 && b.age >= 18 && !isFamily(a, b) && Math.abs(a.age - b.age) < 30 && attractedTo(a, b);
}

export function relLabel(a, bName) {
  const b = sim.findAnyone(bName);
  if (a.spouse === bName) return 'spouse';
  if (a.partner === bName) return 'partner';
  if (b && a.parents?.includes(bName)) return 'parent';
  if (b && b.parents?.includes(a.name)) return 'child';
  if (b && isFamily(a, b)) return 'sibling';
  const r = a.rel?.[bName];
  if (!r || !r.met) return 'stranger';
  const aff = opinion(a, bName), trust = opinion(a, bName, 'trust'), rom = opinion(a, bName, 'rom');
  const them = P(b).them;
  if (rom > 60) return `in love with ${them}`;
  if (rom > 30) return `has a crush on ${them}`;
  if (aff < -50) return 'enemy';
  if (aff < -20) return `dislikes ${them}`;
  if (trust < -40) return `distrusts ${them}`;
  if (aff > 60) return 'close friend';
  if (aff > 25) return 'friend';
  return 'acquaintance';
}

export function topReasons(a, bName, n = 3) {
  const r = a.rel?.[bName];
  if (!r) return [];
  return r.mods.map(m => ({ why: m.why, v: ((m.aff || 0) + (m.trust || 0) + (m.rom || 0)) * decay(m) }))
    .filter(x => Math.abs(x.v) >= 1).sort((x, y) => Math.abs(y.v) - Math.abs(x.v)).slice(0, n);
}

export function reputation(npc) {
  const others = sim.npcs.filter(o => o !== npc && o.rel?.[npc.name]?.met);
  if (!others.length) return 0;
  return others.reduce((s, o) => s + opinion(o, npc.name), 0) / others.length;
}

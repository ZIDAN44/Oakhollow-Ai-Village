// Buildings wearing out, breaking and being repaired.
import { remember, worldEventAll } from '../core/memory.js';
import { sim } from '../core/state.js';
import { cap, clamp, theName } from '../core/util.js';

// ------------------------------------------------------------------ Buildings wear and break

export function damagePlace(p, amount, why) {
  p.condition = clamp((p.condition ?? 100) - amount, 0, 100);
  if (p.biz && p.condition < 40) p.biz.stock = {};
  worldEventAll(`${cap(why)} damaged ${theName(p.name)}${p.condition < 40 ? '. It is barely usable until repaired' : ''}.`, 6, '🏚️');
  const owner = sim.findNpc(p.owner || p.biz?.owner);
  if (owner) remember(owner, `Your ${p.name} was damaged by ${why}.`, null, 7);
}

export function repairPlace(p, amount) {
  p.condition = clamp((p.condition ?? 100) + amount, 0, 100);
}

export const usable = p => !p || (p.condition ?? 100) >= 40;

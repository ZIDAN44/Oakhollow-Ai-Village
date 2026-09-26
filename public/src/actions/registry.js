// Starting actions: walks people to where an action happens, then dispatches it to its verb.
import { sim } from '../core/state.js';

// Verbs register themselves here (see ./verbs/*), so this module never imports them.
export const VERBS = {};
export function defineVerbs(map) { Object.assign(VERBS, map); }

// ------------------------------------------------------------------ Starting an action

export function startAction(npc, act) {
  if (!act || !sim.npcs.includes(npc)) return;
  const here = sim.placeAt(npc.x, npc.y);
  const t = sim.time;
  const target = act.target && act.type !== 'move' ? sim.findNpc(act.target) : null;

  // Anything done *to* someone needs you standing next to them first.
  const needsNear = ['say', 'request', 'give', 'fight', 'steal', 'treat', 'respond', 'repay', 'punish', 'breakup', 'fire', 'invented', 'keepPromise', 'divorce'];
  if (target && needsNear.includes(act.type) && !act.remote && sim.dist(npc, target) > 55) {
    return startAction(npc, { type: 'move', target: target.name, then: act, thenLabel: act.type });
  }
  // Anything done *at* a place needs you there first.
  if (act.at) {
    const p = sim.findPlace(act.at);
    if (p && here !== p) return startAction(npc, { type: 'move', target: p.name, then: { ...act, at: null }, thenLabel: act.label });
  }

  return (VERBS[act.type] || VERBS.default)(npc, act, { here, t, target });
}

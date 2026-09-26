// Walking along planned paths, and following or searching for people.
import { breakLaw } from './crime.js';
import { finishAction } from './finish.js';
import { startAction } from './registry.js';
import { remember } from '../core/memory.js';
import { sim } from '../core/state.js';
import { P } from '../identity/identity.js';
import { findPath } from '../nav/nav.js';
import { noteArrival } from '../social/promises.js';
import { judgeAction } from '../village/laws.js';

export const WALK_SPEED = 28;

// ------------------------------------------------------------------ Moving

export function stepNpc(npc, dt) {
  const a = npc.action;
  if (!a) return;
  if (a.type === 'move' || a.type === 'leaving') walk(npc, a, dt);
  else if (a.type === 'sleep') { if (shouldWake(npc, a)) finishAction(npc); }
  else if (sim.time >= a.until) finishAction(npc);
}

function shouldWake(npc, a) {
  const h = sim.hour();
  const n = npc.needs;
  return n.energy >= 99 || sim.time >= a.until || (n.energy > 75 && h >= 6 && h < 20) || n.thirst > 92 || n.hunger > 92;
}

// Where the walker is heading: a fixed spot, or a person (once seen). Null if the person is gone.
function walkTarget(npc, a) {
  // Looking for someone: once you actually spot them, walk to them.
  if (a.seek) {
    const p = sim.findNpc(a.seek);
    if (!p) return null;
    if (sim.dist(npc, p) < sim.sight()) { a.person = a.seek; a.seek = null; }
  }
  if (!a.person) return { tx: a.dx, ty: a.dy, arrive: 2 };
  const p = sim.findNpc(a.person);
  return p ? { tx: p.x, ty: p.y, arrive: 34 } : null;
}

function walkSpeed(npc, dt) {
  let speed = WALK_SPEED * (npc.needs.energy < 10 || npc.health < 30 ? 0.5 : 1) * (npc.age < 8 ? 0.7 : 1) * (npc.pregnancy ? 0.8 : 1);
  if (sim.bridgeBroken && npc.x > 885 && npc.x < 965) { speed *= 0.25; if (Math.random() < 0.0008 * dt) npc.sleptOutside = true; }
  if (sim.weather.kind === 'storm' || sim.weather.kind === 'snow') speed *= 0.7;
  return speed;
}

function walk(npc, a, dt) {
  const target = walkTarget(npc, a);
  if (!target) { npc.action = null; return; }
  const { tx, ty, arrive } = target;
  const d = Math.hypot(tx - npc.x, ty - npc.y);
  const step = walkSpeed(npc, dt) * dt;
  if (d <= arrive + step) arriveAt(npc, a, target, d);
  else followPath(npc, a, tx, ty, step);
}

function arriveAt(npc, a, { tx, ty, arrive }, d) {
  if (!a.person) { npc.x = tx; npc.y = ty; }
  else if (d > 0) { const k = Math.max(0, d - arrive) / d; npc.x += (tx - npc.x) * k; npc.y += (ty - npc.y) * k; }
  if (a.type === 'leaving') { finishAction(npc); return; }
  npc.action = null;
  npc.nextThinkAt = sim.time;
  const here = sim.placeAt(npc.x, npc.y);
  if (a.seek) { // got there, but they weren't there
    const who = sim.findNpc(a.seek);
    remember(npc, `You looked for ${a.seek} at ${here?.name || `the spot you last saw ${P(who).them}`}, but ${P(who).they} ${P(who).were}n't there.`, null, 2);
    if (npc.seen) delete npc.seen[a.seek];
    return;
  }
  if (here) judgeAction(npc, `goes to ${here.name}`);
  if (here?.type === 'ruins' && sim.laws.includes('ban_ruins')) breakLaw(npc, 'entering the forbidden ruins');
  noteArrival(npc, here);
  if (a.then) startAction(npc, a.then);
}

// Follow an A* path; re-plan if the goal moved (following a person) or the map changed.
function followPath(npc, a, tx, ty, step) {
  const goalMoved = a.pathGoal && Math.hypot(a.pathGoal[0] - tx, a.pathGoal[1] - ty) > 40;
  const key = sim.places.length + '|' + sim.bridgeBroken;
  if (!a.path || goalMoved || a.pathKey !== key) { a.path = findPath(npc.x, npc.y, tx, ty); a.pathGoal = [tx, ty]; a.pathKey = key; }
  let left = step;
  while (left > 0 && a.path.length) {
    const [wx, wy] = a.path[0];
    const wd = Math.hypot(wx - npc.x, wy - npc.y);
    if (wd <= left) { npc.x = wx; npc.y = wy; left -= wd; a.path.shift(); }
    else { npc.x += (wx - npc.x) / wd * left; npc.y += (wy - npc.y) / wd * left; left = 0; }
  }
  if (!a.path.length) a.path = null;
}

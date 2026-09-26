// Finishing timed actions and applying their results.
import { finishBuild } from './build.js';
import { applyOutcome } from './outcomes.js';
import { remember } from '../core/memory.js';
import { practice, skill } from '../core/skills.js';
import { sim } from '../core/state.js';
import { depart } from '../life/arrivals.js';
import { injure } from '../life/health.js';
import { addMod } from '../social/relationships.js';

// ------------------------------------------------------------------ Finishing

export function finishAction(npc) {
  const a = npc.action;
  npc.action = null;
  npc.nextThinkAt = sim.time + 1;
  if (a && Object.hasOwn(ON_FINISH, a.type)) ON_FINISH[a.type](npc, a);
}

function gather(npc, a) {
  const place = sim.findPlace(a.place);
  if (!place?.res) return;
  const sk = skill(npc, place.res.skill);
  let n = 1 + Math.floor(sk / 35) + (npc.inv.tool > 0 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
  n = Math.min(n, Math.floor(place.res.amount));
  place.res.amount -= n;
  npc.inv[a.item] = (npc.inv[a.item] || 0) + n;
  practice(npc, place.res.skill, 1.5);
  if (npc.inv.tool > 0 && Math.random() < 0.08) { npc.inv.tool--; remember(npc, 'Your tool broke.', null, 2); }
  if (place.res.extra && Math.random() < 0.25) npc.inv[place.res.extra] = (npc.inv[place.res.extra] || 0) + 1;
  if (place.type === 'forest' && sim.season() !== 'Winter' && Math.random() < 0.4) { npc.inv.food = (npc.inv.food || 0) + 1; remember(npc, 'You foraged some berries and mushrooms too.', null, 1); }
  remember(npc, `You gathered ${n} ${a.item} at ${a.place}.`, null, 1);
  if (place.type === 'forest' && sim.problem('wolves') && Math.random() < 0.12) injure(npc, 20 + Math.random() * 25, 'attacked by wolves in the forest');
}

function lesson(npc, a) {
  if (a.teacher) { practice(npc, 'scholarship', 1); return; }
  const gain = 2 + Math.max(0, (a.teacherSkill - skill(npc, a.skill)) / 8);
  practice(npc, a.skill, gain);
  remember(npc, `${a.teacherName} taught you ${a.skill}. You feel more capable.`, null, 4);
  addMod(npc, a.teacherName, 'taught me', { aff: 6, trust: 4 }, 168);
}

const ON_FINISH = {
  gather, lesson,
  build: finishBuild,
  sleep(npc) { remember(npc, 'You woke up.', null, 1); npc.justWoke = true; },
  leaving: depart,
  do: applyOutcome,
};

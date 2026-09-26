// Civic verbs: problems, laws, elections, the ruins, inventions.
import { defineVerbs } from '../registry.js';
import { breakLaw, punish } from '../crime.js';
import { chronicle, say, witness, worldEventAll } from '../../core/memory.js';
import { sim } from '../../core/state.js';
import { DECREES } from '../../data/civic.js';
import { createGathering } from '../../life/gatherings.js';
import { addMod } from '../../social/relationships.js';
import { decree, repeal, startElection } from '../../village/politics.js';
import { contribute } from '../../village/problems.js';

export function verbProblem(npc, act, { here, t, target }) {
  const pr = sim.problems.find(p => p.id === act.id && !p.solved);
  if (!pr) return;
  npc.action = { type: 'do', until: t + 45, text: pr.label.toLowerCase().replace(/\(.*\)/, '').trim(), effect: 'problem', problemId: pr.id };
  say(npc, `*${npc.action.text}*`, 4000, 'action');
  if (pr.type === 'blue_lights' && sim.laws.includes('ban_ruins')) breakLaw(npc, 'entering the forbidden ruins');
  return;
}

export function verbDecree(npc, act, { here, t, target }) {
  decree(npc, act.law);
  say(npc, `Hear me! ${DECREES[act.law]}`, 6000);
  npc.action = { type: 'wait', until: t + 15 };
  return;
}

export function verbRepeal(npc, act, { here, t, target }) {
  repeal(npc, act.law);
  npc.action = { type: 'wait', until: t + 10 };
  return;
}

export function verbElection(npc, act, { here, t, target }) {
  startElection(`${npc.name} demanded a vote on who should lead.`);
  say(npc, 'I call for a vote! Let the village choose its leader.', 5000);
  npc.action = { type: 'wait', until: t + 10 };
  return;
}

export function verbPunish(npc, act, { here, t, target }) {
  npc._line = act.text; punish(npc, target, act.kind); npc._line = null; return;
}

export function verbFund(npc, act, { here, t, target }) {
  const pr = sim.problems.find(p => p.id === act.id);
  const cost = Math.min(sim.treasury, 10);
  sim.treasury -= cost;
  pr.progress = Math.min(100, pr.progress + cost * 3);
  worldEventAll(`${npc.name} spent ${cost} coins from the treasury on "${pr.title}".`, 4);
  if (pr.progress >= 100) contribute(npc, pr);
  npc.action = { type: 'wait', until: t + 10 };
  return;
}

export function verbCharity(npc, act, { here, t, target }) {
  const needy = sim.npcs.filter(o => o.age >= 16 && o.inv.coins < 5);
  if (!needy.length || sim.treasury < needy.length) return;
  const each = Math.floor(Math.min(sim.treasury, 30) / needy.length);
  needy.forEach(o => { o.inv.coins += each; addMod(o, npc.name, 'gave the poor money from the treasury', { aff: 10 }, 168); });
  sim.treasury -= each * needy.length;
  worldEventAll(`${npc.name} gave ${each} coins from the treasury to each villager in need.`, 6);
  npc.action = { type: 'wait', until: t + 10 };
  return;
}

export function verbOpenDoor(npc, act, { here, t, target }) {
  npc.action = { type: 'do', until: t + 30, text: 'strains to break the ancient seal', effect: 'openDoor' };
  say(npc, '*grips the iron seal and pulls...*', 5000, 'action');
  witness(npc, `${npc.name} is trying to break the seal on the door beneath the ruins!`, `${npc.name} tried to open the sealed door`, { radius: 300, importance: 9 });
  return;
}

export function verbReseal(npc, act, { here, t, target }) {
  npc.action = { type: 'do', until: t + 60, text: 'reinforces the seal with iron and wax', effect: 'reseal' };
  say(npc, '*reinforces the seal*', 4000, 'action');
  return;
}

export function verbInvented(npc, act, { here, t, target }) {
  const inv = sim.inventions.find(i => i.id === act.id);
  if (!inv) return;
  npc.action = { type: 'do', until: t + inv.minutes, text: inv.text, effect: 'invented', invId: inv.id, target: target?.name };
  say(npc, `*${inv.text}*`, 4500, 'action');
  witness(npc, `${npc.name} ${inv.text}${target ? ` with ${target.name}` : ''}.`, inv.uses === 0 ? `${npc.name} tried something new: ${inv.label.toLowerCase()}` : null, { importance: inv.uses === 0 ? 5 : 2 });
  chronicle(`${inv.uses === 0 ? '✨ ' : ''}${npc.name} ${inv.text}${target ? ` with ${target.name}` : ''}.`, npc, inv.uses === 0 ? 'invent' : '');
  return;
}

export function verbMeeting(npc, act, { here, t, target }) {
  const start = sim.time + 90;
  createGathering({ kind: 'meeting', title: `A village meeting called by ${npc.name}`, place: act.place || 'Village Hall', start, end: start + 120, host: npc.name });
  say(npc, 'Everyone! A village meeting at the hall!', 5000);
  npc.action = { type: 'wait', until: t + 10 };
  return;
}

defineVerbs({
  'problem': verbProblem,
  'decree': verbDecree,
  'repeal': verbRepeal,
  'election': verbElection,
  'punish': verbPunish,
  'fund': verbFund,
  'charity': verbCharity,
  'openDoor': verbOpenDoor,
  'reseal': verbReseal,
  'invented': verbInvented,
  'meeting': verbMeeting,
});

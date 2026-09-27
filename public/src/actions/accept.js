// What happens when someone says yes to a request.
import { startAction } from './registry.js';
import { give, treat } from './trade.js';
import { broadcast, chronicle, remember, say } from '../core/memory.js';
import { practice, skill } from '../core/skills.js';
import { sim } from '../core/state.js';
import { startPregnancy } from '../life/family.js';
import { createGathering } from '../life/gatherings.js';
import { addMod, opinion } from '../social/relationships.js';
import { theName } from '../core/util.js';

// ------------------------------------------------------------------ Accepted requests

export function onAccept(npc, from, req) {
  if (Object.hasOwn(ON_ACCEPT, req.kind)) ON_ACCEPT[req.kind](npc, from, req);
}

export const canFlirt = (a, b) => a.age >= 18 && b.age >= 18;

function court(npc, from) {
  npc.partner = from.name; from.partner = npc.name;
  addMod(npc, from.name, 'we are together', { rom: 20, aff: 10 }, 0);
  addMod(from, npc.name, 'we are together', { rom: 20, aff: 10 }, 0);
  broadcast(`${from.name} and ${npc.name} are now a couple!`, `${from.name} and ${npc.name} are courting`, 6);
  chronicle(`💕 ${from.name} and ${npc.name} are now a couple!`, from, 'life');
  from.lifeMemories.push(`${npc.name} and I became a couple on day ${sim.day()}.`);
  npc.lifeMemories.push(`${from.name} and I became a couple on day ${sim.day()}.`);
}

function marry(npc, from) {
  if (npc.spouse || from.spouse) { remember(from, `${npc.name} can't marry you: one of you is already married.`, null, 6); return; }
  npc.spouse = from.name; from.spouse = npc.name; npc.partner = from.name; from.partner = npc.name;
  const start = (Math.floor(sim.time / 1440) + 1) * 1440 + 16 * 60;
  createGathering({ kind: 'wedding', title: `The wedding of ${from.name} and ${npc.name}`, place: 'Village Square', start, end: start + 240, about: `${from.name} and ${npc.name}`, couple: [from.name, npc.name] });
  broadcast(`${from.name} and ${npc.name} are married! The whole village celebrates.`, `${from.name} and ${npc.name} got married`, 9);
  chronicle(`💍 ${from.name} and ${npc.name} are married!`, from, 'life');
  for (const p of [npc, from]) { p.lifeMemories.push(`I married ${p === npc ? from.name : npc.name} on day ${sim.day()}.`); p.moodScore = 4; }
  // Move in together, into whichever of them owns a home.
  const ownHome = sim.places.find(p => p.type === 'house' && (p.owner === npc.name || p.owner === from.name));
  if (ownHome) { npc.home = ownHome.name; from.home = ownHome.name; }
  for (const o of sim.npcs) if (o !== npc && o !== from && opinion(o, npc.name, 'rom') > 40) addMod(o, from.name, `married the one I love`, { aff: -20 }, 240);
}

function adopt(npc, from) {
  sim.scheduled.push({ at: sim.time + 1440 * (0.5 + Math.random()), kind: 'foundling', parents: [from.name, npc.name] });
  remember(from, 'You and ' + npc.name + ' have agreed to take in a child who needs a home.', null, 8);
  remember(npc, 'You and ' + from.name + ' have agreed to take in a child who needs a home.', null, 8);
  chronicle(`🏡 ${from.name} and ${npc.name} have decided to adopt a child.`, from, 'life');
}

function family(npc, from) {
  if (startPregnancy(from, npc)) return;
  remember(from, 'Neither of you can carry a child right now.', null, 5);
  remember(npc, 'Neither of you can carry a child right now.', null, 5);
}

function employ(npc, from, req) {
  const worker = req.kind === 'job' ? from : npc;
  const boss = req.kind === 'job' ? npc : from;
  const place = sim.places.find(p => p.biz?.owner === boss.name && (p.biz.kind === req.data.bizKind || p.name === req.data.place));
  if (!place) return;
  worker.job = { place: place.name, employer: boss.name, wage: 3 };
  place.biz.employees = [...new Set([...(place.biz.employees || []), worker.name])];
  broadcast(`${worker.name} now works for ${boss.name} at ${theName(place.name)}.`, `${worker.name} got a job at ${theName(place.name)}`, 4);
  chronicle(`💼 ${worker.name} now works at ${boss.name}'s ${place.name}.`, worker, 'life');
}

function teach(npc, from, req) {
  const t = sim.time, sk = req.data.skill;
  npc.action = { type: 'lesson', teacher: true, student: from.name, skill: sk, until: t + 50 };
  from.action = { type: 'lesson', teacher: false, teacherName: npc.name, skill: sk, until: t + 50, teacherSkill: skill(npc, sk) };
  from.thinking = false;
  say(npc, `*teaches ${from.name} ${sk}*`, 4000, 'action');
}

function sell(npc, from, req) {
  const d = req.data;
  if (!(npc.inv.coins >= d.price && (from.inv[d.item] || 0) >= d.qty)) return;
  npc.inv.coins -= d.price; from.inv.coins += d.price;
  from.inv[d.item] -= d.qty; npc.inv[d.item] = (npc.inv[d.item] || 0) + d.qty;
  practice(from, 'trade', 2);
  chronicle(`🤝 ${npc.name} bought ${d.qty} ${d.item} from ${from.name} for ${d.price} coins.`, from);
}

function drink(npc, from) {
  const tav = sim.findPlace('The Crooked Mug Tavern');
  if (tav) { startAction(npc, { type: 'move', target: tav.name }); startAction(from, { type: 'move', target: tav.name }); }
  addMod(npc, from.name, 'shared a drink with me', { aff: 5, rom: canFlirt(npc, from) ? 4 : 0 }, 72);
  addMod(from, npc.name, 'shared a drink with me', { aff: 5, rom: canFlirt(npc, from) ? 4 : 0 }, 72);
}

const ON_ACCEPT = {
  court, marry, adopt, family, sell, drink, teach,
  job: employ,
  hire: employ,
  meet(npc, from, req) { if (req.data?.place) startAction(npc, { type: 'move', target: req.data.place, then: { type: 'wait', minutes: 60 } }); },
  midwife(npc, from) { startAction(npc, { type: 'move', target: from.name }); remember(npc, `You are going to help ${from.name} through the birth.`, null, 7); },
  food(npc, from) { const item = npc.inv.bread > 0 ? 'bread' : 'food'; if (npc.inv[item] > 0) give(npc, from, item, 1, true); },
  loan(npc, from) {
    if (npc.inv.coins < 5) return;
    npc.inv.coins -= 5; from.inv.coins += 5; from.debts[npc.name] = (from.debts[npc.name] || 0) + 5;
    remember(from, `You owe ${npc.name} 5 coins.`, null, 5);
  },
  help(npc, from, req) { remember(npc, `You promised ${from.name} to help with "${req.data.title}".`, null, 5); npc.promise = req.data.title; },
  treat(npc, from) { treat(npc, from); },
};

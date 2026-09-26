// Results of finishing a 'do' activity (busking, brewing, producing, inventions, repairs...).
import { chronicle, remember } from '../core/memory.js';
import { practice, skill } from '../core/skills.js';
import { sim } from '../core/state.js';
import { BUSINESS_TYPES } from '../data/economy.js';
import { applyEffects, performInvention } from '../effects/index.js';
import { P } from '../identity/identity.js';
import { keepPromise } from '../social/promises.js';
import { addMod } from '../social/relationships.js';
import { contribute } from '../village/problems.js';
import { openSealedDoor } from '../village/ruins.js';
import { repairPlace } from '../world/buildings.js';

export function applyOutcome(npc, a) {
  if (a.skill) practice(npc, a.skill, 1.5);
  if (a.fx) applyEffects(npc, null, a.fx, a.text);
  if (Object.hasOwn(OUTCOMES, a.effect)) OUTCOMES[a.effect](npc, a);
}

const lift = (npc, by) => { npc.moodScore = Math.min(4, (npc.moodScore ?? 2) + by); };

function busk(npc) {
  let earned = 0;
  const tipChance = 0.3 + skill(npc, 'music') / 150;
  for (const o of sim.nearby(npc, 150)) if (o.age >= 12 && o.inv.coins >= 1 && Math.random() < tipChance) { o.inv.coins--; earned++; remember(o, `You tossed ${npc.name} a coin for the music.`, null, 1); }
  npc.inv.coins += earned;
  remember(npc, `You earned ${earned} coins playing music.`, null, 2);
  sim.nearby(npc, 150).forEach(o => { addMod(o, npc.name, 'played lovely music', { aff: 3 }, 48); o.moodScore = Math.min(4, (o.moodScore || 2) + 0.3); });
}

function teachClass(npc, biz) {
  const students = sim.nearby(npc, 90).filter(o => o.action?.type !== 'sleep');
  students.forEach(s => { practice(s, 'scholarship', 3); if (s.inv.coins >= 1) { s.inv.coins--; biz.till++; } addMod(s, npc.name, 'taught our class', { aff: 3 }, 96); });
  remember(npc, `You taught a class to ${students.length} students.`, null, 3);
}

function produce(npc, a) {
  const place = sim.findPlace(a.place);
  const biz = place?.biz;
  if (!biz) return;
  const def = BUSINESS_TYPES[biz.kind] || biz.def;
  practice(npc, def.skill, 2);
  if (biz.kind === 'school') teachClass(npc, biz);
  else {
    const bonus = skill(npc, def.skill) > 60 ? 1 : 0;
    for (const [k, v] of Object.entries(def.out)) biz.stock[k] = (biz.stock[k] || 0) + v + bonus;
    remember(npc, `You worked at the ${place.name}: ${Object.entries(def.out).map(([k, v]) => `${v + bonus} ${k}`).join(', ')} made.`, null, 2);
  }
  if (a.shift) payWage(npc, place);
}

function invented(npc, a) {
  const inv = sim.inventions.find(i => i.id === a.invId);
  if (!inv) return;
  const target = a.target ? sim.findNpc(a.target) : null;
  const ok = performInvention(npc, target, inv);
  inv.uses++;
  inv.lastUsed = { ...(inv.lastUsed || {}), [npc.name]: sim.time };
  if (ok) inv.successes = (inv.successes || 0) + 1;
  if (inv.effects.some(e => e.type === 'build') && !inv.shared) inv.built = true;
  if (inv.by !== npc.name) { const author = sim.findNpc(inv.by); if (author) addMod(author, npc.name, `took up my idea (${inv.label.toLowerCase()})`, { aff: 3 }, 96); }
  remember(npc, `You ${inv.text}${target ? ` with ${target.name}` : ''}.`, null, 3);
  if (target) remember(target, `${npc.name} ${inv.text} with you.`, null, 4);
}

function repair(npc, a) {
  const p = sim.findPlace(a.place);
  if (!p) return;
  repairPlace(p, 40 + skill(npc, 'crafting') / 3);
  remember(npc, `You repaired the ${p.name}.`, `${npc.name} repaired the ${p.name}`, 4);
  const o = sim.findNpc(p.owner || p.biz?.owner);
  if (o && o !== npc) addMod(o, npc.name, `repaired my ${p.name}`, { aff: 10, trust: 5 }, 168);
}

function reseal(npc) {
  if (sim.sealedDoor !== 'found') { remember(npc, 'Too late. The door has already been opened.', null, 5); return; }
  sim.sealedDoor = 'hidden';
  const pr = sim.problems.find(p => p.type === 'blue_lights');
  if (pr) { pr.solved = false; pr.progress = 50; }
  remember(npc, 'You resealed the door beneath the ruins. For now.', `${npc.name} resealed the door beneath the ruins`, 8);
  chronicle(`🔒 ${npc.name} resealed the door beneath the Old Ruins.`, npc, 'event');
}

const OUTCOMES = {
  busk, produce, invented, repair, reseal,
  herbs(npc) { const n = 1 + Math.floor(skill(npc, 'herbalism') / 30); npc.inv.herbs += n; remember(npc, `You gathered ${n} herbs.`, null, 1); },
  brew(npc) { npc.inv.remedy++; remember(npc, 'You brewed a remedy.', null, 2); },
  craftTool(npc) { npc.inv.tool++; remember(npc, 'You crafted a sturdy tool.', null, 3); },
  story(npc) { sim.nearby(npc, 150).forEach(o => addMod(o, npc.name, 'told a good story', { aff: 2 }, 48)); },
  calm(npc) { lift(npc, 0.4); },
  ale(npc) { lift(npc, 0.6); const tav = sim.findPlace('The Crooked Mug Tavern'); if (tav?.biz) tav.biz.till += 2; },
  play(npc) { npc.moodScore = 4; sim.nearby(npc, 80).filter(o => o.age < 16).forEach(o => addMod(o, npc.name, 'played with me', { aff: 5 }, 72)); },
  study(npc, a) { practice(npc, a.skill, 3); practice(npc, 'scholarship', 1); remember(npc, `You studied ${a.skill}.`, null, 2); },
  problem(npc, a) { const pr = sim.problems.find(p => p.id === a.problemId); if (pr) contribute(npc, pr); },
  promise(npc, a) { const pr = sim.promises.find(p => p.id === a.promiseId); if (pr) keepPromise(pr); },
  openDoor(npc) { if (sim.sealedDoor !== 'found') return; openSealedDoor(npc); npc.lifeMemories.push(`I opened the sealed door beneath the ruins on day ${sim.day()}.`); },
};

export function payWage(worker, place) {
  const biz = place.biz;
  const owner = sim.findNpc(biz.owner);
  const wage = worker.job?.wage || 3;
  const paid = Math.min(wage, biz.till);
  biz.till -= paid; worker.inv.coins += paid;
  if (paid < wage) {
    remember(worker, `${biz.owner} couldn't pay your full wage (${paid} of ${wage} coins).`, `${biz.owner} can't pay ${P(owner).their} workers`, 6);
    if (owner) addMod(worker, owner.name, 'did not pay my wages', { aff: -8, trust: -10 }, 168);
  } else remember(worker, `You earned ${paid} coins for your shift.`, null, 2);
}

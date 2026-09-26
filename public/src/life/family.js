// Pregnancy, birth, foundlings, adoption and orphans.
import { broadcast, chronicle, remember, wake, witness, worldEventAll } from '../core/memory.js';
import { practice, skill } from '../core/skills.js';
import { sim } from '../core/state.js';
import { pick } from '../core/util.js';
import { CHILD_NAMES, NPC_COLORS } from '../data/people.js';
import { P, carrierOf, randomIdentity } from '../identity/identity.js';
import { MATERNAL_RISK, MIDWIFE_FACTOR, PREGNANCY_YEARS, STILLBIRTH_RISK } from './biology.js';
import { carerOf } from './body.js';
import { die } from './death.js';
import { addMod, opinion, rel } from '../social/relationships.js';
import { usable } from '../world/buildings.js';
import { makeNpc } from '../world/setup.js';

export function progressPregnancies() {
  // ---- Pregnancy: labour starts a few hours before the due time.
  for (const n of [...sim.npcs]) {
    const p = n.pregnancy;
    if (!p) continue;
    if (!p.labour && sim.time >= p.due - 180) {
      p.labour = true;
      remember(n, 'Your labour has started! The baby is coming within hours.', `${n.name} has gone into labour`, 9);
      witness(n, `${n.name} has gone into labour!`, `${n.name} has gone into labour`, { radius: 400, importance: 8 });
      chronicle(`🤰 ${n.name} has gone into labour!`, n, 'life');
      wake(n);
    }
    if (sim.time >= p.due) giveBirth(n);
  }
}

export function careForOrphans() {
  // ---- Orphans: a toddler with nobody to care for them gets taken in.
  for (const c of sim.npcs.filter(x => x.age < 12 && !carerOf(x))) {
    c.orphanSince = c.orphanSince ?? sim.time;
    if (sim.time - c.orphanSince > 720) {
      const adopter = sim.npcs.filter(o => o.age >= 18 && o.home).sort((a, b) => (opinion(b, c.name) + (b.spouse ? 10 : 0)) - (opinion(a, c.name) + (a.spouse ? 10 : 0)))[0];
      if (adopter) adopt(adopter, c, true);
    }
  }
}

// ------------------------------------------------------------------ Family: pregnancy, birth, adoption

export function startPregnancy(a, b) {
  if (a.immortal || b.immortal) return false;
  const carrier = carrierOf(a, b);
  if (!carrier) return false;
  const other = carrier === a ? b : a;
  const days = PREGNANCY_YEARS * sim.bioYearDays();
  carrier.pregnancy = { other: other.name, since: sim.time, due: sim.time + days * 1440, labour: false };
  for (const p of [a, b]) remember(p, `${carrier === p ? 'You are' : `${carrier.name} is`} expecting your child! The baby is due in about ${Math.round(days * 10) / 10} days.`, `${carrier.name} is expecting ${other.name}'s baby`, 9);
  chronicle(`🤰 ${carrier.name} is expecting ${other.name}'s child!`, carrier, 'life');
  return true;
}

// Birth happens wherever the carrier is. A bed and a healer make it safer.
export function giveBirth(mother) {
  const p = mother.pregnancy;
  mother.pregnancy = null;
  const other = sim.findAnyone(p.other);
  const here = sim.placeAt(mother.x, mother.y);
  const healer = sim.nearby(mother, 90).filter(o => skill(o, 'herbalism') >= 35 && o.action?.type !== 'sleep').sort((x, y) => skill(y, 'herbalism') - skill(x, 'herbalism'))[0];
  const setting = here?.clinic ? 0.7 : here?.bed && usable(here) ? 1 : 2;
  const help = healer ? MIDWIFE_FACTOR * (1 - skill(healer, 'herbalism') / 300) : 1;
  const risk = sim.settings.mortality ? 1 : 0;
  const where = here?.name || 'out in the open';
  if (healer) {
    practice(healer, 'herbalism', 4);
    addMod(mother, healer.name, 'delivered my baby', { aff: 25, trust: 20 }, 0);
    if (other && sim.npcs.includes(other)) addMod(other, healer.name, 'delivered our baby', { aff: 20, trust: 15 }, 0);
    chronicle(`🌿 ${healer.name} helps ${mother.name} through the birth.`, healer, 'life');
  }
  if (Math.random() < STILLBIRTH_RISK * setting * help * risk) {
    remember(mother, 'The baby was born still. You held the little one for a while.', `${mother.name}'s baby was stillborn`, 10);
    mother.lifeMemories.push(`Day ${sim.day()}: I lost our baby at birth.`);
    mother.grief = { name: 'the baby', at: sim.time }; mother.moodScore = 0;
    if (other && sim.npcs.includes(other)) { other.grief = { name: 'the baby', at: sim.time }; remember(other, `Your baby with ${mother.name} was stillborn.`, null, 10); }
    worldEventAll(`${mother.name}'s baby was stillborn. The village grieves with them.`, 8);
  } else {
    birth(mother, other, where);
  }
  if (Math.random() < MATERNAL_RISK * setting * help * risk) die(mother, 'complications of childbirth');
}

export function birth(mother, other, where) {
  if (!sim.settings.births) return;
  const used = new Set([...sim.npcs, ...sim.dead, ...sim.departed].map(n => n.name));
  const name = CHILD_NAMES.find(c => !used.has(c)) || `${pick(CHILD_NAMES)} ${mother.name.slice(0, 1)}.`;
  const parents = [mother, other].filter(Boolean);
  const traits = parents.map(p => p.personality.split(/[,.]/)[0].trim().toLowerCase());
  const child = makeNpc({
    name, age: 0, role: 'child', color: NPC_COLORS[(sim.npcs.length + sim.dead.length) % NPC_COLORS.length],
    home: mother.home, start: mother.home || 'Village Square', parents: parents.map(p => p.name),
    personality: `A child with a parent's ${traits.join(' and ')} streak.`,
    goal: 'Play, explore, and be loved.', dream: 'growing up to be like my parents', inv: {}, bornDay: sim.day(),
  });
  child.ageFrac = 0;
  const id = randomIdentity(true);
  Object.assign(child, id);
  child.x = mother.x + 10; child.y = mother.y + 10;
  sim.npcs.push(child);
  for (const p of parents) {
    p.children.push(name);
    addMod(p, name, 'my child', { aff: 80, trust: 50 }, 0);
    addMod(child, p.name, 'my parent', { aff: 70, trust: 70 }, 0);
    if (sim.npcs.includes(p)) { p.lifeMemories.push(`Our child ${name} was born on day ${sim.day()} at ${where}.`); p.moodScore = 4; }
  }
  for (const o of sim.npcs) if (o !== child) { rel(child, o.name).met = true; rel(o, name).met = true; }
  broadcast(`${parents.map(p => p.name).join(' and ')} welcomed a baby named ${name}!`, `${parents.map(p => p.name).join(' and ')} had a baby called ${name}`, 7);
  chronicle(`👶 A baby ${child.gender === 'woman' ? 'girl' : 'boy'}, ${name}, is born to ${parents.map(p => p.name).join(' and ')} at ${where}!`, child, 'life');
}

// A baby left on the steps of the Village Hall, taken in by a couple who asked to adopt.
export function foundling(parentNames) {
  const parents = parentNames.map(p => sim.findNpc(p)).filter(Boolean);
  if (!parents.length) return;
  const used = new Set([...sim.npcs, ...sim.dead, ...sim.departed].map(n => n.name));
  const name = CHILD_NAMES.find(c => !used.has(c)) || `Foundling ${sim.nextId}`;
  const hall = sim.findPlace('Village Hall');
  const child = makeNpc({ name, age: 0, role: 'child', color: NPC_COLORS[(sim.npcs.length + sim.dead.length) % NPC_COLORS.length], home: parents[0].home, start: 'Village Hall', personality: 'A foundling, quiet and watchful.', goal: 'Play, explore, and be loved.', dream: 'finding out where I came from', inv: {}, bornDay: sim.day() });
  Object.assign(child, randomIdentity(true));
  child.ageFrac = 0;
  if (hall) { child.x = hall.x + hall.w / 2; child.y = hall.y + hall.h + 4; }
  sim.npcs.push(child);
  for (const p of parents) adopt(p, child, false);
  child.guardian = parents[0].name;
  for (const o of sim.npcs) if (o !== child) { rel(child, o.name).met = true; rel(o, name).met = true; }
  broadcast(`A baby was found on the steps of the Village Hall. ${parentNames.join(' and ')} have adopted ${P(child).them} and named ${P(child).them} ${name}.`, `${parentNames.join(' and ')} adopted a foundling called ${name}`, 8);
  chronicle(`🧺 A foundling, ${name}, is adopted by ${parentNames.join(' and ')}.`, child, 'life');
}

export function adopt(adult, child, arranged) {
  child.guardian = adult.name;
  child.home = adult.home;
  child.orphanSince = null;
  adult.children.push(child.name);
  addMod(adult, child.name, 'my adopted child', { aff: 60, trust: 40 }, 0);
  addMod(child, adult.name, 'took me in', { aff: 60, trust: 60 }, 0);
  adult.lifeMemories.push(`I took in ${child.name} on day ${sim.day()}.`);
  broadcast(`${adult.name} has taken in ${child.name}${arranged ? `, who had nobody left to care for ${P(child).them}` : ''}.`, `${adult.name} adopted ${child.name}`, 7);
  chronicle(`🏡 ${adult.name} has taken in ${child.name}.`, adult, 'life');
}

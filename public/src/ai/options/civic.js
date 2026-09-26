// Options for problems, politics, life events, grief, the Voice and inventions.
import { relevantInventions } from '../invent/library.js';
import { lastSeenText } from '../../core/knowledge.js';
import { skill, skillWord } from '../../core/skills.js';
import { sim } from '../../core/state.js';
import { DECREES } from '../../data/civic.js';
import { describeEffects, requirementsMet } from '../../effects/index.js';
import { P } from '../../identity/identity.js';
import { opinion } from '../../social/relationships.js';
import { usable } from '../../world/buildings.js';

// Problems to solve
export function optionsProblemsToSolve(npc, ctx) {
  const { here, add } = ctx;
  for (const pr of sim.problems.filter(p => !p.solved)) {
    const where = pr.place ? sim.findPlace(pr.place) : null;
    const desc = `${pr.desc} (${Math.round(pr.progress)}% solved; uses ${pr.skill}, you are ${skillWord(skill(npc, pr.skill))}).`;
    add(`${pr.label}${where && here !== where ? ` at ${where.name}` : ''}`, desc, { type: 'problem', id: pr.id, at: where && here !== where ? where.name : null, label: pr.label });
    if (sim.leader === npc.name && sim.treasury >= 5) add(`Pay for "${pr.title}" from the treasury`, `Treasury has ${sim.treasury} coins.`, { type: 'fund', id: pr.id });
  }
  if (sim.sealedDoor === 'found' && here?.type === 'ruins') {
    add('Break the seal and open the door beneath the ruins', 'Nobody knows what is behind it. It could be treasure, or something terrible.', { type: 'openDoor' });
    add('Reinforce the seal on the door', 'Make sure nothing gets out.', { type: 'reseal' });
  }
}

// Leadership and politics
export function optionsLeadershipAndPolitics(npc, ctx) {
  const { here, add } = ctx;
  if (sim.leader === npc.name && (here?.type === 'hall' || here?.type === 'square')) {
    for (const [law, text] of Object.entries(DECREES)) {
      if (!sim.laws.includes(law)) add(`Decree: ${text}`, 'Make it law.', { type: 'decree', law });
      else add(`Repeal the law: ${text}`, 'Undo it.', { type: 'repeal', law });
    }
    if (sim.treasury >= 10) add('Give treasury money to the poor', `${sim.treasury} coins in the treasury.`, { type: 'charity' });
  }
  if (!sim.election && (here?.type === 'hall' || here?.type === 'square') && (!sim.leader || (sim.leader !== npc.name && opinion(npc, sim.leader) < -15)))
    add('Call for an election', sim.leader ? `Challenge ${sim.leader}'s leadership.` : 'The village has no leader.', { type: 'election' });
}

// Life events: gatherings, births, sickness, orphans, repairs
export function optionsLifeEvents(npc, ctx) {
  for (const group of LIFE_EVENT_OPTIONS) group(npc, ctx);
}

function gatheringOptions(npc, { add }) {
for (const g of sim.gatherings) {
  if (sim.time < g.start - 60 || sim.time > g.end) continue;
  const at = sim.findPlace(g.place);
  if (!at) continue;
  const started = sim.time >= g.start;
  add(`Attend: ${g.title}`, `${started ? 'Happening now' : 'Starting soon'} at ${g.place}.`, { type: 'move', target: g.place, then: { type: 'wait', minutes: 90 }, thenLabel: 'attend' });
}
}

function labourOptions(npc, { here, near, add, homePlace }) {
if (npc.pregnancy?.labour) {
  if (homePlace && homePlace !== here) add('Hurry home to give birth', 'Your labour has started. A bed is safer.', { type: 'move', target: homePlace.name, then: { type: 'sleep' }, thenLabel: 'give birth' });
  const clinic = sim.places.find(p => p.clinic && usable(p));
  if (clinic && clinic !== here) add(`Go to the ${clinic.name} to give birth`, 'Safest place for a birth.', { type: 'move', target: clinic.name, then: { type: 'sleep' }, thenLabel: 'give birth' });
  for (const h of sim.npcs.filter(o => o !== npc && o.age >= 16 && skill(o, 'herbalism') >= 35 && !near.includes(o)).slice(0, 2)) {
    add(`Send for ${h.name} to help with the birth`, `${h.name} is ${skillWord(skill(h, 'herbalism'))} at healing.`, { type: 'request', target: h.name, kind: 'midwife', remote: true });
  }
}
}

function midwifeOptions(npc, { add }) {
if (skill(npc, 'herbalism') >= 35) {
  for (const m of sim.npcs.filter(o => o.pregnancy?.labour && o !== npc)) add(`Hurry to help ${m.name} give birth`, `${m.name} is in labour (${lastSeenText(npc, m.name)}).`, { type: 'move', target: m.name });
}
}

function sickOptions(npc, { here, add, homePlace }) {
if (npc.sick) {
  const clinic = sim.places.find(p => p.clinic && usable(p));
  if (clinic && clinic !== here) add(`Rest at the ${clinic.name} until you're well`, 'Patients recover faster there.', { type: 'move', target: clinic.name, then: { type: 'sleep' }, thenLabel: 'rest' });
  if (homePlace && homePlace !== here) add('Go home and rest in bed', 'Rest in bed to recover faster.', { type: 'move', target: homePlace.name, then: { type: 'sleep' }, thenLabel: 'rest' });
}
}

function familyCareOptions(npc, { add }) {
if (npc.home) {
  for (const c of sim.npcs.filter(c => c.age < 12 && c.orphanSince != null && !c.guardian)) add(`Take in ${c.name}, who has nobody`, `${c.name} (${c.age}) has no one to care for ${P(c).them}.`, { type: 'adopt', target: c.name });
}
if (npc.spouse && opinion(npc, npc.spouse, 'rom') < 10 && opinion(npc, npc.spouse) < 0) add(`Divorce ${npc.spouse}`, 'End your marriage.', { type: 'divorce', target: npc.spouse });
}

function repairOptions(npc, { here, add }) {
if ((npc.inv.wood || 0) >= 2) {
  for (const p of sim.places.filter(p => (p.condition ?? 100) < 70 && (p === here || p.owner === npc.name || p.biz?.owner === npc.name || p.owner === npc.spouse)).slice(0, 3)) {
    add(`Repair the ${p.name} (2 wood)`, `It is ${p.condition < 40 ? 'badly damaged and barely usable' : 'damaged'}.`, { type: 'repair', place: p.name, at: p !== here ? p.name : null, label: 'repair' });
  }
}
}

function meetingOption(npc, { here, add }) {
if (sim.leader === npc.name && (here?.type === 'hall' || here?.type === 'square') && !sim.gatherings.some(g => g.kind === 'meeting')) add('Call a village meeting', 'Gather everyone at the hall to talk.', { type: 'meeting', place: 'Village Hall' });
}

const LIFE_EVENT_OPTIONS = [gatheringOptions, labourOptions, midwifeOptions, sickOptions, familyCareOptions, repairOptions, meetingOption];

// Grief, the Voice, and the big life choices
export function optionsGriefTheVoice(npc, ctx) {
  const { here, add } = ctx;
  const gy = sim.findPlace('Graveyard');
  if (here === gy) for (const g of (gy.graves || []).slice(-4)) add(`Mourn at ${g}'s grave`, 'Grieve and remember.', { type: 'mourn', name: g });
  else if (npc.grief && gy) add(`Visit ${npc.grief.name}'s grave`, 'Go and grieve.', { type: 'mourn', name: npc.grief.name, at: gy.name, label: 'mourn' });
  const voiceQuiet = !npc.lastSpokeToVoice || sim.time - npc.lastSpokeToVoice > 180;
  if ((npc.voiceCount || npc.awareness >= 20 || npc.belief) && voiceQuiet) {
    add('Speak aloud to the Voice', 'Talk to the voice you hear in your head, out loud. Others may think you strange.', { type: 'voice', mode: 'speak' });
    add('Ask the Voice for a sign', 'Demand proof that the Voice is real.', { type: 'voice', mode: 'sign' });
  }
  if (here?.shrine) add('Pray at the shrine to the Voice', 'Worship.', { type: 'do', label: 'Pray at the shrine', text: 'kneels and prays at the shrine to the Voice', minutes: 30, effect: 'calm' });
  const wantsOut = /leave|capital|move on|wander/i.test(npc.goal + ' ' + npc.dream + ' ' + npc.role);
  if ((npc.traveller && sim.time - (npc.arrivedAt || 0) > 720) || (wantsOut && npc.inv.coins >= 30) || npc.lifeMemories.some(m => m.includes('banished')))
    add('Leave Oakhollow forever', 'Pack up and walk away down the Eastern Road. You will never return.', { type: 'leave' });
  if (npc.traveller) add('Decide to settle in Oakhollow for good', 'Make this village your home.', { type: 'settle' });
}

// Inventions (ideas villagers came up with, or the Voice added)
export function optionsInventions(npc, ctx) {
  const { here, near, add } = ctx;
  for (const inv of relevantInventions(npc, here)) {
    const mech = describeEffects(inv.effects);
    const by = inv.by === npc.name ? 'your own idea' : `an idea from ${inv.by}`;
    if (inv.kind === 'law') {
      if (here?.type === 'hall' || here?.type === 'square') add(`Decree: ${inv.label}`, `${by}. ${mech}.`, { type: 'invented', id: inv.id });
      continue;
    }
    const atHere = !inv.where || (here && (here.name === inv.where || here.type === inv.where));
    const goTo = !atHere && sim.findPlace(inv.where) ? sim.findPlace(inv.where).name : null;
    if (!atHere && !goTo) continue;
    if (inv.target) {
      for (const o of near.filter(o => o.age >= 16).slice(0, 3)) {
        if (requirementsMet(npc, inv, o)) add(`${inv.label} (with ${o.name})`, `${npc.name} ${inv.text}. ${by}. Effects: ${mech}.`, { type: 'invented', id: inv.id, target: o.name });
      }
    } else if (requirementsMet(npc, inv, null)) {
      add(inv.label + (goTo ? ` at ${goTo}` : ''), `${npc.name} ${inv.text}. ${by}. Effects: ${mech}.`, { type: 'invented', id: inv.id, at: goTo, label: inv.label });
    }
  }
}

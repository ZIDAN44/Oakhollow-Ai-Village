// What a person knows about themselves and their situation, as Jev's state.
import { lastSeenText } from '../core/knowledge.js';
import { recall } from '../core/memory.js';
import { skillWord } from '../core/skills.js';
import { sim } from '../core/state.js';
import { DECREES } from '../data/civic.js';
import { VOICE_BELIEFS } from '../data/lore.js';
import { bizPrice, marketPrice } from '../economy/market.js';
import { P, SECOND, fill, genderWord, orientationWord } from '../identity/identity.js';
import { openPromisesFrom, openPromisesTo } from '../social/promises.js';
import { relLabel, reputation, topReasons } from '../social/relationships.js';
import { REQUESTS } from '../social/requests.js';

// ------------------------------------------------------------------ Words for numbers

export function bodyWords(n) {
  const out = [];
  out.push(n.needs.hunger > 80 ? 'starving' : n.needs.hunger > 60 ? 'hungry' : n.needs.hunger > 35 ? 'a little hungry' : 'fed');
  out.push(n.needs.thirst > 80 ? 'desperately thirsty' : n.needs.thirst > 60 ? 'thirsty' : 'not thirsty');
  out.push(n.needs.energy < 15 ? 'exhausted' : n.needs.energy < 35 ? 'tired' : 'rested');
  out.push(n.health < 30 ? 'gravely hurt' : n.health < 60 ? 'injured' : 'healthy');
  if (n.sick) out.push(['mildly sick', 'sick', 'very sick'][n.sick.severity - 1]);
  return out.join(', ');
}

export const carrying = inv => Object.entries(inv).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k === 'relic' ? 'glowing blue stone' : k}`).join(', ') || 'nothing';

export const topSkills = n => Object.entries(n.skills).filter(([, v]) => v >= 5).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}: ${skillWord(v)}`).join(', ') || 'no real skills yet';

export const resWord = r => r.amount < 3 ? 'picked bare' : r.amount < r.max * 0.3 ? 'running low' : 'plentiful';

export const summaryOf = r => REQUESTS[r.kind] ? (typeof REQUESTS[r.kind].summary === 'function' ? REQUESTS[r.kind].summary(r.data) : REQUESTS[r.kind].summary) : r.kind;

export function placeDesc(p) {
  let d = p.desc;
  if (p.res) d += ` (${p.res.item}: ${resWord(p.res)})`;
  if (p.biz) {
    const stock = Object.entries(p.biz.stock).filter(([, v]) => v > 0).map(([k, v]) => `${k} x${v} at ${bizPrice(p, k)} coins`).join(', ');
    d += ` Owner: ${p.biz.owner || 'nobody'}. ${stock ? `For sale: ${stock}.` : 'Nothing for sale right now.'}`;
  }
  if (p.owner && !p.biz) d += ` Belongs to ${p.owner}.`;
  return d;
}

// ------------------------------------------------------------------ State

export const repWord = r => r > 40 ? 'loved' : r > 15 ? 'well liked' : r > -10 ? 'ordinary' : r > -35 ? 'distrusted' : 'hated';

function familyWords(npc) {
  const family = [];
  if (npc.spouse) family.push(`spouse: ${npc.spouse}`);
  else if (npc.partner) family.push(`partner: ${npc.partner}`);
  if (npc.widowed) family.push(`widowed (${npc.widowed})`);
  if (npc.children.length) family.push(`children: ${npc.children.join(', ')}`);
  if (npc.parents.length) family.push(`parents: ${npc.parents.join(', ')}`);
  return family.join('; ') || 'none';
}

const SEASON_NOTES = { Winter: ': nothing grows, nights outdoors are dangerous', Autumn: ': harvest time' };

function villageState() {
  return {
    leader: sim.leader || 'nobody',
    laws: [...sim.laws.map(l => DECREES[l]), ...(sim.customLaws || [])],
    election: sim.election ? `in progress; candidates ${sim.election.candidates.join(', ')}` : 'none',
    open_problems: sim.problems.filter(p => !p.solved).map(p => `${p.title} (${Math.round(p.progress)}% solved)`),
    market_prices: ['food', 'wood', 'bread', 'tool', 'remedy'].map(i => `${i} ${marketPrice(i)}c`).join(', '),
    businesses: sim.places.filter(p => p.biz).map(p => `${p.name} (owner ${p.biz.owner || 'none'})`),
    population: sim.npcs.length,
    recently_died: sim.dead.slice(-3).map(d => `${d.name} (${d.cause})`),
  };
}

function jobWords(npc) {
  if (npc.job) return `works at ${npc.job.place} for ${npc.job.employer}`;
  const owned = sim.places.filter(p => p.biz?.owner === npc.name).map(p => p.name);
  return owned.length ? `owns ${owned.join(', ')}` : 'self-employed';
}

function pregnancyWords(npc) {
  if (!npc.pregnancy) return 'no';
  if (npc.pregnancy.labour) return 'IN LABOUR: the baby is coming within hours';
  return `expecting ${npc.pregnancy.other}'s baby, due in ${Math.round((npc.pregnancy.due - sim.time) / 1440 * 10) / 10} days`;
}

function selfState(npc, here) {
  return {
    name: npc.name, age: npc.age, role: npc.role,
    gender: genderWord(npc), pronouns: P(npc).label, romantic_orientation: orientationWord(npc),
    job: jobWords(npc),
    is_village_leader: sim.leader === npc.name,
    personality: npc.personality,
    life_goal: npc.goal,
    private_secret: npc.secret || 'none',
    dream: npc.dream,
    family: familyWords(npc),
    home: npc.home || 'none',
    mood: npc.mood,
    body: bodyWords(npc) + (npc.statuses?.length ? `; feeling ${npc.statuses.map(s => s.name).join(', ')}` : ''),
    pregnancy: pregnancyWords(npc),
    skills: topSkills(npc),
    carrying: carrying(npc.inv),
    debts: Object.entries(npc.debts || {}).filter(([, v]) => v > 0).map(([k, v]) => `owes ${k} ${v} coins`).join(', ') || 'none',
    grieving: npc.grief ? `for ${npc.grief.name}` : 'no',
    the_voice_in_your_head: npc.voiceCount ? `heard ${npc.voiceCount} times; you believe: ${fill(VOICE_BELIEFS[npc.belief?.kind]?.desc || 'unsure', SECOND)}` : 'never heard it',
    reputation_in_village: repWord(reputation(npc)),
    crimes_you_committed: npc.crimes.slice(-3).map(c => c.what + (c.secret ? ' (nobody knows)' : '')),
    life_story: npc.lifeMemories.slice(-8),
    location: here ? `${here.name}: ${placeDesc(here)}` : 'open ground',
  };
}

function personNear(npc, o) {
  return {
    name: o.name, age: o.age, role: o.role, gender: genderWord(o), pronouns: P(o).label,
    doing: sim.describeActivity(o),
    relationship: relLabel(npc, o.name),
    because: topReasons(npc, o.name).map(r => r.why),
    looks: [o.sick ? 'sick' : '', o.health < 50 ? 'injured' : '', o.grief ? 'grieving' : '', o.mood].filter(Boolean).join(', '),
    with: o.spouse ? `married to ${o.spouse}` : o.partner ? `with ${o.partner}` : 'single',
  };
}

export function buildState(npc, near) {
  const here = sim.placeAt(npc.x, npc.y);
  const kw = [npc.name, ...near.map(o => o.name), here?.name, ...(npc.goal || '').split(' ').filter(w => w.length > 5).slice(0, 4)];
  return {
    world: sim.lore,
    time: `${sim.timeStr()}${sim.isNight() ? ' (night: most people are asleep)' : ''}`,
    season: `${sim.season()}${SEASON_NOTES[sim.season()] || ''}`,
    weather: sim.weather.kind,
    village: villageState(),
    you: selfState(npc, here),
    people_near: near.map(o => personNear(npc, o)),
    people_elsewhere: sim.npcs.filter(o => o !== npc && !near.includes(o) && o.age >= 3).map(o => `${o.name} (${relLabel(npc, o.name)}): ${lastSeenText(npc, o.name)}`),
    upcoming_gatherings: sim.gatherings.map(g => `${g.title} at ${g.place}${sim.time >= g.start ? ' (now)' : ` in ${Math.round((g.start - sim.time) / 60)}h`}`),
    promises_you_made: openPromisesFrom(npc).map(p => `to ${p.to}: ${p.what} (due in ${Math.max(0, Math.round((p.due - sim.time) / 60))}h)`),
    promises_made_to_you: openPromisesTo(npc).map(p => `${p.from}: ${p.what}`),
    requests_to_you: (npc.requests || []).filter(r => sim.time - r.at < 360).map(r => `${r.from} asked you ${summaryOf(r)}`),
    memories: recall(npc, kw, 14).map(m => m.text),
    things_you_said_recently: (npc.recentLines || []).slice(-4),
  };
}

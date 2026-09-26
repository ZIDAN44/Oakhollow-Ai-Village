// Creating people and a fresh world.
import { chronicle, remember } from '../core/memory.js';
import { sim } from '../core/state.js';
import { uid } from '../core/util.js';
import { DEFAULT_LORE } from '../data/lore.js';
import { DEFAULT_PLACES } from '../data/map.js';
import { DEFAULT_NPCS } from '../data/people.js';
import { SKILLS } from '../data/skills.js';
import { randomIdentity } from '../identity/identity.js';
import { rel } from '../social/relationships.js';
import { addProblem } from '../village/problems-core.js';

// ------------------------------------------------------------------ Creating people

export function makeNpc(def, placeName) {
  const start = sim.findPlace(placeName || def.start) || sim.places[0];
  const skills = Object.fromEntries(SKILLS.map(s => [s, 0]));
  Object.assign(skills, def.skills || {});
  return {
    id: uid(), name: def.name, age: def.age, ageFrac: Math.random(), role: def.role, color: def.color,
    ...identityOf(def),
    personality: def.personality, goal: def.goal, coreGoal: def.goal, secret: def.secret || '', dream: def.dream || '',
    voice: def.voice || null, home: def.home || '',
    x: start.x + start.w / 2 + (Math.random() - 0.5) * start.w * 0.4,
    y: start.y + start.h / 2 + (Math.random() - 0.5) * start.h * 0.4,
    needs: { hunger: 15 + Math.random() * 25, thirst: 15 + Math.random() * 25, energy: 75 + Math.random() * 20 },
    health: 100, sick: null, injured: 0, immuneUntil: 0, statuses: [],
    inv: { food: 0, water: 0, wood: 0, coins: 0, herbs: 0, remedy: 0, bread: 0, tool: 0, relic: 0, ...def.inv },
    skills, memory: [], lifeMemories: [], rel: {}, seen: {},
    partner: null, spouse: null, parents: def.parents || [], guardian: null, children: [], requests: [], debts: {},
    pregnancy: null, job: null, belief: null, awareness: 0, voiceCount: 0, grief: null,
    mood: 'calm', moodScore: 2,
    action: null, thinking: false, nextThinkAt: sim.time + Math.random() * 6,
    bubble: null, lastHeardFrom: null, lastHeard: null, chats: {}, recentLines: [], mind: null,
    lastReflect: sim.time, lastInvent: sim.time - Math.random() * 1200, impSinceReflect: 0, bornDay: def.bornDay ?? null, crimes: [],
  };
}

export function identityOf(def) {
  const r = randomIdentity(def.age < 1);
  return {
    gender: def.gender || r.gender, pronouns: def.pronouns || r.pronouns,
    attractedTo: def.attractedTo || r.attractedTo,
    canCarry: def.canCarry ?? r.canCarry, canSire: def.canSire ?? r.canSire,
  };
}

export function resetWorld() {
  sim.time = 8 * 60;
  sim.lore = DEFAULT_LORE;
  sim.places = structuredClone(DEFAULT_PLACES);
  for (const p of sim.places) p.condition = 100;
  Object.assign(sim, {
    customActivities: [], log: [], npcs: [], dead: [], departed: [], problems: [], laws: [], treasury: 0,
    market: { food: 4, wood: 4, herbs: 0, bread: 0, tool: 0, remedy: 0, coins: 80 },
    weather: { kind: 'clear', until: sim.time + 240 }, tension: 0, lastStoryEvent: sim.time,
    voiceMessages: [], inventions: [], promises: [], customLaws: [], gatherings: [], scheduled: [],
    election: null, lastElectionYear: 1, sealedDoor: 'hidden', bridgeBroken: false, festival: { done: false },
    stats: { calls: 0, inTok: 0, outTok: 0, cost: 0, errors: 0 },
  });

  sim.npcs = DEFAULT_NPCS.map(d => makeNpc(d));
  // Everyone in the village knows each other (and where they live); newcomers are strangers.
  for (const a of sim.npcs) {
    const def = DEFAULT_NPCS.find(d => d.name === a.name);
    for (const b of sim.npcs) {
      if (a === b) continue;
      const bdef = DEFAULT_NPCS.find(d => d.name === b.name);
      const r = rel(a, b.name);
      if (def.stranger || bdef.stranger) continue;
      r.met = true;
      const seed = def.rel?.[b.name] || [10, 10];
      r.base.aff = seed[0]; r.base.trust = seed[1];
      const home = sim.findPlace(b.home);
      if (home) a.seen[b.name] = { x: home.x + home.w / 2, y: home.y + home.h / 2, place: home.name, at: sim.time - 600, guess: true };
    }
    if (def.leader) sim.leader = a.name;
    remember(a, `You wake up in Oakhollow. It's ${sim.partOfDay()} in ${sim.season().toLowerCase()}.`, null, 1);
  }
  const bram = sim.findNpc('Bram');
  if (bram) bram.lifeMemories.push('Anna, my wife, died three winters ago. I buried her in the graveyard.');
  const mira = sim.findNpc('Mira');
  if (mira) mira.lifeMemories.push('My father Edric left me the farm when he died.');
  const hugo = sim.findNpc('Hugo');
  if (hugo) hugo.lifeMemories.push('Fifty years ago, I sealed the door beneath the Old Ruins with iron and wax. I told no one.');

  addProblem('blue_lights');
  addProblem('festival');
  sim.selected = null;
  chronicle(`A new day dawns over Oakhollow. ${sim.dateStr()}.`, null, 'event');
}

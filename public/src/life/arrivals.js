// Strangers arriving and people leaving for good.
import { broadcast, chronicle, remember } from '../core/memory.js';
import { sim } from '../core/state.js';
import { pick } from '../core/util.js';
import { NPC_COLORS, TRAVELLERS, TRAVELLER_NAMES } from '../data/people.js';
import { carerOf } from './body.js';
import { opinion } from '../social/relationships.js';
import { makeNpc } from '../world/setup.js';

// ------------------------------------------------------------------ Arrivals and departures

export function arrive(custom) {
  const used = new Set([...sim.npcs, ...sim.dead, ...sim.departed].map(n => n.name));
  const t = custom || pick(TRAVELLERS);
  const name = custom?.name || TRAVELLER_NAMES.find(n => !used.has(n)) || `Stranger ${sim.nextId}`;
  const npc = makeNpc({
    name, age: custom?.age || 20 + Math.floor(Math.random() * 30), role: t.cover || t.role,
    color: NPC_COLORS[(sim.npcs.length + sim.dead.length) % NPC_COLORS.length],
    personality: t.personality, goal: t.goal, secret: t.secret, dream: t.dream, skills: t.skills,
    gender: custom?.gender, pronouns: custom?.pronouns, attractedTo: custom?.attractedTo, canCarry: custom?.canCarry, canSire: custom?.canSire,
    home: 'The Crooked Mug Tavern', inv: { food: 1, water: 1, coins: 8 + Math.floor(Math.random() * 15) },
  }, 'Eastern Road');
  npc.x = 1180; npc.traveller = true; npc.arrivedAt = sim.time;
  remember(npc, 'You have just arrived in Oakhollow along the Eastern Road. You know nobody here. A room at the tavern costs 2 coins a night.', null, 6);
  sim.npcs.push(npc);
  const shown = t.cover || t.role;
  broadcast(`A stranger called ${name}, a ${shown}, has arrived by the Eastern Road.`, `a stranger called ${name} (${shown}) arrived`, 5, [npc]);
  for (const o of sim.npcs) if (o !== npc) o.seen[npc.name] = { x: npc.x, y: npc.y, place: 'Eastern Road', at: sim.time, guess: true };
  chronicle(`🧳 ${name} the ${shown} arrives in Oakhollow.`, npc, 'life');
  return npc;
}

export function depart(n) {
  if (!sim.npcs.includes(n)) return;
  sim.npcs.splice(sim.npcs.indexOf(n), 1);
  sim.departed.push(n);
  if (sim.selected === n) sim.selected = null;
  chronicle(`🚶 ${n.name} has left Oakhollow for good.`, n, 'life');
  for (const o of sim.npcs) {
    const close = opinion(o, n.name) > 30 || o.spouse === n.name || o.partner === n.name;
    remember(o, `${n.name} has left Oakhollow for good.`, `${n.name} left the village forever`, close ? 9 : 4);
    if (o.spouse === n.name) { o.spouse = null; o.partner = null; o.lifeMemories.push(`${n.name} left me and Oakhollow behind.`); }
    if (o.partner === n.name) o.partner = null;
    if (o.job?.employer === n.name) o.job = null;
    if (o.guardian === n.name) o.guardian = null;
  }
  // Young children leave with their parent.
  for (const c of sim.npcs.filter(c => c.age < 12 && carerOf(c) === null && c.parents.includes(n.name))) {
    sim.npcs.splice(sim.npcs.indexOf(c), 1); sim.departed.push(c);
  }
  if (sim.leader === n.name) sim.leader = null;
  for (const p of sim.places) if (p.biz?.owner === n.name) { p.biz.owner = null; p.desc += ' Abandoned.'; }
}

// Finishing a building and placing it on the map.
import { broadcast, chronicle, remember } from '../core/memory.js';
import { practice } from '../core/skills.js';
import { findFreeSpot } from '../core/space.js';
import { sim } from '../core/state.js';

export function finishBuild(npc, a) {
  const b = a.b;
  const base = b.kind === 'house' ? `${npc.name}'s House` : b.kind === 'business' ? `${npc.name}'s ${b.name}` : b.name;
  let name = base, i = 2;
  while (sim.places.some(p => p.name === name)) name = `${base} ${i++}`;
  const w = b.kind === 'structure' ? 60 : 72, h = b.kind === 'structure' ? 45 : 56;
  const spot = findFreeSpot(a.x, a.y, w, h);
  const place = {
    name, type: b.kind === 'house' ? 'house' : b.kind === 'business' ? b.biz : 'built', condition: 100,
    x: spot.x, y: spot.y, w, h, builder: npc.name,
    desc: `${b.desc} Built by ${npc.name}.`,
  };
  if (b.kind === 'house') { place.bed = true; place.owner = npc.name; npc.home = name; if (npc.spouse) { const s = sim.findNpc(npc.spouse); if (s) s.home = name; } }
  if (b.kind === 'business') place.biz = { kind: b.biz, owner: npc.name, till: 0, stock: {}, employees: [], priceMult: 1 };
  if (b.name === 'Shrine to the Voice') place.shrine = true;
  if (b.biz === 'clinic') { place.clinic = true; place.bed = true; }
  sim.places.push(place);
  broadcast(`${npc.name} built ${b.kind === 'business' ? 'and opened ' : ''}the ${name}.`, `${npc.name} built the ${name}`, b.kind === 'business' ? 6 : 5, [npc]);
  remember(npc, `You finished building the ${name}!`, null, 7);
  npc.lifeMemories.push(`I built the ${name} on day ${sim.day()}.`);
  chronicle(`🏗️ ${npc.name} finished building the ${name}!`, npc, 'event');
  practice(npc, 'crafting', 4);
}

// The shared library of inventions and which ones fit a person.
import { chronicle, remember } from '../../core/memory.js';
import { sim } from '../../core/state.js';
import { describeEffects } from '../../effects/index.js';

export function addInvention(inv, npc) {
  sim.inventions.push(inv);
  // Keep the library bounded: forget the least-used old ideas first.
  if (sim.inventions.length > 80) {
    sim.inventions.sort((a, b) => (b.uses - a.uses) || (b.created - a.created));
    sim.inventions.length = 80;
  }
  if (!npc) return; // the player's own possibilities: the God panel writes their chronicle entry
  remember(npc, `You had an idea: ${inv.label.toLowerCase()} (${describeEffects(inv.effects)}).`, null, 5);
  chronicle(`💡 ${npc.name} came up with a new idea: "${inv.label}" (${describeEffects(inv.effects)})`, npc, 'invent');
}

// Which inventions this person might think of now (retrieval by relevance, like Voyager's top-k).
export function relevantInventions(npc, here) {
  const words = `${npc.role} ${npc.goal} ${npc.personality} ${here?.name || ''} ${here?.type || ''}`.toLowerCase();
  const scored = sim.inventions
    .filter(inv => inv.by === npc.name || inv.shared)
    .filter(inv => !(inv.kind === 'law' && sim.leader !== npc.name))
    .filter(inv => !inv.built)
    // Don't repeat the same idea straight away (events at most once a day).
    .filter(inv => sim.time - (inv.lastUsed?.[npc.name] ?? -1e9) > (inv.effects.some(e => e.type === 'gathering') ? 1440 : 240))
    .filter(inv => !inv.effects.some(e => e.type === 'gathering' && sim.gatherings.some(g => g.title === e.title)))
    .map(inv => {
      const hits = `${inv.label} ${inv.text}`.toLowerCase().split(/\W+/).filter(w => w.length > 4 && words.includes(w)).length;
      const mine = inv.by === npc.name ? 3 : 0;
      const atPlace = inv.where && here && (inv.where === here.name || inv.where === here.type) ? 2 : 0;
      return { inv, s: mine + hits + atPlace + Math.min(2, inv.uses * 0.3) };
    })
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, 8).map(x => x.inv);
}

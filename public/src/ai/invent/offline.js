// Ideas from skill-based recipes when there is no text model.
import { addInvention } from './library.js';
import { sim } from '../../core/state.js';
import { uid } from '../../core/util.js';
import { validateEffects } from '../../effects/index.js';

// ------------------------------------------------------------------ Offline imagination
// Without a text model, ideas are assembled from skill-based recipes (still validated and shared).
export const RECIPES = {
  crafting: [['a wooden stool', 'wood', 2, 'stool'], ['a woven basket', 'wood', 1, 'basket'], ['a toy horse', 'wood', 1, 'toy']],
  cooking: [['a berry pie', 'food', 2, 'pie'], ['a pot of jam', 'food', 2, 'jam'], ['smoked fish', 'food', 2, 'smoked fish']],
  herbalism: [['a soothing salve', 'herbs', 2, 'salve'], ['calming tea', 'herbs', 1, 'tea']],
  woodcutting: [['a bundle of kindling', 'wood', 1, 'kindling']],
  farming: [['seed packets', 'food', 1, 'seeds']],
  music: [['a new ballad', null, 0, null]],
  scholarship: [['a village almanac', null, 0, 'almanac']],
};

export function inventOffline(npc) {
  npc.lastInvent = sim.time;
  const best = Object.entries(npc.skills).filter(([s]) => RECIPES[s]).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < 20 || Math.random() < 0.5) return;
  const [sk] = best;
  const [what, input, qty, product] = RECIPES[sk][Math.floor(Math.random() * RECIPES[sk].length)];
  const label = `Make ${what}${input ? ` (${qty} ${input})` : ''}`;
  if (sim.inventions.some(i => i.label === label)) return;
  const effects = validateEffects([
    ...(input ? [{ type: 'item', who: 'self', item: input, amount: -qty }] : []),
    ...(product ? [{ type: 'item', who: 'self', item: product, amount: 1 }] : [{ type: 'mood', who: 'everyone_near', amount: 1 }]),
    { type: 'skill', who: 'self', skill: sk, amount: 2 },
  ]);
  addInvention({ id: uid(), kind: 'action', label, text: `makes ${what}`, minutes: 45, where: null, target: false, shared: true, effects, by: npc.name, uses: 0, created: sim.time, check: { skill: sk, difficulty: 'easy' }, failEffects: [] }, npc);
}

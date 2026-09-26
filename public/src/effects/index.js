// Public API of the effects engine. Importing this registers every effect type.
import './types/possessions.js';
import './types/body.js';
import './types/social.js';
import './types/world.js';
import './types/village.js';
import { sim } from '../core/state.js';
import { on } from '../core/events.js';
import { applyEffects, effectDocs } from './registry.js';

export { validateEffects, applyEffects, describeEffects, requirementsMet } from './registry.js';
export { validateCheck, successChance, performInvention } from './checks.js';

// The effect documentation shown to the text model (built from every registered type).
export const EFFECT_DOCS = effectDocs();

// Delayed effects ("later") come due.
on('scheduled', s => {
  const npc = sim.findNpc(s.npc);
  if (npc) applyEffects(npc, s.target ? sim.findNpc(s.target) : null, s.effects, s.label);
});

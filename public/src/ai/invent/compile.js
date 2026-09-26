// Compiling a raw idea into a validated invention.
import { sim } from '../../core/state.js';
import { uid } from '../../core/util.js';
import { validateCheck, validateEffects } from '../../effects/index.js';

export function normalizeWhere(w) {
  if (!w || w === 'null') return null;
  const p = sim.findPlace(w);
  if (p) return p.name;
  const types = ['forest', 'river', 'farm', 'square', 'market', 'tavern', 'house', 'ruins', 'hall', 'graveyard', 'road', 'well'];
  return types.includes(String(w).toLowerCase()) ? String(w).toLowerCase() : null;
}

// "Bram carefully carves a bird, then gives it away" -> "carefully carves a bird"
export function shortText(t, npc) {
  let s = String(t).replace(/\s+/g, ' ').trim();
  if (npc) s = s.replace(new RegExp(`^${npc.name}('s)?\\s+`, 'i'), '');
  s = s.split(/[,.;:!?]| then | while | and then /)[0].trim();
  if (s.split(' ').length > 12) s = s.split(' ').slice(0, 12).join(' ');
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function toInvention(raw, by, npc, issues = []) {
  const kind = ['action', 'building', 'law'].includes(raw.kind) ? raw.kind : 'action';
  if (kind === 'law' && npc && sim.leader !== npc.name) { issues.push('only the leader can invent laws'); return null; }
  const effects = validateEffects(raw.effects, { allowLaw: kind === 'law' }, issues);
  if (!effects.length) { issues.push('it has no valid effects'); return null; }
  if (kind === 'building' && !effects.some(e => e.type === 'build')) issues.push('a building needs a "build" effect');
  if (kind === 'building' && !effects.some(e => e.type === 'build')) return null;
  if (kind === 'building' && !effects.some(e => e.type === 'item' && e.item === 'wood' && e.amount <= -3)) effects.unshift({ type: 'item', who: 'self', item: 'wood', amount: -3 });
  const label = String(raw.label || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!label) return null;
  return {
    id: uid(), kind, label, text: shortText(raw.text || label, npc),
    minutes: Math.max(10, Math.min(150, Number(raw.minutes) || 30)),
    where: normalizeWhere(raw.where), target: Boolean(raw.needs_target),
    shared: kind !== 'law' && raw.shared !== false, effects, by, uses: 0, created: sim.time,
    check: validateCheck(raw.check), failEffects: validateEffects(raw.fail_effects || [], {}, []),
  };
}

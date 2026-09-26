// The effects registry: every building block that inventions, custom possibilities and
// activities are compiled into. Each effect type registers itself (see ./types/*) with:
//   doc       - how the text model is told to use it
//   validate  - turn untrusted JSON into a safe, clamped effect (or null)
//   apply     - make it happen in the world
//   describe  - a short human summary
import { sim } from '../core/state.js';
import { clamp } from '../core/util.js';
import { HEAR_RADIUS } from '../core/constants.js';
import { BASE_PRICES } from '../data/economy.js';

const TYPES = new Map();
const DOC_ORDER = [];

export function defineEffect(types, def) {
  for (const t of [].concat(types)) TYPES.set(t, def);
  if (def.doc) DOC_ORDER.push(def.doc);
}

// ---- Shared sanitizers
export const WHO = ['self', 'target', 'everyone_near'];
export const word = s => String(s || '').toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, ' ').slice(0, 24);
export const text = (s, n = 120) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
export const int = (v, a, b) => clamp(Math.round(Number(v) || 0), a, b);
export const placeOrHere = p => (p === 'here' || !p ? 'here' : (sim.findPlace(p)?.name || null));

export function effectDocs() {
  return `Effects (use only these; "who" is "self", "target" or "everyone_near"):\n${DOC_ORDER.join('\n')}

An invention may also have a skill check: "check":{"skill":"crafting","difficulty":"easy|normal|hard"} with "fail_effects":[...] for when it goes wrong.`;
}

// ---- Validation
export function validateEffects(list, { allowLaw = false, nested = false } = {}, issues = []) {
  const out = [];
  if (!Array.isArray(list)) { issues.push('effects must be a list'); return out; }
  for (const e of list.slice(0, 7)) {
    if (!e || typeof e !== 'object') continue;
    const def = TYPES.get(e.type);
    if (!def) { issues.push(`unknown effect type "${e.type}"`); continue; }
    const who = WHO.includes(e.who) ? e.who : 'self';
    const before = issues.length;
    const v = def.validate(e, { who, issues, allowLaw, nested, validateList: validateEffects });
    if (v) out.push(v);
    else if (issues.length === before && !issues.length) issues.push(`effect "${e.type}" was missing required fields`);
  }
  return balance(out);
}

const value = item => BASE_PRICES[item] ?? (item === 'coins' ? 1 : 3);

// Nothing from nothing: what you gain can't be worth much more than what you spend.
function balance(effects) {
  const cost = effects.filter(e => e.type === 'item' && e.who === 'self' && e.amount < 0).reduce((s, e) => s - e.amount * value(e.item), 0);
  let budget = cost + 4;
  for (const e of effects) {
    if (e.type === 'item' && e.amount > 0 && e.who !== 'target') {
      const worth = e.amount * value(e.item) * (e.who === 'everyone_near' ? 3 : 1);
      if (worth > budget) e.amount = Math.max(0, Math.floor(budget / (value(e.item) * (e.who === 'everyone_near' ? 3 : 1))));
      budget -= e.amount * value(e.item);
    }
  }
  return effects.filter(e => !(e.type === 'item' && e.amount === 0));
}

// ---- Description and requirements
export function describeEffects(effects) {
  return effects.map(e => TYPES.get(e.type)?.describe?.(e, describeEffects) ?? e.type).join(', ');
}

export function requirementsMet(npc, inv, target) {
  for (const e of inv.effects) {
    if (e.type === 'item' && e.who === 'self' && e.amount < 0 && (npc.inv[e.item] || 0) < -e.amount) return false;
    if (e.type === 'transfer' && e.from === 'self' && (npc.inv[e.item] || 0) < e.amount) return false;
    if (e.type === 'transfer' && e.from === 'target' && (!target || (target.inv[e.item] || 0) < e.amount)) return false;
    if (e.type === 'build' && inv.built) return false;
  }
  return true;
}

// ---- Applying
export function applyEffects(npc, target, effects, label) {
  const near = sim.nearby(npc, HEAR_RADIUS).filter(o => o.action?.type !== 'sleep');
  const whoList = w => (w === 'self' ? [npc] : w === 'target' ? (target ? [target] : []) : near);
  const results = [];
  for (const e of effects) TYPES.get(e.type)?.apply(e, { npc, target, near, whoList, label, results });
  return results;
}

export const whoLabel = w => (w !== 'self' ? ` (${w.replace('_', ' ')})` : '');

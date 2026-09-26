// Skill checks, tabletop style: a master succeeds ~90% of the time, a layman ~10%.
import { clamp } from '../core/util.js';
import { remember } from '../core/memory.js';
import { skill, practice } from '../core/skills.js';
import { SKILLS } from '../data/skills.js';
import { applyEffects } from './registry.js';

const DIFFICULTY = { easy: 15, normal: 40, hard: 65 };

export function validateCheck(c) {
  if (!c || typeof c !== 'object' || !SKILLS.includes(c.skill)) return null;
  return { skill: c.skill, difficulty: DIFFICULTY[c.difficulty] ? c.difficulty : 'normal' };
}

export function successChance(npc, check) {
  const d = DIFFICULTY[check.difficulty] ?? 40;
  return clamp(1 / (1 + Math.exp(-(skill(npc, check.skill) - d) / 10)), 0.05, 0.95);
}

// Run an invention: roll its check (if any) and apply the right outcome.
export function performInvention(npc, target, inv) {
  let ok = true;
  if (inv.check) {
    ok = Math.random() < successChance(npc, inv.check);
    practice(npc, inv.check.skill, ok ? 2 : 1);
  }
  applyEffects(npc, target, ok ? inv.effects : (inv.failEffects || []), inv.text);
  if (!ok) remember(npc, `You tried to ${inv.label.toLowerCase()}, but it went wrong.`, inv.uses < 2 ? `${npc.name} tried to ${inv.label.toLowerCase()} and failed` : null, 4);
  return ok;
}

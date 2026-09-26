// Skills and inventory helpers.
import { clamp } from './util.js';
import { SKILLS } from '../data/skills.js';

// ---- Skills

export function skill(npc, s) { return npc.skills?.[s] || 0; }

export function practice(npc, s, amount = 1) {
  if (!s || !SKILLS.includes(s)) return;
  npc.skills[s] = clamp((npc.skills[s] || 0) + amount * (1 - (npc.skills[s] || 0) / 120), 0, 100);
}

export function skillWord(v) {
  return v >= 80 ? 'master' : v >= 60 ? 'expert' : v >= 40 ? 'skilled' : v >= 20 ? 'apprentice' : v >= 5 ? 'novice' : 'untrained';
}

export function addItems(npc, items, sign = 1) {
  for (const [k, v] of Object.entries(items)) npc.inv[k] = Math.max(0, (npc.inv[k] || 0) + v * sign);
}

export function hasItems(npc, items) {
  return Object.entries(items || {}).every(([k, v]) => (npc.inv[k] || 0) >= v);
}

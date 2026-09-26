// Sickness (SIR-style spread and recovery), injuries and temporary conditions.
import { chronicle, remember, worldEventAll } from '../core/memory.js';
import { sim } from '../core/state.js';
import { clamp } from '../core/util.js';
import { IMMUNITY_YEARS } from './biology.js';
import { die } from './death.js';
import { addProblem } from '../village/problems-core.js';

export function spreadSickness() {
  // ---- Sickness, SIR-style: infected people pass it on to susceptible people nearby.
  // Recovered people are immune for a while. Rest in a bed (or a clinic) speeds recovery.
  for (const s of sim.npcs.filter(n => n.sick)) {
    for (const o of sim.nearby(s, 60)) {
      if (!o.sick && !o.immortal && sim.time > (o.immuneUntil || 0) && Math.random() < 0.05) fallSick(o, 'caught it from ' + s.name);
    }
    const here = sim.placeAt(s.x, s.y);
    const resting = s.action?.type === 'sleep' && s.action.bed;
    const rate = 0.012 * (resting ? 2 : 1) * (here?.clinic ? 1.5 : 1) / s.sick.severity;
    if (Math.random() < rate) recover(s, resting ? 'rest in bed' : 'time');
  }
}

export function applyStatuses() {
  // ---- Status effects (drunk, well-fed, exhausted...)
  for (const n of sim.npcs) {
    n.statuses = (n.statuses || []).filter(st => st.until > sim.time);
    for (const st of n.statuses) {
      const d = st.per_hour || {};
      for (const k of ['hunger', 'thirst', 'energy']) if (d[k]) n.needs[k] = clamp(n.needs[k] + d[k], 0, 100);
      if (d.health) n.health = clamp(n.health + d.health, 1, 100);
      if (d.mood) n.moodScore = clamp((n.moodScore ?? 2) + d.mood, 0, 4);
    }
  }
}

// ------------------------------------------------------------------ Health

export function fallSick(n, why) {
  if (n.immortal || n.sick) return;
  n.sick = { severity: Math.random() < 0.5 ? 1 : Math.random() < 0.7 ? 2 : 3, since: sim.time };
  remember(n, `You feel feverish and weak. You're sick (${why}).`, `${n.name} is sick`, 6);
  chronicle(`🤒 ${n.name} has fallen sick.`, n, 'life');
  if (sim.npcs.filter(x => x.sick).length >= 3 && !sim.problem('outbreak')) {
    addProblem('outbreak');
    worldEventAll('A sickness is spreading through the village!', 7);
  }
}

export function recover(n, how) {
  if (!n.sick) return;
  n.sick = null;
  n.immuneUntil = sim.time + IMMUNITY_YEARS * sim.bioYearDays() * 1440;
  remember(n, `You feel better. The sickness has passed (${how}).`, null, 4);
  chronicle(`💚 ${n.name} has recovered.`, n, 'life');
}

export function injure(n, amount, why) {
  n.health = clamp(n.health - amount, 0, 100);
  n.injured = Math.max(n.injured || 0, amount);
  remember(n, `You were hurt: ${why}.`, `${n.name} was hurt: ${why}`, 6);
  if (n.immortal) n.health = Math.max(n.health, 20);
  if (n.health <= 0) {
    if (sim.settings.mortality) die(n, why);
    else n.health = 5;
  }
}

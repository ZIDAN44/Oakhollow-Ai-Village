// Ageing, natural death and everyday illness.
import { chronicle, remember } from '../core/memory.js';
import { sim } from '../core/state.js';
import { P } from '../identity/identity.js';
import { CHILD_HAZARD, GOMPERTZ_A, GOMPERTZ_B, INFANT_HAZARD, MAKEHAM } from './biology.js';
import { carerOf } from './body.js';
import { die } from './death.js';
import { fallSick } from './health.js';

// One day of ageing, on the shared biological clock.
export function ageOneDay(n, perDay) {
  // ---- Ageing: one clock for everyone.
  if (!n.immortal) {
    n.ageFrac = (n.ageFrac || 0) + perDay;
    while (n.ageFrac >= 1) {
      n.ageFrac -= 1;
      n.age++;
      if (n.age === 4) { chronicle(`🧒 ${n.name} is old enough to wander the village alone now.`, n, 'life'); n.nextThinkAt = sim.time; }
      if (n.age === 16) { n.comingOfAge = true; chronicle(`🎓 ${n.name} has come of age!`, n, 'life'); }
      if (n.age >= 16 || n.age % 4 === 0) remember(n, `You turned ${n.age}.`, null, n.age % 10 === 0 ? 5 : 2);
    }
  }
}

// Returns true if they died today.
export function mortalityRoll(n, perDay) {
  // ---- Mortality: Gompertz-Makeham for adults, higher risk in infancy.
  if (sim.settings.mortality && !n.immortal) {
    let hazard = MAKEHAM + GOMPERTZ_A * Math.exp(GOMPERTZ_B * n.age);
    if (n.age < 1) hazard += INFANT_HAZARD * (goodCare(n) ? 0.5 : 1.5);
    else if (n.age < 5) hazard += CHILD_HAZARD;
    const pDie = 1 - Math.exp(-hazard * perDay);
    if (Math.random() < pDie) {
      const cause = n.age < 1 ? 'a fever in infancy' : n.age < 5 ? 'a childhood illness' : n.age >= 65 ? `old age, peacefully in ${P(n).their} sleep` : 'a sudden illness';
      die(n, cause);
      return true;
    }
  }
  return false;
}

export function dailyIllness(n) {
  // ---- Everyday illness (more in winter and for those who slept outside)
  if (!n.sick && !n.immortal && sim.time > (n.immuneUntil || 0)) {
    const risk = 0.012 + (n.sleptOutside ? 0.05 : 0) + (sim.season() === 'Winter' ? 0.02 : 0) + (sim.weather.kind === 'rain' || sim.weather.kind === 'storm' || sim.weather.kind === 'snow' ? 0.02 : 0);
    if (Math.random() < risk) fallSick(n, n.sleptOutside ? 'a chill from sleeping outside' : 'fell ill');
  }
  n.sleptOutside = false;
}

export function goodCare(baby) {
  const c = carerOf(baby);
  return c && c.health > 50 && c.needs.hunger < 80 && sim.homeOf(c)?.bed;
}

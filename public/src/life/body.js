// Bodies: needs, health, and small children being cared for.
import { say } from '../core/memory.js';
import { sim } from '../core/state.js';
import { clamp, pick } from '../core/util.js';
import { P } from '../identity/identity.js';
import { die } from './death.js';

export function tickBody(n, dt) {
  if (!sim.npcs.includes(n)) return;
  drainNeeds(n, dt);
  n.health = clamp(n.health + healthChange(n) * dt, 0, 100);
  if (n.immortal) n.health = Math.max(n.health, 20);
  if (n.health <= 0) { collapse(n); return; }
  if (n.age < 4) careForSmallChild(n, dt);
}

function drainNeeds(n, dt) {
  const a = n.action;
  const ns = n.needs;
  const kid = n.age < 12 ? 0.8 : 1;
  const preg = n.pregnancy ? 1.25 : 1;
  const cold = sim.season() === 'Winter' && !sim.placeAt(n.x, n.y)?.bed ? 1.2 : 1;
  ns.hunger = Math.min(100, ns.hunger + 0.07 * dt * kid * preg * cold);
  ns.thirst = Math.min(100, ns.thirst + 0.09 * dt * kid);
  const drain = (n.sick ? 1.5 : 1) * (n.pregnancy ? 1.3 : 1);
  if (a?.type === 'sleep') ns.energy = Math.min(100, ns.energy + (a.bed ? 0.28 : 0.15) * dt);
  else ns.energy = Math.max(0, ns.energy - 0.075 * dt * drain);
}

// Health per minute: starvation and thirst hurt, sickness wears you down, rest in a bed heals.
function healthChange(n) {
  const a = n.action;
  const ns = n.needs;
  let dh = 0;
  if (ns.hunger >= 95) dh -= 0.03;
  if (ns.thirst >= 95) dh -= 0.045;
  if (n.sick) dh -= 0.003 * n.sick.severity;
  if (!n.sick && ns.hunger < 70 && ns.thirst < 70) dh += a?.type === 'sleep' && a.bed ? 0.07 : a?.type === 'sleep' ? 0.04 : 0.012;
  return dh;
}

function collapse(n) {
  const ns = n.needs;
  if (sim.settings.mortality) die(n, n.sick ? 'sickness' : ns.hunger >= 95 ? 'starvation' : ns.thirst >= 95 ? 'thirst' : `${P(n).their} wounds`);
  else n.health = 5;
}

// Babies and toddlers stay with whoever looks after them; carers feed them from their own food.
function careForSmallChild(n, dt) {
  const ns = n.needs;
  const carer = carerOf(n);
  if (carer && sim.dist(n, carer) > 25) {
    const d = sim.dist(n, carer);
    n.x += (carer.x - n.x) / d * Math.min(d - 20, 22 * dt);
    n.y += (carer.y - n.y) / d * Math.min(d - 20, 22 * dt);
  }
  if (carer && (ns.hunger > 45 || ns.thirst > 45)) feedChild(n, carer);
  if (Math.random() < 0.0015 * dt) say(n, pick(['*giggles*', '*babbles*', '*reaches for a butterfly*', '*yawns*', '*cries*']), 2500, 'action');
}

function feedChild(n, carer) {
  const ns = n.needs;
  const item = carer.inv.bread > 0 ? 'bread' : carer.inv.food > 0 ? 'food' : null;
  if (item) { carer.inv[item]--; ns.hunger = 5; }
  else if (sim.placeAt(carer.x, carer.y)?.biz?.stock?.meal) { ns.hunger = 10; }
  else carer.needs.hunger = Math.min(100, carer.needs.hunger + 8); // they go without so the baby eats
  ns.thirst = 5; // carers give them something to drink either way
}

export function carerOf(n) {
  return [n.guardian, ...n.parents].map(p => p && sim.findNpc(p)).find(p => p && p.age >= 16) || null;
}

// Prompts and transport for the imagination.
import { sim } from '../../core/state.js';

export const SYSTEM = `You are the imagination of one villager in a living medieval village simulation.
You invent NEW, specific, grounded things they could do, build, or (only if they lead the village) decree,
that fit their personality, goal and situation. Mechanics must be expressed ONLY with the listed effects.
Costs must be paid with negative item effects (building needs at least 3 wood). Benefits must be fair for the cost and time.
Mild folk superstition is fine, but no real magic. Reply with JSON only.`;

export const FORMAT = `Reply as JSON:
{"inventions":[{
  "kind":"action" | "building" | "law",
  "label":"short option text, imperative, under 50 chars",
  "text":"what it looks like in 3-10 words, third person present WITHOUT the name, e.g. 'brews a bitter love potion'",
  "minutes": 15-120,
  "where":"a place name from the list, or a place type like forest/tavern/house, or null for anywhere",
  "needs_target": true if done to/with a nearby person,
  "shared": true if other villagers could copy the idea,
  "effects":[ ...effects on success... ],
  "check": null, or {"skill":"...","difficulty":"easy|normal|hard"} if it can fail,
  "fail_effects":[ ...effects if the check fails... ]
}]}`;

export async function askText(system, prompt, maxTokens = 700) {
  const res = await fetch('/api/text', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ system, prompt, maxTokens, json: true }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  sim.stats.inventCost = (sim.stats.inventCost || 0) + (data.cost || 0);
  const raw = String(data.text || '');
  return JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
}

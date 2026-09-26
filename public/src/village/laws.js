// Jev judges whether witnessed actions break the village's invented laws.
import { HEAR_RADIUS } from '../core/constants.js';
import { emit } from '../core/events.js';
import { sim } from '../core/state.js';

export const cache = new Map();

export async function judgeAction(npc, description) {
  if (!sim.ai || !sim.customLaws?.length || !description) return;
  const witnesses = sim.nearby(npc, HEAR_RADIUS).filter(o => o.action?.type !== 'sleep' && o.age >= 12);
  if (!witnesses.length || sim.time - (npc.lastJudged ?? -1e9) < 20) return;
  npc.lastJudged = sim.time;
  const laws = sim.customLaws.slice(-6);
  const place = sim.placeAt(npc.x, npc.y)?.name || 'open fields';
  const key = `${description}@${place}|${laws.join('|')}`;
  let broken = cache.get(key);
  if (broken === undefined) {
    try {
      const questions = Object.fromEntries(laws.map((law, i) => [`law_${i}`, {
        type: 'noul', instructions: `Does the \`action\` clearly break this village law: "${law}"? Only yes if it plainly violates it.`,
      }]));
      const res = await fetch('/api/jev', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state: { action: `a villager ${description}`, place, time: sim.partOfDay(), laws }, questions }),
      });
      const data = await res.json();
      if (!res.ok) return;
      if (data.usage) { sim.stats.calls++; sim.stats.cost += data.usage.cost ?? 0; }
      broken = laws.filter((_, i) => (data.answers?.[`law_${i}`]?.noul ?? 0) > 0.65);
      cache.set(key, broken);
      if (cache.size > 400) cache.delete(cache.keys().next().value);
    } catch { return; }
  }
  for (const law of broken) emit('lawBroken', npc, `breaking the law "${law}"`);
}

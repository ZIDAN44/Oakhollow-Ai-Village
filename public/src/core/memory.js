// Memory stream (after Generative Agents), the chronicle, and telling people what happened.
import { HEAR_RADIUS } from './constants.js';
import { sim } from './state.js';

// ---- Memory stream (after "Generative Agents": recency + importance + relevance).
// importance: 1 mundane … 10 life-changing.

export function remember(npc, text, gist = null, importance = 3) {
  npc.memory.push({ at: sim.time, text: `[Day ${sim.day()} ${sim.clock()}] ${text}`, gist, imp: importance });
  npc.impSinceReflect = (npc.impSinceReflect || 0) + importance;
  if (npc.memory.length > 120) {
    // Forget the least important old memories first.
    const cutoff = npc.memory.length - 120;
    const old = npc.memory.slice(0, 60).map((m, i) => [i, m.imp]).sort((a, b) => a[1] - b[1]).slice(0, cutoff).map(x => x[0]);
    npc.memory = npc.memory.filter((_, i) => !old.includes(i));
  }
}

export function recall(npc, keywords, n = 12) {
  const kws = keywords.filter(Boolean).map(k => k.toLowerCase());
  const scored = npc.memory.map(m => {
    const hoursAgo = (sim.time - m.at) / 60;
    const recency = Math.pow(0.97, hoursAgo);
    const importance = m.imp / 10;
    const text = m.text.toLowerCase();
    const relevance = kws.length ? kws.filter(k => text.includes(k)).length / Math.min(3, kws.length) : 0;
    return { m, s: recency + importance + Math.min(1, relevance) };
  });
  const recent = npc.memory.slice(-4);
  const top = scored.filter(x => !recent.includes(x.m)).sort((a, b) => b.s - a.s).slice(0, n - recent.length).map(x => x.m);
  return [...top, ...recent].sort((a, b) => a.at - b.at);
}

export function chronicle(text, npc, kind = '') {
  sim.log.push({ time: `D${sim.day()} ${sim.clock()}`, text, color: npc?.color, kind });
  if (sim.log.length > 600) sim.log.shift();
  sim.logDirty = true;
  if (kind === 'event' || kind === 'life') sim.tension += 8;
}

// Everyone awake within earshot notices something.
export function witness(actor, text, gist, { radius = HEAR_RADIUS, importance = 3, except = [] } = {}) {
  const seen = [];
  for (const o of sim.npcs) {
    if (o === actor || except.includes(o) || o.action?.type === 'sleep' || o.age < 4 || sim.dist(o, actor) > radius) continue;
    remember(o, text, gist, importance);
    seen.push(o);
  }
  return seen;
}

export function broadcast(text, gist, importance = 5, except = []) {
  for (const o of sim.npcs) if (!except.includes(o)) remember(o, text, gist, importance);
}

export function say(npc, text, ms = 5500, style = 'speech') {
  npc.bubble = { text, until: performance.now() + ms + text.length * 35, style };
}

export function wake(npc) {
  if (npc.action?.type === 'sleep') return;
  if (npc.action?.type === 'wait') npc.action = null;
  npc.nextThinkAt = Math.min(npc.nextThinkAt, sim.time);
}

// News for the whole village. Each person marks it as an event, so minds can react to it (ai/events.js).
export function worldEventAll(text, importance = 7) {
  for (const o of sim.npcs) {
    remember(o, `EVENT: ${text}`, text, importance);
    o.memory.at(-1).event = true;
    o.freshEvent = text;
  }
  sim.npcs.forEach(wake);
}

// The world events a person heard of in the last `hours`, newest first, each once.
export function recentEvents(npc, hours = 6) {
  const seen = new Set();
  return npc.memory.filter(m => m.event && sim.time - m.at < hours * 60).reverse().filter(m => !seen.has(m.gist) && seen.add(m.gist));
}

// Conversation bookkeeping: who has talked to whom, and what is worth gossiping about.
import { sim } from '../core/state.js';

// ------------------------------------------------------------------ Conversation
// Jev chooses an intent; code turns it into words that fit the person, the moment, and the topic.

export const MAX_EXCHANGES = 6;

export const CHAT_COOLDOWN = 120;

export function chatWith(npc, name) {
  const c = npc.chats?.[name];
  if (!c) return 0;
  if (sim.time - c.at > (c.n >= MAX_EXCHANGES ? CHAT_COOLDOWN : 60)) return 0;
  return c.n;
}

export function gossipCandidates(npc) {
  const seen = new Set();
  return npc.memory.filter(m => m.gist && sim.time - m.at < 2 * 1440 && !seen.has(m.gist) && seen.add(m.gist))
    .sort((a, b) => b.imp - a.imp || b.at - a.at).slice(0, 10);
}

export function rememberLine(speaker, target, text) {
  if (!target) return;
  for (const [a, b] of [[speaker, target], [target, speaker]]) {
    a.convo = a.convo || {};
    const list = (a.convo[b.name] = a.convo[b.name] || []);
    list.push({ who: speaker.name, text, at: sim.time });
    if (list.length > 8) list.shift();
  }
}

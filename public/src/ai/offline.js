// A rule-based stand-in for Jev when no key is set.
import { topOf } from './sampling.js';
import { sim } from '../core/state.js';
import { opinion } from '../social/relationships.js';

// ------------------------------------------------------------------ Offline brain
// A crude rule-based stand-in so the village runs without a key. Same answer shape as Jev.

const SHARE = { adopt: 2, repair: 1.5, meeting: 0.3, divorce: 0.1, invented: 2.5, keepPromise: 3, move: 4, say: 5, do: 3, gather: 3, produce: 3, stock: 1, problem: 2, build: 1.5, request: 1.5, respond: 6, give: 0.5, wait: 0.4, eat: 0.3, drink: 0.3, sleep: 0.2, study: 1, sell: 1, buy: 0.5, buyBiz: 1, play: 4, fight: 0.05, steal: 0.05, robBiz: 0.03, voice: 0.5, leave: 0.1 };
const CASUAL = ['greet', 'small_talk', 'share_news', 'joke', 'ask_how', 'compliment', 'invite', 'gossip_about', 'agree', 'answer_honestly', 'farewell', 'ask_about_ruins', 'flirt'];

// Each rule adjusts an option's score in turn (order matters: some add, some multiply).
// c = { npc, n: needs, night }
const SCORE_RULES = [
  // Survival first: a desperate need outweighs everything (Maslow before festivals).
  (s, a, o, { n }) => a.type === 'drink' ? s + Math.max(0, n.thirst - 40) / 4 + Math.max(0, n.thirst - 75) * 3 : s,
  (s, a, o, { n }) => a.type === 'sleep' && (n.thirst > 80 || n.hunger > 80) ? s * 0.1 : s,
  (s, a, o, { n }) => a.type === 'eat' || a.type === 'eatOwn' || (a.type === 'buyBiz' && a.item === 'meal') ? s + Math.max(0, n.hunger - 40) / 4 + Math.max(0, n.hunger - 75) * 3 : s,
  (s, a, o, { n, night }) => a.type === 'sleep' ? s + (night ? 20 : 0) + Math.max(0, 30 - n.energy) : s,
  (s, a, o, { n, night }) => a.type === 'move' && a.then?.type === 'sleep' ? s + (night ? 20 : 0) + Math.max(0, 35 - n.energy) : s,
  (s, a, o, { npc }) => a.type === 'say' && a.target === npc.lastHeardFrom ? s + 6 : s,
  (s, a, o, { npc }) => a.type === 'respond' ? s + (a.accept === (opinion(npc, a.target) > 10) ? 5 : 0) : s,
  (s, a) => a.type === 'request' && ['court', 'marry', 'family'].includes(a.kind) ? s + 1 : s,
  (s, a) => a.type === 'selfCure' ? s + 10 : s,
  (s, a, o) => o.key.startsWith('Attend:') ? s + 3 : s,
  (s, a, o) => o.key.startsWith('Help at ') ? s + 3 : s, // arrived where something happened
  (s, a, o, { npc }) => npc.pregnancy?.labour && /birth/.test(o.key) ? s + 15 : s,
  (s, a, o, { npc }) => npc.sick && /rest/i.test(o.key) ? s + 4 : s,
  (s, a, o) => o.key.startsWith('Keep your promise') || o.key.startsWith('Go meet') ? s + 4 : s,
  (s, a, o, { n }) => a.type === 'gather' && o.key.startsWith('Take ') ? s * (n.hunger > 85 ? 1 : 0.15) : s, // desperation overrides scruples
  (s, a, o, { npc, n }) => isFoodWork(a, o) && n.hunger > 50 && !npc.inv.food ? s + (n.hunger - 40) / 3 : s,
  (s, a, o, { npc }) => a.type === 'gather' && /food/.test(o.key) && sim.season() === 'Autumn' && npc.inv.food < 8 ? s + 3 : s, // lay in stores for winter
  (s, a, o, { npc }) => (a.type === 'fight' || a.type === 'steal') && opinion(npc, a.target) < -40 ? s + 0.5 : s,
  (s, a, o, c) => a.type === 'move' && !a.then ? scoreWalk(s, a, c) : s,
];

const isFoodWork = (a, o) => (a.type === 'gather' && /food/.test(o.key)) || (a.type === 'buy' && a.item === 'food') || (a.type === 'request' && a.kind === 'food');

function scoreWalk(s, a, { npc, n, night }) {
  const p = sim.findPlace(a.target);
  if (p?.water && n.thirst > 55) s += n.thirst / 6 + Math.max(0, n.thirst - 75) * 2;
  if ((p?.res?.item === 'food' || p?.biz?.stock?.meal || p?.market) && n.hunger > 55 && !npc.inv.food) s += n.hunger / 7 + Math.max(0, n.hunger - 75) * 1.5;
  return night ? s * 0.2 : s;
}

// Answers for the non-action questions, by question name.
function otherAnswer(npc, k, q, near) {
  if (k.startsWith('say_')) return { probabilities: Object.fromEntries(Object.keys(q.criteria).map(i => [i, CASUAL.includes(i) ? 3 : 0.5])) };
  if (k.startsWith('feel_')) return { score: 2 + opinion(npc, near[Number(k.split('_')[1])].name) / 35 };
  if (k.startsWith('attract_')) return { noul: Math.random() * 0.8 };
  if (k === 'vote') return { probabilities: Object.fromEntries(Object.keys(q.criteria).map(c => [c, Math.max(0.05, 50 + opinion(npc, c))])) };
  if (k === 'goal') return { choice: npc.goal };
  if (k === 'event_reaction') return { probabilities: { help: 1, keep_away: 0.5, carry_on: 2 } };
  return q?.criteria ? { probabilities: Object.fromEntries(Object.keys(q.criteria).map(k => [k, 1])) } : null;
}

export function offlineAnswers(npc, options, questions, near) {
  const n = npc.needs;
  const c = { npc, n, night: sim.isNight() };
  const counts = {};
  for (const o of options) counts[o.act.type] = (counts[o.act.type] || 0) + 1;
  const score = o => Math.max(0.005, SCORE_RULES.reduce((s, rule) => rule(s, o.act, o, c), (SHARE[o.act.type] ?? 0.5) / counts[o.act.type]));
  const w = options.map(score);
  const total = w.reduce((x, y) => x + y, 0);
  const probabilities = Object.fromEntries(options.map((o, i) => [o.key, w[i] / total]));
  const out = { action: { probabilities, choice: topOf(probabilities)[0][0] } };
  for (const [k, q] of Object.entries(questions)) {
    if (k !== 'action' && k !== 'mood') out[k] = otherAnswer(npc, k, q, near);
  }
  out.mood = { score: Math.max(0, Math.min(4, 3 - (n.hunger > 70) - (n.thirst > 70) - (npc.sick ? 1 : 0) - (npc.grief ? 1.5 : 0))) };
  return out;
}

// Thinking: one Jev request per decision, sampled from its probabilities.
import { applyJudgements, voiceReply } from './judgements.js';
import { topOf, choose } from './sampling.js';
import { offlineAnswers } from './offline.js';
import { buildOptions } from './options/index.js';
import { buildState } from './perception.js';
import { allowedIntents, buildQuestions, hasMet } from './questions.js';
import { writeLine } from './speech/write.js';
import { sim } from '../core/state.js';
import { gossipCandidates } from '../social/conversation.js';
import { renderLine } from '../social/lines.js';

// ------------------------------------------------------------------ Thinking

export async function think(npc) {
  const near = sim.nearby(npc, 140).filter(o => o.action?.type !== 'sleep' && o.age >= 3);
  const options = buildOptions(npc);
  const questions = buildQuestions(npc, options, near);
  const { answers, usage, source } = sim.ai
    ? await askJev(npc, near, questions)
    : { answers: offlineAnswers(npc, options, questions, near), usage: null, source: 'offline' };

  applyJudgements(npc, answers, near);

  const chosenKey = choose(answers.action);
  const chosen = voiceReply(npc, answers)
    || options.find(o => o.key === chosenKey) || options.find(o => o.key === answers.action?.choice) || options[options.length - 1];
  const act = structuredClone(chosen.act);
  if (act.type === 'say') prepareSay(npc, act, answers, near);
  if (sim.speech && SPOKEN.includes(act.type)) await addFreeformWords(npc, act); // no await otherwise: keeps offline ticks synchronous

  npc.mind = {
    source,
    top: answers.action?.probabilities ? topOf(answers.action.probabilities).slice(0, 5) : [[chosen.key, 1]],
    chosen: chosen.key,
    confidence: answers.action?.confidence,
    options: options.length,
  };
  return { act, usage };
}

async function askJev(npc, near, questions) {
  const res = await fetch('/api/jev', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state: buildState(npc, near), questions }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return { answers: data.answers || {}, usage: data.usage || null, source: 'jev' };
}

// Settle what kind of thing to say, which news and which person it's about, and the built-in phrase.
function prepareSay(npc, act, answers, near) {
  const idx = near.findIndex(o => o.name === act.target);
  const ans = act.target === 'everyone' ? answers.say_all : answers[`say_${idx}`];
  const target = act.target === 'everyone' ? null : sim.findNpc(act.target);
  const allowed = allowedIntents(npc, target);
  let intent = choose(ans);
  if (!intent || !allowed[intent]) intent = ['greet', 'small_talk'].find(k => allowed[k]) || Object.keys(allowed)[0] || 'small_talk';
  const newsItem = pickNews(npc, target, answers);
  if (intent === 'share_news' && !newsItem) intent = 'small_talk';
  const replyTo = npc.lastHeard?.from === act.target ? npc.lastHeard : null;
  const person = pickPerson(npc, act, answers, replyTo);
  Object.assign(act, { intent, news: newsItem?.gist, person, replyTo });
  act.text = renderLine(intent, npc, target ? target.name : 'everyone', { news: newsItem?.gist, person, replyTo });
}

function pickNews(npc, target, answers) {
  const news = gossipCandidates(npc);
  const aboutThem = g => target && new RegExp(`\\b${target.name}\\b`).test(g.gist); // don't tell people news about themselves
  const item = news[Number(String(answers.news?.choice || '').replace('news_', ''))] || news[0];
  return item && aboutThem(item) ? news.find(g => !aboutThem(g)) : item;
}

function pickPerson(npc, act, answers, replyTo) {
  if (replyTo?.topic === 'person' && replyTo.person) return replyTo.person;
  const person = answers.topic_person?.choice;
  if (person && person !== act.target) return person;
  return sim.npcs.find(o => o !== npc && o.name !== act.target && hasMet(npc, o.name))?.name;
}

// Free-form words from the text model (keeps the built-in phrase if it fails).
async function addFreeformWords(npc, act) {
  const target = act.target && act.target !== 'everyone' ? sim.findNpc(act.target) : null;
  const out = await writeLine(npc, act, target);
  if (out) { act.text = out.text; act.promise = out.promise; act.freeform = true; }
}

const SPOKEN = ['say', 'request', 'respond', 'voice', 'punish', 'fire', 'breakup'];

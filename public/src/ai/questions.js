// The typed questions sent to Jev alongside the action.
import { eventQuestion } from './events.js';
import { sim } from '../core/state.js';
import { VOICE_BELIEFS, VOICE_REACTIONS } from '../data/lore.js';
import { ADULT_ROLES } from '../data/skills.js';
import { fill, genderWord, orientationWord } from '../identity/identity.js';
import { chatWith, gossipCandidates } from '../social/conversation.js';
import { INTENTS } from '../social/intents.js';
import { canRomance, opinion, relLabel } from '../social/relationships.js';

export const MOOD_LEVELS = ['miserable', 'sad or worried', 'calm', 'content', 'joyful'];

export const FEEL_LEVELS = ['hates them', 'dislikes them', 'neutral', 'likes them', 'loves them'];

// ------------------------------------------------------------------ Questions

// Which kinds of line fit this moment. Each rule rules an intent out.
const INTENT_NEEDS = {
  news: c => c.hasNews(),
  grief: c => c.npc.grief,
  belief: c => c.npc.belief,
  aware: c => c.npc.voiceCount || c.npc.awareness > 20,
  owed: c => c.npc.owed === c.o?.name,
};
const ADULT_ONLY = ['threaten', 'insult', 'flirt', 'confide_secret', 'vent_grief'];
const REPLIES_TO_QUESTIONS = ['answer_honestly', 'lie', 'deflect'];
const INTENT_RULES = [
  (k, v, c) => v.reply && !c.heardRecently,
  (k, v, c) => REPLIES_TO_QUESTIONS.includes(k) && !c.wasQuestion,
  (k, v, c) => v.needs && INTENT_NEEDS[v.needs] && !INTENT_NEEDS[v.needs](c),
  (k, v, c) => v.romance && c.o && !canRomance(c.npc, c.o),
  (k, v, c) => k === 'confide_secret' && !c.npc.secret,
  (k, v, c) => c.npc.age < 16 && ADULT_ONLY.includes(k),
];

export function allowedIntents(npc, o) {
  const heardRecently = npc.lastHeard && npc.lastHeard.from === o?.name && sim.time - npc.lastHeard.at < 40;
  const wasQuestion = heardRecently && (INTENTS[npc.lastHeard.intent]?.question || npc.lastHeard.intent === 'flirt');
  const c = { npc, o, heardRecently, wasQuestion, hasNews: () => gossipCandidates(npc).length > 0 };
  const out = {};
  for (const [k, v] of Object.entries(INTENTS)) {
    if (!INTENT_RULES.some(rule => rule(k, v, c))) out[k] = v.desc;
  }
  return out;
}

export function goalCandidates(npc) {
  const g = new Set([npc.goal, npc.coreGoal]);
  const others = sim.npcs.filter(o => o !== npc && o.age >= 16);
  const crush = others.filter(o => canRomance(npc, o) && npc.partner !== o.name).sort((a, b) => opinion(npc, b.name, 'rom') - opinion(npc, a.name, 'rom'))[0];
  if (crush && opinion(npc, crush.name, 'rom') > 20) g.add(`Win ${crush.name}'s heart`);
  const enemy = [...others].sort((a, b) => opinion(npc, a.name) - opinion(npc, b.name))[0];
  if (enemy && opinion(npc, enemy.name) < -30) { g.add(`Get revenge on ${enemy.name}`); g.add(`Make peace with ${enemy.name}`); }
  if (npc.spouse && !npc.children.length) g.add(`Start a family with ${npc.spouse}`);
  if (npc.children.length) g.add(`Give my child ${npc.children[0]} a good life`);
  if (!npc.partner) g.add('Find love');
  if (!sim.places.some(p => p.biz?.owner === npc.name)) g.add('Open my own business and grow rich');
  if (sim.leader !== npc.name) g.add('Become the leader of Oakhollow');
  const best = Object.entries(npc.skills).sort((a, b) => b[1] - a[1])[0];
  if (best) g.add(`Become a master of ${best[0]}`);
  for (const pr of sim.problems.filter(p => !p.solved).slice(0, 3)) g.add(`Solve: ${pr.title}`);
  if (npc.voiceCount) g.add('Find out who or what the Voice is');
  if (npc.belief?.conviction > 0.5) g.add('Make the whole village believe in the Voice');
  if (npc.grief) g.add(`Honour ${npc.grief.name}'s memory`);
  g.add('Leave Oakhollow and start a new life');
  return [...g].filter(Boolean).slice(0, 14);
}

export const hasMet = (npc, name) => npc.rel?.[name]?.met;

export function buildQuestions(npc, options, near) {
  const me = npc.name;
  const q = {
    action: {
      type: 'choice',
      instructions: `What does ${me} (\`you\`) do next? Choose what this person would truly do right now, given their personality, life_goal, secret, mood, relationships and why they feel that way, requests_to_you, recent_events, memories, the village situation, and their body. Urgent needs (starving, desperately thirsty, exhausted, gravely hurt) usually come first. People answer when spoken to, but conversations end after a few lines. Violence and theft are rare and only for the angry, desperate or wicked.`,
      criteria: Object.fromEntries(options.map(o => [o.key, o.desc])),
    },
    mood: { type: 'score', instructions: `How does ${me} feel right now?`, criteria: MOOD_LEVELS },
  };

  near.slice(0, 3).forEach((o, i) => {
    q[`say_${i}`] = {
      type: 'choice',
      instructions: `If ${me} speaks to ${o.name} now, what kind of thing does ${me} say? Consider their relationship (${relLabel(npc, o.name)}), what ${o.name} last said, ${me}'s personality and goal. Avoid repeating \`things_you_said_recently\`. ${chatWith(npc, o.name) >= 3 ? 'The chat has gone on a while; it should wind down.' : ''}`,
      criteria: allowedIntents(npc, o),
    };
    q[`feel_${i}`] = { type: 'score', instructions: `How does ${me} feel about ${o.name}, given their history (\`people_near[${i}].because\`) and memories?`, criteria: FEEL_LEVELS };
    if (canRomance(npc, o) && hasMet(npc, o.name)) {
      q[`attract_${i}`] = { type: 'noul', instructions: `Is ${me} (${orientationWord(npc)}) romantically attracted to ${o.name} (a ${genderWord(o)}), given their personalities, ages, history together, and whether either is already taken?` };
    }
  });
  if (near.length >= 2) q.say_all = { type: 'choice', instructions: `If ${me} addresses everyone nearby, what kind of thing do they say?`, criteria: allowedIntents(npc, null) };

  const news = gossipCandidates(npc);
  if (news.length) q.news = { type: 'choice', instructions: `Which news would ${me} most want to tell people?`, criteria: Object.fromEntries(news.map((m, i) => [`news_${i}`, m.gist])) };
  const known = sim.npcs.filter(o => o !== npc && hasMet(npc, o.name)).slice(0, 12);
  if (known.length >= 2) q.topic_person = { type: 'choice', instructions: `Which villager is on ${me}'s mind the most right now?`, criteria: Object.fromEntries(known.map(o => [o.name, relLabel(npc, o.name)])) };

  if (sim.election && npc.age >= 16 && !sim.election.votes[me]) {
    q.vote = {
      type: 'choice',
      instructions: `There is an election for village leader. Who does ${me} vote for, based on who they trust and like, and who would lead well?`,
      criteria: Object.fromEntries(sim.election.candidates.map(c => [c, `${relLabel(npc, c)}${c === me ? ' (themself)' : ''}`])),
    };
  }
  if (npc.pendingVoice) {
    q.voice_belief = {
      type: 'choice',
      instructions: `${me} has heard a voice in their head (see memories). What does ${me} come to believe it is, given their personality, beliefs, losses and what it said?`,
      criteria: Object.fromEntries(Object.entries(VOICE_BELIEFS).map(([k, v]) => [k, fill(v.desc, npc)])),
    };
  }
  if (npc.unansweredWhisper) {
    q.voice_reaction = {
      type: 'choice',
      instructions: fill(`A voice in ${me}'s head just said: "${npc.lastWhisper}". How does ${me} react right now, given {their} personality, mood and what {they} believe{s} the voice is?`, npc),
      criteria: Object.fromEntries(Object.entries(VOICE_REACTIONS).map(([k, v]) => [k, fill(v.desc, npc)])),
    };
  }
  Object.assign(q, eventQuestion(npc, options));
  if (npc.comingOfAge) {
    q.role = {
      type: 'choice',
      instructions: `${me} has just come of age. What trade will ${me} take up, given their parents, skills and personality?`,
      criteria: Object.fromEntries(ADULT_ROLES.map(r => [r, null])),
    };
  }
  // Reflection (after "Generative Agents"): when enough has happened, decide what it all means.
  if (npc.age >= 12 && (npc.impSinceReflect > 70 || npc.justWoke)) {
    const recentImportant = npc.memory.filter(m => sim.time - m.at < 1440 && m.imp >= 5).slice(-10);
    if (recentImportant.length) {
      q.keep = { type: 'choice', instructions: `Which of these moments will ${me} remember for the rest of their life?`, criteria: Object.fromEntries(recentImportant.map((m, i) => [`m${i}`, m.text])) };
      npc._reflectMems = recentImportant;
    }
    q.goal = { type: 'choice', instructions: `Given everything that has happened, what is ${me}'s main goal in life now?`, criteria: Object.fromEntries(goalCandidates(npc).map(g => [g, null])) };
  }
  return q;
}

// Applying Jev's other answers: mood, feelings, votes, beliefs, reflection.
import { MOOD_LEVELS } from './questions.js';
import { choose } from './sampling.js';
import { sim } from '../core/state.js';
import { pick } from '../core/util.js';
import { VOICE_BELIEFS, VOICE_REACTIONS } from '../data/lore.js';
import { ADULT_ROLES, ROLE_SKILL } from '../data/skills.js';
import { FIRST, fill } from '../identity/identity.js';
import { driftBase } from '../social/relationships.js';

export function note(npc, text, kind) {
  sim.log.push({ time: `D${sim.day()} ${sim.clock()}`, text, color: npc.color, kind });
  sim.logDirty = true;
}

// Everything besides the action: feelings, attraction, mood, votes, beliefs, reflection.
// Order matters: several steps sample from Jev's probabilities.
export function applyJudgements(npc, answers, near) {
  for (const step of JUDGEMENT_STEPS) step(npc, answers, near);
}

// A whisper is someone speaking to you, so it gets its own question (the "inner voice" of Generative Agents).
// As an everyday option it competed with everything else and Jev scored it 0, so nobody ever answered.
// Returns the chosen { key, act } when the person answers the voice, or null.
export function voiceReply(npc, answers) {
  if (!npc.unansweredWhisper || !answers.voice_reaction) return null;
  npc.unansweredWhisper = false;
  const r = VOICE_REACTIONS[choose(answers.voice_reaction)];
  return r?.mode ? { key: r.label, act: { type: 'voice', mode: r.mode } } : null;
}

function applyMood(npc, answers) {
  if (answers.mood?.score == null) return;
  npc.moodScore = answers.mood.score;
  npc.mood = MOOD_LEVELS[Math.max(0, Math.min(4, Math.round(answers.mood.score)))];
}

function applyFeelings(npc, answers, near) {
  near.slice(0, 3).forEach((o, i) => {
    const f = answers[`feel_${i}`];
    if (f?.score != null) driftBase(npc, o.name, 'aff', (f.score - 2) * 35, 0.12);
    const a = answers[`attract_${i}`];
    if (a?.noul != null) driftBase(npc, o.name, 'rom', a.noul > 0.3 ? (a.noul - 0.3) * 130 : (a.noul - 0.3) * 40, 0.1);
  });
}

function applyVote(npc, answers) {
  if (!answers.vote || !sim.election) return;
  const v = choose(answers.vote);
  if (!v || !sim.election.candidates.includes(v)) return;
  sim.election.votes[npc.name] = v;
  npc.lifeMemories.push(`I voted for ${v} as leader on day ${sim.day()}.`);
}

function applyBelief(npc, answers) {
  if (!answers.voice_belief) return;
  const kind = choose(answers.voice_belief);
  if (kind && VOICE_BELIEFS[kind]) {
    const was = npc.belief?.kind;
    npc.belief = { kind, conviction: was === kind ? Math.min(1, (npc.belief.conviction || 0.3) + 0.2) : 0.4 };
    if (was !== kind) {
      npc.lifeMemories.push(`I came to believe the Voice is this: ${fill(VOICE_BELIEFS[kind].desc, FIRST).replace(/^It/, 'it')}.`);
      note(npc, `🌀 ${npc.name} now believes: ${fill(VOICE_BELIEFS[kind].desc, npc).replace(/^It/, 'it')}.`, 'voice');
    }
  }
  npc.pendingVoice = false;
}

function applyRole(npc, answers) {
  if (!answers.role || !npc.comingOfAge) return;
  const role = choose(answers.role) || pick(ADULT_ROLES);
  npc.role = role;
  npc.comingOfAge = false;
  npc.goal = `Become a respected ${role}.`;
  const sk = ROLE_SKILL[role];
  if (sk) npc.skills[sk] = Math.max(npc.skills[sk], 25);
  npc.lifeMemories.push(`I came of age and became a ${role}.`);
  note(npc, `🎓 ${npc.name} has chosen to become a ${role}.`, 'life');
}

function applyKeep(npc, answers) {
  if (!answers.keep || !npc._reflectMems) return;
  const m = npc._reflectMems[Number(String(choose(answers.keep)).replace('m', ''))];
  if (!m) return;
  const text = m.text.replace(/^\[[^\]]+\]\s*/, '');
  if (!npc.lifeMemories.includes(text)) npc.lifeMemories.push(text);
  if (npc.lifeMemories.length > 20) npc.lifeMemories.splice(0, npc.lifeMemories.length - 20);
}

function applyGoal(npc, answers) {
  if (!answers.goal) return;
  const g = choose(answers.goal);
  if (!g || g === npc.goal) return;
  npc.lifeMemories.push(`Day ${sim.day()}: my purpose changed. ${g}.`);
  note(npc, `🎯 ${npc.name} has a new purpose in life: ${g}.`, 'life');
  npc.goal = g;
}

function endReflection(npc, answers) {
  if (answers.keep || answers.goal) { npc.impSinceReflect = 0; npc.justWoke = false; npc._reflectMems = null; }
}

const JUDGEMENT_STEPS = [applyMood, applyFeelings, applyVote, applyBelief, applyRole, applyKeep, applyGoal, endReflection];

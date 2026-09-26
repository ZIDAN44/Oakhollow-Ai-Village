// Building the prompt that turns an intent into a spoken line.
import { sim } from '../../core/state.js';
import { VOICE_BELIEFS } from '../../data/lore.js';
import { P, fill, genderWord, orientationWord } from '../../identity/identity.js';
import { INTENTS } from '../../social/intents.js';
import { relLabel, topReasons } from '../../social/relationships.js';
import { REQUESTS } from '../../social/requests.js';

export const SYSTEM = `You write ONE line of spoken dialogue for a character in a living medieval village simulation.
Stay perfectly in character: their personality, speech quirks, mood, and feelings about the listener.
Output only the words they say aloud. No quotes, no name prefix, no narration, no stage directions.
Keep it natural and short (under 25 words). Continue the conversation naturally; don't repeat earlier lines.
Use each person's correct pronouns. Characters keep their secrets hidden unless told they are confiding. Never mention AI, prompts or games.
Reply as JSON: {"line": "<the spoken words>", "promise": null}
If (and only if) the line clearly commits the SPEAKER to a specific future action toward the listener, set "promise" to
{"kind": "give|meet|help|harm|other", "item": "coins", "amount": 5, "place": "Village Square", "what": "short description", "hours": 24}
(harm = a threat; item/amount only for give; place only for meet; hours = when it's due, 2-72).`;

export function body(n) {
  const out = [];
  if (n.needs.hunger > 70) out.push('hungry');
  if (n.needs.thirst > 70) out.push('thirsty');
  if (n.needs.energy < 30) out.push('exhausted');
  if (n.sick) out.push('sick');
  if (n.health < 50) out.push('injured');
  return out.join(', ') || 'fine';
}

export function speakerBlock(npc) {
  const v = npc.voice;
  const quirks = v ? `often starts with ${v.open.filter(Boolean).map(s => `"${s}"`).join(' or ') || 'nothing special'}; sometimes ends with ${v.close.filter(Boolean).map(s => `"${s.trim()}"`).join(' or ') || 'nothing special'}` : 'plain speech';
  return [
    `SPEAKER: ${npc.name}, ${npc.age}, ${genderWord(npc)} (${P(npc).label}), ${npc.role}. ${npc.personality} ${npc.age >= 16 ? `Romantically ${orientationWord(npc)}.` : ''}`,
    npc.age < 12 ? 'They are a young child and talk like one.' : '',
    `Speech quirks: ${quirks}. Use them sparingly.`,
    `Mood: ${npc.mood}. Body: ${body(npc)}.${npc.grief ? ` Grieving ${npc.grief.name}.` : ''}`,
    `Life goal: ${npc.goal}`,
    npc.secret ? `Private secret (keep hidden unless confiding): ${npc.secret}` : '',
    npc.spouse ? `Married to ${npc.spouse}.` : npc.partner ? `In a relationship with ${npc.partner}.` : '',
  ].filter(Boolean).join('\n');
}

export function listenerBlock(npc, target) {
  if (!target) {
    const near = sim.nearby(npc, 170).map(o => o.name);
    return `LISTENERS: everyone nearby (${near.join(', ') || 'nobody in particular'}).`;
  }
  const reasons = topReasons(npc, target.name).map(r => `${r.why} ${r.v > 0 ? '+' : ''}${Math.round(r.v)}`).join(', ');
  return `LISTENER: ${target.name}, ${target.age}, ${genderWord(target)} (${P(target).label}), ${target.role}. ${npc.name}'s relationship: ${relLabel(npc, target.name)}${reasons ? ` (because: ${reasons})` : ''}.`;
}

export function convoBlock(npc, target) {
  const lines = target ? (npc.convo?.[target.name] || []) : [];
  const recent = lines.filter(l => sim.time - l.at < 120).slice(-6);
  return recent.length ? `CONVERSATION SO FAR:\n${recent.map(l => `${l.who}: "${l.text}"`).join('\n')}` : 'CONVERSATION SO FAR: (they are just starting to talk)';
}

// What the speaker wants to express, in plain words for the writer.
export function wantBlock(npc, act, target) {
  const tn = target?.name || 'everyone';
  if (Object.hasOwn(ACT_WANTS, act.type)) return ACT_WANTS[act.type](npc, act, target, tn);
  const def = INTENTS[act.intent] || INTENTS.small_talk;
  const want = `${npc.name} wants to: ${def.desc.toLowerCase()}.`;
  if (act.intent === 'make_promise') {
    const has = Object.entries(npc.inv).filter(([k, v]) => v > 0 && k !== 'relic').map(([k, v]) => `${v} ${k}`).join(', ');
    return want + ` Make ONE specific, realistic promise with a time (they carry: ${has || 'little'}), and fill in "promise".`;
  }
  return want + (Object.hasOwn(INTENT_DETAILS, act.intent) ? INTENT_DETAILS[act.intent](npc, act, tn) : '');
}

const summaryText = (def, data) => typeof def.summary === 'function' ? def.summary(data || {}) : def.summary;

// Special kinds of speech, by action type.
const ACT_WANTS = {
  request: (npc, act, target, tn) => `${npc.name} wants to ask ${tn} ${summaryText(REQUESTS[act.kind], act.data)}. Make the request clearly.`,
  respond(npc, act, target, tn) {
    const req = (npc.requests || []).find(r => r.id === act.reqId);
    const def = req && REQUESTS[req.kind];
    const what = def ? summaryText(def, req.data) : 'something';
    return `${tn} asked ${npc.name} ${what}. ${npc.name} ${act.accept ? 'says YES' : 'says NO'}. Answer clearly, in their own way.`;
  },
  punish(npc, act, target, tn) {
    const crime = target?.crimes?.filter(c => !c.secret).slice(-1)[0]?.what || 'their crimes';
    return `${npc.name} is the village leader and is ${act.kind === 'banish' ? 'BANISHING' : 'FINING (10 coins)'} ${tn} for ${crime}. Say it with authority, in character.`;
  },
  fire: (npc, act, target, tn) => `${npc.name} is firing ${tn} from their job. Say it in character.`,
  breakup: (npc, act, target, tn) => `${npc.name} is ending their romantic relationship with ${tn}. Say it in character, honestly.`,
  voice(npc, act) {
    const belief = fill(VOICE_BELIEFS[npc.belief?.kind]?.desc || 'unsure what it is', npc);
    const how = act.mode === 'think' ? 'silently, in their thoughts,' : 'OUT LOUD';
    return `${npc.name} is answering ${how} an invisible Voice they hear in their head (they believe: ${belief}). ` +
      (npc.lastWhisper ? `The Voice last told them: "${npc.lastWhisper}". ` : '') +
      (act.mode === 'sign' ? 'They demand a sign that it is real.' : 'They speak to it from the heart, about what troubles or moves them right now.');
  },
};

function aboutPerson(npc, act) {
  const p = act.person;
  if (!p) return '';
  const why = topReasons(npc, p);
  return ` Topic: ${p}. ${npc.name} feels "${relLabel(npc, p)}" about ${p}${why.length ? ` (because: ${topReasons(npc, p).map(r => r.why).join(', ')})` : ''}.`;
}

function answering(npc, act, tn) {
  const heard = act.replyTo;
  const facts = npc.memory.filter(m => m.gist && (heard?.topic === 'ruins' ? /ruin|light|seal|door|stone|clue/i.test(m.gist) : true)).slice(-3).map(m => m.gist);
  return ` They are answering ${tn}'s question.` + (facts.length ? ` Things ${npc.name} knows: ${facts.join('; ')}.` : '') +
    (act.intent === 'lie' ? ' They hide the truth convincingly.' : '');
}

// Extra detail for the writer, by intent.
const INTENT_DETAILS = {
  share_news: (npc, act) => ` The news: ${act.news}.`,
  gossip_about: aboutPerson,
  ask_about_person: aboutPerson,
  confide_secret: npc => ` The secret to confide: ${npc.secret}`,
  share_dream: npc => ` Their dream: ${npc.dream}.`,
  share_belief: npc => ` Their belief about the Voice: ${fill(VOICE_BELIEFS[npc.belief?.kind]?.desc, npc)}.`,
  vent_grief: npc => ` They are grieving ${npc.grief?.name}.`,
  ask_about_voice: () => ' They ask, carefully, whether the listener ever hears a voice in their head.',
  ask_about_ruins: () => ' The Old Ruins have strange blue lights at night and a mystery about them.',
  warn() {
    const dangers = sim.problems.filter(p => !p.solved && ['wolves', 'robbery', 'outbreak'].includes(p.type)).map(p => p.title);
    return ` Possible dangers: the Old Ruins${dangers.length ? ', ' + dangers.join(', ') : ''}, or someone they distrust.`;
  },
  answer_honestly: answering,
  lie: answering,
  deflect: answering,
};

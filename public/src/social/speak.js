// Saying something out loud, and how it lands on everyone who hears it.
import { HEAR_RADIUS } from '../core/constants.js';
import { chronicle, remember, say, wake } from '../core/memory.js';
import { sim } from '../core/state.js';
import { VOICE_BELIEFS } from '../data/lore.js';
import { P, fill } from '../identity/identity.js';
import { MAX_EXCHANGES, chatWith, rememberLine } from './conversation.js';
import { INTENTS } from './intents.js';
import { addMod, canRomance, opinion, rel } from './relationships.js';
import { spreadBelief } from './voice.js';

// Someone says something. Apply its effects on everyone who hears it.
export function speak(npc, target, act) {
  const text = act.text || '...';
  const tName = target ? target.name : 'everyone';
  const def = INTENTS[act.intent] || {};
  say(npc, text);
  chronicle(`${npc.name} → ${tName}: "${text}"`, npc, 'speech');
  remember(npc, `You said to ${tName}: "${text}"`, null, Math.max(1, (def.imp || 2) - 1));
  npc.recentLines = [...(npc.recentLines || []), text].slice(-6);
  rememberLine(npc, target, text);
  if (target) countExchange(npc, target, act);

  const { gist, imp } = gistOf(npc, tName, act, text, def);
  const line = { npc, target, tName, act, def, text, gist, imp };
  for (const o of sim.npcs) {
    if (o === npc || o.action?.type === 'sleep' || o.age < 3 || sim.dist(o, npc) > HEAR_RADIUS) continue;
    hear(o, line);
  }
  if (npc.lastHeardFrom === tName) npc.lastHeardFrom = null;
}

function countExchange(npc, target, act) {
  const n = act.intent === 'farewell' ? MAX_EXCHANGES : chatWith(npc, target.name) + 1;
  for (const [a, b] of [[npc, target], [target, npc]]) {
    a.chats = a.chats || {};
    a.chats[b.name] = { n, at: sim.time };
    rel(a, b.name).met = true;
  }
}

// What spreads as gossip, by intent.
const GISTS = {
  share_news: (npc, tName, act) => act.news,
  confide_secret: npc => `${npc.name} confided a secret: "${npc.secret}"`,
  flirt: (npc, tName) => `${npc.name} was flirting with ${tName}`,
  argue: (npc, tName) => `${npc.name} and ${tName} had a nasty quarrel`,
  insult: (npc, tName) => `${npc.name} and ${tName} had a nasty quarrel`,
  threaten: (npc, tName) => `${npc.name} and ${tName} had a nasty quarrel`,
  gossip_about: (npc, tName, act) => `${npc.name} says ${act.person} ${opinion(npc, act.person) >= 0 ? 'is a good sort' : 'is not to be trusted'}`,
  share_belief: npc => `${npc.name} believes: ${fill(VOICE_BELIEFS[npc.belief?.kind]?.desc || 'something strange', npc)}`,
};

function gistOf(npc, tName, act, text, def) {
  const imp = def.imp || 2;
  if (act.intent === 'answer_honestly' && act.replyTo?.topic === 'ruins' && /seal|figure|H\.A\.|door|stone/i.test(text)) {
    return { gist: `${npc.name} revealed: "${text}"`, imp: 7 };
  }
  return { gist: Object.hasOwn(GISTS, act.intent) ? GISTS[act.intent](npc, tName, act) : null, imp };
}

const topicOf = (def, act) => def.topic || (def.needs === 'person' ? 'person' : act.intent === 'ask_how' ? 'how' : act.intent === 'flirt' ? 'flirt' : null);

// One person hears the line: they remember it, and if it was said to them, it affects them.
function hear(o, { npc, target, tName, act, def, text, gist, imp }) {
  const addressed = o === target || !target;
  if (!addressed && act.intent === 'confide_secret' && sim.dist(o, npc) > 50) return; // secrets are whispered
  remember(o, addressed ? `${npc.name} said to ${target ? 'you' : 'everyone'}: "${text}"` : `You overheard ${npc.name} say to ${tName}: "${text}"`, gist, addressed ? imp : Math.max(1, imp - 1));
  if (!addressed) return;
  applyListenerEffects(npc, o, act, def);
  o.lastHeard = { from: npc.name, intent: act.intent, topic: topicOf(def, act), person: act.person, at: sim.time };
  if (chatWith(o, npc.name) < MAX_EXCHANGES) { o.lastHeardFrom = npc.name; wake(o); }
  else if (o.lastHeardFrom === npc.name) o.lastHeardFrom = null;
}

export function applyListenerEffects(speaker, o, act, def) {
  const s = speaker.name;
  if (def.eff) addMod(o, s, def.why || `talks with me (${act.intent.replace('_', ' ')})`, def.eff, def.hl || 24);
  if (Object.hasOwn(REACTIONS, def.special)) REACTIONS[def.special](speaker, o);
  if (act.intent === 'gossip_about' && act.person && act.person !== o.name) {
    const stance = opinion(speaker, act.person) >= 0 ? 1 : -1;
    const weight = opinion(o, s, 'trust') > 0 ? 5 : 2;
    addMod(o, act.person, `${s} spoke ${stance > 0 ? 'well' : 'ill'} of ${P(sim.findNpc(act.person)).them}`, { aff: stance * weight }, 72);
  }
  if (act.intent === 'comfort' && o.moodScore != null) o.moodScore = Math.min(4, o.moodScore + 0.5);
  if (act.intent === 'confide_secret') addMod(speaker, o.name, `I trusted ${P(o).them} with my secret`, { trust: 8 }, 240);
}

function flirtedWith(speaker, o) {
  const s = speaker.name;
  const taken = o.spouse && o.spouse !== s;
  const receptive = canRomance(o, speaker) && (opinion(o, s, 'rom') > 10 || opinion(o, s) > 30) && !taken;
  if (receptive) addMod(o, s, 'flirted with me', { rom: 8, aff: 2 }, 96);
  else addMod(o, s, 'made an awkward pass at me', { aff: -3 }, 48);
  if (taken) {
    const spouse = sim.findNpc(o.spouse);
    if (spouse && sim.dist(spouse, speaker) < HEAR_RADIUS) addMod(spouse, s, 'flirted with my spouse', { aff: -20, trust: -15 }, 120);
  }
  addMod(speaker, o.name, `I am drawn to ${P(o).them}`, { rom: 3 }, 96);
}

// Special reactions of the listener, by the intent's `special` tag.
const REACTIONS = {
  flirt: flirtedWith,
  joke(speaker, o) {
    const s = speaker.name;
    addMod(o, s, opinion(o, s) >= 0 ? 'made me laugh' : 'mocked me', { aff: opinion(o, s) >= 0 ? 4 : -4 }, 24);
  },
  apologize(speaker, o) {
    const s = speaker.name;
    rel(o, s).mods.forEach(m => { if ((m.aff || 0) < 0) m.aff *= 0.5; if ((m.trust || 0) < 0) m.trust *= 0.6; });
    addMod(o, s, 'apologised to me', { aff: 5, trust: 3 }, 48);
  },
  belief: spreadBelief,
};

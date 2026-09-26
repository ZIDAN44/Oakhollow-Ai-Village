// Turning an intent into words when no text model is available.
import { sim } from '../core/state.js';
import { cap, pick } from '../core/util.js';
import { BASE_PRICES } from '../data/economy.js';
import { VOICE_BELIEFS } from '../data/lore.js';
import { marketPrice } from '../economy/market.js';
import { ANSWERS, INTENTS, WEATHER_TALK } from './intents.js';
import { opinion } from './relationships.js';

export function bodyWorst(n) {
  if (n.health < 40) return ['badly hurt', 'I\'m hurting all over.'];
  if (n.sick) return ['sick as a dog', 'This sickness won\'t let go of me.'];
  if (n.needs.hunger > 60) return ['starving', 'I haven\'t eaten properly in ages.'];
  if (n.needs.thirst > 60) return ['parched', 'I\'d kill for some water.'];
  if (n.needs.energy < 30) return ['dead on my feet', 'I can barely keep my eyes open.'];
  if (n.grief) return ['grieving', `I miss ${n.grief.name}.`];
  return ['worn out', 'Just tired, I suppose.'];
}

export function renderLine(intent, npc, target, ctx = {}) {
  const lines = candidateLines(intent, npc, ctx);
  const used = npc.usedLines || [];
  const fresh = lines.filter(l => !used.includes(l));
  const text = pick(fresh.length ? fresh : lines);
  npc.usedLines = [...used, text].slice(-16);
  return cap(personalise(fillSlots(text, npc, target, ctx), npc));
}

// The stock phrases that fit this intent (and, for answers, the question that was asked).
function candidateLines(intent, npc, ctx) {
  const def = INTENTS[intent] || INTENTS.small_talk;
  let lines = def.lines;
  if (intent === 'gossip_about') lines = opinion(npc, ctx.person) >= 0 ? def.good : def.bad;
  else if (intent === 'answer_honestly' || intent === 'lie') lines = answerLines(intent, npc, ctx);
  return lines?.length ? lines : INTENTS.small_talk.lines;
}

function answerLines(intent, npc, ctx) {
  const heard = ctx.replyTo; // { intent, topic, from }
  const kind = heard?.topic || (heard?.intent === 'flirt' ? 'flirt' : heard?.intent === 'ask_how' ? 'how' : null);
  const honest = intent === 'answer_honestly';
  if (kind === 'person' && honest) return opinion(npc, ctx.person) >= 0 ? INTENTS.gossip_about.good : INTENTS.gossip_about.bad;
  if (kind === 'flirt' && honest) {
    const into = opinion(npc, heard.from, 'rom') > 15 || opinion(npc, heard.from) > 45;
    return into ? ANSWERS.flirt.honest : ANSWERS.flirt.reject;
  }
  if (kind && ANSWERS[kind]) return honest ? ANSWERS[kind].honest : ANSWERS[kind].lie;
  return honest ? INTENTS.agree.lines : ['Oh, I wouldn\'t know anything about that.'];
}

const timeOfDay = h => h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';

function ruinsTruth(npc) {
  if (npc.secret?.toLowerCase().includes('ruins')) return npc.secret;
  return npc.memory.slice().reverse().find(m => m.gist && /ruins|blue|stone|seal/i.test(m.gist))?.gist || 'I\'ve seen the lights, same as everyone. Nothing more.';
}

// Replace the {slots} in a stock phrase. The order matters: {weather} draws a random phrase.
function fillSlots(text, npc, target, ctx) {
  const [worst, worstSentence] = bodyWorst(npc);
  const belief = VOICE_BELIEFS[npc.belief?.kind];
  const voiceTruth = npc.voiceCount ? `Yes! It told me: "${npc.lastWhisper}". ${belief?.line || ''}` : 'A voice? No... should I?';
  const stormy = sim.weather.kind === 'rain' || sim.weather.kind === 'storm';
  return text
    .replaceAll('{t}', target === 'everyone' ? 'friends' : target)
    .replaceAll('{p}', ctx.person || 'someone')
    .replaceAll('{tod}', timeOfDay(sim.hour()))
    .replaceAll('{news}', ctx.news ? cap(ctx.news.replace(/[.!?\s]+$/, '')) + '.' : 'nothing new, really.')
    .replaceAll('{secret}', npc.secret || 'I have no secrets.')
    .replaceAll('{dream}', npc.dream || 'a better life')
    .replaceAll('{belief}', belief?.line || 'I hear a voice.')
    .replaceAll('{dead}', npc.grief?.name || 'them')
    .replaceAll('{worst}', worst)
    .replaceAll('{worstSentence}', worstSentence)
    .replaceAll('{moodWord}', npc.mood || 'alright')
    .replaceAll('{weather}', pick(WEATHER_TALK[sim.weather.kind] || WEATHER_TALK.clear))
    .replaceAll('{weatherMood}', stormy ? 'This weather is getting to me.' : `I'm ${worst}, and that's the truth.`)
    .replaceAll('{prices}', marketPrice('food') > BASE_PRICES.food ? 'steep' : 'fair')
    .replaceAll('{ruinsTruth}', cap(ruinsTruth(npc)))
    .replaceAll('{voiceTruth}', voiceTruth);
}

// Personal voice: each villager's own openers and tag-ends; children speak excitedly.
function personalise(text, npc) {
  const v = npc.voice;
  if (v && Math.random() < 0.35) {
    const open = pick(v.open || ['']);
    if (open) {
      const first = text.split(/[\s,.!?']/)[0];
      const keepCase = first === 'I' || sim.findAnyone(first) || /[.!?]$/.test(open);
      text = `${open} ${keepCase ? text : text.charAt(0).toLowerCase() + text.slice(1)}`;
    }
  }
  if (v && Math.random() < 0.3) text += pick(v.close || ['']);
  if (npc.age < 12) text = text.replace(/\.$/, '!');
  return text;
}

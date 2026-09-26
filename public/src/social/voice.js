// The Voice (the player): whispers, beliefs, and villagers talking back.
import { chronicle, remember, say, wake, witness } from '../core/memory.js';
import { sim } from '../core/state.js';
import { pick } from '../core/util.js';
import { VOICE_BELIEFS } from '../data/lore.js';
import { P, SECOND, fill } from '../identity/identity.js';
import { addMod, opinion } from './relationships.js';

// ------------------------------------------------------------------ The Voice (the player)

export function whisper(npc, text) {
  // Answering someone who begged for a sign is a miracle to them.
  if (npc.awaitingSign && sim.time - npc.awaitingSign < 720) {
    npc.awaitingSign = null;
    if (npc.belief) npc.belief.conviction = Math.min(1, npc.belief.conviction + 0.35);
    remember(npc, 'The Voice ANSWERED when you asked for a sign. It is real. It hears you.', `${npc.name} says the Voice answered ${P(npc).their} prayer`, 10);
    npc.lifeMemories.push(`On day ${sim.day()} I asked the Voice for a sign, and it answered me.`);
    chronicle(`✨ ${npc.name} asked for a sign, and you answered. Their faith deepens.`, npc, 'voice');
  }
  if (npc.lastSpokeToVoice && sim.time - npc.lastSpokeToVoice < 240) {
    remember(npc, 'The Voice answered you after you spoke to it.', null, 8);
  }
  remember(npc, `A voice in your head whispers: "${text}"`, null, 8);
  npc.voiceCount = (npc.voiceCount || 0) + 1;
  npc.lastWhisper = text;
  npc.awareness = Math.min(100, (npc.awareness || 0) + 12);
  npc.pendingVoice = true;
  npc.lastHeardFrom = null;
  wake(npc);
}

export function spreadBelief(speaker, listener) {
  if (!speaker.belief) return;
  const trust = opinion(listener, speaker.name, 'trust');
  const pull = 0.12 + Math.max(0, trust) / 250 + (listener.voiceCount ? 0.2 : 0);
  if (!listener.belief) {
    if (Math.random() < pull) {
      listener.belief = { kind: speaker.belief.kind, conviction: 0.3 };
      remember(listener, `You're starting to believe ${speaker.name}: ${fill(VOICE_BELIEFS[speaker.belief.kind].desc, SECOND).replace(/^It/, 'it')}.`, null, 6);
      chronicle(`🌀 ${listener.name} is starting to share ${speaker.name}'s belief about the Voice.`, listener, 'voice');
    } else addMod(listener, speaker.name, 'says strange things about a voice', { trust: -3 }, 48);
  } else if (listener.belief.kind === speaker.belief.kind) {
    listener.belief.conviction = Math.min(1, listener.belief.conviction + 0.1);
  }
  listener.awareness = Math.min(100, (listener.awareness || 0) + 4);
}

export const VOICE_LINES = {
  imagination: ["I know you're not real. But... if you were, I'd want to know about {want}.", "Enough. You're just my tired mind talking.", "If I'm imagining you, why do you know things I don't?"],
  madness: ["Please, leave my head. Or tell me I'm not mad.", "Are you still there? I'm frightened.", "Nobody else hears you. What does that make me?", "I haven't slept properly since you started talking."],
  spirit: ["Spirit of the ruins, what do you want from me?", "Spirit, I will listen. Tell me what to do about {want}.", "Is it you who makes the lights glow at night?", "You said: '{whisper}'. What did you mean by it?"],
  god: ["Great one, if you are watching, please help me with {want}.", "I prayed today. Did you hear me?", "Thank you for watching over us. Give me a sign.", "Why do you speak to me, of all people?", "You said: '{whisper}'. I will obey."],
  lost_one: ["Is it really you? I miss you. Say something only you would know.", "Stay with me. Please don't go again.", "You told me: '{whisper}'. I'm trying. I really am.", "I went to your grave today. Were you there?", "Do you remember our last morning together?", "I wish I'd said goodbye properly."],
  watcher: ["I know you're watching. Are any of us real?", "If this world is yours, why do you let us suffer?", "What happens to us when you stop watching?", "Do you choose what I do? Or do I?", "Is there a sky above your sky?", "You said: '{whisper}'. Why do you care what happens to me?"],
};

export function speakToVoice(npc, mode = 'speak', customText) {
  const kind = npc.belief?.kind || 'imagination';
  const want = npc.needs.hunger > 60 ? 'this hunger' : npc.sick ? 'this sickness' : npc.grief ? `losing ${npc.grief.name}` : (npc.dream || 'my life');
  const used = npc.usedVoiceLines || [];
  const pool = VOICE_LINES[kind].filter(l => !used.includes(l) && (npc.lastWhisper || !l.includes('{whisper}')));
  const line = pick(pool.length ? pool : VOICE_LINES[kind]);
  npc.usedVoiceLines = [...used, line].slice(-4);
  let text = line.replaceAll('{want}', want).replaceAll('{whisper}', npc.lastWhisper || '');
  if (mode === 'sign') text = 'If you are real, give me a sign. Say my name.';
  if (customText) text = customText;
  say(npc, text, 6000, 'voice');
  sim.voiceMessages.push({ from: npc.name, color: npc.color, text, time: `D${sim.day()} ${sim.clock()}`, unread: true });
  if (sim.voiceMessages.length > 100) sim.voiceMessages.shift();
  chronicle(`🗣️ ${npc.name} speaks to the Voice: "${text}"`, npc, 'voice');
  remember(npc, `You spoke aloud to the Voice: "${text}"`, null, 5);
  witness(npc, `${npc.name} was talking to the sky: "${text}"`, `${npc.name} has been talking to an invisible voice`, { importance: 5 })
    .forEach(o => addMod(o, npc.name, 'talks to thin air', { trust: -4 }, 72));
  npc.awaitingSign = mode === 'sign' ? sim.time : npc.awaitingSign;
  npc.lastSpokeToVoice = sim.time;
}

// Social verbs: talking, requests, gifts, relationships.
import { defineVerbs } from '../registry.js';
import { onAccept } from '../accept.js';
import { give } from '../trade.js';
import { broadcast, chronicle, say } from '../../core/memory.js';
import { sim } from '../../core/state.js';
import { P } from '../../identity/identity.js';
import { adopt } from '../../life/family.js';
import { makePromise } from '../../social/promises.js';
import { addMod } from '../../social/relationships.js';
import { answerRequest, makeRequest } from '../../social/requests.js';
import { speak } from '../../social/speak.js';
import { speakToVoice } from '../../social/voice.js';

export function verbSay(npc, act, { here, t, target }) {
  speak(npc, target, act);
  if (act.promise && target) makePromise(npc, target, act.promise);
  npc.action = { type: 'talk', target: target?.name || 'everyone', until: t + 6 };
  return;
}

export function verbRequest(npc, act, { here, t, target }) {
  makeRequest(npc, target, act.kind, act.data || {}, { text: act.text, remote: act.remote });
  npc.asked = { ...(npc.asked || {}), [`${target.name}:${act.kind}`]: t };
  if (act.promise) makePromise(npc, target, act.promise);
  npc.action = { type: 'talk', target: target.name, until: t + 6 };
  return;
}

export function verbRespond(npc, act, { here, t, target }) {
  const req = (npc.requests || []).find(r => r.id === act.reqId);
  if (req) answerRequest(npc, req, act.accept, { accept: onAccept }, act.text);
  if (act.promise && target) makePromise(npc, target, act.promise);
  if (!npc.action) npc.action = { type: 'talk', target: act.target, until: t + 6 };
  return;
}

export function verbGive(npc, act, { here, t, target }) {
  return give(npc, target, act.item, act.amount || 1);
}

export function verbRepay(npc, act, { here, t, target }) {
  const owed = npc.debts[target.name] || 0;
  const amt = Math.min(owed, npc.inv.coins);
  if (!amt) return;
  npc.inv.coins -= amt; target.inv.coins += amt; npc.debts[target.name] = owed - amt;
  speak(npc, target, { intent: 'thank', text: `Here's the ${amt} coins I owe you, ${target.name}. Thank you.` });
  addMod(target, npc.name, `paid back ${P(npc).their} debt`, { trust: 10, aff: 4 }, 120);
  npc.action = { type: 'wait', until: t + 5 };
  return;
}

export function verbBreakup(npc, act, { here, t, target }) {
  npc.partner = null; target.partner = null;
  speak(npc, target, { intent: 'farewell', text: act.text || `${target.name}... I think we should end this. I'm sorry.` });
  addMod(target, npc.name, 'broke my heart', { aff: -25, rom: -30 }, 240);
  addMod(npc, target.name, 'we broke up', { rom: -30 }, 240);
  broadcast(`${npc.name} and ${target.name} have broken up.`, `${npc.name} broke up with ${target.name}`, 6, []);
  chronicle(`💔 ${npc.name} broke up with ${target.name}.`, npc, 'life');
  npc.action = { type: 'talk', target: target.name, until: t + 6 };
  return;
}

export function verbVoice(npc, act, { here, t, target }) {
  speakToVoice(npc, act.mode, act.text);
  npc.action = { type: 'wait', until: t + 10 };
  return;
}

export function verbKeepPromise(npc, act, { here, t, target }) {
  const pr = sim.promises.find(p => p.id === act.id && p.status === 'open');
  if (!pr) return;
  npc.action = { type: 'do', until: t + 40, text: `keeps a promise to ${pr.to}: ${pr.what}`, effect: 'promise', promiseId: pr.id };
  say(npc, `*${pr.what}*`, 4000, 'action');
  return;
}

export function verbAdopt(npc, act, { here, t, target }) {
  const child = sim.findNpc(act.target);
  if (child && !child.guardian) adopt(npc, child, false);
  npc.action = { type: 'wait', until: t + 10 };
  return;
}

export function verbDivorce(npc, act, { here, t, target }) {
  const s = sim.findNpc(npc.spouse);
  npc.spouse = null; npc.partner = null;
  if (s) {
    s.spouse = null; s.partner = null;
    speak(npc, s, { intent: 'farewell', text: act.text || `${s.name}, I can't go on like this. It's over between us.` });
    addMod(s, npc.name, 'divorced me', { aff: -30, rom: -40, trust: -15 }, 0);
    if (s.home === npc.home) { const own = sim.places.find(p => p.type === 'house' && p.owner === s.name); s.home = own ? own.name : 'The Crooked Mug Tavern'; }
  }
  broadcast(`${npc.name} and ${act.target} are divorced.`, `${npc.name} divorced ${act.target}`, 7);
  chronicle(`💔 ${npc.name} and ${act.target} have divorced.`, npc, 'life');
  npc.lifeMemories.push(`I divorced ${act.target} on day ${sim.day()}.`);
  npc.action = { type: 'talk', target: act.target, until: t + 6 };
  return;
}

defineVerbs({
  'say': verbSay,
  'request': verbRequest,
  'respond': verbRespond,
  'give': verbGive,
  'repay': verbRepay,
  'breakup': verbBreakup,
  'voice': verbVoice,
  'keepPromise': verbKeepPromise,
  'adopt': verbAdopt,
  'divorce': verbDivorce,
});

// Requests that need a yes or no: courtship, jobs, lessons, loans, deals.
import { remember, say, wake } from '../core/memory.js';
import { sim } from '../core/state.js';
import { pick, uid } from '../core/util.js';
import { addMod } from './relationships.js';
import { speak } from './speak.js';

// ------------------------------------------------------------------ Requests
// Anything that needs the other person's yes: courtship, marriage, jobs, lessons, loans, deals.

export const REQUESTS = {
  court: { label: t => `Ask ${t} to be your partner`, line: t => `${t}... I care about you. Will you be mine?`, summary: 'to be their partner', imp: 8 },
  marry: { label: t => `Propose marriage to ${t}`, line: t => `${t}, will you marry me?`, summary: 'to marry them', imp: 10 },
  family: { label: t => `Suggest starting a family with ${t}`, line: t => `${t}... what if we had a child together?`, summary: 'to start a family', imp: 9 },
  adopt: { label: t => `Suggest adopting a child with ${t}`, line: t => `${t}... what if we took in a child who needs a home?`, summary: 'to adopt a child together', imp: 9 },
  job: { label: (t, d) => `Ask ${t} for a job at the ${d.biz}`, line: (t, d) => `${t}, any chance of work at the ${d.biz}?`, summary: d => `for a job at the ${d.biz}`, imp: 5 },
  hire: { label: (t, d) => `Offer ${t} a job at your ${d.biz}`, line: (t, d) => `${t}, want to work for me at the ${d.biz}? Fair wages.`, summary: d => `to work at their ${d.biz}`, imp: 5 },
  teach: { label: (t, d) => `Ask ${t} to teach you ${d.skill}`, line: (t, d) => `${t}, would you teach me some ${d.skill}?`, summary: d => `to teach them ${d.skill}`, imp: 4 },
  food: { label: t => `Ask ${t} for some food`, line: t => `${t}, I'm so hungry... could you spare some food?`, summary: 'for some food', imp: 4 },
  loan: { label: t => `Ask ${t} to lend you 5 coins`, line: t => `${t}, could you lend me 5 coins? I'll pay you back.`, summary: 'to lend them 5 coins', imp: 4 },
  sell: { label: (t, d) => `Offer to sell ${t} ${d.qty} ${d.item} for ${d.price} coins`, line: (t, d) => `${t}, I'll sell you ${d.qty} ${d.item} for ${d.price} coins. Deal?`, summary: d => `to buy ${d.qty} ${d.item} for ${d.price} coins`, imp: 3 },
  drink: { label: t => `Invite ${t} for a drink at the tavern`, line: t => `Fancy a drink at the tavern, ${t}? My treat.`, summary: 'to join them for a drink at the tavern', imp: 4 },
  help: { label: (t, d) => `Ask ${t} to help with: ${d.title}`, line: (t, d) => `${t}, we need your help: ${d.title.toLowerCase()}.`, summary: d => `to help with "${d.title}"`, imp: 4 },
  meet: { label: (t, d) => `Ask ${t} to meet you at ${d.place}`, line: (t, d) => `${t}, come to ${d.place}. I need to see you.`, summary: d => `to meet them at ${d.place}`, imp: 5 },
  midwife: { label: t => `Send for ${t} to help with the birth`, line: t => `${t}, the baby is coming! Please, help me!`, summary: 'to help them give birth', imp: 9 },
  treat: { label: t => `Ask ${t} to treat your sickness`, line: t => `${t}, I feel awful. Can you help me?`, summary: 'to treat their sickness', imp: 5 },
};

export function makeRequest(from, to, kind, data = {}, { text: customText, remote = false } = {}) {
  const def = REQUESTS[kind];
  const text = customText || def.line(to.name, data);
  if (remote) { say(from, text); remember(to, `Word reached you from ${from.name}: "${text}"`, null, def.imp); }
  else speak(from, to, { intent: 'request', text });
  to.requests = (to.requests || []).filter(r => !(r.from === from.name && r.kind === kind));
  to.requests.push({ id: uid(), from: from.name, kind, data, at: sim.time });
  remember(to, `${from.name} asked you ${typeof def.summary === 'function' ? def.summary(data) : def.summary}.`, null, def.imp);
  wake(to);
}

export function requestSummary(req) {
  const def = REQUESTS[req.kind];
  return typeof def.summary === 'function' ? def.summary(req.data) : def.summary;
}

// The target answers. Returns true if accepted.
export function answerRequest(npc, req, accept, hooks, customText) {
  npc.requests = (npc.requests || []).filter(r => r.id !== req.id);
  const from = sim.findNpc(req.from);
  if (!from) return false;
  const def = REQUESTS[req.kind];
  const text = accept ? pick(['Yes. Yes, I will.', 'Alright, deal.', 'Of course.', 'Gladly!'])
    : pick(['No. I\'m sorry.', 'I can\'t do that.', 'Absolutely not.', 'Not now.']);
  speak(npc, from, { intent: accept ? 'agree' : 'disagree', text: customText || (req.kind === 'marry' && accept ? 'Yes! A thousand times, yes!' : text) });
  remember(from, `${npc.name} ${accept ? 'accepted' : 'refused'} when you asked ${requestSummary(req)}.`, null, def.imp);
  remember(npc, `You ${accept ? 'accepted' : 'refused'} ${from.name}'s request ${requestSummary(req)}.`, null, def.imp);
  if (!accept) {
    const hurt = ['court', 'marry', 'family'].includes(req.kind) ? -12 : -4;
    addMod(from, npc.name, `turned me down (${req.kind})`, { aff: hurt }, 72);
    return false;
  }
  addMod(from, npc.name, `said yes to me (${req.kind})`, { aff: 5, trust: 3 }, 72);
  hooks.accept?.(npc, from, req);
  return true;
}

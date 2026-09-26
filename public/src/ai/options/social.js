// Options involving other people: requests, conversation, gifts, promises.
import { summaryOf } from '../perception.js';
import { lastSeenText } from '../../core/knowledge.js';
import { skill, skillWord } from '../../core/skills.js';
import { sim } from '../../core/state.js';
import { SKILLS } from '../../data/skills.js';
import { marketPrice } from '../../economy/market.js';
import { P, canConceive, fill } from '../../identity/identity.js';
import { MAX_EXCHANGES, chatWith } from '../../social/conversation.js';
import { openPromisesFrom, openPromisesTo } from '../../social/promises.js';
import { canRomance, opinion, relLabel } from '../../social/relationships.js';
import { REQUESTS } from '../../social/requests.js';

// Requests people made of you
export function optionsRequestsPeopleMade(npc, ctx) {
  const { near, add } = ctx;
  for (const req of npc.requests || []) {
    if (sim.time - req.at > 360) continue;
    const from = sim.findNpc(req.from);
    if (!from) continue;
    const what = summaryOf(req);
    if (near.includes(from)) {
      add(`Say YES to ${from.name} (${req.kind})`, `Accept ${from.name}'s request ${what}.`, { type: 'respond', target: from.name, reqId: req.id, accept: true });
      add(`Say NO to ${from.name} (${req.kind})`, `Refuse ${from.name}'s request ${what}.`, { type: 'respond', target: from.name, reqId: req.id, accept: false });
    } else add(`Go answer ${from.name}'s request`, `Find ${from.name}, who asked you ${what}.`, { type: 'move', target: from.name });
  }
}

// People nearby. The order of options is kept stable (offline scoring and sampling depend on it).
export function optionsPeopleNearby(npc, ctx) {
  const { near, add } = ctx;
  for (const o of near) {
    talkOption(npc, o, add);
    if (o.age < 16) continue;
    for (const group of PERSON_OPTIONS) group(npc, o, ctx);
  }
  if (near.length >= 2) add('Speak to everyone nearby', 'Address the whole group.', { type: 'say', target: 'everyone' });
}

function talkOption(npc, o, add) {
  const chat = chatWith(npc, o.name);
  if (chat >= MAX_EXCHANGES) return;
  const label = relLabel(npc, o.name);
  const spoke = npc.lastHeardFrom === o.name;
  add(`Talk to ${o.name}`, chat >= 3 ? `Keep talking with ${o.name} (${label}), though the chat is running its course.`
    : spoke ? `Reply to ${o.name} (${label}), who just spoke to you.` : `Talk with ${o.name} (${label}).`, { type: 'say', target: o.name });
}

function romanceOptions(npc, o, { add }) {
  const rom = opinion(npc, o.name, 'rom');
  if (canRomance(npc, o) && !npc.partner && !npc.spouse && rom >= 30) add(REQUESTS.court.label(o.name), `Ask ${o.name} to be your partner.${o.spouse ? ` That would be an affair: ${P(o).they} ${P(o).are} married to ${o.spouse}.` : o.partner ? ` (${fill('{They} {are}', o)} with ${o.partner}.)` : ''}`, { type: 'request', target: o.name, kind: 'court' });
  if (npc.partner === o.name && !npc.spouse && !o.spouse && rom >= 50) add(REQUESTS.marry.label(o.name), `Propose marriage to ${o.name}.`, { type: 'request', target: o.name, kind: 'marry' });
  if ((npc.spouse === o.name || npc.partner === o.name) && npc.children.length < 4 && sim.settings.births && !npc.pregnancy && !o.pregnancy) {
    if (canConceive(npc, o)) add(REQUESTS.family.label(o.name), 'Suggest having a child together.', { type: 'request', target: o.name, kind: 'family' });
    if (npc.spouse === o.name && npc.home) add(REQUESTS.adopt.label(o.name), 'Take in a child who needs a home.', { type: 'request', target: o.name, kind: 'adopt' });
  }
  if (npc.partner === o.name && rom < 15) add(`Break up with ${o.name}`, 'End your relationship.', { type: 'breakup', target: o.name });
}

function favourOptions(npc, o, { add, n }) {
  const gap = SKILLS.map(s => [s, skill(o, s) - skill(npc, s)]).sort((a, b) => b[1] - a[1])[0];
  if (gap && gap[1] >= 25) add(REQUESTS.teach.label(o.name, { skill: gap[0] }), `${o.name} is ${skillWord(skill(o, gap[0]))} at ${gap[0]}.`, { type: 'request', target: o.name, kind: 'teach', data: { skill: gap[0] } });
  if (n.hunger > 55 && !npc.inv.food && !npc.inv.bread && (o.inv.food + o.inv.bread) > 0) add(REQUESTS.food.label(o.name), `${o.name} has food.`, { type: 'request', target: o.name, kind: 'food' });
  if (npc.inv.coins < 3 && o.inv.coins >= 10) add(REQUESTS.loan.label(o.name), 'Borrow money.', { type: 'request', target: o.name, kind: 'loan' });
  const sellable = ['food', 'wood', 'bread', 'tool', 'remedy', 'herbs'].find(i => (npc.inv[i] || 0) >= (i === 'tool' || i === 'remedy' ? 1 : 3));
  if (sellable) {
    const qty = sellable === 'tool' || sellable === 'remedy' ? 1 : 2;
    const price = Math.round(marketPrice(sellable) * qty);
    if (o.inv.coins >= price) add(REQUESTS.sell.label(o.name, { qty, item: sellable, price }), 'Offer a trade.', { type: 'request', target: o.name, kind: 'sell', data: { qty, item: sellable, price } });
  }
  if (sim.hour() >= 16 && npc.inv.coins >= 2) add(REQUESTS.drink.label(o.name), 'Spend the evening together.', { type: 'request', target: o.name, kind: 'drink' });
}

function workOptions(npc, o, { add }) {
  const hisBiz = sim.places.find(p => p.biz?.owner === o.name);
  if (hisBiz && !npc.job) add(REQUESTS.job.label(o.name, { biz: hisBiz.name }), `Work for ${o.name} for a wage.`, { type: 'request', target: o.name, kind: 'job', data: { biz: hisBiz.name, place: hisBiz.name, bizKind: hisBiz.biz.kind } });
  const myBiz = sim.places.find(p => p.biz?.owner === npc.name);
  if (myBiz && !o.job) add(REQUESTS.hire.label(o.name, { biz: myBiz.name }), 'Hire them.', { type: 'request', target: o.name, kind: 'hire', data: { biz: myBiz.name, place: myBiz.name, bizKind: myBiz.biz.kind } });
  if (o.job?.employer === npc.name) add(`Fire ${o.name}`, `Dismiss ${o.name} from your ${o.job.place}.`, { type: 'fire', target: o.name });
}

function careOptions(npc, o, { add }) {
  if (npc.sick && skill(o, 'herbalism') >= 40) add(REQUESTS.treat.label(o.name), `${o.name} is a healer.`, { type: 'request', target: o.name, kind: 'treat' });
  if (o.sick && (npc.inv.remedy > 0 || (npc.inv.herbs >= 2 && skill(npc, 'herbalism') >= 30))) add(`Treat ${o.name}'s sickness`, `${o.name} is sick. Try to heal ${P(o).them}.`, { type: 'treat', target: o.name });
  const openPr = sim.problems.find(p => !p.solved && p.contributors[npc.name]);
  if (openPr && !openPr.contributors[o.name]) add(REQUESTS.help.label(o.name, openPr), 'Recruit help.', { type: 'request', target: o.name, kind: 'help', data: { title: openPr.title } });
  if (npc.debts?.[o.name] > 0 && npc.inv.coins > 0) add(`Repay ${o.name} the ${npc.debts[o.name]} coins you owe`, 'Settle your debt.', { type: 'repay', target: o.name });
}

function giftOptions(npc, o, { add }) {
  const gift = ['bread', 'food', 'remedy', 'relic', 'wood', 'herbs'].find(i => (npc.inv[i] || 0) > (i === 'food' ? 1 : 0));
  if (gift) add(`Give ${gift} to ${o.name}`, `A gift or help for ${o.name}.`, { type: 'give', target: o.name, item: gift, amount: 1 });
  if (npc.inv.coins >= 5) add(`Give 5 coins to ${o.name}`, `Give ${o.name} money.`, { type: 'give', target: o.name, item: 'coins', amount: 5 });
}

function hostileOptions(npc, o, { add }) {
  add(`Attack ${o.name}`, `Start a violent fist fight with ${o.name}. Only someone furious, desperate or cruel would do this.`, { type: 'fight', target: o.name });
  if (o.inv.coins >= 3) add(`Try to pickpocket ${o.name}`, `Secretly steal coins from ${o.name}. A crime; you might be caught.`, { type: 'steal', target: o.name });

  if (sim.leader === npc.name && o.crimes?.some(c => !c.secret && sim.time - c.at < 2880)) {
    const crime = o.crimes.filter(c => !c.secret).slice(-1)[0].what;
    add(`Fine ${o.name} for ${crime}`, `Punish ${P(o).them} as leader: a 10 coin fine.`, { type: 'punish', target: o.name, kind: 'fine' });
    add(`Banish ${o.name} from Oakhollow`, `Exile ${P(o).them} forever for ${crime}.`, { type: 'punish', target: o.name, kind: 'banish' });
  }
}

const PERSON_OPTIONS = [romanceOptions, favourOptions, workOptions, careOptions, giftOptions, hostileOptions];

// People elsewhere
export function optionsPeopleElsewhere(npc, ctx) {
  const { near, add } = ctx;
  for (const o of sim.npcs) {
    if (o === npc || near.includes(o) || o.age < 4) continue;
    add(`Go find ${o.name}`, `${o.name} (${relLabel(npc, o.name)}): ${lastSeenText(npc, o.name)}.`, { type: 'move', target: o.name });
  }
}

// Promises: keep your word (or carry out your threat)
export function optionsPromises(npc, ctx) {
  const { here, add } = ctx;
  for (const pr of openPromisesFrom(npc)) {
    const to = sim.findNpc(pr.to);
    if (!to) continue;
    const left = Math.max(0, Math.round((pr.due - sim.time) / 60));
    if (pr.kind === 'give' && pr.item && (npc.inv[pr.item] || 0) >= 1) add(`Keep your promise: give ${pr.amount} ${pr.item} to ${to.name}`, `You promised ${to.name}: ${pr.what}. Due in ${left}h.`, { type: 'give', target: to.name, item: pr.item, amount: pr.amount });
    else if (pr.kind === 'meet' && pr.place) add(`Keep your promise: meet ${to.name} at ${pr.place}`, `You promised: ${pr.what}. Due in ${left}h.`, { type: 'move', target: pr.place });
    else if (pr.kind === 'harm') add(`Carry out your threat against ${to.name}`, `You threatened: ${pr.what}. Violence.`, { type: 'fight', target: to.name });
    else add(`Keep your promise to ${to.name}: ${pr.what.slice(0, 50)}`, `Due in ${left}h. Breaking it will cost ${P(to).their} trust.`, { type: 'keepPromise', target: to.name, id: pr.id });
  }
  for (const pr of openPromisesTo(npc)) {
    if (pr.kind === 'meet' && pr.place && sim.findPlace(pr.place) !== here) add(`Go meet ${pr.from} at ${pr.place} as agreed`, `${pr.from} promised to meet you there.`, { type: 'move', target: pr.place });
  }
}

// Promises and threats made in conversation, kept or broken.
import { chronicle, remember } from '../core/memory.js';
import { sim } from '../core/state.js';
import { uid } from '../core/util.js';
import { P } from '../identity/identity.js';
import { addMod } from './relationships.js';

export const KINDS = ['give', 'meet', 'help', 'harm', 'other'];

export function makePromise(from, to, p) {
  if (!p || !to || !KINDS.includes(p.kind)) return;
  // One open promise of a kind per pair is plenty.
  if (sim.promises.some(x => x.status === 'open' && x.from === from.name && x.to === to.name && x.kind === p.kind)) return;
  const place = p.place && sim.findPlace(p.place);
  const promise = {
    id: uid(), from: from.name, to: to.name, kind: p.kind,
    item: p.item ? String(p.item).toLowerCase().replace(/[^a-z ]/g, '').trim().slice(0, 20) : null,
    amount: Math.max(1, Math.min(20, Math.round(Number(p.amount) || 1))),
    place: place?.name || null,
    what: String(p.what || '').slice(0, 90) || 'something',
    made: sim.time, due: sim.time + Math.max(2, Math.min(72, Number(p.hours) || 24)) * 60, status: 'open',
  };
  sim.promises.push(promise);
  if (sim.promises.length > 150) sim.promises.splice(0, sim.promises.length - 150);
  const threat = promise.kind === 'harm';
  remember(from, `You ${threat ? 'threatened' : 'promised'} ${to.name}: ${promise.what}.`, null, 6);
  remember(to, `${from.name} ${threat ? 'threatened you' : 'promised you'}: ${promise.what}.`, `${from.name} ${threat ? 'threatened' : 'promised'} ${to.name}: ${promise.what}`, threat ? 8 : 6);
  chronicle(`${threat ? '⚠️' : '🤝'} ${from.name} ${threat ? 'threatened' : 'promised'} ${to.name}: ${promise.what}`, from, 'promise');
}

export function keepPromise(pr, how) {
  if (pr.status !== 'open') return;
  pr.status = 'kept';
  const from = sim.findNpc(pr.from), to = sim.findNpc(pr.to);
  if (pr.kind === 'harm') {
    if (to) remember(to, `${pr.from} carried out ${P(from).their} threat.`, `${pr.from} made good on a threat against ${pr.to}`, 8);
    chronicle(`😠 ${pr.from} carried out the threat against ${pr.to}.`, from, 'promise');
    return;
  }
  if (to) { addMod(to, pr.from, `kept ${P(from).their} promise (${pr.what})`, { trust: 12, aff: 6 }, 240); remember(to, `${pr.from} kept ${P(from).their} promise: ${pr.what}.`, `${pr.from} kept a promise to ${pr.to}`, 6); }
  if (from) remember(from, `You kept your promise to ${pr.to}${how ? ` (${how})` : ''}.`, null, 4);
  chronicle(`✅ ${pr.from} kept ${P(from).their} promise to ${pr.to}: ${pr.what}`, from, 'promise');
}

// Called hourly: promises past due are broken.
export function checkPromises() {
  for (const pr of sim.promises) {
    if (pr.status !== 'open' || sim.time < pr.due) continue;
    pr.status = pr.kind === 'harm' ? 'lapsed' : 'broken';
    if (pr.kind === 'harm') continue;
    const from = sim.findNpc(pr.from), to = sim.findNpc(pr.to);
    if (!from || !to) continue;
    addMod(to, pr.from, `broke ${P(from).their} promise (${pr.what})`, { trust: -18, aff: -8 }, 240);
    remember(to, `${pr.from} broke ${P(from).their} promise to you: ${pr.what}.`, `${pr.from} broke a promise to ${pr.to}`, 7);
    remember(from, `You failed to keep your promise to ${pr.to}: ${pr.what}.`, null, 6);
    chronicle(`💔 ${pr.from} broke ${P(from).their} promise to ${pr.to}: ${pr.what}`, from, 'promise');
  }
}

// Called whenever something is handed over: does it fulfil a "give" promise?
export function noteGift(from, to, item, amount) {
  const pr = sim.promises.find(p => p.status === 'open' && p.kind === 'give' && p.from === from.name && p.to === to.name && (!p.item || p.item === item || item === 'coins' && /coin/.test(p.item)));
  if (pr && amount >= Math.min(pr.amount, 1)) keepPromise(pr, `gave ${amount} ${item}`);
}

// Called on arrival somewhere: does it fulfil a "meet" promise?
export function noteArrival(npc, place) {
  if (!place) return;
  for (const pr of sim.promises) {
    if (pr.status !== 'open' || pr.kind !== 'meet' || pr.place !== place.name) continue;
    if (pr.from === npc.name) keepPromise(pr, `came to ${place.name}`);
  }
}

export function openPromisesFrom(npc) { return sim.promises.filter(p => p.status === 'open' && p.from === npc.name); }

export function openPromisesTo(npc) { return sim.promises.filter(p => p.status === 'open' && p.to === npc.name); }

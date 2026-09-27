// Effects on belongings: items, handing things over, and property.
import { sim } from '../../core/state.js';
import { remember, broadcast } from '../../core/memory.js';
import { addMod } from '../../social/relationships.js';
import { defineEffect, word, int, placeOrHere, whoLabel } from '../registry.js';
import { theName } from '../../core/util.js';

defineEffect('item', {
  doc: '{"type":"item","who":"self","item":"carving","amount":1}          gain (+) or use up (-) items, -5..5. Any simple noun works as a new item.',
  validate(e, { who }) {
    const item = word(e.item);
    return item && item !== 'relic' ? { type: 'item', who, item, amount: int(e.amount, -5, 5) } : null;
  },
  apply(e, { whoList, results }) {
    for (const p of whoList(e.who)) p.inv[e.item] = Math.max(0, (p.inv[e.item] || 0) + e.amount);
    results.push(`${e.amount > 0 ? 'got' : 'used'} ${Math.abs(e.amount)} ${e.item}`);
  },
  describe: e => `${e.amount > 0 ? '+' : ''}${e.amount} ${e.item}${whoLabel(e.who)}`,
});

defineEffect('transfer', {
  doc: '{"type":"transfer","from":"self","to":"target","item":"coins","amount":3}   hand items between self and target, 1..10',
  validate(e) {
    const from = e.from === 'target' ? 'target' : 'self';
    const item = word(e.item);
    return item ? { type: 'transfer', from, to: from === 'self' ? 'target' : 'self', item, amount: int(e.amount, 1, 10) } : null;
  },
  apply(e, { npc, target }) {
    const from = e.from === 'self' ? npc : target, to = e.from === 'self' ? target : npc;
    if (!from || !to) return;
    const n = Math.min(e.amount, from.inv[e.item] || 0);
    from.inv[e.item] -= n; to.inv[e.item] = (to.inv[e.item] || 0) + n;
    if (n) remember(to, `${from.name} gave you ${n} ${e.item}.`, null, 4);
  },
  describe: e => `${e.from === 'self' ? 'give' : 'take'} ${e.amount} ${e.item}`,
});

defineEffect('give_place', {
  doc: '{"type":"give_place","place":"here","to":"target"}                  hand over something the doer owns (a house, a shop)',
  validate: e => ({ type: 'give_place', place: placeOrHere(e.place) || 'here' }),
  apply(e, { npc, target }) {
    const p = e.place === 'here' ? sim.placeAt(npc.x, npc.y) : sim.findPlace(e.place);
    if (!p || !target) return;
    const owns = p.owner === npc.name || p.biz?.owner === npc.name;
    if (!owns) return;
    if (p.owner === npc.name) p.owner = target.name;
    if (p.biz?.owner === npc.name) p.biz.owner = target.name;
    if (p.bed && npc.home === p.name && !target.home) target.home = p.name;
    broadcast(`${npc.name} gave ${theName(p.name)} to ${target.name}.`, `${target.name} now owns ${theName(p.name)}`, 6);
    addMod(target, npc.name, `gave me ${theName(p.name)}`, { aff: 20, trust: 10 }, 0);
  },
  describe: () => 'gives away property',
});

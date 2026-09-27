// Effects on the physical world: new buildings, damage and repair, natural resources, weather.
import { sim } from '../../core/state.js';
import { clamp, theName } from '../../core/util.js';
import { remember, chronicle, witness, broadcast } from '../../core/memory.js';
import { findFreeSpot } from '../../core/space.js';
import { cap } from '../../core/util.js';
import { defineEffect, word, text, int, placeOrHere } from '../registry.js';

const WEATHER = ['clear', 'cloudy', 'rain', 'storm', 'fog'];

defineEffect('build', {
  doc: '{"type":"build","name":"Pigeon Loft","desc":"...","bed":false,"produce":{"in":{"food":1},"out":{"message":1},"text":"trains pigeons"}}   creates a place here ("produce" optional: makes it a business)',
  validate(e) {
    const name = text(e.name, 32);
    if (!name) return null;
    const b = { type: 'build', name, desc: text(e.desc, 140), bed: Boolean(e.bed) };
    if (e.produce && typeof e.produce === 'object') {
      const clean = o => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [word(k), int(v, 1, 4)]).filter(([k]) => k && k !== 'coins' && k !== 'relic'));
      const outp = clean(e.produce.out);
      if (Object.keys(outp).length) b.produce = { in: clean(e.produce.in), out: outp, text: text(e.produce.text, 60) || 'works' };
    }
    return b;
  },
  apply(e, { npc, results }) { buildPlace(npc, e); results.push(`built ${theName(e.name)}`); },
  describe: e => `builds ${theName(e.name)}`,
});

function buildPlace(npc, e) {
  let name = e.name, i = 2;
  while (sim.places.some(p => p.name === name)) name = `${e.name} ${i++}`;
  const w = 66, h = 50;
  const spot = findFreeSpot(npc.x, npc.y, w, h);
  const place = {
    name, type: e.produce ? 'custombiz' : 'built', x: spot.x, y: spot.y, w, h, condition: 100,
    builder: npc.name, desc: `${e.desc || 'Something new.'} Built by ${npc.name}.`, invented: true,
  };
  if (e.bed) { place.bed = true; place.owner = npc.name; }
  if (e.produce) {
    place.biz = { kind: 'custom', owner: npc.name, till: 0, stock: {}, employees: [], priceMult: 1, def: { produce: `${cap(e.produce.text)} at ${theName(name)}`, text: e.produce.text, skill: 'crafting', in: e.produce.in, out: e.produce.out, sells: Object.keys(e.produce.out) } };
  }
  sim.places.push(place);
  broadcast(`${npc.name} built something new: ${theName(name)}.`, `${npc.name} built ${theName(name)}`, 6, [npc]);
  npc.lifeMemories.push(`I built ${theName(name)} on day ${sim.day()}.`);
  chronicle(`🏗️ ${npc.name} built something never seen before: ${theName(name)}!`, npc, 'event');
}

const findTarget = (e, npc) => (e.place === 'here' ? sim.placeAt(npc.x, npc.y) : sim.findPlace(e.place));

defineEffect(['damage', 'repair'], {
  doc: '{"type":"damage","place":"here","amount":30} / {"type":"repair","place":"here","amount":30}   a building\'s condition, 5..60 ("here" = where it\'s done)',
  validate(e, { issues }) {
    const place = placeOrHere(e.place);
    if (!place) { issues.push(`unknown place "${e.place}"`); return null; }
    return { type: e.type, place, amount: int(e.amount, 5, 60) };
  },
  apply(e, { npc }) {
    const p = findTarget(e, npc);
    if (!p) return;
    p.condition = clamp((p.condition ?? 100) + (e.type === 'repair' ? e.amount : -e.amount), 0, 100);
    if (e.type !== 'damage') return;
    witness(npc, `${npc.name} damaged ${theName(p.name)}!`, `${npc.name} damaged ${theName(p.name)}`, { importance: 7 });
    const owner = sim.findNpc(p.owner || p.biz?.owner);
    if (owner && owner !== npc) remember(owner, `Your ${p.name} has been damaged.`, null, 7);
  },
  describe: e => `${e.type === 'damage' ? 'damages' : 'repairs'} ${e.place === 'here' ? 'the place' : e.place}`,
});

defineEffect('resource', {
  doc: '{"type":"resource","place":"here","amount":8}                      grow (+) or deplete (-) a place\'s natural resource, -15..15',
  validate(e, { issues }) {
    const place = placeOrHere(e.place);
    if (!place) { issues.push(`unknown place "${e.place}"`); return null; }
    return { type: 'resource', place, amount: int(e.amount, -15, 15) };
  },
  apply(e, { npc }) {
    const p = findTarget(e, npc);
    if (p?.res) p.res.amount = clamp(p.res.amount + e.amount, 0, p.res.max);
  },
  describe: e => `${e.amount > 0 ? 'grows' : 'uses up'} ${e.place === 'here' ? 'local' : e.place} resources`,
});

defineEffect('weather', {
  doc: '{"type":"weather","kind":"rain"}                                   clear|cloudy|rain|storm|fog (rare, for rituals)',
  validate: e => (WEATHER.includes(e.kind) ? { type: 'weather', kind: e.kind } : null),
  apply(e, { npc, label }) {
    sim.weather = { kind: e.kind, until: sim.time + 240 };
    broadcast(`The weather turned to ${e.kind}, right after ${npc.name} ${label || 'did something strange'}.`, `the weather changed after ${npc.name}'s ritual`, 6);
    chronicle(`🌦️ The weather turns to ${e.kind} after ${npc.name}'s ${label || 'ritual'}!`, npc, 'event');
  },
  describe: () => 'weather',
});

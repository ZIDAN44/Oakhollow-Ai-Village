// Effects on village life: problems to solve, news, gatherings, laws, and things that happen later.
import { sim } from '../../core/state.js';
import { chronicle, witness, broadcast } from '../../core/memory.js';
import { uid } from '../../core/util.js';
import { SKILLS } from '../../data/skills.js';
import { createGathering } from '../../life/gatherings.js';
import { defineEffect, text, int } from '../registry.js';

defineEffect('problem', {
  doc: '{"type":"problem","title":"...","desc":"...","skill":"scholarship"}   creates a village problem people can work on',
  validate(e) {
    const title = text(e.title, 60);
    return title ? { type: 'problem', title, desc: text(e.desc, 140), skill: SKILLS.includes(e.skill) ? e.skill : 'scholarship' } : null;
  },
  apply(e, { npc }) {
    if (sim.problems.some(p => p.title === e.title && !p.solved)) return;
    sim.problems.push({ id: uid(), type: 'custom', title: e.title, desc: e.desc, place: sim.placeAt(npc.x, npc.y)?.name || null, skill: e.skill, label: `Work on: ${e.title}`, progress: 0, clueIdx: 0, contributors: {}, solved: false, difficulty: 2, created: sim.time });
    chronicle(`❗ ${npc.name} started something new: ${e.title}`, npc, 'event');
  },
  describe: e => `starts "${e.title}"`,
});

defineEffect('progress', {
  doc: '{"type":"progress","problem":"<existing problem title>","amount":10}   1..30',
  validate: e => ({ type: 'progress', problem: text(e.problem, 60), amount: int(e.amount, 1, 30) }),
  apply(e, { npc }) {
    const pr = sim.problems.find(p => !p.solved && (p.title === e.problem || p.type === e.problem));
    if (!pr) return;
    pr.progress = Math.min(100, pr.progress + e.amount);
    pr.contributors[npc.name] = (pr.contributors[npc.name] || 0) + e.amount;
  },
  describe: e => `helps "${e.problem}"`,
});

defineEffect('news', {
  doc: '{"type":"news","text":"Mira is holding a dance tonight","scope":"all"}   spreads as gossip; scope near|all',
  validate(e) {
    const t = text(e.text, 140);
    return t ? { type: 'news', text: t, scope: e.scope === 'all' ? 'all' : 'near' } : null;
  },
  apply(e, { npc }) {
    if (e.scope === 'all') broadcast(e.text, e.text, 5, [npc]);
    else witness(npc, e.text, e.text, { importance: 4 });
  },
  describe: () => 'spreads news',
});

defineEffect('gathering', {
  doc: '{"type":"gathering","title":"Bonfire night","place":"Village Square","in_hours":2,"duration_hours":3}   invites the village to an event',
  validate(e, { issues }) {
    const title = text(e.title, 50);
    const p = sim.findPlace(e.place);
    if (title && p) return { type: 'gathering', title, place: p.name, in_hours: int(e.in_hours, 0, 24), duration_hours: int(e.duration_hours, 1, 6) };
    issues.push('gathering needs a title and an existing place name');
    return null;
  },
  apply(e, { npc }) {
    if (sim.gatherings.some(g => g.title === e.title)) return;
    const start = sim.time + e.in_hours * 60;
    createGathering({ kind: 'custom', title: e.title, place: e.place, start, end: start + e.duration_hours * 60, host: npc.name });
  },
  describe: e => `holds "${e.title}"`,
});

defineEffect('law', {
  doc: '{"type":"law","text":"No fishing on holy days."}                   only for laws decreed by the leader',
  validate(e, { allowLaw, issues }) {
    if (!allowLaw) { issues.push('only the village leader can make laws'); return null; }
    const t = text(e.text, 120);
    return t ? { type: 'law', text: t } : null;
  },
  apply(e, { npc }) {
    if (!sim.customLaws) sim.customLaws = [];
    if (!sim.customLaws.includes(e.text)) sim.customLaws.push(e.text);
    broadcast(`${npc.name} decrees a new law: "${e.text}"`, `new law: ${e.text}`, 7);
    chronicle(`📜 ${npc.name} decrees: ${e.text}`, npc, 'event');
  },
  describe: () => 'new law',
});

defineEffect('later', {
  doc: '{"type":"later","hours":8,"effects":[...]}                          effects that happen later (fermenting, healing, a plan paying off), 1..48h',
  validate(e, { nested, issues, allowLaw, validateList }) {
    if (nested) { issues.push('"later" cannot be nested'); return null; }
    const inner = validateList(e.effects, { allowLaw, nested: true }, issues);
    return inner.length ? { type: 'later', hours: int(e.hours, 1, 48), effects: inner } : null;
  },
  apply(e, { npc, target, label }) {
    sim.scheduled.push({ at: sim.time + e.hours * 60, npc: npc.name, target: target?.name || null, effects: e.effects, label });
  },
  describe: (e, describeList) => `later: ${describeList(e.effects)}`,
});

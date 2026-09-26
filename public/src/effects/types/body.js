// Effects on people's bodies and minds: needs, health, mood, skills, conditions, sickness.
import { sim } from '../../core/state.js';
import { clamp } from '../../core/util.js';
import { remember } from '../../core/memory.js';
import { practice } from '../../core/skills.js';
import { SKILLS } from '../../data/skills.js';
import { defineEffect, word, int, whoLabel } from '../registry.js';

const NEEDS = ['hunger', 'thirst', 'energy'];

defineEffect('need', {
  doc: '{"type":"need","who":"self","need":"hunger","amount":-30}          hunger/thirst/energy change, -50..50 (negative hunger = less hungry)',
  validate: (e, { who }) => (NEEDS.includes(e.need) ? { type: 'need', who, need: e.need, amount: int(e.amount, -50, 50) } : null),
  apply(e, { whoList }) { for (const p of whoList(e.who)) p.needs[e.need] = clamp(p.needs[e.need] + e.amount, 0, 100); },
  describe: e => `${e.need} ${e.amount > 0 ? '+' : ''}${e.amount}`,
});

defineEffect('health', {
  doc: '{"type":"health","who":"target","amount":15}                      -30..30',
  validate: (e, { who }) => ({ type: 'health', who, amount: int(e.amount, -30, 30) }),
  apply(e, { whoList }) { for (const p of whoList(e.who)) p.health = clamp(p.health + e.amount, 1, 100); },
  describe: e => `health ${e.amount > 0 ? '+' : ''}${e.amount}${whoLabel(e.who)}`,
});

defineEffect('mood', {
  doc: '{"type":"mood","who":"everyone_near","amount":1}                   -2..2',
  validate: (e, { who }) => ({ type: 'mood', who, amount: clamp(Number(e.amount) || 0, -2, 2) }),
  apply(e, { whoList }) { for (const p of whoList(e.who)) p.moodScore = clamp((p.moodScore ?? 2) + e.amount, 0, 4); },
  describe: e => `mood ${e.amount > 0 ? 'up' : 'down'}${whoLabel(e.who)}`,
});

defineEffect('skill', {
  doc: `{"type":"skill","who":"self","skill":"crafting","amount":3}        1..5; skills: ${SKILLS.join(', ')}`,
  validate: (e, { who }) => (SKILLS.includes(e.skill) ? { type: 'skill', who, skill: e.skill, amount: int(e.amount, 1, 5) } : null),
  apply(e, { whoList }) { for (const p of whoList(e.who)) practice(p, e.skill, e.amount); },
  describe: e => `+${e.skill}`,
});

defineEffect('status', {
  doc: '{"type":"status","who":"self","name":"tipsy","hours":4,"per_hour":{"mood":0.3,"energy":-3}}   a temporary condition; per_hour keys hunger/thirst/energy (-10..10), health (-5..5), mood (-0.5..0.5)',
  validate(e, { who }) {
    const name = word(e.name);
    const ph = e.per_hour || {};
    const per = {};
    for (const k of NEEDS) if (ph[k]) per[k] = int(ph[k], -10, 10);
    if (ph.health) per.health = int(ph.health, -5, 5);
    if (ph.mood) per.mood = clamp(Number(ph.mood) || 0, -0.5, 0.5);
    return name && Object.keys(per).length ? { type: 'status', who, name, hours: int(e.hours, 1, 24), per_hour: per } : null;
  },
  apply(e, { whoList }) {
    for (const p of whoList(e.who)) {
      p.statuses = (p.statuses || []).filter(s => s.name !== e.name);
      p.statuses.push({ name: e.name, until: sim.time + e.hours * 60, per_hour: e.per_hour });
    }
  },
  describe: e => `${e.name} for ${e.hours}h`,
});

defineEffect(['sick', 'cure'], {
  doc: '{"type":"sick","who":"target"} / {"type":"cure","who":"target"}',
  validate: (e, { who }) => ({ type: e.type, who: who === 'everyone_near' ? 'target' : who }),
  apply(e, { whoList }) {
    for (const p of whoList(e.who)) {
      if (e.type === 'sick' && !p.sick && !p.immortal) { p.sick = { severity: 1, since: sim.time }; remember(p, 'You suddenly feel ill.', `${p.name} fell ill`, 5); }
      if (e.type === 'cure' && p.sick) { p.sick = null; remember(p, 'You feel well again.', null, 4); }
    }
  },
  describe: e => e.type,
});

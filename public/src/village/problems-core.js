// Creating village problems.
import { chronicle } from '../core/memory.js';
import { sim } from '../core/state.js';
import { uid } from '../core/util.js';
import { PROBLEM_TYPES } from '../data/civic.js';

// ------------------------------------------------------------------ Problems (things to solve)

export function addProblem(type, extra = {}) {
  const t = PROBLEM_TYPES[type] || {};
  const pr = {
    id: uid(), type, title: t.title, desc: t.desc, place: t.place, skill: t.skill, label: t.label,
    needs: t.needs, danger: t.danger, clues: t.clues, difficulty: t.difficulty || 2, progress: 0, clueIdx: 0, contributors: {}, solved: false,
    created: sim.time, ...extra,
  };
  sim.problems.push(pr);
  chronicle(`❗ New problem: ${pr.title}`, null, 'event');
  return pr;
}

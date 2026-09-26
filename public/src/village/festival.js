// The yearly harvest festival.
import { worldEventAll } from '../core/memory.js';
import { sim } from '../core/state.js';
import { createGathering } from '../life/gatherings.js';
import { addMod } from '../social/relationships.js';

export function holdFestival() {
  sim.festival.doneYear = { ...(sim.festival.doneYear || {}), [sim.year()]: true };
  const pr = sim.problems.find(p => p.type === 'festival' && !p.closed);
  const ready = pr?.solved;
  const host = pr ? Object.entries(pr.contributors).sort((a, b) => b[1] - a[1])[0]?.[0] : null;
  if (ready) {
    createGathering({ kind: 'festival', title: 'The harvest festival', place: 'Village Square', start: sim.time, end: sim.time + 360, host });
    worldEventAll(`The harvest festival begins at the Village Square! Music, food and dancing${host ? `, thanks mostly to ${host}` : ''}. Everyone is invited!`, 8);
  } else {
    worldEventAll('It is the evening of the harvest festival, but nothing was prepared. The square is sad and empty.', 6);
    if (sim.leader) for (const n of sim.npcs) if (n.name !== sim.leader) addMod(n, sim.leader, 'let the festival fail', { aff: -6 }, 120);
  }
  if (pr) { pr.solved = true; pr.closed = true; }
  // Next year's festival needs preparing again.
  sim.scheduled.push({ at: sim.time + 1440 * 8, kind: 'addProblem', problem: 'festival' });
}

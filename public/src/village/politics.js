// Leaders, elections, laws and curfews.
import { chronicle, witness, worldEventAll } from '../core/memory.js';
import { practice, skill } from '../core/skills.js';
import { sim } from '../core/state.js';
import { pick } from '../core/util.js';
import { DECREES } from '../data/civic.js';
import { createGathering } from '../life/gatherings.js';
import { addMod, reputation } from '../social/relationships.js';

export function noticeCurfew() {
  // ---- Curfew breaking is noticed
  if (sim.laws.includes('curfew') && sim.isNight()) {
    for (const n of sim.npcs) {
      const here = sim.placeAt(n.x, n.y);
      if (n.age >= 16 && n.action?.type !== 'sleep' && !(here?.bed || here?.biz) && !n.crimes.some(c => c.what === 'breaking curfew' && sim.time - c.at < 1440)) {
        const seen = witness(n, `${n.name} was out after curfew.`, `${n.name} broke the curfew`, { radius: 150, importance: 4 });
        if (seen.length) n.crimes.push({ what: 'breaking curfew', at: sim.time });
      }
    }
  }
}

export function leadershipCheck(hour) {
  // ---- Leadership: a vote when there's no leader, and a yearly vote every spring.
  const adults = sim.npcs.filter(n => n.age >= 16);
  if (!sim.election && adults.length >= 2) {
    if (!sim.leader || !sim.findNpc(sim.leader)) startElection(sim.leader ? `${sim.leader} is gone and the village needs a new leader.` : 'The village has no leader.');
    else if (sim.season() === 'Spring' && sim.seasonDay() === 1 && hour === 10 && sim.lastElectionYear < sim.year()) {
      sim.lastElectionYear = sim.year();
      startElection('It is spring, and time for the yearly vote on who should lead.');
    }
  }
}

// ------------------------------------------------------------------ Politics

export function startElection(reason) {
  const adults = sim.npcs.filter(n => n.age >= 16 && !n.traveller);
  if (adults.length < 2) return;
  const candidates = adults.map(n => [n.name, reputation(n) + skill(n, 'leadership') / 3]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]);
  if (sim.leader && !candidates.includes(sim.leader) && sim.findNpc(sim.leader)) candidates.push(sim.leader);
  sim.election = { candidates, votes: {}, ends: sim.time + 240, reason };
  worldEventAll(`An election for village leader has been called! ${reason} Candidates: ${candidates.join(', ')}.`, 8, '🗳️');
}

export function tallyElection() {
  const e = sim.election;
  sim.election = null;
  const counts = {};
  for (const v of Object.values(e.votes)) counts[v] = (counts[v] || 0) + 1;
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) { chronicle('🗳️ Nobody voted. The election fizzles out.', null, 'event'); return; }
  const top = ranked.filter(r => r[1] === ranked[0][1]).map(r => r[0]);
  const winner = top.includes(sim.leader) ? sim.leader : pick(top); // ties keep the incumbent, else drawn by lot
  const old = sim.leader;
  sim.leader = winner;
  const w = sim.findNpc(winner);
  if (w) { w.lifeMemories.push(`I was elected leader of Oakhollow on day ${sim.day()}.`); practice(w, 'leadership', 5); }
  worldEventAll(`${winner} has been elected leader of Oakhollow (${ranked.map(([n, c]) => `${n} ${c}`).join(', ')}).`, 8, null);
  chronicle(`🗳️ ${winner} wins the election! (${ranked.map(([n, c]) => `${n}: ${c}`).join(', ')})`, w, 'event');
  if (old && old !== winner) { const o = sim.findNpc(old); if (o) addMod(o, winner, 'took my place as leader', { aff: -10 }, 240); }
}

export function decree(leader, law) {
  if (!sim.laws.includes(law)) sim.laws.push(law);
  worldEventAll(`${leader.name}, the village leader, decrees: "${DECREES[law]}"`, 7, null);
  chronicle(`📜 ${leader.name} decrees: ${DECREES[law]}`, leader, 'event');
  if (law === 'festival') {
    const start = sim.time + 120;
    createGathering({ kind: 'festival', title: 'A festival by decree', place: 'Village Square', start, end: start + 300, host: leader.name });
  }
  practice(leader, 'leadership', 3);
  for (const o of sim.npcs) {
    if (o === leader) continue;
    const likes = law === 'tax' ? -6 : law === 'ban_ruins' && /ruins|lights/i.test(o.goal) ? -12 : law === 'share_food' && o.inv.food > 5 ? -4 : 2;
    addMod(o, leader.name, `decreed "${DECREES[law]}"`, { aff: likes }, 120);
  }
}

export function repeal(leader, law) {
  sim.laws = sim.laws.filter(l => l !== law);
  worldEventAll(`${leader.name} has repealed the law: "${DECREES[law]}"`, 5, '📜');
}

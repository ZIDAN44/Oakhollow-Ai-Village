// Working on and solving village problems.
import { chronicle, remember, say, worldEventAll } from '../core/memory.js';
import { addItems, hasItems, practice, skill } from '../core/skills.js';
import { sim } from '../core/state.js';
import { injure, recover } from '../life/health.js';
import { addMod } from '../social/relationships.js';

export function contribute(npc, pr) {
  if (pr.solved) return;
  if (pr.needs && !hasItems(npc, pr.needs)) { remember(npc, `You needed ${Object.entries(pr.needs).map(([k, v]) => `${v} ${k}`).join(', ')} to help with "${pr.title}".`, null, 2); return; }
  if (pr.needs) addItems(npc, pr.needs, -1);
  const sk = skill(npc, pr.skill);
  const night = pr.type === 'blue_lights' && sim.isNight() ? 1.6 : 1;
  const gain = (5 + sk / 7 + Math.random() * 5) * night / (pr.difficulty || 2);
  pr.progress = Math.min(100, pr.progress + gain);
  pr.contributors[npc.name] = (pr.contributors[npc.name] || 0) + gain;
  practice(npc, pr.skill, 2);
  remember(npc, `You worked on "${pr.title}" (now ${Math.round(pr.progress)}% done).`, null, 3);

  if (pr.danger && Math.random() < pr.danger * (1 - sk / 150) * (sim.isNight() ? 1.5 : 1)) injure(npc, 15 + Math.random() * 25, 'mauled by a wolf');

  if (pr.clues) {
    const due = Math.min(pr.clues.length, Math.floor(pr.progress / (100 / pr.clues.length)));
    while (pr.clueIdx < due) {
      const clue = pr.clues[pr.clueIdx++];
      remember(npc, `CLUE: ${clue}`, `${npc.name} found a clue at the ruins: ${clue}`, 8);
      say(npc, `*discovers something: ${clue.slice(0, 50)}...*`, 6000, 'action');
      chronicle(`🔍 ${npc.name} found a clue: ${clue}`, npc, 'event');
    }
  }
  for (const other of Object.keys(pr.contributors)) if (other !== npc.name) addMod(npc, other, `worked with me on "${pr.title}"`, { aff: 2, trust: 2 }, 96);
  if (pr.progress >= 100) solve(pr, npc);
}

export function solve(pr, npc) {
  pr.solved = true;
  const heroes = Object.entries(pr.contributors).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  chronicle(`✅ SOLVED: ${pr.title}${heroes.length ? ` (thanks to ${heroes.slice(0, 3).join(', ')})` : ''}`, npc, 'event');
  for (const o of sim.npcs) for (const h of heroes.slice(0, 3)) if (o.name !== h) addMod(o, h, `helped solve "${pr.title}"`, { aff: 6, trust: 4 }, 240);
  switch (pr.type) {
    case 'blue_lights':
      sim.sealedDoor = 'found';
      worldEventAll(`${npc?.name || 'Someone'} uncovered a sealed door beneath the Old Ruins, humming with blue light. Someone sealed it on purpose.`, 9);
      break;
    case 'bridge': sim.bridgeBroken = false; worldEventAll('The bridge over the river has been repaired!', 5); break;
    case 'wolves': worldEventAll('The wolves have been driven out of Whisperwood Forest!', 6); break;
    case 'outbreak': for (const n of sim.npcs) recover(n, 'the cure'); worldEventAll(`${npc?.name || 'Someone'} found a cure! The sickness is over.`, 8); break;
    case 'festival': worldEventAll('The festival preparations are complete. It is going to be wonderful!', 5); break;
    case 'robbery': {
      if (!npc) break;
      if (pr.culprit && sim.findAnyone(pr.culprit)) {
        remember(npc, `You figured it out: ${pr.culprit} is the thief!`, `${pr.culprit} is the thief`, 9);
        addMod(npc, pr.culprit, 'is a thief', { aff: -25, trust: -40 }, 240);
        const thief = sim.findNpc(pr.culprit);
        if (thief) thief.crimes.push({ what: 'theft (exposed)', at: sim.time });
        chronicle(`🕵️ ${npc.name} has worked out that ${pr.culprit} is the thief!`, npc, 'event');
      } else {
        remember(npc, 'You worked it out: the thief was a stranger passing through on the road, long gone now.', 'the thief was a passing stranger, now long gone', 7);
        chronicle(`🕵️ ${npc.name} worked out the thief was a stranger passing through.`, npc, 'event');
      }
      break;
    }
    default: worldEventAll(`"${pr.title}" has been solved!`, 6);
  }
}

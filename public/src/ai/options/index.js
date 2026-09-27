// Everything a person could do right now, gathered from the option providers.
import { optionsBody, optionsChildren, optionsEverydayActivities, optionsPlaces } from './basics.js';
import { optionsRecentEvents } from './events.js';
import { optionsGriefTheVoice, optionsInventions, optionsLeadershipAndPolitics, optionsLifeEvents, optionsProblemsToSolve } from './civic.js';
import { optionsPeopleElsewhere, optionsPeopleNearby, optionsPromises, optionsRequestsPeopleMade } from './social.js';
import { optionsBuilding, optionsLearning, optionsWorkAndMoney } from './work.js';
import { sim } from '../../core/state.js';

// ------------------------------------------------------------------ Options

export function buildOptions(npc) {
  const here = sim.placeAt(npc.x, npc.y);
  const near = sim.nearby(npc, 140).filter(o => o.action?.type !== 'sleep' && o.age >= 3);
  const opts = [];
  // Don't pester: no repeat of a request still waiting for an answer, or one refused recently.
  const askedRecently = (o, kind) => (o.requests || []).some(r => r.from === npc.name && r.kind === kind)
    || (npc.asked?.[`${o.name}:${kind}`] && sim.time - npc.asked[`${o.name}:${kind}`] < 720);

  const add = (key, desc, act) => {
    if (act.type === 'request' && askedRecently(sim.findNpc(act.target) || {}, act.kind)) return;
    if (!opts.some(o => o.key === key)) opts.push({ key, desc, act });
  };
  const night = sim.isNight();
  const adult = npc.age >= 16;
  const n = npc.needs;
  const homePlace = sim.homeOf(npc);
  const ctx = { here, near, opts, add, night, adult, n, homePlace };

  optionsBody(npc, ctx);
  if (!adult) { optionsChildren(npc, ctx); return opts; }
  optionsRequestsPeopleMade(npc, ctx);
  optionsRecentEvents(npc, ctx);
  optionsPeopleNearby(npc, ctx);
  optionsPeopleElsewhere(npc, ctx);
  optionsPlaces(npc, ctx);
  optionsWorkAndMoney(npc, ctx);
  optionsLearning(npc, ctx);
  optionsProblemsToSolve(npc, ctx);
  optionsLeadershipAndPolitics(npc, ctx);
  optionsBuilding(npc, ctx);
  optionsLifeEvents(npc, ctx);
  optionsGriefTheVoice(npc, ctx);
  optionsEverydayActivities(npc, ctx);
  optionsPromises(npc, ctx);
  optionsInventions(npc, ctx);
  add('Wait and watch', 'Stay here a while, watching what happens.', { type: 'wait', minutes: 20 });
  return opts.slice(0, 255);
}

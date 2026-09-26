// Crime verbs: fights, theft, robbery.
import { defineVerbs } from '../registry.js';
import { fight, pickpocket, robBusiness } from '../crime.js';

export function verbFight(npc, act, { here, t, target }) {
  return fight(npc, target);
}

export function verbSteal(npc, act, { here, t, target }) {
  return pickpocket(npc, target);
}

export function verbRobBiz(npc, act, { here, t, target }) {
  return robBusiness(npc, here);
}

defineVerbs({
  'fight': verbFight,
  'steal': verbSteal,
  'robBiz': verbRobBiz,
});

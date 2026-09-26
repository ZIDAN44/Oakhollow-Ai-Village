// Everyday verbs: moving, eating, sleeping, playing, studying.
import { defineVerbs } from '../registry.js';
import { chronicle, remember, say, witness } from '../../core/memory.js';
import { addItems, hasItems } from '../../core/skills.js';
import { sim } from '../../core/state.js';
import { pick } from '../../core/util.js';
import { P, fill } from '../../identity/identity.js';
import { recover } from '../../life/health.js';
import { addMod } from '../../social/relationships.js';
import { judgeAction } from '../../village/laws.js';
import { usable } from '../../world/buildings.js';

export function verbMove(npc, act, { here, t, target }) {
  const person = sim.findNpc(act.target);
  const place = person ? null : sim.findPlace(act.target);
  if (!person && !place) return;
  if (person && sim.dist(npc, person) > sim.sight()) {
    const home = sim.homeOf(person);
    const guess = npc.seen?.[person.name] || (home && { x: home.x + home.w / 2, y: home.y + home.h / 2, place: home.name });
    if (!guess) { remember(npc, `You have no idea where ${person.name} is.`, null, 2); return; }
    npc.action = { type: 'move', target: guess.place, seek: person.name, then: act.then, thenLabel: act.thenLabel, dx: guess.x, dy: guess.y };
    return;
  }
  npc.action = {
    type: 'move', target: person ? person.name : place.name, person: person?.name, then: act.then, thenLabel: act.thenLabel,
    dx: place ? place.x + place.w * (0.2 + Math.random() * 0.6) : 0,
    dy: place ? place.y + place.h * (0.2 + Math.random() * 0.6) : 0,
  };
  if (place?.type === 'ruins' && sim.laws.includes('ban_ruins')) npc.headingToRuins = true;
  return;
}

export function verbEat(npc, act, { here, t, target }) {
  if (npc.inv.bread > 0) { npc.inv.bread--; npc.needs.hunger = Math.max(0, npc.needs.hunger - 70); }
  else if (npc.inv.food > 0) { npc.inv.food--; npc.needs.hunger = Math.max(0, npc.needs.hunger - 45); }
  else return;
  npc.action = { type: 'eat', until: t + 15 };
  return;
}

export function verbEatOwn(npc, act, { here, t, target }) {
  const st = here?.biz?.stock;
  if (!st) return;
  const item = st.meal ? 'meal' : st.bread ? 'bread' : null;
  if (!item) return;
  st[item]--; npc.needs.hunger = Math.max(0, npc.needs.hunger - (item === 'meal' ? 65 : 70));
  npc.action = { type: 'eat', until: t + 15 };
  return;
}

export function verbDrink(npc, act, { here, t, target }) {
  if (here?.water) npc.needs.thirst = 0;
  else if (npc.inv.water > 0) { npc.inv.water--; npc.needs.thirst = Math.max(0, npc.needs.thirst - 50); }
  else return;
  npc.action = { type: 'drink', until: t + 10 };
  return;
}

export function verbSleep(npc, act, { here, t, target }) {
  const outside = !(here?.bed && usable(here));
  if (outside) npc.sleptOutside = true;
  const inn = here?.biz?.kind === 'tavern' && !outside ? here : null;
  const innOwner = inn && sim.findNpc(inn.biz.owner);
  if (inn && innOwner && innOwner !== npc && npc.job?.place !== inn.name && innOwner.spouse !== npc.name && !innOwner.children.includes(npc.name)) {
    if (npc.inv.coins >= 2) { npc.inv.coins -= 2; inn.biz.till += 2; remember(npc, `You paid 2 coins for a room at the ${inn.name}.`, null, 1); }
    else { remember(npc, 'You slept in a room you could not pay for.', null, 4); addMod(innOwner, npc.name, 'slept in my rooms without paying', { aff: -4, trust: -3 }, 96); }
  }
  npc.action = { type: 'sleep', until: t + 8 * 60, bed: !outside };
  remember(npc, `You went to sleep${here ? ` at ${here.name}` : ' on the ground'}.`, null, 1);
  return;
}

export function verbDo(npc, act, { here, t, target }) {
  act = { ...act, text: fill(act.text, npc) };
  if (act.needs && !hasItems(npc, act.needs)) { remember(npc, `You didn't have what you needed to ${act.label.toLowerCase()}.`, null, 2); return; }
  if (act.needs) addItems(npc, act.needs, -1);
  npc.action = { type: 'do', until: t + (act.minutes || 30), text: act.text, effect: act.effect, skill: act.skill, fx: act.fx };
  say(npc, `*${act.text}*`, 4500, 'action');
  witness(npc, `${npc.name} ${act.text}.`, null, { importance: 2 });
  judgeAction(npc, act.text);
  if (act.chronicle !== false) chronicle(`${npc.name} ${act.text}.`, npc);
  return;
}

export function verbStudy(npc, act, { here, t, target }) {
  npc.action = { type: 'do', until: t + 60, text: `studies ${act.skill} from old books`, effect: 'study', skill: act.skill };
  say(npc, `*studies ${act.skill}*`, 3500, 'action');
  return;
}

export function verbSelfCure(npc, act, { here, t, target }) {
  npc.inv.remedy--;
  recover(npc, 'a remedy');
  npc.action = { type: 'wait', until: t + 10 };
  return;
}

export function verbLeave(npc, act, { here, t, target }) {
  npc.action = { type: 'leaving', dx: 1195, dy: 395 };
  remember(npc, 'You set off down the Eastern Road, leaving Oakhollow forever.', null, 10);
  witness(npc, `${npc.name} is leaving Oakhollow with ${P(npc).their} bags packed!`, `${npc.name} is leaving the village`, { radius: 250, importance: 8 });
  say(npc, pick(['Goodbye, Oakhollow.', 'Time for a new life.', 'I won\'t look back.']), 5000);
  return;
}

export function verbSettle(npc, act, { here, t, target }) {
  npc.traveller = false;
  remember(npc, 'You decided to settle down in Oakhollow for good.', `${npc.name} has decided to stay in Oakhollow`, 7);
  npc.lifeMemories.push(`I chose to make Oakhollow my home on day ${sim.day()}.`);
  chronicle(`🏡 ${npc.name} has decided to settle in Oakhollow.`, npc, 'life');
  npc.action = { type: 'wait', until: t + 5 };
  return;
}

export function verbMourn(npc, act, { here, t, target }) {
  if (npc.grief) npc.grief.at -= 720; // mourning helps it pass
  npc.action = { type: 'do', until: t + 30, text: `kneels by ${act.name}'s grave`, effect: 'calm' };
  say(npc, `*kneels by ${act.name}'s grave*`, 5000, 'action');
  witness(npc, `${npc.name} is mourning at ${act.name}'s grave.`, null, { importance: 3 });
  return;
}

export function verbPlay(npc, act, { here, t, target }) {
  npc.action = { type: 'do', until: t + 30, text: act.text || 'runs around playing', effect: 'play' };
  say(npc, `*${act.text || 'plays'}*`, 3000, 'action');
  return;
}

export function verbChooseRole(npc, act, { here, t, target }) {
  return;
}

export function verbDefault(npc, act, { here, t, target }) {
  npc.action = { type: 'wait', until: t + (act.minutes || 20) };
}

defineVerbs({
  'move': verbMove,
  'eat': verbEat,
  'eatOwn': verbEatOwn,
  'drink': verbDrink,
  'sleep': verbSleep,
  'do': verbDo,
  'study': verbStudy,
  'selfCure': verbSelfCure,
  'leave': verbLeave,
  'settle': verbSettle,
  'mourn': verbMourn,
  'play': verbPlay,
  'chooseRole': verbChooseRole,
  'default': verbDefault,
  wait: verbDefault,
});

// Options for the body, children, places and everyday activities.
import { placeDesc } from '../perception.js';
import { sim } from '../../core/state.js';
import { pick } from '../../core/util.js';
import { ACTIVITIES } from '../../data/activities.js';
import { P } from '../../identity/identity.js';
import { MAX_EXCHANGES, chatWith } from '../../social/conversation.js';

// Body
export function optionsBody(npc, ctx) {
  const { here, add, night, n, homePlace } = ctx;
  if (homePlace && homePlace !== here && (night || n.energy < 40)) add('Go home to sleep', `Walk home to ${homePlace.name} and go to bed.${night ? ' It is night.' : ''}`, { type: 'move', target: homePlace.name, then: { type: 'sleep' }, thenLabel: 'sleep' });
  if (here?.bed) add('Sleep here', `Go to bed at ${here.name}.`, { type: 'sleep' });
  else if (n.energy < 25) add('Collapse and sleep on the ground', 'Too tired to go on; sleep right here outdoors.', { type: 'sleep' });
  const ownKitchen = here?.biz?.owner === npc.name && (here.biz.stock.meal || here.biz.stock.bread) ? here : null;
  if (ownKitchen) add('Eat from your own kitchen', `A ${here.biz.stock.meal ? 'meal' : 'loaf'} from your own stock.`, { type: 'eatOwn' });
  if (npc.inv.bread > 0 || npc.inv.food > 0) add('Eat', `Eat ${npc.inv.bread ? 'bread' : 'food'} from your pack.`, { type: 'eat' });
  if (here?.water) add('Drink water here', 'Drink to quench thirst.', { type: 'drink' });
  else if (npc.inv.water > 0) add('Drink carried water', 'Drink from your water.', { type: 'drink' });
  if (npc.sick && npc.inv.remedy > 0) add('Take a remedy', 'Take a remedy to cure your sickness.', { type: 'selfCure' });
}

// Children
export function optionsChildren(npc, ctx) {
  const { here, near, add } = ctx;
  add('Play a game', 'Run around playing, laughing.', { type: 'play', text: pick(['plays tag', 'chases a chicken', 'skips stones', 'plays hide and seek']) });
  const parent = npc.parents.map(p => sim.findNpc(p)).find(Boolean);
  if (parent && !near.includes(parent)) add(`Go find ${parent.name}`, 'Go to your parent.', { type: 'move', target: parent.name });
  for (const o of near) if (chatWith(npc, o.name) < MAX_EXCHANGES) add(`Talk to ${o.name}`, `Chat with ${o.name}.`, { type: 'say', target: o.name });
  for (const p of sim.places) if (p !== here && p.type !== 'river') add(`Explore ${p.name}`, p.desc, { type: 'move', target: p.name });
  if (here?.books || here?.biz?.kind === 'school') add('Learn to read', 'Study from books.', { type: 'study', skill: 'scholarship' });
  const school = sim.places.find(p => p.biz?.kind === 'school');
  if (school && here !== school && npc.age >= 5) add(`Go to school at the ${school.name}`, 'Learn with the other children.', { type: 'move', target: school.name, then: { type: 'study', skill: 'scholarship' } });
  if (parent && near.includes(parent)) add(`Help ${parent.name} with ${P(parent).their} work`, 'Learn by helping.', { type: 'play', text: `helps ${parent.name} with ${P(parent).their} work` });
  add('Wait and watch', 'Stay here.', { type: 'wait', minutes: 20 });
}

// Places
export function optionsPlaces(npc, ctx) {
  const { here, add } = ctx;
  for (const p of sim.places) if (p !== here) add(`Walk to ${p.name}`, placeDesc(p), { type: 'move', target: p.name });
}

// Everyday activities
export function optionsEverydayActivities(npc, ctx) {
  const { here, add, night } = ctx;
  for (const a of [...ACTIVITIES, ...sim.customActivities]) {
    if (a.role && a.role !== npc.role) continue;
    if (a.night && !night) continue;
    if (a.where && !(here && (here.type === a.where || here.name === a.where))) continue;
    if (a.needs && !Object.entries(a.needs).every(([k, v]) => (npc.inv[k] || 0) >= v)) continue;
    add(a.label, `${npc.name} ${a.text || a.label.toLowerCase()}.`, { type: 'do', label: a.label, text: a.text || a.label.toLowerCase(), minutes: a.minutes || 30, effect: a.effect, skill: a.skill, needs: a.needs });
  }
}

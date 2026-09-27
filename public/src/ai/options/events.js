// Options for world events that happen at a place: hurry there to help, or keep away.
import { recentEvents } from '../../core/memory.js';
import { sim } from '../../core/state.js';

export const EVENT_HOURS = 6;

// The place an event names: by full name, or by a kind of place there is only one of ("the tavern").
export function eventPlace(text) {
  const t = text.toLowerCase();
  const named = sim.places.find(p => t.includes(p.name.toLowerCase()));
  if (named) return named;
  const ofType = sim.places.filter(p => new RegExp(`\\b${p.type}\\b`).test(t));
  return ofType.length === 1 ? ofType[0] : null;
}

export const eventKeys = place => ({ go: `Rush to ${place.name}`, here: `Help at ${place.name}`, away: `Keep away from ${place.name}` });

const helped = (npc, place, since) => npc.memory.some(m => m.at >= since && m.text.includes(`You helped out at ${place.name}`));
const trimmed = text => text.replace(/[.!?\s]+$/, '');

export function optionsRecentEvents(npc, ctx) {
  const { here, add, homePlace } = ctx;
  for (const m of recentEvents(npc, EVENT_HOURS).slice(0, 3)) {
    const place = eventPlace(m.gist);
    if (!place || helped(npc, place, m.at)) continue;
    const keys = eventKeys(place);
    const help = { type: 'do', label: keys.here, text: `pitches in to help at ${place.name}`, minutes: 40, effect: 'helpOut' };
    if (here === place) add(keys.here, `${trimmed(m.gist)}. Pitch in and help, right here.`, help);
    else add(keys.go, `${trimmed(m.gist)}. Hurry there to help, or to see for yourself.`, { type: 'move', target: place.name });
    if (homePlace && homePlace !== place && homePlace !== here) add(keys.away, `${trimmed(m.gist)}. Stay safe at ${homePlace.name}.`, { type: 'move', target: homePlace.name });
  }
}

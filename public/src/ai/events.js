// How a person reacts to a world event at a place: one typed question, asked once per event.
// As everyday options alone, "Rush to the tavern" competed with dozens of others and was rarely picked.
import { choose } from './sampling.js';
import { eventKeys, eventPlace } from './options/events.js';
import { fill } from '../identity/identity.js';

const REACTIONS = {
  help: { desc: 'Hurry to {place} to help, or to see for {themself}', key: k => [k.go, k.here] },
  keep_away: { desc: 'Keep well away from {place} and stay safe', key: k => [k.away] },
  carry_on: { desc: 'Carry on with {their} day', key: () => [] },
};

// The options this person has for their freshest event, or null when it names no place or offers nothing.
function freshReactions(npc, options) {
  const place = npc.freshEvent && eventPlace(npc.freshEvent);
  if (!place) return null;
  const keys = eventKeys(place);
  const found = Object.fromEntries(Object.entries(REACTIONS).map(([k, r]) => [k, options.find(o => r.key(keys).includes(o.key))]));
  return found.help || found.keep_away ? { place, found } : null;
}

export function eventQuestion(npc, options) {
  const fresh = freshReactions(npc, options);
  if (!fresh) return {};
  const criteria = Object.fromEntries(Object.entries(REACTIONS).filter(([k]) => k === 'carry_on' || fresh.found[k])
    .map(([k, r]) => [k, fill(r.desc.replace('{place}', fresh.place.name), npc)]));
  return {
    event_reaction: {
      type: 'choice',
      instructions: fill(`News just reached ${npc.name}: "${npc.freshEvent}" What does ${npc.name} do about it, given {their} personality, courage, who {they} care{s} about there, and {their} body?`, npc),
      criteria,
    },
  };
}

// The chosen option when the person reacts to the event, or null. Asked once: the flag clears either way.
export function eventReply(npc, answers, options) {
  if (!npc.freshEvent || !answers.event_reaction) return null;
  const fresh = freshReactions(npc, options);
  npc.freshEvent = null;
  return fresh?.found[choose(answers.event_reaction)] || null;
}

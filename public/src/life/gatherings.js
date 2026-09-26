// Gatherings: funerals, weddings, meetings and festivals.
import { broadcast, chronicle, remember } from '../core/memory.js';
import { sim } from '../core/state.js';
import { uid } from '../core/util.js';
import { addMod } from '../social/relationships.js';

// ------------------------------------------------------------------ Gatherings (funerals, weddings, meetings, festivals)

export function createGathering(g) {
  const gathering = { id: uid(), attendees: [], ...g };
  sim.gatherings.push(gathering);
  const when = gathering.start - sim.time < 60 ? 'now' : `on day ${Math.floor(gathering.start / 1440) + 1} at ${String(Math.floor((gathering.start % 1440) / 60)).padStart(2, '0')}:00`;
  broadcast(`${gathering.title} will be held at ${gathering.place} ${when}.`, `${gathering.title} is coming up at ${gathering.place}`, 5);
  chronicle(`📅 ${gathering.title}: ${gathering.place}, ${when}.`, null, 'event');
  return gathering;
}

export function updateGatherings() {
  for (const g of [...sim.gatherings]) {
    const place = sim.findPlace(g.place);
    if (sim.time >= g.start && sim.time <= g.end && place) {
      for (const n of sim.npcs) {
        if (n.age >= 3 && sim.placeAt(n.x, n.y) === place && !g.attendees.includes(n.name)) g.attendees.push(n.name);
      }
    }
    if (sim.time > g.end) {
      sim.gatherings.splice(sim.gatherings.indexOf(g), 1);
      finishGathering(g);
    }
  }
}

export function finishGathering(g) {
  const people = g.attendees.map(a => sim.findNpc(a)).filter(Boolean);
  // Shared moments bond people.
  for (const a of people) for (const b of people) if (a !== b) addMod(a, b.name, `was at ${g.title} with me`, { aff: 3, trust: 2 }, 120);
  (Object.hasOwn(GATHERING_ENDS, g.kind) ? GATHERING_ENDS[g.kind] : endCelebration)(g, people);
}

// Everyone at the gathering is thanked by `host` (skipping the host themself).
function thank(host, people, why, aff, hl) {
  for (const p of people) if (p !== host) addMod(host, p.name, why, { aff }, hl);
}

const GATHERING_ENDS = {
  funeral(g, people) {
    for (const p of people) { if (p.grief) p.grief.at -= 1440; p.moodScore = Math.max(p.moodScore ?? 2, 1.5); remember(p, `You said goodbye to ${g.about} at the funeral.`, null, 7); }
    chronicle(`⚱️ ${g.about} was laid to rest. ${people.length ? `Mourners: ${people.map(p => p.name).join(', ')}.` : 'Nobody came.'}`, null, 'life');
  },
  wedding(g, people) {
    for (const p of people) { p.moodScore = Math.min(4, (p.moodScore ?? 2) + 1); remember(p, `You celebrated ${g.about}'s wedding.`, null, 5); }
    for (const name of g.couple || []) { const n = sim.findNpc(name); if (n) thank(n, people, 'came to our wedding', 6, 240); }
    chronicle(`💒 ${g.title} was celebrated${people.length ? ` with ${people.length} guests` : ', but nobody came'}.`, null, 'life');
  },
};

function endCelebration(g, people) {
  for (const p of people) { p.moodScore = Math.min(4, (p.moodScore ?? 2) + 0.7); remember(p, `You were at ${g.title}.`, null, 4); }
  chronicle(`🎉 ${g.title} is over (${people.length} came).`, null, 'event');
  const h = g.host && sim.findNpc(g.host);
  if (h) for (const p of people) if (p !== h) addMod(p, h.name, `hosted ${g.title}`, { aff: 4 }, 120);
}

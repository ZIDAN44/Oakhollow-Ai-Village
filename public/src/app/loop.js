// The simulation loop and the queue of minds waiting to think.
import { stepNpc } from '../actions/move.js';
import { startAction } from '../actions/registry.js';
import { inventFor } from '../ai/invent/imagine.js';
import { inventOffline } from '../ai/invent/offline.js';
import { think } from '../ai/think.js';
import { updateSightings } from '../core/knowledge.js';
import { chronicle, worldEventAll } from '../core/memory.js';
import { sim } from '../core/state.js';
import { tickLife } from '../life/clock.js';
import { separate } from '../nav/crowd.js';
import { renderPlaceOptions } from '../ui/panels/god.js';

export const MAX_CONCURRENT = 5;

export const GAME_MIN_PER_SEC = 2;

// ------------------------------------------------------------------ Thinking queue

export const queue = [];

export function requestThink(npc) {
  if (npc.thinking) return;
  npc.thinking = true;
  queue.push(npc);
  pump();
}

export function pump() {
  while (sim.inFlight < MAX_CONCURRENT && queue.length) {
    const npc = queue.shift();
    if (!sim.npcs.includes(npc)) { npc.thinking = false; continue; }
    sim.inFlight++;
    think(npc)
      .then(({ act, usage }) => {
        if (usage) {
          sim.stats.calls++;
          sim.stats.inTok += usage.input_tokens || 0;
          sim.stats.outTok += usage.output_tokens || 0;
          sim.stats.cost += usage.cost ?? (usage.input_tokens || 0) * 0.042 / 1e6;
        }
        if (!npc.action && sim.npcs.includes(npc)) startAction(npc, act);
        // About once a game day, each villager's imagination proposes something new.
        if (npc.age >= 12 && !npc.inventing && sim.time - (npc.lastInvent ?? -1e9) > 1440) { if (sim.speech) inventFor(npc); else inventOffline(npc); }
      })
      .catch(err => {
        sim.stats.errors++;
        console.warn(`[${npc.name}]`, err);
        if (sim.stats.errors <= 3 || sim.stats.errors % 20 === 0) chronicle(`⚠️ Mind error: ${err.message}`, null, 'error');
        npc.nextThinkAt = sim.time + 10;
      })
      .finally(() => {
        npc.thinking = false;
        sim.inFlight--;
        if (!npc.action) npc.nextThinkAt = Math.max(npc.nextThinkAt, sim.time + 3);
        pump();
      });
  }
}

// ------------------------------------------------------------------ Simulation step

export let lastPlaceCount = 0;

export function step(dt) {
  tickLife(dt);
  for (const npc of [...sim.npcs]) {
    if (!sim.npcs.includes(npc)) continue;
    if (npc.action) { stepNpc(npc, dt); continue; }
    if (npc.age < 4) continue; // toddlers just follow their parents
    if (!npc.thinking && sim.time >= npc.nextThinkAt) requestThink(npc);
  }
  separate(dt);
  updateSightings();
  if (sim.places.length !== lastPlaceCount) { lastPlaceCount = sim.places.length; renderPlaceOptions(); }
}

export function worldEvent(text, quiet) {
  worldEventAll(text, 7, null);
  chronicle(`${quiet ? '🌍' : '📣'} ${text}`, null, 'god');
  for (const n of sim.npcs) n.awareness = Math.min(100, (n.awareness || 0) + 2);
}

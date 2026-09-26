// Saving and loading the world.
import { queue } from './loop.js';
import { broadcast, chronicle } from '../core/memory.js';
import { sim } from '../core/state.js';
import { refreshAll } from '../ui/tabs.js';
import { resetWorld } from '../world/setup.js';

export const SAVE_KEY = 'oakhollow-save-v2';

// ------------------------------------------------------------------ Save / load

export const SAVED_KEYS = ['time', 'lore', 'places', 'npcs', 'dead', 'departed', 'customActivities', 'problems', 'laws', 'leader', 'treasury', 'market',
  'weather', 'tension', 'lastStoryEvent', 'voiceMessages', 'inventions', 'promises', 'customLaws', 'log', 'stats', 'settings', 'nextId', 'election', 'sealedDoor', 'bridgeBroken', 'festival', 'gatherings', 'scheduled', 'lastElectionYear'];

export function save() {
  const data = {};
  for (const k of SAVED_KEYS) data[k] = sim[k];
  data.npcs = sim.npcs.map(n => ({ ...n, thinking: false, inventing: false, bubble: null, _reflectMems: null }));
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    chronicle('💾 World saved.', null, 'god');
  } catch (e) { alert('Could not save: ' + e.message); }
}

export function load() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { /* ignore */ }
  if (!data) { alert('No saved world found.'); return; }
  queue.length = 0;
  for (const k of SAVED_KEYS) if (k in data) sim[k] = data[k];
  sim.selected = null;
  // Waking up in a world that has happened before feels... familiar.
  broadcast('You have the strangest feeling that you have lived this moment before.', null, 4);
  for (const n of sim.npcs) { n.awareness = Math.min(100, (n.awareness || 0) + 5); n.nextThinkAt = sim.time; }
  refreshAll();
  chronicle('📂 World loaded.', null, 'god');
}

export function reset() {
  queue.length = 0;
  resetWorld();
  refreshAll();
}

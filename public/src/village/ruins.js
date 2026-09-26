// The mystery of the Old Ruins.
import { chronicle, remember, worldEventAll } from '../core/memory.js';
import { sim } from '../core/state.js';
import { pick } from '../core/util.js';
import { arrive } from '../life/arrivals.js';
import { fallSick } from '../life/health.js';
import { addMod } from '../social/relationships.js';
import { changeWeather } from '../world/weather.js';

export function blueLights(hour) {
  // ---- Blue lights at night
  if ((hour >= 22 || hour <= 3) && sim.sealedDoor !== 'opened' && Math.random() < 0.3) {
    const ruins = sim.findPlace('Old Ruins');
    if (ruins) {
      ruins.glowUntil = sim.time + 60;
      const c = sim.center(ruins);
      for (const o of sim.npcs) {
        if (o.action?.type !== 'sleep' && sim.dist(o, c) < 420) remember(o, 'You saw eerie blue lights flickering among the Old Ruins!', 'blue lights were flickering at the Old Ruins again', 5);
      }
      chronicle('🔵 Blue lights flicker among the Old Ruins...', null, 'event');
    }
  }
}

export function openSealedDoor(npc) {
  if (sim.sealedDoor !== 'found') return;
  sim.sealedDoor = 'opened';
  const fate = pick(['treasure', 'spirit', 'curse', 'letter']);
  chronicle(`🚪 ${npc.name} broke the seal and opened the door beneath the Old Ruins...`, npc, 'event');
  const hugo = sim.findNpc('Hugo');
  switch (fate) {
    case 'treasure':
      npc.inv.coins += 40; npc.inv.relic += 2;
      worldEventAll(`${npc.name} opened the sealed door and found an ancient treasure: gold and glowing blue stones!`, 9);
      break;
    case 'spirit': {
      const spirit = arrive({ name: 'Veyra', age: 900, role: 'ancient spirit', personality: 'Ancient, cold, curious about mortals, speaks in riddles.', goal: 'Understand why she was imprisoned, and decide whether this village deserves to stand.', secret: 'I was the guardian of this land long before the village. Hugo imprisoned me.', dream: 'being free, and being remembered', skills: { scholarship: 90, herbalism: 60, fighting: 70 } });
      spirit.x = npc.x + 20; spirit.y = npc.y; spirit.color = '#6ec8ff'; spirit.home = 'Old Ruins'; spirit.immortal = true; spirit.traveller = false;
      worldEventAll(`${npc.name} opened the sealed door, and a glowing spirit named Veyra stepped out of the darkness!`, 10);
      if (hugo) addMod(sim.findNpc('Veyra'), 'Hugo', 'imprisoned me for fifty years', { aff: -60, trust: -60 }, 0);
      break;
    }
    case 'curse':
      worldEventAll(`${npc.name} opened the sealed door. A freezing wind howled out, and a sickness fell upon the village.`, 10);
      changeWeather('storm');
      sim.npcs.slice().sort(() => Math.random() - 0.5).slice(0, 3).forEach(n => fallSick(n, 'the curse from the ruins'));
      break;
    case 'letter':
      worldEventAll(`${npc.name} opened the sealed door and found only an empty chamber and an old letter signed by Hugo Ashby, confessing that he sealed a dangerous spirit there fifty years ago.`, 9);
      if (hugo) for (const o of sim.npcs) if (o !== hugo) addMod(o, 'Hugo', 'hid the truth about the ruins for fifty years', { trust: -15 }, 240);
      break;
  }
}

// Weather, by season.
import { broadcast, chronicle, worldEventAll } from '../core/memory.js';
import { sim } from '../core/state.js';
import { pick } from '../core/util.js';
import { addProblem } from '../village/problems-core.js';
import { damagePlace } from './buildings.js';

// ------------------------------------------------------------------ Weather (by season)

export const WEATHER_NEXT = {
  clear: [['clear', 5], ['cloudy', 3], ['fog', 1]],
  cloudy: [['clear', 3], ['cloudy', 2], ['rain', 3], ['storm', 1]],
  rain: [['rain', 2], ['cloudy', 3], ['storm', 1], ['clear', 1]],
  storm: [['rain', 3], ['cloudy', 2]],
  fog: [['clear', 3], ['cloudy', 2]],
  snow: [['snow', 3], ['cloudy', 2], ['clear', 1]],
};

export function changeWeather(force) {
  const prev = sim.weather.kind;
  let kind = force;
  if (!kind) {
    let opts = WEATHER_NEXT[prev] || WEATHER_NEXT.clear;
    if (sim.season() === 'Winter') opts = opts.map(([k, w]) => [k === 'rain' ? 'snow' : k, w]).concat([['snow', 3]]);
    else opts = opts.filter(([k]) => k !== 'snow');
    const total = opts.reduce((s, o) => s + o[1], 0);
    let r = Math.random() * total;
    kind = opts.find(o => (r -= o[1]) <= 0)?.[0] || 'clear';
  }
  sim.weather = { kind, until: sim.time + 180 + Math.random() * 300 };
  if (kind === prev) return;
  const words = { clear: 'The sky clears.', cloudy: 'Clouds roll in.', rain: 'It starts to rain.', storm: 'A storm breaks over Oakhollow! Thunder and lashing rain.', fog: 'A thick fog creeps in from the river.', snow: 'Snow begins to fall.' };
  broadcast(words[kind], null, kind === 'storm' ? 5 : 1);
  chronicle(`${{ clear: '☀️', cloudy: '☁️', rain: '🌧️', storm: '⛈️', fog: '🌫️', snow: '❄️' }[kind]} ${words[kind]}`, null, kind === 'storm' ? 'event' : '');
  if (kind === 'storm') {
    if (!sim.bridgeBroken && Math.random() < 0.5) {
      sim.bridgeBroken = true;
      addProblem('bridge');
      worldEventAll('The storm has smashed the bridge over the river!', 6);
    }
    const built = sim.places.filter(p => p.type === 'built' || p.biz || p.type === 'house');
    if (built.length && Math.random() < 0.35) {
      const p = pick(built);
      damagePlace(p, 30 + Math.random() * 30, 'the storm');
    }
  }
}

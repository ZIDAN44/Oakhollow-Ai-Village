// The life clock: what happens every minute, hour and day.
import { emit } from '../core/events.js';
import { chronicle, remember, worldEventAll } from '../core/memory.js';
import { sim } from '../core/state.js';
import { ageOneDay, dailyIllness, mortalityRoll } from './ageing.js';
import { tickBody } from './body.js';
import { careForOrphans, foundling, progressPregnancies } from './family.js';
import { updateGatherings } from './gatherings.js';
import { applyStatuses, spreadSickness } from './health.js';
import { checkPromises } from '../social/promises.js';
import { collectTaxes, collectTills, dailyArrivalsAndShortages, spoilFood, tradeSurplus } from '../village/daily.js';
import { holdFestival } from '../village/festival.js';
import { leadershipCheck, noticeCurfew, tallyElection } from '../village/politics.js';
import { addProblem } from '../village/problems-core.js';
import { blueLights } from '../village/ruins.js';
import { storyteller } from '../village/storyteller.js';
import { changeWeather } from '../world/weather.js';

// ------------------------------------------------------------------ Ticking

export function tickLife(dt) {
  const prevHour = sim.hour();
  const prevDay = sim.day();
  sim.time += dt;
  if (sim.hour() !== prevHour) onNewHour(sim.hour());
  if (sim.day() !== prevDay) onNewDay();

  // Natural resources regrow with the seasons (rain helps crops; nothing grows in winter).
  const season = sim.season();
  const growth = { Spring: 1.3, Summer: 1, Autumn: 0.7, Winter: 0.1 }[season];
  for (const p of sim.places) {
    if (!p.res) continue;
    const rain = p.type === 'farm' && sim.weather.kind === 'rain' ? 1.8 : 1;
    const g = p.type === 'river' ? Math.max(0.4, growth) : growth; // fish still bite in winter, a little
    p.res.amount = Math.min(p.res.max, p.res.amount + p.res.regrow * dt * g * rain);
  }

  for (const n of [...sim.npcs]) tickBody(n, dt);

  // Delayed effects (e.g. wine fermenting, a plan coming to fruition)
  for (const s of [...sim.scheduled]) {
    if (sim.time < s.at) continue;
    sim.scheduled.splice(sim.scheduled.indexOf(s), 1);
    if (s.kind === 'addProblem') addProblem(s.problem);
    else if (s.kind === 'foundling') foundling(s.parents);
    else if (s.effects) emit('scheduled', s);
  }

  if (sim.election && (sim.time >= sim.election.ends || Object.keys(sim.election.votes).length >= sim.npcs.filter(n => n.age >= 16).length)) tallyElection();
  sim.tension = Math.max(0, sim.tension - 0.01 * dt);
}

export function onNewHour(hour) {
  if (sim.time >= sim.weather.until) changeWeather();
  spreadSickness();
  applyStatuses();
  progressPregnancies();
  careForOrphans();
  blueLights(hour);
  // ---- The harvest festival: Autumn 1, every year.
  if (sim.season() === 'Autumn' && sim.seasonDay() === 1 && hour === 17 && !sim.festival.doneYear?.[sim.year()]) holdFestival();
  noticeCurfew();
  leadershipCheck(hour);
  updateGatherings();
  checkPromises();
  storyteller();
}

export function onNewDay() {
  announceDay();
  const perDay = 1 / sim.bioYearDays(); // life-years that pass per game day

  for (const n of [...sim.npcs]) {
    if (!sim.npcs.includes(n)) continue;
    ageOneDay(n, perDay);
    if (mortalityRoll(n, perDay)) continue;
    dailyIllness(n);
    if (n.grief && sim.time - n.grief.at > 3 * 1440) n.grief = null;
    for (const [who, amt] of Object.entries(n.debts || {})) if (amt > 0) remember(n, `You still owe ${who} ${amt} coins.`, null, 3);
  }

  spoilFood();
  collectTills();
  collectTaxes();
  tradeSurplus();
  dailyArrivalsAndShortages();
}

export function announceDay() {
  chronicle(`☀️ Day ${sim.day()} begins. ${sim.dateStr()}.`, null, 'event');
  if (sim.seasonDay() === 1) {
    const words = { Spring: 'Spring has come. The fields wake up.', Summer: 'Summer arrives, long and warm.', Autumn: 'Autumn: harvest time, and the festival.', Winter: 'Winter sets in. Nothing grows, and nights outdoors are dangerous.' };
    worldEventAll(words[sim.season()], 5);
  }
}

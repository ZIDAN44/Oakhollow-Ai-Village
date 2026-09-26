// The single shared simulation state, plus calendar and lookup helpers.
import { CAL_START, SEASONS, SEASON_DAYS } from './constants.js';

export const sim = {
  time: 8 * 60,
  speed: 1,
  paused: false,
  ai: false,
  model: '',
  lore: '',
  places: [],
  npcs: [],
  dead: [],
  departed: [],
  customActivities: [],
  problems: [],
  laws: [],
  leader: null,
  treasury: 0,
  market: { food: 4, wood: 4, herbs: 0, bread: 0, tool: 0, remedy: 0 },
  weather: { kind: 'clear', until: 0 },
  tension: 0,
  lastStoryEvent: 0,
  voiceMessages: [],
  inventions: [],
  promises: [],
  customLaws: [],
  log: [],
  logDirty: true,
  stats: { calls: 0, inTok: 0, outTok: 0, cost: 0, errors: 0 },
  settings: { mortality: true, births: true, arrivals: true, storyteller: true, lifeSpeed: 4 },
  gatherings: [],
  scheduled: [],
  inFlight: 0,
  selected: null,
  nextId: 1,

  // ---- Calendar: 4 seasons of SEASON_DAYS each. The game starts in late summer.
  calDay() { return Math.floor(this.time / 1440) + CAL_START; },
  year() { return Math.floor(this.calDay() / (SEASON_DAYS * 4)) + 1; },
  season() { return SEASONS[Math.floor(this.calDay() / SEASON_DAYS) % 4]; },
  seasonDay() { return (this.calDay() % SEASON_DAYS) + 1; },
  dateStr() { return `${this.season()} ${this.seasonDay()}, year ${this.year()}`; },
  // Biology runs on its own clock so lives fit in a playable time: lifeSpeed life-years per calendar year.
  bioYearDays() { return (SEASON_DAYS * 4) / (this.settings.lifeSpeed || 4); },
  sight() {
    const w = this.weather.kind;
    return (this.isNight() ? 110 : 260) * (w === 'fog' ? 0.35 : w === 'storm' || w === 'snow' ? 0.6 : 1);
  },
  day() { return Math.floor(this.time / 1440) + 1; },
  hour() { return Math.floor(this.time / 60) % 24; },
  clock() {
    const m = Math.floor(this.time) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  },
  timeStr() { return `Day ${this.day()} (${this.dateStr()}), ${this.clock()}, ${this.partOfDay()}`; },
  partOfDay() {
    const h = this.hour();
    return h < 5 ? 'late night' : h < 8 ? 'early morning' : h < 12 ? 'morning' : h < 14 ? 'midday'
      : h < 18 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  },
  isNight() { const h = this.hour(); return h >= 21 || h < 6; },
  dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); },
  placeAt(x, y) {
    let best = null;
    for (const p of this.places) {
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h && (!best || p.w * p.h < best.w * best.h)) best = p;
    }
    return best;
  },
  placeName(npc) { return this.placeAt(npc.x, npc.y)?.name || 'the open fields'; },
  nearby(npc, r) { return this.npcs.filter(o => o !== npc && this.dist(o, npc) < r); },
  findNpc(name) { return this.npcs.find(n => n.name.toLowerCase() === String(name).toLowerCase()); },
  findAnyone(name) { return this.findNpc(name) || this.dead.find(n => n.name === name) || this.departed.find(n => n.name === name); },
  findPlace(name) {
    const s = String(name || '').toLowerCase();
    if (!s) return null;
    return this.places.find(p => p.name.toLowerCase() === s) || this.places.find(p => p.name.toLowerCase().includes(s));
  },
  center(p) { return { x: p.x + p.w / 2, y: p.y + p.h / 2 }; },
  homeOf(npc) { return this.findPlace(npc.home); },
  isAdult(n) { return n.age >= 16; },
  problem(type) { return this.problems.find(p => p.type === type && !p.solved); },
  describeActivity(o) {
    const a = o.action;
    if (o.age < 4) return 'a small child, toddling after family';
    if (o.thinking && !a) return 'pausing, deep in thought';
    if (!a) return 'standing around';
    switch (a.type) {
      case 'move': return a.then?.type === 'say' || a.then?.type === 'request' ? `walking over to talk to ${a.then.target}`
        : a.then ? `heading to ${a.target} to ${a.thenLabel || 'do something'}` : `walking to ${a.target}`;
      case 'sleep': return 'asleep';
      case 'gather': return `working, gathering ${a.item}`;
      case 'eat': return 'eating';
      case 'drink': return 'drinking';
      case 'talk': return `talking with ${a.target}`;
      case 'build': return `building a ${a.name}`;
      case 'fight': return `FIGHTING ${a.target}!`;
      case 'lesson': return a.teacher ? `teaching ${a.student} ${a.skill}` : `learning ${a.skill} from ${a.teacherName}`;
      case 'do': return a.text;
      case 'leaving': return 'leaving Oakhollow for good';
      default: return 'waiting and watching';
    }
  },
};

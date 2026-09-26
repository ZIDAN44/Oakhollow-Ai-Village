// Effects between people: opinions, rumours, influence, secrets, summons and new roles.
import { sim } from '../../core/state.js';
import { HEAR_RADIUS } from '../../core/constants.js';
import { remember, chronicle } from '../../core/memory.js';
import { addMod } from '../../social/relationships.js';
import { makeRequest } from '../../social/requests.js';
import { defineEffect, word, text, int } from '../registry.js';

defineEffect('opinion', {
  doc: '{"type":"opinion","who":"target","aff":8,"trust":0,"rom":0,"why":"gave me a gift"}   how "who" feels about the doer, each -25..25',
  validate: (e, { who }) => ({ type: 'opinion', who: who === 'self' ? 'target' : who, aff: int(e.aff, -25, 25), trust: int(e.trust, -25, 25), rom: int(e.rom, -15, 15), why: text(e.why, 50) || 'what they did' }),
  apply(e, { npc, whoList }) {
    for (const p of whoList(e.who)) if (p !== npc) addMod(p, npc.name, e.why, { aff: e.aff, trust: e.trust, rom: e.rom }, 96);
  },
  describe: e => `${e.who.replace('_', ' ')} ${e.aff + e.trust + e.rom >= 0 ? 'likes' : 'resents'} it`,
});

defineEffect('rumor', {
  doc: '{"type":"rumor","about":"target","claim":"Tobias waters down the ale","positive":false}   spread a claim about someone ("target" or a villager\'s name); listeners\' opinion of them shifts',
  validate(e, { issues }) {
    const claim = text(e.claim, 100);
    const about = e.about === 'target' ? 'target' : sim.findNpc(e.about)?.name;
    if (claim && about) return { type: 'rumor', about, claim, positive: Boolean(e.positive) };
    issues.push('rumor needs a claim and who it is about');
    return null;
  },
  apply(e, { npc, target, near }) {
    const aboutName = e.about === 'target' ? target?.name : e.about;
    if (!aboutName) return;
    const gist = `people say ${e.claim.charAt(0).toLowerCase() + e.claim.slice(1)}`;
    for (const o of near) {
      if (o.name === aboutName) continue;
      remember(o, `${npc.name} told you: "${e.claim}"`, gist, 5);
      addMod(o, aboutName, `heard that ${e.claim.toLowerCase()}`, { aff: e.positive ? 5 : -6, trust: e.positive ? 3 : -5 }, 96);
    }
    const victim = sim.findNpc(aboutName);
    if (victim && sim.dist(victim, npc) < HEAR_RADIUS && !e.positive) addMod(victim, npc.name, 'spread rumours about me', { aff: -15, trust: -15 }, 168);
  },
  describe: e => `spreads a ${e.positive ? 'good' : 'bad'} rumour`,
});

defineEffect('sway', {
  doc: '{"type":"sway","who":"target","about":"Hugo","aff":-10,"trust":0}   change how the target feels about a third person (matchmaking, turning people against someone), -15..15',
  validate(e, { issues }) {
    const about = sim.findNpc(e.about)?.name;
    if (about) return { type: 'sway', about, aff: int(e.aff, -15, 15), trust: int(e.trust, -15, 15), rom: int(e.rom, -10, 10) };
    issues.push('sway needs "about": an existing villager');
    return null;
  },
  apply(e, { npc, target }) {
    if (target) addMod(target, e.about, `${npc.name} talked to me about ${e.about}`, { aff: e.aff, trust: e.trust, rom: e.rom }, 120);
  },
  describe: e => `sways feelings about ${e.about}`,
});

defineEffect('learn_secret', {
  doc: '{"type":"learn_secret","from":"target"}                             the doer learns the target\'s secret (spying, a heart-to-heart)',
  validate: () => ({ type: 'learn_secret' }),
  apply(e, { npc, target }) {
    if (!target?.secret || (npc.knownSecrets || []).includes(target.name)) return;
    npc.knownSecrets = [...(npc.knownSecrets || []), target.name];
    remember(npc, `You found out ${target.name}'s secret: "${target.secret}"`, `${target.name}'s secret: ${target.secret}`, 9);
    chronicle(`🗝️ ${npc.name} learned ${target.name}'s secret.`, npc, 'crime');
  },
  describe: () => 'learns their secret',
});

defineEffect('summon', {
  doc: '{"type":"summon","who":"target","place":"Village Hall"}             ask someone to come to a place (they decide whether to go)',
  validate(e, { issues }) {
    const p = sim.findPlace(e.place);
    if (p) return { type: 'summon', place: p.name };
    issues.push(`unknown place "${e.place}"`);
    return null;
  },
  apply(e, { npc, target }) {
    if (target) makeRequest(npc, target, 'meet', { place: e.place }, { remote: sim.dist(npc, target) > 55 });
  },
  describe: e => `summons them to ${e.place}`,
});

defineEffect('role', {
  doc: '{"type":"role","who":"self","role":"midwife"}                       take up a new trade or title',
  validate(e, { who }) {
    const role = word(e.role);
    return role ? { type: 'role', who: who === 'everyone_near' ? 'self' : who, role } : null;
  },
  apply(e, { whoList }) {
    for (const p of whoList(e.who)) {
      p.role = e.role;
      remember(p, `You are now a ${e.role}.`, `${p.name} became a ${e.role}`, 6);
      p.lifeMemories.push(`I became a ${e.role} on day ${sim.day()}.`);
      chronicle(`🎓 ${p.name} is now a ${e.role}.`, p, 'life');
    }
  },
  describe: e => `becomes a ${e.role}`,
});

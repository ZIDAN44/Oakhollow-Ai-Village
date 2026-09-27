// Crime and justice: witnesses, fights, theft and punishment.
import { startAction } from './registry.js';
import { on } from '../core/events.js';
import { broadcast, chronicle, remember, say, witness, worldEventAll } from '../core/memory.js';
import { practice, skill } from '../core/skills.js';
import { sim } from '../core/state.js';
import { pick, theName } from '../core/util.js';
import { P, fill } from '../identity/identity.js';
import { injure } from '../life/health.js';
import { addMod, opinion } from '../social/relationships.js';
import { speak } from '../social/speak.js';
import { addProblem } from '../village/problems-core.js';

on('lawBroken', (npc, what) => breakLaw(npc, what));

export function breakLaw(npc, what, victim) {
  if (what.includes('forbidden ruins') && npc.name === sim.leader) return false; // the one who made the law guards it
  if (npc.crimes.some(c => c.what === what && sim.time - c.at < 1440)) return false; // already seen doing it today
  const seen = witness(npc, `You saw ${npc.name} ${what}!`, `${npc.name} was caught ${what}`, { radius: 200, importance: 6 });
  if (!seen.length) return false;
  npc.crimes.push({ what, at: sim.time });
  for (const o of seen) addMod(o, npc.name, `saw ${P(npc).them} ${what}`, { trust: -12, aff: -5 }, 168);
  const v = victim && sim.findNpc(victim);
  if (v && seen.includes(v)) addMod(v, npc.name, `was ${what}`, { aff: -15, trust: -20 }, 240);
  chronicle(`👀 ${seen.map(s => s.name).join(', ')} saw ${npc.name} ${what}.`, npc, 'crime');
  return true;
}

export function fight(a, b) {
  if (!b) return;
  const power = n => skill(n, 'fighting') + n.health / 2 + Math.random() * 45 + (n.age > 65 ? -25 : 0) + (n.age < 16 ? -30 : 0);
  const pa = power(a), pb = power(b);
  const [winner, loser] = pa >= pb ? [a, b] : [b, a];
  a.action = { type: 'fight', target: b.name, until: sim.time + 8 };
  b.action = { type: 'fight', target: a.name, until: sim.time + 8 };
  b.thinking = false;
  say(a, pick(['*swings a fist!*', '*lunges!*', '*shoves hard*']), 3000, 'fight');
  say(b, pick(['*fights back!*', '*ducks and punches!*', `*grabs ${P(a).them}*`]), 3000, 'fight');
  practice(a, 'fighting', 3); practice(b, 'fighting', 3);

  const gist = `${a.name} attacked ${b.name}; ${winner.name} won the fight`;
  remember(a, `You attacked ${b.name}. ${winner === a ? 'You won.' : 'You lost.'}`, gist, 8);
  remember(b, `${a.name} attacked you! ${winner === b ? `You beat ${P(a).them}.` : `${fill('{They}', a)} beat you.`}`, gist, 9);
  addMod(b, a.name, 'attacked me', { aff: -35, trust: -30 }, 240);
  addMod(a, b.name, 'we fought', { aff: -10 }, 120);
  if (loser === a) addMod(a, b.name, 'humiliated me in a fight', { aff: -10 }, 168);
  const seen = witness(a, `You saw ${a.name} attack ${b.name}! ${winner.name} won.`, gist, { radius: 220, importance: 7, except: [b] });
  for (const o of seen) {
    if (opinion(o, b.name) > opinion(o, a.name)) addMod(o, a.name, 'started a brawl', { aff: -8, trust: -8 }, 168);
    else addMod(o, b.name, 'got into a brawl', { aff: -3 }, 96);
  }
  a.crimes.push({ what: `attacking ${b.name}`, at: sim.time });
  chronicle(`🥊 ${a.name} attacked ${b.name}! ${winner.name} won the fight.`, a, 'crime');
  if (sim.laws.includes('no_fighting')) { const fine = Math.min(5, a.inv.coins); a.inv.coins -= fine; sim.treasury += fine; remember(a, `You were fined ${fine} coins for fighting.`, null, 5); }

  injure(winner, 3 + Math.random() * 10, `bruised in a fight with ${loser.name}`);
  const wasAlive = sim.npcs.includes(loser);
  injure(loser, 15 + Math.random() * 25, `beaten by ${winner.name} in a fight`);
  if (wasAlive && !sim.npcs.includes(loser)) {
    winner.crimes.push({ what: `killing ${loser.name}`, at: sim.time });
    broadcast(`${winner.name} killed ${loser.name} in a fight!`, `${winner.name} killed ${loser.name}`, 10, [winner]);
    for (const o of sim.npcs) if (o !== winner) addMod(o, winner.name, `killed ${loser.name}`, { aff: -40, trust: -50 }, 0);
    winner.lifeMemories.push(`I killed ${loser.name} on day ${sim.day()}. I can never take it back.`);
    chronicle(`☠️ ${winner.name} killed ${loser.name}!`, winner, 'crime');
  }
}

export function pickpocket(thief, victim) {
  if (!victim) return;
  const amount = Math.min(victim.inv.coins, 3 + Math.floor(Math.random() * 6));
  const noticed = Math.random() < 0.35 + (victim.action?.type === 'sleep' ? -0.25 : 0);
  thief.action = { type: 'wait', until: sim.time + 5 };
  if (noticed || amount <= 0) {
    remember(victim, `You caught ${thief.name} trying to pick your pocket!`, `${thief.name} tried to rob ${victim.name}`, 9);
    remember(thief, `${victim.name} caught you trying to steal from ${P(victim).them}!`, null, 8);
    addMod(victim, thief.name, 'tried to rob me', { aff: -35, trust: -50 }, 240);
    speak(victim, thief, { intent: 'threaten', text: pick([`Thief! Get your hands off me, ${thief.name}!`, `${thief.name}! You rat!`]) });
    witness(victim, `You saw ${thief.name} try to rob ${victim.name}!`, `${thief.name} is a thief`, { radius: 200, importance: 7, except: [thief] }).forEach(o => addMod(o, thief.name, 'is a thief', { trust: -30 }, 240));
    thief.crimes.push({ what: `trying to rob ${victim.name}`, at: sim.time });
    chronicle(`🚨 ${victim.name} caught ${thief.name} trying to steal!`, thief, 'crime');
    return;
  }
  victim.inv.coins -= amount; thief.inv.coins += amount;
  remember(thief, `You slipped ${amount} coins from ${victim.name}'s purse. Nobody noticed.`, null, 7);
  remember(victim, `Your purse feels lighter. ${amount} coins are missing!`, `${victim.name} had coins stolen`, 7);
  thief.crimes.push({ what: `stealing from ${victim.name}`, at: sim.time, secret: true });
  chronicle(`🤫 ${thief.name} secretly stole ${amount} coins from ${victim.name}.`, thief, 'crime');
  const existing = sim.problem('robbery');
  if (!existing) addProblem('robbery', { culprit: thief.name });
}

export function robBusiness(thief, here) {
  const biz = here?.biz;
  if (!biz || !biz.till) return;
  const amount = biz.till;
  biz.till = 0;
  thief.inv.coins += amount;
  thief.action = { type: 'wait', until: sim.time + 5 };
  if (!breakLaw(thief, `robbing ${theName(here.name)}`, biz.owner)) {
    const owner = sim.findNpc(biz.owner);
    if (owner) remember(owner, `Someone emptied the till at ${theName(here.name)}! ${amount} coins gone.`, `${theName(here.name)} was robbed`, 8);
    if (!sim.problem('robbery')) addProblem('robbery', { culprit: thief.name });
    chronicle(`🤫 ${thief.name} secretly robbed ${theName(here.name)} of ${amount} coins.`, thief, 'crime');
  }
  thief.crimes.push({ what: `robbing ${theName(here.name)}`, at: sim.time, secret: true });
  remember(thief, `You emptied the till at ${theName(here.name)}: ${amount} coins.`, null, 8);
}

export function punish(leader, target, kind) {
  if (!target) return;
  if (kind === 'fine') {
    const fine = Math.min(10, target.inv.coins);
    target.inv.coins -= fine; sim.treasury += fine;
    speak(leader, target, { intent: 'argue', text: leader._line || `${target.name}, for your crimes you are fined ${fine} coins.` });
    addMod(target, leader.name, 'fined me', { aff: -15 }, 168);
    worldEventAll(`${leader.name} fined ${target.name} ${fine} coins for ${P(target).their} crimes.`, 6, '⚖️');
    target.crimes = [];
  } else {
    speak(leader, target, { intent: 'threaten', text: leader._line || `${target.name}, you are banished from Oakhollow. Leave and never return.` });
    worldEventAll(`${leader.name} has banished ${target.name} from Oakhollow!`, 9, '⚖️');
    target.lifeMemories.push(`I was banished from Oakhollow by ${leader.name}.`);
    startAction(target, { type: 'leave' });
  }
  practice(leader, 'leadership', 3);
  if (!leader.action) leader.action = { type: 'talk', target: target.name, until: sim.time + 6 };
}

// The Village panel.
import { sim } from '../../core/state.js';
import { DECREES } from '../../data/civic.js';
import { marketPrice } from '../../economy/market.js';
import { describeEffects } from '../../effects/index.js';
import { opinion } from '../../social/relationships.js';
import { $, esc } from '../dom.js';

// ------------------------------------------------------------------ Village

export function renderVillage() {
  const el = $('villageInfo');
  if (!el || !$('panel-village').classList.contains('active')) return;
  el.innerHTML = VILLAGE_SECTIONS.map(section => section()).filter(Boolean).map(html => `<section class="card">${html}</section>`).join('\n');
}

const dueIn = (at, per, round = 1) => Math.round((at - sim.time) / per * round) / round;

function statsHtml() {
  return `
    <div class="grid-stats">
      <div><b>${sim.npcs.length}</b><span>alive</span></div>
      <div><b>${sim.dead.length}</b><span>dead</span></div>
      <div><b>${sim.weather.kind}</b><span>weather</span></div>
      <div><b>${sim.treasury}</b><span>treasury</span></div>
    </div>
    <p class="small muted">${sim.dateStr()} · a life-year passes every ${Math.round(sim.bioYearDays() * 10) / 10} game days · market purse ${sim.market.coins || 0}c</p>`;
}

function gatheringsHtml() {
  if (!sim.gatherings.length) return '';
  return `<h4>Gatherings</h4>${sim.gatherings.map(g => `<p class="small">📅 <b>${esc(g.title)}</b> at ${esc(g.place)} ${sim.time >= g.start ? `(now, ${g.attendees.length} there)` : `in ${dueIn(g.start, 60)}h`}</p>`).join('')}`;
}

function expectingHtml() {
  const exp = sim.npcs.filter(n => n.pregnancy);
  if (!exp.length) return '';
  return `<h4>Expecting</h4>${exp.map(n => `<p class="small">🤰 ${esc(n.name)} & ${esc(n.pregnancy.other)} ${n.pregnancy.labour ? '<b>(in labour!)</b>' : `(due in ${dueIn(n.pregnancy.due, 1440, 10)} days)`}</p>`).join('')}`;
}

function damageHtml() {
  const hurt = sim.places.filter(p => (p.condition ?? 100) < 70);
  return hurt.length ? `<p class="small">🏚️ Damaged: ${hurt.map(p => `${esc(p.name)} (${Math.round(p.condition)}%)`).join(', ')}</p>` : '';
}

function leadershipHtml() {
  const e = sim.election;
  const tally = e ? Object.values(e.votes).reduce((m, v) => ({ ...m, [v]: (m[v] || 0) + 1 }), {}) : null;
  const laws = [...sim.laws.map(l => DECREES[l]), ...(sim.customLaws || [])];
  return `
    <h4>Leadership</h4>
    <p>${sim.leader ? `👑 <b>${esc(sim.leader)}</b> leads Oakhollow.` : 'No leader.'}</p>
    ${e ? `<p class="note">🗳️ Election in progress: ${e.candidates.map(c => `${esc(c)} (${tally[c] || 0})`).join(', ')}. ${Object.keys(e.votes).length} voted.</p>` : ''}
    ${laws.length ? `<ul class="small">${laws.map(l => `<li>📜 ${esc(l)}</li>`).join('')}</ul>` : '<p class="muted small">No laws decreed.</p>'}`;
}

function problemsHtml() {
  const probs = sim.problems.filter(p => !p.solved);
  const solved = sim.problems.filter(p => p.solved);
  const who = p => Object.keys(p.contributors).length ? 'Working on it: ' + esc(Object.keys(p.contributors).join(', ')) : 'Nobody is working on it yet.';
  return `
    <h4>Problems</h4>
    ${probs.map(p => `<div class="prob"><div>${esc(p.title)}</div><div class="track"><div class="fill" style="width:${p.progress}%"></div></div>
      <div class="muted small">${who(p)}</div></div>`).join('') || '<p class="muted small">None right now.</p>'}
    ${solved.length ? `<p class="small muted">Solved: ${esc(solved.map(p => p.title).join(', '))}</p>` : ''}`;
}

function economyHtml() {
  const stock = p => Object.entries(p.biz.stock).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || 'no stock';
  return `
    <h4>Economy</h4>
    <table class="small"><tr><th>Market</th><th>Price</th><th>Stock</th></tr>
      ${['food', 'wood', 'bread', 'herbs', 'tool', 'remedy'].map(i => `<tr><td>${i}</td><td>${marketPrice(i)}c</td><td>${sim.market[i] || 0}</td></tr>`).join('')}</table>
    ${sim.places.filter(p => p.biz).map(p => `<div class="biz"><b>${esc(p.name)}</b> <span class="muted">(${esc(p.biz.owner || 'abandoned')})</span>
      <div class="small">Till ${p.biz.till}c · ${stock(p)}${p.biz.employees.length ? ` · staff: ${esc(p.biz.employees.join(', '))}` : ''}</div></div>`).join('')}`;
}

function ideasHtml() {
  const ideas = sim.inventions.slice().sort((a, b) => b.created - a.created).slice(0, 15);
  return `
    <h4>Ideas the village has come up with</h4>
    ${ideas.length ? `<ul class="small ideas">${ideas.map(i => `<li><b>${esc(i.label)}</b> <span class="muted">by ${esc(i.by)} · used ${i.uses}× · ${esc(describeEffects(i.effects))}</span></li>`).join('')}</ul>` : '<p class="muted small">No new ideas yet. Villagers dream up something new about once a day.</p>'}`;
}

const PROMISE_MARKS = { kept: '✅', broken: '💔' };

function promisesHtml() {
  const open = sim.promises.filter(p => p.status === 'open');
  const done = sim.promises.filter(p => p.status !== 'open').slice(-6).reverse();
  return `
    <h4>Promises</h4>
    ${open.map(p => `<p class="small">${p.kind === 'harm' ? '⚠️' : '🤝'} <b>${esc(p.from)}</b> → ${esc(p.to)}: ${esc(p.what)} <span class="muted">(due in ${Math.max(0, dueIn(p.due, 60))}h)</span></p>`).join('') || '<p class="muted small">No open promises.</p>'}${done.map(p => `<p class="small muted">${PROMISE_MARKS[p.status] || '·'} ${esc(p.from)} → ${esc(p.to)}: ${esc(p.what)} (${p.status})</p>`).join('')}`;
}

function loveAndWarHtml() {
  const couples = []; const seen = new Set();
  for (const n of sim.npcs) if (n.partner && !seen.has(n.partner)) { seen.add(n.name); couples.push(`${n.name} ${n.spouse ? '💍' : '❤️'} ${n.partner}`); }
  const feuds = [];
  for (const a of sim.npcs) for (const b of sim.npcs) if (a.name < b.name && opinion(a, b.name) < -35 && opinion(b, a.name) < -35) feuds.push(`${a.name} ⚔️ ${b.name}`);
  return `
    <h4>Love and war</h4>
    <p class="small">${couples.length ? esc(couples.join(' · ')) : 'No couples yet.'}</p>
    <p class="small">${feuds.length ? esc(feuds.join(' · ')) : 'No feuds.'}</p>`;
}

function graveyardHtml() {
  return `
    <h4>Graveyard</h4>
    <ul class="small">${sim.dead.map(d => `<li>🕯️ ${esc(d.name)}, ${d.age}, died on day ${d.deathDay} of ${esc(d.cause)}</li>`).join('') || '<li class="muted">Nobody has died yet.</li>'}</ul>
    ${sim.departed.length ? `<p class="small muted">Left the village: ${esc(sim.departed.map(d => d.name).join(', '))}</p>` : ''}`;
}

const VILLAGE_SECTIONS = [statsHtml, gatheringsHtml, expectingHtml, damageHtml, leadershipHtml, problemsHtml, economyHtml, ideasHtml, promisesHtml, loveAndWarHtml, graveyardHtml];

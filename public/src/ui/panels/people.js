// The People panel: roster and the inspector.
import { chronicle } from '../../core/memory.js';
import { skillWord } from '../../core/skills.js';
import { sim } from '../../core/state.js';
import { VOICE_BELIEFS } from '../../data/lore.js';
import { describeEffects } from '../../effects/index.js';
import { P, fill, genderWord, orientationWord } from '../../identity/identity.js';
import { opinion, relLabel, reputation, topReasons } from '../../social/relationships.js';
import { whisper } from '../../social/voice.js';
import { $, esc, ui } from '../dom.js';
import { select } from '../tabs.js';
import { on } from '../../core/events.js';

// ------------------------------------------------------------------ People

export function renderRoster() {
  $('roster').innerHTML = sim.npcs.map((n, i) => `
    <button class="chip ${sim.selected === n ? 'sel' : ''}" data-i="${i}">
      <span class="dot" style="background:${n.color}"></span>${esc(n.name)}${n.name === sim.leader ? ' 👑' : ''}${n.age < 16 ? ' <small>(' + n.age + ')</small>' : ''}
    </button>`).join('');
  $('roster').querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => select(sim.npcs[Number(b.dataset.i)])));
}

export const bar = (label, v, warn) => `<div class="bar"><span>${label}</span><div class="track"><div class="fill ${warn ? 'warn' : ''}" style="width:${Math.max(0, Math.min(100, v))}%"></div></div><em>${Math.round(v)}</em></div>`;

export function renderInspector(force) {
  const n = sim.selected;
  const el = $('inspector');
  if (!n || !sim.npcs.includes(n)) {
    ui.inspected = null;
    el.innerHTML = '<p class="muted">Click someone on the map (or above) to see inside their head.</p>';
    return;
  }
  if (!force && ui.inspected === n && $('live')) { $('live').innerHTML = liveHtml(n); return; }
  ui.inspected = n;
  const family = [n.spouse && `💍 married to ${n.spouse}`, !n.spouse && n.partner && `❤️ with ${n.partner}`, n.widowed && `widowed (${n.widowed})`,
    n.children.length && `children: ${n.children.join(', ')}`, n.parents.length && `parents: ${n.parents.join(', ')}`].filter(Boolean).join(' · ');
  const owned = sim.places.filter(p => p.biz?.owner === n.name).map(p => p.name);
  el.innerHTML = `
    <div class="who"><span class="dot big" style="background:${n.color}"></span>
      <div><h3>${esc(n.name)} ${n.name === sim.leader ? '<span class="tag gold">Leader</span>' : ''}${n.traveller ? '<span class="tag">Traveller</span>' : ''}</h3>
      <div class="muted">${n.age} · ${esc(genderWord(n))} · ${esc(P(n).label)} · ${esc(n.role)}${n.job ? ` · works at ${esc(n.job.place)}` : ''}${owned.length ? ` · owns ${esc(owned.join(', '))}` : ''}</div>
      ${family ? `<div class="small">${esc(family)}</div>` : ''}</div></div>
    <p class="small">${esc(n.personality)}${n.age >= 16 ? ` <span class="muted">Romantically ${esc(orientationWord(n))}.</span>` : ''}</p>
    <p class="small"><b>Purpose:</b> ${esc(n.goal)}${n.goal !== n.coreGoal ? ` <span class="muted">(originally: ${esc(n.coreGoal)})</span>` : ''}</p>
    ${n.secret ? `<details class="small"><summary>Secret</summary>${esc(n.secret)}</details>` : ''}
    <div class="whisper">
      <input id="whisperText" placeholder="Whisper into ${esc(n.name)}'s mind…" maxlength="200">
      <button id="whisperBtn">Whisper</button>
    </div>
    <div id="live">${liveHtml(n)}</div>`;
  const send = () => {
    const t = $('whisperText').value.trim();
    if (!t) return;
    whisper(n, t);
    chronicle(`👁️ You whispered to ${n.name}: "${t}"`, null, 'god');
    $('whisperText').value = '';
  };
  $('whisperBtn').onclick = send;
  $('whisperText').onkeydown = e => { if (e.key === 'Enter') send(); };
}

export function liveHtml(n) {
  const mind = n.mind;
  const mindHtml = mind ? `
    <div class="label">Last decision <span class="muted">(${mind.source === 'jev' ? 'Jev' : 'offline'} weighed ${mind.options} options${mind.confidence != null ? `, confidence ${Math.round(mind.confidence * 100)}%` : ''})</span></div>
    <div class="mind">
      ${mind.top.map(([k, p]) => `<div class="opt ${k === mind.chosen ? 'chosen' : ''}"><div class="pbar" style="width:${Math.max(2, p * 100)}%"></div><span>${esc(k)}</span><em>${Math.round(p * 100)}%</em></div>`).join('')}
      ${mind.top.every(([k]) => k !== mind.chosen) ? `<div class="opt chosen"><span>${esc(mind.chosen)}</span><em>sampled</em></div>` : ''}
    </div>` : '';

  const rels = Object.keys(n.rel || {}).filter(k => n.rel[k].met && (sim.findNpc(k) || n.spouse === k))
    .map(k => ({ k, aff: opinion(n, k), trust: opinion(n, k, 'trust'), rom: opinion(n, k, 'rom') }))
    .sort((a, b) => Math.abs(b.aff) + b.rom - Math.abs(a.aff) - a.rom).slice(0, 8);
  const relHtml = rels.map(r => {
    const reasons = topReasons(n, r.k).map(x => `${x.v > 0 ? '+' : ''}${Math.round(x.v)} ${x.why}`).join('; ');
    return `<div class="rel" title="${esc(reasons)}">
      <span class="rname">${esc(r.k)}</span><span class="rlabel">${esc(relLabel(n, r.k))}</span>
      <span class="meter ${r.aff < 0 ? 'neg' : ''}" style="--v:${Math.abs(r.aff)}%"></span>
      ${r.rom > 15 ? `<span class="romance">❤ ${Math.round(r.rom)}</span>` : ''}
      ${reasons ? `<div class="why">${esc(reasons)}</div>` : ''}
    </div>`;
  }).join('');

  const skills = Object.entries(n.skills).filter(([, v]) => v >= 3).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const chips = [n.pregnancy && (n.pregnancy.labour ? '🤰 in labour!' : `🤰 expecting (${Math.round((n.pregnancy.due - sim.time) / 1440 * 10) / 10}d)`), ...(n.statuses || []).map(s => `✨ ${s.name}`), n.guardian && `cared for by ${n.guardian}`, n.sick && '🤒 sick', n.grief && `🖤 grieving ${n.grief.name}`, n.belief && `🌀 believes: ${fill(VOICE_BELIEFS[n.belief.kind].desc, n).replace(/^It/, 'it')}`,
    n.awareness >= 30 && `👁️ awareness ${Math.round(n.awareness)}`, Object.entries(n.debts || {}).filter(([, v]) => v > 0).map(([k, v]) => `owes ${k} ${v}c`).join(', '),
    n.crimes.length && `⚖️ ${n.crimes.slice(-1)[0].what}`].filter(Boolean);
  return `
    <div class="status">${n.thinking ? '💭 thinking… ' : ''}<b>${esc(sim.describeActivity(n))}</b> at ${esc(sim.placeName(n))} · mood: ${esc(n.mood)} · reputation: ${Math.round(reputation(n))}</div>
    ${chips.length ? `<div class="chips">${chips.map(c => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
    ${bar('Health', n.health, n.health < 40)}
    ${bar('Hunger', n.needs.hunger, n.needs.hunger > 65)}
    ${bar('Thirst', n.needs.thirst, n.needs.thirst > 65)}
    ${bar('Energy', n.needs.energy, n.needs.energy < 25)}
    <div class="inv">${Object.entries(n.inv).filter(([, v]) => v > 0).map(([k, v]) => `<span>${k === 'relic' ? '🔹 blue stone' : k} <b>${v}</b></span>`).join('') || '<span class="muted">empty-handed</span>'}</div>
    ${mindHtml}
    ${(() => { const ps = sim.promises.filter(p => p.status === 'open' && (p.from === n.name || p.to === n.name));
      return ps.length ? `<div class="label">Promises</div><ul class="mem">${ps.map(p => `<li>${p.from === n.name ? `${p.kind === 'harm' ? 'Threatened' : 'Promised'} ${esc(p.to)}` : `${esc(p.from)} ${p.kind === 'harm' ? 'threatened them' : 'promised them'}`}: ${esc(p.what)}</li>`).join('')}</ul>` : ''; })()}
    ${(() => { const ideas = sim.inventions.filter(i => i.by === n.name);
      return ideas.length ? `<div class="label">Their ideas</div><ul class="mem">${ideas.slice(-5).map(i => `<li>💡 ${esc(i.label)} <span class="muted">(${esc(describeEffects(i.effects))})</span></li>`).join('')}</ul>` : ''; })()}
    ${(n.requests || []).length ? `<div class="label">Waiting on their answer</div><ul class="mem">${n.requests.map(r => `<li>${esc(r.from)} asked: ${esc(r.kind)}</li>`).join('')}</ul>` : ''}
    ${relHtml ? `<div class="label">Relationships <span class="muted">(hover for reasons)</span></div>${relHtml}` : ''}
    ${skills.length ? `<div class="label">Skills</div>${skills.map(([k, v]) => bar(k, v, false).replace('<em>', `<em title="${skillWord(v)}">`)).join('')}` : ''}
    ${n.lifeMemories.length ? `<div class="label">Life story</div><ul class="mem story">${n.lifeMemories.slice(-8).reverse().map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
    <div class="label">Recent memories</div>
    <ul class="mem">${n.memory.slice(-12).reverse().map(m => `<li class="imp${Math.min(3, Math.ceil(m.imp / 3.4))}">${esc(m.text)}</li>`).join('')}</ul>`;
}

on('ui:select', () => { renderRoster(); renderInspector(true); });
on('ui:refresh', () => { renderRoster(); renderInspector(true); });

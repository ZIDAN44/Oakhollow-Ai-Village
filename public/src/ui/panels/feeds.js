// The chronicle, the Voices feed and the top bar.
import { sim } from '../../core/state.js';
import { $, esc, ui } from '../dom.js';
import { select, showTab } from '../tabs.js';
import { on } from '../../core/events.js';

// ------------------------------------------------------------------ Chronicle and voices

export function renderLog() {
  if (!sim.logDirty) return;
  sim.logDirty = false;
  const f = ui.logFilter;
  $('log').innerHTML = sim.log.filter(e => f === 'all' || e.kind === f || (f === 'event' && e.kind === 'god')).slice(-200).reverse().map(e =>
    `<li class="${e.kind}"><time>${e.time}</time>${e.color ? `<span class="dot" style="background:${e.color}"></span>` : ''}<span>${esc(e.text)}</span></li>`).join('');
}

export function renderVoices() {
  const unread = sim.voiceMessages.filter(m => m.unread).length;
  $('voiceBadge').textContent = unread ? unread : '';
  if (!$('panel-voices').classList.contains('active')) return;
  if (ui.voicesSeen === sim.voiceMessages.length && $('voices').children.length) return;
  ui.voicesSeen = sim.voiceMessages.length;
  $('voices').innerHTML = sim.voiceMessages.slice().reverse().map((m, i) => `
    <li><div><span class="avatar" style="--c:${m.color}">${esc(m.from[0])}</span><b>${esc(m.from)}</b> <time>${m.time}</time></div>
    <div class="vtext">"${esc(m.text)}"</div><button class="link" data-reply="${esc(m.from)}">Answer ${esc(m.from)}</button></li>`).join('')
    || '<li class="muted">Nobody has spoken to you yet. Whisper to someone and see what happens...</li>';
  $('voices').querySelectorAll('[data-reply]').forEach(b => b.addEventListener('click', () => {
    const n = sim.findNpc(b.dataset.reply);
    if (!n) return;
    showTab('people'); select(n);
    setTimeout(() => $('whisperText')?.focus(), 50);
  }));
}

export function renderTop() {
  const icon = { Spring: '🌱', Summer: '☀️', Autumn: '🍂', Winter: '❄️' }[sim.season()];
  $('clock').textContent = `${icon} ${sim.dateStr()} · Day ${sim.day()} · ${sim.clock()}`;
  const s = sim.stats;
  $('stats').textContent = sim.ai
    ? `${s.calls} Jev calls · $${s.cost.toFixed(s.cost < 0.01 ? 5 : 3)}${sim.speech ? ` · ${s.speechCalls || 0} lines ($${(s.speechCost || 0).toFixed(4)})${s.speechModel ? ` via ${s.speechModel.replace(/^.*\//, '')}` : ''}` : ''}${s.errors ? ` · ${s.errors} errors` : ''}`
    : 'offline brain (no API key)';
}

on('ui:tab', name => { if (name === 'voices') renderVoices(); });

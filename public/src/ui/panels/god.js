// The God tools panel.
import { sim } from '../../core/state.js';
import { SKILLS } from '../../data/skills.js';
import { $, esc, ui } from '../dom.js';
import { showTab, updateSpeedButtons } from '../tabs.js';
import { startElection } from '../../village/politics.js';
import { addProblem } from '../../village/problems-core.js';
import { storyteller } from '../../village/storyteller.js';
import { changeWeather } from '../../world/weather.js';
import { on } from '../../core/events.js';
import { renderCustomActs, wirePossibilityForm, wireSpawnForm } from './god-forms.js';

// ------------------------------------------------------------------ God tools

export function initUI(hooks) {
  wireControls();
  wireWorldEvents(hooks.onWorldEvent);
  wireSpawnForm();
  wirePossibilityForm();
  wireProblemForm();
  wireSettings();
  wireWorldButtons(hooks);
  fillSkillList();
}

function wireControls() {
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
    ui.logFilter = b.dataset.filter; sim.logDirty = true;
    document.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('on', x === b));
  }));
  document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.speed;
    if (v === 'pause') sim.paused = !sim.paused;
    else { sim.speed = Number(v); sim.paused = false; }
    updateSpeedButtons();
  }));
}

function wireWorldEvents(onWorldEvent) {
  $('eventBtn').onclick = () => { const t = $('eventText').value.trim(); if (t) { onWorldEvent(t); $('eventText').value = ''; } };
  document.querySelectorAll('[data-event]').forEach(b => b.addEventListener('click', () => { $('eventText').value = b.dataset.event; }));
  document.querySelectorAll('[data-weather]').forEach(b => b.addEventListener('click', () => changeWeather(b.dataset.weather)));
  $('storyBtn').onclick = () => storyteller(true);
  $('electionBtn').onclick = () => { if (!sim.election) startElection('The gods demand a vote.'); };
}

function wireProblemForm() {
  $('probBtn').onclick = () => {
    const title = $('probTitle').value.trim();
    if (!title) return;
    addProblem('custom', {
      title, desc: $('probDesc').value.trim() || title, place: $('probPlace').value || null,
      skill: $('probSkill').value, label: `Work on: ${title}`,
    });
    $('probTitle').value = ''; $('probDesc').value = '';
  };
}

function wireSettings() {
  for (const k of Object.keys(sim.settings)) {
    const cb = $(`set-${k}`);
    if (cb && cb.type === 'checkbox') { cb.checked = sim.settings[k]; cb.onchange = () => { sim.settings[k] = cb.checked; }; }
  }
  const ls = $('set-lifeSpeed');
  if (ls) { ls.value = String(sim.settings.lifeSpeed); ls.onchange = () => { sim.settings.lifeSpeed = Number(ls.value); }; }
}

function wireWorldButtons({ onSave, onLoad, onReset, onWorldEvent }) {
  $('loreBtn').onclick = () => {
    sim.lore = $('lore').value.trim() || sim.lore;
    for (const n of sim.npcs) { n.awareness = Math.min(100, (n.awareness || 0) + 6); }
    onWorldEvent('For a moment everything feels strange, like waking from a dream. The world seems subtly different.', true);
  };
  $('saveBtn').onclick = onSave;
  $('loadBtn').onclick = onLoad;
  $('resetBtn').onclick = () => { if (confirm('Start a brand-new world? Unsaved progress is lost.')) onReset(); };
}

function fillSkillList() {
  $('probSkill').innerHTML = SKILLS.map(s => `<option>${s}</option>`).join('');
}

export function renderPlaceOptions() {
  const types = ['house', 'tavern', 'farm', 'forest', 'river', 'square', 'market', 'ruins', 'hall', 'graveyard'];
  $('actWhere').innerHTML = '<option value="">anywhere</option>' + types.map(t => `<option value="${t}">any ${t}</option>`).join('')
    + sim.places.map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');
  $('probPlace').innerHTML = '<option value="">anywhere</option>' + sim.places.map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');
}

on('ui:refresh', () => { renderCustomActs(); renderPlaceOptions(); });

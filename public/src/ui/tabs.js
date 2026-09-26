// Tabs, selection and refreshing the side panel. Panels listen for these events (see ui/panels/*),
// so this module never imports them.
import { sim } from '../core/state.js';
import { $ } from './dom.js';
import { emit } from '../core/events.js';

export function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
  if (name === 'voices') sim.voiceMessages.forEach(m => { m.unread = false; });
  emit('ui:tab', name);
}

export function select(npc) {
  sim.selected = npc;
  emit('ui:select', npc);
}

export function updateSpeedButtons() {
  document.querySelectorAll('[data-speed]').forEach(b => {
    const v = b.dataset.speed;
    b.classList.toggle('on', v === 'pause' ? sim.paused : !sim.paused && Number(v) === sim.speed);
    if (v === 'pause') b.textContent = sim.paused ? '▶' : '⏸';
  });
}

export function refreshAll() {
  $('lore').value = sim.lore;
  emit('ui:refresh');
  sim.logDirty = true;
}

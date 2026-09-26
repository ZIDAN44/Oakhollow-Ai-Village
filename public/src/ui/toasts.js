// Toasts: important chronicle entries pop up over the map for a few seconds. Reads sim.log; changes nothing.
import { sim } from '../core/state.js';
import { $, esc } from './dom.js';
import { showTab } from './tabs.js';

const SHOWN_KINDS = { event: 'News', god: 'You', life: 'Life', crime: 'Crime', invent: 'Idea', voice: 'The Voice' };
const LIFETIME = 6500;
const MAX_VISIBLE = 4;

let lastSeen = null;

// New entries are the ones after the last one we saw. If it's gone (a new world, or the log rolled over),
// start fresh without replaying old news.
function newEntries() {
  const i = lastSeen ? sim.log.lastIndexOf(lastSeen) : -1;
  const fresh = lastSeen && i >= 0 ? sim.log.slice(i + 1) : [];
  lastSeen = sim.log[sim.log.length - 1] || null;
  return fresh;
}

function dismiss(el) {
  if (el.classList.contains('leaving')) return;
  el.classList.add('leaving');
  setTimeout(() => el.remove(), 280);
}

function show(entry) {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = `toast ${entry.kind}`;
  el.innerHTML = `<span class="kind">${SHOWN_KINDS[entry.kind]}</span><span>${esc(entry.text)}</span>`;
  el.addEventListener('click', () => { showTab('log'); dismiss(el); });
  box.append(el);
  while (box.children.length > MAX_VISIBLE) box.firstElementChild.remove();
  setTimeout(() => dismiss(el), LIFETIME);
}

export function renderToasts() {
  newEntries().filter(e => SHOWN_KINDS[e.kind]).slice(-MAX_VISIBLE).forEach(show);
}

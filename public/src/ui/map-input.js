// Mouse, wheel and keyboard input for the map: pick, hover, drag to pan, scroll to zoom, shortcuts.
import { sim } from '../core/state.js';
import { camera, canvas, followNpc, npcAt, panBy, resetCamera, view, zoomAt } from './canvas.js';
import { $ } from './dom.js';
import { select, showTab } from './tabs.js';

const DRAG_THRESHOLD = 4; // px of movement before a press counts as a drag, not a click
const ZOOM_STEP = 1.4;

const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

function pick(n) {
  select(n);
  if (n) showTab('people');
  else camera.follow = null;
  syncHud();
}

function wirePointer() {
  let press = null;
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    press = { x: e.clientX, y: e.clientY, dragging: false };
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (press) {
      const dx = e.clientX - press.x, dy = e.clientY - press.y;
      if (!press.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      press.dragging = true; canvas.classList.add('dragging');
      panBy(dx, dy); press.x = e.clientX; press.y = e.clientY;
      syncHud();
      return;
    }
    view.hover = npcAt(...local(e));
    canvas.classList.toggle('over-npc', Boolean(view.hover));
  });
  canvas.addEventListener('pointerup', e => {
    if (press && !press.dragging) pick(npcAt(...local(e)));
    press = null; canvas.classList.remove('dragging');
  });
  canvas.addEventListener('pointerleave', () => { view.hover = null; });
  canvas.addEventListener('dblclick', e => { const n = npcAt(...local(e)); if (n) { followNpc(n); syncHud(); } });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; // lines -> pixels
    zoomAt(...local(e), Math.exp(-px * 0.0018));
  }, { passive: false });
}

const zoomCentre = factor => zoomAt(view.w / 2, view.h / 2, factor);

function toggleFollow() {
  if (camera.follow) camera.follow = null;
  else if (sim.selected) followNpc(sim.selected);
  syncHud();
}

const SPEED_KEYS = { 1: '1', 2: '2', 3: '4', 4: '8' };

const KEYS = {
  ' ': () => document.querySelector('[data-speed="pause"]')?.click(),
  '+': () => zoomCentre(ZOOM_STEP), '=': () => zoomCentre(ZOOM_STEP),
  '-': () => zoomCentre(1 / ZOOM_STEP), '_': () => zoomCentre(1 / ZOOM_STEP),
  0: resetCamera, f: toggleFollow, F: toggleFollow,
  Escape: () => pick(null),
};

function wireKeys() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const speed = SPEED_KEYS[e.key];
    const act = speed ? () => document.querySelector(`[data-speed="${speed}"]`)?.click() : KEYS[e.key];
    if (!act) return;
    e.preventDefault();
    act();
  });
}

function wireHud() {
  $('zoomIn').onclick = () => zoomCentre(ZOOM_STEP);
  $('zoomOut').onclick = () => zoomCentre(1 / ZOOM_STEP);
  $('zoomFit').onclick = () => { resetCamera(); syncHud(); };
  $('followBtn').onclick = toggleFollow;
}

// The follow button lights up while the camera follows someone.
export function syncHud() {
  $('followBtn').classList.toggle('on', Boolean(camera.follow));
  $('followBtn').disabled = !sim.selected && !camera.follow;
}

export function wireMap() {
  wirePointer();
  wireKeys();
  wireHud();
  syncHud();
}

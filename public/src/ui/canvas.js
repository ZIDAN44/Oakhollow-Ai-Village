// The map canvas: sizing, the camera (zoom, pan, follow), coordinates and hit-testing.
import { sim } from '../core/state.js';
import { WORLD_H, WORLD_W } from '../data/map.js';

export const canvas = document.getElementById('world');

export const ctx = canvas.getContext('2d');

export const FONT = "'Inter', 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif";

// scale = fit * zoom. ox/oy = screen position of the world's top-left corner. hover = the person under the mouse.
// labels = screen boxes of the place labels drawn this frame, so name tags can avoid them.
export const view = { scale: 1, fit: 1, ox: 0, oy: 0, w: 0, h: 0, hover: null, labels: [] };

// The camera looks at world point (cx, cy) with a zoom. It eases toward `target` each frame.
export const camera = { zoom: 1, cx: WORLD_W / 2, cy: WORLD_H / 2, follow: null, target: { zoom: 1, cx: WORLD_W / 2, cy: WORLD_H / 2 } };

export const MIN_ZOOM = 1;

export const MAX_ZOOM = 4;

const MARGIN = 20;

const reduceMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = r.width * dpr;
  canvas.height = r.height * dpr;
  canvas.style.width = r.width + 'px';
  canvas.style.height = r.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.w = r.width; view.h = r.height;
  view.fit = Math.max(0.05, Math.min((r.width - MARGIN * 2) / WORLD_W, (r.height - MARGIN * 2) / WORLD_H));
  clampTarget();
  applyCamera();
}

// Keep the world on screen: centred when it all fits, otherwise no further than its edges.
function clampAxis(c, viewSize, worldSize, scale) {
  const half = viewSize / 2 / scale;
  return half * 2 >= worldSize ? worldSize / 2 : Math.min(Math.max(c, half), worldSize - half);
}

function clampTarget() {
  const t = camera.target;
  t.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, t.zoom));
  const s = view.fit * t.zoom;
  t.cx = clampAxis(t.cx, view.w, WORLD_W, s);
  t.cy = clampAxis(t.cy, view.h, WORLD_H, s);
}

function applyCamera() {
  view.scale = view.fit * camera.zoom;
  view.ox = view.w / 2 - camera.cx * view.scale;
  view.oy = view.h / 2 - camera.cy * view.scale;
}

// Called once per frame: follow someone if asked, then ease toward the target
// (zoom eases in log space, so zooming in and out feel equally fast).
export function updateCamera() {
  const t = camera.target;
  if (camera.follow) {
    if (sim.npcs.includes(camera.follow)) { t.cx = camera.follow.x; t.cy = camera.follow.y; } else camera.follow = null;
  }
  clampTarget();
  const k = reduceMotion() ? 1 : 0.2;
  camera.zoom = Math.exp(Math.log(camera.zoom) + (Math.log(t.zoom) - Math.log(camera.zoom)) * k);
  camera.cx += (t.cx - camera.cx) * k;
  camera.cy += (t.cy - camera.cy) * k;
  applyCamera();
}

// Cursor-anchored zoom: the world point under (mx, my) stays under the cursor after zooming.
export function zoomAt(mx, my, factor) {
  const t = camera.target;
  const s0 = view.fit * t.zoom;
  const ox0 = view.w / 2 - t.cx * s0, oy0 = view.h / 2 - t.cy * s0;
  const wx = (mx - ox0) / s0, wy = (my - oy0) / s0;
  t.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, t.zoom * factor));
  const s1 = view.fit * t.zoom;
  t.cx = (view.w / 2 - (mx - wx * s1)) / s1;
  t.cy = (view.h / 2 - (my - wy * s1)) / s1;
  clampTarget();
}

// Drag the map by a screen distance. Moves instantly, so the ground stays under the pointer.
export function panBy(dx, dy) {
  camera.follow = null;
  const t = camera.target;
  t.cx -= dx / view.scale; t.cy -= dy / view.scale;
  clampTarget();
  camera.cx = t.cx; camera.cy = t.cy;
  applyCamera();
}

export function resetCamera() {
  camera.follow = null;
  Object.assign(camera.target, { zoom: 1, cx: WORLD_W / 2, cy: WORLD_H / 2 });
}

export function followNpc(npc) {
  camera.follow = npc;
  if (npc && camera.target.zoom < 2) camera.target.zoom = 2;
}

export const S = (x, y) => [view.ox + x * view.scale, view.oy + y * view.scale];

export const seeded = i => { const x = Math.sin(i * 9301 + 49297) * 233280; return x - Math.floor(x); };

export function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

export function npcAt(mx, my) {
  let best = null, bestD = Math.max(18, 14 * view.scale);
  for (const n of sim.npcs) {
    const [x, y] = S(n.x, n.y);
    const d = Math.hypot(x - mx, y - my);
    if (d < bestD) { best = n; bestD = d; }
  }
  return best;
}

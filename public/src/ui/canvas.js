// The map canvas: sizing, coordinates and hit-testing.
import { sim } from '../core/state.js';
import { WORLD_H, WORLD_W } from '../data/map.js';

export const canvas = document.getElementById('world');

export const ctx = canvas.getContext('2d');

export const view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0 };

export function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = r.width * dpr;
  canvas.height = r.height * dpr;
  canvas.style.width = r.width + 'px';
  canvas.style.height = r.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.scale = Math.min(r.width / WORLD_W, r.height / WORLD_H);
  view.ox = (r.width - WORLD_W * view.scale) / 2;
  view.oy = (r.height - WORLD_H * view.scale) / 2;
  view.w = r.width; view.h = r.height;
}

export const S = (x, y) => [view.ox + x * view.scale, view.oy + y * view.scale];

export const seeded = i => { const x = Math.sin(i * 9301 + 49297) * 233280; return x - Math.floor(x); };

export function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

export function npcAt(mx, my) {
  let best = null, bestD = 24;
  for (const n of sim.npcs) {
    const [x, y] = S(n.x, n.y);
    const d = Math.hypot(x - mx, y - my);
    if (d < bestD) { best = n; bestD = d; }
  }
  return best;
}

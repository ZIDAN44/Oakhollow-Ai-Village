// Drawing the board the village sits on: its shadow, the grass, the dirt roads and the vignette.
import { sim } from '../../core/state.js';
import { WORLD_H, WORLD_W } from '../../data/map.js';
import { S, ctx, roundRect, seeded, view } from '../canvas.js';

export const BACKDROP = '#131914';
const GRASS = '#7aa15a';
const BOARD_RADIUS = 14;

// Grass tufts at fixed world positions, so they zoom and pan with the map.
const TUFTS = Array.from({ length: 520 }, (_, i) => ({
  x: seeded(i * 2 + 11) * WORLD_W, y: seeded(i * 5 + 3) * WORLD_H,
  r: 4 + seeded(i * 7 + 1) * 9, light: i % 3 === 0,
}));

export function worldRect() {
  const [x, y] = S(0, 0);
  return { x, y, w: WORLD_W * view.scale, h: WORLD_H * view.scale };
}

// The world as a rounded board with a soft shadow; returns after clipping to it (caller restores).
export function drawBoard() {
  ctx.fillStyle = BACKDROP; ctx.fillRect(0, 0, view.w, view.h);
  const { x, y, w, h } = worldRect();
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  ctx.fillStyle = GRASS; roundRect(x, y, w, h, BOARD_RADIUS); ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(x, y, w, h, BOARD_RADIUS); ctx.clip();
  drawGrass();
}

function drawGrass() {
  const { x, y, w, h } = worldRect();
  const sun = ctx.createLinearGradient(x, y, x + w, y + h);
  sun.addColorStop(0, 'rgba(255,240,190,0.10)'); sun.addColorStop(1, 'rgba(20,40,20,0.12)');
  ctx.fillStyle = sun; ctx.fillRect(x, y, w, h);
  const k = view.scale;
  for (const t of TUFTS) {
    const [tx, ty] = S(t.x, t.y);
    ctx.fillStyle = t.light ? 'rgba(170,205,120,0.22)' : 'rgba(60,100,50,0.2)';
    ctx.beginPath(); ctx.ellipse(tx, ty, t.r * k, t.r * 0.55 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// Dirt paths from the square to every place, each with a slight bend so they look walked-in, not ruled.
export function drawRoads() {
  const sq = sim.findPlace('Village Square');
  if (!sq) return;
  const [sx, sy] = S(sq.x + sq.w / 2, sq.y + sq.h / 2);
  const paths = sim.places.filter(p => p !== sq && p.type !== 'river').map((p, i) => {
    const [px, py] = S(p.x + p.w / 2, p.y + p.h / 2);
    const bend = (seeded(i + 17) - 0.5) * 0.25;
    return [px, py, (sx + px) / 2 - (py - sy) * bend, (sy + py) / 2 + (px - sx) * bend];
  });
  ctx.lineCap = 'round';
  for (const [width, color] of [[12, '#9c8660'], [8.5, '#d4bf93']]) {
    ctx.strokeStyle = color; ctx.lineWidth = width * view.scale;
    ctx.beginPath();
    for (const [px, py, qx, qy] of paths) { ctx.moveTo(sx, sy); ctx.quadraticCurveTo(qx, qy, px, py); }
    ctx.stroke();
  }
}

// Darkens the board's edges, which draws the eye to the middle of the village.
export function drawVignette() {
  const { x, y, w, h } = worldRect();
  const cx = x + w / 2, cy = y + h / 2;
  const g = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.hypot(w, h) * 0.6);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,20,10,0.35)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}

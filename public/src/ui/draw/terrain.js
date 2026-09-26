// Drawing open ground: forest, river, fields, the square, the well, the market, the ruins, the graveyard.
import { sim } from '../../core/state.js';
import { S, ctx, roundRect, seeded } from '../canvas.js';

const disc = (x, y, r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

function forest(p, i, { x, y, w, h, k }) {
  ctx.fillStyle = '#2f5c37'; roundRect(x, y, w, h, 18 * k); ctx.fill();
  const density = p.res ? Math.max(0.25, p.res.amount / p.res.max) : 1;
  for (let t = 0; t < 70 * density; t++) {
    const tx = x + seeded(t + i) * w, ty = y + seeded(t * 3 + i) * h, r = (8 + seeded(t * 7) * 10) * k;
    disc(tx, ty, r, t % 3 ? '#3d7a46' : '#28542f');
  }
}

function river(p, i, { x, y, w, h, k }) {
  ctx.fillStyle = sim.weather.kind === 'storm' ? '#35668f' : '#3f84bf'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
  const off = (performance.now() / 60) % 40;
  for (let yy = -40; yy < h; yy += 40) {
    ctx.beginPath(); ctx.moveTo(x + w * 0.25, y + yy + off); ctx.quadraticCurveTo(x + w * 0.5, y + yy + off + 8, x + w * 0.75, y + yy + off); ctx.stroke();
  }
  const by = S(0, 383)[1];
  if (sim.bridgeBroken) {
    ctx.fillStyle = '#6b5238';
    ctx.fillRect(x - 6 * k, by, w * 0.35, 24 * k); ctx.fillRect(x + w * 0.7, by, w * 0.35 + 6 * k, 24 * k);
  } else { ctx.fillStyle = '#8a6a48'; ctx.fillRect(x - 6 * k, by, w + 12 * k, 24 * k); }
}

function farm(p, i, { x, y, w, h, k }) {
  ctx.fillStyle = '#a88a55'; roundRect(x, y, w, h, 6 * k); ctx.fill();
  const lush = p.res ? p.res.amount / p.res.max : 1;
  for (let r = 0; r < 8; r++) {
    ctx.fillStyle = r % 2 ? (lush > 0.3 ? '#8fa84b' : '#9c8a50') : '#b8a257';
    ctx.fillRect(x + 8 * k, y + (10 + r * 19) * k, (w - 16 * k) * (r % 2 ? Math.max(0.1, lush) : 1), 9 * k);
  }
}

function square(p, i, { x, y, w, h, k }) {
  ctx.fillStyle = '#b8b09e'; roundRect(x, y, w, h, 10 * k); ctx.fill();
  disc(x + w / 2, y + h / 2, 16 * k, '#9a9384');
  disc(x + w / 2, y + h / 2, 10 * k, '#6aa6d6');
}

function well(p, i, { x, y, w, h }) {
  disc(x + w / 2, y + h / 2, w / 2, '#8d8d8d');
  disc(x + w / 2, y + h / 2, w / 3.3, '#2c5f8a');
}

function market(p, i, { x, y, w, h, k }) {
  ctx.fillStyle = '#d6c49a'; roundRect(x, y, w, h, 6 * k); ctx.fill();
  for (let s = 0; s < 4; s++) {
    const sx = x + (10 + s * 40) * k;
    for (let st = 0; st < 5; st++) { ctx.fillStyle = st % 2 ? '#fff' : '#c0443a'; ctx.fillRect(sx + st * 6 * k, y + 12 * k, 6 * k, 14 * k); }
    ctx.fillStyle = '#8a6a48'; ctx.fillRect(sx, y + 26 * k, 30 * k, 16 * k);
  }
}

function ruins(p, i, { x, y, w, h, k }) {
  ctx.fillStyle = '#6d6f68'; roundRect(x, y, w, h, 24 * k); ctx.fill();
  for (let t = 0; t < 22; t++) {
    ctx.fillStyle = t % 2 ? '#94958d' : '#7f8079';
    ctx.fillRect(x + seeded(t + 40) * (w - 20 * k), y + seeded(t + 90) * (h - 20 * k), (8 + seeded(t) * 14) * k, (6 + seeded(t + 5) * 10) * k);
  }
  if (sim.sealedDoor !== 'found' && sim.sealedDoor !== 'opened') return;
  ctx.fillStyle = sim.sealedDoor === 'opened' ? '#111' : '#3a3f55';
  ctx.fillRect(x + w / 2 - 12 * k, y + h / 2 - 8 * k, 24 * k, 16 * k);
  ctx.strokeStyle = '#6ec8ff'; ctx.lineWidth = 2; ctx.strokeRect(x + w / 2 - 12 * k, y + h / 2 - 8 * k, 24 * k, 16 * k);
}

function graveyard(p, i, { x, y, w, h, k }) {
  ctx.fillStyle = '#5e7a50'; roundRect(x, y, w, h, 8 * k); ctx.fill();
  ctx.strokeStyle = '#3f3a33'; ctx.lineWidth = 2; roundRect(x, y, w, h, 8 * k); ctx.stroke();
  (p.graves || []).forEach((g, gi) => {
    const gx = x + (14 + (gi % 6) * 22) * k, gy = y + (18 + Math.floor(gi / 6) * 30) * k;
    ctx.fillStyle = gi < 3 ? '#8a8a88' : '#b5b5b0';
    roundRect(gx, gy, 12 * k, 16 * k, 5 * k); ctx.fill();
  });
}

function road(p, i, { x, y, w, h }) { ctx.fillStyle = '#c4ab82'; ctx.fillRect(x, y, w, h); }

export const TERRAIN_DRAWERS = { forest, river, farm, square, well, market, ruins, graveyard, road };

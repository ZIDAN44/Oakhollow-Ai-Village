// Drawing light: dusk and night over the village, glowing windows, and the ruins' blue light.
import { sim } from '../../core/state.js';
import { S, ctx, view } from '../canvas.js';
import { worldRect } from './ground.js';
import { nightAlpha } from './weather.js';

const LIT = ['house', 'tavern', 'built', 'hall'];

// A warm tint in the hours around sunrise and sunset, strongest at 18:30.
function duskAlpha() {
  const h = (sim.time % 1440) / 60;
  const d = Math.min(Math.abs(h - 18.5), Math.abs(h - 6));
  return d < 1.5 ? (1 - d / 1.5) * 0.18 : 0;
}

function glow(x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// Two windows per lit building: a pool of warm light on the ground, then the window itself.
function drawWindows(na) {
  const k = view.scale;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of sim.places) {
    if (!LIT.includes(p.type) && !p.biz) continue;
    for (const fx of [0.25, 0.72]) {
      const [wx, wy] = S(p.x + p.w * fx, p.y + p.h * 0.6);
      glow(wx, wy, 26 * k, '255,170,70', na * 0.55);
    }
  }
  ctx.restore();
  ctx.fillStyle = `rgba(255,214,130,${Math.min(1, na * 1.6)})`;
  for (const p of sim.places) {
    if (!LIT.includes(p.type) && !p.biz) continue;
    for (const fx of [0.25, 0.72]) {
      const [wx, wy] = S(p.x + p.w * fx, p.y + p.h * 0.6);
      ctx.fillRect(wx - 3.5 * k, wy - 3.5 * k, 7 * k, 7 * k);
    }
  }
}

export function drawLight() {
  const { x, y, w, h } = worldRect();
  const dusk = duskAlpha();
  if (dusk > 0) { ctx.fillStyle = `rgba(255,120,60,${dusk})`; ctx.fillRect(x, y, w, h); }
  const na = nightAlpha();
  if (na > 0) {
    ctx.fillStyle = `rgba(10,16,46,${na * 1.1})`; ctx.fillRect(x, y, w, h);
    drawWindows(na);
  }
  const ruins = sim.findPlace('Old Ruins');
  if (ruins?.glowUntil > sim.time) {
    const [cx, cy] = S(ruins.x + ruins.w / 2, ruins.y + ruins.h / 2);
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
    glow(cx, cy, 95 * view.scale, '90,170,255', 0.55 + pulse * 0.3);
  }
}

// Drawing one frame of the world.
import { sim } from '../core/state.js';
import { WORLD_H, WORLD_W } from '../data/map.js';
import { S, ctx, view } from './canvas.js';
import { drawBubbles, drawNpc } from './draw/people.js';
import { drawLabel, drawPlace } from './draw/places.js';
import { drawWeather, nightAlpha } from './draw/weather.js';

export function render() {
  ctx.fillStyle = '#1b1f1a'; ctx.fillRect(0, 0, view.w, view.h);
  const [x0, y0] = S(0, 0);
  ctx.fillStyle = '#6f9a55'; ctx.fillRect(x0, y0, WORLD_W * view.scale, WORLD_H * view.scale);

  const sq = sim.findPlace('Village Square');
  if (sq) {
    ctx.strokeStyle = '#b39a6f'; ctx.lineWidth = 9 * view.scale; ctx.lineCap = 'round';
    for (const p of sim.places) {
      if (p === sq || p.type === 'river') continue;
      ctx.beginPath(); ctx.moveTo(...S(sq.x + sq.w / 2, sq.y + sq.h / 2)); ctx.lineTo(...S(p.x + p.w / 2, p.y + p.h / 2)); ctx.stroke();
    }
  }
  sim.places.forEach(drawPlace);

  const na = nightAlpha();
  if (na > 0) {
    ctx.fillStyle = `rgba(12,18,48,${na})`;
    ctx.fillRect(x0, y0, WORLD_W * view.scale, WORLD_H * view.scale);
    ctx.fillStyle = `rgba(255,205,110,${na * 1.4})`;
    for (const p of sim.places) {
      if (!['house', 'tavern', 'built', 'hall'].includes(p.type) && !p.biz) continue;
      const [wx, wy] = S(p.x + p.w * 0.2, p.y + p.h * 0.55);
      ctx.fillRect(wx, wy, 7 * view.scale, 7 * view.scale);
      const [wx2] = S(p.x + p.w * 0.7, 0);
      ctx.fillRect(wx2, wy, 7 * view.scale, 7 * view.scale);
    }
  }
  const ruins = sim.findPlace('Old Ruins');
  if (ruins?.glowUntil > sim.time) {
    const [cx, cy] = S(ruins.x + ruins.w / 2, ruins.y + ruins.h / 2);
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90 * view.scale);
    g.addColorStop(0, `rgba(90,170,255,${0.55 + pulse * 0.3})`); g.addColorStop(1, 'rgba(90,170,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 90 * view.scale, 0, Math.PI * 2); ctx.fill();
  }
  drawWeather();

  sim.places.forEach(drawLabel);
  [...sim.npcs].sort((a, b) => a.y - b.y).forEach(drawNpc);
  drawBubbles();
}

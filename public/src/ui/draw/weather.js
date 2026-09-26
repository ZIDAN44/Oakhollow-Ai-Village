// Drawing night, weather and seasons.
import { sim } from '../../core/state.js';
import { WORLD_H, WORLD_W } from '../../data/map.js';
import { S, ctx, seeded, view } from '../canvas.js';

export function nightAlpha() {
  const m = (sim.time % 1440) / 60;
  if (m >= 7 && m <= 18) return 0;
  if (m > 18 && m < 21.5) return (m - 18) / 3.5 * 0.55;
  if (m >= 21.5 || m < 5) return 0.55;
  return (7 - m) / 2 * 0.55;
}

// Weather particles
export const drops = Array.from({ length: 160 }, (_, i) => ({ x: seeded(i) * 1200, y: seeded(i + 500) * 800, s: 0.6 + seeded(i + 900) }));

export function drawWeather() {
  const kind = sim.weather.kind;
  const [x0, y0] = S(0, 0);
  const W = WORLD_W * view.scale, H = WORLD_H * view.scale;
  if (kind === 'cloudy') { ctx.fillStyle = 'rgba(60,70,80,0.18)'; ctx.fillRect(x0, y0, W, H); }
  if (kind === 'fog') { ctx.fillStyle = 'rgba(220,225,230,0.35)'; ctx.fillRect(x0, y0, W, H); }
  if (sim.season() === 'Winter') { ctx.fillStyle = 'rgba(235,242,255,0.22)'; ctx.fillRect(x0, y0, W, H); }
  if (kind === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const t = performance.now() / 1000;
    for (const d of drops) {
      const yy = (d.y + t * 60 * d.s) % 800, xx = (d.x + Math.sin(t + d.s * 9) * 20) % 1200;
      const [sx, sy] = S(xx, yy);
      ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (kind === 'rain' || kind === 'storm') {
    ctx.fillStyle = kind === 'storm' ? 'rgba(20,25,40,0.3)' : 'rgba(40,50,70,0.18)';
    ctx.fillRect(x0, y0, W, H);
    ctx.strokeStyle = 'rgba(200,220,255,0.45)'; ctx.lineWidth = 1;
    const t = performance.now() / 1000;
    ctx.beginPath();
    for (const d of drops) {
      const yy = (d.y + t * 400 * d.s) % 800, xx = (d.x + t * 60) % 1200;
      const [sx, sy] = S(xx, yy);
      ctx.moveTo(sx, sy); ctx.lineTo(sx - 2, sy + 9);
    }
    ctx.stroke();
    if (kind === 'storm' && Math.random() < 0.004) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x0, y0, W, H); }
  }
}

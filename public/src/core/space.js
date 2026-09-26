// Finding free ground to build on.
import { sim } from './state.js';
import { clamp } from './util.js';

// Find open ground near (x, y) for a new building: not in the river, not on top of another building.
export function findFreeSpot(x, y, w, h) {
  const solid = p => !['forest', 'road'].includes(p.type);
  const ok = (rx, ry) => rx >= 5 && ry >= 5 && rx + w <= 1195 && ry + h <= 795
    && !(rx + w > 880 && rx < 970)
    && !sim.places.some(p => solid(p) && rx < p.x + p.w + 6 && rx + w + 6 > p.x && ry < p.y + p.h + 6 && ry + h + 6 > p.y);
  for (let r = 0; r <= 320; r += 12) {
    const steps = r === 0 ? 1 : 16;
    for (let i = 0; i < steps; i++) {
      const ang = (i / steps) * Math.PI * 2;
      const rx = x - w / 2 + Math.cos(ang) * r, ry = y - h / 2 + Math.sin(ang) * r;
      if (ok(rx, ry)) return { x: rx, y: ry };
    }
  }
  return { x: clamp(x - w / 2, 5, 1195 - w), y: clamp(y - h / 2, 5, 795 - h) };
}

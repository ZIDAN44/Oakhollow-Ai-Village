// Keeping people from standing on top of each other.
import { sim } from '../core/state.js';
import { blockedAt } from './nav.js';

// People standing in the same spot gently step apart so everyone stays visible.
export function separate(dt) {
  const MIN = 22;
  for (let i = 0; i < sim.npcs.length; i++) {
    const a = sim.npcs[i];
    for (let j = i + 1; j < sim.npcs.length; j++) {
      const b = sim.npcs[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= MIN) continue;
      const ux = d > 0.01 ? dx / d : Math.cos(i + j), uy = d > 0.01 ? dy / d : Math.sin(i + j);
      const push = Math.min(MIN - d, 6 * dt) / 2;
      const aMoving = a.action?.type === 'move', bMoving = b.action?.type === 'move';
      if (!aMoving && !blockedAt(a.x - ux * push * 3, a.y - uy * push * 3)) { a.x -= ux * push; a.y -= uy * push; }
      if (!bMoving && !blockedAt(b.x + ux * push * 3, b.y + uy * push * 3)) { b.x += ux * push; b.y += uy * push; }
    }
  }
}

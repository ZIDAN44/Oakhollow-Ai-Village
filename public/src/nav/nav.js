// Navigation: A* on a grid, smoothed with line-of-sight string pulling.
import { sim } from '../core/state.js';

export const CELL = 16, COLS = Math.ceil(1200 / CELL), ROWS = Math.ceil(800 / CELL);

export const FREE = 0, SOLID = 1, RIVER = 2, WADE = 3;

export const SOLID_TYPES = new Set(['house', 'tavern', 'hall', 'built', 'custombiz', 'bakery', 'smithy', 'apothecary', 'school', 'shop', 'clinic']);

export const RIVER_L = 890, RIVER_R = 960, BRIDGE_TOP = 383, BRIDGE_BOT = 407;

export let grid = null, owner = null, gridKey = '';

export const cache = new Map();

export function mapKey() {
  return `${sim.places.length}|${sim.bridgeBroken}|${sim.places.reduce((s, p) => s + (p.x | 0) + (p.y | 0), 0)}`;
}

export function build() {
  grid = new Uint8Array(COLS * ROWS);
  owner = new Int16Array(COLS * ROWS).fill(-1);
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      const x = cx * CELL + CELL / 2, y = cy * CELL + CELL / 2;
      if (x > RIVER_L && x < RIVER_R) grid[cy * COLS + cx] = y > BRIDGE_TOP && y < BRIDGE_BOT && !sim.bridgeBroken ? FREE : sim.bridgeBroken ? WADE : RIVER;
    }
  }
  sim.places.forEach((p, i) => {
    if (!SOLID_TYPES.has(p.type) && !p.biz) return;
    for (let cy = Math.floor((p.y + 2) / CELL); cy <= Math.floor((p.y + p.h - 2) / CELL); cy++) {
      for (let cx = Math.floor((p.x + 2) / CELL); cx <= Math.floor((p.x + p.w - 2) / CELL); cx++) {
        if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
        grid[cy * COLS + cx] = SOLID; owner[cy * COLS + cx] = i;
      }
    }
  });
  cache.clear();
}

export function ensure() {
  const k = mapKey();
  if (k !== gridKey || !grid) { gridKey = k; build(); }
}

export const cellOf = (x, y) => Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL))) * COLS + Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL)));

export const centre = c => [(c % COLS) * CELL + CELL / 2, Math.floor(c / COLS) * CELL + CELL / 2];

// Is a point inside a building or the river? (Used to keep people from being shoved into walls.)
export function blockedAt(x, y) {
  ensure();
  const v = grid[cellOf(x, y)];
  return v === SOLID || v === RIVER;
}

// ---- A* with a binary heap, 8 directions, no cutting corners
export function astar(start, goal, allowed) {
  const passable = c => grid[c] === FREE || grid[c] === WADE || (grid[c] === SOLID && allowed.has(owner[c])) || c === start || c === goal;
  const cost = c => (grid[c] === WADE ? 5 : 1);
  const g = new Float32Array(COLS * ROWS).fill(Infinity);
  const from = new Int32Array(COLS * ROWS).fill(-1);
  const closed = new Uint8Array(COLS * ROWS);
  const [gx, gy] = [goal % COLS, Math.floor(goal / COLS)];
  const h = c => { const dx = Math.abs(c % COLS - gx), dy = Math.abs(Math.floor(c / COLS) - gy); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
  const heap = [[h(start), start]];
  g[start] = 0;
  const push = item => { heap.push(item); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  let steps = 0;
  while (heap.length && steps++ < 20000) {
    const [, c] = pop();
    if (c === goal) break;
    if (closed[c]) continue;
    closed[c] = 1;
    const cx = c % COLS, cy = Math.floor(c / COLS);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const n = ny * COLS + nx;
        if (closed[n] || !passable(n)) continue;
        if (dx && dy && (!passable(cy * COLS + nx) || !passable(ny * COLS + cx))) continue; // don't cut corners
        const ng = g[c] + (dx && dy ? Math.SQRT2 : 1) * cost(n);
        if (ng < g[n]) { g[n] = ng; from[n] = c; push([ng + h(n), n]); }
      }
    }
  }
  if (from[goal] === -1 && goal !== start) return null;
  const cells = [];
  for (let c = goal; c !== -1; c = from[c]) cells.push(c);
  return cells.reverse();
}

// Can you walk straight from a to b? (Samples the line every few pixels.)
export function lineClear(ax, ay, bx, by, allowed) {
  const d = Math.hypot(bx - ax, by - ay);
  const n = Math.ceil(d / 5);
  for (let i = 1; i < n; i++) {
    const c = cellOf(ax + (bx - ax) * i / n, ay + (by - ay) * i / n);
    const v = grid[c];
    if (v === RIVER || (v === SOLID && !allowed.has(owner[c])) || v === WADE) return false;
  }
  return true;
}

// String pulling: keep only the corners you can't see past.
export function smooth(points, allowed) {
  const out = [points[0]];
  let i = 0;
  while (i < points.length - 1) {
    let j = points.length - 1;
    while (j > i + 1 && !lineClear(points[i][0], points[i][1], points[j][0], points[j][1], allowed)) j--;
    out.push(points[j]);
    i = j;
  }
  return out;
}

// A walkable path from (sx, sy) to (tx, ty) as a list of [x, y] waypoints (without the start).
export function findPath(sx, sy, tx, ty) {
  ensure();
  const allowed = new Set();
  const startPlace = sim.placeAt(sx, sy), goalPlace = sim.placeAt(tx, ty);
  if (startPlace) allowed.add(sim.places.indexOf(startPlace));
  if (goalPlace) allowed.add(sim.places.indexOf(goalPlace));
  if (lineClear(sx, sy, tx, ty, allowed)) return [[tx, ty]];
  const s = cellOf(sx, sy), gcell = cellOf(tx, ty);
  const key = `${s}>${gcell}|${[...allowed].join(',')}|${gridKey}`;
  let cells = cache.get(key);
  if (cells === undefined) {
    cells = astar(s, gcell, allowed);
    cache.set(key, cells);
    if (cache.size > 600) cache.delete(cache.keys().next().value);
  }
  if (!cells) return [[tx, ty]]; // unreachable: walk straight (better than freezing)
  const pts = [[sx, sy], ...cells.slice(1, -1).map(centre), [tx, ty]];
  return smooth(pts, allowed).slice(1);
}

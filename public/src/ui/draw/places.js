// Drawing places and buildings.
import { sim } from '../../core/state.js';
import { S, ctx, roundRect, view } from '../canvas.js';
import { TERRAIN_DRAWERS } from './terrain.js';

export const BIZ_ICON = { clinic: '⚕️', custom: '🏪', tavern: '🍺', bakery: '🍞', smithy: '⚒️', apothecary: '⚗️', school: '📚', shop: '🛒' };

export const BIZ_COLORS = { clinic: ['#e8e2d6', '#9a3b3b'], bakery: ['#d9a86c', '#8a5a2b'], smithy: ['#7d7d85', '#3d3d45'], apothecary: ['#8fbf8a', '#3f6b45'], school: ['#c9b27c', '#6a4a2a'], shop: ['#c7a07a', '#5b3b6b'] };

// r = the place's rectangle on screen: { x, y, w, h, k } (k = zoom).
export function building({ x, y, w, h, k }, wall, roof) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; roundRect(x + 4 * k, y + 5 * k, w, h, 4 * k); ctx.fill();
  ctx.fillStyle = wall; roundRect(x, y, w, h, 4 * k); ctx.fill();
  ctx.fillStyle = roof; roundRect(x, y, w, h * 0.42, 4 * k); ctx.fill();
}

// Buildings get walls and a roof; open ground is drawn by ./terrain.js.
const BUILDINGS = {
  hall: (p, i, r) => { const { x, y, w, h, k } = r; building(r, '#b59b7a', '#56607a'); icon('🏛️', x + w / 2, y + h * 0.82, 13 * k + 4, '#eee'); },
  tavern: (p, i, r) => building(r, '#a36a40', '#6b3525'),
  house: (p, i, r) => { const { x, y, w, h, k } = r; building(r, '#caa57c', '#8c4c3b'); ctx.fillStyle = '#5b3a24'; ctx.fillRect(x + w / 2 - 6 * k, y + h - 16 * k, 12 * k, 16 * k); },
  built: (p, i, r) => { const { x, y, w, h, k } = r; building(r, '#b98b55', '#7a5a34'); icon(p.shrine ? '✦' : '★', x + w / 2, y + h * 0.82, 14 * k + 4, p.shrine ? '#9fd6ff' : '#ffe28a'); },
};

function otherBuilding(p, i, r) {
  const [wall, roof] = BIZ_COLORS[p.type] || ['#b98b55', '#7a5a34'];
  building(r, wall, roof);
}

function icon(text, x, y, size, color) {
  ctx.fillStyle = color; ctx.font = `${size}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(text, x, y);
}

const OPEN_GROUND = ['forest', 'river', 'farm', 'road', 'square', 'ruins', 'graveyard', 'well', 'market'];

// Cracks and soot on damaged buildings.
function drawDamage(p, { x, y, w, h, k }) {
  if ((p.condition ?? 100) >= 70 || OPEN_GROUND.includes(p.type)) return;
  ctx.fillStyle = `rgba(30,20,10,${(70 - p.condition) / 110})`; roundRect(x, y, w, h, 4 * k); ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,0,0.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.3); ctx.lineTo(x + w * 0.45, y + h * 0.6); ctx.lineTo(x + w * 0.35, y + h * 0.9); ctx.stroke();
}

export function drawPlace(p, i) {
  const [x, y] = S(p.x, p.y);
  const box = { x, y, w: p.w * view.scale, h: p.h * view.scale, k: view.scale };
  (TERRAIN_DRAWERS[p.type] || BUILDINGS[p.type] || otherBuilding)(p, i, box);
  drawDamage(p, box);
  if (sim.gatherings.some(g => g.place === p.name && sim.time >= g.start - 60)) {
    ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🚩', box.x + box.w - 8, box.y + 6);
  }
  if (p.biz) {
    ctx.font = `${12 * box.k + 5}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(BIZ_ICON[p.biz.kind] || '🏪', box.x + box.w / 2, box.y + box.h * 0.85);
  }
}

export function drawLabel(p) {
  const [x, y] = S(p.x + p.w / 2, p.y + p.h);
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(p.name).width;
  const ly = p.type === 'river' ? S(0, 350)[1] : y + 13;
  ctx.fillStyle = 'rgba(20,24,20,0.55)';
  roundRect(x - tw / 2 - 5, ly - 11, tw + 10, 15, 7); ctx.fill();
  ctx.fillStyle = '#f4efe2';
  ctx.fillText(p.name, x, ly);
}

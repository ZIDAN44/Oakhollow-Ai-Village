// Drawing people and their speech bubbles.
import { sim } from '../../core/state.js';
import { S, ctx, roundRect, view } from '../canvas.js';

export function wrap(text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

export const BUBBLE = {
  speech: ['rgba(255,255,255,0.96)', '#26221d'],
  action: ['rgba(255,244,214,0.95)', '#26221d'],
  fight: ['rgba(255,210,200,0.97)', '#5a1010'],
  voice: ['rgba(215,200,255,0.97)', '#2a1850'],
};

// Lay out every visible bubble so none overlap: each starts above its speaker and is
// pushed upward past any bubble already placed. A pointer line links it back to the speaker.
export function drawBubbles() {
  const now = performance.now();
  const items = [];
  for (const npc of sim.npcs) {
    const b = npc.bubble;
    if (!b) continue;
    if (now > b.until) { npc.bubble = null; continue; }
    const [x, y] = S(npc.x, npc.y);
    ctx.font = b.style === 'speech' ? '12px system-ui, sans-serif' : 'italic 12px system-ui, sans-serif';
    const lines = wrap(b.text, 180);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16;
    const h = lines.length * 15 + 14;
    items.push({ npc, b, x, y, lines, w, h, bx: Math.min(Math.max(x - w / 2, 4), view.w - w - 4), by: y - 26 - h });
  }
  // Place each bubble at the free spot closest to its speaker: above first, then beside, then below.
  items.sort((a, b) => b.y - a.y);
  const placed = [];
  const overlaps = (x, y, w, h) => placed.some(p => x < p.bx + p.w + 4 && x + w + 4 > p.bx && y < p.by + p.h + 4 && y + h + 4 > p.by);
  for (const it of items) {
    const bx0 = it.bx, by0 = it.by;
    const cands = [];
    for (const dx of [0, -(it.w * 0.6 + 6), it.w * 0.6 + 6, -(it.w + 10), it.w + 10]) {
      for (let dy = 0; dy <= 260; dy += 8) cands.push([bx0 + dx, by0 - dy, Math.abs(dx) + dy * 1.3]);
      cands.push([bx0 + dx, it.y + 22, Math.abs(dx) + 60]); // below the speaker
    }
    cands.sort((a, b) => a[2] - b[2]);
    const spot = cands.find(([x, y]) => x >= 2 && x + it.w <= view.w - 2 && y >= 2 && y + it.h <= view.h - 2 && !overlaps(x, y, it.w, it.h));
    if (spot) { it.bx = spot[0]; it.by = spot[1]; }
    placed.push(it);
  }
  // Pointer lines first, so bubbles sit on top of them.
  for (const it of placed) {
    const below = it.by > it.y;
    const ax = Math.min(Math.max(it.x, it.bx + 10), it.bx + it.w - 10);
    const ay = below ? it.by : it.by + it.h;
    if (Math.hypot(ax - it.x, ay - (it.y - 12)) > 18) {
      ctx.strokeStyle = it.npc.color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(it.x, below ? it.y + 10 : it.y - 12); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  for (const it of placed) {
    const [bg, fg] = BUBBLE[it.b.style] || BUBBLE.speech;
    ctx.strokeStyle = it.npc.color; ctx.lineWidth = 1.5;
    ctx.fillStyle = bg;
    roundRect(it.bx, it.by, it.w, it.h, 8); ctx.fill(); ctx.stroke();
    ctx.font = it.b.style === 'speech' ? '12px system-ui, sans-serif' : 'italic 12px system-ui, sans-serif';
    ctx.fillStyle = fg; ctx.textAlign = 'left';
    it.lines.forEach((l, i) => ctx.fillText(l, it.bx + 8, it.by + 21 + i * 15));
    // Name tag on the bubble so you know who's talking even in a crowd.
    ctx.font = '600 9px system-ui, sans-serif'; ctx.fillStyle = it.npc.color;
    ctx.fillText(it.npc.name, it.bx + 8, it.by + 7.5);
  }
}

export function drawNpc(npc) {
  const [x, y] = S(npc.x, npc.y);
  const base = npc.age < 4 ? 5 : npc.age < 16 ? 7.5 : 10;
  const r = Math.max(npc.age < 16 ? 5 : 7, base * view.scale);
  const sel = sim.selected === npc;
  if (sel) drawRoute(npc, x, y);
  drawBody(npc, x, y, r, sel);
  drawNameTag(npc, x, y, r);
  const icon = statusIcon(npc);
  if (icon) { ctx.font = '13px sans-serif'; ctx.fillText(icon, x + r + 6, y - r); }
  drawPartnerHeart(npc, x, y, r);
}

// A dashed line to where the selected person is walking.
function drawRoute(npc, x, y) {
  if (npc.action?.type !== 'move' && npc.action?.type !== 'leaving') return;
  const tgt = npc.action.person ? sim.findNpc(npc.action.person) : { x: npc.action.dx, y: npc.action.dy };
  if (!tgt) return;
  const [tx, ty] = S(tgt.x, tgt.y);
  ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
}

function ring(x, y, radius, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
}

function drawBody(npc, x, y, r, sel) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  if (sel) ring(x, y, r + 4, '#fff', 3);
  if (npc.name === sim.leader) ring(x, y, r + 2, '#ffd35c', 2);
  ctx.fillStyle = npc.color; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5;
  ctx.globalAlpha = npc.role === 'ancient spirit' ? 0.6 + 0.3 * Math.sin(performance.now() / 400) : 1;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawNameTag(npc, x, y, r) {
  ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(r * 1.1)}px system-ui, sans-serif`; ctx.textAlign = 'center';
  ctx.fillText(npc.name[0], x, y + r * 0.38);
  ctx.font = `600 ${npc.age < 16 ? 10 : 11}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(npc.name, x + 1, y + r + 14);
  ctx.fillStyle = '#fff'; ctx.fillText(npc.name, x, y + r + 13);
}

// The first matching status wins.
const STATUS_ICONS = [
  [n => n.action?.type === 'sleep', '💤'],
  [n => n.action?.type === 'fight', '💢'],
  [n => n.pregnancy?.labour, '🤱'],
  [n => n.thinking, '💭'],
  [n => n.pregnancy, '🤰'],
  [n => n.sick, '🤒'],
  [n => n.health < 40, '🩹'],
  [n => n.grief, '🖤'],
  [n => n.name === sim.leader, '👑'],
];
const statusIcon = npc => STATUS_ICONS.find(([test]) => test(npc))?.[1] || '';

// A little heart between partners standing together.
function drawPartnerHeart(npc, x, y, r) {
  if (!npc.partner) return;
  const p = sim.findNpc(npc.partner);
  if (!p || npc.name >= p.name || sim.dist(npc, p) >= 50) return;
  const [px, py] = S(p.x, p.y);
  ctx.font = '11px sans-serif'; ctx.fillText(npc.spouse ? '💍' : '❤️', (x + px) / 2, (y + py) / 2 - r - 4);
}

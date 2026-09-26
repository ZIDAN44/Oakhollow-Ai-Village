// Drawing speech bubbles, laid out so none overlap.
import { sim } from '../../core/state.js';
import { FONT, S, ctx, roundRect, view } from '../canvas.js';

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

// [background, text colour] per bubble style.
export const BUBBLE = {
  speech: ['rgba(255,253,248,0.97)', '#221f1a'],
  action: ['rgba(255,243,214,0.95)', '#3a3226'],
  fight: ['rgba(255,214,204,0.97)', '#5a1010'],
  voice: ['rgba(222,210,255,0.97)', '#2a1850'],
};

const PAD = 9, LINE = 15, HEAD = 13;
const fontFor = style => `${style === 'speech' ? '' : 'italic '}12px ${FONT}`;

function measure(npc, now) {
  const b = npc.bubble;
  if (!b) return null;
  if (now > b.until) { npc.bubble = null; return null; }
  const [x, y] = S(npc.x, npc.y);
  if (x < -20 || y < -20 || x > view.w + 20 || y > view.h + 20) return null; // speaker is off-screen (zoomed in)
  ctx.font = fontFor(b.style);
  const lines = wrap(b.text, 190);
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + PAD * 2;
  const h = lines.length * LINE + HEAD + PAD;
  return { npc, b, x, y, lines, w, h, bx: Math.min(Math.max(x - w / 2, 4), view.w - w - 4), by: y - 28 - h };
}

// Greedy placement: nearest speakers first, each bubble takes the free spot closest to its
// speaker (above first, then beside, then below). Candidates are scored by distance moved.
function place(items) {
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
  return placed;
}

// A short tail when the bubble sits right by its speaker, a thin leader line when it had to move away.
function drawPointer(it, bg) {
  const below = it.by > it.y;
  const ax = Math.min(Math.max(it.x, it.bx + 14), it.bx + it.w - 14);
  const ay = below ? it.by : it.by + it.h;
  const ty = below ? it.y + 10 : it.y - 12;
  if (Math.hypot(ax - it.x, ay - ty) > 22) {
    ctx.strokeStyle = it.npc.color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(it.x, ty); ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.moveTo(ax - 6, ay); ctx.lineTo(it.x, ty); ctx.lineTo(ax + 6, ay); ctx.closePath(); ctx.fill();
}

function drawBubble(it) {
  const [bg, fg] = BUBBLE[it.b.style] || BUBBLE.speech;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  ctx.fillStyle = bg; roundRect(it.bx, it.by, it.w, it.h, 10); ctx.fill();
  ctx.restore();
  drawPointer(it, bg);
  ctx.fillStyle = it.npc.color; roundRect(it.bx, it.by, 3, it.h, [10, 0, 0, 10]); ctx.fill();
  ctx.textAlign = 'left';
  ctx.font = `700 9.5px ${FONT}`; ctx.fillStyle = it.npc.color;
  ctx.fillText(it.npc.name.toUpperCase(), it.bx + PAD, it.by + 13);
  ctx.font = fontFor(it.b.style); ctx.fillStyle = fg;
  it.lines.forEach((l, i) => ctx.fillText(l, it.bx + PAD, it.by + HEAD + 13 + i * LINE));
}

export function drawBubbles() {
  const now = performance.now();
  const items = sim.npcs.map(n => measure(n, now)).filter(Boolean);
  place(items).forEach(drawBubble);
}

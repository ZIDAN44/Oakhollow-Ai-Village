// Drawing people: bodies, status icons, the route of the selected person, and decluttered name tags.
import { sim } from '../../core/state.js';
import { FONT, S, ctx, roundRect, view } from '../canvas.js';

const radiusOf = npc => {
  const base = npc.age < 4 ? 5 : npc.age < 16 ? 7.5 : 10;
  return Math.max(npc.age < 16 ? 5 : 7, base * view.scale);
};

export function drawNpc(npc) {
  const [x, y] = S(npc.x, npc.y);
  const r = radiusOf(npc);
  const sel = sim.selected === npc;
  if (sel) drawRoute(npc, x, y);
  drawBody(npc, x, y, r, sel);
  const icon = statusIcon(npc);
  if (icon) { ctx.font = `${Math.round(11 + r * 0.3)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(icon, x + r + 5, y - r + 2); }
  drawPartnerHeart(npc, x, y, r);
}

// A dashed line to where the selected person is walking, with a marker at the end.
function drawRoute(npc, x, y) {
  if (npc.action?.type !== 'move' && npc.action?.type !== 'leaving') return;
  const tgt = npc.action.person ? sim.findNpc(npc.action.person) : { x: npc.action.dx, y: npc.action.dy };
  if (!tgt) return;
  const [tx, ty] = S(tgt.x, tgt.y);
  ctx.setLineDash([5, 6]); ctx.lineDashOffset = -performance.now() / 60;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
  ring(tx, ty, 5, 'rgba(255,255,255,0.9)', 2);
}

function ring(x, y, radius, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
}

function drawBody(npc, x, y, r, sel) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.95, r * 0.95, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  if (sel) {
    const pulse = (performance.now() / 1400) % 1;
    ring(x, y, r + 4 + pulse * 10, `rgba(255,255,255,${0.7 * (1 - pulse)})`, 2);
    ring(x, y, r + 4, '#fff', 2.5);
  } else if (view.hover === npc) ring(x, y, r + 3.5, 'rgba(255,255,255,0.7)', 2);
  if (npc.name === sim.leader) ring(x, y, r + 1.5, '#ffd35c', 2);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(0.45, 'rgba(255,255,255,0)');
  ctx.globalAlpha = npc.role === 'ancient spirit' ? 0.6 + 0.3 * Math.sin(performance.now() / 400) : 1;
  ctx.fillStyle = npc.color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(r * 1.05)}px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(npc.name[0], x, y + r * 0.37);
}

// ------------------------------------------------------------------ Name tags

// Greedy label placement: the selected and hovered person first, then top to bottom. Each tag tries
// below, right, left and above its person and takes the first spot that overlaps nothing drawn yet
// (place labels included); failing that, the first spot clear of other name tags.
// A tag with no spot at all is left out; the initial on the body still says who it is.
export function drawNameTags(people) {
  const order = [...people].sort((a, b) => priority(b) - priority(a));
  const placed = [];
  const hits = (a, boxes) => boxes.some(b => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
  for (const npc of order) {
    const [x, y] = S(npc.x, npc.y);
    const r = radiusOf(npc);
    ctx.font = `600 ${npc.age < 16 ? 10 : 11}px ${FONT}`;
    const w = ctx.measureText(npc.name).width + 12, h = 16;
    const spots = [[x - w / 2, y + r + 4], [x + r + 4, y - h / 2], [x - r - 4 - w, y - h / 2], [x - w / 2, y - r - 6 - h]];
    const boxes = spots.map(([bx, by]) => ({ x: bx, y: by, w, h }));
    const box = boxes.find(b => !hits(b, placed) && !hits(b, view.labels)) || boxes.find(b => !hits(b, placed));
    if (!box) continue;
    placed.push(box);
    drawTag(npc, box);
  }
}

const priority = npc => (sim.selected === npc ? 3 : view.hover === npc ? 2 : 0) - npc.y / 10000;

function drawTag(npc, { x, y, w, h }) {
  const strong = sim.selected === npc || view.hover === npc;
  ctx.fillStyle = strong ? 'rgba(255,255,255,0.95)' : 'rgba(18,22,18,0.72)';
  roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = strong ? '#1b1f1a' : '#fff'; ctx.textAlign = 'center';
  ctx.fillText(npc.name, x + w / 2, y + h / 2 + 4);
}

// ------------------------------------------------------------------ Status

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
  ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(npc.spouse ? '💍' : '❤️', (x + px) / 2, (y + py) / 2 - r - 4);
}

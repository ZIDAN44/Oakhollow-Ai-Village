// Asking the text model for a line (and any promise it makes).
import { SYSTEM, convoBlock, listenerBlock, speakerBlock, wantBlock } from './prompt.js';
import { sim } from '../../core/state.js';

export function clean(text, npc) {
  let t = String(text || '').trim().split('\n').find(l => l.trim()) || '';
  t = t.replace(new RegExp(`^\\s*${npc.name}\\s*:\\s*`, 'i'), '').replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  if (!t || t.length > 260 || /^(we need|okay,? so|let me|the user|as an ai)/i.test(t)) return null;
  return t;
}

export async function writeLine(npc, act, target) {
  const place = sim.placeAt(npc.x, npc.y);
  const prompt = [
    speakerBlock(npc),
    listenerBlock(npc, target),
    `PLACE/TIME: ${place?.name || 'open fields'}, ${sim.partOfDay()}, ${sim.weather.kind}.`,
    convoBlock(npc, target),
    npc.recentLines?.length ? `${npc.name}'s recent lines (don't repeat): ${npc.recentLines.slice(-3).map(l => `"${l}"`).join(' ')}` : '',
    `WHAT ${npc.name.toUpperCase()} WANTS: ${wantBlock(npc, act, target)}`,
    `Write ${npc.name}'s line.`,
  ].filter(Boolean).join('\n');

  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ system: SYSTEM, prompt, maxTokens: 170, json: true }),
      signal: AbortSignal.timeout(9000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    sim.stats.speechCalls = (sim.stats.speechCalls || 0) + 1;
    sim.stats.speechCost = (sim.stats.speechCost || 0) + (data.cost || 0);
    sim.stats.speechModel = data.model;
    let line = data.text, promise = null;
    try {
      const raw = String(data.text || '');
      const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
      line = j.line; promise = j.promise && typeof j.promise === 'object' ? j.promise : null;
    } catch { /* plain text reply: use as the line */ }
    const text = clean(line, npc);
    return text ? { text, promise: target ? promise : null } : null;
  } catch (err) {
    sim.stats.speechErrors = (sim.stats.speechErrors || 0) + 1;
    console.warn('[speech]', err.message);
    return null; // caller keeps the built-in phrase
  }
}

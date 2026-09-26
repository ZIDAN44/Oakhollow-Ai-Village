// Imagining new ideas and checking them with Jev (Voyager-style).
import { shortText, toInvention } from './compile.js';
import { addInvention } from './library.js';
import { FORMAT, SYSTEM, askText } from './prompts.js';
import { chronicle } from '../../core/memory.js';
import { skillWord } from '../../core/skills.js';
import { sim } from '../../core/state.js';
import { EFFECT_DOCS, describeEffects } from '../../effects/index.js';

// Jev as critic: is this plausible, fair, and in character?
export async function critique(inv, npc) {
  if (!sim.ai) return { ok: true };
  const res = await fetch('/api/jev', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      state: {
        world: sim.lore,
        inventor: npc ? { name: npc.name, role: npc.role, personality: npc.personality, goal: npc.goal } : 'the player',
        invention: { what: inv.label, looks_like: inv.text, takes_minutes: inv.minutes, where: inv.where || 'anywhere', mechanics: describeEffects(inv.effects) },
      },
      questions: {
        plausible: { type: 'noul', instructions: 'Could a person in a small pre-industrial village really do `invention`, and would it plausibly have these `mechanics`?' },
        fair: { type: 'noul', instructions: 'Are the benefits in `invention.mechanics` reasonable for its costs and time, not overpowered?' },
        fits: { type: 'noul', instructions: 'Is `invention` something `inventor` would come up with?' },
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: true }; // don't block on critic errors
  const a = data.answers || {};
  const p = a.plausible?.noul ?? 1, f = a.fair?.noul ?? 1, fit = a.fits?.noul ?? 1;
  return { ok: p >= 0.5 && f >= 0.4 && (npc ? fit >= 0.3 : true), p, f, fit };
}

// ------------------------------------------------------------------ Inventing

export async function inventFor(npc) {
  if (!sim.speech || npc.inventing) return;
  npc.inventing = true;
  npc.lastInvent = sim.time;
  try {
    const prompt = inventPrompt(npc);
    const out = await askText(SYSTEM, prompt);
    for (const raw of (out.inventions || []).slice(0, 2)) {
      const inv = await compileIdea(raw, npc, prompt);
      if (!inv) continue;
      const verdict = await critique(inv, npc);
      if (!verdict.ok) { chronicle(`💭 ${npc.name} dreamed up "${inv.label}" but thought better of it.`, npc, 'invent'); continue; }
      addInvention(inv, npc);
    }
  } catch (err) {
    console.warn('[invent]', err.message);
  } finally {
    npc.inventing = false;
  }
}

function inventPrompt(npc) {
  const here = sim.placeAt(npc.x, npc.y);
  const existing = [...sim.inventions.map(i => i.label), ...sim.customActivities.map(a => a.label)].slice(-40);
  const listed = (entries, fmt, none) => entries.map(fmt).join(', ') || none;
  return [
    `VILLAGE: ${sim.lore}`,
    `PERSON: ${npc.name}, ${npc.age}, ${npc.role}. ${npc.personality}`,
    `Goal: ${npc.goal}. Dream: ${npc.dream}.`,
    `Is village leader: ${sim.leader === npc.name ? 'yes (may invent a law)' : 'no (do not invent laws)'}`,
    `Skills: ${listed(Object.entries(npc.skills).filter(([, v]) => v >= 10), ([k, v]) => `${k} ${skillWord(v)}`, 'few')}`,
    `Carrying: ${listed(Object.entries(npc.inv).filter(([, v]) => v > 0), ([k, v]) => `${v} ${k}`, 'nothing')}`,
    `Life story: ${npc.lifeMemories.slice(-5).join(' | ') || 'nothing remarkable yet'}`,
    `Recent: ${npc.memory.slice(-6).map(m => m.text).join(' | ')}`,
    `Now at: ${here?.name || 'open fields'}. Places: ${sim.places.map(p => p.name).join(', ')}`,
    `Open problems: ${listed(sim.problems.filter(p => !p.solved), p => p.title, 'none')}`,
    `Already possible (do NOT repeat): ${existing.join('; ') || 'basic work, trade, talk, build houses and businesses'}`,
    '',
    EFFECT_DOCS,
    '',
    `Invent 2 new things ${npc.name} would genuinely want to do in the coming days, pushing toward their goal or reacting to their situation.`,
    FORMAT,
  ].join('\n');
}

// Compile a raw idea; if invalid, tell the imagination what was wrong and let it fix the idea once
// (Voyager-style). If it still can't be expressed, keep it as a story beat without special mechanics.
async function compileIdea(raw, npc, prompt) {
  let issues = [];
  let inv = toInvention(raw, npc.name, npc, issues);
  if (!inv || issues.length) {
    try {
      const fixed = await askText(SYSTEM, `${prompt}\n\nYou proposed:\n${JSON.stringify(raw)}\nProblems: ${issues.join('; ') || 'invalid'}.\nFix it and return it as the only invention.`, 500);
      raw = (fixed.inventions || [])[0] || raw;
      issues = [];
      inv = toInvention(raw, npc.name, npc, issues);
    } catch { /* keep going */ }
  }
  if (!inv && raw?.label) {
    inv = toInvention({ ...raw, effects: [{ type: 'mood', who: 'self', amount: 0.5 }, { type: 'news', text: `${npc.name} ${shortText(raw.text || raw.label, npc)}`, scope: 'near' }], check: null }, npc.name, npc, []);
    if (inv) inv.narrative = true;
  }
  return inv;
}

// Turn a possibility the player typed into real mechanics.
export async function compileCustom(label, text, where) {
  if (!sim.speech) return null;
  try {
    const out = await askText(
      'You turn a described village activity into game mechanics. Reply with JSON only.',
      `VILLAGE: ${sim.lore}\nACTIVITY: "${label}" (looks like: ${text || label}; where: ${where || 'anywhere'})\n\n${EFFECT_DOCS}\n\nDesign fair, grounded mechanics for this activity.\n${FORMAT}\n(Return exactly one invention.)`,
      500,
    );
    const raw = (out.inventions || [])[0];
    if (!raw) return null;
    raw.label = label; raw.text = text || raw.text; raw.where = where || raw.where;
    const inv = toInvention(raw, 'the Voice', null);
    if (!inv) return null;
    inv.shared = true;
    inv.fromPlayer = true;
    addInvention(inv, null);
    return inv;
  } catch (err) {
    console.warn('[compile]', err.message);
    return null;
  }
}

// God tools forms: adding a villager and adding a new possibility.
import { compileCustom } from '../../ai/invent/imagine.js';
import { chronicle } from '../../core/memory.js';
import { sim } from '../../core/state.js';
import { NPC_COLORS } from '../../data/people.js';
import { describeEffects } from '../../effects/index.js';
import { arrive } from '../../life/arrivals.js';
import { $, esc } from '../dom.js';
import { select, showTab } from '../tabs.js';

export function wireSpawnForm() {
  $('spGender').onchange = () => { $('spPronouns').value = { woman: 'she', man: 'he', nonbinary: 'they' }[$('spGender').value]; };
  $('spawnBtn').onclick = () => {
    const name = $('spName').value.trim();
    if (!name || sim.findAnyone(name)) { alert(name ? 'That name is taken.' : 'Give them a name.'); return; }
    const npc = arrive({
      name, age: Number($('spAge').value) || 30, role: $('spRole').value.trim() || 'traveller',
      personality: $('spPersonality').value.trim() || 'Curious and friendly.',
      goal: $('spGoal').value.trim() || 'Find their place in Oakhollow.',
      secret: $('spSecret').value.trim(), dream: $('spDream').value.trim() || 'a better life', skills: {},
      gender: $('spGender').value, pronouns: $('spPronouns').value,
      attractedTo: [...document.querySelectorAll('.spAttr:checked')].map(c => c.value),
      canCarry: $('spBody').value === 'carry', canSire: $('spBody').value === 'sire',
    });
    npc.color = NPC_COLORS[(sim.npcs.length + 3) % NPC_COLORS.length];
    ['spName', 'spAge', 'spRole', 'spPersonality', 'spGoal', 'spSecret', 'spDream'].forEach(id => { $(id).value = ''; });
    showTab('people'); select(npc);
  };
}

export function wirePossibilityForm() {
  $('actBtn').onclick = async () => {
    const label = $('actLabel').value.trim();
    if (!label) return;
    const where = $('actWhere').value;
    const text = $('actText').value.trim() || label.toLowerCase();
    $('actBtn').disabled = true; $('actBtn').textContent = 'Designing its effects…';
    const inv = await compileCustom(label, text, where || null);
    $('actBtn').disabled = false; $('actBtn').textContent = 'Add possibility';
    if (inv) {
      chronicle(`🛠️ The Voice added a new possibility: "${label}" (${describeEffects(inv.effects)})`, null, 'god');
    } else {
      sim.customActivities.push({ label, text, where: where || undefined, minutes: 30 });
      chronicle(`🛠️ New possibility in the world: "${label}"${where ? ` (at ${where})` : ''} (flavour only)`, null, 'god');
    }
    $('actLabel').value = ''; $('actText').value = '';
    renderCustomActs();
  };
}

export function renderCustomActs() {
  const mine = sim.inventions.filter(i => i.fromPlayer);
  $('actList').innerHTML = mine.map(i => `<li>${esc(i.label)} <span class="muted">(${esc(describeEffects(i.effects))})</span> <button data-rmi="${i.id}" class="link">remove</button></li>`).join('')
    + sim.customActivities.map((a, i) => `<li>${esc(a.label)}${a.where ? ` <span class="muted">@ ${esc(a.where)}</span>` : ''} <span class="muted">(flavour)</span> <button data-rm="${i}" class="link">remove</button></li>`).join('');
  $('actList').querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { sim.customActivities.splice(Number(b.dataset.rm), 1); renderCustomActs(); }));
  $('actList').querySelectorAll('[data-rmi]').forEach(b => b.addEventListener('click', () => { sim.inventions = sim.inventions.filter(i => i.id !== Number(b.dataset.rmi)); renderCustomActs(); }));
}

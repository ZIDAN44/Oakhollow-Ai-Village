// Boot: wires the UI, starts the loop and the renderer.
import '../effects/index.js'; // registers every effect type
import '../actions/index.js'; // registers every verb
import { GAME_MIN_PER_SEC, step, worldEvent } from './loop.js';
import { load, reset, save } from './save.js';
import { sim } from '../core/state.js';
import { canvas, resize } from '../ui/canvas.js';
import { syncHud, wireMap } from '../ui/map-input.js';
import { renderLog, renderTop, renderVoices } from '../ui/panels/feeds.js';
import { initUI } from '../ui/panels/god.js';
import { renderInspector, renderRoster } from '../ui/panels/people.js';
import { renderVillage } from '../ui/panels/village.js';
import { render } from '../ui/render.js';
import { renderToasts } from '../ui/toasts.js';
import { refreshAll, updateSpeedButtons } from '../ui/tabs.js';
import { resetWorld } from '../world/setup.js';

// ------------------------------------------------------------------ Boot

export async function boot() {
  try {
    const s = await (await fetch('/api/status')).json();
    sim.ai = s.ai; sim.model = s.model; sim.speech = s.speech;
  } catch { sim.ai = false; }
  const params = new URLSearchParams(location.search);
  if (params.has('offline')) { sim.ai = false; sim.speech = false; } // free testing without the APIs
  if (params.has('nospeech')) sim.speech = false;
  document.getElementById('mode').textContent = (sim.ai ? `🧠 Jev · ${sim.model}` : '🧠 Offline brain') + (sim.speech ? ' · 💬 free-form speech' : '');
  document.getElementById('mode').classList.toggle('off', !sim.ai);
  if (!sim.ai) document.getElementById('offlineNote').hidden = false;

  initUI({ onSave: save, onLoad: load, onReset: reset, onWorldEvent: worldEvent });
  resetWorld();
  refreshAll();
  resize();
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(canvas.parentElement); // e.g. when a scrollbar appears
  updateSpeedButtons();

  wireMap();

  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dtReal = Math.min(0.5, (now - last) / 1000);
    last = now;
    if (sim.paused) return;
    let dt = dtReal * GAME_MIN_PER_SEC * sim.speed;
    while (dt > 0) { const d = Math.min(dt, 1); step(d); dt -= d; }
  }, 100);

  let rosterCount = 0;
  setInterval(() => {
    renderTop(); renderLog(); renderInspector(false); renderVoices(); renderToasts(); syncHud();
    if (sim.npcs.length !== rosterCount) { rosterCount = sim.npcs.length; renderRoster(); }
  }, 400);
  setInterval(renderVillage, 1000);
  const frame = () => { render(); requestAnimationFrame(frame); };
  frame();
}

window.oakhollow = sim; // handy for poking at the world from the dev console

boot();

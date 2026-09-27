// Logs the game's story while recording: every new Chronicle entry, timed on the video's clock (events.json).
// Editors use it to cut around what the villagers actually did, which no script can know in advance.
import { writeFileSync } from 'node:fs';
import { sleep } from './director.mjs';

// Runs in the page: the Chronicle entries added since the last call. The first call only sets the cursor.
function freshEntries() {
  const log = window.oakhollow.log;
  const first = window.__demoLast === undefined;
  const i = first ? -1 : log.lastIndexOf(window.__demoLast);
  const fresh = first ? [] : i < 0 ? log.slice(-20) : log.slice(i + 1);
  window.__demoLast = log.at(-1) ?? null;
  return fresh.map(e => ({ kind: e.kind || 'other', text: e.text }));
}

export function startEventLog(page, cap) {
  const events = [];
  let running = true;
  const loop = (async () => {
    while (running) {
      try {
        const t = +cap.now().toFixed(2);
        for (const e of await page.evaluate(freshEntries)) events.push({ t, ...e });
      } catch { /* the page is busy or closing: try again next tick */ }
      await sleep(400);
    }
  })();
  return {
    async stop(file) {
      running = false;
      await loop;
      writeFileSync(file, JSON.stringify(events, null, 1));
      return events;
    },
  };
}

// Tour scenes 3: the Chronicle, Voices and Village panels, an 8x time-lapse, and the closing card.
import { sleep } from '../director.mjs';

export async function chronicle({ d, M, sideMid }) {
  M('ch:chronicle');
  await d.caption('Chronicle', 'Everything that happens is written down. Filter by talk, events, crime, ideas or promises.');
  await d.click('.tab[data-tab="log"]', 1600);
  await d.click('[data-filter="speech"]', 2600);
  await d.click('[data-filter="event"]', 2600);
  await d.click('[data-filter="invent"]', 2200);
  await d.click('[data-filter="all"]', 1000);
  await d.wheel(sideMid.x, sideMid.y, 700, 16, 45);
  await sleep(2200);
}

// Skipped if nobody has answered a whisper by now: the villagers decide, not the script.
export async function voices({ d, M }) {
  if (!(await d.until(() => window.oakhollow.voiceMessages.length > 0, 25000))) return;
  M('ch:voices');
  await d.caption('Voices', 'Some villagers answer the voice in their head. Their replies to you land here.');
  await d.click('.tab[data-tab="voices"]', 1500);
  await d.hover('#voices li', 5500);
}

export async function village({ d, M, sideMid }) {
  M('ch:village');
  await d.caption('The village', 'Leader, laws, open problems, prices, businesses, couples and feuds.');
  await d.click('.tab[data-tab="village"]', 2200);
  await d.wheel(sideMid.x, sideMid.y, 700, 18, 50);
  await sleep(2200);
  await d.wheel(sideMid.x, sideMid.y, 700, 18, 50);
  await sleep(2200);
}

// Waits for the light to change, then captions what the viewer is actually seeing.
export async function timelapse({ d, M, mid }) {
  M('ch:timelapse');
  await d.caption('Time-lapse', 'At 8× a whole day passes in about 90 seconds. Nobody stops thinking.');
  await d.key('4', 800);
  await d.click('.tab[data-tab="log"]', 400);
  await d.glide(mid.x, mid.y);
  await sleep(4000);
  await d.hideCaption();
  const night = await d.sim(() => window.oakhollow.isNight());
  await d.until(n => window.oakhollow.isNight() !== n, 95000, night);
  await sleep(3500);
  await d.caption('Time-lapse', night ? 'Morning. The village wakes up and gets back to work.' : 'Night falls. Windows light up, and people head home.');
  await sleep(9000);
  M('tl-end');
  await d.hideCaption();
  await d.key('2', 800);
}

export async function outro({ d, M }) {
  M('ch:outro');
  await d.card('Oakhollow', 'What will your villagers do?<br>Run <code>npm start</code> and open <code>localhost:3000</code>', true);
  await sleep(6000);
  M('end');
}

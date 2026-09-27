// Records the demo video: starts the game, plays the scripted tour in headless Chrome, and cuts the videos.
// Run: npm run demo:record [-- --tour story] [-- --offline] [-- --headed]. Needs Chrome and ffmpeg. See docs/how-to.md.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';
import { startCapture } from './capture.mjs';
import { director, sleep } from './director.mjs';
import { edit } from './edit.mjs';
import { startEventLog } from './events.mjs';
import { chronicle, outro, timelapse, village, voices } from './tour/panels.mjs';
import { election, event, possibility, villager, weather } from './tour/god.mjs';
import * as story from './tour/story.mjs';
import { follow, intro, map, mind, whisper } from './tour/world.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// features: a captioned tour of every panel, cut automatically. story: uncaptioned, for a narrated edit by hand.
const TOURS = {
  features: [intro, map, mind, follow, whisper, event, weather, villager, possibility, election, chronicle, voices, village, timelapse, outro],
  story: [story.open, story.whispers, story.fire, story.election, story.stranger, story.night, story.end],
};
// Frames are captured at the page's CSS size, so a 1536x864 page gives 125% text in the 1080p video.
const VIEWPORT = { width: 1536, height: 864 };

const { values: opt } = parseArgs({ options: {
  out: { type: 'string', default: 'recordings' },
  tour: { type: 'string', default: 'features' },
  offline: { type: 'boolean', default: false },
  headed: { type: 'boolean', default: false },
  port: { type: 'string', default: '3100' },
  channel: { type: 'string', default: 'chrome' },
  ffmpeg: { type: 'string', default: 'ffmpeg' },
} });

function checkFfmpeg() {
  try { execFileSync(opt.ffmpeg, ['-version'], { stdio: 'ignore' }); } catch {
    throw new Error(`ffmpeg not found (tried "${opt.ffmpeg}"). Install it (winget install Gyan.FFmpeg, brew install ffmpeg, apt install ffmpeg) or pass --ffmpeg <path>.`);
  }
}

async function startServer() {
  const server = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: opt.port }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { return { server, status: await (await fetch(`http://localhost:${opt.port}/api/status`)).json() }; } catch { await sleep(200); }
  }
  server.kill();
  throw new Error(`The game server did not start on port ${opt.port}.`);
}

async function openGame() {
  const browser = await chromium.launch({ channel: opt.channel, headless: !opt.headed });
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.addInitScript({ path: path.join(ROOT, 'tools/demo/overlay.js') });
  await page.goto(`http://localhost:${opt.port}/${opt.offline ? '?offline' : ''}`);
  await page.waitForFunction(() => document.getElementById('mode')?.textContent.trim());
  const [stage, side] = [await page.locator('.stage').boundingBox(), await page.locator('.sidebar').boundingBox()];
  const geo = { mid: { x: stage.x + stage.width / 2, y: stage.y + stage.height / 2 }, sideMid: { x: side.x + side.width / 2, y: side.y + side.height * 0.6 } };
  return { browser, page, geo };
}

async function playTour(page, geo, out) {
  const d = director(page);
  // Warm up behind the title card, so the first minds have already thought and people are talking.
  await d.card('Oakhollow', 'A village where everyone thinks for themselves.<br>Each decision is made live by AI.', true);
  await d.key('2', 0);
  await d.until(() => window.oakhollow.log.filter(e => e.kind === 'speech').length >= 3, 40000);
  const cap = await startCapture(page, path.join(out, 'master.mp4'), { ffmpeg: opt.ffmpeg, size: VIEWPORT });
  await sleep(600);
  const log = startEventLog(page, cap);
  const ctx = { d, page, M: name => cap.mark(name), state: {}, ...geo };
  for (const scene of TOURS[opt.tour]) await scene(ctx);
  const marks = await cap.stop(path.join(out, 'marks.json'));
  await log.stop(path.join(out, 'events.json'));
  return { marks, stats: await d.sim(() => window.oakhollow.stats) };
}

async function main() {
  if (!TOURS[opt.tour]) throw new Error(`Unknown tour "${opt.tour}". Use one of: ${Object.keys(TOURS).join(', ')}.`);
  checkFfmpeg();
  const out = path.resolve(ROOT, opt.out);
  mkdirSync(out, { recursive: true });
  const { server, status } = await startServer();
  if (!opt.offline && !status.ai) console.warn('No API key in .env: recording the offline brain. Add a key for the live demo.');
  let game;
  try {
    game = await openGame();
    const { marks, stats } = await playTour(game.page, game.geo, out);
    console.log(`Recorded. ${stats.calls} Jev calls, ${stats.errors} errors, $${(stats.cost + (stats.speechCost || 0)).toFixed(3)}.`);
    if (opt.tour !== 'features') return console.log(`Done: ${out}
  master.mp4, marks.json and events.json are ready for editing.`);
    console.log('Editing...');
    const master = path.join(out, 'master.mp4');
    const { fullSeconds, readmeSeconds } = edit({ master, marks, out, ffmpeg: opt.ffmpeg });
    for (const f of ['x264-0.log', 'x264-0.log.mbtree', 'chapters.txt']) rmSync(path.join(out, f), { force: true });
    console.log(`Done: ${out}\n  full tour ${fullSeconds.toFixed(0)} s, README cut ${readmeSeconds.toFixed(0)} s. Master take and marks.json kept for re-editing.`);
  } finally {
    await game?.browser.close();
    server.kill();
  }
}

main().catch(err => { console.error(err.message); process.exitCode = 1; });

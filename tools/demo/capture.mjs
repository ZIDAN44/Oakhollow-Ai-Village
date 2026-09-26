// Records a page to video: Playwright screencast frames, placed on a constant frame rate, piped into ffmpeg.
// Chrome sends a JPEG only when the page repaints, each stamped with its capture time (epoch ms). Each frame
// fills the slots up to its timestamp, so the video keeps real time even when frames arrive late or unevenly.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

export const FPS = 60;

// Lossless-looking intermediate; edit.mjs makes the final encodes.
const encodeArgs = out => ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', out];

export async function startCapture(page, out, { ffmpeg = 'ffmpeg', size } = {}) {
  const enc = spawn(ffmpeg, encodeArgs(out), { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  enc.stderr.on('data', d => { err += d; });
  const exited = new Promise(resolve => enc.on('exit', resolve));
  enc.on('error', e => { err += e.message; });

  const cap = { t0: 0, slots: 0, last: null, marks: [] };
  const writeUntil = slot => {
    for (; cap.slots < slot; cap.slots++) enc.stdin.write(cap.last);
  };
  const onFrame = ({ data, timestamp }) => {
    if (!cap.t0) cap.t0 = timestamp;
    if (cap.last) writeUntil(Math.round((timestamp - cap.t0) / 1000 * FPS));
    cap.last = data;
  };
  await page.screencast.start({ onFrame, size, quality: 95 });

  return {
    // Seconds since the first frame, on the same clock as the frame timestamps.
    now: () => (cap.t0 ? (Date.now() - cap.t0) / 1000 : 0),
    mark(name) {
      const t = +this.now().toFixed(2);
      cap.marks.push({ name, t });
      console.log(`[${t.toFixed(1)}s] ${name}`);
    },
    async stop(marksFile) {
      await page.screencast.stop();
      if (cap.last) writeUntil(Math.round(this.now() * FPS) + 1);
      enc.stdin.end();
      const code = await exited;
      if (code !== 0) throw new Error(`ffmpeg failed (exit ${code}): ${err.trim()}`);
      writeFileSync(marksFile, JSON.stringify(cap.marks, null, 2));
      return cap.marks;
    },
  };
}

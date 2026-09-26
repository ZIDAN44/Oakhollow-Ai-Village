// Cuts a recorded tour into the videos: the full chaptered tour, a short highlight reel, and a README cut.
// Segments are relative to the markers the tour logged, so they stay right when a take runs faster or slower.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const README_MB = 9.3; // GitHub plays videos up to 10 MB inline in a README
const NULL_OUT = process.platform === 'win32' ? 'NUL' : '/dev/null';
const x264 = (crf, preset = 'slow') => ['-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-tune', 'animation', '-movflags', '+faststart'];

const TITLES = { intro: 'Intro', map: 'The map', mind: 'Inside a head', follow: 'Follow a villager', whisper: 'Whisper',
  event: 'Announce an event', weather: 'Weather', villager: 'Add a villager', possibility: 'Add a possibility', election: 'Election',
  chronicle: 'Chronicle', voices: 'Voices', village: 'Village panel', timelapse: 'Time-lapse', outro: 'Run it yourself' };

// Joins [start, end] segments with crossfades. Returns the filter graph and the length of the result.
function joinGraph(segs, fade, finish) {
  const parts = segs.map(([a, b], i) => `[0:v]trim=${a.toFixed(3)}:${b.toFixed(3)},setpts=PTS-STARTPTS[s${i}]`);
  let prev = 's0', len = segs[0][1] - segs[0][0];
  segs.slice(1).forEach(([a, b], i) => {
    parts.push(`[${prev}][s${i + 1}]xfade=transition=fade:duration=${fade}:offset=${(len - fade).toFixed(3)}[x${i}]`);
    len += b - a - fade; prev = `x${i}`;
  });
  parts.push(`[${prev}]${finish}[v]`);
  return { graph: parts.join(';'), len };
}

// Chapter list for the full tour, in its own timeline (the time-lapse tail before the outro is cut).
function chapters(marks, t, fullLen) {
  const cutAt = t('tl-end') - 0.2;
  const list = marks.filter(m => m.name.startsWith('ch:')).map(m => ({ title: TITLES[m.name.slice(3)], start: m.name === 'ch:outro' ? cutAt - 0.6 : Math.max(0, m.t - 0.2) }));
  let meta = ';FFMETADATA1\ntitle=Oakhollow demo\n';
  list.forEach((c, i) => {
    const end = i + 1 < list.length ? list[i + 1].start : fullLen;
    meta += `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(c.start * 1000)}\nEND=${Math.round(end * 1000)}\ntitle=${c.title}\n`;
  });
  const stamp = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return { meta, youtube: list.map(c => `${stamp(c.start)} ${c.title}`).join('\n') + '\n' };
}

function highlightSegments(t) {
  const r = (a, da, b, db) => [t(a) + da, t(b ?? a) + db];
  return [
    r('ch:intro', 0, null, 4), r('ch:intro', 4.8, null, 11.4), r('ch:map', 0.2, null, 10.2), r('ch:mind', 0.8, null, 12.8),
    r('ch:event', 1.6, null, 15.6), r('hl:spawn', -1, null, 11), r('hl:design', -2.5, 'hl:designed', 4),
    r('ch:chronicle', 1.3, null, 10.3), ...(t('ch:voices') ? [r('ch:voices', 0.3, null, 7.5)] : []),
    [t('tl-end') - 16, t('tl-end')], [t('ch:outro') + 0.3, t('end') - 1.2],
  ];
}

export function edit({ master, marks, out, ffmpeg = 'ffmpeg' }) {
  const run = args => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  const file = name => path.join(out, name);
  const t = name => marks.find(m => m.name === name)?.t;
  const up = 'scale=1920:1080:flags=lanczos,format=yuv420p';

  const full = joinGraph([[0.2, t('tl-end') - 0.2], [t('ch:outro') + 0.3, t('end') - 0.2]], 0.6, up);
  const ch = chapters(marks, t, full.len);
  writeFileSync(file('chapters.txt'), ch.meta);
  writeFileSync(file('youtube-chapters.txt'), ch.youtube);
  run(['-i', master, '-i', file('chapters.txt'), '-filter_complex', full.graph, '-map', '[v]', '-map_metadata', '1', '-map_chapters', '1', ...x264(18), file('oakhollow-demo-full-1080p60.mp4')]);

  const segs = highlightSegments(t);
  run(['-i', master, '-filter_complex', joinGraph(segs, 0.45, up).graph, '-map', '[v]', ...x264(18), file('oakhollow-demo-highlights-1080p60.mp4')]);

  // Two-pass at a bitrate that lands just under the README size limit.
  const small = joinGraph(segs, 0.45, 'fps=30,scale=1280:720:flags=lanczos,format=yuv420p');
  const kbps = Math.floor(README_MB * 8192 / small.len);
  const common = ['-i', master, '-filter_complex', small.graph, '-map', '[v]', '-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation',
    '-b:v', `${kbps}k`, '-maxrate', `${kbps * 2}k`, '-bufsize', `${kbps * 4}k`, '-passlogfile', file('x264')];
  run([...common, '-pass', '1', '-f', 'null', NULL_OUT]);
  run([...common, '-pass', '2', '-movflags', '+faststart', file('oakhollow-demo-readme-720p.mp4')]);

  run(['-ss', String(t('ch:event') + 7.6), '-i', master, '-frames:v', '1', '-vf', 'scale=1280:720:flags=lanczos', file('oakhollow-poster.png')]);
  return { fullSeconds: full.len, readmeSeconds: small.len };
}

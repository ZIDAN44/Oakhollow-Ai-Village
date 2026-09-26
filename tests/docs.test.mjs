// Documentation checks: generated pages are current, links resolve, and the writing stays plain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const walk = dir => readdirSync(join(root, dir), { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : []);
const pages = ['README.md', 'CLAUDE.md', ...walk('docs')];

// Hype and filler words to avoid (Google developer documentation style guide: tone, word list).
const BANNED = /\b(simply|easily|effortless(ly)?|seamless(ly)?|powerful|amazing|awesome|revolutionary|cutting-edge|state-of-the-art|blazing(ly)?|world-class|next-gen(eration)?|game-chang(er|ing)|magic(al)?|incredibl[ey]|stunning|robust|leverage|unleash|supercharge|best-in-class)\b/i;

test('generated reference pages are up to date', () => {
  execFileSync(process.execPath, ['tools/docs.mjs', '--check'], { cwd: root, stdio: 'pipe' });
});

test('relative links in the docs point to files and headings that exist', () => {
  const broken = [];
  for (const page of pages) {
    const text = readFileSync(join(root, page), 'utf8');
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:/i.test(target)) continue; // external
      const [path, anchor] = target.split('#');
      const file = path ? join(dirname(join(root, page)), path) : join(root, page);
      if (!existsSync(file)) { broken.push(`${page} → ${target}`); continue; }
      if (anchor && file.endsWith('.md')) {
        const slugs = [...readFileSync(file, 'utf8').matchAll(/^#+\s+(.+)$/gm)]
          .map(m => m[1].toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'));
        if (!slugs.includes(anchor)) broken.push(`${page} → ${target} (no such heading)`);
      }
    }
  }
  assert.deepEqual(broken, []);
});

test('docs avoid hype words and exclamation marks', () => {
  const found = [];
  for (const page of pages) {
    const prose = readFileSync(join(root, page), 'utf8').replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
    prose.split('\n').forEach((line, i) => {
      const m = line.match(BANNED) || line.match(/\w!(\s|$)/);
      if (m) found.push(`${relative(root, join(root, page))}:${i + 1}: "${m[0].trim()}"`);
    });
  }
  assert.deepEqual(found, []);
});

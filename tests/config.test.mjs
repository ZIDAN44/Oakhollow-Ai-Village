// Configuration stays in sync: every environment variable the server reads is documented in
// .env.example and docs/reference/configuration.md, and neither lists variables the server doesn't read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const used = new Set([...read('server.js').matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map(m => m[1]));
const inExample = new Set([...read('.env.example').matchAll(/^#?\s*([A-Z][A-Z0-9_]*)=/gm)].map(m => m[1]));
const inDocs = new Set([...read('docs/reference/configuration.md').matchAll(/^\|\s*`([A-Z][A-Z0-9_]*)`/gm)].map(m => m[1]));
const sorted = s => [...s].sort();

test('.env.example lists exactly the variables the server reads', () => {
  assert.deepEqual(sorted(inExample), sorted(used));
});

test('the configuration reference lists exactly the variables the server reads', () => {
  assert.deepEqual(sorted(inDocs), sorted(used));
});

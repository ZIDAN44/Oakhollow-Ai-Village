// The architecture rules (file/function size, no cycles, layering) must hold.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('architecture rules pass (tools/check.mjs)', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/check.mjs', import.meta.url))], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('every verb an option can produce is registered', async () => {
  const { newWorld, run, api } = await import('./harness.mjs');
  const { VERBS } = await import('../public/src/actions/registry.js');
  const sim = newWorld(3);
  const seen = new Set();
  for (let h = 0; h < 36; h++) {
    for (const n of sim.npcs) if (n.age >= 4) for (const o of api.buildOptions(n)) seen.add(o.act.type);
    await run(60);
  }
  const missing = [...seen].filter(t => !VERBS[t]);
  assert.deepEqual(missing, [], `options produce verbs with no handler: ${missing.join(', ')}`);
  assert.ok(seen.size > 20, `expected a wide range of options, saw ${seen.size}`);
});

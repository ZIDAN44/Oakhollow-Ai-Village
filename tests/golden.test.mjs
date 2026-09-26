// Golden master: the refactored code must behave exactly like the recorded original.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newWorld, run, fingerprint } from './harness.mjs';

const golden = JSON.parse(readFileSync(new URL('./golden.json', import.meta.url), 'utf8'));

for (const seed of Object.keys(golden)) {
  test(`village with seed ${seed} behaves exactly as recorded`, async () => {
    const sim = newWorld(Number(seed));
    await run(1440 * 2);
    assert.deepEqual(JSON.parse(JSON.stringify(fingerprint(sim))), golden[seed]);
  });
}

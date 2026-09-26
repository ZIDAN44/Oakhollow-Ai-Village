// Records the golden master: what the village does over two game days with a fixed seed.
// Run after an intended behaviour change: npm run test:update-golden
import { writeFileSync } from 'node:fs';
import { newWorld, run, fingerprint } from './harness.mjs';
const out = {};
for (const seed of [1, 7, 42]) {
  const sim = newWorld(seed);
  await run(1440 * 2);
  out[seed] = fingerprint(sim);
}
writeFileSync(new URL('./golden.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('golden master written:', Object.keys(out).map(k => `seed ${k}: ${out[k].people.length} alive, ${out[k].log} log entries`).join('; '));

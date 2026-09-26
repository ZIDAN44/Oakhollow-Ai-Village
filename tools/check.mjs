// Architecture and size rules, with zero dependencies. Run: npm run lint:arch
// Enforces (see tools/architecture.json):
//   1. file length        - no module over maxFileLines lines
//   2. function length    - no function over maxFunctionLines lines (blank and comment-only lines excluded)
//   3. no import cycles   - Tarjan's strongly connected components over the import graph
//   4. layering           - imports only point to the same layer or a lower one
// Exits with code 1 and a list of violations if any rule is broken.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles, importGraph, cycles } from './deps.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(path.join(ROOT_DIR, 'tools', 'architecture.json'), 'utf8'));
const SRC = path.join(ROOT_DIR, config.root);
const { maxFileLines, maxFunctionLines } = config.limits;
const rel = f => path.relative(SRC, f).replace(/\\/g, '/');
const problems = [];

function layerOf(file) {
  const r = rel(file);
  const top = r.split('/')[0];
  const i = config.layers.findIndex(l => l.folders.includes(top) || l.folders.includes(r));
  return i < 0 ? null : i;
}

// Function spans: top-level `function` declarations and `const x = (...) => {` blocks,
// plus methods inside top-level objects (like defineEffect({...}) bodies), indented by 2.
function functionSpans(src) {
  const lines = src.split('\n');
  const spans = [];
  const starts = [
    { re: /^(export\s+)?(async\s+)?function\s*\*?\s*([\w$]+)\s*\(/, indent: '' },
    { re: /^(export\s+)?const\s+([\w$]+)\s*=\s*(async\s+)?\([^)]*\)\s*=>\s*\{\s*$/, indent: '' },
    { re: /^ {2}(async\s+)?([\w$]+)\s*\([^)]*\)\s*\{\s*$/, indent: '  ' },
  ];
  for (let i = 0; i < lines.length; i++) {
    for (const s of starts) {
      const m = lines[i].match(s.re);
      if (!m) continue;
      const name = m[3] || m[2];
      let j = i + 1;
      while (j < lines.length && !new RegExp(`^${s.indent}\\}`).test(lines[j])) j++;
      const body = lines.slice(i, j + 1).filter(l => l.trim() && !l.trim().startsWith('//'));
      spans.push({ name, line: i + 1, length: body.length });
      break;
    }
  }
  return spans;
}

const files = listFiles(SRC);
const graph = importGraph(files);

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const lines = src.split('\n').length;
  if (lines > maxFileLines) problems.push(`${rel(f)}: ${lines} lines (max ${maxFileLines}). Split it by responsibility.`);
  for (const fn of functionSpans(src)) {
    if (fn.length > maxFunctionLines) problems.push(`${rel(f)}:${fn.line}: function ${fn.name} is ${fn.length} lines (max ${maxFunctionLines}). Extract smaller functions.`);
  }
  const from = layerOf(f);
  if (from === null) { problems.push(`${rel(f)}: not in any layer. Add its folder to tools/architecture.json.`); continue; }
  for (const dep of graph.get(f).deps) {
    const to = layerOf(dep);
    if (to !== null && to > from) {
      problems.push(`${rel(f)}: imports ${rel(dep)}, a higher layer (${config.layers[from].name} -> ${config.layers[to].name}). Invert it with core/events.js or move the code down.`);
    }
  }
}
for (const c of cycles(graph)) problems.push(`import cycle: ${c.map(rel).join(' -> ')}`);

if (problems.length) {
  console.error(`\n${problems.length} architecture rule violation(s):\n`);
  for (const p of problems) console.error('  ✗ ' + p);
  console.error('\nRules live in tools/architecture.json; see CLAUDE.md for how to fix them.\n');
  process.exit(1);
}
console.log(`✓ ${files.length} modules: all within ${maxFileLines} lines, functions within ${maxFunctionLines} lines, no import cycles, layers respected.`);

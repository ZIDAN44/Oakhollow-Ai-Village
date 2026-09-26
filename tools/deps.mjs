// Dependency analyzer: file sizes, the import graph, and import cycles (Tarjan's SCC algorithm).
// Usage: npm run report:deps -- [--max-lines 300] [--strict]   (--strict exits 1 on cycles or oversized files)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', 'public', 'src');
const args = process.argv.slice(2);
const MAX = Number(args[args.indexOf('--max-lines') + 1]) || 300;
const STRICT = args.includes('--strict');

export function listFiles(dir = ROOT) {
  return readdirSync(dir).flatMap(f => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? listFiles(p) : p.endsWith('.js') ? [p] : [];
  });
}

export function importGraph(files = listFiles()) {
  const graph = new Map();
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const deps = [...src.matchAll(/^\s*import\s[^'"]*?from\s+['"](\.[^'"]+)['"]/gm), ...src.matchAll(/^\s*import\s+['"](\.[^'"]+)['"]/gm)]
      .map(m => path.resolve(path.dirname(f), m[1]));
    graph.set(f, { deps, lines: src.split('\n').length });
  }
  return graph;
}

// Tarjan: every strongly connected component with more than one file is an import cycle.
export function cycles(graph) {
  let index = 0;
  const idx = new Map(), low = new Map(), onStack = new Set(), stack = [], out = [];
  const visit = v => {
    idx.set(v, index); low.set(v, index); index++;
    stack.push(v); onStack.add(v);
    for (const w of graph.get(v)?.deps || []) {
      if (!graph.has(w)) continue;
      if (!idx.has(w)) { visit(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
    }
    if (low.get(v) === idx.get(v)) {
      const scc = [];
      let w;
      do { w = stack.pop(); onStack.delete(w); scc.push(w); } while (w !== v);
      if (scc.length > 1) out.push(scc);
    }
  };
  for (const v of graph.keys()) if (!idx.has(v)) visit(v);
  return out;
}

if (import.meta.url.endsWith(path.basename(process.argv[1] || ''))) {
  const graph = importGraph();
  const rel = f => path.relative(ROOT, f).replace(/\\/g, '/');
  const rows = [...graph.entries()].sort((a, b) => b[1].lines - a[1].lines);
  console.log(`\n${rows.length} modules, ${rows.reduce((s, [, v]) => s + v.lines, 0)} lines\n`);
  for (const [f, v] of rows) console.log(`${String(v.lines).padStart(5)}  ${rel(f)}${v.lines > MAX ? '   <-- over ' + MAX : ''}  (${v.deps.length} imports)`);
  const cyc = cycles(graph);
  console.log(cyc.length ? `\n${cyc.length} import cycle(s):` : '\nNo import cycles.');
  for (const c of cyc) console.log('  ' + c.map(rel).join(' <-> '));
  const big = rows.filter(([, v]) => v.lines > MAX).length;
  if (STRICT && (cyc.length || big)) process.exit(1);
}

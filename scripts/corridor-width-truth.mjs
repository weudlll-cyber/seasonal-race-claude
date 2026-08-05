// ============================================================
// File:        scripts/corridor-width-truth.mjs
// Project:     RaceArena — NIGHT-1 stage B3
//
// THE QUESTION: is the road actually UNEVEN in width today? If every track is its declared width all
// the way round, then "per section" is INSURANCE against a track nobody has drawn yet. If widths do
// vary, it is PRESENT WORK. That is the whole decision this measures.
//
// Local width = |outer(i) - inner(i)| at 200 samples, against the declared `width`.
// ============================================================
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = existsSync(join(ROOT, 'server/data/tracks'))
  ? join(ROOT, 'server/data/tracks')
  : join(ROOT, 'server/seeds/tracks');

const geos = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.json')) continue;
  const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  if (j.id) geos.push(j);
}
geos.sort((a, b) => a.id.localeCompare(b.id));

console.log('LOCAL CORRIDOR WIDTH vs DECLARED — 200 samples per track\n');
console.log('track            declared   n     min       max      mean     max/min   verdict');
for (const g of geos) {
  const inner = g.innerPoints || g.inner || null;
  const outer = g.outerPoints || g.outer || null;
  if (!Array.isArray(inner) || !Array.isArray(outer) || !inner.length || !outer.length) {
    console.log(
      `  ${String(g.id).padEnd(15)} ${String(g.width ?? '?').padStart(8)}   —  (no inner/outer point arrays on this geometry)`
    );
    continue;
  }
  const n = Math.min(inner.length, outer.length);
  const w = [];
  for (let i = 0; i < n; i++) {
    const a = inner[i],
      b = outer[i];
    const ax = a.x ?? a[0],
      ay = a.y ?? a[1];
    const bx = b.x ?? b[0],
      by = b.y ?? b[1];
    if ([ax, ay, bx, by].every(Number.isFinite)) w.push(Math.hypot(bx - ax, by - ay));
  }
  if (!w.length) {
    console.log(`  ${String(g.id).padEnd(15)} — unusable points`);
    continue;
  }
  const mn = Math.min(...w),
    mx = Math.max(...w);
  const mean = w.reduce((s, v) => s + v, 0) / w.length;
  const ratio = mx / mn;
  const verdict = ratio < 1.001 ? 'CONSTANT' : ratio < 1.05 ? 'near-constant' : 'VARIES';
  console.log(
    `  ${String(g.id).padEnd(15)} ${String(g.width ?? '?').padStart(8)} ${String(w.length).padStart(4)}  ` +
      `${mn.toFixed(2).padStart(8)} ${mx.toFixed(2).padStart(9)} ${mean.toFixed(2).padStart(9)}  ${ratio.toFixed(4).padStart(7)}   ${verdict}`
  );
}

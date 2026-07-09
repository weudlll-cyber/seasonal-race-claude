import { readFileSync, readdirSync } from 'fs';
import { RACER_CONFIGS } from '../sim-fairness.mjs';
const dir = 'client/src/modules/racer-types';
const files = readdirSync(dir).filter((f) => /RacerType\.js$/.test(f) && f !== 'SpriteRacerType.js');
const num = (src, key) => { const m = src.match(new RegExp(key + String.raw`\s*:\s*([0-9.]+)`)); return m ? Number(m[1]) : null; };
let checked = 0, mism = 0; const seen = new Set();
for (const f of files) {
  const full = readFileSync(`${dir}/${f}`, 'utf8');
  const src = full.slice(Math.max(0, full.indexOf('new SpriteRacerType({')));
  const id = (src.match(/id\s*:\s*['"]([a-z0-9]+)['"]/i) || [])[1];
  if (!id) { console.log(`NO id ${f}`); continue; }
  seen.add(id); const cfg = RACER_CONFIGS[id];
  if (!cfg) { console.log(`SIM MISSING ${id}`); continue; }
  checked++;
  for (const k of ['speedMultiplier', 'displaySize', 'bodyFillX', 'bodyFillY']) {
    const s = num(src, k); if (s === null) { console.log(`${id}: no ${k}`); continue; }
    if (Math.abs(s - cfg[k]) > 1e-9) { console.log(`MISMATCH ${id}.${k}: shipped=${s} sim=${cfg[k]}`); mism++; }
  }
  const sm = src.match(/surfaceClasses\s*:\s*\[([^\]]*)\]/);
  if (sm) { const ss = sm[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean).sort();
    if (JSON.stringify(ss) !== JSON.stringify([...cfg.surfaceClasses].sort())) { console.log(`SURFACE ${id}: shipped=${ss} sim=${cfg.surfaceClasses}`); mism++; } }
}
console.log(`\nchecked=${checked} mismatches=${mism}  sim-only=${Object.keys(RACER_CONFIGS).filter(k=>!seen.has(k)) || 'none'}`);

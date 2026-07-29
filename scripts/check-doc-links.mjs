// ============================================================
// File:        scripts/check-doc-links.mjs
// Project:     RaceArena
// Description: Living-doc link checker. Verifies every relative markdown link in the LIVING docs
//              (docs/ + top-level *.md) resolves to a real file. Exits non-zero on any dangling link.
//              `reports/` is EXCLUDED by design — it is the lab journal (historical, allowed to rot).
//              No dependencies (plain Node). Run from the repo root: `node scripts/check-doc-links.mjs`.
// ============================================================

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();

// The living-doc set: every tracked .md under docs/, plus the repo-ROOT-level *.md files (README, etc.).
// Nested result/experiment/report trees are the lab journal and are excluded (they are allowed to rot):
// reports/, and any other tracked .md that is neither under docs/ nor at the repo root.
const tracked = execSync('git ls-files "*.md"', { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .map((f) => f.trim())
  .filter(Boolean);
const files = tracked.filter((f) => {
  if (f.includes('node_modules/') || f.includes('/dist/')) return false;
  if (f.startsWith('docs/')) return true; // all of docs/ is living
  if (!f.includes('/')) return true; // repo-root-level *.md (README.md, KRAEFTE-LANDKARTE.md, …)
  return false; // nested trees (reports/, results dirs, client/, server/, scripts/) = not living docs
});

const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
let dangling = 0;
let checked = 0;

for (const f of files) {
  const abs = join(ROOT, f);
  // Strip HTML comments and fenced code blocks — links inside them are not live references.
  const text = readFileSync(abs, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '');
  let m;
  while ((m = linkRe.exec(text))) {
    let target = m[1].trim();
    // Strip an optional "title" and any #anchor / line-anchor (#L123). Code line-anchors are
    // best-effort pointers; we verify the file exists, not the line.
    target = target.split(/\s+/)[0].split('#')[0];
    if (!target) continue; // pure in-page anchor
    if (/^(https?:|mailto:|tel:|data:)/.test(target)) continue; // external
    checked++;
    const resolved = resolve(dirname(abs), target);
    if (!existsSync(resolved)) {
      dangling++;
      console.error(`DANGLING: ${f} -> ${m[1]}`);
    }
  }
}

console.log(
  `check-doc-links: ${checked} relative links across ${files.length} living-doc files; ${dangling} dangling.`
);
if (dangling > 0) {
  console.error(
    `\nFAIL: ${dangling} dangling link(s) in living docs. Fix or remove them (reports/ is excluded as lab journal).`
  );
  process.exit(1);
}

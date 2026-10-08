// AUDIT-1 A4: test cases whose body contains no assertion. A heuristic — the body is cut by brace
// matching from the `it(`/`test(` line, and a case that calls a helper which asserts is a false
// positive; every hit is checked by hand. Usage: node no-assert.mjs <clone>
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const clone = process.argv[2];
const files = execFileSync('git', ['-C', clone, 'ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(test|spec)\.(m?js|jsx)$/.test(f) && !f.startsWith('reports/'));
const ASSERT = /\bexpect\b|\bassert\b|\.toThrow|\bexpectTypeOf\b|\bfail\(/;
let cases = 0;
const hits = [];
for (const f of files) {
  const src = readFileSync(join(clone, f), 'utf8');
  const re = /\b(?:it|test)(?:\.each\([^)]*\))?\(\s*(['"`])(.+?)\1/g;
  let m;
  while ((m = re.exec(src))) {
    const open = src.indexOf('{', m.index);
    if (open < 0) continue;
    let depth = 0;
    let end = open;
    for (; end < src.length; end++) {
      if (src[end] === '{') depth++;
      else if (src[end] === '}' && --depth === 0) break;
    }
    cases++;
    if (!ASSERT.test(src.slice(open, end))) hits.push(`${f}:${src.slice(0, m.index).split('\n').length} ${m[2].slice(0, 90)}`);
  }
}
console.log(`test files ${files.length}, cases ${cases}, cases with no assertion in their own body: ${hits.length}`);
for (const h of hits) console.log(`  ${h}`);

// AUDIT-1 A1: runs ESLint through its API with an explicit cwd (the CLI's -c makes the process cwd
// the base path, which put every file "outside" it). Writes the JSON report and prints a rule tally.
// Usage: node eslint-audit.mjs <clone> <config> <out.json> <dir>...
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [clone, config, out, ...dirs] = process.argv.slice(2);
// The server borrows the client's ESLint, so when `clone` is server/ the binary is one level up.
const api = ['client/node_modules/eslint/lib/api.js', '../client/node_modules/eslint/lib/api.js']
  .map((p) => join(clone, p))
  .find((p) => existsSync(p));
const { ESLint } = await import(pathToFileURL(api).href);
const eslint = new ESLint({ cwd: clone, overrideConfigFile: config, errorOnUnmatchedPattern: false });
const results = await eslint.lintFiles(dirs);
writeFileSync(out, JSON.stringify(results.map((r) => ({ filePath: r.filePath, messages: r.messages })), null, 1));
const tally = {};
for (const r of results) for (const m of r.messages) tally[m.ruleId ?? 'parse'] = (tally[m.ruleId ?? 'parse'] ?? 0) + 1;
console.log(`files: ${results.length}`);
for (const [rule, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(6)}  ${rule}`);

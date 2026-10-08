// AUDIT-1 A6: the licence of every direct dependency of the three trees, read from the installed
// package.json. Usage: node licences.mjs <clone>
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const clone = process.argv[2];
const root = JSON.parse(readFileSync(join(clone, 'package.json'), 'utf8'));
console.log(`repository licence: ${root.license ?? '(none in package.json)'}; LICENSE file: ${existsSync(join(clone, 'LICENSE'))}`);
const byLicence = {};
for (const tree of ['.', 'client', 'server']) {
  const pkg = JSON.parse(readFileSync(join(clone, tree, 'package.json'), 'utf8'));
  for (const [kind, deps] of [['prod', pkg.dependencies], ['dev', pkg.devDependencies]]) {
    for (const name of Object.keys(deps ?? {})) {
      const p = join(clone, tree, 'node_modules', name, 'package.json');
      const lic = existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')).license ?? 'UNKNOWN') : 'NOT INSTALLED';
      const l = typeof lic === 'object' ? lic.type : lic;
      (byLicence[l] ??= []).push(`${tree}/${name} (${kind})`);
    }
  }
}
for (const [l, list] of Object.entries(byLicence)) console.log(`${l}: ${list.length} — ${list.join(', ')}`);

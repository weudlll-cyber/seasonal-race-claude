// AUDIT-1 A6: repository hygiene in one pass (no shell pipes). Usage: node hygiene.mjs <clone>
//   1. the 20 largest blobs anywhere in history, with a path that names them
//   2. tracked files over 1 MB at HEAD
//   3. package.json scripts whose `node <file>` target does not exist
//   4. tracked files that .gitignore would ignore (committed before the rule, or forced)
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

const clone = process.argv[2];
const git = (args, input) => {
  const r = spawnSync('git', ['-C', clone, ...args], { input, encoding: 'utf8', maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
};

// 1. Largest blobs in history.
const objects = git(['rev-list', '--objects', '--all']).split('\n').filter(Boolean);
const pathOf = new Map(objects.map((l) => [l.slice(0, 40), l.slice(41)]));
const sizes = git(['cat-file', '--batch-check=%(objecttype) %(objectname) %(objectsize)'], objects.map((l) => l.slice(0, 40)).join('\n'))
  .split('\n')
  .filter((l) => l.startsWith('blob '))
  .map((l) => {
    const [, sha, size] = l.split(' ');
    return { sha, size: Number(size), path: pathOf.get(sha) };
  })
  .sort((a, b) => b.size - a.size);
console.log('## 1. largest blobs in history');
for (const b of sizes.slice(0, 20)) console.log(`${(b.size / 1048576).toFixed(2).padStart(7)} MB  ${b.sha.slice(0, 10)}  ${b.path}`);
const headTracked = new Set(git(['ls-files']).split('\n').filter(Boolean));
console.log(`(${sizes.length} blobs; of the 20 above, ${sizes.slice(0, 20).filter((b) => headTracked.has(b.path)).length} are still at HEAD)`);

// 2. Tracked files over 1 MB at HEAD.
console.log('\n## 2. tracked files over 1 MB at HEAD');
for (const f of headTracked) {
  const p = join(clone, f);
  if (existsSync(p) && statSync(p).size > 1048576) console.log(`${(statSync(p).size / 1048576).toFixed(2).padStart(7)} MB  ${f}`);
}

// 3. package scripts pointing at missing files.
console.log('\n## 3. package scripts with a missing node target');
for (const pkg of ['package.json', 'client/package.json', 'server/package.json']) {
  const dir = dirname(join(clone, pkg));
  const { scripts = {} } = JSON.parse(readFileSync(join(clone, pkg), 'utf8'));
  for (const [name, cmd] of Object.entries(scripts)) {
    for (const m of cmd.matchAll(/\bnode\s+(?:--\S+\s+)*([^\s&|;]+\.(?:m?js|cjs))/g)) {
      if (!existsSync(join(dir, m[1]))) console.log(`${pkg} "${name}": ${m[1]} does not exist`);
    }
  }
}

// 4. Tracked files that the ignore rules match.
console.log('\n## 4. tracked files matched by .gitignore');
const ignored = spawnSync('git', ['-C', clone, 'ls-files', '-ci', '--exclude-standard'], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
for (const f of ignored) console.log(f);
console.log(`(${ignored.length})`);

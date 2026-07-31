// ============================================================
// File:        scripts/check-tags.mjs
// Project:     RaceArena
// Description: Tag-register guard. Every tag that exists at origin must be named in docs/TAGS.md.
//              Catches the "unregistered tag" drift class that check-doc-links cannot see (a tag
//              missing from the register is not a broken link — it is an undocumented anchor).
//              Read-only, no dependencies. Run from the repo root: `node scripts/check-tags.mjs`.
//              Test/fixture overrides: --tags-md=<path> --tags-file=<path> (the latter holds
//              `git ls-remote --tags` output so the guard can be exercised without the network).
//
// SOURCE OF TRUTH is the tag list actually available to the run: `git ls-remote --tags origin`
// (it fetches — the origin state is authoritative). LOUD-FAILURE RULE (Lesson 187): if that list
// comes back empty or unavailable — e.g. a CI checkout that omitted tags — FAIL. A run that cannot
// see the tags must break the build, never bless it.
// ============================================================

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const argVal = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

const TAGS_MD = resolve(argVal('tags-md', 'docs/TAGS.md'));
const TAGS_FILE = argVal('tags-file', null); // test override: a file in `git ls-remote --tags` format

function fail(msg) {
  console.error(`check-tags: FAIL — ${msg}`);
  process.exit(1);
}

// Parse `git ls-remote --tags` output ("<sha>\trefs/tags/<name>"), dropping the dereferenced
// "<name>^{}" lines that annotated tags emit.
function parseLsRemote(raw) {
  const tags = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^(\S+)\s+refs\/tags\/(.+)$/);
    if (!m) continue;
    const [, sha, name] = m;
    if (name.endsWith('^{}')) continue;
    tags.push({ sha: sha.slice(0, 7), name });
  }
  return tags;
}

let tags;
try {
  const raw = TAGS_FILE
    ? readFileSync(resolve(TAGS_FILE), 'utf8')
    : execSync('git ls-remote --tags origin', { encoding: 'utf8' });
  tags = parseLsRemote(raw);
} catch (e) {
  fail(
    `could not obtain the tag list (${TAGS_FILE ? `file ${TAGS_FILE}` : 'git ls-remote --tags origin'}): ${e.message}. A run that cannot see the tags must break the build, not bless it (Lesson 187).`
  );
}

if (tags.length === 0) {
  fail(
    `tag list is EMPTY. A CI checkout that omits tags must fail, never pass silently (Lesson 187).`
  );
}

let tagsMd;
try {
  tagsMd = readFileSync(TAGS_MD, 'utf8');
} catch (e) {
  fail(`cannot read tag register ${TAGS_MD}: ${e.message}`);
}

// A tag counts as registered only when its name appears as a WHOLE TOKEN — not as a substring of a
// longer name (so `pre/motion` is NOT satisfied by `pre/motion-2` in the register). Tag names are
// made of [A-Za-z0-9_./-]; a match must be bounded by a character outside that set (or string edge).
// Mirrors the link-target discipline check-index uses for report filenames.
const TAG_CHAR = 'A-Za-z0-9_./-';
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isRegistered = (name) =>
  new RegExp(`(?<![${TAG_CHAR}])${escapeRe(name)}(?![${TAG_CHAR}])`).test(tagsMd);

const unregistered = tags.filter((t) => !isRegistered(t.name));

console.log(`check-tags: ${tags.length} origin tags checked, ${unregistered.length} unregistered.`);

if (unregistered.length > 0) {
  console.error(`\nFAIL: ${unregistered.length} tag(s) at origin not registered in ${TAGS_MD}:`);
  for (const t of unregistered) console.error(`${t.name} -> ${t.sha}`);
  process.exit(1);
}

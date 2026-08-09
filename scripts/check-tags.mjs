// ============================================================
// File:        scripts/check-tags.mjs
// Project:     RaceArena
// Description: Tag-register guard. It checks TWO DIRECTIONS, and the second was added after the
//              first was found to cover the drift class NEXT TO the incident it was built for:
//
//                ORIGIN -> REGISTER   every tag at origin must be named in docs/TAGS.md
//                REGISTER -> ORIGIN   every tag DECLARED in docs/TAGS.md must exist at origin
//
//              The second is the one that actually bit this project: the register once named a
//              return tag that existed on no machine but the owner's, and the guard written
//              afterwards could not see it (TAG-GUARD-2). A LOCAL-only tag is the third direction and
//              is deliberately NOT checked here — CI runs on a runner with nobody's local tags, so
//              the question is unanswerable in CI; `scripts/audit-local.mjs` owns it.
//
//              Every tag that exists at origin must be named in docs/TAGS.md.
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

// VERIFY-FAST-1: every guard prints its own elapsed time. The ceremony's cost column was wrong
// in BOTH directions (camera claimed ~85 s and costs 47; render claimed ~30 s and costs 15) and
// nothing checked it. A number the script measures itself cannot go stale.
// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "check-tags",
  covers:
    "a tag at origin that no register entry declares, and a register entry naming a tag that does not exist",
  blind: [
    "whether a tag points where the register SAYS it points — names are checked, not shas",
    "local tags that were never pushed",
    "A TAG PUSHED WITHOUT TOUCHING TAGS.md IS INVISIBLE TO ROUTING — no file changed, so verify does not select this guard. The pre-commit hook and CI run it unconditionally, which is where that case is caught.",
  ],
  dirs: [],
  files: ["docs/TAGS.md"],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const __t0 = Date.now();
process.on("exit", () => {
  // NIGHT-TOOLS-1: MACHINE-READABLE, because a human string has to be re-parsed by
  // whatever generates the ceremony's cost column, and a parser of prose is the defect
  // that column already had. `scripts/gen-ceremony-costs.mjs` reads exactly this token.
  const ms = Date.now() - __t0;
  process.stderr.write(`[ra-elapsed-ms ${ms}] (${(ms / 1000).toFixed(1)}s)
`);
});

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const argVal = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

const TAGS_MD = resolve(argVal("tags-md", "docs/TAGS.md"));
const TAGS_FILE = argVal("tags-file", null); // test override: a file in `git ls-remote --tags` format

function fail(msg) {
  console.error(`check-tags: FAIL — ${msg}`);
  process.exit(1);
}

// Parse `git ls-remote --tags` output ("<sha>\trefs/tags/<name>"), dropping the dereferenced
// "<name>^{}" lines that annotated tags emit.
function parseLsRemote(raw) {
  const tags = [];
  for (const line of raw.split("\n")) {
    const m = line.match(/^(\S+)\s+refs\/tags\/(.+)$/);
    if (!m) continue;
    const [, sha, name] = m;
    if (name.endsWith("^{}")) continue;
    tags.push({ sha: sha.slice(0, 7), name });
  }
  return tags;
}

let tags;
try {
  const raw = TAGS_FILE
    ? readFileSync(resolve(TAGS_FILE), "utf8")
    : execSync("git ls-remote --tags origin", { encoding: "utf8" });
  tags = parseLsRemote(raw);
} catch (e) {
  fail(
    `could not obtain the tag list (${TAGS_FILE ? `file ${TAGS_FILE}` : "git ls-remote --tags origin"}): ${e.message}. A run that cannot see the tags must break the build, not bless it (Lesson 187).`,
  );
}

if (tags.length === 0) {
  fail(
    `tag list is EMPTY. A CI checkout that omits tags must fail, never pass silently (Lesson 187).`,
  );
}

let tagsMd;
try {
  tagsMd = readFileSync(TAGS_MD, "utf8");
} catch (e) {
  fail(`cannot read tag register ${TAGS_MD}: ${e.message}`);
}

// A tag counts as registered only when its name appears as a WHOLE TOKEN — not as a substring of a
// longer name (so `pre/motion` is NOT satisfied by `pre/motion-2` in the register). Tag names are
// made of [A-Za-z0-9_./-]; a match must be bounded by a character outside that set (or string edge).
// Mirrors the link-target discipline check-index uses for report filenames.
const TAG_CHAR = "A-Za-z0-9_./-";
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isRegistered = (name) =>
  new RegExp(`(?<![${TAG_CHAR}])${escapeRe(name)}(?![${TAG_CHAR}])`).test(
    tagsMd,
  );

const unregistered = tags.filter((t) => !isRegistered(t.name));

// ── DIRECTION 2: REGISTER -> ORIGIN ───────────────────────────────────────────────────────────────
//
// WHY THIS IS NOT A NAIVE NAME SCAN. The register is PROSE, not a list, and a tag name is
// indistinguishable from a BRANCH name — `pre/anchor-truth` is a tag, `pre/greenfield-proto` is a
// branch, and both are backticked in running text. Measured on the real register: scanning for
// tag-SHAPED backticked tokens finds 292 candidates of which only 66 are tags — a 77% false-positive
// rate. A guard that cries wolf is worse than the gap it closes, so that is not how this works.
//
// WHAT IS PARSED INSTEAD: a DECLARATION — the form the register already uses when it registers a
// tag, and the form every new registration is written in:
//
//     - `pre/anchor-truth` (`c299fdf7`, 2026-08-04) — master's tip after CI-AUDIT-GREEN-1 …
//
// i.e. a list item whose first token is a backticked NAME immediately followed by a backticked SHA.
// Measured on the real register: 48 declarations, all 48 real tags, ZERO false positives. It does not
// reach the 18 legacy tags recorded in flat lists without a sha — those are covered by direction 1,
// which passes. Precision is what matters here: a missed line is a far smaller sin than a false alarm.
const DECLARATION =
  /^\s*[-*]\s+\*{0,2}`([A-Za-z0-9._/-]+)`\*{0,2}\s*\(\s*`[0-9a-f]{6,40}`/;

// RETIRED TAGS ARE EXCLUDED EXPLICITLY, NOT BY ACCIDENT. The lifecycle collapses tags onto a phase
// endpoint by an owner-approved keep-list, so the register legitimately names tags that no longer
// exist. The mechanism is the SECTION HEADING: anything under a heading marked RETIRED or COLLAPSED
// is history and must never fail the build. Today no declaration sits under such a heading, so this
// excludes nothing — it is written down so the exclusion is a RULE rather than a coincidence that
// somebody later relies on without knowing it was one.
const RETIRED_SECTION = /RETIRED|COLLAPSED/i;

const originNames = new Set(tags.map((t) => t.name));
const declaredMissing = [];
// DISTINCT names, not lines. A tag may legitimately be declared once and then restated elsewhere —
// `pre/anchor-truth` is registered in its own block and named again in a later one as still valid —
// and counting lines would let the register's own cross-references inflate the number. That exact
// ambiguity is why two counts of "the same thing" disagreed (TAG-GUARD-3 §1).
const declaredSeen = new Set();
let currentHeading = "";
for (const [idx, line] of tagsMd.split("\n").entries()) {
  if (/^#{1,6}\s/.test(line))
    currentHeading = line.replace(/^#+\s*/, "").trim();
  const m = DECLARATION.exec(line);
  if (!m) continue;
  if (RETIRED_SECTION.test(currentHeading)) continue;
  if (declaredSeen.has(m[1])) continue;
  declaredSeen.add(m[1]);
  if (!originNames.has(m[1])) {
    declaredMissing.push({
      name: m[1],
      line: idx + 1,
      heading: currentHeading,
    });
  }
}
const declaredChecked = declaredSeen.size;

console.log(
  `check-tags: ${tags.length} origin tags checked, ${unregistered.length} unregistered; ` +
    `${declaredChecked} declared in the register, ${declaredMissing.length} missing at origin.`,
);

if (unregistered.length > 0) {
  console.error(
    `\nFAIL: ${unregistered.length} tag(s) at origin not registered in ${TAGS_MD}:`,
  );
  for (const t of unregistered) console.error(`${t.name} -> ${t.sha}`);
}

if (declaredMissing.length > 0) {
  console.error(
    `\nFAIL: ${declaredMissing.length} tag(s) declared in ${TAGS_MD} do NOT exist at origin.` +
      `\nA registered tag that exists nowhere is the failure this guard was built after — either push` +
      `\nthe tag, or move its entry under a RETIRED/COLLAPSED heading if it was deliberately collapsed.`,
  );
  for (const d of declaredMissing) {
    console.error(
      `${d.name} -> declared at ${TAGS_MD}:${d.line} under "${d.heading}"`,
    );
  }
}

if (unregistered.length > 0 || declaredMissing.length > 0) process.exit(1);

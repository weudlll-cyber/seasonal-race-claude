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
    "a tag at origin that no register entry declares, and a register entry naming a tag that does not exist; " +
    "AND (RULE B) a branch standing at origin whose TREE master already holds — the mechanical half of " +
    "SHIP-CEREMONY step 12",
  blind: [
    "whether a tag points where the register SAYS it points — names are checked, not shas",
    "local tags that were never pushed",
    "A TAG PUSHED WITHOUT TOUCHING TAGS.md IS INVISIBLE TO ROUTING — no file changed, so verify does not select this guard. The pre-commit hook and CI run it unconditionally, which is where that case is caught.",
    "RULE B: A BRANCH PUSHED OR DELETED TOUCHES NO FILE either, so routing cannot select this guard for it. Same answer as the tag half: the hook and CI run it unconditionally, and that is where Rule B actually fires.",
    "RULE B: a branch whose TREE is not available locally is reported UNJUDGED and does not fail. The post-merge case this rule exists for is always judgeable — you have just merged the objects — so the unjudgeable case is a branch pushed from another machine, where failing would cry wolf at a run that simply has not fetched.",
    "RULE B compares (path, blob), not history. A branch whose every file matches master's byte for byte is reported as contained even if its COMMITS are not in master — which is the intended reading of step 12, since nothing is lost by deleting it. CORRECTED 2026-09-03: it shipped comparing paths ALONE, which reported every modify-only work-in-progress branch as deletable and failed on the next branch pushed after it shipped.",
    "RULE B under-reports once master MOVES ON past a merge: the merged branch's blobs stop matching and it goes unreported. Step 12 is owed AT the merge, when they still agree, so the window this misses is one where the branch has already outlived the step meant to delete it.",
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
import { pathToFileURL } from "node:url";


// ══ RULE B — NO BRANCH MAY STAND AT ORIGIN WHOSE TREE MASTER ALREADY HOLDS ═══════════════════════
//
// THE DEFECT IT EXISTS FOR. SHIP-CEREMONY step 12 clears merged branches at origin, and its scope
// read as a SHIP's step rather than every merge's. On 2026-09-02 a five-piece chain merged six
// branches and left all six standing, because every scope cue said the step did not apply. The
// wording was corrected by `7bb7dfe5`; this is the mechanical half, and it would have gone red at
// the FIRST of the six merges rather than after the batch.
//
// ★ THE TREE, NOT THE COMMIT GRAPH. `git merge-base --is-ancestor` and a `master...branch` commit
// diff both answer a question about HISTORY, and the ceremony records why that is the wrong one:
// on 2026-08-26 the commit-level check reported `diag/runin-viable-1` as safe to delete while that
// branch's TREE held `client/src/modules/camera/panStaleZoom.test.js`, a file master had REPLACED
// during RUNIN-PIVOT-SCOPE-1. A branch is safe to delete when master's tree holds every path its
// tree holds — that is a question about CONTENT, and it is the one asked here.
//
// ★ ORIGIN IS ASKED DIRECTLY, NOT THE CACHE. `git branch -r` reads remote-tracking refs, which are
// whatever the last fetch left behind; step 12 already writes this distinction down and the guard
// has to honour it or it would bless a branch that was deleted locally and still stands remotely.
const KEEP = (name, reason) => ({ name, reason });

// ── BRANCHES DELIBERATELY KEPT AT ORIGIN ────────────────────────────────────────────────────────
//
// EMPTY TODAY, AND THAT IS THE SHIPPED STATE. A list is unavoidable here and only here: "this branch
// is kept on purpose" is an INTENT, and no discovery can read it off the repository — which is the
// one condition under which this project accepts a list at all. It carries a reason per entry, and a
// STALE ENTRY FAILS, the shape `audit-gate` already uses: an allowlist that outlives its subject is
// a hole that looks like a decision.
//
// TAGS.md already states the rule this list must not be used to evade: anything that must survive as
// evidence becomes an ANNOTATED TAG, never a branch. An entry here is therefore a temporary
// exception to a settled policy, not a second way of keeping work.
export const KEPT_BRANCHES = [];

/** `git ls-remote --heads origin` → [{ sha, name }]. The authoritative list, not the cache. */
function parseHeads(raw) {
  const heads = [];
  for (const line of raw.split("\n")) {
    const m = line.match(/^(\S+)\s+refs\/heads\/(.+)$/);
    if (m) heads.push({ sha: m[1], name: m[2] });
  }
  return heads;
}

/**
 * Every (path, blob) pair in a tree, or null when the object is not available locally to judge.
 *
 * ── PATH+BLOB, AND THIS IS A CORRECTION TO RULE B'S FIRST SHIPPED FORM (2026-09-03) ─────────────
 *
 * It shipped comparing PATHS ONLY, matching the shell SHIP-CEREMONY:346 writes out, and
 * BUILD-RULE-B-1 recorded a deliberate decision to reject path+blob because it can under-report once
 * master moves on past a merge. THAT REASONING WEIGHED THE WRONG RISK. A path-only comparison reports
 * any branch that merely MODIFIES existing files as contained — which is what an ordinary
 * work-in-progress branch looks like — so the guard failed on the very next branch pushed after it
 * shipped, which happened to be this chain's own. A guard that fails on normal work gets disabled,
 * and R11 already says a guard that cries wolf is worse than the gap it closes.
 *
 * THE CEREMONY'S SHELL IS NOT WRONG; IT IS USED DIFFERENTLY. A person runs it on ONE branch at merge
 * time, having already decided that branch is finished. This guard runs on EVERY branch at origin,
 * continuously, including ones nobody has finished. The stronger comparison is what that difference
 * requires.
 *
 * THE COST IS STATED RATHER THAN HIDDEN: if master moves on after a merge, the merged branch's blobs
 * stop matching master's and a genuinely deletable branch goes unreported. Step 12 is owed AT the
 * merge, which is exactly when the blobs still agree — so the window this misses is the one where the
 * branch has already outlived the step that should have deleted it.
 */
function treeEntries(sha) {
  try {
    return new Set(
      execSync(`git ls-tree -r ${sha}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
        .split("\n")
        .filter(Boolean)
        // "<mode> <type> <sha>\t<path>" → "<sha>\t<path>": content AND location, ignoring mode.
        .map((l) => l.replace(/^\S+\s+\S+\s+/, "")),
    );
  } catch {
    return null;
  }
}

const argVal = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

// ── THE MODULE ONLY RUNS WHEN IT IS THE ENTRY POINT ─────────────────────────────────────────────
//
// STATED PRECISELY, because the sibling case was NOT the same. `check-fallback-agreement.mjs` had a
// LIVE defect — its test already imported it, and adding a rule that could fail took the test file
// down. THIS file had no importer at all until now: its test built the guard's path as a string and
// spawned it. So this is a precaution that Rule B MADE NECESSARY rather than a bug it exposed — the
// test now imports `KEPT_BRANCHES` to assert the keep list ships empty, and without this guard that
// import would run a NETWORK call (`git ls-remote --heads`) on every test in the file.
// Checked before changing it: the hook, CI and `verify` all SPAWN this guard; nothing else imports.
const IS_ENTRY =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (IS_ENTRY) {
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


// ── RULE B'S RUN ────────────────────────────────────────────────────────────────────────────────
const HEADS_FILE = argVal("heads-file", null); // test override, mirroring --tags-file
let heads = [];
let headsError = null;
try {
  heads = parseHeads(
    HEADS_FILE
      ? readFileSync(resolve(HEADS_FILE), "utf8")
      : execSync("git ls-remote --heads origin", { encoding: "utf8" }),
  );
} catch (e) {
  headsError = e.message;
}
// The same loud-failure rule the tag half uses: a run that cannot see origin must break the build.
// An empty head list is not "no branches" — origin always has at least the default branch.
if (headsError || heads.length === 0) {
  fail(
    `could not obtain the branch list at origin (${headsError ?? "empty result"}). ` +
      `A run that cannot see the branches must break the build, not bless it (Lesson 187).`,
  );
}

const masterHead = heads.find((h) => h.name === "master");
const masterPaths = masterHead ? treeEntries(masterHead.sha) : null;
const contained = [];
const unjudged = [];
if (masterPaths) {
  for (const h of heads) {
    if (h.name === "master" || h.name === "HEAD") continue;
    const paths = treeEntries(h.sha);
    if (!paths) {
      unjudged.push(h);
      continue;
    }
    // CONTAINED = master's tree holds every (path, blob) this branch's tree holds — the same CONTENT
    // at the same place. A branch whose work is all in master has nothing left to lose by deleting.
    let extra = 0;
    for (const p of paths) if (!masterPaths.has(p)) extra++;
    if (extra === 0) contained.push(h);
  }
}
const keptStale = KEPT_BRANCHES.filter(
  (k) => !heads.some((h) => h.name === k.name),
);
const containedUnkept = contained.filter(
  (c) => !KEPT_BRANCHES.some((k) => k.name === c.name),
);

console.log(
  `check-tags RULE B: ${heads.length} head(s) at origin; ${contained.length} whose TREE master ` +
    `already holds (${containedUnkept.length} not on the keep list); ${unjudged.length} unjudged; ` +
    `${KEPT_BRANCHES.length} deliberately kept.`,
);
// EVERY EXEMPTION IS PRINTED WHEN IT IS GRANTED (R11), exactly as the tag half prints its own.
for (const k of KEPT_BRANCHES)
  console.log(
    `  ${heads.some((h) => h.name === k.name) ? "KEPT  " : "STALE "} ${k.name} — ${k.reason}`,
  );
for (const u of unjudged)
  console.log(
    `  UNJUDGED ${u.name} — its tree is not available locally; fetch it to judge (${u.sha.slice(0, 7)})`,
  );

if (containedUnkept.length > 0) {
  console.error(
    `\nFAIL: ${containedUnkept.length} branch(es) stand at origin whose TREE master already holds:`,
  );
  for (const c of containedUnkept)
    console.error(
      `${c.name} -> ${c.sha.slice(0, 7)}  (master's tree holds every path this branch's tree holds)`,
    );
  console.error(
    `\nSHIP-CEREMONY step 12 clears these, and it is owed by EVERY merge to master rather than only` +
      `\nby a ship. Delete them: git push origin --delete <branch>. If one is kept on purpose, add it` +
      `\nto KEPT_BRANCHES in this file WITH A REASON — but TAGS.md's rule is that evidence becomes an` +
      `\nannotated tag, never a branch.`,
  );
}
if (keptStale.length > 0) {
  console.error(
    `\nFAIL: ${keptStale.length} keep-list entr(ies) name a branch that is not at origin:`,
  );
  for (const k of keptStale)
    console.error(`${k.name} — ${k.reason}`);
  console.error(
    `A keep-list entry that outlives its branch is a hole that looks like a decision. Remove it.`,
  );
}

if (
  unregistered.length > 0 ||
  declaredMissing.length > 0 ||
  containedUnkept.length > 0 ||
  keptStale.length > 0
)
  process.exit(1);
}

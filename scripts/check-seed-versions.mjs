// ============================================================
// File:        scripts/check-seed-versions.mjs
// Project:     RaceArena — SEED-REDELIVERY-1
//
// A VERSION RAISED BY HAND CAN BE FORGOTTEN, and a forgotten one means the change silently never
// arrives on any install — which is the exact failure the whole redelivery strand exists to fix,
// reintroduced one level up. This guard refuses to let that pass unnoticed.
//
// WHAT IT FAILS ON, and it is only ever these three:
//   1. A tracked seed file's CONTENT CHANGED and its unit's version in server/seeds/versions.json
//      did NOT. The change would ship and reach nobody.
//   2. A seed file belongs to NO unit, or to MORE THAN ONE. A file outside the manifest is outside
//      the version system entirely, so rule 1 could never see it — the hole would be invisible
//      rather than reported.
//   3. A unit names a file that does not exist. Delivery would silently skip it, so the operator
//      would get half a record and no sign that the other half never came.
//
// IT DOES NOT RAISE THE VERSION. Deciding to redeliver is a judgement about whether operators
// should lose their copy; a script must not make it. This only refuses silence.
//
// ── WHAT THIS GUARD CANNOT SEE, stated here rather than discovered later ──────────────────────
//
// IT IS A CONTENT CHECK, AND THAT IS ITS HONEST LIMIT. It compares seed BYTES against a base
// commit. So the case it is blind to is the important one to keep in mind: **a redelivery that
// needs to happen for a reason OUTSIDE the seed file's own bytes.** Concretely —
//   · a client default or engine change that makes an old stored record behave differently, where
//     the fix is to push the shipped record again although the record itself did not change;
//   · a background or logo that should be redelivered because the RENDERER changed, not the image;
//   · a record correct on its own terms but wrong beside a record that DID change.
// In every one of those the seed bytes are identical, this guard is silent and correct to be, and
// noticing is still on us. It closes the "changed it and forgot" hole. It cannot close "should
// have changed it and did not".
//
// Also outside it: whether the version was raised by the RIGHT amount (any increase redelivers),
// whether the CONTENT of the change is any good, and anything about the runtime side — no
// install's `.seed-versions.json` is read here.
//
// LOUD-FAILURE RULE (Lesson 187, proof-of-live): an unreadable manifest, a manifest with no units,
// or zero seed files found all FAIL. A guard that passes because it found nothing to check is
// indistinguishable from a no-op.
//
// Usage:
//   node scripts/check-seed-versions.mjs                # working tree + index against HEAD
//   node scripts/check-seed-versions.mjs --base=<ref>   # against another commit (CI, a range)
//   node scripts/check-seed-versions.mjs --declare      # routing declaration
// ============================================================

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEEDS = "server/seeds";
const MANIFEST = `${SEEDS}/versions.json`;

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
export const GUARD = {
  id: "check-seed-versions",
  covers:
    "a shipped seed record whose content changed without its version being raised, a seed file in no unit or in two, and a unit naming a file that does not exist",
  blind: [
    "a redelivery needed for a reason OUTSIDE the seed file's bytes — a client, engine or renderer change that makes an unchanged record wrong; it compares content and cannot see intent",
    "whether the version was raised by the right amount, and whether the change itself is any good",
    "the runtime side entirely — no install's recorded versions are read here",
  ],
  dirs: [`${SEEDS}/`],
  files: [MANIFEST],
  reach: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

// VERIFY-FAST-1: every guard prints its own elapsed time.
const __t0 = Date.now();
process.on("exit", () => {
  const ms = Date.now() - __t0;
  process.stderr.write(`[ra-elapsed-ms ${ms}] (${(ms / 1000).toFixed(1)}s)\n`);
});

const BASE =
  process.argv.find((a) => a.startsWith("--base="))?.slice(7) || "HEAD";

const fail = (lines) => {
  for (const l of lines) console.error(l);
  process.exit(1);
};

const git = (args, quiet = false) =>
  execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    // stderr IGNORED for the probing reads: `git show <base>:<path>` prints its own fatal when
    // the path does not exist at that commit, and that case is EXPECTED here (it is the commit
    // that introduces the manifest). Letting it through printed a red "fatal:" above a green
    // verdict, which reads like a failure and is not one.
    stdio: quiet ? ["ignore", "pipe", "ignore"] : ["ignore", "pipe", "pipe"],
  }).trim();

// ── The shipped manifest ──────────────────────────────────────────────────────────────────────

let units;
try {
  const doc = JSON.parse(readFileSync(join(ROOT, MANIFEST), "utf8"));
  units = doc?.units;
} catch (err) {
  fail([
    `FAIL: ${MANIFEST} is missing or unreadable — ${err.message}`,
    "      Every shipped record is versioned there. Without it this guard checks nothing, so it",
    "      refuses rather than passing green.",
  ]);
}
if (!units || typeof units !== "object" || !Object.keys(units).length) {
  fail([
    `FAIL: ${MANIFEST} declares no units.`,
    "      A manifest with nothing in it would let every seed change through unnoticed.",
  ]);
}

/** Which unit owns each seed file, and every file each unit claims. */
const ownerOf = new Map();
const duplicated = [];
const missingFiles = [];
for (const [unitKey, unit] of Object.entries(units)) {
  for (const rel of unit?.files ?? []) {
    const path = `${SEEDS}/${rel}`;
    if (ownerOf.has(path)) duplicated.push(`${path} (in ${ownerOf.get(path)} and ${unitKey})`);
    else ownerOf.set(path, unitKey);
    if (!existsSync(join(ROOT, path))) missingFiles.push(`${path} (claimed by ${unitKey})`);
  }
}

// ── Every seed file that actually exists ──────────────────────────────────────────────────────

const seedFiles = [];
(function walk(rel) {
  for (const name of readdirSync(join(ROOT, rel))) {
    const child = `${rel}/${name}`;
    if (statSync(join(ROOT, child)).isDirectory()) walk(child);
    else if (child !== MANIFEST) seedFiles.push(child);
  }
})(SEEDS);

if (!seedFiles.length) {
  fail([
    `FAIL: no seed files found under ${SEEDS}/.`,
    "      A guard that scanned nothing has not found nothing (Lesson 187).",
  ]);
}

const orphans = seedFiles.filter((f) => !ownerOf.has(f));

// ── Rule 1: content changed, version did not ──────────────────────────────────────────────────
//
// The comparison is against the BASE commit, defaulting to HEAD — which in a pre-commit hook is
// exactly right: the working tree plus the index is what the commit will record, and HEAD is what
// it will replace. `git diff --name-only <base>` covers staged and unstaged together.

let changed = [];
try {
  changed = git(["diff", "--name-only", BASE, "--", SEEDS])
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
} catch (err) {
  fail([
    `FAIL: could not diff ${SEEDS} against ${BASE} — ${err.message}`,
    "      Without a comparison this guard cannot answer its own question, so it refuses.",
  ]);
}

/** The version each unit carries at BASE, so "did the version move" is answerable. */
let baseUnits = {};
try {
  const raw = git(["show", `${BASE}:${MANIFEST}`], true);
  baseUnits = JSON.parse(raw)?.units ?? {};
} catch {
  // The manifest does not exist at BASE — this is the commit that introduces it. Every unit is
  // therefore new, and a new unit cannot have forgotten to raise anything.
  baseUnits = null;
}

const stale = [];
if (baseUnits) {
  const byUnit = new Map();
  for (const f of changed) {
    if (f === MANIFEST) continue;
    const owner = ownerOf.get(f);
    if (!owner) continue; // an orphan — reported by rule 2, not twice here
    if (!byUnit.has(owner)) byUnit.set(owner, []);
    byUnit.get(owner).push(f);
  }
  for (const [unitKey, files] of byUnit) {
    const now = units[unitKey]?.version;
    const before = baseUnits[unitKey]?.version;
    if (before === undefined) continue; // brand-new unit: nothing to forget
    if (!(Number.isInteger(now) && now > before)) {
      stale.push({ unitKey, before, now, files });
    }
  }
}

// ── Verdict ───────────────────────────────────────────────────────────────────────────────────

const problems = [];
if (stale.length) {
  problems.push(
    `${stale.length} unit(s) changed content without a higher version — the change would ship and reach NO existing install:`,
  );
  for (const s of stale) {
    problems.push(
      `  ${s.unitKey}: version ${s.before} -> ${s.now ?? "(absent)"} ; changed ${s.files.join(", ")}`,
    );
  }
  problems.push(
    `  FIX: raise "${stale[0].unitKey}".version in ${MANIFEST} and commit it with the change.`,
    "       If the change genuinely should NOT reach existing installs, it does not belong in a",
    "       shipped seed record — that is the decision this guard is asking you to make out loud.",
  );
}
if (orphans.length) {
  problems.push(
    `${orphans.length} seed file(s) belong to no unit, so nothing versions them:`,
    ...orphans.map((f) => `  ${f}`),
    `  FIX: add each to a unit in ${MANIFEST}.`,
  );
}
if (duplicated.length) {
  problems.push(
    `${duplicated.length} seed file(s) claimed by more than one unit — delivery order would decide the outcome:`,
    ...duplicated.map((f) => `  ${f}`),
  );
}
if (missingFiles.length) {
  problems.push(
    `${missingFiles.length} unit file(s) named in the manifest do not exist — delivery would ship half a record:`,
    ...missingFiles.map((f) => `  ${f}`),
  );
}

if (problems.length) fail(["FAIL: check-seed-versions", ...problems.map((l) => `  ${l}`)]);

console.log(
  `check-seed-versions: ${Object.keys(units).length} unit(s), ${seedFiles.length} seed file(s), ` +
    `${changed.filter((f) => f !== MANIFEST).length} changed against ${BASE}; ` +
    "0 unversioned change(s), 0 orphan(s), 0 duplicate(s), 0 missing file(s). " +
    "(Content only — it CANNOT see a redelivery that is needed for a reason outside the seed's own bytes.)",
);

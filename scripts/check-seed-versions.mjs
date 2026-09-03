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
import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEEDS = "server/seeds";
const MANIFEST = `${SEEDS}/versions.json`;

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
export const GUARD = {
  id: "check-seed-versions",
  covers:
    "a tracked file whose CONTENT changed without its record changing with it — for a shipped seed, its version in server/seeds/versions.json; for a hand-made artwork asset, its digest in the digests.json beside it (racer sheets AND track backgrounds). Plus a seed file in no unit or in two, and a unit naming a file that does not exist",
  blind: [
    "a redelivery needed for a reason OUTSIDE the seed file's bytes — a client, engine or renderer change that makes an unchanged record wrong; it compares content and cannot see intent",
    "whether the version was raised by the right amount, and whether the change itself is any good",
    "the runtime side entirely — no install's recorded versions are read here",
    "ARTWORK: whether a change was WANTED. A digest is a tripwire, not a reviewer — it refuses silence and nothing more",
    "ARTWORK: everything outside `client/public/assets/racers/`. Track backgrounds under `server/seeds/backgrounds/` ARE covered, by the seed rule rather than the digest one; the favicons and every non-image asset are covered by neither, and the inventory with costs is in ARTWORK-DIGEST-1",
    "ARTWORK: a change to a file's NAME. A renamed sheet reads as one MISSING and one NEW, which is correct but says nothing about whether the pixels moved with it",
  ],
  dirs: [
    `${SEEDS}/`,
    "client/public/assets/racers/",
    // WATCH-BACKGROUNDS-1: 21.3 MB of track backgrounds that were outside every guard's declared
    // scope. A change there now selects this guard.
    "client/public/assets/tracks/backgrounds/",
  ],
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

// ══════════════════════════════════════════════════════════════════════════════════════════════
// THE ARTWORK RULE — A HAND-MADE ASSET MAY NOT CHANGE WITHOUT ITS RECORD CHANGING WITH IT
//
// THE INCIDENT, 2026-09-03. A stray shell expansion ran `scripts/crop-sprite-sheets.mjs`. It
// overwrote NINE tracked spritesheets — horse, giraffe, snake, rocket, motorbike and its mask,
// luge, beetle, boarder — printing "Verification: OK — no border clipping" for each, and stopped
// only because a later entry's arithmetic went out of bounds. **Nothing in this repository would
// have gone red.** No guard declared `client/public/`, the five client tests that mention
// `assets/racers` all assert a URL *string*, and `render-fingerprint` cannot blit a sprite in node.
//
// ★ AND A GEOMETRY CHECK WOULD NOT HAVE CAUGHT IT. The bad run re-cropped an already-cropped sheet
// and produced the SAME frame size — horse went in 150x150 and came out 150x150. Only the PIXELS
// changed. So the registry-vs-PNG geometry rule is a different question and does not cover this
// one; the cheapest thing that catches it is a digest.
//
// WHY THIS RULE IS HERE AND NOT IN A GUARD OF ITS OWN. This guard's subject is already exactly it:
// *a tracked file whose CONTENT CHANGED without its record being raised*. It is the only guard in
// the repository with that subject, it runs everywhere (unlike `check-writable`, which is a no-op
// off Windows), and it already reads a manifest and walks a tree. Its `covers` is widened to say so
// rather than left describing only half of what it does.
//
// WHY A DIGEST HERE AND A VERSION FOR SEEDS — and the seed manifest's own argument is what settles
// it. It says a content comparison is wrong for seeds because "the moment an operator edits a
// record their copy differs from the seed", so a content check would warn forever on every used
// install. **NOTHING OF THE SORT IS TRUE OF A SPRITESHEET.** It is bundled into the client build;
// no operator has a divergent copy of it; there is nothing to redeliver. So the objection that
// rules content out for seeds does not reach here, and the digest is the honest instrument.
//
// WHAT IT CATCHES: any change to the bytes of any image under the artwork directory — an accidental
// overwrite, a truncated write, a half-finished export, a file replaced by a different one.
// WHAT IT CANNOT DO: judge whether the change was WANTED. It cannot. A digest is a tripwire, not a
// reviewer, and the only correct response to a legitimate artwork edit is to re-record — one
// command, named in the failure message, so that re-recording is never the harder path than
// deleting the rule.
// WHAT IT DOES NOT COVER: everything outside the artwork directory. Track backgrounds under
// `server/seeds/backgrounds/` are ALREADY covered by the seed rule above; the rest is inventoried
// in ARTWORK-DIGEST-1 and deliberately not extended tonight.
//
// LOUD FAILURE (Lesson 187): zero image files walked, or an unreadable record, both FAIL.
// ══════════════════════════════════════════════════════════════════════════════════════════════

// ★ TWO DIRECTORIES, ONE RULE (WATCH-BACKGROUNDS-1, 2026-09-04).
//
// The racer sheets were watched from the day this rule shipped. The six TRACK BACKGROUNDS under
// client/public — 21.3 MB — sat outside every guard's declared scope. They are covered by
// EXTENDING this rule rather than by a second one: “a tracked hand-made image changed without its
// record changing with it” is ONE question and deserves one answer. Each directory keeps its own
// digests.json beside the files it describes, so a record never travels away from what it records.
const ART_DIRS = (() => {
  const override = process.argv.find((a) => a.startsWith("--artwork-root="))?.slice(15);
  return override
    ? [override]
    : ["client/public/assets/racers", "client/public/assets/tracks/backgrounds"];
})();
const RECORD_MODE = process.argv.includes("--record-artwork");
const IS_IMAGE = /\.(png|jpe?g|webp|gif)$/i;

let artTotal = 0;
const artVerdicts = [];
for (const ART_DIR of ART_DIRS) {
  const ART_RECORD = `${ART_DIR}/digests.json`;
  const artAbs = join(ROOT, ART_DIR);
  if (!existsSync(artAbs))
    fail([
      `FAIL: the artwork directory ${ART_DIR} does not exist.`,
      "      Nothing was digested, so this rule proved nothing. See Lesson 187.",
    ]);

  const artFiles = readdirSync(artAbs)
    .filter((n) => IS_IMAGE.test(n) && statSync(join(artAbs, n)).isFile())
    .sort();

  if (artFiles.length === 0)
    fail([
      `FAIL: ZERO image files under ${ART_DIR}.`,
      "      Either the artwork moved or the extension filter stopped matching; either way this",
      "      rule cannot have compared anything. See Lesson 187.",
    ]);

  const digestOf = (name) =>
    createHash("sha256").update(readFileSync(join(artAbs, name))).digest("hex");
  const measured = Object.fromEntries(artFiles.map((n) => [n, digestOf(n)]));

  if (RECORD_MODE) {
    writeFileSync(
      join(ROOT, ART_RECORD),
      JSON.stringify(
        {
          _: [
            "THE RECORD OF WHAT THE ARTWORK IS. sha256 per file, one line each, regenerated by",
            "  node scripts/check-seed-versions.mjs --record-artwork",
            "",
            "It exists because these files are HAND-MADE and cannot be re-derived from anything,",
            "and because on 2026-09-03 nine of them were overwritten by an accidentally-run script",
            "while every check in this repository stayed green. A digest cannot tell a wanted change",
            "from an unwanted one — it only refuses silence. If you meant it, re-record and commit",
            "both.",
          ],
          files: measured,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      `check-seed-versions --record-artwork: recorded ${artFiles.length} file(s) into ${ART_RECORD}.`,
    );
    artTotal += artFiles.length;
    continue;
  }

  let recorded;
  try {
    recorded = JSON.parse(readFileSync(join(ROOT, ART_RECORD), "utf8"))?.files;
  } catch (e) {
    fail([
      `FAIL: cannot read the artwork record ${ART_RECORD} — ${e.message}`,
      "      Create it with: node scripts/check-seed-versions.mjs --record-artwork",
      "      Refusing to report the artwork unchanged against a record it could not read.",
    ]);
  }
  if (!recorded || typeof recorded !== "object" || !Object.keys(recorded).length)
    fail([
      `FAIL: ${ART_RECORD} records no files.`,
      "      A record that lists nothing cannot disagree with anything. See Lesson 187.",
    ]);

  const artChanged = artFiles.filter((n) => recorded[n] && recorded[n] !== measured[n]);
  const artNew = artFiles.filter((n) => !recorded[n]);
  const artGone = Object.keys(recorded).filter((n) => !artFiles.includes(n));

  if (artChanged.length || artNew.length || artGone.length) {
    const lines = [`FAIL: the artwork under ${ART_DIR} does not match its record.`];
    for (const n of artChanged)
      lines.push(
        `  CHANGED  ${n}  recorded ${recorded[n].slice(0, 12)}…  now ${measured[n].slice(0, 12)}…`,
      );
    for (const n of artNew) lines.push(`  NEW      ${n}  (in no record)`);
    for (const n of artGone) lines.push(`  MISSING  ${n}  (recorded, not on disk)`);
    lines.push(
      "",
      "  These files are HAND-MADE and cannot be re-derived. This rule cannot tell a wanted change",
      "  from an unwanted one — it only refuses silence.",
      "  IF YOU MEANT IT:  node scripts/check-seed-versions.mjs --record-artwork",
      "  then commit the artwork and the record together.",
      "  IF YOU DID NOT:   git checkout -- " + ART_DIR,
    );
    fail(lines);
  }

  artTotal += artFiles.length;
  artVerdicts.push(`${artFiles.length} under ${ART_DIR}`);
}

if (!RECORD_MODE)
  console.log(
    `check-seed-versions ARTWORK: ${artTotal} hand-made asset(s) match their record ` +
      `(${artVerdicts.join("; ")}); 0 changed, 0 new, 0 missing. ` +
      `(Content only — it cannot judge whether a change was wanted.)`,
  );

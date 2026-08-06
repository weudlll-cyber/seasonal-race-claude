// ============================================================
// File:        scripts/check-fingerprints.mjs
// Project:     RaceArena — ONE-TRUTH-1 stage 4
//
// THE THREE CURRENT FINGERPRINTS HAVE ONE HOME: `docs/fingerprints.json`. This guard makes every
// other statement of them a COPY that a machine writes and a machine checks.
//
// WHY: the values were typed independently in seven files. Nothing connected them, so they drifted
// exactly as you would predict — SHIP-CEREMONY carried a stale camera baseline until a block
// happened to look at it (fixed in `ebdbfe91`), and the render row was current only because the
// block that wrote it had just touched that row. A number that is corrected only where somebody
// happens to be looking is not a record.
//
// TWO DIRECTIONS, because one direction is how the verify routing stayed wrong three times:
//   RECORD -> DOCUMENT  every declared site must carry the record's value for its role.
//   DOCUMENT -> RECORD  every declared site must still EXIST, and its anchor must still be unique.
//                       A site that vanishes because prose was reworded is a silent hole otherwise:
//                       the guard would keep passing while the fact lost its last checked home.
//
// AND A THIRD — COVERAGE, which is the direction that would have caught the drift early. Any
// tracked living file that carries a CURRENT value must be a declared site or be named as history.
// A new document that starts stating the fingerprint without being wired to the record is exactly
// how the last map went stale, and it is invisible to the other two directions.
//
// A SUPERSEDED-VALUE SCAN WAS BUILT FIRST AND DISCARDED, because it is unsound here: this repo's
// living documents legitimately state old values as ABLATION TARGETS ("set to 0 -> restores
// `ded0a126048e4cdb`") and as NARRATIVE ("a camera-only diff moved this hash `b6591e74...` ->
// `1f83ecc1...`"). Those are current, true, useful claims. A guard that fails on them would have to
// allowlist the very files that matter most, which is a guard that checks nothing — Lesson 187 from
// the other side. Coverage catches the same drift class without lying about the old values.
//
// WHAT THIS GUARD DOES **NOT** DO, stated here rather than discovered later:
//   - It does not RUN the fingerprint scripts. They cost ~6 minutes wall clock between them; this
//     guard is meant to run on every doc change. It checks that the documents agree with the
//     RECORD, not that the record agrees with the ENGINE. Minting is what does the latter, and the
//     record carries the commit and date of the last mint so a reader can see how old it is.
//   - It does not check the historical values inside the lineage in SIM.md or the tag register.
//     Those are history and are allowed to be exactly what they were.
//   - It cannot tell a stale CURRENT claim from an honest historical mention inside a file it has
//     been told is history. `docs/SIM.md` holds the lineage; if the lineage's newest entry goes
//     stale, nothing here notices. That is stage 5's problem, not this guard's.
//   - It says nothing about the OTHER numbers in these documents — band-reach percentages, race
//     counts, dates. One fact class, one guard.
//
// LOUD-FAILURE RULE (Lesson 187): zero roles, zero sites, or an unreadable record all FAIL. A guard
// that passes because it found nothing to check is indistinguishable from a no-op.
//
// Usage:
//   node scripts/check-fingerprints.mjs          # check; exit 1 on any disagreement
//   node scripts/check-fingerprints.mjs --fix    # WRITE the record's values into every site
// ============================================================

const started = Date.now();

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const arg = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

// Fixture overrides, same idiom as check-index.mjs: the guard's own test drives it against a
// throwaway tree, so the sabotages are run against a real invocation rather than an imitation.
const ROOT = arg("root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_PATH = arg("record") ?? join(ROOT, "docs", "fingerprints.json");
const FIX = process.argv.includes("--fix");
const RECORD_REL = RECORD_PATH.replace(/\\/g, "/")
  .split("/")
  .slice(-2)
  .join("/");

const HEX = /[0-9a-f]{16}/;

function fail(msg) {
  console.error(`\nFAIL: ${msg}`);
  process.exitCode = 1;
}

// ── the record ────────────────────────────────────────────────────────────────────────────────
let record;
try {
  record = JSON.parse(readFileSync(RECORD_PATH, "utf8"));
} catch (e) {
  console.error(
    `FAIL: cannot read the fingerprint record at ${RECORD_REL} — ${e.message}`,
  );
  console.error(
    "That file IS the single home. Without it there is nothing to check against.",
  );
  process.exit(1);
}

const roles = record.roles ?? {};
const sites = record.sites ?? [];
const history = new Set(record.historyAllowed ?? []);

// Loud failure: an empty record must not read as a clean pass.
if (Object.keys(roles).length === 0) {
  console.error(
    "FAIL: the record declares ZERO roles. A guard with nothing to check is a no-op.",
  );
  process.exit(1);
}
if (sites.length === 0) {
  console.error(
    "FAIL: the record declares ZERO sites. Nothing would be checked. See Lesson 187.",
  );
  process.exit(1);
}
for (const [name, r] of Object.entries(roles)) {
  if (!HEX.test(r.value ?? ""))
    fail(`role "${name}" has no 16-hex value in the record.`);
  if (!r.script)
    fail(`role "${name}" does not name the script that produces it.`);
  if (!r.mintedOn)
    fail(`role "${name}" does not name the commit it was minted on.`);
  if (!r.date) fail(`role "${name}" does not carry the date it was minted.`);
}

// ── direction 1 + 2: every declared site, both ways ────────────────────────────────────────────
const fixed = [];
let checked = 0;

for (const site of sites) {
  const role = roles[site.role];
  if (!role) {
    fail(
      `site ${site.file} names role "${site.role}", which the record does not define.`,
    );
    continue;
  }
  const path = join(ROOT, site.file);
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    fail(
      `site file ${site.file} cannot be read. A declared home that does not exist is a hole.`,
    );
    continue;
  }

  // DIRECTION 2 — the anchor must still be there, and still be unambiguous. If prose is reworded
  // so the anchor no longer matches exactly once, the site stops being checkable, and this guard
  // says so instead of quietly checking nothing.
  const occurrences = text.split(site.anchor).length - 1;
  if (occurrences === 0) {
    fail(
      `site ${site.file} (${site.role}): the anchor ${JSON.stringify(site.anchor)} is GONE.\n` +
        `      The text was reworded and this fact lost its checked home. Update docs/fingerprints.json.`,
    );
    continue;
  }
  if (occurrences > 1) {
    fail(
      `site ${site.file} (${site.role}): the anchor ${JSON.stringify(site.anchor)} matches ` +
        `${occurrences} times, so it does not identify one value. Make it longer in the record.`,
    );
    continue;
  }

  const at = text.indexOf(site.anchor) + site.anchor.length;
  const found = text.slice(at, at + 16);
  checked++;

  if (found === role.value) continue;

  if (!HEX.test(found)) {
    fail(
      `site ${site.file} (${site.role}): no 16-hex value follows the anchor — found ` +
        `${JSON.stringify(found)}. The anchor must sit immediately before the value.`,
    );
    continue;
  }

  if (FIX) {
    writeFileSync(
      path,
      text.slice(0, at) + role.value + text.slice(at + 16),
      "utf8",
    );
    fixed.push(`${site.file} (${site.role}): ${found} -> ${role.value}`);
  } else {
    fail(
      `site ${site.file} (${site.role}) says ${found}, the record says ${role.value}.\n` +
        `      The record is the home. Run --fix, or re-mint and update the record.`,
    );
  }
}

// ── direction 3: COVERAGE — a current value anywhere must be a declared site or declared history ─
const declaredFiles = new Set(sites.map((s) => s.file));
const currentValues = new Map();
for (const [name, r] of Object.entries(roles)) currentValues.set(r.value, name);

const { execFileSync } = await import("node:child_process");
const { readdirSync } = await import("node:fs");

// TRACKED files only: an untracked scratch file in the working tree is not a claim the project
// makes. Under a fixture root there is no git repo, so fall back to a plain walk.
function trackedFiles() {
  try {
    return execFileSync("git", ["ls-files"], {
      cwd: ROOT,
      encoding: "utf8",
    }).split("\n");
  } catch {
    const out = [];
    const walk = (dir, prefix) => {
      for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.isDirectory()) walk(join(dir, e.name), rel);
        else out.push(rel);
      }
    };
    walk(".", "");
    return out;
  }
}
const tracked = trackedFiles()
  .filter(Boolean)
  .filter(
    (f) => /\.(md|mjs|js|json|sh|yml)$/.test(f) || f.startsWith(".husky/"),
  );

let scanned = 0;
const undeclared = [];
for (const f of tracked) {
  if (f === RECORD_REL) continue; // the record itself is the home
  if (declaredFiles.has(f)) continue;
  if (
    history.has(f) ||
    [...history].some((h) => h.endsWith("/") && f.startsWith(h))
  )
    continue;
  let t;
  try {
    t = readFileSync(join(ROOT, f), "utf8");
  } catch {
    continue;
  }
  scanned++;
  for (const [value, role] of currentValues)
    if (t.includes(value))
      undeclared.push(`${f}: states the current ${role} value ${value}`);
}
for (const u of undeclared)
  fail(
    `${u}, but it is neither a declared site nor declared history.\n` +
      `      A copy nothing checks is how the last map went stale. Add it to "sites" (so it is ` +
      `written and checked) or to "historyAllowed" (so it is knowingly frozen).`,
  );

// ── report ────────────────────────────────────────────────────────────────────────────────────
console.log(
  `check-fingerprints: ${Object.keys(roles).length} roles, ${checked}/${sites.length} sites read, ` +
    `${scanned} other tracked files scanned for undeclared copies.`,
);
if (fixed.length) {
  console.log(`  WROTE the record's values into ${fixed.length} site(s):`);
  for (const f of fixed) console.log(`    ${f}`);
}
console.log(`[ra-elapsed-ms ${Date.now() - started}]`);

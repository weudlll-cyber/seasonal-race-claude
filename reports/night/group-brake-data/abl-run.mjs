// ============================================================
// File:        abl-run.mjs
// Path:        reports/night/group-brake-data/abl-run.mjs
// Project:     RaceArena — GROUP-GAP-BRAKE-1, the ablation arm (§D(5))
// Description: Runs ABL — the owner's GROUP input, but braking ONLY the leader — by applying one
//              line to the working tree, running `group-brake-sweep.mjs --arm=ABL`, and restoring.
//
// ── ★★ WHY A PATCHED TREE AND NOT A KEY ────────────────────────────────────────────────────────
// §D says ONE key. "Brake only the leader off the group input" is an ABLATION, not a product
// option: nobody would ever ship it, and a config key for it would grow the shipped surface to
// answer a measurement question. It also must not be faked with the shipped leader-to-second arm —
// that changes the INPUT as well as the population and would answer a different question.
//
// ── ★★ WHY IT EXISTS AT ALL ────────────────────────────────────────────────────────────────────
// The first stage-1 sweep printed ABL and A65 BYTE-IDENTICAL: the arm table carried `leaderOnly`
// and `worldFor()` never read it, so the "ablation" was a second run of A65 wearing its name. This
// file is the population change made REAL and reproducible, and `group-brake-sweep.mjs` now throws
// on a leader-only arm unless this runner set RA_GROUP_BRAKE_LEADER_ONLY.
//
// ── WHAT IT CHANGES, EXACTLY ONE LINE ──────────────────────────────────────────────────────────
// `members = sel.members` -> `members = [sel.members[0]]` in `_computeGapLeaderBrake`. The input,
// the gate, the strength law, the ceiling, the window, the latch and the PROPORTIONAL fold are all
// untouched, so the arm isolates the POPULATION and nothing else. (It is sabotage 2 of
// gapBrakeGroup.test.js, which proved the change is semantic: 3 tests red.)
//
// The tree is restored in a `finally` and the restoration is VERIFIED byte-for-byte before exit.
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.RA_ROOT ?? join(HERE, "..", "..", "..");
const RP = join(ROOT, "client", "src", "modules", "racePlanner.js");

const OLD = "      members = sel.members;";
const NEW = "      members = [sel.members[0]]; // ABL (abl-run.mjs): leader-only population";

const original = readFileSync(RP, "utf8");
const hits = original.split(OLD).length - 1;
if (hits !== 1) {
  console.error(`abl-run: the patch target occurs ${hits} times, expected 1. Refusing to run.`);
  process.exit(2);
}

let code = 1;
try {
  writeFileSync(RP, original.replace(OLD, NEW));
  const passthrough = process.argv.slice(2);
  const r = spawnSync(
    process.execPath,
    [join(HERE, "group-brake-sweep.mjs"), "--arm=ABL", ...passthrough],
    { stdio: "inherit", env: { ...process.env, RA_GROUP_BRAKE_LEADER_ONLY: "1" } },
  );
  code = r.status ?? 1;
} finally {
  writeFileSync(RP, original);
  const back = readFileSync(RP, "utf8");
  if (back !== original) {
    console.error("abl-run: ★ THE TREE DID NOT RESTORE. Check racePlanner.js before doing anything else.");
    process.exit(3);
  }
  console.error("abl-run: racePlanner.js restored, verified byte-for-byte.");
}
process.exit(code);

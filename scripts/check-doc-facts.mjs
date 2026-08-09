// ============================================================
// File:        scripts/check-doc-facts.mjs
// Project:     RaceArena — MERGE-AND-GUARD-1 stage 5
//
// ONE FACT THAT LIVED IN A DOZEN DOCUMENTS, and one that could not honestly be guarded at all. This file
// is the sibling of `check-config-claims.mjs` (config values) and `check-fingerprints.mjs` (the four
// hashes); it reuses their living-doc scope and their two history mechanisms rather than inventing
// a third of either.
//
//   CHECK 1 — THE FAIRNESS THRESHOLD HAS ONE HOME: `docs/FAIRNESS.md`. It is a CRITERION, not a
//     config value, and the danger is the same: change the gate and a dozen documents keep quoting
//     the old number. The threshold is READ FROM FAIRNESS.md itself, so there is genuinely one home
//     — this guard has no opinion about what the number should be.
//
// ────────────────────────────────────────────────────────────────────────────────────────────────
// THERE IS NO CHECK 2, AND THAT IS THE MOST IMPORTANT PARAGRAPH IN THIS FILE.
//
// The brief that produced it asked for a second check: the TRACK COUNT is derivable from
// `server/seeds/tracks/*.json`, it is restated in ten documents, so guard it. I built it, ran it,
// and it has to be reported as UNBUILDABLE rather than shipped. The evidence, in two rounds:
//
//   ROUND 1 — a bare `(\d+) tracks` rule fired on nine lines and EVERY ONE was a subset used in an
//   experiment: "Gate: 400 races/arm, 4 tracks, paired seeds" · "12 frozen night-sweep cells
//   (4 tracks × 3 arms)" · "It WIDENED the gap on all three tracks". None claims how many tracks
//   the project HAS. "Correcting" any of them to ten would make a true sentence FALSE.
//
//   ROUND 2 — narrowing it to a stated TOTAL ("all N tracks") does not help, and this is the part
//   that settles it. `all four tracks` and `all 10 tracks` are THE SAME CONSTRUCTION; one means
//   "all four in this sweep" and the other "all ten in the project". The only thing that tells them
//   apart is knowing the total already — so the guard can only be quiet today, and on the day an
//   eleventh track is added it fires on BOTH the genuinely stale line AND every honest subset line.
//   It is silent when it is useless and noisy exactly when it matters.
//
// A guard that blames the document teaches the next person to damage the document (Lesson 206), and
// CONFIG-TRUTH-1 came one edit from doing that to a true sentence about test coverage. So the count
// is NOT guarded. What was done instead is smaller and safe: the handful of sentences that describe
// what a HARNESS does *now* were rewritten count-free ("across every standard track"), so they
// cannot go stale at all. Measurements, ratios and records keep their numbers.
//
// IF A TRACK IS EVER ADDED, the phrase to grep for is `10 tracks` / `ten tracks`, and a human has to
// read each hit. That is the honest cost of not having this check, and it is stated so nobody
// assumes coverage that does not exist.
//
// THE RULE THAT FOLLOWS FROM ALL OF THIS, written where it will be read: **if a guard disagrees
// with a sentence, the guard is the first suspect.** docs/VERIFY-RULES.md R11.
// ────────────────────────────────────────────────────────────────────────────────────────────────
//
// WHAT THIS GUARD DOES **NOT** CHECK, stated here rather than discovered later:
//   - **Whether FAIRNESS.md is RIGHT.** It is the home by declaration, not by proof. If the gate
//     moves and FAIRNESS.md is not updated, this guard enforces the stale number everywhere.
//   - **A threshold written in words** — "at least seven racers in ten" is invisible.
//   - **Any other criterion.** Holm-unfairness, the parade cap, the runaway cap and the duration
//     sanity rule are all restated in several documents and are NOT covered. Only the band-reach
//     threshold is.
//   - **THE TRACK COUNT, AT ALL.** Not narrowed — absent, for the reason above.
//   - **Counts of anything else** — racer types, camera states, guards, tests. Not covered.
//   - **Dated lines and self-declared HISTORICAL documents**, which are exempt:
//     a measurement is allowed to record the world it was taken in.
//
// LOUD-FAILURE RULE (Lesson 187): if the threshold cannot be read from FAIRNESS.md, or if zero
// documents are scanned, this FAILS. A guard that passes because it found
// nothing to check is a no-op.
//
// Usage:
//   node scripts/check-doc-facts.mjs               # the threshold check
//   node scripts/check-doc-facts.mjs --inventory   # list every hit and every exempted line, exit 0
//   node scripts/check-doc-facts.mjs --root=<dir>  # scan a fixture (used by its test)
// ============================================================

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "check-doc-facts",
  covers: "a stated fact in a living doc that the repository contradicts",
  blind: ["facts nobody wrote down", "anything outside docs/"],
  dirs: ["docs/"],
  files: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const started = Date.now();

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const argOf = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

const ROOT =
  argOf("root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY = process.argv.includes("--inventory");

const FAIRNESS_HOME = "docs/FAIRNESS.md";

// Same living-doc predicate as check-doc-links.mjs and check-config-claims.mjs. Reused, not re-made.
const isLivingDoc = (f) => {
  if (f.includes("node_modules/") || f.includes("/dist/")) return false;
  if (f.startsWith("docs/")) return true;
  if (!f.includes("/")) return true;
  return false;
};

// Both history mechanisms, identical to check-config-claims.mjs.
const HISTORICAL_MARK =
  /<!--\s*HISTORICAL:\s*(\d{4}-\d{2}-\d{2})\s*[—-]\s*(.+?)-->/;
const DATED = /\d{4}-\d{2}-\d{2}/;

// Named exceptions, with reasons — never a pattern.
const EXCEPT = new Map([
  [
    "docs/TAGS.md",
    "the tag register: a tag's row records the gate and the world as they were when it was cut.",
  ],
  [
    "docs/AUDIT.md",
    "the append-only audit log; every entry records its own date's criteria.",
  ],
]);

// WHERE THE GUARD YIELDS, and this list is the point of stage 5(d) rather than an embarrassment.
//
// Two sentences in this repository are ABOUT the threshold: they exist to say that a hard gate is a
// coin-flip for tracks whose band sits right at it. In both, the number is the SUBJECT —
//
//   "A hard 'band-reach ≥70% per track on ONE 50-race run' gate is a coin-flip for tracks whose
//    band sits near 70% (mid-field B3 does on several tracks: seed variance ≈ ±1.5–2.5pp)"
//
// — and the second 70% is a MEASURED value that happens to coincide with the gate. Rewriting either
// to satisfy this guard would destroy the point it exists to make. So the GUARD yields, by name,
// with its reason, and the sentences stand untouched. If a guard disagrees with a sentence, the
// guard is the first suspect (docs/VERIFY-RULES.md R11).
//
// Keyed on a distinctive fragment rather than a line number so an edit elsewhere in the file cannot
// silently move the exemption onto a different sentence.
const YIELDS = [
  {
    file: "docs/SIM.md",
    contains: "Gate methodology",
    why: "the paragraph's subject IS the hazard of a hard threshold; quoting the rule is the point",
  },
  {
    file: "docs/LESSONS.md",
    contains: "produced a RED that did not survive proper measurement",
    why: "Lesson 158 is about a threshold that measurements sit on top of; the number is the subject",
  },
];

let failures = 0;
const fail = (msg) => {
  console.error(`\nFAIL: ${msg}`);
  failures++;
  process.exitCode = 1;
};

// ── the fact, read from its ONE source ───────────────────────────────────────
let threshold;
try {
  const home = readFileSync(join(ROOT, FAIRNESS_HOME), "utf8");
  const m = home.match(/band-reach\s*(?:≥|>=)\s*(\d+(?:\.\d+)?)\s*%/);
  if (!m) throw new Error("no `band-reach ≥ N%` statement found in it");
  threshold = m[1];
} catch (e) {
  console.error(
    `FAIL: cannot read the fairness threshold from ${FAIRNESS_HOME} — ${e.message}\n` +
      `      That file IS the single home for it. Without it there is nothing to check against.`,
  );
  process.exit(1);
}

// ── what a violation looks like ───────────────────────────────────────────────
// CHECK 1: the band-reach threshold quoted with a comparison. Narrow on purpose — a MEASURED
// percentage ("both arms sit at ~66% band-reach") carries a different number and never matches.
const thresholdRe = new RegExp(
  String.raw`(?:≥|>=|<|at least|below the|under the|minimum of)\s*~?\s*${threshold}\s*(?:%|\s*percent)` +
    String.raw`|${threshold}\s*%\s*(?:floor|gate|minimum|threshold)`,
  "i",
);
const bandReachRe = /band[- ]reach/i;

const tracked = execFileSync("git", ["ls-files", "*.md"], {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

let scanned = 0;
const hits = { threshold: [] };
const exempt = [];

for (const f of tracked) {
  if (!isLivingDoc(f) || EXCEPT.has(f)) continue;
  let text;
  try {
    text = readFileSync(join(ROOT, f), "utf8");
  } catch {
    continue;
  }
  scanned++;
  if (HISTORICAL_MARK.test(text)) {
    exempt.push({ file: f, why: "self-declared HISTORICAL" });
    continue;
  }

  text.split("\n").forEach((line, i) => {
    const clean = line.replace(/[`*_]/g, "");
    const dated = DATED.test(clean);
    const at = { file: f, line: i + 1, text: line.trim().slice(0, 130), dated };

    // CHECK 1
    if (
      f !== FAIRNESS_HOME &&
      bandReachRe.test(clean) &&
      thresholdRe.test(clean)
    ) {
      const yielded = YIELDS.find(
        (y) => y.file === f && clean.includes(y.contains),
      );
      if (yielded) exempt.push({ ...at, why: `guard yields — ${yielded.why}` });
      else if (dated) exempt.push({ ...at, why: "dated line" });
      else hits.threshold.push(at);
    }

    // CHECK 2
  });
}

if (scanned === 0) {
  console.error(
    "FAIL: scanned ZERO living documents. The guard cannot have proved anything. See Lesson 187.",
  );
  process.exit(1);
}

// ── verdict ───────────────────────────────────────────────────────────────────
if (INVENTORY) {
  console.log(
    `doc-facts INVENTORY — threshold ${threshold}% (from ${FAIRNESS_HOME})\n`,
  );
  for (const h of hits.threshold)
    console.log(`[THRESHOLD] ${h.file}:${h.line}\n    ${h.text}`);
  for (const e of exempt)
    console.log(`[EXEMPT ${e.why}] ${e.file}${e.line ? ":" + e.line : ""}`);
  console.log(`\n[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(0);
}

for (const h of hits.threshold)
  fail(
    `${h.file}:${h.line} states the fairness threshold, which lives in ${FAIRNESS_HOME}.\n` +
      `      ${h.text}\n` +
      `      Name the gate and link to ${FAIRNESS_HOME}; do not restate the number. If this sentence\n` +
      `      MEASURES against the gate rather than defining it, say so without the threshold ("cleared\n` +
      `      the gate", "below the floor") — and if that would make a true sentence false, FIX THIS\n` +
      `      GUARD INSTEAD (docs/VERIFY-RULES.md R11). Dating the line also exempts it.`,
  );

console.log(
  `check-doc-facts: threshold ${threshold}% restated in ${hits.threshold.length} place(s) outside ${FAIRNESS_HOME}. ` +
    `${scanned} living document(s), ${exempt.length} exemption(s). ` +
    `(It does NOT check that FAIRNESS.md is right, thresholds written in words, any OTHER criterion, ` +
    `or THE TRACK COUNT AT ALL — see the header for why that is deliberate.)`,
);

// EVERY YIELD IS PRINTED, ALWAYS. A place where the guard decided not to apply is a DECISION, and a
// decision nobody can see is indistinguishable from a guard that is not working — the same reason
// `verify` prints its skips as loudly as its runs. Dated lines and HISTORICAL documents are counted
// above rather than listed, because they carry their own signal in the document; a yield does not.
for (const e of exempt.filter((x) => x.why.startsWith("guard yields")))
  console.log(
    `  ${e.why.replace("guard yields — ", "yielded at ")} — ${e.file}:${e.line}`,
  );
console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
if (failures > 0) process.exit(1);

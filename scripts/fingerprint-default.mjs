// ============================================================
// fingerprint-default.mjs — DEFAULT-BEHAVIOUR BYTE-IDENTITY FINGERPRINT (the pulk-cleanup standard).
//
// WHAT IT PROVES: that a change left the SHIPPED default game byte-identical. It runs the headless
// sim on the default config (no mechanism flags → shipped defaults) across the 10 standard tracks
// with a fixed seed and hashes the full per-race results (finish order + final positions). If the
// combined hash is unchanged before vs after a change, the default behaviour is provably unchanged.
//
// STANDING TOOL: this is the ONE comparison used by every stage of THE GREAT PULK CLEANUP (Stages
// 1–5). Do not re-implement per stage — run this before and after and compare the two hashes.
//
// METHOD (fixed, do not vary between stages):
//   • 10 standard tracks × their default racer, --seed=1 --races=3 --track-defaults → per-race seeds {1,2,3}
//     per track (the sim derives race i as (seed-1)*races + i + 1).
//   • DEFAULT config: no mechanism flags are passed, so the shipped defaults.js world is used.
//   • Artifact: SHA-256 over canonicalized rawData — rows sorted by (raceIdx, index), object keys
//     sorted (order-independent) — combined across tracks in the fixed order below.
//   • Also prints the live pulkBias telemetry (planBiasDeltaMean / pulkBiasEventCount) per track,
//     the Scope-B gate for stages that touch the re-roll sampler.
//
// READ-ONLY: imports nothing from the behavioural source; it only spawns the sim CLI and hashes the
// JSON it writes. Adding/running it cannot change any race outcome.
//
// RULE (binding): the fingerprint hashes BEHAVIOUR, so lint/reformat cannot move it. Compute it
// exactly ONCE per world, on the FINAL COMMITTED state, after lint and commit. No pre-change and no
// intermediate measurements in any report. See docs/SIM.md -> Fingerprint rule.
//
// WHAT THIS FINGERPRINT DOES **NOT** COVER, stated so nobody over-trusts a green hash:
//   - Anything the CAMERA decides, and anything DRAWN. Those are the camera and render
//     fingerprints; this one stops at the race outcome.
//   - Configs other than the shipped default. It proves the DEFAULT world is unchanged; a change
//     that only moves a non-default arm passes here.
//   - Seeds other than seed=1 x 3 races per track. A defect that needs a fourth race to appear is
//     outside the sample.
//   - Timing, performance and frame pacing. It hashes outcomes, not how long they took.
//   - Any track not in the fixed ten-track list below.
//
// Usage: node scripts/fingerprint-default.mjs [label]     (label only names the temp out dir)
//        node scripts/fingerprint-default.mjs off --gapRerollEnabled=false   (the OFF invariant)
//
//   THIS FILE STATES NO HASH, AND THAT IS THE POINT (ONE-TRUTH-2, applied here 2026-08-18).
//     • the CURRENT values — docs/fingerprints.json, the one home
//     • the LINEAGE, which change moved which value to which — docs/SIM.md
//   Until tonight a table stood here listing eight worlds and marking the LAST ONE `← current`.
//   It had been wrong since 2026-07-31: `6fdfe851dbb4ca72` was superseded by the speed-150 flip,
//   then twice more, while the marker stayed. Nothing could catch it — `check-config-claims` reads
//   only `*.md`, and `fingerprint-containment` declares SUPERSEDED values as its blind spot
//   precisely so a document may quote history. A stale hash labelled `current` in the header of the
//   script that MINTS the hash is the one place that blindness costs something, and this comment is
//   the fix rather than a ninth row.
//
//   (OFF = extra arg `--gapRerollEnabled=false`. The method moved twice and both are lineage, not
//    hashes: at step 2a — D-GRID — and at the speed/duration ship, where the shipped race became
//    each track's canonical default (laps for closed, seconds for open) at ONE normal speed and the
//    invocation switched --dur=60 → --track-defaults.)
// ============================================================

// VERIFY-FAST-1: every guard prints its own elapsed time. The ceremony's cost column was wrong
// in BOTH directions (camera claimed ~85 s and costs 47; render claimed ~30 s and costs 15) and
// nothing checked it. A number the script measures itself cannot go stale.
// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "world-fingerprint",
  covers:
    "the shipped RACE: physics, plan and outcome, hashed across ten tracks",
  blind: [
    "anything the CAMERA decides and anything DRAWN — those are the camera and render fingerprints",
    "configs other than the shipped default, and seeds outside its fixed sample",
    "timing and frame pacing: it hashes outcomes, not how long they took",
  ],
  dirs: [],
  files: [],
  reach: ["client/src/modules/raceCore.js", "scripts/sim-fairness.mjs"],
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
import { execFile } from "child_process";
import { checkAgainstRecord } from "./lib/fingerprintCheck.mjs";
import {
  isCheap,
  cheapTracks,
  cheapBanner,
  cheapHash,
  refuseCheapQuiet,
} from "./lib/cheapMode.mjs";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { tmpdir, cpus } from "os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Scratch off the (OneDrive-synced) repo tree by default; env-overridable. Matches sim-fairness.mjs.
const SCRATCH =
  process.env.RA_SCRATCH_DIR || join(tmpdir(), "racearena-scratch");
// FP-COMPARE-1 adds `--check` to the same exception `--cheap` already has: it is not a sim flag, it
// never reaches the sim, and it only decides whether the measured hash is COMPARED to the record
// afterwards. Without this it lands in the label position and the refusal below fires — correctly,
// but on a flag that is legitimate here.
const NON_SIM_FLAGS = new Set(["--cheap", "--check"]);
const LABEL =
  process.argv[2] && !NON_SIM_FLAGS.has(process.argv[2])
    ? process.argv[2]
    : "run";

// A FLAG IN THE LABEL POSITION IS ALWAYS A MISTAKE, and it used to be a SILENT one (ONE-TRUTH-2).
// `argv[2]` is the label and EXTRA starts at `argv[3]`, so
//   node scripts/fingerprint-default.mjs --gapRerollEnabled=false
// consumed the flag AS the label, passed nothing to the sim, printed "default config", and returned
// the shipped-default hash — a completely legitimate-looking answer to a question nobody asked. It
// cost this block a wrong `reproduce` command in the fingerprint record, written on the strength of
// that output. Nobody wants a temp directory named `--gapRerollEnabled=false`, so refusing loses no
// legitimate use.
// VERIFY-COST-2: --cheap is the ONE flag allowed in the label position, because it is not a sim
// flag and never reaches the sim — it reduces the TRACK SET. It is stripped before the guard
// below and before EXTRA, so it cannot be swallowed as a label the way --gapRerollEnabled once was.
refuseCheapQuiet();
const CHEAP = isCheap();
const ARGV = process.argv.filter(
  (a) => !NON_SIM_FLAGS.has(a) && !a.startsWith("--cheap-track="),
);
if (ARGV[2]?.startsWith("--")) {
  console.error(
    `FAIL: "${process.argv[2]}" looks like a flag, but it is in the LABEL position.\n` +
      "       argv[2] is a label (it only names the temp output dir); sim flags start at argv[3].\n" +
      `       You almost certainly meant:  node scripts/fingerprint-default.mjs off ${process.argv.slice(2).join(" ")}\n` +
      "       Refusing rather than silently measuring the DEFAULT world and printing a hash that looks right.",
  );
  process.exit(2);
}
// Any further argv entries are passed straight through to the sim. Needed since a mechanism can now
// ship ON by default: `node scripts/fingerprint-default.mjs off --gapRerollEnabled=false` measures the
// pre-feature world. With no extra args this is exactly the shipped-default fingerprint, as before.
const EXTRA = ARGV.slice(3).filter((a) => a.startsWith("--"));
const SEED = 1,
  RACES = 3;
// ── 10 standard tracks × THEIR OWN DEFAULT RACER, READ FROM THE SHIPPED SEED ────────────────────
//
// THE PAIRING IS NO LONGER WRITTEN DOWN HERE, and that is the repair rather than a tidy-up.
//
// This was a literal table under a comment saying "10 standard tracks × default racer". The comment
// was TRUE when it was written and false from 2026-08-25, when GARDEN-PATH-DEFAULTS-1 changed that
// track's `defaultRacerTypeId` from `snail` to `beetle` in `server/seeds/tracks/garden-path.json`
// and nothing here followed. For eight days the project's primary change-detector for the RACE ran a
// snail on a track the product runs with a beetle — so one of its ten tracks did not cover the
// shipped race at all, while the combined hash carried on looking authoritative.
//
// SWAPPING snail FOR beetle WOULD HAVE REPRODUCED THE DEFECT the next time a default moves. The
// premise — "these are the track defaults" — is what has to stop being a claim and start being a
// read. The seed file is the one home for a track's default racer (`server/data/**` is a gitignored
// runtime dir and is not a source), so the instrument asks it, every run.
//
// THE ORDER IS STILL FIXED and still matters: it feeds the combined hash, so the track ids are
// listed here and sorted, and only the RACER half is resolved. A track added to the seeds does not
// silently join this instrument — that would move the hash without anyone deciding to.
const TRACK_IDS = [
  "city-circuit",
  "dirt-oval",
  "garden-path",
  "ice-track",
  "luger-hill",
  "mountainstreet",
  "river-run",
  "searound",
  "seatrack",
  "space-sprint",
];
const TRACKS = TRACK_IDS.map((id) => {
  const seedPath = join(ROOT, "server", "seeds", "tracks", `${id}.json`);
  let racer;
  try {
    racer = JSON.parse(readFileSync(seedPath, "utf8"))?.defaultRacerTypeId;
  } catch (e) {
    throw new Error(
      `fingerprint-default: cannot read ${seedPath} — the track defaults are read from the shipped ` +
        `seeds and a missing one cannot be guessed. ${e.message}`,
    );
  }
  if (typeof racer !== "string" || !racer) {
    // LOUD, never a fallback. A silent default here would put this instrument back to racing a racer
    // nobody chose, which is the exact defect being repaired.
    throw new Error(
      `fingerprint-default: ${id}.json has no defaultRacerTypeId. This instrument runs each track's ` +
        `OWN default and will not substitute one.`,
    );
  }
  return [id, racer];
});

// Stable stringify: sort object keys recursively so key order never affects the hash.
function canon(v) {
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (v && typeof v === "object")
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canon(v[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(v);
}

if (EXTRA.length) console.log("extra sim args:", EXTRA.join(" "));
// VERIFY-COST-1: the ten tracks run IN PARALLEL. This cannot move the hash, and the reason is
// structural rather than hopeful: each track was already an isolated child process with its own
// `--out` directory and its own fixed seed, and the combining loop below still walks `TRACKS` in
// the same fixed order. Nothing is shared, nothing is ordered by completion. Verified anyway — the
// acceptance for this change was a byte-identical `COMBINED`, not an argument.
//
// The cap is the machine's cores, because these are CPU-bound simulations: oversubscribing turns
// ten fast runs into ten slow ones and would have made the change look worthless.
const RUN_TRACKS = CHEAP ? cheapTracks(TRACKS, (t) => t[0]) : TRACKS;
if (CHEAP)
  console.log(
    cheapBanner(
      "world",
      `One track (${RUN_TRACKS[0][0]}) of ${TRACKS.length}.`,
    ),
  );
const JOBS = Math.max(1, Math.min(RUN_TRACKS.length, cpus().length));
const runOne = ([track, racer]) => {
  const out = join(SCRATCH, "fp", `${LABEL}__${track}`);
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [
        "scripts/sim-fairness.mjs",
        `--track=${track}`,
        `--racer=${racer}`,
        `--seed=${SEED}`,
        `--races=${RACES}`,
        "--track-defaults",
        `--out=${out}`,
        ...EXTRA,
      ],
      { cwd: ROOT, maxBuffer: 1 << 26 },
      (err) =>
        err ? reject(new Error(`${track}: ${err.message}`)) : resolve(out),
    );
  });
};

// A simple worker pool: `JOBS` in flight, next track picked up as a slot frees.
const queue = [...RUN_TRACKS];
const outputs = new Map();
await Promise.all(
  Array.from({ length: JOBS }, async () => {
    for (;;) {
      const item = queue.shift();
      if (!item) return;
      outputs.set(item[0], await runOne(item));
    }
  }),
);

const combined = createHash("sha256");
const perTrack = [];
for (const [track] of RUN_TRACKS) {
  const out = outputs.get(track);
  const d = JSON.parse(readFileSync(join(out, "fairness-data.json"), "utf8"));
  const rows = [...d.rawData].sort(
    (a, b) => a.raceIdx - b.raceIdx || a.index - b.index,
  );
  const rawStr = canon(rows);
  combined.update(track + ":" + rawStr);
  const bias = (d.results || []).map((r) => ({
    planBiasDeltaMean: r.avgNaturalness?.planBiasDeltaMean ?? null,
    pulkBiasEventCount: r.avgNaturalness?.pulkBiasEventCount ?? null,
  }));
  perTrack.push({
    track,
    rows: rows.length,
    hash: createHash("sha256").update(rawStr).digest("hex").slice(0, 12),
    bias,
  });
}
// Prefixed under --cheap so a one-track hash cannot impersonate the fingerprint.
const combinedHash = CHEAP
  ? cheapHash(combined.digest("hex"))
  : combined.digest("hex").slice(0, 16);
console.log(
  "COMBINED",
  combinedHash,
  `(seed=${SEED} races=${RACES} track-defaults, ${RUN_TRACKS.length} tracks, default config)`,
);
for (const t of perTrack)
  console.log(" ", t.track.padEnd(15), t.hash, "bias", JSON.stringify(t.bias));

// ── --check: COMPARE AGAINST THE RECORD, DO NOT MERELY PRINT (FP-COMPARE-1) ─────────────────────
//
// THIS GUARD MEASURED AND DID NOT CHECK, and it cost a day. On 2026-08-14 a renamed column moved
// this hash off its recorded value; `npm run verify` ran the world fingerprint, PRINTED the new
// number, and reported PASS 13 FAIL 0. CI was green. The defect reached master and was found only
// because a later audit happened to read the value. (The two hashes are deliberately NOT written
// here — ONE-TRUTH-1: `docs/fingerprints.json` is the only home, and check-fingerprints enforces it.
// See reports/evolution/SOLLRANK-KEY-1.md for the incident.)
//
// An instrument that emits a value nobody compares is not a guard. It is a log line.
//
// WHY IT COMPARES AGAINST THE RECORD RATHER THAN A CONSTANT: `docs/fingerprints.json` is the one
// home (ONE-TRUTH-1), so this reads the same file `check-fingerprints.mjs` does and cannot drift
// from it.
//
// A FAILURE HERE IS NOT ALWAYS A BUG. A ship that deliberately moves the world SHOULD fail this
// until the value is minted — that is the ceremony working, and the message says so rather than
// implying something is broken.
if (process.argv.includes("--check")) {
  // FP-COMPARE-2: the comparison moved to scripts/lib/fingerprintCheck.mjs so all three instruments
  // share ONE implementation. This block used to hold it inline; camera and render had none at all,
  // and pasting this one into them would have made three copies of a single comparison.
  checkAgainstRecord({
    role: LABEL === "off" ? "world-off" : "world",
    label: "WORLD",
    measured: combinedHash,
    cheap: CHEAP,
    root: ROOT,
    localise:
      "start from the per-track hashes above, which localise which track moved.",
  });
}
if (CHEAP)
  console.log(
    cheapBanner(
      "world",
      `One track (${RUN_TRACKS[0][0]}) of ${TRACKS.length}.`,
    ),
  );

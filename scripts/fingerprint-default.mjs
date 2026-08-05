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
//   Reference hashes (shipped-default byte-identity):
//     Stage-1 AFTER:                        fa4e3796e1e5f1a5 (historical)
//     Parity step 1 (RNG isolation):        ON e93ffa70dad562a1  OFF 72c3360fb75225ef
//     Parity step 2a (plan-grid unified):   ON 0ecca5e2dbe6526e  OFF 6e01e472b7655b9a
//     Speed/duration ship (canonical model):ON e80f78a0da6a9993  OFF 1cd6c9fdd62542a4
//     Type-multiplier amendment (pace=V*M):ON eda28d614f5e47d9  OFF 83eec6cf5c8b0419
//     Step-order alignment (sim runs step):ON 8b13ccbe96992cc0  OFF e07150f936361a73
//     Speed-150 ship (owner pace pick):    ON 6fdfe851dbb4ca72  OFF f8f7d9c2fd3283e9  ← current
//   (OFF = extra arg `--gapRerollEnabled=false`. Numbers MOVED at step 2a — D-GRID — and again at
//    the speed/duration ship: the shipped race is now each track's canonical default (laps for
//    closed, seconds for open) at ONE normal speed, and the method switched --dur=60 → --track-defaults.)
// ============================================================

// VERIFY-FAST-1: every guard prints its own elapsed time. The ceremony's cost column was wrong
// in BOTH directions (camera claimed ~85 s and costs 47; render claimed ~30 s and costs 15) and
// nothing checked it. A number the script measures itself cannot go stale.
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
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { tmpdir, cpus } from "os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Scratch off the (OneDrive-synced) repo tree by default; env-overridable. Matches sim-fairness.mjs.
const SCRATCH =
  process.env.RA_SCRATCH_DIR || join(tmpdir(), "racearena-scratch");
const LABEL = process.argv[2] || "run";
// Any further argv entries are passed straight through to the sim. Needed since a mechanism can now
// ship ON by default: `node scripts/fingerprint-default.mjs off --gapRerollEnabled=false` measures the
// pre-feature world. With no extra args this is exactly the shipped-default fingerprint, as before.
const EXTRA = process.argv.slice(3).filter((a) => a.startsWith("--"));
const SEED = 1,
  RACES = 3;
// 10 standard tracks × default racer (fixed order — never reorder; it feeds the combined hash).
const TRACKS = [
  ["city-circuit", "motorbike"],
  ["dirt-oval", "horse"],
  ["garden-path", "snail"],
  ["ice-track", "snowmobile"],
  ["luger-hill", "luge"],
  ["mountainstreet", "boarder"],
  ["river-run", "duck"],
  ["searound", "manta"],
  ["seatrack", "dolphin"],
  ["space-sprint", "rocket"],
];

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
const JOBS = Math.max(1, Math.min(TRACKS.length, cpus().length));
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
const queue = [...TRACKS];
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
for (const [track] of TRACKS) {
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
const combinedHash = combined.digest("hex").slice(0, 16);
console.log(
  "COMBINED",
  combinedHash,
  `(seed=${SEED} races=${RACES} track-defaults, ${TRACKS.length} tracks, default config)`,
);
for (const t of perTrack)
  console.log(" ", t.track.padEnd(15), t.hash, "bias", JSON.stringify(t.bias));

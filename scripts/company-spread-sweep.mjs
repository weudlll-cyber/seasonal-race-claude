// ============================================================
// File:        scripts/company-spread-sweep.mjs
// Project:     RaceArena — SPREAD-FIELD-SWEEP
//
// THE DEBT THIS PAYS. `minRacersVisible` shipped at 5 on the owner's eye, and the comment in
// defaults.js still owed the measurement that would have supported it. The old 3-beats-5 numbers
// were taken on a PACKED field — but the company guarantee is a statement about fitting N racers in
// frame, so it can only BIND when the field is strung out. The packed case is the one where it has
// nothing to do. MIN-RACERS-5 measured one seed per track over a whole race and said so.
//
// WHAT THIS ADDS to `company-bind-truth.mjs`, which it deliberately does not replace:
//   1. SPREAD CONDITIONING. Every frame is tagged with the field's t-spread (max t − min t over
//      unfinished racers, in laps), the frames are ranked, and the results are reported per TERCILE.
//      The top tercile is the spread field; the bottom is the pack. That split is the whole point.
//   2. Several seeds and several FIELD SIZES, because the guarantee's reach is a function of how
//      many racers there are to keep in frame.
//
// READ-ONLY. It reads `CameraDirector._framingProbe`, which the camera writes every frame and reads
// never. No engine file is edited and nothing here can move a fingerprint. CHANGES NO VALUE: the arms
// are passed as camera config to the harness, exactly as company-bind-truth does.
//
// Usage:
//   node scripts/company-spread-sweep.mjs
//   node scripts/company-spread-sweep.mjs --tracks=garden-path --racers=40 --seeds=5601
// ============================================================

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
} from "./lib/raceDriver.mjs";
import { DEFAULT_CAMERA_CONFIG } from "../client/src/modules/storage/defaults.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

// THE FIVE WHERE IT BINDS, from MIN-RACERS-5's one-seed table. The other five are confirmed once by
// --tracks, not swept: they were 0.0 % because something else already holds the shot wider.
const TRACKS = (
  arg("tracks", "city-circuit,ice-track,dirt-oval,space-sprint,garden-path") ||
  ""
)
  .split(",")
  .filter(Boolean);
const RACER_COUNTS = (arg("racers", "20,40,70") || "").split(",").map(Number);
const SEEDS = (arg("seeds", "5601,5602,5603") || "").split(",").map(Number);
// 1 disables the guarantee (`<= 1` short-circuits the ceiling to Infinity) — the control arm.
const ARMS = (arg("arms", "1,3,5") || "").split(",").map(Number);
const JSON_OUT = arg("json", "");
const CW = 1280;
const CH = 720;

const pct = (s, p) =>
  s[Math.min(s.length - 1, Math.floor(((s.length - 1) * p) / 100))];

/** How strung out the field is, in laps: max t − min t over racers still running. */
function tSpread(racers) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of racers) {
    if (r.finished) continue;
    if (r.t < lo) lo = r.t;
    if (r.t > hi) hi = r.t;
  }
  return hi >= lo ? hi - lo : 0;
}

function runArm(geo, minRacersVisible, racers, seed) {
  const identity = resolveIdentity({
    racers,
    raceSeed: seed,
    racerType: "track-default",
    seconds: 60,
    canvasW: CW,
    canvasH: CH,
    note: `SPREAD-FIELD-SWEEP minRacersVisible=${minRacersVisible}`,
  });
  const cameraConfig = structuredClone(DEFAULT_CAMERA_CONFIG);
  cameraConfig.minRacersVisible = minRacersVisible;
  const race = buildRace(geo, identity, cameraConfig);

  const zoom = [];
  const spread = [];
  let capped = 0;

  runRace(race, identity, cameraConfig, ({ cd, st }) => {
    const p = cd._framingProbe;
    if (!p) return;
    zoom.push(p.guaranteed);
    spread.push(tSpread(st.racers));
    if (p.guaranteed < p.stateZoom) capped++;
  });

  const sorted = [...zoom].sort((a, b) => a - b);
  return {
    minRacersVisible,
    frames: zoom.length,
    cappedPct: zoom.length ? (100 * capped) / zoom.length : 0,
    zoomP5: pct(sorted, 5),
    zoomMed: pct(sorted, 50),
    zoomP95: pct(sorted, 95),
    zoom,
    spread,
  };
}

/**
 * The share of frames this arm changed versus the OFF arm, split by how strung out the field was.
 *
 * Frames are ranked by t-spread and cut into thirds. PACK is the tightest third, SPREAD the loosest.
 * Ranking rather than an absolute threshold, because "spread" means something different on a 4 773 px
 * lap than on a 19 772 px one and a fixed cut would compare the two tracks on different questions.
 */
function splitBySpread(arm, off) {
  const n = Math.min(arm.zoom.length, off.zoom.length);
  const idx = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => arm.spread[a] - arm.spread[b],
  );
  const cut = Math.floor(n / 3);
  const band = (from, to) => {
    let changed = 0;
    let widest = 1;
    for (let k = from; k < to; k++) {
      const i = idx[k];
      const a = arm.zoom[i];
      const b = off.zoom[i];
      // SAME TWO COMPARISONS AS company-bind-truth.mjs, deliberately copied rather than improved:
      // an epsilon for "changed", and the ratio b/a for "widest" because a SMALLER `guaranteed` is a
      // WIDER shot. I had it inverted first and the two harnesses disagreed on the same race, which
      // is the only reason this is spelled out here.
      if (Math.abs(a - b) > 1e-9) changed++;
      if (b > 0 && a > 0 && b / a > widest) widest = b / a;
    }
    const size = to - from;
    return {
      changedPct: size ? (100 * changed) / size : 0,
      widest,
      medSpread: size ? arm.spread[idx[Math.floor((from + to) / 2)]] : 0,
    };
  };
  return {
    all: band(0, n),
    pack: band(0, cut),
    mid: band(cut, 2 * cut),
    spread: band(2 * cut, n),
  };
}

// `loadTracks({only})` matches ONE exact id — it is not a list. Passing a comma-joined string
// matched nothing, and the first run of this script printed a header, wrote an empty JSON file and
// exited 0. That is the shape VERIFY-BASE-1 exists to forbid, so it refuses instead.
const geos = loadTracks().filter((g) => TRACKS.includes(g.id));
if (geos.length !== TRACKS.length) {
  const missing = TRACKS.filter((t) => !geos.some((g) => g.id === t));
  console.error(
    `REFUSED: ${missing.length} of ${TRACKS.length} requested track(s) not found: ${missing.join(", ")}\n` +
      `  available: ${loadTracks()
        .map((g) => g.id)
        .join(", ")}`,
  );
  process.exit(2);
}
const rows = [];

console.log(
  "CHANGED% = frames whose zoom differs from the guarantee-OFF arm. PACK/MID/SPREAD are terciles of",
);
console.log(
  "the field's t-spread (laps), so SPREAD is the strung-out third — where it can bind.\n",
);
console.log(
  "track          n   seed  arm   CHANGED%  (pack / mid / spread)      widest   zoom p5/med/p95",
);

for (const geo of geos) {
  for (const racers of RACER_COUNTS) {
    for (const seed of SEEDS) {
      const off = runArm(geo, ARMS[0], racers, seed);
      for (const arm of ARMS.slice(1)) {
        const a = runArm(geo, arm, racers, seed);
        const s = splitBySpread(a, off);
        rows.push({
          track: geo.id ?? geo.name,
          racers,
          seed,
          arm,
          frames: a.frames,
          cappedPct: +a.cappedPct.toFixed(2),
          changedPct: +s.all.changedPct.toFixed(2),
          packPct: +s.pack.changedPct.toFixed(2),
          midPct: +s.mid.changedPct.toFixed(2),
          spreadPct: +s.spread.changedPct.toFixed(2),
          widest: +s.all.widest.toFixed(4),
          medSpreadPack: +s.pack.medSpread.toFixed(4),
          medSpreadSpread: +s.spread.medSpread.toFixed(4),
          zoomP5: +a.zoomP5.toFixed(4),
          zoomMed: +a.zoomMed.toFixed(4),
          zoomP95: +a.zoomP95.toFixed(4),
        });
        const r = rows[rows.length - 1];
        console.log(
          `${String(r.track).padEnd(14)} ${String(racers).padStart(2)}  ${seed}  ${String(arm).padStart(2)}   ` +
            `${String(r.changedPct).padStart(7)}%  (${String(r.packPct).padStart(6)} / ${String(r.midPct).padStart(6)} / ${String(r.spreadPct).padStart(6)})   ` +
            `${String(r.widest).padStart(7)}   ${r.zoomP5}/${r.zoomMed}/${r.zoomP95}`,
        );
      }
    }
  }
}

if (JSON_OUT) {
  const out = isAbsolute(JSON_OUT) ? JSON_OUT : join(ROOT, JSON_OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ arms: ARMS, rows }, null, 2));
  console.log(`\nwrote ${out}`);
}

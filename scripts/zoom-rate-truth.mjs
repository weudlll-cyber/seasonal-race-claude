// ============================================================
// File:        scripts/zoom-rate-truth.mjs
// Project:     RaceArena — ZOOM-RATE-1
//
// WHAT THIS MEASURES: `d ln(width)/dt` — the RATE at which the picture's width changes, in natural
// logarithms per second. Nothing in this repository measured it before.
//
// WHY A RATE, AND WHY IN LOGARITHMS. Every camera bound this project owns is on a POSITION, a WIDTH
// or a per-frame STEP. None of them can see how fast the picture is opening or closing, and that is
// what reads as "unexpectedly fast" on screen — CAMERA-CURVE-1's answer 2 found the term that moves
// the picture at the moments the owner describes is the ZOOM, not the pan. Logarithms because the
// eye reads zoom multiplicatively: 2 corridors to 4 and 4 to 8 look like the same move, and only a
// log rate gives them the same number. 1.0 ln/s is an e-fold per second; 0.69 ln/s is a doubling
// per second.
//
// IT MEASURES AND CHANGES NOTHING, AND IT IS WIRED INTO NOTHING. No gate, no guard, no verify
// route, and nothing is tuned against it. That is deliberate and it is the standing lesson: an
// instrument that judges before it is trusted has misled this project before (L202, and the
// label-names harness that returned a confident zero). This prints a distribution. Deciding whether
// any part of it is wrong is the owner's, and it needs numbers from more than one night first.
//
// ── WHAT "WIDTH" IS HERE, and it is a real choice ────────────────────────────────────────────────
//
// The director's `zoom` is a scale factor: a BIGGER zoom is a NARROWER picture. So the width is
// proportional to 1/zoom and `d ln(width)/dt` = −`d ln(zoom)/dt`. This reports the WIDTH rate, so a
// POSITIVE number is the picture OPENING (widening) and a NEGATIVE number is it CLOSING. The
// magnitude is what the perceptibility figures are quoted against, and the sign is what tells you
// which way. Reporting the zoom rate instead would invert every sign against the way a viewer
// describes it, which is how a measurement gets read backwards a month later.
//
// ── WHY IT REUSES THE SHARED DRIVER ──────────────────────────────────────────────────────────────
//
// `scripts/lib/raceDriver.mjs`, like every other instrument in this family. THREE DRIVER COPIES
// ALREADY EXIST BY DELIBERATE CHOICE (docs/BACKLOG.md), and every one of them is an argument that
// had to be made; a fourth for a read-only distribution would be a copy nobody argued for. Using the
// shared driver also means this instrument samples the same frames, the same fixed camera seed and
// the same countdown as the rest of the family, so its numbers sit beside theirs.
//
// ── THE FIXED FRAME CLOCK IS A LIMIT, NOT AN OVERSIGHT ───────────────────────────────────────────
//
// The driver steps at a fixed 1000/60 ms unless a caller supplies `hooks.frameMs`. A RATE is a
// per-second quantity, so it is more exposed to that than a position is: on a machine that drops
// frames the same zoom move spreads over fewer, larger steps and the measured rate changes. What is
// printed here is therefore the rate the DESIGN produces at a steady 60 Hz, which is the right
// baseline and is not the same as what a struggling machine shows. `--frame-ms=` is offered so the
// difference can be measured rather than argued about.
//
// Usage:
//   node scripts/zoom-rate-truth.mjs                       # two contrasting tracks, seed 9, n=40
//   node scripts/zoom-rate-truth.mjs --track=city-circuit
//   node scripts/zoom-rate-truth.mjs --racers=20 --seed=2
//   node scripts/zoom-rate-truth.mjs --json=out.json       # the per-frame series as well
//   node scripts/zoom-rate-truth.mjs --frame-ms=33.3       # a 30 Hz machine, for contrast
// ============================================================

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "./lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));

const argOf = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const SEED = Number(argOf("seed") ?? 9);
const RACERS = Number(argOf("racers") ?? 40);
const JSON_OUT = argOf("json") ?? null;
const FRAME_MS = argOf("frame-ms") ? Number(argOf("frame-ms")) : null;

// R4: two contrasting tracks, one closed and one open. Not ten — the question here is the shape of
// the distribution, and the spread across tracks is a different question with a different cost.
const TRACKS = argOf("track") ? [argOf("track")] : ["dirt-oval", "river-run"];

// ── THE PERCEPTIBILITY ANCHOR, and it is BORROWED rather than invented ───────────────────────────
// `scripts/diag/endgame-spec.mjs` carries RUNIN-HOLD-1's own figure as `STILL = 95 / (CW / 2)`, i.e.
// the rate below which a width change reads as standing still. It is quoted here as a REFERENCE
// LINE on the distribution, never as a threshold anything passes or fails — this instrument has no
// verdict.
const CW = 1280;
const CH = 720;
const STILL_LN_S = 95 / (CW / 2); // ≈ 0.1484 ln/s

const q = (sorted, f) => sorted[Math.min(sorted.length - 1, Math.round(f * (sorted.length - 1)))];

/** Measure one race and return the per-frame width-rate series plus its summary. */
function measure(geo) {
  const identity = resolveIdentity({
    track: geo.id,
    seed: SEED,
    racers: RACERS,
    racerType: TRACK_DEFAULT_RACER,
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);

  const series = [];
  let prevZoom = null;
  let prevTs = null;
  const hooks = FRAME_MS ? { frameMs: () => FRAME_MS } : {};

  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd, st, ts }) => {
      const z = cd.zoom;
      let rate = 0;
      if (prevZoom != null && prevTs != null && ts > prevTs && z > 0 && prevZoom > 0) {
        // width ∝ 1/zoom  ⇒  d ln(width)/dt = −d ln(zoom)/dt
        rate = -Math.log(z / prevZoom) / ((ts - prevTs) / 1000);
      }
      prevZoom = z;
      prevTs = ts;
      const lead = st.racers.reduce((a, r) => (r.t > a.t ? r : a), st.racers[0]);
      series.push({
        ts,
        progress: st.finishT > 0 ? lead.t / st.finishT : 0,
        zoom: z,
        rate,
        state: cd.state ?? cd._state ?? null,
      });
    },
    hooks
  );

  const mags = series.map((s) => Math.abs(s.rate)).sort((a, b) => a - b);
  // THE MEDIAN OVER ALL FRAMES IS 0 BECAUSE THE ZOOM IS USUALLY EXACTLY STATIONARY, which makes it
  // a true but uninformative headline. The median over the frames where it MOVES is the number a
  // reader means by "normal", and it is what reconciles with CAMERA-CURVE-1's quoted p50 ≈ 0.1.
  const moving = series.filter((s) => s.rate !== 0).map((s) => Math.abs(s.rate)).sort((a, b) => a - b);
  const opening = series.filter((s) => s.rate > 0).length;
  const closing = series.filter((s) => s.rate < 0).length;
  const peak = series.reduce((a, s) => (Math.abs(s.rate) > Math.abs(a.rate) ? s : a), series[0]);

  // WHERE the peaks sit — the brief's third question. Deciles of race progress, each carrying the
  // largest magnitude seen inside it, so a reader can see whether the fast moments cluster.
  const deciles = [];
  for (let d = 0; d < 10; d++) {
    const inD = series.filter((s) => s.progress >= d / 10 && s.progress < (d + 1) / 10);
    deciles.push({
      from: d / 10,
      n: inD.length,
      max: inD.length ? Math.max(...inD.map((s) => Math.abs(s.rate))) : 0,
      states: [...new Set(inD.map((s) => s.state))].filter(Boolean),
    });
  }

  return {
    track: geo.id,
    frames: series.length,
    median: q(mags, 0.5),
    movingMedian: moving.length ? q(moving, 0.5) : 0,
    movingN: moving.length,
    p90: q(mags, 0.9),
    p99: q(mags, 0.99),
    max: q(mags, 1),
    aboveStill: mags.filter((m) => m > STILL_LN_S).length,
    opening,
    closing,
    still: series.length - opening - closing,
    peak,
    deciles,
    series,
  };
}

const geos = loadTracks().filter((g) => TRACKS.includes(g.id));
if (geos.length === 0) throw new Error(`zoom-rate-truth: no track matched ${TRACKS.join(",")}`);

console.log(
  `d ln(width)/dt — the rate the picture's width changes, seed ${SEED}, ${RACERS} racers, ` +
    `${FRAME_MS ? `${FRAME_MS} ms frames` : "60 Hz"}`
);
console.log(
  `POSITIVE = opening (widening), NEGATIVE = closing. Reference line: ${STILL_LN_S.toFixed(4)} ln/s ` +
    `— RUNIN-HOLD-1's own "reads as standing still" figure. NOT a threshold; nothing passes or fails here.\n`
);

const out = [];
for (const geo of geos) {
  const m = measure(geo);
  out.push(m);
  console.log(`══ ${m.track} ══  ${m.frames} frames`);
  console.log(
    `   |rate| over ALL frames   median ${m.median.toFixed(4)}   p90 ${m.p90.toFixed(4)}   p99 ${m.p99.toFixed(3)}   MAX ${m.max.toFixed(3)} ln/s`
  );
  console.log(
    `   |rate| while it MOVES    median ${m.movingMedian.toFixed(4)} ln/s over ${m.movingN} frames ` +
      `(the all-frames median is 0 because the zoom is usually exactly still — true, but not what "normal" means)`
  );
  console.log(
    `   above the reference line: ${m.aboveStill} frames (${((100 * m.aboveStill) / m.frames).toFixed(1)}%)` +
      `   ·  opening ${m.opening}  closing ${m.closing}  still ${m.still}`
  );
  // A RATE IS NOT A JUMP, and this line exists so nobody reads 7.5 ln/s as the picture changing by
  // a factor of e^7.5. A rate sustained for ONE frame at 60 Hz changes the width by e^(rate/60).
  const perFrame = Math.exp(Math.abs(m.peak.rate) / (FRAME_MS ? 1000 / FRAME_MS : 60));
  console.log(
    `   peak: ${m.peak.rate > 0 ? "OPENING" : "closing"} ${Math.abs(m.peak.rate).toFixed(3)} ln/s ` +
      `at progress ${m.peak.progress.toFixed(3)}, zoom ${m.peak.zoom.toFixed(3)}, state ${m.peak.state}` +
      `  —  that is ×${perFrame.toFixed(3)} of the width in ONE frame`
  );
  console.log(`   WHERE THE PEAKS SIT — max |rate| per decile of race progress:`);
  for (const d of m.deciles) {
    const bar = "█".repeat(Math.min(40, Math.round(d.max * 8)));
    console.log(
      `     ${d.from.toFixed(1)}–${(d.from + 0.1).toFixed(1)}  ${d.max.toFixed(3).padStart(7)} ln/s  ${bar}`
    );
  }
  console.log();
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ seed: SEED, racers: RACERS, frameMs: FRAME_MS, runs: out }, null, 1));
  console.log(`wrote ${JSON_OUT}`);
}

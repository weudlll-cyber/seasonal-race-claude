// ============================================================
// File:        scripts/diag/runin-close-rate.mjs
// Project:     RaceArena — RUNIN-RATE-1 (report-only, changes nothing)
//
// THE NUMBER THAT DECIDES WHETHER THE CHANGE DID WHAT IT WAS ASKED TO DO.
//
// The owner's rule: hold the opened shot until the camera can zoom in SLOWLY and still arrive at
// the zoom the finish needs — the hold's length being a consequence of that, never a setting.
// RUNIN-HOLD-1 released on a fixed DURATION (`runInOpenMs`), which is a fixed SPEED only if the
// closing span is always the same size. It is not. So the test of this block is simple:
//
//   IS THE DELIVERED CLOSING RATE NOW SIMILAR ACROSS TRACKS? If it is not, the change failed.
//
// RATE IS MEASURED IN LOG UNITS PER SECOND — natural log of the zoom ratio — because a scale change
// is perceived logarithmically, which is the same reasoning the corridor cap's blend rests on. Equal
// ratios per second read as equal motion; equal differences do not.
//
// It reconstructs nothing: the zooms are `cd.zoom` as delivered, the phase boundaries are the
// director's own latches (`_runInReleaseProgress`, `_runInComposingNow`).
//
// Usage:
//   node scripts/diag/runin-close-rate.mjs
// ============================================================

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "../lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));

const SEED = 9;
const CW = 1280;

console.log(
  `the CLOSE, ten tracks, seed ${SEED} — rate in log-units of zoom per second (ln ratio / s).\n` +
    `A calm, consistent close means the rate column is SIMILAR across tracks; that is the test.\n` +
    `"surplus" is the live line demand against the held ceiling at the moment the hold ends.\n`,
);
console.log(
  `${"track".padEnd(15)} ${"hold s".padStart(7)} ${"close s".padStart(8)} ${"span ln".padStart(8)} ` +
    `${"RATE".padStart(7)} ${"surplus".padStart(8)} ${"compressed".padStart(11)} ${"mono".padStart(5)}`,
);

const rows = [];
for (const geo of loadTracks()) {
  const identity = resolveIdentity({
    racers: 20,
    raceSeed: SEED,
    racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET),
    note: "RUNIN-RATE-1 close rate",
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);

  let engagedMs = null;
  let releaseMs = null;
  let releaseZoom = null;
  let lastMs = null;
  let lastZoom = null;
  let surplus = null;
  let compressed = false;
  let mono = true;
  let prevZoom = null;
  // RUNIN-EVEN-1: the PROFILE. Uniform means uniform, so the instantaneous rate through the close
  // is what decides — an average is exactly what an eased curve hides behind.
  const prof = [];
  const profT = [];
  let prevTgt = null;
  let openMs = null;
  let openZoom = null;
  let perceptibleMs = null;

  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd, st, ts, raceStart }) => {
      if (!(st.finishT > 0) || (st.finishedCount ?? 0) > 0) return;
      if (!cd._runInComposingNow) return;
      const ms = ts - raceStart;
      if (engagedMs === null) engagedMs = ms;
      // WHERE THE CLOSE BEGINS. With a hold it is the release latch; with RUNIN-EVEN-1/-2's single
      // even movement there is no latch to read, and the close begins the moment the opening glide
      // ends. Both are the director's own state — nothing is reconstructed.
      const releasedNow =
        cd._runInReleaseProgress === undefined
          ? cd._lerpPhase !== 'glide'
          : cd._runInReleaseProgress !== null;
      if (releaseMs === null && releasedNow) {
        releaseMs = ms;
        releaseZoom = cd.zoom;
        compressed = cd._runInCompressed === true;
        // THE SURPLUS AT THE END OF THE HOLD: what the line asks for now against what is being held.
        const held = cd._runInHoldCeiling;
        const liveNow = cd._framingProbe?.ceilings?.line;
        if (held > 0 && Number.isFinite(liveNow) && liveNow > 0) surplus = liveNow / held;
      }
      if (cd._lerpPhase !== 'glide' && openMs === null) {
        openMs = ms;
        openZoom = cd.zoom;
      }
      // TIME UNTIL THE MOVEMENT IS PERCEPTIBLE: the first frame after the shot has opened at which
      // the zoom has changed by 2% — a ratio, because that is how a scale change is seen.
      if (openMs !== null && perceptibleMs === null && Math.abs(Math.log(cd.zoom / openZoom)) > 0.02)
        perceptibleMs = ms - openMs;
      // TWO PROFILES: what the run-in ASKED for (its own term, `ceilings.line`) and what the camera
      // DELIVERED. The difference between them is the lerp, and telling them apart is the whole
      // question — a uniform target that arrives non-uniform is an architecture finding, not a
      // mistake in the rule.
      const tgt = cd._framingProbe?.ceilings?.line;
      if (prevZoom !== null) {
        if (cd.zoom < prevZoom - 1e-9) mono = false;
        if (openMs !== null) prof.push({ ms, r: Math.abs(Math.log(cd.zoom / prevZoom)) });
      }
      if (openMs !== null && Number.isFinite(tgt) && Number.isFinite(prevTgt) && prevTgt > 0)
        profT.push({ ms, r: Math.abs(Math.log(tgt / prevTgt)) });
      if (Number.isFinite(tgt)) prevTgt = tgt;
      prevZoom = cd.zoom;
      lastMs = ms;
      lastZoom = cd.zoom;
    },
    { slowmo: true },
  );

  if (engagedMs === null || releaseMs === null || lastMs === null) {
    console.log(`${geo.id.padEnd(15)} not measured — the run-in never released before a crossing`);
    rows.push({ id: geo.id, ok: false });
    continue;
  }
  // Flatness: the instantaneous rate at three points through the close, and the spread between the
  // busiest and quietest tenth. A flat profile has a spread near 1.
  const win = prof.filter((x) => x.r > 0);
  const winT = profT.filter((x) => x.r > 0);
  const qT = (f) => {
    const i = Math.max(0, Math.min(winT.length - 1, Math.round(f * (winT.length - 1))));
    return winT.length ? winT[i].r * 60 : 0;
  };
  const q = (f) => {
    const i = Math.max(0, Math.min(win.length - 1, Math.round(f * (win.length - 1))));
    return win.length ? win[i].r * 60 : 0; // per second at 60 fps
  };
  const holdS = (releaseMs - engagedMs) / 1000;
  const closeS = (lastMs - releaseMs) / 1000;
  const spanLn = Math.abs(Math.log(lastZoom / releaseZoom));
  const rate = closeS > 0 ? spanLn / closeS : null;
  rows.push({ id: geo.id, ok: true, holdS, closeS, spanLn, rate });
  console.log(
    `${geo.id.padEnd(15)} ${holdS.toFixed(2).padStart(7)} ${closeS.toFixed(2).padStart(8)} ` +
      `${spanLn.toFixed(3).padStart(8)} ${(rate === null ? "—" : rate.toFixed(3)).padStart(7)} ` +
      `${(surplus === null ? "—" : surplus.toFixed(2) + "x").padStart(8)} ` +
      `${(compressed ? "YES" : "no").padStart(11)} ${(mono ? "yes" : "NO").padStart(5)}` +
      `  profile ${q(0.2).toFixed(2)}/${q(0.5).toFixed(2)}/${q(0.8).toFixed(2)}` +
      `  visible@${perceptibleMs === null ? "never" : (perceptibleMs / 1000).toFixed(2) + "s"}` +
      `  TARGET ${qT(0.2).toFixed(2)}/${qT(0.5).toFixed(2)}/${qT(0.8).toFixed(2)}`,
  );
}

const rates = rows.filter((r) => r.ok && r.rate > 0).map((r) => r.rate);
if (rates.length > 1) {
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  console.log(
    `\nRATE SPREAD across ${rates.length} tracks: ${lo.toFixed(3)} to ${hi.toFixed(3)} ln/s ` +
      `— a factor of ${(hi / lo).toFixed(2)}. Lower is the point of this block.`,
  );
}

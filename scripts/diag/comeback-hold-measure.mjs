// ============================================================
// File:        scripts/diag/comeback-hold-measure.mjs
// Project:     RaceArena — COMEBACK-HOLD-MEASURE-1 (2026-10-02)
//
// HOW DOES A COMEBACK SHOT END TODAY? A MEASUREMENT. NOTHING IS BUILT AND NOTHING IS CHANGED.
//
// THROWAWAY, AND WHY IT EXISTS AT ALL. `scripts/diag/comeback-beats.mjs` (COMEBACK-BEATS-1) records
// each shot's start, end and the racer's rank at both, but not WHAT ENDED the shot, and not the
// racer's rank AFTER it — and "how much catch-up was still running when the cap cut it" needs both.
// This script reuses everything that instrument reuses and adds only those two records:
//   · `scripts/lib/raceDriver.mjs` — resolveIdentity / loadTracks / buildRace / runRace, unedited
//   · `scripts/lib/cameraPlanDelivery.mjs` — the driver already delivers the race plan to the
//     director the way the product does (raceDriver.mjs:574); this script only READS the plan
//   · the BROWSER's outcome-phase flag, wrapped exactly as comeback-beats.mjs does it
//     (`--outcome=browser`, its default), so the comeback shot is offered when it is in the browser
//   · the director's own `_lastTransitionReason` (CameraDirector.js:1059) — why each transition
//     fired, read, never re-derived
//   · `racePlanController.getTargetRank` (racePlanner.js:1930) — the racer's DRAWN finishing place
//
// THE RACE IS A QUICK TEST's: seed, track, 20 racers, the track's default racer type. Its length is
// the shared driver's (as in every earlier comeback measurement), and the camera is driven once per
// physics frame rather than off a wall clock, so a single browser run can place a shot a frame or
// two differently (comeback-precedence.spec.js header). Stated, not hidden.
//
// Usage: node scripts/diag/comeback-hold-measure.mjs [--seeds=1,2,3] [--json=<file>]
// ============================================================

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import { resolveIdentity, loadTracks, buildRace, runRace } from "../lib/raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { DEFAULT_CAMERA_CONFIG } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/storage/defaults.js")).href
);
const ARG = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const SEEDS = ARG("seeds", "1,2,3").split(",").map(Number).filter(Number.isFinite);
const JSON_OUT = ARG("json", null);
const CFG = DEFAULT_CAMERA_CONFIG; // this branch's shipped camera, read not copied
const RACERS = 20; // the Quick Test field

const tracks = loadTracks();
if (!tracks.length) {
  console.error("comeback-hold-measure: no tracks loaded.");
  process.exit(2);
}

const rankMapOf = (st) => {
  const m = new Map();
  [...st.racers].sort((a, b) => b.t - a.t).forEach((r, i) => m.set(r.index, i + 1));
  return m;
};

const shots = [];
const races = [];
for (const geo of tracks) {
  for (const seed of SEEDS) {
    const identity = resolveIdentity({ raceSeed: seed, racers: RACERS });
    const race = buildRace(geo, identity, CFG);
    const { st, meta, cd } = race;
    // the browser's outcome flag, as comeback-beats.mjs --outcome=browser supplies it
    const origUpdate = cd.update.bind(cd);
    cd.update = (racers, ts, raceState, cw, ch, dt) =>
      origUpdate(
        racers,
        ts,
        {
          ...raceState,
          isOutcomePhase:
            meta.racePlanController?.getPhase?.(st.physicsTs, st.raceProgress) === "OUTCOME",
        },
        cw,
        ch,
        dt,
      );

    let planRead = false;
    const resolveOf = new Map(); // racerIndex -> the plan's 'resolve' beat progress (raceProgress axis)
    let prev = null;
    let cur = null; // the open shot
    const mine = []; // this race's shots
    const series = new Map(); // racerIndex -> [[ms, rank, finished]]
    let firstFinishMs = null;
    let photoGateMs = null;

    runRace(race, identity, CFG, ({ cd: dir, st: state, ts, raceStart }) => {
      // The driver has already delivered the plan this frame (cameraPlanDelivery.mjs); read it once.
      if (meta.racePlanController && !planRead) {
        const cp = meta.racePlanController.getCameraPlan?.();
        if (cp) {
          planRead = true;
          for (const h of cp.heroes ?? [])
            for (const b of h.beats ?? []) if (b.event === "resolve") resolveOf.set(h.index, b.progress);
        }
      }
      const ms = ts - raceStart;
      const maxT = Math.max(...state.racers.map((r) => r.t));
      const lead = state.finishT > 0 ? +(maxT / state.finishT).toFixed(4) : null;
      const reason = dir._lastTransitionReason ?? null;
      if (firstFinishMs == null && state.racers.some((r) => r.finished)) firstFinishMs = ms;
      if (photoGateMs == null && reason === "photo-finish-gate") photoGateMs = ms;
      const s = dir.state;
      const ranks = series.size || s === "COMEBACK_ZOOM" ? rankMapOf(state) : null;

      if (s === "COMEBACK_ZOOM" && prev !== "COMEBACK_ZOOM") {
        const who = dir.comebackLockedRacerIndex ?? null;
        cur = {
          track: geo.id,
          seed,
          racer: who,
          drawnPlace: who == null ? null : (meta.racePlanController?.getTargetRank?.(who) ?? null),
          startMs: ms,
          startLead: lead,
          rankStart: who == null ? null : ranks.get(who),
          resolveBeat: who == null ? null : (resolveOf.get(who) ?? null),
          startRaceProgress: +(state.raceProgress ?? 0).toFixed(4),
          from: prev,
          capFiredMs: null, // the 8 s gate fired but the pick chose COMEBACK again (a repeat)
        };
        if (who != null && !series.has(who)) series.set(who, []);
      } else if (s === "COMEBACK_ZOOM" && cur && cur.capFiredMs == null && reason === "hold-elapsed") {
        cur.capFiredMs = ms; // transition fired, state stayed: same-state repeat
      }
      if (s !== "COMEBACK_ZOOM" && prev === "COMEBACK_ZOOM" && cur) {
        cur.endMs = ms;
        cur.endLead = lead;
        cur.endRaceProgress = +(state.raceProgress ?? 0).toFixed(4);
        cur.endReason = reason;
        cur.to = s;
        cur.rankEnd = cur.racer == null ? null : ranks.get(cur.racer);
        mine.push(cur);
        cur = null;
      }
      if (ranks)
        for (const [idx, arr] of series) {
          const r = state.racers.find((x) => x.index === idx);
          arr.push([ms, ranks.get(idx), !!r?.finished]);
        }
      prev = s;
      return true;
    });

    // remaining catch-up: from shot end until the racer stops gaining places (his best rank for the
    // rest of his race is first reached) or reaches his drawn place, whichever comes first.
    for (const sh of mine) {
      sh.durationS = +((sh.endMs - sh.startMs) / 1000).toFixed(2);
      const arr = (series.get(sh.racer) ?? []).filter(([m]) => m >= sh.endMs);
      let best = sh.rankEnd;
      let tBest = sh.endMs;
      let tDrawn = null;
      for (const [m, rk, fin] of arr) {
        if (rk < best) {
          best = rk;
          tBest = m;
        }
        if (tDrawn == null && sh.drawnPlace != null && rk <= sh.drawnPlace) tDrawn = m;
        if (fin) break;
      }
      const tStop = tDrawn != null ? Math.min(tBest, tDrawn) : tBest;
      sh.remainingS = +((tStop - sh.endMs) / 1000).toFixed(2);
      // VARIANT, labelled as such in the report: gaining only, ignoring the drawn place — how long
      // after the cut he went on taking places at all.
      sh.gainingOnlyS = +((tBest - sh.endMs) / 1000).toFixed(2);
      sh.bestRankAfter = best;
      sh.firstFinishMs = firstFinishMs;
      sh.photoGateMs = photoGateMs;
      shots.push(sh);
    }
    races.push({ track: geo.id, seed, planDelivered: planRead, shots: mine.length, firstFinishMs, photoGateMs });
  }
}

// ── the table ───────────────────────────────────────────────────────────────────────────────────
const f = (x) => (x == null ? "-" : x);
console.log(`COMEBACK-HOLD-MEASURE-1 — ${races.length} races (${tracks.length} tracks x seeds ${SEEDS.join(",")}), ${RACERS} racers`);
console.log("track            seed racer drawn  start(s) lead   end(s)  lead   dur(s) ended-by           rank s->e  remaining(s) repeat");
for (const s of shots)
  console.log(
    `${s.track.padEnd(16)} ${String(s.seed).padStart(4)} ${String(f(s.racer)).padStart(5)} ${String(f(s.drawnPlace)).padStart(5)}  ` +
      `${(s.startMs / 1000).toFixed(1).padStart(7)} ${f(s.startLead)}  ${(s.endMs / 1000).toFixed(1).padStart(6)} ${f(s.endLead)}  ` +
      `${s.durationS.toFixed(1).padStart(5)}  ${String(s.endReason).padEnd(18)} ${f(s.rankStart)}->${f(s.rankEnd)}   ` +
      `${s.remainingS.toFixed(1).padStart(6)}   ${s.capFiredMs != null ? "yes" : "no"}   gaining-only ${s.gainingOnlyS.toFixed(1)}s`,
  );
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ races, shots }, null, 2));

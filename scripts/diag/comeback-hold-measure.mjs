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
// Usage: node scripts/diag/comeback-hold-measure.mjs [--seeds=1,2,3] [--json=<file>] [--gain-stop-ms=<n>]
//
// COMEBACK-HOLD-1 added `--gain-stop-ms=`: overrides `comebackGainStopMs` on a COPY of the config for
// this run (defaults.js is never written), so the arms of the W choice race identical races; and the
// per-shot `regainWithin3s`: did the racer take a place again within 3 s of the shot ending.
//
// COMEBACK-SETTINGS-SURVEY-1 added `--set=key=value[,key=value]`: any top-level camera key, on the
// same COPY of the config (numbers, true/false parsed; nothing persists), and a per-race
// `cameraTraceHash` — SHA-256 over every frame's state, zoom and offsets. Two arms whose 30 hashes are
// identical drew the same camera on every frame of every race: that is what "no effect" means here.
//
// COMEBACK-CUT-DIAG-1 added three things, all read-only:
//   · `--track=<id>` — one track only (`loadTracks({ only })`, the driver's own filter)
//   · `--roster=quicktest` — the races carry the Quick Test's DEFAULT field: the first N names of the
//     default name set (`resolveNameSet(DEFAULT_NAME_SET)` in client/src/modules/racerNames.js, read,
//     not copied), exactly what SetupScreen fills an empty player list with. A racer's NAME is an
//     engine input (raceDriver.mjs, the roster block), so without this the race is not the browser's.
//   · `--timeline=<file>` — every frame of every CAST comebacker: rank, the 2 s gain read
//     (`gainedWithin`), whether he is the locked comeback racer, the transition reason, whether the
//     detector would offer him now (`best()`), and its three rank gates; plus every racer's finish.
// ============================================================

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolveIdentity, loadTracks, buildRace, runRace } from "../lib/raceDriver.mjs";
import { setPath } from "../lib/hisArm.mjs"; // dotted keys for --set, cloning on the way down

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { DEFAULT_CAMERA_CONFIG } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/storage/defaults.js")).href
);
const ARG = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const SEEDS = ARG("seeds", "1,2,3").split(",").map(Number).filter(Number.isFinite);
const ONLY_TRACK = ARG("track", null);
const ROSTER_MODE = ARG("roster", null);
const TIMELINE_OUT = ARG("timeline", null);
const JSON_OUT = ARG("json", null);
const GAIN_STOP = ARG("gain-stop-ms", null);
// this branch's shipped camera, read not copied — or a COPY with the one arm value changed
const SETS = Object.fromEntries(
  (ARG("set", "") || "")
    .split(",")
    .filter(Boolean)
    .map((kv) => {
      const [k, v] = kv.split("=");
      return [k, v === "true" ? true : v === "false" ? false : Number(v)];
    }),
);
const CFG =
  GAIN_STOP == null && !Object.keys(SETS).length
    ? DEFAULT_CAMERA_CONFIG
    : {
        ...structuredClone(DEFAULT_CAMERA_CONFIG),
        ...(GAIN_STOP == null ? {} : { comebackGainStopMs: Number(GAIN_STOP) }),
      };
// a dotted key (e.g. cameraStateProfiles.COMEBACK_ZOOM.visibleCorridors) must name an existing leaf
const leafExists = (o, path) =>
  path.split(".").reduce((c, k) => (c != null && k in Object(c) ? c[k] : undefined), o) !== undefined;
for (const [k, v] of Object.entries(SETS)) {
  if (!leafExists(DEFAULT_CAMERA_CONFIG, k)) {
    console.error(`comeback-hold-measure: --set names "${k}", which is not a camera config key.`);
    process.exit(2);
  }
  setPath(CFG, k, v);
}
// the Quick Test field: 20 in a fresh browser; `--racers=` for another (the owner's setup fields 40)
const RACERS = Number(ARG("racers", "20"));

const tracks = loadTracks(ONLY_TRACK ? { only: ONLY_TRACK } : {});
if (!tracks.length) {
  console.error("comeback-hold-measure: no tracks loaded.");
  process.exit(2);
}

const rankMapOf = (st) => {
  const m = new Map();
  [...st.racers].sort((a, b) => b.t - a.t).forEach((r, i) => m.set(r.index, i + 1));
  return m;
};

let ROSTER = null;
if (ROSTER_MODE === "quicktest") {
  const { resolveNameSet, DEFAULT_NAME_SET } = await import(
    pathToFileURL(join(ROOT, "client/src/modules/racerNames.js")).href
  );
  ROSTER = resolveNameSet(DEFAULT_NAME_SET).slice(0, RACERS);
} else if (ROSTER_MODE != null) {
  console.error(`comeback-hold-measure: --roster=${ROSTER_MODE} is not known (only "quicktest").`);
  process.exit(2);
}

const shots = [];
const races = [];
const timelines = [];
for (const geo of tracks) {
  for (const seed of SEEDS) {
    const identity = resolveIdentity({ raceSeed: seed, racers: RACERS, roster: ROSTER });
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
    const trace = createHash("sha256"); // every frame's camera output, for the survey's byte compare
    const cast = []; // the plan's comebackers, once the plan arrives
    const tl = []; // per-frame timeline rows for them (only with --timeline)

    runRace(race, identity, CFG, ({ cd: dir, st: state, ts, raceStart }) => {
      // The driver has already delivered the plan this frame (cameraPlanDelivery.mjs); read it once.
      if (meta.racePlanController && !planRead) {
        const cp = meta.racePlanController.getCameraPlan?.();
        if (cp) {
          planRead = true;
          for (const h of cp.heroes ?? []) if (h.role === "comebacker") cast.push(h.index);
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
      trace.update(`${s}|${dir.zoom}|${dir.offsetX}|${dir.offsetY};`);
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
      if (TIMELINE_OUT && cast.length) {
        const rm = ranks ?? rankMapOf(state);
        const g = dir._comeback._gates;
        const nd = Math.max(state.racers.length - 1, 1);
        const offered = dir._comeback.best(state.racers, ts, state.raceProgress)?.index ?? null;
        for (const idx of cast) {
          const rank = rm.get(idx);
          const r = state.racers.find((x) => x.index === idx);
          const hist = dir._comeback.historyFor(idx);
          const startS = hist.find((h) => h.ts >= ts - g.windowSec * 1000);
          tl.push({
            ms,
            p: +(state.raceProgress ?? 0).toFixed(4),
            idx,
            name: r?.name ?? null,
            rank,
            finished: !!r?.finished,
            state: s,
            reason,
            locked: dir.comebackLockedRacerIndex === idx,
            gained2000: dir._comeback.gainedWithin(idx, ts, 2000),
            offered: offered === idx,
            // the three rank gates of best(), evaluated as best() evaluates them
            gateStartGap: startS ? (startS.rank - 1) / nd >= g.minStartGap : null,
            gateNotUpFront: (rank - 1) / nd >= g.maxCurrentRankPct,
            gateGained: startS ? startS.rank - rank >= g.minPositionsGained : null,
          });
        }
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
      // COMEBACK-HOLD-1's selection rule: after the shot ended, did he gain again within 3 s?
      sh.regainWithin3s = (series.get(sh.racer) ?? []).some(
        ([m, rk]) => m > sh.endMs && m <= sh.endMs + 3000 && rk < sh.rankEnd,
      );
      // COMEBACK-CUT-DIAG-1: the same question over 5 s, and when his next place came at all
      const after = (series.get(sh.racer) ?? []).filter(([m]) => m > sh.endMs);
      sh.regainWithin5s = after.some(([m, rk]) => m <= sh.endMs + 5000 && rk < sh.rankEnd);
      const nextGain = after.find(([, rk]) => rk < sh.rankEnd);
      sh.nextGainAfterS = nextGain ? +((nextGain[0] - sh.endMs) / 1000).toFixed(2) : null;
      sh.firstFinishMs = firstFinishMs;
      sh.photoGateMs = photoGateMs;
      shots.push(sh);
    }
    const finishes = st.racers
      .map((r) => ({ index: r.index, name: r.name ?? null, finishTimeMs: r.finishTimeMs ?? null }))
      .sort((a, b) => (a.finishTimeMs ?? Infinity) - (b.finishTimeMs ?? Infinity));
    if (TIMELINE_OUT) timelines.push({ track: geo.id, seed, cast, finishes, rows: tl });
    races.push({ track: geo.id, seed, finishes, cameraTraceHash: trace.digest("hex"), planDelivered: planRead, shots: mine.length, firstFinishMs, photoGateMs });
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
if (TIMELINE_OUT) writeFileSync(TIMELINE_OUT, JSON.stringify(timelines));

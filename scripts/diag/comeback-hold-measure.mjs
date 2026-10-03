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
//
// COMEBACK-HOLD-1 added the per-shot `regainWithin3s`: did the racer take a place again within 3 s of
// the shot ending. (Its `--gain-stop-ms=` arm went with the gain-stop rule at COMEBACK-HOLD-2.)
//
// COMEBACK-HOLD-2 added the per-shot `finalSceneFrames`: frames the camera spent in COMEBACK_ZOOM
// while the final scene was due — leader past `endgameThreshold`, any racer home, or the photo finish
// running (`_inPhotoFinish`). The rule says this is always 0; the instrument counts it, not assumes it.
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
//   · `--timeline=<file>` — every frame of every CAST comebacker: rank, whether he is the locked
//     comeback racer, the transition reason, whether the detector would offer him now (`best()`), and
//     its three rank gates; plus every racer's finish.
//
// COMEBACK-DURATION-1 added, read-only:
//   · `--names=current|long|mixed` — which Quick Test name set `--roster=quicktest` draws from (the
//     Quick Test fills an empty player list from the chosen set; `current` has 70 names, so an
//     80-racer Quick Test needs `long` or `mixed`)
//   · `--duration-out=<file>` — one row per CAST comebacker per race (the cast is read from the race
//     plan's own `getCameraPlan()`, racePlanner.js:1935, role 'comebacker'):
//       steering START  = the frame the plan casts him (racePlanner.js:1193, isHeroChoreographed)
//       steering END    = his hand-off: a HELD comebacker at his curve's `releaseAt`
//                         (`getHeldRelease()`, racePlanner.js:1287 `heldFree`); otherwise, if his drawn
//                         place is in the top band (<= BAND_EDGES[0]), at `choreoReleaseProgress`
//                         (racePlanner.js:1279-1282 `released`, read from DEFAULT_RACE_DYNAMICS_CONFIG);
//                         otherwise he is steered to the finish and the row says so
//       his rank at steering start, at the comeback shot's start (if one locked on him), and at the
//       finish; and the first frame he holds 3rd place or better after each of the two starts
//
// COMEBACK-CUT-DELAY-1 added, read-only — the WAIT before the cut (`dir._comebackDue`):
//   · per race `waits`: every wait, how it ended — `cut` (the shot started on him), `final-scene`
//     (dropped with the final scene due: leader past `endgameThreshold`, a racer home, or the photo
//     finish running), `not-offered` (dropped any other way), or `race-end`
//   · per shot `dueMs` / `rankAtDue` / `gainedDuringDelay` (places taken during the wait; null with
//     no wait, i.e. the delay at 0) and `speedVsMedian`: his track distance over the last 1 s divided
//     by the median of the unfinished field's, at the cut — above 1 means he is visibly faster
//   Arm the delay with `--set=comebackCutDelayMs=<ms>`.
//
// COMEBACK-RUNAWAY-1 added `--runaway-out=<file>`, read-only: one row per CAST comebacker and per
// DRAWN winner (the racer whose `getTargetRank` is 1) per race — his finishing place; his margin at
// the finish to the next racer in finish order, in seconds (`finishTimeMs`) and in canvas widths;
// and his largest lead as race leader after he first held 3rd or better. Canvas widths are the
// SHIPPED director's own picture: both racers projected through `dir._proj.toScreen` at that
// frame's zoom and offsets, the straight-line screen distance divided by the canvas width.
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
const NAME_SET = ARG("names", null);
const DURATION_OUT = ARG("duration-out", null);
const RUNAWAY_OUT = ARG("runaway-out", null);
const { DEFAULT_RACE_DYNAMICS_CONFIG } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/storage/defaults.js")).href
);
const { BAND_EDGES } = await import(pathToFileURL(join(ROOT, "client/src/modules/racePlanner.js")).href);
const CHOREO_RELEASE = DEFAULT_RACE_DYNAMICS_CONFIG.choreoReleaseProgress;
const JSON_OUT = ARG("json", null);
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
const CFG = !Object.keys(SETS).length ? DEFAULT_CAMERA_CONFIG : structuredClone(DEFAULT_CAMERA_CONFIG);
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
  const names = resolveNameSet(NAME_SET ?? DEFAULT_NAME_SET);
  if (names.length < RACERS) {
    console.error(`comeback-hold-measure: name set "${NAME_SET ?? DEFAULT_NAME_SET}" has ${names.length} names; a Quick Test cannot field ${RACERS} from it.`);
    process.exit(2);
  }
  ROSTER = names.slice(0, RACERS);
} else if (ROSTER_MODE != null) {
  console.error(`comeback-hold-measure: --roster=${ROSTER_MODE} is not known (only "quicktest").`);
  process.exit(2);
}

const shots = [];
const races = [];
const timelines = [];
const durationRows = [];
const runawayRows = [];
const REF_CANVAS_W = 1280; // the race canvas is a fixed 1280x720 store
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
    const cb = new Map(); // COMEBACK-DURATION-1: index -> per-comebacker record (only with --duration-out)
    const waits = []; // COMEBACK-CUT-DELAY-1: every wait before a cut, and how it ended
    let openWait = null; // { obj, index, route, startMs, rankAtDue }
    const tHist = []; // COMEBACK-CUT-DELAY-1: [ms, Map(index -> t)] over the last ~1 s, for speeds
    const ra = new Map(); // COMEBACK-RUNAWAY-1: index -> { role, reached3Ms, maxLead*, atFinish* }
    let drawnWinner = null;

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
      // COMEBACK-CUT-DELAY-1: the wait — opened when a new due record appears, closed when it goes
      const finalSceneNow =
        lead > DEFAULT_CAMERA_CONFIG.endgameThreshold || state.racers.some((r) => r.finished) || !!dir._inPhotoFinish;
      const dueObj = dir._comebackDue ?? null;
      if (openWait && dueObj !== openWait.obj) {
        const cutOnHim = s === "COMEBACK_ZOOM" && prev !== "COMEBACK_ZOOM" && dir.comebackLockedRacerIndex === openWait.index;
        openWait.endMs = ms;
        openWait.how = cutOnHim ? "cut" : finalSceneNow ? "final-scene" : "not-offered";
        delete openWait.obj;
        waits.push(openWait);
        openWait = null;
      }
      if (dueObj && !openWait) {
        openWait = { obj: dueObj, index: dueObj.index, route: dueObj.route ?? null, startMs: ms, rankAtDue: rankMapOf(state).get(dueObj.index) };
      }
      tHist.push([ms, new Map(state.racers.map((r) => [r.index, r.t]))]);
      if (RUNAWAY_OUT && planRead) {
        if (drawnWinner == null)
          drawnWinner = state.racers.find((r) => meta.racePlanController?.getTargetRank?.(r.index) === 1)?.index ?? -1;
        const byT = [...state.racers].sort((a, b) => b.t - a.t);
        const scr = (r) => dir._proj.toScreen(r, dir.zoom, dir.offsetX, dir.offsetY);
        const widths = (a, b) => {
          const p = scr(a), q = scr(b);
          return Math.hypot(p.x - q.x, p.y - q.y) / REF_CANVAS_W;
        };
        const subjects = [...cast.map((i) => [i, "comebacker"]), ...(drawnWinner >= 0 ? [[drawnWinner, "drawnWinner"]] : [])];
        for (const [idx, role] of subjects) {
          const key = `${role}:${idx}`;
          let o = ra.get(key);
          if (!o) ra.set(key, (o = { idx, role, reached3Ms: null, maxLeadWidths: 0, maxLeadPct: 0, finWidths: null }));
          const pos = byT.findIndex((r) => r.index === idx);
          const me = byT[pos];
          if (!me) continue;
          if (o.reached3Ms == null && pos < 3) o.reached3Ms = ms;
          if (o.reached3Ms != null && pos === 0 && !me.finished && byT[1]) {
            const w = widths(me, byT[1]);
            if (w > o.maxLeadWidths) {
              o.maxLeadWidths = w;
              o.maxLeadPct = state.finishT > 0 ? (100 * (me.t - byT[1].t)) / state.finishT : 0;
            }
          }
          if (o.finWidths == null && me.finished) {
            // the next racer in FINISH ORDER: the one home just before him, or, if he is first home,
            // the leading racer still running
            const home = state.racers.filter((r) => r.finished && r.index !== idx && (r.finishTimeMs ?? Infinity) <= (me.finishTimeMs ?? Infinity));
            const ahead = home.sort((a, b) => b.finishTimeMs - a.finishTimeMs)[0];
            const other = ahead ?? byT.find((r) => !r.finished && r.index !== idx);
            if (other) o.finWidths = +widths(me, other).toFixed(3);
          }
        }
      }
      while (tHist.length > 1 && ms - tHist[0][0] > 1000) tHist.shift();

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
          capFiredMs: null, // the hold gate fired but the pick chose COMEBACK again (a repeat)
          finalSceneFrames: 0, // COMEBACK-HOLD-2: frames on the comeback while the final scene was due
          // COMEBACK-CUT-DELAY-1: the wait that led here (the last one closed, on this frame, as a cut)
          dueMs: null,
          rankAtDue: null,
          gainedDuringDelay: null,
          speedVsMedian: null,
        };
        const w = waits.at(-1);
        if (w && w.how === "cut" && w.endMs === ms && w.index === who) {
          cur.dueMs = w.startMs;
          cur.rankAtDue = w.rankAtDue;
          cur.gainedDuringDelay = w.rankAtDue - cur.rankStart;
        }
        const old = tHist[0][1];
        const run = (r) => r.t - (old.get(r.index) ?? r.t);
        const field = state.racers.filter((r) => !r.finished).map(run).sort((a, b) => a - b);
        const med = field.length ? field[Math.floor(field.length / 2)] : 0;
        const him = state.racers.find((r) => r.index === who);
        cur.speedVsMedian = him && med > 0 ? +(run(him) / med).toFixed(3) : null;
        if (who != null && !series.has(who)) series.set(who, []);
      }
      // COMEBACK-HOLD-2: a comeback frame while the final scene is due is an OVERLAP — counted, never assumed
      if (
        s === "COMEBACK_ZOOM" &&
        cur &&
        (lead > DEFAULT_CAMERA_CONFIG.endgameThreshold ||
          state.racers.some((r) => r.finished) ||
          dir._inPhotoFinish)
      )
        cur.finalSceneFrames++;
      if (s === "COMEBACK_ZOOM" && cur && cur.capFiredMs == null && reason === "hold-elapsed") {
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
      if (DURATION_OUT && cast.length) {
        const rm = ranks ?? rankMapOf(state);
        const prog = state.raceProgress ?? 0;
        for (const idx of cast) {
          let c = cb.get(idx);
          if (!c) {
            const held = meta.racePlanController?.getHeldRelease?.()?.get(idx) ?? null;
            const drawn = meta.racePlanController?.getTargetRank?.(idx) ?? null;
            const releaseAt =
              held != null ? held : drawn != null && drawn <= BAND_EDGES[0] ? CHOREO_RELEASE : null;
            c = {
              idx,
              held: held != null,
              drawn,
              releaseAt,
              steerStartMs: ms,
              rankAtSteerStart: rm.get(idx),
              steerEndMs: null,
              shotStartMs: null,
              rankAtShotStart: null,
              thirdAfterSteerMs: null,
              thirdAfterShotMs: null,
              wasOutsideTop3: false, // has he been behind 3rd since the steering began?
              thirdAfterOutsideMs: null, // first 3rd-or-better AFTER having been behind it
            };
            cb.set(idx, c);
          }
          const rank = rm.get(idx);
          if (c.steerEndMs == null && c.releaseAt != null && prog >= c.releaseAt) c.steerEndMs = ms;
          if (c.shotStartMs == null && s === "COMEBACK_ZOOM" && dir.comebackLockedRacerIndex === idx) {
            c.shotStartMs = ms;
            c.rankAtShotStart = rank;
          }
          if (c.thirdAfterSteerMs == null && rank <= 3) c.thirdAfterSteerMs = ms;
          if (rank > 3) c.wasOutsideTop3 = true;
          else if (c.wasOutsideTop3 && c.thirdAfterOutsideMs == null) c.thirdAfterOutsideMs = ms;
          if (c.shotStartMs != null && c.thirdAfterShotMs == null && rank <= 3) c.thirdAfterShotMs = ms;
        }
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
    if (openWait) {
      delete openWait.obj;
      waits.push({ ...openWait, endMs: null, how: "race-end" });
    }
    const finishes = st.racers
      .map((r) => ({ index: r.index, name: r.name ?? null, finishTimeMs: r.finishTimeMs ?? null }))
      .sort((a, b) => (a.finishTimeMs ?? Infinity) - (b.finishTimeMs ?? Infinity));
    if (TIMELINE_OUT) timelines.push({ track: geo.id, seed, cast, finishes, rows: tl });
    if (RUNAWAY_OUT) {
      const placeOf = new Map(finishes.map((f, i) => [f.index, i + 1]));
      for (const o of ra.values()) {
        const place = placeOf.get(o.idx) ?? null;
        const mine = finishes[place - 1]?.finishTimeMs ?? null;
        const next = place === 1 ? finishes[1]?.finishTimeMs : finishes[place - 2]?.finishTimeMs;
        runawayRows.push({
          track: geo.id, open: !geo.closed, racers: RACERS, seed, role: o.role, idx: o.idx,
          drawn: meta.racePlanController?.getTargetRank?.(o.idx) ?? null,
          place,
          // + = his lead over the runner-up (he won); - = his gap to the racer home just before him
          finishMarginS: mine == null || next == null ? null : +((next - mine) / 1000).toFixed(3),
          finishMarginWidths: o.finWidths,
          reached3: o.reached3Ms != null,
          maxLeadWidths: +o.maxLeadWidths.toFixed(3),
          maxLeadPct: +o.maxLeadPct.toFixed(3), // his lead as a percentage of the race distance
        });
      }
    }
    if (DURATION_OUT) {
      const placeOf = new Map(finishes.map((f, i) => [f.index, i + 1]));
      const raceRow = { track: geo.id, open: !geo.closed, racers: RACERS, seed, names: NAME_SET ?? "current" };
      if (!cb.size) durationRows.push({ ...raceRow, comebacker: null });
      for (const c of cb.values()) {
        const fin = finishes.find((f) => f.index === c.idx);
        durationRows.push({
          ...raceRow,
          comebacker: c.idx,
          name: fin?.name ?? null,
          held: c.held,
          drawn: c.drawn,
          rankAtSteerStart: c.rankAtSteerStart,
          rankAtShotStart: c.rankAtShotStart,
          finishPlace: placeOf.get(c.idx) ?? null,
          shot: c.shotStartMs != null,
          // steered to the finish when no hand-off point exists: then the steering ends at his finish
          steeredToFinish: c.steerEndMs == null,
          steeringS: +(((c.steerEndMs ?? fin?.finishTimeMs ?? c.steerStartMs) - c.steerStartMs) / 1000).toFixed(2),
          shotToThirdS: c.shotStartMs == null || c.thirdAfterShotMs == null ? null : +((c.thirdAfterShotMs - c.shotStartMs) / 1000).toFixed(2),
          steerToThirdS: c.thirdAfterSteerMs == null ? null : +((c.thirdAfterSteerMs - c.steerStartMs) / 1000).toFixed(2),
          // the variant: counted only once he has first been behind 3rd (a racer already 3rd at the
          // cast reads 0 above, which says nothing about his comeback)
          steerToThirdAfterOutsideS:
            c.thirdAfterOutsideMs == null ? null : +((c.thirdAfterOutsideMs - c.steerStartMs) / 1000).toFixed(2),
          everOutsideTop3: c.wasOutsideTop3,
        });
      }
    }
    races.push({ track: geo.id, seed, finishes, cameraTraceHash: trace.digest("hex"), planDelivered: planRead, shots: mine.length, firstFinishMs, photoGateMs, waits });
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
if (DURATION_OUT) writeFileSync(DURATION_OUT, JSON.stringify(durationRows));
if (RUNAWAY_OUT) writeFileSync(RUNAWAY_OUT, JSON.stringify(runawayRows));

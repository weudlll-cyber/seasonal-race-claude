// ============================================================
// File:        scripts/diag/endgame-spec.mjs
// Project:     RaceArena — ENDGAME-SPEC-1 (report-only, changes nothing)
//
// THE OWNER'S SPECIFICATION OF 2026-08-23, AS SEVEN NUMBERS. Each requirement is measured on its
// own and never blended, so a candidate that trades one against another is visible as such.
//
//   1 TIMING     by 95% of the race AT THE LATEST, the winner and the finish line are both visible.
//   2 ARRIVAL    at the crossing the shot is at the ACTIVE STATE'S OWN zoom — the leader view (0.75
//                corridors) or the photo finish (0.4) — and not at a new value.
//   3 CONTINUITY between those two points the shot closes CONTINUOUSLY. Measured as STANDSTILL, and
//                as MONOTONICITY after the turn.
//   4 WIDTH      it must not open as far as today. Reported per track against today.
//   5 (retires the constraint every earlier attempt was built on — the line need not stay framed.
//      Nothing here requires it after the moment requirement 1 names.)
//   6 SMOOTHNESS every acceleration and deceleration is gradual. Abruptness is what is forbidden,
//                not speed — so the quantity is the RATE OF CHANGE OF THE RATE.
//   7 (a pause at the turn is allowed. Standstill is therefore a COST to minimise, not a fail.)
//
// ── THE STANDSTILL THRESHOLD IS THE PROJECT'S OWN NUMBER, NOT A NEW ONE ───────────────────────
//
// RUNIN-HOLD-1 measured the crawl it existed to remove as "roughly 95 px/s of picture flow, below
// the rate at which anything reads as movement". That is this repository's own perceptibility
// figure, arrived at on the owner's eye, and it converts exactly: a zoom change moves a point at the
// frame edge — 640 px from centre on a 1280 px canvas — at `640 x |d ln(width)/dt|` px/s. So
//
//     STANDSTILL  <=>  |d ln(width)/dt|  <  95 / 640  =  0.1484 ln/s
//
// No comfort number is invented. If that figure is ever revised, this follows it.
//
// ── TWO WINDOWS, AND THE SPEC ONE IS PRIMARY ──────────────────────────────────────────────────
//
// Requirement 3 governs the span BETWEEN the two points requirements 1 and 2 name: from the 95%
// deadline to the crossing. That is the SPEC window and every headline number is taken over it.
// The wider [0.90, crossing] window is reported beside it as context only — before the endgame opens
// the camera is on the ordinary racing shot, which is legitimately steady, and counting that as
// "standstill" would penalise a design for opening late, which is the opposite of requirement 4.
//
// ── THE WINDOW IS RACE PROGRESS, NOT THE DIRECTOR'S OWN STATE ─────────────────────────────────
//
// Every candidate is measured over leaderProgress in [0.90, 1.0], which is a property of the RACE
// and identical across arms. Scoping the window to `_runInActive` would let a candidate that
// engages later score better by measuring fewer of its own bad frames — the exact way the previous
// block's numbers flattered themselves.
//
// ── DERIVATIVES ARE TAKEN ON A LIGHTLY SMOOTHED SERIES, AND THAT IS DECLARED ──────────────────
//
// The second derivative of a 60 Hz signal is dominated by frame noise. `ln(width)` is smoothed with
// a centred 5-frame (83 ms) moving average before differentiating — short enough to leave a real
// abrupt move intact, long enough that single-frame jitter does not manufacture jerk. The first
// derivative used for STANDSTILL is taken on the SAME smoothed series, so the two agree.
//
// Usage:
//   node scripts/diag/endgame-spec.mjs
//   node scripts/diag/endgame-spec.mjs --arm=shipped --tracks=ice-track --json
//   node scripts/diag/endgame-spec.mjs --set=endgameThreshold=0.95 --label=C1
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
const { effectiveZoom } = await import(u("client/src/modules/camera/openTrackCamera.js"));
const { OPEN_TRACK_BASE_ZOOM } = await import(u("client/src/modules/camera/projection.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));

const CW = 1280;
const CH = 720;
const SEED = 9;
const FPS = 60;
const WINDOW_FROM = 0.9; // where the measurement window opens, in race progress
const DEADLINE = 0.95; // requirement 1's deadline
const STILL = 95 / (CW / 2); // 0.1484 ln/s — RUNIN-HOLD-1's own perceptibility figure
const SMOOTH = 5; // frames in the centred moving average (83 ms)
const MONO_DEADBAND = 0.005; // 0.5% of width; below this a "re-opening" is numerical, not visible

const JSON_OUT = process.argv.includes("--json");
const ARM = (process.argv.find((a) => a.startsWith("--arm=")) ?? "--arm=his").slice(6);
const LABEL = (process.argv.find((a) => a.startsWith("--label=")) ?? "--label=today").slice(8);
const TRACK_ARG = (process.argv.find((a) => a.startsWith("--tracks=")) ?? "").slice(9);

const HIS = [
  ["cameraStateProfiles.OVERVIEW.trackingTC", 1.5],
  ["highlightHeroes", true],
  ["battlePulkThresholdT", 0.001],
  ["outcomePhaseThreshold", 0.65],
  ["battleCooldownMs", 20000],
  ["battleWeight", 0],
  ["finishPauseMs", 4000],
  ["winnerCardMs", 4000],
  ["corridorCapArriveMs", 5000],
  ["labelNamesWhenRoom", true],
  ["minRacersVisible", 8],
];

function setPath(o, path, v) {
  const parts = path.split(".");
  let cur = o;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = structuredClone(cur[parts[i]]);
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = v;
}

export function makeConfig(arm, overrides = []) {
  const cfg = structuredClone(DEFAULT_CAMERA_CONFIG);
  if (arm === "his") for (const [p, v] of HIS) setPath(cfg, p, v);
  for (const [p, v] of overrides) setPath(cfg, p, v);
  return cfg;
}

const cliOverrides = () =>
  process.argv
    .filter((a) => a.startsWith("--set="))
    .map((a) => {
      const [k, raw] = a.slice(6).split("=");
      const v =
        raw === "true" ? true
        : raw === "false" ? false
        : raw === "null" ? null
        : Number.isFinite(Number(raw)) && raw.trim() !== "" ? Number(raw)
        : raw;
      return [k, v];
    });

export const med = (a) => {
  const b = a.filter(Number.isFinite).sort((x, y) => x - y);
  return b.length ? b[b.length >> 1] : NaN;
};
const quant = (a, q) => {
  const b = a.filter(Number.isFinite).sort((x, y) => x - y);
  return b.length ? b[Math.min(b.length - 1, Math.floor(q * b.length))] : NaN;
};

/** Centred moving average; edges use the shortest available symmetric window. */
function smooth(series, win) {
  const h = win >> 1;
  return series.map((_, i) => {
    const lo = Math.max(0, i - h);
    const hi = Math.min(series.length - 1, i + h);
    let s = 0;
    for (let k = lo; k <= hi; k++) s += series[k];
    return s / (hi - lo + 1);
  });
}

export function scoreTrack(geo, cfg, N) {
  const identity = resolveIdentity({
    racers: N,
    raceSeed: SEED,
    racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET),
    canvasW: CW,
    canvasH: CH,
    note: "ENDGAME-SPEC-1",
  });
  const race = buildRace(geo, identity, cfg);
  const { shape, st, cd, trackWidthPx } = race;
  const bsX = CW / (geo.worldWidth || CW);
  const bsY = shape.isOpen ? null : CH / (geo.worldHeight || CH);
  const effOf = (z) => (shape.isOpen ? effectiveZoom(z, OPEN_TRACK_BASE_ZOOM) : z * bsX);

  const f = [];
  let crossed = false;
  let raceEverFinished = false;

  runRace(race, identity, cfg, ({ ts, raceStart }) => {
    if (st.finishedCount > 0) {
      raceEverFinished = true;
      crossed = true;
      return;
    }
    if (crossed) return;
    let maxT = 0;
    for (const r of st.racers) if (r.t > maxT) maxT = r.t;
    const progress = st.finishT > 0 ? maxT / st.finishT : 0;
    if (progress < WINDOW_FROM) return;

    const effX = effOf(cd.zoom);
    if (!(effX > 0)) return;
    const effY = shape.isOpen ? effX : cd.zoom * bsY;

    // The line's own point, from the DIRECTOR's call — never re-derived here.
    const line = cd._finishLineWorldPoint(st.finishT);
    const sx = (q) => cd.offsetX + q.x * effX;
    const sy = (q) => cd.offsetY + q.y * effY;
    const lineOn =
      !!line && sx(line) >= 0 && sx(line) <= CW && sy(line) >= 0 && sy(line) <= CH;
    const ordered = [...st.racers].sort((a, b) => b.t - a.t);
    const lead = ordered[0];
    const leaderOn = sx(lead) >= 0 && sx(lead) <= CW && sy(lead) >= 0 && sy(lead) <= CH;

    f.push({
      tSec: +((ts - raceStart) / 1000).toFixed(4),
      ts,
      progress,
      width: CW / effX,
      lnW: Math.log(CW / effX),
      lineOn,
      lineX: line ? sx(line) : NaN,
      lineY: line ? sy(line) : NaN,
      leaderOn,
      state: cd.state,
      // WHICH TERM PLACED THE SHOT. A schedule that is not the binding term is not a schedule —
      // the picture then sits against whatever bound IS smallest, which is how standstill returns
      // under a design that cannot itself stand still.
      binding: cd._framingProbe?.binding ?? "?",
      // The width the SCHEDULE placed this frame. Under `runInSchedule` the director puts it in the
      // `state` slot (it is the width authority for the phase), so reading `ceilings.line` here —
      // which the schedule retires — reported Infinity on every frame and made the trace unreadable.
      demandWidth: (() => {
        const c = cd._framingProbe?.ceilings?.state;
        return c > 0 && Number.isFinite(c) ? CW / effOf(c) : Infinity;
      })(),
      // THE CONTENDERS, from the director's OWN definition — the price of any rule that overrides a
      // geometric guarantee has to be paid in racers, and this is the currency.
      contOff: (() => {
        const ordered = [...st.racers].sort((x, y) => y.t - x.t);
        const cont = cd._abreastContenders(ordered);
        return cont.filter((r) => {
          const X = cd.offsetX + r.x * effX;
          const Y = cd.offsetY + r.y * effY;
          return !(X >= 0 && X <= CW && Y >= 0 && Y <= CH);
        }).length;
      })(),
      // What the frame actually contains, so the cost of retiring a guarantee can be priced rather
      // than asserted.
      onScreen: st.racers.reduce((n, r) => {
        const X = cd.offsetX + r.x * effX;
        const Y = cd.offsetY + r.y * effY;
        return n + (X >= 0 && X <= CW && Y >= 0 && Y <= CH ? 1 : 0);
      }, 0),
      // Requirement 2's reference: the ACTIVE state's own zoom, the director's own number.
      stateWidth: CW / effOf(cd._stateCamZoom()),
    });
  });

  if (process.argv.includes("--trace")) {
    // One track, one column per thing that could be placing the shot. Printed from the SAME frames
    // the scores are taken from, so a trace can never disagree with the table above it.
    console.log(`
TRACE ${geo.id} n=${N} — every 10th frame of the window`);
    console.log("  prog   width  corr    rate   binding         line x,y   schedW  (canvas 1280x720)");
    f.forEach((x, i) => {
      if (i % 10) return;
      const rate =
        i > 0 && i < f.length - 1 ? ((f[i + 1].lnW - f[i - 1].lnW) * FPS) / 2 : 0;
      console.log(
        [
          x.progress.toFixed(3).padStart(6),
          Math.round(x.width).toString().padStart(8),
          (x.width / trackWidthPx).toFixed(2).padStart(6),
          rate.toFixed(3).padStart(8),
          "  " + x.binding.padEnd(15),
          (Math.round(x.lineX) + "," + Math.round(x.lineY)).padStart(12),
          Math.round(x.stateWidth).toString().padStart(6),
          Math.round(x.demandWidth ?? 0).toString().padStart(9),
        ].join("")
      );
    });
  }
  if (!f.length || !raceEverFinished) {
    return { track: geo.id, racers: N, notScorable: true, raceNeverFinished: !raceEverFinished };
  }

  // Derivatives are taken on the FULL window so the spec window's edges are not differentiated
  // against nothing — then sliced. Differentiating a slice would invent a zero rate at its first
  // frame, which is precisely the quantity under test.
  const sm = smooth(f.map((x) => x.lnW), SMOOTH);
  const dt = 1 / FPS;
  const v = sm.map((_, i) =>
    i === 0 || i === sm.length - 1 ? 0 : (sm[i + 1] - sm[i - 1]) / (2 * dt)
  );
  const a = v.map((_, i) => (i === 0 || i === v.length - 1 ? 0 : (v[i + 1] - v[i - 1]) / (2 * dt)));
  const specFrom = f.findIndex((x) => x.progress >= DEADLINE);
  const S = specFrom < 0 ? f.length - 1 : specFrom; // index the spec window starts at

  const stillOver = (lo) => {
    const flags = v.slice(lo).map((x) => Math.abs(x) < STILL);
    let longest = 0;
    let r = 0;
    for (const q of flags) {
      r = q ? r + 1 : 0;
      if (r > longest) longest = r;
    }
    return {
      pct: flags.length ? (100 * flags.filter(Boolean).length) / flags.length : NaN,
      longestMs: (1000 * longest) / FPS,
    };
  };
  const specStill = stillOver(S);

  // ── STANDSTILL ────────────────────────────────────────────────────────────────────────────
  const stillFlags = v.map((x) => Math.abs(x) < STILL);
  let longestStill = 0;
  let run = 0;
  for (const s of stillFlags) {
    run = s ? run + 1 : 0;
    if (run > longestStill) longestStill = run;
  }

  // ── MONOTONICITY after the turn (the widest frame) ────────────────────────────────────────
  let turn = 0;
  for (let i = 1; i < f.length; i++) if (f[i].width > f[turn].width) turn = i;
  let reopen = 0;
  let worstReopen = 0;
  for (let i = turn + 1; i < f.length; i++) {
    const rel = (f[i].width - f[i - 1].width) / f[i - 1].width;
    if (rel > MONO_DEADBAND) {
      reopen++;
      worstReopen = Math.max(worstReopen, rel);
    }
  }

  // ── TIMING: the first frame at or past the deadline ───────────────────────────────────────
  const atDeadline = f.find((x) => x.progress >= DEADLINE) ?? null;

  // ── ARRIVAL: the last frame before the crossing ───────────────────────────────────────────
  const last = f[f.length - 1];

  return {
    track: geo.id,
    racers: N,
    isOpen: shape.isOpen,
    trackWidthPx,
    worldW: geo.worldWidth,
    frames: f.length,
    windowSec: last.tSec - f[0].tSec,
    // 3/7 — standstill. SPEC window [0.95, crossing] is the headline; the wide one is context.
    stillPct: specStill.pct,
    stillLongestMs: specStill.longestMs,
    specFrames: f.length - S,
    specSec: last.tSec - f[S].tSec,
    wideStillPct: (100 * stillFlags.filter(Boolean).length) / stillFlags.length,
    wideStillLongestMs: (1000 * longestStill) / FPS,
    // 6 — smoothness over the SPEC window
    specJerkP99: quant(a.slice(S).map(Math.abs), 0.99),
    specJerkMax: Math.max(...a.slice(S).map(Math.abs)),
    specRateP99: quant(v.slice(S).map(Math.abs), 0.99),
    // 3 — monotonicity
    turnAtProgress: f[turn].progress,
    reopenFrames: reopen,
    worstReopenPct: 100 * worstReopen,
    // 6 — smoothness: the rate of change of the rate
    jerkP99: quant(a.map(Math.abs), 0.99),
    jerkMax: Math.max(...a.map(Math.abs)),
    rateP99: quant(v.map(Math.abs), 0.99),
    // 1 — timing
    deadlineBothVisible: atDeadline ? atDeadline.lineOn && atDeadline.leaderOn : null,
    deadlineLineOn: atDeadline ? atDeadline.lineOn : null,
    deadlineLeaderOn: atDeadline ? atDeadline.leaderOn : null,
    // 2 — arrival
    crossWidth: last.width,
    crossStateWidth: last.stateWidth,
    arrivalErrPct: 100 * Math.abs(last.width / last.stateWidth - 1),
    crossCorridors: last.width / trackWidthPx,
    // 4 — width
    maxWidth: Math.max(...f.map((x) => x.width)),
    maxCorridors: Math.max(...f.map((x) => x.width)) / trackWidthPx,
    maxWorldPct: (100 * Math.max(...f.map((x) => x.width))) / geo.worldWidth,
    // WHO PLACED THE SHOT over the spec window, most frequent first
    bindShare: (() => {
      const c = {};
      for (const x of f.slice(S)) c[x.binding] = (c[x.binding] ?? 0) + 1;
      const n = f.length - S;
      return Object.entries(c)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${k} ${Math.round((100 * v) / n)}%`)
        .join(" ");
    })(),
    minOnScreen: Math.min(...f.slice(S).map((x) => x.onScreen)),
    contOffFrames: f.slice(S).filter((x) => x.contOff > 0).length,
    contOffWorst: Math.max(...f.slice(S).map((x) => x.contOff)),
    medOnScreen: med(f.slice(S).map((x) => x.onScreen)),
    // context
    lineOnPct: (100 * f.filter((x) => x.lineOn).length) / f.length,
    leaderOnPct: (100 * f.filter((x) => x.leaderOn).length) / f.length,
  };
}

export function tracksAndSizes(only = null) {
  return loadTracks()
    .filter((g) => (only ? only.includes(g.id) : true))
    .map((geo) => {
      const probe = buildRace(
        geo,
        resolveIdentity({
          racers: 2,
          raceSeed: SEED,
          racerType: TRACK_DEFAULT_RACER,
          roster: resolveNameSet(DEFAULT_NAME_SET),
          canvasW: CW,
          canvasH: CH,
        }),
        DEFAULT_CAMERA_CONFIG
      );
      return { geo, n: probe.shape.isOpen ? 100 : 40 };
    });
}

export function runCandidate(arm, overrides, only = null) {
  const cfg = makeConfig(arm, overrides);
  return tracksAndSizes(only).map(({ geo, n }) => scoreTrack(geo, cfg, n));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = runCandidate(ARM, cliOverrides(), TRACK_ARG ? TRACK_ARG.split(",") : null);
  if (JSON_OUT) {
    console.log(JSON.stringify({ label: LABEL, arm: ARM, overrides: cliOverrides(), rows }, null, 1));
  } else {
    console.log(
      `ENDGAME SPEC — ${LABEL} (arm ${ARM}), seed ${SEED}, window = race progress [${WINDOW_FROM}, crossing]`
    );
    console.log(
      `standstill = |d ln(width)/dt| < ${STILL.toFixed(4)} ln/s (RUNIN-HOLD-1's own 95 px/s perceptibility figure)`
    );
    console.log("");
    console.log(
      "track            n  spec   STILL%  longest    mono  turn@   jerkP99  jerkMax   ARRIVE%  xCorr   maxCorr  %world   1:both  minOn   cut   who placed the shot"
    );
    for (const r of rows) {
      if (r.notScorable) {
        console.log(
          `${r.track.padEnd(16)}${String(r.racers).padStart(3)}   — ${r.raceNeverFinished ? "RACE NEVER FINISHES — not scorable" : "no window frames"}`
        );
        continue;
      }
      console.log(
        [
          r.track.padEnd(16),
          String(r.racers).padStart(3),
          String(r.specFrames).padStart(6),
          r.stillPct.toFixed(0).padStart(8),
          (Math.round(r.stillLongestMs) + "ms").padStart(9),
          (r.reopenFrames === 0 ? "ok" : "FAIL " + r.reopenFrames).padStart(8),
          r.turnAtProgress.toFixed(3).padStart(7),
          r.specJerkP99.toFixed(2).padStart(10),
          r.specJerkMax.toFixed(2).padStart(9),
          r.arrivalErrPct.toFixed(0).padStart(10),
          r.crossCorridors.toFixed(2).padStart(7),
          r.maxCorridors.toFixed(1).padStart(10),
          r.maxWorldPct.toFixed(0).padStart(8),
          (r.deadlineBothVisible === null ? "—" : r.deadlineBothVisible ? "yes" : "NO").padStart(8),
          String(r.minOnScreen).padStart(6),
          (r.contOffFrames ? "CUT" + r.contOffWorst : "-").padStart(6),
          "   " + r.bindShare,
        ].join("")
      );
    }
    const fin = rows.filter((r) => !r.notScorable);
    console.log("");
    console.log(
      `POOLED  STILL ${med(fin.map((r) => r.stillPct)).toFixed(0)}% (worst ${Math.max(...fin.map((r) => r.stillPct)).toFixed(0)}%), ` +
        `longest ${Math.round(Math.max(...fin.map((r) => r.stillLongestMs)))}ms  |  ` +
        `mono ${fin.filter((r) => r.reopenFrames === 0).length}/${fin.length} ok  |  ` +
        `jerkMax ${Math.max(...fin.map((r) => r.specJerkMax)).toFixed(2)}  |  ` +
        `arrival err med ${med(fin.map((r) => r.arrivalErrPct)).toFixed(0)}% (worst ${Math.max(...fin.map((r) => r.arrivalErrPct)).toFixed(0)}%)  |  ` +
        `maxCorr ${med(fin.map((r) => r.maxCorridors)).toFixed(1)} (worst ${Math.max(...fin.map((r) => r.maxCorridors)).toFixed(1)})  |  ` +
        `req1 ${fin.filter((r) => r.deadlineBothVisible).length}/${fin.length}`
    );
  }
}

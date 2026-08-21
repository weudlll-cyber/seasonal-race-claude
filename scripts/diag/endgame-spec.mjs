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
// ── ENDGAME-SCHEDULE-2: JUDGE BY THE WORST FRAME, NOT BY THE AGGREGATE ───────────────────────
//
// The aggregate smoothness figure was GREEN (worst |d2 ln(width)/dt2| 13.1) while the owner's eye
// reported the zoom HOPPING. So that figure does not measure what he perceives, and an average that
// disagrees with the eye is the average's problem.
//
// The per-frame measures below are taken on the RAW delivered series, never on the smoothed one:
//   stepMax     the LARGEST SINGLE-FRAME change in ln(width). This is the number his eye reacts to.
//   stepP99     the same at the 99th percentile, so one outlier cannot hide a rough hundred.
//   revs        RATE REVERSALS — consecutive PERCEPTIBLE steps of opposite sign. A step counts as
//               perceptible when it moves a point at the frame edge by at least ONE SCREEN PIXEL,
//               |step| * 640 >= 1, which is a pixel and not a taste.
//   panStepMax  the same for the pan, in screen px per frame.
//   clip%       the share of frames where the DELIVERED width is not what the SCHEDULE asked for.
//               A clipped schedule is not a smooth one, so this is the structural half of hopping.
//   backMax     the largest BACKWARD step of the camera along the racing line, in world px. This is
//               the "camera jumps back" observation, measured rather than described.
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
      // WHAT THE SCHEDULE ASKED FOR, beside what was delivered. Under `runInSchedule` the director
      // puts the schedule in the `state` slot, so this is its own value before the other ceilings,
      // the corridor cap and the two re-clamps have had their say.
      schedWidth: (() => {
        const c = cd._framingProbe?.ceilings?.state;
        return c > 0 && Number.isFinite(c) ? CW / effOf(c) : NaN;
      })(),
      guaranteedWidth: (() => {
        const g = cd._framingProbe?.guaranteed;
        return g > 0 && Number.isFinite(g) ? CW / effOf(g) : NaN;
      })(),
      // WHAT THE STOOD-DOWN AUTHORITIES WOULD HAVE ASKED FOR. The price of letting the schedule
      // win is paid in racers, and this is how it is counted rather than assumed.
      wouldWiden: (() => {
        const w = cd._framingProbe?.wouldHave;
        const g = cd._framingProbe?.guaranteed;
        if (!w || !(g > 0)) return false;
        return ["guarantee", "company", "field"].some((k) => Number.isFinite(w[k]) && w[k] < g - 1e-12);
      })(),
      // WHERE THE LEADER SITS ALONG THE FRAME. The run-in deliberately places him BEFORE centre and
      // walks him back past it (RUNIN-GLIDE-1's mirror), which is the owner's own design and would
      // look exactly like the camera falling back. Measured so it can be named rather than guessed:
      // 0.34 is the mirror, 0.66 the ordinary placement.
      leadFrac: (() => {
        const h = cd._headingScreen(cd._framingProbe?.t ?? 0);
        const l = h ? Math.hypot(h.x, h.y) : 0;
        if (!(l > 0)) return NaN;
        const ux = h.x / l, uy = h.y / l;
        const lx = cd.offsetX + lead.x * effX, ly = cd.offsetY + lead.y * effY;
        const chord = Math.abs(ux) * CW + Math.abs(uy) * CH;
        return 0.5 + ((lx - CW / 2) * ux + (ly - CH / 2) * uy) / chord;
      })(),
      eng: !!cd._runInEngaged,
      widenStartP: cd._runInWidenStartP,
      widenFromW: cd._runInWidenFrom > 0 ? CW / effOf(cd._runInWidenFrom) : NaN,
      afterDL: !!cd._runInAfterDeadline,
      composing: !!cd._runInComposingNow,
      lerpPhase: cd._lerpPhase,
      offX: cd.offsetX,
      offY: cd.offsetY,
      // The camera's own world position along the track, so a BACKWARD move can be measured rather
      // than inferred from the picture. -offset/eff is the world point at the frame's origin.
      camWorldX: -cd.offsetX / effX,
      camWorldY: -cd.offsetY / effY,
      headX: (() => {
        const h = cd._headingScreen(cd._framingProbe?.t ?? 0);
        const l = h ? Math.hypot(h.x, h.y) : 0;
        return l > 0 ? h.x / l : 1;
      })(),
      headY: (() => {
        const h = cd._headingScreen(cd._framingProbe?.t ?? 0);
        const l = h ? Math.hypot(h.x, h.y) : 0;
        return l > 0 ? h.y / l : 0;
      })(),
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
    const TR = (process.argv.find((a) => a.startsWith("--trace-from=")) ?? "").slice(13);
    const TRTO = (process.argv.find((a) => a.startsWith("--trace-to=")) ?? "").slice(11);
    const lo = TR ? Number(TR) : -Infinity;
    const hi = TRTO ? Number(TRTO) : Infinity;
    const every = TR ? 1 : 10;
    f.forEach((x, i) => {
      if (x.progress < lo || x.progress > hi) return;
      if (i % every) return;
      const rate =
        i > 0 && i < f.length - 1 ? ((f[i + 1].lnW - f[i - 1].lnW) * FPS) / 2 : 0;
      console.log(
        [
          x.progress.toFixed(3).padStart(6),
          Math.round(x.width).toString().padStart(8),
          (x.width / trackWidthPx).toFixed(2).padStart(6),
          rate.toFixed(3).padStart(8),
          "  " + x.binding.padEnd(15),
          (x.eng ? "E" : "-") + (x.composing ? "C" : "-") + (x.afterDL ? "D" : "-"),
          (x.widenStartP === null || x.widenStartP === undefined ? "  -  " : x.widenStartP.toFixed(3)).padStart(7),
          (Number.isFinite(x.widenFromW) ? Math.round(x.widenFromW) : "-").toString().padStart(8),
          x.lerpPhase.padStart(9),
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

  // ── ENDGAME-SCHEDULE-2: THE PER-FRAME MEASURES, ON THE RAW SERIES ───────────────────────────
  const PERCEPTIBLE = 1 / (CW / 2); // one screen pixel at the frame edge
  const spec = f.slice(S);
  const steps = [];
  for (let i = 1; i < spec.length; i++) steps.push(spec[i].lnW - spec[i - 1].lnW);
  const absSteps = steps.map(Math.abs);
  // Rate reversals: consecutive PERCEPTIBLE steps whose sign differs.
  let revs = 0;
  let revWorst = 0;
  let lastSign = 0;
  for (const st2 of steps) {
    if (Math.abs(st2) < PERCEPTIBLE) continue;
    const sg = st2 > 0 ? 1 : -1;
    if (lastSign !== 0 && sg !== lastSign) {
      revs++;
      revWorst = Math.max(revWorst, Math.abs(st2));
    }
    lastSign = sg;
  }
  // Pan, in screen px per frame.
  const panSteps = [];
  for (let i = 1; i < spec.length; i++)
    panSteps.push(Math.hypot(spec[i].offX - spec[i - 1].offX, spec[i].offY - spec[i - 1].offY));
  // BACKWARD camera motion along the racing line, in world px. Positive = the camera moved AGAINST
  // the direction of travel, which is the "jumps back" observation.
  const backs = [];
  for (let i = 1; i < spec.length; i++) {
    const dx = spec[i].camWorldX - spec[i - 1].camWorldX;
    const dy = spec[i].camWorldY - spec[i - 1].camWorldY;
    backs.push(-(dx * spec[i].headX + dy * spec[i].headY));
  }
  // WHERE the worst frames are, and what was binding there. A maximum without a location is a
  // number nobody can act on.
  const worstStepI = absSteps.length ? absSteps.indexOf(Math.max(...absSteps)) : -1;
  const worstPanI = panSteps.length ? panSteps.indexOf(Math.max(...panSteps)) : -1;
  const at = (i) => (i >= 0 && spec[i + 1] ? spec[i + 1] : null);
  const wStep = at(worstStepI);
  const wPan = at(worstPanI);

  // The FULL window [0.90, crossing] as well: his "camera jumps back" happens while the shot is
  // opening, which is BEFORE the spec window begins.
  const wideSteps = [];
  const widePan = [];
  for (let i = 1; i < f.length; i++) {
    wideSteps.push(Math.abs(f[i].lnW - f[i - 1].lnW));
    widePan.push(Math.hypot(f[i].offX - f[i - 1].offX, f[i].offY - f[i - 1].offY));
  }
  const wideStepI = wideSteps.indexOf(Math.max(...wideSteps));
  const widePanI = widePan.indexOf(Math.max(...widePan));

  // CLIPPING: the delivered width is not the width the schedule asked for.
  const clipped = spec.filter(
    (x) => Number.isFinite(x.schedWidth) && Math.abs(x.width / x.schedWidth - 1) > 0.01
  );
  const clipBy = {};
  for (const x of clipped) clipBy[x.binding] = (clipBy[x.binding] ?? 0) + 1;

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
    // ENDGAME-SCHEDULE-2 — the per-frame truth
    stepMaxLn: absSteps.length ? Math.max(...absSteps) : NaN,
    stepP99Ln: quant(absSteps, 0.99),
    stepMedLn: med(absSteps),
    revs,
    revWorstLn: revWorst,
    panStepMax: panSteps.length ? Math.max(...panSteps) : NaN,
    panStepP99: quant(panSteps, 0.99),
    backMax: backs.length ? Math.max(...backs) : NaN,
    backFrames: backs.filter((b) => b > 1).length,
    clipPct: spec.length ? (100 * clipped.length) / spec.length : NaN,
    // THE RAMP'S OWN PARAMETER. `u` is driven by the leader's progress, which advances with physics
    // jitter — a smoothstep of a jittery parameter is a jittery curve. dpMax/dpMed is how uneven it
    // is; an ideal ramp would have them equal.
    leadFracFirst: spec.length ? spec[0].leadFrac : NaN,
    leadFracLast: spec.length ? spec[spec.length - 1].leadFrac : NaN,
    leadFracStepMax: (() => { let m=0; for(let i=1;i<spec.length;i++){const d=Math.abs(spec[i].leadFrac-spec[i-1].leadFrac); if(Number.isFinite(d)) m=Math.max(m,d);} return m; })(),
    dpMax: (() => { const d=[]; for(let i=1;i<spec.length;i++) d.push(spec[i].progress-spec[i-1].progress); return Math.max(...d); })(),
    dpMed: (() => { const d=[]; for(let i=1;i<spec.length;i++) d.push(spec[i].progress-spec[i-1].progress); return med(d); })(),
    wouldWidenPct: spec.length ? (100 * spec.filter((x) => x.wouldWiden).length) / spec.length : NaN,
    worstStepAt: wStep ? wStep.progress : NaN,
    worstStepBinding: wStep ? wStep.binding : "?",
    worstPanAt: wPan ? wPan.progress : NaN,
    worstPanBinding: wPan ? wPan.binding : "?",
    wideStepMax: Math.max(...wideSteps),
    wideStepAt: f[wideStepI + 1] ? f[wideStepI + 1].progress : NaN,
    wideStepBinding: f[wideStepI + 1] ? f[wideStepI + 1].binding : "?",
    widePanMax: Math.max(...widePan),
    widePanAt: f[widePanI + 1] ? f[widePanI + 1].progress : NaN,
    widePanBinding: f[widePanI + 1] ? f[widePanI + 1].binding : "?",
    clipBy: Object.entries(clipBy)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k} ${Math.round((100 * v) / spec.length)}%`)
      .join(" "),
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
      "track            n  spec   stepMAX  stepP99   revs  revMax   panMAX  backMAX  clip%  wouldW  dpRatio   STILL%  longest  mono  ARRIVE%  maxCorr  1:both   clipped by"
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
          r.stepMaxLn.toFixed(4).padStart(9),
          r.stepP99Ln.toFixed(4).padStart(9),
          String(r.revs).padStart(7),
          r.revWorstLn.toFixed(4).padStart(8),
          Math.round(r.panStepMax).toString().padStart(9),
          Math.round(r.backMax).toString().padStart(9),
          r.clipPct.toFixed(0).padStart(7),
          r.wouldWidenPct.toFixed(0).padStart(7),
          (r.dpMax / r.dpMed).toFixed(1).padStart(7),
          r.stillPct.toFixed(0).padStart(9),
          (Math.round(r.stillLongestMs) + "ms").padStart(9),
          (r.reopenFrames === 0 ? "ok" : "FAIL" + r.reopenFrames).padStart(6),
          r.arrivalErrPct.toFixed(0).padStart(9),
          r.maxCorridors.toFixed(1).padStart(9),
          (r.deadlineBothVisible === null ? "—" : r.deadlineBothVisible ? "yes" : "NO").padStart(8),
          "   " + (r.clipBy || "-"),
        ].join("")
      );
    }
    const fin = rows.filter((r) => !r.notScorable);
    console.log("");
    console.log("");
    console.log("WHERE THE WORST FRAMES ARE — spec window [0.95, cross] and the full window [0.90, cross]");
    console.log("track            spec stepMAX @prog  binding            spec panMAX @prog  binding        FULL stepMAX @prog  FULL panMAX @prog");
    for (const r of fin) {
      console.log(
        [
          r.track.padEnd(16),
          r.stepMaxLn.toFixed(4).padStart(9),
          r.worstStepAt.toFixed(3).padStart(7),
          "  " + r.worstStepBinding.padEnd(20),
          Math.round(r.panStepMax).toString().padStart(8),
          r.worstPanAt.toFixed(3).padStart(7),
          "  " + r.worstPanBinding.padEnd(16),
          r.wideStepMax.toFixed(4).padStart(9),
          r.wideStepAt.toFixed(3).padStart(7),
          Math.round(r.widePanMax).toString().padStart(9),
          r.widePanAt.toFixed(3).padStart(7),
        ].join("")
      );
    }
    console.log("");
    console.log(
      `PER-FRAME  stepMAX ${Math.max(...fin.map((r) => r.stepMaxLn)).toFixed(4)} ln  |  ` +
        `stepP99 ${med(fin.map((r) => r.stepP99Ln)).toFixed(4)}  |  ` +
        `reversals ${fin.reduce((a, r) => a + r.revs, 0)} (worst step ${Math.max(...fin.map((r) => r.revWorstLn)).toFixed(4)})  |  ` +
        `panMAX ${Math.round(Math.max(...fin.map((r) => r.panStepMax)))} px/frame  |  ` +
        `backMAX ${Math.round(Math.max(...fin.map((r) => r.backMax)))} world px  |  ` +
        `clipped ${med(fin.map((r) => r.clipPct)).toFixed(0)}% (worst ${Math.max(...fin.map((r) => r.clipPct)).toFixed(0)}%)`
    );
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

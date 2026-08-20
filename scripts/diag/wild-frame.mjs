// ============================================================
// File:        scripts/diag/wild-frame.mjs
// Project:     RaceArena — ENDGAME-REPAIR-1 (report-only, changes nothing)
//
// THE QUESTION: he saw the camera GO WILD near the end and show nothing, then recover — and the
// frame after the recovery had no finish line in it. Reproduce that, on HIS OWN CONTEXT.
//
// ── WHY THIS HARNESS EXISTS AND `endgame-spec.mjs` COULD NOT DO IT ────────────────────────────
//
// Every harness on `raceDriver` takes the camera's random seed from the run identity, whose default
// is the fixed constant `1439767152`. The BROWSER does not: since CAMERA-SEED-AND-LINE-1 it derives
// the camera seed from the race seed, through `cameraSeedForRace`. So no existing instrument has
// ever run the camera the browser runs, and a picture he reported could not be stood in.
//
// This one passes `cameraSeedForRace(raceSeed)`, which is the browser's own rule, and sweeps race
// seeds. Race Plan is ON (the driver's own default) and the roster is the Quick Test roster, which
// is what his races carry — and a racer's NAME is physics here, so that is not decoration.
//
// ── WHAT COUNTS AS WILD, AND NONE OF IT IS A TASTE ────────────────────────────────────────────
//
//   JUMP     a single frame that changes the picture's width by more than a factor of two,
//            |d ln(width)| > ln 2. Half or double between two frames is not a camera move.
//   SWEEP    a single frame that moves the picture more than one full frame width sideways,
//            pan step >= the canvas width. The frame's whole content is replaced in one frame.
//   BLIND    a frame in which the shot is TIGHT — no wider than the widest shot this camera has a
//            name for, OVERVIEW's own width — and the finish line is NOT on the canvas. That is the
//            state his photograph shows and the one requirement 5 forbids.
//
// Usage:
//   node scripts/diag/wild-frame.mjs --tracks=space-sprint --seeds=9
//   node scripts/diag/wild-frame.mjs --tracks=space-sprint --seeds=1-40 --arm=his
//   node scripts/diag/wild-frame.mjs --all --seeds=1-12          # every track, both field sizes
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
import { makeConfig } from "./endgame-spec.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { effectiveZoom } = await import(u("client/src/modules/camera/openTrackCamera.js"));
const { OPEN_TRACK_BASE_ZOOM } = await import(u("client/src/modules/camera/projection.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { cameraSeedForRace } = await import(u("client/src/modules/camera/cameraSeed.js"));

const CW = 1280;
const CH = 720;
const JUMP = Math.log(2); // the picture halves or doubles between two frames
const ARM = (process.argv.find((a) => a.startsWith("--arm=")) ?? "--arm=his").slice(6);
const TRACK_ARG = (process.argv.find((a) => a.startsWith("--tracks=")) ?? "").slice(9);
const SEED_ARG = (process.argv.find((a) => a.startsWith("--seeds=")) ?? "--seeds=9").slice(8);
const FROM = Number((process.argv.find((a) => a.startsWith("--from=")) ?? "--from=0.90").slice(7));
const TRACE = process.argv.includes("--trace");

const seeds =
  SEED_ARG.includes("-") ?
    (() => {
      const [a, b] = SEED_ARG.split("-").map(Number);
      const o = [];
      for (let i = a; i <= b; i++) o.push(i);
      return o;
    })()
  : SEED_ARG.split(",").map(Number);

function run(geo, cfg, N, seed) {
  const identity = resolveIdentity({
    racers: N,
    raceSeed: seed,
    racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET),
    canvasW: CW,
    canvasH: CH,
    // THE BROWSER'S OWN RULE, not the driver's default constant. This is the whole point.
    cameraSeed: cameraSeedForRace(seed),
    note: "ENDGAME-REPAIR-1 wild-frame",
  });
  const race = buildRace(geo, identity, cfg);
  const { shape, st, cd, trackWidthPx } = race;
  const bsX = CW / (geo.worldWidth || CW);
  const bsY = shape.isOpen ? null : CH / (geo.worldHeight || CH);
  const effOf = (z) => (shape.isOpen ? effectiveZoom(z, OPEN_TRACK_BASE_ZOOM) : z * bsX);
  const overviewCorr = CW / effOf(cd._overviewStateZoom) / trackWidthPx;

  const f = [];
  let crossed = false;
  let finished = false;
  runRace(race, identity, cfg, () => {
    if (st.finishedCount > 0) {
      finished = true;
      crossed = true;
    }
    if (crossed) return;
    let maxT = 0;
    for (const r of st.racers) if (r.t > maxT) maxT = r.t;
    const p = st.finishT > 0 ? maxT / st.finishT : 0;
    if (p < FROM) return;
    const effX = effOf(cd.zoom);
    if (!(effX > 0)) return;
    const effY = shape.isOpen ? effX : cd.zoom * bsY;
    const line = cd._finishLineWorldPoint(st.finishT);
    const lx = line ? cd.offsetX + line.x * effX : NaN;
    const ly = line ? cd.offsetY + line.y * effY : NaN;
    f.push({
      p,
      w: CW / effX,
      corr: CW / effX / trackWidthPx,
      offX: cd.offsetX,
      offY: cd.offsetY,
      state: cd.state,
      lineOn: !!line && lx >= 0 && lx <= CW && ly >= 0 && ly <= CH,
      lx,
      ly,
    });
  });
  if (!f.length || !finished)
    return { seed, notScorable: true, raceNeverFinished: !finished };

  let jump = 0;
  let jumpAt = NaN;
  let sweep = 0;
  let sweepAt = NaN;
  for (let i = 1; i < f.length; i++) {
    const d = Math.abs(Math.log(f[i].w / f[i - 1].w));
    if (d > jump) {
      jump = d;
      jumpAt = f[i].p;
    }
    const q = Math.hypot(f[i].offX - f[i - 1].offX, f[i].offY - f[i - 1].offY);
    if (q > sweep) {
      sweep = q;
      sweepAt = f[i].p;
    }
  }
  const blind = f.filter((x) => x.corr <= overviewCorr && !x.lineOn);
  if (TRACE) {
    console.log(`\nTRACE ${geo.id} seed ${seed} — OVERVIEW is ${overviewCorr.toFixed(2)} corridors`);
    console.log("    p     corr   lineOn   lineX   lineY   state");
    for (const x of f)
      console.log(
        `  ${x.p.toFixed(4)} ${x.corr.toFixed(2).padStart(7)} ${(x.lineOn ? "  yes" : "  NO ").padStart(7)} ${(Number.isFinite(x.lx) ? x.lx.toFixed(0) : "-").padStart(7)} ${(Number.isFinite(x.ly) ? x.ly.toFixed(0) : "-").padStart(7)}   ${x.state}`
      );
  }
  return {
    seed,
    frames: f.length,
    jumpLn: jump,
    jumpAt,
    jumpWild: jump > JUMP,
    sweepPx: sweep,
    sweepAt,
    sweepWild: sweep >= CW,
    blindFrames: blind.length,
    blindPct: (100 * blind.length) / f.length,
    blindFirstAt: blind.length ? blind[0].p : NaN,
    widestCorr: Math.max(...f.map((x) => x.corr)),
    overviewCorr,
    lineOffPct: (100 * f.filter((x) => !x.lineOn).length) / f.length,
  };
}

const all = loadTracks();
const only =
  TRACK_ARG ? TRACK_ARG.split(",")
  : process.argv.includes("--all") ? null
  : ["space-sprint"];
const cfg = makeConfig(ARM);
console.log(
  `WILD FRAME — arm ${ARM}, camera seed = cameraSeedForRace(raceSeed) (the BROWSER's rule), window [${FROM}, crossing]`
);
console.log(
  "WILD = a frame that halves/doubles the width, or pans a full canvas, or is TIGHT with the line off canvas."
);
console.log(
  "track            seed    n  frames   jumpLn  @prog   sweepPx  @prog   BLIND%  first@  widest  OVERVIEW  lineOff%"
);
let anyWild = false;
for (const geo of all) {
  if (only && !only.includes(geo.id)) continue;
  const probe = buildRace(
    geo,
    resolveIdentity({
      racers: 2,
      raceSeed: 9,
      racerType: TRACK_DEFAULT_RACER,
      canvasW: CW,
      canvasH: CH,
    }),
    cfg
  );
  const N = probe.shape.isOpen ? 100 : 40;
  for (const seed of seeds) {
    const r = run(geo, cfg, N, seed);
    if (r.notScorable) {
      console.log(
        `${geo.id.padEnd(16)}${String(seed).padStart(5)}${String(N).padStart(5)}   — ${r.raceNeverFinished ? "RACE NEVER FINISHES" : "no window frames"}`
      );
      continue;
    }
    const wild = r.jumpWild || r.sweepWild || r.blindFrames > 0;
    anyWild = anyWild || wild;
    console.log(
      [
        geo.id.padEnd(16),
        String(seed).padStart(5),
        String(N).padStart(5),
        String(r.frames).padStart(8),
        r.jumpLn.toFixed(3).padStart(9) + (r.jumpWild ? "!" : " "),
        r.jumpAt.toFixed(3).padStart(6),
        r.sweepPx.toFixed(0).padStart(9) + (r.sweepWild ? "!" : " "),
        r.sweepAt.toFixed(3).padStart(6),
        r.blindPct.toFixed(0).padStart(8) + (r.blindFrames ? "!" : " "),
        (Number.isFinite(r.blindFirstAt) ? r.blindFirstAt.toFixed(3) : "  -  ").padStart(7),
        r.widestCorr.toFixed(1).padStart(8),
        r.overviewCorr.toFixed(1).padStart(10),
        r.lineOffPct.toFixed(0).padStart(10),
      ].join("")
    );
  }
}
console.log(
  anyWild ? "\nAT LEAST ONE WILD FRAME FOUND (marked !)." : "\nNo wild frame on any seed swept."
);

// ============================================================
// File:        scripts/diag/endgame-demand.mjs
// Project:     RaceArena — ENDGAME-REPAIR-1 (report-only, changes nothing)
//
// THE QUESTION: the widen's target is `_lineCeiling` measured from where the anchor ACTUALLY is on
// screen. That quantity has a SINGULARITY — `pointGuarantee` divides by the room left from the
// anchor to the frame's region edge, so as the observed anchor approaches that edge the demanded
// WIDTH runs to infinity, and past it the function answers Infinity ("no zoom fixes this").
//
// So this prints, per frame of the endgame, the two answers side by side:
//   OBS   `_lineCeiling` from the anchor's OBSERVED screen position (what the schedule uses today)
//   RULE  `_lineCeiling` from the position the framing rule INTENDS to put the anchor at
// plus the widest the world-to-canvas mapping itself allows, which is where a runaway demand lands.
//
// Usage:  node scripts/diag/endgame-demand.mjs --arm=shipped [--tracks=ice-track] [--trace]
// ============================================================

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveIdentity, buildRace, runRace, TRACK_DEFAULT_RACER } from "../lib/raceDriver.mjs";
import { makeConfig, tracksAndSizes, med } from "./endgame-spec.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { effectiveZoom } = await import(u("client/src/modules/camera/openTrackCamera.js"));
const { OPEN_TRACK_BASE_ZOOM } = await import(u("client/src/modules/camera/projection.js"));
const { COMPANY_FRAME_PCT } = await import(u("client/src/modules/camera/framingConfig.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));

const CW = 1280, CH = 720, SEED = 9;
const ARM = (process.argv.find((a) => a.startsWith("--arm=")) ?? "--arm=his").slice(6);
const TRACK_ARG = (process.argv.find((a) => a.startsWith("--tracks=")) ?? "").slice(9);
const TRACE = process.argv.includes("--trace");

function measure(geo, cfg, N) {
  const identity = resolveIdentity({
    racers: N, raceSeed: SEED, racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET), canvasW: CW, canvasH: CH, note: "ENDGAME-REPAIR-1",
  });
  const race = buildRace(geo, identity, cfg);
  const { shape, st, cd, trackWidthPx } = race;
  const bsX = CW / (geo.worldWidth || CW);
  const effOf = (z) => (shape.isOpen ? effectiveZoom(z, OPEN_TRACK_BASE_ZOOM) : z * bsX);
  const wOf = (z) => (z > 0 && Number.isFinite(z) ? CW / effOf(z) : Infinity);
  // The widest the world-to-canvas mapping itself allows — where a runaway demand lands.
  const worldWidest = wOf(cd._proj.minEffX ? cd._proj.minEffX() / (shape.isOpen ? 1 : bsX) : NaN);

  const rows = [];
  let crossed = false;
  const orig = cd._lineCeiling.bind(cd);
  cd._lineCeiling = (subjects, frameSize, raceState, framePct, atOverride) => {
    const v = orig(subjects, frameSize, raceState, framePct, atOverride);
    if (arguments0 && atOverride !== undefined) {
      // the schedule's own call: record both answers for this frame
      lastObs = v;
      lastRule = orig(subjects, frameSize, raceState, framePct, null);
    }
    return v;
  };
  const arguments0 = true;
  let lastObs = Infinity, lastRule = Infinity;

  runRace(race, identity, cfg, () => {
    if (st.finishedCount > 0) crossed = true;
    if (crossed) return;
    let maxT = 0;
    for (const r of st.racers) if (r.t > maxT) maxT = r.t;
    const p = st.finishT > 0 ? maxT / st.finishT : 0;
    if (p < 0.9) return;
    if (!cd._runInEngaged || cd._runInAfterDeadline) { lastObs = lastRule = Infinity; return; }
    rows.push({ p, obs: wOf(lastObs), rule: wOf(lastRule), w: wOf(cd.zoom) });
    lastObs = lastRule = Infinity;
  });
  if (!rows.length) return null;
  const finite = (a) => a.filter(Number.isFinite);
  const corr = (x) => x / trackWidthPx;
  if (TRACE) {
    console.log(`\nTRACE ${geo.id}    p       width   OBS(corr)   RULE(corr)`);
    for (const r of rows)
      console.log(
        `  ${r.p.toFixed(4)} ${corr(r.w).toFixed(2).padStart(8)} ${(Number.isFinite(r.obs) ? corr(r.obs).toFixed(2) : "INF").padStart(11)} ${(Number.isFinite(r.rule) ? corr(r.rule).toFixed(2) : "INF").padStart(12)}`
      );
  }
  return {
    track: geo.id, n: N, frames: rows.length,
    obsInfPct: (100 * rows.filter((r) => !Number.isFinite(r.obs)).length) / rows.length,
    ruleInfPct: (100 * rows.filter((r) => !Number.isFinite(r.rule)).length) / rows.length,
    obsMax: corr(Math.max(...finite(rows.map((r) => r.obs)), 0)),
    obsMed: corr(med(finite(rows.map((r) => r.obs)))),
    ruleMax: corr(Math.max(...finite(rows.map((r) => r.rule)), 0)),
    ruleMed: corr(med(finite(rows.map((r) => r.rule)))),
    worldWidest: corr(worldWidest),
  };
}

const only = TRACK_ARG ? TRACK_ARG.split(",") : null;
const cfg = makeConfig(ARM);
console.log(`ENDGAME DEMAND — arm ${ARM}, seed ${SEED}, the widen's frames only. Widths in CORRIDORS.`);
console.log("track              n  frames   OBS-INF%  OBS-med  OBS-max   RULE-INF%  RULE-med  RULE-max   worldWidest");
for (const { geo, n } of tracksAndSizes(only)) {
  const r = measure(geo, cfg, n);
  if (!r) { console.log(`${geo.id.padEnd(16)} — the widen never runs`); continue; }
  console.log(
    [
      r.track.padEnd(16), String(r.n).padStart(4), String(r.frames).padStart(7),
      r.obsInfPct.toFixed(0).padStart(10), r.obsMed.toFixed(1).padStart(9), r.obsMax.toFixed(1).padStart(9),
      r.ruleInfPct.toFixed(0).padStart(12), r.ruleMed.toFixed(1).padStart(10), r.ruleMax.toFixed(1).padStart(9),
      r.worldWidest.toFixed(1).padStart(14),
    ].join("")
  );
}

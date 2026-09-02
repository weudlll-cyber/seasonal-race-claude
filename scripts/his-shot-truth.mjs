// ============================================================
// File:        scripts/his-shot-truth.mjs
// Project:     RaceArena — NIGHT-1 stage C3 / B2
//
// THE QUESTION: with the OWNER'S OWN SETTINGS, how much world does each shot actually show, and how
// much does it BREATHE (min -> max) as the heading swings through a lap?
//
// The unit is the one his marker used and the one `zoomUnit.visibleWorldPx` defines: canvasH divided
// by (camZoom x axisY) — world px visible across the frame's height. His 21:59 marker read
// tz = 1.11662 on an open track, i.e. 720 / (1.11662 x 1.5) = 429.8 px, so this measures exactly the
// number he has already seen.
//
// Race context is his: seed 5601, n = 65, boarder, 60 s, cam seed 882944666.
//
// Usage:  node scripts/his-shot-truth.mjs [--defaults] [--track=mountainstreet]
//         --defaults  run the shipped defaults arm instead of his settings
// ============================================================

import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
  runRace,
  trackWidthOf,
} from "./lib/raceDriver.mjs";
import { DEFAULT_CAMERA_CONFIG } from "../client/src/modules/storage/defaults.js";
import { visibleWorldPx } from "../client/src/modules/camera/zoomUnit.js";
import { roomFromPointAlong } from "../client/src/modules/camera/frameGeometry.js";
import {
  framingFor,
  GUARANTEE,
  POSITION,
  anchorScreenPoint,
} from "../client/src/modules/camera/framingRule.js";
import {
  computeRenderDisplayScale,
  getEffectiveMaxTargetScreenPx,
} from "../client/src/modules/autoSpriteScale.js";

const CH = 720;
const USE_DEFAULTS = process.argv.includes("--defaults");
// ARM B — THE OWNER'S UNIT: 1.0 means "this track's own road width", not the fixed 300 reference.
// It needs NO code change: `referenceWidthFor` returns max(referenceCorridorPx, trackWidthPx), so
// setting referenceCorridorPx to the track's own width IS his unit, expressed in the shipped config.
const OWNER_UNIT = process.argv.includes("--owner-unit");
const COMPANY_ONLY = process.argv.includes("--company-only");
const mrArg = process.argv.find((a) => a.startsWith("--min-racers="));
const MIN_RACERS = mrArg ? Number(mrArg.split("=")[1]) : null;
const trackArg = process.argv.find((a) => a.startsWith("--track="));
const ONLY = trackArg ? trackArg.split("=")[1] : null;

// THE OWNER'S REAL RACE CONTEXT, taken from his marker — deliberately NOT the n=40 context the other
// three harnesses use. That is the point of this script, and it is why the identity prints: NIGHT-1
// once put a figure measured here beside figures measured at n=40.
const IDENTITY = resolveIdentity({
  racers: 65,
  raceSeed: 5601,
  cameraSeed: 882944666,
  racerType: "boarder",
  seconds: 60,
  note: "the owner's own race context, from his marker",
});

/** The owner's settings as of 2026-08-04. A measurement fixture — nothing here is written anywhere. */
const HIS_TOP = {
  minRacersVisible: 5,
  minDrawnFrameFrac: 0.04,
  battleWeight: 0.05,
  overviewWeight: 0.5,
  overviewTargetCount: 3,
};
const HIS_CORRIDORS = {
  LEADER_ZOOM: 1.0,
  OVERVIEW: 2.0,
  BATTLE_ZOOM: 1.2,
  COMEBACK_ZOOM: 1.25,
  LEAD_CHANGE: 1.0,
  PHOTO_FINISH: 0.35,
};

function cameraConfig() {
  const cfg = JSON.parse(JSON.stringify(DEFAULT_CAMERA_CONFIG));
  if (USE_DEFAULTS) return cfg;
  Object.assign(cfg, HIS_TOP);
  if (COMPANY_ONLY) cfg.companyOnlyFraming = true;
  if (MIN_RACERS != null) cfg.minRacersVisible = MIN_RACERS;
  for (const [state, v] of Object.entries(HIS_CORRIDORS)) {
    if (cfg.cameraStateProfiles[state])
      cfg.cameraStateProfiles[state].visibleCorridors = v;
  }
  return cfg;
}

const med = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function measure(geo, cfgIn) {
  const cfg = JSON.parse(JSON.stringify(cfgIn));
  // The reference width must be set BEFORE the director is constructed: buildRace reads the config
  // to compute every zoom level, so mutating it afterwards would silently do nothing.
  const TW = trackWidthOf(geo);
  if (OWNER_UNIT) cfg.referenceCorridorPx = TW;
  const race = buildRace(geo, IDENTITY, cfg);
  const { cd, st, shape, displaySize: ds, bodyRef, racerType: rt } = race;

  const byState = new Map();
  const bindByState = new Map();
  // B1 — the PRICE: how big is a racer actually drawn, as a percentage of frame height?
  const drawnPct = [];
  // M3 — THE PRICE: on CORRIDOR-guarantee states, how much of the road actually fits across the
  // frame from where the anchor sits. < 1 means the road edge is out of frame.
  const roadFrac = [];
  // CAMERA-COMPANY-ONLY-3 §3 verification: does a PAIR state ever fall through to the corridor?
  let pairFrames = 0;
  let pairFallback = 0;
  let floorBound = 0;
  let drawnN = 0;
  // bodyRef IS br.bodyNarrow by construction (ds * (bodyNarrow / ds)), so this is the same value
  // the old prologue computed — the driver returns the reference rather than the intermediate.
  const dsScale = bodyRef / ds;

  runRace(race, IDENTITY, cfg, () => {
    const p = cd._framingProbe;
    if (p && cd.targetZoom > 0 && cd.lerpPhase === "tracking") {
      // The shot the camera is AIMING at, so the tracking lag does not blur the reading.
      const px = visibleWorldPx(cd.targetZoom, cd._proj.axisY, CH);
      if (Number.isFinite(px)) {
        if (!byState.has(cd.state)) byState.set(cd.state, []);
        byState.get(cd.state).push(px);
        // Did the GUARANTEE decide this frame, or the owner's own setting?
        const bound = p.guaranteed < p.stateZoom - 1e-9;
        if (!bindByState.has(cd.state)) bindByState.set(cd.state, [0, 0]);
        const b = bindByState.get(cd.state);
        b[0] += bound ? 1 : 0;
        b[1] += 1;
      }
    }
    {
      const pp = cd._framingProbe;
      if (pp && framingFor(cd.state).guarantee === GUARANTEE.PAIR) {
        pairFrames++;
        const pr = pp.pair;
        if (!Array.isArray(pr) || !pr[0] || !pr[1]) pairFallback++;
      }
    }
    // M3 sample — same method as corridor-truth.mjs, on corridor-guarantee states only.
    {
      const pp = cd._framingProbe;
      const fr = framingFor(cd.state);
      if (pp && fr.guarantee === GUARANTEE.CORRIDOR && cd.zoom > 0) {
        const h = cd._headingAt(pp.t);
        const hl = h ? Math.hypot(h.x, h.y) : 0;
        if (hl > 0) {
          const perp = { x: -h.y / hl, y: h.x / hl };
          const sxp = perp.x * cd._proj.axisX;
          const syp = perp.y * cd._proj.axisY;
          const scaleP = cd.zoom * Math.hypot(sxp, syp);
          if (scaleP > 0) {
            const at = anchorScreenPoint(
              pp.frameW,
              pp.frameH,
              fr.position === POSITION.FORWARD ? cd._leaderForwardFrac : null,
              cd._headingScreen(pp.t),
            );
            const inner = cd._innerFramePct ?? 1;
            const rp = roomFromPointAlong(
              at.x,
              at.y,
              sxp,
              syp,
              pp.frameW,
              pp.frameH,
              inner,
            );
            const rm = roomFromPointAlong(
              at.x,
              at.y,
              -sxp,
              -syp,
              pp.frameW,
              pp.frameH,
              inner,
            );
            roadFrac.push((2 * (Math.min(rp, rm) / scaleP)) / TW);
          }
        }
      }
    }
    // B1 sample, on the same frames
    if (cd.zoom > 0) {
      const frameEffZoom = cd._proj.effX(cd.zoom);
      const maxTarget = getEffectiveMaxTargetScreenPx(
        rt.config?.maxTargetScreenPx,
        cfg.maxTargetScreenPx,
      );
      const scale = computeRenderDisplayScale(
        ds,
        dsScale,
        frameEffZoom,
        maxTarget,
        cfg.minDrawnFrameFrac,
        CH,
      );
      const px = ds * scale * frameEffZoom;
      if (Number.isFinite(px) && px > 0) {
        drawnPct.push((100 * px) / CH);
        drawnN++;
        const proportional = ds * dsScale * frameEffZoom;
        if (proportional < (cfg.minDrawnFrameFrac ?? 0) * CH) floorBound++;
      }
    }
  });
  return {
    id: geo.id,
    open: shape.isOpen,
    TW,
    byState,
    bindByState,
    drawnPct,
    floorPct: drawnN ? (100 * floorBound) / drawnN : 0,
    roadFrac,
    pairFrames,
    pairFallback,
  };
}

const geos = loadTracks({ only: ONLY });

const cfg = cameraConfig();
console.log(
  `VISIBLE WORLD PX (canvasH / (camZoom x axisY)) — ${USE_DEFAULTS ? "SHIPPED DEFAULTS" : "THE OWNER'S SETTINGS"}` +
    (OWNER_UNIT
      ? "  ·  ARM B: HIS UNIT (1.0 = this track own width)"
      : "  ·  ARM A: shipped unit (fixed 300 reference)"),
);
// The config is passed EXPLICITLY because this line is printed BEFORE any race is built, so the
// stamp buildRace leaves has not happened yet. Without it the four arms this script offers
// (--owner-unit, --company-only, --min-racers=, --defaults) all print one identical line.
console.log(formatIdentity(IDENTITY, cfg));
console.log(
  "track            TW   state             frames    min      median      max     breath   guarantee binds",
);
const B1 = [];
for (const geo of geos) {
  const r = measure(geo, cfg);
  B1.push(r);
  const states = [...r.byState.keys()].sort();
  for (const s of states) {
    const a = r.byState.get(s);
    const mn = Math.min(...a);
    const mx = Math.max(...a);
    const [bound, tot] = r.bindByState.get(s) ?? [0, 1];
    console.log(
      `  ${r.id.padEnd(15)} ${String(r.TW).padStart(3)}  ${s.padEnd(16)} ${String(a.length).padStart(6)}  ` +
        `${mn.toFixed(1).padStart(7)}  ${med(a).toFixed(1).padStart(8)}  ${mx.toFixed(1).padStart(8)}  ` +
        `${(mx / mn).toFixed(3).padStart(6)}x   ${((100 * bound) / tot).toFixed(1).padStart(5)}%`,
    );
  }
}

console.log("\nB1 - DRAWN RACER HEIGHT as % of frame height (the price)\n");
console.log("track            TW    min%     median%    max%     floor binds");
const meds = [];
for (const r of B1) {
  if (!r.drawnPct.length) continue;
  const mn = Math.min(...r.drawnPct);
  const mx = Math.max(...r.drawnPct);
  const m = med(r.drawnPct);
  meds.push({ id: r.id, m });
  console.log(
    "  " +
      r.id.padEnd(15) +
      String(r.TW).padStart(3) +
      " " +
      mn.toFixed(2).padStart(7) +
      "  " +
      m.toFixed(2).padStart(8) +
      "  " +
      mx.toFixed(2).padStart(7) +
      "   " +
      r.floorPct.toFixed(1).padStart(6) +
      "%",
  );
}
if (meds.length) {
  meds.sort((a, b) => a.m - b.m);
  const lo = meds[0];
  const hi = meds[meds.length - 1];
  console.log(
    "\n  SMALLEST racer: " +
      lo.id +
      " at " +
      lo.m.toFixed(2) +
      "% of frame height",
  );
  console.log("  BIGGEST  racer: " + hi.id + " at " + hi.m.toFixed(2) + "%");
  console.log("  SPREAD across tracks = " + (hi.m / lo.m).toFixed(3) + "x");
}

// M3 — THE PRICE: how often is the road edge out of frame, and by how much?
console.log(
  "\nM3 - ROAD EDGE OUT OF FRAME (corridor states only; 1.00 = whole road fits)\n",
);
console.log(
  "track            TW   frames   out-of-frame%   worst (road fraction shown)   worst missing px",
);
for (const r of B1) {
  if (!r.roadFrac || !r.roadFrac.length) continue;
  const out = r.roadFrac.filter((v) => v < 1).length;
  const worst = Math.min(...r.roadFrac);
  const missing = worst < 1 ? (1 - worst) * r.TW : 0;
  console.log(
    "  " +
      r.id.padEnd(15) +
      String(r.TW).padStart(3) +
      String(r.roadFrac.length).padStart(8) +
      ((100 * out) / r.roadFrac.length).toFixed(1).padStart(13) +
      "%" +
      worst.toFixed(3).padStart(24) +
      missing.toFixed(0).padStart(20) +
      " px",
  );
}

console.log("");
console.log(
  "PAIR-STATE CORRIDOR FALLBACK (does corridorGuarantee stay reachable?)",
);
let tf = 0,
  tb = 0;
for (const r of B1) {
  tf += r.pairFrames || 0;
  tb += r.pairFallback || 0;
  if (r.pairFrames)
    console.log(
      "  " +
        r.id.padEnd(15) +
        " pair frames " +
        String(r.pairFrames).padStart(6) +
        "   fell back to corridor " +
        String(r.pairFallback).padStart(6) +
        "  (" +
        ((100 * r.pairFallback) / r.pairFrames).toFixed(2) +
        "%)",
    );
}
console.log(
  "  TOTAL " +
    tb +
    " of " +
    tf +
    " pair frames = " +
    ((100 * tb) / (tf || 1)).toFixed(3) +
    "%",
);

// ============================================================
// File:        scripts/line-visible-truth.mjs
// Project:     RaceArena — LINE-VISIBLE-1
//
// THE QUESTION: ENDGAME-WIDTH-1 reported the finish line "lost" on 21-42 % of endgame frames. WHAT
// did that count — the line off the screen, or the line merely outside the 70 % inner box the
// run-in's ceiling guarantees it inside? The first is a defect; the second is a rule stricter than
// the owner needs. Nothing should be built until that is settled.
//
// IT CHANGES NOTHING. `_framingProbe` is written by the director every frame and read by nothing in
// the camera; the guarantees below are the director's own `pointGuarantee` called with its own
// anchor placement. No camera file is touched.
//
// THE THREE CRITERIA, measured on the DELIVERED frame (the one the viewer sees, pan and zoom as
// actually applied — not the target the ceiling reasons about):
//   OFF-SCREEN   the line's centre point outside the frame entirely. A real loss.
//   OUTSIDE-BOX  inside the frame but outside the 70 % inner box. A margin violation only.
//   BAND         the fraction of the line's own BAND — `getPosition(ft, ±0.5)`, the segment the
//                world's finish gate is drawn at — that lies inside the frame. This is the owner's
//                definition: roughly nine tenths visible is enough, the ends may be cut.
//
// THE TWO CANDIDATE WIDTHS are the director's own `pointGuarantee`, differing ONLY in the region the
// line must sit inside: `innerFramePct` 0.7 as today, and 1.0 for the owner's rule. The ratio is
// 1/0.7 = 1.43 by construction; what the run measures is what that costs in world px and whether the
// band condition still holds there. HIS 0.9 IS USED AS A CHECK, never as a fudge — no margin,
// hysteresis or floor is added.
//
// Usage:
//   node scripts/line-visible-truth.mjs
//   node scripts/line-visible-truth.mjs --tracks=space-sprint --json
// ============================================================

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveIdentity, loadTracks, buildRace, runRace, TRACK_DEFAULT_RACER } from "./lib/raceDriver.mjs";
// ONE HOME (ONE-HOME-FIVE-MORE-1, 2026-08-23): `HIS` and `setPath` were a PRIVATE COPY here.
// ONE-HOME-THREE-TRUTHS-1 gave the arm a home in `lib/hisArm.mjs` but recorded the duplication as
// "exactly two" and converted two files; it was SEVEN. This file was one of the five it missed.
// The copy removed here was verified byte-identical to the home before it was deleted.
import { HIS, setPath } from "./lib/hisArm.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CAMERA_CONFIG, DEFAULT_CONFIG_WORLD } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { computeBodyNarrowRef } = await import(u("client/src/modules/rowLayout.js"));
const { effectiveZoom } = await import(u("client/src/modules/camera/openTrackCamera.js"));
const { OPEN_TRACK_BASE_ZOOM, projectionForTrack } = await import(
  u("client/src/modules/camera/projection.js")
);
const { pointGuarantee, anchorScreenPoint } = await import(
  u("client/src/modules/camera/framingRule.js")
);
const { QUICK_TEST_NAME_SETS, DEFAULT_NAME_SET } = await import(
  u("client/src/modules/racerNames.js")
);

const CW = 1280;
const CH = 720;
const SEED = 9;
const INNER_TODAY = 0.7;
const INNER_HIS = 1.0;
const BAND_ENOUGH = 0.9; // HIS number
const JSON_OUT = process.argv.includes("--json");
const TRACK_ARG = (process.argv.find((a) => a.startsWith("--tracks=")) ?? "").slice(9);
const ROSTER = QUICK_TEST_NAME_SETS[DEFAULT_NAME_SET];

const hisConfig = () => {
  const cfg = structuredClone(DEFAULT_CAMERA_CONFIG);
  for (const [path, v] of HIS) setPath(cfg, path, v);
  return cfg;
};

const TERMS = ["state", "guarantee", "company", "field", "line"];

/** Fraction of segment A→B inside the axis-aligned rect [0,w]×[0,h] (Liang–Barsky). */
function fractionInside(ax, ay, bx, by, w, h) {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dy = by - ay;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  if (!clip(-dx, ax) || !clip(dx, w - ax) || !clip(-dy, ay) || !clip(dy, h - ay)) return 0;
  return Math.max(0, t1 - t0);
}

function measureTrack(geo, cfg, arm, N) {
  const identity = resolveIdentity({
    racers: N,
    raceSeed: SEED,
    racerType: TRACK_DEFAULT_RACER,
    seconds: 60,
    canvasW: CW,
    canvasH: CH,
    roster: ROSTER,
  });
  const race = buildRace(geo, identity, cfg);
  const { shape, trackWidthPx: TW, racerType: rt, displaySize: ds, st, cd } = race;

  const W = DEFAULT_CONFIG_WORLD;
  const behaviorConfig = { ...W.raceBehaviorConfig, isOpen: shape.isOpen };
  const bfN = Math.min(rt.config.bodyFillX, rt.config.bodyFillY);
  const effW = TW * behaviorConfig.startSpreadRange;
  const br = computeBodyNarrowRef(Math.min(285, effW), N, ds, bfN, W.autoScaleConfig);
  const worldBody = ds * (br.bodyNarrow / ds);

  const bsX = CW / (geo.worldWidth || CW);
  const bsY = CH / (geo.worldHeight || CH);
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, shape.isOpen);
  const floorPx = (cfg.minDrawnFrameFrac ?? 0) * CH;
  const zoomToWidth = (z) => {
    if (!(z > 0) || !Number.isFinite(z)) return Infinity;
    const e = shape.isOpen ? effectiveZoom(z, OPEN_TRACK_BASE_ZOOM) : z * bsX;
    return e > 0 ? CW / e : Infinity;
  };

  const f = [];
  runRace(race, identity, cfg, ({ ts, raceStart }) => {
    const p = cd._framingProbe;
    if (!p || p.runInActive !== true || st.finishedCount > 0) return;

    const effX = shape.isOpen ? effectiveZoom(cd.zoom, OPEN_TRACK_BASE_ZOOM) : cd.zoom * bsX;
    const effY = shape.isOpen ? effX : cd.zoom * bsY;
    if (!(effX > 0)) return;

    const ft = shape.isOpen ? Math.min(1, st.finishT) : ((st.finishT % 1) + 1) % 1;
    const c = shape.getPosition(ft, 0);
    const e0 = shape.getPosition(ft, -0.5);
    const e1 = shape.getPosition(ft, 0.5);
    const sx = (q) => cd.offsetX + q.x * effX;
    const sy = (q) => cd.offsetY + q.y * effY;

    const cx = sx(c);
    const cy = sy(c);
    const offScreen = !(cx >= 0 && cx <= CW && cy >= 0 && cy <= CH);
    const ib = { x0: (CW * (1 - INNER_TODAY)) / 2, x1: CW - (CW * (1 - INNER_TODAY)) / 2,
                 y0: (CH * (1 - INNER_TODAY)) / 2, y1: CH - (CH * (1 - INNER_TODAY)) / 2 };
    const outsideBox = !offScreen && !(cx >= ib.x0 && cx <= ib.x1 && cy >= ib.y0 && cy <= ib.y1);
    const bandVisible = fractionInside(sx(e0), sy(e0), sx(e1), sy(e1), CW, CH);

    // The two candidate widths, from the director's own guarantee and its own anchor placement.
    let w07 = Infinity;
    let w10 = Infinity;
    if (p.point) {
      const at = anchorScreenPoint(p.frameW, p.frameH, cd._forwardFracNow(), cd._headingScreen(p.t));
      w07 = zoomToWidth(pointGuarantee(p.point, c, proj.axisX, proj.axisY, p.frameW, p.frameH, INNER_TODAY, at));
      w10 = zoomToWidth(pointGuarantee(p.point, c, proj.axisX, proj.axisY, p.frameW, p.frameH, INNER_HIS, at));
    }

    // THE LAG, measured rather than assumed: how far the line's screen position differs between the
    // TARGET frame the ceiling reasons about and the DELIVERED frame the viewer sees.
    const tz = p.guaranteed;
    let lagPx = null;
    if (tz > 0 && Number.isFinite(tz)) {
      const tEffX = shape.isOpen ? effectiveZoom(tz, OPEN_TRACK_BASE_ZOOM) : tz * bsX;
      const tEffY = shape.isOpen ? tEffX : tz * bsY;
      const tcx = (cd.targetOffsetX ?? cd.offsetX) + c.x * tEffX;
      const tcy = (cd.targetOffsetY ?? cd.offsetY) + c.y * tEffY;
      lagPx = Math.hypot(cx - tcx, cy - tcy);
    }

    f.push({
      tSec: +((ts - raceStart) / 1000).toFixed(2),
      widthNow: CW / effX,
      offScreen,
      outsideBox,
      bandVisible,
      bandOk: bandVisible >= BAND_ENOUGH,
      w07,
      w10,
      lagPx,
      binding: p.binding,
      ceilings: Object.fromEntries(TERMS.map((k) => [k, zoomToWidth(p.ceilings[k])])),
    });
  });

  return { track: geo.id, isOpen: shape.isOpen, racers: N, arm, worldBody, floorPx, frames: f };
}

const all = loadTracks().filter((g) => (TRACK_ARG ? TRACK_ARG.split(",").includes(g.id) : true));
const rows = [];
for (const geo of all) {
  const probe = buildRace(
    geo,
    resolveIdentity({ racers: 2, raceSeed: SEED, racerType: TRACK_DEFAULT_RACER, seconds: 60, canvasW: CW, canvasH: CH, roster: ROSTER }),
    DEFAULT_CAMERA_CONFIG
  );
  const big = probe.shape.isOpen ? 100 : 40;
  for (const N of [20, big]) {
    rows.push(measureTrack(geo, hisConfig(), "his", N));
    rows.push(measureTrack(geo, structuredClone(DEFAULT_CAMERA_CONFIG), "shipped", N));
  }
}

const pct = (n, d) => (d > 0 ? ((100 * n) / d).toFixed(0) + "%" : "—");
const med = (a) => { const b = a.filter(Number.isFinite).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
const at = (f, frac) => f[Math.min(f.length - 1, Math.floor(frac * (f.length - 1)))];

if (JSON_OUT) {
  console.log(JSON.stringify(rows, null, 1));
} else {
  console.log("LINE-VISIBLE-1 — what \"the line is in frame\" measures, on the DELIVERED frame");
  console.log(`seed ${SEED}, ${CW}x${CH}; inner box today ${INNER_TODAY}, his rule ${INNER_HIS} + band >= ${BAND_ENOUGH}`);
  console.log("");
  console.log("track            n    arm      frames  OFF-SCREEN  outside-box  band<0.9   medBand   width now   w@0.7   w@1.0   lag px");
  for (const r of rows) {
    const f = r.frames;
    if (!f.length) { console.log(`${r.track.padEnd(16)}${String(r.racers).padStart(4)}  ${r.arm.padEnd(8)} — no endgame frames`); continue; }
    console.log(
      [
        r.track.padEnd(16),
        String(r.racers).padStart(4),
        "  " + r.arm.padEnd(8),
        String(f.length).padStart(6),
        pct(f.filter((x) => x.offScreen).length, f.length).padStart(12),
        pct(f.filter((x) => x.outsideBox).length, f.length).padStart(13),
        pct(f.filter((x) => !x.bandOk).length, f.length).padStart(10),
        med(f.map((x) => x.bandVisible)).toFixed(2).padStart(10),
        String(Math.round(med(f.map((x) => x.widthNow)))).padStart(12),
        (Number.isFinite(med(f.map((x) => x.w07))) ? String(Math.round(med(f.map((x) => x.w07)))) : "—").padStart(8),
        (Number.isFinite(med(f.map((x) => x.w10))) ? String(Math.round(med(f.map((x) => x.w10)))) : "—").padStart(8),
        med(f.map((x) => x.lagPx)).toFixed(0).padStart(8),
      ].join("")
    );
  }
  console.log("");
  console.log("THREE MOMENTS — width today vs his rule (w@1.0), and the over-scale each implies");
  console.log("track            n    arm       opening now/his   mid now/his      cross now/his    over now->his (mid)");
  for (const r of rows) {
    const f = r.frames;
    if (!f.length) continue;
    const o = at(f, 0), m = at(f, 0.5), c = at(f, 1);
    const over = (w) => (r.floorPx * w) / (r.worldBody * CW);
    const pair = (x) => `${Math.round(x.widthNow)}/${Number.isFinite(x.w10) ? Math.round(x.w10) : "—"}`;
    console.log(
      [
        r.track.padEnd(16),
        String(r.racers).padStart(4),
        "  " + r.arm.padEnd(9),
        pair(o).padStart(14),
        pair(m).padStart(16),
        pair(c).padStart(17),
        `   ${over(m.widthNow).toFixed(2)}x -> ${Number.isFinite(m.w10) ? over(m.w10).toFixed(2) + "x" : "—"}`,
      ].join("")
    );
  }
  console.log("");
  console.log("WHICH CEILING WOULD BIND at his width (w@1.0 replacing the line term), per track");
  console.log("track            n    arm       binding now                 binding after");
  for (const r of rows) {
    const f = r.frames;
    if (!f.length) continue;
    const share = (sel) => {
      const c = {};
      for (const x of f) { const k = sel(x); c[k] = (c[k] ?? 0) + 1; }
      return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k} ${pct(v, f.length)}`).join(" ");
    };
    const after = (x) => {
      const d = { ...x.ceilings, line: x.w10 };
      let best = "state";
      for (const k of TERMS) if (d[k] > d[best]) best = k; // WIDEST demand wins (Math.min on zoom)
      return best;
    };
    console.log(r.track.padEnd(16) + String(r.racers).padStart(4) + "  " + r.arm.padEnd(9) + share((x) => x.binding).padEnd(28) + share(after));
  }
}

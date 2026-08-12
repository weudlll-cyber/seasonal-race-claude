// ============================================================
// File:        scripts/endgame-width-truth.mjs
// Project:     RaceArena — FRONT-GROUP-7
//
// THE QUESTION, and it is the owner's: the endgame floor holds the CORRIDOR'S full width, but on
// river-run seed 2814 the shot "shows almost too much of the track, and that much room is not
// needed". His rule was **see everyone sharing the width**, not **show the full width where nobody
// races**. So: how much of the corridor do the racers actually occupy, and what would binding on
// THAT instead cost or save?
//
// ── WHAT IT MEASURES, three things, all read off a real seeded race ─────────────────────────────
//
// 1. THE SLACK. `physicalY` is in [-1,+1] across the corridor and one unit is `trackWidth/2` world
//    px (raceBehavior.js §"physicalY <-> world-pixel helpers"), so the lateral extent the field
//    actually occupies is `(maxY - minY) * trackWidth / 2` — directly comparable to the width the
//    floor asks for. Reported as world px and as a fraction of the corridor.
//
// 2. WHAT THE DIAGONAL COSTS. `corridorGuarantee` projects the heading's perpendicular through each
//    axis scale separately and compares it against the frame's true chord in that direction. On an
//    angled corridor that asks for more zoom-out than the same width lying along a screen axis.
//    Measured as the ratio of the ceiling at the ACTUAL heading to the best axis-aligned ceiling for
//    the SAME width — 1.00 means the orientation is free, 0.60 means the diagonal costs 40%.
//
// 3. WHAT THE BODY PADDING LEAVES UNCOVERED. The floor asks for `trackWidth + _drawnBodyWidthRefPx`,
//    i.e. half a NARROW body reference past each edge — but the drawn sprite is wider than that
//    reference. Measured per track as `bodyRef / drawnSpriteWorldPx` at the endgame zoom.
//
// The yardstick for who "the racers" are is FIXED and is the one FRONT-GROUP-3 graded on: the LIVE
// TOP SIX. An arm must not be allowed to define its own subject — that is how the first front-group
// harness flattered itself, and the whole reason the fixed yardstick exists.
//
// Usage:
//   node scripts/endgame-width-truth.mjs                              # ten tracks, seed 9
//   node scripts/endgame-width-truth.mjs --only=river-run --seeds=2814
//   node scripts/endgame-width-truth.mjs --seeds=9,2814,5601 --csv
// ============================================================

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
  DEFAULT_CONFIG_WORLD,
} from "./lib/raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CAMERA_CONFIG } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { resolveNameSet, DEFAULT_NAME_SET } = await import(
  u("client/src/modules/racerNames.js")
);
const { corridorGuarantee, anchorScreenPoint } = await import(
  u("client/src/modules/camera/framingRule.js")
);
const {
  computeRenderDisplayScale,
  drawnRacerScreenPx,
  getEffectiveMaxTargetScreenPx,
} = await import(u("client/src/modules/autoSpriteScale.js"));

const argOf = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const ONLY = argOf("only", null);
const CSV = process.argv.includes("--csv");
const SEEDS = argOf("seeds", argOf("seed", "9"))
  .split(",")
  .map((s) => Number(s.trim()))
  .filter(Number.isFinite);
const N_RACERS = Number(argOf("racers", "20"));
const GRADE = process.argv.includes("--grade");
// THE THREE ARMS. `off` is the pre-FRONT-GROUP-6 behaviour, `floor` is what is on master's branch
// today (the corridor's full width), `extent` is the refinement under test.
const ARMS = {
  off: { endgameCorridorFloor: false },
  floor: { endgameCorridorFloor: true, endgameFloorBindsExtent: false },
  extent: { endgameCorridorFloor: true, endgameFloorBindsExtent: true },
  // ── THE DIAGNOSTIC ARM (FRONT-GROUP-7 §4) ─────────────────────────────────────────────────────
  // `extent` cuts racers. The hypothesis is that the plain floor was paying for the BODY-PADDING GAP
  // with empty road: `_drawnBodyWidthRefPx` is the NARROW reference and covers under half the DRAWN
  // sprite, so removing the slack exposes the rest. This arm tests exactly that by padding with the
  // DRAWN body instead, computed from the previous frame's zoom.
  //
  // IT IS A MEASUREMENT, NOT A CANDIDATE BUILD, and the monkey-patch below says so honestly: the
  // director is NOT GIVEN the drawn sprite size today, so shipping this would mean plumbing a render
  // quantity into the camera. What this arm answers is whether that plumbing would be worth doing.
  "extent-drawn": { endgameCorridorFloor: true, endgameFloorBindsExtent: true },
};
const ARM = argOf("arm", GRADE ? "extent" : "floor");
if (!ARMS[ARM]) {
  console.error(`FAIL: unknown --arm=${ARM}. One of: ${Object.keys(ARMS).join(", ")}`);
  process.exit(2);
}

const CW = 1280;
const CH = 720;
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const CFG = { ...DEFAULT_CAMERA_CONFIG, ...ARMS[ARM] };

/** The FIXED yardstick: the live top six by arc position. Never an arm's own definition. */
function topSix(racers) {
  return [...racers.filter((r) => r && !r.finished)]
    .sort((a, b) => b.t - a.t)
    .slice(0, 6);
}

const med = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
const p95 = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(0.95 * s.length))];
};

/**
 * THE DIAGNOSTIC PATCH. Re-implements `_endgameCorridorCeiling` with the DRAWN body as the pad.
 * Lives here rather than in the director because the director has no way to know the drawn size —
 * that is the whole finding, and hiding it behind a shipped key would misrepresent the cost.
 */
function patchDrawnPad(race) {
  const { cd: d, displaySize, racerType, trackWidthPx } = race;
  const proj = d._proj;
  const dsScale = DEFAULT_CONFIG_WORLD.autoScaleConfig?.displaySizeScale ?? 1;
  const cap = getEffectiveMaxTargetScreenPx(
    racerType?.config?.maxTargetScreenPx,
    CFG.maxTargetScreenPx,
  );
  d._endgameCorridorCeiling = function (subjects, frameSize, racers, raceState) {
    if (!this._endgameCorridorFloor) return Infinity;
    if (!subjects?.point || !(this._trackWidthPx > 0)) return Infinity;
    if (!(raceState?.finishT > 0)) return Infinity;
    let maxT = 0;
    for (const r of racers) if (r && r.t > maxT) maxT = r.t;
    if (!(maxT / raceState.finishT > this._endgameThreshold)) return Infinity;
    // The drawn body in WORLD px, at the zoom the camera is currently at — one frame of lag, which
    // is what a shipped version would also have unless it iterated.
    const eX = proj.effX(this.zoom);
    const sc = computeRenderDisplayScale(
      displaySize, dsScale, eX, cap, CFG.minDrawnFrameFrac, CH,
    );
    const drawnWorld = eX > 0 ? drawnRacerScreenPx(displaySize, sc, eX) / eX : 0;
    const pad = Math.max(this._drawnBodyWidthRefPx, drawnWorld);
    const full = trackWidthPx + pad;
    let lo = Infinity, hi = -Infinity;
    for (const r of racers) {
      const y = r?.physicalY;
      if (!Number.isFinite(y)) continue;
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
    const ask = hi >= lo ? Math.min(((hi - lo) * trackWidthPx) / 2 + pad, full) : full;
    const at = anchorScreenPoint(
      frameSize.width, frameSize.height, this._forwardFracNow(), this._headingScreen(subjects.t),
    );
    return corridorGuarantee(
      this._headingAt(subjects.t), ask, proj.axisX, proj.axisY,
      frameSize.width, frameSize.height, 1, at,
    );
  };
}

const rows = [];

for (const geo of loadTracks({ only: ONLY })) {
  for (const raceSeed of SEEDS) {
    const identity = resolveIdentity({
      racers: N_RACERS,
      raceSeed,
      racerType: TRACK_DEFAULT_RACER,
      roster: ROSTER,
      note: "FRONT-GROUP-7 endgame width survey",
    });
    const race = buildRace(geo, identity, CFG);
    const { cd, displaySize, racerType, trackWidthPx, bodyRef } = race;
    if (ARM === "extent-drawn") patchDrawnPad(race);
    const proj = cd._proj;
    const dsScale = DEFAULT_CONFIG_WORLD.autoScaleConfig?.displaySizeScale ?? 1;
    const maxTargetPx = getEffectiveMaxTargetScreenPx(
      racerType?.config?.maxTargetScreenPx,
      CFG.maxTargetScreenPx,
    );
    const endgame = CFG.endgameThreshold;

    // Per-frame series over the endgame window.
    const spanAll = []; // lateral extent, whole live field, world px
    const spanSix = []; // lateral extent, the graded top six, world px
    const diagRatio = []; // ceiling(actual heading) / best axis-aligned ceiling, same width
    const bodyFrac = []; // bodyRef / drawn sprite world width
    const atCap = []; // is the drawn sprite pinned at maxTargetScreenPx?
    const wouldSave = []; // extent-bound ceiling / floor ceiling  (>1 = the shot could be tighter)
    let crossing = null;
    let prevFinished = 0;
    let pfSpanSix = [];
    let pfWouldSave = [];
    let frames = 0;
    // ── THE GRADE, on the FIXED yardstick: is each of the live top six WHOLE in frame? ───────────
    // WHOLE / CUT / OUTSIDE, using the renderer's own drawn size. A centre test undercounts by five
    // (FRONT-GROUP-1): the owner was looking at a racer cut in half, which passes a centre test.
    let pfFrames = 0, pfCut = 0, pfOut = 0, pfNotWhole = 0;
    let endCut = 0, endOut = 0, endNotWhole = 0;
    let crossZoom = null, crossStateZoom = null;
    // ── WHICH DIRECTION LOSES THEM (FRONT-GROUP-7 §4) ────────────────────────────────────────────
    // The corridor guarantee only ever constrains the PERPENDICULAR. If the racers that go
    // out of frame are leaving ALONG the track instead, then the full-width floor was never buying
    // lateral room at all — it was buying longitudinal room as a side effect, and no refinement of
    // the WIDTH can keep it. Decomposed against the heading, in screen space, per lost racer.
    let lostAlong = 0, lostAcross = 0;

    runRace(
      race,
      identity,
      CFG,
      ({ cd: d, st: s }) => {
        let maxT = 0;
        for (const r of s.racers) if (r.t > maxT) maxT = r.t;
        if (!(s.finishT > 0)) return;
        if (!(maxT / s.finishT > endgame)) return;
        const fp = d._framingProbe;
        if (!fp?.point) return;
        frames++;

        // ── 1. THE SLACK ────────────────────────────────────────────────────────────────────────
        // physicalY in [-1,+1]; one unit = trackWidth/2 world px.
        const live = s.racers.filter((r) => r && !r.finished);
        const yAll = live.map((r) => r.physicalY ?? 0);
        const six = topSix(s.racers);
        const ySix = six.map((r) => r.physicalY ?? 0);
        const extentAll = yAll.length
          ? ((Math.max(...yAll) - Math.min(...yAll)) * trackWidthPx) / 2
          : 0;
        const extentSix = ySix.length
          ? ((Math.max(...ySix) - Math.min(...ySix)) * trackWidthPx) / 2
          : 0;
        spanAll.push(extentAll);
        spanSix.push(extentSix);

        // ── 2. THE DIAGONAL, and 3. THE BODY, priced through the real guarantee ─────────────────
        const at = anchorScreenPoint(
          fp.frameW,
          fp.frameH,
          d._forwardFracNow(),
          d._headingScreen(fp.t),
        );
        const heading = d._headingAt(fp.t);
        const askFloor = trackWidthPx + bodyRef;
        const askExtent = Math.min(extentSix + bodyRef, askFloor);
        const ceilAt = (h, w) =>
          corridorGuarantee(
            h,
            w,
            proj.axisX,
            proj.axisY,
            fp.frameW,
            fp.frameH,
            1,
            at,
          );
        const cFloor = ceilAt(heading, askFloor);
        const cExtent = ceilAt(heading, askExtent);
        // "the same width lying flat": the corridor running along a screen axis, both ways, best of.
        const flatBest = Math.max(
          ceilAt({ x: 1, y: 0 }, askFloor),
          ceilAt({ x: 0, y: 1 }, askFloor),
        );
        if (Number.isFinite(cFloor) && Number.isFinite(flatBest) && flatBest > 0)
          diagRatio.push(cFloor / flatBest);
        if (Number.isFinite(cFloor) && cFloor > 0 && Number.isFinite(cExtent))
          wouldSave.push(cExtent / cFloor);

        const eX = proj.effX(d.zoom);
        const dScale = computeRenderDisplayScale(
          displaySize,
          dsScale,
          eX,
          maxTargetPx,
          CFG.minDrawnFrameFrac,
          CH,
        );
        const drawnScreen = drawnRacerScreenPx(displaySize, dScale, eX);
        const drawnWorld = drawnScreen / eX;
        if (drawnWorld > 0) bodyFrac.push(bodyRef / drawnWorld);
        // IS THE SPRITE AT ITS SCREEN CAP? This decides whether closing the body gap is CIRCULAR.
        // If the drawn size is pinned at `maxTargetScreenPx`, the drawn SCREEN width is a constant
        // and the world width the ceiling needs is exactly `cap / (zoom * axisX)` — a closed form the
        // director can solve. If it is not at the cap, the drawn size still depends on the zoom being
        // solved for and only an iteration or a one-frame lag can close it.
        atCap.push(drawnScreen >= maxTargetPx - 1e-6 ? 1 : 0);

        const halfW = drawnRacerScreenPx(displaySize, dScale, eX) / 2;
        const halfH = drawnRacerScreenPx(displaySize, dScale, proj.effY(d.zoom)) / 2;
        let cut = 0, outside = 0;
        for (const m of six) {
          const pt = proj.toScreen(m, d.zoom, d.offsetX, d.offsetY);
          const centreIn = pt.x >= 0 && pt.x <= CW && pt.y >= 0 && pt.y <= CH;
          const whole =
            pt.x - halfW >= 0 && pt.x + halfW <= CW && pt.y - halfH >= 0 && pt.y + halfH <= CH;
          if (whole) continue;
          if (centreIn) cut++;
          else outside++;
          // How far OUTSIDE each edge, decomposed onto the heading's screen direction.
          const hs = d._headingScreen(fp.t);
          const hn = Math.hypot(hs?.x ?? 0, hs?.y ?? 0) || 1;
          const ux = (hs?.x ?? 1) / hn, uy = (hs?.y ?? 0) / hn;
          const ox = Math.max(0, halfW - pt.x, pt.x + halfW - CW);
          const oy = Math.max(0, halfH - pt.y, pt.y + halfH - CH);
          // |along| and |across| components of the (ox,oy) overflow vector.
          const along = Math.abs(ox * ux) + Math.abs(oy * uy);
          const across = Math.abs(ox * -uy) + Math.abs(oy * ux);
          if (along >= across) lostAlong++;
          else lostAcross++;
        }
        if (cut > 0) endCut++;
        if (outside > 0) endOut++;
        if (cut + outside > 0) endNotWhole++;
        if (d.hudState === "PHOTO_FINISH") {
          pfFrames++;
          if (cut > 0) pfCut++;
          if (outside > 0) pfOut++;
          if (cut + outside > 0) pfNotWhole++;
        }
        if (crossZoom === null && s.finishedCount > prevFinished) {
          crossZoom = d.zoom;
          crossStateZoom = fp.stateZoom;
        }

        if (d.hudState === "PHOTO_FINISH") {
          pfSpanSix.push(extentSix);
          if (Number.isFinite(cFloor) && cFloor > 0) pfWouldSave.push(cExtent / cFloor);
        }
        if (crossing === null && s.finishedCount > prevFinished) {
          crossing = {
            extentAll,
            extentSix,
            frac: extentSix / trackWidthPx,
            diag:
              Number.isFinite(cFloor) && flatBest > 0 ? cFloor / flatBest : NaN,
            save: cFloor > 0 ? cExtent / cFloor : NaN,
            zoom: d.zoom,
            stateZoom: fp.stateZoom,
          };
        }
        prevFinished = s.finishedCount;
      },
      { slowmo: true },
    );

    rows.push({
      track: geo.id,
      seed: raceSeed,
      trackWidthPx,
      bodyRef,
      frames,
      extentAllMed: med(spanAll),
      extentSixMed: med(spanSix),
      extentSixP95: p95(spanSix),
      fracSixMed: med(spanSix) / trackWidthPx,
      fracSixP95: p95(spanSix) / trackWidthPx,
      fracAllMed: med(spanAll) / trackWidthPx,
      diagMed: med(diagRatio),
      diagMin: diagRatio.length ? Math.min(...diagRatio) : NaN,
      bodyFracMed: med(bodyFrac),
      atCapFrac: atCap.length ? atCap.reduce((a, b) => a + b, 0) / atCap.length : NaN,
      saveMed: med(wouldSave),
      pfSaveMed: med(pfWouldSave),
      pfFracMed: med(pfSpanSix) / trackWidthPx,
      crossing,
      pfFrames, pfCut, pfOut, pfNotWhole,
      endFrames: frames, endCut, endOut, endNotWhole,
      crossZoom, crossStateZoom, lostAlong, lostAcross,
      identity,
    });
  }
}

const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : "—");
const pc = (n) => (Number.isFinite(n) ? `${(100 * n).toFixed(1)}%` : "—");

if (GRADE) {
  // ── THE DECISION RULE'S OWN NUMBERS ───────────────────────────────────────────────────────────
  // Share of frames on which a top-six racer is NOT WHOLE, and how tight the crossing shot is
  // against the shot the state would have chosen on its own.
  console.log(`
THE GRADE — arm=${ARM}. Live top six, whole/cut/outside, the fixed yardstick.
`);
  console.log(
    "track            PFfrm   PF cut / out / not-whole      ENDGAME cut / out / not-whole    crossing vs ordinary",
  );
  const T = { pf: 0, pfC: 0, pfO: 0, pfN: 0, e: 0, eC: 0, eO: 0, eN: 0 };
  const rels = [];
  for (const r of rows) {
    if (!r.endFrames) continue;
    T.pf += r.pfFrames; T.pfC += r.pfCut; T.pfO += r.pfOut; T.pfN += r.pfNotWhole;
    T.e += r.endFrames; T.eC += r.endCut; T.eO += r.endOut; T.eN += r.endNotWhole;
    const rel =
      r.crossZoom && r.crossStateZoom ? (100 * r.crossZoom) / r.crossStateZoom : NaN;
    if (Number.isFinite(rel)) rels.push(rel);
    const q = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "—").padStart(7);
    console.log(
      `${r.track.padEnd(15)} ${String(r.pfFrames).padStart(5)}   ` +
        `${q(r.pfCut, r.pfFrames)} /${q(r.pfOut, r.pfFrames)} /${q(r.pfNotWhole, r.pfFrames)}   ` +
        `${q(r.endCut, r.endFrames)} /${q(r.endOut, r.endFrames)} /${q(r.endNotWhole, r.endFrames)}   ` +
        `${Number.isFinite(rel) ? `${rel.toFixed(0)}%` : "—"}`,
    );
  }
  const q = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "—");
  console.log(
    `
POOLED PHOTO_FINISH (${T.pf} frames): cut ${q(T.pfC, T.pf)}, fully outside ${q(T.pfO, T.pf)}, ` +
      `NOT WHOLE ${q(T.pfN, T.pf)}`,
  );
  console.log(
    `POOLED ENDGAME (${T.e} frames): cut ${q(T.eC, T.e)}, fully outside ${q(T.eO, T.e)}, ` +
      `NOT WHOLE ${q(T.eN, T.e)}`,
  );
  const LA = rows.reduce((a, r) => a + (r.lostAlong || 0), 0);
  const LX = rows.reduce((a, r) => a + (r.lostAcross || 0), 0);
  console.log(
    `WHICH DIRECTION LOSES THEM (${LA + LX} lost-racer-frames): ALONG the track ${q(LA, LA + LX)}, ` +
      `ACROSS it ${q(LX, LA + LX)}. The corridor guarantee only constrains ACROSS.`,
  );
  if (rels.length)
    console.log(
      `CROSSING SHOT vs the ordinary one: min ${Math.min(...rels).toFixed(0)}%, ` +
        `median ${med(rels).toFixed(0)}%, max ${Math.max(...rels).toFixed(0)}%, ` +
        `mean ${(rels.reduce((a, b) => a + b, 0) / rels.length).toFixed(0)}%`,
    );
  if (rows.length) console.log(`
${formatIdentity(rows[0].identity)}`);
} else if (CSV) {
  console.log(
    "track,seed,trackWidthPx,bodyRef,frames,extentSixMed,fracSixMed,fracSixP95,diagMed,bodyFracMed,saveMed,pfFracMed,crossingFrac,crossingSave",
  );
  for (const r of rows)
    console.log(
      [
        r.track,
        r.seed,
        r.trackWidthPx.toFixed(2),
        r.bodyRef.toFixed(2),
        r.frames,
        r.extentSixMed.toFixed(2),
        r.fracSixMed.toFixed(4),
        r.fracSixP95.toFixed(4),
        r.diagMed.toFixed(4),
        r.bodyFracMed.toFixed(4),
        r.saveMed.toFixed(4),
        r.pfFracMed.toFixed(4),
        r.crossing ? r.crossing.frac.toFixed(4) : "",
        r.crossing ? r.crossing.save.toFixed(4) : "",
      ].join(","),
    );
} else {
  console.log(
    "\nTHE SLACK — how much of the corridor the racers actually occupy (top six, the fixed yardstick)\n",
  );
  console.log(
    "track            width   body   frm   extent px   of width   p95     diag cost   body cov   could tighten   at crossing",
  );
  for (const r of rows) {
    console.log(
      `${r.track.padEnd(15)} ${f1(r.trackWidthPx).padStart(6)} ${f1(r.bodyRef).padStart(6)} ` +
        `${String(r.frames).padStart(5)}   ${f1(r.extentSixMed).padStart(8)}   ` +
        `${pc(r.fracSixMed).padStart(7)}  ${pc(r.fracSixP95).padStart(6)}   ` +
        `${pc(r.diagMed).padStart(8)}   ${pc(r.bodyFracMed).padStart(7)}   ` +
        `${(Number.isFinite(r.saveMed) ? r.saveMed.toFixed(2) + "x" : "—").padStart(11)}   ` +
        `${r.crossing ? `${pc(r.crossing.frac)} / ${r.crossing.save.toFixed(2)}x` : "—"}`,
    );
  }
  const pool = (pick) => rows.map(pick).filter(Number.isFinite);
  console.log(
    `\nPOOLED over ${rows.length} race(s): extent = ${pc(med(pool((r) => r.fracSixMed)))} of the corridor ` +
      `(p95 ${pc(med(pool((r) => r.fracSixP95)))}), whole live field ${pc(med(pool((r) => r.fracAllMed)))}`,
  );
  console.log(
    `THE DIAGONAL costs, median across tracks: the angled corridor's ceiling is ` +
      `${pc(med(pool((r) => r.diagMed)))} of the same width lying flat ` +
      `(worst single frame ${pc(Math.min(...pool((r) => r.diagMin)))}).`,
  );
  console.log(
    `THE BODY PADDING covers ${pc(med(pool((r) => r.bodyFracMed)))} of the drawn sprite (median across tracks); ` +
      `the remainder is what can still be clipped at the corridor edge. The sprite is pinned at its ` +
      `screen cap on ${pc(med(pool((r) => r.atCapFrac)))} of endgame frames — where it is, the world ` +
      `width the ceiling needs is cap/(zoom*axisX), a closed form; where it is not, only an iteration ` +
      `or a one-frame lag can close the gap.`,
  );
  console.log(
    `BINDING ON THE EXTENT INSTEAD would allow a ${med(pool((r) => r.saveMed)).toFixed(2)}x tighter shot ` +
      `over the endgame, ${med(pool((r) => r.pfSaveMed)).toFixed(2)}x through the photo finish.`,
  );
  if (rows.length) console.log(`\n${formatIdentity(rows[0].identity)}`);
}

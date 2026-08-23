// ============================================================
// File:        scripts/label-names-truth.mjs
// Project:     RaceArena — LABEL-NAMES-2
//
// THE QUESTION: the owner's screenshots show NAME labels. The shipped configuration cannot draw one
// — `labelNamesWhenRoom` is false, so the wide form is never offered. His stored configuration
// deviates from the shipped defaults in ELEVEN keys. Which of them produces the names?
//
// HIS ELEVEN VALUES ARE THE ONLY PART OF HIS SNAPSHOT THAT APPEARS HERE. They were quoted in the
// brief that commissioned this measurement. Nothing else from his browser is read, stored or
// committed — the snapshot contains his race history and is not the repository's business.
//
// HOW IT ANSWERS: leave-one-out. Run his full config, then his config with ONE key reverted to its
// shipped value at a time. The key whose removal takes the name count to zero is the answer; if no
// single key does, the pairs are reported instead.
//
// IT DRIVES THE REAL PATH — `scripts/lib/raceDriver.mjs` builds and runs the race, `renderRaceFrame`
// draws every frame into a recording context, and the name/number counts are read back from the
// layout's own returned sets. EVERY frame is rendered, never sampled: the label layout is stateful
// (an incumbent label is offered its pixels first, and a name is EARNED over `labelFormHoldMs` of
// continuously clear geometry), so a run that skipped frames would feed it a history the browser
// never produces.
//
// Usage:
//   node scripts/label-names-truth.mjs                 # his config, the two frames, the audit
//   node scripts/label-names-truth.mjs --leave-one-out # + one run per reverted key
//   node scripts/label-names-truth.mjs --only=<key>    # one named arm
// ============================================================

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// ONE HOME (ONE-HOME-FIVE-MORE-1, 2026-08-23): `HIS` and `setPath` were a PRIVATE COPY here.
// ONE-HOME-THREE-TRUTHS-1 gave the arm a home in `lib/hisArm.mjs` but recorded the duplication as
// "exactly two" and converted two files; it was SEVEN. This file was one of the five it missed.
// The copy removed here was verified byte-identical to the home before it was deleted.
import { HIS, setPath } from "./lib/hisArm.mjs";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "./lib/raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CAMERA_CONFIG, DEFAULT_CONFIG_WORLD } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { renderRaceFrame } = await import(u("client/src/screens/RaceScreen/renderRaceFrame.js"));
const { attachRenderState, attachRacerRenderState } = await import(
  u("client/src/screens/RaceScreen/renderState.js")
);
const { createRecordingContext } = await import(u("client/src/modules/parity/recordingContext.js"));
const { DEFAULT_TRACK_LIGHTS, sampleBoundaryAtInterval, LIGHT_SPACING_PX } = await import(
  u("client/src/modules/trackLights.js")
);
const { QUICK_TEST_NAME_SETS, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { assignRaceNumbers, raceNumberLabel } = await import(u("client/src/modules/raceNumbers.js"));
const { createLabelFormHold } = await import(u("client/src/screens/RaceScreen/labelFormHold.js"));
const { labelBoxWidth, tagFontScreenPx, labelOffsetAbove, labelBoxHeight } = await import(
  u("client/src/screens/RaceScreen/nameTagLayout.js")
);
const { computeBodyNarrowRef } = await import(u("client/src/modules/rowLayout.js"));
const { PHASE } = await import(u("client/src/screens/RaceScreen/racePhase.js"));

// ── THE ROSTER, AND IT IS NOT COSMETIC ──────────────────────────────────────────────────────────
// A racer's NAME is an engine input — `stablePairBit` hashes it — so a different roster is a
// DIFFERENT RACE at the same seed. It is also the width the room test is deciding about, which makes
// it the one input this measurement must not get wrong twice.
//
// LABEL-NAMES-2 ran `QUICK_TEST_NAMES_MIXED`. The owner's screenshot names — Crimson, Hawk, Nebula,
// Pulsar, Garnet — are in `QUICK_TEST_NAMES`, the set `DEFAULT_NAME_SET` resolves to, which is what
// a Quick Test uses unless he changed it. So that run measured the wrong race.
// ── REAL FONT METRICS, NOT THE SYNTHETIC ONES ───────────────────────────────────────────────────
// LABEL-OVERLAP-3's first finding: the audit shared the layout's synthetic `length x px x 0.55`, so
// it could only ever CONFIRM the layout. The fix is not a cleverer audit — it is to stop guessing the
// widths. `scripts/fixtures/label-metrics-chrome.json` is a table of REAL `ctx.measureText` widths
// captured from Chrome at `bold 15.84px sans-serif`, the exact font `drawNameTag` draws with, for
// every name in the roster and every race number. With it the layout decides what the BROWSER'S
// layout would decide, and the overlap audit measures the boxes the browser would draw.
//
// A string the table does not carry falls back to the synthetic estimate and is COUNTED, so a silent
// gap cannot masquerade as a measurement — the same rule the stamp guard learned this week.
const METRICS = JSON.parse(
  readFileSync(join(ROOT, "scripts/fixtures/label-metrics-chrome.json"), "utf8")
);
let METRIC_MISSES = 0;
const realWidth = (text, fontPx) => {
  const w = METRICS.widths[String(text)];
  if (w != null) return w;
  METRIC_MISSES++;
  return String(text).length * fontPx * 0.55;
};

const ROSTER_KEY = (process.argv.find((a) => a.startsWith("--roster=")) ?? "").slice(9) || DEFAULT_NAME_SET;
const ROSTER = QUICK_TEST_NAME_SETS[ROSTER_KEY] ?? QUICK_TEST_NAME_SETS[DEFAULT_NAME_SET];

const CW = 1280;
const CH = 720;
const TRACK = "space-sprint";
const N = Number((process.argv.find((a) => a.startsWith("--racers=")) ?? "").slice(9)) || 60;
const SEED = 9;

// ── HIS ELEVEN DEVIATIONS ───────────────────────────────────────────────────────────────────────
// Written as a flat list of (path, value) so a single one can be reverted by name.

const getPath = (o, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);

/** His config, optionally with ONE key put back to its shipped value. */
function configWith(revertKey = null) {
  const cfg = structuredClone(DEFAULT_CAMERA_CONFIG);
  for (const [path, v] of HIS) {
    if (path === revertKey) continue;
    setPath(cfg, path, v);
  }
  return cfg;
}

const geo = loadTracks({ only: TRACK })[0];
const IDENTITY = resolveIdentity({
  racers: N,
  raceSeed: SEED,
  racerType: TRACK_DEFAULT_RACER,
  seconds: 60,
  canvasW: CW,
  canvasH: CH,
  roster: ROSTER,
  note: "LABEL-NAMES-2 — his configuration",
});

const bsX = CW / (geo.worldWidth || CW);
const bsY = CH / (geo.worldHeight || CH);
const trackLightsConfig = { ...DEFAULT_TRACK_LIGHTS };

const DUMP_ARG0 = (process.argv.find((a) => a.startsWith("--dump-at=")) ?? "").slice(10);
const DUMP_AT = DUMP_ARG0 ? Number(DUMP_ARG0) : null;
let DUMPED = null;

/** One full race under `cfg`. Returns the per-frame rows. */
function run(cfg, label) {
  const race = buildRace(geo, IDENTITY, cfg);
  const { shape, trackWidthPx: TW, racerType: rt, displaySize: ds, st, cd, meta } = race;
  // THE THIRD HARNESS DEFECT IN THIS FILE, and the third of the same kind: a call that looked right
  // and did nothing. `assignRaceNumbers(count, seed)` takes a COUNT and RETURNS an array — it does
  // not mutate racers. Called as `assignRaceNumbers(st.racers)` it received an array where it wanted
  // a number, resolved it to 0, and returned []. So no racer had a `raceNumber`, every NUMBER label
  // was `raceNumberLabel(undefined)` = the empty string, and the layout reasoned about 10 px boxes
  // (the padding alone) where the game draws 20-27 px. That gave the room test far more space than
  // it really has and is why it admitted names without collisions. Every other harness in this repo
  // already does it the way RaceScreen does (index.jsx:702); this one did not.
  const numbers = assignRaceNumbers(st.racers.length, SEED);
  for (const r of st.racers) r.raceNumber = numbers[r.index] ?? null;
  attachRenderState(st);
  attachRacerRenderState(st.racers);

  const W = DEFAULT_CONFIG_WORLD;
  const behaviorConfig = { ...W.raceBehaviorConfig, isOpen: shape.isOpen };
  const bfN = Math.min(rt.config.bodyFillX, rt.config.bodyFillY);
  const effW = TW * behaviorConfig.startSpreadRange;
  const br = computeBodyNarrowRef(Math.min(285, effW), N, ds, bfN, W.autoScaleConfig);
  const displaySizeScale = br.bodyNarrow / ds;

  const { outer: eo, inner: ei } = shape.getEdgePoints(800);
  const cachedLightPts = {
    outer: sampleBoundaryAtInterval(eo, LIGHT_SPACING_PX),
    inner: sampleBoundaryAtInterval(ei, LIGHT_SPACING_PX),
  };

  let tagIncumbents = null;
  let tagWideForms = null;
  const tagFormHold = createLabelFormHold();
  const leaderDiag = { snapshots: [], frozen: false };
  const rows = [];

  runRace(race, IDENTITY, cfg, ({ ts, raceStart, frame }) => {
    // ── THE HARNESS DEFECT THIS LINE CLOSES, and it invalidated an earlier report ────────────────
    // `renderRaceFrame` computes `showAllTags` from `st.raceStart`:
    //     showAllTags = st.phase !== RACING || (ts - st.raceStart) < nameTagAllUntilMs
    // `scripts/lib/raceDriver.mjs` keeps `raceStart` as a LOCAL and never assigns it to the state —
    // only the live RaceScreen does (index.jsx:891). So on this driver `st.raceStart` is null,
    // `raceElapsedMs` is 0, and showAllTags is TRUE FOR THE WHOLE RACE. `computeTagLayout` then takes
    // its START-FORMATION early return, which labels everyone, does no decluttering, and returns
    // `wide` EMPTY — so every harness on this driver reports ZERO names no matter what the config
    // says, and reports the roll call's label counts rather than the decluttered ones.
    //
    // That is what produced SPRITE-SIZE-OVERVIEW-1's "zero names across 125 frames". It was a
    // property of the harness, not of the game. `render-fingerprint.mjs` is unaffected — it runs its
    // own loop and sets `st.raceStart` (line 522).
    // TWO fields, not one — `showAllTags` short-circuits on the PHASE first, and the driver sets
    // neither. With `st.phase` left at whatever `createRaceFromIdentity` produced, the first term is
    // already true and the clock is never consulted.
    if (st.raceStart == null) {
      st.raceStart = raceStart;
      st.phase = PHASE.RACING;
    }
    const cam = { zoom: cd.zoom, offsetX: cd.offsetX, offsetY: cd.offsetY };
    // The recording context measures text with the REAL table, so `computeTagLayout` inside
    // `renderRaceFrame` decides on the browser's widths rather than on an estimate.
    const rec = createRecordingContext({
      width: CW,
      height: CH,
      measureWidth: (text, font) => {
        const m = /(\d+(?:\.\d+)?)px/.exec(font ?? "");
        return realWidth(text, m ? parseFloat(m[1]) : 10);
      },
    });
    const out = renderRaceFrame(rec, {
      st,
      cam,
      shape,
      raceData: { eventName: geo.name ?? geo.id, trackName: geo.id, subtitle: "" },
      isOpenTrack: shape.isOpen,
      bsX,
      bsY,
      worldWidth: geo.worldWidth,
      worldHeight: geo.worldHeight,
      openTrackHW: shape.isOpen ? TW / 2 : 0,
      bgImagePath: null,
      bgCanvasReady: false,
      ceremonyBrand: null,
      effects: [],
      cachedLightPts,
      trackLightsConfig,
      racerType: rt,
      cameraConfig: cfg,
      camera: {
        hudState: cd.hudState,
        state: cd.state,
        anchorRacerIndex: cd.anchorRacerIndex,
        comebackLockedRacerIndex: cd.comebackLockedRacerIndex,
        detectBattleGroup: (racers) => cd.detectBattleGroup(racers),
      },
      displaySize: ds,
      displaySizeScale,
      assignmentByRacer: meta.assignmentByRacer ?? new Map(),
      showRpStartRow: false,
      showRpMinimapBadges: false,
      rpPlanInfo: meta.rpPlanInfo ?? null,
      renderAlpha: 1,
      interpolationEnabled: false,
      tagIncumbents,
      tagWideForms,
      tagFormHold,
      leaderDiag,
      // Synthetic, fixed — the same shape render-fingerprint uses. The RACING phase draws the HUD
      // pills, which read these; `null` was survivable only while the harness was stuck in the
      // countdown branch, which is itself a symptom of the defect above.
      cfgBadge: { hashShort: "labelnames", raceCount: 0, cosmeticCount: 0 },
      buildBadge: { commit: "labelnames", branch: "labelnames", dirty: false },
      racePlanActive: true,
      racePlanSeed: SEED,
      gapRerollDevMarker: false,
      canvasW: CW,
      canvasH: CH,
      ts,
    });
    tagIncumbents = out.tagShown;
    tagWideForms = out.tagWideForms;

    if (frame % 30 !== 0) return;

    const { effZoomX, effZoomY, displayScale } = out;
    const drawnW = ds * displayScale * effZoomX;
    const drawnH = ds * displayScale * effZoomY;
    const shown = out.tagShown ?? new Set();
    const wide = out.tagWide ?? new Set();
    const fontPx = tagFontScreenPx(cfg.nameTagFrameFrac, CH);
    const measure = (t) => labelBoxWidth(realWidth(t, fontPx));

    // ── THE AUDIT: does every NAME that was drawn actually have the clearance the rule asks for?
    // Rebuilt from the DRAWN geometry — each label's box where the renderer puts it — and tested
    // against every other drawn label box and every drawn racer body. This is deliberately an
    // INDEPENDENT reconstruction: the question is whether the layout's decision agrees with the
    // picture, so asking the layout would answer nothing.
    const boxes = [];
    for (const r of st.racers) {
      if (!shown.has(r.index)) continue;
      const sx = cam.offsetX + r.x * effZoomX;
      const sy = cam.offsetY + r.y * effZoomY;
      const isName = wide.has(r.index);
      const text = isName ? (r.name ?? "") : raceNumberLabel(r.raceNumber);
      const w = measure(text);
      const h = labelBoxHeight(fontPx);
      const off = labelOffsetAbove(drawnH, cfg.nameTagMarginPx);
      boxes.push({
        index: r.index,
        isName,
        x0: sx - w / 2,
        x1: sx + w / 2,
        y0: sy - off - h,
        y1: sy - off,
        bx0: sx - drawnW / 2,
        bx1: sx + drawnW / 2,
        by0: sy - drawnH / 2,
        by1: sy + drawnH / 2,
      });
    }
    const hits = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    const hitsBody = (a, b) => a.x0 < b.bx1 && b.bx0 < a.x1 && a.y0 < b.by1 && b.by0 < a.y1;
    // WHO IS EXEMPT. `renderRaceFrame` computes this itself — the director's anchor, or the leader
    // where the shot is a group and the anchor is null — and an exempt racer's name is drawn
    // REGARDLESS of clearance (LABEL-FOCUS-1, nameTagLayout.js:440). So an overlapping exempt name is
    // the rule working as designed; an overlapping NON-exempt name is the room test admitting a name
    // that does not have the room. The two must be counted apart or the audit says nothing.
    let focusIdx = cd.anchorRacerIndex ?? null;
    if (focusIdx == null && st.racers.length) {
      let ld = st.racers[0];
      for (const r of st.racers) if ((r?.t ?? 0) > (ld?.t ?? 0)) ld = r;
      focusIdx = ld?.index ?? null;
    }
    let namesOverlapping = 0;
    let namesOverlappingExempt = 0;
    for (const a of boxes) {
      if (!a.isName) continue;
      let bad = false;
      for (const b of boxes) {
        if (a.index === b.index) continue;
        if (hits(a, b) || hitsBody(a, b)) {
          bad = true;
          break;
        }
      }
      if (bad) {
        namesOverlapping++;
        if (a.index === focusIdx) namesOverlappingExempt++;
      }
    }

    // Median nearest-neighbour CENTRE distance on screen, in canvas px — the space a label has to
    // live in, and the quantity a wider shot changes.
    const pts = st.racers
      .map((r) => ({ x: cam.offsetX + r.x * effZoomX, y: cam.offsetY + r.y * effZoomY }))
      .filter((p) => p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH);
    const nn = pts.map((a, i) => {
      let best = Infinity;
      pts.forEach((b, j) => {
        if (i === j) return;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < best) best = d;
      });
      return best;
    });
    const nnSorted = [...nn].sort((a, b) => a - b);
    const nnMedian = nnSorted.length ? nnSorted[nnSorted.length >> 1] : NaN;

    // THE COST OF ANY FIX: how many racers were eligible for a label and did not get one. A repair
    // that empties the picture of labels is not a repair, so this is measured rather than discovered.
    const eligibleApprox = st.racers.filter((r) => {
      const sx = cam.offsetX + r.x * effZoomX;
      const sy = cam.offsetY + r.y * effZoomY;
      const m = 0.02 * CH;
      return sx >= m && sx <= CW - m && sy >= m && sy <= CH - m;
    }).length;

    const onScreen = st.racers.filter((r) => {
      const sx = cam.offsetX + r.x * effZoomX;
      const sy = cam.offsetY + r.y * effZoomY;
      return sx >= 0 && sx <= CW && sy >= 0 && sy <= CH;
    }).length;

    if (DUMP_AT != null && Math.abs((ts - raceStart) / 1000 - DUMP_AT) < 0.01) {
      DUMPED = {
        tSec: +((ts - raceStart) / 1000).toFixed(2),
        state: cd.state,
        worldPx: Math.round(CW / effZoomX),
        fontPx,
        marginPx: cfg.nameTagMarginPx,
        drawnW: +drawnW.toFixed(3),
        drawnH: +drawnH.toFixed(3),
        canvasW: CW,
        canvasH: CH,
        focusIdx,
        bodies: st.racers.map((r) => ({
          index: r.index,
          sx: +(cam.offsetX + r.x * effZoomX).toFixed(3),
          sy: +(cam.offsetY + r.y * effZoomY).toFixed(3),
        })),
        labels: st.racers
          .filter((r) => shown.has(r.index))
          .map((r) => ({
            index: r.index,
            isName: wide.has(r.index),
            text: wide.has(r.index) ? (r.name ?? "") : raceNumberLabel(r.raceNumber),
            sx: +(cam.offsetX + r.x * effZoomX).toFixed(3),
            sy: +(cam.offsetY + r.y * effZoomY).toFixed(3),
          })),
      };
    }
    rows.push({
      arm: label,
      tSec: +((ts - raceStart) / 1000).toFixed(2),
      state: cd.state,
      zoom: +cam.zoom.toFixed(5),
      worldPx: Math.round(CW / effZoomX),
      drawnW: +drawnW.toFixed(1),
      onScreen,
      labels: shown.size,
      names: wide.size,
      numbers: shown.size - wide.size,
      namesOverlapping,
      namesOverlappingExempt,
      eligibleApprox,
      dropped: eligibleApprox - shown.size,
      nnMedian: +nnMedian.toFixed(2),
      progress: +(st.racers.reduce((m, r) => Math.max(m, r.t), 0) / st.finishT).toFixed(3),
    });
  });
  return rows;
}

/** The two frames he photographed, chosen by a rule so the pair is reproducible. */
function frames(rows) {
  const ov = rows.filter((r) => r.state === "OVERVIEW");
  const mid = ov.filter((r) => r.tSec > 10 && r.progress < 0.85);
  const pre = ov.filter((r) => r.progress >= 0.85 && r.progress < 0.95);
  const widest = (a) => (a.length ? [...a].sort((x, y) => x.worldPx - y.worldPx).pop() : null);
  // The picture he approved: the median LEADER_ZOOM frame by world width. A fix must not move it.
  const lz = rows.filter((r) => r.state === "LEADER_ZOOM");
  const racing = lz.length ? [...lz].sort((a, b) => a.worldPx - b.worldPx)[lz.length >> 1] : null;
  return { mid: widest(mid), pre: widest(pre), racing, allOverview: ov };
}

const ONLY = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7);
const LOO = process.argv.includes("--leave-one-out");

const base = run(configWith(null), "HIS CONFIG");
const f = frames(base);
const totalNames = base.reduce((s, r) => s + r.names, 0);
const ovNames = f.allOverview.reduce((s, r) => s + r.names, 0);

console.log(`LABEL-NAMES-2 — ${TRACK}, seed ${SEED}, ${N} racers, ${CW}x${CH}, HIS configuration, roster "${ROSTER_KEY}"`);
console.log("");
console.log("THE TWO FRAMES HE PHOTOGRAPHED");
console.log("  frame                    t(s)   prog   world   on  elig   lbl  drop  NAMES  numbers  overlapNames(exempt)");
for (const [k, r] of [
  ["wide OVERVIEW mid-race", f.mid],
  ["wide shot before the run-in", f.pre],
  ["racing shot (median LEADER_ZOOM)", f.racing],
]) {
  if (!r) {
    console.log(`  ${k.padEnd(24)} — no such frame in this race`);
    continue;
  }
  console.log(
    `  ${k.padEnd(24)}${String(r.tSec).padStart(5)}${r.progress.toFixed(2).padStart(7)}` +
      `${String(r.worldPx).padStart(8)}${String(r.onScreen).padStart(5)}${String(r.eligibleApprox).padStart(6)}` +
      `${String(r.labels).padStart(6)}${String(r.dropped).padStart(6)}${String(r.names).padStart(7)}` +
      `${String(r.numbers).padStart(9)}` +
      `${String(r.namesOverlapping).padStart(14)}${(" (" + r.namesOverlappingExempt + ")").padEnd(5)}`
  );
}
console.log("");
// ── THE WHOLE RACE, NOT THE TWO FRAMES I CHOSE ──────────────────────────────────────────────────
// LABEL-OVERLAP-3: reporting the overlap count of a frame picked by MY rule is exactly the failure
// mode this repository has paid for three times this week — a window sampled before the shot
// settled. So every sampled frame is ranked, and the worst is printed whether or not it is one of
// the two the rule chose.
{
  const ranked = [...base].sort((a, b) => b.namesOverlapping - a.namesOverlapping);
  const worst = ranked[0];
  console.log("");
  console.log("WORST FRAMES BY OVERLAPPING NAME LABELS, across every sampled frame");
  console.log("   t(s)   prog  state          world   on   lbl  NAMES  overlapping(exempt)");
  for (const r of ranked.slice(0, 6)) {
    console.log(
      `  ${String(r.tSec).padStart(5)}${r.progress.toFixed(2).padStart(7)}  ${r.state.padEnd(13)}` +
        `${String(r.worldPx).padStart(7)}${String(r.onScreen).padStart(5)}${String(r.labels).padStart(6)}` +
        `${String(r.names).padStart(7)}${String(r.namesOverlapping).padStart(13)}` +
        ` (${r.namesOverlappingExempt})`
    );
  }
  console.log(
    `  MAX overlapping name labels anywhere in the race: ${worst.namesOverlapping}` +
      ` (at t=${worst.tSec}s, ${worst.state}); non-exempt: ${worst.namesOverlapping - worst.namesOverlappingExempt}`
  );
  console.log("");
}
console.log(`  across the whole race: ${totalNames} name-labels drawn over ${base.length} sampled frames`);
console.log(`  in OVERVIEW only:      ${ovNames} over ${f.allOverview.length} frames`);
console.log("");

if (LOO || ONLY) {
  console.log("LEAVE-ONE-OUT — his config with ONE key back at its shipped value");
  console.log("  reverted key                                shipped value        NAMES(total)  NAMES(overview)  delta");
  const keys = ONLY ? HIS.filter(([k]) => k === ONLY) : HIS;
  for (const [path] of keys) {
    const rows = run(configWith(path), `revert ${path}`);
    const fr = frames(rows);
    const t = rows.reduce((s, r) => s + r.names, 0);
    const o = fr.allOverview.reduce((s, r) => s + r.names, 0);
    if (ONLY && fr.mid) {
      const m = fr.mid;
      console.log(
        `    [mid-race frame with ${path} reverted] world ${m.worldPx} px · ${m.onScreen} on screen · ` +
          `nn-spacing ${m.nnMedian.toFixed(1)} px · drawn ${m.drawnW} px · ${m.names} names`
      );
    }
    const shippedV = JSON.stringify(getPath(DEFAULT_CAMERA_CONFIG, path));
    console.log(
      `  ${path.padEnd(44)}${String(shippedV).padEnd(21)}${String(t).padStart(12)}${String(o).padStart(17)}` +
        `${(t - totalNames >= 0 ? "+" : "") + (t - totalNames)}`.padStart(9)
    );
  }
}

if (DUMP_AT != null) {
  // The DRAWN geometry of one frame, for an independent pixel count in a real browser. Positions and
  // strings only — the widths are deliberately NOT included, because measuring them with this
  // harness's synthetic metric is the very thing the pixel count exists to check.
  console.log("");
  console.log("DUMP " + JSON.stringify(DUMPED));
}

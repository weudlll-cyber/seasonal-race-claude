// ============================================================
// File:        scripts/diag/notfindable-census.mjs
// Project:     RaceArena — VIEWER-INVARIANTS-1 (report-only, changes nothing)
//
// THE QUESTION: ENDGAME-REPAIR-1 reported "the line is findable in 88.0% of endgame frames". That
// 12% has been discussed as a MARGIN problem — the pan trailing its target by a few tens of pixels.
// The owner has since pointed out that his black frame has NO LEADER AND NO LINE IN IT, which means
// the check did not miss the excursion. It COUNTED it, as a percentage.
//
// So this looks at the not-findable frames ONE AT A TIME and asks which they are:
//
//   A NEAR-MISS       the line is a little outside the region, the leader is in shot, and the camera
//                     is on the course. A margin problem, which is what the pan-lag story assumed.
//   AN EXCURSION      the leader is ALSO out of shot, and/or the camera centre is nowhere near the
//                     course. Nothing about a margin explains that; it is a different defect.
//
// The discriminator is not a taste. `check-runin-frame` has held for a year that a camera centre
// more than 2 TRACK WIDTHS off the spine is a camera pointed away from the race, and that a frame
// with NO racer on it is a defect by inspection needing no threshold at all. Both are reused here
// verbatim rather than re-invented.
//
// IT MEASURES THE SAME THING `check-runin-frame` DOES, through the director's own calls: the line's
// world point from `_finishLineWorldPoint`, world->screen through `_proj.toScreen`, and the region
// from `COMPANY_FRAME_PCT`. If the two disagree, this file is wrong.
//
// Usage:
//   node scripts/diag/notfindable-census.mjs                       # ten tracks, shipped defaults
//   node scripts/diag/notfindable-census.mjs --arm=his --seeds=9
//   node scripts/diag/notfindable-census.mjs --tracks=space-sprint --seeds=9 --worst
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
const { COMPANY_FRAME_PCT } = await import(u("client/src/modules/camera/framingRule.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { cameraSeedForRace } = await import(u("client/src/modules/camera/cameraSeed.js"));
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));

const CW = 1280;
const CH = 720;
/** `check-runin-frame`'s own figure for "the camera is pointed away from the race". Not new. */
const MAX_CENTRE_OFF_TW = 2;
const SPINE_SAMPLES = 1200;
const BAND_SAMPLES = 40;
const HX = (CW * COMPANY_FRAME_PCT) / 2;
const HY = (CH * COMPANY_FRAME_PCT) / 2;

const ARM = (process.argv.find((a) => a.startsWith("--arm=")) ?? "--arm=shipped").slice(6);
const TRACK_ARG = (process.argv.find((a) => a.startsWith("--tracks=")) ?? "").slice(9);
const SEED_ARG = (process.argv.find((a) => a.startsWith("--seeds=")) ?? "--seeds=9").slice(8);
const WORST = process.argv.includes("--worst");
const seeds =
  SEED_ARG.includes("-") ?
    (() => {
      const [a, b] = SEED_ARG.split("-").map(Number);
      const o = [];
      for (let i = a; i <= b; i++) o.push(i);
      return o;
    })()
  : SEED_ARG.split(",").map(Number);

const shapeT = (shape, finishT) =>
  shape.isOpen ? Math.min(1, finishT) : ((finishT % 1) + 1) % 1;

function census(geo, cfg, N, seed) {
  const identity = resolveIdentity({
    racers: N,
    raceSeed: seed,
    racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET),
    canvasW: CW,
    canvasH: CH,
    cameraSeed: cameraSeedForRace(seed),
    note: "VIEWER-INVARIANTS-1 census",
  });
  const race = buildRace(geo, identity, cfg);
  const { shape, st, cd, trackWidthPx } = race;
  const bsX = CW / (geo.worldWidth || CW);
  const bsY = shape.isOpen ? null : CH / (geo.worldHeight || CH);
  const effOf = (z) => (shape.isOpen ? effectiveZoom(z, OPEN_TRACK_BASE_ZOOM) : z * bsX);

  const spine = [];
  for (let i = 0; i <= SPINE_SAMPLES; i++) spine.push(shape.getPosition(i / SPINE_SAMPLES, 0));
  const offSpine = (x, y) => {
    let best = Infinity;
    for (const p of spine) {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };

  const endgame = DEFAULT_CAMERA_CONFIG.endgameThreshold;
  const out = [];
  let total = 0;
  let crossed = false;
  runRace(race, identity, cfg, ({ ts, raceStart }) => {
    if ((st.finishedCount ?? 0) > 0) crossed = true;
    if (crossed || !(st.finishT > 0)) return;
    let maxT = 0;
    let lead = null;
    for (const r of st.racers)
      if (r.t > maxT) {
        maxT = r.t;
        lead = r;
      }
    const p = maxT / st.finishT;
    if (!(p >= endgame)) return;
    total++;

    const effX = effOf(cd.zoom);
    if (!(effX > 0)) return;
    const effY = shape.isOpen ? effX : cd.zoom * bsY;
    const sx = (q) => cd.offsetX + q.x * effX;
    const sy = (q) => cd.offsetY + q.y * effY;

    // The best margin over the finish BAND, exactly as check-runin-frame grades it.
    const tAt = shapeT(shape, st.finishT);
    let band = -Infinity;
    for (let k = 0; k <= BAND_SAMPLES; k++) {
      const w = shape.getPosition(tAt, (k / BAND_SAMPLES - 0.5) * trackWidthPx);
      if (!w) continue;
      const m = Math.min(HX - Math.abs(sx(w) - CW / 2), HY - Math.abs(sy(w) - CH / 2));
      if (m > band) band = m;
    }
    if (band >= 0) return; // findable — not this file's business

    const lx = sx(lead);
    const ly = sy(lead);
    const leaderOn = lx >= 0 && lx <= CW && ly >= 0 && ly <= CH;
    let onScreen = 0;
    for (const r of st.racers) {
      const X = sx(r);
      const Y = sy(r);
      if (X >= 0 && X <= CW && Y >= 0 && Y <= CH) onScreen++;
    }
    const cx = (CW / 2 - cd.offsetX) / effX;
    const cy = (CH / 2 - cd.offsetY) / effY;
    const tw = offSpine(cx, cy) / trackWidthPx;

    out.push({
      ms: Math.round(ts - raceStart),
      p,
      band,
      leaderOn,
      onScreen,
      tw,
      corr: CW / effX / trackWidthPx,
      state: cd.state,
      binding: cd._framingProbe?.binding ?? "?",
      zoom: cd.zoom,
      // AN EXCURSION, by this repository's own two rules: the camera is pointed away from the race
      // (more than 2 track widths off the spine) or the picture is empty of racers.
      excursion: tw > MAX_CENTRE_OFF_TW || onScreen === 0,
    });
  });
  return { total, out };
}

const cfg = makeConfig(ARM);
const only = TRACK_ARG ? TRACK_ARG.split(",") : null;
console.log(
  `NOT-FINDABLE CENSUS — arm ${ARM}, camera seed = cameraSeedForRace(raceSeed), window [${DEFAULT_CAMERA_CONFIG.endgameThreshold}, crossing]`
);
console.log(
  `EXCURSION = the camera centre is more than ${MAX_CENTRE_OFF_TW} track widths off the spine, OR no racer is on screen.`
);
console.log(
  `Both figures are check-runin-frame's own; neither is invented here.\n`
);
console.log(
  "track            seed    n   window   NOTFIND  =NEAR  =EXCURSION   leaderOFF   worst band px   worst TW   emptyFrames"
);

let allOut = [];
for (const geo of loadTracks()) {
  if (only && !only.includes(geo.id)) continue;
  const probe = buildRace(
    geo,
    resolveIdentity({ racers: 2, raceSeed: 9, racerType: TRACK_DEFAULT_RACER, canvasW: CW, canvasH: CH }),
    cfg
  );
  const N = probe.shape.isOpen ? 100 : 40;
  for (const seed of seeds) {
    const { total, out } = census(geo, cfg, N, seed);
    if (!total) {
      console.log(`${geo.id.padEnd(16)}${String(seed).padStart(5)}${String(N).padStart(5)}   — no window frames`);
      continue;
    }
    const exc = out.filter((x) => x.excursion);
    const worstBand = out.length ? Math.min(...out.map((x) => x.band)) : NaN;
    const worstTw = out.length ? Math.max(...out.map((x) => x.tw)) : NaN;
    for (const x of out) allOut.push({ ...x, track: geo.id, seed, n: N });
    console.log(
      [
        geo.id.padEnd(16),
        String(seed).padStart(5),
        String(N).padStart(5),
        String(total).padStart(9),
        String(out.length).padStart(9),
        String(out.length - exc.length).padStart(7),
        String(exc.length).padStart(12) + (exc.length ? "!" : " "),
        String(out.filter((x) => !x.leaderOn).length).padStart(11),
        (Number.isFinite(worstBand) ? worstBand.toFixed(0) : "-").padStart(15),
        (Number.isFinite(worstTw) ? worstTw.toFixed(2) : "-").padStart(11),
        String(out.filter((x) => x.onScreen === 0).length).padStart(14),
      ].join("")
    );
  }
}

// ── THE DISTRIBUTION, which is the question ────────────────────────────────────────────────────
if (allOut.length) {
  const exc = allOut.filter((x) => x.excursion);
  const leadOff = allOut.filter((x) => !x.leaderOn);
  console.log(`\n── THE ${allOut.length} NOT-FINDABLE FRAMES, ONE AT A TIME ──`);
  console.log(
    `  NEAR-MISSES (camera on the course, racers in shot): ${allOut.length - exc.length}` +
      `   EXCURSIONS: ${exc.length}`
  );
  console.log(`  frames where the LEADER is also off screen: ${leadOff.length}`);
  console.log(`  frames where NO racer at all is on screen:  ${allOut.filter((x) => x.onScreen === 0).length}`);
  const buckets = [
    ["  -1 .. -50 px", (m) => m > -50],
    [" -50 .. -200 px", (m) => m > -200],
    ["-200 .. -640 px", (m) => m > -640],
    ["  beyond -640 px (a full half-frame outside)", () => true],
  ];
  console.log(`\n  how far outside the region the band is:`);
  let rest = allOut.map((x) => x.band).sort((a, b) => b - a);
  for (const [label, pred] of buckets) {
    const hit = rest.filter((m) => pred(m));
    rest = rest.filter((m) => !pred(m));
    console.log(`    ${label.padEnd(46)} ${String(hit.length).padStart(5)}`);
  }
  console.log(`\n  how far the camera centre is off the course spine, in track widths:`);
  for (const [label, lo, hi] of [
    ["    on the course (<= 2 TW)", -Infinity, 2],
    ["    2 - 10 TW", 2, 10],
    ["    10 - 100 TW", 10, 100],
    ["    beyond 100 TW", 100, Infinity],
  ]) {
    const n = allOut.filter((x) => x.tw > lo && x.tw <= hi).length;
    console.log(`  ${label.padEnd(46)} ${String(n).padStart(5)}`);
  }

  const worst = allOut.slice().sort((a, b) => b.tw - a.tw)[0];
  console.log(`\n── THE WORST FRAME ──`);
  console.log(
    `  ${worst.track} seed ${worst.seed}, n=${worst.n}, at ${worst.ms} ms, race progress ${worst.p.toFixed(4)}`
  );
  console.log(`  camera centre        ${worst.tw.toFixed(2)} track widths off the spine`);
  console.log(`  racers on screen     ${worst.onScreen} of ${worst.n}`);
  console.log(`  leader on screen     ${worst.leaderOn ? "yes" : "NO"}`);
  console.log(`  finish band          ${worst.band.toFixed(0)} px outside the region`);
  console.log(`  picture width        ${worst.corr.toFixed(2)} corridors   (cam.zoom ${worst.zoom.toFixed(4)})`);
  console.log(`  camera state         ${worst.state},  binding term "${worst.binding}"`);
}

if (WORST && allOut.length) {
  console.log(`\n── EVERY EXCURSION FRAME, AS EVENTS ──`);
  for (const x of allOut.filter((q) => q.excursion))
    console.log(
      `  ${x.track} seed ${x.seed} @ ${String(x.ms).padStart(6)} ms  p=${x.p.toFixed(4)}  ` +
        `${x.tw.toFixed(1)} TW off spine  ${x.onScreen}/${x.n} racers  leader ${x.leaderOn ? "on" : "OFF"}  ` +
        `${x.corr.toFixed(2)} corr  ${x.state}/${x.binding}`
    );
}

// ============================================================
// File:        scripts/floor-reach-truth.mjs
// Project:     RaceArena — FLOOR-REACH-1
//
// THE OWNER'S QUESTION, 2026-08-22: he has watched this game for months and only ever noticed the
// oversized racers on SPACE SPRINT, at the approach to the finish. On how many of the ten tracks
// would a viewer actually see what he saw — and is the discriminator the TRACK or the FIELD SIZE?
// He ran sixty racers, and `minDrawnFrameFrac` binds on 3 % of frames at twenty and 63 % at sixty.
//
// WHAT IT MEASURES, per track x field size x config arm, over the whole race and separately over the
// APPROACH TO THE FINISH:
//   widestPx      the widest shot reached, in world px across the frame
//   bindFrames    how many frames the floor binds, and the LONGEST UNBROKEN RUN in seconds — a tenth
//                 of a second is invisible, three seconds is what he saw
//   overScale     drawn size / proportional size at the worst moment (his frame was 2.13x)
//   overlaps      how many drawn bodies overlap a neighbour at that moment, and how many are on screen
//   where         whether that moment is in the APPROACH, the ENDING, or the body of the race
//
// IT DOES NOT RENDER, and that is exact rather than a shortcut. `minDrawnFrameFrac` is DRAWING-ONLY —
// CAMERA-MIN-DRAW-1 pins every state zoom byte-identical with the floor off, at the default and at an
// absurd 0.9 — so it cannot move the race, the camera, or any racer's screen position.
// `computeRenderDisplayScale` reduces to drawn = clamp(proportional, floor, ceiling), and the
// world->screen scale is the renderer's own expression, imported rather than retyped. Skipping the
// draw call is what makes sixty races affordable; it changes no number.
//
// Usage:
//   node scripts/floor-reach-truth.mjs                  # both arms, all ten tracks, 20/40/60
//   node scripts/floor-reach-truth.mjs --racers=60      # one field size
//   node scripts/floor-reach-truth.mjs --json
// ============================================================

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
const { computeBodyNarrowRef } = await import(u("client/src/modules/rowLayout.js"));
const { getEffectiveMaxTargetScreenPx } = await import(u("client/src/modules/autoSpriteScale.js"));
const { effectiveZoom } = await import(u("client/src/modules/camera/openTrackCamera.js"));
const { OPEN_TRACK_BASE_ZOOM } = await import(u("client/src/modules/camera/projection.js"));
const { QUICK_TEST_NAME_SETS, DEFAULT_NAME_SET } = await import(
  u("client/src/modules/racerNames.js")
);

const CW = 1280;
const CH = 720;
const SEED = 9;
const FPS = 60;
const JSON_OUT = process.argv.includes("--json");
const ONE_N = Number((process.argv.find((a) => a.startsWith("--racers=")) ?? "").slice(9)) || null;
const FIELD_SIZES = ONE_N ? [ONE_N] : [20, 40, 60];
const ROSTER = QUICK_TEST_NAME_SETS[DEFAULT_NAME_SET];

// HIS ELEVEN DEVIATIONS, quoted from the brief that commissioned LABEL-NAMES-2. `battleWeight: 0` is
// why this arm matters: the camera stays WIDE where the shipped default would cut to a duel, so the
// shipped defaults understate what HE sees.
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
const hisConfig = () => {
  const cfg = structuredClone(DEFAULT_CAMERA_CONFIG);
  for (const [path, v] of HIS) setPath(cfg, path, v);
  return cfg;
};

// THE APPROACH, defined once and stated: from 85 % of the way to the finish until the leader
// crosses. The run-in's own window opens at `endgameThreshold` (0.95); 0.85 is deliberately wider,
// because the owner was watching the approach rather than the last half-second of it.
const APPROACH_FROM = 0.85;

function measure(geo, N, cfg, armLabel) {
  const race = buildRace(geo, {
    ...resolveIdentity({
      racers: N,
      raceSeed: SEED,
      racerType: TRACK_DEFAULT_RACER,
      seconds: 60,
      canvasW: CW,
      canvasH: CH,
      roster: ROSTER,
    }),
  }, cfg);
  const { shape, trackWidthPx: TW, racerType: rt, displaySize: ds, st, cd } = race;

  const W = DEFAULT_CONFIG_WORLD;
  const behaviorConfig = { ...W.raceBehaviorConfig, isOpen: shape.isOpen };
  const bfN = Math.min(rt.config.bodyFillX, rt.config.bodyFillY);
  const effW = TW * behaviorConfig.startSpreadRange;
  const br = computeBodyNarrowRef(Math.min(285, effW), N, ds, bfN, W.autoScaleConfig);
  const displaySizeScale = br.bodyNarrow / ds;

  const bsX = CW / (geo.worldWidth || CW);
  const bsY = CH / (geo.worldHeight || CH);
  const floorPx = (cfg.minDrawnFrameFrac ?? 0) * CH;
  const ceilPx = getEffectiveMaxTargetScreenPx(
    rt?.config?.maxTargetScreenPx,
    cfg.maxTargetScreenPx
  );

  const acc = {
    track: geo.id,
    isOpen: shape.isOpen,
    racers: N,
    arm: armLabel,
    racerType: geo.defaultRacerTypeId,
    displaySizeScale: +displaySizeScale.toFixed(5),
    frames: 0,
    bindFrames: 0,
    longestRunFrames: 0,
    widestPx: 0,
    // the same, restricted to the approach
    approachFrames: 0,
    approachBind: 0,
    approachLongestRun: 0,
    approachWidestPx: 0,
    worst: null,
  };
  let run = 0;
  let approachRun = 0;

  runRace(race, { racers: N, canvasW: CW, canvasH: CH }, cfg, ({ ts, raceStart }) => {
    const zoom = cd.zoom;
    const effX = shape.isOpen ? effectiveZoom(zoom, OPEN_TRACK_BASE_ZOOM) : zoom * bsX;
    const effY = shape.isOpen ? effX : zoom * bsY;
    if (!(effX > 0)) return;

    const prop = ds * displaySizeScale * effX;
    const drawn = Math.min(Math.max(prop, floorPx), ceilPx > 0 ? Math.max(ceilPx, floorPx) : Infinity);
    const binds = prop < floorPx;
    const worldPx = CW / effX;
    const leaderT = st.racers.reduce((m, r) => Math.max(m, r.t), 0);
    const progress = st.finishT > 0 ? leaderT / st.finishT : 0;
    const inApproach = progress >= APPROACH_FROM && st.finishedCount === 0;
    const inEnding = st.finishedCount > 0;

    acc.frames++;
    if (worldPx > acc.widestPx) acc.widestPx = worldPx;
    if (binds) {
      acc.bindFrames++;
      run++;
      if (run > acc.longestRunFrames) acc.longestRunFrames = run;
    } else run = 0;

    if (inApproach) {
      acc.approachFrames++;
      if (worldPx > acc.approachWidestPx) acc.approachWidestPx = worldPx;
      if (binds) {
        acc.approachBind++;
        approachRun++;
        if (approachRun > acc.approachLongestRun) acc.approachLongestRun = approachRun;
      } else approachRun = 0;
    } else approachRun = 0;

    // THE WORST MOMENT: the largest over-scale, tie-broken by how many bodies overlap. Over-scale is
    // what the eye reads as "too big for the world"; the overlap count is what it reads as a pile.
    const over = prop > 0 ? drawn / prop : 1;
    if (binds && (acc.worst === null || over > acc.worst.overScale)) {
      const pts = st.racers
        .map((r) => ({ x: cd.offsetX + r.x * effX, y: cd.offsetY + r.y * effY }))
        .filter((p) => p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH);
      let overlapping = 0;
      for (let i = 0; i < pts.length; i++) {
        for (let j = 0; j < pts.length; j++) {
          if (i === j) continue;
          if (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) < drawn) {
            overlapping++;
            break;
          }
        }
      }
      acc.worst = {
        tSec: +((ts - raceStart) / 1000).toFixed(2),
        progress: +progress.toFixed(3),
        state: cd.state,
        worldPx: Math.round(worldPx),
        prop: +prop.toFixed(2),
        drawn: +drawn.toFixed(2),
        overScale: +over.toFixed(3),
        onScreen: pts.length,
        overlapping,
        where: inEnding ? "ENDING" : inApproach ? "APPROACH" : "race body",
      };
    }
  });

  acc.bindSec = +(acc.longestRunFrames / FPS).toFixed(2);
  acc.approachBindSec = +(acc.approachLongestRun / FPS).toFixed(2);
  acc.widestPx = Math.round(acc.widestPx);
  acc.approachWidestPx = Math.round(acc.approachWidestPx);
  return acc;
}

const tracks = loadTracks();
const rows = [];
for (const N of FIELD_SIZES) {
  for (const geo of tracks) {
    rows.push(measure(geo, N, hisConfig(), "his"));
    rows.push(measure(geo, N, structuredClone(DEFAULT_CAMERA_CONFIG), "shipped"));
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify(rows, null, 1));
} else {
  console.log(`FLOOR-REACH-1 — ten tracks x ${FIELD_SIZES.join("/")} racers, seed ${SEED}, ${CW}x${CH}`);
  console.log(`floor = minDrawnFrameFrac ${DEFAULT_CAMERA_CONFIG.minDrawnFrameFrac} x ${CH} = ${(DEFAULT_CAMERA_CONFIG.minDrawnFrameFrac * CH).toFixed(1)} screen px (UNCHANGED — this block measures only)`);
  console.log("");
  for (const N of FIELD_SIZES) {
    console.log(`══ ${N} RACERS ═══════════════════════════════════════════════════════════════════`);
    console.log(
      "track            open  arm      widest  bind%   longest  APPROACH: widest  bind%  longest   worst: over  ovl/on  where"
    );
    const forN = rows.filter((r) => r.racers === N);
    const ranked = [...forN.filter((r) => r.arm === "his")].sort(
      (a, b) => (b.worst?.overScale ?? 0) - (a.worst?.overScale ?? 0)
    );
    for (const h of ranked) {
      for (const arm of ["his", "shipped"]) {
        const r = forN.find((x) => x.track === h.track && x.arm === arm);
        const w = r.worst;
        console.log(
          [
            arm === "his" ? r.track.padEnd(16) : "".padEnd(16),
            arm === "his" ? (r.isOpen ? "yes " : "no  ") : "    ",
            arm.padEnd(9),
            String(r.widestPx).padStart(6),
            ((100 * r.bindFrames) / Math.max(1, r.frames)).toFixed(0).padStart(6) + "%",
            (r.bindSec.toFixed(1) + "s").padStart(9),
            String(r.approachWidestPx).padStart(17),
            ((100 * r.approachBind) / Math.max(1, r.approachFrames)).toFixed(0).padStart(6) + "%",
            (r.approachBindSec.toFixed(1) + "s").padStart(8),
            (w ? w.overScale.toFixed(2) + "x" : "  —").padStart(12),
            (w ? `${w.overlapping}/${w.onScreen}` : "—").padStart(8),
            "  " + (w ? w.where : "—"),
          ].join("")
        );
      }
    }
    console.log("");
  }
}

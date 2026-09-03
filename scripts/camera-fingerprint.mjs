// ============================================================
// File:        scripts/camera-fingerprint.mjs
// Project:     RaceArena — CAMERA-HYGIENE-1
//
// THE CAMERA'S OWN FINGERPRINT: one hash over everything the camera decides, across ten tracks and
// every frame of a seeded race. It exists because hygiene has an unusual and very good acceptance
// test — a refactor that tidies code must not move the picture, and unlike a tuning change that is
// PROVABLE rather than arguable.
//
// WHAT IT HASHES, per frame: the camera state, the lerp phase, the anchor, the zoom, both offsets,
// the camera's track parameter, and the resolved targets. Rounded to 1e-6 so IEEE noise in an
// unchanged expression cannot register as a change, but nothing coarser — a refactor that alters a
// zoom by a thousandth has altered the picture and must say so.
//
// WHAT IT DOES NOT COVER, stated so nobody over-trusts it: the RENDER path. Sprite scale, name-tag
// layout and the drawing itself are not in this hash, because they are not the director's output.
// A change to those must be argued another way.
//
// Usage:
//   node scripts/camera-fingerprint.mjs            # the hash, plus a per-track breakdown
//   node scripts/camera-fingerprint.mjs --quiet    # just the combined hash
// ============================================================

// VERIFY-FAST-1: every guard prints its own elapsed time. The ceremony's cost column was wrong
// in BOTH directions (camera claimed ~85 s and costs 47; render claimed ~30 s and costs 15) and
// nothing checked it. A number the script measures itself cannot go stale.
// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "camera-fingerprint",
  covers:
    "every decision the DIRECTOR makes — state, phase, anchor, zoom, both offsets, camT and both targets, on every frame",
  blind: [
    "anything DRAWN: it stops at the director's decision",
    "the race outcome, which is the world fingerprint's question",
  ],
  dirs: [],
  files: [],
  reach: [
    "client/src/modules/camera/CameraDirector.js",
    "client/src/modules/raceCore.js",
    "client/src/modules/storage/defaults.js",
  ],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const __t0 = Date.now();
process.on("exit", () => {
  // NIGHT-TOOLS-1: MACHINE-READABLE, because a human string has to be re-parsed by
  // whatever generates the ceremony's cost column, and a parser of prose is the defect
  // that column already had. `scripts/gen-ceremony-costs.mjs` reads exactly this token.
  const ms = Date.now() - __t0;
  process.stderr.write(`[ra-elapsed-ms ${ms}] (${(ms / 1000).toFixed(1)}s)
`);
});

import { createHash } from "node:crypto";
import { checkAgainstRecord } from "./lib/fingerprintCheck.mjs";
import {
  isCheap,
  cheapTracks,
  cheapBanner,
  cheapHash,
  refuseCheapQuiet,
} from "./lib/cheapMode.mjs";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CAMERA_CONFIG, DEFAULT_CONFIG_WORLD } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { EditorShape } = await import(
  u("client/src/modules/track-editor/EditorShape.js")
);
// CAMERA-ENDING-WINDOW-1: the instrument's stop condition comes from the GAME's ending arithmetic,
// not from a condition typed in this file. See the loop below for why that is the requirement.
const { endingOnRaceScreenMs } = await import(
  u("client/src/screens/RaceScreen/endingSchedule.js")
);
const { CameraDirector } = await import(
  u("client/src/modules/camera/CameraDirector.js")
);
const { createRaceFromIdentity, stepRacePhysics, FIXED_DT } = await import(
  u("client/src/modules/raceCore.js")
);
const { normalSpeedFrom } = await import(
  u("client/src/modules/durationModel.js")
);
const { computeRacerLayout, computeBodyNarrowRef } = await import(
  u("client/src/modules/rowLayout.js")
);
const RT = await (async () => {
  const re = console.error;
  console.error = () => {};
  try {
    return await import(u("client/src/modules/racer-types/index.js"));
  } finally {
    console.error = re;
  }
})();

const CW = 1280;
const CH = 720;
const N = 40;
const SEED = 5601;
const CAM_SEED = 1439767152;
const QUIET = process.argv.includes("--quiet");
// VERIFY-COST-2: --cheap runs ONE track so a wiring or formatting check costs seconds. The hash
// it prints is NOT the fingerprint and is shaped so it cannot be mistaken for one.
refuseCheapQuiet();
const CHEAP = isCheap();
// CAMERA-COMPANY-ONLY-1 probe. Off by default, so the DEFAULT invocation — the one the ceremony and
// every gate use — is untouched. With it, the hash is a PROBE VALUE, not a baseline.
const COMPANY_ONLY = process.argv.includes("--company-only");
// CAMERA-ENDING-WINDOW-1 probe, same shape and same rules as --company-only above. It turns
// `endingKeepsFinishShot` OFF, which is the arm in which the director does NOT compose the ending —
// so this instrument stops at the last crossing exactly as it did before this block, and the value
// it prints must be the PREDECESSOR fingerprint. That is the block's own off-arm promise, and it is
// something to RUN rather than assert. Like --company-only, the result is a PROBE, not a baseline.
const ENDING_OFF = process.argv.includes("--ending-off");
const CAM_CFG = {
  ...DEFAULT_CAMERA_CONFIG,
  ...(COMPANY_ONLY ? { companyOnlyFraming: true } : {}),
  ...(ENDING_OFF ? { endingKeepsFinishShot: false } : {}),
};

const dir = existsSync(join(ROOT, "server/data/tracks"))
  ? join(ROOT, "server/data/tracks")
  : join(ROOT, "server/seeds/tracks");

const r6 = (v) =>
  v == null || !Number.isFinite(v)
    ? "n"
    : (Math.round(v * 1e6) / 1e6).toString();

function trackHash(geo) {
  const shape = new EditorShape(geo);
  const TW = geo.width ?? shape.getActualTrackWidth();
  const W = DEFAULT_CONFIG_WORLD;
  const behaviorConfig = { ...W.raceBehaviorConfig, isOpen: shape.isOpen };
  const rt = RT.getRacerType(geo.defaultRacerTypeId ?? "horse");
  const ds = rt.config.displaySize;
  const bfN = Math.min(rt.config.bodyFillX, rt.config.bodyFillY);
  const bfL = Math.max(rt.config.bodyFillX, rt.config.bodyFillY);
  const effW = TW * behaviorConfig.startSpreadRange;
  const pss = computeRacerLayout(effW, N, ds, W.autoScaleConfig).spriteSize;
  const br = computeBodyNarrowRef(
    Math.min(285, effW),
    N,
    ds,
    bfN,
    W.autoScaleConfig,
  );
  const bodyRef = ds * (br.bodyNarrow / ds);
  const built = createRaceFromIdentity({
    shape,
    isOpenTrack: shape.isOpen,
    pathLengthPx: geo.pathLengthPx ?? 0,
    trackWidthPx: TW,
    speedMultiplier: rt.getSpeedMultiplier(),
    baseSpeedConfig: W.baseSpeedConfig,
    behaviorConfig,
    rowConfig: W.rowLayoutConfig,
    dynamicsConfig: W.raceDynamicsConfig,
    normalSpeedPxPerSec: normalSpeedFrom(W.baseSpeedConfig),
    laps: shape.isOpen ? 1 : 2,
    requestedSeconds: 60,
    nRacers: N,
    racePlanSeed: SEED,
    racePlanEnabledFlag: true,
    physicalSpriteSize: pss,
    drawnBodyWidthRefPx: bodyRef,
    bodyFillNarrow: bfN,
    bodyFillLong: bfL,
    constSpeedActive: false,
  });
  const st = built.state;
  const raceCfg = built.config;
  const meta = built.meta;
  const cd = new CameraDirector(
    geo.worldWidth,
    geo.worldHeight,
    shape.isOpen,
    CAM_CFG,
    bodyRef,
    shape,
    TW,
  );
  cd.setRandomSeed(CAM_SEED);
  if (meta.racePlanEnabled && meta.rpPlanInfo?.b1Indices) {
    cd.updateRacePlan(meta.rpPlanInfo.b1Indices);
  }
  raceCfg.computePositions();

  const h = createHash("sha256");
  const RAW = 1000 / 60;
  let ts = 0;
  let accum = 0;
  // START-BOARD-2: the countdown has no length of its own any more — it is the SUM of the
  // ceremony beats, one of which scales with the field. The director is asked, so this harness
  // cannot drift from the game the way a second copy of a duration would.
  const cdMs = cd.ceremonySchedule(st.racers).totalMs;
  while (ts < cdMs) {
    cd.updateCountdown(st.racers, ts, ts, CW, CH);
    h.update(`c|${r6(cd.zoom)}|${r6(cd.offsetX)}|${r6(cd.offsetY)}\n`);
    ts += RAW;
  }
  const raceStart = ts;
  st.physicsTs = 0;
  let frames = 0;
  // ── THE WINDOW REACHES THE ENDING, AND IT IS DERIVED (CAMERA-ENDING-WINDOW-1) ──────────────────
  //
  // This loop ran `while (st.finishedCount < N)`, so it stopped on the exact frame the ending
  // BEGINS and never rendered a single FINISHED frame. ENDING-PICTURE-1 — which made RaceScreen keep
  // consulting the director through PHASE.FINISHED so an in-flight zoom-out can come to rest —
  // was therefore INVISIBLE to the camera's own change detector. A shipped camera feature, outside
  // the reach of the instrument whose whole job is to notice camera changes.
  //
  // THE STOP IS NOW THE ENDING'S OWN SCHEDULE, not a condition typed here. `endingOnRaceScreenMs`
  // is the same function `RaceScreen` uses to set the navigate-away timer, so the window is exactly
  // as long as the race screen is up — and a future change that lengthens the ending lengthens this
  // window with it, which is the property the old fixed condition could not have. That is the
  // requirement: a change must not be able to blind this instrument silently.
  //
  // IT HONOURS `endingKeepsFinishShot`, because the GAME does. RaceScreen consults the director
  // through PHASE.FINISHED only when that key is on; with it off the ending is not the director's
  // and there is nothing there to hash. Ignoring it would make this instrument measure behaviour
  // the product does not run — and it is also the sharpest available proof that this change adds
  // EXACTLY the ending and nothing else: with the key off, the hash returns to its pre-block value.
  const endingMs = CAM_CFG.endingKeepsFinishShot
    ? endingOnRaceScreenMs({
        holdMs: CAM_CFG.finishHoldAfterLastMs,
        pauseMs: CAM_CFG.finishPauseMs,
      })
    : 0;
  let allHomeTs = null;
  let endingFrames = 0;
  while (ts - raceStart < 200000) {
    if (allHomeTs !== null && ts - allHomeTs >= endingMs) break;
    accum += RAW;
    let steps = 0;
    // PHYSICS DOES NOT STEP ONCE EVERYONE IS HOME, and that is the game's rule rather than this
    // harness's convenience — RaceScreen stops stepping at PHASE.FINISHED, which is what lets
    // ENDING-PICTURE-1 claim the director "sees a static field" and converges. Stepping here would
    // hash an ending no player ever sees.
    if (allHomeTs === null) {
      while (accum >= FIXED_DT && steps++ < 2) {
        stepRacePhysics(st, raceCfg);
        accum -= FIXED_DT;
      }
    } else {
      accum = 0;
      endingFrames++;
    }
    cd.update(
      st.racers,
      ts,
      {
        raceElapsed: ts - raceStart,
        finishedCount: st.finishedCount,
        winner: st.racers.find((r) => r.finishRank === 1) ?? null,
        finishT: st.finishT,
        isOutcomePhase: false,
        physicsRacers: st.racers,
      },
      CW,
      CH,
      RAW,
    );
    h.update(
      [
        cd.state,
        cd.lerpPhase,
        cd.anchorRacerLabel ?? "-",
        r6(cd.zoom),
        r6(cd.offsetX),
        r6(cd.offsetY),
        r6(cd.targetZoom),
        r6(cd.targetOffsetX),
        r6(cd.targetOffsetY),
        r6(cd.camT),
      ].join("|") + "\n",
    );
    frames++;
    ts += RAW;
    // Latched on the FIRST frame everyone is home, after that frame has been hashed — so the ending
    // window starts where the race stops, with no frame counted twice and none dropped.
    if (allHomeTs === null && st.finishedCount >= N) allHomeTs = ts;
  }
  return { hash: h.digest("hex").slice(0, 16), frames, endingFrames };
}

const geos = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".json")) continue;
  const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
  if (j.id) geos.push(j);
}
geos.sort((a, b) => a.id.localeCompare(b.id));
const RUN_GEOS = CHEAP ? cheapTracks(geos, (g) => g.id) : geos;
if (CHEAP)
  console.log(
    cheapBanner("camera", `One track (${RUN_GEOS[0].id}) of ${geos.length}.`),
  );

const combined = createHash("sha256");
const rows = [];
for (const geo of RUN_GEOS) {
  const { hash, frames, endingFrames } = trackHash(geo);
  combined.update(geo.id + ":" + hash + "\n");
  rows.push({ id: geo.id, hash, frames, endingFrames });
}

// ── PROOF OF LIVE FOR THE ENDING WINDOW (Lesson 187, CAMERA-ENDING-WINDOW-1) ────────────────────
//
// The whole point of this block is that the ending is now IN the hash. If a future change stopped
// the loop before the ending again, every number printed here would still look perfectly reasonable
// and the hash would still be a hash — which is exactly how the old blindness lasted as long as it
// did. So the instrument REFUSES rather than noting it: zero ending frames anywhere is a failure.
//
// ★ IT IS "EVERY TRACK" SINCE 2026-09-03 (CAMERA-GATE-1), AND IT WAS "AT LEAST ONE" FOR A REASON
// THAT HAD STOPPED BEING TRUE. The paragraph here read: "garden-path does not finish inside the
// harness's 200 s wall-clock ceiling, so it has no ending to sample and never did; demanding all ten
// would fail on a race that is simply too long." It stopped being true on 2026-08-25, when
// GARDEN-PATH-DEFAULTS-1 (`d73ec6a9`) gave that track the beetle and two laps. Today garden-path
// finishes in 4,916 of the 12,000 frames the ceiling allows — 41%, with 102 seconds of headroom —
// and contributes the full 300 ending frames like every other track.
//
// THE OWNER'S CONDITION FOR TIGHTENING, AND IT WAS MEASURED BEFORE THE CHANGE. He asked how often
// the tighter gate would have gone red WITHOUT CAUSE over recent history, and said to leave the gate
// alone if that number were high. Replayed over the daily tip of the last twelve days, in a shared
// clone, running this instrument at each:
//
//     2026-09-03 … 2026-08-25   0 tracks with zero ending frames   (7 days, GREEN)
//     2026-08-24 … 2026-08-18   1 track  — garden-path, every day  (5 days, RED)
//
// FIVE of twelve red — and ZERO of them WITHOUT CAUSE. Every red is a true statement: on those days
// garden-path genuinely contributed nothing and the hash genuinely did not cover its ending. The
// gate would not have cried wolf once; it would have reported a real gap that stood for months, and
// the reason it could not be tightened then was the gap, not the gate.
//
// WHAT THE TIGHTER GATE COSTS, stated rather than discovered: a track whose race legitimately
// cannot finish inside 200 s WILL block this instrument. That is the intended reading — the hash
// would not cover that track's ending, and a fingerprint that silently omits a track is the
// blindness CAMERA-ENDING-WINDOW-1 removed. The answer then is the track's defaults or the ceiling,
// NOT this gate, and the failure message says so.
const withEnding = rows.filter((r) => r.endingFrames > 0);
const noEnding = rows.filter((r) => r.endingFrames === 0);
// --ending-off is the one arm where zero is the EXPECTED answer rather than the failure: the key it
// turns off is what puts the ending in the director's hands at all. --cheap runs ONE track, so
// "every track" is not a question it can answer; the zero-anywhere failure below still binds there.
if (!CHEAP && !ENDING_OFF && withEnding.length === 0) {
  console.error(
    "\nFAIL: NOT ONE TRACK produced a FINISHED frame, so this hash does not cover the ending at\n" +
      "      all — the exact blindness CAMERA-ENDING-WINDOW-1 removed. The window comes from\n" +
      "      endingOnRaceScreenMs(); either the ending has been shortened to nothing or this loop\n" +
      "      no longer reaches it. Refusing to print a value that would look like a baseline.",
  );
  process.exit(1);
}
if (!CHEAP && !ENDING_OFF && noEnding.length > 0) {
  console.error(
    `\nFAIL: ${noEnding.length} of ${rows.length} track(s) contributed NO FINISHED frames, so this hash\n` +
      `      does not cover their ending: ${noEnding.map((r) => r.id).join(", ")}\n` +
      "      A track contributes none only when its race does not get every racer home inside the\n" +
      "      200 s ceiling in `trackHash`. The hash would then be a baseline for nine tracks'\n" +
      "      endings and silence about the tenth, which is the shape CAMERA-ENDING-WINDOW-1 exists\n" +
      "      to prevent.\n" +
      "      FIX THE TRACK OR THE CEILING, NOT THIS GATE: check that track's defaultRacerTypeId and\n" +
      "      defaultLaps, or raise the ceiling deliberately. Loosening this back to 'at least one'\n" +
      "      is how it came to be justified by a claim that had been false for months.",
  );
  process.exit(1);
}
// The cheap hash carries a prefix so it CANNOT match the 16-hex shape the record and the
// containment guard expect. A cheap run must be unable to impersonate a measurement.
const COMBINED = CHEAP
  ? cheapHash(combined.digest("hex"))
  : combined.digest("hex").slice(0, 16);

// ── --check: COMPARE AGAINST THE RECORD (FP-COMPARE-2) ──────────────────────────────────────────
//
// THIS INSTRUMENT MEASURED AND DID NOT CHECK. `--check` appeared FOUR times in
// `fingerprint-default.mjs` and ZERO times here: it computed a hash, printed it, and exited 0
// whatever the hash was. FP-COMPARE-1 fixed exactly this for the world in 2026-08-14 and the other
// two were never done, so two of the three instruments guarding the picture were log lines.
//
// The comparison itself lives in `scripts/lib/fingerprintCheck.mjs` — one implementation for all
// three, rather than a third copy of it here.
if (process.argv.includes("--check")) {
  checkAgainstRecord({
    role: "camera",
    label: "CAMERA",
    measured: COMBINED,
    cheap: CHEAP,
    root: ROOT,
    localise: "the per-track lines above localise which track moved.",
  });
}


if (QUIET) {
  console.log(COMBINED);
} else {
  console.log(
    `CAMERA ${COMBINED} (seed=${SEED} camSeed=${CAM_SEED}, ${RUN_GEOS.length} tracks, ${N} racers, ` +
      `${COMPANY_ONLY ? "PROBE: companyOnlyFraming=true — NOT a baseline" : ENDING_OFF ? "PROBE: endingKeepsFinishShot=false — NOT a baseline" : "default config"})`,
  );
  for (const r of rows)
    console.log(
      `  ${r.id.padEnd(16)} ${r.hash}  ${String(r.frames).padStart(5)} frames` +
        `  (${r.endingFrames} after the last crossing)`,
    );
  // THE THIRD LINE USED TO BE A HARDCODED SENTENCE, and it was false, and it was printed on every
  // run two lines under the number that refutes it (CAMERA-GATE-1, 2026-09-03). It read:
  //   "garden-path does not finish inside the 200 s ceiling, so it has no ending to sample."
  // The rows above it showed garden-path contributing 300 frames after the last crossing, and the
  // line above it said 10 of 10. It became false on 2026-08-25, when GARDEN-PATH-DEFAULTS-1 gave
  // that track the beetle and two laps; nothing could go red over it, because nothing compares a
  // console.log string to the row above it. What replaces it is DERIVED from the same rows.
  const short = rows.filter((r) => r.endingFrames === 0).map((r) => r.id);
  console.log(
    `\n  THE ENDING IS IN THIS HASH — ${withEnding.length} of ${rows.length} tracks contributed ` +
      `FINISHED frames.\n  The window is endingOnRaceScreenMs(), the same arithmetic RaceScreen ` +
      `navigates away on.\n  ` +
      (short.length
        ? `${short.length} track(s) contributed NONE and are not covered by this hash: ${short.join(", ")}. ` +
          `A track\n  contributes nothing only when its race does not get every racer home inside the ` +
          `200 s ceiling.`
        : `Every track's race finished inside the 200 s ceiling, so every track's ending is covered.`),
  );
  console.log(
    "\n  Covers the DIRECTOR only — state, phase, anchor, zoom, offsets, camT, targets.\n" +
      "  Not the render path (sprite scale, name-tag layout, drawing).",
  );
  if (CHEAP)
    console.log(
      cheapBanner("camera", `One track (${RUN_GEOS[0].id}) of ${geos.length}.`),
    );
}

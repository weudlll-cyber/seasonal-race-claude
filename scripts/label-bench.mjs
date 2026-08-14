// ============================================================
// File:        scripts/label-bench.mjs
// Project:     RaceArena — LABEL-BENCH-1
//
// THE OWNER'S QUESTION, drawing side: does it matter whether a label shows a NUMBER or a NAME, and
// whether the names are short, long or mixed? PHYS-BENCH-1 Q5 answered the ENGINE side of it. This
// answers the LAYOUT side, and it can be answered without a browser because `computeTagLayout` is a
// pure module — no state, no clock, no canvas.
//
// ── THE CONTROL, and it is the whole design ──────────────────────────────────────────────────────
// A racer's name is physics, so switching roster switches the RACE. If each arm ran its own race,
// the arms would differ in where the racers are, and "long names cost more" would be
// indistinguishable from "that race happened to bunch differently". So the frame inputs are CAPTURED
// ONCE from one real race and then REPLAYED into the layout under every arm. Only the label TEXT
// changes between arms. That is a clean drawing-side comparison, and the engine-side confound is
// already measured in PHYS-BENCH-1 Q5 rather than smuggled in here.
//
// THE INPUTS ARE TAKEN, NOT INVENTED. The race runs through `scripts/lib/raceDriver.mjs` — the same
// boot path and the same 60 Hz frame loop the fingerprint and label harnesses drive — and the camera
// runs with it, so `effX/effY/offsetX/offsetY`, the drawn racer size and the anchor all come out of
// the real director on real frames.
//
// ── WHAT THIS DOES NOT MEASURE, stated up front so no one over-reads the milliseconds ────────────
// There is no canvas in node, so text width uses the same 0.5-per-character-per-px approximation the
// other label harnesses use. That approximation is O(1) in the string length, while a real
// `ctx.measureText` is not — so the numbers below ISOLATE THE PLACEMENT GEOMETRY and deliberately
// exclude two costs that live in the browser:
//   1. `ctx.measureText` itself, which does scale with the text, and
//   2. `fillText` — actually drawing the glyphs, which is where long names would cost most.
// Both are named in the output as `measureCalls` and `charsDrawn` per frame: those are the
// QUANTITIES a real per-character cost would multiply, so the owner has the multiplicand even though
// this harness cannot supply the multiplier. Reporting a number for them would be inventing one.
//
// MEASURE, DO NOT FIX. If this finds something expensive it says so and stops.
//
// Usage:
//   node scripts/label-bench.mjs --racers=100
//   node scripts/label-bench.mjs --racers=100 --dump-frames=<path>     # capture for the other tree
//   node scripts/label-bench.mjs --replay=<path> --arm=name --label=master-n100
// ============================================================

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
  runRace,
} from "./lib/raceDriver.mjs";
import { DEFAULT_CAMERA_CONFIG } from "../client/src/modules/storage/defaults.js";
import {
  computeTagLayout,
  tagFontScreenPx,
} from "../client/src/screens/RaceScreen/nameTagLayout.js";
import {
  QUICK_TEST_NAME_SETS,
  resolveNameSet,
} from "../client/src/modules/racerNames.js";
import { effectiveZoom } from "../client/src/modules/camera/openTrackCamera.js";
import { OPEN_TRACK_BASE_ZOOM } from "../client/src/modules/camera/CameraDirector.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

const TRACK = arg("track", "searound");
const SEED = Number(arg("seed", "5601"));
const RACERS = Number(arg("racers", "100"));
const SECONDS = Number(arg("seconds", "60"));
const CW = Number(arg("canvasW", "1280"));
const CH = Number(arg("canvasH", "720"));
// Every 4th frame. 15 samples a second over a 60 s race is ~900 frames per arm — far more than a
// p90 needs, and it keeps the captured-frame file small enough to hand to the other tree.
const SAMPLE_EVERY = Number(arg("sample", "4"));
const REPEATS = Number(arg("repeats", "3"));
const WARM_ROUNDS = Number(arg("warm-rounds", "1"));
const OUT = arg("out", "");
const DUMP = arg("dump-frames", "");
const REPLAY = arg("replay", "");
const ONE_ARM = arg("arm", "");
const LABEL = arg("label", "");
const QUIET = process.argv.includes("--quiet");

/** The same width rule every label harness in this repo uses. See the header on why it is sound. */
const measureTextFor = (fontPx) => (txt) =>
  String(txt ?? "").length * fontPx * 0.5;

// ── THE ARMS ─────────────────────────────────────────────────────────────────────────────────────
// `number` is the shipped default: the label is the race number and the names toggle is OFF, which
// is expressed by passing `wideLabelOf: null` exactly as `renderRaceFrame` does. The three roster
// arms turn it on. `name` is MASTER's shape — there are no race numbers there and the label IS the
// name — and it is the one arm that answers "does what we built cost more than what was there".
const ARMS = [
  {
    key: "numbers",
    roster: null,
    wide: false,
    note: "shipped default, names toggle OFF",
  },
  {
    key: "names-short",
    roster: "current",
    wide: true,
    note: "roster `current`, 4-8 chars",
  },
  {
    key: "names-long",
    roster: "long",
    wide: true,
    note: "roster `long`, 16-23 chars",
  },
  {
    key: "names-mixed",
    roster: "mixed",
    wide: true,
    note: "roster `mixed`, 2-23 chars",
  },
];

// ── CAPTURE: one real race, the real camera, the real frame inputs ───────────────────────────────
function capture() {
  const geo = loadTracks({ only: TRACK })[0];
  if (!geo) {
    console.error(`FAIL: no such track: ${TRACK}`);
    process.exit(2);
  }
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: SEED,
    racerType: "track-default",
    seconds: SECONDS,
    canvasW: CW,
    canvasH: CH,
    note: "LABEL-BENCH-1 frame capture",
  });
  const cameraConfig = structuredClone(DEFAULT_CAMERA_CONFIG);
  // The row suffix appends " (R3)" to every label and would make every width here a measurement of
  // a different string. Off in the shipped default; pinned so the run does not depend on that.
  cameraConfig.showRpStartRow = false;
  const race = buildRace(geo, identity, cameraConfig);

  // THE CAPTURE RACE USES THE SHIPPED ROSTER. It has to use ONE roster — that is the control — and
  // `current` is the one the browser ships. Every arm then replays these same positions.
  const names = resolveNameSet("current");
  for (const r of race.st.racers) r.name = names[r.index % names.length];

  const bsX = CW / geo.worldWidth;
  const bsY = CH / geo.worldHeight;
  const isOpen = race.shape.isOpen;
  const fontPx = tagFontScreenPx(cameraConfig.nameTagFrameFrac, CH);

  const frames = [];
  let i = 0;
  runRace(race, identity, cameraConfig, ({ cd, st: s, ts, raceStart }) => {
    if (i++ % SAMPLE_EVERY !== 0) return;
    // Only the RACING window: the start formation labels everyone by design (the roll call), and a
    // frame under that exception exercises a different branch of the layout.
    if (ts - raceStart < (cameraConfig.nameTagAllUntilMs ?? 0)) return;
    const effX = isOpen
      ? effectiveZoom(cd.zoom, OPEN_TRACK_BASE_ZOOM)
      : cd.zoom * bsX;
    const effY = isOpen ? effX : cd.zoom * bsY;
    frames.push({
      effX,
      effY,
      offsetX: cd.offsetX,
      offsetY: cd.offsetY,
      // The drawn racer size the renderer hands the layout. Recomputed per frame because the
      // auto-scale follows the zoom.
      racerScreenH: drawnH(race, cameraConfig, effY),
      racerScreenW: drawnH(race, cameraConfig, effX),
      anchor: cd.anchorRacerIndex ?? null,
      racers: s.racers.map((r) => ({ index: r.index, x: r.x, y: r.y, t: r.t })),
    });
  });

  return {
    meta: {
      track: TRACK,
      isOpen,
      racerType: race.racerTypeId,
      raceSeed: SEED,
      racers: RACERS,
      seconds: SECONDS,
      canvasW: CW,
      canvasH: CH,
      fontPx,
      labelMarginPx: cameraConfig.nameTagMarginPx ?? 0,
      sampleEvery: SAMPLE_EVERY,
      frames: frames.length,
    },
    frames,
  };
}

/** The renderer's drawn-racer size for one axis. Imported lazily: master's module lacks the helper. */
let _asm = null;
function drawnH(race, cameraConfig, effZoom) {
  const {
    computeRenderDisplayScale,
    getEffectiveMaxTargetScreenPx,
    drawnRacerScreenPx,
  } = _asm;
  const displayScale = computeRenderDisplayScale(
    race.displaySize,
    race.bodyRef / race.displaySize,
    effZoom,
    getEffectiveMaxTargetScreenPx(
      race.racerType?.config?.maxTargetScreenPx,
      cameraConfig.maxTargetScreenPx,
    ),
    cameraConfig.minDrawnFrameFrac,
    CH,
  );
  return drawnRacerScreenPx
    ? drawnRacerScreenPx(race.displaySize, displayScale, effZoom)
    : race.displaySize * displayScale * effZoom;
}

// ── REPLAY: the same frames, one arm, timed ──────────────────────────────────────────────────────
/**
 * Drive `computeTagLayout` over captured frames under one arm and time each call.
 *
 * The hold is driven too — the renderer threads `advanceLabelForms` between frames and a layout run
 * without it would see `wideForms: null` on every frame, i.e. a state the game never reaches. It is
 * timed SEPARATELY rather than folded in, because it is a different question.
 */
async function replayArm(cap, arm, hold) {
  const { fontPx, labelMarginPx } = cap.meta;
  const measure = measureTextFor(fontPx);
  const names = arm.roster ? resolveNameSet(arm.roster) : null;
  // Race numbers are the shipped label. Master has no `raceNumbers` module, so the arm that runs
  // there asks for the NAME as the primary label — which is exactly what master shipped.
  const nameOf = (index) => (names ? names[index % names.length] : "");
  const numberOf = arm.numberLabels
    ? (index) => arm.numberLabels[index] ?? ""
    : () => "";
  const primaryOf =
    arm.primary === "name" ? (r) => nameOf(r.index) : (r) => numberOf(r.index);
  const wideLabelOf = arm.wide ? (r) => nameOf(r.index) : null;

  const n = cap.frames.length;
  const ns = new Float64Array(n);
  const holdNs = new Float64Array(n);
  const placedPer = new Float64Array(n);
  const namedPer = new Float64Array(n);
  let measureCalls = 0;
  let charsDrawn = 0;

  let incumbents = null;
  let wideForms = null;
  const holdState = hold.create();

  for (let i = 0; i < n; i++) {
    const f = cap.frames[i];
    // Counting wrappers sit OUTSIDE the timer's subject only in the sense that they are the same on
    // every arm; they are inside the timed region because removing them per-arm would bias it.
    const counting = (txt) => {
      measureCalls++;
      return measure(txt);
    };
    const exempt = f.anchor != null ? new Set([f.anchor]) : null;
    const t0 = process.hrtime.bigint();
    const out = computeTagLayout({
      racers: f.racers,
      effX: f.effX,
      effY: f.effY,
      offsetX: f.offsetX,
      offsetY: f.offsetY,
      canvasW: cap.meta.canvasW,
      canvasH: cap.meta.canvasH,
      fontPx,
      racerScreenH: f.racerScreenH,
      racerScreenW: f.racerScreenW,
      labelMarginPx,
      measureText: counting,
      showAll: false,
      incumbents,
      labelOf: primaryOf,
      wideLabelOf,
      wideForms,
      exempt,
      exemptAll: false,
    });
    ns[i] = Number(process.hrtime.bigint() - t0);

    const wide = out.wide ?? new Set();
    placedPer[i] = out.shown.size;
    namedPer[i] = arm.primary === "name" ? out.shown.size : wide.size;
    // What a real fillText would have to draw this frame — the multiplicand named in the header.
    for (const idx of out.shown) {
      charsDrawn += (
        arm.primary === "name" || wide.has(idx) ? nameOf(idx) : numberOf(idx)
      ).length;
    }

    const t1 = process.hrtime.bigint();
    wideForms = hold.advance(holdState, {
      shown: out.shown,
      clear: out.wideClear ?? new Set(),
      nowMs: i * 16.667 * cap.meta.sampleEvery,
      holdMs: hold.holdMs,
    });
    holdNs[i] = Number(process.hrtime.bigint() - t1);
    incumbents = out.shown;
  }

  const ms = (v) => v / 1e6;
  const pct = (s, p) =>
    s[Math.min(s.length - 1, Math.floor(((s.length - 1) * p) / 100))];
  const stat = (arr) => {
    const s = Array.from(arr).sort((a, b) => a - b);
    return {
      p50: +ms(pct(s, 50)).toFixed(5),
      p90: +ms(pct(s, 90)).toFixed(5),
      max: +ms(s[s.length - 1]).toFixed(5),
    };
  };
  const mean = (a) => Array.from(a).reduce((x, y) => x + y, 0) / a.length;

  return {
    arm: arm.key,
    note: arm.note,
    frames: n,
    layout: stat(ns),
    hold: stat(holdNs),
    labelsPlaced: +mean(placedPer).toFixed(2),
    labelsNamed: +mean(namedPer).toFixed(2),
    nameShare: +(mean(namedPer) / Math.max(1e-9, mean(placedPer))).toFixed(4),
    measureCallsPerFrame: +(measureCalls / n).toFixed(1),
    charsDrawnPerFrame: +(charsDrawn / n).toFixed(1),
    rawLayoutNs: Array.from(ns).map((v) => Math.round(v)),
  };
}

// ── WIRING ───────────────────────────────────────────────────────────────────────────────────────
_asm = await import("../client/src/modules/autoSpriteScale.js");

// The hold module is the chain's. Master has none — its layout has one form — so the arm that runs
// there gets an inert hold rather than a second code path here.
const hold = await (async () => {
  try {
    const m = await import("../client/src/screens/RaceScreen/labelFormHold.js");
    return {
      create: () => m.createLabelFormHold(),
      advance: (s, p) => m.advanceLabelForms(s, p),
      holdMs: DEFAULT_CAMERA_CONFIG.labelFormHoldMs ?? 1200,
    };
  } catch {
    return { create: () => null, advance: () => null, holdMs: 0 };
  }
})();

// Race numbers are assigned the way the browser assigns them, from the race seed.
let numberLabels = null;
try {
  const rn = await import("../client/src/modules/raceNumbers.js");
  const assigned = rn.assignRaceNumbers(RACERS, SEED);
  numberLabels = Array.from({ length: RACERS }, (_, i) =>
    rn.raceNumberLabel(assigned[i] ?? null),
  );
} catch {
  // Master has no raceNumbers module. Only the `name` arm runs there, so nothing needs them.
  numberLabels = Array.from({ length: RACERS }, () => "");
}

const cap = REPLAY
  ? JSON.parse(
      readFileSync(isAbsolute(REPLAY) ? REPLAY : join(ROOT, REPLAY), "utf8"),
    )
  : capture();

if (DUMP) {
  const p = isAbsolute(DUMP) ? DUMP : join(ROOT, DUMP);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(cap));
}

const armList = ONE_ARM
  ? [
      ONE_ARM === "name"
        ? {
            key: "master-names",
            roster: "current",
            wide: false,
            primary: "name",
            note: "MASTER's layout — the label IS the name",
          }
        : ARMS.find((a) => a.key === ONE_ARM),
    ].filter(Boolean)
  : ARMS;
if (armList.length === 0) {
  console.error(
    `FAIL: unknown --arm=${ONE_ARM}. Known: ${ARMS.map((a) => a.key).join(", ")}, name.`,
  );
  process.exit(2);
}
for (const a of armList) a.numberLabels = numberLabels;

// REPEATS full rounds of every arm, ROUND-MAJOR rather than arm-major, for the reason PHYS-BENCH-1
// had to learn the hard way: this machine drifts, and three repeats of one arm taken back to back
// share a drift that the comparison then charges to the arm. Round-major spreads each arm's repeats
// across the whole block, so a drift lands on every arm alike. Every run is reported; the summary
// takes the MEDIAN of an arm's repeats, never the mean.
// A DISCARDED WARM-UP ROUND, over every arm, before anything is kept. Without it the first round is
// V8 still optimising `computeTagLayout` and it read 161 % slower than the second — a spread that
// would have been reported as a difference between arms, since arm order and round order coincide on
// the first round. One full round is enough: the second and third then agree to within 10 %.
const results = [];
for (let w = 0; w < WARM_ROUNDS; w++) {
  for (const arm of armList) await replayArm(cap, arm, hold);
}
for (let r = 0; r < REPEATS; r++) {
  for (const arm of armList) {
    results.push({ repeat: r, ...(await replayArm(cap, arm, hold)) });
  }
}

const out = {
  tool: "label-bench.mjs",
  version: "LABEL-BENCH-1",
  label: LABEL,
  meta: {
    ...cap.meta,
    repeats: REPEATS,
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
  },
  results,
};
if (OUT) {
  const p = isAbsolute(OUT) ? OUT : join(ROOT, OUT);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(out, null, 1));
}

if (!QUIET) {
  console.log(
    formatIdentity(
      resolveIdentity({
        racers: cap.meta.racers,
        raceSeed: cap.meta.raceSeed,
        seconds: cap.meta.seconds,
        note: "LABEL-BENCH-1",
      }),
    ),
  );
  console.log(
    `track=${cap.meta.track} frames=${cap.meta.frames} (every ${cap.meta.sampleEvery}th) fontPx=${cap.meta.fontPx.toFixed(2)}\n`,
  );
  console.log(
    "arm            rep   layout p50   layout p90    hold p50   placed   named   name%   measure/f   chars/f",
  );
  for (const r of results) {
    console.log(
      `${r.arm.padEnd(14)} ${String(r.repeat).padStart(2)}    ` +
        `${r.layout.p50.toFixed(4).padStart(9)}   ${r.layout.p90.toFixed(4).padStart(9)}   ` +
        `${r.hold.p50.toFixed(4).padStart(9)}   ${r.labelsPlaced.toFixed(1).padStart(6)}  ` +
        `${r.labelsNamed.toFixed(1).padStart(6)}  ${(100 * r.nameShare).toFixed(1).padStart(5)}%   ` +
        `${String(r.measureCallsPerFrame).padStart(9)}   ${String(r.charsDrawnPerFrame).padStart(7)}`,
    );
  }
}
console.log(
  `[label-bench ${JSON.stringify({
    label: LABEL,
    racers: cap.meta.racers,
    arms: results.map((r) => ({
      arm: r.arm,
      repeat: r.repeat,
      p50: r.layout.p50,
      p90: r.layout.p90,
      holdP50: r.hold.p50,
      placed: r.labelsPlaced,
      named: r.labelsNamed,
      chars: r.charsDrawnPerFrame,
    })),
  })}]`,
);

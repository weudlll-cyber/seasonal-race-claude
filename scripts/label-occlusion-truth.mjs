// ============================================================
// File:        scripts/label-occlusion-truth.mjs
// Project:     RaceArena — LABEL-OCCLUSION-1
//
// THE QUESTION: with the owner's rule — the NAME when it covers neither another label nor a racer,
// the NUMBER otherwise — what does he actually get, how often does a label change its mind, and does
// a name ever end up on a racer?
//
// WHAT IT MEASURES, per race:
//   name share            the share of label-frames showing a NAME. What the feature buys.
//   switches/label/race   form changes while the label STAYED on screen. The number that settles the
//                         hold window. LABEL-DEGRADE-1's baseline under the old "does it fit" rule
//                         was 1.24–3.89 across searound/river-run at 40 and 100.
//   name-on-racer         THE PASS/FAIL, and it is reported in TWO parts because they answer two
//                         different questions:
//                           CRITERION  a label the criterion GRANTED whose name box nevertheless
//                                      overlaps another racer. This is a self-check of the rule and
//                                      must be 0 — anything else means the criterion is wrong.
//                           DRAWN      a label DRAWN with its name whose box overlaps another racer,
//                                      counted over all sampled frames. This includes the hold's
//                                      lag: a symmetric hold necessarily keeps a name for up to one
//                                      window after a racer arrives underneath it. Reported rather
//                                      than hidden, with the demote-0 arm beside it so the cost of
//                                      removing it is on the table.
//
// IT DRIVES THE REAL LAYOUT AND THE REAL HOLD. `computeTagLayout` and `advanceLabelForms` are
// imported and called exactly as `renderRaceFrame` calls them, and the label BOX is rebuilt from the
// same exported helpers rather than re-typed — a harness that re-derived the geometry would be
// measuring a copy, which is the failure this repo has paid for six times.
//
// TEXT WIDTH: the same 0.5-per-character-per-px approximation for both forms, since there is no
// canvas in node — a constant factor on both, so "does the name cover something the number does not"
// is preserved. Not a substitute for the owner's eye on the real font.
//
// Usage:
//   node scripts/label-occlusion-truth.mjs                 # searound + river-run at 100, both arms
//   node scripts/label-occlusion-truth.mjs --racers=40 --hold=250
// ============================================================

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
  labelBoxHeight,
  labelBoxWidth,
  labelOffsetAbove,
} from "../client/src/screens/RaceScreen/nameTagLayout.js";
import {
  createLabelFormHold,
  advanceLabelForms,
} from "../client/src/screens/RaceScreen/labelFormHold.js";
import { frameCameraInputs } from "../client/src/screens/RaceScreen/frameCameraInputs.js";
import {
  computeRenderDisplayScale,
  getEffectiveMaxTargetScreenPx,
  drawnRacerScreenPx,
} from "../client/src/modules/autoSpriteScale.js";
import { raceNumberLabel, assignRaceNumbers } from "../client/src/modules/raceNumbers.js";
import { QUICK_TEST_NAMES_MIXED } from "../client/src/modules/racerNames.js";
import { effectiveZoom } from "../client/src/modules/camera/openTrackCamera.js";
import { OPEN_TRACK_BASE_ZOOM } from "../client/src/modules/camera/CameraDirector.js";

const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

const CW = 1280;
const CH = 720;
// TWO CONTRASTING TRACKS, the same pair LABEL-DEGRADE-1 used so the switch numbers are comparable:
// searound is CLOSED and bunches the field into a repeating pack, river-run is OPEN and strings it
// out. A rule that is calm on one and busy on the other has not been measured.
const TRACKS = (arg("tracks", "searound,river-run") || "").split(",").filter(Boolean);
const N = Number(arg("racers", "100"));
const HOLD_MS = Number(arg("hold", String(DEFAULT_CAMERA_CONFIG.labelFormHoldMs)));
// How often the name-on-racer check is run. Every frame would be exact and slow; every 6th frame is
// ten samples a second, which cannot miss an overlap that a viewer could see.
const SAMPLE_EVERY = 6;

/** The same width rule for both forms — see the header on why an approximation is sound here. */
const measureText = (fontPx) => (txt) => String(txt ?? "").length * fontPx * 0.5;

const hits = (a, b) =>
  Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
  Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);

function runOne(geo, n, demoteHoldMs) {
  const identity = resolveIdentity({
    racers: n,
    raceSeed: 5601,
    cameraSeed: 1439767152,
    racerType: "track-default",
    seconds: 60,
    note: "LABEL-OCCLUSION-1 criterion measurement",
  });
  const cameraConfig = structuredClone(DEFAULT_CAMERA_CONFIG);
  // THE ROW SUFFIX MUST BE OFF while measuring: it appends " (R3)" to every label and would make
  // every width in this table a measurement of a different string. It is off in the shipped default;
  // this line is here so the run does not depend on that staying true.
  cameraConfig.showRpStartRow = false;
  const race = buildRace(geo, identity, cameraConfig);
  const { st, cd } = race;

  const numbers = assignRaceNumbers(st.racers.length, identity.raceSeed);
  for (const r of st.racers) {
    r.name = QUICK_TEST_NAMES_MIXED[r.index % QUICK_TEST_NAMES_MIXED.length];
    r.raceNumber = numbers[r.index] ?? null;
  }

  const bsX = CW / geo.worldWidth;
  const bsY = CH / geo.worldHeight;
  const isOpen = race.shape.isOpen;
  const fontPx = tagFontScreenPx(cameraConfig.nameTagFrameFrac, CH);
  const measure = measureText(fontPx);
  const boxH = labelBoxHeight(fontPx);

  const hold = createLabelFormHold();
  let incumbents = null;
  let wideForms = null;
  let frames = 0;
  let labelFrames = 0;
  let nameFrames = 0;
  let switches = 0;
  let churn = 0;
  let sampled = 0;
  let drawnOverlaps = 0; // name-on-racer, over what was DRAWN (includes the hold's lag)
  let criterionOverlaps = 0; // name-on-racer, over what the CRITERION granted — must be 0
  let prevWide = null;
  let exemptNameFrames = 0; // label-frames whose name was drawn BY EXEMPTION
  let exemptOverlaps = 0; // …of which overlapped a racer, which is allowed and is counted anyway
  let focusSwitches = 0; // the focused racer's own form changes — must fall to zero
  const perLabelSwitches = new Map();

  runRace(race, identity, cameraConfig, ({ st: s, ts, raceStart }) => {
    // Only the RACING phase: the start formation shows every name by design (the roll call).
    if (ts - raceStart < (cameraConfig.nameTagAllUntilMs ?? 0)) return;
    const cam = { zoom: cd.zoom, offsetX: cd.offsetX, offsetY: cd.offsetY };
    const effX = isOpen ? effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM) : cam.zoom * bsX;
    const effY = isOpen ? effX : cam.zoom * bsY;
    const displayScale = computeRenderDisplayScale(
      race.displaySize,
      race.bodyRef / race.displaySize,
      effX,
      getEffectiveMaxTargetScreenPx(
        race.racerType?.config?.maxTargetScreenPx,
        cameraConfig.maxTargetScreenPx,
      ),
      cameraConfig.minDrawnFrameFrac,
      CH,
    );
    const racerScreenH = drawnRacerScreenPx(race.displaySize, displayScale, effY);
    const racerScreenW = drawnRacerScreenPx(race.displaySize, displayScale, effX);

    // LABEL-FOCUS-1: the same exemptions the renderer applies. FRAME-INPUTS-1: through the SAME
    // assembly the game uses, rather than reaching into the director here. That is the whole point
    // of that block — this harness passed while the live game was broken precisely because it set
    // fields RaceScreen did not, so it must not be allowed to assemble its own inputs again.
    const camera = frameCameraInputs(cd);
    let focusIndex = camera.anchorRacerIndex ?? null;
    if (focusIndex == null && s.racers.length) {
      let leader = s.racers[0];
      for (const r of s.racers) if ((r?.t ?? 0) > (leader?.t ?? 0)) leader = r;
      focusIndex = leader?.index ?? null;
    }
    const atFinish = camera.state === "PHOTO_FINISH";
    const exempt = focusIndex != null ? new Set([focusIndex]) : null;

    const out = computeTagLayout({
      racers: s.racers,
      effX,
      effY,
      offsetX: cam.offsetX,
      offsetY: cam.offsetY,
      canvasW: CW,
      canvasH: CH,
      fontPx,
      racerScreenH,
      racerScreenW,
      labelMarginPx: cameraConfig.nameTagMarginPx,
      measureText: measure,
      showAll: false,
      incumbents,
      labelOf: (r) => raceNumberLabel(r.raceNumber),
      wideLabelOf: (r) => r.name ?? "",
      wideForms,
      exempt,
      exemptAll: atFinish,
    });

    frames++;
    labelFrames += out.shown.size;
    nameFrames += out.wide.size;

    // ── THE PASS/FAIL. Rebuilt from the SAME exported helpers the layout uses. ──
    if (frames % SAMPLE_EVERY === 0) {
      sampled++;
      const offsetAbove = labelOffsetAbove(racerScreenH, cameraConfig.nameTagMarginPx);
      const boxes = [];
      for (const r of s.racers) {
        if (!r || r.index == null) continue;
        const sx = r.x * effX + cam.offsetX;
        const sy = r.y * effY + cam.offsetY;
        if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
        boxes.push({
          index: r.index,
          sx,
          sy,
          left: sx - racerScreenW / 2,
          right: sx + racerScreenW / 2,
          top: sy - racerScreenH / 2,
          bottom: sy + racerScreenH / 2,
        });
      }
      const byIndex = new Map(boxes.map((b) => [b.index, b]));
      const nameBoxOf = (r) => {
        const b = byIndex.get(r.index);
        if (!b) return null;
        const w = Math.max(1, labelBoxWidth(measure(r.name ?? "")));
        return {
          left: b.sx - w / 2,
          right: b.sx + w / 2,
          top: b.sy - offsetAbove - boxH,
          bottom: b.sy - offsetAbove,
        };
      };
      for (const r of s.racers) {
        if (!r || r.index == null) continue;
        const drawnWide = out.wide.has(r.index);
        const grantedWide = out.wideClear.has(r.index);
        if (!drawnWide && !grantedWide) continue;
        const nb = nameBoxOf(r);
        if (!nb) continue;
        let over = false;
        for (const b of boxes) {
          if (b.index === r.index) continue;
          if (hits(nb, b)) {
            over = true;
            break;
          }
        }
        if (!over) continue;
        // ── THE INVARIANT NARROWED WITH THE FEATURE (LABEL-FOCUS-1) ──────────────────────────
        // "No drawn name overlaps a racer" is now true only of NON-EXEMPT names. An exempt name
        // that covers something is the owner's choice, not a regression, and counting the two
        // together would let the next block read his decision as a defect. So they are two
        // columns, and the pass/fail is only ever the first one.
        const isExempt = atFinish || (exempt ? exempt.has(r.index) : false);
        if (drawnWide && isExempt) exemptOverlaps++;
        else if (drawnWide) drawnOverlaps++;
        if (grantedWide && !isExempt) criterionOverlaps++;
      }
      for (const i of out.wide) {
        if (atFinish || (exempt ? exempt.has(i) : false)) exemptNameFrames++;
      }
    }

    if (incumbents) {
      for (const i of out.shown) if (!incumbents.has(i)) churn++;
      for (const i of incumbents) if (!out.shown.has(i)) churn++;
      // SWITCHES: the DRAWN form changed while the label stayed on screen. A label that disappears
      // and comes back in the other form is churn, not a switch.
      for (const i of out.shown) {
        if (!incumbents.has(i)) continue;
        if ((prevWide ? prevWide.has(i) : false) !== out.wide.has(i)) {
          switches++;
          perLabelSwitches.set(i, (perLabelSwitches.get(i) ?? 0) + 1);
          // The focused racer's own switches, which the exemption should drive to zero. It is
          // counted rather than assumed, because "should" is a prediction and this project has just
          // been shown what one of those is worth.
          if (exempt && exempt.has(i)) focusSwitches++;
        }
      }
    }
    incumbents = out.shown;
    prevWide = out.wide;
    wideForms = advanceLabelForms(hold, {
      shown: out.shown,
      clear: out.wideClear,
      nowMs: ts,
      holdMs: HOLD_MS,
      demoteHoldMs,
    });
  });

  const seconds = frames / 60;
  const meanLabels = frames ? labelFrames / frames : 0;
  return {
    frames,
    seconds,
    meanLabels,
    nameShare: labelFrames ? nameFrames / labelFrames : 0,
    switches,
    switchesPerLabelPerRace: meanLabels ? switches / meanLabels : 0,
    churnPerSecond: seconds ? churn / seconds : 0,
    worstLabel: Math.max(0, ...perLabelSwitches.values()),
    sampled,
    drawnOverlaps,
    criterionOverlaps,
    exemptOverlaps,
    exemptNameFrames,
    exemptShare: labelFrames ? exemptNameFrames / labelFrames : 0,
    focusSwitches,
  };
}

console.log(
  formatIdentity(resolveIdentity({ racers: N, note: "LABEL-OCCLUSION-1" })),
);
console.log(`hold=${HOLD_MS}ms   sample every ${SAMPLE_EVERY} frames\n`);
console.log(
  "track        demote  labels  name%   switches  /label/race  worst  churn/s   NON-EXEMPT  exempt-ovl  focus-sw",
);
for (const id of TRACKS) {
  const geo = loadTracks({ only: id })[0];
  if (!geo) {
    console.error(`no such track: ${id}`);
    continue;
  }
  // TWO ARMS. The first is the owner's rule as written — a symmetric hold. The second makes the
  // name->number switch immediate, which is the only way a held name never sits on a racer; it is
  // measured here so the choice between them is a number rather than an argument.
  const ARMS = [
    ["hold", undefined],
    ["0ms", 0],
  ].filter(([label]) => arg("arms", "hold,0ms").split(",").includes(label));
  for (const [label, demote] of ARMS) {
    const r = runOne(geo, N, demote);
    console.log(
      `${id.padEnd(13)}${label.padStart(6)}  ${r.meanLabels.toFixed(1).padStart(6)}  ` +
        `${(r.nameShare * 100).toFixed(1).padStart(5)}  ${String(r.switches).padStart(8)}  ` +
        `${r.switchesPerLabelPerRace.toFixed(2).padStart(11)}  ${String(r.worstLabel).padStart(5)}  ` +
        `${r.churnPerSecond.toFixed(2).padStart(7)}  ${String(r.drawnOverlaps).padStart(10)}  ` +
        `${String(r.exemptOverlaps).padStart(10)}  ${String(r.focusSwitches).padStart(8)}   ` +
        `(crit ${r.criterionOverlaps}, exempt ${(r.exemptShare * 100).toFixed(1)}% of names, ${r.sampled} samples)`,
    );
  }
}
console.log(
  "\n  NON-EXEMPT = drawn names overlapping a racer, EXCLUDING the exempt ones. MUST be 0 — this is\n" +
    "               the pass/fail, and LABEL-FOCUS-1 narrowed it: an exempt name that covers\n" +
    "               something is the owner's choice, so it is counted in its own column instead.\n" +
    "  exempt-ovl = exempt names overlapping a racer. Expected to be non-zero; not a defect.\n" +
    "  focus-sw   = the focused racer's OWN form switches. The exemption should drive it to 0.\n" +
    "  crit       = names the rule GRANTED (non-exempt) that overlap a racer. MUST be 0.\n" +
    "  DRAWN     = names actually on screen overlapping a racer, sampled. The 'hold' arm carries the\n" +
    "              window's lag by construction; the '0ms' arm is what removing that lag costs.\n" +
    "  switches counted only while a label STAYED on screen; vanish-and-return is churn, not a switch.",
);

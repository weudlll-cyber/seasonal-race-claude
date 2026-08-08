// ============================================================
// File:        scripts/label-degrade-truth.mjs
// Project:     RaceArena — LABEL-DEGRADE-1
//
// THE QUESTION: if a label shows the racer's NAME whenever the name fits, how often does it change
// its mind? The owner named flicker as the real risk — "a label that flips between name and number
// as the pack jostles is worse than either form" — so this is the number that decides whether the
// feature ships on or off.
//
// WHAT IT MEASURES, per race, over the whole race:
//   switches/label/race   how many times a label changed FORM (name <-> number) while it was on
//                         screen. The headline: the owner's risk, per label, per race.
//   switches/label/s      the same, per second, so it can be compared with the label CHURN figures
//                         nameTagLayout.js already carries (12.06/s before stability work, 5.45/s
//                         after, over ~20 labels).
//   name share            the fraction of label-frames that showed a name. A feature that never
//                         fires is calm and worthless; this is what stops "0 switches" reading as
//                         success.
//   churn/s               labels appearing and disappearing, measured on the SAME run with the
//                         feature off and on. It is the control: if the names make the underlying
//                         layout churn more, that shows here rather than in the switch count.
//
// IT DRIVES THE REAL LAYOUT. `computeTagLayout` is imported and called exactly as
// `renderRaceFrame` calls it — same inputs, same incumbency threading, same font. A harness that
// re-implemented the decision would be measuring a copy, which is the failure this repo has paid
// for six times.
//
// TEXT WIDTH: measured with the same 0.5-per-character-per-px approximation for both forms, since
// there is no canvas in node. That is a CONSTANT FACTOR on both the name and the number, so the
// question it answers — does the name fit where the number did — is preserved. It is not a
// substitute for the owner's eye on the real font.
//
// Usage:
//   node scripts/label-degrade-truth.mjs                       # both tracks, 40 and 100
//   node scripts/label-degrade-truth.mjs --tracks=searound --racers=40
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
} from "../client/src/screens/RaceScreen/nameTagLayout.js";
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
// TWO CONTRASTING TRACKS, and the contrast is the point: searound is CLOSED and bunches the field
// into a repeating pack, river-run is OPEN and strings it out. Flicker is a function of how often
// neighbours cross, so a rule that is calm on one and busy on the other has not been measured.
const TRACKS = (arg("tracks", "searound,river-run") || "").split(",").filter(Boolean);
const SIZES = (arg("racers", "40,100") || "")
  .split(",")
  .map(Number)
  .filter((n) => n > 0);

/** The same width rule for both forms — see the header on why an approximation is sound here. */
const measureText = (fontPx) => (txt) => String(txt ?? "").length * fontPx * 0.5;

function runOne(geo, n, namesOn) {
  const identity = resolveIdentity({
    racers: n,
    raceSeed: 5601,
    cameraSeed: 1439767152,
    racerType: "track-default",
    seconds: 60,
    note: "LABEL-DEGRADE-1 flicker measurement",
  });
  const cameraConfig = structuredClone(DEFAULT_CAMERA_CONFIG);
  const race = buildRace(geo, identity, cameraConfig);
  const { st, cd } = race;

  // The render-only fields the layout and the label text need, attached the way RaceScreen does.
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

  let incumbents = null;
  let wideIncumbents = null;
  let frames = 0;
  let labelFrames = 0;
  let nameFrames = 0;
  let switches = 0; // form changes, name <-> number, while the label stayed on screen
  let churn = 0; // labels gained or lost — the control
  const perLabelSwitches = new Map();

  runRace(race, identity, cameraConfig, ({ st: s, ts, raceStart }) => {
    // Only the RACING phase: the start formation shows every name by design (the roll call), so
    // counting it would report the roll call as flicker.
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

    const out = computeTagLayout({
      racers: s.racers,
      effX,
      effY,
      offsetX: cam.offsetX,
      offsetY: cam.offsetY,
      canvasW: CW,
      canvasH: CH,
      fontPx,
      racerScreenH: drawnRacerScreenPx(race.displaySize, displayScale, effY),
      labelMarginPx: cameraConfig.nameTagMarginPx,
      measureText: measure,
      showAll: false,
      incumbents,
      labelOf: (r) => raceNumberLabel(r.raceNumber),
      wideLabelOf: namesOn ? (r) => r.name ?? "" : null,
      wideIncumbents,
    });

    frames++;
    labelFrames += out.shown.size;
    nameFrames += out.wide.size;

    if (incumbents) {
      // CHURN: a label gained or lost. The control — it must not get worse when names are on.
      for (const i of out.shown) if (!incumbents.has(i)) churn++;
      for (const i of incumbents) if (!out.shown.has(i)) churn++;
      // SWITCHES: the FORM changed while the label stayed on screen. A label that disappears and
      // comes back in the other form is churn, not a switch — counting it as both would double-
      // charge the same event to the feature.
      for (const i of out.shown) {
        if (!incumbents.has(i)) continue;
        const wasWide = wideIncumbents ? wideIncumbents.has(i) : false;
        const isWide = out.wide.has(i);
        if (wasWide !== isWide) {
          switches++;
          perLabelSwitches.set(i, (perLabelSwitches.get(i) ?? 0) + 1);
        }
      }
    }
    incumbents = out.shown;
    wideIncumbents = out.wide;
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
    switchesPerSecond: seconds ? switches / seconds : 0,
    churnPerSecond: seconds ? churn / seconds : 0,
    worstLabel: Math.max(0, ...perLabelSwitches.values()),
    identity,
  };
}

console.log(
  formatIdentity(resolveIdentity({ racers: 0, note: "per-run n below" })).replace("n=0 · ", ""),
);
console.log(
  "\ntrack        n    names  labels  name%   switches  /label/race  /label/s   churn/s  worst label",
);
for (const id of TRACKS) {
  const geo = loadTracks({ only: id })[0];
  if (!geo) {
    console.error(`no such track: ${id}`);
    continue;
  }
  for (const n of SIZES) {
    for (const namesOn of [false, true]) {
      const r = runOne(geo, n, namesOn);
      console.log(
        `${id.padEnd(13)}${String(n).padStart(3)}  ${(namesOn ? "ON " : "OFF").padStart(5)}  ` +
          `${r.meanLabels.toFixed(1).padStart(6)}  ${(r.nameShare * 100).toFixed(1).padStart(5)}  ` +
          `${String(r.switches).padStart(8)}  ${r.switchesPerLabelPerRace.toFixed(2).padStart(11)}  ` +
          `${r.switchesPerSecond.toFixed(3).padStart(8)}  ${r.churnPerSecond.toFixed(2).padStart(7)}  ` +
          `${String(r.worstLabel).padStart(11)}`,
      );
    }
  }
}
console.log(
  "\n  switches counted only while a label STAYED on screen; a label that vanishes and returns in\n" +
    "  the other form is churn, not a switch. churn/s is the control: it must not get worse when\n" +
    "  names are on. Text width is approximated (no canvas in node) by the SAME rule for both forms.",
);

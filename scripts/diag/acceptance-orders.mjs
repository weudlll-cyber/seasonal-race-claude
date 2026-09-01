// Acceptance 5(b): sim finishing orders for seeds 1, 7, 42 — searound / manta / 40,
// canonical defaults (the track's own defaultLaps at the shipped normal speed).
// Names are the browser's QUICK_TEST_NAMES in racer-index order, so the owner can read
// this list straight off the Quick-Test result screen.
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
import { EditorShape } from "../../client/src/modules/track-editor/EditorShape.js";
import { runSingleRace } from "../sim-fairness.mjs";
import {
  makeRaceRng,
  createRacePlan,
  createTrajectoryController,
} from "../../client/src/modules/racePlanner.js";
import {
  computeEvenRowLayout,
  computeRacerLayout,
} from "../../client/src/modules/rowLayout.js";
import {
  deriveRaceDuration,
  normalSpeedFrom,
  trackDefaultLaps,
} from "../../client/src/modules/durationModel.js";
import {
  DEFAULT_RACE_DYNAMICS_CONFIG as DYN,
  DEFAULT_RACE_BEHAVIOR_CONFIG as BEH,
  DEFAULT_BASE_SPEED_CONFIG,
} from "../../client/src/modules/storage/defaults.js";
import { DEFAULT_AUTO_SCALE_CONFIG } from "../../client/src/modules/autoSpriteScale.js";
import { racerFacts } from "../lib/racerFacts.mjs";

const NAMES = [
  "Turbo",
  "Blaze",
  "Rocket",
  "Flash",
  "Speedy",
  "Thunder",
  "Nitro",
  "Drift",
  "Bolt",
  "Zephyr",
  "Storm",
  "Comet",
  "Arrow",
  "Blitz",
  "Apex",
  "Ridge",
  "Flare",
  "Surge",
  "Dash",
  "Nova",
  "Mercury",
  "Orbit",
  "Quasar",
  "Pixel",
  "Vortex",
  "Hawk",
  "Raptor",
  "Maverick",
  "Phantom",
  "Shadow",
  "Phoenix",
  "Titan",
  "Atlas",
  "Falcon",
  "Eagle",
  "Sparrow",
  "Raven",
  "Swift",
  "Breeze",
  "Gale",
];
const track = JSON.parse(
  readFileSync(join(ROOT, "server/seeds/tracks/searound.json"), "utf8"),
);
const shape = new EditorShape(track);
const pathLengthPx = track.pathLengthPx ?? shape.getTotalLength();
const geometricTrackWidth = track.width ?? shape.getActualTrackWidth();
const isOpen = !!shape.isOpen;
const N = 40;
// The manta's physical facts come from the racer-type registry, not from literals here
// (REGISTRY-LITERALS-1, 2026-09-02). scripts/lib/racerFacts.mjs carries the rule.
const {
  speedMultiplier: spd,
  displaySize,
  bodyFillX,
  bodyFillY,
} = racerFacts("manta");
const V = normalSpeedFrom(DEFAULT_BASE_SPEED_CONFIG);
const LAPS = trackDefaultLaps(track);
const model = deriveRaceDuration({
  isOpen,
  pathLengthPx,
  laps: LAPS,
  normalSpeedPxPerSec: V,
  speedMultiplier: spd,
  runoutZone: BEH.runoutZone,
});
const totalRows = computeRacerLayout(
  geometricTrackWidth * BEH.startSpreadRange,
  N,
  displaySize,
  DEFAULT_AUTO_SCALE_CONFIG,
).rowCount;

const planConfig = () => ({
  bonusStrengthMultiplier: DYN.racePlanBonusStrengthMultiplier,
  phaseSplitBonusEnabled: DYN.phaseSplitBonusEnabled,
  areaBonusEarly: DYN.areaBonusEarly,
  areaBonusPulk: DYN.areaBonusPulk,
  areaBonusPost: DYN.areaBonusPost,
  pulkStart: DYN.racePlanPulkStart,
  bonusTransitionEnd: DYN.racePlanBonusTransitionEnd,
  bonusFadeDuration: DYN.racePlanBonusFadeDuration,
  corridorStart: DYN.racePlanCorridorStart,
  corridorEnd: DYN.racePlanCorridorEnd,
  pulkBiasGain: DYN.pulkBiasGain,
  choreoIntensity: DYN.choreoIntensity,
  choreoPackBandStrictness: DYN.choreoPackBandStrictness,
  choreoReleaseProgress: DYN.choreoReleaseProgress,
  choreoResolveB2: DYN.choreoResolveB2,
  choreoResolveB3: DYN.choreoResolveB3,
  choreoResolveB4: DYN.choreoResolveB4,
  choreoResolveB5: DYN.choreoResolveB5,
  choreoOutcomeStart: DYN.choreoOutcomeStart,
  packReSteerThreshold: DYN.packReSteerThreshold,
  b2AttackHeroes: DYN.b2AttackHeroes,
  b2AttackPeakRank: DYN.b2AttackPeakRank,
  b2AttackFinalRank: DYN.b2AttackFinalRank,
  b2AttackProgress: DYN.b2AttackProgress,
  b2AttackResolveProgress: DYN.b2AttackResolveProgress,
  b2AttackBandArrival: DYN.b2AttackBandArrival,
  gapRerollThresholdLengths: DYN.gapRerollEnabled
    ? DYN.gapRerollThresholdLengths
    : null,
  gapRerollMode: DYN.gapRerollMode,
  gapRerollStrength: DYN.gapRerollStrength,
  reRollTransitionDuration: DYN.reRollTransitionDuration,
  contestWindowStart: DYN.contestWindowStart,
});

console.log(
  `searound / manta / 40 — canonical defaults: ${LAPS} laps, normal speed ${V} px/s x M=${spd} => pace ${(V * spd).toFixed(1)} px/s`,
);
console.log(
  `derived duration (mean racer): ${model.realizedDurationSec.toFixed(2)} s   finishT=${model.finishT}\n`,
);

for (const seed of [1, 7, 42]) {
  const raceRng = makeRaceRng(seed).physics;
  const rowLayout = computeEvenRowLayout(N, totalRows, raceRng);
  const planRacers = rowLayout.assignments
    .map((a) => ({ index: a.racerIndex, startRowIndex: a.rowIndex }))
    .sort((x, y) => x.index - y.index);
  const plan = createRacePlan(
    planRacers,
    model.finishT,
    model.realizedDurationSec * 1000,
    planConfig(),
    seed,
  );
  const result = runSingleRace({
    shape,
    pathLengthPx,
    geometricTrackWidth,
    isOpen,
    speedMultiplier: spd,
    displaySize,
    bodyFillX,
    bodyFillY,
    laps: LAPS,
    normalSpeedPxPerSec: V,
    seed,
    nRacers: N,
    raceRng,
    rowLayout,
    behaviorConfigOverrides: { isOpen },
    racePlanController: createTrajectoryController(plan),
    racerTargetRankMap: plan._racerTargetRank,
  });
  const rows = [...result].sort((a, b) => a.finalRank - b.finalRank);
  console.log(`── seed ${seed} ──`);
  const t0 = rows[0].finishTime;
  console.log(
    rows
      .slice(0, 10)
      .map(
        (r, i) =>
          `${String(i + 1).padStart(2)}. ${NAMES[r.racerIndex].padEnd(9)} ${r.finishTime - t0 >= 0 ? "+" : ""}${(r.finishTime - t0).toFixed(2)}s`,
      )
      .join("\n"),
  );
  console.log(
    `   ... full order: ${rows.map((r) => NAMES[r.racerIndex]).join(", ")}`,
  );
  console.log(
    `   winner margin: ${(rows[1].finishTime - rows[0].finishTime).toFixed(3)}s\n`,
  );
}

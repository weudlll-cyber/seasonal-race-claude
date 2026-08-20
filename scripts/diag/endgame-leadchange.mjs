// ============================================================
// File:        scripts/diag/endgame-leadchange.mjs
// Project:     RaceArena — CAMERA-NONDETERMINISM-1 (report-only, changes nothing)
//
// A LEAD CHANGE INSIDE THE ENDGAME — found on demand, then recorded frame by frame.
//
// The owner's screenshot shows a TIGHT shot on the leader with NO FINISH LINE anywhere in it, under
// a "LEAD CHANGE!" banner. No rule in the endgame should produce that, so either a rule is doing
// something unintended or a rule is being BYPASSED. This finds a race where it happens and prints
// the frames either side, so the answer is read rather than argued.
//
// ── WHY IT NEEDS A SEARCH ────────────────────────────────────────────────────────────────────
//
// Whether LEAD_CHANGE is taken at all is a RANDOM DRAW — `_acceptsOffer(weight)` calls the
// director's own RNG — so it depends on the CAMERA seed, not the race seed. A defect nobody can
// trigger on demand cannot be verified as fixed, so this scans (race seed x camera seed) until it
// finds one and then prints the triple that reproduces it.
//
// Usage:
//   node scripts/diag/endgame-leadchange.mjs
//   node scripts/diag/endgame-leadchange.mjs --track=space-sprint --scan=40
//   node scripts/diag/endgame-leadchange.mjs --track=space-sprint --seed=9 --camseed=7   (replay one)
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

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { effectiveZoom } = await import(u("client/src/modules/camera/openTrackCamera.js"));
const { OPEN_TRACK_BASE_ZOOM } = await import(u("client/src/modules/camera/projection.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));

const CW = 1280;
const CH = 720;
const ARG = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const TRACK = ARG("track", "space-sprint");
const SCAN = Number(ARG("scan", "0"));
const ONE_SEED = ARG("seed", null);
const ONE_CAM = ARG("camseed", null);
const RACERS = Number(ARG("racers", "100"));

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
const setPath = (o, path, v) => {
  const parts = path.split(".");
  let cur = o;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = structuredClone(cur[parts[i]]);
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = v;
};
const hisConfig = () => {
  const c = structuredClone(DEFAULT_CAMERA_CONFIG);
  for (const [k, v] of HIS) setPath(c, k, v);
  return c;
};

const geo = loadTracks({ only: TRACK })[0];
if (!geo) {
  console.error(`no such track: ${TRACK}`);
  process.exit(1);
}

/** Run one race; return every frame from progress 0.88 on, plus any endgame LEAD_CHANGE entries. */
function run(raceSeed, cameraSeed) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed,
    cameraSeed,
    racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET),
    canvasW: CW,
    canvasH: CH,
  });
  const cfg = hisConfig();
  const race = buildRace(geo, identity, cfg);
  const { shape, st, cd, trackWidthPx } = race;
  const bsX = CW / (geo.worldWidth || CW);
  const effOf = (z) => (shape.isOpen ? effectiveZoom(z, OPEN_TRACK_BASE_ZOOM) : z * bsX);
  const th = cfg.endgameThreshold;

  const frames = [];
  const events = [];
  const physSwaps = [];
  let prevState = null;
  let prevLeader = null;
  runRace(race, identity, cfg, ({ cd: c, st: s, ts, raceStart }) => {
    if (s.finishedCount > 0) return false;
    let maxT = 0;
    for (const r of s.racers) if (r.t > maxT) maxT = r.t;
    const p = s.finishT > 0 ? maxT / s.finishT : 0;
    if (p < 0.88) {
      prevState = c.state;
      return;
    }
    const effX = effOf(c.zoom);
    const line = c._finishLineWorldPoint(s.finishT);
    const lx = line ? c.offsetX + line.x * effX : NaN;
    const ly = line ? c.offsetY + line.y * (shape.isOpen ? effX : c.zoom * (CH / geo.worldHeight)) : NaN;
    const row = {
      p,
      tSec: +((ts - raceStart) / 1000).toFixed(3),
      state: c.state,
      width: CW / effX,
      corr: CW / effX / trackWidthPx,
      lineOn: Number.isFinite(lx) && lx >= 0 && lx <= CW && ly >= 0 && ly <= CH,
      lx,
      ly,
      composing: !!c._runInComposingNow,
      binding: c._framingProbe?.binding ?? "?",
      schedW: (() => {
        const z = c._framingProbe?.ceilings?.state;
        return z > 0 && Number.isFinite(z) ? CW / effOf(z) : NaN;
      })(),
      anchorIdx: c.anchorRacerIndex ?? null,
    };
    frames.push(row);
    if (c.state !== prevState && c.state === "LEAD_CHANGE" && p > th) {
      events.push({ at: frames.length - 1, p });
    }
    // THE PHYSICS LEAD CHANGE, which is camera-INDEPENDENT and therefore the cheap filter: search
    // for races where the lead actually swaps late, then vary the camera seed only on those.
    const ldr = s.racers.reduce((a, b) => (b.t > a.t ? b : a), s.racers[0]);
    if (prevLeader !== null && ldr.index !== prevLeader && p > th) {
      physSwaps.push({ p, from: prevLeader, to: ldr.index });
    }
    prevLeader = ldr.index;
    prevState = c.state;
  });
  return { frames, events, physSwaps };
}

if (ONE_SEED && ONE_CAM) {
  const { frames, events } = run(Number(ONE_SEED), Number(ONE_CAM));
  console.log(
    `REPLAY ${TRACK} raceSeed=${ONE_SEED} cameraSeed=${ONE_CAM} racers=${RACERS} — ${events.length} endgame LEAD_CHANGE entr${events.length === 1 ? "y" : "ies"}`
  );
  for (const e of events) {
    console.log(`\n--- LEAD_CHANGE at progress ${e.p.toFixed(4)} — 6 frames before, 14 after ---`);
    console.log("  prog   state          width   corr  lineOn   line x,y        schedW  binding        anchor");
    for (let i = Math.max(0, e.at - 6); i < Math.min(frames.length, e.at + 15); i++) {
      const f = frames[i];
      console.log(
        [
          (i === e.at ? ">" : " ") + f.p.toFixed(4).padStart(6),
          "  " + f.state.padEnd(14),
          Math.round(f.width).toString().padStart(6),
          f.corr.toFixed(2).padStart(7),
          (f.lineOn ? "yes" : "NO").padStart(7),
          `  ${Math.round(f.lx)},${Math.round(f.ly)}`.padEnd(16),
          (Number.isFinite(f.schedW) ? Math.round(f.schedW) : "-").toString().padStart(7),
          "  " + f.binding.padEnd(14),
          String(f.anchorIdx).padStart(6),
        ].join("")
      );
    }
  }
  process.exit(0);
}

// ── THE SCAN ────────────────────────────────────────────────────────────────────────────────
const N = SCAN || 24;
console.log(`SCANNING ${TRACK} for a LEAD CHANGE inside the endgame — ${N} (raceSeed x cameraSeed) pairs\n`);
console.log("raceSeed  cameraSeed   endgame LEAD_CHANGE   tightest corr after   line lost after?");
const hits = [];
for (let i = 0; i < N; i++) {
  const raceSeed = 1 + i;
  const cameraSeed = 1439767152;
  const { frames, events, physSwaps } = run(raceSeed, cameraSeed);
  if (physSwaps.length && !events.length) {
    console.log(`${String(raceSeed).padEnd(10)}${String(cameraSeed).padEnd(13)}physics swap at p=${physSwaps[0].p.toFixed(4)} but the camera did NOT take it`);
  }
  if (!events.length) continue;
  const e = events[0];
  const after = frames.slice(e.at, e.at + 20);
  const tightest = Math.min(...after.map((f) => f.corr));
  const lost = after.filter((f) => !f.lineOn).length;
  hits.push({ raceSeed, cameraSeed, p: e.p, tightest, lost });
  console.log(
    `${String(raceSeed).padEnd(10)}${String(cameraSeed).padEnd(13)}p=${e.p.toFixed(4)}            ${tightest.toFixed(2).padStart(6)}              ${lost} of ${after.length} frames`
  );
}
if (!hits.length) {
  console.log("(none found — widen the scan)");
} else {
  const h = hits[0];
  console.log(
    `\nREPRODUCE:  node scripts/diag/endgame-leadchange.mjs --track=${TRACK} --seed=${h.raceSeed} --camseed=${h.cameraSeed}`
  );
}

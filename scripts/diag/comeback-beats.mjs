// ============================================================
// File:        scripts/diag/comeback-beats.mjs
// Project:     RaceArena — COMEBACK-BEATS-1
//
// DOES THE CAMERA CATCH THE COMEBACK THE PLAN WROTE? A MEASUREMENT. NOTHING IS BUILT AND NOTHING
// IS CHANGED — no gate, no threshold, no plan, no detector, and the beats are NOT passed through.
//
// ── WHAT IS TRUE AT SOURCE, re-established 2026-09-05 rather than taken from any report ───────
//
// THE PLAN SAYS **WHO**. `comebackDetector.setPlan` (`comebackDetector.js:64-75`) walks
// `cameraPlan.heroes` and keeps exactly one thing: the INDEX of each hero whose `role` is
// `'comebacker'`, into `this._cast`. That set is used at `:130` as the CANDIDATE POOL for `best()`,
// in place of `_b1` (the top-band roster). Nothing else on a hero survives the call.
//
// THE CAMERA DECIDES **WHEN**. `best()` (`:122-149`) scans rank history over a rolling window and
// picks the largest rank GAIN among candidates, gated by `minStartGap` (started far enough back),
// `maxCurrentRankPct` (not already up front) and `minPositionsGained`. It has no idea what the plan
// wrote.
//
// WHAT IS DISCARDED: the per-hero `beats` array — `{ progress, event }` with `event` one of
// `anchor` / `peak` / `resolve`, built at `heroCurveGenerator.js:511-517` from the authored curve's
// own points — and `finalRank`. So the plan states, per comebacker, WHERE IN THE RACE its climb was
// written, and the camera never sees it.
//
// ── HOW THIS HARNESS DELIVERS THE PLAN, and why that detail decides the measurement ──────────
//
// ★ `scripts/lib/raceDriver.mjs` DOES NOT DELIVER THE AUTHORED PLAN. At `:374` it calls
// `cd.updateRacePlan(b1Indices)` — the OLD Set channel — and never `setCameraPlan`. A race driven
// by it therefore has `_cast === null` and `best()` falls back to `_b1`, which is NOT the camera
// the browser runs. Measuring on that path would answer a question nobody asked.
//
// The browser delivers the plan at `RaceScreen/index.jsx:1008-1014`, once `getCameraPlan()` returns
// non-null (heroes are cast MID-RACE, so it is null at race start). `scripts/camera-replay.mjs:363-370`
// already reproduces that. THIS HARNESS DOES THE SAME, from `onFrame`, which runs immediately after
// the frame's physics steps. That is at most one frame later than the browser's delivery point, and
// it is stated rather than hidden.
//
// ── WHY A BARE COUNT OF SHOTS WOULD BE UNREADABLE, and what is counted instead ────────────────
//
// TWO GATES STAND BETWEEN A WRITTEN BEAT AND A SHOT, and they fail for different reasons, so a zero
// has to be split or it says nothing:
//
//   1. THE DETECTOR'S OWN GATES (`best()`), which decide whether a candidate EXISTS at all.
//   2. THE DIRECTOR'S CONTEST (`cameraDirector.js:1709-1725`), which decides whether an existing
//      candidate BECOMES the shot — outcome phase, cooldown, weight, and a weighted pick against
//      BATTLE / LEAD_CHANGE / OVERVIEW.
//
// So this harness also calls `best()` itself once per frame and counts the frames on which a
// candidate existed. `best()` is a PURE READ — it sorts a copy, consults history and returns a
// racer; it mutates nothing and draws no random number — so calling it a second time cannot move
// the race or the camera. That splits "the gates never produced anybody" from "somebody was there
// and the shot was not taken".
//
// ★ ONE CLAIM IN THE DETECTOR'S OWN HEADER IS CHECKED HERE RATHER THAN BELIEVED: "Every cast
// comebacker is drawn from the B1 pool, so case 1 is always already rank-tracked." It matters
// because `recordRanks` keeps history for `_b1` MEMBERS ONLY (`comebackDetector.js:104`), while
// `best()` iterates the CAST — so a cast comebacker outside B1 would have no history and be skipped
// at `:128` forever. This harness counts them.
//
// ── ★ AND THE DRIVER'S CAMERA IS NOT THE BROWSER'S CAMERA FOR THIS SHOT ──────────────────────
//
// `raceDriver.mjs:500` hands the director `isOutcomePhase: false` — a hard-coded literal. The
// browser hands it `diagDataRef.current.rpPhase === 'OUTCOME'` (`RaceScreen/index.jsx:1417`), and
// that field is written on every physics frame the plan is on: the guard above it is
// `if (racePlanController)` (`:1170`), not a diagnostics flag.
//
// IT DECIDES THIS MEASUREMENT, because the comeback shot is offered only when
// `raceState?.isOutcomePhase || leaderProgress > outcomePhaseThreshold`
// (`cameraDirector.js:1711-1715`). With the flag false the window is the internal fallback alone;
// with the browser's flag it is the PLAN's OUTCOME phase, which `racePlanner.js:526-530` opens at
// `corridorStart` — much earlier. So the driver's window is a STRICT SUBSET of the browser's, and a
// count of shots taken on the driver's path is a LOWER BOUND, not the answer.
//
// So both arms are measured, and the shared driver is NOT edited: `--outcome=browser` (the default)
// wraps this race's own `cd.update` locally to supply the flag the browser supplies, and
// `--outcome=driver` is the control that reproduces the shared driver as it stands.
//
// Usage:
//   node scripts/diag/comeback-beats.mjs --seeds=1,2,3           # stage 1, N=30 (10 tracks x 3)
//   node scripts/diag/comeback-beats.mjs --seeds=1,2,3,4 --json=<f>
//   node scripts/diag/comeback-beats.mjs --outcome=driver        # the control arm
// ============================================================

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
} from "../lib/raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(
  u("client/src/modules/storage/defaults.js")
);

const ARG = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const SEEDS = ARG("seeds", "1,2,3").split(",").map(Number).filter(Number.isFinite);
const JSON_OUT = ARG("json", null);
const OUTCOME_ARM = ARG("outcome", "browser");
if (OUTCOME_ARM !== "browser" && OUTCOME_ARM !== "driver") {
  console.error(`comeback-beats: --outcome must be "browser" or "driver", got "${OUTCOME_ARM}".`);
  process.exit(2);
}
if (SEEDS.length === 0) {
  console.error("comeback-beats: --seeds resolved to nothing. Refusing to measure zero races.");
  process.exit(2);
}

// READ, never retyped: the progress past which the director will even consider the comeback shot.
const OUTCOME_THRESHOLD = DEFAULT_CAMERA_CONFIG.outcomePhaseThreshold;

const tracks = loadTracks();
if (tracks.length === 0) {
  console.error("comeback-beats: no tracks loaded. Refusing to report on an empty set.");
  process.exit(2);
}

const rows = [];

for (const geo of tracks) {
  for (const seed of SEEDS) {
    const identity = resolveIdentity({ raceSeed: seed, racers: 40 });
    const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
    const { st, meta, cd } = race;

    // THE BROWSER'S OUTCOME FLAG, supplied locally. The shared driver is not touched: this wraps
    // one race's own director. The wrapper only rewrites the one field and delegates everything.
    if (OUTCOME_ARM === "browser") {
      const origUpdate = cd.update.bind(cd);
      cd.update = (racers, ts, raceState, cw, ch, dt) =>
        origUpdate(
          racers,
          ts,
          {
            ...raceState,
            isOutcomePhase:
              meta.racePlanController?.getPhase?.(st.physicsTs, st.raceProgress) === "OUTCOME",
          },
          cw,
          ch,
          dt,
        );
    }

    let planDelivered = false;
    let deliveredAt = null; // progress at which the plan reached the detector
    let beats = null; // [{ index, role, beats:[{progress,event}] }]
    let b1 = null; // the plan's own B1 pool — the set `recordRanks` keeps history for
    let candidateFrames = 0; // frames on which the detector HAD somebody, shot or no shot
    // ...and of those, the frames on which the DIRECTOR would even consider the shot. The comeback
    // candidate is pushed only inside the outcome phase (`cameraDirector.js:1711-1715`), so a
    // candidate before it is invisible to the contest no matter how good it is.
    let candidateOutcomeFrames = 0;
    const overlapStates = new Map(); // what the camera showed DURING that overlap
    const candidateRacers = new Set(); // who those frames were about
    // Every COMEBACK_ZOOM the camera actually entered: when, at what progress, on whom.
    const shots = [];
    let prevState = null;
    // What the camera did INSTEAD — every state it entered, and for how many frames. Without this
    // a zero is unreadable: it cannot be told from a camera that never ran.
    const stateFrames = new Map();
    // THE BEATS IN TIME. A beat is written in race PROGRESS and the camera's moment happens at a
    // wall clock, so one has to be carried into the other's units to answer "how far apart in time".
    // Progress is monotone here (`raceCore.js:524` takes a running max), so the crossing is the
    // first frame at or past the beat, recorded as it happens rather than reconstructed after.
    const crossedAt = new Map(); // progress value -> ms since race start on the frame it was reached
    const watch = []; // every beat progress this race needs a time for

    runRace(race, identity, DEFAULT_CAMERA_CONFIG, ({ cd: dir, st: state, ts, raceStart }) => {
      // THE BROWSER'S DELIVERY, reproduced. One frame later than RaceScreen's at most.
      if (meta.racePlanController && !planDelivered) {
        const cp = meta.racePlanController.getCameraPlan?.();
        if (cp) {
          dir.setCameraPlan(cp);
          planDelivered = true;
          deliveredAt = +(state.raceProgress ?? 0).toFixed(4);
          b1 = cp.b1Indices instanceof Set ? new Set(cp.b1Indices) : null;
          for (const h of cp.heroes ?? [])
            for (const bt of h.beats ?? []) if (!watch.includes(bt.progress)) watch.push(bt.progress);
          beats = (cp.heroes ?? []).map((h) => ({
            index: h.index,
            role: h.role,
            finalRank: h.finalRank ?? null,
            beats: (h.beats ?? []).map((b) => ({ progress: b.progress, event: b.event })),
          }));
        }
      }
      for (const w of watch) {
        if (!crossedAt.has(w) && (state.raceProgress ?? 0) >= w) crossedAt.set(w, ts - raceStart);
      }
      const s = dir.state;
      stateFrames.set(s, (stateFrames.get(s) ?? 0) + 1);
      // A PURE READ of the detector, to separate the two gates. Mutates nothing, rolls nothing.
      const cand = dir._comeback?.best?.(state.racers, ts) ?? null;
      if (cand) {
        candidateFrames++;
        candidateRacers.add(cand.index);
        const inWindow =
          OUTCOME_ARM === "browser"
            ? meta.racePlanController?.getPhase?.(state.physicsTs, state.raceProgress) === "OUTCOME"
            : false;
        if (inWindow || (state.raceProgress ?? 0) > OUTCOME_THRESHOLD) {
          candidateOutcomeFrames++;
          overlapStates.set(s, (overlapStates.get(s) ?? 0) + 1);
        }
      }
      if (s === "COMEBACK_ZOOM" && prevState !== "COMEBACK_ZOOM") {
        shots.push({
          ts,
          ms: ts - raceStart,
          progress: +(state.raceProgress ?? 0).toFixed(4),
          racer: dir.comebackLockedRacerIndex ?? null,
        });
      }
      prevState = s;
      return true;
    });

    const comebackers = (beats ?? []).filter((h) => h.role === "comebacker");
    rows.push({
      track: geo.id,
      seed,
      planDelivered,
      deliveredAt,
      states: Object.fromEntries([...stateFrames].sort((x, y) => y[1] - x[1])),
      comebackers: comebackers.map((h) => ({
        index: h.index,
        resolve: h.beats.find((b) => b.event === "resolve")?.progress ?? null,
        peak: h.beats.filter((b) => b.event === "peak").map((b) => b.progress),
        anchor: h.beats.find((b) => b.event === "anchor")?.progress ?? null,
        beatCount: h.beats.length,
      })),
      heroCount: (beats ?? []).length,
      crossedAt: Object.fromEntries(crossedAt),
      b1Size: b1 ? b1.size : null,
      castOutsideB1: b1 ? comebackers.filter((h) => !b1.has(h.index)).map((h) => h.index) : null,
      candidateFrames,
      candidateOutcomeFrames,
      overlapStates: Object.fromEntries([...overlapStates].sort((x, y) => y[1] - x[1])),
      candidateRacers: [...candidateRacers],
      shots,
      raceMs: st.physicsTs ?? null,
    });
    process.stderr.write(
      `  ${geo.id.padEnd(15)} seed ${String(seed).padStart(2)}  ` +
        `plan ${planDelivered ? "yes" : "NO "}  comebackers ${comebackers.length}  shots ${shots.length}\n`,
    );
  }
}

if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ seeds: SEEDS, rows }, null, 1));

// ── THE ACCOUNT ──────────────────────────────────────────────────────────────────────────────
const N = rows.length;
const delivered = rows.filter((r) => r.planDelivered).length;
const writtenBeats = rows.reduce((a, r) => a + r.comebackers.reduce((b, c) => b + c.beatCount, 0), 0);
const writtenComebackers = rows.reduce((a, r) => a + r.comebackers.length, 0);
const totalShots = rows.reduce((a, r) => a + r.shots.length, 0);

// Per WRITTEN comebacker: did the camera show ANY comeback, was it the SAME racer, and how far from
// the RESOLVE beat — the beat the backlog calls the storm, where the authored climb lands.
let matchedRacer = 0;
let noShotAtAll = 0;
const deltas = [];
for (const r of rows) {
  for (const c of r.comebackers) {
    const hisShots = r.shots.filter((s) => s.racer === c.index);
    if (r.shots.length === 0) noShotAtAll++;
    if (hisShots.length > 0) {
      matchedRacer++;
      if (c.resolve != null) {
        // Progress distance from the resolve beat to the camera's nearest entry on that racer.
        const d = hisShots
          .map((s) => s.progress - c.resolve)
          .sort((a, b) => Math.abs(a) - Math.abs(b))[0];
        deltas.push(d);
      }
    }
  }
}
const shotsWithNoWrittenBeat = rows.reduce(
  (a, r) =>
    a + r.shots.filter((s) => !r.comebackers.some((c) => c.index === s.racer)).length,
  0,
);
const q = (arr, f) => {
  if (arr.length === 0) return null;
  const b = arr.slice().sort((x, y) => x - y);
  return b[Math.min(b.length - 1, Math.floor(f * b.length))];
};
const absd = deltas.map(Math.abs);

console.log(`\n══ COMEBACK BEATS vs THE CAMERA'S GUESS — N = ${N} races (${tracks.length} tracks x ${SEEDS.length} seeds), race plan ON, shipped defaults ══\n`);
console.log(`  plan delivered in            ${delivered} of ${N} races`);
console.log(`  comebackers WRITTEN          ${writtenComebackers}  (${writtenBeats} beats in total)`);
console.log(`  camera comebacks SHOWN       ${totalShots}`);
console.log(`  races with a written comebacker and NO camera comeback at all   ${noShotAtAll}`);
console.log(`  written comebackers the camera DID show                          ${matchedRacer} of ${writtenComebackers}`);
console.log(`  camera comebacks on a racer the plan did NOT name as comebacker  ${shotsWithNoWrittenBeat} of ${totalShots}`);
if (absd.length) {
  console.log(
    `\n  DISTANCE from the RESOLVE beat to the camera's nearest entry on that racer, in race progress:\n` +
      `    n=${absd.length}  median |Δ| ${q(absd, 0.5).toFixed(3)}  p90 |Δ| ${q(absd, 0.9).toFixed(3)}  ` +
      `max |Δ| ${Math.max(...absd).toFixed(3)}\n` +
      `    signed median ${q(deltas, 0.5).toFixed(3)} (negative = the camera fired BEFORE the written beat)`,
  );
}
// THE SAME DISTANCE IN TIME, which is the unit the brief asked for. Progress is the unit the beat is
// written in; seconds are the unit a viewer experiences, and they are not interchangeable — a race
// does not cover progress at a constant rate.
const msDeltas = [];
for (const r of rows) {
  for (const c of r.comebackers) {
    const hisShots = r.shots.filter((s) => s.racer === c.index);
    if (hisShots.length === 0 || c.resolve == null) continue;
    const beatMs = r.crossedAt?.[c.resolve];
    if (beatMs == null) continue; // the race never reached that progress
    msDeltas.push(hisShots.map((s) => s.ms - beatMs).sort((a, b) => Math.abs(a) - Math.abs(b))[0]);
  }
}
if (msDeltas.length) {
  const abs = msDeltas.map(Math.abs);
  console.log(
    `    IN TIME: n=${msDeltas.length}  median |dt| ${(q(abs, 0.5) / 1000).toFixed(2)} s  ` +
      `p90 |dt| ${(q(abs, 0.9) / 1000).toFixed(2)} s  max |dt| ${(Math.max(...abs) / 1000).toFixed(2)} s  ` +
      `signed median ${(q(msDeltas, 0.5) / 1000).toFixed(2)} s  early ${msDeltas.filter((x) => x < 0).length}/${msDeltas.length}`,
  );
} else {
  console.log(`    IN TIME: no pairing to measure.`);
}
if (!absd.length) {
  console.log(`\n  DISTANCE from the resolve beat: no pairing to measure.`);
}

// ── THE TWO GATES, SEPARATED. Which one the beats die at is the whole question. ───────────────
const candFrames = rows.reduce((a, r) => a + r.candidateFrames, 0);
const racesWithCandidate = rows.filter((r) => r.candidateFrames > 0).length;
const racesWithShot = rows.filter((r) => r.shots.length > 0).length;
const outsideB1 = rows.reduce((a, r) => a + (r.castOutsideB1?.length ?? 0), 0);
console.log(`\n  ── THE TWO GATES ──   [arm: --outcome=${OUTCOME_ARM}]`);
console.log(`  GATE 1, the detector: races in which best() EVER returned somebody   ${racesWithCandidate} of ${N}  (${candFrames} frames in total)`);
console.log(`  GATE 2, the director: races in which that became a SHOT              ${racesWithShot} of ${racesWithCandidate}`);
console.log(`  cast comebackers OUTSIDE the B1 pool (would be untracked forever)    ${outsideB1} of ${writtenComebackers}`);

const candOutcome = rows.reduce((a, r) => a + r.candidateOutcomeFrames, 0);
const racesWithOverlap = rows.filter((r) => r.candidateOutcomeFrames > 0).length;
console.log(`  GATE 2a, the OFFER WINDOW: races in which a candidate existed INSIDE the outcome phase   ${racesWithOverlap} of ${N}  (${candOutcome} frames)`);
const ov = new Map();
for (const r of rows) for (const [k, v] of Object.entries(r.overlapStates)) ov.set(k, (ov.get(k) ?? 0) + v);
const ovTotal = [...ov.values()].reduce((a, b) => a + b, 0);
if (ovTotal > 0) {
  console.log(`  ── AND DURING THAT OVERLAP — a comeback was there for the taking — the camera was showing:`);
  for (const [k, v] of [...ov].sort((x, y) => y[1] - x[1])) {
    console.log(`      ${String(k).padEnd(22)} ${String(v).padStart(7)}  ${((100 * v) / ovTotal).toFixed(2)}%`);
  }
}

// WHAT THE CAMERA DID INSTEAD. A zero for COMEBACK_ZOOM says nothing on its own — it reads the
// same whether the shot lost a contest or the camera never ran at all. This is the difference.
const agg = new Map();
for (const r of rows) for (const [k, v] of Object.entries(r.states)) agg.set(k, (agg.get(k) ?? 0) + v);
const totalFrames = [...agg.values()].reduce((a, b) => a + b, 0);
console.log(`\n  WHAT THE CAMERA SHOWED INSTEAD — frames by state over all ${N} races (${totalFrames} frames):`);
for (const [k, v] of [...agg].sort((x, y) => y[1] - x[1])) {
  console.log(`    ${String(k).padEnd(22)} ${String(v).padStart(7)}  ${((100 * v) / totalFrames).toFixed(2)}%`);
}
const del = rows.map((r) => r.deliveredAt).filter((x) => x != null).sort((a, b) => a - b);
if (del.length) {
  console.log(
    `\n  THE PLAN REACHES THE DETECTOR at race progress: min ${del[0].toFixed(3)}  ` +
      `median ${del[Math.floor(del.length / 2)].toFixed(3)}  max ${del[del.length - 1].toFixed(3)}`,
  );
}

console.log(`\n  Per-race detail follows; every figure above is over N = ${N}.\n`);
for (const r of rows) {
  const cb = r.comebackers
    .map((c) => `#${c.index}@resolve ${c.resolve ?? "-"}`)
    .join(", ");
  const sh = r.shots.map((s) => `#${s.racer}@${s.progress}`).join(", ");
  console.log(
    `  ${r.track.padEnd(15)} seed ${String(r.seed).padStart(2)}  written [${cb || "none"}]  shown [${sh || "none"}]`,
  );
}

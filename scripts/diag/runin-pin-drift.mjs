// ============================================================
// File:        scripts/diag/runin-pin-drift.mjs
// Project:     RaceArena — RUNIN-PIN-1 (report-only, changes nothing)
//
// DOES THE FINISH LINE HOLD STILL ON SCREEN once the leader has settled?
//
// The owner's rule, 2026-08-17: open until the leader and the line are both visible, let the leader
// settle onto his forward placement, and THEN STOP TRAVELLING — the line stays where it is in the
// frame, the leader stays roughly where he is, and the closing world gap between them is taken up
// by ZOOM alone. This measures the two drifts that rule is about, before and after the change.
//
// ── THE GEOMETRY, STATED BECAUSE IT BOUNDS WHAT CAN BE PROMISED ────────────────────────────────
//
// A camera here has THREE degrees of freedom: one zoom and two offsets. Pinning two screen points
// is FOUR constraints. The system is over-determined by one, so both points can only hold still
// exactly while the screen direction between them is constant — which is true on a straight
// approach and false through a curve. Something has to give, and this reports WHICH: the line's
// drift and the leader's drift are measured separately rather than summed.
//
// ── IT RECONSTRUCTS NOTHING ────────────────────────────────────────────────────────────────────
//
//   the line's world point   `cd._finishLineWorldPoint(st.finishT)`
//   world -> screen          `cd._proj.toScreen(...)` with the zoom and offsets DELIVERED
//   the settle moment        the director's own — `_runInComposingNow` plus the end of the opening
//                            glide it already runs (`_lerpPhase` leaves 'glide')
//
// Usage:
//   node scripts/diag/runin-pin-drift.mjs
//   node scripts/diag/runin-pin-drift.mjs --threshold=0.95
// ============================================================

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { inFrame } from "../lib/frameBox.mjs";
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
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));

const argOf = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const THRESHOLD = argOf("threshold") ? Number(argOf("threshold")) : null;
const SEED = Number(argOf("seed") ?? 9);
const RACERS = Number(argOf("racers") ?? 20);
const CW = 1280;
const CH = 720;
const CFG = THRESHOLD
  ? { ...DEFAULT_CAMERA_CONFIG, endgameThreshold: THRESHOLD }
  : DEFAULT_CAMERA_CONFIG;

console.log(
  `the pinned stretch — seed ${SEED}, ${RACERS} racers, endgameThreshold ${CFG.endgameThreshold}.\n` +
    `From the leader settling (the opening glide ends) to the crossing: how far each screen\n` +
    `position wanders, in px. "zoom mono" is whether the delivered zoom only ever closed.\n`,
);
console.log(
  `${"track".padEnd(15)} ${"frames".padStart(6)} ${"line drift".padStart(11)} ` +
    `${"leader drift".padStart(13)} ${"in shot".padStart(8)} ${"zoom mono".padStart(10)}  crossing`,
);

for (const geo of loadTracks()) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: SEED,
    racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET),
    note: "RUNIN-PIN-1 pin drift",
  });
  const race = buildRace(geo, identity, CFG);

  const samples = [];
  runRace(
    race,
    identity,
    CFG,
    ({ cd, st }) => {
      if (!(st.finishT > 0) || (st.finishedCount ?? 0) > 0) return;
      if (!cd._runInComposingNow) return;
      // THE SETTLE MOMENT IS THE DIRECTOR'S OWN: the run-in opens with a glide, and the leader has
      // reached his placement when that glide is over. Nothing is chosen here.
      if (cd._lerpPhase === "glide") return;
      const line = cd._finishLineWorldPoint(st.finishT);
      if (!line) return;
      const L = cd._proj.toScreen(line, cd.zoom, cd.offsetX, cd.offsetY);
      let leader = null;
      let leaderT = -1;
      let inShot = 0;
      for (const r of st.racers) {
        const p = cd._proj.toScreen(r, cd.zoom, cd.offsetX, cd.offsetY);
        if (inFrame(p, CW, CH)) inShot++;
        if (r.t > leaderT) {
          leaderT = r.t;
          leader = p;
        }
      }
      // WHY, not just how much: the run-in only ever contributes a CEILING to `_setTargets`'s
      // Math.min. If some other term is the smallest, the zoom is not the one the pin law asked
      // for — and a pin whose zoom is overruled cannot hold anything still.
      samples.push({
        L,
        leader,
        inShot,
        zoom: cd.zoom,
        binding: cd._framingProbe?.binding ?? "?",
      });
    },
    { slowmo: true },
  );

  if (samples.length < 2) {
    console.log(`${geo.id.padEnd(15)} not measured — fewer than two settled frames before a crossing`);
    continue;
  }
  // DRIFT IS THE SPREAD, not the endpoints: a position that wanders out and back is not holding
  // still, and an endpoint-to-endpoint difference would score that as zero.
  const spread = (pick) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const s of samples) {
      const p = pick(s);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return Math.hypot(maxX - minX, maxY - minY);
  };
  let mono = true;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].zoom < samples[i - 1].zoom - 1e-9) mono = false;
  }
  const inShotAvg = samples.reduce((a, s) => a + s.inShot, 0) / samples.length;
  const byTerm = new Map();
  for (const s of samples) byTerm.set(s.binding, (byTerm.get(s.binding) ?? 0) + 1);
  const terms = [...byTerm.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${Math.round((100 * n) / samples.length)}%`)
    .join(" ");

  console.log(
    `${geo.id.padEnd(15)} ${String(samples.length).padStart(6)} ` +
      `${spread((s) => s.L).toFixed(0).padStart(11)} ${spread((s) => s.leader).toFixed(0).padStart(13)} ` +
      `${inShotAvg.toFixed(1).padStart(8)} ${(mono ? "yes" : "NO").padStart(10)}  ${terms}`,
  );
}

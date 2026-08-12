// ============================================================
// File:        scripts/front-group-truth.mjs
// Project:     RaceArena — FRONT-GROUP-1
//
// WHAT THIS MEASURES: how many of the FRONT GROUP are still on screen while the shot tightens into
// the photo finish, and what it costs to hold them.
//
// The owner, watching a race with about six racers nearly level: zooming all the way to the
// photo-finish zoom loses racers out of the shot. This answers, per frame, how many it loses.
//
// ── WHAT "THE FRONT GROUP" IS HERE, AND WHY IT NEEDED NO NEW NUMBER ─────────────────────────────
//
// The leader plus every racer within `battlePulkThresholdT` of him in LAP-NORMALISED ARC, capped at
// `battleMaxGroupSize`. Both are shipped keys and both are already the camera's answer to "are these
// racers together": the arc unit exists because world px meant 1.5% of a lap on one track and 4.9%
// on another (battleGroup.js's header), and the cap is the size the battle group is already allowed
// to reach. `detectPulkGroup` itself CANNOT be used — its third condition requires the frontmost
// member to be at rank 3 or worse, because P1/P2 are LEADER territory, so it structurally excludes
// the front. The unit and the thresholds transfer; the function does not.
//
// ── MEMBERSHIP IS CAPTURED ONCE, AND THE CHURN IS MEASURED ──────────────────────────────────────
//
// FINISH-PAIR-1 exists because a guaranteed pair was re-sorted every frame and every swap moved the
// picture. So the group is captured ONCE, at the frame the endgame window opens, and this harness
// ALSO recomputes it live every frame and counts how often live membership differs from the capture
// — the churn a live definition would have had. That count is the evidence for capturing, not an
// assumption that capturing was necessary.
//
// Usage:
//   node scripts/front-group-truth.mjs                    # all ten tracks
//   node scripts/front-group-truth.mjs --only=ice-track --seed=9 --frames
//   node scripts/front-group-truth.mjs --front-off        # inert where the key does not exist
// ============================================================

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "./lib/raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { DEFAULT_CAMERA_CONFIG } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/storage/defaults.js")).href
);
const { resolveNameSet, DEFAULT_NAME_SET } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/racerNames.js")).href
);
const { shortestArcDeltaT } = await import(
  pathToFileURL(join(ROOT, "client/src/utils/mathUtils.js")).href
);

const argOf = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const ONLY = argOf("only", null);
const FRAMES = process.argv.includes("--frames");
const FRONT_OFF = process.argv.includes("--front-off");
const SEEDS = argOf("seeds", argOf("seed", "9"))
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n));

const CW = 1280;
const CH = 720;
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const CAMERA_CONFIG = FRONT_OFF
  ? { ...DEFAULT_CAMERA_CONFIG, frontGroupFraming: false }
  : DEFAULT_CAMERA_CONFIG;

/** The front group by the shipped closeness rule: leader + everyone within the arc, capped. */
function frontGroupOf(racers, thresholdT, maxSize) {
  const live = racers.filter((r) => r && !r.finished);
  if (live.length === 0) return [];
  const sorted = [...live].sort((a, b) => b.t - a.t);
  const leader = sorted[0];
  const group = [leader];
  for (let i = 1; i < sorted.length && group.length < maxSize; i++) {
    if (shortestArcDeltaT(leader.t, sorted[i].t) <= thresholdT) group.push(sorted[i]);
  }
  return group;
}

const key = (g) =>
  g
    .map((r) => r.index)
    .sort((a, b) => a - b)
    .join(",");
const med = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

const rows = [];

for (const geo of loadTracks({ only: ONLY })) {
  for (const raceSeed of SEEDS) {
    const identity = resolveIdentity({
      racers: 20,
      raceSeed,
      racerType: TRACK_DEFAULT_RACER,
      roster: ROSTER,
      note: "FRONT-GROUP-1 survey",
    });
    const race = buildRace(geo, identity, CAMERA_CONFIG);
    const { cd } = race;
    const proj = cd._proj;
    const thresholdT = CAMERA_CONFIG.battlePulkThresholdT;
    const maxSize = CAMERA_CONFIG.battleMaxGroupSize;
    const endgame = CAMERA_CONFIG.endgameThreshold;

    let captured = null;
    let capturedKey = null;
    let churn = 0;
    let lastLiveKey = null;
    const inFramePF = [];
    const inFrameEnd = [];
    let crossingZoom = null;
    let prevFinished = 0;
    let pfFrames = 0;
    let clamped = 0;
    const binding = new Map();
    const bindingPF = new Map();
    const perFrame = [];

    runRace(
      race,
      identity,
      CAMERA_CONFIG,
      ({ cd: d, st: s, ts, raceStart }) => {
        let maxT = 0;
        for (const r of s.racers) if (r.t > maxT) maxT = r.t;
        const prog = s.finishT > 0 ? maxT / s.finishT : 0;
        if (prog <= endgame) return;

        // ── CAPTURE, once, at the frame the window opens ──
        if (!captured) {
          captured = frontGroupOf(s.racers, thresholdT, maxSize);
          capturedKey = key(captured);
          lastLiveKey = capturedKey;
        }
        // ── THE CHURN A LIVE DEFINITION WOULD HAVE HAD ──
        const liveKey = key(frontGroupOf(s.racers, thresholdT, maxSize));
        if (liveKey !== lastLiveKey) {
          churn++;
          lastLiveKey = liveKey;
        }

        // ── HOW MANY OF THE CAPTURED GROUP ARE ON SCREEN ──
        let onScreen = 0;
        for (const m of captured) {
          const live = s.racers[m.index];
          if (!live) continue;
          const p = proj.toScreen(live, d.zoom, d.offsetX, d.offsetY);
          if (p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH) onScreen++;
        }
        inFrameEnd.push(onScreen);
        // WHERE EACH BOUND BINDS, read off the director's own probe rather than reconstructed.
        const fp = d._framingProbe;
        if (fp?.binding) binding.set(fp.binding, (binding.get(fp.binding) ?? 0) + 1);
        if (fp?.frontGroupClamped) clamped++;
        if (d.hudState === "PHOTO_FINISH") {
          inFramePF.push(onScreen);
          pfFrames++;
          if (fp?.binding) bindingPF.set(fp.binding, (bindingPF.get(fp.binding) ?? 0) + 1);
        }
        if (crossingZoom === null && s.finishedCount > prevFinished) {
          crossingZoom = d.zoom;
        }
        prevFinished = s.finishedCount;

        if (FRAMES) {
          perFrame.push({
            ms: Math.round(ts - raceStart),
            prog,
            hud: d.hudState,
            zoom: d.zoom,
            onScreen,
            of: captured.length,
          });
        }
      },
      { slowmo: true },
    );

    rows.push({
      track: geo.id,
      seed: raceSeed,
      size: captured ? captured.length : 0,
      churn,
      pfFrames,
      pfMin: inFramePF.length ? Math.min(...inFramePF) : NaN,
      pfMed: med(inFramePF),
      endMin: inFrameEnd.length ? Math.min(...inFrameEnd) : NaN,
      endMed: med(inFrameEnd),
      lostPF: inFramePF.filter((n) => captured && n < captured.length).length,
      crossingZoom,
      clamped,
      binding,
      bindingPF,
      identity,
    });

    if (FRAMES) {
      console.log(`\n── ${geo.id} seed ${raceSeed} — front group of ${captured?.length} ──`);
      console.log("  prog   ms      hud             zoom     in frame");
      for (const f of perFrame) {
        console.log(
          `  ${f.prog.toFixed(3)}  ${String(f.ms).padStart(6)}  ${String(f.hud).padEnd(15)} ` +
            `${f.zoom.toFixed(3).padStart(7)}  ${f.onScreen}/${f.of}`,
        );
      }
    }
  }
}

console.log(
  `\ntrack           seed  group  churn   PF frames  in frame through PHOTO_FINISH   frames losing one  crossing zoom`,
);
for (const r of rows) {
  console.log(
    `${r.track.padEnd(15)} ${String(r.seed).padStart(4)} ${String(r.size).padStart(6)} ` +
      `${String(r.churn).padStart(6)} ${String(r.pfFrames).padStart(10)}   ` +
      `min ${String(r.pfMin).padStart(2)} / med ${String(r.pfMed).padStart(2)} of ${r.size}`.padEnd(32) +
      `${String(r.lostPF).padStart(11)}      ${r.crossingZoom === null ? "—" : r.crossingZoom.toFixed(4)}`,
  );
}
const allSize = rows.reduce((a, r) => a + r.size, 0);
const allLost = rows.reduce((a, r) => a + r.lostPF, 0);
const allPF = rows.reduce((a, r) => a + r.pfFrames, 0);
console.log(
  `\nPHOTO_FINISH frames that lose at least one front-group racer: ${allLost} of ${allPF}` +
    (allPF ? ` (${((100 * allLost) / allPF).toFixed(1)}%)` : ""),
);
console.log(`front-group sizes summed: ${allSize} over ${rows.length} race(s)`);
console.log(
  `live-membership changes after capture (the churn a per-frame definition would have had): ` +
    `${rows.reduce((a, r) => a + r.churn, 0)}`,
);
const merge = (pick) => {
  const m = new Map();
  for (const r of rows) for (const [k, v] of pick(r)) m.set(k, (m.get(k) ?? 0) + v);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const fmt = (e) => {
  const tot = e.reduce((a, [, v]) => a + v, 0) || 1;
  return e.map(([k, v]) => `${k} ${((100 * v) / tot).toFixed(1)}%`).join(", ");
};
console.log(`which ceiling binds, whole ending:   ${fmt(merge((r) => r.binding))}`);
console.log(`which ceiling binds, PHOTO_FINISH:   ${fmt(merge((r) => r.bindingPF))}`);
console.log(
  `frames where the group was TOO SPREAD to hold at the width the ending already reached ` +
    `(the floor bound instead): ${rows.reduce((a, r) => a + r.clamped, 0)}`,
);
if (rows.length) console.log(formatIdentity(rows[0].identity));

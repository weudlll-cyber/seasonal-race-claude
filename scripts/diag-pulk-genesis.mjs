// ============================================================
// File:        diag-pulk-genesis.mjs
// Path:        scripts/diag-pulk-genesis.mjs
// Project:     RaceArena
// Created:     2026-05-13 (Etappe-23 diagnostic pattern)
// Description: Pulk-Genese, Auflösungs-Geschwindigkeit, Hüpfen.
//              Traces from frame 0 (race start), no burn-in.
//              Stage 1: cluster episode lifecycle
//              Stage 2: resolution speed (time-to-50%)
//              Stage 3: hop detection (targetPhysicalY reversals)
//
// Run from repo root:
//   node scripts/diag-pulk-genesis.mjs
//
// Outputs:
//   docs/diagnose/pulk-trace.ndjson          (per-frame cluster snapshots)
//   docs/diagnose/pulk-decision-data.json    (analysis: episodes, hops)
// ============================================================

import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const behaviorUrl = pathToFileURL(resolve(ROOT, 'client/src/modules/raceBehavior.js')).href;
const { applyRacerBehavior, initRacerBehavior } = await import(behaviorUrl);

// ── Constants ──────────────────────────────────────────────────────────────────
const N = 20;
const TOTAL_FRAMES = 1500;       // 25s @60fps — covers full race start → stable field
const FPS = 60;
const START_PHASE_END = 180;     // 3s — clusters before this = "start-phase"
const HOP_WARMUP = 300;          // 5s — hop detection only after field has spread
const CORRIDOR = 75;             // corridorHalfWidthPx (PR #86 default)
const SAFETY = 3;
const HITBOX_PX = 19.5;
const HOP_THRESHOLD_PX = 20;    // jump ≥ this in opposite direction = hop
const HOP_THRESHOLD_PHYS = HOP_THRESHOLD_PX / CORRIDOR;
const HOP_WINDOW = 30;           // frames for hop detection window

// ── Oval geometry ──────────────────────────────────────────────────────────────
const CX = 640, CY = 360, RX = 400, RY = 200;
const OVAL_PERIMETER_PX = Math.PI * (3 * (RX + RY) - Math.sqrt((3 * RX + RY) * (RX + 3 * RY)));

function ovalPos(t, physicalY) {
  const angle = t * Math.PI * 2;
  const trackX = CX + RX * Math.cos(angle);
  const trackY = CY + RY * Math.sin(angle);
  const txRaw = -RX * Math.sin(angle) * Math.PI * 2;
  const tyRaw = RY * Math.cos(angle) * Math.PI * 2;
  const len = Math.sqrt(txRaw * txRaw + tyRaw * tyRaw);
  const nx = -tyRaw / len;
  const ny = txRaw / len;
  return {
    x: trackX + physicalY * CORRIDOR * nx,
    y: trackY + physicalY * CORRIDOR * ny,
    angle: Math.atan2(tyRaw, txRaw),
  };
}

function recompute(racers) {
  for (const r of racers) {
    const pos = ovalPos(r.t, r.physicalY);
    r.x = pos.x; r.y = pos.y; r.angle = pos.angle;
  }
}

// ── Overlap pair detection ─────────────────────────────────────────────────────
function detectOverlapPairs(racers) {
  const pairs = [];
  for (let i = 0; i < racers.length; i++) {
    for (let j = i + 1; j < racers.length; j++) {
      const rA = racers[i], rB = racers[j];
      if (rA.finished || rB.finished) continue;
      const mid = (rA.angle + rB.angle) * 0.5;
      const cosM = Math.cos(mid), sinM = Math.sin(mid);
      const dx = rB.x - rA.x, dy = rB.y - rA.y;
      const ls = Math.abs(dx * cosM + dy * sinM);
      const lats = Math.abs(-dx * sinM + dy * cosM);
      const minLat = (rA.visibleWidthPx + rB.visibleWidthPx) * 0.5 + SAFETY;
      const minLong = (rA.visibleLengthPx + rB.visibleLengthPx) * 0.5 + SAFETY;
      if (ls < minLong && lats < minLat) {
        pairs.push({ a: rA.index, b: rB.index, ls: +ls.toFixed(2), lats: +lats.toFixed(2) });
      }
    }
  }
  return pairs;
}

// ── Cluster finder (connected components in overlap graph) ────────────────────
function findClusters(overlapPairs, racerIds) {
  const adj = new Map(racerIds.map(id => [id, new Set()]));
  for (const { a, b } of overlapPairs) {
    adj.get(a)?.add(b);
    adj.get(b)?.add(a);
  }
  const visited = new Set();
  const clusters = [];
  for (const id of racerIds) {
    if (visited.has(id) || adj.get(id).size === 0) continue;
    const component = new Set();
    const queue = [id];
    while (queue.length > 0) {
      const curr = queue.shift();
      if (visited.has(curr)) continue;
      visited.add(curr); component.add(curr);
      for (const nb of adj.get(curr)) { if (!visited.has(nb)) queue.push(nb); }
    }
    if (component.size >= 2) clusters.push(component);
  }
  return clusters;
}

// ── Racer factory ──────────────────────────────────────────────────────────────
function makeRacer(index, t, physicalY) {
  const BASE_MIN = 0.00091, BASE_MAX = 0.00118;
  const speed = BASE_MIN + Math.random() * (BASE_MAX - BASE_MIN);
  const pos = ovalPos(t, physicalY);
  const r = {
    index, t, x: pos.x, y: pos.y, angle: pos.angle,
    physicalY, baseSpeed: speed, finished: false,
    visibleWidthPx: HITBOX_PX, visibleLengthPx: HITBOX_PX,
  };
  initRacerBehavior(r);
  r.physicalY = physicalY;
  r.targetPhysicalY = physicalY;
  r.prevPhysicalY = physicalY;
  return r;
}

function makeStartGrid() {
  const spriteSize = HITBOX_PX / 0.75;
  const rowGapPx = spriteSize * 1.5;
  const deltaT = rowGapPx / OVAL_PERIMETER_PX;
  const RACERS_PER_ROW = 8;
  const SPREAD = 0.95;
  return Array.from({ length: N }, (_, i) => {
    const rowIndex = Math.floor(i / RACERS_PER_ROW);
    const indexInRow = i % RACERS_PER_ROW;
    const rowSize = Math.min(RACERS_PER_ROW, N - rowIndex * RACERS_PER_ROW);
    const t = -(rowIndex * deltaT);
    const py = rowSize <= 1 ? 0 : -SPREAD + (2 * SPREAD * indexInRow) / (rowSize - 1);
    return makeRacer(i, t, py);
  });
}

const CFG = {
  enabled: true, safetyMarginPx: SAFETY, lookAheadFrames: 3,
  slotSearchRadiusPx: 120, lateralReturnSpeed: 0.2, speedBrakeFactor: 0.95,
  draftingMaxDistance: 110, draftingConeAngle: 30, draftingBoost: 1.1,
  corridorHalfWidthPx: CORRIDOR,
};

// ── Simulation state ───────────────────────────────────────────────────────────
const racers = makeStartGrid();
recompute(racers);

const racerIds = racers.map(r => r.index);

// Per-racer history (physicalY, targetPhysicalY, avoidanceActive per frame)
const physYHist = new Map(racerIds.map(id => [id, []]));    // [{f,py,tpy}]
const avoidHist = new Map(racerIds.map(id => [id, []]));    // [bool]

// Per-frame cluster snapshots for NDJSON output
const traceRecords = [];

// Episode tracking
let nextEpId = 0;
const episodes = new Map(); // epId → episode object

// racerId → epId for currently-active episode
const racerCurrentEp = new Map();

// ── Main simulation loop ───────────────────────────────────────────────────────
console.log(`Running ${TOTAL_FRAMES} frames (${(TOTAL_FRAMES/FPS).toFixed(0)}s @${FPS}fps)…`);

for (let f = 0; f < TOTAL_FRAMES; f++) {
  // 1. Advance positions
  for (const r of racers) {
    const boost = r.draftingBoostActive ? CFG.draftingBoost : 1.0;
    const brake = r.avoidanceActive ? CFG.speedBrakeFactor : 1.0;
    r.t = (r.t + r.baseSpeed * boost * brake) % 1;
  }
  recompute(racers);

  // 2. Detect overlap pairs and clusters BEFORE behavior call
  const overlapPairs = detectOverlapPairs(racers);
  const currentClusters = findClusters(overlapPairs, racerIds);

  // 3. Capture pre-behavior state
  const prePhysY = new Map(racers.map(r => [r.index, r.physicalY]));

  // 4. Run behavior
  applyRacerBehavior(racers, CFG);
  recompute(racers);

  // 5. Record per-racer history
  for (const r of racers) {
    physYHist.get(r.index).push({ f, py: r.physicalY, tpy: r.targetPhysicalY });
    avoidHist.get(r.index).push(r.avoidanceActive);
  }

  // 6. Episode lifecycle management
  // Build set of all racer IDs currently in any cluster
  const inCluster = new Set(currentClusters.flatMap(c => [...c]));
  const matchedEpIds = new Set();

  for (const cluster of currentClusters) {
    // Find best-matching active episode (max shared members)
    let bestEpId = null, bestShared = 0;
    for (const [epId, ep] of episodes) {
      if (ep.endFrame !== null) continue;
      const shared = [...cluster].filter(id => ep.currentMembers.has(id)).length;
      if (shared > bestShared) { bestShared = shared; bestEpId = epId; }
    }

    if (bestEpId !== null && bestShared >= 1) {
      // Continue existing episode
      const ep = episodes.get(bestEpId);
      matchedEpIds.add(bestEpId);

      // New joiners
      for (const id of cluster) {
        if (!ep.allMembers.has(id)) {
          ep.allMembers.add(id);
          ep.memberJoinFrame.set(id, f);
        }
      }
      // Exiters (were in cluster last frame, not now)
      for (const id of ep.currentMembers) {
        if (!cluster.has(id) && !ep.memberExitFrame.has(id)) {
          ep.memberExitFrame.set(id, f);
          // Classify exit trigger from last 5 frames of this member's history
          const memberPhysHistory = physYHist.get(id);
          const memberAvoidHistory = avoidHist.get(id);
          const lastN = Math.min(5, memberPhysHistory.length);
          const recentFrames = memberPhysHistory.slice(-lastN);
          const recentAvoid = memberAvoidHistory.slice(-lastN);
          const pyChange = Math.abs(
            recentFrames[recentFrames.length - 1].py - recentFrames[0].py
          );
          const prePy = prePhysY.get(id) ?? recentFrames[recentFrames.length - 1].py;
          const avoidCount = recentAvoid.filter(Boolean).length;
          let trigger;
          if (pyChange >= HOP_THRESHOLD_PHYS * 0.5) trigger = 'lateral-slot';
          else if (avoidCount >= Math.ceil(lastN / 2)) trigger = 'brake-drift';
          else trigger = 'longitudinal-drift';
          ep.memberExitTrigger.set(id, trigger);
          racerCurrentEp.delete(id);
        }
      }
      ep.currentMembers = new Set(cluster);
      ep.peakSize = Math.max(ep.peakSize, cluster.size);
      // Track per-frame size for time-to-50% calculation
      ep.sizeHistory.push({ f, size: cluster.size });

    } else {
      // New episode
      const epId = nextEpId++;
      const ep = {
        id: epId,
        startFrame: f,
        endFrame: null,
        phase: f < START_PHASE_END ? 'start-phase' : 'race-phase',
        initialMembers: new Set(cluster),
        currentMembers: new Set(cluster),
        allMembers: new Set(cluster),
        memberJoinFrame: new Map([...cluster].map(id => [id, f])),
        memberExitFrame: new Map(),
        memberExitTrigger: new Map(),
        peakSize: cluster.size,
        sizeHistory: [{ f, size: cluster.size }],
      };
      episodes.set(epId, ep);
      matchedEpIds.add(epId);
      for (const id of cluster) racerCurrentEp.set(id, epId);
    }
  }

  // End episodes whose clusters dissolved this frame
  for (const [epId, ep] of episodes) {
    if (ep.endFrame !== null || matchedEpIds.has(epId)) continue;
    ep.endFrame = f;
    for (const id of ep.currentMembers) {
      if (!ep.memberExitFrame.has(id)) {
        ep.memberExitFrame.set(id, f);
        ep.memberExitTrigger.set(id, 'cluster-dissolved');
      }
      racerCurrentEp.delete(id);
    }
    ep.currentMembers = new Set();
  }

  // 7. Snapshot for NDJSON
  traceRecords.push({
    f,
    overlapPairCount: overlapPairs.length,
    clusterCount: currentClusters.length,
    maxClusterSize: currentClusters.length > 0 ? Math.max(...currentClusters.map(c => c.size)) : 0,
    totalInClusters: inCluster.size,
  });

  if (f % 300 === 0) process.stdout.write(`  frame ${f}/${TOTAL_FRAMES}\n`);
}

// Close episodes still active at simulation end
for (const ep of episodes.values()) {
  if (ep.endFrame === null) {
    ep.endFrame = TOTAL_FRAMES;
    for (const id of ep.currentMembers) {
      if (!ep.memberExitFrame.has(id)) {
        ep.memberExitFrame.set(id, TOTAL_FRAMES);
        ep.memberExitTrigger.set(id, 'simulation-end');
      }
    }
  }
}

// ── Stage 1: Episode table ─────────────────────────────────────────────────────
const episodeList = [...episodes.values()].map(ep => {
  const duration = ep.endFrame - ep.startFrame;
  const memberExits = [...ep.memberExitFrame.entries()]
    .map(([id, f]) => ({ id, exitFrame: f, trigger: ep.memberExitTrigger.get(id) }))
    .sort((a, b) => a.exitFrame - b.exitFrame);

  // Time-to-50%: frame when ≥50% of peak members have exited
  const halfPeak = Math.ceil(ep.peakSize / 2);
  let timeTo50Frame = ep.endFrame;
  let exitCount = 0;
  for (const { exitFrame } of memberExits) {
    exitCount++;
    if (exitCount >= halfPeak) { timeTo50Frame = exitFrame; break; }
  }
  const timeTo50Frames = timeTo50Frame - ep.startFrame;
  const timeTo50Sec = +(timeTo50Frames / FPS).toFixed(2);

  // Exit trigger distribution
  const triggerDist = {};
  for (const t of ep.memberExitTrigger.values()) {
    triggerDist[t] = (triggerDist[t] ?? 0) + 1;
  }

  // Size at first exit
  const firstExitFrame = memberExits[0]?.exitFrame ?? ep.endFrame;
  const sizeAtFirstExit = ep.sizeHistory.find(s => s.f >= firstExitFrame)?.size ?? ep.peakSize;

  return {
    id: ep.id,
    startFrame: ep.startFrame,
    endFrame: ep.endFrame,
    durationFrames: duration,
    durationSec: +(duration / FPS).toFixed(2),
    phase: ep.phase,
    peakSize: ep.peakSize,
    allMemberCount: ep.allMembers.size,
    timeTo50Frames,
    timeTo50Sec,
    firstExitFrame,
    sizeAtFirstExit,
    memberExits: memberExits.map(e => ({
      id: e.id,
      exitFrame: e.exitFrame,
      framesInCluster: e.exitFrame - (ep.memberJoinFrame.get(e.id) ?? ep.startFrame),
      trigger: e.trigger,
    })),
    triggerDist,
    sizeHistory: ep.sizeHistory.filter((_, i) => i % 10 === 0 || i === ep.sizeHistory.length - 1),
  };
}).sort((a, b) => a.startFrame - b.startFrame);

// ── Stage 2: Aggregate resolution metrics ──────────────────────────────────────
const startPhaseEps = episodeList.filter(ep => ep.phase === 'start-phase');
const racePhaseEps = episodeList.filter(ep => ep.phase === 'race-phase');

function medianAndMax(arr) {
  if (arr.length === 0) return { median: 0, max: 0, mean: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const max = sorted[sorted.length - 1];
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  return { median: +median.toFixed(1), max: +max.toFixed(1), mean: +mean.toFixed(1) };
}

const startPhaseTimes = startPhaseEps.map(ep => ep.timeTo50Sec);
const racePhaseTimes = racePhaseEps.map(ep => ep.timeTo50Sec);
const allTimes = episodeList.map(ep => ep.timeTo50Sec);
const allDurations = episodeList.map(ep => ep.durationSec);

const resolutionSummary = {
  total: episodeList.length,
  startPhase: {
    count: startPhaseEps.length,
    timeTo50: medianAndMax(startPhaseTimes),
    duration: medianAndMax(startPhaseEps.map(ep => ep.durationSec)),
    peakSize: medianAndMax(startPhaseEps.map(ep => ep.peakSize)),
  },
  racePhase: {
    count: racePhaseEps.length,
    timeTo50: medianAndMax(racePhaseTimes),
    duration: medianAndMax(racePhaseEps.map(ep => ep.durationSec)),
    peakSize: medianAndMax(racePhaseEps.map(ep => ep.peakSize)),
  },
  overall: {
    timeTo50: medianAndMax(allTimes),
    duration: medianAndMax(allDurations),
  },
  expectedThresholdSec: 2.0,  // 1-2s expectation for realistic race
  startPhaseExceedingExpected: startPhaseTimes.filter(t => t > 2.0).length,
  racePhaseExceedingExpected: racePhaseTimes.filter(t => t > 2.0).length,
};

// ── Stage 3: Hop detection ─────────────────────────────────────────────────────
// A "hop" = within any 30-frame window after HOP_WARMUP, racer has ≥2 reversals
// where each reversal is a target jump ≥ HOP_THRESHOLD_PHYS in opposite direction

const hopResults = [];

for (const id of racerIds) {
  const hist = physYHist.get(id);
  // Only look at frames after HOP_WARMUP
  const warmHist = hist.filter(h => h.f >= HOP_WARMUP);
  if (warmHist.length < HOP_WINDOW) continue;

  const hops = []; // {windowStart, dir1Frame, dir2Frame, jump1, jump2}

  for (let wi = 0; wi <= warmHist.length - HOP_WINDOW; wi++) {
    const window = warmHist.slice(wi, wi + HOP_WINDOW);
    // Find all sign-reversals of tpy delta >= threshold
    let reversals = [];
    for (let k = 1; k < window.length; k++) {
      const delta = window[k].tpy - window[k - 1].tpy;
      if (Math.abs(delta) >= HOP_THRESHOLD_PHYS) {
        reversals.push({ frameIdx: k, delta, frame: window[k].f });
      }
    }
    // Count reversals with sign change from previous reversal
    let qualifyingReversals = 0;
    let lastSign = 0;
    for (const rev of reversals) {
      const sign = rev.delta > 0 ? 1 : -1;
      if (lastSign !== 0 && sign !== lastSign) qualifyingReversals++;
      lastSign = sign;
    }
    if (qualifyingReversals >= 1 && reversals.length >= 2) {
      hops.push({
        windowStartFrame: window[0].f,
        reversals: reversals.slice(0, 4), // cap for output size
      });
      wi += HOP_WINDOW - 1; // skip ahead to avoid overlapping windows
    }
  }

  // Check if this racer was typically in a cluster during their hops
  const hopFrames = hops.flatMap(h => h.reversals.map(r => r.frame));
  const inClusterDuringHop = hopFrames.filter(hf => {
    // Check episode membership at this frame
    return [...episodes.values()].some(ep =>
      ep.startFrame <= hf && (ep.endFrame === null || ep.endFrame > hf) &&
      ep.allMembers.has(id)
    );
  }).length;

  if (hops.length > 0) {
    hopResults.push({
      racerId: id,
      baseSpeed: +racers[id].baseSpeed.toFixed(7),
      hopCount: hops.length,
      inClusterDuringHopPct: hopFrames.length > 0 ? +(inClusterDuringHop / hopFrames.length * 100).toFixed(0) : 0,
      hops: hops.slice(0, 5), // top 5 windows
    });
  }
}

hopResults.sort((a, b) => b.hopCount - a.hopCount);

// Aggregate hop/cluster correlation
const totalHoppers = hopResults.length;
const highCorrelationHoppers = hopResults.filter(h => h.inClusterDuringHopPct >= 50).length;

// ── Stage 4 data: Fix-progression metrics ─────────────────────────────────────
// Quantitative data for architecture assessment.
// We note the key numbers from previous trace runs (from docs):
// Pre-fix (diag-classification-trace): 99.7% overlap rate, 18 persistent pairs, max streak 288f
// Post-fix run 1 (same script, current code): 86.2% overlap rate, 24 persistent pairs, max 265f
// (Note: these are *pair-based* metrics; this script measures cluster-based metrics which differ)

const overallFrameStats = {
  framesWithOverlap: traceRecords.filter(r => r.overlapPairCount > 0).length,
  framesWithCluster: traceRecords.filter(r => r.clusterCount > 0).length,
  maxClusterSizeEver: Math.max(...traceRecords.map(r => r.maxClusterSize)),
  startPhaseFramesWithCluster: traceRecords.slice(0, START_PHASE_END).filter(r => r.clusterCount > 0).length,
  racePhaseFramesWithCluster: traceRecords.slice(START_PHASE_END).filter(r => r.clusterCount > 0).length,
};

// ── Output ─────────────────────────────────────────────────────────────────────
const outDir = resolve(ROOT, 'docs/diagnose');
mkdirSync(outDir, { recursive: true });

// NDJSON: per-frame cluster snapshots
const ndjsonPath = resolve(outDir, 'pulk-trace.ndjson');
const ws = createWriteStream(ndjsonPath, 'utf8');
for (const rec of traceRecords) ws.write(JSON.stringify(rec) + '\n');
ws.end();

// JSON: full analysis
const analysisData = {
  meta: {
    generated: new Date().toISOString(),
    totalFrames: TOTAL_FRAMES, fps: FPS,
    startPhaseEnd: START_PHASE_END, hopWarmup: HOP_WARMUP,
    corridorHalf: CORRIDOR, safetyMarginPx: SAFETY, hitboxPx: HITBOX_PX,
    hopThresholdPx: HOP_THRESHOLD_PX, hopWindow: HOP_WINDOW,
    slotSearchRadiusPx: CFG.slotSearchRadiusPx,
    lateralReturnSpeed: CFG.lateralReturnSpeed,
    N,
  },
  overallFrameStats,
  stage1_episodes: episodeList,
  stage2_resolution: resolutionSummary,
  stage3_hops: {
    totalHoppers, highCorrelationHoppers,
    correlation: hopResults.length > 0
      ? `${highCorrelationHoppers}/${totalHoppers} hoppers had ≥50% of hops in cluster frames`
      : 'no hoppers detected',
    racerDetails: hopResults,
  },
};

const jsonPath = resolve(outDir, 'pulk-decision-data.json');
writeFileSync(jsonPath, JSON.stringify(analysisData, null, 2));

// ── Print summary ──────────────────────────────────────────────────────────────
console.log('\n=== OVERALL FRAME STATS ===');
console.log(`  Frames with any overlap:   ${overallFrameStats.framesWithOverlap}/${TOTAL_FRAMES} (${(overallFrameStats.framesWithOverlap/TOTAL_FRAMES*100).toFixed(1)}%)`);
console.log(`  Frames with any cluster:   ${overallFrameStats.framesWithCluster}/${TOTAL_FRAMES} (${(overallFrameStats.framesWithCluster/TOTAL_FRAMES*100).toFixed(1)}%)`);
console.log(`  Max cluster size ever:     ${overallFrameStats.maxClusterSizeEver} racers`);
console.log(`  Start-phase (0-${START_PHASE_END}f) with cluster: ${overallFrameStats.startPhaseFramesWithCluster}`);
console.log(`  Race-phase (${START_PHASE_END}+) with cluster:  ${overallFrameStats.racePhaseFramesWithCluster}`);

console.log('\n=== STAGE 1: CLUSTER EPISODES ===');
console.log(`  Total episodes:     ${episodeList.length}`);
console.log(`  Start-phase:        ${startPhaseEps.length}`);
console.log(`  Race-phase:         ${racePhaseEps.length}`);
console.log('\n  ID  Phase        Start  End   Dur(s) Peak  t50(s)  TriggerDist');
for (const ep of episodeList.slice(0, 20)) {
  const top = Object.entries(ep.triggerDist).sort((a,b)=>b[1]-a[1]).slice(0,2)
    .map(([k,v])=>`${k.split('-')[0]}:${v}`).join(' ');
  console.log(`  ${String(ep.id).padEnd(3)} ${ep.phase.padEnd(12)} ${String(ep.startFrame).padEnd(6)} ${String(ep.endFrame).padEnd(5)} ${ep.durationSec.toFixed(1).padEnd(6)} ${ep.peakSize.toString().padEnd(5)} ${ep.timeTo50Sec.toFixed(1).padEnd(7)} ${top}`);
}
if (episodeList.length > 20) console.log(`  … (${episodeList.length - 20} more)`);

console.log('\n=== STAGE 2: RESOLUTION SPEED ===');
console.log(`  Expected threshold: ${resolutionSummary.expectedThresholdSec}s (1-2s for realistic race)`);
console.log(`  Start-phase (n=${resolutionSummary.startPhase.count}): median t50=${resolutionSummary.startPhase.timeTo50.median}s, max=${resolutionSummary.startPhase.timeTo50.max}s → ${resolutionSummary.startPhaseExceedingExpected} exceed 2s`);
console.log(`  Race-phase  (n=${resolutionSummary.racePhase.count}): median t50=${resolutionSummary.racePhase.timeTo50.median}s, max=${resolutionSummary.racePhase.timeTo50.max}s → ${resolutionSummary.racePhaseExceedingExpected} exceed 2s`);

console.log('\n=== STAGE 3: HOPPING ===');
console.log(`  Racers with hops after frame ${HOP_WARMUP}: ${totalHoppers}/${N}`);
console.log(`  In-cluster correlation (≥50%):            ${highCorrelationHoppers}/${totalHoppers}`);
for (const h of hopResults.slice(0, 5)) {
  console.log(`  Racer ${h.racerId}: ${h.hopCount} hop-window(s), ${h.inClusterDuringHopPct}% in-cluster`);
}

console.log(`\nTrace:    ${ndjsonPath}`);
console.log(`Analysis: ${jsonPath}`);

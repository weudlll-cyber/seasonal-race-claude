// ============================================================
// scripts/exp-camera-bisect.mjs — CAMERA-FOCUS-2 bisect ladder (read-only, presentation-only)
// Answers the owner's timeline claim ("the camera was fine a few days ago") with DATA: feed ONE recorded
// searound seed-5601 replay into FIVE camera code versions and measure, per rung, the same three numbers —
//   (1) frames the current leader sits OUTSIDE the inner-70 region during LEADER-family holds,
//   (2) pan-velocity variance (the "jumping"),
//   (3) pan direction flips per 100 frames,
// over FULL race + an EARLY window (first half of lap 1 — the owner's flagged window). Because it is ONE
// recorded race, the ONLY variable is the camera CODE at each commit. Optional modes add a trackingTC
// sweep (target-side EMA sizing) and a state-transition churn breakdown.
//
// Record the replay first (read-only observer on the shipped sim):
//   node scripts/sim-fairness.mjs --track=searound --racer=manta --seed=5601 --races=1 --racers=20 \
//        --track-defaults --dump-frames=<scratch>/searound-5601.json --skip-main-output
// Then:
//   node scripts/exp-camera-bisect.mjs <scratch>/searound-5601.json [--mode=ladder|tc|transitions]
//
// Engine untouched — the shipped fingerprint (ded0a126048e4cdb) is asserted separately. The camera work
// is off the sim/physics path entirely.
// ============================================================
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DUMP = process.argv[2];
const MODE = (process.argv.find((a) => a.startsWith('--mode=')) || '--mode=ladder').split('=')[1];
if (!DUMP) { console.error('usage: node scripts/exp-camera-bisect.mjs <dump.json> [--mode=ladder|tc|transitions]'); process.exit(1); }
const u = (p) => pathToFileURL(p).href;

const { EditorShape } = await import(u(join(ROOT, 'client/src/modules/track-editor/EditorShape.js')));
const { DEFAULT_CAMERA_CONFIG } = await import(u(join(ROOT, 'client/src/modules/cameraConfig.js')));
const dump = JSON.parse(readFileSync(DUMP, 'utf8'));
const { meta, frames } = dump;
const { worldW, worldH, finishT } = meta;
const shape = new EditorShape(JSON.parse(readFileSync(join(ROOT, 'server/seeds/tracks', `${meta.track}.json`), 'utf8')));

const BODY = 28.5, CW = 1280, CH = 720, bsX = CW / worldW;
const MX = 0.15 * CW, MY = 0.15 * CH;   // inner-70 margins
const EARLY_MAXT = finishT / 4;          // first HALF of lap 1 (finishT laps → lap 1 is t∈[0,1])
const FLIP_EPS = 0.5;                     // px: ignore sub-pixel jitter when counting direction reversals
const variance = (a) => { if (a.length < 2) return 0; const m = a.reduce((s, v) => s + v, 0) / a.length; return a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length; };
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

// the five rungs — oldest ("a few days ago") to today
const COMMITS = [
  ['dc920c78', 'pre camera-evening'],
  ['0dcbc291', 'overview fix'],
  ['2cd3f651', 'min-vis floor'],
  ['9e351c02', 'jitter rate-limit'],
  ['60551847', 'anchor clamp (today)'],
];

function mkConfig(tc = 0.25) {
  const c = structuredClone(DEFAULT_CAMERA_CONFIG);
  c.cameraStateProfiles.LEADER_ZOOM = { ...c.cameraStateProfiles.LEADER_ZOOM, spriteScale: 3, innerFramePct: 0.7, trackingTC: tc };
  c.cameraStateProfiles.LEAD_CHANGE = { ...c.cameraStateProfiles.LEAD_CHANGE, trackingTC: tc };
  c.minRacersVisible = 8; // owner's tested LEADER zoom 3, min-visible 8
  return c;
}

function replay(CameraDirector, CAM_STATE, tc, want = {}) {
  const cd = new CameraDirector(worldW, worldH, false, mkConfig(tc), BODY, shape);
  const LEADERFAM = new Set([CAM_STATE.LEADER_ZOOM, CAM_STATE.LEAD_CHANGE]);
  const full = { vels: [], flips: 0, flipDen: 0, lOut: 0, lF: 0 };
  const early = { vels: [], flips: 0, flipDen: 0, lOut: 0, lF: 0 };
  const stateHist = {};
  const velTrans = [], velNoTrans = [];
  let transEarly = 0, earlyFrames = 0;
  let prevOff = null, prevDx = null, prevDxE = null, prevState = null;
  for (const f of frames) {
    const racers = f.racers, live = racers.filter((r) => !r.finished);
    const maxT = live.length ? Math.max(...live.map((r) => r.t)) : finishT;
    const isEarly = maxT <= EARLY_MAXT;
    if (isEarly) earlyFrames++;
    const out = cd.update(racers, f.t, {
      raceElapsed: f.t, finishT, finishedCount: racers.length - live.length,
      physicsRacers: racers, isOutcomePhase: maxT / finishT >= 0.75, winner: null,
    }, CW, CH, 1000 / 60);
    const st = cd.state;
    stateHist[st] = (stateHist[st] ?? 0) + 1;
    if (LEADERFAM.has(st) && live.length) {
      const leader = live.reduce((a, b) => (b.t > a.t ? b : a));
      const ez = cd.zoom * bsX, sx = leader.x * ez + out.offsetX, sy = leader.y * ez + out.offsetY;
      const outside = sx < MX || sx > CW - MX || sy < MY || sy > CH - MY;
      full.lF++; if (outside) full.lOut++;
      if (isEarly) { early.lF++; if (outside) early.lOut++; }
    }
    if (prevOff) {
      const dx = out.offsetX - prevOff.x, v = Math.hypot(dx, out.offsetY - prevOff.y);
      full.vels.push(v); full.flipDen++;
      if (Math.abs(dx) > FLIP_EPS) { if (prevDx !== null && Math.sign(dx) !== Math.sign(prevDx)) full.flips++; prevDx = dx; }
      if (isEarly) { early.vels.push(v); early.flipDen++; if (Math.abs(dx) > FLIP_EPS) { if (prevDxE !== null && Math.sign(dx) !== Math.sign(prevDxE)) early.flips++; prevDxE = dx; } }
      const trans = prevState !== null && st !== prevState;
      if (trans) { (velTrans).push(v); if (isEarly) transEarly++; } else velNoTrans.push(v);
    }
    prevOff = { x: out.offsetX, y: out.offsetY }; prevState = st;
  }
  const pack = (w) => ({ lOutPct: w.lF ? 100 * w.lOut / w.lF : null, lF: w.lF, panVar: variance(w.vels), flipsPer100: w.flipDen ? 100 * w.flips / w.flipDen : 0 });
  const r = { full: pack(full), early: pack(early), stateHist };
  if (want.transitions) r.trans = { earlyFrames, transEarly, meanVelTrans: mean(velTrans), meanVelNoTrans: mean(velNoTrans), maxVelTrans: velTrans.length ? Math.max(...velTrans) : 0 };
  return r;
}

function withRung(sha, fn) {
  const wt = mkdtempSync(join(tmpdir(), `cf2-${sha}-`));
  try {
    execFileSync('git', ['worktree', 'add', '--detach', '-q', wt, sha], { cwd: ROOT });
    return fn(wt);
  } finally { try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT }); } catch { /* gc later */ } }
}

console.log(`CAMERA-FOCUS-2 bisect — ${meta.track} seed ${meta.seed}, ${meta.nRacers} racers, ${frames.length} frames, LEADER zoom 3, mode=${MODE}`);

if (MODE === 'ladder') {
  const rows = [];
  for (const [sha, label] of COMMITS) {
    const r = await withRung(sha, async (wt) => {
      const m = await import(u(join(wt, 'client/src/modules/camera/CameraDirector.js')));
      return replay(m.CameraDirector, m.CAM_STATE, 0.25);
    });
    rows.push({ sha, label, ...r });
  }
  const f = (x, d = 1) => (x == null ? '—' : x.toFixed(d));
  console.log('\nrung                          | FULL out% | FULL panVar | flips/100 | EARLY out% | EARLY panVar | flips/100');
  for (const r of rows) {
    console.log(`${(r.sha + ' ' + r.label).padEnd(29)} | ${f(r.full.lOutPct).padStart(8)}% | ${f(r.full.panVar, 0).padStart(11)} | ${f(r.full.flipsPer100).padStart(9)} | ${f(r.early.lOutPct).padStart(9)}% | ${f(r.early.panVar, 0).padStart(12)} | ${f(r.early.flipsPer100).padStart(9)}`);
  }
  console.log('\nJSON', JSON.stringify(rows));
} else if (MODE === 'tc') {
  const TCS = [0.25, 0.15, 0.10, 0.06];
  for (const [sha, label] of [['9e351c02', 'pre-clamp'], ['60551847', 'today (clamp)']]) {
    await withRung(sha, async (wt) => {
      const m = await import(u(join(wt, 'client/src/modules/camera/CameraDirector.js')));
      console.log(`\n${sha} ${label}\n  tc   | FULL out% | FULL var | EARLY out% | EARLY var`);
      for (const tc of TCS) {
        const r = replay(m.CameraDirector, m.CAM_STATE, tc);
        console.log(`  ${tc.toFixed(2)} | ${r.full.lOutPct.toFixed(1).padStart(8)}% | ${r.full.panVar.toFixed(0).padStart(7)} | ${r.early.lOutPct.toFixed(1).padStart(9)}% | ${r.early.panVar.toFixed(0).padStart(8)}`);
      }
    });
  }
} else if (MODE === 'transitions') {
  const m = await import(u(join(ROOT, 'client/src/modules/camera/CameraDirector.js')));
  const r = replay(m.CameraDirector, m.CAM_STATE, 0.25, { transitions: true });
  const t = r.trans;
  console.log(`\ntoday's code — state-transition churn:`);
  console.log(`  EARLY window: ${t.earlyFrames} frames, ${t.transEarly} state-transitions`);
  console.log(`  mean pan-vel AT transition = ${t.meanVelTrans.toFixed(1)}px  vs  non-transition = ${t.meanVelNoTrans.toFixed(1)}px  (max transition cut = ${t.maxVelTrans.toFixed(0)}px)`);
}

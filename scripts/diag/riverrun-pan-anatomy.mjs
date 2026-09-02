// AIM-ROOM-PAN-ANATOMY-1 — WHAT HAPPENS NEXT, at river-run's whole-screen single-frame pans.
// MEASURE ONLY. Nothing is changed, nothing is proposed.
//
// THE QUESTION. AIM-ROOM-SHIP-1 recorded seven frames on river-run whose single-frame camera step
// exceeds 1,000 screen px — up to 5,320 against a 1,280 px frame — where master before the floor had
// none. What was never established is what the picture does AFTERWARDS. Two shapes, and they are
// different faults:
//   SNAP-BACK   the camera returns within a frame or two. The eye sees a flick, a glitch.
//   STAY        the camera holds the new place and works back over a longer stretch. That is a hard
//               cut to the wrong place followed by a recovery, and it is the worse of the two.
//
// THE UNIT, stated because the comparison only works in one of them. `camStep` is
// `hypot(offsetX - prevOffsetX, offsetY - prevOffsetY)`, and `projection.toScreen` is
// `pt.x * camZoom * axisX + offsetX` — the offset is added to an already-scaled screen coordinate.
// So offsetX/offsetY and camStep are SCREEN PIXELS, and 5,320 px against a 1,280 px frame is a valid
// comparison: the picture moves about 4.2 frame-widths in one frame.
//
// AND WHAT THE LEADER IS DOING. Two candidates the data can separate:
//   the HEADING is turning fast  -> the perpendicular is flipping in a bend
//   the heading is NOT turning   -> the anchor offset, the median 74 px miss every guarantee reasons
//                                   from (AIM-ROOM-LOST-1), is the likelier author
// Both the world heading and the SCREEN heading are recorded, with their per-frame turn rates, since
// the screen heading is what the framing actually uses.
//
// The seeds and frames are taken from the rows AIM-ROOM-SHIP-1 already collected; only the fields
// those rows do not carry (camera position, heading) need re-running, and only for those seven races.
//
// Usage:
//   node scripts/diag/riverrun-pan-anatomy.mjs [--before=10] [--after=20]
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
const { DEFAULT_CAMERA_CONFIG } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { projectionForTrack } = await import(
  u("client/src/modules/camera/projection.js")
);

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const BEFORE = Number(arg("before", "10"));
const AFTER = Number(arg("after", "20"));
const TRACK = "river-run";
const N = 20;

// From AIM-ROOM-SHIP-1's N=300 combined rows: every adjacent-frame camStep above 1000 px.
const HITS = [
  { seed: 34, frame: 1415, step: 4873.0 },
  { seed: 38, frame: 1476, step: 4902.8 },
  { seed: 87, frame: 1464, step: 1593.7 },
  { seed: 117, frame: 1479, step: 5136.6 },
  { seed: 154, frame: 1478, step: 4718.4 },
  { seed: 210, frame: 1478, step: 4672.9 },
  { seed: 247, frame: 1469, step: 2333.5 },
];

const CFG = { ...DEFAULT_CAMERA_CONFIG };
const geo = new Map(loadTracks().map((g) => [g.id, g])).get(TRACK);
const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);
const deg = (v) => (v * 180) / Math.PI;
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const f = (v, n = 1) => (Number.isFinite(v) ? v.toFixed(n) : "—");

const summary = [];

for (const hit of HITS) {
  const identity = resolveIdentity({
    trackId: TRACK,
    raceSeed: hit.seed,
    racers: N,
    racerType: TRACK_DEFAULT_RACER,
  });
  const race = buildRace(geo, identity, CFG);
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const lo = hit.frame - BEFORE;
  const hi = hit.frame + AFTER;
  const rows = [];
  let prev = null;

  runRace(race, identity, CFG, ({ cd, st, frame }) => {
    if (frame < lo - 2 || frame > hi + 2) {
      if (frame > hi + 2) return false;
      // still need prev to be continuous, so keep tracking the offset
      prev = { x: cd.offsetX, y: cd.offsetY };
      return;
    }
    let leader = null;
    for (const r of st.racers) if (!leader || r.t > leader.t) leader = r;
    const hw = leader ? cd._headingAt(leader.t) : null;
    const hs = leader ? cd._headingScreen(leader.t) : null;
    const step = prev === null ? null : Math.hypot(cd.offsetX - prev.x, cd.offsetY - prev.y);
    prev = { x: cd.offsetX, y: cd.offsetY };

    // Where the guarantees think the anchor sits, against where the frame actually puts it.
    let at = null,
      anchorMiss = null;
    const p = cd._framingProbe;
    if (p && p.point) {
      try {
        at = cd._anchorScreen(p.frameW, p.frameH, p.t);
        const ex = proj.effX(cd.zoom),
          ey = proj.effY(cd.zoom);
        const ax = p.point.x * ex + cd.offsetX;
        const ay = p.point.y * ey + cd.offsetY;
        anchorMiss = Math.hypot(ax - at.x, ay - at.y);
      } catch {
        /* not all states expose an anchor; recorded as null */
      }
    }

    // WHERE THE LEADER ACTUALLY IS ON SCREEN. `camStep` measures the OFFSET, and the camera zooms
    // about the world origin — so when the zoom changes, the offset must move to compensate and a
    // large camStep does not by itself mean the picture moved. The subject's screen position is the
    // honest measure of apparent motion, and it is recorded beside it so the two can be compared.
    const _ex = proj.effX(cd.zoom), _ey = proj.effY(cd.zoom);
    const lsx = leader ? leader.x * _ex + cd.offsetX : null;
    const lsy = leader ? leader.y * _ey + cd.offsetY : null;
    rows.push({
      lsx,
      lsy,
      frame,
      state: cd.state,
      ox: cd.offsetX,
      oy: cd.offsetY,
      step,
      zoom: cd.zoom,
      hwDeg: hw ? deg(Math.atan2(hw.y, hw.x)) : null,
      hsDeg: hs ? deg(Math.atan2(hs.y, hs.x)) : null,
      extra: Number.isFinite(cd._lastLeaderLateralExtra) ? cd._lastLeaderLateralExtra : 0,
      shift: Number.isFinite(cd._lastLateralShift) ? cd._lastLateralShift : 0,
      anchorMiss,
      binding: p?.binding ?? null,
    });
  });

  const win = rows.filter((r) => r.frame >= lo && r.frame <= hi);
  const hitRow = win.find((r) => r.frame === hit.frame);
  const pre = win.filter((r) => r.frame < hit.frame);
  const post = win.filter((r) => r.frame > hit.frame);
  const basis = pre.length ? pre[pre.length - 1] : null;

  console.log(
    `\n${"═".repeat(112)}\nriver-run seed ${hit.seed} — recorded step ${f(hit.step)} px at frame ${hit.frame}   (camStep is SCREEN px; frame is ${CW}x${CH})\n${"═".repeat(112)}`
  );
  console.log(
    "  frame  state          offsetX     offsetY   camStep    zoom  leaderX  leaderY  LDR-MOVE  scrHdg  turn/f  anchorMiss  binding"
  );
  let prevW = null,
    prevS = null;
  for (const r of win) {
    const dW = prevW === null || r.hwDeg === null ? null : wrap(r.hwDeg - prevW);
    const dS = prevS === null || r.hsDeg === null ? null : wrap(r.hsDeg - prevS);
    prevW = r.hwDeg ?? prevW;
    prevS = r.hsDeg ?? prevS;
    const mark = r.frame === hit.frame ? " <<< THE STEP" : "";
    const prevRow = win[win.indexOf(r) - 1];
    const ldrMove =
      prevRow && r.lsx !== null && prevRow.lsx !== null
        ? Math.hypot(r.lsx - prevRow.lsx, r.lsy - prevRow.lsy)
        : null;
    console.log(
      `  ${String(r.frame).padStart(5)}  ${String(r.state).padEnd(13)} ` +
        `${f(r.ox).padStart(10)}  ${f(r.oy).padStart(10)} ` +
        `${(r.step === null ? "—" : f(r.step)).padStart(8)} ` +
        `${f(r.zoom, 3).padStart(7)} ` +
        `${f(r.lsx).padStart(8)} ${f(r.lsy).padStart(8)} ` +
        `${(ldrMove === null ? "—" : f(ldrMove)).padStart(8)} ` +
        `${f(r.hsDeg).padStart(7)} ${(dS === null ? "—" : f(dS, 2)).padStart(8)} ` +
        `${(r.anchorMiss === null ? "—" : f(r.anchorMiss)).padStart(11)}  ${r.binding ?? "—"}${mark}`
    );
  }

  // SNAP-BACK OR STAY? Compare the camera's position after the step against where it was just before.
  // A snap-back returns to the pre-step position; a stay does not, and the recovery is however long it
  // takes to come back within one ordinary step of it.
  let verdict = "—",
    recoveryFrames = null;
  if (basis && hitRow) {
    const ordinary = pre
      .map((r) => r.step)
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);
    const typical = ordinary.length ? ordinary[Math.floor(ordinary.length / 2)] : 30;
    const distFrom = (r) => Math.hypot(r.ox - basis.ox, r.oy - basis.oy);
    const back = post.find((r) => distFrom(r) <= Math.max(typical * 2, 60));
    if (back) {
      recoveryFrames = back.frame - hit.frame;
      verdict = recoveryFrames <= 2 ? "SNAP-BACK (a flick)" : "STAY then recover";
    } else {
      verdict = "STAY — no return within the window";
    }
    console.log(
      `  --> distance from the pre-step camera position: at the step ${f(distFrom(hitRow))} px, ` +
        `then ${post.slice(0, 6).map((r) => f(distFrom(r), 0)).join(", ")} ...`
    );
    console.log(
      `  --> typical pre-step camStep ${f(typical)} px; VERDICT: ${verdict}` +
        (recoveryFrames !== null ? `, back within ${recoveryFrames} frame(s) = ${f(recoveryFrames / 60, 2)} s at 60 Hz` : "")
    );
  }
  // THE ZOOM IS THE THING THAT MOVED. Report when it stops moving, since the shot does not come back
  // — it ARRIVES. Settled = the first frame after the step whose zoom is within 0.1% of the window's
  // final zoom and stays there.
  let arriveFrames = null, zFinal = post.length ? post[post.length - 1].zoom : null;
  if (hitRow && zFinal) {
    for (const r of post) {
      if (Math.abs(r.zoom - zFinal) / zFinal <= 0.001) { arriveFrames = r.frame - hit.frame; break; }
    }
  }
  const zBefore = basis ? basis.zoom : null;
  console.log(
    `  --> ZOOM ${f(zBefore, 3)} -> ${f(hitRow.zoom, 3)} in one frame (x${f(hitRow.zoom / zBefore, 2)}), ` +
      `settling at ${f(zFinal, 3)}` +
      (arriveFrames !== null ? ` after ${arriveFrames} frame(s) = ${f(arriveFrames / 60, 2)} s at 60 Hz` : " — still moving at the end of the window")
  );
  summary.push({ ...hit, verdict, recoveryFrames, hitRow, pre, zBefore, zFinal, arriveFrames });
}

console.log(`\n${"═".repeat(112)}\nSUMMARY\n${"═".repeat(112)}`);
for (const s of summary) {
  const hdgTurn = s.hitRow && s.pre.length
    ? wrap(s.hitRow.hsDeg - s.pre[s.pre.length - 1].hsDeg)
    : null;
  console.log(
    `  seed ${String(s.seed).padStart(3)} frame ${s.frame}  step ${f(s.step).padStart(7)} px  ` +
      `screen-heading turn at the step ${(hdgTurn === null ? "—" : f(hdgTurn, 2)).padStart(8)} deg  ` +
      `anchorMiss ${(s.hitRow?.anchorMiss == null ? "—" : f(s.hitRow.anchorMiss)).padStart(7)} px  ${s.verdict}`
  );
}

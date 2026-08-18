// ============================================================
// File:        scripts/gun-window-truth.mjs
// Project:     RaceArena — CEREMONY-HOLD-TARGET-1
//
// THE QUESTION: between the last frame of the start ceremony and the first view change, WHERE does
// the camera go, and WHICH authority spends each world pixel?
//
// This is the measurement CEREMONY-HOLD-CENTRE-1 and CEREMONY-REGRESSION-BISECT-1 ran from throwaway
// scripts against a PATCHED copy of the director in a scratch worktree. Both copies are gone, so
// neither number can be re-checked and neither table can be reproduced against a fix. It is a
// committed tool now, and it reads the director's own `_framingProbe` — the inputs and intermediate
// anchor points the live frame actually used — so it measures the real path rather than a
// reconstruction of it. A harness that measures a COPY is the failure mode this repo has paid for
// six times.
//
// THE COLUMNS, and what each one means:
//   ALONG / ACROSS  the camera centre's displacement since the last ceremony frame, decomposed in
//                   the track's local frame AT THAT INSTANT: along the tangent, across it. River-run
//                   is a serpentine, so following the road produces ACROSS honestly — the number is
//                   only damning when the camera is not following the road.
//   dist            the centre's distance from the track centreline (against a half-width of
//                   `trackWidthPx / 2`). This is the honest test of "the camera left the track".
//   zoom            live / target. They differ exactly when the state is easing somewhere.
//   bias            world px the FORWARD bias moved the anchor this frame (0 unless the state
//                   frames forward AND the observer is in follow).
//   lat             world px the lateral guarantee shifted the anchor across the corridor.
//   clamp           world px between the anchor the framing asked for and the pan `resolveCamera`
//                   allowed — the world-edge clamp, which is a function of the ZOOM.
//   lag             world px between where the camera IS and that resolved target — the tracking
//                   lag, i.e. the lerp still catching up.
//   fieldX/Y        the field centroid's position in the FRAME, 0..1. This is the number the owner
//                   is actually looking at; everything else above explains it.
//
// The earlier scratch traces printed ONE column for `clamp` + `lag` together and called it the
// clamp. They are split here because they answer different questions — the first is geometry at a
// zoom, the second is a rate — and their SUM reproduces the old column exactly.
//
// Usage:
//   node scripts/gun-window-truth.mjs [--track=river-run] [--racers=40] [--ms=2000] [--every=100]
//   node scripts/gun-window-truth.mjs --track=searound --every=100
// ============================================================

import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
  runRace,
  trackWidthOf,
} from "./lib/raceDriver.mjs";
import { DEFAULT_CAMERA_CONFIG } from "../client/src/modules/storage/defaults.js";

const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

const TRACK = arg("track", "river-run");
const WINDOW_MS = Number(arg("ms", 2000));
const EVERY_MS = Number(arg("every", 100));

// THE RACE CONTEXT of the two reports this tool replaces, so its numbers sit beside theirs.
const IDENTITY = resolveIdentity({
  racers: Number(arg("racers", 40)),
  raceSeed: 5601,
  cameraSeed: 1439767152,
  racerType: "track-default",
  seconds: 60,
  note: "the start window — CEREMONY-HOLD-CENTRE-1's context",
});

const geos = loadTracks({ only: TRACK });
if (!geos.length) {
  console.error(`no such track: ${TRACK}`);
  process.exit(1);
}
const geo = geos[0];
const cameraConfig = structuredClone(DEFAULT_CAMERA_CONFIG);
// START-HANDOVER-MARK-1: the one override this tool accepts, and only because the question it
// answers — "does the old defect stay repaired" — has to be asked of BOTH arms of that switch on
// the identity the old defect was diagnosed on. Absent, the shipped default runs and every number
// this tool has ever printed is reproduced unchanged.
const HANDOVER = arg("handover", null);
if (HANDOVER !== null) cameraConfig.startHandoverOnLeaderMark = HANDOVER === "on";
const race = buildRace(geo, IDENTITY, cameraConfig);
const { cd, shape } = race;
const CW = IDENTITY.canvasW;
const CH = IDENTITY.canvasH;
const halfWidth = trackWidthOf(geo) / 2;

// ── the track's local frame, sampled once ───────────────────────────────────────────────────────
const SAMPLES = 3000;
const PTS = [];
for (let i = 0; i <= SAMPLES; i++) {
  const q = shape.getPosition(i / SAMPLES, 0);
  if (q) PTS.push({ ...q, i });
}
function nearestOnCentreline(p) {
  let best = Infinity;
  let bi = 0;
  for (const q of PTS) {
    const dd = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (dd < best) {
      best = dd;
      bi = q.i;
    }
  }
  const t = bi / SAMPLES;
  const eps = 0.003;
  const a = shape.getPosition(Math.min(1, t + eps), 0);
  const b = shape.getPosition(Math.max(0, t - eps), 0);
  const tx = a.x - b.x;
  const ty = a.y - b.y;
  const L = Math.hypot(tx, ty) || 1;
  return { t, dist: Math.sqrt(best), tangent: { x: tx / L, y: ty / L } };
}

const centreOf = (zoom, offsetX, offsetY) => ({
  x: (CW / 2 - offsetX) / cd._proj.effX(zoom),
  y: (CH / 2 - offsetY) / cd._proj.effY(zoom),
});
const dist = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0);

// ── the reference: the LAST ceremony frame ──────────────────────────────────────────────────────
let ceremony = null;
const rows = [];
let released = null; // ms at which the first view change happened
let prevState = null;

runRace(
  race,
  IDENTITY,
  cameraConfig,
  ({ cd: c, st, ts, raceStart }) => {
    const el = ts - raceStart;
    const centre = centreOf(c.zoom, c.offsetX, c.offsetY);
    const near = nearestOnCentreline(centre);
    const d = {
      x: centre.x - ceremony.centre.x,
      y: centre.y - ceremony.centre.y,
    };
    const T = ceremony.tangent;
    const p = race.cd._framingProbe ?? {};
    // The pan target the camera is actually lerping toward, read from `targetOffsetX/Y` and the
    // zoom the PAN was resolved at. NOT from `_lastResolvedPanTarget.camY`: `_setTrackTargets` takes
    // X from that resolve but computes Y through `_offsetYFor`, so a centre built from camX/camY
    // would name a point the director never steers to. (It cost this tool one wrong reading.)
    const resolved = c._lastResolvedPanTarget;
    const resolvedCentre = resolved
      ? centreOf(
          cd._proj.camZoomForEffX(resolved.effectiveZoom),
          c.targetOffsetX,
          c.targetOffsetY,
        )
      : null;
    const field = st.racers.reduce(
      (s, r) => ({
        x: s.x + r.x / st.racers.length,
        y: s.y + r.y / st.racers.length,
      }),
      { x: 0, y: 0 },
    );
    // The ceremony's promise, counted rather than assumed: it has just shown every racer, and
    // CEREMONY-HANDOVER-1 exists so they stay shown. A hold that keeps a tighter framing has to be
    // answerable for this column or it has traded one defect for a worse one.
    const nOut = st.racers.filter((r) => {
      const fx = (r.x * cd._proj.effX(c.zoom) + c.offsetX) / CW;
      const fy = (r.y * cd._proj.effY(c.zoom) + c.offsetY) / CH;
      return fx < 0 || fx > 1 || fy < 0 || fy > 1;
    }).length;
    const stateChanged = prevState !== null && c.state !== prevState;
    if (stateChanged && released === null) released = el;
    prevState = c.state;

    const row = {
      ms: el,
      state: c.state,
      obs: c._observerPhase,
      along: d.x * T.x + d.y * T.y,
      across: d.x * -T.y + d.y * T.x,
      dist: near.dist,
      zoom: c.zoom,
      targetZoom: c.targetZoom,
      bias: dist(p.anchorPoint, p.afterBias),
      lat: dist(p.afterBias, p.afterLateral),
      clamp: dist(resolvedCentre, p.afterLateral),
      lag: dist(centre, resolvedCentre),
      fieldX: (field.x * cd._proj.effX(c.zoom) + c.offsetX) / CW,
      fieldY: (field.y * cd._proj.effY(c.zoom) + c.offsetY) / CH,
      nOut,
      changed: stateChanged,
    };
    rows.push(row);
    // Run to the window, and always at least three frames past the first view change so the STEP
    // at the release is on the table rather than inferred from its last row before it.
    return !(
      el > WINDOW_MS &&
      released !== null &&
      el > released + 3 * (1000 / 60)
    );
  },
  {
    onCountdownFrame: ({ cd: c, ts, elapsed, countdownMs }) => {
      // Every frame, so the reference is the LAST one however the countdown divides — the same
      // reason updateCountdown records the arrived framing every frame rather than once.
      const centre = centreOf(c.zoom, c.offsetX, c.offsetY);
      const near = nearestOnCentreline(centre);
      ceremony = {
        ts,
        elapsed,
        countdownMs,
        centre,
        tangent: near.tangent,
        dist: near.dist,
        zoom: c.zoom,
      };
    },
  },
);

// ── OUTPUT ──────────────────────────────────────────────────────────────────────────────────────
console.log(formatIdentity(IDENTITY));
console.log(
  `TRACK ${geo.id} · ${shape.isOpen ? "open" : "closed"} · corridor half-width ${halfWidth.toFixed(0)} world px · canvas ${CW}x${CH}`,
);
console.log(
  `LAST CEREMONY FRAME  centre (${ceremony.centre.x.toFixed(0)}, ${ceremony.centre.y.toFixed(0)}) · ` +
    `dist from centreline ${ceremony.dist.toFixed(1)} · zoom ${ceremony.zoom.toFixed(4)}`,
);
console.log("");
const H = [
  "    ms",
  "state       ",
  "obs    ",
  " ALONG",
  " ACROSS",
  "  dist",
  "  zoom",
  "target",
  " bias",
  "  lat",
  "clamp",
  "  lag",
  "fieldX",
  "fieldY",
  "out",
];
console.log(H.join(" "));
const fmt = (r) =>
  [
    String(Math.round(r.ms)).padStart(6),
    r.state.padEnd(12),
    String(r.obs).padEnd(7),
    r.along.toFixed(1).padStart(6),
    r.across.toFixed(1).padStart(7),
    r.dist.toFixed(1).padStart(6),
    r.zoom.toFixed(4).padStart(6),
    r.targetZoom.toFixed(4).padStart(6),
    r.bias.toFixed(1).padStart(5),
    r.lat.toFixed(1).padStart(5),
    r.clamp.toFixed(1).padStart(5),
    r.lag.toFixed(1).padStart(5),
    r.fieldX.toFixed(3).padStart(6),
    r.fieldY.toFixed(3).padStart(6),
    String(r.nOut).padStart(3),
  ].join(" ");

const FRAME = 1000 / 60;
for (const r of rows) {
  // Every frame of the first 120 ms (the defect is in the FIRST frame; a coarse sample shows a
  // drift where there is a discontinuity), then the requested cadence, then every frame from the
  // release onward.
  const dense = r.ms < 120 || (released !== null && r.ms >= released - FRAME);
  if (dense || r.ms % EVERY_MS < FRAME) console.log(fmt(r));
}

const last = rows[rows.length - 1];
console.log("");
console.log(
  `TOTAL over the window: along ${last.along.toFixed(1)} · across ${last.across.toFixed(1)} · ` +
    `ratio across/along ${Math.abs(last.along) > 1e-9 ? Math.abs(last.across / last.along).toFixed(2) : "n/a"}`,
);
if (released === null) {
  console.log(`RELEASE: no view change within the window (${WINDOW_MS} ms).`);
} else {
  const i = rows.findIndex((r) => r.ms === released);
  const before = rows[i - 1];
  const at = rows[i];
  console.log(
    `RELEASE at ${Math.round(released)} ms — ${before.state} → ${at.state}. ` +
      `THE STEP: zoom ${before.zoom.toFixed(4)} → ${at.zoom.toFixed(4)} ` +
      `(target ${before.targetZoom.toFixed(4)} → ${at.targetZoom.toFixed(4)}), ` +
      `centre moved ${Math.hypot(at.along - before.along, at.across - before.across).toFixed(1)} world px in one frame, ` +
      `field centre ${before.fieldX.toFixed(3)},${before.fieldY.toFixed(3)} → ${at.fieldX.toFixed(3)},${at.fieldY.toFixed(3)}.`,
  );
}

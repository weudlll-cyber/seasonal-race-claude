// ============================================================
// File:        scripts/diag/start-handover-truth.mjs
// Project:     RaceArena — START-HANDOVER-MARK-1 (report-only, changes nothing)
//
// WHERE IS THE LEADER IN FRAME DURING THE START WINDOW, AND WHEN DOES THE HOLD LET GO.
//
// The owner's design, 2026-08-20: keep the ceremony's framing until the leader has reached the
// place in frame where he is supposed to sit during the race, and from that moment follow him as
// the camera does for the rest of the race. That makes the hand-over a CONDITION on a position
// rather than a duration, so this instrument measures both: the leader's fraction along his own
// heading (the same quantity `leaderForwardFrac` names) and the ms at which the hold released.
//
// IT RECONSTRUCTS NOTHING. Screen positions come from `cd._proj.toScreen` with the zoom and offsets
// the director DELIVERED. The heading comes from the director's own `_headingAt`, and the frame
// chord from `frameExtentAlong` — the same function `_applyLeaderForwardBias` uses, so "where he
// sits" and "where he is asked to sit" are the same arithmetic read in opposite directions.
//
// Usage:
//   node scripts/diag/start-handover-truth.mjs                       # all ten tracks, seed 9
//   node scripts/diag/start-handover-truth.mjs --track=dirt-oval --verbose
//   node scripts/diag/start-handover-truth.mjs --handover=on         # with the switch on
//   node scripts/diag/start-handover-truth.mjs --json=out.json
//   node scripts/diag/start-handover-truth.mjs --compare        # both arms, per-frame delta
// ============================================================

import { writeFileSync } from "node:fs";
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
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { frameExtentAlong } = await import(u("client/src/modules/camera/frameGeometry.js"));

const argOf = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const ONLY = argOf("track") ?? null;
const SEED = Number(argOf("seed") ?? 9);
// Quick Test fills the field to 20 on the setup screen, which is the race the owner watches.
const RACERS = Number(argOf("racers") ?? 20);
const WINDOW_MS = Number(argOf("window") ?? 8000);
const HANDOVER = argOf("handover") ?? null; // null = shipped default, "on"/"off" to force
const COMPARE = process.argv.includes("--compare");
const VERBOSE = process.argv.includes("--verbose");
const JSON_OUT = argOf("json") ?? null;
const CW = 1280;
const CH = 720;

const configFor = (arm) =>
  arm === null
    ? DEFAULT_CAMERA_CONFIG
    : { ...DEFAULT_CAMERA_CONFIG, startHandoverOnLeaderMark: arm === "on" };
const CONFIG = configFor(HANDOVER);

const TRACK_ORDER = [
  "city-circuit",
  "dirt-oval",
  "garden-path",
  "ice-track",
  "searound",
  "luger-hill",
  "mountainstreet",
  "river-run",
  "seatrack",
  "space-sprint",
];

/**
 * The leader's fraction along his own heading, read off the DELIVERED frame.
 *
 * This is `anchorScreenPoint` inverted: that function places a subject at `frac` by displacing it
 * `(frac - 0.5)` of the frame's chord along its screen heading, so the same chord turns a delivered
 * screen position back into a fraction. 0.5 is dead centre; `leaderForwardFrac` (0.66 shipped) is
 * where the racing framing asks him to sit.
 */
function fracAlongHeading(cd, leader, screen) {
  const heading = cd._headingAt(leader.t);
  if (!heading) return null;
  const len = Math.hypot(heading.x, heading.y);
  if (!(len > 0)) return null;
  // World tangent -> screen tangent is per-axis, exactly as `_applyLeaderForwardBias` does it.
  const sx = (heading.x / len) * cd._proj.effX(cd.zoom);
  const sy = (heading.y / len) * cd._proj.effY(cd.zoom);
  const sLen = Math.hypot(sx, sy);
  if (!(sLen > 0)) return null;
  const ux = sx / sLen;
  const uy = sy / sLen;
  const span = frameExtentAlong(ux, uy, CW, CH);
  if (!(span > 0)) return null;
  const along = (screen.x - CW / 2) * ux + (screen.y - CH / 2) * uy;
  return 0.5 + along / span;
}

function measure(geo, CONFIG) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: SEED,
    racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET),
    note: "START-HANDOVER-MARK-1 start-window capture",
  });
  const race = buildRace(geo, identity, CONFIG);
  const axisX = race.cd._proj.axisX;
  const axisY = race.cd._proj.axisY;
  const frames = [];
  let releaseMs = null;
  let markMs = null;
  let prevHold = true;

  runRace(
    race,
    identity,
    CONFIG,
    ({ cd, st, ts, raceStart }) => {
      const ms = ts - raceStart;
      if (ms > WINDOW_MS) return false;
      let onScreen = 0;
      let sumY = 0;
      let leader = null;
      let leaderT = -1;
      for (const r of st.racers) {
        const p = cd._proj.toScreen(r, cd.zoom, cd.offsetX, cd.offsetY);
        if (p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH) onScreen++;
        sumY += p.y;
        if (r.t > leaderT) {
          leaderT = r.t;
          leader = r;
        }
      }
      const lp = cd._proj.toScreen(leader, cd.zoom, cd.offsetX, cd.offsetY);
      const frac = fracAlongHeading(cd, leader, lp);
      const holdLive = cd._ceremonyHoldZoom !== null;
      if (prevHold && !holdLive && releaseMs === null) releaseMs = ms;
      prevHold = holdLive;
      if (markMs === null && frac !== null && frac >= (cd._leaderForwardFrac ?? 0.66)) markMs = ms;
      frames.push({
        ms,
        hud: cd.hudState,
        phase: cd._lerpPhase,
        zoom: cd.zoom,
        offX: cd.offsetX,
        offY: cd.offsetY,
        lx: lp.x,
        ly: lp.y,
        inFrame: lp.x >= 0 && lp.x <= CW && lp.y >= 0 && lp.y <= CH,
        frac,
        onScreen,
        n: st.racers.length,
        fieldY: sumY / st.racers.length / CH,
        holdLive,
        binding: cd._framingProbe?.binding ?? null,
      });
    },
    { slowmo: true },
  );

  const out = frames.filter((f) => !f.inFrame);
  const xs = frames.map((f) => f.lx);
  // The worst excursion: the largest departure from the canvas on whichever side he left.
  const worstRight = Math.max(...xs);
  const worstLeft = Math.min(...xs);
  const worstX = worstRight > CW ? worstRight : worstLeft < 0 ? worstLeft : worstRight;
  const fieldYs = frames.map((f) => f.fieldY);
  // Camera-centre travel in the first second, in WORLD px — the old defect's own number.
  const first = frames[0];
  const at1s = frames.find((f) => f.ms >= 1000) ?? frames[frames.length - 1];
  const travel1s = Math.hypot((at1s.offX - first.offX) / axisX, (at1s.offY - first.offY) / axisY);
  return {
    track: geo.id ?? geo.name,
    open: race.shape.isOpen,
    frames,
    outFrames: out.length,
    outFirstMs: out.length ? out[0].ms : null,
    outLastMs: out.length ? out[out.length - 1].ms : null,
    worstX,
    minOn: Math.min(...frames.map((f) => f.onScreen)),
    n: frames[0].n,
    releaseMs,
    markMs,
    zoomMin: Math.min(...frames.map((f) => f.zoom)),
    zoomMax: Math.max(...frames.map((f) => f.zoom)),
    fieldYDrift: Math.max(...fieldYs) - Math.min(...fieldYs),
    fieldYAt1s: at1s.fieldY,
    travel1s,
  };
}

/** A result without its frame array — the summary that goes into a JSON file. */
function strip({ frames, ...r }) {
  return r;
}

const tracks = loadTracks(ONLY ? { only: ONLY } : {});
const ordered = TRACK_ORDER.map((id) => tracks.find((t) => (t.id ?? t.name) === id)).filter(Boolean);
const list = ordered.length ? ordered : tracks;

const label =
  HANDOVER === null
    ? `shipped default (startHandoverOnLeaderMark=${DEFAULT_CAMERA_CONFIG.startHandoverOnLeaderMark})`
    : `startHandoverOnLeaderMark=${HANDOVER}`;
console.log(
  `start-handover-truth — seed ${SEED}, ${RACERS} racers, gun to ${WINDOW_MS} ms, ${label}\n` +
    `canvas ${CW}x${CH}; "on" counts racers whose centre is inside it; frac is along the leader's ` +
    `heading (0.5 = centre, ${DEFAULT_CAMERA_CONFIG.leaderForwardFrac} = the racing mark)\n`,
);
console.log(
  `${"track".padEnd(15)} ${"kind".padEnd(7)} ${"out".padStart(4)} ${"window".padStart(12)} ` +
    `${"worstX".padStart(7)} ${"minOn".padStart(6)} ${"mark@".padStart(7)} ${"release@".padStart(9)} ` +
    `${"zoom".padStart(15)} ${"fieldYdrift".padStart(11)} ${"travel1s".padStart(9)}`,
);

const results = [];
if (COMPARE) {
  // BOTH ARMS OF THE SAME RACE, frame by frame. A summary can agree while every frame differs, and
  // "byte-identical on the open tracks" is a claim only a per-frame comparison can make.
  console.log(
    `${"track".padEnd(15)} ${"kind".padEnd(7)} ${"out off>on".padStart(11)} ${"worstX off>on".padStart(17)} ` +
      `${"minOn off>on".padStart(13)} ${"release off>on".padStart(16)} ${"fieldYdrift off>on".padStart(19)} ` +
      `${"travel1s off>on".padStart(16)} ${"frames changed".padStart(14)}`,
  );
  for (const geo of list) {
    const a = measure(geo, configFor("off"));
    const b = measure(geo, configFor("on"));
    let changed = 0;
    let maxDZoom = 0;
    let maxDX = 0;
    for (let i = 0; i < Math.min(a.frames.length, b.frames.length); i++) {
      const fa = a.frames[i];
      const fb = b.frames[i];
      const dz = Math.abs(fa.zoom - fb.zoom);
      const dx = Math.hypot(fa.offX - fb.offX, fa.offY - fb.offY);
      if (dz > 0 || dx > 0) changed++;
      if (dz > maxDZoom) maxDZoom = dz;
      if (dx > maxDX) maxDX = dx;
    }
    console.log(
      `${a.track.padEnd(15)} ${(a.open ? "open" : "closed").padEnd(7)} ` +
        `${`${a.outFrames}>${b.outFrames}`.padStart(11)} ` +
        `${`${a.worstX.toFixed(0)}>${b.worstX.toFixed(0)}`.padStart(17)} ` +
        `${`${a.minOn}>${b.minOn}/${a.n}`.padStart(13)} ` +
        `${`${a.releaseMs === null ? "never" : Math.round(a.releaseMs)}>${b.releaseMs === null ? "never" : Math.round(b.releaseMs)}`.padStart(16)} ` +
        `${`${a.fieldYDrift.toFixed(3)}>${b.fieldYDrift.toFixed(3)}`.padStart(19)} ` +
        `${`${a.travel1s.toFixed(1)}>${b.travel1s.toFixed(1)}`.padStart(16)} ` +
        `${`${changed}/${a.frames.length}`.padStart(14)}` +
        (changed === 0 ? "  IDENTICAL" : `  maxdZoom ${maxDZoom.toFixed(4)} maxdPan ${maxDX.toFixed(1)}`),
    );
    results.push({ track: a.track, open: a.open, off: strip(a), on: strip(b), changed });
  }
  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify(results, null, 1));
    console.log(`
wrote ${JSON_OUT}`);
  }
  process.exit(0);
}
for (const geo of list) {
  const r = measure(geo, CONFIG);
  results.push(r);
  const win =
    r.outFrames === 0 ? "never" : `${Math.round(r.outFirstMs)}-${Math.round(r.outLastMs)}`;
  console.log(
    `${r.track.padEnd(15)} ${(r.open ? "open" : "closed").padEnd(7)} ` +
      `${String(r.outFrames).padStart(4)} ${win.padStart(12)} ${r.worstX.toFixed(0).padStart(7)} ` +
      `${`${r.minOn}/${r.n}`.padStart(6)} ${(r.markMs === null ? "never" : String(Math.round(r.markMs))).padStart(7)} ` +
      `${(r.releaseMs === null ? "never" : String(Math.round(r.releaseMs))).padStart(9)} ` +
      `${`${r.zoomMin.toFixed(4)}..${r.zoomMax.toFixed(4)}`.padStart(15)} ` +
      `${r.fieldYDrift.toFixed(3).padStart(11)} ${r.travel1s.toFixed(1).padStart(9)}`,
  );
  if (VERBOSE) {
    for (const f of r.frames) {
      if (Math.round(f.ms) % 100 > 16) continue;
      console.log(
        `   ${String(Math.round(f.ms)).padStart(5)}  ${String(f.hud).padEnd(12)} ${String(f.phase).padEnd(9)} ` +
          `hold=${f.holdLive ? "Y" : "n"} zoom=${f.zoom.toFixed(4)} leaderX=${f.lx.toFixed(0).padStart(6)} ` +
          `frac=${f.frac === null ? " -  " : f.frac.toFixed(3)} on=${f.onScreen}/${f.n} bind=${f.binding}`,
      );
    }
  }
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify(results.map(({ frames, ...r }) => r), null, 1));
  console.log(`\nwrote ${JSON_OUT}`);
}

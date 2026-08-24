// LATE-LEAD-AXIS-1 — HOW MUCH WORLD THE FRAME HOLDS **ACROSS THE TRACK** AT THE LINE, per track.
//
// The question Part A asks at source: what bounds the picture across the track during the run-in,
// and is the full corridor ever guaranteed to be in it. This computes the ROOM, from the shipped
// config and the track's own geometry. NO RACE IS RUN.
//
// THE SHOT AT THE LINE IS THE STATE'S OWN. `_scheduleClose` lands on `_stateCamZoom()` at the
// crossing (ENDGAME-SCHEDULE-1 requirement 2), so the width at the line is the active state's
// setting and nothing else — which is what makes it computable without a race.
//
// THE MEASURE IS GENEROUS ON PURPOSE: `frameExtentAlong` is the FULL chord through the frame's
// CENTRE. The anchor is not at the centre during the run-in (`leaderForwardFrac`), and guarantees
// measure inside `innerFramePct`, so the room a racer actually has is LESS than this. A corridor
// that does not fit even here does not fit at all.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveIdentity, loadTracks, buildRace, TRACK_DEFAULT_RACER } from "../lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { projectionForTrack } = await import(u("client/src/modules/camera/projection.js"));
const { referenceWidthFor, camZoomForCorridors } = await import(u("client/src/modules/camera/zoomUnit.js"));
const { frameExtentAlong } = await import(u("client/src/modules/camera/frameGeometry.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

const CW = 1280;
const CH = 720;
const STATES = ["LEADER_ZOOM", "PHOTO_FINISH"];

function headingAt(shape, t, isOpen) {
  const eps = 0.003;
  const tA = isOpen ? Math.min(1, t + eps) : (((t + eps) % 1) + 1) % 1;
  const tB = isOpen ? Math.max(0, t - eps) : (((t - eps) % 1) + 1) % 1;
  const a = shape.getPosition(tA, 0);
  const b = shape.getPosition(tB, 0);
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const L = Math.hypot(dx, dy);
  return L > 0 ? { x: dx / L, y: dy / L } : null;
}

const rows = [];
for (const geo of loadTracks()) {
  const identity = resolveIdentity({ racers: 20, raceSeed: 1, racerType: TRACK_DEFAULT_RACER, roster: ROSTER, note: "axis-room" });
  let race;
  try {
    race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  } catch {
    continue;
  }
  const { shape, st, trackWidthPx } = race;
  const isOpen = shape.isOpen;
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, isOpen);
  const axisX = proj.axisX;
  const axisY = proj.axisY;
  const refW = referenceWidthFor(DEFAULT_CAMERA_CONFIG.referenceCorridorPx, trackWidthPx);
  const tLine = isOpen ? st.finishT : st.finishT % 1;
  const h = headingAt(shape, tLine, isOpen);
  const perp = { x: -h.y, y: h.x };
  const row = { track: geo.id, corridorPx: Math.round(trackWidthPx), headingDeg: +((Math.atan2(h.y, h.x) * 180) / Math.PI).toFixed(1) };
  for (const s of STATES) {
    const corridors = DEFAULT_CAMERA_CONFIG.cameraStateProfiles?.[s]?.visibleCorridors;
    if (!(corridors > 0)) continue;
    const z = camZoomForCorridors(corridors, refW, axisY, CH);
    // The world length, in the ACROSS direction, that exactly spans the frame's centre chord.
    const sx = perp.x * axisX * z;
    const sy = perp.y * axisY * z;
    const chord = frameExtentAlong(sx, sy, CW, CH);
    const worldAcross = chord / Math.hypot(sx, sy);
    row[s] = Math.round(worldAcross);
    row[`${s}_ratio`] = +(worldAcross / trackWidthPx).toFixed(2);
  }
  rows.push(row);
}
rows.sort((a, b) => a.track.localeCompare(b.track));
const pad = (v, n) => String(v).padStart(n);
process.stdout.write("track           corridor  heading   LEADER across  x corridor   PHOTO across  x corridor\n");
for (const r of rows) {
  process.stdout.write(
    `${r.track.padEnd(15)} ${pad(r.corridorPx, 7)}  ${pad(r.headingDeg, 7)}  ${pad(r.LEADER_ZOOM, 12)}  ${pad(r.LEADER_ZOOM_ratio, 10)}   ${pad(r.PHOTO_FINISH, 11)}  ${pad(r.PHOTO_FINISH_ratio, 10)}\n`
  );
}

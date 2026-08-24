// LATE-LEAD-AXIS-1 — WHICH SCREEN SIDE IS "ACROSS THE TRACK" AND WHICH IS "ALONG IT".
//
// LATE-LEAD-HUNT-1 stored the departure side as `top` / `bottom` / `left` / `right`. Those are
// SCREEN sides, and the report read "left" as "behind". THAT READING IS NOT IN THE LABEL — it is a
// claim about the track's heading, and this script is where it is established rather than assumed.
//
// THE ONE FACT THAT MAKES IT DECIDABLE: the render transform carries NO ROTATION.
// `renderRaceFrame.js:152-158` is `ctx.translate(cam.offsetX, cam.offsetY)` followed by
// `ctx.scale(...)` and nothing else, so screen +x IS world +x and screen +y IS world +y on every
// frame of every track. A screen side therefore names a WORLD AXIS DIRECTION, and the track's own
// heading at that moment is what converts it into "ahead", "behind" or "across".
//
// NO RACE IS RUN HERE. `buildRace` constructs the shape and reads `finishT` — a geometric constant
// of the track and the duration model — and the heading is sampled from the shape alone.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  TRACK_DEFAULT_RACER,
} from "../lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

// The closing stretch in the RACE's own progress unit: `_runInProgressOf` is 0 at
// `endgameThreshold` and 1 at the line (CameraDirector.js:3060), so u>0 spans p 0.95 -> 1.00.
const THRESHOLD = DEFAULT_CAMERA_CONFIG.endgameThreshold;

const SAMPLES = 200;

function headingAtShapeT(shape, t, isOpen) {
  // The director's own _headingAt (CameraDirector.js:2175), same eps, same wrap.
  const eps = 0.003;
  const tA = isOpen ? Math.min(1, t + eps) : (((t + eps) % 1) + 1) % 1;
  const tB = isOpen ? Math.max(0, t - eps) : (((t - eps) % 1) + 1) % 1;
  const pA = shape.getPosition(tA, 0);
  const pB = shape.getPosition(tB, 0);
  if (!pA || !pB) return null;
  const dx = pA.x - pB.x;
  const dy = pA.y - pB.y;
  return Math.hypot(dx, dy) > 0 ? { x: dx, y: dy } : null;
}

const rows = [];
for (const geo of loadTracks()) {
  const identity = resolveIdentity({
    racers: 20,
    raceSeed: 1,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    note: "late-lead-axis-geom",
  });
  let race;
  try {
    race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  } catch (e) {
    rows.push({ track: geo.id, error: String(e) });
    continue;
  }
  const { shape, st, trackWidthPx } = race;
  const isOpen = shape.isOpen;
  const finishT = st.finishT;
  const tFrom = THRESHOLD * finishT;
  const tTo = finishT;

  // Sample the heading across the closing stretch and classify each sample.
  let alongX = 0;
  let alongY = 0;
  let fwdPlusX = 0;
  let fwdMinusX = 0;
  let fwdPlusY = 0;
  let fwdMinusY = 0;
  const angles = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = tFrom + ((tTo - tFrom) * i) / SAMPLES;
    const h = headingAtShapeT(shape, t, isOpen);
    if (!h) continue;
    const ax = Math.abs(h.x);
    const ay = Math.abs(h.y);
    if (ax >= ay) {
      alongX++;
      if (h.x > 0) fwdPlusX++;
      else fwdMinusX++;
    } else {
      alongY++;
      if (h.y > 0) fwdPlusY++;
      else fwdMinusY++;
    }
    angles.push((Math.atan2(h.y, h.x) * 180) / Math.PI);
  }
  const n = alongX + alongY;
  const hLine = headingAtShapeT(shape, isOpen ? finishT : finishT % 1, isOpen);
  const lineAngle = hLine ? (Math.atan2(hLine.y, hLine.x) * 180) / Math.PI : null;

  rows.push({
    track: geo.id,
    closed: !isOpen,
    worldW: geo.worldWidth,
    worldH: geo.worldHeight,
    trackWidthPx,
    finishT: +finishT.toFixed(4),
    tFrom: +tFrom.toFixed(4),
    // Which world axis the racing direction runs along, over the closing stretch.
    alongXPct: +((100 * alongX) / n).toFixed(1),
    alongYPct: +((100 * alongY) / n).toFixed(1),
    // And which WAY along it — this is what makes "left" mean behind or ahead.
    headingPlusXPct: +((100 * fwdPlusX) / n).toFixed(1),
    headingMinusXPct: +((100 * fwdMinusX) / n).toFixed(1),
    headingPlusYPct: +((100 * fwdPlusY) / n).toFixed(1),
    headingMinusYPct: +((100 * fwdMinusY) / n).toFixed(1),
    lineAngleDeg: lineAngle === null ? null : +lineAngle.toFixed(1),
    // The spread of the heading over the stretch: a stretch that turns has no single mapping.
    angleMinDeg: angles.length ? +Math.min(...angles).toFixed(1) : null,
    angleMaxDeg: angles.length ? +Math.max(...angles).toFixed(1) : null,
  });
}

process.stdout.write(JSON.stringify(rows, null, 1) + "\n");

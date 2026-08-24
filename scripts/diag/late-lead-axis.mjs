// LATE-LEAD-AXIS-1 — RE-SLICE LATE-LEAD-HUNT-1'S HITS BY DIRECTION OF DEPARTURE.
//
// NO RACE IS RE-RUN. Every hit is read from the JSON LATE-LEAD-HUNT-1 wrote (c:/tmp/late-lead-hunt),
// and the only thing computed fresh is the STATIC TRACK GEOMETRY needed to turn a stored SCREEN side
// into an ACROSS-TRACK or ALONG-TRACK one.
//
// WHY THE LABEL IS NOT THE ANSWER. The stored side is `top` / `bottom` / `left` / `right`: world-axis
// directions, because the render transform carries no rotation (renderRaceFrame.js:152-158). Whether
// `left` means BEHIND depends on which way the track runs at the line, and it does NOT run the same
// way on every track — see late-lead-axis-geom.mjs. So each side is classified per track against the
// heading over the closing stretch.
//
// THE ATTRIBUTION BIAS IS REPORTED, NOT HIDDEN. The hunt recorded ONE side per off-frame under a
// fixed priority (late-lead-hunt.mjs:96): top, then bottom, then left, then right. A racer outside a
// CORNER of the canvas is therefore booked to top/bottom whatever else was also true. On the seven
// tracks where top/bottom is the across-track pair that inflates ACROSS; on space-sprint, where
// top/bottom is the ALONG pair, it deflates it. Both directions are stated per track below.
import { readdirSync, readFileSync } from "node:fs";
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
const THRESHOLD = DEFAULT_CAMERA_CONFIG.endgameThreshold;

const DATA = ["c:/tmp/late-lead-hunt/p1", "c:/tmp/late-lead-hunt/p2"];
const SAMPLES = 400;

// World-axis unit vectors for the four stored sides.
const SIDE_VEC = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function headingAtShapeT(shape, t, isOpen) {
  const eps = 0.003;
  const tA = isOpen ? Math.min(1, t + eps) : (((t + eps) % 1) + 1) % 1;
  const tB = isOpen ? Math.max(0, t - eps) : (((t - eps) % 1) + 1) % 1;
  const pA = shape.getPosition(tA, 0);
  const pB = shape.getPosition(tB, 0);
  if (!pA || !pB) return null;
  const dx = pA.x - pB.x;
  const dy = pA.y - pB.y;
  return Math.hypot(dx, dy) > 0 ? { x: dx / Math.hypot(dx, dy), y: dy / Math.hypot(dx, dy) } : null;
}

/** The same per-side classification, over an ARBITRARY t-range of one track's path. */
function classifyRange(shape, isOpen, tA, tB, n = 120) {
  const acc = {};
  for (const k of Object.keys(SIDE_VEC)) acc[k] = { across: 0, along: 0, fwd: 0, back: 0, n: 0 };
  for (let i = 0; i <= n; i++) {
    const t = tA + ((tB - tA) * i) / n;
    const h = headingAtShapeT(shape, t, isOpen);
    if (!h) continue;
    const perp = { x: -h.y, y: h.x };
    for (const [side, v] of Object.entries(SIDE_VEC)) {
      const dTan = v.x * h.x + v.y * h.y;
      const dPerp = v.x * perp.x + v.y * perp.y;
      acc[side].n++;
      if (Math.abs(dPerp) > Math.abs(dTan)) acc[side].across++;
      else {
        acc[side].along++;
        if (dTan > 0) acc[side].fwd++;
        else acc[side].back++;
      }
    }
  }
  const per = {};
  for (const [side, a] of Object.entries(acc)) {
    const acrossPct = (100 * a.across) / (a.n || 1);
    per[side] = {
      acrossPct: +acrossPct.toFixed(1),
      sense: a.along === 0 ? null : a.fwd > a.back ? 'ahead' : 'behind',
      kind: acrossPct >= 85 ? 'across' : acrossPct <= 15 ? 'along' : 'ambiguous',
    };
  }
  return per;
}

// ── PER TRACK: what each of the four sides MEANS, over ANY sub-window of the closing stretch ──
//
// THE WINDOW IS NOT THE WHOLE STRETCH, and that is what makes the two turning tracks decidable.
// `_runInProgressOf` (CameraDirector.js:3661) is exactly
//     u = clamp01( (p - endgameThreshold) / (1 - endgameThreshold) ),  p = leaderT / finishT
// so a hit's stored u-window [offFrom, offTo] pins the LEADER's own t to
//     [ (0.95 + 0.05*offFrom) * finishT , (0.95 + 0.05*offTo) * finishT ].
// THE LEADER'S heading is the right one to classify against, not the departing racer's: the owner's
// question is where the racer was RELATIVE TO THE LEADER, and the frame is composed around him.
const MAP = new Map();
for (const geo of loadTracks()) {
  const identity = resolveIdentity({
    racers: 20,
    raceSeed: 1,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    note: "late-lead-axis",
  });
  let race;
  try {
    race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  } catch {
    continue;
  }
  const { shape, st } = race;
  const isOpen = shape.isOpen;
  const tFrom = THRESHOLD * st.finishT;
  const tTo = st.finishT;
  const classify = (uFrom, uTo) => {
    const pA = THRESHOLD + (1 - THRESHOLD) * Math.max(0, Math.min(1, uFrom));
    const pB = THRESHOLD + (1 - THRESHOLD) * Math.max(0, Math.min(1, uTo));
    return classifyRange(shape, isOpen, pA * st.finishT, pB * st.finishT);
  };
  const acc = {};
  for (const k of Object.keys(SIDE_VEC)) acc[k] = { across: 0, along: 0, fwd: 0, back: 0, n: 0 };
  for (let i = 0; i <= SAMPLES; i++) {
    const t = tFrom + ((tTo - tFrom) * i) / SAMPLES;
    const h = headingAtShapeT(shape, t, isOpen);
    if (!h) continue;
    const perp = { x: -h.y, y: h.x };
    for (const [side, v] of Object.entries(SIDE_VEC)) {
      const dTan = v.x * h.x + v.y * h.y;
      const dPerp = v.x * perp.x + v.y * perp.y;
      acc[side].n++;
      if (Math.abs(dPerp) > Math.abs(dTan)) acc[side].across++;
      else {
        acc[side].along++;
        if (dTan > 0) acc[side].fwd++;
        else acc[side].back++;
      }
    }
  }
  const per = {};
  for (const [side, a] of Object.entries(acc)) {
    const acrossPct = (100 * a.across) / (a.n || 1);
    per[side] = {
      acrossPct: +acrossPct.toFixed(1),
      // The along-track sense, when it IS along-track: is that side ahead of or behind the racer?
      sense: a.along === 0 ? null : a.fwd > a.back ? "ahead" : "behind",
      fwdPct: +((100 * a.fwd) / (a.n || 1)).toFixed(1),
      backPct: +((100 * a.back) / (a.n || 1)).toFixed(1),
      // AMBIGUOUS when the stretch turns enough that the side changes meaning inside it.
      stable: acrossPct >= 85 || acrossPct <= 15,
      kind: acrossPct >= 85 ? "across" : acrossPct <= 15 ? "along" : "ambiguous",
    };
  }
  MAP.set(geo.id, { isOpen, per, finishT: st.finishT, classify });
}

// ── READ EVERY STORED HIT ──────────────────────────────────────────────────────────────────────
const races = [];
for (const dir of DATA) {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const arr = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const r of arr) if (r?.byPos) races.push(r);
  }
}

const hits = [];
for (const r of races) {
  const m = MAP.get(r.track);
  for (const p of r.byPos) {
    if (!(p.off > 0)) continue;
    let across = 0;
    let along = 0;
    let amb = 0;
    let behind = 0;
    let ahead = 0;
    // THE PER-HIT MAP: the leader's heading over THIS hit's own u-window, not the whole stretch.
    const perHit = m?.classify ? m.classify(p.offFrom ?? 0, p.offTo ?? 1) : null;
    for (const [side, cnt] of Object.entries(p.where ?? {})) {
      const info = perHit?.[side] ?? m?.per?.[side];
      if (!info) {
        amb += cnt;
        continue;
      }
      if (info.kind === "across") across += cnt;
      else if (info.kind === "along") {
        along += cnt;
        if (info.sense === "behind") behind += cnt;
        else ahead += cnt;
      } else amb += cnt;
    }
    const total = across + along + amb;
    const dir =
      amb > 0 && amb >= across && amb >= along
        ? "ambiguous"
        : across > 0 && along === 0 && amb === 0
          ? "across"
          : along > 0 && across === 0 && amb === 0
            ? "along"
            : "mixed";
    // The timing groups, reproduced EXACTLY as LATE-LEAD-HUNT-1 §3 defined them.
    const group = p.offTo <= 0.05 ? "A" : p.offTo > 0.9 ? "B" : "C";
    const bindTop = Object.entries(p.binds ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const anchorKeys = Object.keys(p.anchors ?? {});
    const anchoredNull = (p.anchors?.null ?? 0) === p.off;
    const anchoredHim = (p.anchors?.[String(p.index)] ?? 0) > 0;
    hits.push({
      track: r.track,
      racers: r.racers,
      seed: r.seed,
      pos: p.pos,
      index: p.index,
      off: p.off,
      clipped: p.clipped,
      offFrom: p.offFrom,
      offTo: p.offTo,
      closingFrames: r.closingFrames,
      where: p.where,
      // Per side: what it MEANT on this hit's own window — across, or along and which way.
      windowMap: perHit
        ? Object.fromEntries(
            Object.entries(perHit).map(([k, v]) => [
              k,
              v.kind === 'along' ? `along-${v.sense}` : v.kind,
            ])
          )
        : null,
      stretchMap: m
        ? Object.fromEntries(Object.entries(m.per).map(([k, v]) => [k, v.kind]))
        : null,
      across,
      along,
      amb,
      total,
      behind,
      ahead,
      dir,
      group,
      bindTop,
      binds: p.binds,
      anchors: p.anchors,
      anchoredNull,
      anchoredHim,
      anchorKeys: anchorKeys.length,
    });
  }
}

process.stdout.write(
  JSON.stringify({ map: Object.fromEntries(MAP), nRaces: races.length, hits }) + "\n"
);

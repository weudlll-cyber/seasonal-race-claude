// ============================================================
// File:        road-edge.mjs
// Path:        reports/evolution/road-edge-data/road-edge.mjs
// Project:     RaceArena — NIGHT-2026-09-24C piece 1
// Description: How often is the ROAD EDGE out of frame? A standing number, ten tracks, at the
//              SHIPPED stage — where the only prior reading was one ad-hoc script on one track.
//
// ── WHY IT EXISTS ──────────────────────────────────────────────────────────────────────────────
// `BACKLOG.md`: *"A guarantee should be judged by whether the thing it guarantees actually happens,
// and this one was never measured that way — only its effect on zoom was."* The control number the
// item argues from is **45.9% of Mountainstreet frames** with the corridor guarantee fully active.
// Nothing standing has ever measured it: none of the `check-*.mjs` guards does, and the only thing
// that ever did is `scripts/his-shot-truth.mjs`, which is one track and one config sweep.
//
// ── ★ WHAT IS REUSED, NOT REINVENTED ───────────────────────────────────────────────────────────
// The computation is `his-shot-truth.mjs`'s M3 block, moved here unchanged in substance: the same
// perpendicular projection, the same `anchorScreenPoint` / `roomFromPointAlong` pair, the same
// `_innerFramePct`, and the same ratio. A second way of measuring the same thing would make the two
// numbers incomparable, and the control number this item argues from came out of that block.
//
//   roadFrac = 2 * min(roomLeft, roomRight) / scalePerp / trackWidth
//
// **roadFrac < 1 means the road edge is OUT OF FRAME.** It is the fraction of the track's full width
// that actually fits across the frame, measured perpendicular to the heading from where the anchor
// sits.
//
// ── ★★ ONLY CORRIDOR-GUARANTEE FRAMES ARE COUNTED, AND THAT IS THE QUESTION ────────────────────
// The corridor guarantee is the one that promises the road. A LEADER_ZOOM frame makes no such
// promise, so counting it would dilute the rate with frames nobody claimed anything about. The
// denominator is therefore corridor frames, not all frames — stated because a rate is meaningless
// without knowing what it is a rate OF.
//
// ── ★★ AT THE SHIPPED STAGE ────────────────────────────────────────────────────────────────────
// `quiet` (`raceActionStage` in `defaults.js`). Measurements in this project ran on `wild` for weeks
// while the shipped stage was different; that cost an hour on 2026-09-23 and the rule is now written
// into `docs/EYE-TEST-SEEDS.md`. This instrument reads the shipped world and sets no key.
//
// ── ★ THE CAMERA IS NOT DETERMINISTIC FROM THE RACE SEED ───────────────────────────────────────
// It draws from its own `Math.random()`, so two runs of the same identity give slightly different
// shots. That is why this reports a rate over many frames and many seeds rather than a per-frame
// replay, and why the seed count matters more than any single race.
//
// ── ★★ THE SABOTAGE IS NOT IN THIS FILE, DELIBERATELY ──────────────────────────────────────────
// A first draft carried a `--sabotage-blind` flag. It was removed before this file was committed,
// for the reason established at DELIVERY-BACKUP-1 (2026-09-23): a committed switch that silently
// blinds an instrument is a foot-gun — anyone who passed it by accident would get a full,
// well-formed, entirely empty data file with no sign that anything was wrong.
//
// The check was run the safe way, from a scratch copy with the detector patched to return early:
// **0 corridor frames and 0 out-frames on two mountainstreet races**, against 5,298 and 5,118 in the
// control. Every count collapsed. Recorded in the report; reproduce it by copying this file and
// adding an early `return` at the top of the frame callback.
//
// USAGE: node reports/evolution/road-edge-data/road-edge.mjs [--seeds=N] [--track=id] [--tag=t]
// ============================================================

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.RA_ROOT ?? join(HERE, "..", "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const RD = await import(u("scripts/lib/raceDriver.mjs"));
const { QUICK_TEST_NAMES } = await import(u("client/src/modules/racerNames.js"));
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { framingFor, GUARANTEE, POSITION, anchorScreenPoint } = await import(
  u("client/src/modules/camera/framingRule.js")
);
// ★ `roomFromPointAlong` lives in frameGeometry.js, not framingRule.js — framingRule IMPORTS it.
const { roomFromPointAlong } = await import(u("client/src/modules/camera/frameGeometry.js"));

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const SEEDS = Number(arg("seeds", 10));
const ONLY = arg("track", null);
const TAG = arg("tag", "n10");
const OUT = arg("out", HERE);

const RACERS = 40;
const SECONDS = 60;
const STAGE = "quiet"; // the SHIPPED stage; this file sets no key
const WORLD = RD.worldForActionStage(STAGE);

function measure(geo, seed) {
  const identity = RD.resolveIdentity({
    racers: RACERS,
    raceSeed: seed,
    seconds: SECONDS,
    racerType: RD.TRACK_DEFAULT_RACER,
    roster: QUICK_TEST_NAMES,
    note: "ROAD-EDGE-1",
  });
  const race = RD.buildRace(geo, identity, DEFAULT_CAMERA_CONFIG, WORLD);
  const { cd } = race;
  const TW = RD.trackWidthOf(geo);

  const fracs = [];
  let corridorFrames = 0;
  let outFrames = 0;
  const byState = new Map();

  RD.runRace(race, identity, DEFAULT_CAMERA_CONFIG, () => {
    const pp = cd._framingProbe;
    const fr = framingFor(cd.state);
    if (!pp || fr.guarantee !== GUARANTEE.CORRIDOR || !(cd.zoom > 0)) return;
    const h = cd._headingAt(pp.t);
    const hl = h ? Math.hypot(h.x, h.y) : 0;
    if (!(hl > 0)) return;
    const perp = { x: -h.y / hl, y: h.x / hl };
    const sxp = perp.x * cd._proj.axisX;
    const syp = perp.y * cd._proj.axisY;
    const scaleP = cd.zoom * Math.hypot(sxp, syp);
    if (!(scaleP > 0)) return;
    // ★ FOUR ARGUMENTS: (frameW, frameH, forwardFrac, headingScreen). My first copy of this call
    // carried an extra `pp.frameW`, which would have slid every argument one place and measured
    // nonsense that still produced finite numbers. Checked against `framingRule.js:579` and against
    // the other five call sites before running anything.
    const at = anchorScreenPoint(
      pp.frameW,
      pp.frameH,
      fr.position === POSITION.FORWARD ? cd._leaderForwardFrac : null,
      cd._headingScreen(pp.t)
    );
    const inner = cd._innerFramePct ?? 1;
    const rp = roomFromPointAlong(at.x, at.y, sxp, syp, pp.frameW, pp.frameH, inner);
    const rm = roomFromPointAlong(at.x, at.y, -sxp, -syp, pp.frameW, pp.frameH, inner);
    const frac = (2 * (Math.min(rp, rm) / scaleP)) / TW;
    if (!Number.isFinite(frac)) return;
    corridorFrames++;
    fracs.push(frac);
    const out = frac < 1;
    if (out) outFrames++;
    if (!byState.has(cd.state)) byState.set(cd.state, [0, 0]);
    const b = byState.get(cd.state);
    b[0] += out ? 1 : 0;
    b[1] += 1;
  });

  fracs.sort((a, b) => a - b);
  const q = (p) => (fracs.length ? fracs[Math.min(fracs.length - 1, Math.floor(p * fracs.length))] : null);
  return {
    track: geo.id,
    seed,
    trackWidthPx: +TW.toFixed(2),
    corridorFrames,
    outFrames,
    outRate: corridorFrames ? +(outFrames / corridorFrames).toFixed(4) : null,
    // how BADLY, not only how often — a frac of 0.99 and one of 0.30 are not the same picture
    fracMin: fracs.length ? +q(0).toFixed(4) : null,
    fracP10: fracs.length ? +q(0.1).toFixed(4) : null,
    fracMedian: fracs.length ? +q(0.5).toFixed(4) : null,
    byState: [...byState.entries()].map(([s, [o, n]]) => ({ state: s, out: o, frames: n })),
  };
}

const rows = [];
for (const geo of RD.loadTracks({ only: ONLY })) {
  for (let seed = 1; seed <= SEEDS; seed++) rows.push(measure(geo, seed));
}
mkdirSync(OUT, { recursive: true });
const name = `road-edge-${TAG}.json`;
writeFileSync(
  join(OUT, name),
  JSON.stringify({
    stage: STAGE,
    racers: RACERS,
    seconds: SECONDS,
    seeds: SEEDS,
    note: "roadFrac < 1 means the road edge is OUT OF FRAME; denominator is CORRIDOR-guarantee frames only",
    rows,
  })
);
const tot = rows.reduce((a, r) => a + r.corridorFrames, 0);
const out = rows.reduce((a, r) => a + r.outFrames, 0);
console.error(
  `${rows.length} races (${STAGE}) — ${out}/${tot} corridor frames with the road edge out of frame -> ${join(OUT, name)}`
);

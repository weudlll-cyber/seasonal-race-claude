// ============================================================
// File:        scripts/edge-slice-truth.mjs
// Project:     RaceArena — EDGE-SLICE-1 (DIAGNOSIS ONLY)
//
// THE OWNER, on ice-track seed 9 at the crossing: a violet racer at the top edge is cut in half. He
// is unsure whether that matches the rule, because that racer is fairly far back — but he would
// rather have had him whole than sliced.
//
// ── WHAT THIS ANSWERS ───────────────────────────────────────────────────────────────────────────
//
// 1. WHO that racer is and whether he is a CONTENDER under the shipped rule: nearly level with the
//    leader (within `contactLength`, one body length between equal racers) AND on a free lane (no
//    body overlapping his across the track ahead of him). Both conditions are the engine's own —
//    `pairContact` in raceBehavior.js — so this asks the same question the director asks.
//
// 2. How often a NON-contender is sliced at the frame edge, across ten tracks, and what it would
//    cost to have included them.
//
// THE COST MODEL, stated because it is the one number a decision would rest on. A racer is WHOLE
// when his whole drawn body is inside the canvas. Widening the shot by a zoom multiplier m (m < 1
// widens) scales both his offset from the frame centre AND his drawn size, so he becomes whole at
//     m <= min( (W/2) / (|dx| + halfW), (H/2) / (|dy| + halfH) )
// and the extra width required is 1/m. Reported as a percentage of the shot's current width.
//
// Usage:
//   node scripts/edge-slice-truth.mjs --only=ice-track --seeds=9 --at-crossing
//   node scripts/edge-slice-truth.mjs --seeds=9,2814,5601
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
  DEFAULT_CONFIG_WORLD,
} from "./lib/raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CAMERA_CONFIG } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { resolveNameSet, DEFAULT_NAME_SET } = await import(
  u("client/src/modules/racerNames.js")
);
const { shortestArcDeltaT } = await import(u("client/src/utils/mathUtils.js"));
const {
  computeRenderDisplayScale,
  drawnRacerScreenPx,
  getEffectiveMaxTargetScreenPx,
} = await import(u("client/src/modules/autoSpriteScale.js"));

const argOf = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const ONLY = argOf("only", null);
const AT_CROSSING = process.argv.includes("--at-crossing");
const SEEDS = argOf("seeds", "9")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter(Number.isFinite);

const CW = 1280;
const CH = 720;
const N = 20;
const CFG = DEFAULT_CAMERA_CONFIG;
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

/** The engine's own across-track overlap: pairContact's contactWidth, in the physicalY unit. */
const sameLane = (a, b, tw) =>
  ((a.drawnBodyWidthPx ?? 0) + (b.drawnBodyWidthPx ?? 0)) / 2 > 0 &&
  (Math.abs((a.physicalY ?? 0) - (b.physicalY ?? 0)) * tw) / 2 <
    ((a.drawnBodyWidthPx ?? 0) + (b.drawnBodyWidthPx ?? 0)) / 2;

/** pairContact's along-track touch distance — one body length between two equal racers. */
const nearlyLevel = (r, leader) => {
  const pathLen = leader.pathLengthPx ?? 0;
  if (!(pathLen > 0)) return true;
  const contactLength = ((leader.drawnBodyLengthPx ?? 0) + (r.drawnBodyLengthPx ?? 0)) / 2;
  return contactLength > 0 && shortestArcDeltaT(leader.t, r.t) * pathLen <= contactLength;
};

const rows = [];
let poolFrames = 0;
let poolNonContenderSliced = 0;
let poolContenderSliced = 0;
const poolExtra = [];
const poolPushable = [];

for (const geo of loadTracks({ only: ONLY })) {
  for (const raceSeed of SEEDS) {
    const identity = resolveIdentity({
      racers: N,
      raceSeed,
      racerType: TRACK_DEFAULT_RACER,
      roster: ROSTER,
      note: "EDGE-SLICE-1 diagnosis",
    });
    const race = buildRace(geo, identity, CFG);
    const { cd, displaySize, racerType, trackWidthPx } = race;
    const proj = cd._proj;
    const dsScale = DEFAULT_CONFIG_WORLD.autoScaleConfig?.displaySizeScale ?? 1;
    const maxTargetPx = getEffectiveMaxTargetScreenPx(
      racerType?.config?.maxTargetScreenPx,
      CFG.maxTargetScreenPx,
    );

    let prevFinished = 0;
    let dumped = false;

    runRace(
      race,
      identity,
      CFG,
      ({ cd: d, st: s }) => {
        if (!d._inPhotoFinish || !d._framingProbe?.point) {
          prevFinished = s.finishedCount;
          return;
        }
        const eX = proj.effX(d.zoom);
        const eY = proj.effY(d.zoom);
        const dScale = computeRenderDisplayScale(
          displaySize, dsScale, eX, maxTargetPx, CFG.minDrawnFrameFrac, CH,
        );
        const halfW = drawnRacerScreenPx(displaySize, dScale, eX) / 2;
        const halfH = drawnRacerScreenPx(displaySize, dScale, eY) / 2;
        const ordered = [...s.racers].sort((a, b) => b.t - a.t);
        const leader = ordered[0];
        const contenderIdx = new Set(
          d._photoFinishContenders?.map((c) => c.index) ?? [],
        );

        const info = ordered.map((r) => {
          const p = proj.toScreen(r, d.zoom, d.offsetX, d.offsetY);
          const centreIn = p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH;
          const whole =
            p.x - halfW >= 0 && p.x + halfW <= CW && p.y - halfH >= 0 && p.y + halfH <= CH;
          const dx = Math.abs(p.x - CW / 2);
          const dy = Math.abs(p.y - CH / 2);
          // The widening multiplier that would make him whole (m < 1 widens).
          const m = Math.min((CW / 2) / (dx + halfW), (CH / 2) / (dy + halfH));
          const pathLen = leader.pathLengthPx ?? 0;
          const bodyLen = r.drawnBodyLengthPx ?? 0;
          const gapLengths =
            pathLen > 0 && bodyLen > 0
              ? (shortestArcDeltaT(leader.t, r.t) * pathLen) / bodyLen
              : NaN;
          const aheadOnLane = ordered
            .slice(0, ordered.indexOf(r))
            .filter((o) => sameLane(r, o, trackWidthPx));
          // ── WHAT "CUT IN HALF" MEANS, and the first version of this got it wrong ──────────
          // A racer is SLICED when his drawn body INTERSECTS the frame boundary — part of him is
          // visible and part is not. That is what an eye calls cut in half, and it does NOT depend
          // on which side of the edge his CENTRE happens to fall. The first test here required the
          // centre to be inside, and so classified the racer the owner is pointing at — centre 9 px
          // above the top edge, body still hanging into the frame — as "outside", i.e. as not there
          // at all. Same family of error as the centre test FRONT-GROUP-1 replaced.
          const overlaps =
            p.x + halfW > 0 && p.x - halfW < CW && p.y + halfH > 0 && p.y - halfH < CH;
          return {
            r, p, whole, centreIn, overlaps, sliced: overlaps && !whole,
            m, gapLengths,
            level: r === leader ? true : nearlyLevel(r, leader),
            aheadOnLane,
            contender: contenderIdx.has(r.index),
            edge:
              p.y - halfH < 0 ? "TOP"
              : p.y + halfH > CH ? "bottom"
              : p.x - halfW < 0 ? "left"
              : p.x + halfW > CW ? "right" : "-",
          };
        });

        poolFrames++;
        const slicedNon = info.filter((i) => i.sliced && !i.contender);
        const slicedCon = info.filter((i) => i.sliced && i.contender);
        if (slicedNon.length) poolNonContenderSliced++;
        if (slicedCon.length) poolContenderSliced++;
        for (const i of info.filter((x) => x.sliced)) poolExtra.push(1 / i.m);
        // ── IS "PUSH FULLY OUT" EVEN AVAILABLE? ─────────────────────────────────────────────────
        // Expelling a sliced racer means TIGHTENING. That is only possible without cutting a
        // contender when the sliced racer is further from the frame centre than every contender is.
        // Where he is nearer, the two policies conflict and only "include" is available.
        const conts = info.filter((i) => i.contender);
        const contReach = conts.length
          ? Math.max(...conts.map((i) => Math.max(Math.abs(i.p.x - CW / 2) + halfW,
                                                  (CW / CH) * (Math.abs(i.p.y - CH / 2) + halfH))))
          : 0;
        for (const i of info.filter((x) => x.sliced && !x.contender)) {
          const reach = Math.max(Math.abs(i.p.x - CW / 2) + halfW,
                                 (CW / CH) * (Math.abs(i.p.y - CH / 2) + halfH));
          poolPushable.push(reach > contReach ? 1 : 0);
        }

        // ── THE FRAME HE IS LOOKING AT: the first crossing ──────────────────────────────────────
        if (AT_CROSSING && !dumped && s.finishedCount > prevFinished) {
          dumped = true;
          console.log(
            `\n${geo.id} seed ${raceSeed} — THE CROSSING FRAME (zoom ${d.zoom.toFixed(2)}, ` +
              `binding ${d._framingProbe.binding}, contenders ${contenderIdx.size})\n`,
          );
          console.log(
            "  rank  colour     name          screen x,y      state    edge    gap(lengths)  level?  ahead-on-lane  contender?",
          );
          for (const [k, i] of info.entries()) {
            if (k > 9 && i.whole) continue;
            console.log(
              `  ${String(k + 1).padStart(4)}  ${String(i.r.color ?? "?").padEnd(9)} ` +
                `${String(i.r.name ?? i.r.index).slice(0, 12).padEnd(13)} ` +
                `${i.p.x.toFixed(0).padStart(6)},${i.p.y.toFixed(0).padStart(5)}  ` +
                `${(i.whole ? "whole" : i.sliced ? "SLICED" : "outside").padEnd(8)} ` +
                `${i.edge.padEnd(7)} ${(Number.isFinite(i.gapLengths) ? i.gapLengths.toFixed(2) : "—").padStart(9)}     ` +
                `${(i.level ? "yes" : "NO").padEnd(6)}  ` +
                `${(i.aheadOnLane.length ? i.aheadOnLane.map((o) => `#${o.index}`).join(",") : "none").padEnd(14)} ` +
                `${i.contender ? "YES" : "no"}`,
            );
          }
          const worst = info.filter((i) => i.sliced).sort((a, b) => a.m - b.m)[0];
          if (worst) {
            console.log(
              `\n  WORST SLICE: ${worst.r.color} at the ${worst.edge} edge, ` +
                `${Number.isFinite(worst.gapLengths) ? worst.gapLengths.toFixed(2) : "?"} body lengths back, ` +
                `${worst.contender ? "A CONTENDER" : "NOT a contender"}. ` +
                `Including him whole needs ${((1 / worst.m - 1) * 100).toFixed(1)}% more width.`,
            );
          }
        }
        prevFinished = s.finishedCount;
      },
      { slowmo: true },
    );
    rows.push({ track: geo.id, seed: raceSeed });
  }
}

const pc = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "—");
const med = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
console.log(
  `\nPOOLED over ${poolFrames} photo-finish frames:\n` +
    `  frames with a NON-contender sliced at the edge : ${poolNonContenderSliced} (${pc(poolNonContenderSliced, poolFrames)})\n` +
    `  frames with a CONTENDER sliced                 : ${poolContenderSliced} (${pc(poolContenderSliced, poolFrames)})\n` +
    `  extra width to include a sliced racer whole    : median ${((med(poolExtra) - 1) * 100).toFixed(1)}%, ` +
    `worst ${((Math.max(...poolExtra, 1) - 1) * 100).toFixed(1)}%
` +
    `  sliced non-contenders that could be PUSHED OUT instead : ` +
    `${pc(poolPushable.reduce((a, b) => a + b, 0), poolPushable.length)} of ${poolPushable.length} ` +
    `(the rest sit nearer the centre than a contender, so tightening would cut the contender)`,
);
if (rows.length) console.log(`\n${formatIdentity(resolveIdentity({ racers: N, raceSeed: SEEDS[0], racerType: TRACK_DEFAULT_RACER, roster: ROSTER }))}`);

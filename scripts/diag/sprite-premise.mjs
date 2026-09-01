// SPRITE-PREMISE-1 — decompose LEADER-LAG-TRUTH-1's "2.9x sprite" into WORLD extent and ZOOM.
//
// THE CLAIM UNDER TEST. LEADER-LAG-TRUTH-1 (d) reports a `half-length (median)` of 131.4 px on
// space-sprint against 45.6 on river-run and calls space-sprint's sprite "2.9x river-run's".
// ALONG-RESIDUAL-1's P1 — attack the sprite — rests on that sentence.
//
// THE QUANTITY THAT COLUMN HOLDS, read out of the instrument rather than inferred:
// `leader-lag-truth.mjs:137` computes
//
//     const halfLen = ((leader.drawnBodyLengthPx ?? 0) / 2) * effX;      effX = proj.effX(cd.zoom)
//
// so it is DRAWN SCREEN PIXELS AT THE DELIVERED ZOOM, not a world extent. Screen px factorise
// exactly:
//
//     halfLen = (drawnBodyLengthPx / 2)  x  effX
//               \_____ world _____/         \_ zoom+projection _/
//
// and therefore
//
//     halfLen_ss / halfLen_rr  =  (world_ss / world_rr)  x  (effX_ss / effX_rr)
//
// This probe measures BOTH factors on the same frames the claim was taken from, so the product can
// be multiplied back out against the reported ratio instead of a decomposition being asserted. If
// the parts do not close, the residue is printed rather than absorbed.
//
// WHY `drawnBodyLengthPx` IS NOT `displaySize x bodyFillLong`. The runtime derives it in
// `headlessRaceSimulator.js` as
//
//     drawnBodyLengthPx = effectiveBodyNarrow * (bodyFillLong / bodyFillNarrow)
//
// where `effectiveBodyNarrow` comes from `computeBodyNarrowRef` — the auto-scale, which normalises
// the NARROW axis to a shared reference. So the nominal `displaySize` largely divides out and what
// survives into the LONG axis is the type's ASPECT RATIO. Both terms are printed here so that can be
// checked rather than believed.
//
// MEASURE ONLY. Reads the racer types and the tracks this install actually runs.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
  formatIdentity,
} from "../lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { resolveNameSet, DEFAULT_NAME_SET } = await import(
  u("client/src/modules/racerNames.js")
);
const { projectionForTrack } = await import(
  u("client/src/modules/camera/projection.js")
);
const { cameraSeedForRace } = await import(
  u("client/src/modules/camera/cameraSeed.js")
);
const { anchorScreenPoint } = await import(
  u("client/src/modules/camera/framingRule.js")
);
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const TRACKS = (arg("tracks", "space-sprint,river-run") || "")
  .split(",")
  .filter(Boolean);
const N = Number(arg("racers", "20"));
const SEEDS = Number(arg("seeds", "10"));
const FROM_U = Number(arg("from", "0.10"));
// The window the residual actually sits in (ALONG-RESIDUAL-1: pooled u median 0.498).
const MID_LO = Number(arg("mid-lo", "0.45"));
const MID_HI = Number(arg("mid-hi", "0.55"));

const med = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
const f = (n, d = 3) => (Number.isFinite(n) ? n.toFixed(d) : "—");

const tracks = new Map(loadTracks().map((g) => [g.id, g]));
const out = {};

for (const t of TRACKS) {
  const geo = tracks.get(t);
  if (!geo) {
    process.stderr.write(`no track ${t}\n`);
    continue;
  }
  const all = {
    halfLen: [],
    effX: [],
    zoom: [],
    worldLen: [],
    worldWid: [],
    aimAhead: [],
    absUx: [],
  };
  const mid = { halfLen: [], effX: [], zoom: [], worldLen: [], aimAhead: [] };
  // WHICH SHOT IS IN FORCE at mid-race, counted over EVERY frame in the window rather than over the
  // LEADER_ZOOM frames the rest of this probe filters to — otherwise the question answers itself.
  const midStates = new Map();
  // The zoom's own inputs, so "the settings are global" can be checked rather than assumed.
  let zoomInputs = null;
  let identityLine = "";
  let racerTypeId = null;
  let racerCount = null;

  for (let s = 1; s <= SEEDS; s++) {
    const identity = resolveIdentity({
      racers: N,
      raceSeed: s,
      racerType: TRACK_DEFAULT_RACER,
      roster: ROSTER,
      cameraSeed: cameraSeedForRace(s),
      note: "sprite-premise",
    });
    const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
    const { cd } = race;
    const proj = projectionForTrack(
      geo.worldWidth,
      geo.worldHeight,
      !geo.closed,
    );
    const CW = identity.canvasW;
    const CH = identity.canvasH;
    const END_U = cd._endgameThreshold ?? 0.95;
    identityLine = formatIdentity(identity);
    racerTypeId = geo.defaultRacerTypeId;
    racerCount = identity.racers;
    zoomInputs = {
      leaderZoom: cd._leaderZoom,
      referenceCorridorPx: cd._referenceCorridorPx,
      referenceWidthPx: cd._referenceWidthPx,
      trackWidthPx: cd._trackWidthPx,
      axisX: proj.axisX,
      axisY: proj.axisY,
      pathLengthPx: race.st?.pathLengthPx ?? null,
    };

    runRace(
      race,
      identity,
      DEFAULT_CAMERA_CONFIG,
      ({ cd, st }) => {
        const fp = cd._framingProbe;
        if (!fp) return;
        let leaderAny = null;
        for (const r of st.racers)
          if (!leaderAny || r.t > leaderAny.t) leaderAny = r;
        if (leaderAny) {
          const uAny = leaderAny.t / (st.finishT ?? 1);
          if (uAny >= MID_LO && uAny <= MID_HI)
            midStates.set(cd.state, (midStates.get(cd.state) ?? 0) + 1);
        }
        // LEADER-LAG-TRUTH-1's own filter, so the medians are comparable to its table.
        if (cd.state !== "LEADER_ZOOM") return;
        const leader = leaderAny;
        if (!leader) return;
        const uNow = leader.t / (st.finishT ?? 1);
        if (uNow < FROM_U || uNow >= END_U) return;
        if (fp.runInActive || cd._inFinishMode) return;

        const effX = proj.effX(cd.zoom);
        const worldLen = leader.drawnBodyLengthPx ?? 0;
        // THE OTHER HALF OF THE REPORT'S "TOLERANCE": the room the aim leaves ahead of him along the
        // heading, reproduced from leader-lag-truth.mjs. It is frame geometry, not zoom and not
        // sprite, so it is measured here rather than quoted.
        const hS = cd._headingScreen(leader.t);
        const hL = hS ? Math.hypot(hS.x, hS.y) : 0;
        let aimAhead = NaN;
        let ux = 0;
        if (hL > 0) {
          ux = hS.x / hL;
          const uy = hS.y / hL;
          const at = anchorScreenPoint(CW, CH, cd._forwardFracNow(), hS);
          if (at)
            aimAhead = Math.min(
              ux > 1e-12 ? (CW - at.x) / ux : Infinity,
              ux < -1e-12 ? at.x / -ux : Infinity,
              uy > 1e-12 ? (CH - at.y) / uy : Infinity,
              uy < -1e-12 ? at.y / -uy : Infinity,
            );
        }
        const halfLen = (worldLen / 2) * effX; // the instrument's line, reproduced

        all.halfLen.push(halfLen);
        all.effX.push(effX);
        all.zoom.push(cd.zoom);
        all.worldLen.push(worldLen);
        all.worldWid.push(leader.drawnBodyWidthPx ?? 0);
        if (Number.isFinite(aimAhead)) all.aimAhead.push(aimAhead);
        all.absUx.push(Math.abs(ux));
        if (uNow >= MID_LO && uNow <= MID_HI) {
          if (Number.isFinite(aimAhead)) mid.aimAhead.push(aimAhead);
          mid.halfLen.push(halfLen);
          mid.effX.push(effX);
          mid.zoom.push(cd.zoom);
          mid.worldLen.push(worldLen);
        }
      },
      { slowmo: false },
    );
  }

  out[t] = {
    identity: identityLine,
    racerTypeId,
    racerCount,
    zoomInputs,
    midStates: [...midStates.entries()].sort((x, y) => y[1] - x[1]),
    trackWidth: geo.width,
    open: !geo.closed,
    world: `${geo.worldWidth}x${geo.worldHeight}`,
    frames: all.halfLen.length,
    midFrames: mid.halfLen.length,
    halfLenMed: med(all.halfLen),
    worldLenMed: med(all.worldLen),
    worldWidMed: med(all.worldWid),
    effXMed: med(all.effX),
    zoomMed: med(all.zoom),
    midHalfLen: med(mid.halfLen),
    midWorldLen: med(mid.worldLen),
    midEffX: med(mid.effX),
    midZoom: med(mid.zoom),
    aimAheadMed: med(all.aimAhead),
    midAimAhead: med(mid.aimAhead),
    absUxMed: med(all.absUx),
  };
}

const [A, B] = TRACKS;
const a = out[A];
const b = out[B];

process.stdout.write(`\n## THE TWO TRACKS AS THIS INSTALL RUNS THEM\n\n`);
process.stdout.write(`| | ${A} | ${B} |\n|---|---|---|\n`);
process.stdout.write(`| racer type | ${a.racerTypeId} | ${b.racerTypeId} |\n`);
process.stdout.write(
  `| **racers in the corpus** | **${a.racerCount}** | **${b.racerCount}** |\n`,
);
process.stdout.write(
  `| corridor width (world px) | ${a.trackWidth} | ${b.trackWidth} |\n`,
);
process.stdout.write(`| open track | ${a.open} | ${b.open} |\n`);
process.stdout.write(`| world | ${a.world} | ${b.world} |\n`);
process.stdout.write(
  `| mid-race LEADER_ZOOM frames | ${a.frames} | ${b.frames} |\n`,
);

const row = (label, ka, kb, d, ratio = true) => {
  const va = a[ka];
  const vb = b[kb];
  process.stdout.write(
    `| ${label} | ${f(va, d)} | ${f(vb, d)} |` +
      (ratio ? ` **${f(va / vb, 3)}x** |\n` : ` — |\n`),
  );
};

process.stdout.write(
  `\n## THE DECOMPOSITION, over ALL mid-race frames (the median the report's table used)\n\n`,
);
process.stdout.write(`| quantity | ${A} | ${B} | ratio |\n|---|---|---|---|\n`);
row(
  "**halfLen (SCREEN px)** — the reported column",
  "halfLenMed",
  "halfLenMed",
  1,
);
row("drawnBodyLengthPx (WORLD px)", "worldLenMed", "worldLenMed", 3);
row("drawnBodyWidthPx (WORLD px)", "worldWidMed", "worldWidMed", 3);
row("effX (projection scale at delivered zoom)", "effXMed", "effXMed", 5);
row("cd.zoom", "zoomMed", "zoomMed", 5);
row("room the aim leaves ahead (SCREEN px)", "aimAheadMed", "aimAheadMed", 1);
row("|ux| — how horizontal the heading runs", "absUxMed", "absUxMed", 3);

const worldR = a.worldLenMed / b.worldLenMed;
const zoomR = a.effXMed / b.effXMed;
const screenR = a.halfLenMed / b.halfLenMed;
process.stdout.write(
  `\n**CLOSING THE ACCOUNT (all mid-race):** world ${f(worldR, 4)} x effX ${f(zoomR, 4)} = ` +
    `**${f(worldR * zoomR, 4)}**, against the measured screen ratio **${f(screenR, 4)}**. ` +
    `Residue ${f(100 * (worldR * zoomR - screenR), 4)}% of a ratio point.\n`,
);

process.stdout.write(
  `\n## THE SAME, RESTRICTED TO u in [${MID_LO}, ${MID_HI}]\n\n`,
);
process.stdout.write(`| quantity | ${A} | ${B} | ratio |\n|---|---|---|---|\n`);
process.stdout.write(
  `| frames in window | ${a.midFrames} | ${b.midFrames} | — |\n`,
);
row("halfLen (SCREEN px)", "midHalfLen", "midHalfLen", 1);
row("drawnBodyLengthPx (WORLD px)", "midWorldLen", "midWorldLen", 3);
row("effX", "midEffX", "midEffX", 5);
row("cd.zoom", "midZoom", "midZoom", 5);

const wR = a.midWorldLen / b.midWorldLen;
const zR = a.midEffX / b.midEffX;
const sR = a.midHalfLen / b.midHalfLen;
process.stdout.write(
  `\n**CLOSING THE ACCOUNT (u≈0.5):** world ${f(wR, 4)} x effX ${f(zR, 4)} = **${f(wR * zR, 4)}**, ` +
    `against measured **${f(sR, 4)}**. Residue ${f(100 * (wR * zR - sR), 4)}% of a ratio point.\n\n`,
);
process.stdout.write(
  `\n## THE SHOT IN FORCE at u in [${MID_LO}, ${MID_HI}] — every frame, not just LEADER_ZOOM\n\n`,
);
for (const [k, o] of [
  [A, a],
  [B, b],
]) {
  const tot = o.midStates.reduce((s, [, n]) => s + n, 0) || 1;
  process.stdout.write(
    `**${k}** (${tot} frames): ` +
      o.midStates
        .map(([s, n]) => `${s} ${((100 * n) / tot).toFixed(1)}%`)
        .join(" · ") +
      `\n`,
  );
}

process.stdout.write(
  `\n## THE ZOOM'S OWN INPUTS — global settings meeting per-track geometry\n\n`,
);
process.stdout.write(`| input | ${A} | ${B} |\n|---|---|---|\n`);
for (const k of Object.keys(a.zoomInputs))
  process.stdout.write(`| ${k} | ${a.zoomInputs[k]} | ${b.zoomInputs[k]} |\n`);

process.stdout.write(`\n${A}: ${a.identity}\n${B}: ${b.identity}\n`);

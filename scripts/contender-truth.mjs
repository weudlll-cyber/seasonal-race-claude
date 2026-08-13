// ============================================================
// File:        scripts/contender-truth.mjs
// Project:     RaceArena — CONTENDER-ZOOM-1
//
// THE OWNER'S CORRECTED RULE: in a photo finish, ALL of its participants must be visible, WHOLE. Two
// contenders means the shot may close in far; three abreast means less far. The CONTENDERS decide how
// tight it gets, and the corridor width is a MAXIMUM rather than a minimum — never wider than the
// track is wide, because the full width certainly shows everyone, and if the full width is not needed
// the shot closes in further.
//
// ── STAGE A, AND IT DECIDES WHETHER THERE IS ANYTHING TO BUILD ──────────────────────────────────
//
// `_photoFinishContenders` is captured as `ordered.slice(0, 2)` — exactly two, always. So the first
// question is empirical rather than architectural: HOW MANY racers are actually level at the moment
// the shot is entered? If the answer is never more than two, the pair is not a limitation and the
// only defect is the floor. If it is regularly three or more, then those racers are participants the
// shot is structurally unable to know about.
//
// "LEVEL" IS NOT A NEW NUMBER. `photoFinishCloseThresholdT` already defines it — the gate asks
// `shortestArcDeltaT(leader, second) <= closeThresholdT` and enters on that. This measures the same
// predicate against EVERY racer instead of against second place alone, so nothing is invented: the
// question is only ever asked of the number the game already uses.
//
// ── STAGE B — THE GRADE ─────────────────────────────────────────────────────────────────────────
//
// WHOLE / CUT / FULLY OUTSIDE per frame over the photo finish, using the renderer's own drawn sprite
// size. A CENTRE test undercounts by five (FRONT-GROUP-1), so cut and outside are counted separately
// and a racer is only WHOLE when its whole drawn body is inside the canvas.
//
// Usage:
//   node scripts/contender-truth.mjs                      # ten tracks, seed 9
//   node scripts/contender-truth.mjs --seeds=9,2814,5601
//   node scripts/contender-truth.mjs --only=ice-track --seeds=9
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
const SEEDS = argOf("seeds", argOf("seed", "9"))
  .split(",")
  .map((s) => Number(s.trim()))
  .filter(Number.isFinite);
const N_RACERS = Number(argOf("racers", "20"));

// THE ARMS. `floor` is master's behaviour (the corridor forces the shot open); `contenders` is the
// corrected rule (the contenders bind, the corridor caps).
// NOTE: `endgameCorridorFloor` does NOT exist on master — it lives only on the unmerged
// feat/front-group. The two arms here are master's own behaviour and this block's.
const ARMS = {
  off: { contenderZoom: false },
  contenders: { contenderZoom: true },
};
const ARM = argOf("arm", "off");
// --lane-only reproduces the previous, half-stated rule for comparison.
const LEVEL_TOO = !process.argv.includes("--lane-only");
if (!ARMS[ARM]) {
  console.error(`FAIL: unknown --arm=${ARM}. One of: ${Object.keys(ARMS).join(", ")}`);
  process.exit(2);
}

const CW = 1280;
const CH = 720;
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const CFG = { ...DEFAULT_CAMERA_CONFIG, ...ARMS[ARM] };
const THRESH = DEFAULT_CAMERA_CONFIG.photoFinishCloseThresholdT;

// ── WHAT A LANE IS, TAKEN FROM THE ENGINE RATHER THAN INVENTED ─────────────────────────────────
//
// THE RACE IS LANE-FREE. `raceBehavior.js` says so in its own header ("lane-free avoidance"), and
// `physicalY` is a CONTINUOUS lateral offset in [-1,+1]; `computeRowPhysicalY` only lays out the
// START GRID. So there are no discrete lanes to read and "same lane" has to be geometric.
//
// THE ENGINE ALREADY DEFINES IT, for its own free-lane overlap check: `pairContact` in
// raceBehavior.js gives `contactWidth = halfWidthA + halfWidthB`, the centre-to-centre distance at
// which two bodies touch across the track. And rowLayout.js's own helper fixes the unit: one
// physicalY unit is trackWidth/2 world px. Both quantities are already on the racer
// (`drawnBodyWidthPx`) and on the director (`_trackWidthPx`), so nothing here is a new number.
const sameLane = (a, b, trackWidthPx) => {
  const lateralPx = (Math.abs((a.physicalY ?? 0) - (b.physicalY ?? 0)) * trackWidthPx) / 2;
  const contactWidth = ((a.drawnBodyWidthPx ?? 0) + (b.drawnBodyWidthPx ?? 0)) / 2;
  return contactWidth > 0 && lateralPx < contactWidth;
};

/**
 * THE CONTENDERS: everyone not blocked by a racer ahead of them on their own lane.
 *
 * A racer sitting behind one of the leaders cannot win — he would have to move aside AND then still
 * overtake, and the photo-finish phase is far too short for both. He is not a contender. Everyone
 * else is still in the fight, and the shot is about them.
 *
 * @param {object[]} ordered  racers sorted by t, leader first
 */
const nearlyLevel = (r, leader) => {
  const pathLen = leader.pathLengthPx ?? 0;
  if (!(pathLen > 0)) return true;
  const gapPx = shortestArcDeltaT(leader.t, r.t) * pathLen;
  // contactLength = halfLengthA + halfLengthB — pairContact's own along-track touch distance, which
  // for two equal racers is exactly one body length. Not a new number.
  const contactLength = ((leader.drawnBodyLengthPx ?? 0) + (r.drawnBodyLengthPx ?? 0)) / 2;
  return contactLength > 0 && gapPx <= contactLength;
};

const contendersOf = (ordered, trackWidthPx, levelToo = true) => {
  const leader = ordered[0];
  return ordered.filter(
    (r, i) =>
      (!levelToo || i === 0 || nearlyLevel(r, leader)) &&
      !ordered.slice(0, i).some((ahead) => sameLane(r, ahead, trackWidthPx)),
  );
};

const med = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

const rows = [];

for (const geo of loadTracks({ only: ONLY })) {
  for (const raceSeed of SEEDS) {
    const identity = resolveIdentity({
      racers: N_RACERS,
      raceSeed,
      racerType: TRACK_DEFAULT_RACER,
      roster: ROSTER,
      note: "CONTENDER-ZOOM-1",
    });
    const race = buildRace(geo, identity, CFG);
    const { cd, displaySize, racerType, trackWidthPx } = race;
    const proj = cd._proj;
    const dsScale = DEFAULT_CONFIG_WORLD.autoScaleConfig?.displaySizeScale ?? 1;
    const maxTargetPx = getEffectiveMaxTargetScreenPx(
      racerType?.config?.maxTargetScreenPx,
      CFG.maxTargetScreenPx,
    );

    let entrySeen = false;
    let contenderIdx = [];
    let contendersAtEntry = 0;
    let backLengths = [];
    let furthestBack = NaN;
    let othersInFrame = 0;
    let levelAtEntry = 0; // how many racers are within closeThresholdT of the leader at entry
    let capturedAtEntry = 0; // how many the director actually pinned
    let gapsAtEntry = []; // the top six arc gaps to the leader, at entry
    let pfFrames = 0;
    let cut = 0;
    let outside = 0;
    let notWhole = 0;
    let emptyFrames = 0;
    let crossZoom = null;
    let crossStateZoom = null;
    let prevFinished = 0;
    let capBound = 0;
    let pairCut = 0, pairOut = 0, pairNotWhole = 0;
    let capApplicable = 0;
    const laneUse = []; // lateral extent the contenders occupy, as a fraction of the corridor

    runRace(
      race,
      identity,
      CFG,
      ({ cd: d, st: s }) => {
        const fp = d._framingProbe;
        if (!d._inPhotoFinish) {
          prevFinished = s.finishedCount;
          return;
        }
        // ── STAGE A: THE CONTENDER SET, captured ONCE at entry ──────────────────────────────────
        //
        // CAPTURED, NOT RECOMPUTED. FINISH-PAIR-1 exists because a guaranteed set that is re-sorted
        // every frame moves the picture on every swap. The set below is taken on the entry frame and
        // then followed by index for the rest of the shot, which is what that block bought.
        const ordered = [...s.racers].sort((a, b) => b.t - a.t);
        const leader = ordered[0];
        if (!entrySeen) {
          entrySeen = true;
          capturedAtEntry = d._photoFinishContenders?.length ?? 0;
          const set = contendersOf(ordered, trackWidthPx, LEVEL_TOO);
          contenderIdx = set.map((r) => r.index);
          contendersAtEntry = set.length;
          // ── HOW FAR BACK THE LANE-ONLY RULE REACHES ─────────────────────────────────────────
          // In the racer's OWN LENGTH, which the engine already gives: drawnBodyLengthPx per racer
          // and pathLengthPx for the loop. A member many lengths back is on a free lane but is not
          // "nearly level with the leader", and he is what forces the shot open.
          const bodyLen = leader.drawnBodyLengthPx ?? 0;
          const pathLen = leader.pathLengthPx ?? 0;
          const inLengths = (r) =>
            bodyLen > 0 && pathLen > 0
              ? (shortestArcDeltaT(leader.t, r.t) * pathLen) / bodyLen
              : NaN;
          backLengths = set.map(inLengths);
          furthestBack = backLengths.length ? Math.max(...backLengths) : NaN;
          // For the record: how many the OLD arc-threshold yardstick would have called level. It is
          // reported to show the two disagree, and for no other purpose.
          levelAtEntry = ordered.filter(
            (r) => shortestArcDeltaT(leader.t, r.t) <= THRESH,
          ).length;
          gapsAtEntry = ordered.slice(0, 6).map((r) => shortestArcDeltaT(leader.t, r.t));
        }
        if (!fp?.point) return;
        pfFrames++;

        // ── STAGE B: are the CONTENDERS whole? THAT IS THE CRITERION ────────────────────────────
        //
        // The contenders are the racers captured at entry — everyone not blocked by a racer ahead of
        // them on their own lane. Graded by INDEX against this frame's array, so a spread-copy does
        // not break the lookup.
        //
        // EVERYONE ELSE IS INFORMATION ONLY. A racer further back appearing in frame is NOT a defect
        // and their absence is NOT a success; the owner has said so explicitly. The `others` counters
        // below exist so a reader can see what is happening, and must never become a target.
        const participants = contenderIdx
          .map((ix) => s.racers.find((r) => r.index === ix))
          .filter(Boolean);
        const others = s.racers.filter((r) => !contenderIdx.includes(r.index));
        const eX = proj.effX(d.zoom);
        const eY = proj.effY(d.zoom);
        const dScale = computeRenderDisplayScale(
          displaySize,
          dsScale,
          eX,
          maxTargetPx,
          CFG.minDrawnFrameFrac,
          CH,
        );
        const halfW = drawnRacerScreenPx(displaySize, dScale, eX) / 2;
        const halfH = drawnRacerScreenPx(displaySize, dScale, eY) / 2;
        const pinned = (d._photoFinishContenders ?? [])
          .map((cn) => s.racers.find((r) => r.index === cn.index) ?? cn.ref)
          .filter(Boolean);
        let pc2 = 0, po2 = 0;
        for (const r of pinned) {
          const p = proj.toScreen(r, d.zoom, d.offsetX, d.offsetY);
          const centreIn = p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH;
          const whole =
            p.x - halfW >= 0 && p.x + halfW <= CW && p.y - halfH >= 0 && p.y + halfH <= CH;
          if (whole) continue;
          if (centreIn) pc2++;
          else po2++;
        }
        if (pc2 > 0) pairCut++;
        if (po2 > 0) pairOut++;
        if (pc2 + po2 > 0) pairNotWhole++;
        let c = 0;
        let o = 0;
        let onScreen = 0;
        for (const r of participants) {
          const p = proj.toScreen(r, d.zoom, d.offsetX, d.offsetY);
          const centreIn = p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH;
          const whole =
            p.x - halfW >= 0 && p.x + halfW <= CW && p.y - halfH >= 0 && p.y + halfH <= CH;
          if (centreIn) onScreen++;
          if (whole) continue;
          if (centreIn) c++;
          else o++;
        }
        for (const r of others) {
          const p = proj.toScreen(r, d.zoom, d.offsetX, d.offsetY);
          if (p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH) { othersInFrame++; break; }
        }
        if (c > 0) cut++;
        if (o > 0) outside++;
        if (c + o > 0) notWhole++;
        if (onScreen === 0) emptyFrames++;

        // How much of the corridor the participants actually use — the "empty road" question.
        const ys = participants.map((r) => r.physicalY ?? 0);
        if (ys.length)
          laneUse.push(((Math.max(...ys) - Math.min(...ys)) * trackWidthPx) / 2 / trackWidthPx);

        if (fp.corridorCap !== null && fp.corridorCap !== undefined) capApplicable++;
        if (fp.capBound) capBound++;
        if (crossZoom === null && s.finishedCount > prevFinished) {
          crossZoom = d.zoom;
          crossStateZoom = fp.stateZoom;
        }
        prevFinished = s.finishedCount;
      },
      { slowmo: true },
    );

    rows.push({
      track: geo.id,
      seed: raceSeed,
      levelAtEntry,
      contendersAtEntry,
      backLengths,
      furthestBack,
      othersInFrame,
      capturedAtEntry,
      gapsAtEntry,
      pfFrames,
      cut,
      outside,
      notWhole,
      emptyFrames,
      crossZoom,
      crossStateZoom,
      laneMed: med(laneUse),
      capBound, capApplicable, pairCut, pairOut, pairNotWhole,
      identity,
    });
  }
}

const pc = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "—");

console.log(
  `\nSTAGE A — HOW MANY RACERS ARE LEVEL AT PHOTO-FINISH ENTRY (arm=${ARM})\n` +
    `"level" = within photoFinishCloseThresholdT (${THRESH}) of the leader in lap-normalised arc —\n` +
    `the SAME predicate the entry gate uses, asked of every racer instead of second place alone.\n`,
);
console.log(
  "track            seed  CONTENDERS  pinned  arc-said   how far back each member is, in BODY LENGTHS",
);
for (const r of rows) {
  if (!r.pfFrames && !r.levelAtEntry) {
    console.log(`${r.track.padEnd(15)} ${String(r.seed).padStart(5)}   (no photo finish)`);
    continue;
  }
  console.log(
    `${r.track.padEnd(15)} ${String(r.seed).padStart(5)} ${String(r.contendersAtEntry).padStart(11)} ` +
      `${String(r.capturedAtEntry).padStart(7)} ${String(r.levelAtEntry).padStart(9)}   ` +
      `furthest back ${(Number.isFinite(r.furthestBack) ? r.furthestBack.toFixed(1) : "—").padStart(6)} lengths   ` +
      `set: ${r.backLengths.map((b) => (Number.isFinite(b) ? b.toFixed(1) : "?")).join(", ")}`,
  );
}
const withPF = rows.filter((r) => r.pfFrames > 0);
const three = withPF.filter((r) => r.levelAtEntry > 2);
console.log(
  `\n${three.length} of ${withPF.length} photo finishes have MORE THAN TWO racers level at entry` +
    (three.length
      ? ` — ${three.map((r) => `${r.track}/${r.seed} (${r.levelAtEntry})`).join(", ")}`
      : ""),
);
console.log(
  `The director captured exactly ${[...new Set(withPF.map((r) => r.capturedAtEntry))].join("/")} in every one of them.`,
);

console.log(`\nSTAGE B — ARE THE PARTICIPANTS WHOLE (arm=${ARM})\n`);
console.log(
  "track            seed  PFfrm     cut     outside   not-whole   empty   crossing vs ordinary   lane use",
);
let T = { f: 0, c: 0, o: 0, n: 0, e: 0 };
const rels = [];
for (const r of withPF) {
  T.f += r.pfFrames;
  T.c += r.cut;
  T.o += r.outside;
  T.n += r.notWhole;
  T.e += r.emptyFrames;
  const rel = r.crossZoom && r.crossStateZoom ? (100 * r.crossZoom) / r.crossStateZoom : NaN;
  if (Number.isFinite(rel)) rels.push(rel);
  console.log(
    `${r.track.padEnd(15)} ${String(r.seed).padStart(5)} ${String(r.pfFrames).padStart(6)} ` +
      `${pc(r.cut, r.pfFrames).padStart(8)} ${pc(r.outside, r.pfFrames).padStart(9)} ` +
      `${pc(r.notWhole, r.pfFrames).padStart(11)} ${String(r.emptyFrames).padStart(7)}   ` +
      `${Number.isFinite(rel) ? `${rel.toFixed(0)}%`.padStart(18) : "—".padStart(18)}   ` +
      `${Number.isFinite(r.laneMed) ? `${(100 * r.laneMed).toFixed(0)}%` : "—"}`,
  );
}
const sum = (k) => withPF.reduce((a, r) => a + (r[k] ?? 0), 0);
console.log(
  `\nTHE CORRIDOR CAP: applicable on ${sum("capApplicable")} photo-finish frames, and it MOVED the ` +
    `delivered zoom on ${sum("capBound")}.`,
);
console.log(
  `\nTHE PINNED PAIR — the promise the shot actually makes today (2 racers): ` +
    `cut ${pc(sum("pairCut"), T.f)}, fully outside ${pc(sum("pairOut"), T.f)}, ` +
    `NOT WHOLE ${pc(sum("pairNotWhole"), T.f)}`,
);
console.log(
  `THE LEVEL SET — everyone within the entry gate's own threshold (${T.f} frames): ` +
    `cut ${pc(T.c, T.f)}, fully outside ${pc(T.o, T.f)}, ` +
    `NOT WHOLE ${pc(T.n, T.f)}, EMPTY FRAMES ${T.e}`,
);
if (rels.length)
  console.log(
    `CROSSING SHOT vs the ordinary one: min ${Math.min(...rels).toFixed(0)}%, ` +
      `median ${med(rels).toFixed(0)}%, max ${Math.max(...rels).toFixed(0)}%, ` +
      `mean ${(rels.reduce((a, b) => a + b, 0) / rels.length).toFixed(0)}%`,
  );
if (rows.length) console.log(`\n${formatIdentity(rows[0].identity)}`);

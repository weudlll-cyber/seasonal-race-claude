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
if (!ARMS[ARM]) {
  console.error(`FAIL: unknown --arm=${ARM}. One of: ${Object.keys(ARMS).join(", ")}`);
  process.exit(2);
}

const CW = 1280;
const CH = 720;
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const CFG = { ...DEFAULT_CAMERA_CONFIG, ...ARMS[ARM] };
const THRESH = DEFAULT_CAMERA_CONFIG.photoFinishCloseThresholdT;

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
        // ── STAGE A: the level set, measured ONCE at entry ──────────────────────────────────────
        const live = s.racers.filter((r) => r && !r.finished);
        const ordered = [...s.racers].sort((a, b) => b.t - a.t);
        const leader = ordered[0];
        if (!entrySeen) {
          entrySeen = true;
          capturedAtEntry = d._photoFinishContenders?.length ?? 0;
          levelAtEntry = ordered.filter(
            (r) => shortestArcDeltaT(leader.t, r.t) <= THRESH,
          ).length;
          gapsAtEntry = ordered
            .slice(0, 6)
            .map((r) => shortestArcDeltaT(leader.t, r.t));
        }
        if (!fp?.point) return;
        pfFrames++;

        // ── STAGE B: are the PARTICIPANTS whole? ────────────────────────────────────────────────
        // The participants are the level set — everyone the gate's own predicate calls close to the
        // leader — not the pinned pair, because grading an arm on the set it chose is how a harness
        // flatters itself (FRONT-GROUP-1).
        const participants = ordered.filter(
          (r) => shortestArcDeltaT(leader.t, r.t) <= THRESH,
        );
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
  "track            seed   level  captured   gaps to the leader, top 6 (lap-normalised arc)",
);
for (const r of rows) {
  if (!r.pfFrames && !r.levelAtEntry) {
    console.log(`${r.track.padEnd(15)} ${String(r.seed).padStart(5)}   (no photo finish)`);
    continue;
  }
  console.log(
    `${r.track.padEnd(15)} ${String(r.seed).padStart(5)} ${String(r.levelAtEntry).padStart(6)} ` +
      `${String(r.capturedAtEntry).padStart(9)}   ` +
      r.gapsAtEntry.map((g) => g.toFixed(4)).join("  "),
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

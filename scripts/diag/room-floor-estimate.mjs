// ROOM-FLOOR-1 — checking the owner's forwardFrac arithmetic before anything is built. MEASURE ONLY.
//
// HIS DERIVATION, restated so the check is against a stated claim rather than a remembered one:
// `anchorScreenPoint` shifts the aim along the heading by `(forwardFrac - 0.5) * chord`, where the
// chord is `frameExtentAlong(ux, uy, W, H)`. The room left AHEAD of the aim point is therefore
//
//     roomAhead = chord/2 - (forwardFrac - 0.5) * chord = chord * (1 - forwardFrac)
//
// so a single constant `forwardFrac` leaves room PROPORTIONAL to the chord — least where the chord is
// shortest, which is the steep headings. Closing a shortfall of `d` px costs `d / chord` of
// forwardFrac. He estimates ~1.6 pp for the median space-sprint case and asks for it checked, noting
// it is a median-based derivation and that the heading varies through the race.
//
// WHAT THIS MEASURES, on the real frames: the chord, the room the aim actually leaves (solved the way
// `leader-lag-truth.mjs` solves it, from the aim point to the nearest edge along the heading), the
// half-length, the tolerance those give, and the gap the tolerance has to cover. Then the exact
// forwardFrac reduction that would close the median case, per track, from the measured chord rather
// than from an assumed one.
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
const { frameExtentAlong } = await import(
  u("client/src/modules/camera/frameGeometry.js")
);
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const TRACKS = (
  arg("tracks", "space-sprint,river-run,seatrack,dirt-oval") || ""
)
  .split(",")
  .filter(Boolean);
const N = Number(arg("racers", "20"));
const SEEDS = Number(arg("seeds", "10"));
const FROM_U = Number(arg("from", "0.10"));

const med = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
const q = (a, p) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};
const f = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "—");

const tracks = new Map(loadTracks().map((g) => [g.id, g]));
const rows = [];

for (const t of TRACKS) {
  const geo = tracks.get(t);
  if (!geo) continue;
  const chord = [];
  const room = [];
  const half = [];
  const tol = [];
  const gap = [];
  let frac = null;

  for (let s = 1; s <= SEEDS; s++) {
    const identity = resolveIdentity({
      racers: N,
      raceSeed: s,
      racerType: TRACK_DEFAULT_RACER,
      roster: ROSTER,
      cameraSeed: cameraSeedForRace(s),
      note: "room-floor-estimate",
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

    runRace(
      race,
      identity,
      DEFAULT_CAMERA_CONFIG,
      ({ cd, st }) => {
        const fp = cd._framingProbe;
        if (!fp || cd.state !== "LEADER_ZOOM") return;
        let leader = null;
        for (const r of st.racers) if (!leader || r.t > leader.t) leader = r;
        if (!leader) return;
        const uNow = leader.t / (st.finishT ?? 1);
        if (uNow < FROM_U || uNow >= END_U) return;
        if (fp.runInActive || cd._inFinishMode) return;

        const hs = cd._headingScreen(leader.t);
        const hl = hs ? Math.hypot(hs.x, hs.y) : 0;
        if (!(hl > 0)) return;
        const ux = hs.x / hl;
        const uy = hs.y / hl;
        frac = cd._forwardFracNow();
        const at = anchorScreenPoint(CW, CH, frac, hs);
        if (!at) return;

        const effX = proj.effX(cd.zoom);
        const effY = proj.effY(cd.zoom);
        const halfLen = ((leader.drawnBodyLengthPx ?? 0) / 2) * effX;
        const sx = leader.x * effX + cd.offsetX;
        const sy = leader.y * effY + cd.offsetY;

        // The room the aim leaves ahead, solved exactly as leader-lag-truth.mjs solves it.
        const ahead = Math.min(
          ux > 1e-12 ? (CW - at.x) / ux : Infinity,
          ux < -1e-12 ? at.x / -ux : Infinity,
          uy > 1e-12 ? (CH - at.y) / uy : Infinity,
          uy < -1e-12 ? at.y / -uy : Infinity,
        );
        if (!Number.isFinite(ahead)) return;

        chord.push(frameExtentAlong(ux, uy, CW, CH));
        room.push(ahead);
        half.push(halfLen);
        tol.push(ahead - halfLen);
        // The gap the tolerance must cover: how far the delivered leader sits from the aim point.
        gap.push(Math.hypot(sx - at.x, sy - at.y));
      },
      { slowmo: false },
    );
  }
  rows.push({
    t,
    n: chord.length,
    frac,
    chord: med(chord),
    chordP10: q(chord, 0.1),
    room: med(room),
    half: med(half),
    tol: med(tol),
    gap: med(gap),
    gapP75: q(gap, 0.75),
  });
}

process.stdout.write(
  `\n## THE CHORD, THE ROOM, AND THE SHORTFALL — ${SEEDS} races, n=${N}, per track\n\n`,
);
process.stdout.write(
  "| track | frames | forwardFrac | chord med | chord p10 | room med | predicted chord×(1−frac) | half-len | tolerance | gap med | **shortfall** |\n",
);
process.stdout.write("|---|---|---|---|---|---|---|---|---|---|---|\n");
for (const r of rows) {
  const predicted = r.chord * (1 - r.frac);
  const shortfall = r.gap - r.tol;
  process.stdout.write(
    `| ${r.t} | ${r.n} | ${f(r.frac, 2)} | ${f(r.chord)} | ${f(r.chordP10)} | ${f(r.room)} |` +
      ` ${f(predicted)} | ${f(r.half)} | ${f(r.tol)} | ${f(r.gap)} |` +
      ` **${shortfall > 0 ? "+" : ""}${f(shortfall)}** |\n`,
  );
}

process.stdout.write(
  `\n## THE ESTIMATE CHECKED — what closing the MEDIAN case costs in forwardFrac\n\n`,
);
process.stdout.write(
  "| track | shortfall to close | chord med | **Δ forwardFrac needed** | new frac | room floor that does it |\n",
);
process.stdout.write("|---|---|---|---|---|---|\n");
for (const r of rows) {
  const shortfall = r.gap - r.tol;
  if (!(shortfall > 0)) {
    process.stdout.write(
      `| ${r.t} | none (tolerance already exceeds the gap) | ${f(r.chord)} | — | — | — |\n`,
    );
    continue;
  }
  const dFrac = shortfall / r.chord;
  process.stdout.write(
    `| **${r.t}** | ${f(shortfall)} px | ${f(r.chord)} |` +
      ` **${f(100 * dFrac, 2)} pp** | ${f(r.frac - dFrac, 4)} | **${f(r.room + shortfall)} px** |\n`,
  );
}
process.stdout.write(
  `\nThe room floor column is the quantity a floor-shaped rule would set: the room ahead that makes\n` +
    `tolerance meet the median gap on that track. A floor needs no per-track number — it binds only\n` +
    `where the chord is short enough that chord×(1−frac) falls under it.\n\n`,
);

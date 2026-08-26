// MIDRACE-LEADER-CLIP-1 — is the LEADER cut off DURING the race? MEASURE ONLY.
//
// NOT the closing phase. Every instrument this strand built is scoped to the run-in; this one runs
// the opposite window and stops before the endgame opens.
//
// ── CLIPPED IS NOT ABSENT, AND THE DIFFERENCE IS THE WHOLE POINT ───────────────────────────────
//
// The owner reports the leader "not fully visible" — cut off at the side, or cut off ahead along the
// direction of travel. That is a statement about his SPRITE crossing an edge, not about his centre
// leaving the canvas. Every existing measurement in this strand tests a POINT. So this one gives him
// an extent: half a drawn body length along his heading, half a drawn body width across it, and asks
// whether that box crosses an edge of the fixed 1280x720 store.
//
// ── AND THE OVERFLOW IS DECOMPOSED THE WAY HE DESCRIBED IT ─────────────────────────────────────
//
// He named two different things — "at the side of the track" and "ahead along the direction of
// travel" — and which one dominates decides where to look. So the amount by which the box exceeds
// the frame is split against the TRACK's screen heading: ALONG (ahead/behind him) and ACROSS
// (lateral). A count of "clipped frames" alone cannot tell those apart.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
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
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { projectionForTrack } = await import(u("client/src/modules/camera/projection.js"));
const { cameraSeedForRace } = await import(u("client/src/modules/camera/cameraSeed.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const CASES = (arg("cases", "river-run:20:1") || "")
  .split(",")
  .filter(Boolean)
  .map((s) => {
    const [track, n, seed] = s.split(":");
    return { track, racers: Number(n), seed: Number(seed) };
  });
const OUT = arg("out", "c:/tmp/midrace");
const TAG = arg("tag", "clip");
// THE MID-RACE WINDOW. After the start ceremony has released and before the endgame opens. The
// endgame threshold is a config value, so it is READ rather than restated here.
const FROM_U = Number(arg("from", "0.10"));
// §2026-08-26 — `--leader-corridors=` overrides ONE key: LEADER_ZOOM's `visibleCorridors`, the
// "World in shot (corridors)" setting. It exists so the owner's hypothesis can be TESTED by sweeping
// the setting rather than argued about. Nothing else is touched, and omitting the flag leaves the
// shipped defaults exactly — which is what every earlier run in this report used.
const LEADER_CORR = arg("leader-corridors", null);
// IT APPLIES TO BOTH STATES THAT SHIP AT 0.75, and that choice is deliberate. `visibleCorridors` is a
// PER-STATE key: LEADER_ZOOM and LEAD_CHANGE both ship at 0.75, OVERVIEW at 1.5. Sweeping "the
// setting" therefore has to say which states it means. These two are the ones the owner's number
// names — 0.75 is their shipped value — so the sweep moves both together and leaves OVERVIEW at its
// own 1.5 throughout. OVERVIEW's rate is consequently CONSTANT across the sweep and is reported as
// the control it is, not as a result.
const SWEPT_STATES = ["LEADER_ZOOM", "LEAD_CHANGE"];
const CFG = LEADER_CORR
  ? {
      ...DEFAULT_CAMERA_CONFIG,
      cameraStateProfiles: {
        ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
        ...Object.fromEntries(
          SWEPT_STATES.map((s) => [
            s,
            {
              ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles[s],
              visibleCorridors: Number(LEADER_CORR),
            },
          ])
        ),
      },
    }
  : DEFAULT_CAMERA_CONFIG;

const tracks = new Map(loadTracks().map((g) => [g.id, g]));
const out = [];

for (const c of CASES) {
  const geo = tracks.get(c.track);
  if (!geo) {
    process.stderr.write(`no track ${c.track}\n`);
    continue;
  }
  const identity = resolveIdentity({
    racers: c.racers,
    raceSeed: c.seed,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    cameraSeed: cameraSeedForRace(c.seed),
    note: "midrace-leader-clip (browser camera seed)",
  });
  const race = buildRace(geo, identity, CFG);
  const { cd } = race;
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const END_U = cd._endgameThreshold ?? 0.95;

  const rows = [];
  let frames = 0;
  runRace(
    race,
    identity,
    CFG,
    ({ cd, st, ts, frame }) => {
      const fp = cd._framingProbe;
      if (!fp) return;
      const racers = st.racers;
      let leader = null;
      for (const r of racers) if (!leader || r.t > leader.t) leader = r;
      if (!leader) return;
      const uNow = leader.t / (st.finishT ?? 1);
      // MID-RACE ONLY: past the start window, before the endgame, and never inside the run-in or
      // the finish. Those are other blocks' windows and mixing them would answer the wrong question.
      if (uNow < FROM_U || uNow >= END_U) return;
      if (fp.runInActive || cd._inFinishMode) return;
      frames++;

      const effX = proj.effX(cd.zoom);
      const effY = proj.effY(cd.zoom);
      const sx = leader.x * effX + cd.offsetX;
      const sy = leader.y * effY + cd.offsetY;

      // HIS EXTENT ON SCREEN. Half a body along the heading, half across it, projected. The heading
      // is the TRACK's at his own station, which is also the axis his two complaints are named in.
      const h = cd._headingScreen(leader.t);
      const L = h ? Math.hypot(h.x, h.y) : 0;
      const hx = L > 0 ? h.x / L : 1;
      const hy = L > 0 ? h.y / L : 0;
      const halfLen = ((leader.drawnBodyLengthPx ?? 36) / 2) * effX;
      const halfWid = ((leader.drawnBodyWidthPx ?? 36) / 2) * effY;

      // The four corners of his oriented box.
      let worstAlong = 0;
      let worstAcross = 0;
      const edges = new Set();
      for (const a of [-1, 1])
        for (const b of [-1, 1]) {
          const px = sx + hx * halfLen * a - hy * halfWid * b;
          const py = sy + hy * halfLen * a + hx * halfWid * b;
          // How far outside each edge this corner is, and which edge it crossed.
          const ox = px < 0 ? -px : px > CW ? px - CW : 0;
          const oy = py < 0 ? -py : py > CH ? py - CH : 0;
          if (px < 0) edges.add("left");
          if (px > CW) edges.add("right");
          if (py < 0) edges.add("top");
          if (py > CH) edges.add("bottom");
          if (ox === 0 && oy === 0) continue;
          // Split the overflow against the heading: ALONG is ahead/behind, ACROSS is lateral.
          const along = Math.abs(ox * hx + oy * hy);
          const across = Math.abs(-ox * hy + oy * hx);
          if (along > worstAlong) worstAlong = along;
          if (across > worstAcross) worstAcross = across;
        }
      const clipped = edges.size > 0;
      const centreOut = sx < 0 || sx > CW || sy < 0 || sy > CH;

      rows.push({
        frame,
        ts,
        u: +uNow.toFixed(4),
        state: cd.state,
        clipped,
        centreOut, // ABSENT, not merely clipped — reported apart because he said clipped
        along: +worstAlong.toFixed(1),
        across: +worstAcross.toFixed(1),
        edges: [...edges],
        binding: fp.binding ?? null,
        anchorIsLeader:
          fp.anchorPoint && Math.abs(fp.anchorPoint.x - leader.x) < 1e-6 &&
          Math.abs(fp.anchorPoint.y - leader.y) < 1e-6,
        anchorRacerIdx: cd._focusAnchorRacer?.(racers)?.index ?? null,
        leaderIdx: leader.index,
        zoom: +cd.zoom.toFixed(5),
        visibleW: +(CW / effX).toFixed(1),
        // ── WHAT A WIDER SETTING COSTS, recorded so the trade can be shown and not just the benefit.
        // `bodyPx` is the leader's drawn length ON SCREEN — the quantity the setting actually moves,
        // and the reason he clips. `roadFrac` is how much of the frame's SHORT axis the road spans,
        // so "more world in shot" can be read as "less of the picture is track".
        bodyPx: +(((leader.drawnBodyLengthPx ?? 36)) * effX).toFixed(1),
        roadFrac: +((race.trackWidthPx * effY) / CH).toFixed(4),
      });
    },
    { slowmo: false }
  );

  out.push({
    case: c,
    identity: formatIdentity(identity),
    cameraSeed: identity.cameraSeed,
    endgameThreshold: END_U,
    frames,
    rows,
  });
  process.stdout.write(
    `${c.track}:${c.racers}:${c.seed} camSeed=${identity.cameraSeed} midrace=${frames} clipped=${rows.filter((r) => r.clipped).length}\n`
  );
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/clip-${TAG}.json`, JSON.stringify(out, null, 1));
process.stdout.write(`wrote ${OUT}/clip-${TAG}.json\n`);

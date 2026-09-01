// ALONG-RESIDUAL-1 — the SHAPE of the frames no sideways move can reach. MEASURE ONLY.
//
// LEADER-LATERAL-BUILD-1 shipped the leader's lateral guarantee and left 830 frames behind: the ones
// where `lateralAdmissibleForBody` returns an empty interval, meaning the leader's drawn body cannot
// be brought whole into frame by ANY shift along the track perpendicular. He is lost ALONG the track.
// The pan declines them deliberately; the open question is what a ZOOM-side answer would have to be.
//
// ── WHAT THIS ANSWERS, AND WHY EACH NUMBER IS NEEDED ───────────────────────────────────────────
//
//   WHERE     per track, and WHEN in the race (`u`), because "it is the calm tracks" and "it is the
//             last tenth" are different problems with different fixes.
//   HOW MUCH  the extra WIDTH that would fit him, as a distribution and not a worst case. Expressed
//             as a zoom RATIO (how much wider the shot must be), which is the unit the guarantee
//             stack already works in — a ceiling is a zoom, not a pixel count.
//   WHAT IT   what that width would do to the shot the owner has just accepted. He has already
//   COSTS     rejected widening once, at 1.00 corridors, so the cost is stated in the SAME unit he
//             rejected: corridors of road on screen, before and after.
//   SHAPE     whether the residual is episodes or scattered single frames. A 40-frame episode is a
//             visible fault; forty single frames spread over a race are not the same thing, and a
//             mechanism that fixes one need not fix the other.
//
// THE WIDTH IS SOLVED, NOT SEARCHED. Widening by a factor `k` scales every screen offset from the
// camera centre by 1/k. The leader's body corners sit at `p - c` from the frame centre `c`; after
// widening they sit at `(p - c)/k`. The smallest `k` that brings all four inside the frame is
// therefore the largest `|p - c|` component ratio over the half-frame — one division per corner, no
// iteration, and exact.
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
const { lateralAdmissibleForBody } = await import(
  u("client/src/modules/camera/framingRule.js")
);
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const CASES = (arg("cases", "space-sprint:20:6") || "")
  .split(",")
  .filter(Boolean)
  .map((s) => {
    const [track, n, seed] = s.split(":");
    return { track, racers: Number(n), seed: Number(seed) };
  });
const OUT = arg("out", "c:/tmp/p2");
const TAG = arg("tag", "resid");
const FROM_U = Number(arg("from", "0.10"));
// THE MARGIN IS A PARAMETER because there are TWO residuals and they are different sizes. The
// director declines a frame when the interval is empty AT THE SHIPPED MARGIN; LEADER-LATERAL-BUILD-1
// reported 830 using the bare box with no margin at all. Both are real and neither is "the" number,
// so this probe can produce either and the report states which is which.
//
// ── IT IS NAMED `--probe-margin` BECAUSE THAT IS THE ONLY THING IT CHANGES (MARGIN-PER-TRACK-1) ──
//
// This flag moves the number the MEASUREMENT tests with. **The director still flies at the shipped
// value**, so the camera takes exactly the same path in every arm and the only thing that varies is
// which of those identical frames get counted. That answers ONE question — "how much of today's
// residual is the margin's doing" — and it is the question ALONG-RESIDUAL-1's margin's-share table
// was built on, which is why the behaviour is kept rather than converted.
//
// It CANNOT answer "what would a different margin ship like", and under its old name (`--margin`) it
// read as though it could. A caller asking that gets a camera that never moved differently, no
// change in clipping, and a residual column that looks like a free win — the exact reading
// MARGIN-PER-TRACK-1 had to run a second instrument to refute. So the old spelling is REFUSED below
// rather than quietly aliased: a wrong answer that looks right is worse than an error.
const MARGIN_OVERRIDE = arg("probe-margin", null);
if (process.argv.some((a) => a.startsWith("--margin="))) {
  process.stderr.write(
    "along-residual: --margin is REFUSED. It only changed what this PROBE tested with while the\n" +
      "director kept flying at the shipped value, so it cannot answer a question about the margin.\n" +
      "  · to re-score today's camera at another margin (ALONG-RESIDUAL-1's margin's-share table):\n" +
      "      --probe-margin=<px>\n" +
      "  · to actually FLY a different margin and see what it costs:\n" +
      "      scripts/diag/margin-both-axes.mjs --margin=<px>   (puts it in the camera config)\n",
  );
  process.exit(2);
}

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
    note: "along-residual (browser camera seed)",
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const { cd } = race;
  const proj = projectionForTrack(geo.worldWidth, geo.worldHeight, !geo.closed);
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const END_U = cd._endgameThreshold ?? 0.95;

  const rows = [];
  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd, st, frame }) => {
      const fp = cd._framingProbe;
      if (!fp || cd.state !== "LEADER_ZOOM") return;
      let leader = null;
      for (const r of st.racers) if (!leader || r.t > leader.t) leader = r;
      if (!leader) return;
      const uNow = leader.t / (st.finishT ?? 1);
      if (uNow < FROM_U || uNow >= END_U) return;
      if (fp.runInActive || cd._inFinishMode) return;

      const hs = cd._headingScreen(leader.t);
      const hw = cd._headingAt(leader.t);
      if (!hs || !hw) return;
      const hl = Math.hypot(hs.x, hs.y);
      const hwl = Math.hypot(hw.x, hw.y);
      if (!(hl > 0) || !(hwl > 0)) return;

      const effX = proj.effX(cd.zoom);
      const effY = proj.effY(cd.zoom);
      const ux = hs.x / hl;
      const uy = hs.y / hl;
      const perp = { x: -hw.y / hwl, y: hw.x / hwl };
      const vx = perp.x * effX;
      const vy = perp.y * effY;

      const sx = leader.x * effX + cd.offsetX;
      const sy = leader.y * effY + cd.offsetY;
      const halfLen = ((leader.drawnBodyLengthPx ?? 0) / 2) * effX;
      const halfWid = ((leader.drawnBodyWidthPx ?? 0) / 2) * effY;
      const body = { cx: sx, cy: sy, ux, uy, halfLen, halfWid };

      // THE SHIPPED TEST, the same call and the same margin the director makes. A frame is in this
      // residual exactly when that call declines it — not when some re-derivation of it does.
      const margin =
        MARGIN_OVERRIDE === null
          ? cd._leaderLateralMarginPx
          : Number(MARGIN_OVERRIDE);
      const { lo, hi } = lateralAdmissibleForBody(body, vx, vy, CW, CH, margin);
      const feasible = lo <= hi;

      let clipped = false;
      const corners = [];
      for (const a of [-1, 1])
        for (const b of [-1, 1]) {
          const px = sx + ux * halfLen * a - uy * halfWid * b;
          const py = sy + uy * halfLen * a + ux * halfWid * b;
          corners.push({ px, py });
          if (px < 0 || px > CW || py < 0 || py > CH) clipped = true;
        }
      if (feasible && !clipped) return; // nothing to say about a frame that is already fine

      // THE WIDTH THAT WOULD FIT HIM. Widening by k scales every offset from the frame CENTRE by
      // 1/k, so the smallest sufficient k is the largest corner offset measured in half-frames. The
      // margin is included, because a promise that lands exactly on the edge is broken by the pan
      // smoother before it is drawn — that is what LEADER-LATERAL-BUILD-1 measured.
      const halfW = CW / 2;
      const halfH = CH / 2;
      const mX = Math.max(0, halfW - margin);
      const mY = Math.max(0, halfH - margin);
      let k = 0;
      for (const { px, py } of corners) {
        const rx = mX > 0 ? Math.abs(px - halfW) / mX : Infinity;
        const ry = mY > 0 ? Math.abs(py - halfH) / mY : Infinity;
        k = Math.max(k, rx, ry);
      }

      rows.push({
        frame,
        u: +uNow.toFixed(4),
        residual: !feasible, // the frames THIS piece is about
        clipped,
        // How much wider the shot would have to be. 1.0 = already fits.
        widthFactor: Number.isFinite(k) ? +Math.max(1, k).toFixed(4) : null,
        zoom: +cd.zoom.toFixed(5),
        // The shot's width in CORRIDORS of road — the unit the owner rejected a change in, so the
        // cost of widening can be stated in it rather than in a zoom number he has no feel for.
        corridorsNow:
          cd._trackWidthPx > 0
            ? +(CW / effX / cd._trackWidthPx).toFixed(4)
            : null,
        halfLen: +halfLen.toFixed(1),
        halfWid: +halfWid.toFixed(1),
        binding: fp.binding ?? null,
        levelBound: fp.levelBound ?? null,
        stateBinding: fp.stateBinding ?? null,
      });
    },
    { slowmo: false },
  );

  out.push({
    case: c,
    identity: formatIdentity(identity),
    trackWidthPx: cd._trackWidthPx,
    rows,
  });
  process.stdout.write(
    `${c.track}:${c.seed} rows=${rows.length} residual=${rows.filter((r) => r.residual).length}\n`,
  );
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/resid-${TAG}.json`, JSON.stringify(out, null, 1));
process.stdout.write(`wrote ${OUT}/resid-${TAG}.json\n`);

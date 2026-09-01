// MARGIN-PER-TRACK-1 — the two axes side by side, per track, never pooled.
//
// space-sprint is 61% of the whole residual and 8x the next worst (ALONG-RESIDUAL-1). Pooling the
// tracks would let it write the answer for the other nine, which is exactly the mistake that produced
// today's 90. So every table here is per track, and there is no pooled row.
//
// ── WHAT EACH COLUMN IS FOR ────────────────────────────────────────────────────────────────────
//
//   RESIDUAL SIDE — what lowering the margin BUYS
//     resid%     the frames the director declines, as a share of mid-race LEADER_ZOOM frames.
//     RESID EPS  the number that actually matters. The residual is runs of frames, not independent
//                events — ALONG-RESIDUAL-1 measured 150 episodes behind 3,330 frames, median 18
//                frames long. A per-frame reading makes any change look larger than it is.
//     resid&cut  residual frames on which the leader IS cut — the part of the residual that is a
//     resid ok   fault, and the part that is only bookkeeping. Read these two before anything else:
//                a residual frame is one the director would not GUARANTEE, not one the viewer can
//                see is wrong, and the two counts are nothing like the same size.
//     r0         the bare-box residual, margin 0. Geometry, not policy: it is the CONTROL and must
//                stay flat across the arms.
//
//   COST SIDE — what it PAYS
//     clip%      CORNER OVERFLOW: the leader's drawn body leaving the frame. This is the fault the
//                margin exists to prevent, so it is the direct cost of lowering it.
//     CUT EPS    the same thing in EPISODES, so the two sides of the trade are in one unit. This is
//                the column the recommendation turns on.
//     centre%    share of frames on which the leader rule contributed nothing — the owner's rule
//                ("hold the centreline") stated as one number.
//     on-line%   share on which the WHOLE camera sat on the centreline, corridor shift included.
//     stepP99    the picture's per-frame slide in screen px. The measure the run-in work used.
//     stepMax    the largest single-frame picture movement in the arm.
//     loud       races carrying at least one single-frame movement past the notice threshold.
import { readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIR = arg("dir", "c:/tmp/mar/s1");
const TRACKS = (
  arg("tracks", "space-sprint,river-run,seatrack,dirt-oval") || ""
)
  .split(",")
  .filter(Boolean);
const ARMS = (arg("arms", "ship,m70,m60,m50,m40,m30,m20,m0") || "")
  .split(",")
  .filter(Boolean);
// A movement a viewer would NOTICE — LEADER-LATERAL-BUILD-1's threshold, kept identical so the two
// reports' "loud" columns mean the same thing.
const NOTICE = Number(arg("notice", "120"));

const q = (a, p) =>
  a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN;
const f = (n, d = 1) =>
  n === null || n === undefined || Number.isNaN(n) ? "—" : n.toFixed(d);

/**
 * Maximal runs of flagged frames that are ADJACENT frames. A gap is a new episode.
 *
 * BOTH SIDES OF THE TRADE ARE COUNTED THIS WAY, which is the point. The brief asks for the residual
 * in episodes because 3,330 frames are really 150 runs; the same is true of the CUT frames the trade
 * buys them with, and comparing an episode count against a frame count would flatter whichever side
 * was measured per frame.
 */
const episodes = (rows, key) => {
  const out = [];
  let run = 0;
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i][key]) {
      if (run > 0) out.push(run);
      run = 0;
      continue;
    }
    const cont = run > 0 && rows[i].frame === rows[i - 1].frame + 1;
    if (cont) run += 1;
    else {
      if (run > 0) out.push(run);
      run = 1;
    }
  }
  if (run > 0) out.push(run);
  return out;
};

/** A camStep is a PAN only when the two frames it spans are adjacent. A cut is not a pan. */
const panSteps = (rows) => {
  const out = [];
  for (let i = 1; i < rows.length; i++)
    if (rows[i].camStep !== null && rows[i].frame === rows[i - 1].frame + 1)
      out.push(rows[i].camStep);
  return out;
};

const stats = (payload) => {
  const rows = payload.races.flatMap((r) => r.rows);
  const eps = payload.races
    .flatMap((r) => episodes(r.rows, "residual"))
    .sort((a, b) => a - b);
  const cutEps = payload.races
    .flatMap((r) => episodes(r.rows, "clipped"))
    .sort((a, b) => a - b);
  const steps = payload.races
    .flatMap((r) => panSteps(r.rows))
    .sort((a, b) => a - b);
  const perRace = payload.races.map((R) => {
    const st = panSteps(R.rows);
    return { seed: R.seed, worst: st.length ? Math.max(...st) : 0 };
  });
  return {
    margin: payload.margin,
    races: payload.races.length,
    n: rows.length,
    resid: rows.filter((r) => r.residual).length,
    r0: rows.filter((r) => r.residual0).length,
    clip: rows.filter((r) => r.clipped).length,
    // THE CROSS-TAB THAT DECIDES WHAT THE RESIDUAL IS WORTH. A residual frame is one the director
    // declines because it cannot seat his body with the margin to spare — which is NOT the same as a
    // frame where he is cut. Separating them is the difference between "the camera passed up a shot
    // that was already fine" and "the leader is missing a wheel".
    residClip: rows.filter((r) => r.residual && r.clipped).length,
    residOk: rows.filter((r) => r.residual && !r.clipped).length,
    centre: rows.filter((r) => !(Math.abs(r.leaderExtra ?? 0) > 1e-9)).length,
    // The WHOLE camera's centreline share, not just this rule's delta. `centre%` above says whether
    // the leader rule contributed anything; this says whether the picture was actually on the
    // centreline, corridor shift included — which is what the owner's rule is about.
    onLine: rows.filter((r) => !(Math.abs(r.totalShift ?? 0) > 1e-9)).length,
    eps: eps.length,
    cutEps: cutEps.length,
    cutEpMed: q(cutEps, 0.5),
    epMed: q(eps, 0.5),
    epP95: q(eps, 0.95),
    epMax: eps.at(-1) ?? 0,
    stepMed: q(steps, 0.5),
    stepP99: q(steps, 0.99),
    stepMax: steps.at(-1) ?? 0,
    loud: perRace.filter((r) => r.worst >= NOTICE).length,
  };
};

for (const t of TRACKS) {
  const arms = [];
  for (const a of ARMS) {
    const p = `${DIR}/ma-${t}-${a}.json`;
    if (!existsSync(p)) continue;
    arms.push({ arm: a, ...stats(JSON.parse(readFileSync(p, "utf8"))) });
  }
  if (!arms.length) continue;
  const base = arms.find((x) => x.arm === "ship") ?? arms[0];
  process.stdout.write(
    `\n### ${t} — ${base.races} races, ${base.n} mid-race LEADER_ZOOM frames\n\n`,
  );
  process.stdout.write(
    "| margin | resid | resid% | Δresid | RESID EPS | Δeps | resid&cut | resid ok | r0 |" +
      " clip | clip% | Δclip | **CUT EPS** | Δcut eps | centre% | on-line% | step p99 | step max | loud |\n",
  );
  process.stdout.write(
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n",
  );
  for (const a of arms) {
    const pct = (x) => (a.n ? (100 * x) / a.n : NaN);
    process.stdout.write(
      `| ${a.margin === base.margin ? `**${a.margin}**` : a.margin} | ${a.resid} | ${f(pct(a.resid), 2)} |` +
        ` ${a.resid - base.resid >= 0 ? "+" : ""}${a.resid - base.resid} |` +
        ` ${a.eps} | ${a.eps - base.eps >= 0 ? "+" : ""}${a.eps - base.eps} |` +
        ` ${a.residClip} | ${a.residOk} | ${a.r0} |` +
        ` ${a.clip} | ${f(pct(a.clip), 2)} |` +
        ` ${a.clip - base.clip >= 0 ? "+" : ""}${a.clip - base.clip} |` +
        ` **${a.cutEps}** | ${a.cutEps - base.cutEps >= 0 ? "+" : ""}${a.cutEps - base.cutEps} |` +
        ` ${f(pct(a.centre), 2)} | ${f(pct(a.onLine), 2)} | ${f(a.stepP99)} | ${f(a.stepMax)} |` +
        ` ${a.loud}/${a.races} |\n`,
    );
  }
}
process.stdout.write("\n");

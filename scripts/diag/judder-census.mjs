// ============================================================
// File:        scripts/diag/judder-census.mjs
// Project:     RaceArena — RACE-JUDDER-1 (report-only, changes nothing)
//
// WHERE THE JUMPS AND THE STUTTER ARE, ranked, over a WHOLE race.
//
// ── WHY IT EXISTS ────────────────────────────────────────────────────────────────────────────────
//
// Invariant 4 already runs whole-race and reports zero violations, and the owner still sees jumps.
// Three things could be true and only measurement separates them:
//
//   (a) THE BOUND IS LOOSER THAN HIS EYE — steps that pass are still visible.
//   (b) IT IS A SEQUENCE — many small moves, or alternating directions, which a maximum-step bound
//       cannot see BY CONSTRUCTION: it grades each frame against its predecessor and never looks at
//       the shape of a second.
//   (c) IT IS NOT THE CAMERA — frames arriving unevenly.
//
// ── WHAT IT CAN AND CANNOT ANSWER, STATED FIRST ─────────────────────────────────────────────────
//
// It reads `viewer-invariants --dump`, which runs under a VIRTUAL CLOCK at a fixed step. Measured on
// the subject race, every frame interval is 16 or 17 ms and nothing else — by construction, not by
// luck. **So this file is structurally blind to (c)** and says so rather than reporting a flat
// distribution as if it were evidence of smooth delivery. (c) needs a real-clock run.
//
// ── HOW SCREEN MOVEMENT IS COMPUTED, because it is the whole measurement ─────────────────────────
//
// A world point q sits at screen X = offsetX + q.x * effZoomX. Between two frames it moves by
//
//     dX = d(offsetX) + (X - offsetX_prev) * (d effZoomX / effZoomX_prev)
//
// so the displacement DEPENDS ON WHERE ON THE CANVAS the point is: a pure zoom moves the centre
// hardly at all and the edges a great deal. This reports the worst on-canvas point, evaluated at
// both X edges, which is what the eye actually catches — an edge that jumps while the middle sits
// still is exactly the complaint.
//
// THE Y AXIS IS REPORTED AS PAN ONLY, and that is a declared limitation rather than an oversight:
// the dump carries `effZoomX` and not `effZoomY`, so a Y-axis zoom term cannot be reconstructed from
// it. On this subject (space-sprint, an open track running along X) the X axis is where the race is.
//
// Usage:
//   node scripts/diag/judder-census.mjs --json=<dump.json>            # the whole race
//   node scripts/diag/judder-census.mjs --json=<dump.json> --top=20
// ============================================================

import { readFileSync } from "node:fs";

const ARG = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const JSON_IN = ARG("json", null);
if (!JSON_IN) throw new Error("judder-census: pass --json=<a viewer-invariants --dump file>");
const TOP = Number(ARG("top", 20));
const CW = 1280;
const CH = 720;

const doc = JSON.parse(readFileSync(JSON_IN, "utf8"));
if (!doc.dumps?.length) throw new Error("judder-census: that file carries no dumps — run with --dump");

for (const d of doc.dumps) {
  const F = d.frames;
  if (!F || F.length < 3) throw new Error(`judder-census: ${d.track} has ${F?.length ?? 0} frames`);
  console.log(`\n${"=".repeat(96)}`);
  console.log(`${d.track}  seed ${d.seed}  arm ${d.arm}  —  ${F.length} frames`);
  console.log("=".repeat(96));

  // ── per-frame movement ──────────────────────────────────────────────────────────────────────
  const step = [];
  for (let i = 1; i < F.length; i++) {
    const a = F[i - 1];
    const b = F[i];
    const dOx = b.ox - a.ox;
    const dOy = b.oy - a.oy;
    const r = a.ez > 0 ? (b.ez - a.ez) / a.ez : 0;
    // the worst on-canvas point on the X axis: evaluated at both edges
    const atLeft = dOx + (0 - a.ox) * r;
    const atRight = dOx + (CW - a.ox) * r;
    const worstX = Math.abs(atLeft) > Math.abs(atRight) ? atLeft : atRight;
    step.push({
      i,
      ms: b.ms,
      p: b.p,
      dt: b.ms - a.ms,
      panPx: Math.hypot(dOx, dOy),
      dOx,
      dOy,
      dLn: a.ez > 0 && b.ez > 0 ? Math.log(b.ez / a.ez) : 0,
      worstX,
      absWorst: Math.abs(worstX),
      st: b.st,
      stChanged: b.st !== a.st,
      b: b.b,
      bChanged: b.b !== a.b,
      lerp: b.lerp,
      lerpChanged: b.lerp !== a.lerp,
      leaderIdx: b.leaderIdx,
      leaderChanged: b.leaderIdx !== a.leaderIdx,
      subj: b.leaderIsSubject,
      w: b.w,
    });
  }

  // ── FRAME PACING — reported so its blindness is visible, not hidden ────────────────────────
  const gaps = {};
  for (const s of step) gaps[s.dt] = (gaps[s.dt] || 0) + 1;
  const kinds = Object.keys(gaps).map(Number).sort((x, y) => x - y);
  console.log(`\nFRAME PACING (from the dump's own clock)`);
  console.log(`  intervals present: ${kinds.map((k) => `${k}ms x${gaps[k]}`).join("  ")}`);
  console.log(`  over 20 ms: ${step.filter((s) => s.dt > 20).length}   over 33 ms: ${step.filter((s) => s.dt > 33).length}`);
  if (kinds.length <= 2 && kinds.every((k) => k <= 20))
    console.log(
      `  => THIS IS THE VIRTUAL CLOCK, not delivery. This file cannot speak to (c); a real-clock run must.`
    );

  // ── THE WORST SINGLE FRAMES ────────────────────────────────────────────────────────────────
  const byWorst = [...step].sort((a, b) => b.absWorst - a.absWorst).slice(0, TOP);
  console.log(`\nTHE ${TOP} WORST SINGLE FRAMES, by worst on-canvas movement (X axis)`);
  console.log(
    `  ${"#".padStart(5)} ${"ms".padStart(7)} ${"prog".padStart(7)} ${"worstX".padStart(8)} ${"pan".padStart(7)} ${"dLn".padStart(8)} ${"corr".padStart(7)}  state / binding / what changed`
  );
  for (const s of byWorst) {
    const chg = [
      s.stChanged ? "STATE" : null,
      s.bChanged ? "binding" : null,
      s.lerpChanged ? `lerp->${s.lerp}` : null,
      s.leaderChanged ? "LEADER" : null,
    ]
      .filter(Boolean)
      .join(" ");
    console.log(
      `  ${String(s.i).padStart(5)} ${String(s.ms).padStart(7)} ${s.p.toFixed(4).padStart(7)} ${s.worstX.toFixed(1).padStart(8)} ${s.panPx.toFixed(1).padStart(7)} ${s.dLn.toFixed(4).padStart(8)} ${String(s.w).padStart(7)}  ${s.st}/${s.b}${chg ? "  <- " + chg : ""}`
    );
  }

  // ── THE DISTRIBUTION, so an extreme can be read as an outlier or as the normal condition ───
  const q = (arr, f) => {
    const b = [...arr].sort((x, y) => x - y);
    return b[Math.min(b.length - 1, Math.floor(f * b.length))];
  };
  const all = step.map((s) => s.absWorst);
  console.log(`\nDISTRIBUTION of worst-on-canvas movement per frame (px)`);
  console.log(
    `  p50 ${q(all, 0.5).toFixed(1)}   p90 ${q(all, 0.9).toFixed(1)}   p99 ${q(all, 0.99).toFixed(1)}   p99.9 ${q(all, 0.999).toFixed(1)}   max ${Math.max(...all).toFixed(1)}`
  );
  for (const t of [10, 25, 50, 100, 200, 400]) {
    const n = all.filter((x) => x > t).length;
    console.log(`  over ${String(t).padStart(4)} px: ${String(n).padStart(5)} frames  (${((100 * n) / all.length).toFixed(2)}%)`);
  }

  // ── INVARIANT 4's OWN BOUNDS, and the worst thing that PASSES them ─────────────────────────
  const LN2 = Math.log(2);
  const worstPassPan = Math.max(...step.map((s) => (s.panPx < CW ? s.panPx : 0)));
  const worstPassLn = Math.max(...step.map((s) => (Math.abs(s.dLn) <= LN2 ? Math.abs(s.dLn) : 0)));
  const violPan = step.filter((s) => s.panPx >= CW).length;
  const violLn = step.filter((s) => Math.abs(s.dLn) > LN2).length;
  console.log(`\nINVARIANT 4 — its bounds, and the worst step that PASSES them`);
  console.log(`  bound on pan   : >= ${CW} px in one frame (a whole canvas width).  violations: ${violPan}`);
  console.log(`  bound on width : > ${LN2.toFixed(4)} ln in one frame (a factor of 2).  violations: ${violLn}`);
  console.log(`  worst PASSING pan step : ${worstPassPan.toFixed(1)} px  (${((100 * worstPassPan) / CW).toFixed(1)}% of the canvas)`);
  console.log(
    `  worst PASSING width step: ${worstPassLn.toFixed(4)} ln = a factor of ${Math.exp(worstPassLn).toFixed(3)}, which moves the frame edge ${(worstPassLn * (CW / 2)).toFixed(1)} px`
  );

  // ── THE WORST SEQUENCES — where (b) lives, and nothing else looks for it ───────────────────
  //
  // A window of up to a second, scored two ways: TOTAL movement (how far the picture travelled
  // regardless of direction) and REVERSALS (how many times it changed direction). A smooth pan of
  // 300 px over a second is invisible; 300 px delivered as twenty alternating moves is judder, and
  // a maximum-step bound scores them identically.
  const W = 60;
  const wins = [];
  for (let i = 0; i + W <= step.length; i += 6) {
    const w = step.slice(i, i + W);
    const total = w.reduce((s, x) => s + x.absWorst, 0);
    const net = Math.abs(w.reduce((s, x) => s + x.worstX, 0));
    let rev = 0;
    for (let k = 1; k < w.length; k++) {
      if (Math.abs(w[k].worstX) < 0.5 || Math.abs(w[k - 1].worstX) < 0.5) continue;
      if (Math.sign(w[k].worstX) !== Math.sign(w[k - 1].worstX)) rev++;
    }
    wins.push({ i, ms: w[0].ms, p: w[0].p, total, net, rev, waste: total - net, st: w[0].st });
  }
  const byTotal = [...wins].sort((a, b) => b.total - a.total).slice(0, 10);
  console.log(`\nTHE 10 WORST SECONDS by TOTAL movement`);
  console.log(`  ${"ms".padStart(7)} ${"prog".padStart(7)} ${"total".padStart(9)} ${"net".padStart(9)} ${"wasted".padStart(9)} ${"revs".padStart(5)}  state`);
  for (const w of byTotal)
    console.log(
      `  ${String(w.ms).padStart(7)} ${w.p.toFixed(4).padStart(7)} ${w.total.toFixed(0).padStart(9)} ${w.net.toFixed(0).padStart(9)} ${w.waste.toFixed(0).padStart(9)} ${String(w.rev).padStart(5)}  ${w.st}`
    );
  const byRev = [...wins].sort((a, b) => b.rev - a.rev || b.total - a.total).slice(0, 10);
  console.log(`\nTHE 10 WORST SECONDS by DIRECTION REVERSALS — this is what a step bound cannot see`);
  console.log(`  ${"ms".padStart(7)} ${"prog".padStart(7)} ${"revs".padStart(5)} ${"total".padStart(9)} ${"net".padStart(9)}  state`);
  for (const w of byRev)
    console.log(
      `  ${String(w.ms).padStart(7)} ${w.p.toFixed(4).padStart(7)} ${String(w.rev).padStart(5)} ${w.total.toFixed(0).padStart(9)} ${w.net.toFixed(0).padStart(9)}  ${w.st}`
    );
  const revAll = wins.map((w) => w.rev);
  console.log(
    `  reversals per second — p50 ${q(revAll, 0.5)}  p90 ${q(revAll, 0.9)}  max ${Math.max(...revAll)}   (of ${W - 1} possible)`
  );

  // ── DO THE WORST FRAMES COINCIDE WITH ANYTHING NAMEABLE? ───────────────────────────────────
  const worst100 = [...step].sort((a, b) => b.absWorst - a.absWorst).slice(0, 100);
  const share = (pred) => `${worst100.filter(pred).length}/100`;
  console.log(`\nWHAT THE 100 WORST FRAMES COINCIDE WITH`);
  console.log(`  a STATE change      : ${share((s) => s.stChanged)}   (all frames: ${step.filter((s) => s.stChanged).length})`);
  console.log(`  a BINDING change    : ${share((s) => s.bChanged)}   (all frames: ${step.filter((s) => s.bChanged).length})`);
  console.log(`  a LERP-phase change : ${share((s) => s.lerpChanged)}   (all frames: ${step.filter((s) => s.lerpChanged).length})`);
  console.log(`  a LEADER change     : ${share((s) => s.leaderChanged)}   (all frames: ${step.filter((s) => s.leaderChanged).length})`);
  const byState = {};
  for (const s of worst100) byState[s.st] = (byState[s.st] || 0) + 1;
  console.log(`  by state            : ${Object.entries(byState).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  const byBind = {};
  for (const s of worst100) byBind[s.b] = (byBind[s.b] || 0) + 1;
  console.log(`  by binding term     : ${Object.entries(byBind).map(([k, v]) => `${k} ${v}`).join(", ")}`);
}

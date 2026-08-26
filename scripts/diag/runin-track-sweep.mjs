// RUNIN-ALL-TRACKS-10-1 — the per-track confirmation table. MEASURE ONLY, reads JSON, prints tables.
//
// It computes nothing new: the corner figure is `runin-camera-motion.mjs`'s, the across-track figure
// is `runin-aim-sum.mjs`'s, and the perceptibility rule is the one both already use. What this adds
// is the per-TRACK reduction and — the part that matters most — an explicit accounting of races that
// yielded NO usable frames.
//
// ── A ZERO IS A FINDING, NOT AN ABSENT ROW ─────────────────────────────────────────────────────
//
// A race whose closing phase produced no frames is reported by name, and a track where that happens
// is marked NO DATA rather than being given a blank or, worse, a flattering number computed from the
// races that did work. This project has paid for the silent zero three times — the harness that gave
// up 200 s into a 212 s race, the orphan count that came back 0 because a `rev-list` failed with its
// error swallowed, and the fingerprint that read a missing metric as zero and reversed a decision.
import { readFileSync, existsSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const DIR = arg("dir", "c:/tmp/all10");
const TRACKS = (arg("tracks", "") || "").split(",").filter(Boolean);
const RATIO = Number(arg("ratio", "5"));
const FLOOR = Number(arg("floor", "0.01"));

const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);
const f = (n, d = 2) => (n === null || n === undefined ? "   —  " : n.toFixed(d).padStart(7));

// The closing window: from the trace's start to the finish-overview handoff.
const win = (R) => {
  const e = R.rows.findIndex((r) => r.inFinishMode === true);
  return (e === -1 ? R.rows : R.rows.slice(0, e)).filter((r) => r.camCentre && r.visibleW > 0);
};

const out = [];
for (const t of TRACKS) {
  const p = `${DIR}/aim-axes-${t}.json`;
  if (!existsSync(p)) {
    out.push({ t, missing: true });
    continue;
  }
  const races = JSON.parse(readFileSync(p, "utf8"));
  const empty = [];
  let worstCorner = null;
  let worstAcross = null;
  let noticeable = 0;
  let frames = 0;
  for (const R of races) {
    const rows = win(R);
    if (rows.length < 2) {
      empty.push(R.case.seed);
      continue;
    }
    frames += rows.length;
    const steps = [];
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1];
      const b = rows[i];
      const dWorld = hyp(a.camCentre, b.camCentre);
      const panPx = dWorld * b.effXNow;
      const zoomPx = Math.hypot(
        (a.visibleW / 2) * (b.effXNow - a.effXNow),
        (a.visibleH / 2) * (b.effYNow - a.effYNow)
      );
      steps.push({ dWorld, frac: dWorld / b.visibleW, totalPx: panPx + zoomPx });
    }
    const m = med(steps.map((s) => s.dWorld));
    const wc = Math.max(...steps.map((s) => s.totalPx));
    if (!worstCorner || wc > worstCorner.v) worstCorner = { v: wc, seed: R.case.seed };
    if (steps.some((s) => s.dWorld > RATIO * m && s.frac > FLOOR)) noticeable++;
    const am = rows.filter((r) => r.subjectMiss);
    if (am.length > 1) {
      let wa = 0;
      for (let i = 1; i < am.length; i++)
        wa = Math.max(wa, Math.abs(am[i].subjectMiss.across - am[i - 1].subjectMiss.across));
      const peak = Math.max(...am.map((r) => Math.abs(r.subjectMiss.across)));
      if (!worstAcross || peak > worstAcross.v) worstAcross = { v: peak, seed: R.case.seed, jump: wa };
    }
  }
  out.push({ t, races: races.length, empty, worstCorner, worstAcross, noticeable, frames });
}

console.log("\nPER TRACK — ten races each, seeds 1-10, browser camera seeding");
console.log(
  "track              races  usable  frames   worst CORNER px (seed)   worst ACROSS px (seed)   noticeable"
);
for (const r of out) {
  if (r.missing) {
    console.log(`${r.t.padEnd(18)}  ** NO FILE — the run did not produce output for this track **`);
    continue;
  }
  const usable = r.races - r.empty.length;
  if (usable === 0) {
    console.log(
      `${r.t.padEnd(18)} ${String(r.races).padStart(5)} ${String(usable).padStart(7)}   ` +
        `** NO DATA — every race yielded an empty closing window; seeds ${r.empty.join(",")} **`
    );
    continue;
  }
  console.log(
    r.t.padEnd(18),
    String(r.races).padStart(5),
    String(usable).padStart(7),
    String(r.frames).padStart(7),
    `   ${f(r.worstCorner.v)} (s${r.worstCorner.seed})`.padEnd(24),
    `  ${f(r.worstAcross?.v)} (s${r.worstAcross?.seed})`.padEnd(24),
    String(r.noticeable).padStart(6) + (r.empty.length ? `   [${r.empty.length} empty: ${r.empty.join(",")}]` : "")
  );
}

const good = out.filter((r) => !r.missing && r.worstCorner);
if (good.length) {
  const wc = good.reduce((m, r) => (r.worstCorner.v > m.worstCorner.v ? r : m));
  const wa = good.filter((r) => r.worstAcross).reduce((m, r) => (r.worstAcross.v > m.worstAcross.v ? r : m));
  console.log(
    `\nPOOLED over ${good.length} track(s): worst corner ${wc.worstCorner.v.toFixed(2)} px ` +
      `(${wc.t} seed ${wc.worstCorner.seed}); worst across ${wa.worstAcross.v.toFixed(2)} px ` +
      `(${wa.t} seed ${wa.worstAcross.seed}); ` +
      `${good.reduce((n, r) => n + r.noticeable, 0)} race(s) carry a noticeable movement; ` +
      `${good.reduce((n, r) => n + r.empty.length, 0)} race(s) yielded no closing window.`
  );
}

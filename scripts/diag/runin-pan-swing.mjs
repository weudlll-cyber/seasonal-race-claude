// RUNIN-PAN-STALE-ZOOM-1 — THE ACCEPTANCE READING, TAKEN OFF THE ANATOMY TRACE.
//
// It computes nothing new. Every quantity below is one of the columns RUNIN-SEED13-ANATOMY-1
// tabulated, re-derived from `runin-anatomy.mjs`'s own per-frame rows so a built tree can be put
// beside the measurement it was built on and the two compared column for column.
//
// THE THREE QUANTITIES, AND WHY EACH IS THE ONE THE REPORT USED:
//
//   peak framing error  = max |anchorScreenTarget - anchorAt|. `anchorScreenTarget` is the anchor
//                         projected at the DRAWN zoom using the TARGET offsets; `anchorAt` is where
//                         the framing rule intended the anchor to sit. Their difference is the
//                         framing error OF THE AIM — not of the delivered picture, which also
//                         carries the smoother's own residual. This is the quantity the shipped
//                         invariant-6 note means by "the framing error of the pan TARGET grew to
//                         554 x 382 px", and it is the one the correction is supposed to collapse.
//
//   leader off canvas   = frames whose `leaderScreen` lies outside the 1280x720 store. The canvas is
//                         a FIXED store (CANVAS-SCALE-1), so this is a count, not a share.
//
//   travel after settle = the path length of `anchorScreen` over the frames from the first one where
//                         the width is within 1% of its final value to the end of the trace. This is
//                         the owner's own description — "the camera moves around without changing
//                         the zoom" — expressed as a number.
//
// MEASURE ONLY. It reads JSON and writes a table.
import { readFileSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const BEFORE = arg("before", null);
const AFTER = arg("after", null);
const CW = 1280;
const CH = 720;
const SETTLE = Number(arg("settle", "0.01")); // "flat within 1%"
const HOME = Number(arg("home", "40")); // the report's "back within 40 px"

const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function readRuns(path) {
  const races = new Map();
  for (const r of JSON.parse(readFileSync(path, "utf8"))) {
    races.set(`${r.case.track}:${r.case.racers}:${r.case.seed}`, r);
  }
  return races;
}

// THE WINDOW IS THE EVENT, AND GETTING IT WRONG SILENTLY IS EASY. Event two runs from the crossing
// to the frame the state hands to the finish overview — RUNIN-SEED13-ANATOMY-1 measured that handoff
// at 1.77 s on seed 13 and called it the ONE re-targeting event in the trace. Past it the anchor
// becomes the fixed lookback point and the ending widens the shot to 450 px, so a window that runs
// to the end of the trace measures the ending instead and reports errors an order of magnitude too
// large. `inFinishMode` is the flag that turns on at exactly that handoff.
function windowRows(race) {
  const post = race.rows.filter((r) => r.ts >= race.crossTs);
  const end = post.findIndex((r) => r.inFinishMode === true);
  return end === -1 ? post : post.slice(0, end);
}

function measure(race) {
  const win = windowRows(race);
  const rows = win.filter((r) => r.anchorScreenTarget && r.anchorAt);
  if (!rows.length) return null;
  const cross = race.crossTs;

  // ── the aim's framing error, and when it peaks / comes home ───────────────────────────────────
  let peak = 0;
  let peakAt = null;
  for (const r of rows) {
    const e = hyp(r.anchorScreenTarget, r.anchorAt);
    if (e > peak) {
      peak = e;
      peakAt = r.ts;
    }
  }
  // "back within HOME px" — the first frame at or after the peak from which it never again exceeds.
  let home = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (hyp(rows[i].anchorScreenTarget, rows[i].anchorAt) > HOME) {
      home = rows[i + 1]?.ts ?? null;
      break;
    }
  }

  // ── THE SAME ERROR IN THE DELIVERED PICTURE — the column RUNIN-SEED13-ANATOMY-1 §4 tabulated ──
  //
  // §4's "peak framing error" is the SUBJECT's displacement from where the framing rule wanted him,
  // measured on the picture the viewer sees (`anchorScreen`), not on the aim. It is the smaller of
  // the two numbers because the smoother has not finished delivering the aim's error yet — which is
  // exactly why the report calls it "from dead centre to 973 px off it and back". Recorded here so
  // the built tree can be checked against the recorded figure rather than against a proxy.
  let peakD = 0;
  let peakDAt = null;
  for (const r of rows) {
    const e = hyp(r.anchorScreen ?? r.anchorAt, r.anchorAt);
    if (e > peakD) {
      peakD = e;
      peakDAt = r.ts;
    }
  }
  let homeD = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (hyp(rows[i].anchorScreen ?? rows[i].anchorAt, rows[i].anchorAt) > HOME) {
      homeD = rows[i + 1]?.ts ?? null;
      break;
    }
  }

  // ── leader off the fixed store ────────────────────────────────────────────────────────────────
  const off = win.filter(
    (r) =>
      r.leaderScreen &&
      (r.leaderScreen.x < 0 || r.leaderScreen.x > CW || r.leaderScreen.y < 0 || r.leaderScreen.y > CH)
  ).length;

  // ── the picture still moving once the size has arrived ────────────────────────────────────────
  // DELIVERED width, not the demand. `widthPx` is what the framing rule ASKED for and it is a flat
  // 120 across this whole window; the quantity the owner can see settling — "flat within 1%" —
  // is the width the shot actually has, which is what `deliveredWidthPx` records.
  const wRows = win.filter((r) => r.deliveredWidthPx > 0 && r.anchorScreen);
  const finalW = wRows.length ? wRows[wRows.length - 1].deliveredWidthPx : 0;
  let settleIdx = -1;
  for (let i = 0; i < wRows.length; i++) {
    if (finalW > 0 && Math.abs(wRows[i].deliveredWidthPx - finalW) / finalW <= SETTLE) {
      // it must STAY flat from here, or it is not the settle point
      if (wRows.slice(i).every((r) => Math.abs(r.deliveredWidthPx - finalW) / finalW <= SETTLE)) {
        settleIdx = i;
        break;
      }
    }
  }
  let travel = 0;
  let worst = 0;
  let dur = 0;
  let wFrom = null;
  if (settleIdx >= 0) {
    const seg = wRows.slice(settleIdx);
    wFrom = seg[0].deliveredWidthPx;
    dur = (seg[seg.length - 1].ts - seg[0].ts) / 1000;
    for (let i = 1; i < seg.length; i++) {
      const d = hyp(seg[i].anchorScreen, seg[i - 1].anchorScreen);
      travel += d;
      if (d > worst) worst = d;
    }
  }

  return {
    peak,
    peakD,
    peakDAtS: peakDAt === null || cross == null ? null : (peakDAt - cross) / 1000,
    homeDS: homeD === null || cross == null ? null : (homeD - cross) / 1000,
    peakAtS: peakAt === null || cross == null ? null : (peakAt - cross) / 1000,
    homeS: home === null || cross == null ? null : (home - cross) / 1000,
    off,
    dur,
    wFrom,
    finalW,
    travel,
    worst,
    frames: race.frames,
  };
}

const before = BEFORE ? readRuns(BEFORE) : null;
const after = readRuns(AFTER);

const f1 = (n) => (n === null || n === undefined ? "  —  " : n.toFixed(1).padStart(7));
const f2 = (n) => (n === null || n === undefined ? "  —  " : n.toFixed(2).padStart(6));

console.log("\nPEAK FRAMING ERROR OF THE AIM, AND THE LEADER ON THE FIXED 1280x720 STORE");
console.log(
  "race                             before px   after px   removed   off-canvas b->a   peak at s   home at s"
);
const rows = [];
for (const [key, aRace] of after) {
  const a = measure(aRace);
  const b = before?.has(key) ? measure(before.get(key)) : null;
  if (!a) continue;
  const removed = b && b.peak > 0 ? (1 - a.peak / b.peak) * 100 : null;
  rows.push({ key, a, b, removed });
  console.log(
    `${key.padEnd(30)} ${f1(b?.peak)}   ${f1(a.peak)}   ${
      removed === null ? "  —  " : `${removed.toFixed(0).padStart(4)}%`
    }      ${String(b?.off ?? "—").padStart(4)} -> ${String(a.off).padEnd(5)}   ${f2(a.peakAtS)}     ${f2(a.homeS)}`
  );
}

console.log("\nTHE PICTURE ONCE THE SIZE HAS ARRIVED (width flat within 1% to end of trace)");
console.log(
  "race                             dur s   width px        travel before   travel after   removed   worst frame b->a"
);
for (const { key, a, b } of rows) {
  const rem = b && b.travel > 0 ? (1 - a.travel / b.travel) * 100 : null;
  console.log(
    `${key.padEnd(30)} ${f2(a.dur)}   ${f1(a.wFrom)} -> ${f1(a.finalW)}   ${f1(b?.travel)}   ${f1(
      a.travel
    )}   ${rem === null ? "  —  " : `${rem.toFixed(0).padStart(4)}%`}    ${f1(b?.worst)} -> ${f1(a.worst)}`
  );
}

console.log("\nTHE DELIVERED PICTURE — the column RUNIN-SEED13-ANATOMY-1 section 4 recorded");
console.log(
  "race                             before px   after px   removed   peak at s   back within 40px s"
);
for (const { key, a, b } of rows) {
  const rem = b && b.peakD > 0 ? (1 - a.peakD / b.peakD) * 100 : null;
  console.log(
    `${key.padEnd(30)} ${f1(b?.peakD)}   ${f1(a.peakD)}   ${
      rem === null ? "  —  " : `${rem.toFixed(0).padStart(4)}%`
    }      ${f2(b?.peakDAtS)}          ${f2(b?.homeDS)} -> ${f2(a.homeDS)}`
  );
}

if (before) {
  const bt = rows.reduce((s, r) => s + (r.b?.peak ?? 0), 0);
  const at = rows.reduce((s, r) => s + r.a.peak, 0);
  const boff = rows.reduce((s, r) => s + (r.b?.off ?? 0), 0);
  const aoff = rows.reduce((s, r) => s + r.a.off, 0);
  console.log(
    `\nPOOLED over ${rows.length} races: peak aim error ${bt.toFixed(0)} -> ${at.toFixed(0)} px ` +
      `(${((1 - at / bt) * 100).toFixed(1)}% removed); leader off canvas ${boff} -> ${aoff} frames.`
  );
}

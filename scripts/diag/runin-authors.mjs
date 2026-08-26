// RUNIN-VIABLE-1 PART B — HOW MANY MECHANISMS ARE HOLDING THE WIDTH, AND HOW OFTEN IT CHANGES HANDS.
//
// The inventory in the report is read off the SOURCE. This measures the part a source reading cannot
// settle: how many of those mechanisms are actually live at once in a real closing stretch, and how
// often the one that SETS the width hands over to another.
//
// WHY HANDOVERS ARE THE QUANTITY. Every width authority is a bound composed with `min` (or, for the
// corridor cap and the ratchet, with `max`). While one bound is the argmin it alone sets the width,
// and the shot moves as smoothly as that bound does. The moment a DIFFERENT bound becomes the argmin
// the width starts following a curve with a different slope — and nothing in the composition makes
// the two agree at the crossover, because `min` is continuous in value but not in derivative. A
// handover is therefore the exact place a step can appear without any single mechanism being wrong.
// Counting them measures the interaction surface directly.
//
// MEASURE ONLY. Reads the anatomy trace and the aim trace and prints tables.
import { readFileSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const ANAT = arg("anatomy", null);
const AIM = arg("aim", null);
const STEP = Number(arg("step", "0.02")); // ln of width; 0.02 ~ 2%, well below the eye's threshold

const anat = JSON.parse(readFileSync(ANAT, "utf8"));
const aim = AIM ? JSON.parse(readFileSync(AIM, "utf8")) : null;
const keyOf = (R) => `${R.case.track}:${R.case.racers}:${R.case.seed}`;
const aimBy = new Map((aim ?? []).map((R) => [keyOf(R), R]));

const win = (rows) => {
  const e = rows.findIndex((r) => r.inFinishMode === true);
  return e === -1 ? rows : rows.slice(0, e);
};

console.log("\n(B1) HOW MANY WIDTH AUTHORITIES ARE LIVE AT ONCE — per frame, over the closing window");
console.log("race                        frames   mean live   max live   distinct binding authors");
const rowsAll = [];
for (const R of anat) {
  const rows = win(R.rows).filter((r) => r.ceilings);
  const live = rows.map(
    (r) =>
      Object.values(r.ceilings).filter((v) => v !== null && Number.isFinite(v)).length +
      (r.ratchet !== null ? 1 : 0) +
      (r.levelCeiling !== null ? 1 : 0)
  );
  const authors = new Set(rows.map((r) => r.binding).filter(Boolean));
  rowsAll.push({ key: keyOf(R), rows });
  console.log(
    keyOf(R).padEnd(28),
    String(rows.length).padStart(6),
    (live.reduce((a, b) => a + b, 0) / (live.length || 1)).toFixed(2).padStart(11),
    String(Math.max(...live)).padStart(10),
    "   " + [...authors].join(",")
  );
}

console.log("\n(B2) HOW OFTEN DOES THE WIDTH CHANGE HANDS, AND WHAT DOES THE HANDOVER COST?");
console.log(
  "race                        handovers   steps>2%   of which ON a handover   worst step at handover"
);
let TH = 0, TS = 0, TSH = 0;
for (const { key, rows } of rowsAll) {
  let hand = 0, steps = 0, onHand = 0, worst = 0;
  const pairs = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    const changed = a.binding !== b.binding;
    if (changed) {
      hand++;
      pairs.push(`${a.binding}->${b.binding}`);
    }
    if (a.deliveredWidthPx > 0 && b.deliveredWidthPx > 0) {
      const d = Math.abs(Math.log(b.deliveredWidthPx / a.deliveredWidthPx));
      if (d > STEP) {
        steps++;
        if (changed) {
          onHand++;
          worst = Math.max(worst, d);
        }
      }
    }
  }
  TH += hand; TS += steps; TSH += onHand;
  console.log(
    key.padEnd(28),
    String(hand).padStart(9),
    String(steps).padStart(10),
    String(onHand).padStart(23),
    worst.toFixed(3).padStart(23)
  );
}
console.log(
  `\nPOOLED: ${TH} handovers, ${TS} width steps over 2%, ${TSH} of them (${TS ? ((TSH / TS) * 100).toFixed(0) : "—"}%) land on a frame where the width changed hands.`
);

console.log("\n(B3) WHICH PAIRS ACTUALLY MEET — every observed handover, counted");
const pairCount = new Map();
for (const { rows } of rowsAll) {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i - 1].binding !== rows[i].binding) {
      const k = `${rows[i - 1].binding} -> ${rows[i].binding}`;
      pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
    }
  }
}
for (const [k, v] of [...pairCount].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(v).padStart(4)}x   ${k}`);
}

if (aim) {
  console.log("\n(B4) DO THE SIDEWAYS JOLTS LAND ON HANDOVERS TOO?");
  console.log("race                        across jumps>4px   on a handover frame   on a width step");
  let J = 0, JH = 0, JS = 0;
  for (const { key, rows } of rowsAll) {
    const A = aimBy.get(key);
    if (!A) continue;
    const ar = win(A.rows).filter((r) => r.subjectMiss);
    const byFrame = new Map(rows.map((r) => [r.frame, r]));
    let j = 0, jh = 0, js = 0;
    for (let i = 1; i < ar.length; i++) {
      const d = Math.abs(ar[i].subjectMiss.across - ar[i - 1].subjectMiss.across);
      if (d <= 4) continue;
      j++;
      const b = byFrame.get(ar[i].frame);
      const a = byFrame.get(ar[i - 1].frame);
      if (a && b && a.binding !== b.binding) jh++;
      if (a && b && a.deliveredWidthPx > 0 && b.deliveredWidthPx > 0) {
        if (Math.abs(Math.log(b.deliveredWidthPx / a.deliveredWidthPx)) > STEP) js++;
      }
    }
    J += j; JH += jh; JS += js;
    console.log(key.padEnd(28), String(j).padStart(16), String(jh).padStart(21), String(js).padStart(17));
  }
  console.log(
    `\nPOOLED: ${J} sideways jumps; ${JH} on a handover frame; ${JS} on a frame whose width moved more than 2%.`
  );
}

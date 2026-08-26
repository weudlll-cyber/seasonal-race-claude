// RUNIN-PIVOT-SCOPE-1 PART B — HOW FAR THE CAMERA MOVES, WHICH IS NOT HOW FAR A RACER MOVES.
//
// THE GAP THIS CLOSES. Every figure this strand has published — 59 px, 973 px, 2,427 px — measures a
// RACER's displacement inside the picture. The owner is describing the VIEW moving. A camera can
// travel a long way while the racer it follows barely shifts on screen, because the racer travels
// with it; and a shot can be visibly tearing while the subject sits still. Those are different
// quantities and only the first had ever been measured.
//
// THE FOUR SERIES, and the unit each is in:
//
//   (a) CAMERA MOTION      how far the view centre travels between two frames, in world px AND as a
//                          fraction of the visible frame width. The fraction is the perceptual unit:
//                          moving half a frame in one step looks the same whether the frame is 400
//                          world px wide or 4,000.
//
//   (b) BACKGROUND SLIDE   how far the world slides across the SCREEN between two frames, in screen
//                          px. Two parts, reported separately because they look different:
//                            - the PAN term, `|d camCentre| x eff`, which slides the whole picture;
//                            - the ZOOM term, which expands or contracts it about the centre and so
//                              grows with distance from it. Measured at the frame corner, which is
//                              where it is largest and where a viewer sees it first.
//                          This is what makes a jolt visible. A racer held steady while the world
//                          tears past is exactly "it jumps back and forth very fast".
//
//   (c) RANKED EVENTS      every fast camera movement, one row each, with its cause named per event.
//
//   (d) PERCEPTIBILITY     decided by comparison, not asserted. See PERCEPTIBLE below.
//
// MEASURE ONLY. Reads JSON, prints tables.
import { readFileSync } from "node:fs";

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const IN = arg("in", null);
const LABEL = arg("label", "");
const TOP = Number(arg("top", "12"));

// ── HOW "WOULD A VIEWER PERCEIVE IT" IS DECIDED ────────────────────────────────────────────────
//
// NOT by a psychophysical constant I would be inventing. By comparison with the shot's own ordinary
// motion: the eye notices a DISCONTINUITY — a frame that moves far more than the frames around it —
// far more readily than it notices steady speed. So a frame counts as perceptible when it clears
// BOTH of these, and the report states both numbers so the reader can move the line:
//
//   - it moves more than 5x the median per-frame motion of that same race's closing phase, and
//   - it moves more than 1% of the visible frame width, which at 1280 px is ~13 screen px.
//
// The first is what makes it a jolt rather than a pan; the second stops a race that is almost
// perfectly still from reporting its own noise as an event.
const RATIO = Number(arg("ratio", "5"));
const FLOOR = Number(arg("floor", "0.01"));

const races = JSON.parse(readFileSync(IN, "utf8"));
const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const f = (n, d = 2) => (n === null || n === undefined ? "    —   " : n.toFixed(d).padStart(8));
const pct = (n) => (n === null || n === undefined ? "   —  " : (n * 100).toFixed(2).padStart(6));

// The window: the closing phase, ending where the finish overview takes over.
const windowOf = (R) => {
  const e = R.rows.findIndex((r) => r.inFinishMode === true);
  const w = e === -1 ? R.rows : R.rows.slice(0, e);
  return w.filter((r) => r.camCentre && r.visibleW > 0);
};

const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);
const pctl = (a, p) =>
  a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;

const all = [];
for (const R of races) {
  const rows = windowOf(R);
  const steps = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    const dWorld = hyp(a.camCentre, b.camCentre);
    const frac = b.visibleW > 0 ? dWorld / b.visibleW : 0;
    // (b) the two halves of what the screen shows.
    const panPx = dWorld * b.effXNow;
    // The zoom term at the frame corner: a point half a frame from centre moves by
    // halfFrameWorld x (e1 - e0) on each axis when the scale changes.
    const zoomPx = Math.hypot(
      (a.visibleW / 2) * (b.effXNow - a.effXNow),
      (a.visibleH / 2) * (b.effYNow - a.effYNow)
    );
    steps.push({ i, a, b, dWorld, frac, panPx, zoomPx, totalPx: panPx + zoomPx });
  }
  const med = median(steps.map((s) => s.dWorld));
  all.push({
    key: `${R.case.track}:${R.case.racers}:${R.case.seed}`,
    R,
    rows,
    steps,
    med,
  });
}

console.log(`\n(a) THE CAMERA'S OWN MOTION PER FRAME${LABEL ? " — " + LABEL : ""}`);
console.log(
  "race                        frames   median world   p95 world   WORST world   worst as % of frame   at s from crossing"
);
for (const { key, R, steps, med } of all) {
  const worst = steps.reduce((m, s) => (s.dWorld > m.dWorld ? s : m), steps[0]);
  const atS = R.crossTs == null ? null : (worst.b.ts - R.crossTs) / 1000;
  console.log(
    key.padEnd(28),
    String(steps.length).padStart(6),
    f(med),
    f(pctl(steps.map((s) => s.dWorld), 0.95)),
    f(worst.dWorld),
    "     " + pct(worst.frac) + "%",
    "        " + f(atS)
  );
}

console.log(`\n(b) WHAT THE SCREEN SHOWS — the world sliding across it, in screen px per frame`);
console.log(
  "race                        worst PAN px   worst ZOOM px (corner)   worst TOTAL px   median total"
);
for (const { key, steps } of all) {
  console.log(
    key.padEnd(28),
    f(Math.max(...steps.map((s) => s.panPx))),
    "      " + f(Math.max(...steps.map((s) => s.zoomPx))),
    "         " + f(Math.max(...steps.map((s) => s.totalPx))),
    f(median(steps.map((s) => s.totalPx)))
  );
}

// ── (c0) RANKED BY WHAT HE ACTUALLY SEES: THE CORNER ───────────────────────────────────────────
//
// RUNIN-EASED-ADMIT-1 asks the question in the owner's unit: the largest single-frame movement of
// the picture AT THE FRAME CORNER, which is where the zoom term is largest. Each row is charged to
// the level set's own direction — an ADMIT widens the demand, a RELEASE relaxes it — and separately
// to whether the width changed hands between `state` and `level` on that frame, because a crossover
// is a different fault with a different repair and an eased admit cannot remove it.
console.log(`\n(c0) THE BIGGEST SINGLE-FRAME MOVEMENT AT THE CORNER, per race — and what caused it`);
console.log(
  "race                          s     corner px   pan px   zoom px   set     binding        kind"
);
const kinds = { ADMIT: 0, RELEASE: 0, CROSSOVER: 0, 'ADMIT+CROSSOVER': 0, 'RELEASE+CROSSOVER': 0, OTHER: 0 };
for (const { key, R, steps } of all) {
  const w = steps.reduce((m, s) => (s.totalPx > m.totalPx ? s : m), steps[0]);
  const dSet = (w.b.levelSetSize ?? 0) - (w.a.levelSetSize ?? 0);
  const cross = w.a.binding !== w.b.binding;
  let kind = dSet > 0 ? 'ADMIT' : dSet < 0 ? 'RELEASE' : cross ? 'CROSSOVER' : 'OTHER';
  if (dSet !== 0 && cross) kind += '+CROSSOVER';
  kinds[kind] = (kinds[kind] ?? 0) + 1;
  console.log(
    key.padEnd(28),
    f(R.crossTs == null ? null : (w.b.ts - R.crossTs) / 1000),
    f(w.totalPx),
    f(w.panPx),
    f(w.zoomPx),
    ` ${String(w.a.levelSetSize)}->${String(w.b.levelSetSize)}`.padEnd(8),
    `${w.a.binding}->${w.b.binding}`.padEnd(14),
    kind
  );
}
console.log(
  '   worst-frame causes: ' +
    Object.entries(kinds)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join('  ')
);

console.log(
  `\n(c) EVERY FAST CAMERA MOVEMENT, RANKED — perceptible = >${RATIO}x that race's median AND >${(FLOOR * 100).toFixed(0)}% of frame width`
);
console.log(
  "race                          s      world px   % frame   screen px   PERCEIVED?   cause"
);
const events = [];
for (const { key, R, steps, med } of all) {
  for (const s of steps) {
    const perceptible = s.dWorld > RATIO * med && s.frac > FLOOR;
    if (!perceptible) continue;
    // ── THE CAUSE, NAMED PER EVENT, in priority order of what actually moved on that frame ──────
    const causes = [];
    if (s.a.binding !== s.b.binding) causes.push(`width changed hands ${s.a.binding}->${s.b.binding}`);
    if (Math.abs(s.b.effXNow / s.a.effXNow - 1) > 0.02)
      causes.push(`zoom moved x${(s.b.effXNow / s.a.effXNow).toFixed(2)}`);
    if (s.a.state !== s.b.state) causes.push(`state ${s.a.state}->${s.b.state}`);
    if (String(s.a.pair) !== String(s.b.pair)) causes.push(`pair ${s.a.pair}->${s.b.pair}`);
    if (s.a.levelSetSize !== s.b.levelSetSize)
      causes.push(`level set ${s.a.levelSetSize}->${s.b.levelSetSize}`);
    if (s.a.lerpPhase !== s.b.lerpPhase) causes.push(`phase ${s.a.lerpPhase}->${s.b.lerpPhase}`);
    if (s.b.panClamped) causes.push("pan clamped to world edge");
    if (!causes.length) causes.push("NONE IDENTIFIED");
    events.push({
      key,
      s,
      atS: R.crossTs == null ? null : (s.b.ts - R.crossTs) / 1000,
      cause: causes.join(" + "),
    });
  }
}
events.sort((x, y) => y.s.dWorld - x.s.dWorld);
for (const e of events.slice(0, TOP)) {
  console.log(
    e.key.padEnd(28),
    f(e.atS),
    f(e.s.dWorld),
    "  " + pct(e.s.frac) + "%",
    "  " + f(e.s.totalPx),
    "      YES     ",
    e.cause
  );
}
console.log(
  `\n   ${events.length} perceptible event(s) over ${all.length} races; ${Math.max(0, events.length - TOP)} not listed above the top ${TOP}.`
);
const belowFloor = all.reduce(
  (n, { steps, med }) => n + steps.filter((s) => s.dWorld > RATIO * med && s.frac <= FLOOR).length,
  0
);
console.log(
  `   ${belowFloor} frame(s) cleared the ${RATIO}x ratio but not the ${(FLOOR * 100).toFixed(0)}%-of-frame floor, and are reported as BELOW NOTICE rather than dropped.`
);

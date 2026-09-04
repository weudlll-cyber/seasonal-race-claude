// ============================================================
// File:        scripts/endgame-sheet.mjs
// Project:     RaceArena — ENDGAME-COMPLETE-1
//
// THE ACCEPTANCE SHEET. His twelve requirements for the finish, graded TOGETHER, on the picture, in
// the real browser, on the production build, with the browser's own camera seed.
//
// ── WHY IT EXISTS ─────────────────────────────────────────────────────────────────────────────
//
// Every block in this thread repaired ONE symptom and reported the numbers of that symptom. Nothing
// checked whether the other requirements still held, so each fix broke or exposed something else:
// the carried ramp traded a strobe's stagnation for its amplitude, the line floor cost the arrival
// factor, the contention watch gained fourteen frames and lost eleven. His requirements never
// changed. What was missing is this file.
//
// ── IT GRADES THE PICTURE, AND SAYS SO WHEN IT CANNOT ─────────────────────────────────────────
//
// Three figures in this thread were green while his eye disagreed, and each was a proxy: a smoothed
// smoothness figure that averaged away a 0.2206 ln single-frame jump; a percentage that counted a
// black screen as a twelfth of a share; an arrival check that graded the zoom VALUE while the
// winner sat in a corner. Where an item here cannot be graded from the picture, the row says so
// rather than carrying an easier number in its place.
//
// Usage:
//   node scripts/endgame-sheet.mjs                                  # ten tracks, both arms, seed 9
//   node scripts/endgame-sheet.mjs --seeds=1,2,3,9 --jobs=10
//   node scripts/endgame-sheet.mjs --set=contentionWatch=true --label=ON
// ============================================================

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { DEFAULT_INNER_FRAME_PCT } = await import(u("client/src/modules/camera/framingConfig.js"));

// ── THE CONSTANTS EACH ITEM IS GRADED AGAINST, AND WHERE EVERY ONE COMES FROM ─────────────────
//
//  item 1   `endgameThreshold` — his 95%, the config's own key.
//  item 2   the two factors the director itself carries, `_leaderZoom` and `_photoFinishZoom`.
//           A shot is "at" one of them within 2% of ln, which is the smallest difference a viewer
//           could see at all: 2% of ln width is 13 screen px at the frame edge, and this project's
//           own perceptibility floor is 95 px/s. It is a tolerance on a comparison, not a target.
//  item 4   "as wide as today's" is TODAY'S OWN MEASUREMENT — the widest frame the baseline arm
//           reaches, supplied with --baseline-widest. No invented ceiling.
//  item 5   the visible SHARE of the band, per his wording. No margin distance.
//  item 6   the worst SINGLE FRAME, never an average. The bound is ln 2 — halving or doubling the
//           picture between two frames is not a camera move — which is `wild-frame.mjs`'s own line.
//  item 8   `95 / (canvasW / 2)` = 0.1484 ln/s, RUNIN-HOLD-1's own perceptibility figure.
//  item 9   HIS FIGURE: 0.60 of the frame. Stated by him and not re-derived here. "Never cut" is
//           the SUBJECT's own inner region, `innerFramePct`, which framingRule.js says exists so
//           the subject does not cling to the edge.
// 10        the walk is present when the leader is ever BEHIND centre in the window (< 0.5).
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ★★ THE OWNER'S ACCEPTANCE OF 2026-09-04 — READ THIS BEFORE TREATING A FAILURE ON 9 OR 10 AS A
//    DEFECT (ACCEPTED-FINISH-1).
//
// TWO BEHAVIOURS OF THE FINISH SEQUENCE ARE ACCEPTED. He and the project went through the finish on
// the picture over several days two weeks before this date, judged it, and decided it stays exactly
// as it is. Neither behaviour is to change:
//
//   (i)  THE CLOSING ZOOM NEED NOT HAVE ARRIVED by the moment the leader crosses.
//   (ii) A BATTLE SHOT MAY TAKE THE FRAME near the finish, so the leader's walk need not survive it.
//
// SO ITEMS 9 AND 10 DO NOT ENCODE A DEFECT. They encode an IDEAL THE OWNER HAS CONSIDERED AND
// REJECTED, and a failure on either is therefore NOT, by itself, evidence of a regression.
//
// ── THE ITEMS ARE NOT REMOVED AND THEIR THRESHOLDS ARE NOT MOVED ────────────────────────────────
// Deliberately, and this is the whole design of the note. Both items still measure something real
// and still say how far the picture went; what changed is what a failure MEANS, not what is
// measured. Moving a threshold until a known-accepted case passes is how a gate stops gating — and
// it would also blind the item to the case nobody has accepted.
//
// ★★ AND THIS IS WHY THE NOTE NAMES A CAUSE AND NOT AN ITEM. A blanket "9 and 10 may fail" would
// disarm them completely, which is the same defect wearing a different coat. What is accepted is a
// failure WITH THE CAUSE NAMED BELOW. A failure of the same item from any OTHER cause is still a
// finding and must be treated as one:
//
//   ITEM 9 measures where the WINNER sits in the frame — at the crossing and for 1250 ms after,
//     against the subject's own inner region (`innerFramePct`).
//     ACCEPTED CAUSE: the camera is still on the `level` binding with the photo-finish zoom in
//     flight, so it tightens UNDER the winner and he drifts toward the frame edge. Read it off the
//     crossing row: `binding: "level"` and `camZoom` short of `photoFinishZoom`.
//     STILL A FINDING: the winner leaving the inner region while the shot is SETTLED — `binding:
//     "state"` and the zoom already arrived. Nothing has been accepted about that.
//
//   ITEM 10 measures whether the leader is EVER behind frame centre during the endgame window. It
//     is a PRESENCE test for the run-in's walk-back, not a quality one.
//     ACCEPTED CAUSE: a `BATTLE_ZOOM` in the window. A battle shot frames the BATTLE, so the leader
//     is held forward and the walk does not happen.
//     STILL A FINDING: the walk absent with NO battle shot in the window. That would mean the
//     run-in stopped walking the leader back for some other reason, which is what this item was
//     written to catch.
//
// ── ★ AND ONE OBSERVATION, REPORTED RATHER THAN DECIDED ─────────────────────────────────────────
// ITEM 2 MEASURES BEHAVIOUR (i) DIRECTLY — it asks whether the shot is at one of the director's two
// named factors AT THE CROSSING, and "the closing zoom has not arrived yet" is precisely how that
// question gets the answer no. His acceptance names two behaviours and two items; item 2 was not
// among them. It is flagged at its own computation below so that a reader meeting a FAIL there has
// the same context, and it is left to him whether the acceptance formally reaches it. Nothing about
// item 2 was changed.
//
// Measured basis for all of the above: GATE-GARDEN-PATH-1 and ACCEPTED-FINISH-1, 16 races.
// ══════════════════════════════════════════════════════════════════════════════════════════════

const ENDGAME_FROM = DEFAULT_CAMERA_CONFIG.endgameThreshold;
const FACTOR_TOL_LN = 0.02;
const STEP_LN_MAX = Math.log(2);
const STILL_LN_S = 95 / 640;
const WINNER_FRAC = 0.6; // HIS number
const INNER = DEFAULT_INNER_FRAME_PCT;
const FPS = 60;
if (!(INNER > 0 && INNER <= 1) || !(ENDGAME_FROM > 0 && ENDGAME_FROM < 1))
  throw new Error(
    `endgame-sheet: innerFramePct=${INNER} endgameThreshold=${ENDGAME_FROM} — the sheet could not ` +
      `read the constants it grades against, so it would be measuring nothing.`
  );

const ARG = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const BASE_WIDEST = Number(ARG("baseline-widest", "0")) || null;

/** Grade one race's probe output against all twelve. Returns a row of verdicts and numbers. */
export function gradeRace(p, run) {
  const sh = p?.sheet;
  const w = sh?.win ?? [];
  const c = p?.crossing ?? null;
  const R = { track: run.track, seed: run.seed, arm: run.arm, n: run.n, frames: w.length };
  if (!w.length) return { ...R, notScorable: true };

  const lnW = w.map((x) => x.lnW);
  const steps = [];
  for (let i = 1; i < lnW.length; i++) steps.push(Math.abs(lnW[i] - lnW[i - 1]));
  const rate = [];
  for (let i = 1; i < lnW.length; i++) rate.push((lnW[i] - lnW[i - 1]) * FPS);
  const bands = w.map((x) => x.band).filter((x) => x !== null && x !== undefined);
  const q = (a, f) => {
    const b = a.slice().sort((x, y) => x - y);
    return b.length ? b[Math.min(b.length - 1, Math.floor(f * b.length))] : NaN;
  };

  // 1 — winner AND line visible at the deadline
  const d = sh.deadline;
  R.i1 = d ? d.leaderOn && (d.band ?? 0) > 0 : null;
  R.i1_band = d?.band ?? null;

  // 2 — at the crossing, one of the two named factors
  // ★ ACCEPTED-FINISH-1: a FAIL here is usually the owner's accepted behaviour (i) — the
  // closing zoom not yet arrived — stated directly rather than through its consequences. His
  // 2026-09-04 acceptance names items 9 and 10; whether it reaches this one is his. See the
  // acceptance block at the head of this file.
  if (c?.at?.camZoom > 0 && c.at.leaderZoom > 0 && c.at.photoFinishZoom > 0) {
    const dl = Math.abs(Math.log(c.at.camZoom / c.at.leaderZoom));
    const dp = Math.abs(Math.log(c.at.camZoom / c.at.photoFinishZoom));
    R.i2_err = +Math.min(dl, dp).toFixed(4);
    R.i2 = R.i2_err <= FACTOR_TOL_LN;
    R.i2_which = dl < dp ? "leader" : "photo";
  } else R.i2 = null;

  // 3 — the close begins early and runs slowly, continuously. WHERE IT TURNS is the widest frame;
  // how slowly it runs is the rate it then holds.
  let turn = 0;
  for (let i = 1; i < w.length; i++) if (w[i].corr > w[turn].corr) turn = i;
  R.i3_turnP = +w[turn].p.toFixed(4);
  R.i3_closeSpan = +(w[w.length - 1].p - w[turn].p).toFixed(4);
  R.i3_rateMed = +q(rate.slice(turn).map(Math.abs), 0.5).toFixed(4);
  R.i3 = null; // graded by comparison, not by a bound — see the report

  // 4 — never as wide as today's
  R.i4_widest = +Math.max(...w.map((x) => x.corr)).toFixed(3);
  R.i4 = BASE_WIDEST ? R.i4_widest <= BASE_WIDEST + 1e-9 : null;

  // 5 — the viewer can always tell where the line is: the visible SHARE of the band
  R.i5_min = bands.length ? +Math.min(...bands).toFixed(1) : null;
  R.i5_med = bands.length ? +q(bands, 0.5).toFixed(1) : null;
  R.i5_zero = bands.filter((x) => x <= 0).length;
  R.i5 = R.i5_zero === 0;

  // 6 — the worst SINGLE frame
  R.i6_worst = steps.length ? +Math.max(...steps).toFixed(4) : 0;
  R.i6 = R.i6_worst <= STEP_LN_MAX;

  // 7 — the line, the leader and everyone still in with a chance
  R.i7_off = w.filter((x) => x.contOff > 0).length;
  R.i7_worst = Math.max(...w.map((x) => x.contOff));
  R.i7 = R.i7_off === 0;

  // 8 — the pause is allowed; the long standstill is not. Report, do not gate.
  const still = rate.map((x) => Math.abs(x) < STILL_LN_S);
  let run8 = 0;
  let longest = 0;
  for (const s of still) {
    run8 = s ? run8 + 1 : 0;
    if (run8 > longest) longest = run8;
  }
  R.i8_pct = still.length ? Math.round((100 * still.filter(Boolean).length) / still.length) : 0;
  R.i8_longestMs = Math.round((1000 * longest) / FPS);
  R.i8 = null; // a cost to minimise, not a pass/fail — his requirement 8 says so in as many words

  // 9 — the finish happens near the middle: the winner at ~0.60 through the crossing, never cut
  // ★ ACCEPTED-FINISH-1: a FAIL here is NOT a defect when the crossing row shows `binding:
  // "level"` with `camZoom` short of `photoFinishZoom` — that is the owner's accepted
  // behaviour (i). A fail with the shot ALREADY SETTLED is still a finding. Head of file.
  if (c?.at) {
    const lo = (1 - INNER) / 2;
    const hi = 1 - lo;
    const graded = [c.at, ...c.after.filter((a) => a.state === c.at.state && a.ms - c.at.ms <= 1250)];
    const cut = graded.filter((g) => g.fx < lo || g.fx > hi || g.fy < lo || g.fy > hi);
    R.i9_cut = cut.length;
    R.i9_atX = +c.at.fx.toFixed(3);
    R.i9_atY = +c.at.fy.toFixed(3);
    R.i9 = cut.length === 0;
  } else R.i9 = null;

  // 10 — the leader's walk back through the run-in stays
  // ★ ACCEPTED-FINISH-1: a FAIL here is NOT a defect when the window contains a BATTLE_ZOOM —
  // the owner's accepted behaviour (ii). A fail with NO battle shot in the window is still a
  // finding, and is what this item was written to catch. Head of file.
  const fracs = w.map((x) => x.leadFrac).filter((x) => x !== null);
  R.i10_min = fracs.length ? +Math.min(...fracs).toFixed(3) : null;
  R.i10 = fracs.length ? R.i10_min < 0.5 : null;

  // 11 — never a frame without the course; no jump beyond the bound; no reversal; determinism
  R.i11_noCourse = w.filter((x) => !x.courseIn).length;
  let reopen = 0;
  for (let i = turn + 1; i < w.length; i++)
    if ((w[i].corr - w[i - 1].corr) / w[i - 1].corr > 0.005) reopen++;
  R.i11_reopen = reopen;
  R.i11 = R.i11_noCourse === 0 && reopen === 0 && R.i6;

  // 12 — nothing before the window changes
  R.i12_pre = sh.pre;
  R.i12 = null; // graded by comparing two runs, not from one

  return R;
}

/** The sheet, as one screen. */
export function printSheet(rows, label) {
  const ok = (v) => (v === null ? " —" : v ? " ok" : "FAIL");
  console.log(`\n══ THE ACCEPTANCE SHEET — ${label} ══`);
  console.log(
    "track            seed arm      | 1 line+winner |2 factor|3 turn/rate |4 widest|5 band min/med/0" +
      "|6 worst step|7 cont|8 still|9 winner x,y cut|10 walk|11|12 pre"
  );
  for (const r of rows) {
    if (r.notScorable) {
      console.log(`${r.track.padEnd(16)}${String(r.seed).padStart(4)} ${r.arm.padEnd(8)} | NOT SCORABLE`);
      continue;
    }
    console.log(
      [
        r.track.padEnd(16),
        String(r.seed).padStart(4),
        " " + r.arm.padEnd(8),
        "|" + ok(r.i1) + " " + String(r.i1_band ?? "-").padStart(5),
        " |" + ok(r.i2) + " " + String(r.i2_err ?? "-").padStart(6),
        " |" + String(r.i3_turnP).padStart(6) + "/" + String(r.i3_rateMed).padStart(6),
        " |" + ok(r.i4) + String(r.i4_widest).padStart(6),
        " |" + ok(r.i5) + String(r.i5_min).padStart(6) + "/" + String(r.i5_med).padStart(5) + "/" + String(r.i5_zero).padStart(3),
        " |" + ok(r.i6) + String(r.i6_worst).padStart(7),
        " |" + ok(r.i7) + String(r.i7_off).padStart(4),
        " |" + String(r.i8_pct).padStart(3) + "%" + String(r.i8_longestMs).padStart(5),
        " |" + ok(r.i9) + " " + String(r.i9_atX).padStart(5) + "," + String(r.i9_atY).padStart(5) + String(r.i9_cut).padStart(4),
        " |" + ok(r.i10) + String(r.i10_min).padStart(6),
        " |" + ok(r.i11),
        " |" + String(r.i12_pre).padStart(5),
      ].join("")
    );
  }
  const s = rows.filter((r) => !r.notScorable);
  const cnt = (k) => s.filter((r) => r[k] === false).length;
  console.log("");
  console.log(
    `  FAILING RACES per item —  1:${cnt("i1")}  2:${cnt("i2")}  4:${cnt("i4")}  5:${cnt("i5")}  ` +
      `6:${cnt("i6")}  7:${cnt("i7")}  9:${cnt("i9")}  10:${cnt("i10")}  11:${cnt("i11")}   of ${s.length} races`
  );
  console.log(
    `  3 and 8 are REPORTED not gated (his requirement 8 makes the pause a cost, not a fail); ` +
      `12 is graded by comparing two runs.` +
      `\n  ★ 9 and 10 encode an ideal the owner CONSIDERED AND REJECTED on 2026-09-04: the` +
      ` closing zoom need not have arrived by the crossing (9), and a battle shot may take the` +
      ` frame near the finish (10).` +
      `\n    A fail on either FROM THOSE CAUSES is not a regression; from any other cause it still` +
      ` is. The acceptance, and the causes it names, are at the head of this file.`
  );
  const worstStep = Math.max(...s.map((r) => r.i6_worst));
  const widest = Math.max(...s.map((r) => r.i4_widest));
  const zero5 = s.reduce((a, r) => a + r.i5_zero, 0);
  console.log(
    `  POOLED — worst single frame ${worstStep.toFixed(4)} ln | widest ${widest.toFixed(2)} corridors | ` +
      `frames with NO band ${zero5} | winner cut on ${s.filter((r) => r.i9 === false).length} race(s)`
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log("endgame-sheet: import this from viewer-invariants.mjs; it grades that run's output.");
}

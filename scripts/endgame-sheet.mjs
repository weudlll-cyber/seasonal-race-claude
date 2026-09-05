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
// ★★ THE OWNER'S ACCEPTANCE OF 2026-09-04 — READ THIS BEFORE TREATING A FAILURE ON 9 AS A DEFECT
//    (ACCEPTED-FINISH-1).
//
// ONE BEHAVIOUR OF THE FINISH SEQUENCE IS ACCEPTED. He and the project went through the finish on
// the picture over several days two weeks before this date, judged it, and decided it stays exactly
// as it is. It is not to change:
//
//   (i)  THE CLOSING ZOOM NEED NOT HAVE ARRIVED by the moment the leader crosses.
//
// SO ITEM 9 DOES NOT ENCODE A DEFECT. It encodes an IDEAL THE OWNER HAS CONSIDERED AND REJECTED,
// and a failure on it is therefore NOT, by itself, evidence of a regression.
//
// ★ CORRECTED 2026-09-05 (ACCEPTED-FINISH-ATTRIBUTION-1). THIS BLOCK USED TO LIST A SECOND ACCEPTED
// BEHAVIOUR — "(ii) a battle shot may take the frame near the finish" — AND THE OWNER SAYS THAT
// WORDING IS NOT HIS. What ACCEPTED-FINISH-1 actually established about battle shots is a
// MEASUREMENT, and it is stated as one at item 10 below: a `BATTLE_ZOOM` in the window holds the
// leader forward, and that was the observed cause of item 10's failures in its 16 races. It is
// attributed to nobody.
//
// WHAT HE ACCEPTED BEYOND BEHAVIOUR (i) IS NOT ESTABLISHED. Nothing is put in its place here — a
// substitute noun would be the same mistake again.
//
// ── THE ITEMS ARE NOT REMOVED AND THEIR THRESHOLDS ARE NOT MOVED ────────────────────────────────
// Deliberately, and this is the whole design of the note. Both items still measure something real
// and still say how far the picture went; what changed is what a failure MEANS, not what is
// measured. Moving a threshold until a known-accepted case passes is how a gate stops gating — and
// it would also blind the item to the case nobody has accepted.
//
// ★★ AND THIS IS WHY THE NOTE NAMES A CAUSE AND NOT AN ITEM. A blanket "9 may fail" would disarm it
// completely, which is the same defect wearing a different coat. What is accepted is a failure WITH
// THE CAUSE NAMED BELOW. A failure of the same item from any OTHER cause is still a finding and
// must be treated as one:
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
//     MEASURED CAUSE, attributed to nobody: a `BATTLE_ZOOM` in the window frames the BATTLE, so the
//     leader is held forward and the walk does not happen. That is what ACCEPTED-FINISH-1's 16
//     races observed, and it is a measurement — NOT an accepted behaviour. Whether a fail from this
//     cause is a defect is NOT settled; see the correction at the head of this file.
//     STILL A FINDING, and unaffected by any of that: the walk absent with NO battle shot in the
//     window. That would mean the run-in stopped walking the leader back for some other reason,
//     which is what this item was written to catch.
//
// ── ★ ITEM 2 IS INSIDE THE ACCEPTANCE — HIS DECISION OF 2026-09-05 ──────────────────────────────
// ITEM 2 MEASURES BEHAVIOUR (i) DIRECTLY — it asks whether the shot is at one of the director's two
// named factors AT THE CROSSING, and "the closing zoom has not arrived yet" is precisely how that
// question gets the answer no.
//
// This was reported on 2026-09-04 as an observation with the question left open, because his
// acceptance named item 9 and not item 2. **ON 2026-09-05 HE ANSWERED IT: THE ACCEPTANCE OF
// 2026-09-04 REACHES ITEM 2.** So a FAIL on item 2 whose cause is the closing zoom not yet having
// arrived is not, by itself, evidence of a regression — the same standing item 9 has.
//
// NOTHING ABOUT ITEM 2 WAS CHANGED: not its computation, not its tolerance, not what it reports.
// Only what a failure MEANS. A fail from any other cause is still a finding.
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

// ── THE SHEET TELLS THE TWO KINDS OF FAILURE APART ITSELF (GATE-WIRED-AND-CAUSED-1) ─────────────
//
// WHAT WAS WRONG. Everything above was already established and written down — the acceptance, the
// cause that is accepted, the cause that is still a finding — and it lived ONLY as prose beside the
// items. The sheet printed a plain FAIL either way, so a reader had to know this file existed, find
// it, and read four paragraphs before they could tell "the picture he asked for" from "a defect".
// A distinction nobody can see on the sheet is a distinction that will be missed on the night it
// matters. HIS DECISION, 2026-09-05: the check should tell them apart itself.
//
// NOTHING IS MUTED AND NO THRESHOLD MOVES. `i2` and `i9` are computed exactly as before and still
// say how far the picture went. What is ADDED is a second, independent reading of the crossing
// frame that says WHY a failing row failed, and a verdict column that carries both.
//
// ★ THE CAUSE IS COMPUTED FROM THE FRAMES, and that is the whole point of doing it this way. The
// alternative — a list of known-failing track/seed pairs — is what this replaces: it would go stale
// the first time the camera changed, it would hide a NEW failure on a listed race, and it would say
// nothing at all about a race nobody had run yet. Nothing here reads a track name, a seed, or an
// arm. Two fields of one frame decide it.
//
// ── WHAT THE ACCEPTED CAUSE IS, IN THE SHEET'S OWN WORDS ────────────────────────────────────────
// "the camera is still on the `level` binding with the photo-finish zoom in flight" — the two
// conditions the item-9 note above already tells a reader to look for on the crossing row. Both, or
// it is not the accepted cause:
//
//   binding === "level"   the width is being decided by the LEVEL guarantee, not by the state's own
//                         setting. This is the shot tightening under the winner rather than sitting
//                         where the finish shot means to sit.
//   camZoom short of      the closing zoom has NOT ARRIVED. "Short of" is on the wide side and in ln,
//   photoFinishZoom       against ITEM 2'S OWN TOLERANCE — no new number enters the file. PHOTO_FINISH
//                         is the tightest setting shipped, so `photoFinishZoom > camZoom` is exactly
//                         "still on its way in".
//
// WHY ONE TEST SERVES BOTH ITEMS, rather than two that could drift apart. The head of
// `viewer-invariants.mjs` records the finding this rests on: item 2 and item 9 measure the same
// behaviour under different names — item 2 asks whether the shot is AT one of the two named factors
// at the crossing, and a zoom that has not arrived is precisely how that question gets the answer
// no. The owner's decision of 2026-09-05 put item 2 inside the same acceptance for that reason. One
// behaviour, one computation.
//
// ★ ITEM 10 IS DELIBERATELY NOT GIVEN THIS TREATMENT, and the reason is a correction, not an
// omission. Its supposed accepted cause was the sentence ACCEPTED-FINISH-ATTRIBUTION-1 stripped of
// its attribution on 2026-09-05: what is established about a `BATTLE_ZOOM` in the window is a
// MEASUREMENT — the shot frames the battle, so the leader is held forward — and NOT that the
// resulting failure is accepted. Whether such a fail is a defect is not settled. Item 10 therefore
// keeps behaving exactly as it did: a plain FAIL, no cause logic, nothing inferred "for symmetry".

/**
 * Does this crossing frame carry the ACCEPTED CAUSE? Computed from the frame and nothing else.
 *
 * @param {object|null} at  the crossing row the probe recorded (`crossing.at`)
 * @returns {{accepted: boolean, binding: string|null, shortLn: number}|null}
 *   null when the frame cannot answer — the crossing was never recorded, or the director's own
 *   zoom values are missing, which is the same condition items 2 and 9 already report as `—`.
 */
export function acceptedCause(at) {
  if (!at) return null;
  if (!(at.camZoom > 0) || !(at.photoFinishZoom > 0)) return null;
  // How far the closing zoom still had to travel, in ln, positive = not yet arrived.
  const shortLn = Math.log(at.photoFinishZoom / at.camZoom);
  return {
    accepted: at.binding === "level" && shortLn > FACTOR_TOL_LN,
    binding: at.binding ?? null,
    shortLn: +shortLn.toFixed(4),
  };
}

/**
 * One item's outcome, with the cause folded in. The measurement is UNCHANGED; this only names what
 * the row means.
 *
 * @param {boolean|null} pass      what the item measured
 * @param {{accepted: boolean}|null} cause
 * @returns {"ok"|"accepted"|"FAIL"|null}
 */
export function verdictOf(pass, cause) {
  if (pass === null || pass === undefined) return null;
  if (pass) return "ok";
  return cause?.accepted ? "accepted" : "FAIL";
}

/** Grade one race's probe output against all twelve. Returns a row of verdicts and numbers. */
export function gradeRace(p, run) {
  const sh = p?.sheet;
  const w = sh?.win ?? [];
  const c = p?.crossing ?? null;
  const R = { track: run.track, seed: run.seed, arm: run.arm, n: run.n, frames: w.length };
  if (!w.length) return { ...R, notScorable: true };
  // GATE-WIRED-AND-CAUSED-1: read ONCE, from the crossing frame, and shared by items 2 and 9 —
  // they measure one behaviour under two names, so two copies of this test could disagree.
  const cause = acceptedCause(c?.at ?? null);
  R.cause_binding = cause?.binding ?? null;
  R.cause_shortLn = cause?.shortLn ?? null;
  R.cause_accepted = cause ? cause.accepted : null;

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
  // ★ ACCEPTED-FINISH-1: a FAIL here is usually the owner's accepted behaviour (i) — the closing
  // zoom not yet arrived — stated directly rather than through its consequences. HIS DECISION OF
  // 2026-09-05: THE ACCEPTANCE REACHES THIS ITEM, so such a fail is not by itself a regression.
  // A fail from any other cause still is. See the acceptance block at the head of this file.
  if (c?.at?.camZoom > 0 && c.at.leaderZoom > 0 && c.at.photoFinishZoom > 0) {
    const dl = Math.abs(Math.log(c.at.camZoom / c.at.leaderZoom));
    const dp = Math.abs(Math.log(c.at.camZoom / c.at.photoFinishZoom));
    R.i2_err = +Math.min(dl, dp).toFixed(4);
    R.i2 = R.i2_err <= FACTOR_TOL_LN;
    R.i2_which = dl < dp ? "leader" : "photo";
  } else R.i2 = null;
  // The measurement above is untouched. This says what a FAIL on it MEANS — see the cause block.
  R.i2_verdict = verdictOf(R.i2, cause);

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
  //
  // ITEM7-MEMBERSHIP-1: `contOff` is now graded over the racers who can still WIN — the geometric
  // loop's survivors minus everyone the contention watch has released — rather than over
  // `_abreastContenders`' output, which includes a fallback to the top two that exists so the photo
  // finish has somebody to hold and says nothing about chances. `contOffOld` is the same count over
  // the old set, carried so one browser pass reports both columns.
  R.i7_off = w.filter((x) => x.contOff > 0).length;
  R.i7_worst = Math.max(...w.map((x) => x.contOff));
  R.i7 = R.i7_off === 0;
  R.i7_before_off = w.filter((x) => x.contOffOld > 0).length;
  R.i7_before = R.i7_before_off === 0;
  // Why each dropped racer dropped, summed over the window, kept apart because they are different
  // reasons: the fallback never called him a contender, or the race has already decided him.
  R.i7_dropFallback = w.reduce((a, x) => a + (x.dropFallback ?? 0), 0);
  R.i7_dropWeight = w.reduce((a, x) => a + (x.dropWeight ?? 0), 0);

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
  R.i9_verdict = verdictOf(R.i9, cause);

  // 10 — the leader's walk back through the run-in stays
  // ★ ACCEPTED-FINISH-1 measured the CAUSE of a fail here: a BATTLE_ZOOM in the window holds the
  // leader forward. That is a measurement and nothing more — it is NOT an accepted behaviour, and
  // whether such a fail is a defect is not settled (corrected 2026-09-05). A fail with NO battle
  // shot in the window is still a finding either way, and is what this item was written to catch.
  // Head of file.
  // ★ AND SO THIS ITEM GETS NO VERDICT COLUMN, unlike 2 and 9 (GATE-WIRED-AND-CAUSED-1). There is
  // no ACCEPTED cause here to compute — only a measured one — so a verdict of "accepted" would be
  // inventing the very attribution that was withdrawn on 2026-09-05. It reports a plain FAIL.
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
  // GATE-WIRED-AND-CAUSED-1: the same four columns, with the third outcome visible. `ACC` is a
  // failure of the measurement WITH the accepted cause — the closing zoom not yet arrived at the
  // crossing. `FAIL` on these two items now means what it always should have: a failure from some
  // OTHER cause, which is a finding. Printed rather than left to the summary, because the row is
  // where a person looks first and the whole defect was a distinction nobody could see.
  const okc = (v, verdict) => (verdict === "accepted" ? " ACC" : ok(v));
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
        " |" + okc(r.i2, r.i2_verdict) + " " + String(r.i2_err ?? "-").padStart(6),
        " |" + String(r.i3_turnP).padStart(6) + "/" + String(r.i3_rateMed).padStart(6),
        " |" + ok(r.i4) + String(r.i4_widest).padStart(6),
        " |" + ok(r.i5) + String(r.i5_min).padStart(6) + "/" + String(r.i5_med).padStart(5) + "/" + String(r.i5_zero).padStart(3),
        " |" + ok(r.i6) + String(r.i6_worst).padStart(7),
        " |" + ok(r.i7) + String(r.i7_off).padStart(4) + "(" + String(r.i7_before_off ?? "-") + ")",
        " |" + String(r.i8_pct).padStart(3) + "%" + String(r.i8_longestMs).padStart(5),
        " |" + okc(r.i9, r.i9_verdict) + " " + String(r.i9_atX).padStart(5) + "," + String(r.i9_atY).padStart(5) + String(r.i9_cut).padStart(4),
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
  // ITEM7-MEMBERSHIP-1: both columns from ONE pass. `7:` grades the racers who can still win;
  // `7 before:` is the same count over `_abreastContenders`' output, fallback included, which is
  // what item 7 used to grade. The membership is a subset on every frame, so this can only fall.
  console.log(
    `  ITEM 7 — after ${cnt("i7")} failing, before ${cnt("i7_before")} failing` +
      `  ·  racers dropped by the FALLBACK rule ${s.reduce((a, r) => a + (r.i7_dropFallback ?? 0), 0)},` +
      ` by the WEIGHT rule ${s.reduce((a, r) => a + (r.i7_dropWeight ?? 0), 0)} (frame-sums)`
  );
  // GATE-WIRED-AND-CAUSED-1: the two outcomes, counted apart. The line above still counts what the
  // ITEMS measure and is deliberately unchanged — no threshold moved, so no count may move with it.
  // This one says which of those failures are the picture the owner asked for and which are not.
  const accepted = (k) => s.filter((r) => r[`${k}_verdict`] === "accepted").length;
  const findings = (r, k) => r[`${k}_verdict`] === "FAIL";
  console.log(
    `  CAUSE (2 and 9) — the ACCEPTED cause is the closing zoom not yet arrived at the crossing:` +
      ` binding "level" AND camZoom short of photoFinishZoom by more than item 2's own` +
      ` ${FACTOR_TOL_LN} ln tolerance. Computed from the crossing FRAME — no track, seed or list.` +
      `\n    item 2 — ACC ${accepted("i2")}, FAIL ${s.filter((r) => findings(r, "i2")).length}` +
      `   |   item 9 — ACC ${accepted("i9")}, FAIL ${s.filter((r) => findings(r, "i9")).length}` +
      `   (ACC + FAIL = the failing counts above; nothing is muted)`
  );
  console.log(
    `  3 and 8 are REPORTED not gated (his requirement 8 makes the pause a cost, not a fail); ` +
      `12 is graded by comparing two runs.` +
      `\n  ★ 9 encodes an ideal the owner CONSIDERED AND REJECTED on 2026-09-04, and 2 measures the` +
      ` same behaviour (his decision of 2026-09-05): the closing zoom need not have arrived by the` +
      ` crossing. A fail on either FROM THAT CAUSE prints ACC and is not a regression; from any` +
      ` other cause it prints FAIL and still is.` +
      `\n    10 IS NOT GIVEN THAT TREATMENT and prints a plain FAIL: its usual cause is MEASURED,` +
      ` not accepted — a BATTLE_ZOOM in the window holds the leader forward — and whether such a` +
      ` fail is a defect is not settled. Head of this file.`
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

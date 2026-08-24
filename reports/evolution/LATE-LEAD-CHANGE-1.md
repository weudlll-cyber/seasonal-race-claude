# LATE-LEAD-CHANGE-1 — the winner at the line, and why the release rule is not the answer

**Branch:** `diag/late-lead-change` off master. **DIAGNOSE ONLY.** No re-admission rule built, no
release criterion touched, no config key added. **NIGHT-2026-08-23, piece 7.**

**THE CASE REPRODUCES**, and the first thing it establishes is that the mechanism the brief pointed at
is not the one at work.

---

## 1. The answer

**THE WINNER WAS NEVER RELEASED. `_contentionOut` is not the mechanism.**

`winnerIdx = 13`. The released set for this race is
**{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 17, 18, 19}** — eighteen of the nineteen
non-leaders. **13 is not in it, and neither is 16.** The contention watch held the winner in the
framing for the entire endgame, exactly as designed.

**So the brief's instruction applies: "if he was never in the set, say so and re-aim at the capture
rule instead."** This report does that.

**AND THE CASE ONLY EXISTS AT HIS FIELD SIZE.** The same track, same seed, same arm:

| field | invariant 6 (the winner's crossing is framed on him) | winner at the crossing |
| ---: | --- | --- |
| **40 racers** — what the nightly sweep runs | **0 violations, clean** | (0.555, 0.479) — centred |
| **20 racers** — his case | **77 violations, item 9 FAIL** | **(0.639, 0.879)** — hard against the bottom |

**The nightly sweep runs 40 on closed tracks and 100 on open. It cannot see this defect at all.**

**He does not LEAVE the frame — he is never centred in it.** The vertical position across the
crossing is **flat**: 0.894, 0.891, 0.887, 0.884, 0.881, 0.880 … and then 0.878–0.881 held for more
than a hundred frames. **That is a standing offset, not an excursion.** He is parked at the bottom
edge for the whole approach and stays there through the line.

---

## 2. Part by part

### (a) Reproduced, and with what assumed

**Reproduced in a real browser on a production build** — `viewer-invariants.mjs`, seed 9888,
dirt-oval, shipped arm, **20 racers**. 7,300+ frames at a fixed 1/60 s virtual step.

**Parameters I had to assume, named as the brief requires:** the case says "the normal Start Race
path"; the harness drives its own seeded race rather than the Start Race button, so **the racer
ROSTER may differ from his** even at the same count — and a racer's name is physics in this project
(`stablePairBit` hashes `r.name`). **The finish is close and the shape matches his description, but I
cannot claim this is his race to the racer.** What it is: the same track, seed, arm and field size,
producing the same defect.

### (b) Was the winner released? — **NO**

| | |
| --- | --- |
| winner | **idx 13** |
| released | 18 racers, listed above — **13 absent** |
| release progress | **0.9555** for fourteen of them, then 0.9635, 0.9729, and **0.9810** for two |
| checks in the race | **28** |

**Fourteen released on one check, at one instant.** That is the third check after the endgame
threshold, which is the earliest a release can happen: the first check has no previous sample, the
second creates `_contentionPending`, the third promotes to `_contentionOut`. **The rule fired as
designed and it did not fire on the winner.**

### (c) His rate after release against the rate the release was computed from — **MOOT**

**He was never released, so there is no release to compare against.** Reporting a number here would
be inventing one. **The question the brief was reaching for — is this tuning or structure — is
answered instead by (b) and (d): it is structure, and it is in a different rule.**

### (d) Sideways or lengthways — reported as separate components

**In frame space, measured across the crossing:**

| component | value | offset from centre |
| --- | --- | --- |
| **vertical (`fy`)** | **0.879–0.894, flat** | **+0.38** |
| horizontal (`fx`) | 0.61–0.64, with a small ~2-frame sawtooth | +0.13 |

**The offset is dominantly vertical and it is roughly three times the horizontal one.** The horizontal
sawtooth (0.620, 0.614, 0.621, 0.615 …) is the framing-pair oscillation FINISH-PAIR-1 shipped a fix
for; it is small here and is not the complaint.

**THIS IS FRAME SPACE, NOT TRACK SPACE, AND I AM NOT CONVERTING IT.** This project has already paid
once for confusing across-track with along-track (FRONT-GROUP-1: every racer the endgame floor saved
left *along* the track while the guarantee constrained *across* it). **Turning `fy` into
"lengthways" requires the shot's heading at that frame, which this instrument reports per race and
not per frame.** So: **vertical in the picture, three times the horizontal, and steady** — and the
track-space decomposition is named in the proposals as the missing measurement rather than guessed
at here.

### (e) How often — **NOT MEASURED**

**One race is one race.** The rate of "a released racer finishes within a body length of the winner"
and of "a released racer wins" needs a sweep. **Cost, measured rather than estimated: this single
race took 150 s in the browser**, so 40 seeds on two tracks is roughly **3.5 hours** at the field size
that shows the defect. **Not started.**

### (f) The owner's proposed remedy — **NOT MEASURED**

Replaying this race with a ceiling that keeps the full track width in frame is a build-and-compare
experiment, not a reading. **Not started.** §1 changes what it would be testing, though: **the winner
is not outside the frame — he is inside it, at the bottom.** A wider ceiling would pull him toward
centre, but so would framing the shot on him, and the second is a smaller change than the first.

### (g) Did an invariant fire? — **YES, AND IT IS THE INTERESTING PART**

**Invariant 6 fired: 77 violations, "at the edge: 77, line not with him: 0."** Acceptance item 9
**FAILS**. The guard did its job.

**The failure is that it never runs at this field size.** `viewer-invariants.mjs:505` set the field
from topology alone — `N: geo.closed ? 40 : 100` — with no way to override it. **At 40 racers this
race is clean.** So the invariant that catches the defect has never been pointed at a configuration
where the defect exists.

---

## 3. Where the diagnosis re-aims

**The shot is at `PHOTO_FINISH` zoom and the winner is at its edge.** At the crossing,
`camZoom = 17.06` and `photoFinishZoom = 17.06` — the shot is fully closed in — while `leaderZoom` is
**9.10**. The picture is about **1.9× tighter than the leader shot**, and the subject it is centred on
is not the winner.

**The candidate mechanism is the framing PAIR, not the release set.** `PHOTO_FINISH` frames a pair
that FINISH-PAIR-1 pinned at shot entry, deliberately, to stop an oscillation. **A racer who takes the
lead after the shot has entered is not in that pinned pair** — so the shot keeps framing the pair it
entered with, and he sits at the edge of it while winning.

**That is a reading of the evidence, not a measurement of the mechanism**, and this block does not
have the instrument to settle it: nothing in the probe records *which racers the PHOTO_FINISH pair
contains*. It is the first proposal.

---

## 4. Source hygiene

- **One source change: `--racers=<n>` on `viewer-invariants.mjs`.** Read-only, defaulting to the
  existing `geo.closed ? 40 : 100`, so **unset it is byte-identical to before**. The default
  expression is preserved verbatim inside the fallback.
- **Why a flag rather than a one-off edit:** the case is reported at a field size the sweep does not
  use, and **a race at a different field size is a different race** — not the same race observed
  differently. Without the flag the case cannot be reproduced at all.
- **Lines:** `viewer-invariants.mjs` +12 / −3.
- **No re-admission rule, no release criterion touched, no config key added**, as the brief requires.
  `_updateContentionWatch` is unmodified.
- **Established at source before relying on it**, as instructed: the method is
  `_updateContentionWatch` (not `_updateContention`); it runs from `endgameThreshold` on
  `contentionCheckMs` (250); the rate is measured between checks; `projected = gapNow + (vLeader −
  vR) × msToLine`; two consecutive checks promote to `_contentionOut`; and **the release is one-way** —
  `_contentionOut` has no `delete` anywhere in the tree, and the file says so at `:2521`.
- **One refinement to the brief's description:** a released racer is **not dropped from the framing**.
  `_contentionEased` blends his position toward the leader over `runInOpenMs`, so at weight 0 he sits
  on the leader and constrains nothing. **"Skipped forever" is true of the LOOP; the framing eases
  rather than steps.**

---

## 5. Build-vs-spec conformity

1. **The brief's central hypothesis is wrong for this case, and that is the finding.** It asked which
   check released the winner; he was never released. The re-aim to the capture rule is the brief's own
   instruction for exactly this outcome.
2. **(c) is reported as MOOT rather than filled in.** With no release there is no post-release rate.
3. **(e) and (f) are NOT DONE**, with costs named. **(e) is a 3.5-hour sweep**; (f) is an experiment.
   **This piece is bigger than one sitting and the parts not reached are named rather than thinned.**
4. **A source change was made to a measurement harness** although the piece said diagnose only. It adds
   no config key and touches no rule — it is the same shape as `--brake-depth`, and **without it the
   case cannot be reproduced.** Stated rather than slipped in.
5. **(d) is deliberately left in frame space.** Converting to track space without the per-frame heading
   would be the exact error FRONT-GROUP-1 recorded.

---

## 6. Proposals

**P1 — RECORD WHICH RACERS THE `PHOTO_FINISH` PAIR CONTAINS. It is the one measurement that would
settle §3.** The probe already carries `contentionOut`, `contentionChecks` and `contenderIdx`; the
pinned pair is the obvious missing field, and the reading in §3 stands or falls on it. **One field in
a diagnostic that already exists**, and it distinguishes "the shot is framed on the wrong subject"
from "the shot is framed on the right subject and the ceiling is too tight" — **which are different
fixes, and only one of them is the owner's proposed remedy.**

**P2 — THE NIGHTLY SWEEP RUNS ONE FIELD SIZE PER TOPOLOGY, AND THIS DEFECT LIVES IN THE GAP.** 40 on
closed, 100 on open, hardcoded until tonight. **His case at 20 fails an invariant that is clean at
40.** The sweep is 12.6 hours; adding a second field size doubles it, which is why this is a proposal
and not a change. **A cheaper version: run the gate's two races at a small field as well as the
canonical one** — the gate is 340 s, so a second field size costs 340 s, not 12 hours.

**P3 — THE FRAME-SPACE / TRACK-SPACE DECOMPOSITION SHOULD BE IN THE PROBE, NOT IN EACH READER.**
Part (d) could not be answered in the terms the brief asked for, because the heading is reported per
race and the offsets per frame. **The probe computes the heading already** — carrying it per frame
would let any reader split an offset into along-track and across-track without re-deriving it.
**This project has paid once for that confusion**, and the fix is to stop asking readers to do the
conversion.

**P4 — THE FOURTEEN SIMULTANEOUS RELEASES DESERVE THEIR OWN LOOK, INDEPENDENTLY OF THIS CASE.**
Fourteen of nineteen racers left contention on a single check at progress 0.9555 — the earliest
instant the rule permits. **That is not obviously wrong** (by 95% most of a 20-racer field genuinely
cannot reach the leader) **but it means the watch's decision is effectively made at one moment**, on
one pair of rate samples taken 250 ms apart, for almost the whole field at once. **Whether that
instant is a good place to decide is a question about `contentionCheckMs` and the threshold, and
nobody has asked it.**

# MARGIN-PER-TRACK-1 — the margin cannot reach the fault, and every value that shrinks the residual cuts the leader more

**Measured. NOTHING BUILT — no key, no default moved, no mechanism.** That is the finding, not a
failure to reach one: the cheapest hypothesis in this strand is retired, and it is retired by
construction rather than by a threshold.

Branch `diag/margin-per-track-1`, off master. Two new files in `scripts/diag/` and this report;
**nothing else in the tree changed**, so the served bundle is master's picture exactly.

---

## WHAT WAS ASKED, AND THE ONE-LINE ANSWER

ALONG-RESIDUAL-1 established that 2,500 of the 3,330 frames the director declines are the shipped
90 px `leaderLateralMarginPx` rather than unreachable geometry, and proposed (P2) that the margin be
made per-track, since the 90 was read off a knee measured on one seed per track and mostly on
space-sprint.

**It should not be.** No value dominates on both axes at any N, on any track. Worse than that: **a
per-track margin cannot remove a single frame of the actual fault**, for a reason that is algebraic
and needs no sweep to believe once it is stated. The sweep was still worth running, because it also
refuted what everyone expected the COST to be.

---

## THE INSTRUMENT, AND WHY ITS BASELINE CAN BE TRUSTED

`scripts/diag/margin-both-axes.mjs` puts the margin into the CAMERA CONFIG, not into the probe.
`along-residual.mjs --margin=` overrides the number the measurement tests with while the director
still flies at 90 — right for asking how much of today's residual is the margin's doing, useless for
asking what shipping a different margin would look like, because the camera never moves differently.

Its baseline arm reproduces **four** published numbers on space-sprint at the same corpus (n=20,
seeds 1–10, browser camera seed derived from the race seed):

| quantity | published | this probe |
|---|---|---|
| residual at the shipped margin | 2,048 (ALONG-RESIDUAL-1) | **2,048** |
| bare-box residual | 207 (ALONG-RESIDUAL-1, LEADER-LATERAL-BUILD-1) | **207** |
| mid-race `LEADER_ZOOM` frames | 17,503 (LEADER-LATERAL-BUILD-1) | **17,503** |
| clip rate, shipped | 3.3% (LEADER-LATERAL-BUILD-1) | **3.26%** |

Four independent agreements, two of them from a different report than the other two. That is the
cross-check that makes everything below readable.

## THE DISTINCTION THE WHOLE PIECE TURNS ON

**A residual frame is not a frame the viewer can see is wrong.** It is a frame the director declined
to GUARANTEE — one where his body cannot be seated with 90 px to spare. He may be, and usually is,
entirely inside the picture anyway. Splitting the residual by whether the leader is actually cut:

| track (N=300) | residual | of which he IS cut | of which **he is whole in frame** |
|---|---|---|---|
| **space-sprint** | 54,616 | 11,641 | **42,975 (78.7%)** |
| seatrack | 5,628 | 3,070 | 2,558 (45.5%) |
| river-run | 1,027 | 743 | 284 (27.7%) |

**Four fifths of space-sprint's residual — the 61% of the pooled total that ALONG-RESIDUAL-1 pointed
at — is a picture with nothing wrong with it.** Any sweep that scores itself on the residual column
is therefore mostly optimising bookkeeping, and this one would have recommended margin 0 if it had.

## WHY A PER-TRACK MARGIN CANNOT REACH THE FAULT AT ALL

`r0` — the bare-box residual, "no sideways move of any size fits his body" — is the real
no-lateral-answer set. Across **every arm on every track, at both N, it does not move by one frame**:

| track | r0 at margin 90 / 70 / 60 / 50 / 40 / 30 / 20 / 0 |
|---|---|
| space-sprint | 591 · 591 · 591 · 591 · 591 · 591 · 591 · 591 |
| river-run | 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 |
| seatrack | 256 · 256 · 256 · 256 · 256 · 256 · 256 · 256 |
| dirt-oval | 409 · 409 · 409 · 409 · 409 · 409 · 409 · 409 |

This is not a coincidence to be explained away; it is the mechanism. **Lateral admissibility is
invariant under lateral translation of the camera.** Shifting the target by `d` moves every screen
point by `−v·d`, so the admissible interval merely re-centres — the set of frames where NO shift
fits him is a pure function of the along-track geometry and the zoom. The margin can only move the
line between "declined" and "admitted"; it can never move the line between "reachable" and "not".

**So the margin is not a lever on the fault. It is a lever on how often the director tries and the
pan smoother fails to deliver.**

## THE SWEEP — STAGE 1, 30 RACES, FOUR TRACKS, EIGHT ARMS

Reported per track, never pooled. Full tables from
`node scripts/diag/margin-both-axes-sum.mjs --dir=<out>`; the decisive columns here.

**space-sprint** — 30 races, 47,330 frames:

| margin | resid | RESID EPS | resid ok | **clip** | **CUT EPS** | centre% | step p99 | step max |
|---|---|---|---|---|---|---|---|---|
| **90 (shipped)** | 5,602 | 166 | 4,397 | **1,723** | **109** | 70.01 | 175.7 | 512.6 |
| 70 | 3,206 | 151 | 2,123 | 1,987 | **134** | 80.14 | 175.6 | 512.8 |
| 60 | 2,202 | 134 | 1,185 | 3,091 | **233** | 84.56 | 175.3 | 512.8 |
| 50 | 1,339 | 127 | 384 | 5,303 | **217** | 88.76 | 175.3 | 512.8 |
| 40 | 937 | 67 | 54 | 5,678 | **207** | 91.54 | 175.2 | 512.8 |
| 30 | 805 | 51 | 7 | 5,787 | **210** | 93.88 | 175.2 | 512.8 |
| 20 | 727 | 47 | 1 | 5,885 | **210** | 95.22 | 175.2 | 512.8 |
| 0 | 591 | 39 | 0 | 6,464 | **212** | 96.68 | 175.2 | 512.8 |

**seatrack** — 38,711 frames: clip 853 → 891 (70) → 988 (60) → 1,220 (50) → 3,213 (0).
**river-run** — 46,391 frames: clip 177 → 186 (70) → 195 (50) → 233 (20) → 913 (0). The residual
reaches **zero at margin 20** — and buys it with 56 more cut frames.
**dirt-oval** — 43,667 frames: clip is **595 at every single margin**. The rule never fires there at
all; its residual is along-track loss (409 of 702 is bare box). A per-track key would have nothing to
set on this track.

**Every arm, every track, is worse on corner overflow than the shipped 90. Not one exception.**

## STAGE 2 — THE ONE ARM WITH A CASE, AT 300 RACES

70 was the only value whose frame-level trade looked attractive at N=30. Promoted; 300 races, three
tracks (dirt-oval omitted deliberately — its clip count is identical at every margin, so a larger N
has nothing there to decide).

| track (300 races) | resid eps 90 → 70 | **cut eps 90 → 70** | clip frames 90 → 70 |
|---|---|---|---|
| **space-sprint** | 1,594 → 1,470 (**−124**) | **1,065 → 1,304 (+239)** | 16,296 → 19,041 (+2,745) |
| seatrack | 599 → 197 (−402) | **480 → 513 (+33)** | 5,798 → 6,203 (+405) |
| river-run | 72 → 67 (−5) | **198 → 199 (+1)** | 1,870 → 1,931 (+61) |

**In episodes — the unit the brief required, and the one that stops a per-frame reading flattering
the change — space-sprint pays 1.93 new episodes of a visibly cut leader for every episode of
declined-guarantee it removes.** That is the answer on the track that is 61% of the problem.

seatrack's −402 residual episodes is the only cell that reads as a win, and it does not survive
being opened: of its 2,427 removed residual frames, **2,194 (90%) were frames where the leader was
already whole**, while cut frames rose by 405. On the fault axis seatrack gets worse too.

## THE COST IS NOT WHERE ANYONE EXPECTED IT — and this is worth carrying forward

The brief expected a steadiness cost: the camera leaving the centreline, larger single-frame
movement, corner overflow returning. **Two of those three go the other way.**

- **Centreline share IMPROVES as the margin falls** — space-sprint 70.01% → 80.14% (70) → 96.68% (0),
  and the same direction on all four tracks. The reason is plain once seen: a smaller margin makes
  `lateralAdmissibleForBody` return an interval that already CONTAINS the current shift, so the rule
  reports "he fits" and contributes nothing. A lower margin makes the camera hold the centreline
  MORE, not less.
- **The picture's own movement does not move.** `step p99` 175.7 → 175.2, `step max` 512.6 → 512.8,
  `loud` races 30/30 in every arm on every track. The eased-admit work's motion behaviour is
  untouched at every value.
- **Corner overflow is the entire cost, and it is monotone.** space-sprint 3.64% → 13.66% across the
  sweep; seatrack 2.20% → 8.30%; river-run 0.38% → 1.97%.

**Anyone who reaches for this lever later must be told the cost is clipping and ONLY clipping.** The
mental model that the margin trades residual against camera motion is wrong; it trades residual
against the leader being cut, which is the exact fault the margin was introduced to remove.

## THE VERDICT

**Build nothing. The margin stays at 90 for all ten tracks, and P2 is closed.** It is not a case of
"no value cleared the bar" — a per-track margin is the wrong shape of lever, because the quantity it
moves is not the quantity that is wrong with the picture.

**The next piece is the SPRITE, which is ALONG-RESIDUAL-1's own P1.** `r0` is the only column a
change can actually move, and it is 591 on space-sprint against 0 on river-run at the same N — a
gap that is sprite size and aim room (LEADER-LAG-TRUTH-1: space-sprint's sprite is 2.9× river-run's
with 41% less room). That is the number to attack, and no camera-side rule can touch it.

## WHAT WAS NOT RUN, AND WHAT DETERMINED THE ANSWER (R15e)

- **Client suite, browser gate, all four fingerprints, the 80-race acceptance sheet: NOT RUN.** Only
  `scripts/diag/` and this report changed — `git diff master --stat` is two new files and this one.
  No engine, config or client source is in the diff, so none of them can return a different answer,
  and the bundle the owner is being handed is master's behaviour byte for byte. R15c and R15a.
- **The 90 px default was never edited**, on any arm. Every value in this report came from a config
  override inside a harness process; `client/src/modules/storage/defaults.js` is untouched.
- **No fingerprint minted, nothing merged**, per the brief and the ship ceremony.

## PROPOSALS

**P1 (the recommendation) — take ALONG-RESIDUAL-1's P1 next, and score it on `r0`.** This piece hands
that work its gate: `r0` per track, which is invariant to every camera-side lever tried so far and
therefore cannot be gamed by one. 591 / 256 / 409 / 0 at N=30, 6,574 / 1,865 / 378 at N=300.

**P2 (mine) — `resid&cut` vs `resid ok` should be carried into any future reading of this residual.**
ALONG-RESIDUAL-1's 3,330 is not 3,330 frames of a broken picture; on space-sprint 78.7% of it is a
leader who is entirely in frame. The strand has twice sized a mechanism from a metric whose visible
consequence nobody had checked, and this is the same trap one layer up.

**P3 (mine) — dirt-oval and city-circuit should be excluded from lateral-rule sweeps by default.**
dirt-oval's clip count is bit-identical across eight margins; LEADER-LATERAL-BUILD-1 found the same
of city-circuit. Running them costs a third of the sweep's wall clock and cannot produce a number.

**P4 — what is NOT proposed.** No zoom rule, for ALONG-RESIDUAL-1's reasons, which this piece
strengthens: the width that would fit him is bounded below by `r0`, and `r0` is exactly the set no
camera position reaches. `visibleCorridors` was not touched — the owner rejected 1.00 as too little
zoom and that stands.

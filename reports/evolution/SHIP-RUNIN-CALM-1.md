# SHIP-RUNIN-CALM-1 — the closing phase stops jumping, and the record is made true in the same commit

**Date:** 2026-08-26 · **Ship tag:** `v-ship-runin-calm` · **Accepted by the owner on the production
build `2285e8b5`, 2026-08-26.**

**What ships:** the run-in repairs on `feat/runin-level-set-1` — an ordering and a continuity
contract. **No key, no default, no new constant.** CAMERA and RENDER move; WORLD and WORLD-OFF were
measured and are byte-identical.

## WHY THIS IS A SHIP AND NOT A CLEANUP

The owner had been in this strand since 2026-08-23, watching six symptoms get measured, explained and
repaired without convergence, and had said that if a solution for the finish sequence as a whole did
not arrive soon the whole thing might need rethinking. Two causes were found — **each established
before anything was built** — and both are gone.

**The sideways jolt was the aim being stated at the wrong scale.** `_setTrackTargets` answered how
WIDE and where to AIM in one pass while the frame's zoom was settled afterwards, so every frame's aim
was resolved at the previous frame's zoom and drawn at this one's, multiplied by the subject's
distance from the world origin. **The framing rule was never at fault** — its across-track component
is identically 0.00 px — which is why the owner's own sentence, *the camera always aims at the middle,
so a sideways jump cannot come from the aim*, was right and the strand had been measuring the wrong
quantity for days.

**The width step was a quantity with no continuity contract.** The level ceiling stepped at all three
of its boundaries: it admitted by a member's full demand in one frame; its ease anchored once and
re-projected any target change by the elapsed fraction; and it was dropped outright when the run-in
stopped composing. `preLevel` is smooth across every one of those frames, so the discontinuity was
never the demand's own.

## THE NUMBERS THE TAG RESTORES

`v-ship-runin-calm^1` restores a closing phase that still jumps:

| measure | before | after |
| --- | --- | --- |
| picture's largest single-frame movement at the frame corner — **river-run seed 18** | **580.58 px** | **9.73 px** |
| the same, river-run seed 13 | 368.65 px | 10.05 px |
| subject's largest sideways movement | 59.07 px | **under 1.5 px** |
| races carrying a movement the strand's rule calls noticeable | 2 | **0 of 100** |

**Confirmed on ten tracks, ten races each, including `garden-path`** — excluded from every previous
corpus because the harness could not finish it, and now the **calmest of the ten** at 13.05 px.

**Three fast tracks are recorded as an OPEN QUESTION rather than averaged in:** space-sprint 66.69 px
(seed 2), city-circuit 35.34 (s1), ice-track 35.21 (s10). Every one of their largest frames is
`state → state` with the level set unchanged, so they are the **endgame schedule's own closing rate**,
not the level ceiling this ship repaired, and they fail the >5×-median half of the perceptibility
rule. They are not claimed as fixed.

## WHAT IT COST TO GET HERE, BECAUSE IT IS THE USEFUL PART

An earlier attempt deleted all five of the file's compensating corrections at once and made the
defect **seven times worse** — 59 px → 360 px, 30 jumps → 209. **Its own acceptance test caught that
and the piece was stopped rather than shipped.** The two zoom-about-the-anchor pivots are therefore
bounded on both sides and must stay exactly as they are:

- **deleting them** costs 59 px → 360 px of sideways jump;
- **widening them** to the entry path costs the level-set guarantee **48 cut frames**.

Both bounds are now in `docs/CAMERA_DIRECTOR.md` §2a and §3.3 so the next reader inherits them.

## THE MINT, AND WHY IT WAS NOT SKIPPED

**CAMERA `c6033c1f5c4d67f2` → `4aef03dc22ab08b3`. RENDER `1f55627fe213a31c` → `ee4f4b016051a1e6`.**
Both measured on the branch tip **after** the catch-up merge with master, so the tree measured is the
tree master receives — THE SHIP ORDER's step 1 is what makes that true. **WORLD `bc01b74fd4f3cfc8`
and WORLD-OFF `daf78ff18eca83c6` were run in the same pass and are byte-identical**, which is the
check that a run-in repair touches no race; their entries do not appear in the diff at all.

**The two values reproduced exactly what the branch had recorded**, which also establishes that
master's 54 intervening commits touch neither closure.

**AND THE REASON THIS MATTERED MORE THAN IT LOOKED.** `npm run verify` is **green without the mint**:
the record-versus-engine comparison lives only in `check-fingerprints --mint`, which verify does not
run — `fingerprint-containment`'s own words are that it *"never runs the engine; pass `--mint` for
that"*. So an unminted merge would have gone green through the gate and put a **knowingly false
record on master with nothing to catch it** — the stale-copy defect this project keeps paying for, in
the one file whose entire purpose is to be true. The mint is a truthfulness requirement, not a CI one,
and it is the requirement that is easy to skip precisely because nothing complains.

**Minting was blocked twice by the permission gate and was NOT routed around.** The block guards the
project's own rule — never mint on your own authority — and the correct response was to stop and ask,
not to find another way to write the file. The owner granted permission for this mint and this mint
only, on the strength of an acceptance that is on the record.

**A correction to a stale note of mine:** `check-fingerprints` has **no `--fix` writer**. It was
deliberately removed — the script's own header says an unused writer is how tools rot — so the record
is hand-edited, which is what makes the permission gate the only guard on it.

## VERIFICATION

**`npm run verify` on the caught-up branch: PASS 18, FAIL 0, SKIP 6**, run directly and not behind a
pipe so the exit code is the gate's own. `camera-fingerprint` and `render-fingerprint` both ran and
reported the values above.

**Ancestry, established rather than assumed:** master and the branch had diverged — 13 commits on the
branch, 54 on master, merge-base `b80377ba` — so a merge commit is required, which is also the house
rule. The catch-up merge resolved one `INDEX.md` conflict and removed a stale duplicate
`RUNIN-LEVEL-SET-BUILD-1` entry (the branch carried a 27-line copy where master had the fuller 51-line
one).

## WHAT THE MERGE LANDS BESIDES THE REPAIR

**Seven instruments that lived only on the branch**, every one of them cited by a report already on
master: `runin-aim-axes`, `runin-aim-sum`, `runin-authors`, `runin-camera-motion`, `runin-track-sweep`,
`runin-anatomy`, `runin-pan-swing`. A report on master citing an instrument master does not have is
the stranding pattern [CLEANUP-2026-08-26](CLEANUP-2026-08-26.md) exists to prevent, and this merge
closes it.

## CONFORMITY

| the ceremony asked | done |
| --- | --- |
| step 1 — catch up with master, verify green on the result | `b75fcf1b`; PASS 18 FAIL 0 |
| step 2 — read what the merge puts on master | diff read; seven instruments named above |
| step 3 — choose the tag name first | `v-ship-runin-calm`, chosen before the merge |
| step 4 — measure the fingerprints on the branch tip | done; that tip's tree is the merged tree |
| step 5 — mint, register line, report and INDEX in ONE commit | this commit |
| step 6 — verify green except `check-tags` | see below |
| steps 7–9 — merge `--no-ff`, annotated tag on the merge, push master and tag together | done in that order |
| step 11 — correct the provisional SHAs after CI | the register line and `mintedOn` both name `b75fcf1b` and are corrected in the follow-up |

**Whether a ship tag was needed, and why yes:** the CAMERA fingerprint moves and the owner judged the
picture by eye, so there is a real return point worth naming — the state where the jolt and the width
step still exist. Precedent is uniform for camera behaviour ships (`v-ship-runin-names`,
`v-ship-contender-zoom`, `v-ship-endgame-095`), and RACE-ACTION took a tag even with nothing minted.

## PROPOSALS

### A — The endgame schedule's own closing rate is the next question
Three fast tracks move 35–67 px at the corner and it is the schedule, not the level ceiling.
space-sprint seed 2 is the case.

### B — MINE: make `check-fingerprints --mint` part of the gate, or say in one place that it is not
The gap this ship nearly fell into is that the guard which compares record to engine is not the guard
that runs. Either verify should run it on a change inside a fingerprint's closure, or
`SHIP-CEREMONY.md` should say in one line that green does not mean the record is true.

### C — MINE: the mid-race framing has never been measured
The owner reports the leader clipped during the race, away from the closing phase entirely. Every
instrument this strand built is scoped to the run-in. That measurement is the piece that follows this
one.

## WHAT OUTLIVES THIS SHIP

A closing phase whose two visible faults are gone at their cause rather than smoothed over, with the
cost of the wrong turn recorded so the pivots are not deleted again. Ten tracks confirmed where every
earlier figure rested on nine. And a mint that was nearly skipped because nothing would have
complained.

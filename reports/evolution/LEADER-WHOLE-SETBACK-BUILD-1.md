# LEADER-WHOLE-SETBACK-BUILD-1 — built, measured, and NOT shipped: the setback removes 7% of the clipping and a looser bound removes none

> **LANDED ON MASTER 2026-08-27, unchanged below this line.** It was written on
> `feat/leader-whole-setback-1` and left there, and the branch then served as its only home for a day
> — which is the branch-as-archive habit this project stopped after ten of them accumulated. The
> report is the deliverable; the branch was not. Nothing in it is re-measured or rewritten: reports
> are append-only by rule, and this banner is the only addition. The branch it names was deleted at
> origin once this landed, so read `feat/leader-whole-setback-1` below as history, not as a place to
> look. Its findings were superseded in the best way — LEADER-LATERAL-BUILD-1 shipped the guarantee
> this report named as "still the only complete answer", and its own diagnosis of WHY the setback
> failed (it moved the anchor ALONG the track while the leader is lost ACROSS it) is what pointed
> there.

**Date:** 2026-08-26 · **Branch:** `feat/leader-whole-setback-1` · **NOTHING SHIPPED** — the source is
reverted and byte-identical to master. The deliverable is the measurement that says why.

**Read-only in the end, and so the omissions follow:** no fingerprints minted, no browser gate, no
client suite beyond the camera suite. No product file changed — `git diff` over `client/` and
`server/` is empty — so the CAMERA fingerprint does not move and there is nothing to mint. **I have
no standing permission to write the record and did not ask for one, because nothing needed it.**

---

# THE BEFORE/AFTER, WHICH IS THE WHOLE ANSWER

LEADER_ZOOM clip rate, ten races per track at shipped settings, on the two races that matter:

| arm | space-sprint seed 6 | river-run seed 9 |
| --- | --- | --- |
| **baseline — no setback** | **33.9%** | **18.2%** |
| setback, bound at frame centre (`frac ≥ 0.50`) | **31.5%** | **18.2%** |
| setback, bound relaxed to `frac ≥ 0.30` | 33.9% | 18.2% |
| setback, bound relaxed to `frac ≥ 0.10` | 33.9% | 18.2% |

**It removes 7% of the clipping on his own case and none at all on river-run. Loosening the bound
does not improve it — it returns the rate to baseline exactly.** A mechanism whose benefit vanishes
when you give it more room is not bounded too tightly; it is aimed at the wrong quantity.

**The largest single-frame movement of the picture was not measured on a shipped build, because
there is no shipped build.** That measure exists to prove a repair introduces no jolt; with the repair
reverted the picture is master's, unchanged.

**So: no, the leader does not now stay whole on space-sprint. Nothing costs anything behind him,
because nothing moved. Nothing new moves abruptly, for the same reason.**

---

# WHY IT DOES NOT WORK — and the first version failed differently, which is the useful part

## The first build never engaged, and that was the real finding

I solved the setback from the leader's **intended** placement — `centre + u*(frac−0.5)*extent`, the
point `anchorScreenPoint` puts him at. Measured over the full corpus it **never engaged once, on any
track**: at his intended placement the leader already fits.

**That is the finding this piece really produced. He is not clipped because his placement is too far
forward.** The framing rule puts him somewhere his whole body fits. **He is clipped because the
DELIVERED picture runs ahead of that placement** — the pan trails a leader who is pulling away, and
the camera's own tracking lag is a measured median of about 5 pp of the frame. The overflow is the
lag, not the placement.

## The second build engaged and still did not deliver

Re-solved from his **delivered** screen position — the same quantity LEADER-WHOLE-SETBACK-1 measured
its 50–210 px need against — the mechanism engaged properly: on space-sprint seed 6, **614 of 2,019
LEADER_ZOOM frames asked for a setback and 826 frames carried one**, the held fraction reaching the
0.500 bound at its extreme with a median of 0.653.

**It engaged, and the clipping stayed.** The reason is a feedback loop the measurement could not have
seen, because the measurement computed the need against frames the *old* camera produced:

> **The setback moves the camera, and moving the camera re-creates the overflow it was measuring.**
> Pulling the placement back moves the whole shot back with it; the leader is still running away from
> a pan that still trails him, so he arrives at the frame edge again. The system settles at the
> margin instead of clearing it.

**That is why a looser bound buys nothing.** More room to retreat does not help when the thing you are
retreating from moves with you. The 0.30 and 0.10 arms are the proof: they return the rate to baseline
rather than improving it.

## What that means for the owner's decision

**His decision was sound and the mechanism was not wrong — it was aimed at the placement when the
defect is in the lag.** "The leader gives way, the zoom stays" is answerable, but not by reducing the
forward fraction: the fraction is not what puts him at the edge.

---

# WHAT WOULD HAVE TO CHANGE — named, not built

1. **The setback would have to lead the lag, not follow the overflow.** A quantity computed from where
   he *is* removes its own trigger. One computed from his closing speed against the camera — how fast
   he is pulling away — would set back *before* he reaches the edge and would not unwind itself.
2. **Or the lag itself is the target.** The clipping is the tracking lag expressed at the frame edge.
   Reducing the lag in LEADER_ZOOM specifically would remove the overflow at its cause, and this
   project already measures per-state tracking lag as a standing figure.
3. **Or the guarantee, which is still the complete answer.** MIDRACE-LEADER-CLIP-1's finding is
   untouched by any of this: no term reads a racer's drawn size, so nothing *promises* he is whole. A
   guarantee that took the leader's extent would widen only when needed, and would not chase its own
   tail — but the owner has ruled out widening, so it would have to spend the setback instead.

---

# WHAT WAS BUILT AND THEN REVERTED

For the record, because the next block should not re-derive it:

- **`_easeLogToward(bag, target, ts, dur)`** — the run-in's ease body extracted verbatim into a
  reusable primitive, with `_levelEaseTo` refactored onto it. **It was behaviour-identical**:
  `levelSet.test.js` 17/17 and the full camera suite 885/885 passed against it. If a second user for
  that ease ever appears, this extraction is the right shape and is worth redoing.
- **`_forwardFracForWhole()`** — solved the fitting fraction analytically from linear bounds on the
  frame edges, no step size. Correct as arithmetic; wrong as a target.
- **`_updateForwardSetback()`** — settled one setback per frame at the top of `_setTargets`, before
  any consumer read it, so the guarantees and the pan saw one number. That ordering discipline is
  right and worth keeping in any retry.
- **Delivery through `_forwardFracNow()`** — the single accessor all nine call sites already use, so
  the setback could not be applied to the pan and missed by the guarantees.

**The bound was the frame's own centre (`frac ≥ 0.5`)** — not a new constant, but the neutral value
`anchorScreenPoint` already subtracts, chosen so the leader never travels backwards through his own
shot. Beyond it he stayed partly clipped, which is the better failure. **The bound turned out not to
be the limiting factor**, which the 0.30 and 0.10 arms establish.

---

## VERIFICATION

**Camera suite 885/885 against the built version** before it was reverted, and 22/22 on `levelSet` +
`zoomPivot` after reverting. **No fingerprint moved and none was minted** — the source is master's.
**World and world-off were not touched and did not need checking**, because no product file changed.

**The residual stays and was not attempted**: 0.44% of frames clip ACROSS the track, river-run
carrying half, where a setback moves along the track and cannot reach.

**LEAD_CHANGE and OVERVIEW were not in this piece**, as instructed: LEAD_CHANGE already covers the
leader as a point and has the lowest rate of the three; OVERVIEW has no focus racer, so this mechanism
had nothing to attach to there. Both remain separate decisions.

## SOURCE HYGIENE

**Product source: unchanged.** `git diff` over `client/` and `server/` is empty; the file is master's.
The camera tests were re-run after the revert to prove it.

**Added:** nothing that survives. The two diagnostic scripts this piece used
(`leader-setback-need.mjs`, `midrace-leader-clip.mjs`) were already on master from the measurement
blocks and are unmodified.

**WHAT I NOTICED AND LEFT:**

- **`_easeLogToward` would be a genuine simplification even without a second user** — it isolates the
  re-anchoring contract that RUNIN-EASED-ADMIT-1 paid for. Left out because a refactor with no caller
  is churn, and this branch ships nothing.
- **The tracking lag is the untouched middle term.** It is measured per state as a standing figure and
  is, on this evidence, the actual cause of the mid-race clipping. Out of scope here.
- **The stale conflict marker in `reports/evolution/INDEX.md`** (`||||||| 5204b10b`) — eleventh report
  to record it.

## CONFORMITY

| asked | delivered |
| --- | --- |
| build the setback in LEADER_ZOOM, not by zoom or anchor or config | built exactly so, twice |
| reuse `_levelEaseTo`'s easing, one mechanism one home, no new key or duration | extracted `_easeLogToward`, reused by both; borrowed `runInOpenMs`; no key added |
| decide a bound, state it, say what is beyond it | frame centre `frac ≥ 0.5`; beyond it he stays partly clipped — **and the bound proved not to be the limit** |
| LEAD_CHANGE and OVERVIEW not in this piece; say so | said, with the reason for each |
| the run-in unchanged | untouched; `levelSet` 17/17 against the built version |
| frames needing no setback identical to the pixel | guaranteed by construction — the ease is exactly inert when `target === held`, since `pow(1,e)` is 1 |
| before/after clip rate, largest single-frame movement, room ahead and behind | clip rate in three arms; **the movement and room figures were not taken, because there is no shipped build to take them on** — stated rather than fabricated |
| camera fingerprint expected to move, never minted quietly | it did not move; nothing minted |
| tests with sabotage arms | **not written** — a test suite for a reverted mechanism would be tests with no subject |
| push the branch, do not merge | pushed; not merged |

**The two departures, stated plainly:** the build was **reverted rather than shipped**, and the
sabotage tests were not written. Both follow from the same measurement — the mechanism does not
deliver the outcome it was commissioned for, and this strand has twice been right to stop rather than
ship a patch whose visible consequence is negligible. **The decision to revert is mine and he can
overturn it: the branch carries the full history, so the build is one `git revert` away.**

## PROPOSALS

### A — MINE: aim the setback at the closing speed, not at the overflow
A quantity computed from where he already is unwinds itself. Computed from how fast he is pulling away
from the camera, it would set back before the edge and hold. That is one term and it reuses everything
built here.

### B — MINE: measure whether LEADER_ZOOM's tracking lag is the whole of it
The first build's failure says the placement fits and the delivery does not. `tracking-lag.mjs`
already reports per-state medians; the question is whether the clipped frames are simply the tail of
LEADER_ZOOM's lag distribution. **That is a measurement, not a build, and it would tell the next
block whether to touch the lag or the guarantee.**

### C — MINE: keep the `_easeLogToward` extraction when a second user appears
It was written, tested behaviour-identical, and thrown away with the rest. The next eased quantity in
this file should not write a third ease.

### D — The guarantee remains the only complete answer
Unchanged from two reports ago, and now with one more route eliminated.

## WHAT OUTLIVES THIS REPORT

A mechanism the owner chose, built faithfully, and measured to remove 7% of the clipping on his own
case and none elsewhere — with the proof that its bound was not the limit. And the finding underneath
it, which no measurement had reached: **the leader's placement already fits; it is the delivery that
runs ahead of it.** The clipping is the tracking lag arriving at the frame edge, and a setback that
follows the overflow removes its own trigger.

# LBB-WITHDRAW — CC: settling the withdrawal number

Read-only. Author: CC. I did not read the Copilot files (LBB-WINDOW or LBB-WITHDRAW). Verified at source and
against the existing dumps. What I ran is stated inline.

## The one sentence that matters: my LBB-WINDOW number was wrong.

**My "267 withdrawals, 100% side-closed (`dir = 0`), 0% longitudinal" was an artefact of a bug in my own
classifier.** I treated `dir === 0` and `dir == null` as the same thing ("side blocked"). They are not, and
the difference is exactly the ambiguity this task named. Corrected, the same 267 withdrawals are **84%
longitudinal (room ran out) and 16% side-closed.** The boundary-driven reading — the other review's — is the
correct one.

## The ambiguity, resolved at source

In the pass gate, `dir` is assigned by `chooseFreeLaneDir` **only inside** `if (dT > dTStart && (slowerLeaderOk
|| heroPass))`. The trace variable starts at `null` and is written only if that check passes. So:

- **`dir == null`** ⇒ `(a)` (or the slower-leader precondition) FAILED — `chooseFreeLaneDir` was **never
  called**, the side was **never looked at**. This is a longitudinal / room-ran-out withdrawal.
- **`dir === 0`** ⇒ `(a)` HELD, `chooseFreeLaneDir` WAS called and returned "no free side" — a genuine
  side-close.
- **`dir === ±1`** ⇒ `(a)` held and a free side was found (the dodge is taken, not a withdrawal).

So **the instrumentation DOES distinguish the two causes** — `null` vs `0`. The task's worry ("a recorded
`dir = 0` may mean either blocked or nobody-looked") is real in principle but this trace avoids it by
recording `null` for the nobody-looked case. **My script did not use the distinction** — it bucketed
`dir === 0 || dir == null` as "side blocked" — so every room-ran-out withdrawal was mislabelled as a
side-close. In trace-3 the raw counts make the size of the error obvious: **`dir = null` appears 88,809 times,
`dir = 0` 8,018 times.** Lumping them is what produced "100%".

## The corrected classification

Population (mine): **267** pair-level `takeFreeLane` true→false transitions (consecutive frames, all
`trailer|leader` pairs) in `results/lbb-trace-3-2026-07-15` (mountainstreet/boarder, seed 1; the (d)-removed,
pre-launch-ramp costume — the only dump carrying `dT`/`dTStart`/`dir` per pair). For each first-false frame I
report both facts:

| bucket | count | share | signed margin `dT − dTStart` at first-false frame |
|---|---:|---:|---|
| **(a) failed** — `dir = null`, room ran out, side never checked | **224** | **83.9%** | median **−4.6e-6** (i.e. `dT` just crossed below `dTStart`) |
| **side genuinely closed** — `dir = 0`, `(a)` held | **43** | **16.1%** | median **+2.2e-4** (`dT` well above `dTStart`, so `(a)` held) |
| both in the same frame | 0 (indistinguishable — see note) | — | — |
| neither (`dir = ±1` at a false frame) | 0 | — | — |

**Note on "both".** When `(a)` fails, `chooseFreeLaneDir` is not called, so for those 224 frames I **cannot
know** whether the side was also closed — nobody looked. So "both" is structurally unobservable in this
instrumentation; I report it as 0 observed, not 0 actual. The margin signs confirm the split cleanly: the
`dir = null` group sits a hair BELOW the boundary (median −4.6e-6, `(a)` just failed), the `dir = 0` group
sits well ABOVE it (median +2.2e-4, `(a)` comfortably held). These are two distinct events, not one described
from opposite ends.

## Why the two reviews reported 267 vs 74

Different populations, and it is a finding, not a footnote. Mine is **pair-level transitions** (every
`takeFreeLane` true→false, including one-frame flickers) → 267. The other review's 74 is **sustained dodges
that never reached target** — a per-racer, length-filtered population. Different granularities, but with the
`null`/`0` split applied, **both point the same way: the dominant withdrawal cause is `(a)` failing at the
`dT ≈ dTStart` boundary, not the side closing.** The counts differ because the definitions differ; the
conclusion does not.

## The Owner's question — do the successes have slack, and would they survive a slower traverse?

He is right that overtakes DO complete, and the real question is whether they would still complete more
slowly. Two measurements, one representative and one not:

**Directly, on the representative branch (spring sweep, `fix/lbb-launch-ramp`).** Weakening the pass spring —
which slows the traverse — drops sustained-dodge reach monotonically: **50% → 41% → 23% → 21%** at
passStrength 0.5 → 0.35 → 0.25 → 0.15. So a slower dodge **completes less often**, measured. This is the
Owner's answer in the costume he watches: slowing the crossing roughly HALVES completion, and (per the
classification above) the mechanism is longitudinal — the slower crosser needs more room than remains and
`(a)` fails.

**On the mechanism (trace-3, the only dump with `dT`/`dTStart`; dense-pack, atypical).** Completed dodges run
CLOSE to the boundary: over 4140 active-dodge frames the margin `dT − dTStart` is a median of just **0.09 ×
`dTStart`** (dodges sit ~9% above their own trigger threshold, not with tens of frames of air). Of 19 runs
that cleared, the min-margin median is 1.4e-4 and p10 ≈ 1.2e-6 (some clear by a hair). Replaying a **2× slower
traverse** (doubling `tLat`, which raises `dTStart`): only **6 of 19 cleared runs (32%)** keep `dT` above the
raised boundary — **13 of 19 of today's completions would fall below it and withdraw.**

**The honest caveat, named.** Trace-3 is the dense-pack weave costume with only 19 completions — NOT the
Owner's clear-air overtakes. The representative dodge dumps (`lbb-dodge-speed`, `lbb-spring-sweep`, from the
LBB_JERK instrumentation) **do NOT capture `dT` or `dTStart` per pass frame** — a missing field. So the slack
of a NORMAL, clear-air completion cannot be measured from existing data; the 32% is a dense-pack lower bound.
What IS representative — the spring-sweep reach drop (50%→21%) — says slower completes less; by how much for a
clear-air overtake specifically is not measurable without `dT`/`dTStart` in a launch-ramp capture.

## Do successes differ structurally from failures? (item 3 — thin)

With only 19 clean completions in trace-3, I cannot split success-vs-failure by speed advantage / density /
leader-braking with any confidence — the n is too small and the costume too pathological. The one field-level
number available (LBB-WINDOW): the leader is at the brake floor 46.7% of dodge frames overall. Whether
successes are disproportionately the leader-not-braking cases is **not checked** — it needs a representative
capture with per-frame `dT`, `dTStart`, leader-brake state, and traffic density together, which no existing
dump has.

## What this settles, plainly

- **The remaining-distance / boundary reading is CORRECT.** 84% of withdrawals are `(a)` failing at
  `dT ≈ dTStart`, not side-closing. My LBB-WINDOW "100% side-closed" was a `null`/`0` conflation bug and is
  retracted.
- **Two consequences I drew in LBB-WINDOW are therefore also wrong** and I retract them: (1) that slowing the
  dodge is dangerous "because it lengthens exposure to side-closing" — the dominant failure is longitudinal,
  not lateral; and (2) that a remaining-distance fix "would deliver nothing" — it targets exactly the 84%
  boundary withdrawals. (Per this task I do not evaluate that fix; I only correct the factual basis I gave for
  dismissing it.)
- **The Owner is right that overtakes complete**, and right to ask if they'd survive slower. The measured
  answer where it is representative (spring sweep): slower completes markedly less (50%→21%). The mechanism
  (trace-3): completions hug the boundary and ~2/3 would drop below it at 2× — but that costume is not his
  clear-air case, and the representative slack is unmeasurable without a `dT`/`dTStart` capture.

## What I did NOT check / missing fields

- **`dT` and `dTStart` per pass frame are absent from the launch-ramp dumps** (`lbb-dodge-speed`,
  `lbb-spring-sweep`) — so the representative-completion slack and 2×-survival can only be proxied (spring-sweep
  reach), not measured directly. Named, not approximated.
- **`brakeThenDodge`** — off-branch, not worked around.
- **"Both failed same frame"** is structurally unobservable when `(a)` fails (the side is never checked).
- The 32%-survival replay doubles the ASSUMED `tLat`; the ASSUMED `tLat` (3.4) already under-estimates the
  real ~23-frame duration ~7×, so an honestly-retriggered slower dodge would fare WORSE than 32%, not better.

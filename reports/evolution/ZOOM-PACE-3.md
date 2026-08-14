# ZOOM-PACE-3 — part 1's premise is refuted: it is the ANCHOR that steps, not the zoom

**Branch:** `feat/contender-zoom` @ `4349e5d1`. **NOTHING BUILT — the product source is untouched and
4173 still serves `2adba27f`.** Continues [ZOOM-PACE-2](ZOOM-PACE-2.md).

**I built part 1 as specified, measured it, and it changed nothing at all. Then I found why.** The
step is not in `stateZoom`; it is in the ANCHOR'S FORWARD FRACTION, and the run-in ceiling inherits
it from there. Parts 2 and 3 are not built, because both are shaped around part 1's premise and it
does not hold.

---

## 1. Part 1, built and measured — a complete no-op

Easing `stateZoom` across LEADER_ZOOM → PHOTO_FINISH over `glideDurationMs`, scoped to that
transition alone. The endgame profile on ice-track seed 9 afterwards, against before:

| | ms | zoom | flow px/s | shrink/s |
| --- | --- | --- | --- | --- |
| the crawl, before | 3583 | 1.48 → 2.35 | 95 | −0.129 |
| the crawl, **after** | **3583** | **1.48 → 2.35** | **95** | **−0.129** |
| the leap, before | 467 | 2.44 → 9.50 | 565 | −2.912 |
| the leap, **after** | **467** | **2.44 → 9.50** | **565** | **−2.912** |

**Byte-for-byte identical, every phase.** Reverted rather than left in the tree as dead code.

**Why it cannot work:** the binding term through the entire crawl and leap is `line` — the run-in
ceiling. `stateZoom` is never the minimum there, so easing it eases a number nothing is reading.
ZOOM-PACE-2 §4 already recorded that the binding term is `line` on both sides of the step; what it
got wrong was the inference that the step therefore *came from* `stateZoom` via the ceiling.

## 2. Where the step actually is

The run-in ceiling is `pointGuarantee(subject, finishLine, …, at)`. Its inputs are the subject, the
line, and `at` — the anchor's screen position, which comes from `_forwardFracNow()`. Tracing that
value through the endgame:

| phase | forward fraction |
| --- | --- |
| the shot throws open | 0.343 → 0.392 |
| **the crawl** (3583 ms) | **0.399 → 0.552** |
| **the leap** (467 ms) | **0.500 → 0.500** |
| everything after | 0.500 |

**It climbs smoothly to 0.563 and then snaps to 0.500.** `_forwardFracNow()` reads
`framingFor(this.state).position`: LEADER_ZOOM is a FORWARD state and returns `leaderForwardFrac`,
PHOTO_FINISH is a CENTRED one and returns 0.5. **The run-in interpolates toward a destination that
belongs to the state, and at the state change the destination itself moves.**

The anchor therefore jumps across the frame, the room between the subject and the line jumps with it,
and `pointGuarantee` returns a ceiling 4.1× tighter — target 2.40 → 9.95 — while the binding term
never changes. **That is the leap.**

## 3. What this means for parts 2 and 3

**Part 2 (hold, then close once) is still the right shape and is now better aimed.** The crawl is the
run-in ceiling's own hyperbola — `pointGuarantee` goes as 1/distance, so it is nearly flat while the
leader is far from the line and near-vertical as he arrives. Replacing that curve with *hold, then
one steady close* addresses the crawl AND the leap together, because both are that curve. But its
target must be computed from an anchor that does not move at the state boundary, or the plan will be
re-aimed mid-close by the same step this report is about.

**Part 3 (acceleration, not a rate cap) is unaffected and remains correct** — it is a property of the
delivered zoom and does not depend on which term produced the target. It would also have masked this
step rather than removed it, which is a reason to do part 1 properly first rather than lean on it.

**The corrected part 1 is one line of intent:** give the FORWARD FRACTION a duration across a state
change, exactly as part 1 asked for `stateZoom`. It is the same fix aimed at the quantity that
actually steps. I have not built it, because after two wrong attributions in a row — mine in
ZOOM-PACE-1, mine again here — the next change to this path should be made against a premise that
has been measured rather than reasoned, and this report is that measurement.

## 4. What was NOT done, plainly

Parts 2, 3 and 4 are not built and not measured. There are no new fingerprints, no new key, no Dev
Screen control, and no viewer-terms before/after beyond §1's no-op comparison. **The five invariants
are untouched because the product source is untouched**, and are restated from the last measured run
rather than re-run:

| | |
| --- | --- |
| contenders not whole | 3.2% pooled |
| ice-track seed 9 | 0.0% / 0.0% |
| river-run seed 2814 | 0.0% / 0.0% |
| crossing zoom | median 99% |
| photo-finish frames | 7468 |
| check-runin-frame | PASS both halves |

**4173 still serves `2adba27f`**, which is the last build that was verify-green.

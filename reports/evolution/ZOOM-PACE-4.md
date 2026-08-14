# ZOOM-PACE-4 — the leap is MY corridor cap switching on, and the `binding` probe was lying

**Branch:** `feat/contender-zoom` @ `b29e8a68`. **The corrected part 1 was BUILT, GRADED, and
REVERTED — it did not flatten the leap.** Product source is untouched; 4173 still serves `2adba27f`.

**The cause is found and it is in my own CONTENDER-ZOOM-1 code**, not in any of the three places the
last three reports named. It was hidden because the diagnostic that named the binding term is
computed before the thing that actually decides.

---

## 1. The corrected part 1, built and graded — it did not flatten

Easing the anchor's destination (`_forwardFracNow`'s table value) over `glideDurationMs` across a
state change, read only while the run-in composes.

**The ease works mechanically** — the forward fraction now interpolates `0.564 → 0.500` across the
boundary instead of snapping. **The leap did not flatten:**

| ice-track seed 9, the leap | ms | zoom | world width | shrink/s | flow px/s |
| --- | --- | --- | --- | --- | --- |
| before | 467 | 2.44 → 9.50 | 1259 → 324 | **−2.912** | **565** |
| with the ease | 467 | 2.44 → 9.49 | 1261 → 324 | **−2.915** | **632** |

Identical in duration and shrink-rate, and marginally **worse** in screen flow. **Reverted**, by the
same standard applied to the previous attempt.

**The crawl did not change either** — 3583 ms, 1.48 → 2.35, 95 px/s, −0.129 — which is the one thing
that was predicted correctly: it is the hyperbola's flat foot and belongs to part 2.

## 2. Where the step really is

At true frame resolution — no sampling — the largest single-frame jump in the target is **×4.057**,
`2.47 → 10.02` at leader progress 0.9701. Printing the terms either side of that frame:

| prog | hud | `ceilings.line` | `runInCeil` | **`guaranteed`** | target |
| --- | --- | --- | --- | --- | --- |
| 0.9698 | LEADER_ZOOM | 2.47 | 2.47 | **2.47** | 2.47 |
| **0.9701** | **PHOTO_FINISH** | **3.03** | **3.03** | **10.02** | **10.02** |
| 0.9703 | PHOTO_FINISH | 3.05 | 3.05 | 9.98 | 9.98 |

**`guaranteed` is 10.02 while `ceilings.line` is 3.03.** A `Math.min` cannot exceed one of its own
terms — so something after the minimum is raising it. It is this, from CONTENDER-ZOOM-1:

```
guaranteed = Math.max(guaranteed, _corridorCap);
```

**The corridor cap.** `_corridorWidthCap` returns non-null only in PHOTO_FINISH, so on the frame the
state changes it switches on and instantly demands a shot no wider than the road — from the run-in's
2.47 to 10.02. **That is the entire leap, in one frame, and it is mine.**

The run-in ceiling rises only **×1.225** across the same frame (2.47 → 3.03), and `resolveCamera`'s
widening is **×1.000 throughout** — neither is the step.

## 3. Why three reports missed it — the probe was lying

`_binding` is computed as the argmin over `_ceilings`, and the corridor cap is applied to
`guaranteed` **after** that. So on every frame the cap decides the shot, the probe still reports
whichever ceiling was smallest — `line` — and a trace reading that field concludes the run-in is in
charge when it is not.

**That single defect is why ZOOM-PACE-1, -2 and -3 each named the wrong cause**, and why two builds
aimed at those causes were measured no-ops. It also explains, retrospectively, ZOOM-PACE-1 §3: it
recorded that this arm's entry is **11× sharper than master's** (16.34 against 1.42 zoom/s) and
attributed it to "the contender work" without identifying the mechanism. The mechanism is the cap.

**The probe defect is the first thing to fix, before any repair** — a diagnostic that misattributes
authority has now cost three reports and two builds.

## 4. What the repair is, stated but NOT built

**Give the corridor cap a duration when it engages** — the brief's own instruction, now aimed at the
quantity that actually steps. The cap goes from "not applicable" to fully applied in one frame
because its scope is a state predicate; easing it in over `glideDurationMs` makes the engagement a
move rather than a cut, and it needs no new number.

**Two things to decide first, and they are not mine to decide:**

1. **Whether the cap survives at all.** CONTENDER-ZOOM-1 measured it as *costing* participants —
   level racers not whole 57.3% → 81.7% on the yardstick then in use — and it ships OFF for that
   reason. It is only ON in these traces because `contenderZoom` defaults on for the *contender set*;
   the cap rides along with it. **If the cap were dropped, this leap disappears with it** and part 1
   becomes unnecessary rather than corrected.
2. **Whether the cap should engage at the state change at all.** Its scope is `state ===
   PHOTO_FINISH`, which is a cut by construction. Engaging it on the run-in's own progress measure
   instead would make it continuous without any easing.

I have not built either, and after three wrong attributions I am not going to choose between them
without your word.

## 5. What did not move

Product source untouched, so the invariants are untouched. Restated from the last measured run rather
than re-run: contenders not whole **3.2%** pooled, ice-track seed 9 and river-run seed 2814 both
**0.0% / 0.0%**, crossing zoom median **99%**, photo-finish frames **7468**, `check-runin-frame` PASS
both halves. **4173 still serves `2adba27f`**, the last verify-green build. Nothing minted.

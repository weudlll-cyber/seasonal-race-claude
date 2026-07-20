# LBB-WINDOW — CC: is "start the dodge at 3 lengths and move sideways slowly" viable?

Read-only concept review. Author: CC. I did not read the Copilot file. Verified at source
(`raceBehavior.js`, `storage/defaults.js`, sim racer setup) and measured against the existing
`results/lbb-trace-3-2026-07-15` dump (mountainstreet/boarder, seed 1 — the SAME track/racer/geometry as the
LBB-DODGE-SPEED run, captured with the gate's own `tHalf`/`dT`/`dTStart`/`dynamicBrakeT`/`takeFreeLane`). One
run only — the geometry and the withdrawal reason are not in the LBB-DODGE-SPEED dump, and trace-3 is the same
geometry. What I ran and why is stated inline.

**Verdict up front:** the concept is **half-right and half-misdiagnosed**. "Move sideways slowly" is the real
lever and is clean (it is `vLatMax`, and `tLat`/`dTStart` already derive from it — one source). But the "3
lengths window" does not fix what the Owner is seeing, because **the dodge does not withdraw for lack of
longitudinal room — it withdraws because the free side closes (measured 100% of withdrawals)**. And slowing
the traverse makes that worse, not better: a longer dodge is exposed to side-closing longer, and a side that
closes inside the brake zone brings the braking back. So the concept, applied naively, risks undoing the
Owner's fix by a different route.

## Geometry — measured, not recalled (everything depends on this)

From the gate's own captured values (`tHalf` = 0.001643, `halfSpan` = 0.095) and the track path length
(15665 px, printed by the sim):

- **Racer body length = `brakeContactLength` = 25.7 px** (sum of the two half-lengths; for an identical pair,
  one body length). **Not ~20 px** — Plan-Claude's recalled figure was ~30% low, so any arithmetic built on
  20 px was wrong.
- **Gate opens (`dynamicBrakeT` = 1.5 × `tHalf`) at 38.6 px centre-to-centre = 12.9 px of actual AIR = 0.50
  body lengths.** Confirmed: today the dodge is evaluated with half a body length of air.
- Lateral traverse (`lbHalfSpan`) = 0.095 physicalY = **14.3 px** (1 physicalY ≈ 150 px on this track).
- **Air scales as `(M − 1)` body lengths:** M=2 → 1 BL (26 px), M=3 → **2 BL** (51 px), M=4 → 3 BL (77 px),
  M=5 → 4 BL (103 px).

**Correcting the brief's mapping:** "multiplier 3 ≈ 1 body length of gap" is off by one — M=3 gives **2** body
lengths. The clean relation is `M = 1 + (air in body lengths)`. The Owner's "set up ~1.5 lengths behind"
(1.5 BL of air) ≈ **M ≈ 2.5**; his "3 lengths" (3 BL of air) ≈ **M = 4**. Today's M = 1.5 is 0.5 BL.

## Q1 — does the time budget work?

Budget = air ÷ closing-rate. Traverse need: 14.3 px at 18° (0.78 px/frame) = **18 frames**; today's 43° dodge
is 6.3 frames.

- The gate's per-pair `vClose` uses the trailer's ACTUAL advantage and assumes the leader may be at the brake
  floor (`leaderBrakeWorst = min(leaderBrake, 0.945)`). For a **typical 2%-faster** trailer with the leader at
  the floor, closing ≈ 0.18 px/frame → budget at M=1.5 = **73 frames** ≫ 18. **A slow 18° dodge already fits
  today for typical pairs.**
- For the **extreme** trailer (fastest reroll+draft, `vClose` ≈ 1.11 px/frame), budget at M=1.5 =
  **11.6 frames < 18** — a slow dodge does NOT fit; the window closes (this pair brakes). Widening to M=4
  gives 69 frames — it fits.

So the runway for a natural-angle dodge **already exists for the common case**; widening M only helps the rare
extreme-`vClose` pairs. The Owner's own correction ("the trailer is only a few % faster — 1.5 lengths is
already a lot of time") is arithmetically correct.

**And the 43° is NOT forced by the window.** With 73 frames of budget the dodge could be slow; it is fast
because `vLatMax` (0.028 = 4.18 px/frame, a 60° slide) is the cap and the pass spring (0.5) drives to it. The
slide is a **spring+cap** artefact, not a window artefact. This matters: widening the window does not slow the
dodge — only lowering `vLatMax` does.

## Q2 — THE RISK: `dynamicBrakeT` gates both dodge and brake (confirmed at source)

Verified: inside the speed-brake zone (`|dY| < brakeSameLaneY && dT < dynamicBrakeT`), if the dodge is not
taken the racer brakes (the speed-brake set is populated, brake-to-match caps its speed). The dodge is
evaluated in the SAME zone, upper-bounded by `dynamicBrakeT`. **So raising the multiplier widens the brake
zone too:** a racer that cannot dodge (measured below: 100% of withdrawals are exactly this — no free side)
would enter brake-to-match at M × touching instead of 1.5 × — at M=4, ~6× earlier in distance (77 px vs
12.9 px). Brake-to-match holds the trailer at the leader's speed; starting it 6× earlier is a longer speed
match = a field-wide follow-slowdown, and more brake-hold entries.

**Answer to the crux:** the dodge window and the brake window **must be separated**. If the dodge may START
out to M × touching but the brake still ENGAGES only at 1.5 × touching, then a side-blocked racer in
`[1.5×, M×]` simply coasts (no dodge, no brake) until 1.5×, where it brakes exactly as today — non-penetration
unchanged, no earlier braking. Widening a COMBINED window does not "help via gentler braking"; it converts
coasting room into braking room for the majority (side-blocked) case. Separation is necessary, not optional.

## Q3 — what must move in step, and the ONE source

- **`maxLateralSpeedPerStep` (`vLatMax`) is the one source for the MOTION.** Lower it to slow the dodge.
  `tLat = rampedLateralSteps(lbHalfSpan, vLatMax, …)` derives from it, and `dTStart` derives from `tLat`, so
  the trigger's clear-in-time estimate follows automatically — no hand-copied second number. This is the
  clean part of the concept.
- **`speedBrakeTMultiplier` (the window, 1.5) is a SEPARATE source** and cannot be derived from `vLatMax`.
  Widening it is the "3 lengths" half, and it carries the Q2 brake coupling. So the concept is **two
  constants, not one**: `vLatMax` (motion) and the dodge-window multiplier (runway), the latter needing to be
  split from the brake multiplier.
- `lookBeforeBrakePassStrength` (0.5) need not change if `vLatMax` is lowered — the cap binds first and limits
  the speed regardless of the spring. The launch ramp (5 frames) and `reengageFloorT` (×1.2)/`safeReengageT`
  are `lbTHalf`-based and stay consistent. **Not checked:** whether lowering `vLatMax` interacts badly with the
  launch ramp's `effVLatMax = vLatMax × n/R` (a smaller `vLatMax` makes the ramp's onset frames even smaller).

## Q4 — non-penetration, structurally

Survives. The guarantee is the lower bound `dTStart ≥ lbTHalf + lagFrames × vClose`, `vClose` worst-case,
re-checked every frame (the NO-GO test's "SOLE protector", `hardSeparationEnabled: false`). A slower traverse
raises `tLat`, which raises `dTStart` (one source), so the trigger demands MORE longitudinal room before
authorising — the racer is exposed longer but is only allowed to start when the room covers it. Widening the
window changes only the UPPER bound (`dynamicBrakeT`), not `dTStart`, so it does not touch the guarantee.
**Caveat:** this holds only if `tLat` continues to reflect the true (slower) traverse — i.e. `vLatMax` remains
the single source. A hand-set window that let the dodge start where `dTStart` says it cannot would break it.

## Q5 — second-order effects

- **CPU:** a wider zone puts more pairs through `isSideFree` (already ~26% of sim CPU per the brief, O(n) inside
  O(n²)). At M=4 the zone is ~2.7× wider in `dT`; the pair count in-zone rises roughly in proportion.
  **Not measured** here (no profiling run).
- **`noWindowEver` (27–37%):** widening the window IS the concept's genuine prize — it gives a longitudinal
  window to pairs (extreme-`vClose`, fast trailers) that have none today. But see Q6: it does **not** touch the
  withdrawals, which are lateral.
- **Fairness (band-reach ≥70%, 0 Holm-unfair):** earlier commitment could shift start-row outcomes; **not
  measured** — requires the full re-gate.

## Q6 — the Owner's remaining-distance point: MEASURED, and DEAD

I tracked every `takeFreeLane` true→false transition per `(trailer, leader)` pair in trace-3 and classified
why the dodge withdrew: **267 withdrawals — 100% because the free side closed (`dir = 0`), 0% because `dT`
fell to `dTStart`.** The every-frame full-span `tLat` recompute is NOT what withdraws the gate. The dodges
that never reach do so because a **third racer closes the lateral lane** mid-dodge — the same `isSideFree`
mechanism as the "154 cases in the `dT ∈ (1,1.5)·tHalf` trailer-anchored shadow" this investigation already
flagged. **So the cheap fix (don't demand a full traverse mid-dodge) would deliver nothing** — it addresses a
withdrawal cause that does not occur. **Costume caveat:** trace-3 is the (d)-removed, pre-ramp costume that
`fix/lbb-launch-ramp` descends from, and is racer-22's dense-pack weave; the launch-ramp branch has the same
gate but different traffic, so the 100/0 split is strong same-geometry evidence, not the exact branch. A
launch-ramp capture carrying `dir`/`dT`/`dTStart` would confirm; the signal is unambiguous enough that I did
not spend the run.

**The consequence for the concept:** since withdrawals are lateral, **slowing the dodge makes reach WORSE** —
a longer traverse is exposed to side-closing for more frames, and a side that closes inside the brake zone
brings braking back. This is the tension the window-widening cannot resolve.

## The vClose assumption — what it actually costs

During active-dodge frames the leader is genuinely at the brake floor (`avoidanceActive`) **46.7%** of the
time (trace-3, a dense-pack upper bound). So "the leader may brake" is realised about half the time, not
rarely — the per-pair `vClose` is **not wildly pessimistic**; it also uses the trailer's real advantage, so a
2%-faster trailer already gets a small `vClose` and a wide effective window. The extreme `vClose` (1.11)
requires the extreme trailer AND the leader at the floor together, which is rare. **So "just relax the vClose
assumption" is not the lever the brief hypothesised** — the pessimism is modest and mostly earned in traffic.

## Q7 — recommendation, with numbers

**Partly viable, but not as one lever and not without touching the side-closing problem it does not name.**

1. **The natural angle: lower `vLatMax`, the one source.** To cap the peak near ~18° (0.78 px/frame), `vLatMax`
   ≈ 0.0052 physicalY, down from 0.028 (a ~5× reduction). `tLat` and `dTStart` follow automatically. This is
   the clean, correct half of the Owner's idea ("move sideways slowly").
2. **The window: only if `noWindowEver` proves it, and only with the brake window SPLIT OUT.** Widening
   `speedBrakeTMultiplier` from 1.5 toward ~2.5–4 recovers the extreme-`vClose` pairs, but ONLY after the
   brake-zone edge is decoupled from the dodge-zone edge (Q2) — otherwise the majority side-blocked case
   brakes 6× earlier and the Owner's original complaint returns as a field slowdown.
3. **The reach problem (50% never complete) is orthogonal and dominant** — it is side-closing (Q6), not
   window. Neither #1 nor #2 fixes it, and #1 worsens it. Any build that slows the dodge must pair with a
   free-side-stability fix (the `isSideFree` trailer-anchored `t`-shadow), or reach will fall and braking will
   rise.

**Honest disposition:** #1 alone (lower `vLatMax`) is the smallest change that answers "too fast/unnatural"
and is one-source-clean — but it is NOT free of risk, because it lengthens exposure to the side-closing that
already withdraws half of dodges. I would not ship #1 without measuring reach and `brakeThenDodge` first
(below). The "3 lengths window" as the headline framing is a **misdiagnosis** — the runway already exists for
typical pairs; the failure is lateral, not longitudinal. **This is not a DON'T-FIX, but it is a
DON'T-BUILD-THE-WINDOW-FIRST.**

## Q8 — acceptance criteria (before any build)

- **Angle:** peak, mean, share > 30°, against the field's soft-steering reference (measured peak 61°, mean
  2.4° — the "normal" is itself steep at peaks).
- **Dodge reach %** (currently ~50% sustained) — must not fall; #1 threatens it.
- **`brakeThenDodge` median braked frames** (control ≈ 2; must NOT climb toward 35–50 — the Owner's original
  complaint). **BLOCKER:** this observer is off-branch (`look-before-brake.mjs`, commit `c32cc61`) and is NOT
  present on the current branch, as LBB-WEAVE-BASELINE found. **It must be restored before any of this can be
  graded** — without it the one gate that defines the Owner's fix is unmeasurable.
- **Visible-weave count** (the detector, NOT `zigzagScore` — ρ 0.53/0.12); currently single-race post-process
  only — needs a runnable form.
- **`honestOverlapRate`** (flat 1.9–2.1% today) — must stay flat.
- **Full fairness re-gate** (band-reach ≥70%, 0 Holm-unfair); any `raceBehavior.js` change moves the
  fingerprint `62f7ebeb37880765`.

## What I did NOT check (marked)

- **Launch-ramp branch withdrawal reason** — read from trace-3 (same geometry, (d)-removed pre-ramp costume,
  dense pack), not the exact branch. The 100/0 side-vs-longitudinal split is strong but costume-caveated.
- **`vClose` leader-braking rate off dense traffic** — 46.7% is a pack upper bound; open-road pairs brake less.
- **CPU cost of a wider zone**, and the **fairness** shift — not run (require profiling / the full re-gate).
- **`vLatMax`↓ × launch-ramp interaction** — `effVLatMax` scales with `vLatMax`, so a lower cap makes ramp
  onsets tiny; not measured.

## Hygiene (separate)

- The brief's body-length figure (~20 px) and the "multiplier 3 ≈ 1 body length" mapping are both wrong
  (25.7 px; M=3 = 2 BL). Every future window discussion should quote the measured 25.7 px and `M = 1 + air-BL`.
- `brakeThenDodge` — the metric that defines the Owner's fix — has been unavailable on the working branch for
  multiple tasks now (flagged in LBB-WEAVE-BASELINE and again here). Restoring that observer is a prerequisite
  for grading anything in this family, and its continued absence is why proposals keep being argued rather than
  measured.

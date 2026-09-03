# SLIDER-HEADROOM-1 — the ceiling is 0.70 and it comes from the neighbour; the recorded "validated range" was the top of what had been WRITTEN DOWN, not measured

> **The shipped value does not change. `choreoOutcomeStart` is still 0.60.** The bound moved 0.60 →
> **0.70**, taken from `choreoResolveB3` and confirmed by a sweep that had measured the answer all
> along. **All four fingerprints run against the record and all four match.**
>
> ★ **And raising the widget alone would have been worse than the defect**: a loader eleven files
> away rejects the WHOLE config above 0.6 and silently returns every default. §3.

---

## 1. WHAT ACTUALLY LIMITS IT UPWARD — AND IT IS NOT A FEELING

**The structural answer, from the phase model rather than from taste.** `choreoResolveB3` is a fixed
**0.70**. B3's OUTCOME settling window is exactly `[choreoOutcomeStart, 0.70]`:

| `choreoOutcomeStart` | B3's settling window |
| --- | --- |
| 0.50 | 0.20 |
| **0.60 (shipped)** | **0.10** |
| 0.65 | 0.05 |
| **0.70** | **ZERO** |

**0.70 is the wall.** Past it a band is asked to be resolved before the phase that resolves it has
begun. That is not an opinion about tuning; it is the arithmetic of two constants.

**A second wall agrees, from the other side.** `raceDynamicsConfig.js` rejects any config where
`contestWindowStart <= choreoOutcomeStart`, and `contestWindowStart` ships **0.80** — so 0.80 was
never reachable whatever the widget said. Both walls point at the same place: **the range ends
before 0.80, and the first thing that breaks on the way is B3 at 0.70.**

**And nothing structural stops it below that.** The clamp chain's ceiling is `corridorEnd = 1.0`;
`transitionEnd` (0.75) survives only as a fallback for `corridorStart` that `choreoOutcomeStart`
always overrides; the phase-weight fade is a `MIN_FADE_SPAN` tail that works at any seam. **So the
honest bound is the B3 checkpoint, and it is 0.70.**

---

## 2. ★ THE MEASUREMENT HAD ALREADY ANSWERED THIS, AND THE DOCUMENTS RECORDED IT WRONG

Both documents said the **validated config range is [0.25, 0.60]**, and CONTROL-BOUNDS-1 quoted them
last night as the authority for stopping at 0.60. **SWEEP 2 (2026-07-17) measured four points, not
two.** Its own table:

| track | 0.5 | 0.6 | 0.7 | 0.8 |
| --- | --- | --- | --- | --- |
| city-circuit | 80.1% **FAIL** | 77.8% PASS | 70.5% **PASS** | 61.6% FAIL |
| dirt-oval | 81.8% PASS | 78.4% PASS | 73.2% **PASS** | 63.8% FAIL |
| mountainstreet | 77.1% FAIL | 71.6% FAIL | 63.7% FAIL | 53.1% FAIL |
| ice-track | 80.8% PASS | 78.0% PASS | 72.5% **PASS** | 63.1% FAIL |
| **gate** | **2 of 4** | **3 of 4** | **3 of 4** | **0 of 4** |

**0.70 passes the gate on exactly the same 3 of 4 tracks as the shipped 0.60** — and buys **36% more
lead changes** in the PULK window (13.41 against 9.86). **0.80 collapses to 0 of 4.** The one track
that fails at 0.70 is `mountainstreet`, which fails at 0.6 and at 0.5 as well: it is not a constraint
0.60 satisfies and 0.70 breaks.

**So "[0.25, 0.60]" was the top of what had been WRITTEN DOWN, not the top of what had been
measured** — and last night I took it as the authority for a ceiling. Corrected here, in all four
places that carry it: `defaults.js`, `DEVSCREEN-INVENTORY.md`, `PHASE-CONTRACT.md`, and the widget.

**The headroom is not free, and the operator is told so.** Per-band reach degrades monotonically:
B3 on city-circuit goes **68% at 0.60 → 59% at 0.70**. The gate verdict is unchanged; the margin is
not.

---

## 3. ★ THE SECOND SITE THAT MATTERED — RAISING THE WIDGET ALONE WOULD HAVE BEEN WORSE THAN THE DEFECT

`client/src/modules/raceDynamicsConfig.js` validates the stored config and, on any failure,
**returns `{ ...DEFAULT_RACE_DYNAMICS_CONFIG }` — the whole object.** It carried:

```js
merged.choreoOutcomeStart > 0.6 ||
```

**So a widget that could reach 0.65 or 0.70 would have written a value this loader throws away —
silently, taking every other tuning in that config with it.** An operator would set the slider, come
back, and find their brake, their boost, their intensity and their attacker count all reset, with no
message.

**A control that can write a value its loader discards is worse than one that cannot reach the value
at all.** The validator moved to 0.70 with the widget, in the same commit, and its comment says the
two must move together and why. Two tests pin it: one that 0.70 now survives the loader, one that
0.80 still does not — because of the `contestWindowStart` wall, which is the reason the range does
not go higher.

**Swept, and this was the only live second site:** the range appears in `defaults.js`,
`DEVSCREEN-INVENTORY.md`, `PHASE-CONTRACT.md` (three places), the widget, the validator and its test.
All corrected. `docs/MORNING.md` is rewritten. No report was edited — the change is recorded in the
INDEX corrections block instead.

---

## 4. ★ A RULE BUILT TWO HOURS EARLIER CAUGHT A REAL FAULT I OPENED

Raising the bound, I ran a blind string replacement for `max: 0.6` — and it hit the **first**
occurrence, which is `racePlanPulkStart`'s, not `choreoOutcomeStart`'s. For a few minutes the tree
had `racePlanPulkStart` labelled **"(0.10–0.60)"** over a `max` of **0.70**.

**Rule E, shipped in the previous piece, catches exactly that:**

```
FAIL: RULE E — 1 control(s) state a range they do not have.
    …DynamicsTuningSection.jsx:1229: the control states "(0.1–0.6)" and its bounds are [0.1, 0.7]
```

I caught it by reading the output rather than by the rule firing, and then **re-introduced the slip
deliberately to confirm the rule sees it on the real tree** — it does, and this is the run above.
**A rule built in piece 4 catching a real fault opened in piece 5, the same night, is the strongest
evidence available that it was worth building**, and it is worth more than the fixture sabotage that
proved it originally.

---

## 5. NOTHING CHANGED THE GAME

| role | verdict |
| --- | --- |
| world | matches the record (`8a1977187e9c99b4`) |
| world-off | matches the record (`aa09ed97a3a32689`) |
| camera | matches the record (`152cf295c4c9ff54`) |
| render | matches the record (`485b73d527602a0e`) |

**The shipped value is untouched at 0.60.** Only a widget bound, a validator bound and four
documents moved.

---

## 6. THE FINDING THE OWNER SHOULD SEE, WHICH IS NOT ABOUT THIS SLIDER

The consultation that diagnosed B3 recorded a design smell, and it is worth surfacing rather than
leaving in a salvaged report:

> *"the band checkpoints are absolute constants but only make sense **relative** to where OUTCOME
> begins. B4/B5 (0.65/0.60) fall BELOW 0.6–0.7 and are, incoherently, asked to resolve during or
> before PULK."*

**At the shipped 0.60, B5's checkpoint (0.60) already coincides with OUTCOME's start — zero settling
window — and B4's is 0.05 away.** Every step this slider takes upward closes another band's window
entirely. The proposed direction — `resolve_b = choreoOutcomeStart + k_b·(1 − choreoOutcomeStart)`,
so each band keeps a proportional window — **changes the race and is not a hygiene question.** It is
named here because the headroom this piece granted makes it matter sooner. **On the morning sheet.**

---

## Limits

**SWEEP 2 is from 2026-07-17 and this world is not that world.** Since then: the speed-150
re-baseline, COMBO15, gap-reroll's flip, the B2 attackers at count 3. **The gate results quoted here
have not been re-measured on today's tree**, and the bound rests on the structural argument — the B3
checkpoint — with the sweep as corroboration rather than as proof. Re-running it is 16 configs ×
100 races and is a night's work, not a hygiene pass.

**Nothing above 0.70 was considered.** 0.80 is measured to fail on every track and is excluded by the
`contestWindowStart` wall anyway. What sits between 0.70 and 0.80 has never been measured and is now
unreachable by the widget, which is the intended state.

**The headroom is two steps: 0.65 and 0.70.** 0.65 was never measured by SWEEP 2 — it sits between
two measured points that both pass 3 of 4, so it is interpolation, not measurement. It is reachable
because the grid is 0.05 and the wall is 0.70, not because anybody ran it.

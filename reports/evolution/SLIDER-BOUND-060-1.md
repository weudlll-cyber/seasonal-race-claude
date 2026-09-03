# SLIDER-BOUND-060-1 — the bound is 0.60 again, and this time the WHY is written where the bound is

> **His decision, 2026-09-04**, reversing SLIDER-HEADROOM-1's widening of the day before.
>
> **The shipped value is 0.6 and never moved.** All four fingerprints unmoved.
>
> ★ **The line that was missing is the whole piece**: *0.60 is the edge of what has been MEASURED,
> not a limit of the mechanism.* Without it the next reader raises it again — which is exactly what
> happened, one day apart, by me.

---

## 1. WHY IT MOVED, AND WHY IT MOVED BACK

**The mechanism's wall really is 0.70.** `choreoResolveB3` is a fixed 0.70, so B3's OUTCOME settling
window is `[choreoOutcomeStart, 0.70]` and is **zero wide at 0.70**. SWEEP 2 measured 0.50 / 0.60 /
0.70 / 0.80 and found the band-reach gate holding on **3 of 4 tracks at both 0.60 and 0.70**,
collapsing to 0 of 4 at 0.80. SLIDER-HEADROOM-1 read that and raised the top to 0.70.

**The reversal does not dispute any of it.** It disputes the *world the measurement came from*:
**SWEEP 2 is 2026-07-17**, and since then the tree has taken the **speed-150 re-baseline**,
**COMBO15**, **gap-reroll's flip** and the **B2 attackers at count 3**.

> **Nothing above 0.60 has been measured on the tree that ships.**

So the widening let an operator tune into a range where **no evidence exists**. A slider that reaches
further than the evidence invites a value nobody can defend, and the operator has no way to know
where the evidence stops — because the slider is the only thing that tells them.

---

## 2. ★ THE ONE LINE, AND WHERE IT HAD TO GO

The bound is declared in two places and **both now carry the reason**, in the same words:

> **The top is 0.60 because that is the edge of what has been MEASURED — not because the mechanism
> stops there.**

- `DynamicsTuningSection.jsx`, at the widget's `max`, with the explicit instruction: **do not raise
  this without a measurement on today's tree**, and the named trap — *reading `choreoResolveB3` and
  concluding 0.70 is exactly the step that was taken and reversed.*
- `raceDynamicsConfig.js`, at the validator, the same distinction stated as two numbers (§3).

**This is what SLIDER-HEADROOM-1 did not write, and its absence is why the bound moved.** That report
argued the ceiling from the neighbour and recorded the world-age caveat *in its Limits section* — a
place the next person editing the slider will never read. **A caveat that lives in a report and not
at the line is a caveat that has already failed.**

---

## 3. TWO NUMBERS, DELIBERATELY DIFFERENT — AND WHY THE LOADER WAS *NOT* TIGHTENED

| | |
| --- | --- |
| the **ACCEPTED** range, enforced by the slider | **[0.25, 0.60]** |
| what the **LOADER** tolerates | **[0.25, 0.70]**, unchanged |

**Tightening the loader would have been the obvious move and would have cost an operator their
config.** The slider stood at 0.70 for a day, so **a stored 0.65 or 0.70 is reachable** — and this
validator **rejects the WHOLE OBJECT on any failure**, silently returning every default. Cutting it
to 0.60 would throw away their brake, boost, intensity and attacker count **to correct one key they
can no longer set anyway.**

**A tolerated 0.70 costs one clamp when the slider is next touched. A tightened bound costs the
config.** This project takes no migrations by standing rule, so there is no third option.

**THE RESIDUAL IS REPORTED, NOT HIDDEN:** a stored 0.65 loads and the slider clamps it to 0.60 the
moment it is touched — **CONTROL-BOUNDS-1's defect in miniature**, on a value reachable only during
one day's window. On the morning sheet rather than silently repaired.

---

## 4. THE SWEEP FOR SECOND SITES (constraint 2)

The widened range had **four** live sites beyond the widget. All corrected:

| site | was | now |
| --- | --- | --- |
| `DynamicsTuningSection.jsx` — the label | `(0.25–0.70)` | `(0.25–0.60)`, and **Rule E checks it against the bounds** |
| `DynamicsTuningSection.jsx` — `max` | `0.7` | `0.6` |
| `DEVSCREEN-INVENTORY.md` — the table row | `(0.25–0.70)` | `(0.25–0.60)` |
| `DEVSCREEN-INVENTORY.md` — the prose | *"widget clamp is [0.25, 0.70], which is its validated config range"* | the clamp, the reason, and the loader's deliberate wider tolerance |
| `PHASE-CONTRACT.md` | recorded the widening as current | records the reversal **above** the widening, which is kept as the argument as it stood |
| `raceDynamicsConfig.test.js` | *"the top of the range the Dev Screen can now reach"* | *"the LOADER still accepts 0.70, though the slider no longer reaches it"*, with the reason |

**`PHASE-CONTRACT.md`'s widening paragraph is kept, not deleted.** It is the argument as it was made,
and a reader who finds only the reversal cannot tell whether the question was ever thought about.

---

## 5. NOTHING CHANGED THE GAME

| | |
| --- | --- |
| `defaults.js` → `choreoOutcomeStart` | **0.6**, untouched, as it has been throughout |
| world · world-off · camera · render | **all four unmoved**, each measured |
| Rule C | 96 controls checked, the shipped value still displayable |
| Rule E | 5 stated ranges, **0 disagree** — the label and the bounds moved together |

**343 tests green** across `raceDynamicsConfig` and the Dev Screen. `verify --base=master`:
**PASS 15 FAIL 0**.

---

## Limits

**This does not re-measure anything.** It moves a bound back and writes down why. Whether 0.70 still
holds on today's tree is unknown and stays unknown; re-running SWEEP 2 is 16 configs × 100 races and
is a night's work.

**The reason lives in a comment, and comments rot.** The rule this piece establishes — *a bound
states whether it is a limit of the mechanism or the edge of the evidence* — has **no guard**, and
could not easily have one: "is this number measured" is not a question a script can ask. It is a
human rule, and C6 is where that costs something.

**The loader's tolerance is now wider than the slider's range on purpose, which is a shape this
project usually treats as a defect** (CONTROL-BOUNDS-1 was exactly the reverse case and called the
separation the fault). The difference is direction: a widget that can write what the loader rejects
loses data; a loader that accepts what the widget cannot reach loses nothing until the slider is
touched. **Both numbers are stated in one place with which is which**, which is the most this can be
without a migration.

# CAMERA-WEIGHTS-1 — the four weights must work, not merely exist

Branch `camera-refactor`, one commit. Return tag `pre/weights` (`0c875e08`), registered in
[TAGS.md](../../docs/TAGS.md) in the same step.

**This block MOVES the camera fingerprint, and that is correct.** `deddc4b483a0689b` →
**`4b33c4d31bec93ea`**. The fingerprint is a change detector, not a prohibition. The shipped world
`dc4647be0f55ebdb` is untouched, and the mint tripwire did not fire — the diff stays inside `camera/`.

---

## 1. PART A — THE DIAGNOSIS

**It is failure mode 2, and not for the reason the spec guessed.** The values are read; the wire is
live. `_weightedRandomPick` uses them correctly and `0` already meant never.

The real mechanism is one line: **`if (pool.length === 1) return pool[0]`** — a single candidate is
returned *without its weight ever being consulted*, and without even spending a random draw.

### How much is decided by weights, quantified

Instrumented over **8 tracks × 3 seeds**:

| candidates offered | selections | share |
|---:|---:|---:|
| **0** | 460 | **73.2%** |
| **1** | 105 | **16.7%** |
| 2 | 60 | 9.6% |
| 3 | 3 | 0.5% |

> **The weights decide 10.0% of selections. Eligibility — gates, cooldowns and holds — decides the
> other 90.0%.**

Of the states that did appear, **105 were chosen as the sole candidate** (weight irrelevant) against
**63 from a contested pool**. So even where a shot was taken, the weight had no say most of the time.

That is why the dial felt dead without being dead: `overviewWeight` 0.3 → **10**, a 33× increase,
moved OVERVIEW's share of the race by **1.8 percentage points**.

### The owner's own evidence, checked

He ran `battleWeight` at 0 for weeks. Reproduced: **0 BATTLE_ZOOM frames out of 34,628.** So the
*gate* honoured zero all along — it is the dial *between* 0 and 1 that never worked. His instinct was
right and his configuration was the cheapest available evidence.

### And one real bug, found by the same probe

`leadChangeWeight = 0` still produced **LEAD_CHANGE on 1.8% of frames**. The endgame exception
(priority 2.5) returned LEAD_CHANGE on `pending && cooledDown` and **never checked the weight**. A
weight of 0 must mean the state does not appear — everywhere.

### The oldest open question on this branch

LEAD_CHANGE's large share is **not** its weight. It comes from eligibility: a lead change is pending
often, its cooldown is short, and once offered it was taken unconditionally. Nobody chose 20% — the
gates did.

---

## 2. PART B — WHAT A WEIGHT MEANS

> **A weight is how often you take this shot when it is offered.**
>
> - **0** — never. The state does not appear.
> - **0.7** — when this shot is available, take it about 7 times in 10; otherwise stay on the leader.
> - **1 or more** — always take it when available, and outrank a lower weight when two shots compete.

**Absolute propensity, not relative share, and the reason is decisive.** A relative share ("battle =
70% of the cuts") promises something the camera *cannot deliver*: eligibility is not under its
control, so if a battle never becomes eligible, no weight can give it 70% of anything. A propensity
only ever promises what the gates already allow — which is exactly why it is predictable.

**How it composes with the holds, stated rather than left to the diff.** The holds and cooldowns
still decide **whether** a shot is offered; they are what stops the picture flicking between states
and the weight cannot override them. The weight decides whether an offered shot is **taken**. A
declined offer falls through to LEADER — not to the next candidate, which would make a low weight
silently *boost* whatever came second. **Holds gate, weights choose, in that order.**

---

## 3. PART C — MEASURED, BEFORE AND AFTER

Share of frames per state, 8 tracks × 3 seeds:

| config | OVERVIEW | LEADER | BATTLE | COMEBACK | LEAD_CHG | PHOTO |
|---|---:|---:|---:|---:|---:|---:|
| **today** (defaults) | 22.5% | 27.9% | 18.2% | 8.1% | 20.1% | 3.2% |
| **after** (defaults) | 19.4% | **36.5%** | 20.9% | 5.5% | **14.5%** | 3.2% |
| after, **owner's values** | 22.8% | 45.7% | **0.0%** | 9.6% | 18.7% | 3.2% |
| after, `overviewWeight` 10 | 23.1% | 33.4% | 17.4% | 7.3% | 15.6% | 3.2% |
| after, `leadChangeWeight` 0 | 21.9% | 44.0% | 22.6% | 8.3% | **0.0%** | 3.2% |

**The dial now reaches zero on every path** — `leadChangeWeight` 0 gives 0.0%, where it gave 1.8%
before the endgame fix.

**The high end is bounded by the gates, and that is by design.** `overviewWeight` 10 still only buys
23.1%, because the weight cannot make OVERVIEW *eligible* more often. If he wants more of a state
than its weight can deliver, the lever is that state's **cooldown and start delay**, not its weight —
and naming the right lever is more useful than pretending the weight is one.

**His current values, under the new meaning:** Battle 0 = no battles at all (as he has been running).
LeadChange 0.70 = he declines about 3 in 10 lead-change offers. Comeback 0.60 = declines 4 in 10.
Overview 0.30 = declines 7 in 10. **If he wants all of them, the number is 1.**

---

## 4. THE SHOT RHYTHM WILL CHANGE — how, before he looks

At the shipped defaults the camera now spends **more time on the leader** (27.9% → 36.5%) and less on
lead changes (20.1% → 14.5%) and overviews (22.5% → 19.4%). That is the direct, intended consequence
of weights below 1 finally meaning something: a 0.7 dial now declines three offers in ten, and a
declined offer is leader time.

**I did not retune the defaults.** They now have a meaning, and changing both the semantics and the
values in one block would make the eye test unreadable. If the new rhythm is too leader-heavy, every
weight is a dial that now works — raising them toward 1 restores the old density.

---

## 5. HYGIENE AND TESTS

**Nothing orphaned** — all four controls stay, which is what the owner asked for; they now do
something.

| file | before | after |
|---|---:|---:|
| `camera/CameraDirector.js` | 2890 | **2933** |
| `camera/CameraDirector.test.js` | 6106 | **6178** |

**Two tests adapted, and they are the honest kind of breakage:** *"OVERVIEW fires when eligible"* now
pins `_overviewWeight = 1`, because eligibility only *offers* the shot. They were asserting the old
rule and would otherwise have been rolling dice.

**6 new tests**, including the assertion the spec required — **a weight of 0 excludes its state**, for
all four — plus: 1+ accepts without consulting the dice at all, a fraction is the acceptance rate, the
picker never surfaces a zero-weight candidate, and a **failure proof** for the endgame bypass.
**3460 green.**

---

## 6. THE OWNER'S EYE — two races

1. **Set one weight to 0 and watch. That state must not appear.** It is now true on every path,
   including the endgame exception, where it was not.
2. **Set it to 1 and watch it dominate** — every offer taken. Above 1 adds nothing except priority
   when two shots compete at the same instant.

**Expect a more leader-heavy rhythm at the defaults** (§4). That is the dial working, not the camera
regressing. If a state still refuses to appear as often as you want at weight 1, that is the gates
talking and the lever is its cooldown — tell me which state and I will bring the numbers.

Press **M** and send the **whole** line.

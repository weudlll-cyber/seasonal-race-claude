# ARRIVAL-BRAKE-1 — the standing red is not the gap brake; it is an assertion its own author replaced fifteen hours later

Branch `chore/2026-09-19-clean`, piece 5. Date: 2026-09-19.
**★ READ-ONLY. No source changed, no assertion touched, no default moved, nothing minted.** The
decision this ends at is the owner's.

---

## ★★★ THE ONE LINE

> **The named suspect is exonerated by measurement: with `gapBrakeEnabled` OFF the test still fails,
> 0.812 against a 0.5 bar.**
>
> ★★★ **What it is instead:** `client/e2e/arrival-shape.spec.js:115` asserts that the released hero is
> left alone inside his block — the behaviour of **band steering**, `strictness = 0`. Band steering
> after arrival was **deliberately removed the same day the spec was written**, by
> `17193be6` **ARRIVAL-STEERED-AGAIN-1 (2026-09-13 17:07)**, which restored exact-rank steering. That
> commit **updated the node test to assert the opposite and did not touch the browser spec.**

---

## 1 · WHAT THE SPEC ASSERTS, AND WHAT IT CONTRADICTS

`client/e2e/arrival-shape.spec.js:115`:

```js
expect((braked + pushed) / mults.length, 'he must be left alone inside his block').toBeLessThan(0.5);
```

where `mults` are the held racer's `trajectoryMult` values on the frames after he reaches his drawn
place while his rank is ≤ 5, `braked` is `m < 0.999` and `pushed` is `m > 1.001`.

★★ **The comment immediately above it already says the assertion cannot hold** —
`arrival-shape.spec.js:107-110`:

> *"Today's behaviour steers him to his exact drawn rank there — **braking him for leading in about
> seven frames in ten**. Band steering commands 1.0 for the whole block, so neither brake nor push
> should be common."*

**Seven in ten is 0.70. The bar is 0.50, and `pushed` is added on top.** Measured here: braked alone
is **69.6%** with the brake on — *"about seven frames in ten"*, to the digit. **The comment is
current and correct; the assertion beneath it is the thing that is wrong.**

---

## 2 · ★★ THE BRAKE IS NOT THE CAUSE — BOTH SETTINGS, SAME FIXTURE

The spec's own fixture, reproduced headlessly: **`dirt-oval`, seed `41003`, 20 racers** (Quick Test's
default, `SetupScreen.jsx:604`), the Quick-Test roster, action stage **`quiet`** (the shipped default,
`defaults.js:47`). The statistic is the spec's, line for line, off the same field the probe reads —
`trajectoryMult` on the held racer (`RaceScreen/index.jsx:1131`), sampled once per physics step.

| | `gapBrakeEnabled: true` | ★ `gapBrakeEnabled: false` |
|---|---|---|
| frames in block after arrival | 1871 | 1871 |
| braked (`m < 0.999`) | 1303 | 1158 |
| pushed (`m > 1.001`) | 362 | 362 |
| ★ **(braked + pushed) / frames** | ★ **0.890** | ★★ **0.812** |
| verdict against the 0.5 bar | **FAIL** | ★★ **FAIL** |

★★★ **Turning the brake off moves the number from 0.890 to 0.812 and leaves it 62% above the bar.**
The brake is not what fails this test.

### And it never touches him

| | brake on | brake off |
|---|---|---|
| braked frames where the **brake's command was the one obeyed on him** (`bindingIdx === his index`) | ★ **0** | 0 |
| braked frames where the brake was merely **engaged** on somebody | 813 | 0 |
| mean brake strength on those frames | 0.047 (ceiling 0.13) | — |

★ **Zero.** In 1303 braked frames the brake's command is never the one written to him. What the brake
does change is **who is leading**: with it on he holds the lead for 164 of his in-block frames, with
it off for **none**. It reshuffles the race around him; it does not steer him.

---

## 3 · ★★★ WHAT DOES STEER HIM — BY RANK, WHICH IS THE WHOLE ANSWER

His **drawn place is 4**. The block the spec measures is **rank ≤ 5**. Every frame he spends *better*
than 4th is a frame the servo is pulling him back toward 4th:

**`gapBrakeEnabled: false`** — the brake removed, so this is the servo alone:

| his live rank | frames | braked | pushed | flat (1.0) |
|---|---|---|---|---|
| **2** | 332 | ★ **227** | 0 | 105 |
| **3** | 1016 | ★ **893** | 55 | 68 |
| **4** — *his drawn place* | 523 | 38 | 307 | 178 |

**`gapBrakeEnabled: true`:**

| his live rank | frames | braked | pushed | flat (1.0) |
|---|---|---|---|---|
| **1** | 164 | ★ **106** | 0 | 58 |
| **2** | 609 | ★ **464** | 0 | 145 |
| **3** | 791 | ★ **733** | 55 | 3 |
| **4** — *his drawn place* | 307 | 0 | ★ **307** | 0 |

★★ **He is never at rank 5.** The "block" is in practice ranks 1–4, and his drawn place is the
*worst* rank in it — so "inside his block" and "at his drawn place" are nearly disjoint, and the
servo is doing exactly what it is built to do on almost every frame the spec samples.

★ `minMult` bottoms out at **0.85** in both arms — `DEFAULT_CONTROLLER_PARAMS.minMult` at
`racePlanner.js:103`, the floor every outcome target is clamped to. That is the servo's own floor,
not the brake's 0.13 authority.

---

## 4 · ★★★ WHEN IT BROKE, AND WHY NOTHING SAW IT

All four commits are the same day, `2026-09-13`:

| time | commit | what it did |
|---|---|---|
| **02:21** | `c0c8e374` ARRIVAL-SHAPE-E-1 | **writes the spec, with this assertion**, against the E shape whose part (c) is band steering — *"inside his block `bandError` is 0, so the servo commands 1.0 anyway"* |
| 04:01 | `1997498a` CLEAR-THE-TABLE-1 | keeps the E shape, deletes the switches |
| 16:32 | `1c802e2f` ARRIVAL-SOLVE-1 | last touch of the spec — the ceiling and the on-screen terms |
| ★ **17:07** | ★ **`17193be6` ARRIVAL-STEERED-AGAIN-1** | ★★ **removes band steering after arrival** |

`racePlanner.js:1400-1408` states the removal in its own words:

> *"★ AFTER HE ARRIVES HE IS STEERED, like any other racer (ARRIVAL-STEERED-AGAIN-1, 2026-09-13). He
> used to be put on band steering here — `strictness = 0`, which commands 1.0 anywhere inside his
> block — so that he would not FEEL braked on arrival. **That reason is gone** … What it cost was
> clause 2: unsteered, he opened **3.3× the pre-shape gap at twenty racers**. `strictness` therefore
> stays at the hero's 1.0 and the blend below is exact-rank steering."*

★★★ **That commit changed two files — `client/src/modules/racePlanner.js` and
`client/src/modules/arrivalShape.test.js` — and not the browser spec.** Its own message says so:
*"asserts he IS braked back toward his drawn place, which is the behaviour this piece restores."*
**The node test was turned around to match the new behaviour. The browser spec asserting the old
behaviour was left standing.**

★ **And nothing ran it.** `client/playwright.config.js:11-14`: the browser suite is *"deliberately
NOT in the per-push CI path and not in `npm run verify`'s ordinary routing"* — night work, by the
owner's decision of 2026-08-16. So a contradiction introduced at 17:07 on 2026-09-13 has stood for
six days without a red line anywhere. PROD-BROWSER-1 found it on both arms four days after the gap
brake shipped, which is what made the brake look like the suspect.

---

## 5 · THE VERDICT, AND WHAT IS NOT DECIDED HERE

★★ **The gap brake is exonerated, on measurement rather than on reasoning.** It shipped
2026-09-17; the contradiction dates from 2026-09-13; and removing the brake leaves the test failing
at 0.812.

★★★ **The test and the servo disagree about one thing, and it is a design question, not a threshold
one:** *after a held hero reaches his drawn place, is he steered to that exact rank, or left free
anywhere inside his block?*

- **The servo says exact rank**, and gives its reason at `racePlanner.js:1407`: unsteered he opened
  **3.3× the pre-shape gap at twenty racers**, which is clause 2 of the owner's own criteria.
- **The spec says free in the block** — `arrival-shape.spec.js:107`, *"AND HE IS LEFT ALONE INSIDE HIS
  BLOCK"* — and the reason for that shape is recorded in the servo's own account of what was removed
  (`racePlanner.js:1403`): so that he *"would not FEEL braked on arrival"*, which is the thing a
  person watching sees.

★ **Both are the owner's arguments, fifteen hours apart, and only he can say which one the browser
test should hold to.** Nothing here chooses.

**NO REPAIR WAS MADE.** The assertion is untouched, no default moved, and the threshold was not
loosened — a `< 0.9` bar would turn a true statement about a real disagreement into a green line.

### ★ What is NOT established

- **Whether the same is true on other seeds and tracks.** This is **one race**, which is all the spec
  itself claims to be (*"one race is one sample"*). The mechanism in §3 is structural and would hold
  wherever the drawn place sits below the band edge — but that is an argument, not a measurement, and
  it is not made here.
- **The 3.3× figure is quoted from `racePlanner.js:1407`, not re-measured.**
- **Why `rank 4` shows 307 pushed frames and no flat ones with the brake on**, where the brake-off arm
  shows 178 flat. Both arms push him at his own drawn place; the arrival ceiling
  (`ARRIVAL_CEILING_RANKS = 4`, `racePlanner.js:495`) is the likely reason and was not pursued —
  it does not change the verdict, since the bar is already exceeded by the braked frames alone.

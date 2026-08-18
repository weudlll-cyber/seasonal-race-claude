# DEV-CONTROLS-HONEST-1 — the three controls can no longer show a number the game is not running

**Branch:** `test/dev-controls-honest-1`, off master `2f140c6b`. **MERGE APPROVED**, and merged.

## THE FINDING, ESTABLISHED FIRST — THE CODE WAS ALREADY HONEST; THE TEST WAS NOT WRITTEN

`OWNER-DECISIONS-2026-08-19` §1.1 named three controls in the Dev Screen's Dynamics section that
would display a value the game is not running if their setting were ever missing, **and two of the
hard-coded fallbacks were wrong**: the checkbox would have read *off* while the game runs *on*, and
the bonus multiplier would have read **1.0×** where the game runs **2.0×**.

**ONE-HOME-1 fixed the code and said so, and left one thing open in its own hand-back table:**
_"the code is fixed; the proposed test that renders the panel with empty storage is not written."_
**That is the whole of this piece.** No control needed changing; each already reads the one home.

| control | what it displays | where the value comes from | with the source missing |
| ------- | ---------------- | -------------------------- | ----------------------- |
| **Gap-Reroll enabled** (checkbox) | `dynamicsConfig.gapRerollEnabled` | `raceDynamicsConfig.js`, loaded from storage | falls back to **`DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollEnabled`** — the one home, read not copied |
| **Gap-Reroll strength** (number) | `dynamicsConfig.gapRerollStrength` | same | falls back to **`DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollStrength`** |
| **Race Plan Bonus Strength Multiplier** (number) | `dynamicsConfig.racePlanBonusStrengthMultiplier` | same | falls back to **`DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier`** |

**R14 holds on all three: there is no second definition.** Nothing was added — no key, no component.

**And the fallback is still unreachable through the product**, exactly as §1.1 said: the resolver
always supplies every key. What changed is that it is now **incapable** of showing an invented value
rather than merely unlikely to.

## THE TESTS — FOUR, AND THE FOURTH IS A CONTROL

`client/src/screens/DevScreen/sections/DynamicsTuningSection.test.jsx`. Each carries what breaks if
it is deleted.

**The design is the whole value: the storage loader is mocked to return an EMPTY object — the
missing-setting case the resolver never produces — and the DEFAULTS ARE THE REAL ONES**, pulled
through `importOriginal`. Every assertion compares the rendered value against
`DEFAULT_RACE_DYNAMICS_CONFIG` itself, **so it can never be satisfied by a number typed into the test
file.** A mock that re-typed the defaults would be the second definition this test exists to forbid,
and it would pass against a broken component — that is not a hypothetical, it is what ONE-HOME-1
found in the neighbouring `RaceTuningSection.test.jsx` and repaired.

**The fourth test is a control**, and without it the other three would pass against a component that
ignored stored settings entirely — showing the default no matter what the owner saved, the same
disease pointing the other way.

**SABOTAGE-PROVEN, with the exact wrong literals the audit named:**

| sabotage | result |
| -------- | ------ |
| `?? false` on the checkbox | **red** — _"expected false to be true"_ |
| `?? 0.5` on the strength | **red** — _"expected 0.5 to be 1"_ |
| `?? 1.0` on the multiplier | **red** — _"expected 1 to be 2"_ |

Two of the three tests also assert the shipped value explicitly (`true`, `2.0`) so a later reader can
see the test is not vacuous — the strength's old literal happened to EQUAL its shipped value, which
is precisely why it needed covering: nothing would have noticed when one moved and the other did not.

## FINGERPRINTS

**No fingerprint can move.** The only file added is a test; the closure walk puts it inside **none**
of the four instruments (WORLD/WORLD-OFF 36, CAMERA 36, RENDER 53). `npm run verify` green.

## PROPOSALS

1. **The same shape exists wherever a Dev control falls back**, and this section is not the only one
   with fallbacks. A cheap sweep — grep the Dev Screen for `?? <literal>` — would say how many other
   controls could show an invented value. It is a count, not a fix, and it would take minutes.
2. **A control that falls back at all is arguably the wrong design.** The resolver always supplies
   every key, so every one of these fallbacks is dead code that exists to be wrong. Removing them
   would make the panel throw on a genuinely missing key rather than quietly display something —
   louder, and closer to what R14 wants. **That is a judgement about failure mode and is the owner's,
   not this block's.**

# OUTCOME-WINDOW-1 — the harness camera is not the browser camera, and what that costs

**Date:** 2026-09-07
**Branch:** `night/2026-09-06`, off master `554f348e`. **Not merged.**
**Kind:** MEASUREMENT ONLY. **Nothing was built, no shipped default was touched, and no instrument's
committed behaviour was changed** — every arm below was applied temporarily and reverted, and the
working tree was verified clean afterwards.
**★ NOTHING WAS MINTED.** A value that moves is reported, not recorded.

---

## Re-established at source, and the premise needs one correction

- **`scripts/lib/raceDriver.mjs:501`** — `isOutcomePhase: false`, hard-coded. **76 files** import this
  driver.
- **`scripts/camera-replay.mjs:408`** — `isOutcomePhase: rpPhase === "OUTCOME"`, and `rpPhase` comes
  from `meta.racePlanController.getPhase(st.physicsTs, st.raceProgress)` at `:372`.
- **The browser itself**, `RaceScreen/index.jsx:1484` — `isOutcomePhase:
  diagDataRef.current.rpPhase === 'OUTCOME'`. So `camera-replay.mjs` matches the product exactly, and
  the claim that it is the only instrument doing so is confirmed.

**★ THERE IS A THIRD SITE, AND IT IS THE ONE THAT MATTERS MOST.**
`scripts/camera-fingerprint.mjs:270` hard-codes `isOutcomePhase: false` **in its own loop** — it does
not use `raceDriver` at all. So the camera fingerprint's exposure is its own, not inherited.

**★ AND THE WINDOW IS NOT CLOSED — IT IS DECIDED BY A DIFFERENT RULE.** The consumer is an **OR**
(`CameraDirector.js:1717`):

```js
const _internalOutcomePhase = leaderProgress > this._outcomePhaseThreshold;
if ((raceState?.isOutcomePhase || _internalOutcomePhase) && comebackCooledDown && this._comebackWeight > 0)
```

A hard-coded `false` therefore does not shut the window; it falls back to `leaderProgress > 0.75`.
The premise "the camera fingerprint is taken with that window closed" should read: **taken with that
window opened by a different rule than the browser's.** Everything below measures that difference.

The flag reaches nothing else that decides a shot — its only other use is
`CameraDirector.js:914`, `this._diagIsExternalOutcomePhase`, which is diagnostics.

---

## 1. What the different rule hides — measured, N = 40 races, 172,013 frames

Both values computed per frame on the committed driver, changing nothing:

| | frames | share |
|---|---:|---:|
| the BROWSER calls OUTCOME | 77,488 | 45.0% |
| the INTERNAL fallback (`leaderProgress > 0.75`) calls outcome | 53,184 | 30.9% |
| ★ **only the BROWSER opens** — what the hard-coded `false` hides | **24,344** | **14.2%** |
| only the internal fallback opens | 40 | 0.02% |

**In 40 of 40 races**, and on every track (2,099 to 3,246 frames each). The browser's window opens
**earlier**, essentially always — the plan controller enters OUTCOME before the leader passes 0.75.

**And the hidden frames are not empty.** Of the 24,344, **18,932 had a live comeback candidate** —
`best()` returned somebody, a pure read that mutates nothing. So the difference is not a technicality
about frames nobody would have used.

### ★ Yet NO camera state occurs that did not, on ZERO frames

The driver was temporarily given the browser's value and the whole COMEBACK-CONNECT-1 corpus re-run.
**The two outputs are byte-identical** — not merely the same totals, the same file:

| state | driver (`false`) | browser's way | delta |
|---|---:|---:|---:|
| LEADER_ZOOM | 71,398 | 71,398 | 0 |
| BATTLE_ZOOM | 38,170 | 38,170 | 0 |
| LEAD_CHANGE | 26,384 | 26,384 | 0 |
| OVERVIEW | 21,983 | 21,983 | 0 |
| PHOTO_FINISH | 8,793 | 8,793 | 0 |
| COMEBACK_ZOOM | 5,285 | 5,285 | 0 |

Comeback shots 11 → 11. **The arm was proven live before this was believed**, because a zero from a
disconnected lever is worthless: instrumented, it returned `true` on **2,272 of 5,083 frames** on
city-circuit seed 1 alone.

So on this corpus the external flag is **inert**, despite opening the window on 14.2% of frames with
a candidate present on most of them. The mechanism is not fully localised here and is **not guessed
at**: the flag only admits the comeback candidate to the contest, and admitting it on those frames
did not change a single pick.

---

## 2. ★ Whether the camera fingerprint would move — IT DOES

`camera-fingerprint.mjs`'s own hard-coded `false` was temporarily replaced by the browser's rule and
the instrument run against the record.

```
recorded : 152cf295c4c9ff54
measured : 75aef5cd474c54e5
```

**★ THE VALUE IS REPORTED AND NOTHING IS MINTED.** `docs/fingerprints.json` is untouched.

**4 of 10 tracks move; 6 do not:**

| track | recorded | the browser's way |
|---|---|---|
| city-circuit | `4c3d41af8cb0f312` | **`2dfbe7b6a4327a7d`** |
| dirt-oval | `b0b16050e4166e87` | **`5c89252223baaf6f`** |
| ice-track | `93dbec30a1879218` | **`d7065f4e61574e3e`** |
| space-sprint | `39716fb9cd42c1ff` | **`16122638d5e4bd0a`** |
| garden-path, luger-hill, mountainstreet, river-run, searound, seatrack | — | **unchanged** |

**Frame counts are identical on all ten tracks**, so nothing about race length or the ending window
moved — only the director's decisions, which is exactly what this fingerprint covers.

**That the corpus in §1 showed no change and this one does is not a contradiction.** They are
different races on different seeds, and this instrument hashes the director's decisions frame by
frame — including the ending — where §1 counted which state occupied which frame. The honest reading
is that the flag is **inert on one corpus and live on the other**, so "it does nothing" is not
available as a conclusion.

---

## 3. ★ What else runs through the same driver

**76 files import `scripts/lib/raceDriver.mjs`**, and every one of them therefore measures a camera
whose outcome window opens by `leaderProgress > 0.75` rather than by the plan controller's phase.
They are **named, not repaired** — nothing here changes any of them.

The ones that carry weight rather than being one-off diagnostics:

- **`scripts/viewer-invariants.mjs` — THE SHIP GATE.** The pre-merge browser gate runs on this driver.
- **`scripts/check-runin-frame.mjs`** — a verify guard, run on every selecting change.
- **`scripts/tracking-lag.mjs`** — produces the figures stamped in `docs/CAMERA_DIRECTOR.md`.
- **`scripts/straggler-truth.mjs`** — produces the figures stamped in `docs/ENDING-PHASES.md`.
- **`scripts/diag/comeback-beats.mjs`** — COMEBACK-BEATS-1, COMEBACK-WEIGHT-1 and last night's
  COMEBACK-CONNECT-1 all measured through it. §1 above is the direct evidence that its numbers do
  **not** move under the browser's value, which is the one place this exposure has been checked.

`scripts/camera-fingerprint.mjs` is **not** on that list — it hard-codes its own, as established.

---

## What blocks adopting the browser's value

Nothing technical. It is four lines and `meta.racePlanController` is already in scope at both sites.

**What blocks it is the consequence:** adopting it **moves the camera fingerprint**, and a fingerprint
is minted only on the owner's word, per occurrence. It would also silently re-base every figure the
76 consumers have produced — including two stamped documents and the ship gate — so the change is not
"correct the instrument" but "re-base the camera's entire measurement history", which is a decision
and not a repair.

**Nothing is proposed.** The value is `75aef5cd474c54e5`, the four moving tracks are named above, and
the decision is his.

---

## Hygiene

Two temporary arms, both reverted and both verified gone (`git status` clean, zero matches for the
arm marker in either file): `scripts/lib/raceDriver.mjs` and `scripts/camera-fingerprint.mjs`. The
probe that produced §1 lives outside the repository and never entered it. **No file in this
repository was changed by this piece** other than this report and its index line.

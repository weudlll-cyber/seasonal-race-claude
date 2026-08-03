# CAMERA-LATERAL-1 — follow along the track, centre across it

Branch `camera-refactor`, one commit (`41d2ed38`). Camera-only: **no simulation file in the diff**, no
engine ceremony, no fingerprint. Return tag `pre/lateral` (`3b06f78f`), registered in
[TAGS.md](../../docs/TAGS.md) in the same step.

The owner, after the reference-width block: *"what I really need now is the camera guided laterally on
the centreline, because the jumps look partly even worse."* He is right, and the reason is measurable:
the shot is now **225 world px** where it was 600 on the wide tracks, so the same lane change is ~2.7×
larger a share of the frame. **The unit did not cause the jumping; it exposed it.**

---

## 1. THE RULE

| axis | behaviour |
|---|---|
| **ALONG** the track | the camera follows the subject, forward offset and all — **unchanged** |
| **ACROSS** the track | the camera sits on the corridor centreline |
| the **guarantee** | shifts off the centreline only when a guaranteed subject would otherwise leave the frame |

No threshold, no mode switch, one rule for all six states — the same shape as everything else here: a
default position plus a guarantee that corrects only when it must.

### This is NOT CAMERA-FOCUS-3

It resembles the saga's original defect, where the camera tracked the centreline for months because
the follow observer was never switched on. It is not the same thing, and the code says so at length
where someone would find it:

> **THAT bug pinned BOTH axes, and it was an ACCIDENT. THIS pins ONLY the cross-track axis, and it is
> DELIBERATE.**

`_smoothFocal`, `_applyLeaderForwardBias` and the whole follow path are untouched. A test pins the
along-track axis explicitly, so deleting the pin cannot pass as a fix.

---

## 2. MEASURED — before and after

Real seeded races, the real state machine, the shipped defaults, 40 racers.

### The lateral jump AT an anchor change — what he actually sees

| track | before | after | as a share of the 225 px shot |
|---|---:|---:|---:|
| **Dirt Oval** | 62.3 px | **16.3 px** | 28% → **7%** |
| **Searound** | 72.1 px | **18.5 px** | 32% → **8%** |
| Mountainstreet | 84.3 px | 64.8 px | 37% → 29% |

### Sideways travel, per state (world px/s)

| state | Searound | Dirt Oval |
|---|---:|---:|
| LEADER_ZOOM | 18.2 → **8.8** | 13.0 → **7.4** |
| LEAD_CHANGE | 18.0 → **8.2** | 12.0 → 10.7 |
| COMEBACK_ZOOM | 10.0 → **1.7** | — |
| BATTLE_ZOOM | 7.7 → **1.6** | 5.9 → **1.3** |
| PHOTO_FINISH | 4.1 → 7.9 | 0.5 → 0.3 |

Distance off the centreline falls with it: Searound COMEBACK **33.9 → 0.5 px** mean, LEADER
**20.4 → 4.5**; Dirt Oval BATTLE **1.4 → 0.3**.

At the tightest setting (0.25): Searound mean off-centreline **17.6 → 10.6 px**, sideways
**21.3 → 17.9 px/s**.

### The one track that got worse — Mountainstreet

Its corridor is **300 px inside a 225 px shot**, so the corridor guarantee is already widening hard
and the lateral guarantee then works on nearly every frame: LEADER sits **40.7 px** off the centreline
where it used to sit 11.0.

The cause is named, not guessed. The corridor **zoom** guarantee sizes the shot assuming the anchor is
**centred**, while the forward bias moves it — and on a diagonal heading that costs perpendicular
room. The lateral shift pays the difference every frame. That is the same class of error fixed for the
company guarantee in CAMERA-COMPANY-2 (assumed centre vs. actual anchor position), and **folding the
anchor's real frame position into the corridor guarantee is the named next step**. Out of scope here:
this spec keeps the guarantees as they are.

**So the answer to "how often does it shift at all" is track-dependent:** essentially never on the
closed tracks (the numbers above are the centreline being held), and essentially always on
Mountainstreet. He should know that before judging.

---

## 3. A DEFECT THE MEASUREMENT CAUGHT MID-BUILD

`lateralShiftToFit` is **strictly one-dimensional**, and that is a fix rather than a simplification.

Written first as *"bring these screen points inside the frame rectangle"*, it also tried to rescue a
subject that was out of frame **along** the track — because a diagonal perpendicular has a component
on both screen axes. On an open track's LEAD_CHANGE, where the passed racer can be far behind, that
drove the camera **500 world px** off the centreline chasing something no sideways move could reach.

The guarantee now owns the lateral axis and is never handed the other one. The signature is the proof,
and a test asserts it.

**Also fixed:** my harness ran open tracks at 2 laps where `RaceScreen` uses `MIN_LAPS = 1`, so `t` ran
past the end of the road. Harness-only — no shipped code depended on it — but it made the first
Mountainstreet numbers meaningless and is worth recording.

---

## 4. HIS SECOND QUESTION — "do we still see everything important?"

Verified **deterministically**, which is stronger than a percentage: a racer on the **outermost lane**,
at the **tightest setting the control allows (0.25)**, at the track orientation where the corridor runs
along the **short screen axis**, on **both** sides. The guarantee catches him in every case, and the
test fails if it stops doing so.

**What I did not deliver, and why.** I tried to add a race-wide coverage percentage and abandoned it.
The anchor's track position is not recoverable from the director's public state — `camT` lags it by
~0.025 lap (measured on Dirt Oval: `camT` 0.6367 against a leader at 0.6621, putting the reconstructed
corridor 600 screen px from where the camera actually was). Every version of that metric ended up
measuring the corridor somewhere the guarantee never promised anything about, producing 20–70%
"failure" rates that were artefacts. I would rather report no number than one I cannot stand behind.
Exposing the anchor's `t` for diagnostics would make that measurement possible and is a small, separate
change.

---

## 5. HYGIENE AND TESTS

**Nothing orphaned.** This adds a rule; it does not replace a key, a control or a default.

| file | before | after |
|---|---:|---:|
| `camera/CameraDirector.js` | 2768 | **2881** |
| `camera/framingRule.js` | 376 | **426** |
| `camera/framingRule.test.js` | 627 | **827** |

**12 new tests.** The guarantee as arithmetic: holds the centreline at exactly 0, shifts by the least
that works, returns to 0 the very next frame (no memory, no hysteresis), honours an asymmetric frame,
satisfies every subject at once rather than the worst one, and splits an impossible set instead of
picking a side — plus the along-track failure proof. Through the director: **the lead-change pin**
(his exact ask, and nothing tested it before), proof that the along-track axis still follows, all six
states on the centreline, and the worst-case outer-lane check. **3424 green.**

**Simulation paths** treated as such and absent from the diff: `scripts/sim-fairness.mjs`,
`scripts/lib/**`, `scripts/exp-*.mjs`.

---

## 6. THE OWNER'S EYE

1. **Watch a race with several lead changes — does the picture stop jumping sideways?** On Searound
   and Dirt Oval the jump is down from about a third of the frame to under a tenth. On Mountainstreet
   expect less improvement; §2 says why.
2. **Do we still see everything important — is any racer that matters ever cut off at the side?** If
   one is, that is the guarantee failing and it is the finding that matters most. Say which track,
   which state, and roughly where on the lap.

**Try it at the default 0.75 and again at something tight** — 0.4, or 0.25 if you want the extreme.
The tight setting is where the lateral guarantee earns its keep, and it is also where you are most
likely to catch it failing if it is going to.

Press **M** and send the **whole** line.

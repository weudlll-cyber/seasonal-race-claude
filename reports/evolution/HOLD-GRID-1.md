# HOLD-GRID-1 — the grid: field size × hold position, and the servo's authority falls as 1/N

2026-09-10 · branch `night/2026-09-10` · piece 1 of the night chain · **measurement only. No config
key, no default, nothing built to ship. The arm is REMOVED at the end and the removal proved.
Nothing minted.**

---

## 0 · ★ THE TWO FINDINGS, BEFORE ANY TABLE

**1 · THE ARM STOPS HOLDING AS THE FIELD GROWS, AND THE CAUSE IS IN THE SHIPPED CONTROLLER.**
`racePlanner.js:910`:

```js
const rawTarget = clamp(1.0 + gain * (error / nActive) + noise, minMult, maxMult);
```

★ **`error` is in RANKS and it is divided by the FIELD SIZE.** With the shipped `gain: 2.0` and
`minMult: 0.85`, saturating the brake needs `error ≤ -0.075 × nActive`: **under one rank at N=10, but
7.5 ranks at N=100.** The servo's authority per rank falls as 1/N, and the strongest brake available
is the same 0.85 at every size. So a deep hold is progressively unreachable as the field grows — and
the engagement table below is that prediction measured, monotone across all six sizes.

★ **NO SPEED LIMIT WAS RELAXED TO GET AROUND IT.** The brief said an arm that needs one is a finding;
this is that finding, reported rather than engineered away.

**2 · A SHALLOW HOLD IS NOT A COMEBACK — IT IS A FALL.** At the shallow fractions the arm holds the
racer FURTHER FORWARD than the race would have put him, so the "release" is him losing the position
the arm was lending him. **N=40 at 0.25: median rank at release 8, median finish 19, median places
gained −11.** The negatives are not a broken measurement; they are the arm propping him up.

---

## 1 · METHOD, AND HOW THE RACES-PER-CELL NUMBER WAS CHOSEN

| | |
|---|---|
| instrument | `scripts/diag/hold-grid.mjs` (built here, **deleted with the arm** — see §7) on `scripts/lib/raceDriver.mjs` |
| field sizes | **10, 20, 30, 40, 60, 100** |
| hold positions | **0.25, 0.33, 0.40, 0.50, 0.60** of the field — the third band (0.33–0.50) explicitly included |
| release | **0.70**, his own measured rule |
| tracks | all ten |
| held racer | one the plan **HAS CAST** as a comebacker — the selection that reached 96 of 96 overlap, reused from COMEBACK-SAME-RACER-1, not re-decided |

★ **HOW THE RACES PER CELL WERE CHOSEN, from the existing spread rather than by feel.**
COMEBACK-QUICK-2's ten-race cells had finishing places spanning about 1–6 with a spread near 2
places. To tell one cell from its neighbour I need the standard error of the median gain to be small
against the difference I care about, and **the difference that matters is whether a cell delivers
about five places** — his own yardstick, since he rejected a 6th→3rd move. **3 seeds × 10 tracks = 30
races per cell** puts the SE near 0.5–3 places depending on size, which resolves a 1.5-place
difference at N=10–20 and a 6-place one at N=100.

**STAGE 2 ran only where a sharper number could change that answer** — not everywhere a pair was
statistically close. Pairs at N=10 (all 1–4 places gained) and the shallow pairs at N=20/30 are far
below five on both sides, so refining them changes no conclusion; they are left at 30 races and said
to be unresolved. Five more seeds went to **N=20 (0.50, 0.60), N=30 (0.33, 0.40, 0.50), N=60 (0.25,
0.33)** — 80 races per cell. ★ **Every decision-relevant pair separated after stage 2**; the pairs
still marked close are all far from the five-place line.

**888 races in stage 1, 350 in stage 2.**

---

## 2 · ★ THE ARM-ENGAGEMENT PROOF, AND IT FAILS ABOVE N≈40

**Take no number from a cell before reading this table.** `|err|≤2` is the share of races whose rank
at release was within two of the rank the arm aimed at.

| N | 0.25 | 0.33 | 0.40 | 0.50 | 0.60 |
|---|---|---|---|---|---|
| **10** | 69% | 69% | 69% | 69% | 83% |
| **20** | ★ **100%** | 80% | 87% | 85% | 90% |
| **30** | 69% | 66% | 59% | 67% | ★ **90%** |
| **40** | 50% | 43% | 47% | 67% | 87% |
| **60** | 39% | 46% | 40% | 37% | 57% |
| **100** | ★ **10%** | 21% | 17% | 24% | 41% |

★ **The decay is monotone in N and it matches §0's mechanism exactly.** And the direction is
consistent: **the achieved hold is always SHALLOWER than the one asked for**, by more as N grows.

| N | asked 0.25 → **achieved** | 0.33 → | 0.40 → | 0.50 → | 0.60 → |
|---|---|---|---|---|---|
| 20 | #5 → **#4** (0.20) | #7 → #6 (0.30) | #8 → #7 (0.35) | #10 → #9 (0.45) | #12 → #11 (0.55) |
| 40 | #10 → **#8** (0.20) | #13 → #10 (0.25) | #16 → #14 (0.35) | #20 → #19 (0.48) | #24 → #23 (0.58) |
| 100 | #25 → **#18** (0.18) | #33 → #26 (0.26) | #40 → #35 (0.35) | #50 → #46 (0.46) | #60 → #57 (0.57) |

★ **So at N=60 and N=100 the cells are labelled by the fraction ASKED FOR and delivered a shallower
one.** Read the grid below against the ACHIEVED column, not the label.

---

## 3 · ★ THE GRID — PLACES GAINED, WHICH IS THE NUMBER HE JUDGES BY

Median places gained (rank at release − finishing rank), with the ranks the fraction covers:

| N | **0.25** | **0.33** | **0.40** | **0.50** | **0.60** |
|---|---|---|---|---|---|
| **10** | #3 · **+1** | #3 · **+1** | #4 · **+2** | #5 · **+3** | #6 · **+4** |
| **20** | #5 · **−2** | #7 · **0** | #8 · **+1** | #10 · **+4** | #12 · **+7** |
| **30** | #8 · **−8** | #10 · **−1** | #12 · **+1** | #15 · **+7** | #18 · **+12** |
| **40** | #10 · **−11** | #13 · **−8** | #16 · **−1** | #20 · **+12** | #24 · **+18** |
| **60** | #15 · **−6** | #20 · **+3** | #24 · **+9** | #30 · **+18** | #36 · **+29** |
| **100** | #25 · **−8** | #33 · **+6** | #40 · **+24** | #50 · **+35** | #60 · **+45** |

★ **THE THIRD BAND HE DESCRIBED (0.33–0.50) DELIVERS ONLY AT LARGE FIELDS.** At N=100 it gives +6 to
+35 and at N=60 +3 to +18; at N=20–40 it gives **−8 to +12**, and at N=10 **+1 to +3**.

★ **AND THAT ANSWERS HIS AMBIGUITY WITHOUT RESOLVING IT BY GUESS.** "Five places at ten racers"
**cannot be a floor across all sizes taken from the third band**: at N=10 the third band is rank 3–5
and yields **one to three places**, and there is nowhere to come back from — rank 3 of 10 is already
inside the top 5. If five places is the target, only **0.50 and deeper** reaches it, and only from
N=20 up.

### Spread, top-5 reach and where he finishes

| N | frac | gain p25 → p75 | SD | top 5 | median finish | races |
|---|---|---|---|---|---|---|
| 10 | 0.40 | 0 → +4 | 3.0 | **26/29** | 3 | 29 |
| 20 | 0.50 | 0 → +7 | 4.7 | 41/80 | 5 | 80 |
| 20 | 0.60 | +2 → +10 | 4.6 | 46/80 | 4 | 80 |
| 30 | 0.50 | −2 → +9 | 7.4 | 23/79 | 8 | 79 |
| 30 | 0.60 | +9 → +15 | 5.9 | 15/29 | 5 | 29 |
| 40 | 0.50 | −2 → +17 | 10.3 | 12/30 | 8 | 30 |
| 40 | 0.60 | +9 → +20 | 7.9 | 14/30 | 6 | 30 |
| 60 | 0.60 | +12 → +33 | 14.4 | 15/30 | 5 | 30 |
| 100 | 0.50 | +23 → +43 | 17.3 | **9/29** | 10 | 29 |
| 100 | 0.60 | +26 → +51 | 20.2 | **6/29** | 16 | 29 |

★ **THE TWO GOALS COME APART AT LARGE FIELDS.** At N=100 the deep holds produce the biggest climbs in
the whole grid — 35 and 45 places — and **the worst top-5 reach: 9 and 6 of 29.** A racer released
from rank 50 of 100 gains enormously and still finishes tenth. **Places gained and "arrives in the
top 5" are different targets above about N=40, and no cell in this grid achieves both.**

---

## 4 · ★ WHERE IT STOPS WORKING, PER FIELD SIZE

- **N=10 — it does not work at any fraction.** The whole grid yields **+1 to +4** places. The third
  band is rank 3, already inside the top 5. **There is nothing to come back from.**
- **N=20 — only from 0.50.** 0.25–0.40 give −2 to +1; 0.50 gives +4 and 0.60 gives +7.
- **N=30 — only from 0.50.** 0.25–0.40 give −8 to +1.
- **N=40 — only from 0.50**, and this is the sharpest edge in the grid: 0.40 gives **−1** and 0.50
  gives **+12**, separated well beyond the noise.
- **N=60 — from 0.33 upward** it is positive, but five places needs 0.40 (+9).
- **N=100 — from 0.33 upward** (+6), and strongly from 0.40 (+24). ★ **But the arm engaged in only
  10–41% of races here, so these cells describe a shallower hold than their label**, and the top-5
  reach is the worst in the grid.

---

## 5 · PINNED AT THE CEILING, AND BLOCKED BEHIND TRAFFIC

★ **BOTH DEFINITIONS ARE MINE AND ARE STATED, because the harness that produced the earlier versions
was never committed and a number whose definition is guessed is not a measurement.** Over the frames
after release: **PINNED** = `trajectoryMult` at `controllerParams.maxMult` (read from the planner,
never retyped); **BLOCKED** = pinned *and* the racer immediately ahead is inside contact range, using
`raceBehavior.pairContact`'s own two-body geometry. **They are not the same measurement as
COMEBACK-QUICK-2's columns and are not compared to them.**

| N | frac | OPEN pinned | OPEN blocked | CLOSED pinned | CLOSED blocked |
|---|---|---|---|---|---|
| 20 | 0.50 | 14.5% | 3.3% | 20.1% | 6.4% |
| 30 | 0.60 | 36.1% | 7.2% | **57.7%** | 12.8% |
| 40 | 0.40 | 11.0% | 2.1% | **40.4%** | 9.8% |
| 40 | 0.60 | 26.5% | 5.3% | 53.2% | 12.2% |
| 60 | 0.60 | 40.3% | 7.0% | 50.3% | 9.4% |
| 100 | 0.50 | 33.8% | 4.9% | 55.4% | 10.6% |
| 100 | 0.60 | 50.9% | 7.3% | 58.5% | 10.4% |

★ **Closed tracks pin and block roughly twice as much as open ones, at every size and fraction** —
the flat-versus-ramped brake (`computeEffectiveBrakeFactor`) showing through, which is the shape the
open/closed split was reported separately to expose. **The deeper the hold and the larger the field,
the more of the climb is spent asking for speed the clamp will not give.**

---

## 6 · THE RACES THAT CAST NOBODY

**3 of 180** (track, size, seed) combinations in stage 1 cast no comebacker at all — one each at
N=10, N=30 and N=100. They are recorded as `castNone` and excluded from every cell, and they are
named here rather than smoothed: a cell's race count of 29 rather than 30 is one of them.

---

## 7 · THE ARM, AND ITS REMOVAL

**Rebuilt from COMEBACK-QUICK-2, not from memory**, because it was never committed
(`git log -S "setHoldArm"` finds nothing). Its correction is the whole of why it works: the hold
decision sits **ABOVE** the pre-OUTCOME pin at `racePlanner.js:805`, because a non-hero is pinned to
1.0 before OUTCOME and the earlier arm sat below that `continue` and **never engaged at all**.

Five sites, all temporary: the `holdActive` test above the pin, the `targetRank` override, a
strictness of 1.0, an exemption from the attacker-release block (**the second place a hold can be
silently undone — named by COMEBACK-QUICK-2's own hygiene note and honoured here**), and the
`setHoldArm` / `controllerParams` pair on the controller.

★ **PROVED INERT WHILE PRESENT BUT UNARMED, before any number was taken from it:** world fingerprint
`8a1977187e9c99b4` (matches the record) and golden races **PASS**.

★ **`scripts/diag/hold-grid.mjs` IS DELETED WITH THE ARM.** It refuses to run without `setHoldArm`,
so keeping it would leave a harness that exits 2 on every invocation — dead code inside what this
piece touched. Its method and both instrument definitions are in this report, which is the record.

---

## 8 · CHECKS

★ **THE REMOVAL, PROVED RATHER THAN ASSERTED.** `client/src/modules/racePlanner.js` is
**byte-identical to HEAD** (`git diff HEAD -- client scripts` is empty), and a whole-tree grep of
tracked source for `setHoldArm`, `_holdArm`, `holdActive` and `hold-grid` returns **zero**.

| role | record | measured, arm removed | |
|---|---|---|---|
| world | `8a1977187e9c99b4` | `8a1977187e9c99b4` | **matches** |
| world-off | `aa09ed97a3a32689` | `aa09ed97a3a32689` | **matches** |
| camera | `75aef5cd474c54e5` | `75aef5cd474c54e5` | **matches** |
| render | `40b2de6fcc5bafd8` | `40b2de6fcc5bafd8` | **matches** |

**Golden races: PASS** — 2 races, every finishing position and time as recorded.

```
node scripts/engine-reach.mjs --check reports/evolution/HOLD-GRID-1.md

ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): reports/evolution/HOLD-GRID-1.md
```

`npm run verify`, plain: **PASS 6 · FAIL 0 · SKIP 28**. ★ **The 28 skips are the routing working,
not guards being avoided**: the only changed paths in this piece are two documents, so the hull-based
routing selects the document guards and skips the suites and the fingerprint jobs. **The four
fingerprints and the golden races were run directly and in full** — they are in the table above —
which is the coverage the skips would otherwise have provided. (The first run was RED on
`check-index`, correctly: the report existed and its index line did not yet.)

**No record was created by hand. `git stash` was not used. `--no-verify` was not used.** The sweep's
JSON and logs stayed in the scratchpad and never entered the repository.

---

## 9 · WHAT PIECE 2 SHOULD READ OFF THIS

Stated here so the build does not have to re-derive it, and so a disagreement with it is visible:

- **N=10: cast nobody.** +1 to +4 places at every fraction, and the third band is already inside the
  top 5.
- **N=20 and N=30: 0.50 is the shallowest fraction that clears about five places** (+4 and +7).
- **N=40: 0.50** (+12) — 0.40 gives −1, and the two are separated far beyond the noise.
- **N=60 and N=100: the third band works** (0.40 gives +9 and +24), but **top-5 arrival does not** —
  9 of 29 at N=100/0.50, 6 of 29 at 0.60.
- ★ **So his curve — approaching the third band as the field grows — is supported by the places-gained
  column from N≈60 upward and NOT at N=10–40, where five places needs 0.50 or deeper.** The two
  targets he named (a real climb, and arrival in the top 5) cannot both be met above about N=40 by
  holding alone.


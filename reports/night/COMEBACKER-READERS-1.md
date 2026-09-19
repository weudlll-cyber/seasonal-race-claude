# COMEBACKER-READERS-1 — one production reader of the role name, and it is the camera; the assumption that the camera already ignores the fall-back racer is FALSE

Branch `read/comebacker-readers-1` off master `fe12fa95`. Date: 2026-09-18.
**Read-only. No source changed, nothing minted, nothing merged.** The owner's store was not opened.

---

## ★★★ THE ONE LINE

**Exactly one production site reads the role name, and it is the camera** —
[comebackDetector.js:86](../../client/src/modules/camera/comebackDetector.js#L86). **The race never
reads a role at all.**

★★ **And the assumption under test is refuted by measurement.** Over **200 races / 157 COMEBACK_ZOOM
entries**, the camera shoots the **fall-back-cast** racer at **21.11 shots per 100 such racers** and
an **uncast** racer at **0.04** — a factor of about **500**. The camera does **not** already treat him
as uncast; it treats him as a comebacker, because the plan labelled him one.

---

## 1 · HOW I SEARCHED

**`git grep`, all tracked files, uncapped, case-insensitive.** Paths were not restricted to
`client/src`.

| pattern | scope | result |
|---|---|---|
| `comeback` (`-i`) | **all tracked files** | **2,493 hits in 311 files** |
| same | `client/**`, `scripts/**`, `server/**`, `*.json`, `*.yml` | **1,139 hits in 107 files** |
| same | `reports/**`, `docs/**` | **1,490 hits** (prose) |
| `[=!]==?\s*['"]comebacker['"]` and its mirror | all tracked files | ★ **13 hits — one of them production code** |
| `getHeroRoles\|heroRoles` | `client/**`, `scripts/**` | 8 hits |
| `\.role\b` (excluding assignments) | `client/src/**` | 20 hits — **most are the AUTH role** (`user.role === 'admin'`), unrelated |
| `role` | `raceCore.js`, `raceStep.js`, `raceBehavior.js` | ★ **ZERO** |
| `_heroRoles` | `client/**`, `scripts/**` | 3 hits, all in `racePlanner.js` |

★ **The three sites that WRITE the role** are
[heroCurveGenerator.js:616](../../client/src/modules/heroCurveGenerator.js#L616) (the drawn winner),
[:657](../../client/src/modules/heroCurveGenerator.js#L657) (the staged path) and
[:672](../../client/src/modules/heroCurveGenerator.js#L672) (the fall-back) — **all three emit the
identical string `'comebacker'`.**

---

## 2 · WHAT EACH READER DOES WITH IT

### ★ Changes the race — **NONE. Zero sites.**

`git grep role` over `raceCore.js`, `raceStep.js` and `raceBehavior.js` returns **nothing**: the
physics never reads a role. Inside the generator the only role tests are against a **different**
string — [heroCurveGenerator.js:792](../../client/src/modules/heroCurveGenerator.js#L792)
(`member.role !== 'attacker-b2'`, the positive-budget bypass),
[:818](../../client/src/modules/heroCurveGenerator.js#L818) (`=== 'attacker-b2'`) and
[racePlanner.js:1146](../../client/src/modules/racePlanner.js#L1146) (filters `'attacker-b2'`).

★★ **The generator says so itself** at
[heroCurveGenerator.js:789](../../client/src/modules/heroCurveGenerator.js#L789): *"Read from the
curve (`held`), not from the role name — the B2 attacker's long-standing bypass is the same idea and
keeps its own spelling."*

### ★★ Changes the picture — **ONE site, with two consequences**

[comebackDetector.js:86](../../client/src/modules/camera/comebackDetector.js#L86) —
`if (h && h.role === 'comebacker' && Number.isInteger(h.index))` — builds `_cast` and
`_resolveByIndex`. `_cast` then does two things:

- [CameraDirector.js:889](../../client/src/modules/camera/CameraDirector.js#L889) —
  `if (!this._comeback.isCast(racer.index)) return null;` gates the **forced first shot**, which is
  returned at [CameraDirector.js:1815](../../client/src/modules/camera/CameraDirector.js#L1815).
- [comebackDetector.js:170](../../client/src/modules/camera/comebackDetector.js#L170) —
  `const candidates = this._cast && this._cast.size > 0 ? this._cast : this._b1;` chooses the
  **candidate pool** for the ordinary weighted contest at
  [CameraDirector.js:1821](../../client/src/modules/camera/CameraDirector.js#L1821).

The role reaches the camera because `buildCameraPlan` at
[heroCurveGenerator.js:731](../../client/src/modules/heroCurveGenerator.js#L731) copies `role` onto
each hero in the plan.

### Label only — **ONE site**

[GovernorDiagHUD.jsx:101](../../client/src/screens/RaceScreen/GovernorDiagHUD.jsx#L101) prints the
string. [racePlanner.js:1898](../../client/src/modules/racePlanner.js#L1898) calls `_heroRoles`
**"Diagnostics-only"** in as many words, and `_heroRoles` has **no other consumer** in the tree.

### Counts, reports and asserts — **14 sites**

| where | sites |
|---|---|
| **tests pinning the literal** | `comebackDetector.test.js:51`, `:109`; `CameraDirector.test.js:565`, `:625`, `:655`; `comebackPrecedence.test.js:51`; `stagedComeback.test.js:202`, `:400` — **8** |
| **diagnostic scripts** | `diag/comeback-band.mjs:162`; `diag/comeback-beats.mjs:258`, `:463`, `:655`, `:699` — **5** |
| **the generator's own test** | `heroCurveGenerator.test.js:383` (asserts the role is a string) — **1** |

### ★★ IMMUNE — the sim observers do not read the name at all

[hero-adherence.mjs:29-34](../../scripts/sim/observers/hero-adherence.mjs#L29) derives the role from
**geometry**: `anchorRank − targetRank > ROLE_MARGIN_RANKS` ⇒ `"comeback"`, with
`ROLE_MARGIN_RANKS = 2` at [:25](../../scripts/sim/observers/hero-adherence.mjs#L25).
`comeback-reality.mjs:30` reuses it. ★ **They compare to `"comeback"`, a value they compute
themselves — never to the cast's `'comebacker'` string. A rename cannot move them.**

### ★ And the tree already records the finding

[diag/comeback-band.mjs:22](../../scripts/diag/comeback-band.mjs#L22): *"the role label is
'comebacker' for both the held comebacker and the fall-back one"*.

---

## 3 · STEP 2 — THE CAMERA, MEASURED

### What actually selects COMEBACK_ZOOM

**Two terms, and only one of them is the name:**

1. ★ **The role name selects the POOL.** `_cast` if the plan named anyone, otherwise the wider `_b1`
   ([comebackDetector.js:170](../../client/src/modules/camera/comebackDetector.js#L170)); and the
   forced first shot is gated on `isCast`
   ([CameraDirector.js:889](../../client/src/modules/camera/CameraDirector.js#L889)).
2. **A measured catch-up selects the RACER within the pool** — `_detectComebackRacer`, whose reason
   string at [CameraDirector.js:1823](../../client/src/modules/camera/CameraDirector.js#L1823) is
   *"gained ≥`minPositionsGained` positions"*. Handed-over beats are **not** the selector: the
   detector keeps only the `resolve` beat ([comebackDetector.js:87-88](../../client/src/modules/camera/comebackDetector.js#L87)).

### ★★★ THE MEASUREMENT — N = 200 races, 157 COMEBACK_ZOOM entries

Ten tracks, seeds 1–20, 40 racers, `wild`, shipped defaults, **the product's own director** via
`raceDriver`, whose camera seed is **derived from the race seed**
([raceDriver.mjs:148](../../scripts/lib/raceDriver.mjs#L148)) rather than the stale pinned constant.

| the racer's cast site | racers present | COMEBACK_ZOOM shots | **shots per 100 racers** |
|---|---|---|---|
| ★ **staged** (`addHeld`, `:657`) | 136 | 106 | ★ **77.94** |
| ★ **fall-back** (`addSolo`, `:672`) | 90 | **19** | ★ **21.11** |
| drawn-winner site (`:616`) | 132 | 29 | 21.97 |
| sovereign-lead | 54 | 0 | 0.00 |
| faller | 88 | 0 | 0.00 |
| B2 attacker | 587 | 0 | 0.00 |
| ★ **uncast** | 6,913 | **3** | ★ **0.04** |

### ★★ THE ANSWER TO THE ASSUMPTION: IT IS FALSE

**The camera does NOT treat the fall-back-cast racer like an uncast racer.** He is shot at **21.11
per 100** against the uncast **0.04 per 100** — **about 500× the rate**. In absolute terms he takes
**19 of the 157 shots**, i.e. **12% of every comeback shot the camera takes**.

★ **The exact term that makes the difference, with its address:**
[comebackDetector.js:86](../../client/src/modules/camera/comebackDetector.js#L86) — `h.role ===
'comebacker'`. It cannot separate the staged racer from the fall-back one **because all three write
sites emit the same string**, so the fall-back racer enters `_cast` and becomes eligible for both the
forced shot and the contest.

★ **The staged racer IS favoured — but by the catch-up, not the name.** 77.94 against 21.11 per 100
is the second term doing the work: the staged racer is held and released and therefore *gains
positions*, while the fall-back racer is a front-cluster pursuer who gains fewer. **Both are in the
pool; only one of them usually wins the contest.**

★ **The three uncast shots are the `_b1` fallback, and they confirm the mechanism.** Of 200 races,
**24 had no `'comebacker'` cast at all** and produced **5 shots — 3 on uncast racers, 2 on the
drawn-winner site**. That is exactly `comebackDetector.js:170` handing `best()` the wider pool when
`_cast` is empty.

---

## 4 · STEP 3 — WHAT WOULD MOVE UNDER A RENAME

### ★★★ THE DECISIVE QUESTION: could a rename leave the RACE byte-identical?

**Yes — the race, and the world fingerprints. No — not all four, unless the detector is taught the
new name.** The addresses that decide it:

| | |
|---|---|
| physics reads a role | ★ **never** — `git grep role` over `raceCore.js`, `raceStep.js`, `raceBehavior.js` is empty |
| curve construction reads the name | only against `'attacker-b2'` ([:792](../../client/src/modules/heroCurveGenerator.js#L792), [:818](../../client/src/modules/heroCurveGenerator.js#L818)) — a renamed racer is still `!== 'attacker-b2'`, so **the same branch is taken** |
| ★ `fingerprint-default.mjs` (**world**, **world-off**) | **builds no `CameraDirector` (0 matches) and delivers no camera plan (0 matches)** ⇒ ★ **cannot move** |
| ★ `camera-fingerprint.mjs` | builds a director (4 matches) and **delivers a camera plan (2 matches)** ⇒ ★ **moves** |
| ★ `render-fingerprint.mjs` | same — 4 and 2 ⇒ ★ **moves** |

★★ **So the rename splits the record: the finishing order and finishing times are untouched and
`world` / `world-off` are unmoved, while `camera` and `render` move — for exactly one reason, that
`comebackDetector.js:86` would stop recognising the renamed racer.**

★ **And that is a fork, not a detail.** If the detector is *also* taught the new name, all four
fingerprints stay put — **but then the camera still shows him, and the counting the rename exists to
change is the only thing that changes.** If it is not, the camera changes and two fingerprints need
minting.

**Measured size of that camera change**, on the same N = 200:

- **19 of 157 shots** are on the fall-back racer today and would be redrawn.
- ★ In **14 of 200 races** the fall-back racer is the **only** `'comebacker'`-roled racer, so `_cast`
  would go **empty** and `best()` would hand the choice to the wider `_b1` pool — the **5 shots** in
  those races would come from a different population, not merely a different racer.

### What else would move

| what | addresses | effect |
|---|---|---|
| **counters in diagnostics** | `diag/comeback-band.mjs:162`; `diag/comeback-beats.mjs:258`, `:463`, `:655`, `:699` | count **fewer** comebackers — this is the intended change |
| **tests pinning the literal** | `comebackDetector.test.js:51`, `:109`; `CameraDirector.test.js:565`, `:625`, `:655`; `comebackPrecedence.test.js:51`; `stagedComeback.test.js:202`, `:400` | **8 sites would go red** until updated |
| **the diag HUD label** | `GovernorDiagHUD.jsx:101` | shows the new string; **diagnostics-only** (`racePlanner.js:1898`) |
| **living docs naming it** | `BACKLOG.md`, `DEAD-ENDS.md`, `ENDING-PHASES.md`, `GLOSSARY.md`, `LESSONS.md`, `MORNING.md`, `SIM.md`, `SWEEP-HARNESS.md`, `TAGS.md`, `fingerprints.json` | **10 files** |
| ★ **sim observers** | `hero-adherence.mjs:29-34`, `comeback-reality.mjs:30` | ★ **nothing — they derive the role from geometry** |

★ **`GLOSSARY.md` is worth naming separately**: `CLAUDE.md` puts it second in the reading order and
warns that three of this project's terms mean two different things each. **A rename adds a fourth.**

---

## 5 · STEP 4 — THE SIZE OF THE WORK

**It is a rename plus a behaviour change, and the behaviour change is not optional — it is the fork
above.** The mechanical part is small and well-bounded: one production line
(`comebackDetector.js:86`), one label, five diagnostic counters, eight tests and ten documents. What
makes it more than a rename is that the single production reader is the camera, so **whichever way
the fork is taken changes something the owner can see** — either the picture changes and two
fingerprints must be minted, or the picture is preserved and the camera keeps calling the pursuer a
comebacker, which is the thing the rename was meant to stop. **Three decisions are his before it
could be built: the name itself; whether the camera should keep, lose or narrow its treatment of the
renamed racer — the fingerprint question; and whether the reports keep a combined comebacker figure
or report the two roles separately.** ★ **No name is proposed here and nothing was built.**

---

## WHAT THIS DOES NOT SETTLE

- ★ **The `winner-site` column carries a known ambiguity.** The fall-back at
  [heroCurveGenerator.js:672](../../client/src/modules/heroCurveGenerator.js#L672) has **no
  `winnerIdx` exclusion** (only the staged attempt does, at
  [:654](../../client/src/modules/heroCurveGenerator.js#L654)), so a racer counted here as
  `winner-site` may in ~1 race in 125 have been fall-back cast. **It does not touch the
  fall-back-vs-uncast comparison**, which is the measurement the assumption turns on.
- **N = 200 races at one camera draw per race.** The camera seed is derived from the race seed, so
  this is 200 draws of the product's own camera, not 200 repeats of one.
- **The precedence and contest paths were not separated in the measurement** — the director exposes
  no reason string I could read per frame, so the 157 entries pool both.
- **Nothing here says whether a rename is a good idea**, only what it would touch.

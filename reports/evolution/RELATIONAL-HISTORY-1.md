# RELATIONAL-HISTORY-1 — it was never live: born unwired on 2026-07-08 and never touched since

**Branch** `read/relational-history-1` · **READ-ONLY on history — no source changed, nothing minted,
nothing merged, nothing wired.** The owner's store was not opened.

---

## ★★ THE ONE SENTENCE

> **No. `relationalWaypoints` was never live.** It was introduced on **2026-07-08** in a commit whose
> own message says *"NOT wired into the race path (Step 3)"*, it has had **no caller but its own unit
> test on any day of its existence**, and **its body has never changed since the commit that wrote
> it.** The verdict is **(a) never connected — an unfinished idea.**

---

## 1 · ITS OWN HISTORY

| | |
|---|---|
| **introduced** | ★ **`2a90c4cc`**, **2026-07-08 18:58 +0200** — *"feat(v4): Step 2 — hero curve GENERATOR (isolated, pure, tested)"* |
| **commits that changed its body** | ★ **exactly one — `2a90c4cc`.** `git log -L:relationalWaypoints:client/src/modules/heroCurveGenerator.js` returns that commit and nothing else. **It is byte-identical to the day it was written.** |
| **ever renamed or moved?** | ★ **No.** `git log --follow --diff-filter=R -- client/src/modules/heroCurveGenerator.js` is **empty**; the file has carried that path since `2a90c4cc`, and 15 commits have touched the file without moving it. |
| **today** | [heroCurveGenerator.js:383](../../client/src/modules/heroCurveGenerator.js#L383) |

★★ **THE INTRODUCING COMMIT SAYS IT WAS NOT WIRED, IN ITS OWN WORDS:**

> *"Pure module heroCurveGenerator.js: (seed, post-chaos field state, fixed Fisher-Yates final ranks,
> action-intensity, config) -> { heroCast, curves, cameraPlan }. **NOT wired into the race path
> (Step 3)** -> the race is byte-identical to 9db8fe7 at BOTH flag states (no race-path/camera file
> touched)."*

Its diff is **two files**: `heroCurveGenerator.js` (new, 422 lines) and `heroCurveGenerator.test.js`
(new, 396 lines). **No caller was created anywhere.**

★ **And the casting design it shipped with did not include family B.** The same message lists the
cast as *"winner + B1 finishers as comebackers/sovereigns; on avg every 3rd race (seeded) one
deep-band FALLER"* — the four roles that ship today. **A relational pair is not among them.**

---

## 2 · WHO EVER CALLED IT — THE SEARCH, WITH ITS TEXT

★ **The search is stated so the absence claim can be checked rather than believed:**

```
git log --all --reflog -G"relationalWaypoints"          → 3 commits
git log --all --reflog -G"relationalWaypoint\b"          → 0
git log --all --reflog -G"relational_waypoints"          → 0
git log --all --reflog -G"relWaypoints"                  → 0
git log --all --reflog -G"RELATIONAL"                    → 3 commits (same set + one docs commit)
git rev-list --all --reflog | wc -l                      → 2922 commits searched
git for-each-ref | wc -l → 147 refs, of which 126 tags
```

★★ **Over 2 922 commits on every ref and the reflog, only THREE commits ever contained a diff line
with the name**, and none of them is a call site:

| commit | date | what it did to the name |
|---|---|---|
| ★ `2a90c4cc` | 2026-07-08 | **wrote the definition and the test** |
| `f85c7589` | 2026-08-17 | *"refactor(SEPARATION-TO-TEST-1): checkSeparation moves into the test file"* — ★ **added the name to a REPORT line only**; neither code file's occurrences changed |
| `bdbc778d` | 2026-09-14 | SHAPE-CENSUS-1, this week's report — prose |

### The occurrence census, at 14 points across its whole life

Every line in the **whole tree** containing the name, classified, at each revision:

| rev | date | definition | test lines | report | ★ **production caller** |
|---|---|---|---|---|---|
| `2a90c4cc` | 2026-07-08 | 1 | 3 | 0 | ★ **0** |
| `ffd0470e` | 2026-07-08 | 1 | 3 | 0 | ★ **0** |
| `65408b3b` | 2026-07-09 | 1 | 3 | 0 | **0** |
| `c7038569` | 2026-08-11 | 1 | 3 | 0 | **0** |
| `edbc0b97` | 2026-08-15 | 1 | 3 | 0 | **0** |
| `75685b5b` | 2026-08-17 | 1 | 3 | 1 | **0** |
| `8f98bd2b` | 2026-08-22 | 1 | 3 | 1 | **0** |
| `31e1a738` | 2026-08-24 | 1 | 3 | 1 | **0** |
| `9e6dfc97` | 2026-08-27 | 1 | 3 | 1 | **0** |
| `458e272e` | 2026-09-02 | 1 | 3 | 1 | **0** |
| `ed20132b` | 2026-09-03 | 1 | 3 | 1 | **0** |
| `8e9937cf` | 2026-09-04 | 1 | 3 | 1 | **0** |
| `cbb11156` | 2026-09-05 | 1 | 3 | 1 | **0** |
| `7eb65c82` | 2026-09-14 | 1 | 3 | 1 | ★ **0** |

### The only callers that ever existed — and they are not live

| caller | lines (today) | live? | why |
|---|---|---|---|
| `client/src/modules/heroCurveGenerator.test.js` | `:22` import, `:300`, `:308` | ★ **NOT LIVE** | a unit test. The decision rule excludes tests, and it is not reachable from the shipped race by any path. |

★★ **THE MODULE WAS WIRED — BUT NOT THIS FUNCTION.** `ffd0470e`, the same day, is
*"feat(v4): Step 3 — wire the generator into the race (flag-gated, multi-hero)"*. The wiring imports
exactly one entry point: [racePlanner.js:16](../../client/src/modules/racePlanner.js#L16) —
`import { generateHeroCurves, GENERATOR_CONFIG } from './heroCurveGenerator.js'`. ★ **`generateHeroCurves`
does not call the relational family either** — the census above is 0 at `ffd0470e` itself.

★ **The whole v4 series never proposed it**: Steps 1, 2, 3, 3d, 4, 5 and Stage 1 Steps 1–2
(`9db8fe74`, `2a90c4cc`, `ffd0470e`, `e6d6e796`, `3c4007bf`, `c7ef0773`, `cf15aa8e`, `bf6992e1`).
**No commit message in the repository ever proposed wiring it.**

---

## 3 · THE MOMENT IT WENT QUIET

★★ **It does not arise. No live caller ever existed, so there was no removal to date, no commit to
quote and no reason to look for.** It has been unwired on every one of the **68 days** between
2026-07-08 and today.

---

## 4 · ★★ THE VERDICT — (a) NEVER CONNECTED

**(a) never connected — an unfinished idea.**

The evidence, and why (b) and (c) are not merely unlikely but **inapplicable**:

- ★ It was born with **no caller, by design and by the commit's own statement**.
- ★ **Its body has never changed** — one commit, `2a90c4cc`, in `git log -L`.
- ★ **No commit in 2 922 ever added a line calling it**, on any ref or the reflog.
- ★ The module's own wiring commit **took a different entry point** and the census is 0 at that commit.

> ★★ **(b) and (c) both require a live caller to have existed at some point. None ever did.** There
> is nothing for the record to distinguish, because there was no disconnection event of any kind.
> ★ **For completeness, what each would have looked like**: (b) would show a commit removing a call
> line with a message or report giving the reason; (c) would show a call line disappearing inside a
> commit about something else, with no mention of it. **The pickaxe finds neither, because it finds
> no call line at any point to remove.**

### Is a reason on record for not wiring it?

★ **Partly, and only at the coarsest level.** The introducing commit defers wiring to *"Step 3"*, and
Step 3 (`ffd0470e`) wired `generateHeroCurves` alone. ★★ **Why family B specifically was left out is
NOT DOCUMENTED** — searched and found nothing: `docs/` (the only `photo-finish` hits are the CAMERA's
state machine, [CAMERA_DIRECTOR.md:91](../../docs/CAMERA_DIRECTOR.md) onward, an unrelated mechanism),
`docs/DEAD-ENDS.md` (one hit, also the camera's slow motion), `docs/BACKLOG.md` (no hit), and every
commit message. **No motive is reconstructed here.**

★ **The one place the record speaks about it** is
[SEPARATION-TO-TEST-1](SEPARATION-TO-TEST-1.md) §79, which lists it among **19** exports matching
*"an export used by nothing — including its own module — and referenced only by that module's own
test"*. ★★ **That report explicitly says the list "should not be read as a to-do"**, and singles out
`deleteRacerSprite` and `RUNAWAY_LEAD_THRESHOLDS_LEN` as *"the two that look like genuinely unused
product code"*. **`relationalWaypoints` is not one of those two** — it was left in the residual
bucket the report describes as *"plausibly public API that simply has no second caller yet"*.
**So it was catalogued as dead code and never judged as a missing feature.**

---

## 5 · WHAT IT WOULD COST TO RECONNECT — AN ESTIMATE, NOT A PLAN

### Does it still work against today's code?

★ **Against its immediate callee, YES — nothing has moved under it.** It calls `soloWaypoints` with
`{ peakRank, peakProgress, finalRank, resolveProgress }`, and that parameter shape at
[heroCurveGenerator.js:363-366](../../client/src/modules/heroCurveGenerator.js#L363-L366) is **also
unchanged since `2a90c4cc`** (`git log -L:soloWaypoints:` returns the same single commit). **No drift
in 68 days.**

★★ **Against the CAST PIPELINE, no — and the mismatch is structural, not cosmetic:**

| # | mismatch | address |
|---|---|---|
| 1 | ★★ **It returns a PAIR, `{ a, b }` — two waypoint lists for two racers.** The curve loop builds **exactly one curve per cast member**, from `holdWaypoints` or `soloWaypoints`, and names no third branch. **There is no pair in `cast` and no `addPair` beside `addSolo` / `addHeld`.** | [heroCurveGenerator.js:769-779](../../client/src/modules/heroCurveGenerator.js#L769-L779) |
| 2 | **It hardcodes its own timings** — `resolveProgress` 0.98, 0.95, and `Math.min(0.9, convergeProgress + 0.15)` — where the shipped path derives every timing from `feasibleTiming` inside the density budget. A pair would arrive with timings nothing has checked. | [heroCurveGenerator.js:262](../../client/src/modules/heroCurveGenerator.js#L262), [:383-425](../../client/src/modules/heroCurveGenerator.js#L383-L425) |
| 3 | **Its inputs do not exist at the cast sites.** It wants `mode, convergeProgress, frontRank, finalA, finalB`; `castHeroes` works in `finalRanks`, `peakRank` and the cluster rank `cr`. | [heroCurveGenerator.js:559-673](../../client/src/modules/heroCurveGenerator.js#L559-L673) |
| 4 | ★ **The per-curve guards would vet each HALF, never the PAIR.** `checkFeasible`, `checkPositiveBudget` and the hole guard each act on one anchored curve. Nothing would guarantee the two converge — **which is the entire point of a photo finish.** | [:782](../../client/src/modules/heroCurveGenerator.js#L782), [:793](../../client/src/modules/heroCurveGenerator.js#L793), [:798](../../client/src/modules/heroCurveGenerator.js#L798) |

### What else would have to give way — the budget

A pair costs **two** of `nHeroes`. Measured at N=300 on his own fixture (SHAPE-CENSUS-1, same day):
the realized budget is **3 in 172 races, 2 in 112, and 1 in 16** — `clampIntensityToBudget`
([heroCurveGenerator.js:239-257](../../client/src/modules/heroCurveGenerator.js#L239-L257)) cuts it
below 3 in **43% of races**. ★ **So in 112 races a pair would consume the whole budget and leave
nothing else cast, and in 16 it would not fit at all.** A pair is not an addition to the current
cast — it is most of it.

### Tests and guards that would object

| | |
|---|---|
| the existing tests | ★ **none would fail.** `heroCurveGenerator.test.js:300,308` exercise the function in isolation and do not care whether anything else calls it. |
| a dead-export guard | ★ **there is none.** No script in `scripts/` enforces the SEPARATION-TO-TEST-1 list — searched. |
| ★ **the fingerprints** | ★★ **all four would be selected and all four would move.** `engine-reach --check client/src/modules/heroCurveGenerator.js` reports it **"is in the hull"**, and the import chain is direct: [raceCore.js:44](../../client/src/modules/raceCore.js#L44) imports `racePlanner.js`, which at [racePlanner.js:16](../../client/src/modules/racePlanner.js#L16) imports this module — so it sits inside the closure of `raceCore.js`, which is the declared reach of **world**, **world-off**, **camera** and **render**. |

---

## 6 · NOTICED, AND DELIBERATELY LEFT ALONE

- ★ **The camera has its OWN "photo finish", and it is a different mechanism.**
  [CAMERA_DIRECTOR.md:91](../../docs/CAMERA_DIRECTOR.md) onward describes a camera STATE with its own
  slow motion and lifecycle. It is a **shot**, not a race shape, and the two are easy to conflate
  when searching. **They are unrelated and I have not treated one as evidence about the other.**
- ★ **The introducing commit's *"role pairing = same-band ENDPOINT swap only (multiset preserved)"*
  is NOT this.** That is the fairness device that keeps the finishing-rank multiset intact; it is not
  the relational curve family and shipping it is not evidence that family B shipped.
- `bandMultiset`, the **other** dead export in the same file, and the remaining 17 on that list —
  **untouched, not investigated.**
- **I did not wire it up, did not write a switch and did not touch the budget.**

---

## 7 · THE LEVER, IN ONE SENTENCE, AND THEN I STOP

**The shape the owner wants as the main case exists as 47 lines (`heroCurveGenerator.js:383-429`) that have compiled and been tested
every day for 68 days and have never once run — so the lever is not writing it, it is the pair
plumbing the cast pipeline has never had.**

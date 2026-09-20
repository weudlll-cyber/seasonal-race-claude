# SHAPE-UNCAST-2026-09-20 — the uncast share holds across ten tracks, and the contested fight is unfinished work

Branch `diag/breakaway-action-2026-09-20`, piece 3. Date: 2026-09-20.
**READ-ONLY. No key, no cast site, no default, no engine source touched. This is evidence for the
owner's decision and contains no proposal.**

---

## ★★ THE THREE ANSWERS

> **(a)** The uncast share **holds beyond one track** — **52.0%** of breakaways in the shipped world
> have an uncast leader across all ten (N=25 breakaways, 300 races). But it is **not uniform**: it
> runs from **6.3% on river-run to 58.3% on city-circuit**.
>
> **(b)** The contested fight is never cast because **nothing can call it**. `relationalWaypoints`
> needs five parameters that **no function in the repository computes**, and every seam around it is
> built for one racer at a time.
>
> **(c)** **Unfinished work** — not config-sized, not a cast-site change.

---

## a · DOES THE UNCAST SHARE HOLD BEYOND ONE TRACK?

A **breakaway** here is the owner's window: a race whose largest lead inside **[0.70, finish]**
exceeds the gap brake's 56 px allowance. The leader is **uncast** when the plan's role map names him
no role — SHAPE-CENSUS-1's own test, read off `getHeroRoles()` rather than guessed from the race.

**The shipped world (`quiet`, `choreoOutcomeStart` 0.60), 300 races, N=25 breakaways:**

| track | uncast leader | share |
|---|---|---|
| luger-hill | 3/3 | **100.0%** |
| city-circuit | 2/3 | 66.7% |
| space-sprint | 2/3 | 66.7% |
| garden-path | 1/2 | 50.0% |
| mountainstreet | 1/2 | 50.0% |
| searound | 1/2 | 50.0% |
| seatrack | 1/2 | 50.0% |
| dirt-oval | 1/3 | 33.3% |
| ice-track | 1/3 | 33.3% |
| river-run | 0/2 | **0.0%** |
| ★ **TOTAL** | **13/25** | ★ **52.0%** |

**Across all eight arms of the chain — 2,400 races, N=201 breakaways** — the share is **42.3%**, and
the per-track spread is the same shape and better resolved: river-run **6.3%**, ice-track 23.8%,
searound 36.4%, garden-path 38.9% … seatrack 50.0%, mountainstreet 57.1%, city-circuit **58.3%**.

### ★ WHAT THIS CONFIRMS, AND WHAT IT QUALIFIES

SHAPE-CENSUS-1 measured **55.6% on one track** and concluded that uncast racers produce more
breakaways than every cast role combined. At ten tracks in the shipped world, **52.0%** — the
headline holds, and the single-track figure was not a fluke.

★★ **But "more than every cast role combined" is marginal, and at the larger N it reverses.** The
role mix of the breakaway leader:

| | shipped world (N=25) | all arms (N=201) |
|---|---|---|
| **uncast** | **13** | 85 |
| `sovereign-lead` | 11 | ★ **95** |
| `comebacker` | 0 | 15 |
| `pursuer` | 1 | 6 |

In the shipped world uncast (13) just edges all cast roles together (12). Over 201 breakaways
`sovereign-lead` **alone** (95) exceeds uncast (85). ★ **A reader quoting "uncast produces more
breakaways than every cast role combined" as a general law would be over-reading it**: it is true of
the small shipped-world sample and false of the larger one. What survives at both sizes is the
weaker, still striking claim — **uncast racers are the largest single source of breakaways, or very
near it, on every sample measured.**

★ **And the per-track spread is the real news.** A mechanism that explains 0% of river-run's
breakaways and 100% of luger-hill's is not one number.

---

## b · WHY IS THE CONTESTED FIGHT NEVER CAST?

`relationalWaypoints` (`client/src/modules/heroCurveGenerator.js:383`) is **reachable, exported and
tested, and has no production caller**. `git grep` finds exactly three mentions: its own definition,
and two calls in `heroCurveGenerator.test.js:300` and `:308`.

### ★★ IT RETURNS A PAIR, AND EVERY SEAM AROUND IT IS SINGLE-RACER

```js
export function relationalWaypoints({ mode, convergeProgress, frontRank, finalA, finalB }, config)
  →  { a: [...waypoints], b: [...waypoints] }      // TWO curves, for TWO racers
```

| the seam | what it does today | address |
|---|---|---|
| the cast entry | `addSolo(index, role, finalRank, peakRank)` and `addHeld(...)` each take **one** index and `used.add(index)` **one** racer | `heroCurveGenerator.js:558`, `:582` |
| the curve loop | `member.held ? holdWaypoints(member.params) : soloWaypoints(member.params)` — a single boolean, dispatching to two single-racer builders, emitting **one** curve per member | `:819-826` |
| feasibility | `racerFeasibility(state, …)` and `checkFeasible(anchored, member.rankRates)` are **per racer**; nothing checks that two curves converging on the same rank are jointly reachable | `:565`, `:431` |

### ★★★ AND THE PARAMETERS IT NEEDS ARE COMPUTED NOWHERE

`soloWaypoints` gets its `peakRank / peakProgress / finalRank / resolveProgress` from a **timing
function**. The file has three, one per archetype:

| | address | produces |
|---|---|---|
| `feasibleTiming` | `:262` | the solo hero's timing |
| `heldTiming` | `:310` | the held comebacker's |
| `attackerTiming` | `:336` | the B2 attacker's |
| ★ **`relationalTiming`** | ★ **does not exist** | — |

`relationalWaypoints` needs **`mode`, `convergeProgress`, `frontRank`, `finalA`, `finalB`**. No
function in the repository produces that tuple, and no cast site has a notion of a racer *pair* to
produce it from. **The archetype has a shape-builder and no way to decide who, when, or whether it
is possible.**

---

## c · WHAT WOULD IT COST?

> ★★ **Unfinished work.** Not a config change — there is no key that would switch it on, because
> nothing reads one. Not a cast-site change either — adding a call at a cast site would have nothing
> to pass it.

The missing pieces are, in the order they would be needed: a **pair-aware timing function** deciding
`mode`, `convergeProgress`, `frontRank`, `finalA` and `finalB` from the post-chaos state (the
counterpart of `feasibleTiming`, which does not exist); a **pair-aware feasibility test**, since
today's checks are per-racer and two racers converging on adjacent ranks at one progress is a joint
constraint neither of them expresses; a **cast entry that reserves two indices at once**, where
`addSolo`/`addHeld` reserve one; and a **curve-loop branch** that emits two curves from one cast
member, where the loop's dispatch is a single `member.held` boolean. The waypoint geometry itself —
the only part that exists — is the smallest of the five.

★ **This report does not say whether that work is worth doing, and does not design it.** It says
what is absent and where.

---

## WHAT WAS REUSED

| needed | already existed | used |
|---|---|---|
| the cast test | the plan's role map via `getHeroRoles()`, as SHAPE-CENSUS-1 reads it | ★ read, not re-derived |
| the breakaway definition | the chain's own fixed [0.70, finish] window and the 56 px allowance | ★ the same rows pieces 1 and 2 measured — **no extra race was run for this report** |
| the race data | `reports/night/breakaway-action-data/action-stage1.json` | read |

**No new code was written for this piece.** It is a reduction of data the other two pieces already
produced, plus reading.

### ★ NOTICED AND DELIBERATELY LEFT

- **`relationalWaypoints` is exported and has no production caller.** Deleting an unused FEATURE is
  the owner's call, not cleanup, and every brief in this chain has said so.
- **Two comments in `scripts/sim-fairness.mjs` (`:4501`, `:4514`) still say the gap brake's shipped
  default is `false`.** It has been `true` since 2026-09-17. The CODE reads the default dynamically,
  so the sim is not blind — only the comments are stale. Same class as the CLEANUP-2026-09-19 block;
  not touched here, because this piece changes nothing.

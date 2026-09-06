# RECOMPUTE-COST-1 — what verifying a stored race by recomputation costs

**Date:** 2026-09-06
**Branch:** `diag/recompute-cost-1` off master `119771bc`. The owner's two branches were not touched.
**Measurement only. Nothing was built, nothing minted, no behaviour changed.**
**Fingerprints:** `engine-reach --check` selects nothing.
**Checks:** `npm run verify` (plain) — **PASS 6, FAIL 0, SKIP 24**, exit 0, 2.4 s.

```
ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  2 outside the hull (cannot reach the engine at all): reports/evolution/RECOMPUTE-COST-1.md, reports/evolution/INDEX.md
```

---

## ★ First, the finding that decides whether the design is viable at all

**Recomputing a race has NO side effects.** Measured, not reasoned: the globals were instrumented
*before* the engine was imported, then a full race was run.

| | at import | during one full recomputation |
|---|---|---|
| `localStorage` reads/writes | untouched | **0** |
| `sessionStorage` | untouched | **0** |
| filesystem writes | none | **0** |
| `window.dispatchEvent` | — | **0** |
| `Math.random()` (unseeded) | 0 | **0** |
| `Date.now()` | 0 | **0** |

Nothing is written — no history entry, no storage key, no pending record, no event. The race is a
pure function of its inputs. A static scan does find `storageSet` and `Math.random` *defined* inside
the engine's import closure (in the config-save helpers and `RandomHelper.js`), but **nothing on the
race path calls them** — which is why the empirical probe is the answer and the grep is not.

---

## ★ And the number the owner is waiting for

**The heaviest race the product allows costs about 7.4 seconds to recompute.** Not 0.6.

GOLDEN-RACES-1's 0.6 s was two small races — 12 racers over 35 s and 6 over 30 s. Carried to the
worst case the product actually permits, the figure is **twelve to twenty times larger**. It is
seconds of blocked computation before a race can start, per press.

That is the piece's answer. Everything below is the working.

---

## The worst case, and why it is the worst case

Established at source:

| what | value | where |
|---|---|---|
| largest field, OPEN track | **100 racers** | `DEFAULT_RACE_DEFAULTS.maxPlayersOpen` |
| largest field, closed track | 40 racers | `DEFAULT_RACE_DEFAULTS.maxPlayersClosed` |
| longest duration offered | **120 s** | `DURATION_OPTIONS` in `RaceSettings.jsx` — 30 / 60 / 90 / 120 |
| longest open track | **space-sprint**, 19 772 px | `server/seeds/tracks/` |
| no track sets a lower cap | no `maxRacers` on any of the ten | the seeds |

**So the worst case is 100 racers on an open track for 120 s**, and the field cap is what makes it
so: the open cap is 2.5× the closed one, and field size is the dominant cost (below). `space-sprint`
was chosen as the track because it is the longest open one, though for an open track the duration —
not the length — sets the frame count, so the track choice is not the lever.

A closed track cannot reach this: it is capped at 40 racers, and its cost is bounded by the lap
count the operator picks.

---

## The measurements

**Method.** The harness is `scripts/golden/goldenRace.mjs` — the runner GOLDEN-RACES-1 built on
`raceCore.js`'s real engine core. **No second race runner was written.** Every case was run with the
dev server, the Vite client and the preview server **stopped**, so nothing competed for the machine.
Node v24, Windows.

**★ Each figure below is one recomputation in a FRESH PROCESS**, five processes per figure — because
that is what a repeat is: one race, once. The reason that distinction matters is in the anomaly
below.

### Headline cases

| case | racers | realized | frames | time (5 fresh runs) | spread |
|---|---|---|---|---|---|
| **heaviest** — space-sprint, 120 s | **100** | 120.0 s | 7 801 | **7 243 · 7 251 · 7 418 · 7 446 · 7 450 ms** | **3 %** |
| **typical** — space-sprint, 60 s | 40 | 60.0 s | 3 968 | ~**1 062 ms** | 5 % |
| closed — dirt-oval, 2 laps | 40 | 87.2 s | 5 791 | ~**2 051–2 185 ms** | 7 % |
| closed — dirt-oval, 2 laps | 12 | 87.2 s | 5 811 | ~**350–368 ms** | 5 % |
| **small** — space-sprint, 30 s | 6 | 30.0 s | 1 962 | ~**40 ms** | 6 % |

### ★ The anomaly, reported rather than smoothed away

Run repeatedly **inside one process**, the heaviest case is *slower*, not faster:

```
7 243 → 13 537 → 13 100 → 13 237 → 13 269 → 13 063 → 13 151 → 12 914 ms
```

The first run is ~7.2 s and every subsequent one settles at ~13 s. That is the opposite of JIT
warm-up; it is heap pressure — a 100-racer, 7 800-frame run allocates enough that later runs pay for
collection. **Both numbers are real and they answer different questions:** one repeat in a fresh
context costs ~7.4 s; a session that recomputes several races in a row pays ~13 s each after the
first. The naive five-runs-in-a-loop average (13.4 s) would have been the wrong number to quote for
a button press, and the naive single run (7.2 s) is wrong for a person working through a list.

---

## ★ What dominates the cost

**Field size, by a wide margin — and it is super-linear, roughly n^1.5 at the top of the range.**

At a fixed 60 s (open, space-sprint), one fresh run each:

| racers | 6 | 12 | 25 | 40 | 60 | 100 |
|---|---|---|---|---|---|---|
| ms | 140 | 285 | 615 | 1 062 | 1 871 | 4 125 |

At a fixed 40 racers, varying duration:

| duration | 30 s | 60 s | 90 s | 120 s |
|---|---|---|---|---|
| ms | 688 | 1 108 | 1 398 | 1 730 |

**In one sentence:** going from 40 to 100 racers at the same duration multiplies the cost by **3.9**
while going from 30 s to 120 s at the same field multiplies it by **2.5** — so the field is the
lever, and the worst case is expensive because the open-track cap is 100, not because 120 s is long.

The growth is super-linear but **not quadratic**: 6 → 100 racers is a 16.7× field for a 29.5× cost
(≈ n^1.20 overall, ≈ n^1.48 across 40 → 100). Pair interactions are evidently pre-filtered rather
than all-pairs.

---

## The fetch, on top of the computation

**One request, not three.** RACE-STORE-2's `hydrate` resolves the roster and the racer values
server-side, so `GET /api/races/:key` returns the whole race in a single response — there is no N+1.

Measured against the running API on localhost, 40 samples each:

| | min | median | p95 | max |
|---|---|---|---|---|
| `GET /api/health` | 0.75 | **1.15** | 3.96 | 39.27 ms |
| `GET /api/races` (401) | 0.62 | **0.80** | 2.43 | 2.70 ms |
| `GET /api/races/ZZZZZZ` (404) | 0.57 | **0.79** | 1.12 | 1.49 ms |

Payload of one hydrated race, computed from the schema: **4.0 KB** at 6 racers, **5.5 KB** at 40,
**8.0 KB** at 100.

**So the fetch is about 1 ms and 8 KB — roughly one part in seven thousand of the worst-case
recomputation.** It is not a term in this decision.

> **How this was measured without creating records.** `POST`ing a race would have left a row in the
> owner's store, and the brief requires anything created by hand to be deleted again. The round trip
> was therefore measured on the real routes with real guard responses, and the payload computed from
> the schema. **No race was stored and nothing was deleted.** The route exists only on
> `feat/team-races-1`; the running API is that branch's build, which is why these numbers exist at
> all — master has no `/api/races`.

---

## Where the recomputation can run

**It can run in the client, and that is where the button is.** The engine *is* client code
(`client/src/modules/raceCore.js`) and already runs in the browser during every race. Stepping it
without drawing needs no canvas and no DOM — this piece's own measurements are exactly that, in
Node.

The two options, with what each would require. **No recommendation is made here.**

**In the client, on the main thread.** Requires nothing new. The cost is that ~7.4 s of synchronous
stepping blocks the interface completely — no repaint, no spinner that moves, no cancel — because
the engine loop yields nowhere.

**In the client, in a Web Worker.** Requires: the engine reached from a worker entry point (it is
pure JS with no DOM, so this is plausible rather than assured), a message protocol for the inputs and
the outcome, and something on screen for the seconds it runs.

**On the server.** Requires one thing this piece can state precisely, because it was checked:
**`client/src` is not in the server image.** `.dockerignore` is an allow-list and re-includes only
`server/package.json`, `server/src/**`, `server/utils/**`, `server/seeds/**` and
`shared/nameLimits.mjs`. A server-side recomputation would need the engine added to the image, plus
somewhere to put the work so one recompute does not occupy the request thread.

> ★ **Noticed while checking that, and NAMED rather than fixed — it is outside this piece and it is
> on his unmerged branch.** `feat/team-races-1`'s `server/src/races/contentAddress.js:53` imports
> `../../../client/src/modules/raceConfigWorld.js`. That path is **not in the image**, so the
> containerised server on that branch would fail to start. It works in development because the
> repository is on disk. Nothing was changed; it is reported because this piece happened to look.

---

## What could and could not be compared

**A stored race carries enough for the same comparison the golden races make.** `results` is the
finish order, and each entry carries `finishTimeMs` (`RaceScreen/index.jsx`, the `raceResults`
payload) — so **both the order and every finishing time** are available, exactly as
GOLDEN-RACES-1 compares them. The promise would not be a weaker one on that count.

**But one input is not stored, and it matters.** The race pins `geometry_id`, **not the geometry**.
There are no track points in the `races` table. So a recomputation has to load the track's *current*
geometry, and if the track has been edited since, the recomputed outcome will differ — and the
comparison cannot tell that apart from an engine change. It would refuse the race and say the wrong
reason.

That is a statement about what the comparison would mean, not a design proposal: **"the outcome
changed" would cover engine changes AND track edits, and the two are indistinguishable from what is
stored today.**

---

## The numbers, gathered

| | |
|---|---|
| **Heaviest realistic race** | 100 racers, open track, 120 s |
| **Recompute, once, fresh** | **7.24 – 7.45 s** (5 runs, 3 % spread) |
| **Recompute, repeated in one session** | **~13 s each** after the first |
| Typical race (40 racers, 60 s) | ~1.06 s |
| Small race (6 racers, 30 s) | ~0.04 s |
| What dominates | **field size** — ×2.5 field → ×3.9 cost; ×4 duration → ×2.5 cost |
| Fetch on top | **~1 ms**, 8 KB, one request |
| Side effects of recomputing | **none** |
| Can it run client-side | yes, but it blocks the main thread for the whole time |
| Server-side instead | possible; the engine is not in the image today |
| Comparable | finishing order **and** every finishing time |
| Not covered by the comparison | a track edit is indistinguishable from an engine change |

**No recommendation is made, and none of the options in "where it can run" is chosen.** The decision
is the owner's.

---

## Source hygiene

**No source file was touched.** This piece added one report and one INDEX line. Everything it ran —
the side-effect probe, the closure scan, the benchmark driver and the fetch sampler — lived in the
session scratchpad and **no measurement scaffolding entered the repository**; `git status` shows
only the report.

**No record was created by hand**, so none had to be deleted: no race was stored, no account made,
no fixture written. `git stash` was not used.

### Noticed and deliberately left

- **The image/`client/src` finding on `feat/team-races-1`**, above. Named, not fixed.
- **The three dev services were stopped for the measurement** — a measurement under contention is
  not a measurement — and restarted afterwards. They now serve **this branch** (master plus this
  report) rather than the topic branch build they were on before, because the working tree moved.
  Switching back is a checkout of `feat/team-races-1` and a rebuild.
- **`check-fallback-agreement` still reports two long-standing UNRESOLVED mirrors**
  (`cameraTimingComputation.js:maxStateDuration`, `durationModel.js:normalSpeedPxPerSec`). Named in
  three previous reports; neither is mine and the guard passes with them.

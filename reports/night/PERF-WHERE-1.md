# PERF-WHERE-1 — a perf log now says where in the race it was taken

**Branch:** `feat/perf-where-1`, off `feat/label-bench-1`.
**Nothing minted. Nothing merged. No engine file edited** — `engine-reach --check` says so, below.

---

## WHY

The owner has two perf recordings, 3 ms and 7.7 ms per step, and **they could not be compared**,
because neither says which moment of which race it came from. PHYS-BENCH-1 then spent a whole block
establishing from the outside what the export could have said for free: that the cost is **quadratic
in the field size** and **nearly flat in density**, so two numbers 2.57× apart are a field 1.6×
larger rather than the same field at two moments.

**And it would have spoiled every future recording the same way.** The failure is silent by
construction: a log with no context looks exactly as complete as one with it, and gets read as if it
were. So the export now carries the conditions.

---

## WHAT THE EXPORT NOW CARRIES

A `context` block, in the file's own shape, beside `stats` / `paceStats` / `spikes` /
`recentFrames`:

| field | what it answers |
|---|---|
| `physicsMs`, `physicsSec` | **WHEN** — elapsed *physics* time, not wall time, so two logs at the same physics moment are comparable even if one machine took twice as long to get there |
| `leaderLap`, `maxLaps`, `raceProgress` | the lap at the moment of export, with the total beside it |
| `spreadT`, `leaderT`, `lastT` | **HOW SPREAD** — leader-to-last along the track, in the engine's own `t` units so no conversion is needed to compare two logs |
| `nRacers`, `running`, `finishedCount` | field size (already there per frame) plus how much of it is still racing |
| `roster` | `current` / `long` / `mixed` / `custom` / `none` |
| `namesOn` | whether the names toggle (`labelNamesWhenRoom`) was on |

The last two are here because PHYS-BENCH-1 and LABEL-BENCH-1 have just shown that both matter.

### It is gathered AT EXPORT TIME, and that is a rule, not an implementation detail

The block's constraint was: **do not invent a new per-frame statistic for a diagnostic.** So
`buildPerfContext(st, extra)` is called once, when the owner clicks export. The field spread is one
pass over the racers at that instant; everything else is a value the engine already keeps
(`st.physicsTs`, `st.raceProgress`, `r.lap`, `r.t`). **Nothing new is computed on any frame.**

The same reasoning made `getContext` a **function** prop rather than a value: the HUD re-renders
every 200 ms and the race moves between renders, so a value would report where the race was when the
component last rendered, not where it is when the button is pressed.

### The roster is DERIVED, not plumbed

`identifyNameSet(racers)` reads the roster off the names the field actually has, in
`client/src/modules/racerNames.js` — the one home for the rosters.

The alternative was threading `quickTestNameSet` from `SetupScreen` through the race payload. That
was rejected: the key **dies in that screen's local state**, and what reaches a race is the *names*.
A plumbed key would report what a screen INTENDED rather than what the field HAS, and the two come
apart the moment a real player joins a quick test — which is the ordinary case. `custom` is
therefore a first-class answer, not a failure, and `none` is real too (racers built by
`createRaceFromIdentity` carry no name at all, which is the state every measurement harness starts
from).

---

## THE 50 ms CAP — THE DECISION, AND WHY

`total` is `rawDt`, computed in `RaceScreen/index.jsx` as `Math.min(ts - st.lastTs, 50)`. So
`total`'s p90, p99 and max **all read exactly 50.00** the moment anything goes wrong, and a 60 ms
hiccup becomes indistinguishable from a tab descheduled for half a second — which is the one
distinction those percentiles exist to make.

**The choice was: record the uncapped delta beside it, AND state the cap in the legend. Both.**

- **The cap stays.** It is load-bearing: `rawDt` feeds the physics accumulator, so an uncapped stall
  would fast-forward the race. Removing it was never on the table.
- **Recording beats documenting alone.** Stating the cap tells a reader the number is wrong without
  telling them *by how much*, which still leaves them unable to size the worst frame. That is half
  an answer to the only question the max is asked.
- **It costs one subtraction per frame, only when the log is on** — `rawDtUncapped` is computed
  inside the same `enablePerfLog` guard as every other perf-log value and never reaches physics.
- **The legend gets it too**, because a reader who does not know the cap exists will still read
  `total` first, and `_legend.total` now says so and points at `totalUncapped`.

`totalUncapped` appears per frame, in the spike list, and as its own percentile block in `stats`.

---

## SOURCE HYGIENE

| file | +/− (git numstat) | what changed |
|---|---|---|
| `client/src/screens/RaceScreen/perfLog.js` | +132 −4 | `buildPerfContext()` added; `exportPerfLog(log, context)` takes an optional second argument; `totalUncapped` recorded, summarised and exported; two legend entries rewritten, two added. |
| `client/src/modules/racerNames.js` | +29 −0 | `identifyNameSet()` added. Nothing existing touched — **the three rosters are byte-identical**, which the existing tests assert by array identity. |
| `client/src/screens/RaceScreen/index.jsx` | +26 −4 | `rawDtUncapped` computed beside `rawDt` and passed to `recordPerfFrame`; `getPerfContext` callback; `useCallback` and `identifyNameSet` imported; one prop on `<PerfLogHUD>`. |
| `client/src/screens/RaceScreen/PerfLogHUD.jsx` | +11 −6 | optional `getContext` prop, called on both export paths (download and clipboard) and added to their dependency arrays. |
| `client/src/screens/RaceScreen/perfLog.test.js` | +160 −0 | new. |
| `client/src/modules/racerNames.test.js` | +48 −0 | one new `describe` appended; nothing existing changed. |

The four removed lines are all REWRITES in place — the `total` legend entry and the two frame-shape
lines that gained `totalUncapped` beside them, plus the `exportPerfLog` signature. **No behaviour and
no field was deleted.** Every change is additive, and every new argument has a default that
reproduces the previous behaviour exactly: `exportPerfLog(log)` with no context produces the file it
always produced, and `recordPerfFrame` without `rawDtUncapped` records the capped value rather than
a zero that would read as an impossibly fast frame.

### Noticed but left

- **`context` is ABSENT, not `null`, when nothing was supplied.** A reader must be able to tell an
  old export from one taken during a race that had nothing to say about itself. Tested.
- **`spreadT` is in the engine's `t` units, not pixels or lengths.** Converting would need the track,
  and the only thing this figure is for is comparing two logs — which needs no conversion. Named in
  the legend so nobody reads it as a distance.
- **The HUD does not DISPLAY any of this.** The block asked for the export; the overlay is unchanged.
  If the owner wants the field spread on screen live, that is a per-frame statistic and a separate
  decision.
- **`identifyNameSet` is O(field × rosters) and runs once per export.** It would be wrong to call it
  per frame and nothing does.
- **`_diagSpeed` and friends are still computed per frame when the diagnostics overlay is on** —
  pre-existing, untouched, and mentioned only because this block was reading that loop.

---

## VERIFICATION

```
$ node scripts/engine-reach.mjs --check client/src/modules/racerNames.js \
    client/src/modules/racerNames.test.js client/src/screens/RaceScreen/index.jsx \
    client/src/screens/RaceScreen/perfLog.js client/src/screens/RaceScreen/perfLog.test.js \
    client/src/screens/RaceScreen/PerfLogHUD.jsx
ENGINE REACH: none of 6 path(s) can reach the race engine.
```

**`racerNames.js` is outside the engine hull**, which is worth stating explicitly given that a
racer's name IS an engine input: the hull is the transitive import closure of `raceCore.js`, and the
engine never imports the roster — the browser assigns names onto racers afterwards. The rosters
themselves are byte-identical anyway.

Only the tests covering what changed:

```
$ npx vitest run src/screens/RaceScreen/perfLog.test.js src/modules/racerNames.test.js
 ✓ src/screens/RaceScreen/perfLog.test.js (10 tests)
 ✓ src/modules/racerNames.test.js (15 tests)
 Test Files  2 passed (2)      Tests  25 passed (25)
```

ESLint clean on all six files. **No full client suite, no `verify`, no fingerprint script.**

### The tests are load-bearing — two sabotages, both caught

| sabotage | result |
|---|---|
| `buildPerfContext` counts FINISHED racers in the spread | **2 red** — "measures leader-to-last over the RUNNING racers only", "reports nulls when every racer has finished" |
| `exportPerfLog` drops the `context` block | **1 red** — "carries the new fields when a context is supplied" |

Both reverted; the suite is green again on the committed state.

### The test the block asked for, in both readings

> *"an export carries the new fields, and they are absent when the log is off"*

- **Carries them**: `exportPerfLog(log, buildPerfContext(st, …))` asserts every field of the block.
- **Absent when off**: with `enablePerfLog` off, `createPerfLog()` is never called and
  `perfLogRef.current` stays null, so both HUD paths return before reaching `exportPerfLog` — there
  is no export at all. The other half is asserted directly: no context supplied → **no `context` key
  in the file**, and an empty log exports `stats: null` with no context.

## TIMING LEDGER

| item | wall |
|---|---|
| test runs — the two files covering what changed (3 runs incl. both sabotages) | ~17 s |
| ESLint on six files | ~4 s |
| `engine-reach --check` | <1 s |
| *no bench or profile runs in this piece* | — |
| everything else — reading the perf-log call sites, the change, this report | the remainder |

## DEV SERVER

**Not restarted, as instructed.** Vite is still listening on **5173** (PID 4824) and the API on
**4000** (PID 49000) — where they were at the start of the block. Note that the tree has moved three
branches underneath that server since it started, and the `[ra-build]` terminal line does not follow
a branch switch (a defect LABEL-OCCLUSION-1 already captured), so the badge it shows is stale. The
perf-log changes are behind `enablePerfLog`, which is off by default; nothing on screen changes
until the owner turns it on and exports.

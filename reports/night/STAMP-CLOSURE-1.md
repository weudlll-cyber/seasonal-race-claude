# STAMP-CLOSURE-1 — two of the three stamps were stale in their digits, and `depends=` was the reason

Branch `night/2026-09-19`, piece 3. Date: 2026-09-19.
**Nothing re-stamped. Nothing minted. No shipped default touched.** The three stamps' commits and
dates are exactly as they were; what was added to each is a `via=` field naming what produced it.

---

## ★★★ THE ONE LINE

> **The guard was applying the right rule to the wrong set.** Both stale stamps declare
> `depends=client/src/modules/camera/...` while their measurements **drive a whole race** — and what
> moved their digits was the **gap leader brake**, shipped in `defaults.js` on 2026-09-17, which
> neither `depends=` names.
>
> ★★ **Freshness over the REAL IMPORT CLOSURE separates the three stamps correctly — 2 red, 1 green
> — matching a full re-measurement of all three, at a cost of 0.7 seconds.**

---

## 1 · HOW THE GUARD DECIDED, BEFORE — WITH ADDRESSES

`scripts/check-measured-stamps.mjs`. A stamp is one HTML comment:

```
<!-- MEASURED: <what> @ <commit> <YYYY-MM-DD> depends=<path>[,<path>...] -->
```

The guard found the newest commit touching the `depends=` paths (`:341`, excluding `*.test.*` per
VERIFY-COST-3) and failed unless that commit was an ancestor of, or equal to, the stamped one
(`:357`). **It never ran a measurement**, which its own header states in full at `:26-28`: *"It does
not verify the NUMBERS … This checks FRESHNESS, not accuracy."*

**Three stamps exist in the whole tree**, and they were found by searching, not counted from memory:

| # | document | what | stamped | `depends=` |
|---|---|---|---|---|
| 1 | `docs/CAMERA_DIRECTOR.md:1056` | tracking-lag, six frame counts + two percentiles per state | `a57fc04b` 2026-09-10 | `client/src/modules/camera/` |
| 2 | `docs/ENDING-PHASES.md:52` | straggler-truth, phase 6 duration and zoom-out lead | `a57fc04b` 2026-09-10 | `client/src/modules/camera/CameraDirector.js` |
| 3 | `docs/SHIP-CEREMONY.md:118` | `ENGINE_INPUT_MODULES` is eleven entries | `ba9801a1` 2026-09-07 | `client/src/modules/raceConfigWorld.js` |

★ **On master `fe12fa95` the guard reported `3 stamp(s) … 0 stale` and exited 0.**

---

## 2 · ★★★ HOW MANY ARE STALE IN THEIR DIGITS — MEASURED, NOT ESTIMATED

**All three measurements were re-run on master.**

### Stamp 1 — `tracking-lag`, ★ ALL SIX FRAME COUNTS MOVED

`node scripts/tracking-lag.mjs`, the command the stamp names. **The guard's own header records
this measurement at about seven minutes**, and that is the figure used below — it was run in the
background here and not separately timed, which is said rather than rounded into a number I did not
take.

| state | ★ stamped (2026-09-10) | ★ measured today |
|---|---|---|
| BATTLE_ZOOM | **8415** | **7399** |
| COMEBACK_ZOOM | **1509** | **2249** |
| LEADER_ZOOM | **13133** | **13210** |
| LEAD_CHANGE | **7573** | **8335** |
| OVERVIEW | **4005** | **3238** |
| PHOTO_FINISH | **2089** | **1973** |

★ **Six of six.** The document's own prose above the table says *"five of the six frame counts
differ"* — that sentence was written on 2026-09-18 by `PURSUER-RENAME-1` and **it undercounts by
one**. Every one of the six differs. Reported here rather than edited: the report is the lab journal
and stands; this is the correction beside it.

### Stamp 2 — `straggler-truth`, ★ ALL EIGHT NUMBERS MOVED

`node scripts/straggler-truth.mjs`, seed 9. Well under a minute.

| track | n | ★ stamped phase 6 | ★ today | ★ stamped lead | ★ today |
|---|---|---|---|---|---|
| dirt-oval | 20 | **6.18 s** | **4.85 s** | **4.57 s** | **2.70 s** |
| dirt-oval | 40 | **7.53 s** | **9.12 s** | **5.75 s** | **5.73 s** |
| river-run | 20 | **4.45 s** | **3.68 s** | **2.30 s** | **1.28 s** |
| river-run | 40 | **5.95 s** | **6.80 s** | **4.38 s** | **4.57 s** |

★ **Eight of eight.** And the document's headline sentence — *"'~2.9 s at 20 racers' was wrong — it
is 4.45 s on the open track and 6.18 s on the closed one"* — is now itself wrong: it is **3.68 s**
and **4.85 s**.

### Stamp 3 — `ENGINE_INPUT_MODULES`, ★ CURRENT

`client/src/modules/raceConfigWorld.js:56` lists **eleven** entries. Counted, not assumed:
`durationModel`, `rowLayout`, `raceBehaviorConfig`, `raceBehavior`, `raceStep`, `raceGovernor`,
`raceLengths`, `racePlanner`, `raceDynamicsConfig`, `camera/lapUtils`, `utils/mathUtils`.
**The stamp holds.**

### ★★ THE COUNT

**Two of the three stamps in this tree are stale in their digits. The guard reported zero.**

---

## 3 · ★★★ WHY THE GUARD COULD NOT SEE IT — THE CAUSE, NOT THE SYMPTOM

Both stale stamps name the **camera** in `depends=`. Both of their measurements **run a real race**:
`tracking-lag.mjs` and `straggler-truth.mjs` drive `scripts/lib/raceDriver.mjs`, which drives
`raceCore`, `racePlanner`, the whole engine.

★★ **What moved them is the GAP LEADER BRAKE**, shipped to master on 2026-09-17 in
`client/src/modules/storage/defaults.js` — a file neither `depends=` names, and which changes the
race these two measurements are timing.

★ **The rule was right. The SET it was applied to was hand-written and too small** — which is the
defect class this repository has already paid for in `GUARD.reach` declarations, and to which
REACH-CONTRACT-1 gave the standing answer: **derive the set; never maintain it.**

### ★ There is a second, sharper form of the same hole, found by hitting it

A commit that **updates a stamp and changes its dependency at the same time invalidates itself**, and
neither half of the guard can see it:

- **Before** the commit exists, the newest commit touching the dependency is still an ancestor of the
  stamped one — **green**.
- **After** it exists, the same tree is **red**.
- The `--staged` pass, which exists precisely to catch "this will be stale the moment it lands",
  reported **"3 stamp(s) checked against the STAGED tree, 0 would go stale"**.

Hit live on `feat/pursuer-rename`: commit `d7ff2db9` re-stamped the tracking-lag stamp to `fe12fa95`
and edited `client/src/modules/camera/comebackDetector.js` in the same commit. That branch has been
red ever since, and the redness appeared only after the commit was made. **Recorded, not fixed** —
the fix is a rule about how a stamp is taken (SHIP-CEREMONY TRAP B already says stamp at the commit
that LAST CHANGED the dependency, which means a separate follow-up commit), not a change to this
guard.

---

## 4 · ★★ WHAT WAS BUILT, AND WHAT IT COSTS

**The stamp now names what produced it**, and the same freshness question is asked a second time over
that file's **real import closure**:

```
<!-- MEASURED: <what> @ <commit> <YYYY-MM-DD> depends=<path>[,...] via=<entry file> -->
```

`closureOf` is the router's own import walk (`scripts/lib/routing.mjs:103`) — **the same one
`engine-reach` and `verify` already select on**, so a stamp's dependency set and the tree's idea of
what a file reads cannot come apart. It was reused, not written: nothing new computes a closure.

`via=` is **required**. A stamp without one does not parse and fails loudly, because an optional
declaration is one nobody writes.

### The verdict it gives, against the digits measured in §2

| stamp | `depends=` half | ★ closure half | ★ digits, measured |
|---|---|---|---|
| tracking-lag | clean | ★ **RED** — 7 imported files moved | ★ **stale** |
| straggler-truth | clean | ★ **RED** — the same 7 files | ★ **stale** |
| `ENGINE_INPUT_MODULES` | clean | ★ **green** | ★ **current** |

★★★ **Three of three.** The proxy agrees with the re-measurement on every stamp in the tree.

And it **names the files**, so the reader can judge whether the digits could plausibly have moved:

```
7 file(s) that via=scripts/tracking-lag.mjs actually IMPORTS changed after it:
  client/src/modules/raceCore.js, client/src/modules/racePlanner.js,
  client/src/modules/storage/defaults.js, client/src/modules/raceDynamicsConfig.js,
  scripts/lib/raceDriver.mjs, scripts/lib/cameraPlanDelivery.mjs,
  client/src/modules/heroCurveGenerator.js
The closure is 82 file(s).
```

★ `client/src/modules/storage/defaults.js` — **the brake** — is in that list, named by the guard
itself.

### ★ THE COST, measured rather than estimated

Three runs each, wall clock, same machine, the probe at master against this tree:

| | |
|---|---|
| before | **578, 617, 639 ms** |
| ★ after | **1213, 1338, 1349 ms** |
| ★ **the price** | ★ **about +0.7 s, for all three stamps** |
| what re-measuring instead would cost | ★ **about seven minutes for `tracking-lag` alone** (the guard's own documented figure), under a minute for `straggler-truth` |

**`verify` runs in 337–369 s.** 0.7 s is 0.2% of it. **That is a price worth paying; re-measuring
every stamp on every run is not, and was not built.**

### What it covers, and what it still does not

★ **It is still FRESHNESS, not accuracy.** It now says *"the numbers COULD have moved"* about the
right dependency set. Only re-running the measurement says whether they DID. Written into the guard's
own `GUARD.blind` so a reader of a green run learns it there:

- the NUMBERS themselves — the closure check is a better proxy, not an answer;
- a stamp that went stale **with no commit behind it** — a nondeterministic measurement, or one taken
  wrongly in the first place. Nothing in git can see either;
- whether `via=` names the **right** entry file. It is checked to exist and its closure is walked; a
  `via` with a smaller closure than the truth narrows itself, exactly as a wrong `depends=` did.

---

## 5 · ★★ PROVEN BY SABOTAGE, IN BOTH DIRECTIONS, ON A CONTROLLED FIXTURE

The two real stamps going red is a **finding**, not a proof — the verdict has to come from the rule
and not from what happens to be committed. So the proof is a throwaway repository in which
`depends=` and the `via=` closure are **deliberately different sets**:
`depends=src/cam/`, `via=src/tool.js`, and `src/tool.js` imports `src/engine/b.js`.

| test | arm | ★ verdict |
|---|---|---|
| **CLOSURE, GREEN** | nothing moved | ★ **exit 0, `0 stale`** |
| **CLOSURE, RED** | `src/engine/b.js` changed and committed; `src/cam/` untouched | ★ **exit 1**, naming `src/engine/b.js`, `1 stale` — and it asserts the `depends=` half stays **quiet**, which is what makes it the closure half's catch |
| **via that does not exist** | `via=scripts/no-such-file.mjs` | ★ **exit 1** — an empty closure is the most comfortable possible pass, and it is refused |

`scripts/check-measured-stamps.test.mjs`: **21 tests, 21 pass.**

### ★★ TWO TESTS HAD TO BE REPAIRED, AND THE REPAIR IS ITSELF THE NIGHT'S SUBJECT

Two of the guard's existing tests asserted **`r.status === 0` on the real repository** — *"BASELINE:
the repository's own stamp is fresh"* and the living-doc-set test. **They went red the day the guard
started reading the right dependency set and found a stamp that had been stale for two weeks. A test
that fails when its subject succeeds is worse than no test.** Both now assert what is actually the
guard's own property — that it parses every stamp, opens every living document, and reaches a verdict
— and leave the freshness of the tree to the failure message.

★ **And the test file could only run while the guard PASSED.** It imported `TEST_FILE_EXCLUDE` from
the guard, and the guard is a script: importing it executes its whole body, so the moment it
legitimately went red it took its own test suite down with it and `verify` showed two failures where
there was one finding. The constant now lives in `scripts/lib/testFileExclude.mjs` — **one home,
imported by both ends, executed by neither.**

---

## 6 · ★ THE STATE THIS LEAVES

★★ **`check-measured-stamps` is RED on this branch, on two true findings, and it is meant to be.**

**Nothing was re-stamped, deliberately and on instruction.** A stamp records a measurement; re-writing
one is a decision about what the document claims, and both of these need the owner's eye:

- **`tracking-lag`** — the six frame counts are all wrong. Re-measuring is ~6 minutes; the numbers to
  write are in §2 of this report.
- **`straggler-truth`** — all eight numbers are wrong, and the document's HEADLINE SENTENCES are
  wrong with them, not just the table.

★ **Neither is a regression.** Both moved because the gap leader brake shipped, which changed the race
both measurements time. **They are documents that did not follow a shipped change.**

### What was NOT built, and why

- **Re-measuring inside `verify`.** About seven minutes for one stamp against a 337–369 s verify. A guard
  nobody runs is worse than none.
- **A `digest=` of the measurement's output in the stamp, verified on demand.** It would answer the
  accuracy question exactly. It needs every measurement to have a canonical, deterministic output
  form, and it needs a `--measure` tier somebody actually runs. **A real option, costed and not
  taken tonight** — the cheap check catches 3 of 3 today, and that is the better first move.

---

## THE STOP CONDITION

★ **All four fingerprints were measured before this piece and after it** and are unmoved — world
`b6cfd1daf1756f61`, world-off `744bec11644978bb`, camera `5d91f59b9ada16cc`, render
`06671c1d13850cd7`, all four matching the record. This piece touches only `scripts/` and three
documents, and no product source at all.

`node --test scripts/verify.test.mjs` — **53 pass, 0 fail.**
`node --test scripts/check-measured-stamps.test.mjs` — **21 pass, 0 fail.**

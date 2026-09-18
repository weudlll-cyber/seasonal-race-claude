# DOC-DIFF-1 — what the 17.9. documentation pass changed, and why none of it was on master

Branch `night/2026-09-18`, piece 3. Date: 2026-09-18. Built from **the actual diff**, not from the
report that summarised it.

---

## ★★ THE THING THAT HAS TO COME FIRST

**Every correction listed below was already written on 2026-09-17 — and none of it was on master.**

Both commits live only on `night/2026-09-17`, which was never merged:

| commit | subject | contained in |
|---|---|---|
| **`fc4d4143`** | *fix(docs): correct six statements that describe a tree that no longer exists* | ★ **`origin/night/2026-09-17` only** |
| **`e29b428d`** | *docs(DEVSCREEN-INVENTORY): the gap brake's five controls were missing…* | ★ **`origin/night/2026-09-17` only** |

Checked with `git branch -r --contains` on each. ★ **So when this piece asked me to "re-check the
named items that were NOT part of that pass", the honest answer is that on master they were ALL still
wrong — the pass that fixed them is sitting on an unmerged branch.** Every item was re-verified at
master's tree tonight and every one of them was still there.

★ **What I did about it, and why.** The corrections were already written, reviewed and proven inert
once. Rewriting them from scratch would have produced different words for the same facts, so I
**cherry-picked the two commits onto `night/2026-09-18`** (`-x`, so each carries its origin) rather
than retyping them. That is the option that changes less. **They are now on tonight's branch and
still not on master.**

---

## 1 · THE SIX CORRECTED STATEMENTS, FROM THE DIFF

### ★ 1. `docs/FORCE-MAP.md:459` — row A7's window

| | |
|---|---|
| was | `OUTCOME 0.55–0.95` |
| now | `OUTCOME [choreoOutcomeStart, corridorEnd]` |
| ★ why it was wrong | **`corridorEnd` is `1.0`, not 0.95** — [racePlanner.js:87](../../client/src/modules/racePlanner.js#L87). The window ran to the line, and the table said it stopped at 0.95. |

### ★ 2. `docs/FORCE-MAP.md:465` — row A13's window

| | |
|---|---|
| was | `PULK [0.15,0.5), faded→1.0 at corrStart` |
| now | `PULK [pulkStart, choreoOutcomeStart), faded→1.0 at corrStart` |
| ★ why it was wrong | **The upper bound is `choreoOutcomeStart` = `0.6`, not 0.5** — [defaults.js:1070](../../client/src/modules/storage/defaults.js#L1070), and [defaults.js:1125-1126](../../client/src/modules/storage/defaults.js#L1125) says in as many words that *"`pulkEnd` IS `choreoOutcomeStart`"*. The lower bound 0.15 was right ([defaults.js:993](../../client/src/modules/storage/defaults.js#L993)). |

★ **Both rows now name the KEY instead of copying its value**, which is also the one-home rule: the
number lives in `defaults.js` and the map points at it. That is why the fix does not simply write
`0.6`.

### ★ 3. `client/src/modules/racePlanner.js:1594` — "SIM-ONLY"

| | |
|---|---|
| was | `SIM-ONLY: activated only when the plan carries a gapReroll threshold (the browser never sets it, so this early-returns rawSample there → byte-identical)` |
| now | `★ THIS RUNS IN THE BROWSER.` …the block now records what it used to say, that it stopped being true when the feature shipped, and that the corrected sibling said so from 2026-09-13 |
| ★ why it was wrong | **`defaults.js` ships `gapRerollEnabled: true` with a non-null `gapRerollThresholdLengths`**, so the threshold IS set on the shipped path. ★ **Its own sibling comment already said so** — [racePlanner.js:389-390](../../client/src/modules/racePlanner.js#L389): *"SHIPPED, and `defaults.js` now carries `gapRerollEnabled: true` … so the threshold is NOT null on the shipped path"*. **Two comments about one mechanism disagreed, and the later one was right.** |

### ★ 4. `client/src/modules/raceCore.js:372` — the PulkLeadRotation header

| | |
|---|---|
| was | `── Pre-OUTCOME contest-injector "director" (PulkLeadRotation — default OFF) ──` |
| now | the header drops the claim and records that it is on whenever the race plan is |
| ★ why it was wrong | **The very next line is `const pulkLeadRotationOn = racePlanEnabled;`** — [raceCore.js:376](../../client/src/modules/raceCore.js#L376). And [defaults.js:1017](../../client/src/modules/storage/defaults.js#L1017) heads the same mechanism **"SHIPPED ON"**. |

### ★ 5. `client/src/modules/raceCore.js:598` — the call-site comment

| | |
|---|---|
| was | `// PulkLeadRotation (default OFF → skipped).` |
| now | `// PulkLeadRotation — runs whenever the race plan is on, which is the shipped state.` |
| ★ why it was wrong | Same evidence as 4. **"skipped" described the opposite of what the shipped build does**, at the site where it does it. |

### ★ 6. `scripts/check-runin-frame.mjs:161-163` — the `--control` arm

| | |
|---|---|
| was | `INERT ON MASTER TODAY: the key does not exist here yet, so this flag changes nothing until \`feat/finish-framed\` lands, at which point it becomes the before/after lever.` |
| now | `STILL INERT` … and *"it is no longer waiting for anything"* — the branch is not at origin and exists only as a tag, so it **did not land and will not** |
| ★ why it was wrong | **`feat/finish-framed` is not at origin** (`git ls-remote --heads`: no match) and survives only as the tag **`archive/finish-framed`**. **`finishLineFraming` appears 0 times in `defaults.js`.** The comment promised a future that had already been archived. |

---

## 2 · THE SEVENTH CHANGE, WHICH IS CODE AND NOT A COMMENT

★ **The pass also changed a line of engine code**, and the summary's "six statements" did not say so.

**`client/src/modules/raceCore.js:700-711` — the diagnostic `vt` omitted `governorMult`:**

```js
// was
r.vt = (r.baseSpeed * boost * brake * rowEnvMult * r.trajectoryMult * r.areaBonusMult) / race_baseSpeed;
// now
r.vt = (r.baseSpeed * boost * brake * rowEnvMult * r.trajectoryMult * r.areaBonusMult *
        (r.governorMult ?? 1.0)) / race_baseSpeed;
```

★ **Why it was wrong, with the address in the same sentence:**
[raceStep.js:131](../../client/src/modules/raceStep.js#L131) multiplies the realized step by
`(racer.governorMult ?? 1.0)`, and [raceStep.js:106](../../client/src/modules/raceStep.js#L106)
documents the chain as *"baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult ·
**governorMult** · dt"*. **`vt` claimed to be the realized speed factor and left out a term the step
applies**, so it understated any racer the PULK contest director was acting on.

### ★ PROVEN INERT AT TONIGHT'S TREE, NOT ASSUMED FROM LAST NIGHT

`node scripts/check-fingerprints.mjs --mint`, run after the cherry-picks:

> `check-fingerprints: 4 roles, 1209 tracked files scanned, 0 stray copies, 4 role(s) re-minted against the engine.`

**All four match the record and NOTHING WAS WRITTEN** — `git status` clean afterwards, and
`git diff HEAD -- docs/fingerprints.json` empty. ★ **The values are the record's own**: world
`b6cfd1daf1756f61`, camera `5d91f59b9ada16cc`, render `06671c1d13850cd7`, world-off
`744bec11644978bb`. **Nothing was minted.**

★ **The reason it can be inert while touching the engine**: `vt` is written here, at the constSpeed
diagnostic below, and in `scripts/sim-race-visual.mjs` — and **read nowhere in the tree**. It is a
diagnostic waiting for a consumer.

---

## 3 · THE TWO COMPLETENESS GAPS

### ★ Gap 1 — `docs/FORCE-MAP.md` had no row for the gap leader brake

**What was missing:** the file is titled *"the complete force map"* and says it owns **every force
that acts on a racer**. The gap leader brake shipped ON to master on 2026-09-17 and **had no row**.

**What was added** — row **A14**, naming the key rather than copying its value:

> `| A14 | gapBrakeStrength — the GAP leader brake (shipped ON 2026-09-17) | bounded by gapBrakeMaxAuthority; silent below gapBrakeAllowedGapPx | [choreoOutcomeStart, gapBrakeWindowEnd], leader only | racePlanner.js:_computeGapLeaderBrake |`

★ **For a file that claims completeness, an omission IS a factual error** — which is why this counts
as a correction and not an expansion of scope.

### ★ Gap 2 — `docs/DEVSCREEN-INVENTORY.md` omitted five rendered controls

**What was missing:** the file states at [DEVSCREEN-INVENTORY.md:5-8](../../docs/DEVSCREEN-INVENTORY.md#L5)
that *"every control in the file appears below, and nothing below is absent from the file"* — and
`gapBrake` appeared **0 times** in it, while
[DynamicsTuningSection.jsx:179-185](../../client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx#L179)
registers five such controls and `:854`/`:871` render them.

**What was added:** a section listing the five by **Control / Config key / testId**, with **no
values** — the values live in `defaults.js` and the inventory points at them.

---

## 4 · ★ THE RE-CHECK OF THE NAMED ITEMS — ALL FIVE WERE STILL WRONG ON MASTER

Verified at master's tree tonight, before the cherry-picks:

| named item | state on master tonight | now |
|---|---|---|
| FORCE-MAP's four stale windows | ★ **still wrong** — `OUTCOME 0.55–0.95` at :459, `PULK [0.15,0.5)` at :465 | fixed |
| `racePlanner.js` "SIM-ONLY" against the corrected sibling | ★ **still wrong** — the SIM-ONLY text at **:1594**, contradicted by **:389-390** | fixed |
| `raceCore.js` "default OFF" for an ON mechanism | ★ **still wrong** — **:372** and **:598** | fixed |
| `raceCore.js` `vt` omitting `governorMult` | ★ **still wrong** — **:700-704** | fixed, and proven inert |
| the run-in guard's `--control` arm | ★ **still wrong** — **:161-163** | fixed |

★ **On the addresses.** The brief names `racePlanner.js:1235`, `raceCore.js:578` and
`raceCore.js:679-683`. At master's tree tonight those statements sit at **`racePlanner.js:1594`**,
**`raceCore.js:598`** and **`raceCore.js:700-704`** — the files have moved since the older report was
written. **The statements are the same ones; the line numbers in the brief are stale, and the
corrected addresses are above.**

★ **"Four stale windows" is two.** The brief says FORCE-MAP had four; the diff corrects **two** rows
(A7 and A13) and adds one (A14). I re-read the additive table for further stale windows and found
none beyond those — **A9 and A10 are marked REMOVED with no window at all**, which is correct. **If
two more were meant, I did not find them, and I am not going to invent a correction to reach a
count.**

---

## WHAT THIS DOES NOT SETTLE

- ★ **None of this is on master.** Tonight's branch carries it, exactly as last night's did. **Two
  branches now hold the same corrections and master holds none of them** — that is a merge decision,
  and merging is not mine to make.
- **The cherry-picks reproduce last night's wording**, so the words were reviewed once, not twice.
- **I did not re-audit FORCE-MAP as a whole**, only the named rows and the additive table around them.

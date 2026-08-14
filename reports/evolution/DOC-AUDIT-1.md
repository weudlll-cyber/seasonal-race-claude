# DOC-AUDIT-1 — the record against the source, and a fingerprint that is not reproducible

**Branch `docs/audit-1`, off master `a0970310`.** Two pieces: whether the documents describe what
shipped, and the tag sweep (TAG-SWEEP-1, recorded in [TAGS.md](../../docs/TAGS.md)).

**The audit found something it was not looking for and it outranks everything else here:
`server/data/tracks` silently overrides the committed seed tracks, so the WORLD fingerprint measures
a different value in the owner's tree than in a fresh checkout.** §5.

---

## 1. The living documents, one row each

| document | verdict |
| --- | --- |
| **GLOSSARY** | **CORRECTED.** `pair guarantee` said "two named contenders both stay in frame" — the shipped framing is a SET of 2, 3 or 4. Added `contender guarantee`, `contender set`, and `corridor CAP`; `pair guarantee` is now stated as the n = 2 case. |
| **CAMERA_DIRECTOR** | **CORRECTED.** The corridor CAP — default ON, moved both fingerprints — appeared nowhere. Added the contender rule (both conditions, no new number), the capture-once property, the cap's opposite composition, its arrival over `corridorCapArriveMs`, who wins on conflict, and the `_binding` probe defect. |
| **VERIFY-RULES** | **CORRECTED.** Named the wrong file to optimise. §3. |
| **ENDING-PHASES** | **FLAGGED, not corrected.** Phase 6's two numbers are unverified and one is doubtful. §4. |
| **DEAD-ENDS** | **CURRENT.** §N already records the corridor floor as retired and superseded, and §M `feat/finish-framed`. Both name deleted branches, correctly, as history. |
| **TAGS** | **CORRECTED** by the sweep — 16 register lines removed, the derivation rule added, three exceptions annotated. §6. |
| **SHIP-CEREMONY** | **LEFT.** Describes the process, not the endgame; nothing in it went stale. |
| **STANDINGS-ARCHITECTURE** | **LEFT.** Untouched by any of the endgame work. |
| **FAIRNESS** | **LEFT.** The endgame changes are camera-only; no fairness threshold moved. |
| **SIM** | **LEFT** — but see §5, which is about the sim's inputs and is a finding rather than a doc fix. |
| **BACKLOG** | **LEFT.** Names `finishPauseMs` correctly; no stale entry found. |
| **REBASELINE** | **NOT MISSING.** It is `reports/parity/REBASELINE.md`, not `docs/`. Referenced from ten documents; all links resolve. |

**Nothing documented that no longer exists.** Every reference to a deleted branch
(`feat/front-group`, `feat/finish-framed`, `feat/runin-state`) is in DEAD-ENDS or TAGS and reads as
history. `endgameCorridorFloor` and `endgameFloorBindsExtent` are absent from `defaults.js` and
survive only in DEAD-ENDS §N and the `archive/front-group` register entry, both of which say they are
retired. `check-index`: **224 reports, 0 unindexed, 0 dangling.** `check-measured-stamps`: **2 stamps,
0 stale.** `fingerprints.json` reasoning is current (camera and render minted `0bd07dba` 2026-08-14;
world unmoved since RACER-MOTION-2).

### The keys

| key | one home | reasoning | Dev Screen |
| --- | --- | --- | --- |
| `runInOpenMs` | ✅ | ✅ CAMERA_DIRECTOR, ENDING-PHASES | ✅ |
| `corridorCapArriveMs` | ✅ | **was fingerprints.json + TAGS only — now CAMERA_DIRECTOR** | ✅ |
| **`contenderZoom`** | ✅ | **was NOWHERE — now CAMERA_DIRECTOR + GLOSSARY** | **was NONE — control ADDED** |
| `finishHoldAfterLastMs` | ✅ | ✅ | ✅ |
| `podiumRevealBeatMs` | ✅ | ✅ | ✅ |
| `winnerCardMs` | ✅ | ✅ | ✅ |
| `finishPauseMs` | ✅ | ✅ | ✅ |
| `endgameCorridorFloor` | n/a — does not exist | retired in DEAD-ENDS §N | n/a |

**`contenderZoom` was the worst gap on the list.** It ships ON, it gates two mechanisms at once — the
framed set and the lane cap — and it had no control and no prose. The owner could pace the cap with
the arrival slider but could not answer the prior question of whether the pair or the set is the
right shot. A toggle is added beside the slider.

## 2. The German prose — removed

`scripts/sim-fairness.mjs` (7 lines) and `scripts/sim/observers/report.mjs` (36 strings) are now
English. Nothing depended on the wording: no test asserts on it and `sim-fairness.mjs` is the only
caller.

**What was NOT translated, and the reason is a data contract.** `sollBereich` ("target band") is a
FIELD NAME, not prose. It is read by five scripts and **written into `fairness-data.json` in eleven
directories**; renaming it silently invalidates every stored fairness result. Local variables were
renamed where they touched no serialized key (`raceSollRankMap` → `raceTargetRankMap`, `sollRank` →
`targetRank`), and the diff was checked line by line to confirm no emitted key moved. **The remaining
German identifiers — `sollBereich`, `Bereichstreue`, `Anzahl` — need a migration, not an edit**, and
are proposed rather than done.

## 3. VERIFY-RULES named the wrong file

It said the slowest ten of **179** files are 85%, and **`goldenEquality.test.js` alone is 46%**.

Re-measured twice on `a0970310`:

| | parity directory alone | full suite, contended |
| --- | --- | --- |
| `goldenRealArm.test.js` | **52.8 s** | **152 s (26%)** |
| `goldenEquality.test.js` | 25.3 s | 36–76 s (13%) |

**`goldenRealArm` wins both times.** The file count is now 208 and the slowest ten are 79%. Anyone
acting on the old line would have optimised the wrong file. Corrected, with the contention spread
stated — `goldenEquality` measured 36 s and 76 s on the same tree — so the RANKING is the finding and
the shares are approximate. Deliberately **not** given a `MEASURED:` stamp: a timing claim depends on
`client/src/` as a whole, and a stamp that goes stale on every commit is a guard that cries wolf.

## 4. ENDING-PHASES phase 6 — flagged, not corrected

Two numbers, neither stamped, neither sourced:

- **"~2.9 s at 20 racers"** — plausible, unverifiable: nothing in `scripts/` measures the interval
  between the winner's crossing and the last racer's.
- **"the zoom-out starts ~1.4 s before it ends"** — **doubtful, and it is the load-bearing one**,
  because it is the claim that the ending does not begin before the race is over. The zoom-out's own
  duration is longer than that lead, so a zoom-out starting 1.4 s early would still be running after
  the field is home. A separate measurement recorded **4.4–5.9 s**, which contradicts it outright.

**Neither was corrected, because correcting a number means measuring it and the instrument does not
exist.** Both are marked UNVERIFIED in the table and the reasoning is written beside it, so a reader
stops taking them as established. Building the instrument is small and is proposed.

## 5. THE FINDING THIS AUDIT DID NOT GO LOOKING FOR

**The WORLD fingerprint is not reproducible across checkouts.**

`scripts/lib/raceDriver.mjs` loads tracks from `server/data/tracks` **if it exists**, and falls back
to `server/seeds/tracks` otherwise. `server/data/**` is **gitignored**. So:

| tree | track source | world fingerprint |
| --- | --- | --- |
| the owner's main tree | `server/data/tracks` (live, gitignored) | **`0829fc6c5b3f7e7f`** |
| any fresh worktree or clone | `server/seeds/tracks` (committed) | **`dc4647be0f55ebdb`** — the record |

**All ten live tracks differ from their seeds.** Every fingerprint measured in `C:/ra-n1` tonight —
including the CONTENDER-ZOOM and COORD-SYSTEM ship measurements — used the seeds and matched the
record. Measuring the same commit in the owner's own tree does not.

**No guard catches this.** `fingerprint-containment` checks whether the RECORD is internally
consistent and never runs the engine; the world-fingerprint task prints its value without comparing
it. So a number whose entire purpose is to be a fixed reference has been silently dependent on
untracked local data.

**Nothing was minted and nothing in `fingerprints.json` was touched.** Which set is canonical is not
mine to decide: seeds are reproducible, live data is what the owner actually races. It is stated here
as an open decision and is proposal 1.

**One consequence of my own work, said plainly:** I removed `C:/ra-n1` at the end of the last task,
which was the tree that reproduced the record. A fresh worktree reproduces it again, so nothing is
lost — but the reproduction command in `fingerprints.json` does not mention that it only holds where
`server/data/tracks` is absent, and that is the gap.

## 6. The tag sweep — 115 → 99

Full verification and the register line are in [TAGS.md](../../docs/TAGS.md); the pair-by-pair table
is in the task report.

**16 of 19 `pre/ship-*` verified derivable as `v-ship-X^1` and deleted. Three kept, each for a
different structural reason** — a tag cut on the feature branch (`combo15`), a register commit
landing between tag and merge (`ceremony-opening`), and a ship with no merge commit at all
(`the-night`). Those three are exactly the classes where the derivation is unsound.

**`archive/*` all stay, and the job was verified rather than assumed:** 16 of 19 point at commits
**unreachable from master** — those tags are the only thing keeping them alive. **Three
(`camera-refactor`, `company-only`, `fair-arrival-merged`) are reachable from master**, so they are
record-only, not load-bearing. They stay, but a reader should know the difference.

**A correction to the brief's premise:** the three families cover 57 of the 115 tags, not all of
them. The other 58 are `pre/*` step-tags outside the ship family (37), `v-*-complete` phase endpoints
(16), `backup/*` (5), `stable/*` (2), and three one-offs. **None were touched** — they are outside
what was authorised, and the `v-*-complete` family in particular is the same kind of record as
`v-ship-*`.

## 7. What did not change

No default, no engine file, no fingerprint minted. The only source change is the Dev Screen toggle.

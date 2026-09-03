# CITATIONS-1 — the non-drift remainder is FIFTEEN, not two; the drift cannot be re-derived and was not touched; and one dead tag was standing in EIGHT living documents

> **Nothing was batched.** Every correction below was checked at the tree before it was applied —
> the file read, the symbol grepped, the tag listed, the branch resolved. **The 54 line-number
> citations are deliberately unrepaired**, and §4 gives the measurement that decides it rather than
> an opinion.

---

## THE THREE NUMBERS

| | |
| --- | --- |
| **non-drift corrections applied** | **15**, in 9 documents and 1 source file — **plus 4 false numbers on the Dev Screen** (§6) |
| **line-number citations repaired** | **1** — the only one a machine can prove wrong |
| **second sites found for one claim** | **8**, and the sweep found them in three passes |

---

## 1. ★ THE BRIEF SAID "~54 ARE DRIFT AND 2 ARE NOT". THE NON-DRIFT REMAINDER IS FIFTEEN.

CORRECTIONS-1's §5 already listed more than two under *"Still worth doing, and not done"*, grouped
by document rather than counted. Counted individually, and each verified at the tree tonight:

| # | document | the claim | what is true |
| --- | --- | --- | --- |
| 1 | `docs/README.md` | it lists **every** maintained document | **six** were missing: `AUTH`, `ENVIRONMENT`, `ENDING-PHASES`, `NIGHT-RUN`, `MORNING`, `OPEN` |
| 2 | `docs/ROADMAP.md` | *"**Eleven** documents and reports link to `docs/ROADMAP.md`, and **several are reports**"* | **five files, seven links**, of which **exactly one** is a report — and it is the report that filed this finding |
| 3 | `ARCHITECTURE:37` | DevScreen has **10 sections** | **16** — 7 operator, 9 advanced |
| 4 | `ARCHITECTURE:171` | `BATTLE_ZOOM` fires within **`battlePulkThresholdPx`** | the key is `battlePulkThresholdT`, a lap fraction; the `Px` name occurs nowhere |
| 5 | `ARCHITECTURE:193-195` | `cam.zoom = overviewZoom × **stateRatio**`, with four per-state ratios | **`stateRatio` occurs nowhere** in `client/src` or `scripts`; per-state zoom is `visibleCorridors` since 2026-08-03 |
| 6 | `ARCHITECTURE` (deferred follow-ups) | the sim *"never sets `frameSizePx`, so this always falls back to `0.014`"* … *"(already set)"* | **it contradicts itself in one sentence**, and the false half is the one doing the work: the sim DOES set it |
| 7 | `CAMERA_DIRECTOR:899` | `updateCountdown(racers, ts, elapsed, **durationMs**, cW, cH)` | **five** parameters, no `durationMs` |
| 8 | `CAMERA_DIRECTOR:903` | `camDir.update(…, **smoothDt**)` | `rawDt`, since `f16ab4de` 2026-06-08 |
| 9 | `CAMERA_DIRECTOR:904` | the rAF loop calls `camDir.detectBattleGroup` | `index.jsx` never calls it; it is reached through `frameCameraInputs.js` |
| 10 | `CAMERA_DIRECTOR:905` | the loop ends with `ctx.setTransform(...)` | **no `setTransform` call is left in the client** |
| 11 | `CAMERA_DIRECTOR:1278` | `cameraSeed.js` is *"imported by `RaceScreen` alone"* and *"**not in `tracking-lag.mjs`'s load closure**"* | `raceDriver.mjs` imports it top-level, `tracking-lag.mjs` imports `raceDriver`, and a dozen more files under `scripts/` import it |
| 12 | `SIM.md:48` | `lapUtils.js` — *"**speed scale factor** and reference FPS"* | it exports `REFERENCE_FPS`, `lapProgress`, `currentLap`. **§8 of the same document lists `computeSpeedScaleFactor` under what was deleted** |
| 13 | `SIM.md:537` | `outcomeReached` — *"do **all** racers finish?"* | `finishedCount > 0` — **at least one**. Never true; that form is as old as the document |
| 14 | `SIM.md:798` | all four naturalness metrics exclude the first 4 s, **including `stableOvertakes`** | `stableOvertakes` is windowed 20–80% with no warmup term — which this page states correctly elsewhere |
| 15 | `SIM.md:1110-1111` + `SWEEP-HARNESS:124` | *"~3716 lines"*, *"three observers"*, and *"scratch lands in `client/tmp/` rather than an external temp dir — a known hygiene limitation"* | **6,195 lines**, **thirteen** observers, and the default is EXTERNAL — the paragraph warns that a fix is missing which landed 2026-07-29 |

**Where a count was the claim, the count is not replaced with a fresh one.** `SIM.md`'s line count
and observer list are **removed** and the reader sent to `wc -l` and to the GENERATED block that a
guard keeps current. A hand-typed number beside a generated one is the defect, not its staleness.

**Where a value was the claim, no value replaces it.** The `stateRatio` block now names
`visibleCorridors` and does not restate its per-state numbers: those live in `DEFAULT_CAMERA_CONFIG`.

---

## 2. ★ THE SECOND-SITE SWEEP — ONE DEAD TAG, EIGHT LIVING DOCUMENTS, THREE PASSES

`SIM.md` cited tag `pre/dead-mechanisms-cleanup` as the recovery route for deleted code. **The tag
does not exist**: `git tag -l` returns 123 and none is that one; `docs/TAGS.md` records it in the
DELETED table, from the 2026-07-23 collapse.

**Searching for the same claim found it seven more times, and the search had to be run three times
because each repair pass revealed sites the previous grep had not been shaped to see:**

| pass | sites found | where |
| --- | --- | --- |
| 1 | 2 | `SIM.md` ×2 |
| 2 | 4 | `SWEEP-HARNESS.md`, `BACKLOG.md`, `DEVSCREEN-INVENTORY.md`, `LESSONS.md` |
| 3 | 2 | `ARCHITECTURE.md`, `BACKLOG.md` (a second entry) |

**Eight live sites, in seven living documents, all naming a recovery route that does not resolve.**
Every one now names commit `0555f9d`, which is reachable — the route was real and only its address
was wrong. `docs/TAGS.md`'s own DELETED-table row is left alone: it is a correct record of the
deletion.

**A ninth site, in code, of a different claim.** `client/src/screens/RaceScreen/index.jsx` carries
*"Camera path (smoothDt) is intentionally unaffected"* twelve hundred lines above
`camDir.update(…, rawDt)`. DOC-TRUTH-2 spotted it in passing and filed it under the
`CAMERA_DIRECTOR` entry rather than as its own; it is corrected here **with the document**, which is
the whole point of a second-site sweep.

**Deliberately NOT touched, each for a stated reason:** `docs/archive/camera-inventory-2026-05-14.md`
(archive — it records `battlePulkThresholdPx` as it was); every `reports/**` hit (append-only);
`docs/TAGS.md` (its rows describe the deletion correctly).

---

## 3. THE ONE LINE-NUMBER CITATION THAT WAS REPAIRED, AND WHY ONLY THAT ONE

`docs/branding.md` cited `storage.js:158`. **`client/src/modules/storage/storage.js` has 148 lines.**

That is the ONLY class of stale citation a machine can call wrong today: a line past the end of a
file is checkable; a line inside it is not, because every in-range line number is "valid". Of 250
citations, exactly **one** is out of range.

The repair drops the line rather than replacing it, and spells the path out — because a bare
`storage.js` is ambiguous in this repository.

---

## 4. ★ CAN THE LINE NUMBERS BE RE-DERIVED MECHANICALLY? NO — AND HERE IS THE MEASUREMENT

**The census, taken over every `docs/*.md`:**

| | |
| --- | --- |
| line citations | **250** |
| distinct file names cited | **52** |
| **naming a bare `index.jsx`** | **31** — ambiguous across at least four screens |
| **naming NO identifier in the citing sentence** | **137 (55%)** |
| citations whose named symbol appears inside the cited range | 18 |
| within ±3 lines of it | 5 |
| pointing past the end of the file | 1 |

**Re-derivation needs two things the citations do not have.**

**(a) 55% name nothing to re-derive FROM.** A sentence like *"racePlanner.js:398-414"* with no symbol
in it gives a rewriting tool no target at all. 137 of 250.

**(b) Where a symbol IS named, the citation does not say WHICH occurrence it meant.** Measured on the
six symbols the phase documents cite most:

| symbol | mentions in `racePlanner.js` | non-comment | first hit |
| --- | --- | --- | --- |
| `getPhase` | 9 | **4** | line 165 — **a comment** |
| `pulkStartFrac` | 12 | **6** | 434 |
| `computePulkBiasedTarget` | 5 | 1 | 416 |
| `getPhaseFractions` | 3 | 1 | 166 |
| `_choreoEnabled` | 5 | 1 | 321 |
| `inPulk` | 2 | 1 | 630 |

**`getPhase`'s first occurrence is a comment at :165; its definition is at :524.** A first-occurrence
rewrite would move `PHASE-CONTRACT`'s citation from one wrong line to a different wrong line, and
nothing in the document says whether it meant the definition, a call site, or the comment.

**So: the fifty-four are NOT hand-edited and NOT mechanically rewritten.** Hand-editing 54 citations
is the shape that produces the next defect — this chain's own lesson — and a mechanical rewrite would
manufacture confident wrong answers. **They are left, and the reason is written here.**

---

## 5. ★ THE PROPOSAL — AND IT IS ONLY A PROPOSAL

> **A citation should name a SYMBOL, not a line: `` `racePlanner.js` → `getPhase()` `` rather than
> `racePlanner.js:357`.**

**The argument is not readability. It is that a line citation cannot be checked and a symbol citation
can.** Nothing in this repository can tell a correct `file.js:357` from a stale one — every in-range
number is equally plausible, which is exactly why 54 of them rotted unnoticed. But *"`getPhase` is in
`racePlanner.js`"* is a two-sided, machine-readable claim of precisely the shape Rule A already
enforces, and a guard for it is a rule inside an existing guard rather than a new script.

**What it would cost, measured rather than estimated:**

- **113 citations already name a symbol in the same sentence** and could be converted with review.
- **137 name none.** Each needs a person to open the cited line and decide what the sentence was
  pointing at. That is the expensive half and it cannot be automated — it is the same judgement
  §4(b) shows a machine cannot make.
- **31 would also need their FILE disambiguated** (`index.jsx`).

**What it would break:** a `file:line` is clickable in some editors and a symbol is not, though every
editor this project is used from has symbol search. Nothing mechanical breaks — `check-doc-links`
does not read line numbers, so there is no guard to update.

**What it would buy:** the largest recurring hygiene class in this repository stops regenerating,
**and becomes checkable for the first time.**

**This is a convention change and it is the owner's.** Nothing was converted. **On the morning sheet.**

---

## 6. ★ FOUR FALSE NUMBERS ON THE OPERATOR'S SCREEN — FOUND BY PIECE 5, FIXED HERE

Piece 5 is read-only and its census turned these up. **They are shipped-value claims contradicting
`defaults.js`, which is the class this piece owns**, so they are applied here rather than left
standing for a night.

The gap-reroll card carried, in three tooltips:

| tooltip | said | ships |
| --- | --- | --- |
| master switch | *"ON = shipped (symmetric, **G=0.75, strength=0.5**): runaway winners **23% → 8.3%**"* | G **0.5**, strength **1.0**, and different confirm-gate figures |
| Gap-Reroll G | *"**0.75** = shipped"* | **0.5** |
| Gap-Reroll strength | *"**0.5** = shipped — it halved the share of saturated corrections"* | **1.0**, and the confirm gate found the opposite trade-off |

**They are not random drift. They are one superseded arm, quoted three times.** `defaults.js`'s own
comment records it exactly: *"retuned 2026-07-23 (G 1.5→0.75, strength 1.0→0.5); **FLIPPED 2026-07-26
to the confirmed candidate G=0.5, strength=1.0** after the ten-track confirm gate (owner decision)"*.
The card was written from the retune and never followed the flip. **39 days**, on the card an
operator reads while judging the mechanism, with the correct values displayed in the input boxes six
lines below.

**The master switch's numbers are not replaced with fresh copies of G and strength.** It now points
at the two controls below it — restating them here is precisely how they came to be wrong.

**Swept:** `DEVSCREEN-INVENTORY.md:102` records the flip correctly, and `SIM.md`'s two hits are
section headings for the 2026-07-23 retune, correct as history. **The Dev Screen was the only live
false site.**

---

## Limits

**"15 non-drift" is a count of what CORRECTIONS-1 left, not of what exists.** DOC-TRUTH-2 checked 34
documents; nobody has re-run that breadth pass since, and this piece worked from its list plus what
the second-site sweeps turned up. **A sixteenth may be sitting in a document neither pass read
closely.**

**The 250-citation census is over `docs/*.md` only.** `reports/**` carries many more and is
append-only by rule, so it is out of scope by design — but a reader following a citation in a report
meets the same rot with no correction mechanism at all.

**Three of the fifteen were single-word swaps and twelve needed prose.** Every one names what it was
and what made it false, which makes the documents longer. That is deliberate and it is a cost: a
reader who wants only the current truth now reads past more.

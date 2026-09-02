# NO-SOURCE-OF-TRUTH-1 — the four homeless facts, re-counted against the tree

> **READ-ONLY. PROPOSE ONLY.** Nothing was edited, staged or committed by this piece. Run on `master`
> at `ac1d7acc`, 2026-09-02, against the four groups [CENSUS-DUPES-1](CENSUS-DUPES-1.md) marked as
> having no source of truth. **Every count below was re-measured on today's tree** unless the line
> says otherwise.

## The four, and the verdict on each

| | group | the fact | verdict |
|---|---|---|---|
| **B1** | `bodyFillX` / `bodyFillY` had a home but no derivation | the body's share of a sprite frame, 20 types × 2 | **CLOSED since the census** — the derivation runs, and it was run |
| **B2** | `AUDIT_RENDERED_BODY_H` — 20 pins crediting a script that cannot emit them | rendered body height in px, 20 types | **STILL OPEN** — the credited tool now works but still does not produce this number |
| **B3** | `surfaceClasses` in `goldenRunner.mjs` — a fact with no home and no reader | a surface-tag list for 10 racer types | **STILL OPEN, unchanged** — and the table it sits in **was broken on the day this was written** |
| **B4** | the "old `defaultDuration`" column in `docs/ARCHITECTURE.md` | 10 pre-migration per-track durations | **NEVER REALLY A GROUP** — it has a home, and all ten were verified against it |

**One of the four closed, one was mis-classified, two remain — and the two that remain are both in
the parity harness.**

> **The loudest thing found while verifying was not in any of the four groups: `scripts/parity/soak.mjs`
> threw on every run.** That is a regression from [FINGERPRINT-TRACK-DEFAULTS-1](FINGERPRINT-TRACK-DEFAULTS-1.md),
> it was confirmed independently rather than taken from this analysis, and it is **fixed** by
> [SOAK-ROSTER-1](SOAK-ROSTER-1.md). Detail in B3 §Adjacent, left as it was found so the reasoning
> that surfaced it stays legible.

---

## B1 — `bodyFillX` / `bodyFillY` had a home but no derivation

### (a) The fact
For each of 20 racer types, the fraction of its spritesheet frame the visible body occupies, in X and
Y. **These are race inputs, not artwork metadata** — `client/src/modules/headlessRaceSimulator.js:177-180`,
`client/src/screens/RaceScreen/index.jsx:498-499` and `client/src/modules/rowLayout.js:236` all read
them, so moving one changes who wins.

### (b) Where the copies live
There are **no literal copies of the values**. The census's complaint was the opposite kind of hole:
the values had exactly one home (`client/src/modules/racer-types/*RacerType.js`) and **nothing in the
repository could reproduce them**. The one measuring tool, `scripts/audit-sprite-crops.mjs`, carried
a hardcoded frame-geometry table disagreeing with the registry on 8 of 20 rows, so re-running it
reproduced none of them.

### (c) How many copies
**0 literal copies; 1 derivation, and it now exists.** Re-measured: grepping `bodyFill` outside
`racer-types/` and `reports/` returns the audit tool, the B2 pins, and `scripts/lib/racerFacts.mjs`,
which imports rather than restates.

### (d) Do they agree today
**Yes — established by running the tool, not by reading it.**

Under the **plain** rule — the bare opaque bounding box, which is the rule that authored the pins —
**20 of 20 types agree with the registry** to the three decimals the registry stores, and frame
geometry agrees on all 20. Under the **product** rule (`computeSpriteBoundingBox`, which sheds sparse
edge strips, and is what the Racer Editor would return today) **5 of 20 differ**. The row-by-row list
is published in [SPRITE-AUDIT-DERIVATION-1](SPRITE-AUDIT-DERIVATION-1.md) §3 and is not restated
here.

### (e) What a single home looks like
**It already is one.** The registry holds the values; the audit tool reads its two inputs from the
two things that own them — frame width/height from the PNG, `frameCount`/`displaySize`/`spriteUrl`
from the registry via `CONFIG_SNAPSHOT`, so a developer's Dev-Screen tuning cannot move what the
audit reports.

### (f) CHEAP or DESIGN DECISION
**The group as the census framed it is CLOSED and costs nothing further. What it left behind is a
DESIGN DECISION.**

**The decision the owner has to make:** *which of the two bounding-box rules is the canonical
definition of a racer's body* — the plain opaque box that produced the shipped values, or the
product's shedding rule that the Racer Editor would apply to any sheet re-measured tomorrow? Until
that is answered there are two derivations and no rule for choosing, so the next person to re-measure
a sprite silently picks one. **Answering it costs an eye on five sprites; acting on it would move
manta's `bodyFillY` by a large margin, which moves the start rows, the contact braking and the world
fingerprint.** It is a ship-ceremony decision, not a cleanup.

---

## B2 — `AUDIT_RENDERED_BODY_H`, 20 pins whose stated source still cannot emit them

### (a) The fact
The rendered on-screen body height in pixels for each of 20 racer types: `displaySize × bodyFillY`.

### (b) Where the copies live

| site | what it holds |
|---|---|
| `client/src/modules/racer-types/racer-types.integration.test.js:203-223` | the 20 pinned numbers |
| `:202` | the provenance comment crediting `scripts/audit-sprite-crops.mjs`, "measured post-crop" |
| `client/src/modules/racer-types/*RacerType.js` | the two factors the product is made of |

**Re-measured line range: 203-223.** The census recorded 203-222; the table is two lines longer than
recorded, and the file has not been touched since `7ea80484` (2026-06-04).

### (c) How many copies
**One site, 20 values.** No other file holds a rendered-body-height table.

### (d) Do they agree today
**Yes — all 20, and all 20 were checked.** The census checked three by hand and inferred the rest;
here `displaySize` and `bodyFillY` were extracted from all 20 registry files and the product computed
against each pin. Every one falls inside the test's own tolerance. Four are exact to the digit; the
largest residual is rocket, and buggy sits within a rounding hair of the tolerance edge.

**So the test is a restatement of the registry wearing an assertion's clothes.** That is not useless
— it turns red if either factor moves, which is a real tripwire on a race input. **But its declared
provenance is still false, and only half-repaired**: the audit tool can now reproduce `bodyFillY`
exactly, but it prints fill ratios, frame and body pixel extents and fill percentages, and **never
prints `displaySize × bodyFillY`**. A reader told to update this table by running the credited script
still has nowhere correct to look.

### (e) What a single home looks like
Two shapes, both compatible with the standing rules — no schema, no migration, no config key:

1. **Make the credit true.** Add a `renderedBodyH` column to `scripts/audit-sprite-crops.mjs`'s
   output. It already holds both factors; the product is one multiplication.
2. **Rename the test for what it is.** The fact has one home — the registry — and this is a tripwire
   on it, not an independent measurement. Replacing "measured post-crop" with a line saying these are
   `displaySize × bodyFillY` frozen at 2026-06-04, and that a change here means a race input moved,
   removes the false provenance without deleting the signal.

**Doing both is the honest answer.**

### (f) CHEAP or DESIGN DECISION
**CHEAP.** Nothing needs deciding — the fact is a product of two values that already have one home,
and the only defect is a comment claiming an origin the tool does not produce. One output column and
one rewritten comment close it.

---

## B3 — `surfaceClasses` in `goldenRunner.mjs`: no home, no reader, and the table around it was broken

### (a) The fact
A surface-tag list for each of the 10 racer types the parity soak used. It is **not** the registry's
field of the same name: the registry's means "which surfaces this type may race on", and this one is
described in `goldenRunner.mjs` as a one-tag-per-track pairing.

### (b) Where the copies live
Inside `RACER_CONFIGS` in `scripts/parity/goldenRunner.mjs`. **This is the only site.**
[REGISTRY-LITERALS-1](REGISTRY-LITERALS-1.md) (2026-09-02) replaced the four physical fields with
`racerFacts(id)`, and **`surfaceClasses` is the one literal deliberately left behind.**

### (c) How many copies
**1 site, 10 entries, 18 tag values.** Re-counted.

### (d) Do they agree today
There is nothing for them to agree *with*, which is the finding. Against the two candidate homes:

| candidate home | result |
|---|---|
| the registry's `surfaceClasses` (20 files) | **6 of 10 differ** — horse, rocket, snail, motorbike, duck, boarder. Four match: luge, manta, dolphin, snowmobile |
| the track seeds' `surfaceClasses`, via each type's default track | **also does not match** — boarder's tag is not among mountainstreet's surfaces, and rocket's is not among space-sprint's |

The 6-of-10 figure reproduces the census exactly. **Two of the tags — `space` and `garden` — are not
surface-class identifiers anywhere in the repository**: the seeds between them use asphalt, sand,
earth, mud, grass, snow, ice, air and water. They are track *themes* spelled as surfaces.

**No reader.** Re-verified: every `cfg` read in `goldenRunner.mjs` takes `speedMultiplier` and
nothing else.

### Adjacent, and worse — the same table's MEMBERSHIP was a homeless fact, and it was wrong

`RACER_CONFIGS` held ten hand-picked types. `soak.mjs` iterates `trackDefaultPairs()`, which since
`fa553f50` **reads the shipped seeds** — so garden-path returned `beetle`, and the next line threw.

**Measured, not reasoned:** `buildMatrix()` threw `unknown racer type beetle`. The soak could not
run. It is in no `verify` guard and no CI workflow, which is why nothing went red. **The seed-reading
repair fixed the axis and left the roster behind, and the roster is the same class of homeless fact
as the `surfaceClasses` beside it.**

**This has since been fixed** — see [SOAK-ROSTER-1](SOAK-ROSTER-1.md), which confirmed the throw
independently, established the soak was green before `fa553f50` by running the old files side by
side, and derived `RACER_CONFIGS` over the registry's roster.

### (e) What a single home looks like
**Delete `surfaceClasses` from `RACER_CONFIGS`.** A dead field with no home, no reader and two
invented tag values has no correct home to be given — the honest single home is none. This has now
been proposed twice before ([GOLDEN-TABLE-REGISTRY-1](GOLDEN-TABLE-REGISTRY-1.md) P3 and
[REGISTRY-IMPORT-FEASIBILITY-1](REGISTRY-IMPORT-FEASIBILITY-1.md) P2) and not acted on; SOAK-ROSTER-1
deliberately left it alone again rather than deciding it in passing.

### (f) CHEAP or DESIGN DECISION
**CHEAP.** Deleting a field nothing reads changes no behaviour and can be proven so. The membership
half was **not merely cheap but overdue**, and is now done.

---

## B4 — the "old `defaultDuration`" column: not homeless, and every value was verified

### (a) The fact
The pre-migration per-track default race duration in seconds, for the ten shipped tracks. Superseded
by `defaultLaps` (closed) and `defaultDurationSec` (open).

### (b) Where the copies live
One site, in `docs/ARCHITECTURE.md`'s track table.

### (c) How many copies
**1 site, 10 values.**

### (d) Do they agree today — **the census got this wrong, and it can be dated**

The census called the column "unverifiable and therefore undatable — there is nothing to compare it
against." **There is, and it was compared.**

`defaultDuration` was a real key in `server/seeds/tracks/*.json`. It entered in `83937c3e`
(2026-06-17) and was removed in `9e41c2bd` (2026-07-24, *"speed/duration ship: ONE canonical
model"*). Between those two commits **its value never changed on any of the ten tracks** — the seed
history shows exactly one addition and one deletion per track, with the same number on both sides.

**All ten values in `docs/ARCHITECTURE.md` reproduce the seed history exactly. 10 of 10 agree.** The
values are not restated here; the document is their stated home.

Two further things the census did not note:

- **`defaultDuration` is not dead.** `client/src/modules/durationModel.js` still reads it as a legacy
  field, `legacyLapsFromDefaultDuration` still maps it, and `TrackManager.jsx` still falls back to
  it. A user-imported track can carry it today. It is a retired *seed* key, not a retired concept.
- **The same table's `default type (M)` column carries a second fact**, the type-intrinsic speed
  multiplier. All ten were checked against the registry: **10 of 10 agree.** That column belongs to
  census group A1's class and was not counted there.

### (e) What a single home looks like
**It has one: the git history of `server/seeds/tracks/*.json`, bracketed by `83937c3e` and
`9e41c2bd`.** A frozen historical value whose source commits are nameable is not a homeless fact —
it is an archived one. The only defect is that the document does not say where the column came from.
One sentence under the table naming the commit pair converts an orphan into a citation.

**No guard should be built for it, and none can usefully be.** Neither side can move: the seeds no
longer carry the key. A guard would be enforcing an equality that nothing can break.

### (f) CHEAP or DESIGN DECISION
**CHEAP, and smaller than the census implied** — the column already has a home in git; one provenance
sentence closes it, and no guard is needed because neither side can change.

---

## What this means for the census's headline

CENSUS-DUPES-1's line **"Groups WITH NONE: 4"** should read **1 fully open (B3's `surfaceClasses`),
1 half-repaired (B2), 1 closed (B1), 1 mis-classified (B4)** on today's tree. The repairs that closed
B1 and reshaped B2 landed after the census was written, on the same day, and the census could not
have seen them.

**The pattern across all four is one thing: a comment asserting a provenance that nothing enforces.**
B1's tool named inputs it did not read. B2's pin names a script that does not emit it. B3's field
names a meaning nothing consumes. B4's column names nothing at all. **Three of the four are closed or
closeable by making a claim true or deleting it; only B1's residual needs the owner.**

---

## Limits

**What was NOT established.**

- **No test suite was run for this piece.** The B2 arithmetic is computed from the registry source,
  not a watched green run of `racer-types.integration.test.js`. No `verify`, client suite, browser
  gate or fingerprint was run by this analysis.
- **No sprite was eye-checked.** B1's five product-rule disagreements are two algorithms disagreeing
  on five sheets, not evidence that either is visibly wrong.
- **Whether the soak was ever green in its lifetime is not established here.** That it was green
  immediately before `fa553f50` is established in SOAK-ROSTER-1, by running it.
- **The other twelve census groups were not audited.** A1–A12 were read for context only and their
  counts are not re-verified.
- **Whether `scripts/crop-sprite-sheets.mjs`'s flagged-type list still matches** what the repaired
  audit tool flags was not checked. SPRITE-AUDIT-DERIVATION-1 names this as its own open limit and it
  stays open.
- **The B4 history search covers `server/seeds/tracks/` only.** Track records also lived under
  `server/data/` before it was untracked; earlier still there were code seeds. The value is
  established as unchanged for the seed-file era, not for all time.

**Numbers taken from the census rather than re-counted here:** its headline totals, and every dating
of a divergence *event* except B4's, which was re-derived. Everything in the four sections above —
copy counts, line ranges, agreement counts, the 6-of-10 `surfaceClasses` split, the 20-of-20 pin
check, the 20-of-20 plain-rule audit result, the 10-of-10 `defaultDuration` and `speedMultiplier`
checks, and the soak throw — **was measured on `master` at `ac1d7acc`.**

**"Agrees" means agrees at `ac1d7acc`.** It says nothing about tomorrow, and for B2 and the remaining
half of B3 that is the whole point: nothing in the repository would notice if either stopped
agreeing, because neither has anything to agree with.

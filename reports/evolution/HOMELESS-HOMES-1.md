# HOMELESS-HOMES-1 — do B2, drop B3: the credited script is one expression short, and the same test's stated tolerance is 33× looser than the one it actually asserts

> **READ-ONLY. PROPOSE ONLY.** Nothing was edited, staged, committed or branched by this piece. The
> only file written is this one. Run against `master` at **`8cd76a93`**, 2026-09-02.

## The four, sorted as asked

| | group | verdict in NO-SOURCE-OF-TRUTH-1 | this piece |
|---|---|---|---|
| B1 | `bodyFillX`/`bodyFillY` | **CLOSED** | closed; residual being decided right now by a concurrent session — see §0 |
| **B2** | `AUDIT_RENDERED_BODY_H` | **HALF-REPAIRED** | ← proposal in §1 |
| **B3** | `surfaceClasses` in `goldenRunner.mjs` | **OPEN** | ← proposal in §2 |
| B4 | old `defaultDuration` column | **NEVER A GROUP** | agreed, not re-examined |

---

> **LANDED NOTE, added when this report was committed.** §0's concurrent session was
> [BODY-IS-THE-BOX-1](BODY-IS-THE-BOX-1.md), which merged to master before this report landed. Its
> three files are committed and the tree is clean again. That block closed B1's residual by making
> the Racer Editor return the owning rule and by writing the rule into `docs/RACER_DATA_MODEL.md`;
> it also found a SECOND difference between the two box rules — the alpha threshold — which §0 could
> not have seen. **The merge-order dependency §0 flags is therefore resolved in the direction it
> asked for**: BODY-IS-THE-BOX-1 first, this proposal after. Nothing else in this report is affected;
> its B2 target file `scripts/audit-sprite-crops.mjs` was edited by that block, so re-read it before
> acting on §1.

## §0 — THE TREE WAS NOT CLEAN, AND IT MOVED MID-ANALYSIS

`git status` was clean at the start of this session and is not now. Three files carry uncommitted
changes **written by another session, not by this piece**:

```
 M client/src/modules/racer-types/backgroundRemoval.js   (+62)
 M client/src/screens/RacerEditor/canvasUtils.js         (+20/-8)
 M scripts/audit-sprite-crops.mjs                        (+66/-33)
```

That work is **B1's residual being closed**: it adds `computeOpaqueBoundingBox` and records an owner
decision dated 2026-09-02 that a racer's body is the *plain* opaque box, tails and fins included —
the exact question NO-SOURCE-OF-TRUTH-1 §B1(f) said only the owner could answer.

Two consequences for this report, both load-bearing:

- **It moved under me.** My run of `scripts/audit-sprite-crops.mjs` printed the verdict string
  `EDITOR WOULD DIFFER`; the working tree now reads `shedding would differ`. The file was rewritten
  between the run and the grep.
- **It touches my B2 target file.** So §1 carries a merge-order dependency, stated there.

**All three are outside the engine hull** — `node scripts/engine-reach.mjs --check` on all three
returns `3 outside the hull (cannot reach the engine at all)`, exit 1. They cannot move a fingerprint.

Everything measured below was read from files that are **not** among those three, except where §1
explicitly discusses the audit tool's current state.

**A correction to the brief's exit-code gloss.** `--check` exit 1 is *not* "does not reach the
engine". It merges two different answers: `client/src/modules/racer-types/index.js` returns exit 1
with the message `is in the hull but INERT — byte-identical`. Exit 1 means *no reaching change is
present in the working tree right now*, which on a clean tree is true of every file in the hull.
Hull membership must be read from the bare `node scripts/engine-reach.mjs` listing, not from
`--check` on an unmodified file. This distinction decides §2's cost and I nearly got it backwards.

---

## §1 — B2: `AUDIT_RENDERED_BODY_H`

### 1.1 What a single home would be

**No new home, and that is the answer.** `renderedBodyH` is not a fact; it is the *product* of two
facts that already have exactly one home each — `displaySize` and `bodyFillY` in
`client/src/modules/racer-types/*RacerType.js`. Under the ONE CANONICAL HOME rule a derived value
does not get a home of its own, it gets a **derivation**. Minting `renderedBodyH.json` or a
`renderedBodyH` export would be the R14 error of creating a second definition of something already
defined.

So the shape is two edits, neither of which is a new home:

**(a) Make the credit true** — `scripts/audit-sprite-crops.mjs`. The tool already holds both
factors in the same scope as the print statement. Header at **`:211`**, row at **`:255`** (line
numbers as of the concurrent working tree; `:205`/`:244` at HEAD). One added column:

- header: add `${"RendBodyH".padEnd(10)}` between `DispSz` and `plain X/Y`
- row: add `${(type.displaySize * plainY).toFixed(1).padEnd(10)}`

`type.displaySize` and `plainY` are both already local at `:255`. This is one expression, not a
refactor.

**(b) Stop the test claiming a provenance and a tolerance it does not have** —
`client/src/modules/racer-types/racer-types.integration.test.js`, title `:201`, comment `:202`,
table `:203-223`, assertion `:228`.

**Keep the 20 pins.** They are not a second definition — they are a frozen 2026-06-04 witness, the
same shape as `goldenEquality.test.js`'s `WINNERS` map, which this repo endorses. Computing the
expectation instead would make the test `computed === computed` and delete the tripwire. Only the
comment and the title are wrong.

### 1.2 A THIRD defect in the same test, not in the census or in NO-SOURCE-OF-TRUTH-1

The test is titled `…matches sprite crop audit within ±5%` (`:201`) and asserts
`toBeCloseTo(expected, 1)` (`:228`), which is `|diff| < 0.05` **absolute**. On buggy, ±5% would be
±1.665. **The assertion is ~33× tighter than the title claims.**

And it is at the edge. Measured on all 20 (registry × pin):

| | computed | pin | residual | slack to 0.05 |
|---|---|---|---|---|
| buggy | 33.2500 | 33.3 | **0.049999999999997158** | **2.84e-15** |
| rocket | 37.6470 | 37.6 | 0.0470 | 5.6e-3 |
| snowmobile | 41.4440 | 41.4 | 0.0440 | 6.4e-3 |

All 20 pass — `npx vitest run` on the file: **21 tests passed**, watched, not inferred. But buggy
clears the bar by 2.8e-15, i.e. by float noise. The pins are stored to 1 decimal while the product
carries 3–4, so the tolerance is a *rounding* tolerance; the title describes a different, far looser
test that was never written.

**This matters more than the false script credit.** When this test eventually goes red, the reader
is misdirected twice: told to run a script that does not print the number, and told the tolerance is
±5% when a 0.001 move in `bodyFillY` will fire it.

### 1.3 What would read from it — every current holder of a copy

| site | holds | change |
|---|---|---|
| `client/src/modules/racer-types/*RacerType.js` (20 files) | `displaySize`, `bodyFillY` — **the one home** | **unchanged** |
| `racer-types.integration.test.js:203-223` | the 20 pins | **kept**; they are the frozen witness |
| `racer-types.integration.test.js:202` | the false provenance comment | rewritten: these are `displaySize × bodyFillY` frozen 2026-06-04; a change here means a race input moved |
| `racer-types.integration.test.js:201` | the false `±5%` title | corrected to the tolerance actually asserted, or `:228` widened deliberately — **an owner-visible choice, see 1.6** |
| `scripts/audit-sprite-crops.mjs:211,:255` | both factors, product never printed | one column added |

**No other file in the repository holds a rendered-body-height table.** Re-verified:
`grep -rn "AUDIT_RENDERED_BODY_H\|renderedBodyH"` returns only the test, and four `.md` files that
*discuss* the group (`docs/MORNING.md:147`, `reports/evolution/{CENSUS-DUPES-1,INDEX,NO-SOURCE-OF-TRUTH-1}.md`).

### 1.4 Cost

- **Files touched: 2 code + 1 report + 1 INDEX line.** Plus `docs/MORNING.md:147`, whose row says
  "half-repaired … the credited script still never prints the number" and would become false.
- **Engine reach: NONE.** Neither file is in the 76-file hull (`node scripts/engine-reach.mjs`
  lists neither; the hull's only `scripts/` members are `lib/racerFacts.mjs`, `sim-fairness.mjs` and
  `sim/observers/*`).
- **Fingerprint: does not move.** No hull file changes, so the mint tripwire does not fire and no
  minting permission is needed.
- **New guard rule: none.** Under R13 the first question is which existing guard covers this ground
  — and the answer is that the *test itself* is the guard. Adding a `check-*.mjs` here would be the
  30th check for a fact one vitest assertion already watches.
- **Runnability confirmed, not assumed:** `sharp` is present in root `node_modules` (absent in
  `client/`), and I ran the tool end-to-end — 20 rows, 20/20 plain agree, 5 shedding disagreements
  (dragon, plane, beetle, koi, manta).
- **Merge order:** must land after, or rebase onto, the concurrent B1-residual work in §0. That work
  rewrites the very print row `:255` the new column goes in. I confirmed the column is **still
  absent** from the working-tree version, so it is not being done by that session.

### 1.5 Can it be done WITHOUT changing what the product reads at race time?

**YES, unambiguously.** Both files are outside the hull. `racer-types.integration.test.js` is a
test; `audit-sprite-crops.mjs` is a standalone Node instrument that imports `sharp` and is imported
by nothing. Neither is reachable from `raceCore.js` or from `sim-fairness.mjs`. The registry files
that own the two factors are **not touched at all**. Zero product change, and it is provable by the
hull listing rather than by argument.

### 1.6 The one thing that is not mine to decide

Whether `:228` should keep the tight `toBeCloseTo(…, 1)` and have its title corrected, or be widened
to the ±5% the title promises. **Recommend keeping it tight and fixing the title** — a tight
tripwire on a race input is the correct loud signal, and this repo has said so before
(`racerFacts.mjs:15-16`: *a golden going red when a racer changes is the correct loud signal*).
Widening it to ±5% would let a 5% `bodyFillY` change pass unnoticed, which is a large move in a
value that reaches the race. But buggy's 2.8e-15 margin means the tight form will fire on a
rounding change, so whoever does this should either re-pin buggy to `33.25` or say in the comment
that the pins are 1-decimal roundings and the tolerance exists only to absorb that.

---

## §2 — B3: `surfaceClasses` in `goldenRunner.mjs`

### 2.1 What a single home would be — there is none, and that is the finding

The field sits at `scripts/parity/goldenRunner.mjs:184-195` (`SURFACE_TAGS`), spread into
`RACER_CONFIGS` at `:197-203`. Three candidate homes, all re-measured today:

| candidate | result |
|---|---|
| the registry's `surfaceClasses` | **6 of 10 differ** — horse, rocket, snail, motorbike, duck, boarder. Agree: luge, manta, dolphin, snowmobile |
| the track seeds' `surfaceClasses` | does not match either — `space`/`garden` appear in no seed |
| a new dedicated `SURFACE_TAGS` home | inventing a home for a fact **nothing reads** |

Two of the seven distinct tag values — **`space` and `garden`** — are not surface classes anywhere
in the tree. They are track *themes* spelled as surfaces. Confirmed by set-differencing the tags
against the union of all 20 registry `surfaceClasses`.

**The honest single home is none. The proposal is DELETE `SURFACE_TAGS` and the ternary at
`:200-202`,** leaving `RACER_CONFIGS = Object.fromEntries(RACER_TYPE_IDS.map(id => [id, racerFacts(id)]))`.

### 2.2 What would read from it

**Nothing.** Re-measured rather than taken from the report — every property read of `cfg` in
`goldenRunner.mjs`:

```
:267 :289 :304 :487 :524 :539 :550 :565 :583 :604 :636 :680 :740 :762   cfg.speedMultiplier
:442 :488 :658 :667                                                     cfg.displaySize
:489 :661 :662                                                          cfg.bodyFillX
:490 :661 :662                                                          cfg.bodyFillY
```

**Zero reads of `cfg.surfaceClasses`.** The only other consumer, `scripts/parity/soak.mjs:68`, uses
`RACER_CONFIGS[racerType]` as a membership test and never indexes the field. Deletion is a provable
no-op, and it is provable by grep rather than by running anything.

### 2.3 Cost

- **Files touched: 1 code + 1 report + 1 INDEX line** — exactly SOAK-ROSTER-1's shape
  (`0e938bb0`: `goldenRunner.mjs` +55/-12, plus report and INDEX).
- **Engine reach: NONE.** `goldenRunner.mjs` is not in the 76-file hull.
- **Fingerprint: does not move.**
- **New guard rule: none**, and none is possible — after deletion there is nothing to guard.
- **Verification cost is near zero**, because the soak is in **no `verify` guard and no CI workflow**
  (confirmed: `scripts/verify.mjs` mentions `reports/parity` only for an INDEX check;
  `.github/workflows/ci.yml:277-281` likewise).

### 2.4 Can it be done WITHOUT changing what the product reads at race time?

**YES for the deletion.** But the *other* framing — "give the fact a home" — is where the real
finding is:

> **Routing `surfaceClasses` through `scripts/lib/racerFacts.mjs` as a fifth field would be a HULL
> change.** `racerFacts.mjs` **is** one of the 76 files, because `sim-fairness.mjs` imports it and
> `sim-fairness.mjs` is a fingerprint entry point (`engine-reach.mjs` FP-HULL-1 block). Editing it
> makes `--check` return exit 0 and fires the mint tripwire.

It would nevertheless be *technically* feasible: `surfaceClasses` **is** in `TUNABLE_FIELDS`
(`racer-types/index.js:236`) and therefore **is** carried in the frozen `CONFIG_SNAPSHOT` — measured
`true` — so it could be served override-immune by the existing `racerFact()` rule with no new
mechanism. That makes it tempting, and it is the trap: it would pay full ship-ceremony attention on a
hull file to give a home to a field **nothing reads**, whose meaning does not match the home it would
be given, and which would then have to be re-measured to prove byte-identical. **The cheap repair is
deletion; the "proper" single-home repair is the expensive one and is also wrong on the merits.**

---

## §3 — RECOMMENDATION: do B2. Do not do B3 on its own.

**B2, and the reason is 1.2 rather than the group as it was filed.**

The filed defect — a comment crediting a script that cannot print the number — is real but inert; it
misleads only someone who goes looking. The defect found while costing it is not inert: this test is
a **live tripwire over a race input** (`bodyFillY` reaches `headlessRaceSimulator.js`,
`RaceScreen/index.jsx` and `rowLayout.js`), it sits **2.8e-15 from red on buggy**, and its title
misstates its own tolerance by 33×. When it fires — and a rounding change fires it — the person
holding it is sent to a script with no such column and told to expect a ±5% band that does not
exist. That is a defect with a mechanism and a victim, not a tidiness complaint. The fix is one
expression and one comment, touches nothing in the hull, moves no fingerprint, and needs no guard.

**B3 is not worth a block, and the reason is that it has already been half-solved by annotation.**
`goldenRunner.mjs:163-169` now carries a seven-line comment stating precisely that the field is
unread, that its meaning differs from the registry's, that two tags are not surface classes
anywhere, and that deletion is proposed and deliberately not taken. **A reader cannot be misled by
it.** The deletion would remove 10 entries and 13 tag values that nothing reads, from a tool in no
CI path — blast radius zero, in a file whose danger is already documented in place. It has been
proposed three times (GOLDEN-TABLE-REGISTRY-1 P3, REGISTRY-IMPORT-FEASIBILITY-1 P2,
NO-SOURCE-OF-TRUTH-1 §B3) and declined three times; SOAK-ROSTER-1 declined it *deliberately* rather
than deciding it in passing. That is three independent judgements that it is not worth its own unit
of work, and I agree with them.

**The REGISTRY-LITERALS-1 lesson points the same way.** That repair was right — it removed 124
literals that had already drifted for 39 days — and it still cost the closure doubling from ~19 to
76 files, so that every racer-type edit now pays fingerprint attention. The lesson is not "never
centralise"; it is **centralise facts that are READ, and delete facts that are not.** B2 centralises
nothing and reads nothing new. B3's cheap form deletes; B3's expensive form would pay closure cost
for a field with no reader, which is precisely the trade REGISTRY-LITERALS-1's cost warns against.

**Practical disposition:** do B2 as its own small block, ordered after the concurrent B1-residual
work in §0. Fold B3's deletion in **free** if and only if someone is already inside
`goldenRunner.mjs` for another reason — it is a three-line diff and needs no ceremony. Do not open a
block for it.

---

## §4 — Corrections to NO-SOURCE-OF-TRUTH-1

Offered as corrections, not complaints; the report's verdicts all survive them.

1. **§B3(d) "18 tag values" is wrong — it is 13.** Counted: horse 1, rocket 1, snail 1, motorbike 1,
   duck 1, luge 2, boarder 1, manta 1, dolphin 1, snowmobile 3 = **13 total, 7 distinct**. The
   report marks this figure "Re-counted". Everything else in that paragraph reproduces exactly:
   10 entries, 6 of 10 differ, the same six names, `space` and `garden` invented.
2. **§B3(d) "every `cfg` read in `goldenRunner.mjs` takes `speedMultiplier` and nothing else" is
   false.** It also reads `displaySize` (`:442 :488 :658 :667`) and `bodyFillX`/`bodyFillY`
   (`:489 :490 :661 :662`) — the other three fields `racerFacts()` supplies. **The conclusion
   survives**: `surfaceClasses` is read nowhere.
3. **§B3(b) "This is the only site" is true only for goldenRunner's *meaning* of the field.** Two
   other script-side racer-`surfaceClasses` tables exist and were not counted in this group:
   - `scripts/sim-fairness.mjs:972-991` — 20 entries, **live** (read at `:4283-4298` to filter
     racers by track surface). Measured today: **0 of 20 differ** from the registry. This is census
     group A3 (a duplicated fact *with* a source of truth and no guard), correctly not B3.
   - `scripts/exp-roster-matrix.mjs:44-64` — 20 entries, read at `:154`. Measured today: **0 of 20
     differ**. **This one appears in neither B3 nor, as far as I can tell, group A3.** It is the same
     class as A3: a live copy that agrees today with nothing to notice if it stopped.
4. **§B2(d) understates the defect.** It notes buggy "sits within a rounding hair of the tolerance
   edge" but not that the stated tolerance and the asserted one differ by 33×. See §1.2.

---

## §5 — Limits

- **No test suite was run beyond one file.** `npx vitest run
  src/modules/racer-types/racer-types.integration.test.js` — 21/21 green, watched. No `verify`, no
  client suite, no browser gate, no fingerprint was run. Under R15 none could have changed: this
  piece committed nothing.
- **The tree was dirty and moving** (§0). The audit tool's line numbers `:211`/`:255` are from the
  concurrent working tree; at HEAD `8cd76a93` they are `:205`/`:244`. Whoever implements §1 must
  re-locate them. All other line numbers cited are from unmodified files.
- **`toBeCloseTo`'s exact boundary semantics were not read from vitest source.** The 2.8e-15 slack
  is computed arithmetic (`0.05 - |38×0.875 − 33.3|`); that buggy *passes* is from the watched green
  run, not from reasoning about `<` vs `<=`.
- **I did not verify B1 or B4.** B1's classification is taken from NO-SOURCE-OF-TRUTH-1 plus the
  concurrent diff in §0; B4's is taken on trust.
- **The concurrent work in §0 was read, not reviewed.** I make no claim that it is correct — only
  that it exists, is outside the hull, and collides with §1's target file.
- **`sharp` presence was checked by directory existence**, and the tool then ran successfully, which
  is the stronger evidence.

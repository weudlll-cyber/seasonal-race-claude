# INVISIBLE-FOUR-1 — the four items the owner does not see in the race

**2026-09-05.** Branch `fix/invisible-four-1` off master `eccf0ef7`.
**All four pieces ran. THREE MERGE; PIECE 1 DOES NOT** — it moves the render fingerprint, and the
mint is the owner's. **NOTHING WAS MINTED.**

Precondition checked before the branch existed: `git ls-remote --heads origin` returned exactly one
line, `refs/heads/master`.

---

## THE FOUR

| # | piece | outcome |
| --- | --- | --- |
| 1 | The render fingerprint's blind spot | **BUILT, STOPPED AT THE FORK.** The hash moved. One field causes it. Commits left on the branch, awaiting the owner. |
| 2 | `verify` gains lint and format-check | **LANDED.** Both sabotages caught. Tree passes both today. |
| 3 | `--premerge` closes the routing gap | **LANDED.** Set derived from `ci.yml`; sabotage caught by `--premerge` and missed by an ordinary run, as designed. |
| 4 | The `routing.mjs` property gets a check | **NOT SHIPPED, AND THAT IS THE FINDING.** The property is already guaranteed by construction; the check I built was inert and was deleted. |

---

## PIECE 1 — THE RENDER FINGERPRINT'S BLIND SPOT

### Re-established at source, not carried over

**DECLARED** — `client/src/screens/RaceScreen/frameCameraInputs.js`, `FRAME_CAMERA_FIELDS`: `state`,
`anchorRacerIndex`, `comebackLockedRacerIndex`, `hudState`, `runInArrived` — **five fields** — plus
the method `detectBattleGroup` attached by `frameCameraInputs()`. **Six members.**

**SUPPLIED** — `scripts/render-fingerprint.mjs:446-450`, a hand-written literal: `hudState`,
`comebackLockedRacerIndex`, `detectBattleGroup`. **Three.**

**ABSENT — three:** `state`, `anchorRacerIndex`, `runInArrived`.

**Does live drawing code read them?** Search form varied four ways, uncapped, over `client/src` and
`scripts`: (1) dotted and optional-chained access `camera?.X`; (2) destructuring out of `camera`;
(3) bracket access `camera["X"]`; (4) a direct scan of the draw path. Forms 2 and 3 return nothing
anywhere.

| absent field | read by live drawing code? |
| --- | --- |
| `anchorRacerIndex` | **YES** — `renderRaceFrame.js:212`, `let focusRacerIndex = camera?.anchorRacerIndex ?? null` |
| `runInArrived` | **YES** — `renderRaceFrame.js:220`, `const namesFromArrival = !!camera?.runInArrived` |
| `state` | **NO.** Every occurrence is a comment or a non-drawing consumer: `renderRaceFrame.js:284` inside the block recording that LABEL-OVERLAP-FIX-1 *removed* that read; `frameCameraInputs.js:11` and `:15` recording the historical defect; three test files; and `scripts/label-occlusion-truth.mjs:184,190`, a diagnostic. |

*(This reproduces OPEN-LIST-TRUTH-1's counts exactly. It was re-derived rather than quoted.)*

### The build

`camera: frameCameraInputs(cd)` — the list is **imported, not retyped**, so a field added to
`FRAME_CAMERA_FIELDS` reaches the instrument with no edit. The dynamic import is **declared** in the
guard's `reach`, because a dynamic import is invisible to the static closure walk and
`frameCameraInputs.js` was verified NOT to be in the guard's resolved set beforehand
(`g.matches(...)` returned `false`).

### ★ THE FORK: THE FINGERPRINT MOVED

```
recorded : 733b3f100d6a819f
measured : 74946ddbeca517a9
```

**Bisected one field at a time, with a control, so the answer names a cause and not a list:**

| what was supplied | render fingerprint | |
| --- | --- | --- |
| control — master's three members | `733b3f100d6a819f` | reproduces the record exactly |
| + `state` | `733b3f100d6a819f` | **UNMOVED** |
| + `anchorRacerIndex` | `733b3f100d6a819f` | **UNMOVED** |
| + `runInArrived` | `74946ddbeca517a9` | ★ **MOVED — the whole cause** |
| all three (the fix) | `74946ddbeca517a9` | identical to `runInArrived` alone |

**Method:** a temporary env-driven probe in the instrument selecting the base three plus exactly one
absent field; four runs, ~83 s each; the probe removed afterwards and the file restored from a saved
copy. The control run is what makes the other three readable — without it a matching hash could mean
"no effect" or "harness broken".

**Why `runInArrived` and nothing else:** it decides whether a label draws a **name** or a **number**
(`renderRaceFrame.js:220`), so it changes `fillText` arguments and therefore the call stream that IS
the hash. `state` moving nothing agrees with the search above — no live drawing code reads it.
`anchorRacerIndex` moving nothing is the one result worth flagging: it IS read live, at `:212`, so
at the sampled frames the fallback evidently resolves to the same racer the anchor names. **That is
observed, not explained**, and this report does not explain it.

**NO MINT WAS TAKEN.** The record still carries the pre-repair value.

### Sabotage

Restoring the hand-written literal turns the rewritten guard red:
`✖ the instrument builds its frame camera through the ONE HOME, not a literal` — 6 pass, 1 fail. The
old test, which pinned the gap by parsing the literal, was rewritten: it now asserts the instrument
goes through the function, that no `camera: {` literal remains, that it imports the one home, that
the one home yields every declared member, and that the dynamic import is declared in `reach`.

---

## PIECE 2 — `verify` GAINS LINT AND FORMAT-CHECK

**Re-verified at source.** `ci.yml`'s Client job runs `npm run lint` (`:115`) and
`npm run format:check` (`:119`). `verify` ran neither; what it runs is `npm run format` — the
**formatter, which writes**, so the tree it measures is the tree the hook commits. A formatter
cannot fail.

★ **ONLY THE CLIENT, and that is a finding rather than a scope decision:** `server/package.json`
declares **no `lint` and no `format` script at all**, and CI's Server job runs neither. "Wherever CI
runs them" is the client alone.

**The ordering trap, and where the check must sit.** `verify` formats before it measures, and
`format` and `format:check` share the same scope (`src`). So after the format pass the check passes
by construction. **It is still placed there, and moving it earlier would be wrong:** a check before
the format pass would make `verify` red for exactly the fault it is about to repair, against §3.
It is not tautological on the path that matters — **`--no-format`** skips the writer, and until now
nothing then asked whether the tree was formatted, so such a run could be green while CI was red on
the same tree. The reasoning is written at the call site.

**The fork did not fire:** the tree passes both today (`lint` exit 0, `format:check` exit 0), so
there are no pre-existing findings to report and `verify` is not left red.

**Sabotage, one fault at a time:** an undefined reference → `npm run lint` exit **1** (`no-undef`);
bad spacing → `npm run format:check` exit **1**. Both caught; both scratch files removed.

---

## PIECE 3 — `--premerge` CLOSES THE ROUTING GAP

**Derived, not retyped.** `scripts/lib/ciUnconditional.mjs` reads the docs job out of `ci.yml`,
collects its `node scripts/*.mjs` steps, and maps each to a guard id **through the guards' own
`source`** — so nothing restates which script is which guard.

**Measured:** **11 scripts + the script suite = 12 forced ids**, **0** unmappable, **0** conditional
steps in that job. It resolved `check-fingerprints.mjs` to the guard id `fingerprint-containment`
without being told — which is the point of deriving. A step it cannot map **REFUSES** the run rather
than covering less than it claims.

**Ordinary runs are unchanged.** Measured on the same diff:

| | guards selected |
| --- | --- |
| ordinary | 6 |
| `--premerge` | 14 — the same 6 plus the 8 CI runs that the diff did not reach |

A forced guard **says so**: `· FORCED by --premerge: .github/workflows/ci.yml runs this on every
push, unconditionally`.

**Sabotage, both directions.** A real dangling doc link committed, with a scripts-only live diff:

- **ordinary run — `PASS 8  FAIL 0`. Blind, exactly as the gap predicts.**
- **`--premerge` run — `FAIL check-doc-links`, `PASS 15  FAIL 1`, "1 dangling".**

★ **A first attempt was inert and is recorded rather than hidden:** the link was placed inside an
HTML comment, `check-doc-links` ignored it, and the link count did not move (717 → 717). That is not
a guard defect — it is a mutation that was not semantic. Redone as a real markdown link (717 → 718,
1 dangling), it behaved as above.

---

## PIECE 4 — THE PROPERTY WAS ALREADY GUARANTEED, SO NOTHING SHIPPED

The check the paragraph describes was **built, run, sabotaged, and deleted.**

**Built:** it extracted every `import(u("…"))` literal from each guard's source and asserted the path
lay inside that guard's resolved set. Run across the tree: **36 literals across 25 guards, 0 outside
their sets, 10 non-literal specifiers named as unresolvable.**

**★ SABOTAGE FAILED TO GO RED, AND THAT IS THE RESULT.** Giving `check-ending-frame` — whose declared
directory is `client/src/screens/RaceScreen/drawing/` — an `import(u("server/src/index.js"))` did
**not** trip it. Established why, at source:

```
matches server/src/index.js NOW: true
is it via dataDirs?             true
dataFrom names:                 ["scripts/check-ending-frame.mjs"]
```

`dataReach`'s own rule, from its header: ***if a guard's own code names a tracked repository path, a
change to that path selects the guard.*** A dynamically imported **string literal is by definition
the guard's code naming a path**. So the literal enters the resolved set the moment it is written —
**the property holds by construction, and no check reading that form can ever fail.**

**So the guard was deleted rather than shipped.** An inert guard looks like coverage forever, which
is the defect this whole chain is about. The only thing it ever caught was **itself**, reading the
`import(u("client/src/..."))` examples in its own header — fixed by stripping comment lines before
scanning, then by rewording its own error message.

**`routing.mjs:41-46` is corrected — for the second time in two days and in the opposite direction
from the first.** It said "unchecked"; GATE-WIRED-AND-CAUSED-1 corrected that to "by inspection, not
by construction"; **that correction was also wrong.** It now records the mechanism, the sabotage that
proves it, the deleted guard, and the residual no static reader can close: **ten dynamic imports
whose specifier is a variable** rather than a literal.

---

## SOURCE HYGIENE

| file | before | after | what moved |
| --- | --- | --- | --- |
| `scripts/lib/routing.mjs` | 425 | 494 | two guard declarations (piece 2); the corrected property paragraph (piece 4) |
| `scripts/verify.mjs` | 781 | 856 | `commandFor` cases for lint and format:check; the derived forcing in `plan()`; usage line |
| `scripts/lib/ciUnconditional.mjs` | 0 | 137 | **new** — the derivation |
| `scripts/render-fingerprint.mjs` | 726 | 748 | **piece 1, NOT merged** — the import, the call site, the declared reach |
| `scripts/render-fingerprint.test.mjs` | 176 | 148 | **piece 1, NOT merged** — the gap test rewritten as a one-home test |

**Removed:** `scripts/check-guard-imports.mjs`, built and deleted within piece 4 — it never reached
a commit.

**Noticed and deliberately left:**

- **`anchorRacerIndex` is read live and yet moves no hash.** Observed, not explained. It is not a
  reason to withhold the field — the instrument should supply what the game supplies — but the
  report does not claim to know why the sampled frames are insensitive to it.
- **The commit hook caught a stray fingerprint copy** in piece 1's test comment (the current
  recorded value, quoted as prose). One truth lives in one place; the value was removed and the
  comment points at `docs/fingerprints.json`. Recorded because the guard doing its job is worth the
  line.
- **`verify` selected only 6 guards on this branch's own diff**, so `client-lint` and
  `client-format-check` were correctly skipped by routing — their first real exercise is a client
  change, or any `--premerge` run.

## FINGERPRINTS

`node scripts/engine-reach.mjs --check` on the paths pieces 2-4 change, **verbatim**:

```
ENGINE REACH: none of 3 path(s) carry a change that can reach the race engine.
  3 outside the hull (cannot reach the engine at all): scripts/lib/ciUnconditional.mjs, scripts/lib/routing.mjs, scripts/verify.mjs
```

It selects nothing. **It answers the WORLD question only** — and piece 1, which is not merged, moves
the RENDER hash, which no advisory speaks to.

## CHECKS

At the merged point (pieces 2-4, `fd70abb2`):

- **`npm run verify`** — `PASS 6  FAIL 0  SKIP 23`, script suite included at 110.2 s.
- **The client suite** — **241 files, 4,476 tests, 0 failures.**
- **`scripts/verify.test.mjs`** — 51 pass, 0 fail, after both new guards were declared.

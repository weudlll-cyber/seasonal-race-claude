# SHIP-CEREMONY.md — the checklist for shipping an engine change

This is the ship ceremony **as it is actually practised**, written down so it stops living only in
people's heads (the drift SHIP-GUARD-1 was created to end). It is derived from the record of the
changes that ran it: [RACER-FLAPPING-2](../reports/evolution/RACER-FLAPPING-2.md),
[RACER-MOTION-2](../reports/evolution/RACER-MOTION-2.md), the definitive gate
[HOLM-300-COMBINED](../reports/evolution/HOLM-300-COMBINED.md), and the
[REBASELINE](../reports/parity/REBASELINE.md) top block — every item below is something those did.

**Scope.** This is the ceremony for a change that moves the shipped BEHAVIOUR (a "fingerprint-moving"
change — a new/changed default in `client/src/modules/storage/defaults.js` or the engine code it
gates). A **docs-only** change (no fingerprint move) runs only the guard step (#11) and the relevant
doc homes — see [DOC-SYNC-2](../reports/evolution/DOC-SYNC-2.md) for that lighter path. If unsure
whether a change moves the fingerprint, mint before and after (#3) and compare — that is the arbiter.

### THE MINT TRIPWIRE — when a "presentation-only" block must mint anyway

Camera and other presentation work still skips this whole ceremony. But it does not skip the mint:

> **Mint once at the end of any block whose diff touches a file the race engine can REACH.** Ask the
> repo, do not remember: `node scripts/engine-reach.mjs --check <your changed paths>` exits 0 if any
> of them can change the race. If it does, run `node scripts/fingerprint-default.mjs`, compare
> against the shipped fingerprint, and say the result in the report. About two minutes.

**The trigger is a computed set, not a folder (VERIFY-COST-1).** It is the transitive closure of
`raceCore.js`'s imports — **19 files** — against the **103** files under `client/src/modules/`
outside `camera/` that the old folder rule fired on. The other 84 cannot reach the engine, so minting
for them proved what the diff already proved; that is where the wasted three minutes went.

**WHAT THE NEW TRIGGER DOES NOT CATCH, stated so nobody over-trusts it:**

- **Anything reaching the engine other than through `raceCore.js`'s import graph** — a value passed
  in as an ARGUMENT by a caller. `drawnBodyWidthRefPx` is exactly that: computed in a screen file and
  handed to the engine. The closure contains the file that *consumes* it (`raceBehavior.js`) but not
  the screen that *computes* it. **If your diff changes a number that is passed into the race, mint —
  the tripwire will not tell you to.**
- **Dynamic imports.** A static walk cannot follow `import()`. There are none in the closure today and
  `scripts/engine-reach.test.mjs` fails if one appears, at which point this rule needs revisiting.
- **The seeds and track JSON**, which are data rather than modules.

`ENGINE_INPUT_MODULES` in `raceConfigWorld.js` remains, and remains guarded — it is the DIRECT-import
list, and it stays useful as the "did a new engine input appear" alarm. It is deliberately **not** the
trigger: it names eleven files, and the eight in the gap between it and the closure include
`autoSpriteScale.js`, which is the precise file this tripwire was created for. Triggering on it would
have stopped catching the incident that produced the rule.

**Why it exists.** The old test was "no simulation file in the diff" — but that is a test of FOLDERS,
and the engine's inputs are not confined to one. `drawnBodyWidthRefPx` is computed in a screen file
and consumed by `raceBehavior.js` as the avoidance body size, so a value that moves the race can enter
a camera diff and pass every check untouched. That is not hypothetical: `autoSpriteScale.js` — which
also exports the auto-scale config the start-grid packing reads — sat in the CAMERA-PICTURE-FIXES-1
diff and nobody noticed until the owner asked why overtaking looked easier
([CAMERA-MINT-TRIPWIRE-1](../reports/evolution/CAMERA-MINT-TRIPWIRE-1.md); the fingerprint had NOT
moved, but nothing in the regime had established that).

No list, no judgement call: a block that stays inside `camera/` pays nothing, and anything that
strays out of it pays two minutes. If the fingerprint moved, the block is not presentation-only and
the full ceremony above applies.

**This rule works when someone remembers it.** Its durable twin — an enumerated list of the modules
whose values reach `createRaceFromIdentity` / `stepRacePhysics`, kept beside `WORLD_CONFIG_KEYS` in
`raceConfigWorld.js` with a test that fails when `raceCore.js` imports something not on it — is
scheduled for the hygiene phase (see [BACKLOG.md](BACKLOG.md)). Keep both: the mint rule catches what
a person remembers, the list catches what nobody does.


### WHEN CI MUST BE GREEN — and when it may report afterwards

**Default: merge on a green local `npm run verify`; CI runs on the push and reports.** The full rule,
with its four safety conditions and what the ordering does NOT catch (a different environment,
time-dependent checks like the security gate, and coverage) is in
[VERIFY-RULES.md](VERIFY-RULES.md) R8-R9. **Two exceptions where CI must be green FIRST:** a change
that touches CI, the guards or the verify path itself (the local run would be marking its own
homework), and the state immediately before an unattended night block.

### THE THREE FINGERPRINTS — which one a block owes

They are CHANGE DETECTORS, not prohibitions. A block may move one deliberately; what it may not do
is move one without noticing.

| | covers | run it when | cost |
|---|---|---|---|
| `scripts/fingerprint-default.mjs` — **world** `dc4647be0f55ebdb` | the RACE: physics, plan, outcome | any behaviour change, and per the mint tripwire above | ~2 min |
| `scripts/camera-fingerprint.mjs` — **camera** `7a33faf2ec131437` | the DIRECTOR's decisions: state, phase, anchor, zoom, offsets, camT, targets | any block touching `client/src/modules/camera/` | ~85 s |
| `scripts/render-fingerprint.mjs` — **render** `b6591e74102152bd` | the DRAW CALL SEQUENCE: sprite placement, text, styles, transforms, layer order | any block touching the drawing path — `RaceScreen/renderRaceFrame.js`, `RaceScreen/drawing/`, `nameTagLayout.js`, `Minimap.js`, the racer types' `drawRacer` | ~77 s |

**Why the render one earns its cost only on drawing blocks.** The camera fingerprint already covers
every decision the director makes, and it is the cheaper answer for camera-only work. The render
fingerprint answers the question the camera one structurally cannot — *did the picture change?* —
and until RENDER-FINGERPRINT-1 that was an argument every camera block ended on. Run it whenever the
diff can reach a `ctx.` call.

**Read [RENDER-FINGERPRINT-1](../reports/evolution/RENDER-FINGERPRINT-1.md) §"blind to" before
trusting it.** It is blind to the rasteriser, to the artwork, and — measured, not assumed — to the
sprite blit itself, because node has no `Image` and the racer body falls back to its procedural
branch. Placement, order, text, styles and every other layer are covered. The owner's eye remains
the instrument for artwork.

## The checklist

Work top to bottom. Steps that are marked **ONE step** are a single unit of work with two artefacts —
never do one artefact and defer the other (that is exactly how the INDEX entry and the tag register
went missing).

- [ ] **0. Pre-flight.** Confirm the change is UI-configurable (a config key, not a hard-coded edit).
  `eslint` clean, `build` green, the full test suite green on the working tree before you measure.
- [ ] **1. Paired measurement — the gate.** Run the **N=100 quartet, paired seeds, against the CURRENT
  shipped world** (`scripts/exp-flapping-gate.mjs --nlist=100`). Paired means the same seed sequence
  for both arms; the baseline is the fingerprint that is shipped RIGHT NOW, **never gold numbers
  copied from another run** (a stale gold number silently compares against the wrong world). Gate is
  green when: band arrival holds within noise on every track, runaway 0%, per-row floor (rowMin)
  holds, and Holm does not gain a newly-unfair track versus the current ship. Do not proceed on a red
  gate.
- [ ] **2. Set the default + re-confirm the mechanical gates.** Flip the default in `defaults.js` to
  the chosen value; re-run `eslint` + the parity/golden tests (they will move — see #6).
- [ ] **3. Mint the fingerprints — ONE measurement per world, on the FINAL committed state.** Mint
  the ON world (`node scripts/fingerprint-default.mjs`) and the OFF world
  (`… off --gapRerollEnabled=false`). Mint on the state you are actually committing — behaviour, not
  formatting, sets the hash, so a lint/prettier pass in the commit hook does not move it, but a stray
  code edit does. An avoidance/engine change usually moves **both** ON and OFF (it runs in both
  worlds); record old → new for each.
- [ ] **4. REBASELINE top block** ([reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md)).
  Add the new **current-baseline** entry (world, fingerprints, gate table, any residual status) and
  **demote the previous** current-baseline block to "previous". This file's top block is the canonical
  current baseline (see ONE CANONICAL HOME below).
- [ ] **5. Fingerprint lineage** ([docs/SIM.md](SIM.md)). Extend the ON/OFF lineage chain with the new
  hashes and the "set `--behavior='{…:0}'` to reproduce the predecessor world" reproduction note.
  SIM.md is the canonical home for the fingerprint lineage.
- [ ] **6. Golden / replay / parity tests.** The engine change moves race outcomes, so re-pin the
  `WINNERS` map in `goldenEquality.test.js` and the finishing order in `replay.test.js` to the new
  results (run them, read the actual values, update). If a behaviour-isolating test (e.g. an
  escape-hatch test) now also trips your new limiter, disable your limiter in that one test so it
  keeps testing its own thing.
- [ ] **7. Return tag + its register entry — ONE step.** Tag the pre-ship state `pre/<name>` AND add
  its entry to [docs/TAGS.md](TAGS.md) (commit, date, the world it restores) in the SAME unit of work.
  The tag and the register are one step, never two — an unregistered tag is invisible until a guard
  or a human trips over it.
- [ ] **8. Report + its INDEX entry — ONE step.** Write `reports/evolution/<NAME>.md` AND add its line
  to [reports/evolution/INDEX.md](../reports/evolution/INDEX.md) in the SAME unit of work. A report
  with no INDEX line is an orphan (`check-index.mjs` now catches it, but write the line yourself).
- [ ] **9. Canonical-doc sweep — required whenever the SHIPPED WORLD CHANGES.** Update the shipped-world
  identifier and any affected definitions in [docs/FAIRNESS.md](FAIRNESS.md),
  [docs/PROJECT-PRINCIPLES.md](PROJECT-PRINCIPLES.md), and [docs/ARCHITECTURE.md](ARCHITECTURE.md).
  Identify the world by its **fingerprint (+ tag)**, never by a bare `master @<hash>` — the master
  hash goes stale the next commit (SHIP-GUARD-1 STEP 6c).
- [ ] **10. Owner's eye on a live trace.** The owner eye-tests the change on a real running session.
  For any **UI or camera** change this includes the **LIVE-TRUTH console proof line from the owner's
  OWN browser** — tests measure the code, the truth line measures the session, and the harness is
  trusted only while live == replay ([LESSONS.md L191](LESSONS.md)). Restart the dev server for the
  eye-test rather than letting a stale bundle be judged.
- [ ] **11. Run the three guards before the commit.** `node scripts/check-doc-links.mjs`,
  `node scripts/check-index.mjs`, `node scripts/check-tags.mjs` — all three green. Plus the full test
  suite + `eslint` + `build`. These are the cheap catches for the drift a human reviewer cannot see.
- [ ] **12. Commit, push, verify.** One clear commit; push; confirm with `git log origin/master
  --oneline -3` that the push landed. **Any verification transcript pasted into the report must come
  from the state ACTUALLY being committed** — re-run the guards after the commit if that is the only
  way to make it honest, and say that you did. A transcript from an intermediate state (guards still
  untracked, a doc not yet written) does not prove the state it is filed under, even when it is green.

## The ONE CANONICAL HOME rule

**Every fact has exactly one authoritative home. Everywhere else carries a POINTER to that home,
never a copy.** This is what kept [DOC-SYNC-2](../reports/evolution/DOC-SYNC-2.md) to single edits
instead of a fan-out of duplicated paragraphs drifting apart — and it is why the same stale
shipped-world line had to be repaired in five files at once the time before. When you record a fact,
put it in its canonical home and link from everywhere else.

Canonical homes currently in force:

| Fact | Canonical home |
|---|---|
| Fairness definition + gate lines + documented residuals | [docs/FAIRNESS.md](FAIRNESS.md) |
| Fingerprint lineage (ON/OFF hashes, reproduction notes) | [docs/SIM.md](SIM.md) |
| Current baseline (shipped world, gate numbers) | [reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md) top block |
| Tags (permanent anchors + register) | [docs/TAGS.md](TAGS.md) |
| Report map (what each evolution report is) | [reports/evolution/INDEX.md](../reports/evolution/INDEX.md) |
| Laws / lessons | [docs/LESSONS.md](LESSONS.md) |
| Closed approaches / dead ends | [docs/DEAD-ENDS.md](DEAD-ENDS.md) |

If a fact needs to appear in a second place, link to its home — do not paste it.

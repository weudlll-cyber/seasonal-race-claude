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
> against the shipped fingerprint, and say the result in the report. Its cost is in the generated
> table below — this sentence deliberately quotes no duration.
>
> **AND IT HAS THREE ANSWERS, NOT TWO (REACH-REFUSES-1, 2026-08-22).** `0` = something reaches;
> `1` = a real negative; **`2` = REFUSED, meaning it examined nothing** — it was given no paths, or a
> `--base=` that does not resolve. **Exit 2 is never a clearance.** Before that change an empty path
> list printed `none of 0 path(s) can reach the race engine` and exited 1, which reads exactly like a
> licence to skip the mint. If you pass the paths from a command substitution, an empty expansion is
> what produces it.

**The trigger is a computed set, not a folder (VERIFY-COST-1).** What can change the race is the
transitive closure of `raceCore.js`'s imports. The old rule fired on a FOLDER instead, and minting
for a file the engine cannot reach proved only what the diff had already proved — at the world
fingerprint's full cost, which is where the waste went. **That cost is in the generated table below;
this sentence deliberately quotes no duration**, because a duration typed into prose is exactly the
drift the table exists to end.

**The counts below are GENERATED, because typing them did not work.** They read 19 / 103 / 84 until
2026-08-10: `CONFIG-DIFF-2` added a file to the closure and nothing here noticed, the same defect
that turned master red on the generated block in [SIM.md](SIM.md). What kept them typed for one
block longer was that a generator would have had to own the SENTENCE and not just the number — so
the sentence was split. Everything a person is asserting is prose, above and below the markers; what
is inside them is arithmetic and nothing else. Regenerate with
`node scripts/gen-ceremony-costs.mjs --counts` — milliseconds, no guard is run — and
`npm run verify` fails if the document disagrees with the repository.

<!-- BEGIN GENERATED: engine-reach counts — gen-ceremony-costs.mjs -->

| count | value |
| ---------------------------------------------------------------------------------------------- | ----- |
| files in `raceCore.js`'s import closure — `node scripts/engine-reach.mjs` | 78 |
| tracked non-test files under `client/src/modules/` outside `camera/` — what the old folder rule fired on | 115 |
| of those, files that CANNOT reach the engine | 56 |
| closure files the folder rule never covered | `client/src/modules/camera/lapUtils.js`, `client/src/services/api.js`, `client/src/services/apiClient.js`, `client/src/services/racerApi.js`, `client/src/utils/mathUtils.js`, `scripts/lib/racerFacts.mjs`, `scripts/sim-fairness.mjs`, `scripts/sim/observers/comeback-reality.mjs`, `scripts/sim/observers/escape-episodes.mjs`, `scripts/sim/observers/fairness-stats.mjs`, `scripts/sim/observers/front-liveliness.mjs`, `scripts/sim/observers/gap-metrics.mjs`, `scripts/sim/observers/hero-adherence.mjs`, `scripts/sim/observers/outcome-front-battle.mjs`, `scripts/sim/observers/physics-tax.mjs`, `scripts/sim/observers/pulk-contest.mjs`, `scripts/sim/observers/release-contest.mjs`, `scripts/sim/observers/report.mjs`, `scripts/sim/observers/runaway-parade.mjs` |

<!-- END GENERATED: engine-reach counts -->

**The third count is NOT the difference of the first two, and typing it as one is how this document
came to claim 86.** The closure and the folder are two sets, neither containing the other: the last
row names the closure members the folder rule never covered — one inside `camera/`, which the rule
excluded, and one outside `modules/` entirely — so the subtraction that looks obvious is short by
exactly those. The generator takes the intersection, which is why the number moved the first time it
was computed rather than typed. **The list itself, in [SIM.md](SIM.md), IS generated and is not
affected.**

**WHAT THE NEW TRIGGER DOES NOT CATCH, stated so nobody over-trusts it:**

- **Anything reaching the engine other than through `raceCore.js`'s import graph** — a value passed
  in as an ARGUMENT by a caller. `drawnBodyWidthRefPx` is exactly that: computed in a screen file and
  handed to the engine. The closure contains the file that _consumes_ it (`raceBehavior.js`) but not
  the screen that _computes_ it. **If your diff changes a number that is passed into the race, mint —
  the tripwire will not tell you to.**
- **Dynamic imports.** A static walk cannot follow `import()`. There are none in the closure today and
  `scripts/engine-reach.test.mjs` fails if one appears, at which point this rule needs revisiting.
- **The seeds and track JSON**, which are data rather than modules.

`ENGINE_INPUT_MODULES` in `raceConfigWorld.js` remains, and remains guarded — it is the DIRECT-import
list, and it stays useful as the "did a new engine input appear" alarm. It is deliberately **not** the
trigger: it names eleven files against the closure count generated above, and **the gap between the
two contains `autoSpriteScale.js`, which is the precise file this tripwire was created for.**
Triggering on it would have stopped catching the incident that produced the rule.

**`eleven` is a HAND-COUNTED figure: `ENGINE_INPUT_MODULES` in
`client/src/modules/raceConfigWorld.js`.** Nothing re-counts it — a stamp checks FRESHNESS, never
accuracy. **It is now STAMPED, and STAMP-COMPLETE-1 is what made that possible.** This paragraph
recorded the opposite until 2026-08-13, and correctly for its day: `check-measured-stamps.mjs`
scanned `docs/CAMERA_DIRECTOR.md` and nothing else, so a stamp placed here would have looked guarded
and been decoration, which is worse than an honest date. It now scans every living document, so the
stamp below is real — the day `raceConfigWorld.js` changes, this figure goes red and asks to be
re-counted. Re-counted by hand on 2026-08-13 and still eleven; the array is eleven lines long.

<!-- MEASURED: ENGINE_INPUT_MODULES is eleven entries @ 86d542f0 2026-08-13 depends=client/src/modules/raceConfigWorld.js -->

**The gap between the list and the closure is deliberately described WITHOUT a count.** The NAME is
what carries the argument; the number is not load-bearing, so it is not stated at all rather than
stated and left to rot. It read "eight" until 2026-08-12 and was still true only under one reading of
"gap" — which is the whole hazard.

**Why it exists.** The old test was "no simulation file in the diff" — but that is a test of FOLDERS,
and the engine's inputs are not confined to one. `drawnBodyWidthRefPx` is computed in a screen file
and consumed by `raceBehavior.js` as the avoidance body size, so a value that moves the race can enter
a camera diff and pass every check untouched. That is not hypothetical: `autoSpriteScale.js` — which
also exports the auto-scale config the start-grid packing reads — sat in the CAMERA-PICTURE-FIXES-1
diff and nobody noticed until the owner asked why overtaking looked easier
([CAMERA-MINT-TRIPWIRE-1](../reports/evolution/CAMERA-MINT-TRIPWIRE-1.md); the fingerprint had NOT
moved, but nothing in the regime had established that).

No list, no judgement call: a block that stays inside `camera/` pays nothing, and anything that
strays out of it pays the world fingerprint's cost — the generated table below, not a number typed
here. If the fingerprint moved, the block is not presentation-only and the full ceremony above
applies.

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

**ALL THREE NOW COMPARE, and until 2026-09-03 only one did.** `--check` reads the role's value from
[fingerprints.json](fingerprints.json) and exits non-zero on a mismatch. FP-COMPARE-1 gave the world
that in 2026-08-14; camera and render never got it, so for eighty days two of the three computed a
hash, printed it, and reported PASS whatever it was — CENSUS-CHECKS-1 classified render
DEMONSTRABLY INERT for exactly that. **`npm run verify` now passes `--check` to all three**, which is
also the only place a new failure surfaces: the pre-commit hook deliberately does not run the
fingerprints and CI does not run `verify`. A failure here is not always a bug — a block that moves a
hash deliberately SHOULD fail it until the value is minted, which is this ceremony working.

**The VALUES below are copies. Their one home is [docs/fingerprints.json](fingerprints.json)** — the
value, the commit it was minted on, the date, and the script that reproduces it. Do not type a
fingerprint into this table or anywhere else: put it in the record and run
`node scripts/check-fingerprints.mjs --fix`, which writes it into every place that states it.
The guard fails if any of them disagrees, if a site loses the wording it is found by, or if a new
file starts stating a value without being declared. This document still owns the PROCEDURE for
minting; [SIM.md](SIM.md) owns the lineage; [REBASELINE.md](../reports/parity/REBASELINE.md) owns the
baseline statistics behind the current world.

|                                               | covers                                                                          | run it when                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/fingerprint-default.mjs` — **world** | the RACE: physics, plan, outcome                                                | any behaviour change, and per the mint tripwire above                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `scripts/camera-fingerprint.mjs` — **camera** | the DIRECTOR's decisions: state, phase, anchor, zoom, offsets, camT, targets    | any block touching `client/src/modules/camera/`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `scripts/render-fingerprint.mjs` — **render** | the DRAW CALL SEQUENCE: sprite placement, text, styles, transforms, layer order | any block touching the drawing path — **`modules/camera/`**, `RaceScreen/renderRaceFrame.js`, `RaceScreen/drawing/`, `nameTagLayout.js`, `Minimap.js`. **Camera counts** (FINISH-COMPANY-1): a camera-only diff moved this hash off `b6591e74102152bd` (**superseded 2026-08-05**), because the director decides the transform on every drawn frame. `scripts/verify.mjs` had copied this list's omission and told a block it could not reach a `ctx.` call. |

**THE RACER TYPES ARE NOT ON THAT LIST ANY MORE, AND NOTHING REPLACES THEM.** This row read "…and
the racer types' `drawRacer`" until 2026-08-18, which told a reader that changing how a racer is
drawn is covered by an instrument. **It is not, in two independent ways, and both were measured
rather than argued** (NIGHT-2026-08-18 finding 7):

- **`racer-types/` is inside the WORLD instrument's closure, and NO other's — corrected 2026-09-02
  (REACH-CLOSURE-COST-1); it was outside all three until then.** Walking each guard's declared
  `reach` through `closureOf` today: **world 78 files, of which 36 are `racer-types/`**; camera 38
  and render 58, neither containing one. `engine-reach --check` on `SpriteRacerType.js` now answers
  **"is in the hull"**. **What this row said when it was written was true and is kept, because the
  gap it describes is why the closure was closed**: until REGISTRY-LITERALS-1 (2026-09-02) the four
  physical fields every racer carries were engine inputs that selected no instrument, and a diff
  confined to a racer type could only be caught by following this row by hand. It no longer can be
  missed — a racer's PHYSICS now selects the world fingerprint. **A racer's DRAWING still does not**,
  which is the next row and is unaffected.
- **Even when it runs, the instrument is blind to the sprite.** `RENDER-FINGERPRINT-1` §"blind to"
  says so: node has no `Image`, so the racer body falls back to its procedural branch and the blit
  is never recorded.

**So a change to how a racer is drawn is covered by the owner's eye and by nothing else.** That is a
defensible position — it is what the render fingerprint's own blind list already declares — but the
row above must not read as though an instrument has it. Whether to widen the instrument is a
decision, not a documentation fix, and it is on the owner's list.

<!-- BEGIN GENERATED: guard costs — gen-ceremony-costs.mjs -->

**Costs below are GENERATED, never typed** — measured on commit `f0211115`, 2026-09-04 07:25 UTC, on `Testrechner`,
by `node scripts/gen-ceremony-costs.mjs`. Each guard times ITSELF and prints `[ra-elapsed-ms N]`;
this table quotes those numbers. A duration here that nobody measured is a bug in the generator,
not a typo. `--check` warns once the block is more than 40 commits old.

| guard | cost |
|---|---|
| `scripts/fingerprint-default.mjs` — **world** | 40 s |
| `scripts/camera-fingerprint.mjs` — **camera** | 18 s |
| `scripts/render-fingerprint.mjs` — **render** | 21 s |
| `scripts/check-doc-links.mjs` | 0 s |
| `scripts/check-index.mjs` | 0 s |
| `scripts/check-tags.mjs` | 1 s |

<!-- END GENERATED: guard costs -->

**NOTHING RUNS THE STALENESS CHECK, and the block above drifted inside its own tolerance.** Stated
here because a generated table reads as maintained whether or not anything maintains it. The
generator is invoked **by hand only** — not by `npm run verify`, not by CI, not by the commit hook.
`--check` exists and asks how old the block is, but `verify.mjs` deliberately passes `--check-counts`
instead, and says why in its own source: a cost cannot be recomputed without paying for it, so a
stale duration is a thing to re-measure rather than a reason to fail somebody's build. **And the
check would not have caught this one anyway**: the column was measured 37 commits before it was found
wrong, against a threshold of 40. It counts COMMITS, while what actually moves a duration is the
MACHINE — which no commit count can see. Two of the three fingerprint rows were out by more than a
factor of two while the clock still read fresh.

**Why the render one earns its cost only on drawing blocks.** The camera fingerprint already covers
every decision the director makes, and it is the cheaper answer for camera-only work. The render
fingerprint answers the question the camera one structurally cannot — _did the picture change?_ —
and until RENDER-FINGERPRINT-1 that was an argument every camera block ended on. Run it whenever the
diff can reach a `ctx.` call.

**Read [RENDER-FINGERPRINT-1](../reports/evolution/RENDER-FINGERPRINT-1.md) §"blind to" before
trusting it.** It is blind to the rasteriser, to the artwork, and — measured, not assumed — to the
sprite blit itself, because node has no `Image` and the racer body falls back to its procedural
branch. Placement, order, text, styles and every other layer are covered. The owner's eye remains
the instrument for artwork.

## BEFORE ANY MERGE: a branch's content is what it changes against MASTER

**Run this, read it, and only then merge:**

```
git diff --name-only master...<branch>
```

**A branch's content is what it changes relative to MASTER — never relative to the branch it was cut
from.** A branch cut from another branch carries everything that branch carried. Its own commits are
one question; what merging it does to master is a different one, and only the command above answers
the second.

**This is not hypothetical, and the incident is why the rule is here.** On 2026-08-08
`feat/verify-cost-2` was described — correctly, of its own three commits — as "tooling only, no
fingerprint moved, nothing cut from coverage". It had been cut from `feat/start-board-1`. Merging it
put **50 files** on master: the camera hold, the runners' board, the race numbers, the label offsets
— every one of them visible behaviour awaiting the owner's eye, shipped with no eye test and no ship
ceremony. The whole of this document was bypassed by one merge everybody involved believed was
tooling. Master had to be reset and force-pushed; that state is preserved as
`archive/master-9d025aa9-accidental-chain-merge` in [TAGS.md](TAGS.md).

**Two corollaries, because each was also true that day:**

- **Green CI does not answer this question.** CI ran and passed on the branch. It tests what the
  branch contains — which is exactly the thing that was more than expected.
- **When a branch must carry only part of its ancestry, cut a new branch from master and
  cherry-pick.** That is what re-landed the tooling, and the same one-line check is what proved it:
  16 files, none from the chain.

---

## THE SHIP ORDER — and why the register line goes on the BRANCH

**This section owns the ORDER of the merge, the mint, the tag and the cleanup that ends it.** Anything else that describes that
order points here instead of restating it.

**★ SCOPE, corrected 2026-09-02: steps 12 AND 13 bind to EVERY MERGE TO MASTER, not only to a
ship.** Steps 1-11 are a ship's sequence and need a mint or a tag to mean anything; **steps 12 and 13
need neither** — 13 was added 2026-09-03 and inherits 12's scope for the same reason, since a
worktree stub is left by any block that used one, ship or not. The
rest of this section was read as scoping it — the list is called THE SHIP ORDER, its neighbours talk
about provisional SHAs and CI for a tag, and step 12 itself used to end "the ship is not finished
while they stand" — so a chain of ordinary merges that minted nothing and tagged nothing left six
branches standing at origin, and the step never fired. **The wording was the defect, not the
practice.** A branch is cleared because master holds its content, and that is true of a diagnostic
merge exactly as it is of a ship.

**The contradiction it resolves (found 2026-08-18).** Two of this repository's rules were both right
and could not both hold: *CI must be green for exactly the merge SHA*, and *a ship tag's `TAGS.md`
register line goes in the commit after the merge*. Checked out at the tag, `check-tags` saw a tag at
origin that the tree did not register, and failed. `v-ship-runin-hold`, `v-ship-minimap`,
`v-ship-contender-zoom` and `v-ship-endgame-095` are all in that state. **The rules were fine; the
order was wrong.**

**The fix is one move: everything the merge commit must CONTAIN is written on the branch, before the
merge.** Then the merge commit is self-consistent — it registers its own tag, it carries its own
fingerprints — and the tag points at a commit that passes every guard.

**What makes this possible at all**, and it is worth saying because it looks impossible: the branch
is caught up with master FIRST, so **the branch tip's tree is already the tree master will have.**
Fingerprints measured on the branch tip are therefore measured on the merged tree, which is what the
mint rule requires. Without the catch-up merge this ordering does not work and the old one has to be
used.

### The steps

> **★ THIS DOCUMENT HOLDS TWO INDEPENDENT NUMBERED LISTS, AND THEY BOTH RUN TO 12.** Recorded
> 2026-09-05 (LEFTOVERS-1) because it is invisible until it costs somebody an hour. **THE SHIP
> ORDER** is the list immediately below — 1 to 13, the git sequence of a merge. **The checklist** is
> a different list further down, and its own step 12 is *"Commit, push, verify"*, not this one's
> *"Clear the branches AT ORIGIN"*.
>
> **EVERY "step N" REFERENCE ANYWHERE IN THIS REPOSITORY MEANS THE SHIP ORDER — the list below.**
> That includes the five in `scripts/check-tags.mjs`, one of them in the failure message an operator
> reads, and the references in `docs/TAGS.md` and `docs/BACKLOG.md`. **These numbers are therefore
> load-bearing: do not renumber this list, and do not reorder it into a renumber.** A reorder that
> looked obvious was examined on 2026-09-05 and refused for exactly this reason; the sweep's timing
> was fixed in step 12's own wording instead, which cost no number.

1. **Catch up with master.** `git merge --no-ff master` on the branch, resolve, and run
   `npm run verify` green on the result. From here the branch tip's tree is the post-merge tree.
2. **Read what the merge puts on master** — the `git diff --name-only master...<branch>` check above.
3. **Choose the tag name now.** It is an input to step 5, not an output of the merge.
4. **Measure the fingerprints on the branch tip**, per the mint rules below. This is the merged tree.
5. **On the branch, in one commit: the mint, the register line, the report and its INDEX entry.**
   The `TAGS.md` entry is written in the declaration form the register requires — backticked name,
   backticked short SHA, date — with the SHA **provisional** (see the note below).
   **A `MEASURED:` stamp is NOT provisional and never carries a placeholder — see TRAP B below.**
6. **`npm run verify` green on the branch — EXCEPT `check-tags`, which cannot be green here.** See
   the note below; `check-index` and `check-fingerprints` do run against the tree that is about to
   become master, which is most of the value.
7. **Merge into master** with `--no-ff`. The merge commit's tree is the branch tip's tree.
8. **Tag the merge commit**, annotated. It registers its own tag, so `check-tags` passes on it.
9. **Push the merge and the tag, and NOTHING ELSE — `git push origin master v-ship-<name>` with
   master's tip standing exactly at the merge commit.** This is the step TRAP A below exists for:
   the merge SHA must be the tip of what you push, or CI never runs for it.
10. **Wait for CI to go green for the merge SHA** before doing anything else. If no run exists for
    it, see TRAP A for the dispatch route.
11. **Only then, the follow-up commit on master correcting the two provisional SHAs** — the register
    line's and `mintedOn` — to the merge's actual hash, pushed on its own.
12. **Clear the branches AT ORIGIN, and do it here rather than remembering to.** Every branch origin
    still carries whose content master already holds is deleted. **This step is owed by ANY merge to
    master — a diagnostic, a docs commit, a repair, a piece of a chain — not only by a ship**, and it
    is owed at the merge, not at the end of a batch of them: no merge is finished while a branch it
    made redundant stands at origin. **A merge that mints nothing and tags nothing still owes this
    step**, which is precisely the case that was missed (see SCOPE above). **Anything a branch holds that master LACKS is landed on master first** — as a commit, not
    by leaving the branch up — and anything that must survive as evidence becomes an **annotated tag
    with its `TAGS.md` register entry**, never a branch. A branch is a moving pointer that anyone can
    force-push or delete; a tag is the thing this repository already trusts to mean "this state, at
    this moment". See THE CONTAINMENT CHECK immediately below for *how* to decide, because the
    obvious way to decide is wrong.

    **★ WHEN: IMMEDIATELY AFTER THE PUSH IN STEP 9 — NOT AFTER THE WAIT IN STEP 10.** Added
    2026-09-05 from [CI-MERGE-RACE-1](../reports/evolution/CI-MERGE-RACE-1.md). **This step keeps its
    number and its position in the list; what is corrected is WHEN it is carried out** — the number
    is load-bearing, because `scripts/check-tags.mjs` cites "step 12" five times, once in the very
    failure message this step answers.

    **The reason it cannot wait.** `ci.yml` runs `check-tags.mjs` as the fifth step of its docs job
    and reaches Rule B **about 13 seconds after the push**, while step 10 waits MINUTES for the whole
    run to finish. So a ceremony followed in list order has the branch **always** still standing at
    origin when Rule B is evaluated, and the merge's own push run goes red over a branch that is
    about to be deleted anyway. **Delete the branch as the next command after the push, then turn to
    step 10.**

    **The evidence, measured over the last 28 merges:** 27 were green, and they were green precisely
    because the sweep is done immediately in practice rather than in list order. The one that was not
    — `bd91fac0`, which waited for CI first — is the one that failed Rule B. This paragraph makes the
    document say what already works.

13. **Clear the WORKTREE STUBS, and clear the ReadOnly attribute FIRST.** If the block used a
    `git worktree`, `.git/worktrees/` is left holding inert metadata that `git worktree prune` alone
    cannot delete on this machine:

    ```
    attrib -R /d .git\worktrees\<name>
    attrib -R /d .git\worktrees\<name>\logs
    attrib -R /d .git\worktrees\<name>\refs
    git worktree prune
    ```

    **WHY THIS IS A STEP NOW, WHEN THE OWNER PREVIOUSLY REFUSED IT.** His instruction was explicitly
    conditional — not that prune is wrong, but that *it fails here*, and a ritual that cannot succeed
    teaches that rituals are optional. **That condition is gone.** WORKTREE-STUBS-1 (2026-09-02)
    cleared all three stubs then standing, and the recipe was reproduced independently on 2026-09-03
    against a freshly created stub: **prune alone fails with `Permission denied`; with `-R` cleared at
    all three levels it succeeds and the count goes to zero.**

    **WHY THE ORDERING MATTERS, and it is not obvious.** `attrib -R /s /d` looks like it recurses and
    does not — `/s` recurses for FILES, `/d` applies to folders at the level given, and together they
    leave `logs/` and `refs/` still ReadOnly while exiting 0. **Naming each level is the whole
    trick**, and it is why this failed for four months. The clearing must also come at REMOVAL time
    rather than creation time: a stub is created without ReadOnly and acquires it later, when OneDrive
    syncs the directory — measured on 2026-09-03, where a fresh stub carried only `P` and had gained
    `R` by the time prune ran.

    ★ **AND THE STUB IS NOT THE HAZARD — A JUNCTION IS.** A stale stub costs one inert directory.
    `git worktree remove --force` run while a worktree had the main tree's `client/node_modules`
    junctioned into it walked *through* the link and deleted into the real tree, emptying
    `node_modules/.bin` from 81 shims to 0 (SIDE-FREE-CULL-1, 2026-08-27). **Do not junction
    `node_modules` into a worktree**; if one exists, remove the junction BEFORE removing the worktree,
    never the other way round.

**WHY THIS IS A STEP AND NOT A HABIT.** It was a habit for months, and the habit produced ten
archive-branches, then produced them again after they were cleared: CLEANUP-2026-08-26 swept nine,
and by the next ship there were three more. **Making it a step was not enough on its own**: on
2026-09-02 a five-piece chain merged six branches to master, ran this document's own containment
check on none of them, and left all six at origin — because every one of those merges was an ordinary
merge and this step read as a ship's. **A step in the wrong section is still a step nobody runs.** A rule that lives outside the repository has to be
remembered by whoever is at the keyboard, and the record shows it is not. **The failure is not
untidiness.** `feat/leader-whole-setback-1` was the only home of a 195-line report for a day, so
master's own index carried a line saying where to go and look — a repository that has to point
outside itself for its own evidence. Deleting that branch on the wrong day would have destroyed it.

### A GREEN `verify` ON THE BRANCH DOES NOT PREDICT A GREEN CI ON MASTER

**Three gaps, all verified at source on 2026-09-05 (LEFTOVERS-1). Recorded because master was red
for three days and 24 push runs while every one of those merges had run `verify` green first.**
Nothing is proposed here; this is what the two commands are, so the difference is not rediscovered.

1. **`verify` ROUTES BY DIFF; CI'S DOCS JOB DOES NOT.** `verify` selects guards from what the branch
   changed. The `Living-doc guards + script tests` job in `.github/workflows/ci.yml` carries
   **zero `if:` conditions** — counted, not assumed — so it runs eleven `check-*` guards **and the
   whole script suite** on every push regardless of the diff. Any guard `verify` skips locally can
   be red in CI.
2. **`verify` RUNS NO `lint` AND NO `format:check`.** It runs `npm run format` (`scripts/verify.mjs`,
   the `format:` step) — **the formatter, which writes; not a check, which fails.** CI runs
   `npm run lint` (`ci.yml:115`), `npm run format:check` (`:119`) and `npm run test:coverage`
   (`:125`). None of those three has any counterpart in `verify`.
3. **THE ENVIRONMENT DIFFERS, AND THAT IS WHAT THE THREE DAYS COST.** The failure was
   `git commit-tree` refusing with *"Author identity unknown"* — a developer machine has a global
   git identity and a GitHub runner has none. The tests ran locally, passed locally, and could not
   pass on any runner. **No amount of routing would have caught it**, which is why this gap is
   listed separately from the first two.

### THE CONTAINMENT CHECK — a TREE question, not a COMMIT question

**Get this wrong and the check reports "safe to delete" for a branch holding a file master lacks.**
That is not hypothetical: it happened on `diag/runin-viable-1` on 2026-08-26, where the conclusion
happened to be right and the method would not have caught a real loss.

**FIRST, LIST THE BRANCHES — and ask ORIGIN, not your own cache.** Step 12 is about every branch
origin still carries, so the list has to come from origin:

```sh
git ls-remote --heads origin | sed 's|.*refs/heads/||'
```

**`git branch -r` IS NOT THIS LIST**, and the difference is not pedantry. It shows what your last
fetch saw, so a branch somebody pushed since is simply absent and will never be checked; and it emits
`origin/HEAD` as an entry, which strips to a branch named `origin` that does not exist. **A step that
says "check every branch" while leaving the reader to invent the enumeration is how the rule gets
applied to a list of remembered names instead of to what is actually there** — which is exactly what
happened on 2026-08-26, when a ship named three branches and left two standing.

**THEN, FOR EACH ONE, THE CHECK:**

```sh
comm -23 <(git ls-tree -r --name-only origin/<branch> | sort) <(git ls-tree -r --name-only origin/master | sort)
```

Empty output means master's tree holds every path the branch's tree holds. That is the question worth
asking, and this is the whole of it.

**THE WEAKER CHECK THAT LOOKS CONVINCING**, and why it is not: comparing only the paths the branch's
own commits *introduced* — `git show --name-only`, or a `master...branch` diff — against master. It
reads like a complete audit, it names real files, and it will report a strict subset for a branch
whose tree still contains something master has since deleted or renamed away. **A branch's tree is
not the same thing as its commits' diffs**: it also carries everything it inherited from the commit
it branched off, and master may have moved on from any of that. `diag/runin-viable-1`'s own commits
introduced five paths, all of them accounted for; its TREE also held
`client/src/modules/camera/panStaleZoom.test.js`, which master had replaced during
RUNIN-PIVOT-SCOPE-1 and which the commit-level check never looked at.

**AND `--is-ancestor` IS NOT THE CHECK EITHER**, though it is worth running first because it is
cheap and it is sufficient when it passes cleanly: a branch whose tip is an ancestor of master had
every commit merged, but a file it ADDED can still have been DELETED on master afterwards, leaving
the branch's tree holding a path master's tip does not. Ancestry answers "were these commits
merged"; the tree check answers "would deleting this lose anything". **Only the second one is the
question step 12 asks.**

**WHEN THE CHECK FINDS SOMETHING**, it does not mean keep the branch. It means land what is missing
on master, confirm the check now comes back empty, and only then delete — the order matters, because
a branch deleted first cannot be read back.

### TRAP A — CI DOES NOT RUN FOR A COMMIT THAT IS NOT THE TIP OF A PUSH

**Found 2026-08-22 by SHIP-MINIMAP-ONE-SOURCE, which paid for it.** That ship followed the old steps
9 and 10 literally: it made the follow-up commit and then pushed master once, so the push carried the
merge *and* the commit on top of it. **GitHub runs CI for the tip of a push, not for every commit in
it.** The merge SHA — the one the tag points at, the one a checkout of the tag shows, the one the
rule "green for exactly the merge SHA" is about — got no run at all.

**THE RULE, in one line: the merge is ALWAYS pushed alone, with the tag, and the follow-up commit
comes after CI is green.** That is steps 9, 10 and 11 above; there is no second option and nothing
for the shipper to choose. It costs one extra push and it is the only ordering in which the SHA the
tag names is a SHA CI has actually seen.

**Pushing the merge alone does not reintroduce the defect THE SHIP ORDER was written against.** That
defect was a tag arriving at origin before its register line. Under this order the register line is
already inside the merge commit — step 5 put it there — so the tag and its registration travel
together and `check-tags` is green. What is left outside is only the *correction* of a provisional
SHA, which `check-tags` does not read: its own header says it checks names, not shas.

**IF A RUN FOR THE MERGE SHA DOES NOT EXIST** — because the push was already made the wrong way round,
or because a run was cancelled — do not push an empty commit to provoke one and do not settle for a
run on a descendant. Dispatch the workflow at the **tag**, which resolves to the merge commit and to
nothing else:

```
gh workflow run ci.yml --ref v-ship-<name>
gh run list --limit 5 --json databaseId,headSha,status,conclusion,workflowName,event
```

The second line is how you confirm it: the run's `headSha` must be the merge commit's full hash. This
worked on 2026-08-22 (run `32262308114`, head `242e6cb3`) and is the reason `ci.yml` keeps its
`workflow_dispatch` trigger — it takes a ref, and a tag is a ref that can only mean one commit.
**`--ref <sha>` is not a substitute: the dispatch API takes a branch or tag, not an arbitrary SHA.**

**★ AND `workflow_dispatch` AT A *BRANCH* IS NOT A PRE-MERGE CI PROXY. Established 2026-09-05
(CI-RED-3e6c0b87), after it cost an hour.** Dispatching the workflow at an unmerged branch to "see
whether CI would pass" produces a red run that means nothing: a dispatched branch checkout has **no
local `master` ref**, and two script tests need one. `scripts/check-tags.test.mjs` dies on
`git rev-parse master` — *"fatal: ambiguous argument 'master': unknown revision"* — and
`scripts/engine-reach.test.mjs` fails *"an honest negative must stay exit 1"* with exit 2, because
the check refuses rather than answering without a base. **Neither is a defect, and neither tells you
anything about the merge.** The dispatch route above is for a TAG, which resolves to the merge
commit; there is no branch equivalent. If you want CI's answer for work that is not yet on master,
the answer is that you get it after the merge — which is what steps 9 and 10 are for.

### TRAP B — A `MEASURED:` STAMP CANNOT CARRY A PLACEHOLDER

**Found in the same ship, and it cost more than TRAP A because it failed in the wrong place.** The
paragraph below used to fold `MEASURED:` stamps in with the register line and `mintedOn` as "the same
case", riding the same provisional-then-corrected path. They are not the same case:

- `check-tags` reads the register line's **name**, not its SHA, so a provisional SHA there is inert.
- `check-measured-stamps` reads the stamp's **commit field with a strict pattern** — `[0-9a-f]{7,40}`
  — and, until this was fixed, **anything that did not match was not reported. It was silently
  dropped from the checked set.** A stamp reading `@ PENDING` did not fail; it ceased to exist.

In `docs/CAMERA_DIRECTOR.md`, which carries exactly one stamp, that took the document from one stamp
to zero. The only thing that went red was the guard's LOUD-FAILURE rule firing on the empty set — so
the error named the wrong problem ("found ZERO measured-number stamps") in the wrong place (the
guard's own test suite, via `script-suite`), and the shipper spent a verify cycle finding out why.

**THE RULE: a `MEASURED:` stamp is stamped at the commit that LAST CHANGED ITS `depends=` PATHS, and
never at the merge and never at a placeholder.** That commit already exists when the stamp is
written, so there is nothing provisional about it and **nothing for step 11 to correct**. It is also
the semantically right answer: the stamp's question is *has this dependency moved since the number
was measured*, which is a question about the dependency's own history, not about the merge that
happens to carry the document.

```
git log -1 --format=%h -- <the stamp's depends= paths>
```

**THE GUARD WAS ALSO FIXED, because a rule in a document is not a guard (R13).**
`check-measured-stamps.mjs` now scans a second time with a permissive opener, and anything that
announces itself as `MEASURED:` and then fails the strict form **fails loudly, naming the file and
the line and quoting what it found.** Proven in both directions by
`scripts/check-measured-stamps.test.mjs`: an unparseable stamp fails and names its line, and the same
stamp with a real SHA passes and is counted. The fenced-example exclusion is unaffected — fences are
stripped first, and they are now replaced by their own newlines so the reported line numbers are the
ones a reader sees.

### `check-tags` IS RED ON THE BRANCH, DELIBERATELY — and that is the window moving, not a defect

**Corrected 2026-08-18 by ENDGAME-FALLBACK-1, the first ship under this order, which found it by
doing it.** The first draft of step 6 claimed `check-tags` would now be green on the branch. It
cannot be: a register line for a tag that has not been pushed yet fails the guard's SECOND direction
— *every registered tag exists at origin* — for as long as the branch is unmerged. **Commit that
step with `--no-verify` and say so in the commit message**; the guard is green again the moment
master and the tag are pushed together in step 9. *(Was "step 10" until 2026-09-05; the merge and
the tag are pushed in step 9 and have been since the follow-up commit became its own step.)*

**This is the inconsistency window moving, and it moves in the right direction:**

| | old order | new order |
| --- | --- | --- |
| where the inconsistency lives | **in history, permanently** — the merge commit forever fails `check-tags` | **on an unmerged branch, transiently** |
| when it ends | never | at the push in step 9 |
| what a checkout of the tag shows | red | green |

**A branch is work in progress; history is not.** Trading a permanent inconsistency in the record for
a temporary one in a branch nobody has merged is the whole of what this reordering buys.

### The one step that CANNOT be done in this order, and why

**A commit cannot name its own hash.** The register line's SHA and `mintedOn` both want the merge
commit's hash, and neither can have it until that commit exists. So step 5 writes them provisionally
— the branch tip's short SHA is the honest provisional value, because it is the commit the tree
actually came from — and step 11 corrects them. **A `MEASURED:` stamp is NOT one of these** — it names the commit that last changed its
`depends=` paths, which already exists, so it is written once and corrected never. This
paragraph said the opposite until 2026-08-22 and TRAP B above is what that cost.

**This costs nothing that matters, and it is measured rather than assumed:** `check-tags` declares in
its own header that it checks **names, not shas** ("whether a tag points where the register SAYS it
points — names are checked, not shas"). So the merge commit passes the guard with a provisional SHA,
which is the whole point of the reordering; the correction in step 11 is for the human reader.

**It is also the pattern this repository already uses** for the `MEASURED:` stamps, where a commit
that carries a measurement cannot name the commit the measurement was taken on until it exists —
see the `docs(…): the tracking-lag stamp names the commit it was measured at` commits.

### The guard was NOT changed, deliberately

`check-tags.mjs` is untouched. It was correct throughout: it reported a real inconsistency between a
tag at origin and a tree that did not register it. **The defect was in the order of the ceremony, and
a guard that had been relaxed to accept the old order would have stopped being able to catch the
thing it was built after** — a tag pushed with no register entry at all.

### The four tags that predate this rule

`v-ship-runin-hold` (`48f954a4`), `v-ship-minimap` (`8a2dacab`), `v-ship-contender-zoom` (`0bd07dba`)
and `v-ship-endgame-095` (`740f605c`) were cut under the old order and **do not register themselves
in the tree they point at. They are not violations and history is not rewritten for them** — they
predate the rule, they are correctly registered on master, and `check-tags` is green there. Only a
checkout of one of those four tags shows the inconsistency.

---

## The checklist

> **★ THIS IS THE SECOND OF THIS DOCUMENT'S TWO NUMBERED LISTS, and its numbers are its own.** A
> "step 12" cited anywhere in the repository means THE SHIP ORDER's step 12 — clear the branches at
> origin — not this list's. The full note, and why those numbers must not be renumbered, is at
> [THE SHIP ORDER § The steps](#the-steps); it is not restated here.

Work top to bottom. Steps that are marked **ONE step** are a single unit of work with two artefacts —
never do one artefact and defer the other (that is exactly how the INDEX entry and the tag register
went missing).

- [ ] **−1. What does this merge put on master?** `git diff --name-only master...<branch>` — the
      section above. If anything in that list is not what the block is about, stop.
- [ ] **0. Pre-flight.** Confirm the change is UI-configurable (a config key, not a hard-coded edit).
      `eslint` clean, `build` green, the full test suite green on the working tree before you measure.
- [ ] **0a. THE CAMERA SHIPS ONLY AFTER A REAL BROWSER HAS RUN IT.** If the merge touches
      `client/src/modules/camera/` or `client/src/screens/RaceScreen/`, run
      **`node scripts/viewer-invariants.mjs --gate`** — **TWO races: space-sprint and city-circuit,
      seed 9, the shipped arm**, on the PRODUCTION BUNDLE in Chromium. **200-340 s, and it must be
      clean.**

      **THE COST WAS WRONG HERE UNTIL 2026-08-22 AND IT WAS NEVER MEASURED.** This step used to read
      "one race, space-sprint seed 9 … ~130 s". `--gate` has never done that: it sets the seed and
      the arm and leaves the track list at ALL, so it has always run ten. The 130 s described the
      MANUAL single-track invocation in the script's own usage header, and both numbers were written
      into this document in the same commit as the flag, before either had been timed.

      **MEASURED, three runs of `--gate` on this machine: 671 s, 749 s and 885 s** — 11 to 15
      minutes, and take the top of that as the planning figure. (A fourth 10-race run at 811 s is
      deliberately NOT counted: it swept two seeds across five tracks at a different concurrency, so
      it is the same race COUNT and not the same command.)

      **★ SINCE 2026-09-05 `verify` CAN RUN IT, ONCE PER BRANCH (GATE-WIRED-AND-CAUSED-1).**
      `npm run verify -- --premerge` selects it when BOTH hold: the flag was given, and the branch
      diff touches something the guard declares. Without the flag it is never selected however the
      diff looks, and either way `verify` prints which of the two conditions was not met. **This step
      is unchanged and is still the authority** — the invocation above and `--premerge` run exactly
      the same two races.

      **Why it is not simply part of every `verify` run.** It builds a bundle, starts its own API and
      app server and launches a browser; `verify` runs on every commit, and a per-commit cost of
      minutes is how a gate stops being run. The owner's cadence, 2026-09-05: once per branch, before
      the merge — which is why the flag exists rather than a plain route. It is still the only thing
      in this repository that grades the camera the OWNER actually sees.

      **Why it is not optional for a camera change.** The headless director and the browser have
      diverged three times, and every time the headless side was the blind one: the camera's random
      seed (CAMERA-SEED-AND-LINE-1), the whole draw path (RENDER-FINGERPRINT-1), and a frame with no
      course on the canvas that `raceDriver` reported clean (VIEWER-INVARIANTS-1). **The owner found
      all three; no gate did.** This is the gate.

      **AND WHEN THE 80-RACE SHEET RUNS INSTEAD — the owner's rule, 2026-08-25.** The full
      `--seeds=1,2,3,9` sweep is 45-90 minutes and it is NOT the ship check. It runs in exactly two
      situations:

        1. **A FINGERPRINT MOVED.** Then the picture changed, the twelve requirements are back in
           question, and only the sheet can say which of them moved.
        2. **BEFORE A BUILD THE OWNER IS GOING TO JUDGE**, so his eye and the sheet are looking at
           the same thing.

      Otherwise **this one-race gate is the check**. The reasoning is the identity argument: four
      byte-identical fingerprints already say the delivered picture is the same to the byte, and the
      twelve requirements are properties OF that picture — they cannot have changed while it did not.
      Running the sheet to confirm what a fingerprint has already proved buys nothing and costs an
      hour.

      **AND WHEN IT DOES RUN, IT RUNS ALONE AND LAST.** Parallel runs destroyed it twice in two
      blocks: once with `npm run verify` alongside it (Chromium killed mid-run, 10 races lost, and
      vitest's workers timed out under the same saturation, which then read as a test failure), and
      once with two single-threaded measurement scripts alongside it (64 of 80 races failed). It is
      the last thing done before the report, with nothing else on the machine.

      **WHY TEN AND NOT ONE — the trade, measured rather than assumed.**

      > ★ **CORRECTED 2026-09-06 (NIGHT-2026-09-05 piece 3). THE SENTENCE THAT STOOD HERE WAS WRONG,
      > AND IT WAS WRONG IN THE DIRECTION THAT MATTERS.** It read: *"The fixed cost dominates: a
      > build, two servers and a browser is about 200 s before any race runs, so the races themselves
      > are cheap at the margin."*
      >
      > **MEASURED, WITH TIMESTAMPS, on 2026-09-05:** `node scripts/viewer-invariants.mjs --gate`
      > was run once with every line of its output stamped against the process start. The sweep
      > build finished at **3.2 s**, the isolated stack (API, app server, browser) was up at
      > **5.2 s**, the first race started there, the last race was home at **262.6 s**, and the run
      > ended at 263.7 s.
      >
      > **So the fixed cost is about 5 s, not 200 — it is 2% of the run, and the races are 98%.**
      > The old sentence had it exactly the wrong way round, and the conclusion drawn from it — that
      > extra races are cheap at the margin — does not follow from the fixed cost at all.
      >
      > **WHAT MAKES EXTRA TRACKS CHEAP IS CONCURRENCY, NOT SETUP.** `viewer-invariants.mjs:814`
      > runs races **six at a time** by default, and `:877` starts that many workers. Two races
      > therefore overlap: on the measured run one finished at 209.2 s and the other at 262.6 s, and
      > the run's wall clock is the SLOWER of them, not their sum.
      >
      > ★ **WHAT A GATE OF FOUR TRACKS WOULD COST, and which part of this is measured.** Four races
      > still fit in one wave of six, so the wall clock stays bounded by the SLOWEST race rather than
      > growing with the count — roughly a 2-race run, not double it. **That bound is measured; the
      > four-track figure is NOT.** Four concurrent Chromium races contend for the machine in a way
      > two do not, so the true number is somewhere between the slowest single race and the sum, and
      > only a four-track run would settle it. It has not been run, and this note does not guess one.
      >
      > **The table below is left as it was**, because its wall-clock column was measured and is not
      > what was wrong; what was wrong is the sentence that explained it. The 1-race figure (267 s)
      > against the measured 2-race run (263.7 s) is itself evidence for concurrency rather than for
      > a large fixed cost.

      | scope | wall clock | what it holds |
      | --- | --- | --- |
      | 1 race — space-sprint | **267 s** | the JUMP extreme: the worst single-frame step on any track (0.0339 ln, twice the next). It is also the track the founding defect was found on. |
      | 2 races — space-sprint + city-circuit | **340 s** | both extremes of every column: the above, PLUS the widest frame (10.9 corridors, 4x river-run) and the longest standstill (1050 ms, 5x space-sprint's 200) |
      | 10 races — `--gate` today | **671-885 s** | the eight tracks that sit strictly INSIDE both extremes on every column |

      **ONE RACE IS NOT ENOUGH, and the reason is structural rather than statistical.** An open track
      and a closed one are different regimes in the endgame — on a closed track the finish is most of
      a lap away at the threshold, so the shot opens to the whole world — and space-sprint cannot
      stand in for city-circuit on any column that matters: it is 6.6 corridors against 10.9, and
      200 ms of standstill against 1050.

      **WHAT THE OTHER EIGHT BUY IS NOT NOTHING, BUT IT IS NOT MUCH EITHER, AND THE NUMBER IS ZERO SO
      FAR.** Across both full 80-race sweeps on record, the gate's own scope — seed 9, shipped arm,
      all ten tracks — produced **0 invariant events**. Every violation those sweeps found sits at
      seed 2, which `--gate` does not run. The eight extra tracks are a regression net, not a
      detector: they have never caught anything, which is what a clean net looks like and is also
      what an inert one looks like (Lesson 209).

      **THE OWNER TOOK IT, 2026-08-25: `--gate` is now the two-race scope** (CHECK-COST-POLICY-1).
      Measured after the change: **200 s clean.**

      **PROVED IN BOTH DIRECTIONS, which is what every skip in this project owes.** The reduced gate
      still passes clean, and it still goes RED on both sabotage arms — `--sabotage-corner` exits 1
      with 154 crossing violations, `--sabotage-noline` exits 1 with 4. A gate that could not fail
      would be the cheapest of all and worth nothing.

      **AND THE LIMIT OF THAT PROOF, stated rather than assumed away.** The sabotage arms drive the
      CROSSING check only. The five WINDOW invariants have no sabotage arm, and in the gate's own
      scope they have never been observed red — the violations both 80-race sweeps found sit at
      seed 2, which the gate does not run. So the window half of this gate is a REGRESSION NET whose
      red has not been demonstrated at this scope, and that is a known gap, not a settled question
      (Lesson 209).

      **WHAT THE TWO-RACE SCOPE NO LONGER COVERS:** the eight other tracks' own geometry, and any
      per-track drift that stays WITHIN the envelope these two define. A defect needing one of those
      curves now reaches the NIGHTLY sweep rather than the pre-merge gate — a day later, not never.

      **One of the ten was recorded NOT SCORABLE**: garden-path's race was said never to finish at
      seed 9, so it contributed nothing to the twelve items.
      **★★ THAT IS FALSE, MEASURED ON THIS HARNESS 2026-09-04 (GP-SPEC-TRIM-1)** — one race, 255 s:
      garden-path reaches PHOTO_FINISH with the winner on canvas and IS graded, passing ten of the
      twelve and **failing two** (item 9, winner cut; item 10, walk). **The gate's scope is not
      changed here** — what reddens a build is the owner's call — but the ground it stood on is gone:
      not running the track does not cost nothing.
      *(Wording corrected 2026-09-05, GATE-WIRED-AND-CAUSED-1: this read "excluding the track". There
      is no exclusion — `GATE_TRACKS` NAMES the two tracks `--gate` runs, and the harness keeps the
      geometries on that list. Eight of the ten are simply not named, and the ones that get discussed
      have no standing the rest lack.)*
      *(It was flagged DOUBTFUL here on 2026-09-03 rather than corrected, because two OTHER harnesses
      had retracted the same claim and settling a third on their evidence is the exact mistake
      BACKLOG-VERDICTS-1 made about this track. The race that settles it was run a day later.)*

      **What it costs a ship:** 200-340 s, plus the one-off `npx playwright install chromium`. It needs
      no network and touches nothing of the owner's — it builds to `client/dist-sweep`, runs its own
      API on its own port with an empty data directory, and creates its own account, for the reason
      E2E-LOGIN-1 gives. Delete `client/dist-sweep` afterwards; it is gitignored.
- [ ] **1. Paired measurement — the gate.** Run the quartet, paired seeds, against the **CURRENT
      shipped world** — `scripts/exp-flapping-gate.mjs --nlist=100`, where the command carries the race
      count so no second copy of it can drift. Paired means the same seed sequence for both arms; the
      baseline is the fingerprint that is shipped RIGHT NOW, **never gold numbers copied from another
      run** (a stale gold number silently compares against the wrong world). **The FAIRNESS thresholds
      are NOT restated here — [FAIRNESS.md §Permanent gate lines](FAIRNESS.md) is their one home**, and
      that now includes the per-start-row check `rowMin`, which moved there because it IS a fairness
      quantity — and which is a NO-REGRESSION line: a change must not make any start row worse than the
      shipped world. The gate is green when those hold and band arrival has not regressed on any track.
      Do not proceed on a red gate.
- [ ] **1a. The RUNAWAY BUDGET — and it lives HERE, not in FAIRNESS.md.** **Pooled runaway-winner rate
      ≤ 5%, reported per track as well as pooled.** A runaway winner is **action quality, not
      fairness**, and [PROJECT-PRINCIPLES §8](PROJECT-PRINCIPLES.md) already rules action quality out
      of the fairness gates in as many words — `corrP1` is excluded for exactly this reason. Stating
      the line here rather than there is that ruling applied, not an oversight; **do not re-open it.**

      **The budget is the owner's, 2026-08-12, and his words are the evidence:** _"3 % ist total ok,
      das ist ja auch ein möglicher Rennausgang — wenn es nicht zu oft vorkommt, passt das."_ — "3% is
      totally fine, that is a possible race outcome after all — as long as it doesn't happen too
      often, that's OK."

      **THE BASELINE IS THE MEASUREMENT THAT SET IT** ([GATE-LINES-1](../reports/night/GATE-LINES-1.md),
      2026-08-12, N=100 per track): **2.8% pooled** over 400 races — searound 7.0%, luger-hill 3.0%,
      space-sprint 1.0%, seatrack 0.0%. **searound is the known outlier and is recorded as one rather
      than averaged away**: a pooled number that hides a single track at more than double the budget
      would be the same kind of silence this line was written to end.

      **Read the once-per-run RUNAWAY CONTROL line the harness prints**, every time. Until 2026-08-12
      three harnesses read a property that did not exist and reported `0%` on every track of every
      ship; the control exists so that a rate which is identically zero has to be stated as a result
      instead of passing as a number.
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
      or a human trips over it. **For the SHIP tag, the register line goes on the BRANCH before the
      merge** — see THE SHIP ORDER above, which owns that sequence.
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
      trusted only while live == replay ([LESSONS.md L191](LESSONS.md)). **Serve a PRODUCTION build
      for the eye test, not the dev server** — [VERIFY-RULES.md](VERIFY-RULES.md) R10 owns that rule
      and the one command that does it — and never let a stale bundle be judged.
- [ ] **11. Run the three guards before the commit.** `node scripts/check-doc-links.mjs`,
      `node scripts/check-index.mjs`, `node scripts/check-tags.mjs` — all three green. Plus the full test
      suite + `eslint` + `build`. These are the cheap catches for the drift a human reviewer cannot see.
- [ ] **12. Commit, push, verify — AND THE SHIP IS NOT FINISHED AT THE PUSH.** It is finished when CI
      reports **success for that exact SHA**. Read it, and put the run id in the report.

      **Why this is a step and not a habit.** Three pushes in one day ended at "pushed" while the red
      arrived afterwards, and master stayed broken for three hours because nobody was still looking.
      A push is a request; the run is the answer. Check the HEAD SHA rather than the branch — a
      branch view can show you a green run for the commit before yours:

      ```bash
      gh run list --branch master --limit 1 --json headSha,databaseId,status,conclusion
      gh run watch <id> --exit-status
      ```

      **A red run is not finished work with a footnote.** Either fix it and push again, or revert.
      The ceremony has no state in which master is knowingly left red.

      One clear commit; push; confirm with `git log origin/master
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

| Fact                                                    | Canonical home                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Fairness definition + gate lines + documented residuals | [docs/FAIRNESS.md](FAIRNESS.md)                                           |
| Fingerprint lineage (ON/OFF hashes, reproduction notes) | [docs/SIM.md](SIM.md)                                                     |
| Current baseline (shipped world, gate numbers)          | [reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md) top block |
| Tags (permanent anchors + register)                     | [docs/TAGS.md](TAGS.md)                                                   |
| Report map (what each evolution report is)              | [reports/evolution/INDEX.md](../reports/evolution/INDEX.md)               |
| Laws / lessons                                          | [docs/LESSONS.md](LESSONS.md)                                             |
| Closed approaches / dead ends                           | [docs/DEAD-ENDS.md](DEAD-ENDS.md)                                         |

If a fact needs to appear in a second place, link to its home — do not paste it.

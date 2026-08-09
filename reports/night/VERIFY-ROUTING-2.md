# VERIFY-ROUTING-2 — the routing comes from the guards

**Branch:** `feat/verify-routing-2`, off `feat/archive-corridor-overlay`. One strand. Not merged,
not minted.

## The cleanup, first

`feat/ceremony-hold-centre-1` is **deleted at origin**. Nothing on it was unique: 0 commits not in
HEAD, its report byte-identical to the landed copy, its INDEX entry present. (Its raw
`git diff HEAD..branch` lists 200+ files, which is only "the branch is 30 commits behind" — the
question is what it *adds*, and that is nothing.)

## What of VERIFY-ROUTING-1 still applies, and what the two rewrites made obsolete

**The design survives whole. The diff would not have.**

| still applies | |
|---|---|
| Guards declare; nothing keeps a table in step | the entire point |
| `--declare` as a subprocess, not an import | several guards do their work at module load; a router that ran a four-minute fingerprint to learn its dependencies would be worse than the table |
| SELF computed from the import closure, never declared | closes miss 3 for every guard at once |
| REACH declared but cross-checked; DIRS/FILES plain | the taxonomy is right |
| `blind` required and non-empty | the hole is written by whoever knows it |
| an undeclared guard is REPORTED, never given an invented route | |
| `reasonFor` prints the declaration, not a sentence | machine-checkable skip lines |
| the PENDING line | still needed — see below |

| the two rewrites made obsolete | |
|---|---|
| its `cmd`/`cwd` inside the declaration | VERIFY-COST-3 added `cheapArgs()`, and `check-index` needs three invocations. **Argv now lives in `commandFor()` in verify.mjs, with the flags; declarations are purely about ROUTING.** Mixing the two is what would rot. |
| its `plan()` | predates VERIFY-BASE-1, so it had no empty-plan refusal. Kept and re-tested. |
| its per-guard `matches()` as the whole story | predates VERIFY-COST-2's INERT hull rule, which is a per-RUN exception, not a per-guard property. `plan()` still applies it to `world-fingerprint` only. |
| a change to `engineReach` to take an entry | not needed — it already accepts one today |

## The gap found at the ship, closed

`doc-guards` was a **bundle** — nine guards behind one route — and a bundle can only have one
dependency set. That is how eight members inherited "markdown changed" as their trigger. **It is
gone**; they are nine tasks, each on its own declaration.

**BEFORE → AFTER, four diffs:**

| diff | before | after |
|---|---|---|
| **JS-only** `camera/framingConfig.js` | camera-fp, client-suite, containment, render-fp | + **check-config-keys**, **check-fallback-agreement**, **check-measured-stamps**, check-writable |
| **markdown-only** `docs/VERIFY-RULES.md` | doc-guards, containment | check-config-claims, check-doc-facts, check-doc-links, check-measured-stamps, check-writable, containment |
| **scripts-only** `check-fallback-agreement.mjs` | containment, script-suite | + **check-fallback-agreement itself** |
| **engine** `raceBehavior.js` | client-suite, containment, world-fp | + **camera-fp**, **render-fp**, check-config-keys, check-fallback-agreement, check-writable |

Markdown-only lost `check-index` and `check-tags`, and that is correct and tighter: a change to
`docs/` cannot break a reports index, and `check-tags` depends on `docs/TAGS.md`, not on markdown in
general.

### Six misses now covered — the four documented, plus two found here

1. **client matcher too narrow** — `client-suite` declares `dirs: ["client/"]`. ✅
2. **`client/vitest.config.js` skipped the suite** — same declaration. ✅
3. **a guard's own instrument changing did not run it** — SELF closure, by construction, for every
   guard that exists or will exist. ✅
4. **`check-measured-stamps` routed by markdown while depending on the camera** — it declares
   `client/src/modules/camera/`. ✅
5. **NEW, the ship gap** — the config guards were unreachable from a JS change. ✅
6. **NEW, found by building this** — an **engine** change now runs the camera and render
   fingerprints. Both harnesses drive a real seeded race, so a change to the RACE changes what the
   director decides and therefore what is drawn. The old table said they cared only about `camera/`
   and the drawing path. **This costs two fingerprints (~5 min) on engine blocks.** The alternative
   is a fingerprint that cannot notice the thing that moved it. ✅

## The two that must not be lost — tested, not asserted

| | |
|---|---|
| **VERIFY-BASE-1's refusal** | 5 tests: the plan-is-empty consequence, the base==HEAD diagnosis, four distinct causes, the safety direction, and an **end-to-end run against a throwaway git repo** asserting exit 2 and the word REFUSED |
| **VERIFY-COST-3's flags** | `cheapArgs()` forwarding, and the unknown-flag refusal |

**The six reader-facing cases, re-run on a clean tree — every exit code identical to VERIFY-BASE-1:**

| case | exit |
|---|---|
| feature branch, no argument | **0** (24 files) |
| on master (base == HEAD) | **2** REFUSED |
| master with a real `--base` | **0** |
| detached HEAD | **0** |
| base that does not resolve | **2** REFUSED |
| base sharing no history | **2** REFUSED |
| `--base=HEAD`, clean tree | **2** REFUSED |

No change, so no finding and no stop.

## The PENDING line, and why I am the reason it earns its place

`check-measured-stamps` reads git **history**. Run before the commit, it has nothing to compare and
passes — for a reason that has nothing to do with the work being sound. **In MIN-RACERS-5 I ran it
that way, saw green, and CI went red on the same stamp minutes later.**

It now reads the working tree and reports uncommitted changes that will make a stamp stale once
committed. A **REPORT, never a failure** — failing would make it un-runnable mid-edit. The count
prints **even when zero**, so "no PENDING" is a statement rather than an absence. Demonstrated: with
an uncommitted edit under `client/src/modules/camera/` it names the file and still exits 0.

## Verification

- `engine-reach --check`: **none of the 16 changed paths can reach the race engine.**
- **`npm run verify` PASS 14 / FAIL 0 / SKIP 1** (only `client-suite` skipped — nothing under
  `client/` changed).
- **The fingerprints DID run, against the block's expectation, and that is miss 3 firing on this
  very commit** — I edited all three fingerprint scripts to add their declarations, so self-coverage
  correctly selected them. All three came back **unchanged**: world `dc4647be0f55ebdb`, camera
  `ad07c08ce5d8ae49`, render `752df7bc61ef0721`. A declaration block and an early-exit branch move
  no behaviour, and that is now measured rather than argued.
- **The pre-commit hook ran** (not bypassed): **GUARDS PASS 7 / FAIL 0**.
- **CI green on the branch** (run `31325214776`, both jobs) — R8 exception 1.
- 32 tests in `verify.test.mjs`; **293 across the script suite**.

## Source hygiene

| file | +/− | what |
|---|---|---|
| `scripts/lib/routing.mjs` | +232 −0 | new — the collector |
| `scripts/verify.mjs` | +112 −208 | **the route table is gone**, and `ROUTES`, `selectedBy` and `FINGERPRINT_RECORD` went with it as orphans. Added `commandFor()` and the NOT COVERED section. |
| `scripts/verify.test.mjs` | +118 −27 | 6 new routing tests; 3 existing tests updated to the new (broader, correct) routing, each saying **why** it changed so it does not read as loosening |
| `scripts/check-measured-stamps.mjs` | +52 −1 | the PENDING pass |
| 13 guard scripts | +~20 each | a `GUARD` declaration and a `--declare` branch |

**Net −96 lines in `verify.mjs`.** Nothing was left orphaned.

### Noticed but left

- **`--declare` costs ~2.1 s per verify run** (13 short-lived processes). Against runs of minutes,
  and it buys a routing that cannot fall behind. Cached per process, so `plan()` pays once.
- **`check-writable` declares `everything`** and so runs on every diff (~25 s). Defensible — any
  tracked file can become an unwritable OneDrive placeholder — but it is the one always-on guard
  whose cost is not trivial. Worth revisiting if verify's floor matters.
- **A tag pushed without touching `TAGS.md` is invisible to routing** — no file changed, so verify
  cannot select `check-tags`. Now written into that guard's own `blind` list; the hook and CI run it
  unconditionally, which is where the case is caught.
- **`git stash -u` is unsafe in this repo.** I used it to get a clean tree for the six cases and it
  failed partway on OneDrive permission errors, leaving a stash that would not pop. Nothing was
  lost — the working tree still held everything and the stash was a byte-identical duplicate, which
  I verified before dropping it — but the right move is to commit first and measure after, which is
  what I did.

## `feat/verify-routing-1` is superseded

All **four** of its documented misses are covered, and two more with them. Its design is implemented
here against the current `verify.mjs`; its diff is not, and should not be merged — it would resolve
three versions of one file against each other. **The owner decides what happens to that branch**; if
it is dropped, its report is the thing worth landing, by the pattern ARCHIVE-CORRIDOR-OVERLAY just
used.

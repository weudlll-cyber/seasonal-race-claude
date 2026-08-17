# CENSUS-REST-1 — the documents stop claiming cover they do not have

**Branch:** `docs/census-rest`, off master `cce4b03f`. **No production file changed. No guard logic
changed.** One living document and five declaration/comment blocks.

**Everything here is text.** `covers` and `blind` are printed by `verify` and never consulted for
selection — routing reads `dirs`, `notDirs`, `files`, `reach` and `exclusive`, none of which is
touched. So no guard runs on a different set of files than it did before.

---

## 1. `SHIP-CEREMONY.md` NO LONGER PROMISES AN INSTRUMENT THAT DOES NOT EXIST

The three-fingerprint table's render row read *"…`Minimap.js`, **the racer types' `drawRacer`**"* —
telling a reader that changing how a racer is drawn is covered. **It is not, in two independent
ways, and both are measured:**

```
render-fingerprint | closure 55 files | racer-types members: NONE
camera-fingerprint | closure 36 files | racer-types members: NONE
engine-reach --check client/src/modules/racer-types/SpriteRacerType.js  ->  cannot reach the engine
```

- **Routing can never select it.** A diff confined to a racer type is inside no instrument's
  closure, so following that row required a human to remember it.
- **Even when run, the instrument is blind to the sprite.** `RENDER-FINGERPRINT-1` §"blind to"
  already says node has no `Image`, so the racer body falls back to its procedural branch.

The name is removed and replaced by a paragraph stating plainly that **a change to how a racer is
drawn is covered by the owner's eye and by nothing else**. That is defensible — it is what the
render fingerprint's own blind list declares — but the table must not read as though an instrument
has it. **Widening the instrument is a decision and stays on his list.**

---

## 2. FOUR GUARDS NOW DECLARE THE HOLES THE CENSUS FOUND

Each of these was true before this branch and undeclared. A declaration that omits a hole is worse
than no declaration, because `verify` prints it as though it were complete.

| guard | what it now admits | census finding |
| --- | --- | --- |
| `check-fallback-agreement` | an **object or array literal** fallback is a mirror it has never counted — `NULLISH` matches only a scalar or a `SCREAMING_CASE` name. Two copies of `b2AttackProgress` existed and were converted by MIRROR-CENSUS-1 **while invisible here** | 12 |
| `check-measured-stamps` | a **test-only edit** inside a `depends=` directory is the same false positive as the comment case and more common — routing selects on the DIRECTORY, so a camera test reports the tracking-lag stamp stale although no test can move a median. Also: it **scans** repo-root `*.md` but does not **route** on it | 13, 10 |
| `check-doc-links` | the same repo-root gap, with the experiment that proved it: one blank line appended to `README.md`, then `npm run verify --dry` — the only guards it selected were the three declared always-on | 10 |
| `check-index` | it walks **3 of the 14** directories under `reports/`. 245 tracked `.md` are covered; **329 are not** | 11 |

**The `check-index` number is the one worth reading twice.** Most of the 329 is archived sweep
output, but `proposals/` holds 17 and `audit/` held **the only copy of a critical finding** until it
was rescued on 2026-08-18. The guard is narrow by decision; it now says so with the figure beside it.

---

## 3. `guardScripts()` SAYS IT DOES NOT RECURSE

`readdirSync` reads the top level of `scripts/` only, so a guard in a subdirectory would be
discovered by nothing, routed by nothing and run by nothing — **silently, because nothing counts what
it did not find**. There are none today, so this is latent.

It is recorded next to the code because its sibling had exactly this bug: `scriptTestFiles()` used a
`scripts/*.test.mjs` pathspec that matched 17 files while CI's `find` matched 18, and was moved to
`git ls-files` for it. Two discovery mechanisms disagreeing is the defect class; this is the half
that has not bitten yet.

---

## WHAT WAS DELIBERATELY NOT DONE

The brief said not to start anything that changes behaviour, however small. These were each one line
away and left:

| finding | the one-line fix | why not here |
| --- | --- | --- |
| **9** — `verify.mjs`'s `scriptTestFiles()` catches a git failure and returns `[]`, then runs `node --test` with no arguments | `throw` instead of returning `[]` | it changes what `verify` does when git fails — the verify path itself, which R8 says CI must clear first |
| **10** — the repo-root routing gap | add `""` / the root to two `dirs` | changes which guards run on which diffs |
| **11** — `check-index`'s 11 unscanned directories | add them to `dirs` and give each an `INDEX.md` | would fail immediately on hundreds of unindexed archive files; a project, not a line |
| **12** — the object-literal blind spot | widen `NULLISH` | a guard change that must be proved in both directions |
| **7** — `racer-types/` covered by no instrument | widen the render fingerprint's reach | a decision about what the instrument is for |
| **14** — 43 config values in living documents, 15 disagreeing with source | — | all on dated rows, all legitimate history; nothing to fix |

---

## VERIFICATION

**No fingerprint is owed**, by closure walk: `docs/`, `scripts/lib/routing.mjs` and the four guard
scripts are inside none of the three instruments. No production file is in the diff.

All four amended guards still answer `--declare` with valid JSON, and `npm run verify --dry` still
enumerates the full guard set (48 declaration lines), so nothing became undiscoverable by being
described more honestly.

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `docs/SHIP-CEREMONY.md` | render row corrected; a paragraph replaces the removed name |
| `scripts/check-fallback-agreement.mjs` | +1 blind entry |
| `scripts/check-measured-stamps.mjs` | +2 blind entries |
| `scripts/check-doc-links.mjs` | +1 blind entry |
| `scripts/check-index.mjs` | +1 blind entry |
| `scripts/lib/routing.mjs` | +1 comment paragraph on `guardScripts` |

Tests added: 0. Tests deleted: 0. Tests re-blessed: 0. **No test asserting a literal was rewritten
in this piece** — the two candidates the census named (`framingConfig.test.js:60`'s bare-caller
`toBe(500)`, and `cameraTimingComputation.test.js`'s vacuous round trips) both need a decision about
what the test is FOR, which TEXT-TRUTH-1 already recorded and which is not a documentation change.

---

## PROPOSALS

### Proposal A — a guard's declaration should be checked against itself

Four declarations were wrong in the same direction: each claimed cover it did not have. Nothing could
notice, because `covers` and `blind` are prose that only a human reads.

**The cheap half is mechanical and worth having**: for every guard, assert that each path in its
`dirs` exists, and that any directory named in `covers`/`blind` prose appears in `dirs` or is
explicitly called out as scanned-but-not-routed. That would have caught the repo-root gap in both
guards the day it appeared. It is a rule inside `verify.test.mjs`, not a new guard — R13's first
question has an answer here.

### Proposal B — decide `reports/` once: index it or declare it archive

`check-index` covering 3 of 14 directories is defensible only while the other 11 are genuinely
archive. Two of them are not: `proposals/` is live enough that the last audit landed there, and
`audit/` held a critical finding with nothing watching it.

**The decision is cheap and the drift is not**: either add those two to the guard and give each an
`INDEX.md`, or move the remaining nine under a single `reports/archive/` so the boundary is visible
in the tree rather than only in a guard's blind list. Either answer makes "is this report indexed?"
a question with one obvious answer.

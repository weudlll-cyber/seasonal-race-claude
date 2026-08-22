# REACH-REFUSES-1 — the tool answered zero when it had been asked nothing

**Date:** 2026-08-22 · **Branch:** `fix/engine-reach-refuses` off master `6cfbae1a`
**Piece 4 of NIGHT-2026-08-22.** Tooling change — the guard/verify path, not the fingerprints.

---

## §1 — THE DIAGNOSIS, BEFORE ANY REPAIR

**The symptom on record:** on this tree `engine-reach --check` answered `none of 0 path(s)` while
the pre-commit hook's own invocation, seconds later on the same tree, correctly named
`storage/defaults.js`.

**The candidates the brief listed** — arguments, diff base, staged versus working tree, cwd — and
what the source says about each:

| candidate | verdict |
| --- | --- |
| **arguments** | **THIS IS IT.** See below. |
| diff base | not involved. `--base=` only reaches `splitInert`, which runs *after* paths exist. With no paths it is never consulted. |
| staged vs working tree | **not involved, and this is the part an earlier report got wrong.** `--check` reads no tree to decide *what to check*. |
| cwd | not involved. `ROOT` is derived from the script's own `import.meta.url`, so the script is cwd-independent for path resolution. |

**The mechanism, at source.** `scripts/engine-reach.mjs` built its work list like this:

```js
const wanted = process.argv.slice(checkIdx + 1).filter((p) => !p.startsWith("--")) …
```

With nothing after `--check`, `wanted` is `[]`, `inHull` is `[]`, `hit` is `[]`, and the script fell
straight through to:

```js
console.log(`ENGINE REACH: none of ${wanted.length} path(s) can reach the race engine.`);
process.exit(1);
```

**`none of 0` is the literal empty-argument case.** Reproduced on this tree before changing anything:

```
$ node scripts/engine-reach.mjs --check
ENGINE REACH: none of 0 path(s) can reach the race engine.
exit=1

$ node scripts/engine-reach.mjs --check --base=master     # flags only — the same empty list
ENGINE REACH: none of 0 path(s) can reach the race engine.
exit=1
```

**And the difference between the two invocations is one line in the hook**, `.githooks/pre-commit:159`:

```sh
staged=$(git diff --cached --name-only)
if [ -n "$staged" ]; then
  if node scripts/engine-reach.mjs --check $staged …
```

**The hook guards its call and therefore can never produce the 0-path case.** A hand-typed call
substituting `$(git diff --name-only)` on a clean tree has no such guard: the substitution expands to
nothing, `--check` receives no arguments, and the tool answers about the empty set it was handed.

### §1a — A CORRECTION TO AN EARLIER DIAGNOSIS, and it matters because it points elsewhere

`SHIP-COORD-SYSTEM`'s INDEX entry records this trap as:

> bare `engine-reach --check` on a committed merge reports `none of 0 path(s)` because **it reads the
> WORKING tree**, which a merge leaves clean

**`--check` reads no tree.** The clean working tree is why the *caller's* substitution came back
empty; it is not something the tool inspected. The distinction is not pedantic — "it reads the
working tree" invites the fix *give it a better tree to read*, and the actual fix is *refuse when
handed nothing*. **The advice in that entry — "that is the tool saying it was asked nothing, not a
clearance" — was exactly right**, and is now enforced rather than remembered. Recorded in the
CORRECTIONS block of `reports/evolution/INDEX.md`, since that report is append-only.

*(The working tree **is** read further down, by `splitInert`, when deciding whether a hull path's
change is comments-and-whitespace only. That is a different question and is reached only once paths
exist.)*

## §2 — A SECOND FALSE CLEARANCE, found while reproducing the first

```
$ node scripts/engine-reach.mjs --check client/src/modules/storage/defaults.js
ENGINE REACH: client/src/modules/storage/defaults.js is in the hull but INERT — byte-identical
ENGINE REACH: none of 1 path(s) can reach the race engine.
```

**`defaults.js` can absolutely reach the race engine — it is in the hull, and the line above says so.**
The sentence is false as written. Two different facts were printing as one:

- **not in the hull** — cannot reach the engine, ever, from any diff
- **in the hull but unchanged against the base** — reachable code, this diff does not touch it

The first is a property of the file. The second is a property of the diff. A reader who sees "cannot
reach the race engine" about `defaults.js` learns something untrue about the tool, which is exactly
how the §1a mis-diagnosis got written.

## §3 — THE REPAIR

**The rule: a tool that cannot see the diff must REFUSE, not answer zero.** Exit **2** — already this
script's code for the empty-closure and dynamic-import refusals, and the same convention `npm run
verify` uses in R0a, where 2 means refused and 1 means a real answer.

| case | before | after |
| --- | --- | --- |
| `--check` with no paths | `none of 0 path(s)` · **exit 1** | **REFUSED · exit 2**, stdout empty |
| `--check` followed only by flags | `none of 0 path(s)` · **exit 1** | **REFUSED · exit 2** |
| `--base=` that does not resolve | every path counted as a hit · exit 0 | **REFUSED · exit 2** |
| paths given, none reach | `none of N … can reach the race engine` | `none of N … carry a change that can reach the race engine`, then the two facts named separately |
| paths given, some reach | exit 0, listed | **unchanged** |
| bare listing mode (no `--check`) | 36 files | **unchanged** |

**On the unresolvable base.** Before, an unresolvable ref reached `splitInert`, every `git show`
threw, and the `catch` counted each path as a hit. That is the *safe* direction — but for the wrong
reason, and the output was indistinguishable from a genuine hit. A ref that is not a ref is a broken
question, not an answer.

## §4 — AN OVER-REACH I BUILT, CAUGHT BY PROVING THE OTHER DIRECTION, AND REMOVED

**Worth recording in full, because the brief's "prove BOTH directions" is what caught it.**

I first also refused when `--base=` resolved to the **same commit as HEAD**, reasoning by analogy to
R0a: on master after a merge, base `master` *is* HEAD, every hull path compares byte-identical, and
the old message then said "cannot reach the engine" about paths whose change had just shipped.

**Proving the working direction showed it was wrong.** On a fresh branch with no commits yet, HEAD
*is* master — so the refusal fired for **ordinary uncommitted work**, which is the case the tool is
most useful for. Worse: the pre-commit hook tests the exit code with a shell `if`, so exit 2 is
indistinguishable from exit 1 there and **the mint tripwire would have gone silently dark on every
first commit of a branch.** That is strictly worse than the defect I set out to fix.

**The analogy did not hold.** R0a is about `npm run verify` *computing* a diff from a base; this tool
is *given* its paths and never computes one. And the trap the refusal was aimed at is already handled
honestly by §3's message fix: `splitInert` correctly reports such a path INERT, and the output now
says *in the hull but inert against `master` — reachable code, unchanged content*, which is true.

**Removed before commit.** Re-proved afterwards: a real uncommitted change to `defaults.js` still
answers `1 of 1 path(s) can change the race`, exit 0, and the hook's own two lines still print
`! THIS DIFF CAN CHANGE THE RACE`.

## §5 — PROVED IN BOTH DIRECTIONS

**The failing invocation now refuses:**

```
$ node scripts/engine-reach.mjs --check                          → exit 2, REFUSED, stdout empty
$ node scripts/engine-reach.mjs --check --base=master            → exit 2, REFUSED
$ node …--check raceCore.js --base=definitely-not-a-ref-fbb01d   → exit 2, REFUSED (ref does not resolve)
```

**The working invocation still answers as today:**

```
$ node …--check client/src/modules/storage/defaults.js      (with a real edit)
ENGINE REACH: 1 of 1 path(s) can change the race:
  client/src/modules/storage/defaults.js                        → exit 0

$ node …--check docs/BACKLOG.md defaults.js                 (with the real edit)
ENGINE REACH: 1 of 2 path(s) can change the race: …             → exit 0

$ node …--check docs/BACKLOG.md defaults.js                 (clean tree)
ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): docs/BACKLOG.md
  1 IN the hull but inert against master — reachable code, unchanged content.   → exit 1

$ node scripts/engine-reach.mjs                                  → 36 files, exit 0 (unchanged)
```

**And the pre-commit hook was re-proved by running its own two lines** against a staged edit to
`defaults.js`: the tripwire fires and names the file.

**Five CLI tests added to `scripts/engine-reach.test.mjs`** — 11 pass, 0 fail. They guard the exit
*contract*, which is the part callers act on, and one of them exists specifically because exit 1 and
exit 2 are both "non-zero" to a shell `if` and the regression would otherwise be invisible.

**One test of mine was wrong and was fixed rather than weakened:** it asserted the string
`none of 0 path` appears nowhere, but the refusal message *quotes* that sentence in order to explain
it. Scoped to stdout instead — a refusal must print no answer for a caller to parse — which is the
stronger property anyway.

---

## VERIFICATION

**R15 governs.** Tooling change: the guard/verify path, not the fingerprints — as the brief directs.

| instrument | ran? |
| --- | --- |
| `scripts/engine-reach.test.mjs` | **RAN** — 11 pass, 0 fail |
| `npm run verify` | **RAN** — this change is *to* the verify path, so its own guards are the relevant check |
| pre-commit hook tripwire | **RAN, deliberately** — re-proved by hand against a staged hull edit, because §4 is a regression only this catches |
| world / camera / render fingerprints | **NOT RUN, and the answer was already determined.** Nothing under `client/src` changed. The two source files are `scripts/engine-reach.mjs` and its test; the rest are documents. **The engine cannot read a guard script.** |
| client suite, browser gate, 80-race sheet | **NOT RUN** — R15a and R15c |

**Stated plainly because it looks circular and is not:** `engine-reach` is the tool that decides
whether a fingerprint is needed, and it was modified. It was *not* used to clear itself — the
clearance above is a statement about which files this branch touches, which is readable from
`git status` without asking the tool anything.

## BUILD VERSUS SPEC — conformity

| the spec asked | what happened |
| --- | --- |
| diagnose before repairing; find how the two invocations differ (arguments, diff base, staged vs working, cwd) | done — §1. **Arguments.** The other three are eliminated at source, and an earlier report's contrary explanation is corrected in §1a |
| repair by: a tool that cannot see the diff must REFUSE, not answer zero | done — §3, exit 2, stdout empty |
| if the base cannot be inferred, exit non-zero saying so | done — exit 2 naming the ref as the problem |
| prove both directions | done — §5, and §4 is the case where proving the *working* direction killed a change I had already written |
| run the guard/verify path, not the fingerprints | done — see VERIFICATION |

## SOURCE HYGIENE

| | |
| --- | --- |
| `scripts/engine-reach.mjs` | 215 → 274 lines |
| `scripts/engine-reach.test.mjs` | +5 tests, +1 CLI helper (`runCli`) |
| `docs/SHIP-CEREMONY.md`, `docs/GLOSSARY.md`, `docs/VERIFY-RULES.md` | the exit contract corrected in all three — each said "exits 0 if any of them can" and none mentioned a refusal |
| removed | the base==HEAD refusal (§4), before commit |
| extracted | `base` hoisted out of the `splitInert` call, so the ref is validated once and used twice rather than re-sliced |
| shipped source changed | **none** |

**NOTICED BUT LEFT:**

- **The hook calls the tool TWICE** — once for the `if`, once to print (`pre-commit:160` and `:163`).
  Pre-existing, costs a second walk of the closure, and out of scope.
- **A shell `if` cannot tell exit 1 from exit 2.** The hook is safe because it can never provoke a
  refusal, but any future caller written the same way would treat a refusal as a negative. The
  contract is now documented in three places and tested; making callers *check for 2* is a separate
  decision.
- **`splitInert`'s catch counts an unreadable base version as a hit.** Still true, still the safe
  direction, and now unreachable for a *wholly* bad ref since §3 refuses first. A ref that resolves
  but lacks one path still lands there, which is correct — a file that is new on this branch has no
  base version and genuinely counts.

## PROPOSALS — for the owner, nothing done

1. **Make the pre-commit hook distinguish a refusal from a negative.** Capture the status and print
   a loud line for `2`, since a silent tripwire is the failure mode the whole script exists to
   prevent. **Cost:** the hook must not start blocking commits — it prints, never vetoes, by design —
   so this is three lines of shell that must be careful to stay non-fatal. **Value:** low today
   (the hook cannot provoke a refusal), rising the moment anyone adds a second call site.
2. **Give `--check` a `--from-diff=<base>` mode that computes the path list itself.** Every caller
   today builds the list with a command substitution, and the empty expansion is the whole defect —
   a mode that derives the list internally cannot be handed nothing, and can refuse precisely when
   the diff is genuinely unreadable. **Cost:** it moves the "what is the diff" question *into* the
   tool, which is what `npm run verify` already owns (R0/R0a). Two things answering it is the class
   of duplication this project keeps paying for, so it is only right if `verify` then calls this
   instead of the reverse.

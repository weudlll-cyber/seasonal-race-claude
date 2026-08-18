# HOOK-SELF-CHECK-1 — the hook now vouches for itself

**Branch:** `feat/hook-self-check-1`, off master `14883331`. **MERGE APPROVED**, and merged.

## WHAT WAS OPEN

HOOK-TRACKED-1 left it as its **first proposal**: nothing checked that the hooks in the working tree
are the ones the repository **tracks**. `check-hooks-installed.mjs` and R12 answer a different
question — *are hooks in effect* — and neither can answer *is the hook in effect the right one*. A
hand-edited or stale local hook **enforces less than the repository claims and says nothing about
it**, which is HOOK-SILENT-1's failure one level in: the evidence is an absence.

## THE CHANGE — ONE BLOCK, AND IT RUNS FIRST

At the top of `.githooks/pre-commit`, before lint-staged and before the fast guards:

```sh
if ! git diff --quiet -- .githooks/ 2>/dev/null; then   # worktree vs INDEX
  … refuse …
fi
if [ -n "$(git ls-files --others --exclude-standard -- .githooks/)" ]; then
  … refuse …
fi
```

**It compares against the INDEX, not HEAD, and that is the whole design.** The file that just ran is
the working-tree file; the index is what the commit will record. Equal means the hook that ran **is**
the hook being tracked — and that stays true while somebody is legitimately improving the hook,
because they stage it and the commit records exactly what enforced it.

**Comparing against HEAD would have been the obvious choice and it is wrong**: it would make every
change to this file impossible to commit *through* this file, which is a rule that gets removed
within a week. This report names it because it is the first thing a reader will want to "fix".

**The second check is not decoration.** An untracked file dropped into `.githooks/` — `pre-push`,
say — **is run by git** and is tracked by nothing. `git diff` cannot see it; `ls-files --others` can.

## THE CIRCULARITY, NAMED RATHER THAN CLAIMED CLOSED

HOOK-TRACKED-1 named it and it is still true: **a hook that does not run cannot report that it did
not run.** That case belongs to `core.hooksPath` and to `check-hooks-installed.mjs`, which run from
outside. **This block covers the other case — runs, but is not what the repository tracks — which
nothing covered at all.** It is half the problem, and it is the half nobody had.

## PROVEN BOTH WAYS — THREE DEMONSTRATIONS, RUN

| case | result |
| ---- | ------ |
| the **tracked** hook, unmodified | commit lands normally |
| an **unstaged edit** to `.githooks/pre-commit` | **refused** — _"the hook that just ran is NOT what this commit would record"_ |
| an **untracked** `.githooks/pre-push` | **refused**, and the offending path is printed by name |

The second and third were run and the commit log confirms neither landed. **A shell hook is proven by
running it, not by a unit test**, which is why there is no new test file here — and it is why the
three demonstrations are recorded above rather than described.

## ONE HOME

**`docs/VERIFY-RULES.md` gains R12a**, beside R12 where the hook rules already live. It states what
the check covers, what it deliberately does not, why the index and not HEAD, and that
`--no-verify` remains the escape as it is for every other check there.

**No fingerprint can move**: the diff is a shell hook, one living document and this report. The
closure walk puts none of them inside any of the four instruments.

## PROPOSALS

1. **The same question is open for the OTHER direction: is `core.hooksPath` still pointing where R12
   says?** `check-hooks-installed.mjs` asks that at verify time, but nothing asks it at *commit*
   time — and it cannot, for the circularity above. A cheap partial: have the hook print the
   `core.hooksPath` it was reached through, so a wrong-but-present configuration is visible in every
   commit's output rather than only when somebody runs the guard.
2. **`.githooks/` holds exactly one file, and the check is written for a directory.** That is
   deliberate — a second hook is the case the untracked-file check exists for — but it means the
   repository has no `pre-push` and no `commit-msg` while several rules here would suit one (the
   tag/register ordering, for instance). Worth deciding once whether that is an omission or a choice.

# HOOK-TRACKED-1 — the hooks live in the repository, and it shows when they do not run

**Branch `guard/hook-tracked`, off master `0e3eed7b`. Tooling only.** HOOK-SILENT-1 established the
defect; this moves where the hooks live and makes their absence visible. **No new check was added to
the hook itself** — everything it did, it still does.

---

## What was there before, exactly

Read out of the main worktree before anything was replaced.

**`core.hooksPath = .husky/_`** — a **relative** path, set in `.git/config`, pointing at a directory
that `git ls-files` does not list. `.husky/_/.gitignore` contains `*`, so husky's entire runtime is
untracked. The only tracked file under `.husky/` was `pre-commit`.

**Sixteen 39-byte shims** sat in `.husky/_/` — `pre-commit`, `commit-msg`, `pre-push` and thirteen
more — each identical:

```sh
#!/usr/bin/env sh
. "$(dirname "$0")/h"
```

**`.husky/_/h` was the dispatcher.** It derives the hook name from `$0`, looks for `.husky/<name>`,
**exits 0 if that file does not exist**, sources `~/.config/husky/init.sh` if present, honours
`HUSKY=0` as a bypass, puts `node_modules/.bin` on `PATH`, and runs the script as **`sh -e "$s"`**.

**So exactly one hook had any content: `pre-commit`.** Every other hook name dispatched to a file
that was not there and exited 0. What `.husky/pre-commit` ran, in order:

| # | what | blocks? |
| - | ---- | ------- |
| 1 | `cd client`, then `node_modules/.bin/lint-staged` (npx fallback) — ESLint `--fix` + Prettier `--write` on staged `client/src` files | **yes**, `exit 1` |
| 2 | seven fast guards **in parallel**, output replayed in fixed order: `check-fingerprints`, `check-measured-stamps --staged`, `check-config-claims`, `check-doc-facts`, `check-writable`, `check-config-keys`, `check-fallback-agreement`. Prints `GUARDS: PASS n FAIL n` | **yes**, prints `COMMIT BLOCKED` |
| 3 | the mint tripwire — `engine-reach --check $staged`, printing which staged paths can change the race | **no**, informational by design |

**The new `.githooks/pre-commit` runs exactly that.** Proven mechanically rather than asserted: the
body below the new header is **byte-identical** to the old file (`diff` of the old file minus its
shebang against the new file from line 26 — empty).

Two deliberate differences, both recorded in the file:

- **`set -e` is written in explicitly**, because husky supplied it via `sh -e` and two comments in
  the body depend on it (`wait` is used as an `if` CONDITION precisely because a bare failing command
  under that flag would abort before the failure could print). Dropping it would have made those
  comments quietly false.
- **`HUSKY=0` is gone.** `git commit --no-verify` remains the escape, and it is the one the hook
  itself already documents.

---

## The cross-worktree finding, measured before it was relied on

**`core.hooksPath` is SHARED across worktrees on this machine.** `git config --show-origin` puts it
in `.git/config`, which linked worktrees inherit. `extensions.worktreeConfig` is **on**, so a
per-worktree override is possible — but there is no `.git/config.worktree`, and the worktree created
during HOOK-SILENT-1 read the setting back unchanged.

**That decides the design.** The setting was never the problem; the **relative path** was. A relative
`hooksPath` resolves against the worktree root, and `.husky/_` existed in exactly one worktree.
Pointing the same shared, relative setting at a **tracked** directory makes it resolve everywhere,
because the checkout supplies the directory.

**So tracking alone IS enough for worktrees.** Only a fresh **clone** needs anything, because git
config is not cloned.

## The Windows problem, and why it is not a Linux problem

**`core.filemode` is `false` on this machine**, and the old hook was tracked as **`100644`**. Git for
Windows runs a hook through `sh` regardless of the bit, so it worked here — **and git on Linux does
not execute a non-executable hook.** A hook authored on this machine would have been green here and
dead everywhere else.

The setup command sets the bit **in the index** with `git update-index --chmod=+x`, which works from
Windows and is what actually travels in a clone. Verified: `.githooks/pre-commit` is tracked
`100755`, and the fresh clone below received it as `100755`.

## The one command

```
npm run hooks:install
```

`npm install` and `npm ci` run it through `prepare`, so the ordinary first step already does it.
`node scripts/setup-hooks.mjs --check` reports without changing anything. It is idempotent and says
so, and it **refuses** rather than pointing git at a directory that is not there — configuring that
state would look exactly like success and is the state this block exists to end.

**One home for all of it: [docs/VERIFY-RULES.md](../../docs/VERIFY-RULES.md) R12.** Every other
mention points there.

## The guard, and where it runs

`scripts/check-hooks-installed.mjs` catches three states: `hooksPath` **unset** (every fresh clone),
`hooksPath` **pointing elsewhere** (a stale `.husky/_`, a personal override), and `hooksPath` correct
but the **directory or hook file missing** — the silent one.

**It runs in `npm run verify`, always-on.** Being unhooked is a property of the CHECKOUT, not of the
diff; a guard that only ran when some file changed would be silent in exactly the fresh clone it
exists for.

**It is NOT in the hook**, and that is the whole point: if the hooks are not in effect the hook does
not run, so a hook that checks whether hooks run can only ever report success. This repository has
already shipped that shape twice — a guard reporting success over a directory it was never pointed
at, and a guard that could not see its own untracked files.

**It asks `setup-hooks.mjs` rather than re-deriving the answer**, so there is one statement of "are
the hooks in effect" instead of two that could disagree invisibly. That import forced an entry-point
guard on the setup script: without it, *asking* the question would have *configured git* as a side
effect.

### The CI decision

**CI makes no commits**, never runs the setup command, and never has hooks. So this is not a property
a runner can have. Asserting it would fail every run for a correct reason that means nothing;
passing it quietly would be worse — it would look like coverage of a machine that cannot be covered.

**Under CI the guard SKIPS, says so in one line, and exits 0.** It is deliberately **not** wired into
a CI step, because a step whose only possible output is "skipped" is noise.

**What CI does verify is that the guard WORKS.** `check-hooks-installed.test.mjs` runs in the script
suite there, putting all three broken states in front of it on a machine that can never be in any of
them.

---

## Proven in a fresh clone — both directions

No worktree was created. A throwaway clone at `C:/ra-clone-proof`, deleted afterwards.

**1. The clone, before setup** — `hooksPath` **UNSET**, `.githooks/pre-commit` present and tracked
`100755`.

**2. The silent bypass, reproduced:**

```
$ git commit -m "commit with no hooks in effect"
                       → exit 0, and NO "GUARDS: PASS" line. Nothing ran. Nothing said so.
```

**3. The guard catches it:**

```
$ node scripts/check-hooks-installed.mjs
FAIL: the git hooks are NOT in effect in this checkout.
      - core.hooksPath is UNSET, so git is using .git/hooks — which this repository does not
        track and does not use. …
      Fix it with ONE command:  npm run hooks:install                      → exit 1
```

**4. The one command:**

```
$ npm run hooks:install
hooks: core.hooksPath (unset) -> .githooks
hooks: .githooks/pre-commit already executable in the index (100755).
hooks: in effect.
$ node scripts/check-hooks-installed.mjs                                   → exit 0
```

**5a. A commit that VIOLATES a hook check is REJECTED.** The current render fingerprint was pasted
into `docs/BACKLOG.md`, which `check-fingerprints` forbids:

```
     FAIL: docs/BACKLOG.md contains the CURRENT render fingerprint.
  GUARDS: PASS 6   FAIL 1
  COMMIT BLOCKED - 1 guard(s) failed. Fix them, or commit with --no-verify.
```

`git log -1` still showed the previous commit — **the commit was not created.**

**5b. A clean commit PASSES:**

```
  GUARDS: PASS 7   FAIL 0
$ git log --oneline -1  →  19f6736e clean commit: nothing violates a hook check
```

**Residue: none.** `.git/worktrees` was **46 before and 46 after** — the clone leaves no stub, which
is why the brief forbade a worktree. The clone directory is gone.

**One honesty note about the proof.** The clone has no `client/node_modules`, so a stub
`lint-staged` that exits 0 was placed in it. That step is not what this block changed; the proof is
about whether git runs the hook at all and whether the guards inside it can reject a commit, and both
were exercised for real.

## Fingerprints

```
$ node scripts/engine-reach.mjs --check .githooks/pre-commit scripts/setup-hooks.mjs \
      scripts/check-hooks-installed.mjs scripts/check-hooks-installed.test.mjs \
      docs/VERIFY-RULES.md docs/ROADMAP.md .github/workflows/ci.yml package.json package-lock.json
ENGINE REACH: none of 9 path(s) can reach the race engine.        (exit 1)
```

**None of the four can move**, and nothing was measured beyond that — hooks, guard code and
documentation are outside every instrument's closure.

## Hygiene

| file | before | after |
| ---- | -----: | ----: |
| `.husky/pre-commit` | 105 | **deleted** |
| `.githooks/pre-commit` | — | 129 (24 header + the same 105) |
| `scripts/setup-hooks.mjs` | — | 207 |
| `scripts/check-hooks-installed.mjs` | — | 149 |
| `scripts/check-hooks-installed.test.mjs` | — | 160 |
| `scripts/verify.mjs` | 617 | 622 |
| `scripts/verify.test.mjs` | 742 | 739 |
| `docs/VERIFY-RULES.md` | 372 | 423 |

**Removed, so nothing can drift:**

- `.husky/pre-commit` — tracked, `git rm`'d. The replaced hook does not stay behind as a second copy.
- `.husky/` entirely, including the untracked generated `_` runtime and its sixteen shims.
- **husky itself** — dropped from `devDependencies`, out of `package-lock.json`, out of
  `node_modules`. Leaving it installed would have meant `prepare` regenerating `.husky/_` on every
  install: an untracked hook directory that nothing points at, which is precisely a second copy that
  can drift.

**Extracted:** `hookProblems()` in `setup-hooks.mjs`, exported so the setup command and the guard
share one statement of the predicate instead of two.

**Fixed along the way, and it is a finding rather than a chore.** The routing tests excluded always-on
guards **by name**, a hand-written list of two. It needed editing *both* times an always-on guard was
added — `check-language-closed` last night, `check-hooks-installed` tonight. That is a second
statement of something the declaration already makes, and it fell behind exactly as VERIFY-ROUTING-2
predicts. `plan()` now carries `everything` through and the tests read it. The list is gone.

**Noticed and deliberately left alone:**

1. **Fifteen hook NAMES lost their shims** — `commit-msg`, `pre-push` and thirteen others. All of
   them dispatched to files that did not exist and exited 0, so nothing changed behaviourally. Git
   now simply finds no such hook. Adding real ones is a new check, which this block was told not to
   do.
2. **`docs/AUDIT.md` still says "auto-formatted via Husky pre-commit hook"** in two places. Those are
   dated audit records of what was true when written — history, not live claims. `docs/ROADMAP.md`'s
   checklist line WAS a live claim about what the repository has, and was corrected.
3. **`.git/worktrees` still holds 46 stale stubs**, one of them last night's. `git worktree prune`
   cannot delete them on this machine (`Permission denied`, the reparse-point condition already in
   the backlog). Untouched.
4. **The guard does not check hook CONTENT.** It answers "will git run it", not "is it the right
   script". A `.githooks/pre-commit` that had been emptied would pass.

---

## PROPOSALS

1. **Have the hook verify its own installation is complete.** The guard cannot run inside the hook
   for the reason given above — but the *inverse* is available and cheap: when the hook DOES run, it
   knows hooks are in effect, so it could cheaply assert that every name in `REQUIRED_HOOKS` still
   exists and that the index bit is still `100755`. That catches the partial state (`pre-commit`
   present, a future `commit-msg` deleted) at the only moment it matters, without the circularity.

2. **Fail the clone, not just the checkout: add `check-hooks-installed` to `npm test`'s path too.**
   Verify is the right home, but a contributor who only ever runs `npm test` in `client/` never sees
   the guard. A one-line pretest hook in the client package would put the message in front of the
   person most likely to be on a fresh clone.

3. **Sweep the 46 worktree stubs deliberately.** They cannot be pruned by git here, but they are just
   directories under `.git/worktrees` whose `gitdir` files point at paths that no longer exist. A
   small script could report which are dead and remove them with the filesystem rather than with git.
   It is the last residue of a mechanism this repository has now stopped using.

4. **Make `REQUIRED_HOOKS` the one home for which hooks exist, and check the directory against it.**
   Today `setup-hooks.mjs` names `pre-commit` and `.githooks/` happens to contain exactly that. A
   file added to `.githooks/` without being named in `REQUIRED_HOOKS` would get its executable bit set
   but never be required — a hook that is optional by accident. Asserting the two agree is three
   lines and closes it.

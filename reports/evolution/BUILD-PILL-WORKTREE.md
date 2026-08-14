# BUILD-PILL-WORKTREE — the badge can see a commit made in a worktree

**Branch `fix/build-pill-worktree`, off master `8422a9a4`.** The first piece of the source clean-up,
merged on its own because everything after it is judged against a served bundle and this is what
makes the bundle's name trustworthy.

---

## 1. The defect

The mtime poll watched two paths it **constructed**:

```js
[join(REPO_ROOT, '.git', 'HEAD'), join(REPO_ROOT, '.git', 'index')]
```

True in a main tree. False in a linked worktree, where `.git` is a **file** holding a pointer:

```
C:/ra-n1/.git  →  gitdir: …/Seasonal race claude/.git/worktrees/ra-n1
```

Neither constructed path exists there. `mtimeOf` returns `null` for both — correctly, by its own
contract, a missing file being a legitimate reading — and the poll then compares `null, null` against
`null, null` on every tick. **It can never fire.** The badge froze at whatever the server read at
start-up and reported itself clean and current while doing it.

**Found live, not reasoned:** 5173 served a four-commit-stale bundle, twice in one session.

**It is the failure this file's own header exists to abolish.** The `define` constant it replaced was
"not stale by accident — it was structurally incapable of being anything else". BUILD-TRUTH-1 shut
that for the main tree; this shape reopened it for worktrees. And **R10 tells us to work in a
worktree whenever a judgement is pending**, so the more correctly the process was followed, the more
certainly the badge lied.

## 2. The fix — ask, do not construct

`git rev-parse --git-path HEAD` and `--git-path index` answer correctly in both shapes. The answer is
**relative** in a main tree (`.git/HEAD`) and **absolute** in a worktree, so it is resolved against
`REPO_ROOT`: `resolve` takes an absolute right-hand side as-is and joins a relative one, which is
exactly what both cases need.

**The fallback is the old construction, deliberately.** If git cannot be asked at all, the identity is
already `unknown` with a reported reason, and falling back keeps a git-less checkout behaving as it
did rather than watching nothing.

## 3. Proved in a worktree, with the before and after

`C:/ra-n1` is a linked worktree. The dev server was started once on the fixed plugin and **not
restarted again** for the rest of this section.

| | HEAD | pill, read from the served module |
| --- | --- | --- |
| before the commit | `b923bba1` | `{commit: "b923bba1", branch: "fix/build-pill-worktree", …}` |
| **after the commit, no restart** | **`e43308f0`** | **`{commit: "e43308f0", branch: "fix/build-pill-worktree", …}`** |

**It followed within 1.2 seconds** and held at every later read (+2.5 s, +4.0 s). The commit that
moved it is the one that added this file — deliberately, so the experiment and its record are the
same act.

**The before-picture is on record too, from earlier the same session and in this same worktree.** With
the constructed paths, master moved to `c23423fd` and 5173 went on serving `e590bc9a`; it was
restarted, master moved again to `8422a9a4`, and 5173 froze at `c23423fd`. Twice, unprompted, with
`dirty: false` and `reason: null` both times — the badge was not merely wrong, it was confident.

## 4. The tests

**7 added, 0 deleted**, in `buildIdentityWorktree.test.js`. Each case builds a **real** repository and
a **real** `git worktree add` rather than hand-making a `.git` file — the whole defect is about the
shape git puts on disk, which is the one thing a stub would get wrong in a different way.

**L203 throughout, and it is load-bearing here rather than decorative:** a poll over two valid paths
is indistinguishable from a poll over two invalid ones until something actually moves, so every
assertion is paired with the same one against the old construction.

**Sabotage run.** Making `gitIdentityPaths` return the old construction turns **2 of the 7 red**,
including the one that matters — the poll sees the commit through the asked-for paths and is blind to
it through the constructed ones.

**One thing fixed in the harness itself:** the child process now carries its stderr instead of
discarding it. A child that crashed otherwise failed the suite with a bare `Command failed` and no
cause — the same half-an-instrument failure BUILD-UNKNOWN-1 was written to end, and it cost a
debugging round here before that line existed.

## 5. What this does not change

No default, no fingerprint, no engine file. The plugin is dev-only and is imported by exactly one
file (`RaceScreen/index.jsx`); `engine-reach` does not select it. **Nothing was minted.**

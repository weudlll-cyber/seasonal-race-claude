# STAMP-TRAP-1 — the stamp guard answers about the commit being made, and hooks do not run in a worktree

**Branch `guard/stamp-trap`, off master `a059c38b`.** Last piece of the source clean-up. **THREE
findings, and only the first was on the list** — the other two were found while trying to prove it.

---

## 1. The trap, and why the guard was not wrong

`check-measured-stamps` reads git HISTORY. Run against uncommitted work it has nothing to compare, so
it prints a **PENDING** line — a report, not a failure — and the run reads green. That is correct for
an ad-hoc run: failing there would make the guard un-runnable mid-edit.

**It is exactly wrong at commit time**, and that is what put master red twice on the day
CONTENDER-ZOOM shipped:

1. change `client/src/modules/camera/`, do not commit yet
2. `npm run verify` — PENDING printed, run reads **green**
3. commit
4. the stamp is stale from that instant; the next CI run is **red**

**The guard's own header already warned about this path in prose. Prose is not a guard.**

## 2. `--staged`, and what counts as having done the work

The flag asks the question at the only moment it is answerable: the change is **staged**, so it is
about to exist, and "will this commit make a stamp stale" has a real answer instead of an unknowable
one.

The guard **cannot** validate the new stamp's SHA — it names the commit being made, which does not
exist yet, and no cleverness changes that. What it **can** see is whether the author re-stamped in
the same commit: **the stamp's own `MEASURED` line staged as modified.** That is a real signal and it
is not satisfied by accident.

| staged                                  | verdict                                           |
| --------------------------------------- | ------------------------------------------------- |
| nothing under the dependency            | silent                                            |
| dependency **and** the stamp's own line | **pass** — "that is the shape this mode asks for" |
| dependency only                         | **FAIL, exit 1**                                  |

The ordinary mode is unchanged: PENDING is still a report. `--staged` is opt-in and the pre-commit
hook is the only caller.

### Proved, twice over

**Directly**, staging a camera change with the stamp untouched:

```
FAIL: docs/CAMERA_DIRECTOR.md: "tracking-lag (median/p95 pp per state)" will be STALE the
      moment this commit lands. 1 staged change(s) under client/src/modules/camera/:
         client/src/modules/camera/CameraDirector.js
      The stamp's own MEASURED line is NOT staged, so nothing in this commit re-measures it.
check-measured-stamps --staged: 2 stamp(s) checked against the STAGED tree, 1 would go stale.
exit=1
```

**And in tests — 4 added, 0 deleted, all four positions**, including the L203 pairing that keeps the
mode usable rather than merely strict: staging the dependency _and_ the re-stamp **passes**, and the
same fixture without the flag still reports PENDING and passes.

They run against a **temporary repository**, not this one, and that is not a preference: the mode
reasons about the INDEX, so testing it here would mean staging files in the real repository — global
state `npm run verify` reads concurrently, which is the collision that test file's own header records
from its first version.

**One error worth recording**, because it is the failure this project keeps finding in its own
instruments: the re-stamp case first used an invented SHA. `--staged` passed it and the _ordinary_
freshness check underneath then failed, so the test was red for a reason that had nothing to do with
what it was testing. Re-stamped at a real commit; a test that passes or fails for the wrong reason is
not evidence.

## 3. THE SECOND FINDING — no hook has ever run in a worktree

**I could not prove the hook refuses, because the hook was not running at all.** The proof commit
went straight through with no output.

```
core.hooksPath = .husky/_          # relative to each worktree's root
C:/ra-n1/.husky/_                  # does not exist
```

`.husky/_` holds husky's generated shims. It is **untracked**, created by `npm install` →
`prepare: husky`. A worktree made with `git worktree add` gets the tracked `.husky/pre-commit` and
**never gets `.husky/_`**, because nobody runs `npm install` at the root of a worktree. Git then
finds no hooks and **runs none, silently.**

**So every commit made from `C:/ra-n1` or `C:/ra-n2` has bypassed all seven fast guards** —
fingerprints, stamps, config-claims, doc-facts, writable, config-keys, fallback-agreement — without a
word. Including every commit in tonight's work before this point.

**This is the same shape as BUILD-PILL-WORKTREE, on the same day, from the same cause:** a mechanism
that is correct in a main tree and silently absent in a linked worktree, while **R10 instructs us to
work in a worktree** whenever a judgement is pending. Two independent safety mechanisms, both
disabled by following the process correctly, neither of them saying so.

**What I did here** is copy the shims in, which makes the hook fire in this worktree — and it now
does. That is a repair to one machine, **not a fix**: the next worktree will have the same hole.
**The fix is proposal 1 and it is not built**, because it is a change to how every worktree is
provisioned and that is not what tonight authorised.

**And `client/node_modules/.bin` was EMPTY in this worktree** — 81 shims missing, which is why
`prettier`, `lint-staged` and the rest reported "command not found" while `npx` still worked (it
resolves the package directory rather than the shim). `npm rebuild` restored them. Until it did,
`npm run verify`'s format step was failing outright.

## 4. A THIRD finding: the hook blocked without ever saying why

With the toolchain restored, the hook ran, refused the commit — **and printed nothing but
`husky - pre-commit script failed (code 1)`.** No guard name, no reason.

Husky runs the script as **`sh -e`** (`.husky/_/h`). The guard loop waited on each background job
with a bare command and then tested `$?`:

```sh
eval "wait \$pid_$i"
if [ $? -eq 0 ]; then ...
```

Under `-e` a bare failing command aborts the script **immediately** — so the shell exited at the
first failing `wait`, before the replay that prints the guard's output and before the `COMMIT
BLOCKED` line. **The hook's entire diagnostic half could never fire.** It has been correct and mute
for as long as it has existed.

The fix is to make `wait` the condition, which `-e` exempts:

```sh
if eval "wait \$pid_$i"; then ...
```

**That is three mechanisms in one night whose diagnostic half was structurally unable to speak** —
the build pill, the hooks that never ran, and this. Each was correct about _whether_ something was
wrong and silent about _what_.

## 5. The end-to-end proof, after all three repairs

```
     FAIL: docs/CAMERA_DIRECTOR.md: "tracking-lag (median/p95 pp per state)" will be STALE
           the moment this commit lands. 1 staged change(s) under client/src/modules/camera/:
              client/src/modules/camera/CameraDirector.js
           The stamp's own MEASURED line is NOT staged, so nothing in this commit re-measures it.

  GUARDS: PASS 6   FAIL 1

  COMMIT BLOCKED - 1 guard(s) failed. Fix them, or commit with --no-verify.
```

**A real `git commit`, through the real hook, refused and explained.** That is what step 7 asked for.

## 6. What did not change

No default, no fingerprint, no engine file. Guard and hook only. **Nothing minted.**

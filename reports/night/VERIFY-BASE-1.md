# VERIFY-BASE-1 — a run that verified nothing must not exit 0

**Branch:** `feat/verify-base-1`, off master `1ea3a6bb`. Not merged, not minted.
**This report is committed on `feat/fallback-guard-1`**, the branch stacked on it — written after
that branch was cut, and put on the tip rather than on the base so the strand stays a single line.
That is the fork SHIP-THE-LINE spent a section on.

## The defect

Found during the SHIP-THE-LINE merge. `npm run verify` on master printed:

```
  PASS 0   FAIL 0   SKIP 7
```

…and exited 0, having checked nothing. The cause is arithmetic, not a bug in any guard: routing
diffs `master...HEAD`, and on master that is empty by definition, so all seven guards were correctly
told they had nothing to look at. **Seven honest skips summed to one dishonest exit code.** The
full-weight run the ship actually needed had to be typed by hand as `--base=8547640d`, which a person
has to know to do.

Third time in this shape: the build badge that could detect its own failure and not say so, the
`--cheap` flag that was accepted and ignored, and this.

## The fix, and the one I did not build

**If routing selects no guards, verify refuses**: names the cause, prints the command to use
instead, exits **2** (2 = refused; 1 = a guard failed).

**I did not add a cleverer default `--base`, and that was the decision.** It was the obvious move.
On master, "what changed" has at least three defensible answers — the last commit, the last merge,
everything since the last tag — and they verify different things. Guessing would have restored the
exit code while keeping the real defect: a green run that checked something other than what the
person meant. So the machine does not guess; it *suggests*, with the first parent's real sha, so the
remedy is paste-able rather than advice.

**Four causes, four diagnoses**, because "nothing changed" is the least useful of them: the base does
not resolve; the base shares no history with HEAD; the base IS HEAD (named as such); genuinely no
diff. A fifth branch — files changed but none reaches a guard — is unreachable today because
`fingerprint-containment` matches every path, and is kept with that stated, since it is a property of
one route rule rather than a law.

`--dry` refuses too: its job is to show the plan, and a plan that runs nothing is worth failing on.

## The six cases, run rather than reasoned about

| case | exit | what it says |
|---|---|---|
| feature branch, no argument | **0** | `3 changed file(s) vs master`, routes normally — unchanged |
| on master, no argument (base == HEAD) | **2** | *"you are ON … HEAD and the base are the same commit"* + `--base=<first parent>` |
| master with `--base=<commit>` | **0** | routes normally — the full-weight post-merge run |
| detached HEAD | **0** | routes against `master` as usual (verified by actually detaching) |
| `--base=no-such-ref` | **2** | *"does not resolve to a commit … nothing to do with your work"* |
| `--base=<orphan commit>` | **2** | *"shares no history with HEAD"* |
| `--base=HEAD`, clean tree | **2** | *"means 'only uncommitted work', and the tree is clean"* |

That last message is a second commit. Running the cases showed the first version diagnosing it as
"you are ON HEAD" — true, and useless: `--base=HEAD` is the documented way to say *only my
uncommitted work*, so the useful sentence is that there is none. The caller already knows where they
are standing.

## How I convinced myself the refusal does not fail an honest run

The block asked, and it is the right question for a change to the verifier itself.

1. **A test asserts the safety direction directly**: for a docs path, a client path, a scripts path
   and a server path, the plan must select at least one guard. If the refusal ever starts firing on
   real work, that goes red.
2. **The catch-all makes it arithmetically hard to fire wrongly.** `fingerprint-containment` matches
   every path, so `chosen.length === 0` is equivalent to `files.length === 0`. The refusal cannot
   trigger while any file has changed.
3. **Six cases were run against the real repository**, including the three that must still exit 0.
4. **`npm run verify` on the branch after the change: PASS 3 / FAIL 0 / SKIP 4** — an ordinary run,
   unaffected.

## The test lesson

The first end-to-end test asked the real repo about `--base=HEAD` and asserted *"exit 2 if the tree
is clean, exit 0 if it is dirty"*. Honest, and useless: during development the tree is always dirty,
so the branch that matters never ran — and **two of four sabotages passed green locally** (deleting
the refusal, and forcing its exit code to 0). CI would have caught them on a clean checkout, which
is worse than useless: it teaches you to trust a local green.

It now builds a throwaway one-commit repo and points verify at it through `GIT_DIR`/`GIT_WORK_TREE`,
so the plan is empty **by construction** whatever the developer's tree looks like. `engineReach()`
reads source through the filesystem, not git, so the route table is still the real one.

| sabotage | result |
|---|---|
| the refusal removed (`if (false)`) | **RED** |
| its exit code forced to 0 | **RED** |
| the base==HEAD diagnosis disabled | **RED** |
| the condition narrowed (`&& files.length > 99`) | **RED** |

## Source hygiene

| file | +/− | what |
|---|---|---|
| `scripts/verify.mjs` | +101 −1 | `EXIT_REFUSED`, `describeEmptyRun()` (pure, exported), the refusal block in main |
| `scripts/verify.test.mjs` | +104 −1 | 5 tests: 4 unit + 1 end-to-end on a throwaway repo |
| `docs/VERIFY-RULES.md` | +34 −0 | R0 brought in step; R0a added |

Nothing removed. **`docs/VERIFY-RULES.md` R0 was stale for weeks** and now describes what the file
actually does: what the diff IS (`<base>...HEAD` ∪ uncommitted ∪ untracked), that there are seven
guards and the route table is their one home, the `client/` (not `client/src/`) rule, the INERT hull
skip, and the unknown-flag refusal. The rest of the document is untouched, as instructed.

### Noticed but left

- **`changedFiles()` still swallows git errors** into an empty list. It no longer matters for the
  exit code — an empty list now refuses — but the *diagnosis* for a git failure comes from
  `describeEmptyRun`'s probes rather than from the failure itself.
- **The `--dry` contract changed**: it used to always exit 0. Anything scripted around
  `verify --dry` expecting that will now see 2 on an empty plan. Nothing in the repo does.

## Verification

`engine-reach --check`: **none of the 3 changed paths can reach the race engine.**
`npm run verify` once, on the branch: **PASS 3 / FAIL 0 / SKIP 4** — doc-guards, containment and the
script suite; no fingerprint script was selected and none was run, correctly (nothing reaches the
camera, the render path or the engine). Script suite 26/26.
**CI green on the branch before anything was considered done** (run `31319043286`, both jobs) —
R8 exception 1, because this changes the verify path itself.

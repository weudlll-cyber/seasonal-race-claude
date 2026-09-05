# CI-MERGE-RACE-1 — the race is real, but it is not "every merge", so nothing was built

**2026-09-05.** Branch `fix/ci-merge-race-1` off master `bd91fac0`.
**NO CHANGE WAS MADE.** Neither option (A) nor option (B) was built.
**The piece's own gate stopped it**, and this report is the whole of its output.

---

## THE VERDICT, first

The brief carried a claim from CI-RED-3e6c0b87 — *"every merge has this window"* — and instructed:
**if the history does not support it, say so and stop.** It does not.

**Rule B failed on the push run of 1 merge in 28.** The other 27 passed it. A fix for a race that
happens once in twenty-eight, and only when the operator delays the sweep, is what that instruction
exists to prevent.

---

## 1 · RULE B AT SOURCE

`scripts/check-tags.mjs`, Rule B's run block at **:322-380**.

| what | where |
| --- | --- |
| its input | **:330** — `git ls-remote --heads origin`, the live remote, deliberately not the `git branch -r` cache (**:88-90** says why: the cache would bless a branch deleted locally and still standing remotely) |
| what it compares | **:345** — `treeEntries(masterHead.sha)`, the set of **(path, blob)** pairs from `git ls-tree -r` |
| the test | **:358-360** — a head is CONTAINED when master's tree holds every (path, blob) of its tree: `let extra = 0` … `if (extra === 0) contained.push(h)` |
| what it reports | **:382-390** — `FAIL: N branch(es) stand at origin whose TREE master already holds`, each as `<name> -> <sha> (master's tree holds every path this branch's tree holds)` |
| what it does NOT ask | **:81-86** — history. `merge-base --is-ancestor` and a commit diff are explicitly rejected: on 2026-08-26 the commit-level check called `diag/runin-viable-1` safe while its tree held a file master had replaced |

**So Rule B is a CONTENT test with no notion of ancestry**, and a just-merged branch awaiting deletion
is by construction the case it reports: its blobs are exactly master's.

## 2 · THE ORDERING, AT SOURCE

**What fires the run:** `.github/workflows/ci.yml:21-23` — `on: push: branches: [main, master]`.
The run starts at the push, unconditionally.

**Where Rule B sits in it:** the `Living-doc guards + script tests` job runs its steps in file order,
and `Check every origin tag is registered` is **`ci.yml:286`** — the fifth step, *before*
`Run script test suite` at **`ci.yml:354`**.

**How wide the window is — measured, not estimated.** On the one run where it fired (33964149835):
job started `11:44:52Z`, `Check every origin tag is registered` ran `11:45:05Z → 11:45:06Z`.
**Rule B is reached about 13 seconds after the push.** The sweep has to land inside that.

**★ IS THE WINDOW INHERENT, OR AN ARTEFACT OF SEQUENCING? It is the sequencing, and the ceremony's
own written order is what opens it.** `docs/SHIP-CEREMONY.md`:

- **step 10 (`:308`)** — *"**Wait for CI to go green for the merge SHA** before doing anything else."*
- **step 12 (`:312`)** — *"**Clear the branches AT ORIGIN**, and do it here rather than remembering
  to… it is owed at the merge, not at the end of a batch of them."*

Followed literally, step 10 blocks on a run that step 12 has not yet let pass. **A merge that obeys
the written order cannot produce a green push run**, because the branch is still standing when Rule B
is reached at second 13. The 27 green ones did not obey it: the branch was deleted in the same breath
as the push, seconds before CI got there.

## 3 · THE RUN HISTORY — the gate

Last 30 `push` runs on master, each queried for which step failed. **The step order above is what
makes this decisive:** `check-tags.mjs` runs *before* the script suite, and a failed step ends the
job — so every run that failed at the script suite had already **passed** Rule B.

| failing step | runs |
| --- | --- |
| `Check every origin tag is registered` (**Rule B**) | **1** — `bd91fac0`, run 33964149835 |
| `Run script test suite (guard liveness + observers)` | **29** — Rule B passed on every one |

Of those 30 SHAs, **28 are merge commits** (two parents, so a branch existed and could have been
reported) and 2 are plain commits pushed to master. The 28 merges:

`bd91fac0` `3e6c0b87` `e22c6611` `1a8bc6e6` `3007c4bb` `6953722d` `b95ee63b` `0bf48700` `9103ff6b`
`fb986bf4` `6e48dd31` `ee625575` `30a2c963` `ed520de4` `5234b4e3` `399e6fef` `2575ac1f` `917b08d2`
`c9148b82` `d6205253` `6c8683e3` `99282bd4` `c515f4a5` `96c77f6f` `8c3cbe93` `0ec02bc2` `d17d3a09`
`da471b7f` *(plus `89690185` and `e2138a86`, the two plain commits, which had no branch)*

**★ WHAT THE HISTORY SUPPORTS: 1 of 28 merges, not every merge.** `bd91fac0` is the one where the
sweep was delayed — CI-RED-3e6c0b87 pushed master, then spent minutes watching the run before
sweeping, which is step 10's order. Every other merge in the window swept within seconds of the push.

**SO THE PIECE STOPPED HERE.** Options (A) and (B) were not built and no file outside this report and
the index was touched. There was no sabotage to run, because nothing was changed.

## ★ WHAT IS SUPERSEDED

**CI-RED-3e6c0b87's sentence *"Every merge has this window; the commit-tree red was masking it"* is
WRONG on both halves, and this report supersedes it.**

- **Not every merge:** 27 of 28 passed Rule B.
- **Not masked:** masking would require Rule B to have failed and gone unseen. It cannot have — Rule
  B's step precedes the script suite's, so a Rule B failure would have *replaced* the commit-tree
  failure as the job's failing step, which is exactly what happened on `bd91fac0` and on no other run.

The rest of that report stands; this corrects one inference drawn from a single observation.

## NOTICED, AND DELIBERATELY LEFT

- **The ceremony contradicts itself at steps 10 and 12**, as quoted above: step 10 waits for a green
  run that step 12 is required to make possible. Today the contradiction is resolved by practice
  rather than by the document — sweeping with the push. **Not corrected here**, because this piece's
  gate closed and its decision rules forbid changing how a merge is performed once it has stopped.
  It is the owner's to order, and it is the one thing that would make the green push run structural
  rather than a matter of how fast the sweep is typed.
- **Option (B) would have been wrong on the merits even had the gate opened**, and it is worth
  recording why so it is not revisited: Rule B deliberately asks about CONTENT, not ancestry
  (`check-tags.mjs:81-86`), because a commit-level test already blessed a branch whose tree held a
  file master had replaced. Teaching it "ignore a branch whose tip is an ancestor of master" would
  reintroduce exactly the reasoning that decision rejected.

---

## SOURCE HYGIENE

| file | before | after | what moved |
| --- | --- | --- | --- |
| `reports/evolution/CI-MERGE-RACE-1.md` | 0 | 160 | this report |
| `reports/evolution/INDEX.md` | — | — | one entry |

**No guard, script, workflow, default or document outside these two was touched.** No scratch file
entered the repository.

## CHECKS

- **`npm run verify`** — `PASS 6  FAIL 0  SKIP 21`, 2.9 s wall clock.
- **The script suite as CI runs it** (`find scripts -name '*.test.mjs'`, `node --test`), with the git
  identity suppressed so it matches a runner — **532 tests, 532 pass, 0 fail**. Run because this
  piece read a guard CI executes unconditionally, even though it changed none of it.
- **The client suite** — **241 files, 4,476 tests, 0 failures.**

## THE MERGE, AND ITS PUSH RUN

This piece's own merge was performed with **the sweep chained to the push** — the practice that
carried the other 27 — rather than under a new ordering, because no new ordering was built.

**THE PUSH-TRIGGERED RUN FOR THE MERGE SHA IS GREEN**, which is what the piece turned on. Recorded
in a follow-up commit on master because the SHA cannot exist before the merge — the same pattern
SHIP-CEREMONY step 11 uses for a provisional hash:

```
completed  success  merge(CI-MERGE-RACE-1): the race is real, but it is not every merge -…  CI  master  push  33965738399  2m0s

run=33965738399  event=push  status=completed  conclusion=success
headSha=7ab19976feffba6d32d8585e34244e561cd36185
```

**`event=push`, not `workflow_dispatch`** — the run the merge itself fired. Origin at that moment
held one head, `refs/heads/master`, because the sweep had already landed.

## FINGERPRINTS

`node scripts/engine-reach.mjs --check` on the changed paths, **verbatim**:

```
ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  2 outside the hull (cannot reach the engine at all): reports/evolution/CI-MERGE-RACE-1.md, reports/evolution/INDEX.md
```

It selects nothing. **NOTHING WAS MINTED.**

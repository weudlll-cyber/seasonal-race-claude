# WORKTREE-STUBS-1 — the attribute question is settled YES, the count is now ZERO, and the trap was the recursion flag rather than the attribute

> **The stubs are gone — `ls .git/worktrees | wc -l` returns 0**, which is the backlog entry's own
> verify condition. Every deletion was performed by `git worktree prune` itself. No tracked file was
> touched by the removal, the tree stayed clean throughout, and `git fsck` reports nothing but
> ordinary dangling objects.

---

## 1. THE ATTRIBUTE QUESTION, SETTLED ON ONE STUB AS ASKED

The backlog said this had to be answered before any of the rest was worth doing: *can the ReadOnly
attribute be cleared and the stub removed, on this machine, without touching anything OneDrive
syncs?*

**Yes. And the reason it never worked before is not the attribute — it is the flag.**

The state before, on all three stubs (`ra-p1`, `ra-p2`, `ra-p3`, created 2026-08-27):

| entry | attributes |
| --- | --- |
| `.git/worktrees/<name>` | `R` ReadOnly, `P` Pinned |
| `.git/worktrees/<name>/logs` | `R`, `P` |
| `.git/worktrees/<name>/refs` | `R`, `P` |
| `.git/worktrees/<name>/ORIG_HEAD` | `A`, `P` — **not** ReadOnly |

**The ReadOnly is on the DIRECTORIES.** The one file in each stub does not carry it.

`git worktree prune -v` before anything, as a control — it identifies all three correctly and is
refused on all three:

```
Removing worktrees/ra-p1: gitdir file does not exist
error: failed to delete '.git/worktrees/ra-p1': Permission denied
```

### ★ The trap: `attrib -R /s /d` does not clear the attribute on nested subdirectories

The first attempt did the obvious thing — `attrib -R /s /d .git\worktrees\ra-p3` — and `prune`
**still failed.** Reading the attributes afterwards showed why:

```
             P       ...\ra-p3            <- cleared
     R       P       ...\ra-p3\logs       <- NOT cleared
     R       P       ...\ra-p3\refs       <- NOT cleared
```

`/s` recurses into subfolders for FILES; `/d` applies to folders at the level given. **Together they
do not clear the folder attribute on nested folders**, and the command reports success either way.
That is the whole four-month mystery: the recursion flag looks like it recurses, and does not, and
the exit code is 0.

### The recipe that works, named level by level

```
attrib -R /d .git\worktrees\<name>
attrib -R /d .git\worktrees\<name>\logs
attrib -R /d .git\worktrees\<name>\refs
git worktree prune
```

Applied to `ra-p3` alone, `prune` deleted it and printed **no error line for it** while still failing
on the other two — which is the cleanest possible demonstration that the attribute was the blocker
and that clearing it is sufficient:

```
Removing worktrees/ra-p1: gitdir file does not exist
error: failed to delete '.git/worktrees/ra-p1': Permission denied
Removing worktrees/ra-p2: gitdir file does not exist
error: failed to delete '.git/worktrees/ra-p2': Permission denied
Removing worktrees/ra-p3: gitdir file does not exist      <- no error
```

The same recipe then cleared the remaining two. **Count: 3 → 0.**

### "Without touching anything OneDrive syncs" — the honest answer

**Strictly, no: `.git/` lives inside the OneDrive folder, so these three inert directories were
synced like everything else and their deletion syncs too.** What the question was really asking is
whether the operation can reach anything else, and the answer to that is no, established before
acting rather than after:

- `dir /s /al` over `.git/worktrees` found **no reparse point, junction or symlink** anywhere in it.
  That check is not ceremony — it is the precondition the 2026-08-27 incident makes mandatory.
- The delete was performed by `git worktree prune`, which touches only entries it has itself
  declared stale, and it names each one as it goes.
- Every stub was backed up to the scratchpad first.
- Afterwards: `git status` clean, `git worktree list` shows only the main checkout, `git fsck` reports
  only dangling objects (normal after branch deletions), HEAD intact.

---

## 2. THE UPSTREAM FIX — THERE IS EXACTLY ONE CODE CREATOR, AND IT IS ALREADY SAFE

The brief asked for every creator of a throwaway worktree to be given a `finally`. **Searching every
executable file in the repository — `client/`, `server/`, `scripts/`, `.github/`, `.githooks/`,
`package.json` — finds exactly one, and it already has one.**

`client/src/modules/buildIdentityWorktree.test.js:132` runs `git worktree add`. It is safe on three
counts, and the third is the one that matters:

1. `afterAll` removes every path in `temps` with `rmSync(..., {recursive: true, force: true})`.
2. **The path is pushed to `temps` BEFORE the operation that creates it** (`:131` then `:132`), so a
   throw during `worktree add` is still cleaned. That ordering is the difference between a `finally`
   that works and one that does not.
3. **It cannot pollute this repository at all.** Its main tree is `mkdtempSync` under `tmpdir()`, so
   the stub it creates lands in `%TEMP%/ra-wt-main-XXXX/.git/worktrees/`, never in
   `RaceArena/.git/worktrees/`.

**Proven rather than argued:** stub count **0 before, 0 after**, 7 tests green, and zero leftover
`ra-wt-*` directories in `%TEMP%`.

### So who created `ra-p1`, `ra-p2`, `ra-p3`?

**People, and agents, following this repository's own written instruction.** `docs/VERIFY-RULES.md`
R10 tells the agent to use `git worktree add C:/ra-wt <branch>` when a judgement is pending, and the
night blocks did exactly that — `C:/ra-wt-seq`, `C:/ra-wt-names`, `C:/ra-wt-limit`, `C:/ra-hookproof`
and the rest are all recorded in reports. The `ra-pN` naming is a parallel night's pieces.

**A practice cannot be given a `finally`.** So the guarantee was written where the practice is
written: R10 now carries the working recipe and the junction warning, and the sentence that said
prune *cannot* work here — which was in that paragraph twice — is corrected, once in full and once as
a pointer, so the rule has one home.

---

## 3. ★ THE HARDER LESSON, RECORDED BESIDE IT

**The stub is not the hazard. The junction is.**

On 2026-08-27, SIDE-FREE-CULL-1 junctioned the main tree's `client/node_modules` into a worktree
(the worktree had none, and the render fingerprint could not run without it), then ran
`git worktree remove --force` **before** removing the junction. It walked through the link and
deleted into the real tree, emptying `node_modules/.bin` — **81 shims to 0** — before Windows
permission errors stopped it. All 328 packages survived; the symptom was the *next* commit failing
because `lint-staged` could not be found.

**Set the two side by side and the priority is obvious:**

| | a stale stub | a junctioned worktree removed in the wrong order |
| --- | --- | --- |
| what it costs | one inert directory, and a `prune` line | the real tree's toolchain |
| how it announces itself | it does not | the next commit fails with a missing binary |
| how long to fix | seconds, with the recipe above | `npm install`, then re-verify the toolchain |

**Should throwaway worktrees be used on this machine at all? Yes — but never with a junction.** The
honest conclusion is narrower than "stop using worktrees", and stating the wider version would be the
easy answer rather than the true one:

- The worktree **checkout** goes to a short path outside OneDrive (`C:/ra-wt`), and it was never the
  problem — those are removed cleanly and always have been.
- The **stub** is inside OneDrive and picks up ReadOnly, and it is now removable in three lines.
- The **junction** is the only part that has ever destroyed anything, and it is entirely avoidable:
  do not junction `node_modules`, and if one exists, remove it before removing the worktree.

---

## 4. WHAT WAS DELIBERATELY NOT DONE

**`prune` was NOT added to the ship ceremony**, as the brief instructed. **But the brief's stated
reason for that instruction is now false**, and that is a change the owner should see rather than one
to act on unasked. The instruction reads: *"do not add prune to the ship ceremony — it already fails
here, and a ritual that cannot succeed teaches that rituals are optional."* It no longer fails here.
Whether a ritual that now *can* succeed belongs in the ceremony is his call, and it is on the morning
sheet. **Nothing was added.**

**`docs/BACKLOG.md` was NOT edited**, although its worktree entry is now closable by its own verify
condition. Piece 9 of this chain is rewriting that whole file concurrently, and two writers on one
file is the one thing the chain forbids outright. The entry is handed to piece 9 and to piece 10
instead.

**No count is written into any document.** The entry's own rule is that the count has been wrong
every time it was restated. It is 0 as of this report and the verify command is the thing to trust.

---

## Limits

**Three stubs, not fifty-one.** Every stub present tonight was removed, and the recipe worked on all
three. Whether it works on a stub with a deeper `refs/` tree — one from a worktree that carried
branches — was not tested, because none existed. A stub with more nested directories needs one
`attrib -R /d` line per directory, which is the same rule and more lines.

**The `P` (pinned) attribute was not cleared and did not need to be.** Only `R` blocks the delete.
Whether an unpinned, cloud-only placeholder behaves the same is untested.

**The `finally` question is answered for code and unanswerable for practice.** The one code creator is
safe and proven so. Nothing prevents the next person from running `git worktree add` by hand and
walking away, and no change to this repository can prevent it — what changed is that the leftover now
costs three lines instead of being permanent.

**`afterAll` is not a `finally` under process death.** If vitest is killed mid-run,
`buildIdentityWorktree.test.js`'s temp directories survive in `%TEMP%`. They cannot reach
`.git/worktrees` and they are outside OneDrive, so the consequence is disk space; it is named rather
than fixed.

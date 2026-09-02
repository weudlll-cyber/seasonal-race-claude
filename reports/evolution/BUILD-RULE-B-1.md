# BUILD-RULE-B-1 — it ships GREEN with an empty keep list, and it was sabotage-proved against origin itself

> **Rule B gates.** Unlike Rule A, it found nothing to object to on today's tree and therefore ships
> as a real check rather than a report. `verify` **PASS 7 FAIL 0**; script suite **457/457**;
> `check-tags`'s own tests **14/14**.

**The rule:** no branch may stand at origin whose TREE master already holds. This is the mechanical
half of the scope defect that left six branches standing on 2026-09-02 — `7bb7dfe5` corrected step
12's wording, and this is what makes the wording enforceable.

---

## 1. THE TREE, NOT THE COMMIT GRAPH — and the ceremony already knew why

`git merge-base --is-ancestor` and a `master...branch` commit diff both answer a question about
**history**. The ceremony records why that is the wrong one: on 2026-08-26 the commit-level check
reported `diag/runin-viable-1` as safe to delete while that branch's **tree** held
`client/src/modules/camera/panStaleZoom.test.js`, a file master had replaced during
RUNIN-PIVOT-SCOPE-1.

**A branch is safe to delete when master's tree holds every path its tree holds.** That is a question
about CONTENT, and it is the one the guard asks — the same comparison `docs/SHIP-CEREMONY.md:346`
writes out as shell.

**Origin is asked directly, not the cache.** `git branch -r` reads remote-tracking refs, which are
whatever the last fetch left behind. Step 12 already writes that distinction down; the guard honours
it with `git ls-remote --heads origin`.

---

## 2. SABOTAGE — AGAINST THE REAL ORIGIN, IN THREE DIRECTIONS

The brief asked for two. The third is the one that decides whether a guard is usable.

| # | what was done | result |
| --- | --- | --- |
| 1 | pushed `throwaway/rule-b-sabotage` at master's own commit — a tree master trivially holds | **RED, exit 1**, naming the branch and its sha |
| 2 | deleted it | **GREEN, exit 0** |
| 3 | pushed `throwaway/rule-b-livework`, a commit whose tree holds a path master lacks | **NOT reported, exit 0** — no false positive on live work |

Both throwaway branches were deleted; origin carries **`master` and nothing else**.

**Direction 3 was built with plumbing** — `git read-tree` into a temporary index, `git update-index`,
`git write-tree`, `git commit-tree` — so no working tree and no real index was touched. That mattered:
the first attempt used `git stash --include-untracked` and **hit OneDrive's placeholder permissions**
mid-operation, leaving a stash that duplicated the working tree. Recovered by verifying the working
file still held Rule B, diffing it against the stash (identical), and dropping the stash. **Recorded
because the next person will reach for stash on this machine and should not.**

---

## 3. THE KEEP LIST — EMPTY, AND THAT IS THE SHIPPED STATE

`KEPT_BRANCHES` ships empty. A list is unavoidable **here and only here**: *"this branch is kept on
purpose"* is an INTENT, and no discovery can read it off the repository — which is the one condition
under which this project accepts a list at all (constraint 3).

It carries a reason per entry, and **a stale entry fails** — the shape `audit-gate` already uses.
An allowlist that outlives its subject is a hole that looks like a decision. Its exemptions are
**printed when granted**, as R11 requires and as the tag half already does.

`docs/TAGS.md` states the rule this list must not be used to evade: anything that must survive as
evidence becomes an **annotated tag**, never a branch. An entry here is a temporary exception to a
settled policy, not a second way of keeping work.

---

## 4. WHAT THIS REPAIR MOVED, AND WHAT POINTED AT IT (constraint 2)

Searched uncapped across the tree before merging.

| what moved | what pointed at it | outcome |
| --- | --- | --- |
| `check-tags` now calls `git ls-remote --heads` | **`.github/workflows/ci.yml:54`** documents exactly which commands use the token and why the scope is `contents: read` — it named only the tags call | **comment corrected**: same credential, same scope, no new permission |
| the guard now needs branch TREES locally | `ci.yml:237` explains the checkout depth | no change needed — an unavailable tree is **UNJUDGED**, not a failure, precisely so a shallow or unfetched run cannot cry wolf |
| its own test file | it built the guard's path as a **string** and spawned it — it did **not** import the module | it does now, to assert the keep list ships empty, so an entry-point guard was added |
| every existing test in that file | they now would have reached the network for heads | **`runGuard` pins a `--heads-file`**, so the tag tests keep asking exactly the question they were written to ask |
| the guard's measured cost | `gen-ceremony-costs.mjs:136` measures it | checked: `--check-counts` reports the document agrees with the repository |

### A correction to my own first account of the entry-point guard

I initially wrote that `check-tags` had the same live defect as `check-fallback-agreement` — a test
that imports a self-running module. **It did not.** That test spawned the guard as a subprocess and
never imported it. The entry-point guard here is a **precaution Rule B made necessary**, not a bug it
exposed. The comment in the file says so; the sibling case was real and this one was not, and
flattening the two would have been the tidier story rather than the true one.

---

## Limits

**Rule B compares PATHS, not contents.** A branch that only MODIFIES a file master also has — adding
and removing no path — is reported as contained. That is deliberate: it is the comparison
SHIP-CEREMONY's own shell performs, and step 12's question is whether deleting the branch loses WORK.
A stricter path+blob comparison was considered and **rejected**: it would introduce a false NEGATIVE
exactly where the rule matters most — after a merge, once master moves on, the branch's blobs stop
matching and a genuinely deletable branch would go unreported. Matching the ceremony also avoids a
second mechanism beside a working one (constraint 3). **It is in the guard's `blind` list, not only
here.**

**A branch pushed from another machine cannot be judged.** Its tree is not local, so it is reported
UNJUDGED and does not fail. The case Rule B exists for — a branch left standing after a merge you
just performed — is always judgeable, because you have the objects. Whether an UNJUDGED branch should
eventually fail is a judgement about how this repository is worked, and it is not taken here.

**It cannot be selected by routing.** Pushing or deleting a branch touches no file, so `verify` has no
diff to route on. That is the same hole the tag half already declares, and the same answer: the
pre-commit hook and CI run this guard unconditionally, and that is where Rule B will actually fire.

**Green today proves the mechanism, not the population.** Origin carries one head, so the rule shipped
without ever having objected to a real leftover branch — only to one I pushed to make it object.

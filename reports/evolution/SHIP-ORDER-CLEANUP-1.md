# SHIP-ORDER-CLEANUP-1 — the ship order gets a twelfth step, and the check that makes it safe

**Documents only.** `docs/SHIP-CEREMONY.md` and this report. No source file is touched.

**WHAT WAS NOT RUN, AND WHY THAT IS NOT CAUTION SKIPPED.** No browser gate, no client suite, no
fingerprint run. The four fingerprint roles are computed from the engine — `client/src`, `server`,
the track seeds — and a change confined to `docs/` and `reports/` cannot reach any of them. Running
them could not have returned a different answer than not running them, so the honest thing is to name
that rather than spend twenty minutes buying a result that was determined in advance. The gates that
*can* answer differently here are `check-doc-links` and `check-index`, and both were run.

---

## THE PROBLEM, stated as the record shows it rather than as a tidiness complaint

THE SHIP ORDER had eleven steps and stopped at "correct the provisional SHAs". Nothing in it said to
clean up, so cleanup lived outside the repository — in whoever was at the keyboard. The record says
that does not hold:

- **CLEANUP-2026-08-26** swept nine accumulated branches.
- **By the very next ship, there were three more.** The block that cleared the first of them named
  specific branches instead of stating the rule, which is exactly how the other two survived.

**And the cost is not untidiness.** `feat/leader-whole-setback-1` was the only home of a 195-line
report for a day. Master's own INDEX carried a line telling a reader to go and look at a branch —
a repository pointing outside itself for its own evidence. **Deleting that branch on the wrong day
would have destroyed the report**, and the only thing standing between those two outcomes was
whether someone happened to check the right way.

## WHAT WAS ADDED

**Step 12**, in the file's own voice, with its reason beside it the way the surrounding steps carry
theirs: after CI is green for the merge, check AT ORIGIN that no branch whose content master already
holds survives, and delete the ones that do. Two conditions travel with it:

- **Anything a branch holds that master lacks is landed on master FIRST**, as a commit — not by
  leaving the branch standing as its home.
- **Anything that must survive as evidence becomes an annotated tag with its `TAGS.md` register
  entry.** A branch is a moving pointer anyone can force-push or delete; a tag is what this
  repository already trusts to mean "this state, at this moment".

**And THE CONTAINMENT CHECK**, a section of its own, because the rule without the method has already
failed here once.

## THE METHOD, AND WHY THE OBVIOUS ONE IS WRONG

Containment is a **tree** question, not a **commit** question. The check that belongs in the file is
the set difference of the branch's full tree against master's:

```sh
comm -23 <(git ls-tree -r --name-only origin/<branch> | sort) \
         <(git ls-tree -r --name-only origin/master   | sort)
```

**The weaker check looks convincing, which is the whole danger.** Comparing only the paths a branch's
own commits *introduced* — `git show --name-only`, or a `master...branch` diff — reads like a
complete audit and names real files. It is wrong because **a branch's tree is not the same thing as
its commits' diffs**: the tree also carries everything inherited from the commit it branched off, and
master may have moved on from any of it.

**This is measured, not imagined.** On 2026-08-26, `diag/runin-viable-1` was assessed with the
commit-level check: its own commits introduced five paths, every one accounted for, and it was
declared a strict subset and deleted at origin. Its **tree** also held
`client/src/modules/camera/panStaleZoom.test.js`, which master had replaced during
RUNIN-PIVOT-SCOPE-1 — a path master's tip does not carry. The commit-level check never looked at it.
**The conclusion was right and the method was not**: the file turned out to be a pre-replacement test
whose subject (`_panTargetEff`) no longer exists anywhere on master, so nothing was lost — by luck,
not by checking.

**`--is-ancestor` is also not the check**, and the file now says so. It is worth running first because
it is cheap, but a branch whose tip is an ancestor of master can still hold a path master's tip
lacks: a file it ADDED can have been DELETED on master afterwards. Ancestry answers "were these
commits merged". The tree check answers "would deleting this lose anything". Only the second is the
question step 12 asks.

**And when the check finds something, that is not a reason to keep the branch** — it is the
instruction to land what is missing, re-run the check until it comes back empty, and only then
delete. The file states the order, because a branch deleted first cannot be read back.

## CONFORMITY

- Written in the file's own voice, reason next to rule, the way steps 1–11 and TRAP A/B already are.
- **One canonical home**: THE SHIP ORDER already owned the merge/mint/tag order and now owns the
  cleanup that ends it; its framing sentence was extended to say so, rather than a second section
  being created to describe the same sequence.
- No step was renumbered, so every existing reference to "step 11" — in `docs/fingerprints.json`
  twice, `docs/TAGS.md`, `SHIP-CEREMONY-FIX-1`, `SHIP-RUNIN-CALM-1` — is still accurate. **Checked
  rather than assumed**; renumbering would have silently falsified four documents and two minted
  records.
- `check-doc-links`: 653 links, 0 dangling. `check-index`: 0 unindexed, 0 dangling.

## PROPOSALS

**P1 — a guard could enforce step 12, and deliberately is not proposed as work yet.** `check-tags`
already reads origin; a sibling that fails when origin carries a branch whose tree adds nothing to
master would make this mechanical. It is not proposed because the failure mode is a guard that goes
red on somebody's legitimate in-flight branch, and the fix for that is a convention about branch
naming that nobody has agreed. **It belongs to the owner to want, not to me to add.**

**P2 (mine) — the same tree-level reasoning applies to the ARCHIVE tags, and nobody has checked
them.** `docs/TAGS.md` registers archive tags cut from branches that were deleted. If any was cut with
the commit-level check, it may not hold what its register line claims. A one-off audit — every
`archive/*` tag's tree against master's — would either confirm the record or find the gap while the
tags still exist. Cheap, and it expires: a tag nobody verifies is only as good as the day it was cut.

**P3 (mine) — the INDEX should not be able to point outside the repository.** The line that sent a
reader to `feat/leader-whole-setback-1` was written in good faith and was correct on the day. A guard
that rejects a branch name in `reports/evolution/INDEX.md` — the same shape as the config-claims
guard, matching `feat/`, `diag/`, `fix/` — would have made that line impossible to commit, and the
report would have landed on the day it was written instead of a day later.

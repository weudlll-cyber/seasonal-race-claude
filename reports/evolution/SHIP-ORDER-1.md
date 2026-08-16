# SHIP-ORDER-1 — a ship tag now points at a commit that passes

**Branch `docs/ship-order`, 2026-08-18. Documents only.** `engine-reach --check` over both changed
files: *"none of 2 path(s) can reach the race engine."* **Nothing minted. The guard was not touched.**

---

## 1. The contradiction

Two rules, both right, that could not both hold:

- **CI must be green for exactly the merge SHA** (SHIP-CEREMONY step 12).
- **A ship tag's `TAGS.md` register line goes in the commit AFTER the merge** — because the mint is
  measured on the merged tree, and the register rode along with the mint.

Checked out at the tag, `check-tags` therefore saw a tag at origin that the tree did not register,
and failed. Four tags are in that state: `v-ship-runin-hold` (`48f954a4`), `v-ship-minimap`
(`8a2dacab`), `v-ship-contender-zoom` (`0bd07dba`) and `v-ship-endgame-095` (`740f605c`).

**It was found by using it**, not by reading: dispatching CI against `v-ship-endgame-095` to obtain a
green for exactly its merge SHA produced a red, and the red was this.

## 2. The fix, and the one thing that makes it possible

**Everything the merge commit must CONTAIN is written on the branch, before the merge.** Then the
merge commit is self-consistent — it registers its own tag and carries its own fingerprints — and the
tag points at a commit that passes every guard.

**What makes that possible is the catch-up merge, and it is worth stating because the ordering looks
impossible without it.** Master is merged INTO the branch first, so **the branch tip's tree is
already the tree master will have.** Fingerprints measured on the branch tip are therefore measured
on the merged tree, which is exactly what the mint rule demands. The old order existed because the
mint appeared to require a commit that could only exist after the merge; with the catch-up merge it
does not.

The ordered steps are in [SHIP-CEREMONY.md § THE SHIP ORDER](../../docs/SHIP-CEREMONY.md), which is
their one home. `docs/TAGS.md` points at it rather than restating it (R13).

## 3. The one step that cannot be done in that order — named rather than forced

**A commit cannot name its own hash.** The register line's SHA field and `mintedOn` both want the
merge commit's hash, and neither can have it until that commit exists.

So step 5 writes them **provisionally** — the branch tip's short SHA, which is the honest value
because it is the commit the tree actually came from — and step 9 corrects them in one follow-up
commit on master.

**This costs nothing that matters, and that was checked rather than hoped.** `check-tags.mjs` states
in its own declaration that it checks **names, not shas**:

> "whether a tag points where the register SAYS it points — names are checked, not shas"

So the merge commit passes the guard with a provisional SHA, which is the entire point of the
reordering. The step-9 correction is for the human reader, and **it is the pattern this repository
already uses** for `MEASURED:` stamps, where a commit carrying a measurement cannot name the commit
the measurement was taken on until it exists.

## 4. The guard was NOT changed, and here is the reason

The brief expected `check-tags` to need nothing, and it needed nothing.

**It was correct throughout.** It reported a real inconsistency between a tag at origin and a tree
that did not register it — that is precisely its job, and the tree was genuinely inconsistent. A
guard relaxed to accept the old order would have had to stop failing on "a tag at origin that this
tree does not register", which is **the exact incident it was built after**: TAG-GUARD-2 exists
because that direction used to be blind.

**The defect was in the order, not in the check.** Changing the guard would have been fixing the
instrument to agree with a broken procedure.

## 5. History is not rewritten

The four tags stay exactly as they are. `docs/TAGS.md` now records in one paragraph that they predate
the rule, that they are correctly registered **on master** where `check-tags` is green, and that only
a checkout of one of those four shows the inconsistency — so a future reader does not read them as
violations or try to "fix" them by moving a tag.

## 6. Proof

**Not by argument.** The new order is used for the next piece, ENDGAME-FALLBACK-1, whose merge is the
first shipped under it — and whose report states plainly whether the tag's own SHA passes.

`npm run verify` green on this branch before the merge; documents only, so no fingerprint can move
and none was measured. `engine-reach --check docs/SHIP-CEREMONY.md docs/TAGS.md`: *"none of 2 path(s)
can reach the race engine."*

---

## PROPOSALS

1. **Apply the same self-consistency test to the other things a merge commit asserts about itself.**
   The register line was one; `mintedOn` in `fingerprints.json` is another and is still provisional
   at the merge by the same arithmetic. A third candidate is the report's own INDEX line, which
   already lands on the branch and is therefore fine. **The general question — "what does this commit
   claim about itself that is only true after it exists?" — is worth asking once, deliberately, of
   every artefact the ceremony produces**, because each one is a place where a checkout fails a guard
   that master passes.
2. **Consider dispatching CI against the tag as a ceremony step now that it can pass.** The whole
   contradiction surfaced because that was attempted once, ad hoc. It costs one run and it is the
   only check that answers "is the commit this tag names actually sound?" — which is the question a
   return point exists to make answerable. **Do not add it before the first ship under the new order
   proves green**, or the step ships a red.
3. **`docs/BACKLOG.md` still duplicates `ARCHITECTURE.md` on `deploy.yml.disabled`.** Carried over
   from DOCS-TWO-WEEKS §5 and still unresolved: two homes for one fact, and deciding which is the
   home is a real one-canonical-home question rather than a tidy-up.

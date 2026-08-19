# SHIP-CEREMONY-FIX-1 — the two traps the last ship walked into

**2026-08-22 · branch `fix/ship-ceremony-traps` off master `88722016` · MERGE APPROVED**

Both traps are in `SHIP-CEREMONY.md`'s **own procedure**. Both cost SHIP-MINIMAP-ONE-SOURCE real
time, and neither was a mistake by the shipper: each is a case of the document telling you to do
something the tooling cannot support.

---

## TRAP A — CI does not run for a commit that is not the tip of a push

**What happened.** The old steps 9 and 10 said: make the follow-up commit correcting the provisional
SHAs, then *"push master and the tag in the SAME push"*. Followed literally, that push carries the
merge **and** the commit on top of it — and **GitHub runs CI for the tip of a push, not for every
commit in it.** The merge SHA got no run. The rule "green for exactly the merge SHA" is about the
commit the tag points at and the commit a checkout of the tag shows, so a green run on its child does
not satisfy it.

**The fix, as one step rather than two options.** The merge is **always** pushed alone, with the tag,
and the follow-up commit comes after CI is green. That is now steps 9–11:

| step | |
| --- | --- |
| 9 | **Push the merge and the tag, and NOTHING ELSE** — `git push origin master v-ship-<name>` with master's tip standing exactly at the merge commit |
| 10 | **Wait for CI green for the merge SHA** |
| 11 | **Only then** the follow-up commit correcting the provisional SHAs, pushed on its own |

**This does not reintroduce the defect the ordering was built against** — a tag arriving before its
register line. The register line is already inside the merge commit (step 5 put it there), so the tag
and its registration travel together. What is left outside is only the *correction* of a provisional
SHA, and `check-tags` reads names, not SHAs — it says so in its own header.

**The recovery route, named with its exact form**, for when a run for the merge SHA does not exist:

```
gh workflow run ci.yml --ref v-ship-<name>
gh run list --limit 5 --json databaseId,headSha,status,conclusion,workflowName,event
```

Dispatch at the **tag**, which resolves to the merge commit and to nothing else; confirm the run's
`headSha` is the merge hash. This is what worked on 2026-08-22 — run `32262308114`, head `242e6cb3`.
**`--ref <sha>` is not a substitute:** the dispatch API takes a branch or a tag, not an arbitrary SHA.

---

## TRAP B — a measured stamp cannot carry the ceremony's `PENDING` placeholder

**What happened, and it failed in the wrong place.** The ceremony said a `MEASURED:` stamp re-pointed
by a ship was *"the same case"* as the register line and `mintedOn`, riding the same
provisional-then-corrected path. It is not the same case:

- `check-tags` reads the register line's **name**. A provisional SHA there is inert.
- `check-measured-stamps` reads the stamp's commit field with `[0-9a-f]{7,40}` — and anything that
  did not match **was not reported. It was silently dropped from the checked set.**

`docs/CAMERA_DIRECTOR.md` carries exactly one stamp, so `@ PENDING` took that document from one stamp
to **zero**. The only thing that went red was the guard's LOUD-FAILURE rule firing on the resulting
empty set — so the error named the wrong problem (*"found ZERO measured-number stamps"*) in the wrong
place (`script-suite`, via the guard's own test file), and the shipper spent a verify cycle finding
out why.

**The rule now: a `MEASURED:` stamp is stamped at the commit that LAST CHANGED its `depends=` paths.**
Never at the merge, never at a placeholder. That commit already exists when the stamp is written, so
there is nothing provisional about it and **nothing for step 11 to correct** — which is also the
semantically right answer, since the stamp's question is about the dependency's history, not about
the merge that happens to carry the document.

```
git log -1 --format=%h -- <the stamp's depends= paths>
```

The sentence that caused this is gone from the ceremony, and the paragraph that replaces it says what
it cost.

### The silent drop itself is fixed — R13, inside the guard that already owns stamps

**This is the fourth instance this week of a check that looks like a check and is none**, so the
document rule alone was not enough. `check-measured-stamps.mjs` now scans each document a second time
with a deliberately permissive opener (`<!-- MEASURED: … -->`), and **anything that announces itself
as a stamp and then fails the strict form fails loudly, naming the file and the line and quoting what
it found:**

```
FAIL: docs/CAMERA_DIRECTOR.md:660 announces a MEASURED stamp that this guard cannot parse, so it
      was about to be dropped from the checked set without a word.
      THAT is the failure — not the formatting.
        found:    <!-- MEASURED: tracking-lag (…) @ PENDING 2026-08-22 depends=client/src/modules/camera/ -->
        expected: <!-- MEASURED: <what> @ <commit> <YYYY-MM-DD> depends=<path>[,...] -->
      <commit> must be a HEX SHA of 7-40 characters. A placeholder such as PENDING does
      not parse — stamp the commit that last changed the dependency, never a word.
```

**Fenced examples are still exempt**, and the line numbers are still true: fences are stripped before
scanning, and they are now replaced by **their own newlines** rather than by nothing, so a reported
line number is the line a reader sees in the file.

### The proof, in both directions

Three tests in `scripts/check-measured-stamps.test.mjs`, deliberately built as a **pair on one line of
one document** so the only variable is whether the commit field parses:

| test | asserts |
| --- | --- |
| *an UNPARSEABLE stamp fails, and names the file and the line* | exit 1, stderr matches `/cannot parse/`, `/DOC\.md:\d+/`, and quotes `PENDING` |
| *the same stamp with a real SHA passes* | exit 0, output reports `1 stamp(s)` — **counted, not merely tolerated** |
| *a MEASURED comment with no `depends=` is reported, not skipped* | exit 1 — the other half of the hole: a stamp naming no dependency can never go stale, the most comfortable possible failure |

**Both were mutation-tested rather than trusted.** Deleting the permissive sweep from the guard fails
exactly the first and third and leaves the other sixteen green:

```
✖ SABOTAGE: an UNPARSEABLE stamp fails, and names the file and the line
✖ SABOTAGE: a MEASURED comment with no depends= at all is reported, not skipped
ℹ pass 16   ℹ fail 2        ← with the fix removed
ℹ pass 18   ℹ fail 0        ← with the fix in place
```

The middle test is the control: without it, the first could be passing because `--doc` rejects
everything rather than because the sabotage was detected.

---

## What this changes, and what it does not

**Changed:** `docs/SHIP-CEREMONY.md` (steps 5 and 7–11, two new TRAP sections, one sentence removed),
`scripts/check-measured-stamps.mjs` (the permissive sweep and the newline-preserving fence strip), and
its test file (three tests).

**Not changed:** no production file, no default, no fingerprint. `check-tags.mjs` is untouched — as
with the last correction to this ceremony, the guard was right and the procedure was wrong.

**This ship uses the ordering it just wrote.** The merge is pushed alone with its tag, CI is confirmed
green for the merge SHA before the follow-up, and no stamp in this branch carries a placeholder.

## PROPOSALS

**1. `check-tags` should read the register line's SHA as well as its name.** The ceremony leans on the
fact that it does not — that is what makes a provisional SHA survivable in the merge commit — but the
consequence is that a register line can name the wrong commit forever and nothing notices. The
step-11 correction is currently guarded by the shipper remembering. **Cost:** one comparison, plus a
tolerance for the window between step 9 and step 11 (or run it only against `origin/master`). **What
it prevents:** a register that quietly stops describing the tree it points at.

**2. Sweep the other guards for the same silent-drop shape.** This was the fourth instance in a week
of a check that skips what it cannot parse. `check-config-claims`, `check-doc-links` and
`check-index` all scan documents with patterns; each should be asked the same question — *what does
it do with a line that looks like its subject and does not match?* **Cost:** an afternoon of reading
and one test per guard. **What it prevents:** the next of these, found the same expensive way.

# TAG-GUARD-2 — the guard now checks the direction it was built for

**Date:** 2026-08-05 · **Branch:** `tag-guard-2`, pushed.
**Base:** master @ **`6179921c`**, not the `a693010` the spec names — `6179921c` is one docs-only
commit ahead (the LOCAL-INVENTORY-2 report, committed after the spec was written) and contains it.

---

## BUILD-VS-SPEC CONFORMITY

| Spec | Status |
|---|---|
| §1 make register→origin fail loudly, naming the tag | **BUILT** |
| §1a decide whether reliable extraction exists; propose a format change if not | **BUILT — extraction IS reliable, no format change needed**, §1 |
| §1b retired tags excluded by an EXPLICIT named mechanism | **BUILT** — the section heading, §2 |
| §1 decide with a reason whether CI covers local-only tags | **DECIDED: no** — §3 |
| §1 trap tests, failure proved before pass (L187) | **BUILT** — +5 tests, failing case first |
| §2 worktree prune, before/after | **DONE — and it did NOT clear them**, §4 |
| §3 guards green, script suite includes the new failing case | **DONE** — 126/126 |
| §3 stop if anything outside `scripts/` and `docs/` is touched | **RESPECTED** — the diff is `scripts/` only |

---

## 1. THE PARSING PROBLEM — measured, and it has a clean answer

**A name scan is unusable, and I can put a number on it.** Scanning `docs/TAGS.md` for backticked
tag-shaped tokens finds **292 candidates, of which only 66 are tags — a 77% false-positive rate.**

**Why, concretely: a tag name is indistinguishable from a BRANCH name.** `pre/anchor-truth` is a tag;
`pre/greenfield-proto` is a branch. Both are backticked, both share the prefix vocabulary, and the
register discusses branches at length because archiving them is part of the lifecycle. Nine of the
absent tokens sit under the heading *"Permanent anchors (do NOT delete)"* and every one of them is a
**branch** — `exp/company-only`, `exp/fair-arrival`, `diag/look-before-brake` and so on. A naive guard
would have opened by screaming about nine permanent anchors that were never tags.

**But the register already has a machine-readable convention, and it is exactly the right one.** When
it *registers* a tag it writes a DECLARATION — a list item whose first token is a backticked name
followed immediately by a backticked sha:

```
- `pre/anchor-truth` (`c299fdf7`, 2026-08-04) — master's tip after CI-AUDIT-GREEN-1 …
```

Measured against the real register: **49 declarations, all 49 real tags, ZERO false positives.**

| | |
|---|---|
| precision | **100%** (49/49) |
| recall | 49 of 66 origin tags |

**The 17 it does not reach are legacy entries in flat lists without a sha** — and they are covered by
direction 1, which passes. **Precision is the property that matters here**: a missed line is a much
smaller sin than a false alarm, because a guard people learn to ignore is worse than the gap.

**So: no register format change is needed.** More importantly, the declaration form is the form
*every new registration is written in* — including the one I wrote for `pre/anchor-truth` two days
ago — which means the guard covers precisely the lines where the incident could recur.

---

## 2. RETIRED TAGS — excluded by the heading, explicitly

The lifecycle collapses tags onto a phase endpoint by an owner-approved keep-list, so the register
legitimately names tags that no longer exist. **The named mechanism is the SECTION HEADING**: any
declaration under a heading matching `/RETIRED|COLLAPSED/i` is history and never fails.

**And it is written down precisely because today it excludes nothing.** No declaration currently sits
under such a heading — the 177 retired tags live in flat lists without shas, so they were already
invisible to the parser. Relying on that coincidence is how a rule becomes a trap somebody later
trips; the exclusion is now a rule with a test, not an accident.

---

## 3. LOCAL-ONLY TAGS — deliberately NOT a CI check, and here is why

**CI runs on a fresh runner that has nobody's local tags.** The question "does this tag exist only on
the owner's machine?" is not merely hard in CI, it is **unanswerable there** — the runner clones from
origin, so every tag it can see is by definition an origin tag.

`scripts/audit-local.mjs` already reports local-only tags, it runs on the machine where the answer
exists, and LOCAL-INVENTORY-2 established the inventory habit. **The inventory owns this direction;
CI owns the two it can actually see.** That is now stated in the guard's own header so the next
reader does not mistake the gap for an oversight.

---

## 4. THE WORKTREE STUBS — prune identified all ten and deleted none

**Before:** one live worktree (this checkout), **10** stubs in `.git/worktrees`.
`prune --dry-run` listed all ten as `gitdir file does not exist`.

**`git worktree prune` failed on every one:**

```
Removing worktrees/baseline-wt: gitdir file does not exist
error: failed to delete '.git/worktrees/baseline-wt': Permission denied
… identically for all ten …
```

**After:** still 10. Nothing changed, nothing was forced.

**The cause, diagnosed read-only rather than guessed.** Every stub directory carries
`ReadOnly, Directory, Archive, ReparsePoint` — they are **OneDrive Files-On-Demand placeholders**, and
the `ReadOnly` attribute is what git's delete hits. `.git` itself is a `ReparsePoint` too, so the
whole repository including its metadata is inside the sync scope.

**It is not a lock** — no process is holding them — **it is an attribute.** Clearing it would work,
and that is a filesystem intervention on the owner's OneDrive-backed `.git`, which is exactly what the
spec said was not worth fighting for. They are inert metadata pointing at directories that no longer
exist; they cost nothing but a line in an inventory. **Left in place, and now explained rather than
merely counted.**

---

## 5. WHAT THE GUARD SAYS NOW

```
check-tags: 66 origin tags checked, 0 unregistered; 49 declared in the register, 0 missing at origin.
```

**Tests +5, failing case first per L187:** a declared-but-absent tag fails and is named with its
line and heading; a declaration under a RETIRED heading does not; leaving that section re-arms the
check; **prose mentions of branches do not fail** (the 77% case, pinned directly); and a list item
without a backticked sha is not a declaration. Script suite **126/126**.

---

## 6. PROPOSALS

### 6.1 On your proposal 1 — they are ONE lesson, and it is already written

Yes, and it is **Lesson 201, the Half-Repair Law**, written yesterday for the frozen build value:
*one value, several readers, one fixed — and the test covers the fixed one.* This is the same shape
with "reader" generalised to "direction": an incident was diagnosed, the guard built afterwards
covered the neighbouring direction, tests were written for the direction that was covered, and it was
green the whole time.

**What this block adds is the sharper half of that law, and I would fold it into 201 rather than mint
202:** the reason nobody noticed for weeks is that **a partial guard is indistinguishable from a
complete one while everything is clean.** The frozen build value announced itself the moment two
artefacts disagreed; a half-covered guard cannot announce itself at all, because its silence is what
success looks like. **So the corollary is: when you build a guard after an incident, write down the
directions it does NOT check, in the guard.** That is now done here, and it costs four lines.

### 6.2 On your proposal 2 — the ceremony step, and why I would not add it

Nine stubs became ten because `scripts/render-fingerprint.mjs` uses a cold-start worktree and this
project creates throwaway worktrees for baseline comparisons. **They accumulate because creation is
scripted and removal is not.**

**But the cheap ceremony step would not have worked**, which is the finding: `prune` is already the
right command and it *fails* on this machine. Adding "run `git worktree prune`" to the ship ceremony
would add a step that silently does nothing, which is worse than the stubs. **The honest fix is
upstream of the ceremony — a worktree helper that removes its own worktree in a `finally`, so the
stub is never created** — and even that will leave the ReadOnly directory behind. I would not add
anything to the ceremony until the OneDrive attribute question is settled; a ritual that cannot
succeed teaches people that the ritual is optional.

### 6.3 (mine) The register's declaration form should be stated in the register

The guard now depends on a convention that lives nowhere but the guard: *a tag is registered by a
list item naming it with its sha in backticks.* Anyone writing a new entry in a different shape gets
**silently unchecked** — not a failure, which is worse. **One line at the top of `docs/TAGS.md`
saying "register a tag as `` - `name` (`sha`, date) — why ``, and the guard will check it" would make
the contract visible where it is used.** I did not add it because §3 confines this block to `scripts/`
and a `docs/TAGS.md` edit is a register change, however small — it belongs to whoever next touches the
register.

### 6.4 (mine) Recall is the honest weakness, and it has a one-command fix

Direction 2 covers 49 of 66 tags. The 17 legacy entries are safe today only because direction 1
passes — if a legacy tag were ever deleted from origin *and* its flat-list mention stayed, **both
directions would be silent**: direction 1 iterates origin (so a deleted tag simply is not there to
check) and direction 2 never sees a line without a sha.

That is a real residual hole and I want it named rather than left implied. **The fix is not more
parsing — it is backfilling shas into the 17 legacy entries**, after which recall is 100% and the hole
closes by construction. It is mechanical (`git rev-parse` each name once) and it is a register edit,
so it is the same owner as 6.3.

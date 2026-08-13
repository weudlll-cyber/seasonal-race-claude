# SHIP-FINISH-BAND — the finish line is a line, not a hair

**Merge `354859bc`. Tags `pre/ship-finish-band` (`b4be55ea`) and `v-ship-finish-band` (`354859bc`).**
**RENDER minted. WORLD and CAMERA measured and unmoved.**

**The owner judged a production build of `de957c2b` on 2026-08-13, on dirt-oval and garden-path, and
ACCEPTED it.** Merge authorised.

The change itself is [FINISH-READABLE-2](FINISH-READABLE-2.md). This report carries only what a ship
can: the forward merge, the re-measurement it forced, and the mint.

---

## 1. The branch was 26 commits behind, and that had to be fixed first

`feat/finish-readable` was cut off `e1f53781`. Master had since taken RUNIN-1, RESOLVE-CONVERGE-1,
ENDING-PICTURE-1, the corridor floor work, CAMERA-ENDING-WINDOW-1 and STAMP-COMPLETE-1.

**Verified from the remote rather than assumed:** `git merge-base --is-ancestor origin/master HEAD`
returned non-zero and `git rev-list --count HEAD..origin/master` was **26**.

**Every fingerprint in FINISH-READABLE-2 was therefore measured against a base that no longer exists,
and none of it was minted.** That report's `db98466db3b2bba4` is not this ship's value and never was.

Master was merged into the branch (`69e4b27b`). One conflict, in
`reports/evolution/INDEX.md`, where both sides had added entries at the head of `## Ships` — resolved
by keeping both, which is what both sides meant.

## 2. The band was re-measured, not argued from the diff

The band's dimensions are SCREEN sizes converted back through the effective zoom, and the camera work
that arrived in the forward merge moves that zoom. So `scripts/finish-band-truth.mjs` was re-run in
full on the merged tree.

**The band's depth is identical on all ten tracks at all three shots, before and after:**

| track | widest overview | | mid-race | | tightest endgame | |
| --- | --- | --- | --- | --- | --- | --- |
| | before | after | before | after | before | after |
| city-circuit | 21.4 | **21.4** | 30.0 | **30.0** | 30.0 | **30.0** |
| dirt-oval | 19.3 | **19.3** | 30.0 | **30.0** | 30.0 | **30.0** |
| garden-path | 21.5 | **21.5** | 30.0 | **30.0** | 30.0 | **30.0** |
| ice-track | 22.9 | **22.9** | 30.0 | **30.0** | 30.0 | **30.0** |
| luger-hill | 30.0 | **30.0** | 30.0 | **30.0** | 30.0 | **30.0** |
| mountainstreet | 30.0 | **30.0** | 30.0 | **30.0** | 30.0 | **30.0** |
| river-run | 30.0 | **30.0** | 30.0 | **30.0** | 30.0 | **30.0** |
| searound | 13.4 | **13.4** | 29.6 | **29.6** | 29.6 | **29.6** |
| seatrack | 30.0 | **30.0** | 30.0 | **30.0** | 30.0 | **30.0** |
| space-sprint | 30.0 | **30.0** | 30.0 | **30.0** | 30.0 | **30.0** |

Label 20.0 px everywhere, before and after. Under-racers ordering holds on all ten.

**What DID move is the SHOT, and it is worth naming because it is the thing that could have caught
us out.** The camera now chooses a different tightest-endgame zoom on two closed tracks:

| track | tightest endgame zoom | painted area there |
| --- | --- | --- |
| garden-path | **5.17 → 4.98** | 28,496 → 27,448 px² |
| city-circuit | 6.91 → 6.90 | 37,862 → 37,842 px² |

**The band measured the same 30.0 px in both.** That is the screen-size design proving itself against
a camera that changed a great deal underneath it — the shot moved, the marking did not.

## 3. The mint

Measured on the merged tree, no `--cheap`:

| role | stored before | on the ship tree | |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unmoved — RUN, not argued** |
| camera | `d7a8fe54072df6d7` | `d7a8fe54072df6d7` | **unmoved — RUN, not argued** |
| render | `c962df5334277f95` | **`d1c9d5d0da6a964f`** | **minted** |

**WORLD and CAMERA were run rather than inferred**, though `engine-reach --check` clears both changed
paths and routing skipped them. The brief said not to assume it, and the record already carries the
reason: an argument from `engine-reach` is about the working tree, not about a merge.

**The render value differs from the branch's own `db98466db3b2bba4`, and the difference is master's,
not the band's.** RUNIN-1 changed the transform on every drawn frame of the endgame, so master's
render baseline had already moved from `096f2726c45ed853` to `c962df5334277f95` while this branch
was away. The band's contribution is the same in both; the base under it is not.

`npm run verify` on the merged tree: **PASS 12 FAIL 0 SKIP 8**, client suite 205 files / 4018 tests.

## 4. What the ship carries that the branch did not

- **`scripts/finish-band-truth.mjs`**, the instrument. FINISH-READABLE-1 measured with an ad-hoc
  script that was never committed, which is why its numbers cannot be re-run today. This one can.
- **The forward merge itself**, so the next reader of `v-ship-finish-band` gets a tree that contains
  both the band and everything master had learned while the branch was away.

## 5. CI

**Run `31727190878`, conclusion `success`, head SHA `04f40a103dc735d4a12a8b186a653ab4fc873c68`.**

Read from the remote, not from the local branch. This section was written PENDING and filled in
afterwards rather than pre-filled: a report that names a run id before the run exists is not evidence
of anything.

**The precise relationship, because it is easy to blur.** CI ran on `04f40a10`, the mint commit,
which is the head of the push. The tagged ship `v-ship-finish-band` is `354859bc`, the merge commit —
its parent. `04f40a10` **contains** `354859bc` and differs from it only by the mint, the tag register
and this report. GitHub Actions runs on the head of a push, so the merge commit has no run of its
own; that is stated rather than glossed.

**`origin/master` moved `b4be55ea` → `04f40a10`, confirmed by reading the ref back from the remote:**

```
$ git ls-remote origin master
04f40a103dc735d4a12a8b186a653ab4fc873c68	refs/heads/master

$ git ls-remote --tags origin | grep finish-band
b4be55eaaf54c53975ffa85e401a825363a85a58	refs/tags/pre/ship-finish-band
354859bccbb7fc0f6403782123b1373f2183e7a6	refs/tags/v-ship-finish-band
```

`check-tags`: 109 origin tags, 0 unregistered, 0 missing at origin.

## 6. The quotations, and what was not rewritten

The owner corrected the spec mid-ship: **his words are not to be quoted at all** — not in German, not
translated, not in commit messages, not in documents. The quotation exception is closed, so his
verdicts are recorded as attributed, dated facts.

**Every occurrence this branch introduced was removed** — six files, nine occurrences, listed in
`04f40a10`'s commit message. Two were in `trackRendering.js` and two in `finish-band-truth.mjs`; both
edits are comment-only and **the render fingerprint was re-run afterwards to prove it, still
`d1c9d5d0da6a964f`**. The merge commit's own message was amended for the same reason, which is why
the ship is `354859bc` and not the `131f5d46` an earlier draft of this file named.

**Two things are reported rather than rewritten:**

1. **`84b7c8f0` and `de957c2b`** are already published on the branch and carry quotations in their
   messages and in the file content they introduced. Rewriting them needs a force-push of published
   history — the owner's call, not a step to take unasked. **The tree at master's head carries
   none**; only those two commit objects do.
2. **Three pre-existing German quotations in `reports/evolution/INDEX.md`** (the entries for
   CAMERA-COMPANY-ONLY-3, CAMERA-COMPANY-1 and CAMERA-PICTURE-FIXES-1). They arrived via the forward
   merge from master, predate the closure, and **the branch introduced none of them** — verified by
   diffing the added lines, which contain zero. They are grandfathered under CLAUDE.md's own clause.
   Worth noting: the closing inventory in CLAUDE.md does not list `reports/` at all, so these sit
   outside it by scope rather than by oversight.

**The scan was an inventory, not an impression:** every commit message in `b4be55ea..HEAD`, and every
added line of the full diff.

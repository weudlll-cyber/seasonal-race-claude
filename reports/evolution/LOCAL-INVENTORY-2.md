# LOCAL-INVENTORY-2 — what exists only on this machine

**Date:** 2026-08-05 · **READ-ONLY.** Nothing was deleted, pruned, pushed, copied or exported.

---

## THE ONE THING THAT IS UNIQUE AND UNPROTECTED

**About 9 MB — three background images you uploaded — exist nowhere except this disk and OneDrive.**

```
server/data/backgrounds/2c02ee38d898.jpg   3.2 MB
server/data/backgrounds/d4ee12be7c33.jpg   2.7 MB
server/data/backgrounds/e26cbbcb1cc5.jpg   3.1 MB
```

Plus a handful of small JSON files: your `users.json` (accounts), one brand, one brand-logo, two
player-groups. Everything else in that 68 MB folder turns out to be reproducible — see below.

**The good news, measured rather than assumed:** OneDrive *is* covering it. The sync process has been
running since 01.08 11:45, and every file I sampled in `server/data` carries the `ReparsePoint`
attribute, which is what OneDrive puts on files it manages. So the folder is inside the sync scope —
that was your open question and the answer is yes.

**The caveat that matters more than the answer: OneDrive is sync, not backup.** If a file is deleted
or corrupted here, the deletion syncs. It protects you against this laptop dying; it does not protect
you against a mistake. **Nine megabytes of images is small enough to copy somewhere else once, by
hand, and forget about.** That is the only decision this report actually asks of you.

---

## 1. `node scripts/audit-local.mjs` — verbatim

```
RaceArena — local hygiene audit (read-only)

=== git status --short (untracked + modified) ===
(clean)

=== git stash list ===
(no stashes)

=== non-master local branches ===
(master only)

=== local-only tags (present locally, absent on origin) ===
(none — all local tags are on origin)

=== untracked *.md anywhere (living-doc candidates — commit or delete) ===
(none)

=== scratch / tmp size (reproducible artifacts — safe to purge) ===
C:\Users\weudl\AppData\Local\Temp\racearena-scratch  —  273.6 MB across 847 files
C:\Users\weudl\OneDrive\Dokumente\Seasonal race claude\client\tmp  —  1.3 MB across 32 files
C:\Users\weudl\OneDrive\Dokumente\Seasonal race claude\results  —  606 B across 1 files
```

**Interpretation.** Five of six categories are empty. The sixth is 275 MB of scratch, all
**REPRODUCIBLE** — sweep output regenerable from the repo and a seed, and already sited off the
OneDrive tree. *What I would do: purge it when the disk matters, not before.*

`anchor-truth` no longer appears as a non-master local branch — **that sub-item is done**, deleted
alongside the remote one in TIDY-ORIGIN-1.

---

## 2. THE FIVE CHECKS THE TOOL DOES NOT COVER

**(a) Local commits not at origin — NONE.** `origin/master..HEAD` = **0**. Nothing exists on one disk
only. *Nothing to do.*

**(b) Behind origin — NO.** `HEAD..origin/master` = **0**; local and origin are both `a6930104`. Your
dev server is running from exactly what shipped. *Nothing to do.*

**(c) Worktrees — ONE live, TEN orphaned.** `git worktree list` shows only this checkout.
`.git/worktrees` holds **10** metadata folders (up from the nine reported earlier), every one of them
`gitdir file does not exist`, and `prune --dry-run` says it would remove all ten:

```
baseline-wt · master-check · master-sim · prefix-wt · ra-baseline
rav · rfp · sim-baseline-stageC · sim-baseline-y-reject · wt-4aa0a40
```

**REPRODUCIBLE** — pure metadata pointing at directories that are already gone; they hold no content.
*What I would do: `git worktree prune` whenever you like. I did not, as instructed. It is the safest
item on this page.*

**(d) Tags, both directions — CLEAN BOTH WAYS.** 66 local, 66 at origin, and the two sets are
identical: nothing local-only, nothing origin-only. *Nothing to do* — but see §4.2, because the
guard that is supposed to protect this only looks one way.

**(e) `server/data` — 68 MB, 259 files, and mostly NOT unique.** Ignored by `.gitignore:25`
(`server/data/**`), with a single exception at line 26 (`!server/data/README.md`, which is the one
tracked file). Newest content: `sessions.sqlite` today 11:59 (your running server), then
`users.json` 2026-08-01 23:48.

Breaking the 68 MB down instead of repeating it as one scary number:

| | size | verdict |
|---|---|---|
| 10 backgrounds byte-identical to `server/seeds/backgrounds` | ~52 MB | **REPRODUCIBLE** — already in git |
| **3 backgrounds you uploaded** | **9.0 MB** | **UNIQUE** ← the whole finding |
| 10 tracks | 360 KB | **REPRODUCIBLE** — they differ from the tracked seeds by exactly one schema key (`defaultDuration` vs `defaultLaps`); no geometry, no value differs |
| `tracks-backups` | 4.1 MB | historical snapshots of tracks that are themselves reproducible — **low value** |
| `users.json`, 1 brand, 1 brand-logo, 2 player-groups | ~25 KB | **UNIQUE**, tiny |
| `sessions.sqlite` | 12 KB | **REPRODUCIBLE** — log in again |

---

## 3. THE PICTURE, IN ONE PARAGRAPH

**The books are as closed as they look, with one real exception.** Nothing is uncommitted, nothing is
unpushed, nothing is stashed, no branch or tag exists on only one side, and the checkout is exactly
what shipped. The 275 MB of scratch and the ten orphaned worktree stubs are junk you can clear at any
time. **The only thing on this machine that could not be rebuilt from the repository is about 9 MB —
three background images — plus a few kilobytes of accounts and groups.** OneDrive is genuinely
covering them, which answers your question; but OneDrive mirrors mistakes as faithfully as it mirrors
files, so the one decision worth making is whether those three images get a copy that is not a sync.

---

## 4. PROPOSALS

### 4.1 On your proposal 1 — fold in only two of the five, and one of them is the point

Three of the five checks came back empty and would become noise: ahead-of-origin, behind-origin and
the tag cross-check all print "clean" today. **Two earned their place:**

- **`git worktree prune --dry-run`** — it found ten stale entries, it is one line, and it is the kind
  of debris that only ever accumulates.
- **`server/data`, reported as UNIQUE vs REPRODUCIBLE rather than as a total.** The tool's existing
  categories all answer "is it committed?"; this one answers "could we rebuild it?", which is the
  question that actually matters for an ignored directory. Reporting "68 MB" would have been useless
  — the useful number is 9 MB, and it only appears if the tool diffs `data` against `seeds`.

I would **not** add ahead/behind: `git status` already says it every time you type it.

### 4.2 On your proposal 2 — it catches ONE direction, and it is the wrong one

I read the source rather than guessing. `check-tags.mjs` takes `git ls-remote --tags origin` as its
source of truth and asserts every **origin** tag appears in `docs/TAGS.md`.

**So it catches exactly one thing: an origin tag missing from the register.** It cannot see either of
the other two:

- **a registered tag that exists nowhere** — TAGS.md can name a phantom anchor forever, and the guard
  passes because it never iterates the register;
- **a local-only tag** — invisible, because origin is the source of truth.

**That second blind spot is precisely the failure your §0 cites**: "a return tag was registered in
docs/TAGS.md while existing on no machine but the owner's." The guard we built after that incident
does not check the direction the incident came from. Today both directions happen to be clean (§2d),
so this is a latent hole, not an active one — but it is worth one line of code, iterating the register
and asserting each named tag resolves.

### 4.3 (mine) The scratch pile is 275 MB and nothing decides when it goes

`audit-local.mjs` reports scratch size every time and has done for weeks; it has grown to 275 MB
across 847 files and no run has ever acted on it, because "safe to purge" is advice, not a trigger.
**Either give it a threshold that makes it a finding (say, "over 500 MB — purge") or stop printing it
every run**, because a number that is always there and never actionable is the thing that teaches
people to skim the tool — the exact failure your proposal 1 is trying to avoid.

### 4.4 (mine) The reproducible/unique split is the general lesson, not a `server/data` detail

The useful move in this whole inventory was refusing to treat an ignored directory as one lump.
"68 MB unprotected" and "9 MB unprotected" call for completely different reactions, and the
difference was one `cmp` against `server/seeds`. **The general rule: for any ignored directory, the
honest report is not its size but the part of it that cannot be regenerated** — and that is
computable wherever a `seeds/` equivalent exists. It would have saved this project a scare or two.

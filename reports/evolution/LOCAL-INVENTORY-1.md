# LOCAL-INVENTORY-1 — fix the runner's silent-pass, then inventory the local machine

Two separate commits. **Part A** (committed first, alone, `chore(guard)` `@e5c84f7d`) closes a Lesson-187 no-op
trap in the script-test CI step. **Part B** (this report's commit, `chore(inventory)`) inventories everything on
this machine that `origin/master` structurally cannot see — untracked/ignored files, local branches/tags,
stashes, scratch, and OneDrive conflict copies. **Nothing was deleted, moved, renamed, stashed, cleaned, pruned,
gc'd, committed, or added to `.gitignore`.** Every removal is the owner's decision; this report only recommends.

## PART A — the runner now asserts its own input

**What changed (`.github/workflows/ci.yml`, one step).** The step ran `node --test $(find scripts -name
'*.test.mjs')`. If `find` returns nothing (a rename, move, or extension change), `node --test` runs with no file
args and does **not** run this suite — it either runs zero tests (green, a silent no-op) or discovers unrelated
repo-wide tests. The step now captures the list, asserts it is non-empty, and **FAILS LOUDLY before `node --test`
is invoked**, with a comment recording why so it is not simplified away:

```
files=$(find scripts -name '*.test.mjs')
test -n "$files" || { echo "FAIL: no script test files found ... refusing to pass."; exit 1; }
node --test $files
```

**Proof the assertion fires on an empty list** (the exact step logic, run locally):

```
=== EMPTY-LIST case (find -name '*.NOMATCH') ===
FAIL: no script test files found under scripts/ (find returned nothing). A green run with zero tests is the
Lesson-187 no-op trap; refusing to pass.
exit code: 1

=== REAL-TREE case ===
ℹ tests 121   ℹ pass 121   ℹ fail 0     (exit 0)
```

**Note on the original claim.** The spec verified "an empty file list gives exit code 0"; on *this* machine
(node 24, node_modules present) the empty-args case instead discovers ~280 repo-wide test files and exits 1
because a server test fails without its environment. The exact exit code is environment-dependent — but in every
environment the empty list runs the *wrong* thing, never the intended scripts suite, so the non-empty assertion
is the correct environment-independent fix.

## PART B — HEADLINE

**Eight categories inventoried. Exactly ONE holds anything UNIQUE: `server/data/` (68 MB) — the owner's local
application content (tracks, backgrounds, brand logos, users, sessions), git-ignored and therefore invisible to
origin.** And even that is **OneDrive cloud-synced** (the repo lives under a OneDrive path) and partly
re-seedable, so it is not unbacked — only invisible to a fresh `git clone`. Everything else on the machine is
**reproducible**: 202 MB of off-tree sweep scratch, node_modules/dist, and small tool outputs. **Zero** local-only
branches, **zero** local-only tags, **zero** stashes, **zero** abandoned work-in-progress, and **zero** OneDrive
conflict copies. In short: the origin-invisible surface is one bucket of unique-but-cloud-synced app data and a
pile of regenerable scratch.

## Findings by category

`scripts/audit-local.mjs` covers items 1, 3, 4, 5 and the scratch sizes of item 6, and confirms a clean tree,
master-only, no local-only tags, no stashes, no untracked `*.md`. What it does **not** cover and I added by hand:
the **ignored** untracked files (item 2 — the ones nobody ever sees), branch-vs-remote divergence, the OneDrive
conflict search (item 7), and the per-subdir scratch/artefact breakdown with dates.

**1. Uncommitted work.** NONE. Working tree clean; no modified/staged/conflicted paths. *(reproducible/N/A)*

**2. Untracked files (all are git-IGNORED; there are zero non-ignored untracked files).** By directory:
  - **`server/data/` — 68 MB — UNIQUE (the standout).** The live backend content: `backgrounds/` 61 MB (13
    files), `tracks-backups/` 4.1 MB, `brand-logos/` 2.9 MB (2), `tracks/` 360 KB (10), `brands/` 21 KB (2),
    `player-groups/` 17 KB (3), `racers/` 12 KB, `sessions.sqlite` 12 KB, `users.json` 4 KB, plus small config.
    This is the owner's actual RaceArena state. **Partly** re-seedable (the default tracks), **partly** genuinely
    unique (uploaded backgrounds, brand logos, custom brands, users, player groups, session db) — I could not
    tell which tracks are default vs custom without running the app (I did not). Cloud-synced via OneDrive.
  - `node_modules/` (root, `client/`, `server/`), `client/dist/`, `.husky/_/` — standard build/install output.
    *(reproducible: `npm ci` / build)*
  - `.playwright-mcp/` — 19 KB — Playwright-MCP browser session logs (`console-*.log`, `page-*.yml`) from
    2026-07-28. *(reproducible/disposable)*
  - `.claude/settings.json`, `.claude/settings.local.json` — 16 KB — local Claude Code settings. *(local config;
    `settings.local.json` is machine-local by convention)*

**3. Local branches vs origin.** `master` only, tracking `origin/master`, **0 ahead / 0 behind** (tip
`e5c84f7d` == origin after the Part-A push). No local-only or diverged branches; no orphaned work. *(N/A)*

**4. Local-only tags.** NONE. All 45 local tags are present at origin (the mirror image of the class
`check-tags` guards; clean in both directions). *(N/A)*

**5. Stashes.** NONE. *(N/A)*

**6. Scratch and result artefacts.** All REPRODUCIBLE sweep/gate output (regenerable from seeds + scripts):
  - **Off-tree scratch** `…/AppData/Local/Temp/racearena-scratch` — **202 MB, 705 files**, deliberately off the
    OneDrive tree: `roster-matrix/` 104 MB (2026-07-30), `flapping-gate/` 50 MB (2026-07-31), `premotion-holm/`
    30 MB (2026-07-31 — the pre-motion Holm comparator), `fp/` 11 MB, `fairness-recheck/` 11 MB.
  - In-repo (ignored): `client/tmp/` 712 KB (`fp/`, `rm-smoke/`), `results/front-action/` 8 KB.

**7. OneDrive conflict artefacts.** NONE found. Searched the repo tree for `*-Kopie*`, `*Konflikt*`, `*conflicted
copy*`, `*-DESKTOP-*`/`*-LAPTOP-*`, `* (1).*`/`* (2).*`, `*-Copy*`, and the device name `*TESTRECHNER*` — zero
matches. The repo is clean of sync conflict copies. *(N/A)*

**8. Anything else surprising.** The one genuine surprise is item 2's `server/data/`: it is the single most
valuable origin-invisible thing on the machine, and it is invisible not by accident but by design (`.gitignore`
keeps runtime data out of git). The mitigation (OneDrive sync) is real but silent — worth the owner knowing it is
the backstop. No stray experiment branch, half-written script, or uncommitted report exists (the only ad-hoc
script from this session, a pre-motion Holm comparator, lives in the session scratchpad off-repo and is
reproducible).

## RECOMMENDATIONS (no action taken — owner decides every removal)

| Finding | Recommendation | Reason |
|---|---|---|
| `server/data/` (68 MB) | **KEEP — owner-decides on backup posture** | Unique owner content; git-invisible but OneDrive-synced. Not clutter. If anything, confirm OneDrive is actually syncing it (see gaps). |
| Off-tree scratch (202 MB) | **regenerate-on-demand** | Pure sweep/gate output, reproducible from seeds; `sim-fairness.mjs --purge-tmp` clears it. Off the OneDrive tree already, so it is not costing cloud quota. Owner may purge any time. |
| `client/tmp/`, `results/`, `.playwright-mcp/` | **regenerate-on-demand** | Small, reproducible tool/run output. |
| `node_modules/`, `client/dist/` | **regenerate-on-demand** | Standard `npm ci` / build output. |
| `.claude/settings.local.json` | **KEEP (local config)** | Machine-local Claude settings by convention. |
| branches / tags / stashes / conflicts | **nothing to do** | None found. |

## What I could NOT see or check (honest gaps)

- **Which `server/data/tracks` and `backgrounds` are default-seeded vs owner-custom.** Settling this needs
  running the app or diffing against seed data — I ran nothing (compute budget). Recommendation treats the bucket
  as unique to be safe.
- **Whether OneDrive is actually syncing `server/data`** (vs an exclusion / paused sync). I confirmed the path is
  under OneDrive but did not inspect OneDrive's own sync state or selective-sync settings.
- **The wider OneDrive tree outside the repo.** A conflict copy could exist elsewhere under OneDrive; my
  conflict search was bounded to the repo tree because a full `find` over the OneDrive parent timed out (>2 min).
  I checked exactly where a conflict copy of a repo source/doc file would land — the repo tree — and found none.
- **`node_modules` integrity / contents.** Not inspected; treated as reproducible.

## VERIFICATION (verbatim, from the committed state — SHIP-CEREMONY step 12)

```
$ git status --porcelain
  (empty — clean)
  # The ONLY change this task made to the tree — this report + its one INDEX.md line — is now committed,
  # so git status is completely clean. That is the proof the inventory touched nothing else.

$ git stash list
  (empty — no stashes)

$ git branch -vv
* master a7eeaec2 [origin/master: ahead 1] chore(inventory): inventory the origin-invisible local machine (LOCAL-INVENTORY-1)
  # "ahead 1" = this inventory commit, captured before the push below.

$ git tag | wc -l
45

$ node scripts/audit-local.mjs
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
C:\Users\weudl\AppData\Local\Temp\racearena-scratch  —  202.4 MB across 705 files
C:\Users\weudl\OneDrive\Dokumente\Seasonal race claude\client\tmp  —  653.0 KB across 23 files
C:\Users\weudl\OneDrive\Dokumente\Seasonal race claude\results  —  606 B across 1 files
```

## PROPOSALS (≥2)

1. **The cheap repeatable check worth having is NOT another mess-guard — it is a one-line `server/data` backstop
   check; the scratch is fine as-is.** A local tree is allowed to be messy in ways origin is not (202 MB of
   regenerable scratch is a feature, not debt — it is off the OneDrive tree and one `--purge-tmp` away). Guarding
   *that* would cost attention for no risk. The only origin-invisible thing that would actually hurt to lose is
   `server/data`, and the useful check is a tiny read-only line in `audit-local.mjs` that prints whether
   `server/data` exists, its size, and whether it sits under a synced OneDrive path — so every audit reminds the
   owner that the one irreplaceable bucket is present and (presumably) backed up. Small, honest, no new guard
   infrastructure.
2. **Add a `server/data` export/import to the ceremony's orbit, not a guard.** Because `server/data` is
   deliberately git-ignored, the project has no in-repo way to snapshot the owner's tracks/brands/users other
   than OneDrive. A `scripts/export-owner-data.mjs` that zips `server/data` to a dated archive (off-tree, on
   demand) would give a portable backup independent of OneDrive — useful before a risky migration or a machine
   change. Unscheduled; owner's call.
3. **"Not worth it" for a between-sessions cleanliness guard.** Given the inventory came back this clean — no
   stray branches, tags, stashes, WIP, or conflicts — a recurring local-hygiene guard would mostly report "still
   clean" and train the eye to ignore it. `audit-local.mjs` run on demand (as here) is the right cadence. The
   honest recommendation is to *not* build a scheduled local-mess guard.

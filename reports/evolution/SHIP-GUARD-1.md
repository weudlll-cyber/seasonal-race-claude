# SHIP-GUARD-1 — write the ceremony down, then let CI enforce its two blind spots

DOC-SYNC-2 repaired documentation drift by hand — an unindexed report, two unregistered tags, a canonical
fairness doc two engine changes stale — because the ship ceremony updates SIM.md and REBASELINE but has no step
for the INDEX, the tag register or the canonical docs, **and the ceremony is not written down anywhere in the
repo**. This change writes the ceremony down and gives CI the two cheap guards that catch exactly the classes a
human reviewer cannot see. Docs + scripts + one CI workflow edit; **no file under client/ or server/**, no
fingerprint minted, zero simulation/gate/sweep runs. Base: master `@a653cde`.

## BUILD-VS-SPEC CONFORMITY (step by step)

### STEP 1 — docs/SHIP-CEREMONY.md (new) + CLAUDE.md pointer
**Written:** a numbered, checkable ceremony derived from the record of the changes that actually ran it
(RACER-FLAPPING-2, RACER-MOTION-2, HOLM-300-COMBINED, the REBASELINE top block). It covers, in order: pre-flight;
the paired N=100 quartet gate against the CURRENT shipped world (never gold numbers from another run); minting one
fingerprint per world on the final committed state; the REBASELINE top block (new current, previous demoted); the
SIM.md lineage entry; golden/replay/parity; the `pre/<name>` tag AND its TAGS.md entry as **one step**; the report
AND its INDEX.md entry as **one step**; the canonical-doc sweep (FAIRNESS / PROJECT-PRINCIPLES / ARCHITECTURE) on
any shipped-world change; the owner's eye on a live trace + the LIVE-TRUTH console line for UI/camera (Lesson 191);
and running the three guards before the commit. A **ONE CANONICAL HOME** section names the seven homes in force.
CLAUDE.md gained a permanent "Ship ceremony" section pointing to it. **Deviation:** none. Where the record was
unambiguous I wrote the step as practised; I did not invent steps. One judgement call, declared: I added a
"pre-flight" step (#0: UI-configurable, eslint/build/tests green before measuring) and a "commit/push/verify" step
(#12) — both are universally practised in the source reports but not called out as named steps there; I made them
explicit rather than leave them implicit.

### STEP 2 — scripts/check-index.mjs (new)
**Written:** a read-only guard — every `*.md` in `reports/evolution/` (INDEX.md itself exempt) must appear as a
markdown LINK TARGET in INDEX.md. Prints `check-index: N reports checked, U unindexed.`; on failure prints each
unindexed filename one per line and exits non-zero. **Loud-failure rule honoured:** an unreadable dir, an
unreadable index, or ZERO reports each FAIL (a guard that finds nothing to check is the Whitelist trap, Lesson
187). **Deviation:** none. Note: matching is on the link-target form `(NAME` / `/NAME`, not a bare-filename
substring, to avoid false-passing "A.md" inside "DATA.md".

### STEP 3 — scripts/check-tags.mjs (new)
**Written:** a read-only guard — every tag at origin (`git ls-remote --tags origin`, which fetches; the origin
state is authoritative) must be named in docs/TAGS.md. Ignores the dereferenced `^{}` lines annotated tags emit.
Prints `check-tags: N origin tags checked, U unregistered.`; on failure prints each unregistered tag with its
short commit and exits non-zero. **Loud-failure rule honoured:** an empty or unavailable tag list FAILS — a CI
checkout that omits tags must break the build, not bless it. A `--tags-file` override lets the guard be exercised
without the network (used by the liveness test). **Deviation:** none.

### STEP 4 — liveness tests (scripts/check-index.test.mjs, scripts/check-tags.test.mjs)
**Test home:** the existing script tests live co-located as `*.test.mjs` using `node:test`, run via `node --test`
(e.g. `scripts/sim/observers/*.test.mjs`); they are NOT currently wired into CI. I followed that precedent exactly
— co-located `scripts/check-index.test.mjs` + `scripts/check-tags.test.mjs`, `node:test`. Each feeds a synthetic
fixture with a KNOWN violation (asserts non-zero exit + the offender named), a clean fixture (asserts exit zero),
and an empty fixture (asserts the loud-failure rule). **Deviation / finding, declared:** the script test suite is
not run by CI today, so these liveness tests are not yet gated — I did not wire them in (STEP 5's scope is the
guards, not the script test runner). Proposal 1 addresses this.

### STEP 5 — CI wiring (.github/workflows/ci.yml)
**Written:** both guards added to the existing **docs** job as separate named steps ("Check every report is
indexed", "Check every origin tag is registered") after the link-check step, so a failure names itself. The docs
job's checkout gained `fetch-depth: 0` so the tags are present (and `git ls-remote` works); the job name was
updated to "Living-doc guards (links, index, tags)". No other job touched. **Deviation:** none (the job rename is
within the same job).

### STEP 6 — the three DOC-SYNC-2 residuals
**6a:** verified `pre/hygiene` → `a4103bb4` (sits at the DOC-SYNC-1 report commit) and `pre/router-7` →
`83f5c8d9` (sits at the HYGIENE-1 STEP 4 commit); registered both in the existing 2026-07-29 hygiene/DOC-SYNC
reconciliation section of TAGS.md (not a new one), with commit, date, and the world each restores (COMBO15,
unchanged). After this `check-tags` passes with zero unregistered. **6b:** the RACER-MOTION-1 INDEX entry's
trailing "NEEDS OWNER CALL before the overnight ceremony" replaced with the recorded outcome (owner DECLINED the
hard-separation trade) + a pointer to DEAD-ENDS §H. **6c:** stale-hash sweep — see the distinction below.
**Deviation:** none.

### STEP 7 — backlog decisions (owner-approved 2026-07-31)
**7a:** "Re-Gate on `9cfa953`" marked ✅ CLOSED — SUPERSEDED (its corridorEnd=1.0/bonusMult=2.0 config predates
the plan-grid unification and speed-150 re-baseline; four full gates ran over the successor worlds since:
speed-150 REBASELINE, gap-reroll confirm, COMBO15 N=100, N=300 HOLM-300-COMBINED). Superseded, not abandoned.
**7b:** "Late Challenger (Mechanism B)" marked ✅ CLOSED — SUPERSEDED (runaway closed by gap-reroll 23%→8.3%,
never needed once it shipped; N=300 runaway 0% on all four tracks). **7c:** "E3 speed differential" NARROWED (not
closed): the rowBonus half shipped; recorded explicitly that the OPEN remainder is only the `trajectoryMult` half,
so a future reader does not re-open the shipped part. **Deviation:** none.

## STEP 6c — the distinction I applied

**A commit hash that identifies the CURRENT WORLD is stale by design; a commit hash that anchors a specific
historical CHANGE is correct and durable.** So:

- **Removed** — every `master @94da53e` used as the identifier of the *current* shipped world. That hash was
  correct for exactly one commit (DOC-SYNC-2 wrote it; a653cde made it stale). The durable identifier is the
  **fingerprint** `dc4647be0f55ebdb`, which is already present on every one of those lines. Six living-doc lines
  swept: FAIRNESS.md, PROJECT-PRINCIPLES.md, ARCHITECTURE.md, BACKLOG.md, ROADMAP.md, and INDEX.md's header.
- **Left intact** — commit hashes that name a specific historical change: ship commits (`175a475` =
  v-ship-combo15), tag targets (`d0870326` = pre/flapping, `e99b034d` = pre/motion, `a4103bb4`, `83f5c8d9`), fix
  commits, and fingerprints (`ded0a126`, `62400c8e`, …). Those are correct anchors and must not be stripped.
- **Note:** the current world has no post-ship `v-*` tag — only the `pre/motion` return tag marks its boundary —
  so the fingerprint alone is its durable identifier. (The reports DOC-SYNC-2.md and this file keep `@94da53e`/
  `@a653cde` where they state the historical BASE a doc-pass ran against; reports are the lab journal.)

## VERIFICATION (verbatim)

```
$ node scripts/check-doc-links.mjs
check-doc-links: 289 relative links across 51 living-doc files; 0 dangling.

$ node scripts/check-index.mjs
check-index: 67 reports checked, 0 unindexed.

$ node scripts/check-tags.mjs
check-tags: 45 origin tags checked, 0 unregistered.

$ git diff --stat HEAD
 .github/workflows/ci.yml   | 15 ++++++++++++++-
 CLAUDE.md                  | 12 ++++++++++++
 docs/ARCHITECTURE.md       |  2 +-
 docs/BACKLOG.md            | 14 +++++++++-----
 docs/FAIRNESS.md           |  2 +-
 docs/PROJECT-PRINCIPLES.md |  2 +-
 docs/ROADMAP.md            |  2 +-
 docs/TAGS.md               |  9 ++++++---
 reports/evolution/INDEX.md |  5 +++--
 9 files changed, 48 insertions(+), 15 deletions(-)

$ git status --porcelain          # NO file under client/ or server/ appears
 M .github/workflows/ci.yml
 M CLAUDE.md
 M docs/ARCHITECTURE.md
 M docs/BACKLOG.md
 M docs/FAIRNESS.md
 M docs/PROJECT-PRINCIPLES.md
 M docs/ROADMAP.md
 M docs/TAGS.md
 M reports/evolution/INDEX.md
?? docs/SHIP-CEREMONY.md
?? reports/evolution/SHIP-GUARD-1.md
?? scripts/check-index.mjs
?? scripts/check-index.test.mjs
?? scripts/check-tags.mjs
?? scripts/check-tags.test.mjs

--- FAILURE DEMONSTRATIONS (proof the guards can fail) ---

$ node --test scripts/check-index.test.mjs
ok check-index FAILS and names the offender when a report is unindexed
ok check-index PASSES when every report is indexed
ok check-index FAILS LOUDLY on an empty reports dir (no silent no-op, Lesson 187)
   tests 3 | pass 3 | fail 0

$ node --test scripts/check-tags.test.mjs
ok check-tags FAILS and names the tag + commit when a tag is unregistered
ok check-tags PASSES when every origin tag is registered (^{} lines ignored)
ok check-tags FAILS LOUDLY when the tag list is empty (a checkout without tags, Lesson 187)
   tests 3 | pass 3 | fail 0

$ node scripts/check-index.mjs --dir=<fixture with one orphan report R2.md>
check-index: 2 reports checked, 1 unindexed.

FAIL: 1 report(s) ... not referenced from INDEX.md:
R2.md
   (exit 1)
```

## PROPOSALS (≥2)

1. **Wire the script test suite into CI — the guards are gated, but their proofs-of-life are not.** The two new
   guards run in CI (STEP 5), but their liveness tests — and the existing `scripts/sim/observers/*.test.mjs` —
   are run by nobody automatically. A guard whose failure test never runs can silently rot into a guard that
   cannot fail (the exact Lesson-187 trap). Cheapest fix: one CI step `node --test scripts/**/*.test.mjs` (or a
   `test:scripts` npm script) in the docs job. This closes the meta-gap that this very task exposed.
2. **The next-most-likely drift class neither guard nor the link checker catches: a canonical doc naming a STALE
   shipped-world FINGERPRINT.** check-doc-links sees a valid link, check-index sees an indexed report, check-tags
   sees a registered tag — none of them notices that FAIRNESS.md says the world is `dc4647be` while ARCHITECTURE.md
   still says `62400c8e`. This is precisely the drift DOC-SYNC-2 (stale COMBO15 lines) and STEP 6c (stale master
   hash) had to clean up. **Cheapest honest check: single-source the current fingerprint and grep for agreement.**
   SIM.md's "current print" block already IS the canonical home for the shipped fingerprint; a `check-world.mjs`
   would extract that hash and assert every living doc that writes a 16-hex fingerprint next to the words
   "shipped world" / "current world" cites the SAME one, failing on any mismatch. Pure string work, no simulation,
   same shape as the other three guards — it would have caught both drifts the day they landed.
3. **Make the ceremony a PR/commit template, not just a doc.** SHIP-CEREMONY.md is now the written checklist, but
   a checklist only helps if it is in front of you at commit time. A `.github/PULL_REQUEST_TEMPLATE.md` (or a
   commit-msg hook for fingerprint-moving commits) that pastes the 12-item checklist as unchecked boxes turns "did
   we remember the INDEX entry?" from tribal memory into a box you have to tick — the human-side complement to the
   two machine guards.

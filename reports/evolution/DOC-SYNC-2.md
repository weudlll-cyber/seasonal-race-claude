# DOC-SYNC-2 — reconcile the living docs with the shipped world dc4647be (docs only)

Docs-only reconciliation after two engine changes (RACER-FLAPPING-2, RACER-MOTION-2) and the
HOLM-300-COMBINED gate landed on top of COMBO15. One commit, prefix `docs(sync)`, no source/test/harness/config
touched, **zero measurement runs** — every number is copied from an existing committed report. Base: master
`@94da53e`.

## BUILD-VS-SPEC CONFORMITY (step by step)

### STEP 1 — docs/FAIRNESS.md
**Found:** header line 6 = "Current shipped world: **COMBO15** (master `@175a475`, tag `v-ship-combo15`)" —
confirmed two engine changes stale. Layer-1 wording "**AND zero Holm-unfair start rows**" confirmed present.
**Written:** (1a) header updated to `dc4647be0f55ebdb` = COMBO15 + margin hysteresis (`softSteeringObstacleMargin`
0.5) + lateral acceleration cap (`maxLateralAccelPerStep` 0.0005), master `@94da53e`, OFF invariant
`854018ee5d3d83e1`, link to SIM.md. (1b) added a titled `###` subsection *"The Layer-1 start-row gradient at
N=300 (pre-existing, DOCUMENTED AND SHELVED 2026-07-31)"* under the existing *Documented residuals* section, in
the spec's exact order: what was measured (N=300 native pooled Holm on combined `dc4647be` AND paired pre-motion
`62400c8e`), the finding (searound/luger-hill/seatrack at p=0.020 floor; space-sprint clean), the magnitude
(worst row 88–90%, band within noise, runaway 0%), that it is PRE-EXISTING (cap changes the verdict on 0/4
tracks), the owner's 2026-07-31 DOCUMENT-AND-SHELF verdict, and an explicit statement that the Layer-1 criterion
is NOT weakened — one named, dated exception on record. HOLM-300-COMBINED.md linked. **Deviation:** none.

### STEP 2 — docs/PROJECT-PRINCIPLES.md
**Found:** §8 operational gate (lines 73–74) carries "**AND zero Holm-unfair start rows**"; line 81 "The shipped
world is COMBO15." A second copy of the "0 Holm-unfair start rows" phrase exists at line 104, but that is a
historical *Race-action phase shipped 2026-07-14* note, not the operational-gate mirror.
**Written:** one edit at line 81 — added a one-sentence pointer to the FAIRNESS.md start-row-gradient residual
subsection AND corrected the shipped-world line to `dc4647be` (master `@94da53e`). Residual NOT restated here
(one canonical home). **Deviation:** line 104's historical duplicate left untouched (out of the "operational
gate mirror" scope the spec named) — declared.

### STEP 3 — reports/parity/REBASELINE.md
**Found:** the RESIDUAL-PAID block's caveat paragraph carried the pre-decision framing "(reserved for owner read,
NOT auto-blessed)" and "…is an owner call."
**Written:** replaced that framing with the recorded verdict — **Owner verdict 2026-07-31: DOCUMENT AND SHELF**
(watchdog only hears better; a dedicated project opens only on the owner's word) — and pointed to the FAIRNESS.md
subsection as canonical home. Every measured number (searound 89.3 / luger-hill 91.0 / seatrack 90.7 /
space-sprint 89.0, rowMin 88–90%, p=0.020) kept byte-identical. **Deviation:** a pre-existing "0\4" rendering
artifact on line 40 (outside the caveat paragraph) was left as-is to hold the diff to the caveat — declared.

### STEP 4 — reports/evolution/INDEX.md
**Found:** HOLM-300-COMBINED.md had no INDEX entry (the only unindexed report); RACER-MOTION-2 and
RACER-FLAPPING-2 entries both ended on "OPEN RESIDUAL: 300-race native Holm deferred…".
**Written:** (4a) added a HOLM-300-COMBINED entry at the top of *Racer avoidance / feel* in house style
(definitive gate, N=300 quartet + native Holm, continuity green with the four band numbers + runaway 0% +
rowMin 88–90%, the pre-motion `62400c8e` comparator showing 0/4 verdict change, RESIDUAL PAID + gate OPEN, the
documented gradient + owner shelf verdict). (4b) both OPEN-RESIDUAL tails replaced with a **RESIDUAL PAID**
marker linking the HOLM entry. **Deviation (declared):** also updated the INDEX header line 5 shipped-world claim
(`COMBO15` / `ded0a126048e4cdb` → `dc4647be` + SIM.md link) — beyond the literal 4a/4b, but leaving it would
have contradicted the new PAID entries; a consistency fix.

### STEP 5 — docs/TAGS.md
**Found:** line 65 "The shipped world is now **COMBO15**"; `pre/flapping` and `pre/motion` absent from the file
(0 hits). Tag targets verified: `pre/flapping` → `d0870326` (2026-07-31), `pre/motion` → `e99b034d`
(2026-07-31), both at origin.
**Written:** new *"### Engine changes since COMBO15 — RACER-FLAPPING-2 + RACER-MOTION-2 (2026-07-31)"* subsection
registering both tags with commit, date, and the fingerprint world each restores; corrected the line-65
shipped-world sentence to note COMBO15 has since advanced to `dc4647be`; updated the *Additions since 2026-07-25*
reconciliation.
**Deviation (declared):** the spec asserted "**two** real tags at origin are unregistered." A full
`git ls-remote --tags` reconciliation found **four**: `pre/flapping`, `pre/motion`, **plus `pre/hygiene`
(`a4103bb4`)** and **`pre/router-7` (`83f5c8d9`)** from other work (a hygiene pass and a router task). Per the
spec's scope I registered only the two named engine anchors, and updated the reconciliation count (41 → **45**)
noting `pre/hygiene` and `pre/router-7` as unregistered-and-flagged for a follow-up (owner/planner to place them).
I did NOT register them (out of scope; would require knowing the exact world each restores).

### STEP 6 — docs/ARCHITECTURE.md
**Found:** §(a.2) line 632 "The current shipped world is **COMBO15** (`v-ship-combo15`, master `175a475`)".
**Written:** corrected that line (COMBO15 was the world *at that ship*; since advanced to `dc4647be` via §(a.3))
and added a new **§(a.3) "Avoidance feel — margin hysteresis + lateral acceleration cap"** describing both keys
at the same detail the COMBO15 keys get: each flag-gated, **setting each to `0` reproduces its predecessor world
byte-identically** (margin 0 → `ded0a126`; cap 0 → `62400c8e`), both move ON+OFF fingerprints, hard-sep
UNTOUCHED, and the N=300 neutrality result. **Deviation:** none.

### STEP 7 — docs/LESSONS.md + docs/DEAD-ENDS.md
**Found:** last lesson = **190**; grep for the truth line / live==replay / deep-merge guarantee / Living-Config
Law returned **0 hits** across living docs (the camera laws were genuinely absent). Commit SHAs verified:
`72fc52e` → CAMERA-FOCUS-5 (per-axis screen mapping, Y clamp used bsX), `34f87ad` → CAMERA-FOCUS-3 (grammar A
TRUE CUT + leader forward-framing); CAMERA-FOCUS-1..5 reports all present.
**Written:** appended **L191 Live-Truth Law**, **L192 Clamps Are Guardrails, Never Steering**, **L193
Living-Config Law**, each in house style (context — what happened — the law — how enforced) with the verified
SHAs and report links. DEAD-ENDS.md gained the two owner-closed items with dates + reasons: the hard-separation
glide proposal (owner-closed — *"without it we get far too many overlaps"*; safety untouched, reopening the
owner's call) and the 0.4 s timer commit (EARNED KILL, fixed the target racer + synchronised the field 1→6,
xref Lesson 190). **Deviation (declared):** the two DEAD-ENDS items were placed in a NEW *"## H. Avoidance feel —
proposals closed by owner"* section, because none of the existing A–G sections is a clean fit — the spec said
"in the appropriate section", and a dedicated dated section is the faithful reading.

### STEP 8 — docs/BACKLOG.md + docs/ROADMAP.md
**Found (8a):** both files opened with the identical stale baseline note citing band-reach 71.0% / band-reach
72.7% / runaway 6.8% (2026-07-26). **Written:** replaced in both with a pointer to REBASELINE.md's top block
(shipped world `dc4647be`) and dropped the retired absolute numbers.
**Found (8b):** "🔜 **PRIORITIZED — HUD config-fingerprint badge**" as the highest-value outstanding measurement
item. **Confirmed by reading source:** `configFingerprintBadge()` in `client/src/modules/exportRaceConfig.js`
(line 118), rendered in the race HUD at `client/src/screens/RaceScreen/index.jsx:415`; the RED state is
`raceCount` (off-default race-relevant keys that break apples-to-apples with a default-config sim), with a
never-red `cosmeticCount` for camera/frame-timing drift. Shipping commit via `git log -S`: **`42500f4d`** ("replay
UX + rowCount unification (fix-plan steps 3+4) — behaviour-neutral"). **Written:** marked ✅ DONE with the commit
and a one-line description of what it shows.
**Written (8c):** new dated section *"## 2026-07-31 — added (DOC-SYNC-2: long-term items, owner's hand)"* with
seven ⏳ UNSCHEDULED one-paragraph entries: bundle code-split; coarser fairness bands; the story layer
(owner-cast toolkit + disjoint-window multi-role rule + comebacker/fallbacker defs + drawn-not-patterned counts);
CAMERA-GLIDE-PATH-1 (T-lerp-detour hypothesis); camera block reset; camera-weights relative-vs-absolute
(deferred); and the start-row gradient project (shelved-with-docs, linked to the FAIRNESS.md residual, with the
"chaos traffic for the rear rows → silent even at N=300" candidate direction on record). **Deviation:** none.
**8d** is report-only (below) — nothing else was closed.

**Source-safety:** `git diff --stat` touches only `docs/` and `reports/`; no client/server/scripts/test file
appears.

## VERIFICATION (verbatim)

```
$ node scripts/check-doc-links.mjs
check-doc-links: 282 relative links across 51 living-doc files; 0 dangling.

$ git diff --stat HEAD
 docs/ARCHITECTURE.md         | 11 +++++++--
 docs/BACKLOG.md              | 54 ++++++++++++++++++++++++++++++++++++++------
 docs/DEAD-ENDS.md            | 17 ++++++++++++++
 docs/FAIRNESS.md             | 27 +++++++++++++++++++++-
 docs/LESSONS.md              | 54 ++++++++++++++++++++++++++++++++++++++++++++
 docs/PROJECT-PRINCIPLES.md   |  5 +++-
 docs/ROADMAP.md              |  2 +-
 docs/TAGS.md                 | 29 ++++++++++++++++++++----
 reports/evolution/INDEX.md   |  7 +++---
 reports/parity/REBASELINE.md |  6 +++--
 10 files changed, 191 insertions(+), 21 deletions(-)

$ git status --porcelain
 M docs/ARCHITECTURE.md
 M docs/BACKLOG.md
 M docs/DEAD-ENDS.md
 M docs/FAIRNESS.md
 M docs/LESSONS.md
 M docs/PROJECT-PRINCIPLES.md
 M docs/ROADMAP.md
 M docs/TAGS.md
 M reports/evolution/INDEX.md
 M reports/parity/REBASELINE.md
```

(The link count is 282, up from the audit's 274 because this pass added ~8 cross-links; still 0 dangling. The
diff is docs/ + reports/ only. `git status` is clean after the commit — this report and the ten edits are the
one `docs(sync)` commit.)

## 8d — CLOSURE CANDIDATES (owner decides; nothing closed here)

Focused scan of the open backlog for items overtaken by events since COMBO15. Not exhaustive — the owner decides.

- **Re-Gate on `9cfa953`** (BACKLOG "🔜 / ⏳ Open", open + unconfirmed since the 2026-07-14 audit). It asks to
  re-run all four closed tracks under a `corridorEnd=1.0` / `bonusMult=2.0` "browser-faithful" config and discard
  the `8f57cba`-era sweeps. **Evidence it is overtaken:** that config lineage predates the plan-grid unification
  AND the speed-150 re-baseline; since the audit the world has been fully re-baselined (REBASELINE speed-150,
  2026-07-25), the gap-reroll ten-track confirm gate ran (GS-CONFIRM-GATE), COMBO15 shipped and was gated
  (FAIR-ARRIVAL-GATE, N=100 × 10 tracks), and the **definitive N=300 native pooled Holm** just ran on the current
  world (HOLM-300-COMBINED). The specific re-gate it names is against a config that no longer exists.
- **DEFERRED — Mechanism B: Late Challenger** (BACKLOG runaway section, "reactive form REJECTED… re-applies only
  if B is ever built"). **Evidence it is overtaken:** the runaway phase is CLOSED (TAGS.md, 2026-07-29) — the
  gap-reroll cohesion mechanism cut runaway-winner 23% → 8.3% and, per the close note, "the Late Challenger was
  never needed once gap-reroll shipped." The N=300 gate confirms runaway 0% on all quartet tracks. The reactive
  form is already rejected; the deferred form's motivating problem is solved.
- **(Partial, NOT a full closure) E3 — PULK→OUTCOME speed differential.** Its `rowBonus` sub-step shipped
  (`rowEnvSmooth` default ON, `v-rowenv-default-on-complete`); the larger `trajectoryMult` differential is
  explicitly still open. Listed only to note the rowBonus half is done — the item should be *narrowed*, not closed.

## PROPOSALS (≥2)

1. **Give the ship ceremony a fixed docs checklist.** This drift happened because the ceremony reliably updates
   SIM.md and REBASELINE (they are the fingerprint + baseline homes) but has **no step that touches INDEX.md, the
   TAGS.md register, FAIRNESS.md, or ARCHITECTURE.md** — so a report goes unindexed, a `pre/*` tag goes
   unregistered, and the canonical fairness doc keeps naming a two-changes-old world. Add a literal end-of-ceremony
   checklist to the ship skill: *(a)* INDEX entry for every new `reports/evolution/*.md`; *(b)* TAGS register entry
   for every new `pre/*`/`backup/*` tag; *(c)* FAIRNESS/ARCHITECTURE/PROJECT-PRINCIPLES shipped-world line bumped
   if the fingerprint moved; *(d)* residual status reconciled. Cheap, mechanical, and it removes the exact eight
   gaps this task had to clean up after the fact.
2. **A cheap CI guard for the two mechanical classes `check-doc-links` cannot see.** `check-doc-links` catches a
   dead link; it cannot catch an *unindexed report* or an *unregistered tag*. Two tiny scripts would: **(i)**
   `check-index.mjs` — every `reports/evolution/*.md` must appear in INDEX.md (a `git ls-files` vs a grep), and
   **(ii)** `check-tags.mjs` — every `git ls-remote --tags origin` tag must be named somewhere in TAGS.md. Both are
   `O(files)` string checks with zero simulation cost; wire them into the same lint step as the link checker so an
   unindexed report or an unregistered tag fails fast instead of accreting into the next DOC-SYNC. (This pass found
   TWO tags the spec did not know about — `pre/hygiene`, `pre/router-7` — exactly the class `check-tags.mjs` would
   have surfaced the day they were pushed.)
3. **Adopt "one canonical home + pointers" as an explicit doc rule.** The residual now lives in ONE place
   (FAIRNESS.md) with pointers from PROJECT-PRINCIPLES, REBASELINE, INDEX, BACKLOG. Writing that convention down
   (canonical facts live in the canonical doc; everywhere else links, never restates) keeps future reconciliations
   to a single edit instead of N copies drifting apart — the failure mode that produced the stale shipped-world
   line in five different files this time.

# CAMERA-MERGE-1 — the camera refactor lands on master

Merge commit `87961ca6`. `camera-refactor` merged **with full history, not squashed** — 41 commits,
~20 blocks, four days. Branch tip preserved as `archive/camera-refactor` (`202772c2`), branch
deleted.

Master's previous tip was `e5f0afa6` (OVERVIEW-FRAMING-1), a strict ancestor of the branch: 41
commits ahead, **zero behind**, so there were no conflicts to resolve.

---

## 1. THE THREE FINGERPRINTS, ON MASTER

**World `dc4647be0f55ebdb` — UNMOVED.** Four days of camera work left the physics untouched, and
this is now proven on master rather than on a branch. It is the first number because if it had moved,
everything else waits.

| instrument | value on master | status |
|---|---|---|
| **world** `scripts/fingerprint-default.mjs` | **`dc4647be0f55ebdb`** | unchanged from before the branch existed |
| **camera** `scripts/camera-fingerprint.mjs` | **`4b33c4d31bec93ea`** | new master baseline |
| **render** `scripts/render-fingerprint.mjs` | **`ae7e9243bd2add8b`** | new master baseline |

The camera and render values were branch values until now; they have a master home from this commit.
Future blocks compare against these three. Which one a block owes is in
[SHIP-CEREMONY.md](../../docs/SHIP-CEREMONY.md) → THE THREE FINGERPRINTS.

**Also green on master:** full suite 3494 / 172 files, `eslint` clean, and all three guards —
`check-index` 93 reports 0 unindexed, `check-doc-links` 319 links 0 dangling, `check-tags` 62 origin
tags 0 unregistered.

No engine ceremony was run, and none was owed: nothing here touched the engine. The world mint above
is the exception that proves it.

---

## 2. OVERVIEW-FRAMING-1 — CONFIRMED GONE, NOT ASSUMED

The owner rejected it; CAMERA-FRAMING-1 superseded it. Because it is an *ancestor* of the branch,
the merge itself removes nothing — the branch removed it, block by block. So it was checked rather
than assumed.

The feature's entire named surface, taken from its own commit `e5f0afa6`:

| identifier | reachable definition or caller in `client/`, `server/`, `scripts/`? |
|---|---|
| `overviewFrameRacers` (config key) | **none** |
| `overviewMinSpriteFrac` (config key) | **none** |
| `_setOverviewGroupTargets` (method) | **none** |
| `_clampCentreToBounds` (method) | **none** |
| `_applyOverviewRadialOffset` (the 150-px offset it replaced) | **none** |
| `overviewOffsetPx` (that offset's config key) | **none** |

`git grep` over the merged tree returns exactly four hits for the whole set, and **every one is a
negative assertion that keeps the feature deleted**:

- `CameraDirector.test.js` — `expect(cd._setOverviewGroupTargets).toBeUndefined()`, inside the
  standing "the deleted steering mechanisms are really gone, not merely unused" test.
- `cameraConfig.test.js` ×3 — `overviewOffsetPx` used as the worked example that a RETIRED key
  stored in a user's config is ignored on load rather than carried forward.

**What landed is the branch's framing rule**: anchor + guarantee + per-state zoom in standard
corridors, with frame position derived rather than configured (`framingRule.js`,
[CAMERA_DIRECTOR.md](../../docs/CAMERA_DIRECTOR.md) §3). The report
`reports/evolution/OVERVIEW-FRAMING-1.md` and its INDEX entry stay — that is the lab journal, and
deleting the record of a rejected experiment is how a project forgets why it rejected it.

---

## 3. THE TAG REGISTER

**Reconciled; `check-tags` passes at 62 origin tags, 0 unregistered.**

- **`archive/camera-refactor` (`202772c2`)** — new, permanent, per the tag lifecycle. The branch can
  go; the point in history should not.
- **The fifteen `pre/*` return tags stay valid and stay registered.** `TAGS.md` now says so
  explicitly, because it is the obvious thing to doubt after a merge: a merge *with history* does not
  orphan them. Every one still names a real commit that is now reachable from master. They are
  step-tags rather than permanent anchors, so they may be collapsed onto a phase endpoint later —
  until somebody decides that, they are the cheapest way back into any single block:
  `pre/projection`, `pre/zoom-unit`, `pre/picture-fixes`, `pre/framing`, `pre/company`,
  `pre/company-2`, `pre/reference-width`, `pre/lateral`, `pre/no-schema`, `pre/min-draw`,
  `pre/tags`, `pre/camera-hygiene`, `pre/weights`, `pre/camera-hygiene-2`, `pre/render-fingerprint`.

---

## 4. WHAT THE MERGE SURFACED THAT THE BRANCH HAD HIDDEN

**No conflicts** — master was a strict ancestor, so `git merge` had nothing to resolve. That is also
why the branch could hide the item below: it never had to look at these files.

**`docs/ARCHITECTURE.md` describes a camera that has not existed for months.** The branch's
documentation work was scoped to `CAMERA_DIRECTOR.md`, so nothing ever pulled ARCHITECTURE's two
camera sections into view. What they claim, as examples rather than an exhaustive list:

- "supports **five** director modes" — there are six; PHOTO_FINISH is absent.
- "The **highest-weight candidate wins**" — flatly wrong since CAMERA-WEIGHTS-1. The director draws
  one candidate at random *by* weight, then ACCEPTS it with probability equal to that weight. This is
  the single most misleading line, because it describes a deterministic rule where the shipped
  behaviour is a lottery.
- `battleIsolationPx: 300` — isolation is an ARC fraction, not world pixels, and has been since 15b.
- `_frozenBattleGroup`, `overviewCooldownMin/Max`, the spriteScale zoom chain — none exist.
- The "Fix A" section reasons entirely about `_setOpenTrackTargets` (replaced by the projection in
  CAMERA-PROJECTION-1) and `_leaderPhaseZoomFloor` (deleted in CAMERA-FRAMING-1, its job given to the
  COMPANY guarantee).

**Action taken: both sections HEADED as stale, with pointers to the canonical doc and the specific
known-wrong claims named.** Not rewritten — that is a docs block of its own, and the planner is
working on HANDOFF and CAMERA.md in parallel, so a rewrite here would collide. Heading them costs
nothing, loses no record, and stops the "worse than nothing" failure where a reader believes a doc.

**Not stale, checked and left alone:** the `spritePctOfCanvas` / `MAX_INVERSE_ZOOM` /
`overviewClosedTrackZoom` hits in `BACKLOG.md`, `ROADMAP.md`, `AUDIT.md` and `LESSONS.md` are all
dated historical log entries — records of what happened, not descriptions of the present.
`CAMERA_TUNING_DIAGNOSIS.md` and `camera-target-architecture.md` were already headed as historical
during CAMERA-HYGIENE-2.

---

## 5. WHAT IS NOW OPEN ON MASTER, AS NORMAL WORK

This is the difference between "the refactor ended" and "the refactor was abandoned". None of these
is a defect in what landed; they are the named next things.

### Camera / render

| item | what it is |
|---|---|
| **The two extraction seams the planner found** | carried over as the planner scoped them |
| **The finish-lifecycle seam** | the biggest remaining structure in `CameraDirector.js` (~250 lines). `_pickNextState` mutates five finish latches that framing also reads, so selection cannot be lifted out until the finish sequence is its own object. Named in CAMERA-HYGIENE-2 §4.2 as the next block's first move; wants supervision, not an unattended night |
| **The tracking lag** | measured 5.8–7.9 pp in LEADER, 25.2 pp in OVERVIEW. Deliberately NOT pinned by a test — a characterisation test here would punish whoever fixes it. The owner's call |
| **Point-versus-nose framing** | which point on a racer the framing rule should treat as "the subject" |
| **The corridor guarantee measures as if the anchor were centred** | it sizes assuming a centred anchor while the forward bias moves it. Named in CAMERA-LATERAL-1 as the next step there |
| **Fallback-versus-default divergence** | three code fallbacks disagree with the shipped defaults (`outcomePhaseThreshold` 0.75 vs 0.65, `comebackMinStartGap` 0.4 vs 0.25, `comebackMaxCurrentRankPct` 0.1 vs 0.2). Latent — only a bare-config caller sees them — but it already produced three wrong tooltips |
| **The world-bounds clamp** | cause of the 0.601-vs-0.66 framing residual and part of the lateral residual; still unexamined |
| **Seeding "Start Race"** | Quick Test replays exactly; Start Race remains unseeded, which is an owner decision rather than an oversight |
| **`observerPhase=follow` at `grammar=glide`** | an observation from the grammar work, not yet explained |
| **`targetInnerFramePct` has no Dev Screen control** | live setting, unreachable from the UI, against the everything-is-UI-configurable principle |
| **The render fingerprint's three blind spots** | the sprite blit (`drawImage` never runs in node), particles and surface trails (buffers filled by the component loop), and the rasteriser + artwork. Each has a named fix in RENDER-FINGERPRINT-1 §9 |

### Engine-parked (each needs the full ship ceremony)

| item | what it is |
|---|---|
| **Sprite normalisation, with the row-count effect** | three tracks draw three different animals at exactly 14.3 px; normalising moves the start-grid packing, so it is an engine change |
| **The 285 cap** | `Math.min(285, effW)` in the body-reference derivation |
| **The eleven lap-blind sites** | places that treat `t` as if it never accumulated past 1 |
| **The racer-name coupling** | `stablePairBit` hashes `r.name` into the avoidance tie-break, so renaming a roster changes the race. One roster home now (SIM-NAMES-1), but the coupling itself is unresolved and remains an open owner decision |

---

## 6. THE OWNER'S EYE

**None needed.** The owner already eye-accepted the last uncovered block; this landing changes no
behaviour, and all three fingerprints say so on master rather than on a branch.

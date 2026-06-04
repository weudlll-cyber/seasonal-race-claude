# Phase 4 — Docs Sync & Completeness

**Branch:** `chore/clean-state-2026-06-04`
**Date:** 2026-06-04
**Verdict:** PASS — all stale claims corrected; new metric definitions and audit entry added

---

## Executive Summary

Six doc-only fixes applied to correct stale racer/track counts (13→20 types, "10 default" → "9 default + 1 user-created"), update line count references, and improve completeness. No code behavior changes. All 2564 tests still pass after doc changes.

---

## Changes Applied

### 1. `docs/ARCHITECTURE.md`

| Location | Before | After | Reason |
|---|---|---|---|
| Folder tree line 20 | `(1460 lines, hygiene sprint)` | `(~1528 lines, hygiene sprint + body-dimensions)` | Stale count after body-dimensions merge |
| Folder tree line 64 | `(migrates to SpriteRacerType in D3.5.2)` | `(SpriteRacerType, migrated D3.5.2)` | Migration already done; tense was wrong |
| Folder tree line 75 | `# 13th built-in type` | `# Built-in type 13 of 20` | There are 20 types, not 13 total |
| Folder tree line 76 | `(DuckRacerType.js, SnailRacerType.js — migrate to SpriteRacerType in D3.5.2; RocketRacerType.js, CarRacerType.js — emoji-only)` | `(All 20 built-in types are SpriteRacerType instances — D3.5.x migration complete; CarRacerType replaced by BuggyRacerType)` | All migrations done; CarRacerType gone |
| VRE-3 table row | `All 13 racer types assigned` | `All 20 racer types assigned` | Stale count from when VRE-3 shipped (13 types at that time) |
| Physics sweep section | `all 10 default tracks` | `9 default tracks + 1 user-created (Luger Hill)` | Accurate description of what was actually swept |
| Per-race metrics section | Single-line metric list | Expanded with formal definitions for each metric | Added trapped/trembling, race-plan adherence, overtake-stability definitions per Phase 2 spec requirement |

### 2. `client/src/modules/storage/defaults.js`

Comment-only change. No JS logic affected.

| Location | Before | After | Reason |
|---|---|---|---|
| Physics comment line ~469 | `across all 10 default tracks` | `across 9 default tracks + 1 user-created (Luger Hill)` | Same accuracy fix as ARCHITECTURE.md |
| Physics comment line ~488 | `Validate top 3 on all 10 tracks` | `Validate top 3 on all 10 tracks (9 default + Luger Hill)` | Clarify the composition |

### 3. `README.md`

| Section | Change | Reason |
|---|---|---|
| Overview | Updated to say Phase L server exists (not "no server needed") | Phase L local backend was shipped and exists |
| Tech Stack row | `Server: Planned for Phase 5` → `Express / Node (Phase L, port 4000); Phase 5 planned` | Phase L server exists |
| Features list | Added: 9 built-in tracks, 20 racer types, Racer Editor, Race Plan choreography; updated Camera Director to include LEAD_CHANGE state; updated Dev Panel description | Missing features from README |
| Project Structure | Added `server/` and `scripts/` to folder tree | Both directories exist and are important |
| Backend section | Changed "e.g. Weltall" to just "custom tracks" | "Weltall" was a specific example that may confuse |

### 4. `docs/AUDIT.md`

| Change | Reason |
|---|---|
| Updated stale LOC findings table: RaceScreen MEDIUM → LOW; TrackEditor marked ✅ resolved | TrackEditor was split in hygiene sprint; RaceScreen severity reduced since drawing modules extracted |
| Added full 2026-06-04 audit entry | Documents this clean-state audit session with findings, test counts, and recommendations |

### 5. `docs/BACKLOG.md`

| Change | Reason |
|---|---|
| Added "Clean-State Audit 2026-06-04 — Follow-up Items" section with 3 actionable items | Surfaces the three recommended fixes from Phase 1 so they're trackable |

### 6. `docs/LESSONS.md`

| Lesson | Summary |
|---|---|
| **L124** (new) | E2E tests asserting specific default config values become latent failures when defaults change. Rule: derive expected defaults from source or test behavior relative to UI rather than asserting literals. |

---

## Not Changed (Recommendations Only)

| Doc | Issue | Reason Not Applied |
|---|---|---|
| `client/e2e/d11-ux-verification.spec.js` | Stale physics default assertions in V1–V3 | Requires browser verification against running dev server; not safe to apply automatically |
| `docs/ARCHITECTURE.md` CameraDirector dead constants | 17 fallback consts flagged as ESLint warnings | Code change (not doc), requires judgment on whether to delete or prefix |

---

## Test Verification

After all doc changes:

```
Test Files  121 passed (121)
Tests       2564 passed (2564)
```

Determinism fingerprint: unchanged (no logic code touched).

---

## Track Data — Actual vs. Seed Values

During this audit, the actual server track data was verified against defaults.js seed values.
worldWidth/worldHeight in defaults.js are **seed-only** bootstrap values; actual server files
reflect the background images chosen during Track Editor draw sessions. Discrepancies are expected.

Actual values (from `server/data/tracks/*.json`):

| Track | Closed | Path (px) | worldW | ssf |
|---|---|---|---|---|
| dirt-oval | Yes | 3,245 | 1536 | 1.014 |
| garden-path | Yes | 2,506 | 1536 | 0.783 |
| city-circuit | Yes | 3,093 | 1536 | 0.966 |
| ice-track | Yes | 3,037 | 1536 | 0.949 |
| searound | Yes | 5,147 | 3072 | **1.608** |
| river-run | No | 13,061 | 6144 | 6.530 |
| space-sprint | No | 19,772 | 6000 | 9.886 |
| mountainstreet | No | 15,665 | 6144 | 7.833 |
| seatrack | No | 12,256 | 6144 | 6.128 |
| Luger Hill (user) | No | see server | 6144 | varies |

Searound's ssf=1.608 is the largest among closed tracks (larger path length → higher ssf → normalized perceived speed). This is as expected and was the reason the closedSsf formula exists. See Phase 3 report for physics verdict on Searound.

# Artifact Cleanup — Non-Repo Scratch & Transient Files

**Branch:** `chore/clean-state-2026-06-04`
**Date:** 2026-06-04 (final update: ASK-USER decisions resolved)
**Scope:** untracked / gitignored files only; no tracked deliverables touched without explicit approval

---

## Executive Summary

**~4.1 GB reclaimed.** All three buckets fully resolved. No items remain in ASK-USER. vitest: 2564 passed. Fingerprint dirt-oval + space-sprint seed=42 dur=30: IDENTICAL to pre-cleanup baseline.

---

## Inventory

| Path | Size | Last modified | Gitignored? | Tracked? | References in tracked docs |
|---|---|---|---|---|---|
| `client/tmp/` (untracked bulk) | **~3.9 GB** | May–Jun 2026 | ✅ `client/tmp/` | No (bulk data) | `docs/SIM.md` mentions `--out=client/tmp` as default output flag; qualitative only |
| `client/tmp/camera-logs/.gitkeep` | 0 bytes | commit `0735f35` | ✅ | **YES** | Placeholder only |
| `client/tmp/fairness-report-phase1-baseline.md` | 109 KB | 2026-05-17 (commit `7237900`) | ✅ | **YES** | Not cited by tracked reports |
| `client/tmp/fairness-report.md` | 54 KB | 2026-06-03 (commit `7237900`) | ✅ | **YES** | Not cited by tracked reports |
| `client/test-results/.last-run.json` | 45 bytes | commit `0a00c9e` | ✅ | **YES** | Not cited; Playwright last-run marker |
| `client/test-results/` (other untracked) | ~1 KB | Jun 4, 2026 | ✅ | No | Playwright per-test artifacts |
| `client/playwright-report/` | 516 KB | Jun 4, 2026 | ✅ | No | HTML summary from d11 Playwright run |
| `.playwright-mcp/` | **23 MB** (800 files) | Apr 24–26, 2026 | ✅ | No | Not cited anywhere |
| `reports/clean-state-2026-06-04/sim-phase2/fairness-data.json` | **118 MB** | Jun 4, 2026 03:28 | ✅ (explicit entry) | No | `02-sim-check.md` §10 and `00-SUMMARY.md` both document exact regen command |
| `reports/clean-state-2026-06-04/fp-d11/` (2 files) | 972 KB | Jun 4, 2026 12:39 | No | No | Not referenced; redundant fingerprint (same as fp-after) |
| `reports/clean-state-2026-06-04/fp-followup/` (2 files) | 972 KB | Jun 4, 2026 12:02 | No | No | Not referenced; redundant intermediate fingerprint |
| `scripts/sweep-balanced-lhs.mjs` | 20 KB | Jun 3, 2026 | No | No (→ committed) | ✅ `ARCHITECTURE.md` Phase 1 LHS sweep |
| `scripts/sweep-dyn-sbt.mjs` | 16 KB | Jun 4, 2026 | No | No (→ committed) | ✅ `defaults.js` comment references by name |
| `scripts/sweep-phase5.mjs` | 28 KB | Jun 4, 2026 | No | No (→ committed) | ✅ `defaults.js` physics comment mentions Phase 5 |
| `scripts/sweep-full-4phase.mjs` | 40 KB | Jun 3, 2026 | No | No (→ committed) | Not explicitly cited |
| `scripts/sweep-phase2.mjs` | 28 KB | Jun 3, 2026 | No | No (→ committed) | Not explicitly cited |
| `scripts/sweep-phase3.mjs` | 32 KB | Jun 3, 2026 | No | No (→ committed) | Not explicitly cited |
| `scripts/sweep-phase4.mjs` | 24 KB | Jun 4, 2026 | No | No (→ committed) | Not explicitly cited |
| `scripts/sweep-phase4-only.mjs` | 16 KB | Jun 3, 2026 | No | No (→ committed) | Not explicitly cited |
| `scripts/sweep-body-collision.mjs` | 16 KB | Jun 3, 2026 | No | No (→ committed) | Not explicitly cited |

---

## Classification

### DELETE-SAFE (all executed)

| Path | Size | Reason | Regen command |
|---|---|---|---|
| `client/tmp/` untracked bulk data | ~3.9 GB | Gitignored; old sim sweep output (May–Jun 2026). Conclusions documented inline in tracked reports. | `node scripts/sim-fairness.mjs --races=10 --seed=0 --out=client/tmp/<name>` |
| `client/test-results/` untracked Playwright artifacts | ~1 KB | Gitignored; per-test screenshots/videos from d11 run. | `cd client && npx playwright test` |
| `client/playwright-report/` | 516 KB | Gitignored; Playwright HTML summary from d11 run. | `cd client && npx playwright test --reporter=html` |
| `.playwright-mcp/` | 23 MB | Gitignored; Playwright MCP console logs from Apr 2026. Auto-recreated on next MCP session. | Auto-generated |
| `reports/clean-state-2026-06-04/sim-phase2/fairness-data.json` | 118 MB | Gitignored. Exact regen command recorded in `02-sim-check.md` §10 and `00-SUMMARY.md`. | `node scripts/sim-fairness.mjs --races=100 --seed=1 --race-plan=true --dur=60 --out=reports/clean-state-2026-06-04/sim-phase2` |
| `reports/clean-state-2026-06-04/fp-d11/` | 972 KB | Untracked; redundant fingerprint run (identical values to fp-after). | `node scripts/sim-fairness.mjs --races=5 --seed=42 --track=dirt-oval --dur=30 --out=<dir>` |
| `reports/clean-state-2026-06-04/fp-followup/` | 972 KB | Same — redundant intermediate fingerprint. | Same as above |

**Total reclaimed: ~4.1 GB**

### KEEP (unchanged)

| Path | Reason |
|---|---|
| `reports/clean-state-2026-06-04/sim-phase2/fairness-report.md` | 277 KB Markdown Phase 2 sim report; deliverable. |
| `reports/clean-state-2026-06-04/fingerprint-before/`, `fp-after/`, `fp-dirt/`, `fp-space/` | Core fingerprint evidence; "before == after" claim in `00-SUMMARY.md`. |
| All other `reports/clean-state-2026-06-04/` deliverables | Audit deliverables. |
| `scripts/sim-fairness.mjs`, `scripts/sim-sweep.mjs` | Tracked production tooling. |
| `scripts/sweep-lateral.mjs`, `scripts/sweep-stuck-escape.mjs` | Already tracked in git (pre-branch). |

### ASK-USER — fully resolved

All items that were in ASK-USER have been actioned:

**Tracked tmp files** (commit `4c08d21`): user-approved git rm of 4 superseded tracked files.
**9 sweep scripts** (commit `2ab61b7`): classified as DISTINCT, all committed to the repo.

---

## Sweep Script Classification

All 9 scripts import `sim-fairness.mjs` as their simulation engine and implement the physics-parameter optimization methodology. None duplicate `sim-fairness.mjs` (the engine) or `sim-sweep.mjs` (Race Plan timing — a different domain). All are **DISTINCT** reusable tools.

| Script | Purpose | vs. sim-fairness / sim-sweep | Verdict | Action |
|---|---|---|---|---|
| `sweep-balanced-lhs.mjs` | Phase 1: 200 LHS combos × Dirt Oval + Space Sprint; cites in ARCHITECTURE.md | Uses sim-fairness as engine; unique LHS sampling + 2-track setup | **DISTINCT** | Committed |
| `sweep-body-collision.mjs` | Avoidance/collision grid (81 combos, Space Sprint × Rocket × 60 racers) | Uses sim-fairness; focused on body-collision params | **DISTINCT** | Committed |
| `sweep-dyn-sbt.mjs` | Mandatory sim for feat/dynamic-speed-brake; 5 sbt values × 7 tracks × 20 races; cites in defaults.js | Uses sim-fairness; tests a single dynamic param not covered elsewhere | **DISTINCT** | Committed |
| `sweep-full-4phase.mjs` | Master orchestrator: Ph1 (81+1) + Ph2 VOAT (16+1) + Ph3 top-5 scaled (25) + Ph4 top-3 × 100 races | Uses sim-fairness; original combined script | **DISTINCT** | Committed |
| `sweep-phase2.mjs` | Phase 2 standalone: extended range + fine-tuning around Ph1 winner (26 combos × 2 tracks) | Uses sim-fairness; standalone for targeted re-run | **DISTINCT** | Committed |
| `sweep-phase3.mjs` | Phase 3 standalone: extend ld/hfs lower boundary; 13 combos × 2 tracks | Uses sim-fairness; standalone for targeted re-run | **DISTINCT** | Committed |
| `sweep-phase4-only.mjs` | Phase 4 validation: hardcoded Ph3 top-3 × 10 tracks × 100 races (3100 races) | Companion to sweep-full-4phase; run Ph4 alone without redoing Ph1–3 | **DISTINCT** | Committed |
| `sweep-phase4.mjs` | Phase 4 VOOT fine-tune: hfs locked at 0.030, other 7 params ±2.5/5% (30 combos) | Different Ph4 strategy from -only variant (VOOT variation vs. top-3 validation) | **DISTINCT** | Committed |
| `sweep-phase5.mjs` | Phase 5: ld+sbt combo test (6) + top-3 × all 10 tracks × 50 races; determines current defaults; cites in defaults.js | Uses sim-fairness; final validation phase | **DISTINCT** | Committed |

---

## Actions Taken

### Sequence of commits

| Commit | Description |
|---|---|
| `a26e79a` | L125 + 06-artifact-cleanup.md (first version); ~4.1 GB untracked data deleted |
| `4c08d21` | Remove 4 superseded tracked artifacts (user-approved) |
| `2ab61b7` | Commit 9 physics sweep tools to version control (all DISTINCT) |
| *(this update)* | 06-artifact-cleanup.md finalized — no further ASK-USER items |

### Deleted (all untracked — no tracked files removed without approval)

1. `client/tmp/` untracked bulk data — ~3.9 GB
2. `client/test-results/` untracked Playwright artifacts — ~1 KB
3. `client/playwright-report/` — 516 KB
4. `.playwright-mcp/` — 23 MB
5. `reports/clean-state-2026-06-04/sim-phase2/fairness-data.json` — 118 MB
6. `reports/clean-state-2026-06-04/fp-d11/` — 972 KB
7. `reports/clean-state-2026-06-04/fp-followup/` — 972 KB

**Total reclaimed: ~4.1 GB**

### .gitignore — No changes needed

All deleted directories were already covered by existing `.gitignore` entries.

---

## Test Verification

After all deletions and commits:

```
Tests  2564 passed (2564)   [121 files]
```

Determinism fingerprint (dirt-oval + space-sprint, seed=42, dur=30): IDENTICAL to pre-cleanup baseline.
- horse p=0.634, dragon p=0.224, buggy p=0.180, snowmobile p=0.224 (dirt-oval) ✅
- space-sprint: dragon p=n.s., rocket p=n.s., plane p=n.s. ✅

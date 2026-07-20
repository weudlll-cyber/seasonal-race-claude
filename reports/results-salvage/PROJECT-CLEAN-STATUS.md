# PROJECT CLEAN STATUS

*Compiled 2026-07-14, after the feat/race-action → master merge and the full branch/tree cleanup.*

## Repo state — CLEAN, master-only ✓
- **master tip:** `1b98def` — "chore: preserve cohesion Stage-0 observer before retiring its branch"
  (the race-action merge is the parent, `e1d5a2b`).
- **origin/master:** `1b98def` — matches local, **no divergence** ✓
- **Working tree:** `nothing to commit, working tree clean` ✓ (no untracked cruft; `results/` is gitignored)
- **Branches:** **only `master`** — local and on origin (`origin/HEAD -> origin/master`) ✓

## Stable anchors (verified, local + remote)
- `stable/pre-overlap-closed-20jun` → `712f334` — permanent pre-race-action return point.
- `stable/pre-governor-04jul` → `d9c9cd3` — pre-governor baseline.
- `race-action-complete` → `e1d5a2b` — end of the race-action phase.
- `v1-race-action-merged` → `e1d5a2b` — master merge marker.
- 7 `v-*-complete` earlier-phase anchors retained (see `docs/TAGS.md`).

*(The `race-action-*` tags anchor the merge commit `e1d5a2b`; master then advanced one cleanup commit
to `1b98def` — the cohesion-observer preservation.)*

## Executed this pass
- **Deleted `feat/race-action`** (local + origin) — work is on master, anchored by tags.
- **Deleted 6 fully-merged branches** (local + origin): `chore/sim-trust`,
  `experiment/hard-separation`, `feat/pulk-race-director`, `feat/pulk-reopen`,
  `feat/v4-choreography`, `remove/race-zones`.
- **`infra/cohesion-stage0`:** cherry-picked the byte-neutral cohesion observer
  (`scripts/sim/observers/cohesion.mjs` + `cohesion.test.mjs`, unit test 4/4 green) onto master,
  dropped the ~108k-line frozen measurement JSON + night-sweep runner, then **deleted the branch**
  (local + origin).
- **Deleted** the 4 untracked audit scanners in `scripts/` and the `scratchpad/` dev-cruft directory.

## Open items (owner decides — nothing blocking)
**From this session's test audit (`results/`):**
- **E2E DEAD_IN_SPIRIT cleanup** — 14 milestone specs are retirement candidates (`results/audit-e2e-queue.json`); owner eye-test to confirm.
- Optional: ~8 `getBy*().toBeDefined()` tautologies (SurfaceClassManager.test.jsx) — strengthen.
- Optional: 2 English-rule violations (German prose in `d10-ux-verification.spec.js`, `vre-4-ux-verification.spec.js`).
- Optional: `perf-reality-check.spec.js` — confirm authoritative baseline or supersede.

**From ROADMAP.md / BACKLOG.md:**
- **Re-Gate all four closed tracks on `9cfa953`** — marked in progress.
- **Phase D — Racer Redesign parts 4–5** pending (ROADMAP Issue D).
- **ROADMAP §R.7 is stale** — still says "master-merge pending / master frozen at ab71825"; the merge
  is done and master is at `1b98def`. Worth a refresh.
- Not yet done: PROJECT-PRINCIPLES.md note that race-action shipped.

## Deleted / archived artifacts (cumulative)
- **177 race-action step-tags** — deleted (local + remote); full list archived in `docs/TAGS.md`.
- **8 branches** — `feat/race-action` + 6 merged + `infra/cohesion-stage0` — deleted (local + remote).
- **4 audit scanners + `scratchpad/`** — deleted from the working tree.
- The cohesion observer survives on master; the 108k-line measurement JSON was intentionally dropped.

## Suggested next steps
1. Substantive work: **E2E DEAD_IN_SPIRIT cleanup**, **Re-Gate closed tracks**, or **Phase D Brands**.
2. Quick doc refresh: ROADMAP §R.7 (merge done) + optional PROJECT-PRINCIPLES.md ship note.
3. Loose ends: getBy* tautologies, 2 English-rule violations, perf-reality-check decision.

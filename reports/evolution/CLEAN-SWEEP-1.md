# CLEAN-SWEEP-1 — repo leftovers removed + full local audit (clean AND documented)

**Base: `origin/master` @dad4077, on the owner's machine (the local state is the point — the planner cannot
see it). Author: CC.** Two jobs in one pass: (1) remove the two dead FAIR-ARRIVAL-1 arms still wired into the
source, and (2) a full inventory of the local working copy — every leftover found, categorized, and either
folded into the record or deleted, failures included. Backup tag `pre/clean-sweep` (dad4077) pushed first.

## VERDICT (read first): CLEAN. Behavior byte-identical; local state empty; record was already complete.
The dead arms are gone (83 deletions, zero-hit grep). The fingerprint `ded0a126048e4cdb` re-mints **identical**
and the full suite is **3319/3319 green with unchanged expectations** — nothing re-recorded, so the removal is
provably neutral. The local audit found one leftover stash and 780 MB of reproducible sim scratch (deleted),
and — the one honest surprise — **zero untracked consultation/review documents**: that record was already
fully committed. Final `git status` / `git stash list` empty; origin is master-only.

---

## 1. STAGE 0 — local inventory (categorized)

| item | category | disposition |
|---|---|---|
| `git status --short` | — | **EMPTY** (no untracked non-ignored files anywhere) |
| `git branch -a` | — | master + origin/master only (clean since DOCS-1) |
| local-only tags | — | **none** |
| `git stash@{0}` — "WIP on exp/free-band" | (b) reproducible | tracked-diff EMPTY; its 3rd parent carried **10 untracked `chain-ablate-data/*.json`** (free-band battery/ship sim output), all **UNREFERENCED** by any committed report and not even on disk → **dropped** (STAGE 3) |
| `client/tmp/` — 86 top-level entries, **2705 files, 780 MB** | (b) reproducible | run dirs + fp/screen scratch (`eye-fp.txt`, `ps-fp.txt`, `confirm-screen.txt`, `gate-stage{1,2,3}.txt`, `eq-*.txt`, …) — all reproducible from committed seeds → **deleted** (STAGE 3) |
| `client/_ul.css` — 8 KB, unreferenced | (c) junk | not imported anywhere in `client/src`/`index.html` → **deleted** (STAGE 3) |
| untracked consultation/review `*.md` | (a) record | **NONE FOUND** — all CC + Copilot docs already tracked (see below); record complete |
| `reports/exp-archive/` (CONCEPT-REVIEW-CC*, EXP-PACK-RELEASE) | (a) record | **intentional lab journal, tracked** — seen, not missed; left as-is |
| `.claude/`, `.husky/_/`, `.playwright-mcp/`, `server/data/*` (backgrounds, tracks, users, sessions), `node_modules`, `dist` | keep | gitignored infra / live app data — **not touched** |

The consultation record is already exhaustively committed — CC and Copilot documents across
`reports/evolution/` (ACTION-CONCEPT-CC, CHAIN-CHOREO-CC, SYSTEM-RESCUE-*-CC/COPILOT, …),
`reports/proposals/` (CONCEPT-REVIEW-{CC,COPILOT}-*, GREENFIELD-{CC,COPILOT}, OUTCOME-ACTION-PROPOSAL-*),
`reports/results-salvage/` (ACTION-CONSULTATION-{CC,COPILOT}, LBB-*-{CC,COPILOT}, OUTCOME-*-{CC,COPILOT}),
and `reports/exp-archive/`. So **STAGE 2 had nothing to add** and no `reports/consultations/` directory was
created (an empty dir would be noise). This is the audit's one deviation from the spec's expectation, reported
rather than papered over: the "untracked by design" docs had already been folded into the record by DOCS-1 and
earlier commits.

---

## 2. STAGE 1 — the two dead FAIR-ARRIVAL-1 arms removed (behavior-neutral)

Arm A (`chaosAnchor` — the inert chaos-phase position anchor, dead code behind the pre-outcome pin early-return)
and Arm C (`bandWall` — the hard band corridor, the FREEBAND pin) were both flag-gated, **default OFF, never
present in `DEFAULT_RACE_DYNAMICS_CONFIG`**, so the shipped path never executed them. Only the shipped COMBO15
`chaosSteer` + `bandBias` remain. Removal line-counts (add / **del**):

| file | +/− | what was removed |
|---|---|---|
| `client/src/modules/racePlanner.js` | 10 / **47** | `_chaosAnchor` + `_bandWall` plan wiring and both controller application blocks; ARM-A/ARM-C comments; a stale `caErr` comment typo fixed to `csErr` |
| `client/src/modules/raceCore.js` | 4 / **10** | `chaosAnchor`/`chaosAnchorGain`/`bandWall`/`bandWallR`/`bandWallGain` whitelist entries + the stale `?world=combo` comment |
| `scripts/parity/goldenRunner.mjs` | 2 / **12** | the removed keys from BOTH mirrors (`browserPlanConfig` + `simPlanConfig`) |
| `scripts/sim-fairness.mjs` | 5 / **14** | `FA_CHAOS_ANCHOR`/`FA_CHAOS_ANCHOR_GAIN`/`FA_BAND_WALL`/`FA_BAND_WALL_GAIN` declarations + their threading |
| **total** | **21 / 83** | |

**Zero-hit grep** `chaosAnchor|bandWall|world=combo` across `client/src` + `scripts` → **0 hits**; and
`_chaosAnchor|_bandWall|caErr|bwErr|FA_CHAOS_ANCHOR|FA_BAND_WALL` → 0. The driver `exp-fair-arrival.mjs` never
defined an arm for either flag (its arms use `--chaosSteer/--bandBias/--pulkStart`), so no dead arm remained.

---

## 3. STAGE 3 — deleted paths (every path listed)

- **stash `stash@{0}`** (`b0372a4`) — dropped, carrying its untracked payload of 10 files:
  `reports/evolution/chain-ablate-data/{battery_B15clrD-B15fc, battery_B15clrD-fbA85-fbA70,
  battery_B15clrD-fbD-fbEw-fbEm-fbF, battery_B15fc, battery_fbB85, ship_custom_N100_s1_d60,
  ship_custom_N25_s1_d60, ship_custom_N3_s1_d60, ship_ten_N100_s1_d30, ship_ten_N100_s1_d60}.json`.
- **`client/_ul.css`** — stray 8 KB scratch CSS, unreferenced.
- **`client/tmp/`** — entire tree (780 MB, 2705 files). The 86 top-level entries:
  `accprobe, adapt-luger-hill, adapt-searound, b2probe, b7b-smk, b7b-smk2, b7b-smk3, cap-combo15, cap-fp.txt,
  cap-ship, cap-stage1.txt, capf-cap104, capf-cap106, capf-combo15, chaos-steer-screen.txt,
  choreo-release-screen.txt, combine-fp.txt, combine-screen.txt, confirm-fp.txt, confirm-screen.txt, cr2-cand,
  cr2-fp.txt, cr2-screen.txt, cr2-steer, cs-dbg, cs-fp-final.txt, cs-ship, cs-steer, eq-explicit.txt,
  eq-flagless.txt, exp-chain-ablate, exp-chain-int, exp-finale-adaptive-screen, exp-finale-screen,
  exp-front-autopsy, eye-fp.txt, eye2-fp.txt, fa-A, fa-AB, fa-B, fa-Bm, fa-SHIP, fa-diag, fa-g, fa-r,
  fair-arrival, fair-arrival-cap-s1, fair-arrival-s2, fair-arrival-s3, faprobe, faprobe2, fb-ice-track,
  fb-reroll, fb-sea, fb-searound, fb2, fbp, fbs, fc-dirt-oval, fc-ice-track, fc-searound, finale-sanity, fp,
  gate-fp.txt, gate-stage1.txt, gate-stage2.txt, gate-stage3.txt, m0probe, probe, probe2, proxprobe,
  ps-combo, ps-fp.txt, ps-ship, pulk-screen.txt, ship-smoke, smk-dirt-oval, smk-searound, smoke-b4,
  smoke-dirt-oval, smoke-luger-hill, smoke-mountainstreet, smoke-off, smoke-rel, smoke-searound, test-combo`.
  All are reproducible sim output; the summarized versions the reports cite live in-repo (e.g. the committed
  `reports/evolution/gate-stage{1-binding,2-30s,3-180s}.txt` supersede the raw `client/tmp/gate-stage{1,2,3}.txt`).

**Orphaned browser localStorage note.** The removed blind viewer (EYE-SETUP-1 `eyeMode.js`) wrote one
localStorage key, **`ra_eye_map_v1`**; it is now **inert** (no code reads it). The owner can clear it with
`localStorage.removeItem('ra_eye_map_v1')` in the DevTools console (Application → Local Storage), or leave it —
it has no effect. The `?world` viewer (`worldMode.js`) used **no** localStorage (in-memory only), so it left
nothing behind.

---

## 4. STAGE 4 — seals

- **Full suite: 161 files / 3319 tests green, expectations UNCHANGED** (same count as the COMBO15 ship — nothing
  re-recorded, the neutrality proof).
- **eslint** (`eslint src`) exit 0 · **build** (`npm run build`) exit 0.
- **Fingerprint re-minted IDENTICAL: `ded0a126048e4cdb`** (OFF invariant `f8f7d9c2fd3283e9`). Byte-for-byte
  proof the dead-arm removal changed no behaviour.
- **Final local state:** `git status --short` → EMPTY · `git stash list` → EMPTY · `git branch -a` → master
  (+ remotes/origin/master) only.
- **sweep.log note:** `reports/exp-archive/` is an INTENTIONAL lab journal (tracked) — it was seen in the sweep
  and deliberately kept, not missed.

---

## THE FIVE SENTENCES
1. The two never-shipped FAIR-ARRIVAL-1 arms (`chaosAnchor` A, `bandWall` C) were removed from racePlanner,
   raceCore, goldenRunner, and sim-fairness — 83 deletions, a clean zero-hit grep — leaving only the shipped
   COMBO15 steer + draw-bias.
2. The removal is provably behavior-neutral: the fingerprint re-mints identical (`ded0a126048e4cdb`) and the
   full 3319-test suite passes with unchanged expectations (nothing re-recorded).
3. The local audit found one empty-diff free-band stash (10 unreferenced JSONs), 780 MB of reproducible sim
   scratch under `client/tmp/`, and a stray `client/_ul.css` — all deleted, every path listed.
4. The one honest deviation from the spec's expectation: there were **no untracked consultation/review docs** to
   commit — that record was already fully tracked across `reports/evolution|proposals|results-salvage|exp-archive`,
   and all 12 evolution report data references resolve in-repo, so STAGE 2 added nothing.
5. Final local state is empty (`git status` / `git stash list` clean, master-only), the orphaned `ra_eye_map_v1`
   localStorage key is inert, and `pre/clean-sweep` (dad4077) is the return point on origin.

## PROPOSALS (≥2)
1. **Add `client/tmp/` housekeeping to the sweep harness itself.** The 780 MB pile rebuilds every experiment
   week; a `--purge-tmp` flag on `sim-fairness.mjs` (or a `scripts/clean-tmp.mjs` that deletes run dirs older
   than N days, keeping the newest) would stop the OneDrive-synced tree from ballooning between clean-sweeps —
   the artifacts are reproducible, so aggressive purging is safe.
2. **Redirect sim scratch off the OneDrive tree.** The BACKLOG already notes `sim-fairness.mjs --out` is forced
   under repo ROOT (`join(ROOT, out)`); allowing an absolute `--out` (skip the ROOT join when the path is
   absolute) would let future runs write to a non-synced temp dir, so scratch never lands in the repo working
   copy in the first place — removing the need for most of this stage next time.
3. **A tiny `scripts/audit-local.mjs` that reproduces STAGE 0.** It would print the same categorized inventory
   (untracked non-ignored files, stashes, local-only tags, `client/tmp` size, stray root files) on demand, so
   the owner can eyeball local hygiene any time without a full clean-sweep spec — turning this one-off audit
   into a repeatable one-liner.

---
**Master @HEAD (after CLEAN-SWEEP-1).** Shipped fingerprint `ded0a126048e4cdb` unchanged; local state empty;
origin master-only. Backup/return point `pre/clean-sweep` = dad4077 (on origin).

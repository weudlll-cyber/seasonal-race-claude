# RaceArena — Backlog

Living list. See ROADMAP.md for phase context and completion status.
Items ranked by urgency within each bucket. ✅ = done, 🔜 = next, ⏳ = waiting on dependency.

---

## Race-Action Arc (feat/race-action) — June 2026

Catch-up for the period since the last backlog refresh. Full per-commit detail is in
ROADMAP.md (**Phase D** and **Phase R** sections); only hashes are repeated here. All hashes
verified against `git log` / `git tag`.

**✅ Completed**
- **Phase D — server-side storage migration** (groups/brands/racers): D1 `999f45e`, D2 `c263106`, D3 `6f4deb3`, D4 `ee3735d`, D5 `6aa8bc1`, D6a `5d75d12`, D6b `d22ecee` (2026-06-14/15).
- **Lateral physics redesign** — Layer 1 Soft Steering (`35b6b29` → default `8ad6a62`) + Layer 2 Hard Separation (`82c1806`/`f535fc2`/`0815aac`/`07bf2f1`/`bf44a8b`); legacy forces removed in Commit A `bc68c37` + Commit B `f311622` (2026-06-25/28).
- **Controller on closed tracks** — C0 leader-progress phase clock `14f3c6f`, C0-fix `712f334` (2026-06-21/22).
- **Closed-track geometry expansion (3072px world)** — garden-path `8f73dc7`, dirt-oval `72da109`, city-circuit `1b3260e`, ice-track `b06d946`; cumulative-t fix `9a4148e` (2026-06-28/30).
- **§4a soft-steering asymmetric fix** `aef203a` + cleanup/regression test `0b33f3c` (2026-06-30).
- **Sim browser-parity** — passThroughCount telemetry `f7b6100`, finishT/speed parity `8f57cba`, shared-config defaults `9cfa953` (2026-06-30).
- **Reviewed, no fix needed** — controller-on-closed phase timing confirmed correct (leader-progress based, `14f3c6f`); sim determinism verified resolved (likely side-effect of Commit A `bc68c37`, no commit to cite).
- **Cleanup-C (auth)** — items 7-8 `3729d1c` (tag `backup/cleanup-c-paths-cli`), item 9 dead `randomUUID` import removed `0dda9db` (tag `backup/cleanup-c-dead-import`), recover-admin hardening follow-up `16d3bf9` (tag `backup/recover-admin-hardening`). All committed **and tagged** — supersedes the older "awaiting Copilot review + tag" status. Verified: `randomUUID` now appears only in `*.test.js`, not production `authRouter.js`.
- **Governor vision-pivot → race-action director** — ⚠️ **SUPERSEDED/HISTORICAL:** this reactive governor/director was replaced by choreo + PulkLeadRotation and then **removed entirely** in THE GREAT PULK CLEANUP (Stages 1–6); the commits below are history, none of the governor/director knobs or streams survive. (anchor `d9c9cd3` = `stable/pre-governor-04jul`). Governor core `307d6dc`/`294550a`/`0da9048`/`24c99b6`/`9947892`; **Stage C** leader-brake retired → pure tail-lift `a0105ed`; **Stage A1** contest-injector director (rank-blind, own master + `DIRECTOR_SEED_XOR`) `a7e4a64`; **Sim-1** front-action metric + governor telemetry propagation fix (read-only) `b930b1b`. Full detail in ROADMAP §R.7. The pivot idea (a limiter cannot create a contest) endures — see LESSONS 160.

**🔜 / ⏳ Open**
- **Re-Gate on `9cfa953`** ⏳ **STILL OPEN (unconfirmed 2026-07-14 audit)** — `9cfa953` IS an ancestor of `master`; ROADMAP.md's Phase R status block now lists it under "Still open" (the earlier "in progress" line was updated 2026-07-14) and no commit/tag confirms the re-gate was completed. Kept open; flagged for owner. Re-run all four closed tracks under the corrected browser-faithful config (corridorEnd=1.0, bonusMult=2.0); discards the provisional `8f57cba`-era sweeps.
- **Master-merge** of `feat/race-action` → `master` — ✅ **DONE (confirmed 2026-07-14)** — merged to `master` by fast-forward at `e1d5a2b`, anchored by tags `race-action-complete` and `v1-race-action-merged`; `feat/race-action` deleted (local + remote); the repo is now master-only. Later cleanup (e2e retirement, doc refresh, planning-audit) continued on `master` past the merge point.
- **B2 — per-hero intensity budget** 🔜 *(added 2026-07-14 reconciliation)* — `clampIntensityToBudget` (heroCurveGenerator.js:147/154) reduces the WHOLE cast's realized intensity from the assigned winner's geometry alone (winner feasibility → one `realizedIntensity`, applied to every hero at :457). Concern: one hero's tight geometry throttles every other hero's drama. **Done =** the budget is computed per-hero so a single constrained hero no longer flattens the rest. Eye-test whether it visibly matters before building. Owner-approved step.
- **B4 — camera foresight (consume the authored cameraPlan)** ✅ **DONE (`b4-complete` = master `03e28cf`, 2026-07-15)** — the authored `cameraPlan` is now plumbed generator → `racePlanner` (`_cameraPlan` + `getCameraPlan`) → `RaceScreen` (`setCameraPlan`, delivered mid-race: heroes are cast mid-race, so the plan is null at init) → `CameraDirector` (`updateRacePlan(b1Indices, cameraPlan)` + storage). **First consumer:** in `_detectComebackRacer` the cast comebacker set (heroes with `role: 'comebacker'`) is the PRIMARY candidate; the `b1Indices` scan stays the FALLBACK when the plan names no comebacker (assigned winner already up front ⇒ cast `sovereign-lead`) or no plan exists. **Why:** the old scan searched ALL front-band finishers, which include the sovereign-leads — one that dips and recovers reads as a large gain and could win the scan, so the camera cut to a "comeback" that was noise. Only WHO is watched changed; the reality bar (window, min-gain, start-gap, current-rank, largest-real-gain tiebreak) is untouched. **Evidence:** comeback-reality sweep (200 races / 367 comebackers, seed=1) — the cast comebacker is the top climber in 94–100% of races and lands within ~0.45 ranks of its authored target. Tooling: `scripts/sim/observers/comeback-reality.mjs` + `--comeback-reality` (needs `--hero-map`), see docs/SIM.md; full numbers in `results/comeback-reality-sweep-2026-07-14/report.md` (gitignored). Owner eye-test PASS. **NOT shipped (tried, measured, removed):** a foresight PRE-ARM + `cameraForesight` flag + DevScreen toggle — the Owner eye-test (ON vs OFF, same seed) showed no visible difference, so it was trimmed out (branch history `7c50605`, `be71a26`, `bccc171`).
- **Camera timing levers — comeback shot appears late (tune by eye, no code)** 🔜 *(added 2026-07-15, from B4)* — the comeback shot only appears late, and the cause is NOT the plan but two existing DevScreen sliders. `outcomePhaseThreshold` (default 0.65) gates reactive comeback detection, but the authored climb starts around progress ~0.28, and the slider floor is 0.5 — so the first ~0.28–0.5 of the climb is unreachable by slider alone. `comebackWeight` (0.6) loses the weighted candidate contest to `battleWeight` (0.8) during PULK, so even a fired comeback candidate does not win the lens. Verified beat timing (from the generator itself): a comebacker HOLDS its deep rank from `anchorProgress` (0.25) until its `peak` beat (~0.28–0.67, usually in PULK), then climbs to its `resolve` beat (~0.69–0.91, in OUTCOME). **Owner decision needed:** tune the two sliders by eye (does showing the climb beat keeping the front battle?) before any further code.
- **B4c — faller shot (now unblocked by B4)** 🔜 *(added 2026-07-15)* — a faller is cast front-post-chaos with a deep target band, so its target rank is > 5 and it is **structurally absent from `b1Indices`** — the camera literally cannot see it today. The stored `cameraPlan` carries `role: 'faller'` + beats and is the only channel that can. Same design as B4b: the plan names WHO, a reality check still authorises the cut. The camera-timing-levers item above applies here too — a faller shot hits the same weight contest.
- **E3 — PULK→OUTCOME speed differential (accept-as-design or log)** 🔜 *(added 2026-07-14 reconciliation)* — verified design: in PULK the pack's `trajectoryMult` is pinned to 1.0 and rowBonus is 0 (racePlanner.js:474); in OUTCOME both return (trajectory rises via the P-controller gain 2.0, rowBonus full). Racers are genuinely faster in OUTCOME than in PULK — a real speed step at the boundary, not an onset artifact. **Owner decision:** intended dramaturgy (accept + document as design) or a seam to smooth? Log the decision either way. **UPDATE 2026-07-18/19:** the **rowBonus/rowEnvMult sub-step** (~0.5–1.5% on back rows) is smoothed by a 1s `easeInOutCubic` in the SHARED `raceStep.js` (`computeRowEnvSmoothed`; config `enableRowEnvSmooth` + DevScreen toggle). Sim sweep (SLEW 1%/frame vs EASING 1s, 4 tracks × 100 races) confirmed both fairness-neutral (B1/B2 within 0.6pp, Holm 0). Shipped dormant first (`v-rowenv-easing-complete`), then **flipped to DEFAULT ON 2026-07-19** after owner eye-test (`v-rowenv-default-on-complete`; re-gate B1 −0.4pp, B2 −0.2pp vs instant, both within noise; DevScreen toggle flips OFF for comparison). The larger **`trajectoryMult` differential** (pack pinned 1.0 → P-controller in OUTCOME) is untouched and remains the open part of E3.
- **OUTCOME climb-capacity investigation (2026-07-17/18) — deep-band band-reach vs `choreoOutcomeStart`** 🔜 — B3–B5 band-reach degrades as `choreoOutcomeStart` rises (SWEEP 2). **Two fixes MEASURED + REJECTED:** (a) *band-checkpoint proportionalization* (Phase 1 dry-run, 6 variants × 4 tracks × 40 races): max +0.3pp B3 = noise — band-reach is **endpoint-determined** (the servo steers to the Fisher-Yates target over [choreoOutcomeStart→finish]); the checkpoint only reshapes the mid-race curve, not the destination. (b) *unified speed-ramping* (remove the distributed smoothers, replace with one global 0.5%/frame cap; 4 variants × 4 tracks × 100 races): **−5pp B2, −9pp B3** — the distributed smoothers are load-bearing for servo accuracy (Lesson 177). **Faller diagnosis (mountainstreet, N=100):** fallers **UNDERSHOOT** (a climb-capacity deficit, NOT "enter OUTCOME too fast"); worst on the long open 60-racer track. **Open lever:** add OUTCOME servo runway/authority for deep bands — earlier per-band steering onset and/or higher `trajectoryMult` authority for B3–B5 — measured against band-reach. Reports under `results/` (gitignored). **NOTE (2026-07-20):** this is the remaining open action item after B2-Heroes shipped (below); the two share the "deep bands need more servo authority" diagnosis but B2-Heroes solves front-action a different way (authored attackers, not deep-band climb-capacity). Deferred pending owner decision on drama-at-leader vs. deep-band reach.
- **B2-attacker "Attack & Fall" heroes — front-action feature** ✅ **SHIPPED ON (`v-b2-heroes-complete` = master `8bf54ca`, 2026-07-20)** — extra choreographed heroes cast from FRONT-post-chaos B2-finishers (`heroCurveGenerator.js castHeroes` + `attackerTiming`, bypasses the 0.80 B2 resolve for role `attacker-b2`) that climb to ~rank 5 mid-race then fall back and free-reorder in B2 (**band-arrival** release: the servo frees them the moment they re-enter B2 on the way down — `racePlanner.js` `atkParams` branch). **Shipped ON: `b2AttackHeroes=3`, `b2AttackPeakRank=5`, `b2AttackFinalRank=7`, `b2AttackBandArrival=true`** — the sim-validated winner: **+21% top-5 OUTCOME action** vs the no-attacker floor, with **B1/B2 band-reach ≥70% on all four tracks** and **Holm at the pre-existing 2/4 baseline** (no regression). count=0 restores the pre-feature game byte-identical. **New shipped-default fingerprint `72c3360fb75225ef`** (count=3); count=0 is still `4ec8e64dd2641ad3`. **3-phase validation** (exploration N=50 → count-confirm N=100 → hybrid N=100): finalRank (release height) is the action knob, NOT peak depth; count scales super-additively (1→+7%, 2→+10%, 3→+21%); band-arrival ties fixed-final on fairness and is simpler (no finalRank pinning). Web: DevScreen B2-count slider (PULK card) + hero-highlight rings (Camera Advanced). Tooling: `scripts/exp-b2-attack.mjs` (`--phase 1a/1b/holm3/2/fr/ba/uba`); reports in `exp-b2-attack-results/PHASE{1A,1B,2}-REPORT.md`. Owner eye-test PASS. Tests 3203/3203. *(Cleanup 2026-07-20: the `exp-b2-attack.mjs` driver was removed from tracking — recoverable at commit `c441e7c~1` (git history) — and the result tables were archived to `reports/exp-archive/exp-b2-attack-results/`. Investigation CLOSED; findings preserved.)*
- **Shelved — built, measured, kept as default-OFF flags (byte-identical off):** **pack-release** (`packReleaseEnabled`, `packReSteerThreshold`) — non-hero pack runs strictness-0 inside band; **breaks B2 band-reach** on luger-hill + searound (67–69%) + Holm 3/4 via an **endgame edge-leak** (92% of leaks after progress 0.90; free racers at the band edge get shuffled out with no runway — `exp-pack-release-results/PACK-RELEASE-B2-DIAGNOSIS.md`). Dominated by B2-attackers (more action, cleaner fairness). **universal band-arrival** (`universalBandArrival`) — free B1-heroes + normal pack inside their assigned band; fairness HELD (immediate re-steer) but **−6% action**.
- **Closure principle (validated 3 ways): action lives in ORCHESTRATION, not liberation.** Servo steering along authored curves CREATES top-5 churn; freeing racers (strictness 0 inside band) causes SETTLEMENT and REDUCES action. Evidence: B2-attackers +21% (scripted climb-and-fall); pack-release breaks B2 fairness (free); universal band-arrival −6% action (free). **Future front-action work must AUTHOR scenarios (curves/casting), not liberate constraints (release the servo).** See LESSONS if extended.
- **sim-fairness.mjs telemetry comment cleanup** — ✅ **DONE (2026-07-14 audit)** — the `passThroughCount` declaration comment now reads "sim-only telemetry" (scripts/sim-fairness.mjs:772); the stale "NOT committed to the feature branch" clause is gone.
- **Dead scaffold + N-mismatch bundle** (sim-fairness.mjs) — ✅ **DONE (2026-07-14 audit)** — `trackClosedSsf` no longer exists in scripts/sim-fairness.mjs (removed); `trackNaturalBase` is now `isOpen ? … : undefined` (open-only, line ~2644); and the `expectedMinSF` derivation uses the per-combo `nRacers` (line ~566), not the global `N_RACERS`.
- **Browser `index.jsx` inert `??` fallback mismatches** — ✅ **DONE (2026-07-14 audit)** — the fallback now reads `bonusStrengthMultiplier: dynamicsConfig.racePlanBonusStrengthMultiplier ?? 2.0` (RaceScreen/index.jsx:697), matching the real shared default; an added comment mandates the fallbacks mirror `DEFAULT_RACE_DYNAMICS_CONFIG`. (Old line refs ~662-666 have drifted.)
- **`rubberBandEndgameThreshold` field split** — ⚠️ **SUPERSEDED / MOOT (2026-07-14 audit)** — the rubber-band FORCE is removed (`raceRubberBand.js` deleted; no `flatBoost`/`rubberBand` in source); with no force there is nothing to give a dedicated endgame threshold to, and the old `index.jsx` cross-reuse of `endgameThreshold` for a rubber-band gate no longer exists. NOTE: the camera BATTLE-gate `endgameThreshold` in CameraDirector.js (0.9, line 373/1060) is a DIFFERENT, still-live thing and is unaffected.
- **Race-action direction decision** — ✅ **RESOLVED (SUPERSEDED twice)** — first resolved by the governor vision-pivot (race-action director, not Slipstream-vs-Hazard-Zones); that reactive director was then itself removed in THE GREAT PULK CLEANUP. The current shipped direction is choreo + PulkLeadRotation. Decision closed either way. See ROADMAP §R.7.
- **Governor/director — open items (from the pivot):** ⚠️ **SUPERSEDED (2026-07-14 audit)** — this whole block references the REMOVED reactive governor/director. That mechanism was replaced by choreo + PulkLeadRotation and then removed entirely in THE GREAT PULK CLEANUP, Stages 1–6 (`14cf58c` S1, `c8649dc` S2, `d32e165` S3, `e4caaaf`/`399c266`/`0b42f72` S5b, `9f71e3e` S6a). None of the reactive knobs (spread-cap, anchor-to-front, contest-injector, tail-lift, the ~15 governor values) survive in source. The one surviving `raceGovernor.js` is the NEW PULK-phase contest director (`applyPulkLeadRotation`), a different mechanism.
  - ~~**Stage C2 — generous front spread-cap**~~ — superseded (reactive governor removed).
  - ~~**A1b — anchor-to-front**~~ — superseded (reactive director anchor removed).
  - ~~**The Action sweep** over the ~15 governor/director values~~ — superseded (those values no longer exist).
  - **DevScreen knob-reduction** — ✅ **DONE, on the new world (2026-07-14 audit)** — realised in PULK CLEANUP Stage 5b-ii/5b-iii (`399c266`/`0b42f72`): DevScreen collapsed to one PULK Phase card with 5 visible controls and pinned internals (see DynamicsTuningSection.jsx:128-130, "reset only the 5 VISIBLE controls … pinned internals … have no DevScreen control"). Realised on choreo+pulk, NOT the removed governor knobs listed here.
  - ~~**OUTCOME decompression**~~ — superseded (the reactive director that clustered the front is gone).
- **`results/` not gitignored** (hygiene, reported by Sim-1) — ✅ **DONE (2026-07-14 audit)** — `results/` IS gitignored (`.gitignore:37`).
- **Doc-sync (governor pivot)** ✅ — this task; core docs synced to HEAD `b930b1b` (ARCHITECTURE, KRAEFTE-LANDKARTE, ROADMAP, BACKLOG, LESSONS, SIM, README).

---

## Phase L — Local Backend

| Item | Status | Description |
|---|---|---|
| ✅ **L.1** | PR #43 | Backend skeleton: `server/` (Express, Port 4000), Dockerfile, docker-compose.yml, `GET /api/health`, frontend config hook in `client/src/services/api.js`. |
| ✅ **L.2** | PR #44 | Track API: `GET /api/tracks`, `GET /api/tracks/:id`, `GET /api/tracks/:id/background`. Space track migrated from snapshot. 12 backend tests. |
| ✅ **L.3** | PR #44 | Frontend integration: `trackLoader.js`, `useServerTracks` hook. SetupScreen + TrackManager + RaceHistory use combined list. Geometry caching in localStorage. 14 tests. |
| ✅ **L.4** | PR #44 | Offline cache: `trackCache.js` — background images as data-URLs, 3 MB limit with LRU eviction, quota guard. `getTrackBackgroundUrl` offline-aware. 6 tests. |
| ✅ **L.4-BgCacheRemoved** | 2026-06-18 | Background-image caching removed entirely (trackCache.js deleted). Default backgrounds are 4–10 MB; localStorage quota is 5–10 MB — structurally too small even after JPEG downscale. Geometry cache kept; offline races run without background image. One-time localStorage cleanup in main.jsx removes legacy `racearena:cache:backgrounds` key. |
| ✅ **L.5** | PR #44 | Write path: POST/PUT/DELETE + background upload endpoints (server). TrackEditor async-save to server, retry UI when server not reachable. Migration on first connect (localStorage custom tracks → server, markers). Cache cleanup: deleted server tracks are removed from localStorage + background cache. TrackManager Edit opens TrackEditor (/track-editor?load=), Delete calls API. Server badge removed. 10 MB image limit. +23 frontend tests, +16 backend tests. |
| ✅ **L.6-Bug1** | PR #44 | Edit consistency: Edit now opens the metadata modal for ALL track types (Default, Local, Server). In the modal the "Edit Geometry" / "Draw Geometry" button navigates to the track editor. +8 tests. |
| ✅ **L.6-Bug2** | PR #44 | Geometry index sync: `cacheTrackGeometry` now registers server geometries in `racearena:trackGeometries:index` via `registerInIndex`. `removeCachedTrackData` deregisters via `unregisterFromIndex`. As a result server geometries appear in the modal dropdown + "📐 Edit Geometry" button correctly. Edit-Geometry button in button row without marginLeft:auto. +7 tests. |
| ✅ **L.6-Bug2-UX** | PR #44 | Edit modal UX: Edit-Geometry button below track geometry dropdown (not in action row). Effects display removed; note "Background image and effects are managed in the Track Editor" added. Action row now only contains Save/Cancel. +5 tests. |
| ✅ **L.6-VIS** | PR #44 | Track editor visibility improvement (iter 2): A1 — 60% black overlay. A2 — lines magenta (#FF00FF) instead of light blue. A3 — white outline behind each line (outline 5–6px, color 3–4px). A4 — width boundaries 1→3, center line + curves 3→4. A5 — control points white/dark unchanged. `drawStaticScene` in `trackEditorDraw.js` (testability). +18 tests. |
| ✅ **L.6-BgBug** | PR #44 | Image upload reset track: `handleBgUpload` deleted `centerPoints`/`innerPoints`/`outerPoints` when image dimensions differed from editor world. Fix: reset block + `window.confirm` dialog removed — dimension change accepted, track preserved. +1 regression test. |
| ✅ **L.7-Bug2** | PR #62 | Default tracks without geometry: all 5 default tracks (Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit) had `geometryId: null` — never playable. All 5 geometries drawn in the track editor and committed as server JSON + background images (2026-05-02). Tracks remain editable. |
| ⏳ **L.8-Hybrid** | planned | Hybrid concept: default tracks should work "offline-first" (without backend). Currently default tracks are metadata-only in code, server tracks fully on backend. When backend is unreachable, custom tracks are not playable. Discussed 2026-04-29. |
| ⏳ **L.9-Status** | planned | Server connection status visible in UI: display whether backend is reachable (green/red dot or similar), so the user knows why custom tracks are not loading. Discussed 2026-04-29. |

> ⚠️ **Add auth before VPS deployment!** Currently every browser visitor has full write access to all tracks (no auth on write endpoints). Phase 5 must implement JWT/auth before go-live. |

---

## Hot — next PR

### 1 — Camera Phase + RaceScreen Refactor ✅ Shipped (PR-A1…PR-F) — only PR-G (UI bugs) open

> **Status update:** This is the May 2026 camera rebuild, and it has effectively shipped — all of
> PR-A1, PR-A2(-Diagnose), PR-A3, Phase 4, PR-B, PR-C, PR-D, PR-E, PR-F are ✅ (see list below),
> and Bug A/B/C are all fixed. The **only** remaining sub-item is **PR-G (UI bugs: Cancel Race +
> Fullscreen API)**. Not to be confused with later camera-polish work (e.g. leader-zoom floor
> `9db8188`, ratchet fix `9339e3d`, 2026-06-24). Kept under "Hot" only for the open PR-G remainder.

**Concept documentation sprint fully completed. PR #60 merged 2026-05-03.**
Authoritative specification in `docs/CAMERA_DIRECTOR.md` (13 sections, all §13.2 questions UI-1–UI-8 answered).

**3 structural bugs identified** (empirically from code analysis):
- ✅ **Bug A** (Garden Path P1): OVERVIEW pan is a no-op — **fixed** `overviewClosedTrackZoom=1.3` multiplier, schema v15, DevScreen slider. (2026-05-27, squash `749c2a4`)
- ✅ **Bug B** (River Run P2): zoom inversion on large open tracks — **fixed** action camera for open tracks with 1.5× base zoom. (2026-05-04, PR #73 `2d79678`)
- ✅ **Bug C** (River Run P3): `openTrackPanTarget` uses all racers instead of focus group — **fixed** top-3 focus group. (2026-05-04, PR #73 `80dcb8d`)

**Q-25 root cause identified and solution decided:**
- `DEFAULT_SPEED_SCALE_CONFIG.maxScale=4.0` in `defaults.js:112` → Fix: `maxScale=10.0`
- Space Sprint at ~131 px/s (reference), race duration ~144s
- Open tracks: duration slider in setup screen, finishT dynamically from track physics

**Camera direction philosophy decided (TENDENCY LOGIC, not constraint system):**
LEADER_ZOOM as default tendency, lead-group duels trigger BATTLE_ZOOM (minGapInSpitzengruppe),
sprite corridor [min, max] as hard camera constraints, OVERVIEW random jitter [15s–25s].
N=4–100 considered; lead group = clamp(round(N×0.1), 3, 10). Cross-reference: D7d.

**Sub-PR plan (9 PRs):**
- ✅ PR-A1: Q-25 fix (maxScale=10) + duration slider + finishT for open tracks (2026-05-03)
- ✅ PR-A2-Diagnose: read-only PR → `docs/SPEED_REFACTOR_ANALYSIS.md` (no code change) (2026-05-03)
- ✅ PR-A2: Speed pipeline architecture refactor — `computeRaceBaseSpeed`, speedScaleFactor removed, closed-track duration slider (Model D), SpeedScaleSection removed (2026-05-03). **Fix commit 2026-05-04:** speedMultiplier normalization + spreadMinFactor (E1+E2).
- ✅ PR-A2.5: Arc-length-uniform spline resampling + relative jitter (2026-05-04)
- ✅ PR-A2.6: Race dynamics — spreadFactor re-roll (±85%, 5s transition) + speedBonusMult separation (2026-05-04). draftingBoost unchanged 1.10.
- ✅ PR-A3: Dev panel reorganization (tier system, Race Tuning section, raceDynamicsConfig). (2026-05-04)
- ✅ **Phase 4 (Timing Tunables + Plan-B Pan):** 7 timing tunables, battleMaxDurationMs, OVERVIEW jitter, diagnosis HUD, `_computePanScale` removed, trivial pan formula. (2026-05-06) — Branch: `diagnosis/camera-tuning-effectiveness`
- ✅ PR-B: Camera bug fixes (Bug A+B+C) — PR #73 `feat/pr-b-camera-reform` + PR #74 `fix/pr-b-closed-track-regression` (2026-05-04)
- ✅ PR-C: RaceScreen split (Q-7 refactor, no behavior change) — `e180a6b` chore/hygiene (2026-05-25)
- ✅ PR-D: Camera state machine (OVERVIEW random jitter, tension-strength logic, findBattleCandidate) — OVERVIEW jitter `d6f4d20` Phase 4 (2026-05-06) + direction system/findBattleCandidate `07bea7b` Phase 3B (2026-05-22)
- ✅ PR-E: Sprite corridor [min+max] + tag visibility iter 1 (B-UX1) + dev panel sliders — `SpriteSizeRangeSection` + `NameTagVisibilitySection` in Phase 4 `d6f4d20` (2026-05-06). `tagVisibleMaxCount` tunable live.
- ✅ PR-F: Dev panel camera tunables + HUD overlay — Phase 4 `d6f4d20` (7 timing tunables + battleMaxDurationMs + OVERVIEW cooldown sliders) + 3 HUD components in Phase 3B `07bea7b`
- PR-G: UI bugs (Cancel Race + Fullscreen API)

Approach: PR-A1 → PR-A2-Diagnose → PR-A2 → PR-A3 → Phase 4 → PR-B → PR-C → PR-D → PR-E → PR-F → PR-G.

### 2 — Player Group Selection 🔜 PRIORITY 1 after Camera Phase

The game master selects in setup which player group enters the race (e.g. "Group A", "All", "Selection").
Currently all configured players are always shown — there is no mechanism for subgroups.

**Use cases:**
- Tournament with multiple groups: only Group A races in round 1, Group B in round 2
- Ad-hoc race with participants from the full roster
- Quick selection without manually deselecting all inactive players

**Requirements (spec still pending):**
- Player groups definable in `PlayerGroupsManager` (group name + player assignment)
- Setup screen: selection filter "Which group races?" before race start
- No change to the race engine — only which players end up in `sessionStorage.activeRace`
- UI principle 1: everything configurable (group names, sizes, assignments) without code changes

**Priority:** First priority after the camera phase is complete. Before D8 (full racer editor) and Surface Zones.

---

### Race Duration Recalibration for Race End ⏳ Low Priority

**Status:** Accepted with doc clarification (PR-A2.6). No user complaint trigger so far.

Currently `race_baseSpeed` is calibrated to the **median racer**. Race end (last finisher) can
deviate ±6–8% from `targetDuration` — intrinsically due to the spread mechanic (minimum of N draws
from U[spreadMin, spreadMax]).

If user complaints about race duration deviations ever arise:
- Calibrate `race_baseSpeed` formula to **race end** instead of median (different `E[min_n]` correction)
- Race end would then be within a ±5% guarantee

**Effort:** 1–2 days. Including re-verification of all race tests.
**Priority:** Low. Currently accepted with explicit doc clarification in ARCHITECTURE.md.

---

### TLH — Track Lifecycle Hybrid — TLH-1 ✅ TLH-2 ✅ Track Delete Safeguards ✅ → TLH-3 ⏳ deferred

Three conceptual problems were uncovered while attempting to draw default track geometries (user browser test 2026-05-01, data loss bug):

1. "Draw Geometry" button opens blank track editor without preset context → creates a new unconnected track
2. Backend PUT ignores client geometryId (`existing.geometryId` hardcoded) → geometry link is broken on save
3. Track delete deletes associated geometry via `removeCachedTrackData` without usage check
4. Default tracks exist only as code constants, not as server records → UI flow for them does not work

**TLH-1 — Backend Fixes + Migration (Sub-PR 1) ✅**
- ✅ Server boot migration: 5 default tracks created as server records (idempotent via one-shot marker `.tlh1-defaults-migrated`)
- ✅ PUT `/api/tracks/:id`: `geometryId` taken from client if present in body; otherwise `existing.geometryId` kept
- ✅ DELETE + `removeCachedTrackData`: geometry is NEVER automatically deleted — only background cache
- ✅ Auto-backup: on every PUT/POST to `server/data/tracks-backups/YYYY-MM-DD/HH-MM-SS-mmm-<id>.json`
- ✅ atomicWriteJson OneDrive fallback: renameSync error → direct writeFileSync
- ✅ 10 new backend tests (geometryId ×3, backup ×3, default seed ×4), 1 new client unit test

**TLH-2 — UI Flow + Cleanup (Sub-PR 2) ✅**
- ✅ Edit modal: geometry dropdown replaced with status display ("Geometry: drawn (XX pts)" / "Geometry: not yet drawn" + "Draw/Edit Geometry" button)
- ✅ Track editor: two-mode — load mode (`?load=<id>`) shows "Editing: X" without name input, new mode shows "New Track" with name input
- ✅ Track editor load path: two-path load — (1) geometry cache, (2) direct server track state for `geometryId: null` tracks
- ✅ Track editor save path: load mode → PUT with geometryId generation on first draw; new mode → POST
- ✅ 17 new unit tests (12 TrackEditor.loadmode.test.jsx + 5 net TrackManager.test.jsx)

**TLH-2 Post-Merge Bug Fixes (branch extension after browser test)**
- ✅ F2: `hasGeo` read `innerPoints.length` (always 0 due to `toSummary` strip) → now `geometryId != null` + `pointCount` via extended `toSummary`
- ✅ F4: track editor opened scrolled to canvas (no scroll reset on navigation) → `window.scrollTo(0,0)` on mount + `scrollIntoView` on `serverError`
- ✅ F1-revised: save in load mode was blocked when no background → background only required in new mode; load mode always saveable
- ✅ Lesson 39 + 40 documented in LESSONS.md
- ✅ F2 follow-up: `autoMaxRacers` in `handleEdit` used `isServer ? track` as EditorShape input → crash (TypeError: `undefined.length`) because `toSummary` strips `innerPoints`. Fix: always use geometry cache instead of server summary. L39 extended with audit pattern.

**Track Delete Safeguards (PR #58) ✅**
- ✅ "Remove background" button in track editor (next to background upload, appears when image is loaded)
- ✅ `DELETE /api/tracks/:id/background` endpoint — removes only the image, leaves track record intact
- ✅ `DELETE /api/tracks/:id` returns 403 for default tracks (`isDefault: true`) — prevents accidental deletion
- ✅ `migrateDefaultTracks()` runs on every boot (idempotent) — restores missing default records
- ✅ React key=null fix in TrackManager geometry select
- ✅ Background image useEffect race condition fix (L43) — cancelled flag prevents stale onerror callbacks

**TLH-3 — Code Fallback + Status Banner + Export (Sub-PR 3) ⏳ deferred until after Camera Phase**
- Frontend load order: server → cache → code bundle (`defaultTracks.js`)
- Code bundle initially with empty geometries (bootstrap)
- Status banner when code bundle mode is active: "Server unavailable — showing default tracks (limited functionality)"
- Export button in dev screen: writes current server tracks as JSON snapshot (user commits manually)

> **Order matters:** TLH-1 makes the system safe (backup + no data loss bugs), TLH-2 makes it usable (correct UI flow), TLH-3 makes it resilient (offline fallback). TLH-3 was deferred until after the Camera Phase. See `docs/TRACK_LIFECYCLE.md` for the full spec.

### 1a — Draw Default Tracks ✅ Completed 2026-05-02

All 5 geometries drawn and saved in the track editor:
- ✅ Dirt Oval
- ✅ River Run
- ✅ Space Sprint
- ✅ Garden Path
- ✅ City Circuit

Additionally: Space (Custom Track) already present.

- **D7d** — 100-racer performance (spatial grid, smarter camera, LOD) — deferred until after Camera Phase

---

## Ready — spec exists, concept decided

### Browser seed — follow-ups (noted, NOT built; owner decision)

Quick-Test races are seed-deterministic as of 2026-07 (see `docs/SIM.md` → *Browser determinism*).
An empty seed field draws a fresh seed per race and shows it in the HUD; a typed number fixes the
race. Typed values persist for the browser session. Status of the follow-ups:

- ✅ **Random-seed draw for Quick-Test** — done 2026-07-22. Empty field = random-but-replayable; the
  drawn seed is shown in the HUD and can be typed back to reproduce the race exactly.
- **Seed for the normal "Start Race" path.** ⏳ OPEN — owner decision. It still hardcodes
  `racePlanSeed: 0`, so a real race is never reproducible. Options: adopt the Quick-Test model (draw
  a seed per race, display it), or leave it unseeded on purpose. This changes what a "normal" race
  is, not just how it is logged — hence not bundled with the Quick-Test work.
- **Seed persistence beyond the session.** ⏳ OPEN — owner decision. Currently `sessionStorage`, so a
  fresh browser session starts from an empty (random) field. Promote to `localStorage` or a URL
  parameter only if eye-tests need a pinned seed to survive a restart.
- **Replaying a browser seed in the sim.** The two engines are deterministic *individually*, but a
  browser seed does not reproduce frame-for-frame in the sim (different per-race seed derivation and
  timestep). Making one seed mean one race in both engines is a separate, larger piece of work.

- **Visual Racer Effects** — Surface-class-driven trail system. Four sub-PRs:
  - ✅ **VRE-1** — Foundation: 4 generator modules (`particle`, `cloud`, `splash`, `line`), 9 default surface classes, registry with override resolution, `/api/surface-classes` backend API (CRUD, atomic writes), `surfaceClassLoader.js` cache, `surfaceClassApi.js` service layer. 64 frontend + 24 backend tests. No UI, no race integration.
  - ✅ **VRE-2** — Surface class editor in dev screen. Master-detail layout: class list with Default/Modified/Custom badges on the left, animated live preview canvas + generator config editor on the right. `SurfaceClassManager.jsx`, `SurfaceClassPreview.jsx`, `useSurfaceClasses.js`. 36 new unit tests + 31 new e2e tests (smoke + UX verification). 1084 unit + 183 e2e tests total.
  - ✅ **VRE-3** — Racer/track association: `surfaceClasses` on SpriteRacerType + `getSurfaceClasses()`, all 20 racer types with classes, surfaceClasses in TUNABLE_FIELDS + CONFIG_SNAPSHOT, `filterRacerTypesForTrack()` in registry.js, surfaceClasses on DEFAULT_TRACKS + server migration, pill multi-select UI in RacerEditModal + TrackManager, SetupScreen filter + surface hint. 1134 frontend + 60 backend tests. 2 Playwright specs (smoke + UX verification) written.
  - ✅ **VRE-4** — Race integration: `trailResolver.js` with `resolveTrailEmitter()`. RaceScreen dispatches trail via emitter per racer; home trail fallback when no match. `trackSurfaceClasses` in raceData. 14 new unit tests + Playwright specs.

---

## Completed Items (Phase Completions)

| Item | PR | Description |
|---|---|---|
| ✅ **D3.5.1** | #13 | SpriteRacerType config-driven base class, tintSpriteWithMask |
| ✅ **D3.5.2** | #15(?) | Horse/Duck/Snail → SpriteRacerType migrated, `_createTrail` removed |
| ✅ **D3.5.3** | #16 | 9 new racer types (Elephant, Dragon, Snake, Giraffe, Buggy, Motorbike, Plane, F1, Rocket) |
| ✅ **B-7** | #17 | Dev screen UI drift: code registry as single source of truth, racerTypeOverrides map |
| ✅ **B-8** | #17 | SetupScreen footer/pills emoji mapping: from getRacerType().getEmoji() instead of hardcoded map |
| ✅ **W3** | #17 | Session-only racer override selector in setup track tab, filters disabled types |
| ✅ **B-9** | #17 | Test-3.1 filter: override selector shows only active types |
| ✅ **Q-1 to Q-5** | #17 | Dead exports, unused imports, TODO tags, JSON.parse hygiene, file headers |
| ✅ **D9** | #19 | Race engine speed refactor: speedMultiplier affects race speed, explicit lap/time choice, dynamic finish line for open tracks, runout behavior, 2s result delay, 22 Playwright e2e tests. Master `dad3300`. |
| ✅ **D3.5.5** | #21 | Per-type tuning UI in dev screen: 6 fields (speedMultiplier, displaySize, basePeriodMs, leaderRingColor, leaderEllipseRx, leaderEllipseRy) live-apply via edit modal. CONFIG_SNAPSHOT, normalizeOverrideMap (legacy migration), InfoTooltip component. 678 unit + 36 e2e tests. Master `2d76bc3`. |
| ✅ **D10** | #23 | Track size variability + auto sprite scaling + image-first workflow. worldWidth/worldHeight automatically from image dimensions (naturalWidth/naturalHeight). Hard limit 8000×4096. Image required to save. Dimension mismatch dialog. TrackEditor zoom+pan. trackWidth variable. Auto sprite scaling formula. All 8 requirements (A1-A8) met. Hotfix `13a2dd2` (🏁 default icon). 694 unit + 75 e2e tests. Master `13a2dd2`. |
| ✅ **B-Wave** | #25 | UX polish sweep: B-1 (player group load StrictMode fix), B-3 (winners max 5→20), B-10 (InfoTooltip auto boundary), B-11 (display size tooltip), B-12 (maxPlayers configurable), B-13 (language selector removed), B-14 (TrackManager hint), B-15 (all German UI strings → English). 694 unit + 88 e2e tests. Master `697e081`. |
| ✅ **B-16 + B-17** | #26 | Large tracks: B-16 CameraDirector adaptive zoom (zoom = worldW/VIEW_W, max 6), B-17 track speed scaling (baseSpeed ÷ pathLengthPx/referencePathLength). pathLengthPx calculated on track save + migration for existing geometries. SpeedScaleSection in dev screen. 719 unit + 100 e2e tests. Master `7cdde15`. |
| ✅ **fix/list-tracks** | #27 | Root cause fix for large-track render bug: `listTracks()` did not return worldWidth/worldHeight → bsX=1.0 → only ~549px visible on 6000px world. A1: 2-line fix in trackStorage.js. A2: migration IIFE in storage.js. 723 unit + 103 e2e tests. |
| ✅ **fix/camera-polish + Q-14** | #28 | CameraDirector: adaptive zoom (zoom=worldW²/VIEW_W/worldW, clamp 0.15–6), clampOffset 2-anchor formula, top-3 focus. cameraZoomFactor invariant (REFERENCE_CAMERA_ZOOM/cam.zoom, closed tracks only). BaseSpeedSection in dev screen: tunable min/max baseSpeed, spread preview, 2-lap gap estimate. Q-14 lapUtils SoT: DEFAULT_BASE_SPEED_CONFIG from defaults.js, private constants, optional params on openTrackFinishT/estimatedSecondsPerLap. camera-polish-ux-verification.spec.js (31 tests, permanent). 759 unit + 157 e2e tests. Master `750d826`. |
| ✅ **D11** | #30 | Racer behavior: soft avoidance + drafting. Asymmetric avoidance (trailer yields, leader holds lane) — eliminates symmetric force cancellation in packs. Proximity-scaled force, configurable avoidanceDistance/lateralForce/maxLateral. Speed brake for adjacent racers. Drafting boost for close followers in same lane. World-edge camera clamp (finding 2, prevents black strips at high zoom). Camera-zoom-aware sprite scaling for open tracks: `computeOpenTrackCameraZoomFactor()` produces identical on-screen size as closed-track reference at any zoom. Pixel-floor logic: `minVisiblePixels` (default 32) ensures sprites never vanish on wide tracks. All 5 params tunable in dev screen. 809 unit + 183 e2e tests. Master `d46cab2`. |
| ✅ **D7a** | #33 | Proportional sprite scaling + min-size floor + relative zoom ratios + label scaling. cameraZoomFactor + REFERENCE_CAMERA_ZOOM removed. computeRenderDisplayScale as single source of render pipeline: max(proportionalScreenPx, minTargetScreenPx). CameraDirector: overviewZoom × ratio per state (LEADER:1.4, BATTLE:1.6, COMEBACK:1.3). Label scaling with effZoom. Q-15 structurally addressed: 4 scaling factors → 1 pipeline. 808 unit + 183 e2e tests. Master `a49baa0`. |
| ✅ **D7a-Plus** | #35 | Per-type minTargetScreenPx with live preview. Slider + animated canvas preview in RacerEditModal. Global default hint, modified badge, reset. getEffectiveMinTargetScreenPx() in render pipeline. Scroll indicator follow-up (fade gradient). CC smoke test convention: verification sources clarification. Master `27cba65`. |
| ✅ **D7b** | #37 | Lane-free: physicalY system fully replaces currentLaneY/targetLaneY. physicalY ∈ [-1,+1] (0=centerline). Home force spring, anisotropic avoidance distance (t×tWeight + physicalY×yWeight), cone drafting (world coordinates), speed brake for adjacent racers, soft repulsion + hard clamp. 13 new/updated tunable parameters in dev screen. Lane code hard removed. Unit + e2e tests updated. |
| ✅ **D7b-fix B1+B2** | #37 | Follow-up commit on branch D7b: B1 — start spread: racers start evenly distributed over [-startSpreadRange, +startSpreadRange] instead of all at physicalY=0 (computeStartPhysicalY, new dev screen parameter). B2 — yDiff=0 edge case: when both racers have the same physicalY, no lateral force is applied (prevents all trailers flying toward +1). |
| ✅ **D7b-fix B3** | #37 | Anti-stacking (force imbalance, was listed as D11 finding in backlog): avoidance forces are normalized by sqrt(neighborCount) — prevents boundary clinging with 20+ racers where linear force accumulation overwhelmed restoring forces. New defaults: homeForceStrength=0.04 (+122%), softRepulsionStrength=0.10 (+67%), lateralForce=0.010 (−33%). |
| ✅ **D7c** | #39 | Row start + speed bonus + track capacity. `computeRowLayout` (shuffled, row assignments), `computeRowPhysicalY` (full spread also for last incomplete row), `computeSpeedBonus` (factor 1.0 = pole-neutral), `computeMaxRacersDefault` (auto capacity from pathLengthPx). Closed tracks: back rows start at negative t (tPos wraps correctly). Open tracks: t=0 through EditorShape clamp. `maxRacers` on track with "modified" badge. Setup screen: row hint + capacity warning. Dev screen row start section: 4 parameters. 21 unit + 6 e2e tests. |
| ✅ **D7c-fix** | #39 | Bug: `trackWidth` metadata (140 px, calibrated for 1280px world) gave `racersPerRow=1` on large worlds (6000px) → all 20 racers in single rows → single vertical line. Fix phase 1: `EditorShape.getActualTrackWidth()` measures real geometric width (median, cached). Fix phase 2 (D7c-fix-v2): formula completely in world pixel space: `computeRacersPerRow(trackWidthPx, frameSizePx)` = `floor(2×trackWidthPx/frameSizePx)`. `trackWidth` field completely removed from track data model — TrackManager dropdown removed, `raceData.trackWidth` and `track.trackWidth` removed. Fix phase 3 (D7c-fix-v3): floating-point rounding. **Note (scale-cleanup 2026-06-07):** `getActualTrackWidth()` is now the FALLBACK only. Physics reads `track.width` first (`track.width ?? getActualTrackWidth()`). The Track Editor stores the true physical lane width as `track.width`; `getActualTrackWidth()` can overestimate (e.g. Space Sprint: 449 px spline vs 300 px stored). |
| ✅ **D7c-Phase4** | #39 | Three fixes on feat/d7c-row-start-with-speed-bonus. (1) **startSpreadRange 0.7→0.95**: default increased; migration: saved value 0.7 is updated to 0.95 on load. (2) **Formula mismatch fix**: `computeRacersPerRow` now receives `effectiveWidth = geometricWidth × startSpreadRange` — packing calculation now matches actual racer distribution (before: formula used 100% of track width, distribution only 70%). Updated in RaceScreen, TrackManager, SetupScreen. (3) **Open track layout**: a) Assembly area — rows start at `t = (totalRows − rowIndex) × deltaT_per_row` instead of negative t → no more clamping, all rows within track. b) `runoutZone` parameter (default 0.05) — finish line on open tracks at `1.0 − runoutZone` (tunable in dev screen). No more `openTrackFinishT` in RaceScreen. Setup screen shows finish % from runoutZone. Migration for startSpreadRange + runoutZone validation in loadRaceBehaviorConfig. |

| ✅ **D7b-fix B4** | #98 | Free-lane separation + home force reduction. Additive impulse logic on geometric overlap: `isSideFree()` checks left/right space against all other active racers; deterministic direction choice via `stablePairBit` when exactly equal physicalY. `homeForceReductionOnOverlap: 0.3` — home force reduced to 30% during geometric overlap so free-lane can complete the separation. Geometry metadata (`frameSizePx`, `trackWidthPx`, `pathLengthPx` — field names from scale-cleanup rename) passed from RaceScreen to racer. `reRollVariationPercent: 45 → 58`. 13 new unit tests. 94 files / 1741 tests. |
| ✅ **Scale Cleanup** | `feat/open-track-overlap` | Foundation fix: physics now measures the world that is drawn. Three sources of truth corrected: (1) `trackWidthPx` reads `track.width` (stored by Track Editor, e.g. 300 px for Space Sprint) first, `getActualTrackWidth()` only as fallback for legacy tracks without stored width. (2) `drawnBodyWidthPx` = `bodyRef.bodyNarrow` from `computeBodyNarrowRef` (true visible body width), not `physicalSpriteSize × bodyFillX`. (3) `drawnBodyLengthPx` from render primitives independently. (4) physicalY ↔ px helpers `pxToPhysicalY` / `physicalYToPx` route ALL lateral conversions; raw `× trackWidth` was off by 2×. Six denominator/BLOCKED sites in `raceBehavior.js` fixed. Naming cleanup: 9 field renames, 2 getter renames, dead branches removed. All 19 sweep scripts + diag scripts updated. 2629/2629 tests. See `docs/ARCHITECTURE.md` § Scale & Size and `reports/open-track-overlap/34-scale-build.md`. |

| ✅ **Priority System** | #100 | 4-mode home force priority system (Phase 2). OVERLAP / COOLDOWN / BLOCKED / NORMAL — home force only active in NORMAL, so free-lane and avoidance resolve collisions first. `priorityExtras` param in `applyRacerBehavior`; legacy path (`homeForceReductionOnOverlap`) kept for tests. Escape hatch: after `blockedTimeoutFrames` (default 60) consecutive BLOCKED frames, `blockedEscapeForce × homeForceStrength` (default 30%) kicks in. M-overlay: colored rings, frame count, avg/max stats, blocker detail panel. DevScreen: PrioritySystemSection with cooldownMs, blockedTimeoutFrames, blockedEscapeForce. **BLOCKED check iterations:** (1) bounding box (false positives — Decision Log #9) → (2) line segment distance (too restrictive, racers with forward movement on path block incorrectly) → (3) **target point check** (final): checks only point (r.t, physicalY=0), distance < spriteSize → BLOCKED; reactive per frame, no lookahead needed. `lookaheadFrames` removed from DevScreen. |
| ✅ **Phase 3B** | squash `07bea7b` | BATTLE_ZOOM (isolation+greedy expansion+centroid), COMEBACK_ZOOM (green ring, globalAlpha), LEAD_CHANGE_ZOOM (lead change). Direction system: weighted candidate pool + OVERVIEW scheduler. Fixes: OVERVIEW zoom fix (L83), OVERVIEW pan jump (L84), ctx.filter→globalAlpha (L86), overlay sets clear. 3 new HUD components. +54 unit. 2041/2041 ✅. Master HEAD `07bea7b`. |

- **B-6** (speedMultiplier bug) — subsumed by D9. Was planned as a separate fix,
  fully resolved by the D9 refactor (PR #19).

---

## EditorShape Centerline Arc-Length Mismatch Fix ✅

**Status:** ✅ DONE — `aeb49c4` (2026-05-29, in master). Backup tag `backup/pre-centerline-fix` preserved for reference.

**Root cause (historical):** `EditorShape` constructor re-samples `innerPoints` and `outerPoints` each with their own arc-length parameterization (`catmullRomSpline(..., 500)`). At U-turns the inner boundary is shorter than the outer boundary. At the same T fraction, `inner[T]` is further around the bend than `outer[T]`. `getPosition(T, 0)` midpoint therefore zigzags off the actual centerline — measured at 73.7 px lateral oscillation at Luger Hill's tightest U-turn (Lesson 97).

**Fix applied (option a):** When a track provides `centerPoints`, `EditorShape` re-samples them as a third arc-length-uniform curve `_center = catmullRomSpline(track.centerPoints)`. `getPosition(t, 0)` returns position directly from `_center` instead of interpolating inner/outer midpoint. Perpendicular offsets use `angle − π/2` (CW = toward outer, matching convention). `_precomputeAngles` uses `_center[i]` tangents when available. Tracks without `centerPoints` fall back to existing midpoint behavior — no regression on Dirt Oval, River Run, City Circuit, Space Sprint, Garden Path.

**Reference:** Lessons 97–99, commits `b4ebdb4` + `aeb49c4`, Luger Hill `90d3020197da.json`.

---

## Phase 3B — Open Follow-up Items

| Item | Priority | Description |
|---|---|---|
| ✅ **chore/sprite-scale-relative** | Done `6a9dcfc` 2026-05-24 | `spritePx` → `spriteScale` (schema v14). Relative factor, racer-count-independent (L82). Defaults: OVERVIEW 1.00, LEADER 1.81, BATTLE 2.81, COMEBACK 1.39, LEAD_CHANGE 1.81. FALLBACK_REFERENCE_SPRITE_SIZE = 36 px. Side fix: LEAD_CHANGE was missing from `CameraStateHUD.STATE_CONFIG` — fallback `?? OVERVIEW` showed wrong badge (L87). |
| ✅ **Phase 3D** | Done `bcdedb8` 2026-05-25 | FINISH_OVERVIEW, BATTLE/COMEBACK fixes. See Phase 3D — Open Follow-up Items. |
| ✅ **Camera centering architecture** | Done 2026-05-26 | Root cause fix: all four phasedEnabled states (LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM, LEAD_CHANGE) now center on racer world position during follow phase. `_setTargets` sole owner of `targetOffsetX/Y`; `_computePhasedPanTarget` state-controller only. See `docs/camera-target-architecture.md`. Lesson 37. 2134/2134 tests ✅. |
| ✅ **Bug A** | Done 2026-05-27 `749c2a4` | OVERVIEW pan no-op on closed tracks — `overviewClosedTrackZoom=1.3` multiplier in all three closed-track OVERVIEW branches + transition snap. Schema v15. DevScreen slider. 2134/2134 tests ✅. |
| ✅ **Bug 1** | Done 2026-05-27 `2f417ba` | LEAD_CHANGE spriteScale dead config — `_leadChangeZoom` added to all three `_computeZoomLevels` branches; `_transition` hard-cut and `_setTargets` LEAD_CHANGE now use `_leadChangeZoom` instead of `_leaderZoom`. No config or schema change (schema v14 LEAD_CHANGE spriteScale field now takes effect). +3 tests. 2137/2137 ✅. |
| **COMEBACK vs LEADER_ZOOM priority** | Medium | COMEBACK_ZOOM activates even when a racer is only slightly behind. Threshold calibration: how far back does a racer need to be to justify COMEBACK? Measurement in real races: how often is COMEBACK activated vs displacing LEADER_ZOOM? |
| **Sim parity open track ranking** | Medium | Open track ranking (projected world position) is not yet mirrored in sim-fairness.mjs. Sim still uses raw t-value for standings. For correct fairness statements on open tracks, the sim standings must match the browser standings (sim-browser parity rule). |

---

## Phase 3D — Open Follow-up Items

| Item | Priority | Description |
|---|---|---|
| **FINISH_OVERVIEW timing calibration** | Medium | `finishOverviewLookbackPx` (300) and `finishOverviewZoomOutDurationMs` are starting defaults. Check in real races: is the leader visible at the edge of the frame when the pan ends? Is the zoom-out speed appropriate? Adjust if needed. |
| **COMEBACK frequency analysis** | Medium | After threshold relaxations (outcomePhaseThreshold 0.75→0.65, comebackMinStartGap 0.40→0.25) check: how often does COMEBACK activate now? Too frequent = operator irritation. Sim parity for COMEBACK trigger not yet achieved. |
| **BATTLE rank span empirical validation** | Low | `battleMaxRankSpan: 5` is a starting default. Measure in 20-racer races with real pack situations whether rank span 5 filters correctly or is too restrictive. |

---

## Planned — needs spec

### Phase D (Racer Design Development)

- **D3.6** — File reorganization: `racer-types/` → `racer-configs/` (39 files).
  Separates configuration from engine code. Small standalone PR.
- **Surface Zones** (follow-up phase after Visual Racer Effects) — local surface class overrides
  within a track (e.g. puddle on asphalt, mud pit on dirt). Track editor gets a
  zone drawing tool; `EditorShape` gets `getZonesAtPosition(t, offset) → Zone[]`. Planned
  once Visual Racer Effects is complete.
  *(Previously tracked as D6 / RTE reservation — `rteDefinitions` placeholder on SpriteRacerType will be
  replaced by Surface Classes; old placeholder cleaned up in VRE-1.)*
- ✅ **D7a** — Proportional sprite scaling + min-size floor + zoom ratios + label scaling (PR #33, master `a49baa0`)
- ✅ **D7a-Plus** — Per-type minTargetScreenPx with live preview (PR #35, master `27cba65`)
- ✅ **D7b** — Lane-free: physicalY replaces lane system (PR #37)
- ✅ **D7c** — Row start + speed bonus + track capacity (PR #39)

- 🔜 **D7d** — 100-racer performance
  - Spatial grid for O(N) avoidance performance
  - Smarter camera for pack overview
  - LOD or similar strategies for 100 racers
- **D8** — Full racer config editor: coats edit UI, all fields, sprite swap UI.
  Builds on override pattern (B-7).
  ⏳ **PARTIAL (2026-07-14 audit):** basic racer editing already shipped — `RacerManager.jsx`
  (list / create / delete) + `RacerEditModal.jsx` (per-field tuning overrides → localStorage/server).
  Still open for the "full" editor: the coats-edit UI and the sprite-swap UI.

### Phase B (Wiring Gaps + UX Improvements)

- **B-UX1** — Name tag readability (iteration 1, to be implemented in PR-E of the camera phase)
  - Spec in `docs/CAMERA_DIRECTOR.md §6.3`
  - Top-N tags visible (N = `tagVisibleCount`, default = lead group = clamp(round(N×0.1), 3, 10))
  - `tagVisibleCount` as dev panel slider
  - No "own player" (project principle 3) — all racers treated equally
  - All other racers without tag

- **B-UX1-Iter2** — Name tags state-dependent strategy (iteration 2, after iteration 1)
  - Spec in `docs/CAMERA_DIRECTOR.md §6.4`
  - OVERVIEW: top-3 only or no tags; LEADER_ZOOM: lead group prominent;
    BATTLE_ZOOM: involved racers prominent; zoom out: anti-overlap when space permits
  - User explicitly wants to implement this once iteration 1 is stable
  - Priority: after PR-E (camera phase)

- **B-UX-Pause** — Pause + resume race
  - During a running race, pause button → freeze rAF loop, resume → continue
  - Explicitly NOT part of the camera phase (PR-G only implements Cancel Race with confirm dialog)
  - Priority: after camera phase

- **B-UX-ManualFocus** — MANUAL_FOCUS: game master click on racer locks camera
  - Canvas click handler + hit test racer + new MANUAL_FOCUS state in CameraDirector
  - Lock UI indicator, unlock mechanism (click empty / button)
  - Effort: ~150–200 LOC, new camera state
  - Priority: after camera phase (too complex for this phase)

- **B-UX2** — Dev screen cleanup + help screen
  - Dev screen has grown to 30+ tunable values across D9/D10/D11/D7a/D7b.
    User finding: "the individual values are hard to contextualize, tooltips alone add little value"
  - Planned (spec still pending):
    - Structural reordering: race behavior sliders together, visual sliders together, etc.
    - Help modal per section with more detailed explanations (more than InfoTooltip)
    - Optional: beginner / advanced separation (power user sees everything, standard only key values)
    - Optional: visual preview components in sections where useful (analogous to D7a-Plus)
  - Priority: medium-high. Should be tackled before D8 (full racer config editor),
    so D8 is not built into a disorganized dev screen environment.

- **B-UX3** — Detailed variable documentation
  - User finding: "I need an explanation that says more than the tooltip — what do all
    the variables in the dev screen actually do"
  - Planned (spec still pending):
    - A separate doc file per section or a central DEVSCREEN_REFERENCE.md under docs/
    - Per parameter: name, type, default, range, effect in plain language,
      example values for different use cases (small race vs. large race, etc.)
    - Diagrams/images where useful (e.g. comfortThreshold visualized)
    - Cross-references to ARCHITECTURE.md pipeline sections
  - Priority: together with B-UX2 — the help screen can reference or embed the documentation.
    Can also be created as a pure documentation sprint before B-UX2, then B-UX2 uses the content.

- **B-UX-MinMax** — Dev panel min/max pairs UX: replace silent rejection with visual warning, consistent for speed range (RaceTuningSection) + overviewCooldownMin/Max (CameraZoomTuningSection) + any future min/max pairs. Currently an invalid value (min > max or max < min) is silently ignored — no feedback for the user. Fix: red border or inline text ("Min must be less than Max") when limit is violated. Small standalone PR.
  *(Arose during Phase 4 slider implementation 2026-05-06, Severity: LOW — currently consistent with existing speed range convention)*

- **B-UX4** — Sprite size system overhaul
  - Current behavior: per-type overrides (e.g. `displaySize: 50` for Rocket) are absolute
    values and completely disable auto scaling (`displaySizeScale = 1`). This means
    sprites can appear too large on narrow tracks — and was one of the factors
    that led to an incorrect `racersPerRow` value during D7c diagnosis.
  - Alternative concepts (spec still pending):
    - **(a) Override as multiplier** over auto scaling (e.g. `displaySizeOverride: 1.25` = 25% larger than auto)
    - **(b) Mixed mode with min/max limits** — auto scale runs, override sets upper/lower bound
    - **(c) Complete redesign of the tunable concept** — auto and absolute value as selectable modes
  - Arose during D7c diagnosis (2026-04-29). Needs vision discussion before spec is written.
  - Priority: low. Currently not a UX blocker — only visible with deliberate displaySize override + large track.

- **B-2** — TrackSelector: custom track behavior when geometry is missing
- **B-4** — Apply branding profiles to race/result screen (UI exists, wiring missing)
- **B-5** — System backup/restore/reset: end-to-end verified (UI-only so far)


### Phase Q (Quality Hygiene)

**Refactor chunks (high structural debt — addressed in upcoming phases):**

- ✅ **RaceScreen/index.jsx split** (Q-7) — Done (chore/hygiene-i18n-audit → master squash `e180a6b`, 2026-05-25). Extracted `drawing/` modules: `overlayRendering.js`, `particleRendering.js`, `racerRendering.js`, `priorityModeOverlay.js`, `battleDiagRendering.js`. Camera modules: `CameraDirectorDiag.js`, `cameraTimingComputation.js`.
- ✅ **TrackEditor.jsx split** (Q-6) — Done (chore/hygiene-i18n-audit → master squash `e180a6b`, 2026-05-25). Extracted: `TrackEditorToolbar.jsx` (224 lines), `TrackEditorSaveBar.jsx` (116 lines), `useViewport.js` (138 lines), `useTrackIO.js` (206 lines).
- **Dual particle system consolidation** — `dustParticles` (home trail, global pool) + `surfaceParticles` (VRE, per-racer) as separate render paths. Consolidation makes sense after Surface Zones when a third emitter type (zone effects) is added.
- **Q-19 — TrackEditor.effects.test.jsx flaky** — intermittent in full-suite parallel run. Root cause: global FileReader mock scope conflict. Fix: check spy scope or isolation test. Low priority, not a blocker.

- ✅ **Q-6** — TrackEditor.jsx split refactor. Done 2026-05-25 (chore/hygiene-i18n-audit, squash `e180a6b`).
- ✅ **Q-7** — RaceScreen/index.jsx split refactor. Done 2026-05-25 (chore/hygiene-i18n-audit, squash `e180a6b`).
- **Q-8** — Watch list: TrackManager.jsx (535 LOC) and BrandingProfiles.jsx (330 LOC).
  Consider refactor at next extension.
- **Q-9** — Watch: `racer-types/index.js` growing to 286 LOC — candidate for splitting
  (override API vs. registry vs. boot logic). Not a problem today, monitor.
- **Q-10** — Watch: `RacerEditModal.jsx` at 302 LOC — already 75% of the 400-LOC threshold.
  Keep an eye on it at D8 (full config editor).
- **Q-26** — Default tracks without backgrounds (fresh install)

  Code defaults in `defaults.js` have no `backgroundImage` field. With a running server they are
  automatically migrated to the backend (`migrateDefaultTracks()` runs idempotently on every boot) and
  user-edited server versions fully replace them (`getInitialTracks()` filters out code defaults
  when the server delivers the same ID).

  **Problem only occurs when:** fresh install or deleted server state. Then the user sees
  code defaults without backgrounds. In normal operation (server started at least once) the user
  sees exclusively server tracks with backgrounds. Verified in PR-A2.8 diagnosis.

  **Newly understood as a special case:** The more general problem is background caching for offline play
  (all tracks, not just defaults). Separate planning and solution alternatives there — see
  **"Background cache for offline play"** below.

- **Background cache for offline play** *(Low priority)*

  Currently all tracks (default + custom) require the running backend server for background images.
  When server is offline → console warning (since PR-A2.8) and black/gradient background in race.

  **User vision:** Tracks that were loaded once with a running server should remain playable with
  background while offline.

  **Resolution (2026-06-18, L.4-BgCacheRemoved):** Background-image caching removed entirely.
  localStorage approach is structurally impossible — default backgrounds are 4–10 MB; even JPEG
  downscale at q0.6 exceeds the 5–10 MB total quota once geometry + other data are included.
  `trackCache.js` deleted. `_cacheBackgroundAsync`, `getTrackBackgroundUrl`, `resolveBackgroundSrc`,
  `purgeStaleServerGeometries` all removed from `trackLoader.js`. Geometry cache kept intact.
  Offline races run without background image. One-time localStorage cleanup in `main.jsx` removes
  legacy `racearena:cache:backgrounds` key on first load.

  **If background offline play is required in future:** Use IndexedDB (no Base64 overhead, no
  5 MB quota). Consumption side in RaceScreen/PresetThumbnail would need async `getBackground(id)`.
  Effort ~4–5h. Not planned.

  **Priority:** Not planned (structural impossibility resolved by removal).

- **Q-27** — Background PNG compression *(Audit 2026-05-04, Severity: HIGH — deferred)*
  The 5 background images (Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit) are together ~11.7 MB uncompressed PNGs. Optimization to ≤500 KB/image possible (pngquant, tinypng, etc.).
  Deliberately deferred in PR-A2.9 — no acute UX blocker. Fix: compression + git replace of originals. Small standalone PR.
  *(Priority: low)*

- **Q-11** — `reader.onerror` missing in `handleBgUpload` (TrackEditor.jsx)
  FileReader errors are silently swallowed; only `img.onerror` catches load errors.
  Defensive hygiene, low priority.
- **Q-20** — Track editor load mode: background upload is now optional (F1-revised fix). But when a load-mode track has no background and the user saves without uploading one, the race engine is left without a background image. Consider: hint text "No background — race will show empty canvas" when a track is saved in load mode without a background.
- **Q-12** — localStorage quota with large data-URL images
  Tracks now store data-URLs (1–5 MB possible for high-resolution images).
  No quota handling implemented. Info-level, not an acute blocker.
- **Q-16** — CORS wildcard on all backend endpoints
  `app.use(cors())` without origin restriction — any browser tab can access all API write endpoints
  (POST/PUT/DELETE tracks + surface classes). Deliberately accepted for local operation.
  Fix: `cors({ origin: 'http://localhost:3000' })` for dev, env var for VPS.
  **Priority: VPS phase / Phase 5.** Not an acute blocker for single-user local operation.
  *(Deep audit 2026-05-01, Severity: HIGH — accepted for local-only)*

- **Q-17** — Missing `reader.onerror` handlers in SystemSettings.jsx and TrackEditor.jsx
  `FileReader.onload` handlers are without `onerror` counterpart. Errors when reading (corrupt file,
  permission problem) are silently ignored. Q-11 is specific to TrackEditor background images;
  Q-17 extends to SystemSettings JSON import. Low priority — no data loss, just poor
  UX (no error message on import error).
  *(Deep audit 2026-05-01, Severity: LOW)*

- **Q-18** — RaceScreen integration test infrastructure
  RaceScreen has 0 unit tests despite core game logic (finish detection, phase transitions, storage write).
  Blocker: canvas + rAF in jsdom requires `vi.stubGlobal` + mock rAF. Suggestion: 3 minimal tests
  (session load → race init, finish detection, sessionStorage write on race end).
  *(Deep audit 2026-05-01, Severity: MEDIUM — confirmed in TEST-RaceScreen backlog)*

- ✅ **Q-19** — TrackEditor.effects.test.jsx flaky — **fixed PR #55 (2026-05-01)**
  Root cause: `fetch` stub from `trackLoader.test.js` leaked into TrackEditor worker via missing
  `vi.unstubAllGlobals()` in `beforeEach`. Fix: `vi.unstubAllGlobals()` added in `beforeEach`.
  *(Discovered PR #50, fixed PR #55)*

- **Q-20** — Server test backup cleanup not crash-resistant (TLH-1)
  `afterAll` in `tracks.test.js` cleans up backup files via `rmSync`, but only on normal
  test run end. On Ctrl+C / crash before `afterAll`, all backup files remain in the real
  `server/data/tracks-backups/` directory. During TLH-1 development ~41 orphan files
  were created. Possible approach: `process.on('exit', cleanup)` + `process.on('SIGINT', cleanup)` as
  guard, or switch tests to a temporary directory (DATA_DIR override via env var).
  *(Discovered TLH-1 2026-05-01, Severity: LOW)*

- **Q-21** — `.json.tmp` orphans on OneDrive EPERM fallback (TLH-1)
  `atomicWriteJson` writes `.tmp` first, then `renameSync`. If `renameSync` fails (OneDrive
  EPERM), fallback `writeFileSync` writes to the target file — after which `unlinkSync(tmp)` should delete the
  `.tmp` file. If that also fails, a `.json.tmp` file remains. `findBackupFiles`
  searches for `endsWith('.json')` and does not find `.json.tmp` — such orphans are never cleaned up.
  Possible approach: server boot routine scans `tracks-backups/` for `*.json.tmp` and deletes them,
  or `findBackupFiles` includes `.json.tmp`.
  *(Discovered TLH-1 2026-05-01, Severity: LOW)*

- **Q-22** — TrackEditor frontend draft snapshot
  localStorage snapshot of the drawn geometry (key: `racearena:trackEditor:draft:<serverId>` for
  load mode, `racearena:trackEditor:draft:new` for new mode). Written on every point action or every
  ~30s, deleted after successful server save. Protects against data loss on silent
  server errors (F3 scenario from TLH-2 browser test) or browser crash. Effort: small (~50 LOC).
  Small standalone PR.
  *(Arose from TLH-2 browser test 2026-05-02, Severity: MEDIUM)*

- **Q-24** — isDefault immutability via PUT explicitly tested
  Audit found: `PUT /api/tracks/:id` handler explicitly sets `isDefault: existing.isDefault` and thereby overrides any client-sent value — `isDefault` is thus de facto immutable via API. But there is no explicit backend test protecting this behavior. If someone restructures the PUT handler, this protection could silently disappear. Standalone backend test case: "PUT with `isDefault: false` on default track does not change `isDefault`".
  *(Arose during audit in City Circuit bug fix 2026-05-02, Severity: LOW)*

- **Q-23** — Two-step save: no differentiated error message on background upload failure
  Track save is two-step: step 1 `PUT /api/tracks/:id` (geometry), step 2 `POST /api/tracks/:id/background`
  (image file). If step 1 succeeds and step 2 fails, the user sees a generic
  save error — not "geometry saved, background not". The background file remains permanently
  without upload in this case. Possible solutions: (a) separate error message per step with "Retry Background"
  option, (b) atomic save (rollback geometry if background fails). Effort: small–medium.
  *(Arose 2026-05-02 after background diagnosis dirt-oval, Severity: MEDIUM)*

- ✅ **Q-25** — Open track too fast / race duration too short (PR-A1)
  Root cause (canvas hypothesis empirically disproved): `DEFAULT_SPEED_SCALE_CONFIG.maxScale=4.0` in
  `defaults.js` capped Space Sprint at 4.0 instead of the physically correct ssf=9.886. Space Sprint
  ran at 323 px/s instead of ~131 px/s and lasted ~58s instead of ~144s.
  Fix: `maxScale=10.0` + duration slider for open tracks + `openTrackFinishT` integration in RaceScreen.
  Canvas coordinate system hypothesis disproved — Space Sprint geometry uses world coordinates 256..5707,
  not canvas-bound. *(Fixed in PR-A1, 2026-05-03)*

- **Q-13** — Sprite frame animation stutters with large sprites
  On 6000-tracks sprites become very large — frame changes appear jerky.
  **Structural solution in PR-E of the camera phase:** `maxTargetScreenPx` as upper camera zoom limit
  prevents the camera from zooming close enough to make sprites appear "animation-jerky" large.
  Spec in `docs/CAMERA_DIRECTOR.md §6.2`. Q-13 can be marked done after PR-E + browser verification.
  Fallback solutions (basePeriodMs scaling, frame interpolation) only if
  maxTargetScreenPx calibration is insufficient.

- ✅ **Q-15** — Visual system architectural debt — structurally addressed by D7a (PR #33).
  4 multiplicative scaling factors reduced to one pipeline (computeRenderDisplayScale).
  cameraZoomFactor + REFERENCE_CAMERA_ZOOM eliminated. Closed/open track math pipelines unified
  through consistent effZoom-based calculation.

- **Q-28** — Shared HTTP helper for API services *(Post-Phase-4 audit 2026-05-06, Severity: MEDIUM)*
  `client/src/services/surfaceClassApi.js` and `client/src/services/trackApi.js` share 48 lines of
  identical `apiCall`/`withTimeout` infrastructure — both services copied the same HTTP wrapper.
  Fix: extract shared helper (e.g. `services/apiUtils.js`), update both callers.
  Estimated effort: ~1h.

- **Q-29** — Shared RangeSliderSection component *(Post-Phase-4 audit 2026-05-06, Severity: LOW)*
  Three Phase-4 Dev-Screen sections share a 36-line slider pattern:
  `NameTagVisibilitySection.jsx`, `SpriteSizeRangeSection.jsx`, `CameraZoomTuningSection.jsx`.
  Extract into a shared `RangeSliderSection` component before more Dev-Screen sections are added.
  Estimated effort: ~2h.

- **Q-30** — React 18 → 19 + react-router-dom 6 → 7 migration *(Post-Phase-4 audit 2026-05-06, Severity: MEDIUM)*
  Current: `react@18.3.1`, `react-dom@18.3.1`, `react-router-dom@6.30.3`. Latest: `react@19.2.6`,
  `react-router-dom@7.15.0`. Both have breaking API changes — no npm-audit vulnerability, but the
  version gap grows with each feature phase. Recommended: migrate before Phase 6 (Pan-Refactor) to
  avoid accumulating migration debt. Estimated effort: 1–2 days (route definitions + React API).

- **Q-31** — Long files — updated watch list after chore/hygiene-i18n-audit (2026-05-25, squash `e180a6b`). Q-6 and Q-7 resolved ✅.
  - ✅ `TrackEditor/TrackEditor.jsx`: split → `TrackEditorToolbar.jsx` (224), `TrackEditorSaveBar.jsx` (116), `useViewport.js` (138), `useTrackIO.js` (206) (Q-6 done)
  - ✅ `RaceScreen/index.jsx`: drawing modules extracted to `drawing/` (5 modules) + `camera/` (2 modules) (Q-7 done)
  - ✅ `DevScreen/sections/RaceTuningSection.jsx`: 1269 → **44 lines** (thin coordinator); logic split into `BehaviorTuningSection.jsx` (610), `DynamicsTuningSection.jsx` (607), `SubCard.jsx` (41)
  - `SetupScreen/SetupScreen.jsx`: **~809 lines** — watch list (no split yet)
  - `DevScreen/sections/TrackManager.jsx`: **~727 lines** — watch list, Q-8

### Phase V (Verification Sprint)

Systematic testing of still-unverified areas:

- **V-1** — PlayerSetup B-1 loading-saved-lists bug
- **V-2** — TrackSelector B-2 custom track behavior
- **V-3** — Result screen winner count B-3 (configurable?)
- **V-4** — Branding profiles B-4 (per old ROADMAP done, reality check says open)
- **V-5** — System backup/restore/reset B-5 (data loss risk)
- **V-6** — Multiple dev panel sections — visual verification
- **V-7** — Physics + collision behavior — smoke test
- **V-8** — localStorage persistence edge cases — stress test
- **V-9** — Fullscreen toggle — functionally unverified

### Phase T (Tooltip Retrofit)

All existing dev screen fields that are unclear without a label. Uses `InfoTooltip` component
from D3.5.5.

- **T-1** — RaceDefaults fields
- **T-2** — TrackManager fields
- **T-3** — BrandingProfiles fields
- **T-4** — SystemSettings fields

---

## Order of Next Steps

1. ✅ **B-Wave** (B-1, B-3, B-10..B-15) — PR #25, master `697e081`
2. ✅ **B-16 + B-17** — PR #26, master `7cdde15`
3. ✅ **fix/camera-polish + Q-14** — PR #28, master `750d826`
4. ✅ **D11** racer behavior — PR #30, master `d46cab2`
5. ✅ **D7a** proportional sprites + zoom + labels — PR #33, master `a49baa0`
6. ✅ **D7a-Plus** per-type sprite minimum size + live preview — PR #35, master `27cba65`
7. ✅ **D7b** lane-free + physicalY avoidance — PR #37
8. ✅ **D7c** row start + speed bonus + track capacity — PR #39
9. 🔜 **D7d** — 100-racer performance
10. ✅ **Visual Racer Effects** (VRE-1 → VRE-2 → VRE-3 → VRE-4) — Master `c857a7e`
11. ✅ **Quick wins post-VRE** (server vitest v4, backend validation, window.alert, JSON.parse, doc drift)
12. ✅ **Error boundary** (deep audit HIGH finding addressed — top-level React error boundary, PR #51)
13. ✅ **Race track lights** — boundary lines + lane fill removed, replaced by glowing track lights. `trackLights` field in data model, track editor UI, server migration, `trackLights.js` module with animation styles (steady / sequence / sync_pulse / random_flash). Cache bug (L37) + CSS fix in same PR.
   - **L37 drift risk (not fixed in PR #52):** `buildTrackFromEditorState` in `trackEditorSave.js` contains an explicit output field list — intentional there (form only knows its own fields), but new editor features require an explicit update of this function. Not an acute bug, but a reminder for future features.
14. ✅ **TLH-1 — backend fixes + migration** — geometryId client-authoritative, delete preserves geometry, auto-backup, default track seed migration. PR #55.
14b. ✅ **TLH-2 — UI flow + cleanup** — edit modal geometry status display, track editor two-mode (load/new), two-path load, geometryId first draw. PR #56/#57, squash-merged.
14c. ✅ **Track delete safeguards + background race condition fix** — remove background button, DELETE background endpoint, isDefault 403 guard, migrateDefaultTracks idempotent, useEffect cancelled flag (L43). PR #58, squash-merged `fc5690f`.
14a. ✅ **Draw default tracks** — all 5 geometries drawn and saved (2026-05-02): Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit.
14d. ✅ **PR-A2.5 — Visual Race Naturalness** — arc-length-uniform spline resampling (`catmullRomSpline` default) + jitter amplitude ±5% relative (`race_baseSpeed * 0.05`). T-uniform max/min ratio was 1.36–7.72×; after fix ≤1.01×. +28 tests (1314 total). UX vision "constant pixel velocity" from 2026-05-03 browser test addressed. UX-1…UX-4 (Setup-Screen layout/settings) remain open in UX_FOLLOWUPS.md — planned for B-Wave after Camera-Director phase.
15. 🔜 **Camera phase + RaceScreen refactor** — revise CameraDirector, split RaceScreen (Q-7). Concept documentation sprint first. Q-25 (track canvas size) as parallel consideration in concept sprint.
15b. ✅ **Phase 3A — Race plan + area bonus** (feat/phase-3a, 2026-05-19) — `racePlanner.js` (B1–B5 area assignment, P-controller trajectoryMult [0.85,1.10], seeded PRNG), `areaBonusMult` in physics loop (fade after OUTCOME), symmetric start rows (bottom-up), dynamic finish line open tracks (ssf-based), 5 HUD overlays (RP DIAG), `racePlanBonusStrengthMultiplier` DevPanel + Sim. Defaults: avoidanceDistance=0.15, bonusMult=2.0. Sim smoke 120s: χ²=0.3–0.6 ✅. User-validated.
16 (shifted). **TLH-3 — code fallback + status banner + export** — deferred until after Camera Phase.
15c. ✅ **STUCK mode** (master `50c9740`, 2352 tests) — bilateral avoidance suppression. When `totalPressure > 0.008`, `imbalance < 25%`, `|physicalYVelocity| < 0.0015`: set `delta = 0` so racer holds position silently until pack geometry resolves. `stuckModeSuppress: true` (default). Sim: −18% zigzag / −10% overlap / −25% lateralSpeedScore (Space Sprint); −29% lateralSpeedScore (Dirt Oval). Lesson L108.

15d. ✅ **Adaptive zoom + rubber-band catch-up** (master `b5947b2`, 2382 tests) — Per-frame visibility ratchet ensures `minRacersVisible=8` on screen simultaneously; slow zoom-out floor (`leaderMinZoom=0.4`), phase-locked. Rubber band: flat boost (`flatBoost=0.10`) for all non-leaders when gap > `gapThreshold=0.003`; deactivates at OUTCOME phase. Lessons L109 (phase-locked zoom floor), L110 (flat boost vs. proportional formula).

15e. ✅ **Race Plan timing sweep** (master `9f6c0d9`, 2399 tests) — Two-phase sim sweep (Phase 1: 41 combos step 0.10, 10 races/track; Phase 2: top 3 × 100 races/track; seed=42; Dirt Oval/Luger Hill/Space Sprint). Winner: BTE=0.75, CS=0.55, CE=0.95. Zone success 52.4% → 64.5% (+12pp), stableOvt 9.95 → 13.20 (+33%). Decoupling corridorStart (0.55) from bonusTransitionEnd (0.75) gives the P-controller 12 extra seconds of OUTCOME phase. 4 timing sliders exposed in Dev Screen with amber warning banner. Reusable sweep script `scripts/sim-sweep.mjs`. Lesson L111.

15f. ✅ **New racer types + camera fixes + track cleanup** (master `d33c28d`, 2543 tests) — 7 new racer types: Beetle, Boarder, Koi, Turtle, Manta, Dolphin, Snowmobile (registry 13→20). New default tracks: Mountainstreet (6th), Ice Track (7th), River Run updated. Track ID cleanup + localStorage migrations v2/v3. OVERVIEW sprite-size normalization (L116). Adaptive ratchet stops at `min(minRacersVisible, activeCount)` (L117). Motorbike artifact fix (L115). Lessons L112–L117.

15g. ✅ **Closed track speed normalization + sea tracks + UI fixes** (master `066a0ed`, 2559 tests) — `closedSsf = pathLengthPx / 3200` applied to `race_baseSpeed`; Searound now races at comparable speed to standard closed tracks (L118). Seatrack (open, dolphin) and Searound (closed, manta) promoted as 8th and 9th default tracks; v5 migration; hash-ID duplicates deleted. `MinSpriteSizePreview` fixed for all mask-mode racer types. `black-sea` custom surface class removed. Sim: 7 new racer types + 4 new tracks wired.

15h. ✅ **Server ReadStream error listener** (master `d615ab7`, 2559 tests) — `createReadStream` without `.on('error', ...)` converts stream errors into uncaught process exceptions that kill the Node.js server. Added error listener with `!res.headersSent` guard; covers ENOENT, EISDIR, and Windows/Docker bind-mount race conditions. Lesson L119.

15i. ✅ **Sprite crop — tight-crop 12 spritesheets, restore displaySizes** (master `11093ff`, 2560 tests) — Audited all 20 racer types for bounding-box fill ratio. 8 types were adequate; 12 had excessive transparent padding and were cropped (horse, rocket, giraffe, snake, motorbike, luge, koi, snowmobile + associated masks). All displaySizes restored to values appropriate for cropped frame sizes. Lesson L120.

15j. ✅ **MAX_INVERSE_ZOOM 5.0 → 10.0** (master `ee9b664`, 2560 tests) — Raised ceiling for inverse (spriteScale-based) cam.zoom in `CameraDirector`. Closed tracks with worldW > ~3500px (e.g. worldW=6144 → rawZoom≈8.69) were previously capped to 5.0, rendering sprites at 57.5%. Headroom now extends to worldW≈12800. Note: Mountainstreet is `"closed": false` (open track) — fix only applies to future large closed tracks. Lesson L121.

✅ **bodyFillX/bodyFillY per racer type** — merged to master (2026-06-04, 2564 tests). Adds `bodyFillX` and `bodyFillY` to all 20 racer type configs for use in sim collision detection. Tests added in `racer-types.integration.test.js` and `sim-fairness.test.js`.

16. **Surface Zones** — follow-up phase after VRE. Track editor zone tool, `getZonesAtPosition()`.
17. **B-UX phase** — dev screen cleanup (B-UX2/B-UX3), help modal. Before D8.
18. **Backup/export** (B-5) — UI exists, wiring missing.
19. **D3.6** file reorganization (`racer-types/` → `racer-configs/`, 39 files)
20. **D8** — full racer config editor (after B-UX phase)
21. **Phase V** (verification sprint)
22. **Phase T** (tooltip retrofit — uses InfoTooltip from D3.5.5)
23. **Phase 5** VPS deployment — ⚠️ auth (JWT) first

---

## Clean-State Audit 2026-06-04 — Follow-up Items

Items surfaced by the clean-state audit on branch `chore/clean-state-2026-06-04`.

| Item | Priority | Description |
|---|---|---|
| **Fix d11-ux-verification.spec.js** | Medium | V1–V3 E2E tests assert stale physics default values (homeForceStrength=0.018, avoidanceDistance=0.35, etc.). These will fail when run against the current app. Fix: update `DEFAULT_CFG` constants and test assertions to match current `DEFAULT_RACE_BEHAVIOR_CONFIG`. Requires browser verification. Lesson L124. |
| ✅ **npm audit fix (react-router)** | Done | Patched in follow-up commit on `chore/clean-state-2026-06-04`. 0 vulnerabilities. |
| ✅ **Dead fallback constants in CameraDirector.js** | Done | 18 constants prefixed with `_` in follow-up commit on `chore/clean-state-2026-06-04`. |
| **Speed-bonus Rear-Bias calibration** | Medium | 4 of 5 fairness failures in the Phase 2 sim are Rear-Bias (back rows winning more often than expected): elephant×DirtOval, dragon×GardenPath, plane×LugerHill, horse×IceTrack. Root cause is NOT the 8 physics avoidance params — investigate `speedBonusFactor` and `maxCapacityFactor` in `DEFAULT_ROW_LAYOUT_CONFIG` (rowLayout.js). A targeted sim sweep on those two params (not a full 8-param LHS) is the next step. |
| **Browser-check Ice Track × horse geometry** | Medium | The 100-race sim found p=0.001 Rear-Bias for horse on Ice Track (χ²=21.3, df=5) — the strongest single failure. Horse has adequate laps (~4.5) and the track is slightly WIDER than Dirt Oval where horse passes. Track geometry (specific corner sequence or straight layout) is the suspected cause. Open Ice Track in a browser, run a race with horse, and observe whether any starting position shows a systematic advantage. If confirmed, consider a geometry edit. |

---

## Physics — Open Issues

### P-1 — Longitudinal overlap during passing on open tracks *(backlogged 2026-06-05)* — ⚠️ **ROOT-CAUSE PARTIALLY MOOT — RE-VERIFY (2026-07-14 audit)**

> **2026-07-14 audit note:** The stated root cause below leans on "rubber-band boost (+10%) exceeds
> the speed-brake reduction," but the rubber-band FORCE is now REMOVED (`raceRubberBand.js` deleted; no
> `flatBoost`/`gapThreshold` in source — only the pre-existing `draftingBoost` remains). Kept OPEN, not
> closed: the overlap phenomenon may still occur via drafting/threshold coupling, but the specific causal
> chain is no longer accurate. Needs a fresh top-down measurement to confirm whether the symptom
> persists without the rubber band. Flag for owner.

**Symptom:** In open-track races with ≥20 racers, planes and other racers visibly cross/stack during overtaking events. Visible in top-down view — not an illusion.

**Root cause:** `speedBrakeYThreshold` (= 0.18) and `avoidanceDistance` (= 0.18) are coupled to the same value. When two racers are more than 80.8 px apart laterally (`|dY| > 0.18`), neither the speed brake nor the avoidance force fires. Rubber-band boost (+10%) exceeds the speed-brake reduction (−5.5%), so trailers continue closing the gap and `dT → 0`. Free-lane separation pushes passing racers to adjacent lateral slots; at `dT = 0`, rendered longitudinal bodies (31.7 px at N=80 for plane) fully overlap. On screen at the camera zoom used mid-race (~2.8× OVERVIEW), this is ≈89 px of visible body overlap per passing pair. With 80 racers and brakeRate ≈93%, multiple such passes happen simultaneously.

**Pre-existing:** Exists on both master and current branch. Branch bodies are SMALLER than master (31.7 vs 35.1 px at N=80), so the branch is slightly better. The body-sizing rebuild (feat/closed-track-overview-normalization) did NOT introduce or worsen this.

**Fix direction:** Decouple `speedBrakeYThreshold` from `avoidanceDistance`. Add a longitudinal-separation mechanism that works at all `|dY|` values (not gated by the lateral threshold). This is a **PHYSICS** change.

**Impact on sims:** Targeted sweep only — specifically low/medium N on wide open tracks (e.g. Space Sprint × plane × N=9, 20, 40). The full 8-parameter sweep does NOT need to be re-run; the fairness metric (win rate distribution) is not affected by rendering or passing overlap.

**Reference:** `reports/closed-track-overview/15-topdown-overlap.md`

### P-3 — Speed-brake lateral: body-based same-lane filter on narrow tracks *(backlogged 2026-06-08)*

**Resolved in report 45:** Speed-brake lateral now uses `contactWidth × 1.0` (body-based same-lane filter). The ×1.5 attempt (report 43 revert) failed because the multiplier expanded the zone into adjacent rows for wide-body racers on narrow tracks (luge/250px: 22.5px→37.5px, caught all adjacent pairs).

**Remaining edge case:** For very narrow tracks or unusually wide bodies, `contactWidth × 1.0` can be slightly wider than the old normalized threshold (luge: 25px vs 22.5px old — 11% wider). Currently safe (luge p=0.585). A future fix would introduce density-awareness: cap the lateral threshold so it stays below the typical row spacing on the current track.

**Fix direction:** `min(contactWidth, effectiveWidth / racersPerRow × 0.9)` as the lateral threshold — this ensures the filter never catches ALL adjacent pairs regardless of body/track density ratio.

**Priority:** Low. Current ×1.0 solution is safe across all 10 tracks + 20 racer types.

---

### P-4 — getWidthAtT: non-uniform track width *(backlogged 2026-06-07)*

`getTrackWidthAtTpx` returns a single track-width value per racer (the stored `track.width` constant). For tracks with variable lane width (e.g. banked curves, chicanes), avoidance thresholds should scale with the local width at `racer.t`. Extension hook is documented in `raceBehavior.js`. Implement by querying `EditorShape._centerWidth(t)` or equivalent per frame.

**Priority:** Low. No existing track has variable width. Build only when the Track Editor gains variable-width curves.

---

### ✅ P-5 — Luger Hill hex track-ID rename *(completed commit 2410d78, 2026-06-08)*

Luger Hill's track ID was the hex UUID `90d3020197da`. Renamed to `luger-hill` in commit `2410d78` (`refactor(data): rename Luger Hill track id to slug (luger-hill)`): `90d3020197da.json` → `luger-hill.json`, `90d3020197da.png` → `luger-hill.png`, all script references updated. Live server confirms `"id": "luger-hill"` in the JSON.

---

### P-6 — Spatial grid for O(N) avoidance (D7d) *(backlogged)*

Current avoidance loop is O(N²) over all active pairs. At N=100 this is 4950 pair checks per frame. A spatial grid (cell size ≈ avoidance gate threshold) would reduce to O(N) average by only checking pairs in adjacent grid cells.

**Already planned as D7d** in the roadmap. Prerequisite for 100-racer races.

**Priority:** Medium. Required for D7d; no urgency at current N=40–60.

---

### P-2 — liteOverlapRate metric blind to longitudinal passing overlap *(backlogged 2026-06-05, partially resolved 2026-06-05)*

The sim's `liteOverlapRate` measures center-to-center proximity (threshold ~3.5 px lateral, ~3.9 px longitudinal). The physics never allows centers that close. Real visual overlap at `dT = 0` (31.7 px body) is invisible to the metric — it reported 0% while ~89 px on-screen overlap was occurring.

**Fix direction — status:**
1. ✅ **Longitudinal + lateral body-extent overlap metric** — `honestOverlapRate` added to sim: uses `effectiveDisplaySize × bodyFillX/Y` as thresholds, checks all active pairs every frame after 4 s warmup. Covers open AND closed tracks.
2. ✅ **Closed-track overlap coverage** — honest overlap now emits for both topologies (wrapping uses `tPos mod 1`, matching the browser's own normalization — see Lesson 127).
3. ⏳ **Dead-zone guard metric** `physSlot / trackWidth > avoidanceDistance` — not yet added to sim.

**Two distinct phenomena — do not conflate:**
- **(a) Same-lap pack crowding on short closed tracks** (5–8% honest overlap): many bodies on a short perimeter (path ≤ 3300 px). Measured directly: max spread is 0.2–0.55 laps, 100% same-lap events, 0% cross-lap. NOT caused by lapping — lapping does not occur in 60s homogeneous fields. Not a physics bug.
- **(b) Longitudinal rendered-body overlap during open-track overtaking** (P-1 bug): rubber-band overcomes speed brake, dT → 0 at crossing, ~31.7 px body overlap per pair on screen. Pre-existing physics issue, still open.

**Reference:** `reports/closed-track-overview/14-full-diagnosis.md` §Q8, `reports/closed-track-overview/15-topdown-overlap.md`, `reports/phase1-metrics/03-n50-lapping-confirmation.md`

---

## Known Limitations — Deliberately Accepted

- **SEC-2 — Race state manipulation via React DevTools** *(audit-2026-04-29, Severity: High — accepted)*
  `g.current.racers` in RaceScreen lives as a mutable `useRef`. Technically proficient guests can use
  React DevTools / `__reactFiber$` to access racer objects and set fields like `t`, `baseSpeed`,
  `finished` directly. `Object.freeze()` only protects direct properties and is bypassable through DevTools.
  **Not fully fixable client-side.** Full protection requires server architecture with race replay or
  cryptographic signing (Phase 5).
  The other three security findings (SEC-1 r.t-clamp, SEC-3 sessionStorage validation,
  SEC-4 file size guard) were addressed in PR cleanup/security-and-crash-protection
  (audit report: docs/internal/audit-2026-04-29.md).

- **TEST-RaceScreen** — RaceScreen integration test for `isOpenTrack` propagation *(Priority: low)*
  Requires canvas + `requestAnimationFrame` mocking in jsdom. Currently no test infrastructure for the
  animation loop. Was tracked as TODO in `RaceScreen/index.jsx` and moved to backlog in cleanup PR 2/3
  (audit-2026-04-29.md).

- **DIAG-OpenTrackPan** — Open track pan verification after Phase 4 merge *(Priority: low)*
  Diagnosis session 2026-05-06: Space Sprint browser test showed BATTLE pan possibly outside
  the racer cluster. Unclear whether real bug in `openTrackCamera.js` / `openTrackPanTarget()` or
  browser state artifact (browser zoom was known as error source in the same session).
  CameraDirector's `cam.offsetX/Y` are irrelevant for open tracks — `st.camX/Y` via
  `openTrackPanTarget()` control the pan. Clarify with separate browser test after Phase 4 merge.

- **Snowmobile sprite improvement** — The current snowmobile spritesheet (`snowboard-ride.png`, downscaled to 192×192) is a generic snowboard-riding animation not specifically designed for a snowmobile racer. A dedicated snowmobile sprite with clearer vehicle silhouette and more distinct rider/chassis separation would improve tinting results and visual identity. *(Priority: low — cosmetic)*

- **Mountainstreet OVERVIEW inversion fix** — The Mountainstreet track is a steep downhill open course. The OVERVIEW camera shows the track with the finish line at the bottom of the canvas and the start at the top, which is counter-intuitive for a downhill track (should feel like racers are descending toward the viewer). Consider adding an `overviewFlip` or `baseRotationOffset` field to the track config that rotates the OVERVIEW camera 180°. *(Priority: low — cosmetic)*

- **Pan target identification** — Camera does not reliably show the race leader *(Priority: medium)*
  LEADER_ZOOM and BATTLE_ZOOM zoom onto the centroid of the top-N lead group (`focusRacers.slice(0, N)`).
  That is the t-value centroid — not necessarily the standings leader (position 1 by lap logic).
  In tight packs with multiple lap changes, the "geometric centroid" can diverge from "who is actually leading".
  Consequence: camera may not show the player viewers perceive as the leader.
  Mitigation: replace `focusRacers` with standings-sorted list; calculate centroid only within
  the top-N of the actual race order. Standalone PR after the camera phase.

---

## Racer Editor — Open Points

Items deferred from Racer Editor Phase 1+2 (merged 2026-05-28).

| Item | Priority | Description |
|---|---|---|
| ✅ **RE-1** Extended coat palette | Done 2026-05-30 | `STANDARD_COAT_PALETTE` expanded to 20 colors for all vehicle types. Pattern infrastructure (solid/stripes/dots) implemented in `spriteTinter.js` + `coatAssignment.js`; patterns disabled (`assignPattern` always returns `'solid'`) — too visually dominant at 40 px display size (Lesson 105). Re-enable by updating `assignPattern` when sprite display sizes are larger or tiles are retuned. |
| **RE-2** Frame-sequence mode | Low | Alternative to spritesheet upload: import individual PNG frames (1–16). Builder stitches them into a sheet internally. Useful for frame-by-frame artwork. |
| **RE-3** Speed equalization | Low | Option in RacerMetadataPanel to normalize speedMultiplier so user-created types race at the same average pace as built-in types. Auto-computes from median built-in `speedMultiplier`. |
| **RE-4** D3.6 migration refactor | Medium | Migrate all built-in types (HorseRacerType, DuckRacerType, SnailRacerType, …) from class files to `SpriteRacerType` config objects. Remove per-type class files. See ROADMAP.md D3.6. |
| **RE-5** Mask-mode support in Editor | Low | Expose tintMode='mask' option in SpriteGeneratorPanel; add mask PNG upload field. Currently mask mode is available in code but not exposed in the Racer Editor UI. |

---

## Parking Lot — Future / Unclear Scope

- Phase 5: server, leaderboard, Socket.IO (architecture planned, no code)
- Phase 7: custom sprite upload ✅ delivered as standalone Racer Editor Phase 1+2 (2026-05-28)
- i18n (English + German base) — app language is English, documentation can be both
- Multi-tenant isolation (per-organizer track sets and branding)
- Mobile / tablet responsive tuning
- Strecken-Wähler (track-picker diagnose tool) Phase 2 — optional extension of the completed Phase 1 (closed-track selection with per-track caps from finish math); scope undefined, non-mandatory

---

## 2026-07-10 — added (INFRA: sim-trust)

- **FORCE-PARITY latent seams** (`docs/FORCE-PARITY.md`, O1–O6). **O1 is the sharpest:** the sim's
  `computeFinishT` hardcodes `runoutZone = 0.05` while the browser reads `behaviorConfig.runoutZone` —
  identical at default, diverges if the owner ever changes it (open tracks only). O2 (`--rerollVariant=2`
  sim-only), O3 (lap-normalisation duplicated), O4 (browser-only run-out decay, no outcome impact),
  O5 (auxiliary sweep scripts omit the phase-split), O6 (shared-module parity conditional on geometry).
- **Repository hygiene** — needs a curation pass: **170 tags on origin, 180 local** (10 unpushed local
  tags; `git tag | wc -l` = 180, `git ls-remote --tags` = 170) and **6 remote branches**. Which tags are
  meaningful, and which branches are dead, is **UNVERIFIED** — keep it that way until whoever prunes
  proves each one; produce a KEEP-LIST of the live rollback anchors first. (Do not prune on any inherited
  count — they have not matched twice now.)
- **Pre-existing start-row WIN bias on luger-hill and dirt-oval** — present under v4-OFF (shipped
  default): `startRowUnfair = true` on both across all three arms in the night sweep. Independent of
  cohesion; a fairness item in its own right.
- **PHOTO_FINISH DevScreen accordion** — to be added.
- **Hero-count as a DevScreen range** — expose the 2–4 hero count as a tunable range.

### Re-apply --jobs parallelism cleanly (perf)
worker_threads parallelism for the sweep race loop (~5x speedup at jobs=8). Originally on
`diag/look-before-brake` commit `0c20f9b`, but a clean cherry-pick isn't possible — master's per-race
body diverged (3 extra observers: COMEBACK_ANALYSIS, HERO_MAP, GAP_METRICS), making it a ~1-2h manual
core-loop refactor with fingerprint + observer-parity gates. Deferred as nice-to-have (2026-07-19).
When re-applied: extract `runRaceForCombo`, split run/fold for all observers, add worker + pool, gate on
`--jobs=1` fingerprint parity AND serial-vs-parallel observer parity (hero-map /
gap-metrics / comeback). The `--jobs` parallelism work (`0c20f9b`) lives on branch
`diag/look-before-brake`, whose tip is **`c32cc61`**. **Plan (cleanup step 5, 2026-07-20):** the branch's
whole LBB-diag history is preserved at `c32cc61` via an archive tag `archive/diag-look-before-brake`, then
the branch itself is deleted — so re-apply the parallelism by cherry-picking from that tag, not from a live
branch.
**NOTE (2026-07-20):** since B2-Heroes shipped default `b2AttackHeroes=3`, `fingerprint-default.mjs`
(default config) now yields `72c3360fb75225ef`. The pre-feature `4ec8e64dd2641ad3` now requires
`b2AttackHeroes=0`. Pin the parity gate to the current default hash (or run with count=0 for `4ec8e64`).

## 2026-07-20 — added (runaway baseline + cleanup)

### Runaway phase — Distance Leash (active) + Late Challenger (deferred) 🔜 *(flag-gated; decided 2026-07-20)*
Baseline established: **runawayWinnerRate = 23.5%** overall (open 18% / closed 28–30%) via the
`--runaway-parade` observer (`scripts/sim/observers/runaway-parade.mjs`, baseline in
`exp-runaway-leader-results/`). **Goal:** keep the leader catchable without breaking fairness. **Key
constraint (Lesson 179):** the decisive lead forms **before progress 0.90** — a ≥3-length lead at 0.90
converted to an unchallenged win in ~94/99 races — so a leash that only engages after 0.90 arrives too
late; contest the gap EARLIER. **Concept + two independent reviews + decision:**
`reports/proposals/RUNAWAY-CONCEPT.md` (+ `CONCEPT-REVIEW-CC-RUNAWAY.md`, `CONCEPT-REVIEW-COPILOT-RUNAWAY.md`).

**ACTIVE — Mechanism A: Front-Cluster Distance Leash (BUILD, modified).** The load-bearing, gap-space
mechanism (the metric lives in gap-space; the servo is rank-space and length-blind today). Design:
**leash on the current rank-1 racer (hero or not); leader-only PROPORTIONAL gap-brake with hysteresis;
reuse the 1 s `trajectoryMult` slew; window [0.6, ~0.92]; B1 floor; shared length scale via
`raceLengths.js` threaded parity-safe into `update()` and both callers** (`index.jsx`, `sim-fairness.mjs`).
Flag-gated (`frontLeash*`), default OFF → byte-identical. This is the next build step.

**DEFERRED — Mechanism B: Late Challenger.** Reactive form REJECTED (fights the once-per-race,
boundary-anchored generator; near-empty feasibility budget that late; rank-space curves can't express
"within ~1 length"). Unconditional-closer form DEFERRED. **Re-entry condition:** revisit ONLY if
measurement after A ships shows the front present in RANK but still not contesting in LENGTH at the line.

**Success metrics:** runawayWinnerRate 23.5% → <10% (no track >15%); top-5 action ≥ baseline;
paradeFinishRate ≤ 2%; B1/B2 band-reach ≥70%, Holm ≤2/4; flags OFF → fingerprint `72c3360fb75225ef`.
*(Casting-yield criterion dropped for A — A casts nothing and no `castingYield` metric exists; it
re-applies only if B is ever built. Note: leash brake authority is −15% / minMult 0.85, not "+10%".)*
Measure with the runaway-parade observer + `exp-runaway-leader` on the f40a7a6 seeds; determinism per sweep.
Per Lesson 178, AUTHOR the contest (leash the leader), don't LIBERATE constraints.

**STATUS 2026-07-20 — leash FAILED; diagnostics done; gap-cap re-roll bias now the active mechanism.**
Phase-1a leash sweep FAILED (runaway worsened 22.5%→~30%; braking rank-1 reshuffles a bigger runaway).
Two read-only diagnostics followed: **formation** (`b4a1327`) — the 3.0L gap forms LATE, median progress
0.783 (in-window, so leash timing wasn't the issue); **speed-source** (`9b51380`) — the escape is
NATURAL (spreadFactor ≈ band ceiling 1.080 vs chasers 1.031; areaBonusPost EXONERATED = 1.0 late; servo
already brakes the leader). New product metric surfaced: racers within 3.0L of P1 at 0.90 = median **0**
in runaways (vs 2 non-runaway). → **ACTIVE mechanism: gap-cap re-roll bias** (`docs/CONCEPT-COHESION.md`),
the drift instrument that re-draws spreadFactor. Built SIM-only, flag-gated (`--gapRerollThresholdLengths /
--gapRerollMode / --gapRerollStrength`), scheduled-rolls-only (owner fairness decision), OFF = byte-identical
(fingerprint `72c3360fb75225ef`). Phase-2 exploration sweep (symmetric/down × G 1.5/2.0, N=50) in
`exp-runaway-leader-results/phase2-gapreroll/`. NEW first-class gate added: within-3.0L runaway median ≥ 2.
Concept + CC/Copilot reviews: `reports/proposals/GAP-REROLL-CONCEPT.md` (+ reviews). Both reviews
independently favored this over the leash (right instrument for the measured drift cause).

**STATUS 2026-07-21 — window-basis bug fixed + N=200 confirmation + BROWSER WIRING DONE; eye-test pending.**
The closed-track 0-biased-rolls bug (windowEnd on target vs realized duration) was fixed (`9ff3bf3`) — one
duration basis, both engines. N=200 confirmation on ALL 10 tracks (`3464295`): **symmetric/G=1.5/strength=1.0
→ runawayWinnerRate 23%→8.3%**, generalizes cleanly (6 new tracks behave like their groups), action IMPROVED
(+0.53), 73% of V0-runaways converted (escapee still wins/podiums in a contest). **Browser wiring + DevScreen
controls now DONE (default OFF, fingerprint `72c3360fb75225ef` re-verified, one-clock window in both engines)
— OWNER EYE-TEST PENDING.** *(Secondary open observations, NOT gate-blockers for the eye-test: **searound
sits at ~15.5%**, just over the 15% per-track cap — the only track over; **Holm 3/10** (V0 2/10, one extra
flagged track). Band-reach — the PRIMARY fairness gate — HOLDS ≥70% on all tracks for strength 1.0; s075
dips to 69.7% so s10 is the cleaner candidate.)* Next after eye-test: owner ship decision → backup tag.

### Parade-finish — observe only 🔍 *(no action)*
`paradeFinishRate = 2%` baseline, and when it happens the leading group is genuinely paced (internal speed
spread ≤0.10 over the final 5%). Rare and not obviously bad — **track it via `--runaway-parade`, do not
chase it.** Revisit only if a runaway fix pushes it up.

### Sim `--out` forced under repo ROOT 🔧 *(hygiene, small)*
`sim-fairness.mjs` resolves `--out` relative to repo ROOT (`join(ROOT, out)`), so a sweep's raw scratch
cannot be redirected to an external non-OneDrive temp dir; it lands in `client/tmp/` (gitignored). Noticed
during the runaway baseline sweep. Low priority — allow an absolute `--out` (skip the ROOT join when the
path is absolute) if we ever want scratch off the OneDrive-synced tree for speed.

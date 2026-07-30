# Evolution reports — index (newest first)

One line per report: what it tried → verdict → the lesson/outcome. This is the lab journal's map. The reports
themselves are the record; the living docs are [LESSONS.md](../../docs/LESSONS.md), [DEAD-ENDS.md](../../docs/DEAD-ENDS.md),
and [FAIRNESS.md](../../docs/FAIRNESS.md). Shipped world: **COMBO15** (`v-ship-combo15`, fingerprint `ded0a126048e4cdb`).

## Camera / presentation fixes

- [CAMERA-FOCUS-4.md](CAMERA-FOCUS-4.md) — prove what the owner's browser actually runs (he reports 1:1 identical while the replay measures the new camera). **Added a permanent commit-stamped race-start LIVE TRUTH console line (resolved grammar · observer phase after entry · per-key config source) — reload + paste settles stale-bundle vs stale-config in one glance. Prime suspect (config merge dropping new keys) tested + EXONERATED: the v17 merge already resolves grammar `cut` (no server-side config path) → the divergence is almost certainly a STALE BUNDLE. STEP 1 systemic fix shipped anyway: `loadCameraConfig` fills any missing DEFAULT key on every branch (4 tests). World-edge framing WITHDRAWN (owner geometry = infield above). fp `ded0a126`.**
- [CAMERA-FOCUS-3.md](CAMERA-FOCUS-3.md) — kill the hard transition jumps (FOCUS-2's named successor). **Grammar (A) TRUE CUT: every anchored entry snaps pan+zoom together frame-1 — the ~1.6s corner-riding acquisition is dead, 6/6 cuts land framed. Fixing observer-phase promotion made the follow tracker frame the leader (X clamp 1634→~3 idle). Leader framed FORWARD, pack behind (owner design), UI `leaderForwardFrac` 0.66. Residual: Y clamp ~44% on the tall searound loop at tight zoom (world-edge tension) → CAMERA-FOCUS-4. `cameraTransitionGrammar='cut'` shipped (legacy fallback); grammar (B) glide named. fp `ded0a126`; 944 tests green.**
- [CAMERA-FOCUS-2.md](CAMERA-FOCUS-2.md) — the owner's timeline claim ("the camera was fine a few days ago") tested as a measured **bisect ladder**: one searound seed-5601 replay into 5 camera commits. **REFUTED — the leader-off-frame was 98.7% of the early window at EVERY pre-clamp rung including "a few days ago" (dc920c7); today's clamp is the first fix (→12.3%). A trackingTC sweep proves EMA sizing can't contain it (98.7% at tc 0.06) — the clamp is structural. The early "jumping" is invariant across rungs = hard state-transition cuts (858px vs 7.7px, max 3436px), an OLD separate defect. CONSEQUENCE: do NOT revert (today is the best rung); next = CAMERA-FOCUS-3 soften transition cuts. Read-only, fp `ded0a126`.**
- [CAMERA-FOCUS-1.md](CAMERA-FOCUS-1.md) — the LEADER-family camera drifted AWAY from the current leader. STEP-0 proved the pan IS anchored on the leader (midpoint suspect falsified, `rawPan == leaderX`); the drift is **pure pan lag** — the smooth lerp trails a fast leader and the tight LEADER zoom amplifies it past inner-70 (69/100 frames at fast+tight, 0 when slow or zoom relaxed; LEADER-MINVIS-1 masks it). **FIXED: per-frame containment clamp (pan mirror of the min-visible zoom floor) → 0/100 outside inner-70; anchor helper + dev HUD ▸anchor line; fp identical `ded0a126048e4cdb`.**
- [BATTLE-WEIGHT-ZERO-1.md](BATTLE-WEIGHT-ZERO-1.md) — a weight-0 camera event (BATTLE) still entered (unguarded pool push + selector returned zero-weight/zero-sum picks). **FIXED: weight>0 pool guards + selector filters weight<=0 → null; fp identical.**
- [CAMERA-JITTER-1.md](CAMERA-JITTER-1.md) — the LEADER-MINVIS-1 min-visible floor jittered zoom+pan (binding racer flips each frame in the dense field). **FIXED: asymmetric rate-limit (loosen instant, tighten slow) → floor swing 0.42→0.04; fp identical.**
- [BATTLE-TRIGGER-RANGE-1.md](BATTLE-TRIGGER-RANGE-1.md) — Pulk Closeness / Isolation sliders re-scaled to the sub-1% zone (0.1%–2.0%, step 0.1%) for the dense COMBO15 field. **Presentation-only; defaults unchanged; fp identical.**
- [LEADER-MINVIS-1.md](LEADER-MINVIS-1.md) — the LEADER "zoom out until ≥8 visible" rule existed but didn't act (slow ratchet zoomed in first, crawled out, reset on transition). **FIXED: direct per-frame min-visible zoom floor; fp identical.**
- [OVERVIEW-ZOOM-1.md](OVERVIEW-ZOOM-1.md) — the OVERVIEW view ignored the selected sprite scale (L116/`c7fa30a` regression). **FIXED: selected scale multiplies the normalized target; default unchanged, fp identical.**

## Hygiene + record (2026-07-29)
- [HYGIENE-1.md](HYGIENE-1.md) — empty the hygiene list: single-sourced phase defaults, `racePlanPulkStart` DevScreen control, CI link-checker + audit-gate, local tooling, react-router 6→7. **Behavior-neutral (fp identical).**
- [DOC-SYNC-1.md](DOC-SYNC-1.md) — bring every living doc to COMBO15 (pulkStart 0.15, fingerprints, dangling links). **Doc-only; fp identical.**
- [CLEAN-SWEEP-1.md](CLEAN-SWEEP-1.md) — remove the 2 dead FAIR-ARRIVAL arms + full local audit. **Byte-neutral (fp identical); 780 MB scratch purged.**
- [DOCS-1.md](DOCS-1.md) — the complete written record: preserve the 3 closed branches' reports, L184–189, DEAD-ENDS §G, FAIRNESS.md. **Record complete.**

## The FAIR-ARRIVAL → COMBO15 line (SHIPPED)
- [ROSTER-MATRIX-1.md](ROSTER-MATRIX-1.md) — does every surface-compatible racer reach its band on the tracks it belongs on? Read-only measure of all 71 eligible `(type, track)` cells on COMBO15. **YES — every cell 84.4–91.0% arrival, 0% runaway; worst = seatrack/rocket 84.4%. One signal: rocket is the softest cell on 4 open water/air tracks (mild over-power). fp identical `ded0a126`.**
- [MERGE-SHIP-1.md](MERGE-SHIP-1.md) — COMBO15 becomes the default world; source cleaned. **SHIPPED (fp ded0a126).**
- [STEER-CAP-1.md](STEER-CAP-1.md) — cap the boost side of the chaos steer to close space-sprint's gap. **KILL — backfired 6/6 (Lesson 189, wrong lever).**
- [FAIR-ARRIVAL-GATE.md](FAIR-ARRIVAL-GATE.md) — binding N=100 × 10-track record on COMBO15. **PARTIAL near-pass (7/10 full-pass); pulk flatness FIXED.**
- [PULK-SPECTACLE-1.md](PULK-SPECTACLE-1.md) — measure the owner's "mid-race gone flat" finding. **Confirmed: full chaos sort empties the pulk; 0.15 window fixes it (Lesson 185).**
- [EYE-SETUP-2.md](EYE-SETUP-2.md) — OPEN browser viewing with proof-of-live. **The whitelist trap + proof-of-live standard (Lesson 187).**
- [EYE-SETUP-1.md](EYE-SETUP-1.md) — the owner's blind A/B browser viewer. **DEAD tooling (never armed); replaced by proof-of-live.**
- [FAIR-ARRIVAL-CONFIRM-1.md](FAIR-ARRIVAL-CONFIRM-1.md) — COMBO across all 10 tracks, N=50. **Strong confirm (9/10); garden-path is a ceiling track.**
- [FAIR-ARRIVAL-COMBINE-1.md](FAIR-ARRIVAL-COMBINE-1.md) — the owner's two halves together (steer + draw-bias). **Night-gate PASS.**
- [CHAOS-STEER-1.md](CHAOS-STEER-1.md) — the owner's Part 1 (chaos steer) built reachable, measured alone. **Grips; action ≈ ship+.**
- [FAIR-ARRIVAL-1.md](FAIR-ARRIVAL-1.md) — steer the chaos, aim the dice. **First non-cliff win: aim the DRAW, not the position (Lesson 184).**

## The band-corridor / free-band line (DEAD)
- [ACTION-FREEBAND-2.md](ACTION-FREEBAND-2.md) — the dial without the stowaway (preregistered close). **Line CLOSED; the dial is a CLIFF; the proximity floor is a fairness asset (Lesson 186).**
- [ACTION-FREEBAND-1.md](ACTION-FREEBAND-1.md) — band corridor + finale tempo noise. **Hard wall pins, soft spring leaks.**

## The choreo-release line (DEAD)
- [CHOREO-RELEASE-2.md](CHOREO-RELEASE-2.md) — both owner parts at full strength on the archived world. **Decided finale stays flat (3rd confirmation).**
- [CHOREO-RELEASE-1.md](CHOREO-RELEASE-1.md) — release each racer to the ship's re-roll once home. **Arrival-safe but flat (Lesson 185, decidedness).**

## The chain-choreography / admission-action line (DEAD)
- [ACTION-NIGHT-1.md](ACTION-NIGHT-1.md) — full-world gate: 10 tracks × N=100 × durations. **Admission-only cannot buy sustained P1 uncertainty.**
- [ACTION-BUILD-7.md](ACTION-BUILD-7.md) — the owner's finale cast (final-draw for all). **Dual-scoreboard reading (Lesson 188); front stays decided.**
- [ACTION-BUILD-6.md](ACTION-BUILD-6.md) — clearance-graded script budget. **Sub-metric gains only.**
- [ACTION-BUILD-5.md](ACTION-BUILD-5.md) — local-clearance admission (the owner's situational rule). **Admission-side; no sustained contest.**
- [ACTION-BUILD-4.md](ACTION-BUILD-4.md) — the finale script compiler (build + first look). **Authored cast ≠ live undecidedness.**
- [ACTION-BUILD-3.md](ACTION-BUILD-3.md) — the proximity floor (closeness is the author's job). **Closeness = fairness asset (feeds Lesson 186).**
- [ACTION-BUILD-2.md](ACTION-BUILD-2.md) — the open lane (closed-track fix, admission-side). **Fixes lane-jam to ship parity.**
- [ACTION-BUILD-1.md](ACTION-BUILD-1.md) — the merged action system (time-boxed build). **Topology split; band-fairest but closed jams.**
- [ACTION-CONCEPT-CC.md](ACTION-CONCEPT-CC.md) — split-and-script action concept (CC consultation). **The accordion + reachability accountant.**
- [CHAIN-ABLATE-1.md](CHAIN-ABLATE-1.md) — the naked chain, then earn everything back. **Chain is a fair SORTER, not an action generator.**
- [CHAIN-INT-1.md](CHAIN-INT-1.md) — chain choreography in the real machinery. **KILL on the action bar (byte-identical OFF).**
- [CHAIN-SIM-1.md](CHAIN-SIM-1.md) — standalone chain sim experiment. **Standalone PASS (band-reach gate).**
- [DRAMA-1.md](DRAMA-1.md) — owner drama formations + free front rank. **All discarded; envelope-capped; the servo IS the action engine.**
- [FRONT-AUTOPSY-1.md](FRONT-AUTOPSY-1.md) — what exactly kills top-place action. **Enemy = over-steer (servo rank-hold), not drive.**
- [CHAIN-CHOREO-CC.md](CHAIN-CHOREO-CC.md) — chain-choreography concept (CC consultation).

## Greenfield / handicap-pursuit (DEAD — identical racers)
- [PURSUIT-PROTO-2.md](PURSUIT-PROTO-2.md) — lateral realism under the no-co-location gate. **KILLED; overlap-free traffic core is the reusable asset (Lesson 183).**
- [PURSUIT-PROTO-1.md](PURSUIT-PROTO-1.md) — handicap-pursuit standalone sim. **PASSED standalone but the premise is moot (identical racers).**
- [SYSTEM-RESCUE-CC.md](SYSTEM-RESCUE-CC.md) / [SYSTEM-RESCUE-2-CC.md](SYSTEM-RESCUE-2-CC.md) / [SYSTEM-RESCUE-2-COPILOT.md](SYSTEM-RESCUE-2-COPILOT.md) / [RESCUE-3-CC.md](RESCUE-3-CC.md) — blank-page late-race ideation (CC + Copilot).

## Evolution Act 1 & 2 (REVERTED)
- [FINALE-ADAPTIVE-SCREEN.md](FINALE-ADAPTIVE-SCREEN.md) — Act 2 adaptive finale gates, the decisive test. **REVERTED; no single track-agnostic finale-dice law (Lesson 182).**
- [FINALE-SCREEN.md](FINALE-SCREEN.md) — Act 2 finale front-compression screen. **Same dose does opposite by topology.**
- [FINALE-ADAPTIVE-CC.md](FINALE-ADAPTIVE-CC.md) / [FINALE-DESIGN-CC.md](FINALE-DESIGN-CC.md) — Act 2 CC design opinions.
- [AFF-SCREEN.md](AFF-SCREEN.md) — Act 1 assignment-follows-field screen. **REVERTED; live-following target kills the restoring force (Lesson 181).**
- [AFF-NEXT-CC.md](AFF-NEXT-CC.md) / [AFF-DESIGN-CC.md](AFF-DESIGN-CC.md) — Act 1 CC opinions.

_Ordering is newest-arc-first; within an arc, newest report first. When a new report lands, add its line at the top of the matching arc (or a new arc section at the top)._

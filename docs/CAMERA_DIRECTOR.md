# RaceArena — Camera-Director + RaceScreen-Refactor Concept

**Status:** Concept documentation — user clarifications completed 2026-05-02; Phase 4 implemented 2026-05-06
**Phase:** Camera Phase + RaceScreen-Refactor (Hot Pos 1)
**Related:** `docs/BACKLOG.md — Hot §1`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`

---

## Phase 4 — Implementation Status (2026-05-06)

### Implemented (Branch `diagnosis/camera-tuning-effectiveness`)

| Feature | Status | Reference |
|---------|--------|-----------|
| 7 Timing-Tunables in CameraDirector | ✅ | §8.1 (battleGapThreshold, battleGapHysteresis, battleMaxDurationMs, overviewCooldown{Min,Max}, overviewDuration, lerpFactor) |
| BATTLE_ZOOM hysteresis | ✅ | enter at `< battleGapThreshold`, exit at `> threshold + hysteresis` |
| BATTLE_ZOOM Max-Duration Cap | ✅ | `battleMaxDurationMs`: forces state exit after timeout |
| Periodic OVERVIEW Jitter | ✅ | Cooldown drawn randomly from [overviewCooldownMin, overviewCooldownMax] |
| Config-Schema v3 | ✅ | `battleGapThreshold` (was `battleGapPct`), `battleMaxDurationMs` (Ms suffix) |
| Dev Panel `CameraZoomTuningSection` | ✅ | Sliders for all 7 tunables; Min>Max validation warning |
| Diagnostic HUD (Tier-2-Toggle) | ✅ | Toggleable in Dev Panel without code changes (Project-Principle 1) |
| **Plan-B Pan-Fix** | ✅ | `_computePanScale` removed; trivial formula in LEADER/BATTLE/COMEBACK |
| **Pack Battle Trigger** (Phase 1) | ✅ | `battleGapThreshold`/`battleGapHysteresis` replaced by `battlePulkThresholdPx` (default 200 px); `_isPulk()`: ≥3 of top-10 racers within threshold → BATTLE. `battleMinDurationMs` (3000 ms) prevents flickering on short pack dissolution. |
| **Schema v5 — time-based Lead-In/Out** (Phase 1) | ✅ | `leadInDistance`/`followDuration`/`leadOutDistance` (px) replaced by `leadInDuration`/`leadOutDuration` (seconds). Observer phase: lead-in → follow → lead-out per state entry. v4→v5 migration in `cameraConfig.js`. |
| **Diagnostic HUD Tier-2 Extension** (Phase 1) | ✅ | `transitionCount60f`, `entryElapsedMs`, `entryDeltaZoom/X/Y` in CameraDiagnosticsHUD. BATTLE-DIAG + LEADER-DIAG frozen-snapshot panels. |

### Trivial Pan Formula (Plan-B)

All three zoom states (LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM) use:

```js
targetOffsetX = hw - r.x × zoom
targetOffsetY = hh - r.y × zoom
```

**Proof (Closed-Track):** `scaledRacersForCam` delivers canvas-space: `r.x = worldX × bsX`.
Render pipeline: `screenX = cam.offsetX + worldX × zoom × bsX`.
→ `screenX = (hw − worldX×bsX×zoom) + worldX×zoom×bsX = hw ✓`

No bsX multiplication in the formula — `r.x` is already canvas-space (has bsX built in).
`_computePanScale(zoom) = zoom × bsX` was wrong because it applied bsX twice.
Details: Lesson 53 (coordinate system), Lesson 62 (render pipeline asymmetries), Lesson 66 (pixel invariance).

### Open Topics (not in this phase)

**DIAG-OpenTrackPan** (BACKLOG, priority: low)
Open-track pan uses `openTrackCamera.js / openTrackPanTarget()` — independent of `cam.offsetX/Y`.
The trivial formula only affects closed-track pan. Open-track pan needs a separate browser test after merge.

**Pan-Target-Identification** (BACKLOG, priority: medium)
LEADER_ZOOM targets the centroid of the top-N `focusRacers` by t-value. This is not necessarily
the standings leader. With multiple laps and tight packs, the camera may show the wrong racer.
Fix: standings-sorted `focusRacers` list. Separate PR.

**State-Activation-Rates** (not tracked)
battleGapThreshold (default 0.05) and hysteresis (0.02) have not been calibrated against real race data.
A measurement sprint is recommended before the next tunable phase (Lesson 67).

---

---

## Preamble: This System Is Coupled

Camera behavior, track size, sprite size, name-tag readability, and racer count share
a common constraint space:

```
pathLengthPx     →  speedScaleFactor  →  visual traversal rate
worldWidth       →  overviewZoom      →  CameraDirector zoom states
Camera zoom      →  effective sprite px in viewport
Sprite px        →  racer recognizability
Racer spacing    →  tag overlap
N (racer count)  →  lead group  →  tag count  →  HUD overlay size
```

A change to one lever pulls all the others. Section 10 (Synthesis) makes couplings explicit.
N=4 to N=100 are not two modes — it is the same logic on a continuum.

---

## 1. Problem Statement

### 1.1 What Does Not Work — User Observations from Race Tests

| # | Track | Observation | Diagnosis |
|---|-------|-------------|-----------|
| P1 | Garden Path | Sprites stuck in top-left corner, camera looks at track, not at racers | §5 — OVERVIEW pan is a no-op |
| P2 | River Run | Camera zooms too far out when the pack spreads apart | §5 — zoom inversion on large open tracks |
| P3 | River Run lead battle | Only small cluster visible, rest of frame empty | §5 — openTrackPanTarget uses all racers |
| P4 | Space Sprint | Fullscreen button does not trigger real browser fullscreen | §9 — CSS expansion instead of Fullscreen API |
| P5 | Space Sprint | Setup button navigates to setup with no way back to the running race | §9 — no cancel dialog |
| P6 | Open Tracks | Feel too short relative to large background | §7 — speedScaleFactor.maxScale=4.0 too low |
| P7 | All Tracks | Name tags overlap in dense packs | §6 — no anti-overlap |
| P8 | All Tracks | Sprite size vs. camera zoom tradeoff unresolved | §5/§6 — no hard camera constraint |

### 1.2 What PR #26 (B-16) and PR #28 (Camera-Polish + Q-14) Already Solved

**PR #26 — B-16 Adaptive Zoom:**
- `overviewZoom = CANVAS_W / worldW` — zoom states visually consistent at any world width
- Zoom ratios (LEADER=1.4×, BATTLE=1.6×, COMEBACK=1.3×) relative to overviewZoom
- B-17 speedScaleFactor — same traversal rate regardless of pathLengthPx (but maxScale=4.0 too low, §7)

**PR #28 — Camera-Polish + Q-14:**
- OVERVIEW pan to centroid of top-N racers (bug prevents effectiveness — §5.1 Bug A)
- COMEBACK_ZOOM targets 3rd place instead of last place
- MIN_ZOOM=0.15, MAX_ZOOM=2.5 guards

### 1.3 Anti-Patterns to Avoid

- Hardcoded magic numbers for camera tunables — everything goes into the Dev Panel (Project-Principle 1)
- Track-specific code paths — solutions must cover 1280×720 to 8000×6000 and N=4 to N=100
- Soft floors that get broken — sprite min floor is a HARD constraint (§6.2)
- Isolated fixes without the full picture — think camera + sprites + tags + N together

---

## 2. Track Size Range

### 2.1 Measured Values of the Current Default Tracks

| Track | worldW × worldH | closed | pathLengthPx | speedScaleFactor | Est. Race Time\* |
|-------|----------------|--------|-------------|-----------------|-----------------|
| Dirt Oval | 1536 × 1024 | ✓ | 3 245 | 1.62 | ~50 s (2 Laps) |
| Garden Path | 1536 × 1024 | ✓ | 2 506 | 1.25 | ~77 s (4 Laps) |
| City Circuit | 1536 × 1024 | ✓ | 3 093 | 1.55 | ~47 s (2 Laps) |
| River Run | 6000 × 4000 | ✗ | 6 156 | 3.08 | ~45 s |
| Space Sprint | 6000 × 4000 | ✗ | 19 772 | **4.0 (CAPPED)** | ~58 s (→ ~144 s at maxScale=10) |

\* Baseline: speedMultiplier=1.0, baseSpeedMean=0.001045, REFERENCE_FPS=62.5.

### 2.2 Supported Track Range

- **Smallest track canvas:** 1280×720
- **Medium tracks:** 1536×1024 (all 5 default closed tracks)
- **Large open tracks:** 6000×4000
- **Planned maximum:** 8000×6000
- **pathLengthPx range:** ~2500 to ~50 000+

### 2.3 Scale-Invariant vs. Track-Specific Parameters

**Scale-invariant:** zoom ratios, minimum sprite size in screen px, tag scaling formula.

**Track-specific:** speedScaleFactor.maxScale, OPEN_TRACK_BASE_ZOOM, camera state thresholds.

### 2.4 Racer Count Range

The system must support N=4 to N=100 racers. D7d (BACKLOG) addresses performance.
Camera logic must be N-adaptive from the start.

**Lead group formula:**

```
spitzengruppe = clamp(round(N × 0.1), spitzengruppeMin, spitzengruppeMax)
```

Defaults: `spitzengruppeMin=3`, `spitzengruppeMax=10`. Both as Dev Panel tunables.

| N | Lead group (user specification) |
|---|----------------------------------|
| 4–8 | 3 |
| 9–20 | 5 |
| 21–50 | 7 |
| 51–100 | 10 |

*Formula as an approximation; tunable defaults can be adjusted.*

**How N influences other parameters:**

| Parameter | N=4 | N=20 | N=100 |
|-----------|-----|------|-------|
| Lead group | 3 | 5 | 10 |
| Tags visible (default) | 3 | 5 | 10 |
| HUD standings | Top-3 | Top-5 | Top-10 |
| Pack spread expectation | tight | medium | wide |
| BATTLE_ZOOM frequency | high | medium | low (lead group duels only) |

**N=100 scalability:** Camera logic is O(1) per frame (only lead group considered).
`openTrackPanTarget` with focusRacers computes midpoint over max. 10 racers — acceptable.
D7d performance work (spatial grid, LOD) is a prerequisite for avoidance with 100 racers,
but the camera architecture itself scales.

---

## 3. Camera Direction Philosophy

This normative framework guides all camera state decisions. In the existing code
only implicit — here made explicit.

> **Architecture note:** The camera direction is formulated as TENDENCY LOGIC, not as a
> constraint system. Default tendencies (LEADER_ZOOM is the most frequent state) and tension metrics
> (tightest duel in the lead group triggers BATTLE_ZOOM) replace fixed priority hierarchies.
> This is a deliberate architecture decision — the camera reacts to race dynamics, not to
> a rigid order.

### 3.1 Guiding Principles

**LEADER_ZOOM is the default mode, not OVERVIEW.**
The race revolves around the front. LEADER_ZOOM on the lead group is the resting state
between dramatic moments. OVERVIEW is a periodic context provider, not a home state.

**The lead is the camera's default focus.**
LEADER_ZOOM is the default state; the leader is in frame most of the time.
Other states may temporarily shift focus:
- BATTLE_ZOOM on lead group duels (even if the leader is not in the duel)
- COMEBACK_ZOOM for special cases (last-place drama, fast come-back racer)
- OVERVIEW on pack center (periodically)
After a temporary detour the camera returns to LEADER_ZOOM.
There is NO hard constraint that the leader must be visible in every frame.

**Every camera state has a target sprite size.**
Instead of zoom multipliers, each state defines how large sprites should appear on screen
(as % of canvas height). The camera calculates the required zoom backwards
from that — hence "inverse camera logic" (§10.2). OVERVIEW size simultaneously serves as
the scale-invariant sprite floor.

**Sprite min floor is a HARD constraint.**
If a camera zoom would bring the sprite below `spritePctOfCanvas.overview × CANVAS_H`,
the zoom is blocked. The floor overrides camera decisions. (§6.2)

**Distant trailing racers may leave the frame.**
"Like on TV": when the field stretches out, the camera shows the front.
The operator sees on the minimap where all racers are.
Last-place drama (COMEBACK_ZOOM) is a dramatic exception.

**OVERVIEW is a periodic context provider.**
Every [overviewCooldownMin–overviewCooldownMax]s (random jitter, tunable in Dev Panel) there is a short OVERVIEW phase (overviewDuration, tunable) that shows the entire
field. Additionally at the start and at the end of the race. No more often.

### 3.2 Attention Tendencies

```
1. Lead group           — LEADER_ZOOM as default tendency (most frequent state)
2. Lead group duels     — camera zooms in when tight (BATTLE_ZOOM)
3. Pack overview        — short periodic OVERVIEW checks (OVERVIEW)
4. Last-place drama     — occasionally when particularly notable (COMEBACK_ZOOM)
```

These are **tendencies**, not a rigid priority hierarchy. If two states trigger simultaneously,
the one with higher tension strength (§5.3) wins — not by fixed order.
LEADER_ZOOM is the most frequent state, but other states may temporarily shift focus.

### 3.3 Implications for N=4 vs N=100

With N=4: BATTLE_ZOOM almost always relevant.
With N=100: BATTLE_ZOOM only within the top-10 lead group — not for the battle over position 47.
The camera deliberately ignores the rest of the field — this is a feature, not a bug.

---

## 4. Race Phase Analysis

### 4.1 Observable Race Phases

| Phase | Characteristic | Programmatically detectable |
|-------|---------------|------------------------------|
| **PRE_RACE** | Starting grid assembled, countdown running | `racePhase === 'COUNTDOWN'` |
| **Start pack** | Race started, racers still close together | `raceElapsed < 3000ms` |
| **Spreading out** | Field spreading apart | `gapLeadLast 0.05..0.15` |
| **Lead battle** | Tightest gap within lead group | `minGapInSpitzengruppe < 0.05` |
| **Clear leader** | Leader far ahead of 2nd | `gap01 >= 0.15` |
| **Final sprint** | Leader approaching finishT | `leader.t / finishT > 0.85` |
| **Outlier / last-place drama** | Last racer far behind, front clearly decided | `gapLeadLast > 0.3 && firstHalfClear` |
| **Finish** | First racer has crossed finishT | `st.finishedCount >= 1` |
| **RACE_END** | All racers finished or timeout | `st.finishedCount === N` |

### 4.2 Camera State Table (after user clarification UI-1)

| State | Trigger | Tension strength | Default duration | Note |
|-------|---------|-----------------|-----------------|------|
| **LEADER_ZOOM** | Default mode | 1 (strongest tendency) | unlimited | Targets lead group centroid |
| **BATTLE_ZOOM** | minGapInSpitzengruppe < 0.05 (tightest duel in lead group) | 2 | until minGapInSpitzengruppe ≥ 0.07 | Hysteresis: enter 0.05, exit 0.07 |
| **OVERVIEW** | Cooldown expired ([overviewCooldownMin–overviewCooldownMax]s, random jitter) + start + end | 3 | overviewDuration, then LEADER_ZOOM | Shows entire field with pan |
| **COMEBACK_ZOOM** | Last-place drama (gapLeadLast>0.3 + firstHalfClear) | 4 (weakest tendency) | max 8s | Occasionally, not permanently |

OVERVIEW cooldown is drawn randomly from [overviewCooldownMin, overviewCooldownMax] (defaults 15s/25s).
OVERVIEW duration (overviewDuration) are Dev Panel tunables.

### 4.3 OVERVIEW as a Recurring State

OVERVIEW is triggered three ways:
1. **Start** — first ~3s of the race, shows the entire starting pack
2. **Periodic** — cooldown drawn randomly from [overviewCooldownMin, overviewCooldownMax] (defaults 15s/25s), duration overviewDuration, then back to LEADER_ZOOM
3. **Finish** — at `finishedCount >= 1`: 1.5 s LEADER_ZOOM as a drama pulse on the winner (`_finishMomentExpiry = ts + 1500 ms`), then permanently OVERVIEW until race end. No OVERVIEW cooldown, no fallback to other states — priority-1 guard blocks all other paths for the remainder of the race.

### 4.4 MANUAL_FOCUS (deferred)

User request: operator click on a racer locks the camera to that racer.

Effort assessment: canvas click handler, hit test for all racers, new MANUAL_FOCUS state
in CameraDirector, lock UI indicator, unlock mechanism. ~150–200 LOC, new state.

**Decision:** Separate BACKLOG item **MANUAL_FOCUS**, not part of this phase.

### 4.5 Smooth Transitions

`MAX_STATE_DURATION=8000ms` as global timer remains, supplemented by:
- **Hysteresis:** BATTLE_ZOOM stays active as long as `minGapInSpitzengruppe < 0.07` (enter 0.05, exit 0.07)
- **Event trigger:** `finishedCount > 0` immediately forces LEADER_ZOOM on winner
- LERP=0.04 (~1.5s to 90%) already provides smooth transitions on state change

---

## 5. Camera Parameters and Trigger Logic

### 5.1 Structural Bugs in the Current System

**Bug A — OVERVIEW pan is a no-op:**

```js
// CameraDirector.js:178-183 — World-Edge-Clamp
const edgeLoX = canvasW * (1 - this.targetZoom);  // = 1280 * (1-1) = 0 in OVERVIEW
this.targetOffsetX = edgeLoX > 0 ? edgeLoX / 2 : Math.max(edgeLoX, Math.min(0, this.targetOffsetX));
//                                                 → Math.max(0, Math.min(0, any)) = 0 ← always 0!
```

When `targetZoom = 1` (OVERVIEW state), `edgeLoX = 0`, the clamp fixes `targetOffsetX = 0`.
**Visible as P1** (Garden Path — racers top-left, camera does not turn toward them).

**Bug B — Zoom inversion on large open tracks:**

For River Run / Space Sprint (worldW=6000): `overviewZoom = 1280/6000 = 0.213`.
- LEADER_ZOOM: `clamp(0.213 × 1.4, 0.15, 2.5) = 0.298`
- effZoom open track: `1.5 × 0.298 = 0.447` vs OVERVIEW effZoom `1.5 × 1.0 = 1.5`
- **LEADER_ZOOM zooms OUT** — inverted behavior.

**Visible as P2** (River Run zooms out when pack spreads apart).

**Bug C — openTrackPanTarget uses all racers:**

```js
// RaceScreen/index.jsx:838-845
const { targetX, targetY } = openTrackPanTarget(
  st.racers,  // all racers, not lead group
  CW, CH, effZoom, camXMax, camYMax
);
```

Midpoint of all racers is often in the middle of the field, not at the front.
**Visible as P3** (River Run lead battle — shows pack center instead of front).

### 5.2 Correction Directions

**Fix A — Restore OVERVIEW pan:**
In OVERVIEW state set `targetZoom = overviewZoom` instead of 1. Then `edgeLoX = canvasW × (1 - overviewZoom)` > 0
when worldW > canvasW — pan offset has room to move.
OVERVIEW shows the track at adaptive zoom that keeps all racers in frame (sprite min floor as lower bound).

**Fix B — Zoom inversion on open tracks:**
Calibrate CameraDirector for open tracks with `overviewZoom = OPEN_TRACK_BASE_ZOOM` (=1.5) instead of
`CANVAS_W/worldW`. State ratios then: LEADER=2.1×, BATTLE=2.4×, COMEBACK=1.95× — all > OVERVIEW=1.5. ✓

Implementation: CameraDirector receives `isOpenTrack` parameter or explicit `openTrackBaseZoom` value;
`overviewZoom` calculation is bound to it.

**Fix C — Limit openTrackPanTarget to focus group:**
```js
const focusRacers = [...st.racers].sort((a, b) => b.t - a.t).slice(0, spitzengruppe);
const { targetX, targetY } = openTrackPanTarget(focusRacers, CW, CH, effZoom, camXMax, camYMax);
```

### 5.3 Tension Strength Logic in Code

`_transition()` evaluates the race state and selects the most appropriate state:

```js
// findBattleCandidate — tightest duel within lead group
function findBattleCandidate(racersByPosition, spitzengruppe) {
  const top = racersByPosition.slice(0, spitzengruppe);
  let minGap = Infinity, candidatePair = null;
  for (let i = 0; i < top.length - 1; i++) {
    const gap = top[i].t - top[i + 1].t;
    if (gap < minGap) { minGap = gap; candidatePair = [top[i], top[i + 1]]; }
  }
  return { minGap, candidatePair };
}
// minGapInSpitzengruppe = findBattleCandidate(...).minGap
// firstHalfClear       = minGapInSpitzengruppe >= 0.05
```

Evaluation logic in `_transition()` (hard overrides first, then tendencies):

1. `finishedCount > 0` → **Drama pulse (Block W):** On first occurrence (`_finishMomentExpiry === null`) → LEADER_ZOOM for 1.5 s (`_finishMomentExpiry = ts + 1500`). After expiry → OVERVIEW, permanently. The entire priority-1 block is evaluated first on every `_transition()` call as long as `finishedCount > 0` — all other paths are blocked.
2. `raceElapsed < startPhaseSeconds×1000` → forces OVERVIEW *(hard override — start phase)*
3. `minGapInSpitzengruppe < 0.05` → BATTLE_ZOOM on candidatePair centroid
4. `overviewCooldownExpired` → OVERVIEW *(context check, yields if BATTLE_ZOOM is active)*
5. Otherwise → LEADER_ZOOM *(default tendency)*

COMEBACK_ZOOM as an occasional variant: active when `gapLeadLast > 0.3 && firstHalfClear` —
no tight duel at the front, trailing racer far behind. Mixed in randomly, briefly replaces
LEADER_ZOOM. Camera does not need to return immediately — natural detour.

### 5.4 Trigger Extension

In addition to MAX_STATE_DURATION timer:
- **Start pack** (`raceElapsed < 3000ms`): forces OVERVIEW on field centroid
- **Final sprint** (`leader.t/finishT > endgameThreshold`, default 0.85): prioritizes LEADER_ZOOM, suppresses OVERVIEW cooldown. Threshold tunable via Dev Panel (Block X).
- **Finish event** (`finishedCount > 0`): 1.5 s drama-pulse LEADER_ZOOM on winner, then permanently OVERVIEW (Block W). `FINISH_DRAMA_DURATION = 1500 ms` hardcoded.

---

## 6. Sprite Size + Name-Tag Readability (coupled)

### 6.1 The System Is a Single Constraint Graph

```
pathLengthPx → speedScaleFactor → visual traversal rate

worldWidth → overviewZoom → state zooms → frameEffZoom
  → Sprite px = displaySize × displaySizeScale × frameEffZoom
    → name tag size = f(1/frameEffZoom)
      → tag overlap probability

N → spitzengruppe → tags visible count
```

### 6.2 Sprite Sizes per Camera State (Round 3: inverse camera logic)

**Block Y (2026-05-05):** Scale-invariant sprite floor (% of canvas height).
**Block Z Round 3 (2026-05-05):** State-specific target sprite sizes replace zoom multipliers.

**Concept: every camera state has a target sprite size:**

| State | Config key | Default | Meaning |
|-------|-----------|---------|---------|
| OVERVIEW | `spritePctOfCanvas.overview` | 5% | Floor + OVERVIEW sprite size |
| LEADER_ZOOM | `spritePctOfCanvas.leader` | 8% | Sprite size at leader focus |
| BATTLE_ZOOM | `spritePctOfCanvas.battle` | 12% | Sprite size at duel zoom |
| COMEBACK_ZOOM | `spritePctOfCanvas.comeback` | 6.5% | Sprite size at comeback zoom |

**Inverse calculation** (why "backwards" — see §10.2):

```
targetPx = spritePctOfCanvas[state] × CANVAS_H
cam.zoom  = targetPx / (referenceSpriteSize × bsX)    -- Closed-Track
cam.zoom  = targetPx / (referenceSpriteSize × BASE)   -- Open-Track (BASE=1.5)
```

`referenceSpriteSize = displaySize × displaySizeScale` (set at race start).

**Cross-track invariance (L62 resolved):** The same % gives the same
screen-px value on any track — because `cam.zoom × bsX = targetPx / referenceSpriteSize = constant`.
Proof: Garden Path (bsX=1.0) and River Run (OPEN_BASE=1.5) both deliver ~57.6px at 8%.

**Safety nets:**
```
cam.zoom ≥ 1.0              (Closed: never below OVERVIEW level)
cam.zoom ≥ overviewZoom     (Open: never below OVERVIEW level)
cam.zoom ≤ 5.0              (absolute maximum for both track types)
```

**Max cap (absolute for Q-13 protection):**
- `maxTargetScreenPx = 160px` — hard upper limit for sprite screen size
- Camera does not zoom close enough to let sprites snap to a large size abruptly (Q-13)

**Configuration:** `spritePctOfCanvas` is tunable in the Dev Panel under "Camera Behavior".
`maxTargetScreenPx` is tunable under "Sprite Size Cap". Both without code changes (Project-Principle 1).

### 6.3 Name Tags — Iteration 1 (to be implemented in PR-E)

**Goal:** Clear tags for the leaders, no overlapping chaos.

**Tag strategy by phase:**

| Phase | Tag strategy | Rationale |
|-------|-------------|-----------|
| PRE_RACE (Countdown) | **All racers** have tags | Player finds themselves in the starting grid ("which one am I?") |
| RACE_START (0–3s) | Fade-out for non-lead-group | Soft transition, brief moment to orient |
| RACING | Top-N by `tagVisibleCount` | Readability, focus on the front |
| RACE_END | Optional: tags fade back in | Context for resolution + results display |

PRE_RACE → RACE_START transition point: start signal + `tagFadeOutDelay` (tunable, default 3s).
With N=100 in PRE_RACE: 100 tags, dense, acceptable — player actively scans, not passive consumption.
Tag size in PRE_RACE can be slightly smaller than in RACING (separate tunable or fixed factor 0.8×).

**RACING rules:**
- Only top-N tags visible, N = `tagVisibleCount` (Dev Panel slider)
- Default for `tagVisibleCount` = `spitzengruppe` (round(N×0.1), cap 3–10)
- **No "own player"** — Project-Principle 3: all racers equal
- All racers outside top-N: no tag

N scaling (defaults):

| N | Tags visible |
|---|--------------|
| 4–8 | 3 |
| 9–20 | 5 |
| 21–50 | 7 |
| 51–100 | 10 |

### 6.4 Name Tags — Iteration 2 (BACKLOG B-UX1-Iter2, not this phase)

Long-term vision: state-dependent tag strategy:

| Camera state | Tag strategy |
|-------------|--------------|
| OVERVIEW | Lead group tags only or none |
| LEADER_ZOOM | Lead group tags prominent |
| BATTLE_ZOOM | Tags of the involved racers prominent |
| COMEBACK_ZOOM | Tag of focused racer + leader as reference |
| Zoom-out | All conflict-free tags (anti-overlap when space permits) |

Anti-overlap: tags that do not overlap are shown (bbox comparison).
Requires: state tracking in `drawNameTag`, anti-overlap check.

→ BACKLOG: **B-UX1-Iter2** — state-dependent tag strategy. Reference: §6.4 of this document.
  User wants to implement this explicitly once Iteration 1 is running.

### 6.5 N=100 Play-Through (Iteration 1)

With N=100, spitzengruppe=10: 10 tags on canvas.
displaySize likely smaller (LOD from D7d) → tags scale with `inv=1/ezoom`.
At LEADER_ZOOM: 10 tags, dense, but not 100 tags → acceptable.
At OVERVIEW: inv-scaling keeps tags readable at wide zoom.
Risk: 10 tags may still overlap in a tight pack → Iteration 2 resolves that.

### 6.6 The Tradeoff Explicitly

```
"When BATTLE_ZOOM zooms in (raise battleZoomRatio):
  → Sprites proportionally larger
  → Tags larger (inv-scaling)
  → Less overlap
  → But: less track visible, more racers off-screen
  → Anti-pattern at N=20, acceptable at N=4"

"When minTargetScreenPx raised from 32 to 48:
  → Floor more often active → sprites stay larger on large tracks
  → Camera allowed less zoom-out (constraint limit kicks in sooner)
  → More camera states can be blocked by zoom limit
  → Adjust in coordination with camera tunables"
```

---

## 7. Open-Track Length — Q-25 Empirical Investigation

### 7.1 Measurement Results (empirically confirmed)

All measurements: baseSpeedMean=0.001045, REFERENCE_FPS=62.5, speedMultiplier=1.0.

| Track | pathLengthPx | ssf_raw | ssf_applied | Traversal rate | Race duration |
|-------|-------------|---------|-------------|----------------|---------------|
| Dirt Oval | 3 245 | 1.62 | 1.62 | 131 px/s | ~50 s |
| Garden Path | 2 506 | 1.25 | 1.25 | 131 px/s | ~77 s |
| City Circuit | 3 093 | 1.55 | 1.55 | 131 px/s | ~47 s |
| River Run | 6 156 | 3.08 | 3.08 | 131 px/s | ~45 s |
| Space Sprint | 19 772 | **9.89** | **4.00 (CAPPED)** | **323 px/s** | ~58 s (→ ~144 s at maxScale=10) |

**Root cause: `DEFAULT_SPEED_SCALE_CONFIG.maxScale = 4.0`** in `client/src/modules/storage/defaults.js:112`.
Canvas coordinate system hypothesis **empirically disproved** — Space Sprint world coordinates 256..5707, not canvas-bound.

### 7.2 Solution (user decisions UI-2+UI-3)

**Step 1 — Raise maxScale:**
```js
// defaults.js:112
DEFAULT_SPEED_SCALE_CONFIG.maxScale = 10.0
```
Space Sprint then traverses at ~131 px/s. Race duration ~144s at speedMultiplier=1.0.

**Step 2 — Open-track setup screen: duration slider:**
- Operator selects total race duration for open tracks
- **Minimum time:** ~30s (physical minimum)
- **Maximum time:** derived from `pathLengthPx / (baseSpeedMean × referencePathLength × minScale)` — what the track physically allows
- **Recommended default:** ~65% of max time (CC suggestion: comfortable length without rushing)
- User sees only achievable times — slider range comes from track physics
- Estimated duration display (analogous to closed-track lap time display)

**Step 3 — Compute finishT for open tracks dynamically:**
```js
// RaceScreen/index.jsx — after fix:
const finishT = isOpenTrack
  ? Math.min(
      openTrackFinishT(duration, speedMultiplier, baseSpeedConfig.max),
      1.0 - behaviorConfig.runoutZone
    )
  : lapsFromDuration(duration);
```

`openTrackFinishT` already exists in `lapUtils.js` — previously unused in RaceScreen.
`runoutZone` (default 0.05) remains as a **safety buffer** at the end of the track (CC recommendation).
`Math.min` clamp: finishT never exceeds `1.0 - runoutZone` even with a very long duration.

**Why keep runoutZone:** Protects against the racer-at-end-of-path bug when finishT is too close to 1.0.
Can remain tunable or be frozen at default=0.05.

### 7.3 What This Clarifies (PR-A1)

- Q-25 root cause: identified and fixable with a 1-line change in defaults.js
- Space Sprint ~144s is the correct reference duration at maxScale=10
- Duration slider makes open-track setup intuitive for the operator
- finishT bug (duration setting had no effect on open tracks) is fixed

### 7.4 Speed Pipeline Architecture (PR-A2)

**Current stack:**
```
baseSpeed (global default) × speedMultiplier (per type) × speedScaleFactor (per track)
  → effective px/s of the racer
```

`speedScaleFactor` compensates for different pathLengthPx values (B-17). At maxScale=10 this works
for all current tracks (pathLengthPx ≤ 20 000). But the operator's mental model is not yet consistent:
the operator thinks in seconds, the code thinks in px/s + factors. Very short tracks (~800px) would
finish in 6s — the lower bound is not controllable without code changes.

**Target stack (PR-A2 — user option C):**
```
chosen_race_duration (operator input)
  → race_baseSpeed = f(pathLengthPx, race_duration, speedMultiplier_distribution)
    → effective px/s = race_baseSpeed × speedMultiplier (per type)
```

Core principle: **The operator selects the race duration; everything else follows from that.**
- `race_baseSpeed` is calculated at race init so that the median racer finishes after `race_duration` seconds
- `speedMultiplier` ratios between racer types remain unchanged (Rocket is always 1.25× faster than base)
- `speedScaleFactor` becomes redundant or is reduced to a simple correction factor for track geometry anomalies
- Closed tracks: operator chooses lap count + optional desired duration; race_baseSpeed set
  so that N laps approximately match the desired duration
- Open tracks: operator chooses total duration; race_baseSpeed derived directly from that

**What changes for the operator:**
- "Race duration" slider becomes the central control — human-friendly
- No more need to think in px/s
- Different racer types produce natural spread around the target duration

**Recommended pipeline architecture:**
- `speedScaleFactor` is eliminated as a standalone value. The calculation is integrated into `race_baseSpeed`.
- `speedMultiplier` override per race is not needed — `race_baseSpeed` controls the track sufficiently.
- Detailed scope analysis in PR-A2 diagnosis (see §13.1 R7).

**Scope risk:** Existing tests from D9/D10/D11/D7a/D7b are based on the current speed pipeline.
PR-A2 must update tests without breaking race behavior. Mitigation: speed formula change in
an isolated function (`computeRaceBaseSpeed`) — the rest of the system references this function.

---

## 8. Dev Panel Integration

### 8.1 Complete Tunable List

**New "Camera" section in Dev Screen:**

| Parameter | Type | Default | Tooltip |
|-----------|------|---------|---------|
| `overviewCooldownMin` | slider 5–60 s | 15 | "Shortest pause between OVERVIEW checks. Next cooldown is drawn randomly from [Min, Max]. Both equal = fixed rhythm. Value: [x]s." |
| `overviewCooldownMax` | slider 5–60 s | 25 | "Longest pause between OVERVIEW checks. Random jitter feels more human than a fixed beat (TV-direction analogy). Max ≥ Min. Value: [x]s." |
| `overviewDuration` | slider 2–10 s | 4 | "Duration of OVERVIEW mode. Then back to LEADER. Value: [x]s." |
| `spitzengruppeMin` | slider 1–5 | 3 | "Minimum size of the camera focus group. round(N×0.1) is capped up to this value. Value: [x]." |
| `spitzengruppeMax` | slider 5–20 | 10 | "Maximum size of the camera focus group. Value: [x]." |
| `spritePctOfCanvas.overview` | slider 2–10% | 5% | "Target sprite size in OVERVIEW (also floor). Value: [x]%." |
| `spritePctOfCanvas.leader` | slider 6–16% | 8% | "Target sprite size in LEADER_ZOOM. Value: [x]%." |
| `spritePctOfCanvas.battle` | slider 8–20% | 12% | "Target sprite size in BATTLE_ZOOM. Value: [x]%." |
| `spritePctOfCanvas.comeback` | slider 4–12% | 6.5% | "Target sprite size in COMEBACK_ZOOM. Value: [x]%." |
| `maxStateDuration` | slider 2000–12000 ms | 4000 | "Max dwell time in a camera state. Value: [x]ms." |
| `lerpFactor` | slider 0.01–0.15 | 0.04 | "Camera transition speed. Smaller = slower/smoother. Value: [x]." |
| `startPhaseSeconds` | slider 1–10 s | 3 | "Duration of the forced start-OVERVIEW phase. Value: [x]s." |

**New "Name Tags" section in Dev Screen:**

| Parameter | Type | Default | Tooltip |
|-----------|------|---------|---------|
| `tagVisibleCount` | slider 0–20 | = spitzengruppe | "Number of tags visible during the race (top-N by position). 0 = none. Default = camera lead group. Value: [x]." |
| `tagScaleWithZoom` | toggle | true | "Tags scale with camera zoom (constant screen size). Off = tags scale with world." |

**New "HUD Overlay" section in Dev Screen:**

| Parameter | Type | Default | Tooltip |
|-----------|------|---------|---------|
| `hudOverlayOpacity` | slider 0–1 step 0.05 | 0.75 | "Transparency of HUD elements in fullscreen mode. 1.0 = fully opaque. Value: [x]." |
| `hudStandingsPosition` | select left/right | right | "Position of the live standings overlay in fullscreen." |
| `hudMaxStandings` | slider 5–30 | 15 | "Upper limit for standings entries. Actual display = min(value, fits in viewport). Value: [x]." |

**HUD layout constraint:** `hudMaxStandings` is an upper limit, not a static value.
At runtime the actual display count is calculated from the available viewport height:
`actualShowCount = min(hudMaxStandings, floor((viewportH - reservedButtonsH - padding) / rowH))`.
Buttons (Cancel Race, Fullscreen) are always fully visible — never obscured by standings.
"More..." indicator when hudMaxStandings > fitsInViewport (no scrolling). reservedButtonsH ≈ 120px.

**Existing "Speed Scale" section — change default:**

| Parameter | Old default | New default |
|-----------|-------------|-------------|
| `maxScale` | 4.0 | **10.0** |

**New "Sprite Size Corridor" section in Dev Screen** (slider, both live-apply):

| Parameter | Type | Default | Tooltip |
|-----------|------|---------|---------|
| `maxTargetScreenPx` | slider 32–256 px | 160 | "Largest permitted sprite size in screen px. Camera does not zoom closer than this value allows. Value: [x]px." |

Per-type override: `getEffectiveMaxTargetScreenPx()` analogous to existing `getEffectiveMinTargetScreenPx()`
from D3.5.5. Implement both overrides in PR-E — do not defer to a later PR.

### 8.2 Live Apply

All new camera parameters take effect immediately on the next frame.
CameraDirector instance is not recreated — parameters updated directly on the object.
`overviewCooldownMin`, `overviewCooldownMax`, and `overviewDuration` are read live in `_transition()`. On each OVERVIEW a new cooldown value is drawn randomly from [Min, Max].

### 8.3 Per-Track Overrides (future)

Global defaults first. Per-track overrides (openTrackBaseZoom, maxScale per track) in a
later "Camera" tab in the track editor. Belongs to a later phase.

### 8.4 Tooltip Convention

Format: "Short description. Value: [current]. Effect: [what changes]."
Existing tooltips in the Dev Panel as reference.

---

## 9. UI Bugs

### 9.1 Cancel-Race Button (P5 / UI-4)

**Current (RaceScreen/index.jsx:1036–1044):**
Button label "← Setup", deletes `activeRace` immediately without a confirm dialog.

**Fix:**
- Button label during an active race: **"Cancel Race"**
- Confirm dialog: `"Are you sure? Current race will be lost."`
- On confirmation: stop rAF loop, `sessionStorage.removeItem('activeRace')`, `fadeNavigate('/setup')`
- Button label remains "← Setup" in the FINISHED state (no confirm needed — race is over)

**Pause+Resume:** Explicitly NOT part of this phase. → BACKLOG item: **"Pause+Resume Race"**

### 9.2 Fullscreen HUD (P4 / UI-5)

**Fix — real browser fullscreen on canvas:**
```js
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    canvasRef.current?.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}
```

**HUD elements as semi-transparent overlays** (`position: fixed` over canvas in fullscreen):

| Element | Position (CC suggestion) | Behavior |
|---------|--------------------------|----------|
| Live standings | right | shows top-`hudMaxStandings` racers |
| Buttons (Cancel, Fullscreen) | top right | always visible |
| Status (race duration, phase) | top left | race context |

Transparency: `hudOverlayOpacity` (Dev Panel, default 0.75).
Position: `hudStandingsPosition` (Dev Panel, default right).

Technically: when `canvasRef.current` is fullscreen, overlay divs need `position: fixed`
and a high z-index to remain visible above the canvas. CSS `::backdrop` for background dimming.

**HUD layout constraint:** Buttons (Cancel Race, Fullscreen) are ALWAYS fully visible —
never coverable by standings. Standings count is calculated at runtime from viewport height
(`hudMaxStandings` is an upper limit, not a static value). No scrolling — "More..." indicator
when the list is cut off. Implementation in PR-F with the HUD overlay.

With N=100: standings display = min(hudMaxStandings=15, fitsInViewport) — max. 15 racers visible.

### 9.3 Minimap

**Recommendation:** Keep the minimap. At LEADER_ZOOM the operator sees the entire field
on the minimap — essential at N=20+ when the camera actively ignores the rest (§3.1).

**Improvement:** Show all N racers as dots (not just the leader).
Leader dot remains larger/brighter. With N=100: dots very small, but scalable.

---

## 10. Synthesis — How Everything Fits Together

### 10.1 Primary Couplings

**Coupling 1: worldWidth → overviewZoom → state zooms**
worldW=6000 → overviewZoom=0.213 → LEADER_ZOOM=0.298 → effZoom=0.447 < OVERVIEW=1.5 → BUG B.
Correction: open-track camera calibration with OPEN_TRACK_BASE_ZOOM as overviewZoom.

**Coupling 2: pathLengthPx → speedScaleFactor → traversal rate**
maxScale cap prevents the correct B-17 formula for long paths. maxScale=10 fixes for all
current tracks (pathLengthPx_max = 19772 < 10 × 2000 = 20000).

**Coupling 3: camera zoom → sprite px → camera constraint**
`screenPx = displaySize × displaySizeScale × frameEffZoom`.
Floor active when screenPx < minTargetScreenPx. Floor now acts as a CAMERA LIMIT.
Camera may not zoom out further than this floor allows.

**Coupling 4: sprite px → tag overlap**
Larger sprites → farther apart → less overlap. N-adaptive tag limit resolves the rest.

**Coupling 6: sprite corridor [min, max] → effective camera zoom range**
`allowed_min_zoom = minTargetScreenPx / (displaySize × displaySizeScale)`
`allowed_max_zoom = maxTargetScreenPx / (displaySize × displaySizeScale)`
If corridor is narrow (max - min small): camera zoom range is frozen — all states look the same.
If corridor is wide (max very large): Q-13 risk (sprite animation jerky with large sprites).
Optimum: max ≈ 4× min gives ~2 f-stops of headroom without reaching the Q-13 zone.

**Coupling 5: N → lead group → tag count + HUD overlay size**
As N grows, spitzengruppe grows. `tagVisibleCount` and `hudMaxStandings` default to spitzengruppe,
but can be set independently. One tunable (`spitzengruppeMax`) controls all three indirectly.

### 10.2 Inverse Camera Logic — Why It Is Calculated Backwards

**The problem with forward-calculated multipliers:**
Classic camera systems define zoom directly: `battleZoom = overviewZoom × 2.5`. This leads to
track dependency: the same multiplier gives a sprite 180px wide at worldW=1280,
but only 38px at worldW=6000 — even though the operator wanted to "zoom in closer". Each track needs its own
multipliers, and the Dev Panel becomes a calibration nightmare.

**The solution: calculate backwards from the desired result:**
```
cam.zoom = targetSizePx / (referenceSpriteSize × bsX)   // Closed Track
cam.zoom = targetSizePx / (referenceSpriteSize × OPEN_TRACK_BASE_ZOOM)  // Open Track
```
The operator defines "leader sprite should occupy 8% of canvas height" — the camera derives the
required zoom from this target size. `bsX = CANVAS_W / worldW` is the base scaling factor
of the Pixi container. Since `bsX` appears in the formula, it cancels out the worldW influence.

**Cross-track invariance proof:**
```
screenPx = referenceSpriteSize × bsX × cam.zoom
         = referenceSpriteSize × bsX × (targetPx / (referenceSpriteSize × bsX))
         = targetPx   ← constant, independent of worldW
```
The same `spritePctOfCanvas` config yields the same sprite screen fraction on every track.

**Why never reverse this:**
- `referenceSpriteSize` must be the world-pixel size AFTER density scaling (`displaySize × displaySizeScale`)
- The formula is only correct if `bsX` reflects the actual Pixi container scale
- If `bsX` is already influenced by the camera zoom (circular dependency), the invariance breaks
- Safety nets (min = 1.0 / overviewZoom, max = 5.0) are emergency brakes for edge cases, not a design target
- The fallback path (`referenceSpriteSize=0`) uses `FALLBACK_REFERENCE_SPRITE_SIZE = 36px` internally with console warning — no fallback to multipliers

**Edge case: safety-net clamp with large sprites on narrow open tracks:**
When `effectiveOverviewPx = referenceSpriteSize × OPEN_BASE × overviewZoom` is larger than the
configured state target (e.g. LEADER target = 57.6px, but OVERVIEW renders 75px because the
track is very narrow and overviewZoom = 1.0), the safety net (`rawZoom < overviewZoom → clamp`)
kicks in and the state appears visually identical to OVERVIEW. This is not a bug — the system protects against
showing a wider view when transitioning to a "more dramatic" state than OVERVIEW.
Solution: raise `spritePctOfCanvas` values or reduce `displaySize` of the racer type.
No hidden correction code (drama-floor approach was evaluated and rejected: it caused
ordering inversions on partial activation and overrode user config on normal tracks).

**Coupling to §10.1 Coupling 6:**
The absolute pixel limit `maxTargetScreenPx` remains as a hard cap. If the inverse zoom calculates
too large a display, `Math.min(MAX_INVERSE_ZOOM, rawZoom)` kicks in followed by
the Pixi-side `maxTargetScreenPx` check. Both systems are complementary, not redundant.

### 10.3 New Couplings from User Clarifications

**OVERVIEW cooldown: random jitter instead of fixed beat:**
After each OVERVIEW the next cooldown is drawn randomly from [overviewCooldownMin, overviewCooldownMax].
Default 15–25s. Rationale: on TV you don't cut robotically every 20 minutes either —
slight random variation feels more human. Both sliders at the same value = fixed beat.
With a 30s race: 1–2 OVERVIEW slots. With a 144s race: 5–9 slots (natural spread, no clacking).

**finishT + duration slider coupling for open tracks:**
Duration slider directly affects finishT. Speed multiplier of racers also affects
the effective duration. Setup screen should have an estimated duration display.

**Minimap + camera direction:**
The minimap gives the operator the context that the camera deliberately ignores (§3.1).
This complementarity makes the direction philosophy "distant trailing racers may fall out" viable.

**Race duration slider as the central operator control (after PR-A2):**
After the speed pipeline architecture change (§7.4) the operator thinks only in seconds.
`race_baseSpeed` is calculated internally — px/s is an implementation detail, not a UX concept.
Consequence: setup screen simplifies: closed track = laps + optional desired duration,
open track = duration. Both look consistent to the operator.

### 10.4 N=100: What Collapses If Not Prepared

| Component | N=100 risk | Status |
|-----------|------------|--------|
| Camera state machine | O(1) — lead group only | Scales out-of-the-box |
| openTrackPanTarget (after Fix C) | O(N log N) sort, then top-10 | ~0.1ms, acceptable |
| drawNameTag (after Iter 1) | 10 tags drawn | OK |
| Minimap dots | 100 dots very small | Acceptable |
| Avoidance forces | O(N²) → 10000 checks | **D7d prerequisite** |
| Canvas render | 100 sprites per frame | Profiling needed (D7d) |

Camera logic scales. Performance bottleneck is avoidance (D7d, BACKLOG).

### 10.4 Recommended Tuning Sequence

1. **Raise maxScale** (Q-25) — fixes hectic open tracks, independent of camera
2. **Fix Bug B** (zoom inversion) — then state zooms are testable for the first time
3. **Fix Bug A** (OVERVIEW pan) — camera finally follows racers
4. **Fix Bug C** (focus group pan) — lead battle camera correct
5. **minTargetScreenPx as camera constraint** — only once camera zooms are correct
6. **Tag visibility Iter 1** — build on correct camera
7. **Dev Panel integration** — everything tunable
8. **HUD + fullscreen + cancel race** — UI improvements

---

## 11. RaceScreen Refactor (Q-7) and Test Infrastructure (Q-18)

### 11.1 Current Camera Logic Distribution

```
RaceScreen/index.jsx (1032 LOC, 0 unit tests)
  ├─ Camera init (lines 210–219): CameraDirector construction + bbox scaling
  ├─ Camera update (lines 819–848): openTrack vs. closedTrack — Bug C here
  ├─ drawRacers (lines 387–407)
  └─ drawNameTag (lines 366–385)

modules/camera/ (extracted, testable)
  ├─ CameraDirector.js — Bugs A+B
  ├─ openTrackCamera.js — openTrackPanTarget (Bug C call site)
  ├─ Minimap.js
  └─ lapUtils.js — openTrackFinishT (previously unused in RaceScreen)
```

### 11.2 Extraction Plan

- `computeRaceCameraTransform(st, camDirRef, bsX, bsY, worldWidth, worldHeight, isOpenTrack)`
  → `modules/camera/raceCamera.js`
- `drawNameTag` → `modules/camera/nameTagRenderer.js` (testable without full canvas context setup)
- Camera initialization logic (bbox scaling) → helper function in `raceCamera.js`

Bug C (3 lines in RaceScreen) is fixed in PR-B before PR-C (refactor) begins.
PR-C is then 100% behavior-preserving.

### 11.3 Test Strategy

**Mock-rAF pattern:**
```js
let rafCallback = null;
vi.stubGlobal('requestAnimationFrame', (cb) => { rafCallback = cb; return 1; });
rafCallback(timestamp); // simulate frame
```

**Testable without browser:**
- `computeRaceCameraTransform` with mock racer positions → pan/zoom output correct?
- `drawNameTag` with mock CanvasRenderingContext2D → text/rect calls correct?
- Camera state transitions under simulated race phases

**New tunables (§8) require:** config persistence tests, live-apply tests.

---

## 12. Implementation Breakdown

### 12.1 Sequencing Decision

Bug fixes (PR-B) come BEFORE the refactor (PR-C).

Rationale: Bugs A+B are in `modules/camera/` — independent of RaceScreen, fixable immediately.
Bug C is a 3-line change in RaceScreen — no reason to wait for the refactor.
PR-C (refactor) afterwards is 100% behavior-preserving from the start. No "refactoring a buggy state".

### 12.2 Sub-PR Plan (9 PRs: PR-A split into A1 + A2-Diagnosis + A2)

```
PR-A1: Q-25 fix + duration slider + finishT (existing pipeline)
  - DEFAULT_SPEED_SCALE_CONFIG.maxScale: 4.0 → 10.0 (defaults.js:112)
  - finishT: openTrackFinishT(duration, ...) clamped by runoutZone (lapUtils.js)
  - Duration slider in setup screen for open tracks (min/max from track physics)
  - Estimated duration display in setup screen
  - +Tests: speedScale new maxScale boundary, openTrackFinishT integration
  - Makes Space Sprint immediately playable (~131 px/s, ~144s)

PR-A2-Diagnosis: Speed pipeline read-PR (no code change)
  - Analogous to TLH concept sprint pattern: diagnosis before implementation
  - CC reads all relevant speed pipeline files completely
  - Output: docs/SPEED_REFACTOR_ANALYSIS.md
    - Which files are affected (target: < 30)
    - Which tests are touched
    - Which pattern breaks arise
    - Estimated scope
  - PR body: "Diagnosis before PR-A2 implementation, no code change"
  - User + strategy review of the diagnosis before PR-A2 starts
  - If scope is large (> 30 files / test architecture overhaul): additional concept sprint

PR-A2: Speed pipeline architecture refactor (§7.4, starts only after diagnosis review)
  - computeRaceBaseSpeed(pathLengthPx, race_duration, speedMultiplier_distribution) new function
  - race_baseSpeed calculated race-specifically at race init
  - speedScaleFactor eliminated as a standalone value (integrated into computeRaceBaseSpeed)
  - Closed tracks: optional desired duration in addition to lap count
  - +Tests: update all existing speed tests (do not break D9/D10/D11 basis)

PR-B: Camera bug fixes (Bug A + Bug B + Bug C)
  - Bug A: targetZoom = overviewZoom instead of 1 in OVERVIEW state (CameraDirector.js:178-183)
  - Bug B: open-track zoom calibration — isOpenTrack mode in CameraDirector
  - Bug C: openTrackPanTarget limited to lead group (RaceScreen/index.jsx:838-845, 3 lines)
  - +Tests: CameraDirector bug scenarios (pan offset non-zero, open-track zoom direction)

PR-C: RaceScreen split (pure refactor, no behavior change)
  - computeRaceCameraTransform → modules/camera/raceCamera.js
  - drawNameTag → modules/camera/nameTagRenderer.js
  - Camera init → helper function
  - +Tests: new pure functions
  - Prerequisite: PR-B merged

PR-D: Camera state machine (new logic)
  - LEADER_ZOOM as default mode (default tendency, §3.2)
  - OVERVIEW cooldown logic (random jitter from [overviewCooldownMin, overviewCooldownMax], duration overviewDuration, soft trigger via tension strength)
  - Start pack + final sprint + finish event trigger
  - findBattleCandidate() for tightest duel in lead group (§5.3)
  - Hysteresis thresholds (BATTLE: enter 0.05, exit 0.07 on minGapInSpitzengruppe)
  - COMEBACK_ZOOM: last-place drama trigger (gapLeadLast>0.3 && firstHalfClear)
  - +Tests: state transitions under simulated race phases

PR-E: Sprite corridor + tag visibility Iter 1 (B-UX1)
  - Sprite corridor: minTargetScreenPx AND maxTargetScreenPx as camera zoom limits (§6.2)
  - getEffectiveMaxTargetScreenPx() analogous to getEffectiveMinTargetScreenPx() (per-type override)
  - Both as Dev Panel sliders — do not defer to a later PR
  - Q-13 structurally resolved by maxTargetScreenPx
  - Tag visibility: top-N by tagVisibleCount (default = spitzengruppe)
  - tagVisibleCount as Dev Panel tunable
  - +Tests: computeRenderDisplayScale with corridor limits, drawNameTag with visibility flag

PR-F: Dev Panel camera tunables + HUD overlay
  - New "Camera" section (§8.1 complete list)
  - New "Name Tags" section (§8.1)
  - New "HUD Overlay" section (§8.1)
  - Fullscreen HUD overlays (CSS + opacity tunable)
  - Live apply on CameraDirector instance
  - +Tests: config persistence, live apply

PR-G: UI bugs
  - Cancel Race: button label + confirm dialog (§9.1)
  - Fullscreen API: canvasRef instead of screenRef (§9.2)
  - +Tests: toggleFullscreen mock, cancel dialog logic
```

**MANUAL_FOCUS:** Not in this phase — separate BACKLOG item.

### 12.3 Alternative Orderings

**Alternative — Q-25 and bugs together (PR-A+B combined):**
Advantage: one PR establishes correct foundation. Disadvantage: larger PR, harder to revert.

---

## 13. Risks and Open Questions

### 13.1 Architecture Risks

**R1 — Open-track camera refactor scope creep:**
Bug B fix requires a separate calibration path for open-track camera.
Mitigation: CameraDirector receives `isOpenTrack` flag + `openTrackBaseZoom` parameter —
no separate OpenTrackCameraDirector needed, parameter configuration instead of subclass.

**R2 — RaceScreen rAF loop testability:**
Extract only functions without rAF loop state (`drawNameTag`, `computeRaceCameraTransform`).
Both have no state closures referencing the rAF loop — safely extractable.

**R3 — OVERVIEW cooldown + BATTLE_ZOOM conflict:**
If BATTLE_ZOOM is active and the OVERVIEW cooldown expires: BATTLE_ZOOM has higher tension strength
(tight duel in lead group > periodic context check). OVERVIEW is deferred —
cooldown timer waits until BATTLE_ZOOM ends. After BATTLE_ZOOM ends a new cooldown
is drawn randomly from [overviewCooldownMin, overviewCooldownMax]. Correct per tendency logic (§3.2).

**R4 — finishT + duration slider coupling:**
`openTrackFinishT` calculates finishT at race init. If the operator changes speedMultiplier
during the race (Dev Panel), finishT does not change retroactively. This is correct and acceptable.

**R5 — N=100 + camera performance:**
OVERVIEW pan with centroid of all N racers: O(N) per frame. At N=100: ~0.01ms — acceptable.
Avoidance forces (O(N²)) are the actual performance problem — D7d is responsible.

**R6 — Sprite corridor poorly calibrated:**
If `maxTargetScreenPx` is too small: all camera states zoom similarly close → no visual difference
between BATTLE_ZOOM and OVERVIEW. If `maxTargetScreenPx` is too large: Q-13 zone reachable.
Default 128px (4× min=32) is the starting point — must be calibrated with browser tests after PR-E
before being set as a stable default. For small racer types (small displaySize), max
must be adjusted accordingly.

**R7 — Speed pipeline refactor (PR-A2) scope uncertainty:**
Speed pipeline (baseSpeed, speedMultiplier, speedScaleFactor) is referenced in many places.
D9/D10/D11/D7a/D7b/D7c build on the current pipeline. PR-A2 must update all tests.
**Mitigation: PR-A2 diagnosis PR** (read-PR before implementation) — CC analyzes scope completely,
writes `docs/SPEED_REFACTOR_ANALYSIS.md`, user reviews before PR-A2 starts. Scope risk thereby
structurally addressed. Further mitigation: `computeRaceBaseSpeed` as an isolated function.

**R8 — PRE_RACE phase tag density at N=100:**
100 tags simultaneously in PRE_RACE. On a small canvas tags could overlap completely.
Mitigation: tag size in PRE_RACE 0.8× the RACING size. If still too dense:
also limit tags in PRE_RACE (only name tags of the first 20 racers), but this
undermines the "player finds themselves" use case. Evaluate in browser test first.

### 13.2 Answered Concept Questions (all answered 2026-05-02/03)

| # | Question | Decision |
|---|----------|----------|
| UI-1 | OVERVIEW camera behavior | LEADER_ZOOM as default; OVERVIEW cooldown [15s, 25s] random jitter |
| UI-2+UI-3 | Race duration + finishT for open tracks | Duration slider + maxScale=10 + finishT dynamic from openTrackFinishT |
| UI-4 | Setup button during race | "Cancel Race" + confirm dialog; Pause+Resume as separate BACKLOG item |
| UI-5 | Fullscreen HUD | Real browser fullscreen via API; HUD as semi-transparent overlays; hudMaxStandings viewport-aware |
| UI-6 | Name tags | Iter 1 (Top-N, PR-E) + Iter 2 state-dependent as B-UX1-Iter2 in BACKLOG |
| UI-7 | OVERVIEW cooldown rhythm | Random jitter [overviewCooldownMin=15s, overviewCooldownMax=25s] — TV-direction analogy |
| UI-8 | PR-A2 speed refactor scope risk | Diagnosis read-PR (PR-A2-Diagnosis) before implementation — analogous to TLH pattern |

### 13.3 Assumptions

- **A1:** speedMultiplier of racer types ~1.0. Measure before PR-A (affects race duration estimate).
- **A2:** maxScale=10.0 → ~131 px/s for Space Sprint. Verify in browser test after PR-A.
- **A3:** Garden Path corner problem (P1) is Bug A. Not 100% certain without a browser run.
- ~~**A4:**~~ Canvas coordinate system limits geometry length — **empirically disproved** (§7.1).

---

## Cross-References

- `client/src/modules/camera/CameraDirector.js` — state machine (Bugs A+B in §5)
- `client/src/modules/camera/openTrackCamera.js` — openTrackPanTarget (Bug C in §5)
- `client/src/screens/RaceScreen/index.jsx` — camera integration (lines 210–219, 819–848)
- `client/src/modules/autoSpriteScale.js` — computeRenderDisplayScale (§6.2)
- `client/src/modules/speedScale.js` — computeSpeedScaleFactor
- `client/src/modules/storage/defaults.js:112` — DEFAULT_SPEED_SCALE_CONFIG.maxScale = 4.0 ← Q-25 root cause
- `client/src/modules/camera/lapUtils.js` — openTrackFinishT (§7.2, previously unused in RaceScreen)
- `docs/BACKLOG.md — Hot §1` — camera phase as next implementation phase
- `docs/BACKLOG.md — B-UX1` — name tag Iter 1 integrated here (§6.3)
- `docs/BACKLOG.md — B-UX1-Iter2` — state-dependent tags (§6.4)
- `docs/BACKLOG.md — Q-25` — open-track length (empirically resolved here)
- `docs/BACKLOG.md — Q-7` — RaceScreen split (§11)
- `docs/BACKLOG.md — Q-18` — test-RaceScreen (§11.3)
- `docs/BACKLOG.md — D7d` — 100-racer performance (spatial grid, camera pack overview, LOD)

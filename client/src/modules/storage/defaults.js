// ============================================================
// File:        defaults.js
// Path:        client/src/modules/storage/defaults.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Default data for all storage keys — seeded on first launch
// ============================================================

import { DEFAULT_AUTO_SCALE_CONFIG } from '../autoSpriteScale.js';

export const DEFAULT_RACE_DEFAULTS = {
  duration: 60,
  winners: 3,
  maxPlayers: 20,
  maxPlayersClosed: 40,
  maxPlayersOpen: 100,
  countdownDuration: 3,
  autoAdvance: false,
  autoAdvanceDelay: 5,
  soundEffects: true,
  language: 'en',
};

export const DEFAULT_BRANDING = [];
export const DEFAULT_ACTIVE_SESSION = { activeBrandingProfileId: null };
export const DEFAULT_RACE_HISTORY = [];

// Mean stays at 0.001045 while total min→max spread is reduced to ~17.7%
// to reduce persistent pack clustering at high racer density.
//
// min/max are the SPREAD only — they set how far individual racers deviate from the
// mean, not how fast the field is. The absolute pace is normalSpeedPxPerSec below.
//
// normalSpeedPxPerSec — THE one normal track speed, in world pixels per second, for
// every track and every racer class (see modules/durationModel.js). This is the SINGLE
// SOURCE for the game's absolute pace; changing it here (or in Dev Screen → Dynamics →
// Speed → Normal Track Speed) rescales every derived duration in the game at once and
// nothing else. The physics-neutral anchor is baseSpeedMean * REFERENCE_CLOSED_PATH_PX *
// REFERENCE_FPS / ems(40) = 226.53 px/s (a slider-friendly 225 reproduced the pre-ship
// browser pace to within 1%). The OWNER'S SHIPPED PICK is 150 px/s — a calmer, more
// readable pace chosen by eye after the speed-candidate sweep (v150 VIABLE; the faster
// v225/v270 arms raised runaway; see reports/parity/REBASELINE.md). The full baseline is
// re-measured at 150 (racer-row weighted, canonical defaults) in that report.
export const DEFAULT_BASE_SPEED_CONFIG = {
  min: 0.00096,
  max: 0.00113,
  normalSpeedPxPerSec: 150,
};

export const DEFAULT_ROW_LAYOUT_CONFIG = {
  rowGapMultiplier: 1.5,
  speedBonusFactor: 1.0,
  maxCapacityFactor: 0.3,
};

export const DEFAULT_CAMERA_CONFIG = {
  // NO schemaVersion here, and none is coming back — see cameraConfig.js. Loading is defaults
  // underneath, stored values on top, unknown or retired keys ignored, so a new key below always
  // reaches the live config and the owner's settings are never wiped by a change.
  //
  // CAMERA-REFERENCE-WIDTH-1: the width, in world px, that ONE standard corridor means.
  // Every state's `visibleCorridors` is measured in these, so this one number rescales every shot on
  // every track at once. 300 is the widest corridor authored so far, which is why the ten shipped
  // tracks are all framed against the same yardstick today. A track WIDER than this keeps its own
  // width instead (max(reference, actual)), so its corridor is never asked to be cropped.
  referenceCorridorPx: 300,
  // Per-state camera profiles — each key matches a CAM_STATE enum value.
  //
  // CAMERA-REFERENCE-WIDTH-1: `visibleCorridors` is THE zoom setting for every state —
  // how much world is in shot, measured in STANDARD corridors rather than in this track's own width.
  // One rule, one unit: the state says WHO the camera is on, this number says HOW FAR IN. Higher =
  // wider, and the same number now frames THE SAME AMOUNT OF WORLD on every track, narrow or wide
  // (see camera/zoomUnit.js).
  //
  // THESE NUMBERS HAVE NOTHING IN COMMON WITH THE OLD ONES. It is a unit change, like miles to
  // kilometres: the old values were multiples of each track's own corridor, these are multiples of a
  // fixed 300 px. LEADER 2 meant 262 world px on Searound and 600 on Mountainstreet; LEADER 0.75
  // means 225 everywhere. Nothing here is a regression from the old set — it is a different scale.
  //
  // The anchor is the owner's own eye: he typed 1.67 on Searound under the old unit, saw 219 world
  // px and judged it good ("the racers are not too big"). 0.75 x 300 = 225 px is that picture,
  // 2.7% wider — below what the eye separates. Every other state keeps the ratio to LEADER it had.
  cameraStateProfiles: {
    OVERVIEW: {
      visibleCorridors: 1.5, // 450 world px — the widest shot, double LEADER
      trackingTC: 1.5,
      entryTC: 1.5,
      leadInDuration: 0, // seconds camera holds lead-in position before following racer
      leadOutDuration: 0, // seconds camera decelerates before state exit
      innerFramePct: 0.7,
      maxStateDuration: 4000,
      minStateHold: 5000,
      maxEntryDurationMs: 10000, // timeout fallback: force tracking after this many ms in entry
    },
    LEADER_ZOOM: {
      visibleCorridors: 0.75, // 225 world px — the reference shot, the owner's own eye
      trackingTC: 0.25,
      entryTC: 0.8,
      leadInDuration: 0.3,
      leadOutDuration: 1.5,
      innerFramePct: 0.7,
      maxStateDuration: 8000,
      minStateHold: 5000,
      maxEntryDurationMs: 5000,
      leadAheadEnabled: false, // OFF by default so user sees centered behavior first
      leadOutEnabled: false, // OFF by default — lead-out causes "camera stops, racer runs away" effect
    },
    BATTLE_ZOOM: {
      visibleCorridors: 0.55, // 165 world px — tighter than LEADER
      trackingTC: 0.25,
      entryTC: 0.8,
      leadInDuration: 0.2,
      leadOutDuration: 1.0,
      innerFramePct: 0.7,
      maxStateDuration: 8000,
      minStateHold: 5000,
      maxEntryDurationMs: 5000,
      leadAheadEnabled: false,
      leadOutEnabled: false,
    },
    COMEBACK_ZOOM: {
      visibleCorridors: 0.55, // 165 world px — tighter than LEADER
      trackingTC: 0.25,
      entryTC: 0.8,
      leadInDuration: 0.3,
      leadOutDuration: 1.5,
      innerFramePct: 0.7,
      maxStateDuration: 8000,
      minStateHold: 5000,
      maxEntryDurationMs: 5000,
      leadAheadEnabled: false,
      leadOutEnabled: false,
    },
    PHOTO_FINISH: {
      // CAMERA-FRAMING-1: its OWN entry at last. It borrowed BATTLE's numbers, so the most dramatic
      // shot in the race was never closer than an ordinary battle. It is now the tightest setting
      // shipped, and safe: its guarantee is the two contenders, not the corridor, so the pair decides.
      visibleCorridors: 0.4, // 120 world px — the tightest shot in the race
      trackingTC: 0.25,
      entryTC: 0.8,
      leadInDuration: 0,
      leadOutDuration: 0,
      innerFramePct: 0.7,
      maxStateDuration: 8000,
      minStateHold: 1500,
      maxEntryDurationMs: 5000,
      leadAheadEnabled: false,
      leadOutEnabled: false,
    },
    LEAD_CHANGE: {
      visibleCorridors: 0.75, // same framing as LEADER — only the subject differs
      trackingTC: 0.25,
      entryTC: 0.8,
      leadInDuration: 0.3,
      leadOutDuration: 1.5,
      innerFramePct: 0.7,
      maxStateDuration: 8000,
      minStateHold: 1500,
      maxEntryDurationMs: 5000,
      leadAheadEnabled: false,
      leadOutEnabled: false,
    },
  },
  // Entry-convergence thresholds: when camera is within these values of its target after
  // a state transition, the lerpPhase switches from 'entry' (entryTC) to 'tracking' (trackingTC).
  entryConvergenceZoom: 0.05,
  entryConvergencePx: 10,
  // T-space convergence threshold (in track-parameter units). The steady-state gap between
  // camT and ttt is ese/lf ≈ 0.026 at typical racer speeds; threshold must exceed this to
  // allow convergence while the leader is moving. Raised from 0.005 (never-converge) to 0.03.
  transitionTConvergence: 0.03,
  maxTargetScreenPx: 160,
  // CAMERA-MIN-DRAW-1 — the readability floor: never draw a racer too small to RECOGNISE. A
  // FRACTION OF THE FRAME HEIGHT, not pixels, so it survives the next change of zoom unit (the old
  // floor was 32 absolute screen px and did not). 0 turns it off.
  //
  // DRAWING ONLY. It bounds one multiplication in the render loop and can never reach the zoom —
  // that is what made the old floor fight the owner's own setting, and there is a test pinning it.
  //
  // Default 0.045 is measured against the picture he approved: before the floor was removed, the
  // Space Sprint start formation drew its rockets at 32.0 screen px (4.44% of frame height). Without
  // it they are 22.8 px — a 29% shrink, and the reason the start formation stopped overlapping.
  // 0.045 = 32.4 px reproduces that within 1%. It binds in OVERVIEW only, and only on the three
  // tracks whose racers are drawn at 14.3 world px (Mountainstreet, Seatrack, Space Sprint) plus a
  // 1% nudge on Dirt Oval; nothing outside OVERVIEW is touched at any value up to 0.06.
  minDrawnFrameFrac: 0.045,
  tagVisibleMaxCount: 10,
  showCameraStateHud: true,
  showCameraDiagnostics: false,
  showRpDiag: false,
  showRpWinnerList: false,
  showRpMinimapBadges: false,
  showRpStartRow: false,
  showTop10SpeedMonitor: false,
  enableFrameLog: false, // frame-by-frame ring buffer for jitter post-analysis (default OFF)
  cameraDetourLog: false, // CAMERA-DETOUR-1: per-transition frame log (3 pre + ~30 post) for the wrong-direction diagnosis; read-only, default OFF
  enablePerfLog: false, // per-frame phase timing (physics/camera/render) for stutter diagnosis (default OFF)
  showBattleDiag: false,
  showComebackDiag: false, // COMEBACK diagnostics overlay: B1 racers, rank history, active comeback // BATTLE diagnostics overlay: detection status, group racers, locked racer
  showLeadChangeDiag: false, // LEAD_CHANGE diagnostics overlay: current/previous leader, pending state
  showGovernorDiag: false, // GOVERNOR diagnostics overlay: resolved phase fade + leader/straggler cohesion/shuffle/mult
  endgameThreshold: 0.9,
  // Pulk closeness (15b): BATTLE triggers when ≥3 of the top-10 racers are within this
  // lap-normalized arc distance (fraction of a lap) of each other — scale-independent, so one
  // value means the same on-track closeness on every track (replaced the world-px test that
  // rejected every cluster on the expanded 3072–6144px worlds).
  battlePulkThresholdT: 0.05,
  // Isolation threshold (arc): no non-group racer may be within this lap fraction of any group
  // member. Ships disabled (0 = off; raise via DevScreen to re-enable the "isolated duel" filter).
  // When re-enabled, a value ≈ 1.5 × battlePulkThresholdT is suggested.
  battleIsolationThresholdT: 0,
  // Maximum number of racers that can form the battle group (3–6). Greedy expansion adds
  // adjacent-rank racers until the group reaches this cap or no more qualify.
  battleMaxGroupSize: 6,
  // Minimum time BATTLE stays active after entry even if the pulk dissolves sooner.
  battleMinDurationMs: 3000,
  // BATTLE slowmo: physics (not camera) slows down during BATTLE_ZOOM.
  // battleSlowmoFactor: 1.0 = normal speed, 0.5 = half speed.
  // battleSlowmoMinDuration: minimum seconds slowmo holds after BATTLE ends.
  // battleSlowmoFadeDuration: seconds for fade-in / fade-out of the effect.
  battleSlowmoFactor: 0.5,
  battleSlowmoMinDuration: 2.0,
  battleSlowmoFadeDuration: 0.3,
  // BATTLE focus: non-group racers are desaturated and darkened during BATTLE_ZOOM.
  // Fade-in/out uses the same duration as battleSlowmoFadeDuration.
  battleFocusDarkening: 0.4, // 0 = no change, 1 = fully black
  // BATTLE group quality filters
  // Max rank-span for greedy expansion: highest minus lowest sorted index in the group.
  // Seed-triple span is already capped at 3 (k-i<=3); this cap applies to expansion only.
  // Default 5 → group can span P3–P8 when seed starts at P3.
  battleMaxGroupRankSpan: 5,
  // Top-N requirement: frontmost group member must be at rank ≤ battleMinTopN (absolute).
  // Prevents battles among the back half of the field when the whole top is spread out.
  // Default 10 → at least one member in top-10.
  battleMinTopN: 10,
  // COMEBACK camera tuning
  comebackMinPositionsGained: 2, // minimum rank-places gained within the window to trigger
  comebackWindowSec: 4, // seconds of rank history to evaluate (1–10)
  comebackMinDuration: 3, // seconds camera stays on the comeback racer (1–5)
  // Outcome-phase threshold: leader progress at which COMEBACK becomes eligible internally,
  // independently of the external isOutcomePhase flag from RaceScreen.
  outcomePhaseThreshold: 0.65,
  // COMEBACK start-rank filter: racer must have been at least this far back (as fraction of
  // field) at the start of the observation window. Prevents triggering for racers already
  // near the front. E.g. 0.40 = must have been in the bottom 60% of the field.
  comebackMinStartGap: 0.25,
  // COMEBACK current-rank filter: racer must not currently be better than this fraction of
  // the field. Prevents triggering for racers already in the lead group.
  // E.g. 0.10 = must currently be outside the top 10% (i.e. not P1–P4 in a 40-racer field).
  comebackMaxCurrentRankPct: 0.2,
  // LEAD_CHANGE camera tuning
  leadChangeMinGap: 0.002, // minimum T-space gap between P1 and P2 for a stable lead read
  leadChangeDebounceMs: 800, // ms the new leader must hold before change is confirmed
  leadChangeMinDuration: 1.5, // seconds camera stays in LEAD_CHANGE state (1–5)
  // Timing tunables (global — not per-state)
  postStartHoldMs: 7000, // ms of forced LEADER after the 3s start phase (no BATTLE before 10s total)
  battleCooldownMs: 8000, // ms after leaving BATTLE before it can re-trigger
  comebackCooldownMs: 10000, // ms after leaving COMEBACK before it can re-trigger
  leadChangeCooldownMs: 5000, // ms after leaving LEAD_CHANGE before it can re-trigger
  overviewCooldownMs: 15000, // ms after leaving OVERVIEW before it can recur
  // CAMERA-FRAMING-1: OVERVIEW-FRAMING-1's "leader + N racers, derive the zoom to fit them" is gone.
  // It was a guarantee phrased as a HEADCOUNT, and how many racers you see is an OUTCOME of how far
  // in the camera is, not an input to it. OVERVIEW now runs the same rule as every other state:
  // anchor the leader, guarantee the corridor, sit forward of centre. See camera/framingRule.js.
  // Director (weighted random) — candidate pool weights (0.0–1.0)
  battleWeight: 0.8,
  leadChangeWeight: 0.7,
  comebackWeight: 0.6,
  overviewWeight: 0.3,
  // OVERVIEW scheduler: race-length-aware fire timing
  overviewTargetCount: 2, // target number of OVERVIEW cuts per race
  overviewStartDelay: 15, // seconds into the race before first OVERVIEW is eligible
  // Finish sequence: drama pulse duration (was hardcoded), smooth zoom-out, and pause before leaderboard.
  finishDramaDurationMs: 1500, // ms of LEADER_ZOOM on the winner before FINISH_OVERVIEW begins
  finishOverviewZoomOutDurationMs: 3000, // ms for smooth zoom-out during FINISH_OVERVIEW
  finishPauseMs: 2500, // ms pause after last racer finishes before leaderboard
  finishOverviewLookbackPx: 300, // world-pixel distance before finish line where camera centers during FINISH_OVERVIEW
  // Photo-Finish (15a): when the first two finishers cross essentially together, show a tight
  // top-2 group shot with slow-motion instead of the single-winner drama pulse. Camera-only,
  // reuses the BATTLE arc-midpoint pan + group spriteScale and the render-loop slow-motion path.
  // photoFinishEnabled=false reproduces the classic single-winner finish exactly.
  photoFinishEnabled: true, // master switch for the photo-finish group shot
  photoFinishCloseThresholdT: 0.03, // max lap-normalized |t| gap between the top-2 finishers to count as "close" (same unit family as battlePulkThresholdT)
  photoFinishSlowmoFactor: 0.5, // physics slow-motion factor during the photo-finish shot (1.0 = normal, 0.5 = half speed)
  photoFinishLeadProgress: 0.97, // predictive gate: leader progress (fraction of finishT, 0..1) at which the one-shot close-check fires BEFORE the line
  // Countdown camera phase: zooms from start-zoom to OVERVIEW zoom during the pre-race countdown.
  // CAMERA-REFERENCE-WIDTH-1: the countdown opens on the same unit — a wide establishing shot that
  // eases into OVERVIEW. Clamped by the projection, so on a small world it means "the whole world".
  countdownStartCorridors: 3,
  countdownDurationMs: 4000, // matches the default race countdown duration
  // State overlay: narrative text shown during first seconds of OVERVIEW / BATTLE / COMEBACK.
  stateOverlayEnabled: true,
  stateOverlayDurationMs: 3500,
  // Legacy fields kept for v3→v4 migration reads. CameraDirector no longer reads these.
  spritePctOfCanvas: {
    overview: 0.05,
    leader: 0.08,
    battle: 0.12,
    comeback: 0.065,
  },
  maxStateDuration: 4000,
  battleMaxDurationMs: 6000,
  minStateHoldMs: 5000,
  cameraTransitionSeconds: { overview: 1.5, leader: 0.3, battle: 0.3, comeback: 0.3 },
  targetInnerFramePct: 0.7,
  // CAMERA-FOCUS-3 leader framing: where the leader sits along the motion axis in LEADER_ZOOM. 0.5 =
  // dead-centre; > 0.5 = FORWARD (leader toward the leading edge, so most of the frame shows the pack
  // BEHIND him — that is where the action is; owner's design). 0.66 = leader at ~2/3, safe margin to the
  // edge. The pan target is shifted backward along the track tangent to achieve it; the containment clamp
  // (inner-70) stays the hard rail. Absent/invalid → dead-centre (legacy). Range 0.5–0.8.
  leaderForwardFrac: 0.66,
  // CAMERA-GRAMMAR-1 transition grammar (entry STYLE only; correctness is universal). 'glide' (shipped,
  // owner's verdict) = on state entry pan AND zoom travel TOGETHER on one bounded ease to the subject's
  // correct framing — smooth, no hard cut. 'cut' = snap pan+zoom on frame 1 (crisp). 'legacy' = bare-caller
  // follow-lerp fallback. Additive top-level field (no schema bump): the v17 loader merges DEFAULT under
  // stored, so existing configs inherit 'glide' too.
  cameraTransitionGrammar: 'glide',
  // CAMERA-GRAMMAR-1 glide entry duration (ms) — one bounded ease for pan AND zoom. Validated [300, 900].
  glideDurationMs: 500,
  // CAMERA-COMPANY-1 — the DRAMATURGICAL guarantee: "do not show emptiness". The minimum number of
  // racers in frame INCLUDING the anchor; 0 or 1 disables it. This is the min-racers idea returning
  // as a GUARANTEE rather than the floor it used to be: a LIMIT computed before the camera moves
  // (never zoom in then back out), orientation-aware, and ranked by the zoom each racer would
  // require rather than by raw distance — which is what the old floor got wrong.
  //
  // Default 3 is measured, not chosen, and CAMERA-COMPANY-2 RE-MEASURED it at the 40-racer field the
  // owner actually runs — the CAMERA-COMPANY-1 numbers were taken at 20 and understated his case,
  // because more racers supply a longer queue rather than closer company. At 40 with LEADER 1: on
  // dirt-oval 3 cuts the frames where the leader is ALONE from 6% to 1% and thin frames (<3 racers)
  // from 7% to 1%, at 0.26 direction changes per second and a p95 shot of 1.45 track widths — barely
  // wider than the 1.0 he asked for. 5 and 8 buy NO further emptiness protection on that track and do
  // cost the shot: p95 1.76 and 2.32 track widths, the second being the over-wide picture this block
  // was opened to fix. On searound 5 does buy a little (thin 4% → 2%) for +0.22 rev/s, which is the
  // one honest reason to raise it. See reports/evolution/CAMERA-COMPANY-2.md.
  minRacersVisible: 3,
  // Focal-position smoothing: EMA time-constant (seconds) applied to the camera's world-space
  // pan target during follow phase. Reduces velocity-oscillation artefacts (COMEBACK speedBrake
  // cycling) and per-physics-step quantisation jitter (LEADER_ZOOM). 0 = disabled.
  // dt-normalised — frame-rate independent. ~50 ms suits most cases; higher = smoother but laggier.
  focalSmoothTc: 0.05,
};

export const DEFAULT_RACE_DYNAMICS_CONFIG = {
  reRollVariationPercent: 75,
  reRollTransitionDuration: 3.0,
  reRollIntervalDivisor: 10,
  reRollLastPositionPercent: 95,
  trajectoryTransitionDuration: 1.0,
  // Race Plan area bonus strength: validated at 2.0 (B1=+6%, B5=-2%). Range 0.5–3.0.
  racePlanBonusStrengthMultiplier: 2.0,
  // Race Plan timing — fraction of race duration (0–1), applied in racePlanner.js.
  // pulkStart: the CHAOS→PULK boundary = the director (hero choreography) anchor.
  // bonusTransitionEnd: bonus active until this point, then fades over bonusFadeDuration ms.
  // corridorStart / corridorEnd: P-controller (OUTCOME phase) active window.
  // Constraint enforced (phase-hardening clamp): pulkStart <= pulkEnd <= corridorStart <= corridorEnd.
  // SHIPPED WORLD = COMBO15 (MERGE-SHIP-1): the chaos window is 0.15 (the PULK-SPECTACLE fix that keeps the
  // mid-race lively). The old 0.25 remains a valid slider position (parity rule) — it is no longer the default.
  racePlanPulkStart: 0.15,
  racePlanBonusTransitionEnd: 0.75,
  racePlanBonusFadeDuration: 1500,
  racePlanCorridorStart: 0.55,
  racePlanCorridorEnd: 1.0,
  // Minimum race duration (s) at/above which the Race Plan controller runs.
  // Below this the race falls back to raw physics (no target-rank sorting).
  // Sim-validated fair down to 30s; DevScreen-adjustable.
  racePlanMinDurationSec: 30,
  // ── SHIPPED WORLD = COMBO15 (MERGE-SHIP-1). The FAIR-ARRIVAL candidate is now the default game: a gentle
  // continuous CHAOS STEER toward each racer's drawn band (raises band arrival to 85–90%), plus a band-aware
  // RE-ROLL DRAW BIAS from R=0.60 that finishes the arrival job — together they lift arrival + front action
  // over the pre-combo15 world while the 0.15 chaos window keeps the mid-race lively. Gate record:
  // reports/evolution/FAIR-ARRIVAL-GATE.md. These are ordinary config keys; OFF (chaosSteer/bandBias false)
  // reproduces the pre-combo15 shipped world (a valid slider position, parity rule).
  chaosSteer: true,
  chaosSteerGain: 0.06,
  bandBias: true,
  bandBiasR: 0.6,
  bandBiasGain: 0.1,
  // PULK field-cohesion bias gain: during the PULK phase the three pulk racers' re-roll draws are
  // nudged toward the pulk centroid by this gain × normalised gap, so the field stays together
  // (the always-on cohesion mechanism). 0 = no cohesion; higher = tighter pack. 2.0 = shipped.
  pulkBiasGain: 2.0,
  // ── PULK-phase contest director (applyPulkLeadRotation, raceGovernor.js) — SHIPPED ON ──────
  // A rank-BLIND lead rotation that stages a front contest inside the PULK window via r.governorMult.
  // pulkEnvelopeMaxEffect + pulkEnvelopeMaxStepPerFrame are the PULK phase's OWN REALISM ENVELOPE
  // (±12% clamp + per-frame slew) every contest term rides; the phase-weight fade takes governorMult
  // to exactly 1.0 by OUTCOME so the finish order (fairness) is untouched. Lives here (the shared
  // persisted dynamics config the physics reads) so DevScreen and the future SetupScreen bind the
  // SAME keys — single source, no second copy.
  pulkEnvelopeMaxEffect: 0.12, // outer clamp on |governorMult−1| — the realism guarantee (±12%)
  pulkEnvelopeMaxStepPerFrame: 0.01, // slew limit on per-step governorMult change → smooth speed, no jump
  // SHIPPED pulk contest STRENGTHS (pulk* namespace): the realism-bounded speed knobs the PULK-phase
  // lead rotation rides. Rank-blind (position + seed only, never targetRank), faded to nothing by
  // OUTCOME so the finish order (fairness) is delegated to the OUTCOME controller + the naturalness
  // ceiling-cap. DevScreen-tunable.
  pulkLeaderBrake: 0.1, // brake on the live leader (≤ 0.15)
  pulkChallengerBoost: 0.06, // forward boost cap on a catching challenger toward the leader
  pulkCeilingCap: true, // cap a boosted racer's resulting speed at the natural band max
  // Additive headroom (speed-factor points) ABOVE the natural band max for the pulk ceiling: lets
  // a boosted challenger burst past the fastest natural racer (revives the otherwise cap-eaten boost).
  // 0 = shipped baseline (cap = band max, byte-identical). Hard-clamped to +20% (NATURALNESS_CEILING).
  pulkBoostHeadroom: 0.1,
  // Hero choreography (UNCONDITIONAL): designated hero racers are steered along hand-authored
  // position-over-time curves by the trajectory controller from the choreo start; the rest is unchanged.
  // Choreo drama intensity (0..1, the future Action-slider backing) + the loose-pack bandStrictness
  // that lets heroes weave through (the pack runs at this strictness; heroes track their curve exactly).
  choreoIntensity: 0.6,
  choreoPackBandStrictness: 0.5,
  // Stage 1 spoiler switch (default OFF): while choreography is active, suppress the B1-target pool's
  // CHAOS areaBonus so the future top-5 are not pulled forward before the race opens up. A bonus switch,
  // NOT a depth tool (depth is authored via the establish-act fall-back).
  choreoSuppressChaosBonusB1: false,
  // Choreo finish shaping (Step 4): the B1 heroes are held to choreoReleaseProgress then RELEASED to
  // natural speed for a real finish contest; each other band resolves into its band by its own
  // (earlier) checkpoint so the field slots in gradually, not in a settle. Must mirror
  // GENERATOR_CONFIG.releaseProgress / bandResolve (heroCurveGenerator.js).
  choreoReleaseProgress: 0.97,
  choreoResolveB2: 0.8,
  choreoResolveB3: 0.7,
  choreoResolveB4: 0.65,
  choreoResolveB5: 0.6,
  // Choreo PULK end / OUTCOME start (storage key): PULK ends here and OUTCOME (the pack's
  // band-steering) begins here — one boundary, no TRANSITION phase (corridorStart := this in
  // racePlanner.js). At the default 0.25 (== racePlanPulkStart) PULK is zero-width and the field is
  // steered from the chaos→choreo boundary, byte-identical to the shipped behaviour; raising it reopens
  // the PULK window [racePlanPulkStart, this] and hands OUTCOME off later. Range 0.25–0.60.
  // Surfaced by the DevScreen "PULK end / OUTCOME begins" control.
  // 0.6 shipped 2026-07-17 (SWEEP 2: +51% PULK action vs 0.5, band-reach gate still held on 3/4 tracks).
  choreoOutcomeStart: 0.6,
  // ── FRONT ACT window start — the front battle's OWN key ───────────────────────────────────────
  // The sustained-P1-battle observer (outcome-front-battle.mjs) measures over
  // [contestWindowStart, first finish] and reads this. It was previously read off choreoResolveB2,
  // which is *B2's* resolve checkpoint: tuning B2 for a B2 reason silently moved the front-battle
  // measurement window and invalidated every committed baseline. Initialised to the then-current
  // choreoResolveB2 value, so those baselines stay exactly comparable; the two are now independent.
  contestWindowStart: 0.8,
  // Spatial-hysteresis threshold for a RELEASED racer (read by the B2-attacker free phase below):
  // how far (ranks) it may drift past its band edge before the servo re-engages at full pinning and
  // steers it back. It releases again only after returning fully inside. Read in racePlanner.js.
  packReSteerThreshold: 1.0,
  // ── B2-attacker "Attack & Fall" (OUTCOME front-action lever; SHIPPED ON at count 3) ─────────────────
  // Cast N additional heroes from FRONT-post-chaos B2-finishers that climb to b2AttackPeakRank (mandatory
  // choreography), then are RELEASED to free reorder the moment they fall back inside B2 (band-arrival).
  // SHIPPED 2026-07-20: count=3, peak=5, band-arrival — the sim-validated winner (+21% top-5 OUTCOME action
  // vs the no-attacker floor, with B1/B2 band-reach ≥70% on all tracks and Holm at the pre-existing 2/4
  // baseline, no regression). count=0 restores the pre-feature game (byte-identical). Under band-arrival
  // b2AttackFinalRank only shapes the fall slope (release triggers at B2 re-entry regardless). Read in
  // heroCurveGenerator.js (casting) + racePlanner.js (servo).
  b2AttackHeroes: 3,
  b2AttackPeakRank: 5,
  b2AttackFinalRank: 7,
  b2AttackProgress: { start: 0.4, end: 0.7 },
  b2AttackResolveProgress: 0.85,
  // Release model for attackers: false = fixed-final (steer to b2AttackFinalRank, releases with margin);
  // true = band-arrival (free the moment it re-enters B2). Sim A/B: band-arrival ties fixed-final on
  // fairness and is simpler (no finalRank knob), so it is the chosen model. Harmless when count=0
  // (no attackers → the servo branch never reads it), so the shipped default stays byte-identical.
  b2AttackBandArrival: true,
  // ── Gap-cap re-roll bias (docs/CONCEPT-COHESION.md) — "loaded dice within the honest range" ──
  // A racer that has opened a hole behind itself (arc gap > G to the racer behind) draws SLOWER at its
  // next scheduled re-roll; in symmetric mode a dropped racer (gap > G ahead) draws FASTER — always inside
  // the honest ±8.1% band. Scheduled rolls only. gapRerollEnabled FALSE → the transform receives no
  // threshold and passes the draw through bit-exact → the pre-feature world is byte-identical (OFF
  // shipped-default fingerprint f8f7d9c2fd3283e9 on the current speed-150 engine).
  //
  // SHIPPED HISTORY: ON since 2026-07-22 (symmetric); retuned 2026-07-23 (G 1.5→0.75, strength 1.0→0.5);
  // FLIPPED 2026-07-26 to the confirmed candidate G=0.5, strength=1.0 after the ten-track confirm gate
  // (owner decision). The mechanic: frac = min(1, strength·(gap−G)) — G sets how small a gap starts a
  // correction, strength how hard each correction pulls. The flip fires the correction EARLIER (smaller G)
  // and at FULL strength; the confirm gate showed this makes the finale livelier, not deader.
  // CURRENT TRUTH for the shipped metric set is the CANDIDATE column of reports/parity/GS-CONFIRM-GATE.md
  // (N=100 × all 10 tracks: pooled band-reach 71.8%→72.7%, dead finales 14.1%→10.0%, runaway 10.1%→6.8%,
  // every finale guardrail better, Holm unchanged 3/10) on the speed-150 baseline (reports/parity/REBASELINE.md).
  gapRerollEnabled: true,
  gapRerollThresholdLengths: 0.5,
  gapRerollStrength: 1.0,
  gapRerollMode: 'symmetric',
  // Dev-only visual cue (rendering-only, zero sim effect): flash a racer at the instant a roll is biased,
  // so the owner can SEE where the mechanism fires before judging naturalness with it off. Default OFF.
  gapRerollDevMarker: false,
  // Front-group pool: front N on-track positions (leader excluded) the lead rotation draws challengers from.
  pulkFrontPool: 8,
  // ── PulkLeadRotation — THE pulk-phase mechanism (UNCONDITIONAL). It COMPLETES lead changes inside
  // [pulkStart, pulkEnd): 1–2 attacker slots boost the current live P2/P3 UNTIL it takes the lead, a
  // permanent outsider slot brings fresh blood from deeper in the field, and the dethroned leader is
  // braked (distance-based) until it has fallen `dropDepthLengths` behind — the depth lever. Contest
  // STRENGTHS are the pulk* knobs above (pulkLeaderBrake/pulkChallengerBoost/pulkFrontPool + the
  // pulkEnvelope*/pulkCeilingCap envelope) — no duplicated values.
  pulkLeadRotationAttackerSlots: 2, // parallel attacker slots (1–2)
  pulkLeadRotationDropDepthLengths: 8, // ex-leader brake release depth (racer lengths); the depth lever
  pulkLeadRotationOutsiderMaxReachLengths: 15, // outsider reachability cap (racer lengths)
  pulkLeadRotationDeadlockTimeoutMs: 12000, // per-boost safety net (never the normal path)
  pulkLeadRotationMinHoldMs: 750, // fresh-P1 hold = smart-camera SM_HOLD_MS → no sub-750ms P1 flicker
  // Phase-split bonuses: areaBonus/rowBonus strength gated by race phase (chaos EARLY / PULK / post
  // POST). areaBonus strengths are in bonusStrengthMultiplier units (2.0 = shipped full, 0 = off);
  // rowBonus strengths are fractions (1 = full, 0 = off). Winning set: EARLY + POST full, PULK off.
  phaseSplitBonusEnabled: true,
  areaBonusEarly: 1.0,
  areaBonusPulk: 0,
  areaBonusPost: 1.0,
  rowBonusEarly: 1,
  rowBonusPulk: 0,
  rowBonusPost: 1,
  // Ease the rowEnvMult step at the PULK->OUTCOME boundary over 1s (easeInOutCubic, like
  // trajectoryMult) instead of jumping instantly. Visual polish only — the step is ~0.5-1.5%
  // on back rows; sim sweep (SLEW vs EASING, 4 tracks x 100 races) confirmed both fairness-neutral
  // (B1/B2 within 0.6pp, Holm 0). SHIPPED DEFAULT true 2026-07-19 (owner eye-tested; re-gate B1 -0.4pp,
  // B2 -0.2pp vs instant, both within noise). DevScreen toggle flips it OFF for comparison.
  enableRowEnvSmooth: true,
};

export const DEFAULT_FRAME_TIMING_CONFIG = {
  dtSmoothingAlpha: 0.7,
  renderInterpolation: true,
};

export const DEFAULT_RACE_BEHAVIOR_CONFIG = {
  enabled: true,
  // Start layout — initial lateral spread at race start
  startSpreadRange: 0.95,
  // Open-track run-out zone: fraction of path after which the finish line sits (0 = no runout)
  runoutZone: 0.05,
  // Comfort zone & soft boundary repulsion
  comfortThreshold: 0.7,
  softRepulsionStrength: 0.1,
  // Avoidance buffer: forces engage this fraction BEFORE body-edge contact (lead time).
  // 0.20 = gate fires when centers are within 120% of the sum-of-half-sizes on both axes.
  // Tunable in Dev Screen — Soft Avoidance. Calibrate by eye before running sweeps.
  avoidanceBufferPct: 0.2,
  // tWeight / yWeight: RETIRED from browser avoidance gate (report 39 — geometric gate).
  // Kept here so sim scripts that still read avoidanceDistance/tWeight/yWeight for
  // reference runs continue to work. Do NOT use in raceBehavior.js gate logic.
  tWeight: 2.0,
  yWeight: 1.0,
  maxLateral: 0.95,
  // Drafting / slipstream
  draftingMaxDistance: 80,
  draftingConeAngle: 30,
  draftingBoost: 1.04,
  // Start-phase brake ramp: on open tracks, speedBrakeFactor is eased in over this window (ms).
  // 0 = no ramp (full braking from frame 1). Has no effect on closed tracks.
  avoidanceWarmupMs: 3000,

  /*
   * PHYSICS PARAMETERS — DO NOT CHANGE WITHOUT RUNNING A FULL SIM SWEEP
   *
   * These 8 parameters were optimized via a 4-phase simulation sweep
   * (4020-race LHS + 520-race refinement + 1500-race validation
   * across 10 default tracks and 20 racer types).
   *
   * Current values (Phase 5 winner, established 2026-06-03):
   *   lateralForce:                0.011400
   *   lateralDamping:              0.160000
   *   avoidanceDistance:           0.180000
   *   speedBrakeFactor:            0.945000
   *   speedBrakeTMultiplier:       1.500000  (restored — avoidanceActive zone, all tracks)
   *   speedBrakeYThreshold:        0.180000  (restored — avoidanceActive zone, all tracks)
   *   brakeMatchActivationTMultiplier: 0.500000  (new — brake-to-match zone, open tracks only)
   *   brakeMatchActivationYThreshold:  0.060000  (new — brake-to-match zone, open tracks only)
   *
   * Two-zone architecture (report 13): avoidanceActive (floor brake) uses the original wide
   * zone on ALL tracks; brake-to-match cap uses the narrow zone on OPEN TRACKS ONLY.
   * Report-12 isOpen guard proved that disabling avoidanceActive on closed tracks causes
   * closed-track regressions (Dirt Oval × dragon p=0.285→0.013, motorbike p=0.686→0.008).
   * To revert to pre-experiment baseline: remove brakeMatchActivation* params; set
   *   speedBrakeTMultiplier=1.5, speedBrakeYThreshold=0.18 (already restored).
   *
   * Other parameters are strongly interdependent. Changing one
   * without re-sweeping the others will likely degrade race quality.
   *
   * To find new optimal values:
   *   1. Run scripts/sim-fairness.mjs with LHS sampling (200 combos)
   *      on Dirt Oval + Space Sprint simultaneously
   *   2. Take top 5 survivors, refine with ±5%/±2.5% sweep
   *   3. Validate top 3 on all 10 default tracks with 50+ races each
   *   4. Only apply values that pass all hard cutoffs on all tracks
   *      (fairness p > 0.05, zigzag < 0.003, hardOverlap < 3%)
   *
   * Sweep harness: scripts/sim-fairness.mjs
   */
  lateralForce: 0.0114,
  // Lateral velocity damping factor (0 < d < 1): fraction of velocity retained each frame.
  lateralDamping: 0.16,
  // avoidanceDistance: RETIRED from browser gate (report 39 — geometric gate replaces it).
  // Kept for sim script backward compat. Browser now uses avoidanceBufferPct (above).
  avoidanceDistance: 0.18,
  speedBrakeFactor: 0.945,
  // speedBrakeTMultiplier — longitudinal lead-time multiplier for the body-based brake zone.
  // Lateral threshold now uses body contact width ×1.0 (same-lane filter, report 45).
  // Restored to Phase-5 calibrated values (report 13).
  speedBrakeTMultiplier: 1.5,
  // speedBrakeYThreshold: RETIRED from browser brake gate (report 45 — body-based same-lane
  // filter replaces it). Kept for sim-script backward compat and raceBehaviorConfig validation.
  speedBrakeYThreshold: 0.18,
  // brakeMatchActivationTMultiplier / brakeMatchActivationYThreshold — brake-to-match zone.
  // Separate narrow activation zone for the brake-to-match cap computation.
  // Applied ONLY on OPEN tracks (config.isOpen !== false).
  // Near-contact values (report 13): activates when within ~0.5 sprite-widths longitudinally
  // and ~6% half-track-width laterally. Breaks the open-track chain lock without affecting
  // the avoidanceActive floor-brake zone used for pack stabilization on all tracks.
  brakeMatchActivationTMultiplier: 0.5,
  brakeMatchActivationYThreshold: 0.06,
  // Brake-to-match tuning (Step 1 — overtaking rebuild).
  // speedMatchMinDifferential: fractional speed excess above which brake-to-match engages.
  //   0.005 = engage only when trailer is >0.5% faster than leader.
  // speedMatchSafetyMargin: fractional undercut below exact leader speed to prevent oscillation.
  //   0.001 = cap set to leaderSpeed × 0.999 instead of exact leader speed.
  // brakeHoldTimeoutFrames: consecutive hold frames before anti-trap escape triggers.
  // brakeHoldEscapeReleaseDurationFrames: frames of forced brake-release after timeout.
  // brakeHoldEscapeCooldownFrames: frames after escape before re-lock is allowed.
  // brakeReleaseDebounceFrames: consecutive clear frames needed to exit hold.
  speedMatchMinDifferential: 0.005,
  speedMatchSafetyMargin: 0.001,
  brakeHoldTimeoutFrames: 90,
  brakeHoldEscapeReleaseDurationFrames: 15,
  brakeHoldEscapeCooldownFrames: 60,
  brakeReleaseDebounceFrames: 3,
  // ── Hard position separation (Layer 2 of the physics redesign) ──────────────
  // A positional, force-independent anti-penetration pass that runs as the ABSOLUTE
  // LAST step of applyRacerBehavior — after every force (L1–L11) and after the
  // velocity/clamp integration. It resolves a fraction of any residual body overlap
  // each frame, acting as a BACKSTOP behind the normal avoidance/free-lane forces.
  // Opt-in for testing.
  //   hardSeparationEnabled:    master switch. Default TRUE = hard separation active as a
  //                             pure backstop (verified fair + effective across the full
  //                             track×racer matrix). Set FALSE to reproduce the pre-feature
  //                             baseline exactly (zero behavior change).
  //   hardSeparationRelaxation: fraction of the (beyond-tolerance) overlap resolved per
  //                             frame (0–1). 0.15 spreads the correction over several
  //                             frames so it reads as a smooth nudge, never a hard snap.
  //                             Strength also eases 0→full over avoidanceWarmupMs at race
  //                             start (same value + easeInOutCubic as the brake warmup,
  //                             applied here to BOTH open and closed tracks).
  //   hardSeparationTolerancePct: dead-zone. Bodies are allowed to overlap by up to this
  //                             fraction of the contact distance before separation engages,
  //                             and separation only pushes back to that tolerance boundary
  //                             (soft stop) — not to full contact. Avoids constant micro-
  //                             corrections on lightly-touching pairs. 0.10 = 10%.
  hardSeparationEnabled: true,
  hardSeparationRelaxation: 0.15,
  hardSeparationTolerancePct: 0.1,
  // ── Layer 1 (Soft Steering) — single target + spring per racer ──────────────
  // The sole lateral-force model: replaces the former L1 (home) + L2 (avoidance) +
  // L3 (free-lane) + L4 (commit-injection) + L5 (Stage-D gap). Each racer is pulled
  // toward one per-step target by a single spring. L6 (OVL-C), L7/L8, L10/L11 and the
  // hard-separation backstop are unchanged.
  //   softSteeringSymmetric:  Applies ONLY to the §4b body-overlap case. TRUE = both
  //                           members of an overlapping pair get a target during body
  //                           overlap; FALSE = only the trailer (lower t) does. The §4a
  //                           non-overlap case is ALWAYS trailer-only regardless of this
  //                           flag (the leader holds its line). (Sweep chose TRUE.)
  //   softSteeringStrength:   spring constant: delta += (target - physicalY) * strength.
  //   softSteeringClearancePct: extra gap beyond one contact width, as a fraction of the
  //                           contact width (0.0 = exactly contact distance).
  //   softSteeringHysteresisY: dead-zone around relPos≈0 within which the side choice is
  //                           held stable (prevents the pendulum limit-cycle near the
  //                           obstacle's centerline). Uses pairTieDir as the tie-break.
  softSteeringSymmetric: true,
  softSteeringStrength: 0.03,
  softSteeringClearancePct: 0.0,
  softSteeringHysteresisY: 0.04,
  //   softSteeringObstacleMargin: RACER-FLAPPING-2 margin hysteresis. The incumbent §4a obstacle keeps
  //                           the steer target unless a challenger's constraining force exceeds it by this
  //                           RELATIVE margin — stops the most-constraining winner alternating tick-to-tick
  //                           between two comparable obstacles (the flapping root). Geometric + per-agent,
  //                           NO clock. A dominant challenger still switches immediately (eased by the
  //                           lateral clamp). 0 = disabled (pre-fix winner-take-all). Set by the sweep.
  softSteeringObstacleMargin: 0.5,
  // ── Lateral feel smoothing (Stage A2) — FEEL only; avoidance DECISIONS unchanged ──
  // laneTargetEaseMs: when the lateral steering target flips (a new free-lane / pass
  //   candidate), the EFFECTIVE target eases toward it over this long via easeInOutCubic,
  //   so the steering spring never sees a discontinuous jump — no lane snap. A constant
  //   target is a no-op (only flips ease). 0 = disabled (snap = pre-Stage-A2 behavior).
  //   Kept short so a committed pass still clears the leader in time.
  // lateralVelocityResetSoftness: fraction of lateral velocity RETAINED where a boundary
  //   clamp or an overlap correction would previously hard-zero it (0 = hard zero =
  //   pre-Stage-A2; higher = softer ease-off). The position clamp and the overlap
  //   separation stay HARD — only the velocity handling softens, so non-penetration holds.
  // Both are parity-safe (raceBehavior.js is the single source; browser + sim import it)
  // and deterministic (advanced one fixed 16ms physics step per call, no wall-clock).
  laneTargetEaseMs: 200,
  lateralVelocityResetSoftness: 0.5,
  // maxLateralSpeedPerStep (Stage A3): uniform per-step cap on lateral motion (physicalY
  // units per 16ms step), applied to dodge-outs AND returns alike — no sideways "jump".
  // The look-before-brake dodge trigger is derived from this cap so a capped glide always
  // clears in time; if it can't, the racer brakes and waits. Very large → no cap (reproduces
  // the prior near-instant dodge). HANDOFF: the sweet-spot (field-fanning vs brake-frequency
  // vs glide-feel) is tuned in the governor sweep, NOT here — 0.028 is a mild default that
  // sits just below today's ~0.033/step dodge peak so the jump visibly softens while keeping
  // honestOverlap at/below baseline (sim-checked: overlapRate 0, honestOverlap −0.7%).
  maxLateralSpeedPerStep: 0.028,
  // maxLateralAccelPerStep (RACER-MOTION-1, second-order smoothing): per-tick cap on the CHANGE in the
  // lateral step (acceleration = Δvelocity per 16ms), applied on top of the speed cap. It bounds the JERK:
  // a dodge no longer snaps velocity 0↔clamp at its on/off (the visible jump) but eases in and out. Shapes
  // the existing steer output — no new force. 0 = disabled (pre-RACER-MOTION-1 bang-bang). Set by the sweep.
  maxLateralAccelPerStep: 0.0005,
  // ── Look before you brake ───────────────────────────────────────────────────
  // When a racer closes on a slower racer in the same lane AND a side is genuinely
  // free (same isSideFree geometry as the overlap resolver), it commits to that free
  // side EARLY — inside the brake zone, not only at overlap — and passes at speed
  // instead of braking first and evading later. The speed brake is only dropped when a
  // lane is truly free and being taken; when both sides are blocked, braking is exactly
  // as before, so non-penetration is preserved (the hard-separation pass is still the
  // final positional backstop). Lives entirely in raceBehavior.js; browser/sim parity is
  // automatic (both import that module and provide the same geometry fields).
  //   lookBeforeBrakeEnabled: master switch. TRUE = take a free lane and pass at speed.
  //                           FALSE = pre-feature behavior (always brake in the zone).
  //   lookBeforeBrakePassStrength: spring constant for the decisive lateral commit while
  //                           passing (≫ softSteeringStrength so the racer clears the
  //                           leader sideways before longitudinal contact — the "commit"
  //                           half of the non-penetration coupling).
  //   lookBeforeBrakeReengageTMultiplier: FLOOR longitudinal re-engage margin as a multiple
  //                           of the body-contact length (dT units). The pass is allowed
  //                           only while dT exceeds the effective threshold, which is the
  //                           larger of this floor and the lag-safe dynamic margin below.
  //                           Must be < speedBrakeTMultiplier (1.5) so a pass window exists,
  //                           and ≥ ~1.0 so the brake re-engages before body contact.
  //   lookBeforeBrakeLagFrames: the physics loop applies the speed brake one frame late
  //                           (avoidanceActive/brakeMatchFactor are read the step AFTER they
  //                           are written). The dynamic re-engage margin reserves this many
  //                           frames of worst-case closing (lbTHalf + lagFrames × vClose) so
  //                           that even a one-frame-late brake still prevents contact — the
  //                           non-penetration guarantee is structural, not backstop-delegated.
  //                           2 = one lag frame + one frame of margin. Raise for more safety.
  //   lookBeforeBrakeRequireSlowerLeader: only take the pass path when the trailer is
  //                           genuinely faster than the leader (a real overtake), so racers
  //                           don't weave around same-speed traffic. Uses raw parity-safe
  //                           speeds and the lookBeforeBrakeMinDifferential threshold.
  //   lookBeforeBrakeMinDifferential: fractional speed excess above which the LBB pass path
  //                           is allowed (real-overtake bar). DEDICATED to look-before-brake
  //                           so it is DECOUPLED from brake-to-match's speedMatchMinDifferential.
  //                           Default 0.005 is byte-identical to the value the LBB gate used
  //                           when it read speedMatchMinDifferential (0.005) — zero behaviour
  //                           change. Raise (e.g. 0.02) to restrict LBB to genuinely faster
  //                           trailers without altering brake-to-match engagement.
  lookBeforeBrakeEnabled: true,
  lookBeforeBrakePassStrength: 0.5,
  lookBeforeBrakeReengageTMultiplier: 1.2,
  lookBeforeBrakeLagFrames: 2,
  lookBeforeBrakeRequireSlowerLeader: true,
  lookBeforeBrakeMinDifferential: 0.005,
};

// ── The shipped-default CONFIG WORLD ──────────────────────────────────────────────────────────
// The default value of every race-path config block, in one object keyed exactly like
// raceConfigWorld.WORLD_CONFIG_KEYS. This is the reference the HUD fingerprint badge diffs
// against, and the base a CAMERA-REPRO-1 marker's config diff is applied back onto — so the two
// MUST read the same defaults. One home, both sides import it.
export const DEFAULT_CONFIG_WORLD = {
  raceDynamicsConfig: DEFAULT_RACE_DYNAMICS_CONFIG,
  raceBehaviorConfig: DEFAULT_RACE_BEHAVIOR_CONFIG,
  rowLayoutConfig: DEFAULT_ROW_LAYOUT_CONFIG,
  baseSpeedConfig: DEFAULT_BASE_SPEED_CONFIG,
  autoScaleConfig: DEFAULT_AUTO_SCALE_CONFIG,
  frameTimingConfig: DEFAULT_FRAME_TIMING_CONFIG,
  cameraConfig: DEFAULT_CAMERA_CONFIG,
};

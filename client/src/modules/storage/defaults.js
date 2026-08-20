// ============================================================
// File:        defaults.js
// Path:        client/src/modules/storage/defaults.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Default data for all storage keys — the value that applies wherever a stored config
//              has no entry for a key. NOT merely "seeded on first launch", which is what this line
//              used to say and what CEREMONY-TRUTH-1 had to check rather than trust.
//
//              WHAT `loadCameraConfig` ACTUALLY DOES, because the difference is the whole of
//              Lesson 199: it walks `Object.keys(DEFAULT_CAMERA_CONFIG)` and takes the stored value
//              only where the stored object HAS that key. So a key added here reaches an existing
//              installation on the next load, and a value the owner changed by hand SURVIVES it —
//              his entry wins for his key, the default fills the ones he never touched. Nothing here
//              requires resetting a stored config, and nothing should.
//
//              THE TRAP IS ELSEWHERE, and it is real: a reader that writes `cfg?.someKey ?? 0`
//              installs a SECOND authority on the value, which wins exactly when the key is missing
//              — the one moment the default was written for. See reports/night/CEREMONY-TRUTH-1.md
//              for the count.
// ============================================================

import { DEFAULT_AUTO_SCALE_CONFIG } from '../autoSpriteScale.js';

export const DEFAULT_RACE_DEFAULTS = {
  duration: 60,
  winners: 3,
  maxPlayers: 20,
  maxPlayersClosed: 40,
  maxPlayersOpen: 100,
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
      // TRACKING made as quick as every other state (CAMERA-ANCHOR-TRUTH-1 §4c). At 1.5 the
      // OVERVIEW subject sat a median 13.78 pp of the frame away from where the framing rule put
      // him — 3.65x every other state pooled (3.78 pp) — and the old value carried no reason in the
      // code. At 0.25 that halves to 6.78 pp (p95 25.57 -> 19.64) and nothing else moves.
      trackingTC: 0.25,
      // ENTRY DELIBERATELY LEFT SLOW. The glide into the wide shot is intentional, and the
      // measurement CANNOT condemn it: the lag metric samples the tracking phase only, so entryTC
      // 0.8 vs 1.5 moved the OVERVIEW median by 0.09 pp (6.78 vs 6.69) — inside the noise of the
      // thing it is not measuring. Changing it would be taste dressed as evidence. If it is ever
      // revisited, the missing instrument is an ENTRY-phase convergence measurement, not this one.
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
  // CAMERA-TAGS-1 — name tags. `tagVisibleMaxCount` (top N by race position) is GONE: it answered
  // "who matters in the standings" where a label answers "who is that on screen", and it never
  // looked at whether two labels landed on each other. Eligibility is now "on canvas" and
  // label-vs-label occlusion decides the rest, so the COUNT is an output rather than a setting.
  //
  // The label is UI: the same size on screen at every zoom, on every track, at any world
  // resolution. 0.022 of frame height = 15.8 px at 720. The rule it replaces was
  // max(8, round(11/effZoom)), which clamped above effZoom 1.375 and so produced a 2.4x size
  // difference between tracks at one setting.
  nameTagFrameFrac: 0.022,
  // THE START-FORMATION EXCEPTION, and the owner's reason for it: during the start formation EVERY
  // name must be visible so that every spectator can find their racer once. All names are shown
  // through the countdown and for this long after the gun.
  //
  // 8000 ms is measured, not chosen. Decluttering drops 10-22% of names while the field is still a
  // block, worst around 4 s in; by 8 s it drops essentially nothing (survival ratio 1.00). So the
  // handover costs names before 8 s and costs nothing after it — and because nothing is dropped at
  // that moment, the switch is INVISIBLE and needs no transition. Note this is well past the
  // camera's own 3 s start hold: handing over when the camera does would take ~20% of the names
  // away at the densest moment.
  // LABEL-OFFSET-1 — THE GAP FOLLOWS THE RACER, AND THIS IS THE PART THAT DOES NOT.
  //
  // A label sits half the racer's DRAWN height above its centre — which lands its bottom edge exactly
  // on the racer's top edge — plus this margin. The first term needs no setting: it falls out of the
  // drawn size, so it is right on every track and at every zoom by construction. This is the second
  // term, the breathing space, and it is the owner's knob.
  //
  // It is deliberately NOT a share of the racer. That would collapse the two terms into one factor
  // and turn the knob into a second size multiplier rather than a gap. It is the term that absorbs
  // what the first cannot know: the drawn height is the visible NARROW BODY, and sprite extremities
  // — a giraffe's neck, a rocket's fin — reach past it.
  //
  // 6 px is my judgement, not a measurement, and it is the number the owner is expected to tune by
  // eye. It replaces a gap that was `fontPx × 2.0` = 31.7 px at the default font, fixed no matter how
  // big the racer was; at the smallest a racer is ever drawn (the readability floor, 0.045 × 720 =
  // 32.4 px) the gap becomes 22.2 px, and at the largest it grows instead of staying put.
  nameTagMarginPx: 6,
  nameTagAllUntilMs: 8000,
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
  // Dev rings on the racers themselves: green = a choreographed B1 hero, red = a B2 attacker.
  // Read by the DRAW path (`renderRaceFrame.js` → `racerRendering.js`), toggled in Dev Screen →
  // Camera Advanced. It had NO DEFAULT until DEV-MARKERS-1, and since `loadCameraConfig()` rebuilds
  // the config key-by-key from THESE keys (d94a7b9d), a stored `true` was dropped on every load —
  // the checkbox appeared to work and the rings never came back. A key the renderer reads must
  // exist here or it cannot survive loading; `scripts/check-config-keys.mjs` now fails if one does not.
  highlightHeroes: false,
  // ENDGAME-THRESHOLD-095: the endgame — and with it the run-in's window — opens at 95% of the way
  // to the finish rather than 90%. THE OWNER'S DECISION, 2026-08-18: he had been running 0.95
  // himself, judged it on a production build on 2026-08-17, and waived a before/after sweep, so no
  // ten-track measurement stands behind this number and none is claimed to.
  //
  // A STORED 0.95 IS DROPPED BY THIS CHANGE, which was confirmed against `pruneStored` rather than
  // assumed: the store keeps only what differs from these defaults, so his own setting disappears
  // from localStorage on the next load and he follows the default at the same number. Nothing he
  // sees changes — and the key stops being shadowed, so the next change to it will actually reach
  // him instead of losing to a stored copy of today's value.
  endgameThreshold: 0.95,
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
  //
  // OUTCOME-PHASE-75 (2026-08-10) — the OWNER'S CHOICE. Asked from what leader progress the camera
  // should treat the race as its decisive phase, he chose the later, sharper end. The decisive
  // phase is now the last quarter of the leader's run instead of the last third: COMEBACK becomes
  // eligible later, so the shot it wins is a climb that is still resolving rather than one that
  // resolved a while ago. It also moved this key OFF the fallback-disagreement list — three files
  // carried a stale 0.75 while this said 0.65, and all three now READ this value rather than
  // copying it (LESSONS L207), so the slider, the diagnostic HUD and the game cannot disagree
  // again whatever it is set to next.
  outcomePhaseThreshold: 0.75,
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
  // ── START-ONE-WINDOW-1 — ONE CLOCK FOR THE START, AND IT IS TODAY'S SUM ──────────────────────
  //
  // THE OWNER'S DESIGN, 2026-08-21: the simplest possible start, with as little confusion as
  // possible, and the start setting on screen for at least ten seconds.
  //
  // THIS IS NOT A NEW NUMBER. It replaces two that were always added together and never written
  // down as one: a hard-coded `START_PHASE_DURATION` of 3000 ms of forced OVERVIEW, and
  // `postStartHoldMs` of 7000 ms of forced LEADER counted ON TOP of it. The window has always been
  // ten seconds; only its arithmetic was in two places, one of them unreachable from any slider.
  // The old key is deliberately RETIRED rather than renamed: the camera loader rebuilds the live
  // config key by key from these defaults, so a stored `postStartHoldMs` disappears by itself and
  // cannot shadow this one.
  //
  // WHAT THE WINDOW OWNS: the picture. No BATTLE and no other state may take it for this long —
  // that is exactly what the post-start hold protected, and it still does. What happens INSIDE it
  // is one rule, not three: the shot opens without panning until the leader reaches the place in
  // frame he holds for the rest of the race, and from that moment the camera follows him.
  startWindowMs: 10000,
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
  // ── THE RUN-IN'S OPENING, ITS OWN KEY (RUNIN-PACE-1, 2026-08-12) ──────────────────────────────
  // How long the camera takes to open the shot when the run-in engages. It sits here because it is
  // an ENDING control, beside the zoom-out it used to borrow.
  //
  // IT BORROWED `finishOverviewZoomOutDurationMs` FOR ONE DAY AND THAT WAS WRONG. The two are
  // different motions at different moments for different reasons: this one opens the shot BEFORE the
  // crossing so the finish comes into view, that one closes the race AFTER it. Coupling them meant
  // tuning either would move the other — and the owner has already accepted the post-crossing
  // zoom-out at its present length, so the borrowing put a settled value at risk to change an
  // unsettled one.
  //
  // 1250 ms is his number: "between 1 and 1.5 seconds would have been enough". The band below it is
  // 500 ms — the pace of an ordinary cut, which he called hectic — and above it the line arrives so
  // late that the shot has little of the run-in left to be wide for.
  runInOpenMs: 1250,
  // 2500 -> 3500 ON HIS EYE, 2026-08-11: _"die Anzeige ist zu kurz"_ — "the display is too short",
  // about the winner card. RAISING THE CARD ALONE WOULD HAVE DONE NOTHING, because the card's window
  // is `min(winnerCardMs, finishPauseMs)` and this was the binding half — so both moved together.
  // This is the ROOM; `winnerCardMs` below is the tenant.
  finishPauseMs: 3500, // ms pause after last racer finishes before leaderboard
  // ── THE HELD OVERVIEW (ENDING-HOLD-1) ─────────────────────────────────────────────────────────
  // Extra time on the settled finish picture AFTER the last racer is home, BEFORE `finishPauseMs`
  // starts running. The two are added, so the ending lengthens by exactly this and nothing else
  // moves — the winner card's window is still `min(winnerCardMs, finishPauseMs)` and does not grow.
  //
  // THE DEFAULT IS THE BEHAVIOUR HE ASKED FOR, 2026-08-12, in his words: _"Aber wenn der letzte ins
  // Ziel kommt sollte das Bild noch ein wenig stehen bleiben"_ — "but when the last one crosses the
  // line the picture should stand still a little longer". It shipped at 0 because the measurement
  // then said there was no WAIT to restore; that reading was right and beside the point. He is not
  // asking to watch arrivals, he is asking for a beat on the finished picture, and a key defaulting
  // to 0 does not give him one.
  //
  // WHY 1500 AND NOT ANOTHER NUMBER. It is HIS OWN BEAT — `podiumRevealBeatMs` below is 1500 because
  // he watched the podium at 700 and moved the slider there himself, so the ending keeps one rhythm
  // instead of gaining a second, unrelated one. And it is the number that makes the change legible:
  // the settled, CARD-FREE picture at the end is what actually grows here, because the winner card
  // is capped at `min(winnerCardMs, finishPauseMs)` = 3000 of the 3500 ms pause and does not inherit
  // this. That window goes from 500 ms to 2000 ms — a fourfold change, unmistakable in an eye test,
  // where 250 or 500 would be argued about.
  //
  // MEASURED end to end at this default (20 racers, shipped config): the ending from the last
  // crossing to a settled result screen is 11 370 ms against 9 870 at 0. On a race with a genuinely
  // far-behind straggler (Searound seed 9) the last crossing is unchanged — this key cannot move it,
  // it only follows it.
  //
  // ZERO STILL MEANS NO HOLD AT ALL and is still tested: no timer is scheduled and the arithmetic is
  // `0 + finishPauseMs`, which is exactly the ending that shipped before this key existed.
  //
  // WHAT IT IS STILL NOT: a way to watch racers come in. The zoom-out begins when the FIRST finishers
  // are home — his instruction, and unchanged here — so by the last crossing the pull-back is long
  // over. This buys a longer look at a SETTLED picture and nothing else. If he wants arrivals to
  // watch, the lever is the race, not the ending (PROJECT-PRINCIPLES §9).
  finishHoldAfterLastMs: 1500,
  // ── THE ENDING KEEPS ITS PICTURE (ENDING-PICTURE-1, 2026-08-12) ───────────────────────────────
  // TRUE = while the phase is FINISHED, the camera director keeps composing the shot. FALSE = the
  // pre-2026-08-12 behaviour, which replaced the director's transform with `{ zoom: 1, offsetX: 0,
  // offsetY: 0 }` on the frame the last racer crossed.
  //
  // WHAT THAT IDENTITY TRANSFORM ACTUALLY WAS: not a shot. On Searound it squeezed the whole
  // 3072x2048 world into the 1280x720 canvas; on a 6144-wide open track it left an 853x480 window
  // pinned at world (0,0) — 14% of the track's width, with the racers nowhere inside it. The owner
  // reported it as "the race view disappears as soon as the last racer crosses", and the hold he
  // had just asked for was holding exactly that.
  //
  // WHY THE DIRECTOR IS CONSULTED RATHER THAN THE LAST TRANSFORM FROZEN. Freezing was the other
  // candidate and it fails on timing: the zoom-out can still be IN FLIGHT at the last crossing (on
  // Searound seed 2814 it ends 50 ms after it), so freezing would stop the pull-back dead mid-move
  // and hold a half-finished one. Consulting lets the move finish and come to rest. It is safe by
  // construction — physics no longer steps in this phase, so the director sees a static field, and
  // `_inFinishMode` is absolute, so no new shot can be chosen.
  //
  // NOT AN ENGINE KEY: the director is asked for a transform on frames where it used to be ignored,
  // the race is over and no physics runs — so this key cannot move the WORLD fingerprint.
  //
  // IT NOW MOVES THE CAMERA FINGERPRINT, AND UNTIL 2026-08-13 IT COULD NOT (CAMERA-ENDING-WINDOW-1).
  // This comment used to say the key "cannot move any of the three fingerprints", and the reason it
  // gave was `camera-fingerprint.mjs` stopping at the last crossing — which was TRUE, and was a
  // BLIND SPOT rather than a property: the instrument whose whole job is to notice camera changes
  // could not see this one at all. Its window is now derived from `endingOnRaceScreenMs()` and
  // reaches the ending, so flipping this key moves CAMERA. Measured rather than argued — with it
  // false the instrument reproduces the pre-block value exactly, and `--ending-off` is that arm.
  endingKeepsFinishShot: true,
  // ── THE END-OF-RACE SPLASH IS RETIRED (ENDING-PICTURE-1, 2026-08-12) ──────────────────────────
  // FALSE = no splash. TRUE = the pre-2026-08-12 behaviour: a full-canvas `rgba(0,0,0,0.48)` scrim
  // with "RACE FINISHED!" in 80px gold and "Loading results…" beneath it, drawn over the race
  // picture for every frame of the ending.
  //
  // WHY IT GOES ENTIRELY RATHER THAN MOVING TO THE LAST MOMENTS. Both halves of it are now false.
  // Nothing is loading: `raceResults` is written to sessionStorage on the SAME FRAME the splash
  // first appears, so "Loading results…" describes a wait that does not exist. And the ending is no
  // longer an instant jump — it is a designed sequence that names the winner on a card, holds the
  // settled picture, and builds the podium up. A scrim over all of that contradicts every part of
  // it. Moving it to the last moments before navigation was considered and rejected as redundant:
  // the screen transition already fades to black there (`SCREEN_TRANSITION_MS`, a constant in
  // TransitionContext.jsx), so those moments are covered by something that fades rather than snaps.
  finishedSplashEnabled: false,
  finishOverviewLookbackPx: 300, // world-pixel distance before finish line where camera centers during FINISH_OVERVIEW
  // ── THE PODIUM IS BUILT UP (PODIUM-BUILD-1) ───────────────────────────────────────────────────
  // ONE beat. Everything the result screen's build-up does is a whole multiple of it, so the owner
  // can predict the whole sequence from this single slider: 3rd at 0, 2nd at one beat, the WINNER at
  // two — and then the winner is held for TWO beats, which is what makes him the moment rather than
  // the third item in a stagger. Everything below the podium settles in at four beats. Total = 4×.
  //
  // ZERO MEANS OFF, and that is the same escape hatch `finishPauseMs` above already offers: at 0 the
  // result screen appears complete and instantly, exactly as it did before this key existed. No
  // timer is scheduled and no class is ever put on an element, so "off" is an absence rather than a
  // fast animation.
  //
  // 700 -> 1500 ON HIS EYE, 2026-08-11, and the number is HIS rather than mine: he watched the
  // build-up on a production build, moved the slider himself, and reported where he landed. His
  // words are the evidence, so the original stays and the English goes beside it (CLAUDE.md's
  // quotation exception): _"das sieht nett aus, mir ging es zu schnell — ich habe auf 1500 ms
  // geändert, das wäre super als Default."_ — "that looks nice, it went too fast for me — I changed
  // it to 1500 ms, that would be great as the default."
  //
  // WHAT 700 GOT WRONG, stated so it is not re-proposed: it was derived from a FLOOR and then
  // shipped as if the floor were the answer. The floor is real and still holds — the podium slot's
  // own entrance animation (`podiumAppear` in ResultScreen.css) is 600 ms and the build-up REUSES it
  // rather than adding a second motion, so a beat under that overlaps two arrivals and reads as one
  // stagger. But "not a stagger" is the minimum for the sequence to be legible, not the tempo that
  // makes it ceremonious, and only his eye could tell the two apart.
  //
  // THE COST, so nobody discovers it later: total = 4 x beat = 6.0 s from the screen appearing to
  // the ranking settling, on top of `finishPauseMs`. That is deliberate and it is his call. The two
  // escape hatches are what make it affordable — any click or key press completes it at once, and 0
  // switches it off entirely.
  podiumRevealBeatMs: 1500,
  // ── THE WINNER CARD (WINNER-CARD-1) ───────────────────────────────────────────────────────────
  // The counterpart to the opening's brand card: the opening introduces the FIELD, the ending names
  // the WINNER — his race number, his name, his colour, over the race picture, in the brand's accent
  // where a brand is chosen. How long the card is on screen, fades included.
  //
  // IT LIVES INSIDE `finishPauseMs` AND CANNOT OUTLAST IT. The effective duration is
  // `min(winnerCardMs, finishPauseMs)`, clamped where it is read, so this key can never make the
  // ending longer — the pause above is the container and this is a tenant. Two consequences follow
  // and both are deliberate: `finishPauseMs: 0` means no card no matter what is set here, and
  // raising THIS beyond the pause buys nothing. If the card needs more room, the honest lever is the
  // pause, which the owner already owns one slider above.
  //
  // ⚠ RAISING THIS ALONE DOES NOTHING once it reaches `finishPauseMs` above. The window is
  // `min(winnerCardMs, finishPauseMs)`, so whichever is smaller decides — move the pause with it.
  //
  // 1800 -> 3000 ON HIS EYE, 2026-08-11: _"die Anzeige ist zu kurz"_ — "the display is too short".
  // The pause went 2500 -> 3500 in the same breath, because at 1800 the CARD's key was the binding
  // half and at 3000 the PAUSE would have become one.
  //
  // 3000 INSIDE A 3500 ms PAUSE: 450 ms in, ~2100 ms at full, 450 ms out (the fades are the opening
  // brand card's own 0.45 s, so the two cards share one language rather than each having a tempo),
  // and 500 ms of clean race picture before the screen fades to the podium. 900 ms at full was
  // enough to READ a number and a name and not enough to LOOK at them, which is what he saw.
  //
  // ZERO MEANS NO CARD AT ALL — not a zero-length fade. Nothing is scheduled and the component
  // renders null, so the race screen at 0 is the race screen before this key existed.
  winnerCardMs: 3000,
  // Photo-Finish (15a): when the first two finishers cross essentially together, show a tight
  // top-2 group shot with slow-motion instead of the single-winner drama pulse. Camera-only,
  // reuses the BATTLE arc-midpoint pan + group spriteScale and the render-loop slow-motion path.
  // photoFinishEnabled=false reproduces the classic single-winner finish exactly.
  photoFinishEnabled: true, // master switch for the photo-finish group shot
  photoFinishCloseThresholdT: 0.03, // max lap-normalized |t| gap between the top-2 finishers to count as "close" (same unit family as battlePulkThresholdT)
  photoFinishSlowmoFactor: 0.5, // physics slow-motion factor during the photo-finish shot (1.0 = normal, 0.5 = half speed)
  photoFinishLeadProgress: 0.97, // predictive gate: leader progress (fraction of finishT, 0..1) at which the one-shot close-check fires BEFORE the line
  // ── THE SHOT FRAMES ITS OWN PAIR (FINISH-PAIR-1, 2026-08-11) ──────────────────────────────────
  // TRUE = the PHOTO_FINISH guarantee keeps the two contenders the shot CAPTURED AT ENTRY in frame.
  // FALSE = the old behaviour: it keeps whoever is top-2 by `t` THIS FRAME.
  //
  // THE DEFAULT IS THE FIX, which is unusual here and deliberate: this is a defect the owner asked
  // to have fixed, not a taste he asked to be offered. The key exists so the old behaviour can be
  // put back, not so the fix has to be switched on.
  //
  // WHAT WAS WRONG. The shot follows a FIXED pair (`_photoFinishContenders`, captured once) while
  // the framing guaranteed a LIVE one (`_focusRacers`, the whole field re-sorted by `t` every
  // frame, finished racers included). Finished racers do not stop — `raceCore` coasts them on a
  // run-out decay — and because a later finisher has a fresher decay it OVERTAKES an earlier one,
  // so the second slot walks backwards through the finishing order. Every swap moved the pair
  // distance discontinuously, which moved the guarantee ceiling, which flipped the binding
  // authority between the guarantee and the state zoom, and the picture lurched.
  //
  // MEASURED on the owner's race (Searound, 20 racers, seed 2814), counting reversals of the
  // picture worth >= 60 screen px: 5 -> 2 here, 4 -> 2 on Mountainstreet and River Run, and no
  // change on the seven tracks that never had it. The pair distance on Searound was swinging
  // 90.4 -> 21.8 -> 93.9 px in single frames; one of those cost 1063 screen px in SIX frames.
  //
  // AND IT DOES NOT COST A CROPPED WINNER, which was the thing to fear — measured the other way
  // round. The eventual winner is in frame for 100% of the shot with this on, against 87-91% with
  // the live pair; on River Run the live pair had lost its OWN contenders off-frame for 93-98% of
  // the shot. A guarantee that keeps changing its mind protects nobody.
  //
  // HYSTERESIS WAS TRIED FIRST and is not here because it lost: holding a swap for 6/12/20/30/45
  // frames left Searound at 6 reversals — WORSE than the 5 it started with, because delaying a
  // discontinuity concentrates several small ones into fewer larger ones. It only matched pinning
  // at 240 frames (4 s), which is longer than the shot itself and therefore this same fix with a
  // knob whose only safe value is "longer than the shot".
  photoFinishContenderFraming: true,
  // ── THE RUN-IN IS COMPOSED AROUND THE FINISH LINE (RUNIN-OWNS-1, 2026-08-12) ──────────────────
  // TRUE = from `endgameThreshold` to the first crossing the finish line is a bound on the camera's
  // zoom, whatever shot the director is running. FALSE = the pre-2026-08-12 behaviour, where the
  // line was wherever it happened to fall.
  //
  // HIS DESIGN, in English: when the run-in begins, open far enough that the finish is visible, then
  // come back in continuously to the close shot — keeping the line in frame the whole way, so he can
  // see how much race is left and whether anyone still has a chance.
  //
  // IT OWNS THE FRAMING, NOT THE STATE SLOT, and that is the design rather than a detail. The run-in
  // does not compete with LEAD_CHANGE, BATTLE, COMEBACK or the photo finish for which shot is
  // running; it READS whichever one is running and bounds its zoom. An earlier shape made the run-in
  // a camera STATE that took the endgame slot, and it was wrong twice over: it owned only 14.9%
  // (Luger Hill) and 18.5% (Searound) of the window, because a shot entered just before the
  // threshold holds its own gate across it — and taking the slot at the line would have suppressed
  // the photo-finish slow motion outright, which RaceScreen triggers off `hudState`.
  //
  // TWO BOUNDS, NEITHER OF THEM A NEW NUMBER. The LINE, which drives the shot while the leader is
  // far away; and THE ACTIVE STATE'S OWN ZOOM, which is already the first term of the `Math.min`
  // every shot is composed with and therefore needed no code at all. So the run-in never tightens
  // past the shot underneath it: a leader shot closes to the leader zoom, a photo finish to the
  // photo-finish zoom.
  //
  // THE ZOOM IS DERIVED, NOT RAMPED. The line's requirement is `room / distance` — wide when the
  // finish is far, tightening by itself as the leader closes, no curve to tune and nothing to keep
  // in step with a track's length. As the leader arrives it relaxes past the state's own setting,
  // stops being the smallest term, and what is left is the shot that was always there.
  //
  // ── IT GLIDES FROM WIDE-AND-BACK TO THE ORDINARY SHOT (RUNIN-GLIDE-1, 2026-08-12) ────────────
  //
  // The owner's design, and both halves happen at once. ONE progress measure — the leader's
  // remaining distance to the line — drives the anchor placement AND the zoom, from the endgame
  // threshold to the crossing:
  //
  //   at engagement   the leader sits BEHIND centre, so most of the frame lies toward the finish
  //                   and the line fits at a modest zoom;
  //   as he closes    he travels back to his ordinary position while the shot tightens;
  //   at the crossing he is at `leaderForwardFrac` under the state's own zoom — the ordinary shot
  //                   exactly, so there is no seam to hand over.
  //
  // IT INVENTS NO NUMBER. The end of the travel is the state's own placement from the framing
  // table; the start is that placement MIRRORED about the centre. `leaderForwardFrac` already says
  // how far off centre a subject is placed, and this uses it twice. A CENTRED state does not move
  // at all — mirroring 0.5 gives 0.5 — which is why the photo finish keeps its own framing.
  //
  // THE ENGAGEMENT IS A GLIDE. Measured without it: the frame goes EMPTY for a handful of frames on
  // six of ten tracks, every one at run-in progress 0.006-0.016, while pan and zoom ease
  // independently out of the step. The glide moves them on ONE ease, which is what makes a large
  // zoom change safe here as everywhere else.
  //
  // IT RUNS ON `finishOverviewZoomOutDurationMs`, NOT the transition glide's duration. The owner
  // watched the pull-out in production and called it HECTIC at 500 ms, which is the pace of an
  // ordinary state change and not of an authored move. That key already means "how long an authored
  // zoom-out at the END OF THE RACE takes" — the same kind of move, in the same part of the race, at
  // the other end of it — so the two ends of the ending now run at one tempo. Measured: the opening
  // goes 0.5 s -> 2.9 s, and it is SHALLOWER as well as calmer (the widest frame falls on six of
  // the nine finishing tracks) because a slow ease never reaches a target that is already receding.
  // The price is the line's in-frame share, 93.3% -> 73.4%, and the line arriving 0.4 s -> 2.5 s
  // after the window opens.
  //
  // WHAT THIS REPLACED: an OVERVIEW-width cap and a delayed engagement. Both are gone — the run-in
  // composes from the endgame threshold again and the pull-out is whatever the line requires.
  runInShot: true,
  // ── THE ENDGAME AS A SCHEDULE, NOT A CEILING (ENDGAME-SCHEDULE-1, his spec of 2026-08-23) ─────
  //
  // FALSE = TODAY: hold the opening shot, then sweep once. He has rejected that shape twice — the
  // hold IS the endgame's entire width and it buys standstill rather than motion.
  //
  // TRUE = the shot is placed by a SCHEDULE that is moving through the whole phase and arrives
  // exactly at the crossing. Two smoothstep segments meeting at `endgameThreshold`:
  //   WIDEN  from the ordinary racing shot to the narrowest width that shows the winner AND the
  //          line, finishing AT the threshold — which is his requirement 1's deadline.
  //   CLOSE  from that width to the ACTIVE STATE'S OWN zoom, parameterised by race progress so it
  //          lands on the state's picture at the crossing — his requirement 2, and no new value.
  // Requirements 3 and 6 hold by construction: a smoothstep is C1, so the rate is continuous and
  // zero only at the turn and at the arrival, and the shot never reverses.
  // TRUE, ENDGAME-SCHEDULE-1, 2026-08-23. NOT MINTED — his eye is owed.
  //
  // MEASURED, nine scorable tracks, seed 9, his config -> the shipped defaults:
  //   STANDSTILL   43% -> 17% of the spec window (26% -> 18% shipped), and the number he actually
  //                complained about, the LONGEST static run, 2017 ms -> 550 ms on both arms.
  //   TIMING       winner and line both visible by 95% of the race: 0 of 9 tracks -> 9 of 9
  //                (8 of 9 shipped).
  //   ARRIVAL      worst error against the leader-view / photo-finish factor 48% -> 6%.
  //   WIDTH        widest endgame frame 6.1 -> 4.4 corridors (6.1 -> 5.4 shipped).
  //   SMOOTHNESS   worst |d2 ln(width)/dt2| 78.3 -> 13.3 (78.3 -> 22.0 shipped).
  //   MONOTONICITY 9 of 9 tracks, both arms — held by the ratchet in `_setTargets`.
  //   AND FEWER RACERS ARE CUT than today: contender-off-canvas frames 59 -> 35 (109 -> 33).
  runInSchedule: true,
  // ── THE CONTENDERS DECIDE THE ZOOM, THE CORRIDOR IS ONLY THE CEILING (CONTENDER-ZOOM-1) ────────
  // The owner's corrected rule for the photo finish, and it is the opposite way round from how a
  // corridor bound was first drafted: in a photo finish ALL of its participants must be visible and
  // WHOLE, the contenders decide how tight the shot may close, and the corridor width is a MAXIMUM
  // rather than a minimum — never wider than the track is wide, because the full width certainly
  // shows everyone, and if the full width is not needed the shot closes in further.
  //
  // TWO HALVES, AND ONLY ONE OF THEM COULD BE BUILT. The GUARANTEE half is here: the pair rule is
  // generalised to however many contenders the set holds, and the corridor becomes a cap on width.
  // The MEMBERSHIP half is NOT: `_photoFinishContenders` is captured as `slice(0, 2)`, and widening
  // it needs a definition of "abreast" that this project does not have. Measured, 26 of 27 photo
  // finishes have more than two racers within the entry gate's own threshold of the leader — a
  // median of 12 and up to 20 of 20 — so that threshold cannot serve as the membership rule. The
  // report states what a new number would be compensating for; it was not invented here.
  //
  // DEFAULT OFF, AND IT IS A MEASURED VERDICT RATHER THAN CAUTION. The cap does exactly what the
  // rule asks — it binds on 3955 of 7441 photo-finish frames across ten tracks and three seeds — and
  // it COSTS PARTICIPANTS: the share of frames with a level racer not whole goes 57.3% -> 82.7%.
  //
  // WHY, and it is the same geometry FRONT-GROUP-7 found from the other side: a corridor bound only
  // ever constrains ACROSS the track, but a zoom change moves BOTH directions. The participants are
  // strung out ALONG the road, so tightening to the road's width takes away the very room that was
  // holding them. "Showing the whole width certainly shows everyone" is false here: the finish
  // shot's binding dimension is longitudinal, and the corridor width cannot see it.
  //
  // Off restores the pre-2026-08-13 composition exactly — measured, both fingerprints byte-identical.
  contenderZoom: true,
  // ── AND THE CAP ARRIVES INSTEAD OF APPEARING (ZOOM-PACE-5) ────────────────────────────────────
  // How long the corridor cap takes to reach full strength once the photo-finish shot begins.
  //
  // WHAT IT COMPENSATES FOR, stated because a duration is the weaker of the two shapes tried. The
  // cap's scope is `state === PHOTO_FINISH`, which is a CUT by construction: it went from absent to
  // fully applied in one frame and took the target 2.47 -> 10.02, which is the whole of the "leap"
  // the owner objected to. The honest repair was to hang it on a continuous quantity instead — the
  // run-in's own progress — and that was BUILT AND MEASURED AND FAILED: the run-in composes during
  // OVERVIEW and LEADER_ZOOM too, so the cap escaped the finish shot and tightened mid-race states
  // (OVERVIEW's visibleCorridors 1.5 -> 0.469, caught by four tests). The scope has to stay a state,
  // so the onset needs a duration. This number is what that costs.
  //
  // 1500 ms: the 4x arrival spread over it gives about 0.9 halvings/s of visible width, against the
  // 2.9 the step delivered. Longer is calmer and spends more of the shot arriving.
  corridorCapArriveMs: 1500,
  // ── THE START CEREMONY (START-CEREMONY-CAMERA-1) ───────────────────────────────────────────────
  // The race opens on the whole track, held still, then eases in to the starting formation until it
  // is as large as it can be with every racer still in frame. Both ends are GEOMETRY and neither is
  // a setting: the venue shot is the track's own extent, and the target is the field's own extent
  // through `fieldGuarantee`. These numbers are the RHYTHM, which is the part that is taste.
  //
  // ── THE COUNTDOWN NO LONGER HAS A LENGTH OF ITS OWN (START-BOARD-2) ────────────────────────────
  // `countdownDurationMs` is GONE. It used to be a fixed 4000 ms that CAPPED the beats: when they
  // asked for more, all of them were scaled proportionally, so raising the push silently shortened
  // the venue shot and the settled beat and nothing said so. The countdown is now the SUM of the
  // beats — `ceremonyTotalMs` in startCeremony.js is the one place that adds them up, and the phase
  // advance, the camera, the digits and both fingerprint harnesses all ask it. Each slider below now
  // means exactly the beat it names.
  // ── THE BRAND CARD (CEREMONY-OPENING-1) ───────────────────────────────────────────────────────
  // The brand's logo and the chosen race name, before anything else. ZERO WHEN NO BRAND IS ACTIVE —
  // that is decided by the caller, not by this number, so the ceremony begins directly on the track
  // with no gap. 2500 ms is a starting value for his eye: long enough to read a name and register a
  // logo, short enough that it is a title rather than a wait. He will set it by slider.
  ceremonyBrandMs: 2500,
  // ── THE TRACK'S OWN MOMENT (CEREMONY-OPENING-1) ───────────────────────────────────────────────
  // 1400 → 3000. This is the beat the owner said he was missing, and 1400 ms was not a considered
  // choice for it: the board used to come up the instant it ended and stand through the whole push,
  // so the track never really had a moment of its own. It does now — the board waits until the
  // travel is finished. 3000 ms is a bit over one second longer than a glance, which is what
  // "look at the track" needs; his slider decides the rest.
  //
  // SETTING THIS TO ZERO REPRODUCES TODAY'S SHAPE as closely as the new order allows, and that is
  // deliberate — there is always a way back.
  ceremonyVenueMs: 3000,
  ceremonyPushMs: 2000,
  // ── THE SEARCHING TIME (CEREMONY-TIME-1) ──────────────────────────────────────────────────────
  // The formation held motionless, board GONE and no digits yet. It is a control, not a remainder:
  // CEREMONY-HANDOVER-1 made it one, and now that the countdown follows the beats there is no slack
  // left anywhere to quietly land in it.
  //
  // 600 → 4000 after the owner's searound eye test. The board teaches the number-to-name assignment
  // and this is when the viewer USES it — takes the number they just learned and finds it on the
  // track. At 600 ms the race started almost immediately after the board vanished, which made the
  // board itself close to pointless: it taught something nobody had time to apply. This time is ADDED
  // to the opening rather than taken out of it, which is what "the countdown follows the beats"
  // means.
  ceremonySettledMs: 4000,
  // ── THE DIGITS' OWN WINDOW (CEREMONY-TIME-1) ──────────────────────────────────────────────────
  // How long the 3-2-1 digits are on screen, at the very end. NOT a cap on anything: it is added to
  // the total like every other beat, and the camera does not know it exists. It exists because the
  // digits are derived from the phase's whole length, so before this they ran for the ENTIRE opening
  // — a longer ceremony just meant counting from a bigger number, and there was no such moment as
  // "before the countdown begins" for the searching time above to sit in.
  //
  // This is the one new key in CEREMONY-TIME-1, and it is why that block puts defaults.js in its
  // diff. Nothing about it can reach the race engine's arithmetic — but the guard is a reachability
  // hull, not a judgement, and it is right to report the key rather than argue with it.
  countdownDigitsMs: 3000,
  // ── THE RUNNERS' BOARD'S OWN DURATION (START-BOARD-2) ──────────────────────────────────────────
  // `max(startBoardFloorMs, startBoardMsPerName × n)`. The owner's shape, after his eye test at 40
  // racers: "in that time it is absolutely impossible to find your own racer."
  //
  // THE BOARD'S LENGTH AND THE CAMERA'S ARE DIFFERENT QUESTIONS, which is why this is not just a
  // longer push. The push is how long a good camera move takes — taste, fixed, and a crawling one is
  // worse than a short board. This is how long a field takes to READ, which scales with the field.
  // The camera therefore arrives on `ceremonyPushMs` and then HOLDS while the board finishes.
  //
  // BOTH TERMS ROUGHLY DOUBLED IN CEREMONY-TIME-1, after his second eye test on searound: the board
  // was STILL shown too briefly. The first pair (3000 / 80) came from a task model — one alphabetical
  // list, so finding a known name is a jump plus a short scan — and the model was optimistic. These
  // are STARTING VALUES for his eye, not measured truth; the two sliders below are what settle them.
  //
  // At 6000 / 120: 6.0 s at 8 racers and at 20 (the floor binds), 6.0 s at 40, 12.0 s at 100 — against
  // 3.2 s and 8.0 s before, and against the 1.46 s that failed his first eye test.
  startBoardFloorMs: 6000,
  startBoardMsPerName: 120,
  // ── LABEL-DEGRADE-1: the NAME on the track when there is room for it ───────────────────────────
  // The owner's idea: during the race, check per racer whether the NAME fits without overlapping
  // anything; show it if it does, fall back to the number when it does not. The decluttering's
  // existing asymmetry governs the switch — a racer must find its wide box completely free to gain
  // a name, and keeps it until the intrusion is decisive.
  //
  // DEFAULT OFF, ON MY OWN MEASUREMENT, and the numbers are in reports/night/LABEL-DEGRADE-1.md.
  // Shipping it on against them would have been the wrong call; the toggle is here so his eye can
  // overrule my arithmetic, which is the one thing it can legitimately do.
  labelNamesWhenRoom: false,
  // ── HOW LONG A NAME MUST BE EARNED FOR (LABEL-HOLD-1) ─────────────────────────────────────────
  // A label shows the NAME once its box has been clear of every other label and racer for this long
  // continuously; it gives the name up the instant it stops being clear. Promotion only — the
  // withdrawal is immediate and is not configurable, because a name over a racer is the defect the
  // whole feature exists to remove.
  //
  // 2000 -> 1200 ON HIS EYE. 2000 was the longest window still inside the previous rule's switch
  // band, which was a yardstick rather than a requirement; he watched it and said the number takes
  // very long to become a name. The cost of the shorter window is measured in
  // reports/night/LABEL-HOLD-1.md, and the slider is there so he can settle it without another
  // block.
  labelFormHoldMs: 1200,
  // Ease-in-out: begins at rest, gathers, arrives at rest. The countdown used ease-OUT cubic, which
  // starts at full speed — that reads as the camera catching up to something rather than as
  // ceremony. 'easeOutCubic' is on the list so the old feel can be put back beside the new one.
  ceremonyEasing: 'easeInOutCubic',
  // State overlay: narrative text shown during first seconds of OVERVIEW / BATTLE / COMEBACK.
  stateOverlayEnabled: true,
  stateOverlayDurationMs: 3500,
  maxStateDuration: 4000,
  battleMaxDurationMs: 6000,
  minStateHoldMs: 5000,
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
  //
  // 2026-08-06: raised 3 → 5 on the OWNER'S VERDICT. His eye overrules the measurement above, and
  // the measurement itself says why he can be right: the 3-beats-5 numbers were taken on a PACK
  // field, and he observed that on a SPREAD field the guarantee binds and widens a lot at 5 — the
  // case the sweep never covered.
  // This value is read by the camera AND render fingerprint harnesses, so it is a re-mint.
  //
  // SPREAD-FIELD-SWEEP, 2026-08-10: THE SWEEP IS NO LONGER OWED — see
  // reports/night/SPREAD-FIELD-SWEEP.md. It does NOT contradict 5, and it CORRECTS the sentence
  // above: on four of the five tracks where this setting acts at all, the guarantee binds in the
  // PACK, not on a spread field (mean 7.95 % of packed frames against 1.75 % of spread ones at 5).
  // Ice-track is the exception and binds more when strung out. So the old PACK measurement was
  // looking at the right case after all, and the reason given for re-measuring was itself wrong.
  // What the sweep does support: 5 acts about three times as often as 3, on the tracks where
  // anything acts, and more as the field grows. Nothing here is an argument for moving the value.
  //
  // MIN-RACERS-5, 2026-08-09: shipped. Two mirrors of this number were brought with it, because a
  // default of 5 answered by a fallback of 3 is the L199 trap rather than a second opinion —
  // `DEFAULT_MIN_RACERS_VISIBLE` in camera/framingConfig.js (the partial-config fallback) and the
  // Dev Screen slider, which now reads this object instead of carrying a literal at all.
  minRacersVisible: 5,
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
  // SCOREBOARD-CADENCE-1: how often the Live Standings list is rebuilt, in PHYSICS milliseconds.
  //
  // It is here rather than hard-coded because it is not a rendering detail — it is the one measured
  // cause of the missed frames (FRAME-GAP-3). Every tick hands React a fresh object for all hundred
  // rows, so all hundred re-render and re-order; hiding the list put the page on the frame-time
  // floor, while hiding the 25 Mpx background layer instead changed nothing at all.
  //
  // 500 rather than the 250 it was: half the ticks for a list that still reads as live. WHICH VALUE
  // IS RIGHT IS THE OWNER'S CALL, not a number to be derived — a standings list is a product surface
  // and how live it feels is a matter of taste, so this ships at 500 with a Dev Screen control and he
  // picks between 250, 500 and 1000 by eye.
  scoreboardIntervalMs: 500,
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

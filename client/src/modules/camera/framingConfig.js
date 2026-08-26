// ============================================================
// File:        framingConfig.js
// Path:        client/src/modules/camera/framingConfig.js
// Project:     RaceArena — CAMERA-HYGIENE-2
//
// WHAT THIS IS FOR: turning a raw camera config into the FRAMING numbers the director trusts —
// how wide each state's shot is, where the subject sits in frame, and how an entry is performed.
// Every default and every validation band for those settings lives here and nowhere else.
//
// WHAT IT IS NOT FOR: cam.zoom. Nothing here knows about the projection or the track width, so
// nothing here can produce a zoom. It hands back CORRIDORS — how much world is in shot, in
// standard corridors — and CameraDirector runs them through the one place a setting becomes a
// cam.zoom (`_computeZoomForCorridors`). Keeping those apart is what makes these bands testable
// without constructing a camera on a track.
//
// This is the sibling of cameraTimingComputation.js: that one resolves WHEN, this one resolves
// HOW WIDE and HOW. Both are pure, both are called on construction and again on live-apply.
//
// WHY THE BANDS REJECT RATHER THAN CLAMP. An out-of-range setting falls back to the default
// instead of being pulled to the nearest legal value. That is deliberate and it caught out the
// CAMERA-HYGIENE-1 control audit, which perturbed `glideDurationMs` 500 -> 251, watched the
// director ignore it, and reported a live control as dead. A rejecting band means a perturbation
// test must perturb INSIDE the band or it measures nothing.
// ============================================================

// MIRRORS-BY-REFERENCE: the fallbacks below read the canonical home instead of copying it. See LESSONS L207.
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

export const ALL_FRAMED_STATES = [
  'OVERVIEW',
  'LEADER_ZOOM',
  'LEAD_CHANGE',
  'BATTLE_ZOOM',
  'COMEBACK_ZOOM',
  'PHOTO_FINISH',
];

// CAMERA-REFERENCE-WIDTH-1 fallbacks, in STANDARD CORRIDORS across the frame, used when no config
// (or no cameraStateProfiles) reaches the director. They match DEFAULT_CAMERA_CONFIG so a
// bare-config director and a configured one frame the same shot. OVERVIEW is the widest;
// BATTLE/COMEBACK are tighter than LEADER; PHOTO_FINISH is the tightest. At the shipped 300 px
// reference LEADER is 225 world px — the picture the owner judged good on Searound.
export const DEFAULT_CORRIDORS = {
  OVERVIEW: 1.5,
  LEADER_ZOOM: 0.75,
  LEAD_CHANGE: 0.75,
  BATTLE_ZOOM: 0.55,
  // CAMERA-FRAMING-1: PHOTO_FINISH has its OWN setting. It used to borrow BATTLE's number, so the
  // most dramatic shot in the race was never any closer than an ordinary battle.
  COMEBACK_ZOOM: 0.55,
  PHOTO_FINISH: 0.4,
};

/** CAMERA-REFERENCE-WIDTH-1: world px per standard corridor when no config reaches the director. */
export const DEFAULT_REFERENCE_CORRIDOR_PX = DEFAULT_CAMERA_CONFIG.referenceCorridorPx;
/**
 * CAMERA-COMPANY-1: the anchor plus this many−1 others must stay in frame. <= 1 disables it.
 *
 * MIRRORS `DEFAULT_CAMERA_CONFIG.minRacersVisible`, which is the canonical home. This is the value a
 * PARTIAL-CONFIG caller gets — unit tests and any harness that builds a director without handing it
 * the shipped config — and it is deliberately a literal rather than an import, matching the
 * fallback convention used throughout this project (see the same wording in raceBehavior.js).
 *
 * MIN-RACERS-5: moved 3 → 5 IN STEP with the default. It was left at 3 when the default went to 5,
 * which is not a second opinion, it is the L199 trap: the shipped path and the fallback path would
 * have framed differently and only the fallback path is untested by the fingerprints. Nothing
 * guards this agreement — `check-config-keys` checks that a key EXISTS in the defaults, never that
 * a mirrored fallback still AGREES with it — so if you change one, change this one too.
 */
export const DEFAULT_MIN_RACERS_VISIBLE = DEFAULT_CAMERA_CONFIG.minRacersVisible;
/** The fraction of the frame a subject is kept inside — the safe region, not the whole canvas. */
export const DEFAULT_INNER_FRAME_PCT = DEFAULT_CAMERA_CONFIG.targetInnerFramePct;
/** The countdown opens twice as wide as OVERVIEW when nothing says otherwise. */
const DEFAULT_GLIDE_DURATION_MS = DEFAULT_CAMERA_CONFIG.glideDurationMs;

/**
 * Resolve the framing half of a camera config.
 *
 * @param {object|null} config
 * @returns {{
 *   referenceCorridorPx: number,
 *   corridorsByState: Record<string, number>,
 *   innerFramePct: number,
 *   minRacersVisible: number,
 *   transitionGrammar: 'cut'|'glide'|'legacy',
 *   glideDurationMs: number,
 *   leaderForwardFrac: number|null,
 *   leaderLateralMaxPx: number,
 *   leaderLateralMarginPx: number,
 * }}
 */
export function resolveFramingConfig(config) {
  const profiles = config?.cameraStateProfiles;
  const refCfg = config?.referenceCorridorPx;

  const corridorsByState = {};
  for (const state of ALL_FRAMED_STATES) {
    const v = profiles?.[state]?.visibleCorridors;
    corridorsByState[state] = Number.isFinite(v) && v > 0 ? v : DEFAULT_CORRIDORS[state];
  }

  // CAMERA-GRAMMAR-1 — the entry STYLE, and only that. Correctness (follow tracking, per-axis
  // screen mapping, zoom-about-anchor) is decoupled from it:
  //   'glide'  (shipped) pan AND zoom travel together on one bounded ease
  //   'cut'    pan AND zoom snap to the new subject's framing on frame 1
  //   'legacy' the bare-caller follow-lerp fallback, which is what an unknown value gets — so a
  //            typo degrades to the oldest, most forgiving behaviour rather than to nothing.
  const g = config?.cameraTransitionGrammar;
  const gd = config?.glideDurationMs;
  // CAMERA-FOCUS-3 leader forward-framing (the owner's "pack behind, leader forward"). Valid only
  // in (0.5, 0.8]: at or below 0.5 it is not forward, and above 0.8 the subject is at the frame
  // edge with nothing ahead of him. Out of band (including absent) means dead-centre.
  const lff = config?.leaderForwardFrac;
  // LEADER-LATERAL-BUILD-1 — the two numbers the leader's own lateral guarantee needs. Read from the
  // LEADER_ZOOM profile because that is the one state the rule runs in, and resolved HERE so a stored
  // config written before they existed still reaches the director with the shipped values (the
  // project has no schema and no migrations by standing rule — an absent key falls back, it does not
  // fault). Negative is meaningless for both, so out-of-band degrades to the default rather than to 0,
  // which would silently disable the bound that keeps the step from chasing an along-track loss.
  const lzp = profiles?.LEADER_ZOOM;
  const lmax = lzp?.leaderLateralMaxPx;
  const lmar = lzp?.leaderLateralMarginPx;
  const dflt = DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM;

  return {
    referenceCorridorPx:
      Number.isFinite(refCfg) && refCfg > 0 ? refCfg : DEFAULT_REFERENCE_CORRIDOR_PX,
    corridorsByState,
    innerFramePct: config?.targetInnerFramePct ?? DEFAULT_CAMERA_CONFIG.targetInnerFramePct,
    minRacersVisible: config?.minRacersVisible ?? DEFAULT_CAMERA_CONFIG.minRacersVisible,
    transitionGrammar: g === 'cut' ? 'cut' : g === 'glide' ? 'glide' : 'legacy',
    glideDurationMs: Number.isFinite(gd) && gd >= 300 && gd <= 900 ? gd : DEFAULT_GLIDE_DURATION_MS,
    leaderForwardFrac: Number.isFinite(lff) && lff > 0.5 && lff <= 0.8 ? lff : null,
    leaderLateralMaxPx: Number.isFinite(lmax) && lmax >= 0 ? lmax : dflt.leaderLateralMaxPx,
    leaderLateralMarginPx: Number.isFinite(lmar) && lmar >= 0 ? lmar : dflt.leaderLateralMarginPx,
  };
}

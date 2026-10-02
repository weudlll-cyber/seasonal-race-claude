// ============================================================
// File:        CameraDirectorCeremony.js
// Path:        client/src/modules/camera/CameraDirectorCeremony.js
// Project:     RaceArena — P1-CAMERADIRECTOR-SPLIT-1
//
// WHAT THIS IS FOR: the camera during the START CEREMONY — the countdown before the gun. The venue
// shot, the push in to the formation, the schedule of the ceremony's beats, and the framing the
// ceremony hands to the race (`_ceremonyHoldZoom`, `_fieldGuaranteeActive`, `_startFreezePoint`).
// The rhythm itself — beats, easing, the board's duration — is startCeremony.js, which this calls.
//
// WHY IT IS ITS OWN MODULE: it is the one part of the director that runs on a different clock and
// through a different entry point. `updateCountdown` is called INSTEAD of `update()` while the
// countdown runs, and nothing in the race-time state machine calls into it; the two halves meet
// only through the three fields named above. That made it a clean cut out of a 5,500-line file.
//
// WHAT IT IS NOT FOR: anything after the gun. The start WINDOW (the hold after the gun, the
// hand-over at the leader mark) stays in CameraDirector.js, because it is part of `_pickNextState`.
//
// HOW IT IS INSTALLED: exactly like CameraDirectorDiag.js — `Object.defineProperties` onto
// CameraDirector.prototype at the bottom of CameraDirector.js. Every method resolves `this.*`
// against a live director at call time, and the methods were moved VERBATIM: their bodies, their
// default arguments and their comments are what they were in the class. It does not import from
// CameraDirector.js, which keeps the dependency one-way.
// ============================================================

import { REFERENCE_CANVAS_W, REFERENCE_CANVAS_H } from './projection.js';
import { fieldGuarantee } from './framingRule.js';
import {
  ceremonySchedule,
  ceremonyZoom,
  ceremonyEasing,
  boardDurationMs,
} from './startCeremony.js';

// The same two names the director uses for its default canvas arguments, bound to the same one
// home (projection.js), so the moved default parameters read exactly as they did in the class.
const CANVAS_W = REFERENCE_CANVAS_W;
const CANVAS_H_REF = REFERENCE_CANVAS_H;

export const ceremonyMixin = {
  /**
   * THE VENUE SHOT — the whole track in frame (START-CEREMONY-CAMERA-1 (a)).
   *
   * Derived from the track's own extent, not from a corridor setting. The old countdown opened at
   * `countdownStartCorridors` (OVERVIEW × 2), a number in track WIDTHS, which says nothing about
   * whether the track is in shot: on a large world it fell short and on a small one it asked for
   * more world than exists.
   *
   * The cam.zoom that fits the world box is the smaller of the two axis fits, and the projection's
   * clamp has the last word. On a CLOSED track that clamp is not reached — `axisX` is
   * `canvasW / worldW` by construction, so the fit lands exactly on `minCamZoom` 1.0 and the whole
   * track is genuinely in frame.
   *
   * ON AN OPEN TRACK IT IS REACHED, AND THAT LIMIT IS WORTH NAMING RATHER THAN HIDING. The open
   * projection maps at a uniform OPEN_TRACK_BASE_ZOOM with `minCamZoom = worldFitX`, so the widest
   * shot it allows shows 1/1.5 of the world width — about 67%. The venue shot on an open track is
   * therefore "as wide as this camera can go", not "the whole world". Going wider would mean
   * changing the open-track projection, which would move every other shot with it.
   *
   * @returns {number} cam.zoom for the venue shot
   */
  _venueCamZoom(canvasW = CANVAS_W, canvasH = CANVAS_H_REF) {
    const proj = this._proj;
    const worldW = Math.max(1, this._worldBounds.maxX - this._worldBounds.minX);
    const worldH = Math.max(1, this._worldBounds.maxY - this._worldBounds.minY);
    const fit = Math.min(canvasW / (worldW * proj.axisX), canvasH / (worldH * proj.axisY));
    return proj.clampCamZoom(fit);
  },

  /**
   * THE TARGET — the largest cam.zoom at which EVERY racer is still in frame
   * (START-CEREMONY-CAMERA-1 (c)).
   *
   * It is `fieldGuarantee`: the one guarantee computation applied to the formation's own extent.
   * There is no track name, no field size and no constant in it — a small grid comes out tight and a
   * large one comes out wide because the two formations are different sizes.
   *
   * `innerFramePct` is applied, so "in frame" means the same safe region every other guarantee in
   * this camera means by it, rather than the literal canvas edge — a racer whose CENTRE is one pixel
   * inside the frame is cropped in the picture, and this is the project's existing answer to that.
   *
   * @returns {number} cam.zoom; the projection's clamp has the last word
   */
  _ceremonyTargetCamZoom(racers, centre, canvasW = CANVAS_W, canvasH = CANVAS_H_REF) {
    const ceiling = fieldGuarantee(
      racers,
      centre,
      this._proj.axisX,
      this._proj.axisY,
      canvasW,
      canvasH,
      this._innerFramePct
    );
    return this._proj.clampCamZoom(ceiling);
  },

  /**
   * THE CEREMONY'S SCHEDULE for this field — the one place its four beats and its total length are
   * decided (START-BOARD-2).
   *
   * PUBLIC, because three things outside the camera need the same answer and must not compute their
   * own: RaceScreen's phase advance (when the gun fires), the renderer (when the board is up and
   * what the digits read), and both fingerprint harnesses (how long to drive the countdown). The
   * previous arrangement had each of them reading a flat `countdownDurationMs`, which is how the
   * beats came to be capped by a number that knew nothing about them.
   *
   * @param {Array} racers  the field — its SIZE sets the board's duration
   */
  ceremonySchedule(racers) {
    return ceremonySchedule(
      this._ceremonyVenueMs,
      this._ceremonyPushMs,
      this._ceremonySettledMs,
      boardDurationMs(racers?.length ?? 0, this._startBoardFloorMs, this._startBoardMsPerName),
      // CEREMONY-TRUTH-1: THE FIFTH ARGUMENT, AND ITS ABSENCE WAS THE BUG. This call passed four,
      // so `countdownMs` took its default of 0 — and this schedule is what fires the gun, while the
      // renderer built its own WITH the digits. The renderer therefore opened the digit window at
      // `countdownStartMs`, which without the digits in the total is the same instant the gun fires.
      // Zero frames of countdown, from two schedules that were never compared.
      this._countdownDigitsMs,
      // CEREMONY-OPENING-1: the SIXTH argument, and it is zero unless somebody has said there is a
      // brand to show. The director cannot know that — a brand profile is storage, not camera — so
      // RaceScreen tells it once at race init through `setCeremonyBrandActive`. Left alone it is
      // false, which is what every headless harness wants: no brand, no card, no beat.
      this._ceremonyBrandActive ? this._ceremonyBrandMs : 0
    );
  },

  /**
   * Whether this race opens on a brand card. Set ONCE, at race init, by whoever knows.
   *
   * It is a setter rather than an argument to `ceremonySchedule` because five callers ask for that
   * schedule and only one of them has any idea what branding is; making them all carry the flag
   * would put the answer in five places and guarantee they disagree.
   */
  setCeremonyBrandActive(active) {
    this._ceremonyBrandActive = !!active;
  },

  /** The geometric centre of the formation — the point the ceremony frames on. */
  _formationCentre(racers) {
    let cx = (this._worldBounds.minX + this._worldBounds.maxX) / 2;
    let cy = (this._worldBounds.minY + this._worldBounds.maxY) / 2;
    if (racers && racers.length > 0) {
      cx = racers.reduce((s, r) => s + (r.x ?? cx), 0) / racers.length;
      cy = racers.reduce((s, r) => s + (r.y ?? cy), 0) / racers.length;
    }
    return { x: cx, y: cy };
  },

  /**
   * Camera update for the pre-race countdown phase — THE START CEREMONY.
   *
   * Three beats: the venue shot held still, an eased push in, and the formation held until the gun.
   * Both ends are geometry (`_venueCamZoom`, `_ceremonyTargetCamZoom`); this method owns only the
   * sequencing, and the rhythm lives in `startCeremony.js`.
   *
   * It sets this.zoom/offsetX/offsetY directly so the director is ready for the first RACING
   * update() without a visible jump — and it records the framing it arrives at, so the hold after
   * the gun keeps it (`_ceremonyHoldZoom`).
   *
   * @param {Array<{x:number,y:number}>} racers  All racers with world positions.
   * @param {number} ts  Current timestamp (used to keep stateEnteredAt in sync).
   * @param {number} countdownElapsed  ms since countdown start (0 … countdownDurationMs).
   * @param {number} countdownDurationMs  Total duration of the countdown in ms.
   * @param {number} canvasW  Canvas width in pixels.
   * @param {number} canvasH  Canvas height in pixels.
   * @returns {{ zoom: number, offsetX: number, offsetY: number }}
   */
  updateCountdown(racers, ts, countdownElapsed, canvasW, canvasH) {
    // START-BOARD-2: THE SCHEDULE IS DERIVED HERE, from the config and the size of the field, and
    // the countdown's length is its total. It used to be handed in as `countdownDurationMs` and used
    // as a CAP that rescaled the beats — so the caller and the beats were two authorities on one
    // length.
    //
    // ── THAT COMMENT CLAIMED ONE HOME AND THERE WERE TWO (CEREMONY-TRUTH-1) ──────────────────
    // It said "There is one now: `ceremonySchedule`, asked here and by everything else through
    // `ceremonyTotalMs`." Both halves were true and the conclusion was not: `renderRaceFrame` calls
    // the same PURE function with its own arguments, so the function had one home and the ARGUMENTS
    // had two. When CEREMONY-TIME-1 added a fifth beat it reached one call site and not the other,
    // and the difference between the two totals was exactly the length of the missing countdown.
    // The gun fired from this schedule at the instant the renderer was about to show "3".
    //
    // A shared function is not a single source of truth when its callers each assemble the inputs.
    // What makes it one is the test below the fix: the total the DIRECTOR reports and the total the
    // RENDERER derives are asserted to be the same number.
    const schedule = this.ceremonySchedule(racers);
    const duration = Math.max(1, schedule.totalMs);
    const elapsed = Math.min(duration, Math.max(0, countdownElapsed));

    // The centre comes FIRST, because the target zoom is measured from it: the field's extent is
    // only meaningful relative to the point the camera is centred on.
    const centre = this._formationCentre(racers);
    const cx = centre.x;
    const cy = centre.y;
    const venueZoom = this._venueCamZoom(canvasW, canvasH);
    const formationZoom = this._ceremonyTargetCamZoom(racers, centre, canvasW, canvasH);
    // THE PUSH IS MONOTONE OR IT IS NOTHING. Where the formation fills the world, or where the
    // open-track clamp already binds, the "push in" would otherwise be a push OUT and the ceremony
    // would play backwards.
    const targetZoom = Math.max(venueZoom, formationZoom);

    const zoom = ceremonyZoom(
      venueZoom,
      targetZoom,
      elapsed,
      schedule,
      ceremonyEasing(this._ceremonyEasing)
    );
    this.zoom = zoom;
    this.targetZoom = zoom;

    // THE FRAMING THE HOLD KEEPS (START-CEREMONY-CAMERA-1 (d)). Recorded every frame rather than
    // once at the end, so it is right however the countdown is entered or cut short — and it is the
    // ARRIVED framing rather than the live one, so a race that starts mid-push still holds the shot
    // the ceremony was travelling towards instead of freezing halfway.
    this._ceremonyHoldZoom = targetZoom;
    // ARM THE GUARANTEE. The ceremony has just shown every racer; the promise it made is that they
    // stay shown. It is armed here rather than at the gun so there is no frame between the two in
    // which it is not held — the gap the owner watched racers fall through.
    this._fieldGuaranteeActive = true;

    // CAMERA-PROJECTION-1: one centring computation per axis, from the projection. The former
    // open/closed branches were the same eight lines twice — open used one scale on both axes,
    // closed used bsX on X and bsY on Y. `effY == effX` on open, so this reduces to it exactly.
    // THE LIVE zoom, not the arrival zoom: the pan must be centred for the frame being drawn now,
    // or the formation would sit off-centre for the whole push and slide into place at the end.
    const effZoomX = this._proj.effX(zoom);
    const effZoomY = this._proj.effY(zoom);
    const camXMax = Math.max(this._worldBounds.minX, this._worldBounds.maxX - canvasW / effZoomX);
    const camX = Math.max(this._worldBounds.minX, Math.min(camXMax, cx - canvasW / (2 * effZoomX)));
    this.offsetX = -camX * effZoomX;
    const camYMax = Math.max(this._worldBounds.minY, this._worldBounds.maxY - canvasH / effZoomY);
    const camY = Math.max(this._worldBounds.minY, Math.min(camYMax, cy - canvasH / (2 * effZoomY)));
    this.offsetY = -camY * effZoomY;
    this.targetOffsetX = this.offsetX;
    this.targetOffsetY = this.offsetY;
    // START-ONE-WINDOW-1 — THE POINT THE START HOLDS. Captured every countdown frame, so the last
    // one wins and it is exactly what the ceremony left at the centre of the picture. Read back
    // through the projection rather than remembered from `cx`/`cy`, because those are the viewport's
    // top-left and the point that must not move is the centre.
    this._startFreezePoint = {
      x: (canvasW / 2 - this.offsetX) / effZoomX,
      y: (canvasH / 2 - this.offsetY) / effZoomY,
    };
    // Keep stateEnteredAt current so the first RACING update() sees a small stateAge.
    this.stateEnteredAt = ts;

    return { zoom: this.zoom, offsetX: this.offsetX, offsetY: this.offsetY };
  },
};

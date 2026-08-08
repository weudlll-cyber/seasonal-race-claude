// ============================================================
// File:        racerRendering.js
// Path:        client/src/screens/RaceScreen/drawing/racerRendering.js
// Project:     RaceArena
// Created:     2026-05-25
// Description: Canvas renderer for racers, name tags, and dust trails
//              in world coordinates.
//
//              THE LAYER ORDER IT OWNS, and it is load-bearing (START-FORMATION-1): every SPRITE
//              is drawn, and only then every NAME. Not sprite-then-name per racer — that is what
//              this used to do, and it meant a racer painted later in the list covered the name of
//              one painted earlier, with the list order (the racer index) silently deciding whose
//              name was readable. The owner's requirement for the start formation is that ALL
//              names are readable so a viewer can find their racer once; a name under a sprite
//              breaks it no matter how the labels themselves are laid out.
//
//              Which names are drawn at all is NOT decided here — nameTagLayout.js decides that in
//              screen space and this obeys it. This file owns only the order.
// ============================================================

import { lerp, lerpAngle } from '../../../utils/mathUtils.js';
// CLEANUP-BEFORE-NUMBERS-1: the label box's shape has ONE home, and it is nameTagLayout.js. These
// three numbers were re-typed here as literals, so the module that LAID OUT the box and the one that
// DREW it each owned a copy of the same rectangle.
import { labelBoxHeight, labelOffsetAbove, labelBoxWidth } from '../nameTagLayout.js';
import { raceNumberLabel } from '../../../modules/raceNumbers.js';

import { PHASE } from '../racePhase.js';
const PHASE_RACING = PHASE.RACING;

/**
 * Draws the name tag above a racer.
 *
 * CAMERA-TAGS-1: the label is UI, so it is drawn in SCREEN pixels. The old rule sized it in world
 * units as `max(8, round(11 / effZoom))` — the `/effZoom` was right (it is what keeps a world-drawn
 * label constant on screen) but `round()` collapsed it at high zoom and the `max(8, …)` added to
 * catch that then CLAMPED, so above effZoom 1.375 the label grew again: a 2.4x size difference
 * between tracks at one setting. Sizing in world units also SQUASHED the label vertically by up to
 * 16% on closed tracks, whose world->screen scale is anisotropic.
 *
 * Both go away by undoing the camera transform for the label alone: translate to the racer, scale by
 * (1/effX, 1/effY), and from there one unit IS one screen pixel. No rounding, no clamp, no squash.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} px  World X position.
 * @param {number} py  World Y position.
 * @param {string} name
 * @param {boolean} isLeader
 * @param {boolean} isComeback
 * @param {number} effX  world->screen scale on X at the current zoom
 * @param {number} effY  world->screen scale on Y
 * @param {number} fontPx  label font size in SCREEN px
 * @param {boolean} isRacing  True when phase === RACING (enables crown icon).
 * @param {number} racerScreenH  LABEL-OFFSET-1: the racer's DRAWN height in SCREEN px. The gap
 *        follows the racer, so this — not the font — sets how far above it the label sits.
 * @param {number} labelMarginPx  breathing space above the racer's top edge, in SCREEN px.
 */
function drawNameTag(
  ctx,
  px,
  py,
  name,
  isLeader,
  isComeback,
  effX,
  effY,
  fontPx,
  isRacing,
  racerScreenH,
  labelMarginPx
) {
  const bgH = labelBoxHeight(fontPx);
  const offsetY = labelOffsetAbove(racerScreenH, labelMarginPx);
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(1 / effX, 1 / effY); // one unit is now one screen pixel
  ctx.font = `bold ${fontPx}px sans-serif`;
  const nameW = labelBoxWidth(ctx.measureText(name).width);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(-nameW / 2, -offsetY - bgH, nameW, bgH);
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  ctx.fillStyle = isLeader ? '#ffd700' : isComeback ? '#00dd55' : '#eee';
  ctx.fillText(name, 0, -offsetY);
  if (isLeader && isRacing) {
    ctx.font = `${fontPx * 1.27}px serif`;
    ctx.textBaseline = 'bottom';
    ctx.fillText('👑', 0, -offsetY - bgH);
  }
  ctx.restore();
}

/**
 * Draws all racer sprites, trails, and name tags for one frame.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} st  Game state (g.current): racers, phase, focusFadeProgress, slowmoTs, lastTs.
 * @param {object} racerType  Racer type instance with drawRacer() method.
 * @param {{shown:Set<number>}} tagLayout  CAMERA-TAGS-1: which racers get a tag this frame, decided
 *        in screen space by nameTagLayout.computeTagLayout. The renderer only obeys it.
 * @param {number} battleFocusDarkening  Dim factor for non-group racers (from cameraConfig).
 * @param {string|null} hudState  CameraDirector.hudState (for comeback detection).
 * @param {number|null} comebackLockedIdx  CameraDirector.comebackLockedRacerIndex.
 * @param {number} focusFactor  st.focusFadeProgress ?? 0 (hoisted by caller).
 * @param {Array|null} livePulkGroup  Result of _detectPulkGroup (hoisted by caller), or null.
 * @param {boolean} showRpStartRowCfg  Whether to show row number in name tags.
 * @param {Map} assignmentByRacer  racer.index → { rowIndex } assignment map.
 * @param {number} effectiveScale  Sprite display scale.
 * @param {number} ezoom  Effective canvas zoom (X axis).
 * @param {number} ezoomY  Effective canvas zoom on Y (differs on closed tracks).
 * @param {number} tagFontPx  Name-tag font size in SCREEN px.
 * @param {number} racerScreenH  LABEL-OFFSET-1: the racer's DRAWN height in SCREEN px, from
 *        `drawnRacerScreenPx` on the Y axis. It must be the SAME number handed to
 *        `computeTagLayout`, or the decluttering reasons about boxes that are not where the labels
 *        get drawn — the two-homes failure `nameTagLayout` exists to prevent.
 * @param {number} labelMarginPx  Breathing space above the racer's top edge, in SCREEN px.
 * @param {number} renderAlpha  Render-interpolation alpha (0 = no interp).
 * @param {boolean} interpolationEnabled  Whether render interpolation is active.
 */
export function drawRacers(
  ctx,
  st,
  racerType,
  tagLayout,
  battleFocusDarkening,
  hudState,
  comebackLockedIdx,
  focusFactor,
  livePulkGroup,
  showRpStartRowCfg,
  assignmentByRacer,
  effectiveScale,
  ezoom,
  ezoomY,
  tagFontPx,
  renderAlpha,
  interpolationEnabled,
  highlightHeroes = false,
  gapDevMarker = false,
  racerScreenH = 0,
  labelMarginPx = 0
) {
  const leader = st.racers.reduce((a, b) => (b.t > a.t ? b : a));
  const inv = 1 / ezoom;
  const isRacing = st.phase === PHASE_RACING;
  const tagShown = tagLayout?.shown ?? null;
  // LABEL-DEGRADE-1: which of them earned the NAME rather than the number, decided by the layout.
  const tagWide = tagLayout?.wide ?? null;
  const doInterp = interpolationEnabled && isRacing;

  const isInComeback = hudState === 'COMEBACK_ZOOM';
  const comebackRacer =
    isInComeback && comebackLockedIdx != null
      ? st.racers.find((r) => r.index === comebackLockedIdx)
      : null;

  const battleGroupIndices = livePulkGroup
    ? new Set(livePulkGroup.map((r) => r.index).filter((i) => i != null))
    : null;

  function paintRacer(r, dimAlpha = 1) {
    const renderX = doInterp ? lerp(r._prevX ?? r.x, r.x, renderAlpha) : r.x;
    const renderY = doInterp ? lerp(r._prevY ?? r.y, r.y, renderAlpha) : r.y;
    const renderAngle = doInterp
      ? lerpAngle(r._prevAngle ?? r.angle, r.angle, renderAlpha)
      : r.angle;
    for (let i = 0; i < r.trail.length; i++) {
      const frac = (i + 1) / r.trail.length;
      ctx.globalAlpha = frac * 0.4 * dimAlpha;
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.trail[i].x, r.trail[i].y, (frac * 5 + 1) * inv, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = dimAlpha;
    const rIsComeback = r === comebackRacer;
    racerType.drawRacer(
      ctx,
      renderX,
      renderY,
      renderAngle,
      r,
      r === leader,
      st.slowmoTs ?? st.lastTs ?? 0,
      effectiveScale,
      rIsComeback
    );
    // Eye-test hero highlight (DevScreen → Camera Advanced → "Highlight heroes"). A colored ring:
    // green = normal choreographed hero (B1 comebacker/sovereign/faller), red = B2-attacker. OFF = no ring.
    if (highlightHeroes && r.isHeroChoreographed) {
      ctx.save();
      ctx.globalAlpha = dimAlpha;
      ctx.strokeStyle = r.isAttackerB2 ? '#ff3b30' : '#34c759';
      ctx.lineWidth = 3 * inv;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8 * inv;
      ctx.beginPath();
      ctx.arc(renderX, renderY, effectiveScale * 1.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Gap-cap re-roll DEV MARKER (DevScreen → "Gap-Reroll dev marker"). A brief cyan ring that fades over
    // ~500 ms at the instant a racer's re-roll was gap-biased — a dev-only cue to SEE where the mechanism
    // fires. Rendering-only, zero sim effect; r._gapBiasMarkAt is set (and this only draws) when enabled.
    if (gapDevMarker && r._gapBiasMarkAt != null) {
      const age = (st.physicsTs ?? 0) - r._gapBiasMarkAt;
      if (age >= 0 && age < 500) {
        ctx.save();
        ctx.globalAlpha = dimAlpha * (1 - age / 500);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3 * inv;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10 * inv;
        ctx.beginPath();
        ctx.arc(renderX, renderY, effectiveScale * (1.4 + 0.6 * (age / 500)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    r.trail.push({ x: renderX, y: renderY });
    if (r.trail.length > 10) r.trail.shift();
  }

  /**
   * START-FORMATION-1: the name tag, drawn in its OWN pass after every sprite.
   *
   * It reads the same interpolated position `paintRacer` drew the body at — deliberately
   * recomputed rather than cached from pass one, because a cache is a second source of truth for
   * where the racer is and the two would eventually disagree.
   *
   * `globalAlpha` is set here rather than inherited. In one pass the tag simply followed its own
   * racer's `dimAlpha`; across two passes the value left behind is the LAST racer's, so a tag that
   * did not set it would be dimmed by whoever happened to be painted last.
   */
  function paintTag(r, dimAlpha = 1) {
    const rIsComeback = r === comebackRacer;
    if (!tagShown?.has(r.index) && !rIsComeback) return;
    const renderX = doInterp ? lerp(r._prevX ?? r.x, r.x, renderAlpha) : r.x;
    const renderY = doInterp ? lerp(r._prevY ?? r.y, r.y, renderAlpha) : r.y;
    ctx.globalAlpha = dimAlpha;
    // RACE-NUMBERS-1: the track label is the racer's NUMBER by default. At most three characters,
    // which is the whole design — a label about one racer wide points at the racer under it, where a
    // 170 px name points at nothing a viewer can check (ROLL-CALL-PAIRING-1). The name is untouched
    // in the data and still feeds the tie-break and the coat.
    //
    // LABEL-DEGRADE-1: …unless the LAYOUT decided this racer's NAME fits without displacing
    // anything, in which case it says so in `tagLayout.wide`. The renderer does not re-decide: the
    // box the decluttering reasoned about is the box that gets drawn, which is the one-home rule
    // that `labelBoxWidth` exists to keep. A second opinion here would be a label drawn at a width
    // the layout never checked.
    const numberText = raceNumberLabel(r.raceNumber);
    const wideText = tagWide?.has(r.index) ? (r.name ?? '') : '';
    const tagName = wideText
      ? wideText
      : showRpStartRowCfg
        ? numberText + ' (R' + (assignmentByRacer.get(r.index)?.rowIndex ?? 0) + ')'
        : numberText;
    drawNameTag(
      ctx,
      renderX,
      renderY,
      tagName,
      r === leader,
      rIsComeback && r !== leader,
      ezoom,
      ezoomY ?? ezoom,
      tagFontPx,
      isRacing,
      racerScreenH,
      labelMarginPx
    );
  }

  // ── TWO PASSES, AND THE ORDER IS THE WHOLE POINT (START-FORMATION-1) ─────────────────────────
  // Every sprite first, every name second. Interleaved — sprite-then-tag per racer, which is what
  // this was — racer j paints over racer i's name whenever j comes later in the list, and at the
  // start formation that is not an edge case: measured across the four tracks the owner watched,
  // it covered 47.5% to 83% of all names at the full grid. The list order is the racer index, so
  // WHICH names were unreadable was decided by nothing at all.
  //
  // The cost, stated because "no cost" is not a claim worth trusting: one extra walk of the field
  // and one extra state write per label. No extra save/restore — drawNameTag already brackets its
  // own. Nothing else in the frame changes, and nothing here reads the camera.
  const dark = (battleFocusDarkening ?? 0.4) * focusFactor;
  const dimming = focusFactor > 0 && battleGroupIndices && battleGroupIndices.size > 0;
  const alphaOf = (r) => (dimming && !battleGroupIndices.has(r.index) ? 1 - dark : 1);

  for (const r of st.racers) paintRacer(r, alphaOf(r));
  for (const r of st.racers) paintTag(r, alphaOf(r));
  ctx.globalAlpha = 1;
}

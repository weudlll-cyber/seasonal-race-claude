// ============================================================
// File:        WinnerCard.jsx
// Path:        client/src/screens/RaceScreen/WinnerCard.jsx
// Project:     RaceArena — WINNER-CARD-1
//
// THE LAST THING THE RACE SHOWS, and it is deliberately the mirror of the first. `CeremonyBrandCard`
// opens on the brand and introduces the FIELD; this closes on the winner and NAMES him — race
// number, name, colour — so the ending answers the opening instead of just stopping. The podium's
// brand accent on the result screen is the third beat of the same arc, and all three take their
// colour from the same place, which is what makes them read as one idea rather than three.
//
// IT IS DOM, NOT CANVAS, for the reason `CeremonyBrandCard` gives: `renderRaceFrame` stays a pure
// function of a frame description, with no text layout and no fonts to load. The cost is stated
// rather than hidden — see "WHAT NO INSTRUMENT HERE CAN SEE" below.
//
// ── WHERE IT SITS, AND WHY THERE ─────────────────────────────────────────────────────────────────
// LOWER-LEFT, INSIDE THE CANVAS WRAPPER. Three things had to be avoided and each ruled out a region:
//
//   THE STANDINGS — ruled out structurally, not by geometry. The panel is an `<aside>` SIBLING of
//   `.race-canvas-wrapper`, so a card absolutely positioned inside the wrapper cannot reach it at
//   any size or viewport. That is the same guarantee `CeremonyBrandCard.css` already relies on, and
//   it is why this card is not a child of `.race-layout`.
//
//   THE WINNER IN THE FRAME — the camera is in FINISH_OVERVIEW, which centres the picture on the
//   finish line, so the subject is at or near the middle. The card is therefore a CORNER card and
//   not a full-width band: it claims a bounded box in one corner and leaves the centre alone.
//
//   THE TOP AND THE OTHER CORNERS — the event title and subtitle are drawn along the TOP of the
//   canvas (`drawTitle` / `drawTitleOpen`), and `BrandLogoOverlay` owns the BOTTOM-RIGHT. Of the
//   four corners exactly one is free, and it is also where a broadcast name-super has always gone.
//
// THE BOTTOM-CENTRE PILL IS NOT A COLLISION, and that is worth stating because it looks like one.
// `StateOverlay` sits at bottom-centre — but both of its channels are cleared the instant the phase
// leaves RACING, which is the same instant this card is fired. The pill empties as the card arrives.
//
// ── WHAT NO INSTRUMENT HERE CAN SEE ──────────────────────────────────────────────────────────────
// THE RENDER FINGERPRINT CANNOT CONFIRM THIS CARD. It records the canvas draw-call sequence, and
// this card is DOM over the canvas — it issues no `ctx.` call, so a hash that does not move is not
// evidence that the card is right, only that the picture underneath it is unchanged. That is the
// same blindness `CeremonyBrandCard` has and it is recorded in the same place. Component tests below
// cover what the card CLAIMS (the right winner, once, then gone); whether it looks good is the
// owner's eye and nothing else.
// ============================================================

import { raceNumberLabel } from '../../modules/raceNumbers.js';
import './WinnerCard.css';

/**
 * How long the card takes to fade, each way. It MIRRORS `WinnerCard.css`'s 0.45 s transition and is
 * exported so the race screen can start the fade-out early enough for it to have finished before the
 * navigation — a duration the screen must know but must not own a second opinion about.
 *
 * It is NOT a config key, deliberately. It is the length of a movement copied from the opening card
 * so the race begins and ends alike; making it a slider would invite the two ends to drift apart,
 * and there is already one key for how long the card is up.
 */
export const WINNER_CARD_FADE_MS = 450;

/**
 * THE CONTRACT, as one function: how long the card is actually on screen.
 *
 * `min(key, pause)` and nothing else. The card is a TENANT of `finishPauseMs`, so no value of its
 * own key can make the ending longer — which is the promise this feature was built under, and a
 * promise buried in the middle of a 1600-line race loop is one nobody can check. It lives here, next
 * to the card it governs, and `WinnerCard.test.jsx` tests it as arithmetic.
 *
 * A non-finite or negative input from a hand-edited config reads as OFF rather than as a default:
 * this is presentation, and the safe failure is no card.
 */
// The window rule is this card's CONTRACT and belongs beside the card that has to honour it; moving
// it to a module of its own would buy fast-refresh DX at the cost of the one-home rule. Same
// judgement, and the same kind of reason, as `useFadeNavigate` in TransitionContext.jsx.
// eslint-disable-next-line react-refresh/only-export-components -- co-located by design, see above
export function winnerCardWindowMs(cardMs, pauseMs) {
  const a = Number.isFinite(cardMs) && cardMs > 0 ? cardMs : 0;
  const b = Number.isFinite(pauseMs) && pauseMs > 0 ? pauseMs : 0;
  return Math.min(a, b);
}

/**
 * @param {object} p
 * @param {{name:string, raceNumber:number|null, color:string|null}|null} p.winner  the racer who
 *   won, or null for no card at all. Read from the finished field on the race screen — this
 *   component derives nothing and computes no place.
 * @param {string|null} p.accentColor  the brand's primary colour, or null to fall back to the
 *   podium's gold. The SAME choice the result screen's `--result-brand-1` makes, so the card and the
 *   podium accent are one colour language rather than two that happen to agree.
 * @param {boolean} p.visible  whether the card is inside its window. Driven entirely by the race
 *   screen's one timer; this component owns no clock.
 */
export default function WinnerCard({ winner, accentColor, visible }) {
  if (!winner?.name) return null;
  return (
    <div
      className={`winner-card${visible ? ' winner-card--in' : ''}`}
      style={accentColor ? { '--winner-accent': accentColor } : undefined}
      data-testid="winner-card"
      aria-hidden="true"
    >
      <div className="winner-card__label">Winner</div>
      <div className="winner-card__racer">
        {winner.raceNumber != null && (
          // The racer's OWN colour, and it is on the number rather than on the frame on purpose: the
          // frame is the BRAND's accent, and two colours competing for the same edge would read as a
          // gradient instead of as two facts.
          <span
            className="winner-card__number"
            style={winner.color ? { background: winner.color } : undefined}
          >
            {raceNumberLabel(winner.raceNumber)}
          </span>
        )}
        <span className="winner-card__name">{winner.name}</span>
      </div>
    </div>
  );
}

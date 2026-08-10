// ============================================================
// File:        CeremonyBrandCard.jsx
// Path:        client/src/screens/RaceScreen/CeremonyBrandCard.jsx
// Project:     RaceArena — CEREMONY-OPENING-1
//
// THE FIRST THING THE RACE SHOWS: the brand's logo, large, with the chosen race name. The owner's
// words: *"At the very beginning of the race, show the brand logo — if a brand was chosen — and the
// race name that was chosen. Only then the whole track, and only then the starter list."*
//
// IT IS DOM, NOT CANVAS, and that is a decision rather than convenience. The logo is already an
// `<img>` the branding profile owns (`BrandLogoOverlay` draws the same source), and drawing it into
// the canvas would mean loading it into an `Image`, caching it, and handling the frames before it
// arrives — a whole loading path for one card. As DOM it reuses the element that already works, and
// `renderRaceFrame` stays what it is: a pure function of a frame description with no image loading
// in it. The card therefore does not move the RENDER fingerprint by itself; the SCHEDULE it belongs
// to does, because every later beat now starts later.
//
// WHEN THERE IS NO BRAND THERE IS NO CARD AND NO BEAT. Not a zero-length hold, not a blank frame:
// `ceremonyScheduleFor` is given a brand duration of zero, every later beat starts that much
// earlier, and this component renders null. The owner asked for exactly that — "if a brand was
// chosen" — and a ceremony that pauses on nothing for a moment is worse than one that starts.
//
// IT COVERS THE TRACK ON PURPOSE. The camera holds the venue shot underneath (see `ceremonyZoom`),
// so when the card fades the track is already framed and still — the overview begins on a settled
// picture rather than lifting a card off a moving one.
// ============================================================

import './CeremonyBrandCard.css';

/**
 * @param {object} p
 * @param {{logo:string, eventName?:string}|null} p.brand  the active profile, or null for no card
 * @param {string|null} p.raceName  the race name the operator chose for THIS race — it wins over the
 *   profile's own event name, because it is the more specific answer to "what is this race called".
 * @param {boolean} p.visible  whether the ceremony is inside the brand beat
 */
export default function CeremonyBrandCard({ brand, raceName, visible }) {
  if (!brand?.logo) return null;
  const title = raceName || brand.eventName || '';
  // A profile whose subtitle repeats the race name prints the same words twice, one above the other.
  // Seen immediately in the first browser run, on a perfectly ordinary profile.
  const subtitle =
    brand.subtitle && brand.subtitle.trim().toLowerCase() !== title.trim().toLowerCase()
      ? brand.subtitle
      : null;
  return (
    <div className={`ceremony-brand${visible ? ' ceremony-brand--in' : ''}`} aria-hidden="true">
      <img className="ceremony-brand__logo" src={brand.logo} alt="" />
      {title && <div className="ceremony-brand__title">{title}</div>}
      {subtitle && <div className="ceremony-brand__subtitle">{subtitle}</div>}
    </div>
  );
}

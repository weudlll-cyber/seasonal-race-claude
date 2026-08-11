// ============================================================
// File:        BrandLogoOverlay.jsx
// Path:        client/src/screens/RaceScreen/BrandLogoOverlay.jsx
// Project:     RaceArena
// Created:     2026-06-12
// Description: Bottom-right corner logo overlay — shows the active branding
//              profile's logo image during a race. Renders null when no active
//              profile or the profile has no logo.
// ============================================================

import { useActiveBrandProfile } from '../../modules/branding/useActiveBrandProfile.js';
import './BrandLogoOverlay.css';

// COORD-SYSTEM-1: the corner offsets are percentages, so the box lands on the CANVAS ruler that
// what is drawn inside the canvas already uses (Minimap, HUD text). `calc(16 / 1280 * 100%)` and
// `calc(16 / 720 * 100%)` are EXACTLY 16 canvas px — no rounded-percentage drift — matching the
// shipped 16-CSS-px offset at scale 1.0 and staying 16 canvas px at every other scale.
const CORNER_STYLES = {
  'bottom-right': {
    bottom: 'calc(16 / 720 * 100%)',
    top: 'auto',
    right: 'calc(16 / 1280 * 100%)',
    left: 'auto',
  },
  'top-right': {
    top: 'calc(16 / 720 * 100%)',
    bottom: 'auto',
    right: 'calc(16 / 1280 * 100%)',
    left: 'auto',
  },
};

export default function BrandLogoOverlay() {
  const profile = useActiveBrandProfile();

  if (!profile?.logo) return null;

  const corner = CORNER_STYLES[profile.logoCorner] || CORNER_STYLES['bottom-right'];

  return (
    <div className="brand-logo-overlay" style={corner}>
      <img
        src={profile.logo}
        alt={profile.eventName}
        className="brand-logo-overlay__img"
        style={{
          opacity: profile.logoOpacity ?? 0.9,
          maxHeight: (profile.logoMaxHeight ?? 90) + 'px',
        }}
      />
    </div>
  );
}

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

const CORNER_STYLES = {
  'bottom-right': { bottom: '16px', top: 'auto', right: '16px', left: 'auto' },
  'top-right': { top: '16px', bottom: 'auto', right: '16px', left: 'auto' },
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

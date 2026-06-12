// ============================================================
// File:        BrandLogoOverlay.jsx
// Path:        client/src/screens/RaceScreen/BrandLogoOverlay.jsx
// Project:     RaceArena
// Created:     2026-06-12
// Description: Bottom-right corner logo overlay — shows the active branding
//              profile's logo image during a race. Renders null when no active
//              profile or the profile has no logo.
// ============================================================

import { useStorage } from '../../modules/storage/useStorage.js';
import { KEYS } from '../../modules/storage/storage.js';
import { DEFAULT_BRANDING, DEFAULT_ACTIVE_SESSION } from '../../modules/storage/defaults.js';
import './BrandLogoOverlay.css';

export default function BrandLogoOverlay() {
  const [brandingProfiles] = useStorage(KEYS.BRANDING, DEFAULT_BRANDING);
  const [activeSession] = useStorage(KEYS.ACTIVE_SESSION, DEFAULT_ACTIVE_SESSION);

  const id = activeSession?.activeBrandingProfileId;
  const profile = id ? (brandingProfiles.find((p) => p.id === id) ?? null) : null;

  if (!profile?.logo) return null;

  return (
    <div className="brand-logo-overlay">
      <img
        src={profile.logo}
        alt={profile.eventName}
        className="brand-logo-overlay__img"
        style={{ opacity: profile.logoOpacity ?? 0.9 }}
      />
    </div>
  );
}

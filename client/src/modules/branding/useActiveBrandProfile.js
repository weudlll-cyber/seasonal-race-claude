// ============================================================
// File:        useActiveBrandProfile.js
// Path:        client/src/modules/branding/useActiveBrandProfile.js
// Project:     RaceArena
// Description: Hook and pure resolver for the currently-active branding profile.
// ============================================================

import { useStorage } from '../storage/useStorage.js';
import { KEYS } from '../storage/storage.js';
import { DEFAULT_BRANDING, DEFAULT_ACTIVE_SESSION } from '../storage/defaults.js';

// Single source of truth for "which branding profile is active". Pure — no I/O.
export function resolveActiveBrandProfile(profiles, activeSession) {
  const id = activeSession?.activeBrandingProfileId;
  return id ? (profiles?.find((p) => p.id === id) ?? null) : null;
}

// Reactive hook: re-resolves whenever branding storage changes.
// NOTE: RaceScreen deliberately does NOT use this hook — branding must not change
// mid-race, so it reads a one-shot snapshot at mount via resolveActiveBrandProfile().
export function useActiveBrandProfile() {
  const [profiles] = useStorage(KEYS.BRANDING, DEFAULT_BRANDING);
  const [activeSession] = useStorage(KEYS.ACTIVE_SESSION, DEFAULT_ACTIVE_SESSION);
  return resolveActiveBrandProfile(profiles, activeSession);
}

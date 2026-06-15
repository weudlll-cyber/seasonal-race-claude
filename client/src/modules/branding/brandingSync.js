// ============================================================
// File:        brandingSync.js
// Path:        client/src/modules/branding/brandingSync.js
// Project:     RaceArena
// Description: Server-mirror helper for KEYS.BRANDING. syncBrandingMirror()
//              fetches all brands from the server, maps logoFile → logo URL,
//              and writes the result to localStorage (KEYS.BRANDING).
//              On server error the existing mirror is preserved — stale-on-error,
//              no crash for consumers.
// ============================================================

import { API_BASE_URL } from '../../services/api.js';
import { fetchBrands } from '../../services/brandApi.js';
import { storageSet, KEYS } from '../storage/storage.js';

/**
 * Fetches all brands from the server and writes them as a synchronized mirror
 * to KEYS.BRANDING in localStorage. logoFile is mapped to an absolute URL so
 * existing <img src> consumers work without change.
 *
 * Idempotent — safe to call on every authenticated page load and after any
 * brand mutation.
 */
export async function syncBrandingMirror() {
  try {
    const brands = await fetchBrands();
    const mirrored = brands.map((brand) => ({
      ...brand,
      logo: brand.logoFile ? `${API_BASE_URL}/api/brands/${brand.id}/logo` : '',
    }));
    storageSet(KEYS.BRANDING, mirrored);
  } catch (err) {
    console.warn('[branding] syncBrandingMirror failed — keeping stale mirror:', err.message);
  }
}

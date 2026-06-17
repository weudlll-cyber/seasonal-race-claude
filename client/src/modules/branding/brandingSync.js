// ============================================================
// File:        brandingSync.js
// Path:        client/src/modules/branding/brandingSync.js
// Project:     RaceArena
// Description: Server-mirror helper for KEYS.BRANDING. syncBrandingMirror()
//              fetches all brands + their logo bytes, maps logoFile → Data-URL
//              in the mirror so logos render offline from a stale mirror.
//
//              Per-brand logo fallback: if a logo fetch fails the mirror stores
//              the server URL instead, so live sessions still display the logo.
//
//              Two-stage quota fallback:
//                1. Write data-URL mirror (preferred — works offline).
//                2. If quota exceeded, write URL-only mirror (requires live server).
//                3. If both fail, keep stale — never corrupt an existing mirror.
//
//              Stale-on-error: a total fetchBrands failure preserves the prior
//              mirror (including any Data-URLs) — offline logos keep displaying.
// ============================================================

import { API_BASE_URL } from '../../services/api.js';
import { fetchBrands } from '../../services/brandApi.js';
import { storageSet, KEYS } from '../storage/storage.js';

// Defense-in-depth: upload limit is 10 MB but we cap the data-URL mirror entry
// at 3 MB to guard against unexpectedly large logos in localStorage.
const MAX_LOGO_DATAURL_BYTES = 3 * 1024 * 1024;

// NOTE: similar blob→Data-URL logic exists in trackLoader._cacheBackgroundAsync.
// Not merged here (L140 — different call sites, different lifecycle); worth a
// shared util if a third consumer appears.
async function _fetchLogoDataUrl(brandId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/brands/${brandId}/logo`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size > MAX_LOGO_DATAURL_BYTES) return null;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Fetches all brands + logo bytes from the server and writes them as a
 * synchronized mirror to KEYS.BRANDING in localStorage.
 * logoFile is mapped to a Data-URL (offline-safe) with a server-URL fallback.
 *
 * Idempotent — safe to call on every authenticated page load and after any
 * brand mutation.
 */
export async function syncBrandingMirror() {
  try {
    const brands = await fetchBrands();

    // Fetch all logos in parallel — best-effort, _fetchLogoDataUrl never throws.
    const logoResults = await Promise.allSettled(
      brands.map((b) => (b.logoFile ? _fetchLogoDataUrl(b.id) : Promise.resolve(null)))
    );

    // Build data-URL mirror with per-brand server-URL fallback.
    const dataUrlMirror = brands.map((b, i) => {
      const dataUrl = logoResults[i].status === 'fulfilled' ? logoResults[i].value : null;
      const logo = dataUrl ? dataUrl : b.logoFile ? `${API_BASE_URL}/api/brands/${b.id}/logo` : '';
      return { ...b, logo };
    });

    // Stage 1: write data-URL mirror (preferred).
    if (storageSet(KEYS.BRANDING, dataUrlMirror)) return;

    // Stage 2: quota exceeded — fall back to URL-only mirror.
    const urlMirror = brands.map((b) => ({
      ...b,
      logo: b.logoFile ? `${API_BASE_URL}/api/brands/${b.id}/logo` : '',
    }));
    if (storageSet(KEYS.BRANDING, urlMirror)) {
      console.warn('[branding] logo data-URL mirror exceeded quota — fell back to URL mirror');
      return;
    }

    // Stage 3: both writes failed — keep stale.
    console.warn('[branding] branding mirror write failed — keeping stale');
  } catch (err) {
    console.warn('[branding] syncBrandingMirror failed — keeping stale mirror:', err.message);
  }
}

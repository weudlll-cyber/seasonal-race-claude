// ============================================================
// File:        websiteLegalPages.js
// Path:        client/src/modules/legal/websiteLegalPages.js
// Project:     RaceArena — GOING-ONLINE-PREP-1 piece 2 (the owner's decision D3 of 2026-11-13)
// Created:     2026-11-13
// Description: THE ONE HOME of where the Seasonal Entertainment website serves its legal pages.
//              In website mode (SITE_MODE, modules/runtimeMarker.js) the website's legal pages
//              apply, so the race's footer links to these paths and the race's own /legal-notice
//              and /privacy routes send the visitor here (components/LegalFooter,
//              screens/Legal/LegalPage.jsx). Standalone never reads this module's paths.
//
// ── WHERE THE PATHS COME FROM (the website, read-only, master 0d61ce5) ─────────────────────────
// The website's Imprint and Privacy are info pages: `LEGAL_NAV` in client/src/app/navigation.js
// (lines 55-61) links "/info/imprint" and "/info/privacy", served by the route "info/:slug"
// (client/src/app/App.jsx:105); server/src/info/seed.js:32-37 seeds the two slugs. The website runs
// at the origin's root and the race under it ("/games/race"), so these are ROOT paths on the same
// origin — NOT under the race's base path, and therefore plain links, never router links (a router
// link would put the race's basename in front).
// ============================================================

/** The website's legal pages, keyed like the race's own (LegalPage's `kind`). */
export const WEBSITE_LEGAL_PATHS = Object.freeze({
  legalNotice: '/info/imprint',
  privacyPolicy: '/info/privacy',
});

# MORNING-GOING-ONLINE-PREP-1 — preparing the first online install (website mode)

**Branch:** `feat/going-online-prep`, from master `7dac27be` (2026-11-13). Nothing is merged.
**What the owner decided (2026-11-13), recorded in [docs/BACKLOG.md](../../docs/BACKLOG.md):**

- D1: website mode on the Contabo server, with no domain or certificate of its own.
- D2: the security contact address.
- D3: the website's legal pages in website mode.
- D4: off-server backup copies to OneDrive.
- D5: the SSH check, done once.
- D6: the first real install comes last.

Standalone at "/" is to stay exactly as today. At every fork in the work, today's standalone
behaviour is kept and the fork is noted below.

| Piece | State |
| --- | --- |
| 1 — SECURITY.md contact (D2) | **done** — `d89af282`, pushed |
| 2 — legal pages in website mode (D3) | **done** — see below, pushed |
| 3 — backup copies to OneDrive via rclone (D4) | in progress |
| 4 — the GOING ONLINE row (D1, D6) | not started |
| END — verify, rebuild, servers | not started |

## Piece 1 — SECURITY.md

- SECURITY.md lists two channels: the e-mail first, then GitHub's private vulnerability reporting.
- D1-D6 are recorded, dated, at the head of BACKLOG's *Delivering to someone else* section.
- The SECURITY.md row moved to PART TWO.
- OPEN.md goes from four rows to three.
- CHANGELOG has a new entry.
- Guards: check-doc-links 0 dangling; check-index 0 unindexed; engine-reach none of 5 paths.

## Piece 2 — the facts found

**The race (master `7dac27be`):**

- **The footer, the one component:** `client/src/components/LegalFooter/LegalFooter.jsx`.
  - Before this piece, its router links went to `/legal-notice` and `/privacy`, each shown only when
    the operator had filled the text in (`hasText`).
  - It is drawn on:
    - the sign-in page: `client/src/screens/Auth/LoginScreen.jsx:41` (website mode) and `:132`
      (password form);
    - the join page: `client/src/screens/Join/JoinPage.jsx:207`;
    - the setup screen: `client/src/screens/SetupScreen/SetupScreen.jsx:1991`.
- **The race's own pages:**
  - the routes: `client/src/App.jsx:172-173` (`/legal-notice`, `/privacy`), public, outside
    `ProtectedRoute`;
  - the page: `client/src/screens/Legal/LegalPage.jsx`;
  - the text comes from the public `GET /api/settings/legal-pages` (`server/src/routes/settings.js:10`,
    `server/src/settings/legalPages.js`);
  - it is edited in Dev Screen → *Legal pages* (`client/src/screens/DevScreen/sections/LegalPagesSection.jsx`).
- The server serves no legal page of its own: it answers the app shell for every route.

**The website** (`seasonal-entertainment`):

- It was read only. It was cloned into `C:/tmp/ra-refs`, a scratch folder outside OneDrive, and fetched
  to master `0d61ce5`, which contains `da618e7`. Nothing was edited or pushed there.
- Its Imprint and Privacy are **info pages**:
  - `client/src/app/navigation.js:55-61`, `LEGAL_NAV`, links `/info/imprint`, `/info/privacy` and
    the disclaimer;
  - they are served by the route `info/:slug` (`client/src/app/App.jsx:105`);
  - the two slugs are seeded as drafts (`server/src/info/seed.js:32-37`);
  - the sidebar draws the links (`client/src/app/Sidebar.jsx:196`).
- The website runs at the origin's root, so from the race these are root paths on the same origin.
- **`docs/GAME-INTEGRATION.md` and `docs/EMBED.md` say nothing about a game's legal pages.** Searched
  for legal, imprint, privacy and footer: the only hit is EMBED.md:16, about the chat page having no
  footer. Nothing says a game must not duplicate them, so **the race's routes redirect** rather than
  answer 404.

## Piece 2 — what was built

- **`client/src/modules/legal/websiteLegalPages.js`** (new, 25 lines) is the one home of the
  website's two paths (`WEBSITE_LEGAL_PATHS`).
- **`LegalFooter.jsx`** (64 → 85 lines) branches on `SITE_MODE` (the existing helper,
  `modules/runtimeMarker.js`):
  - website mode: two plain `<a>` links to `/info/imprint` and `/info/privacy`, ALWAYS shown. A
    router link would put the base path in front.
  - standalone: the old two links, unchanged.
- **`LegalPage.jsx`** (57 → 93 lines) uses the same dispatch pattern as `LoginScreen.jsx`:
  - website mode: `window.location.replace(<website page>)`, with a fallback link;
  - standalone: `OwnLegalPage`, the old body unchanged.
- **`App.jsx`:** the comment only (182 → 184 lines).
- **`scripts/website-standin.mjs`** (368 → 396 lines) has placeholder pages at `/info/imprint` and
  `/info/privacy`. It imports the paths from the one home, and the pages carry no legal text.
- **`docs/OPERATOR-GUIDE.md`:** one paragraph on website mode.
- **CHANGELOG:** one entry.
- **BACKLOG:** a note under D3.
- Nothing removed, nothing moved out.

**Tests (both modes):**

- `LegalFooter.website.test.jsx` (new, 6 tests).
- `LegalPage.website.test.jsx` (new, 5 tests).
- One footer test each added to `LoginScreen.website.test.jsx` and `JoinPage.website.test.jsx`.
- `standin.integration.test.js` adds 1 test (13/13).
- `LegalFooter.test.jsx` and `LegalPage.test.jsx` (the standalone pins) are unchanged and pass.
- Legal, auth and join files together: 10 files, 63 tests green.

**Sabotage:**

1. The website branch broken (`SITE_MODE === 'SABOTAGE'`) → 6 website tests red, every standalone
   test green.
2. Website forced everywhere (`!==`) → 13 standalone tests red, including the unchanged
   LegalFooter.test.jsx and LegalPage.test.jsx.

Both were restored by the reverse edit and re-run: 27/27.

**engine-reach:** none of 11 paths can reach the engine; no fingerprint check runs.

## Forks (each kept as today)

1. **The Dev Screen's *Legal pages* editor stays in website mode.**
   - The texts edited there are not shown in website mode, and the operator guide says so.
   - Hiding the editor was not asked for.
2. **The link labels stay the race's own ("Legal notice", "Privacy policy").** The website calls them
   "Imprint" and "Privacy".
3. **The website's third legal link, "Not financial advice", is not added to the race's footer.** D3
   names the legal pages; the race never had a disclaimer.

## Noticed, left

Nothing.

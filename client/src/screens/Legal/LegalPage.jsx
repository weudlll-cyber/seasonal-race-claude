// ============================================================
// File:        LegalPage.jsx
// Path:        client/src/screens/Legal/LegalPage.jsx
// Project:     RaceArena — LEGAL-PAGES-1 (the owner's decision of 2026-10-18)
// Description: The two PUBLIC pages, /legal-notice and /privacy — reachable without signing in
//              (App.jsx mounts them outside ProtectedRoute; the server serves the app shell and the
//              public `GET /api/settings/legal-pages` to anyone).
//
// ★ THE OPERATOR'S TEXT IS SHOWN AS PLAIN TEXT, NEVER AS MARKUP. It is a React text child inside an
// element with `white-space: pre-wrap`, so line breaks and spacing are kept and `<b>x</b>` shows as
// those characters — there is no HTML rendering and so no injection surface.
//
// ★ IN WEBSITE MODE THESE ROUTES SEND THE VISITOR TO THE WEBSITE'S OWN PAGES (GOING-ONLINE-PREP-1,
// the owner's decision D3 of 2026-11-13: there the website's legal pages apply). A redirect, not a
// 404: the website's GAME-INTEGRATION.md and EMBED.md say nothing about a game's legal pages, and an
// old or bookmarked link should still reach the text that applies. Standalone draws the operator's
// page exactly as before.
// ============================================================

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLegalPages } from '../../modules/legal/useLegalPages.js';
import { WEBSITE_LEGAL_PATHS } from '../../modules/legal/websiteLegalPages.js';
import { SITE_MODE } from '../../modules/runtimeMarker.js';
import styles from './LegalPage.module.css';

/** The two pages, by the `kind` App.jsx passes: heading, and the key the text is stored under. */
const LEGAL_PAGE_KINDS = Object.freeze({
  legalNotice: { title: 'Legal notice', key: 'legalNotice' },
  privacyPolicy: { title: 'Privacy policy', key: 'privacyPolicy' },
});

function bodyOf(pages, key) {
  if (pages === null) return { text: 'Loading…', muted: true };
  if (pages.unavailable) {
    return { text: 'The text could not be loaded from the server. Try again later.', muted: true };
  }
  const text = pages[key];
  if (typeof text !== 'string' || text.trim() === '') {
    return { text: 'The operator of this installation has not provided this page.', muted: true };
  }
  return { text, muted: false };
}

/** @param {{ kind: keyof typeof LEGAL_PAGE_KINDS }} props */
export default function LegalPage({ kind }) {
  return SITE_MODE === 'website' ? (
    <WebsiteLegalRedirect kind={kind} />
  ) : (
    <OwnLegalPage kind={kind} />
  );
}

/**
 * Website mode: replace this address with the website's page (so Back does not bounce here). The
 * link is the fallback for the moment before the replace, and for a browser that blocks it.
 */
function WebsiteLegalRedirect({ kind }) {
  const { title } = LEGAL_PAGE_KINDS[kind];
  const target = WEBSITE_LEGAL_PATHS[kind];
  useEffect(() => {
    window.location.replace(target);
  }, [target]);
  return (
    <div className={styles.screen}>
      <main className={styles.page}>
        <h1 className={styles.title}>{title}</h1>
        <div className={`${styles.text} ${styles.muted}`} data-testid="legal-text">
          <a href={target}>Open the website&apos;s {title.toLowerCase()}</a>
        </div>
      </main>
    </div>
  );
}

/** Standalone: the operator's own text from the Dev Screen, as before. */
function OwnLegalPage({ kind }) {
  const { title, key } = LEGAL_PAGE_KINDS[kind];
  const pages = useLegalPages();
  const body = bodyOf(pages, key);
  return (
    <div className={styles.screen}>
      <main className={styles.page}>
        <Link className={styles.back} to="/">
          ← Back
        </Link>
        <h1 className={styles.title}>{title}</h1>
        <div
          className={body.muted ? `${styles.text} ${styles.muted}` : styles.text}
          data-testid="legal-text"
        >
          {body.text}
        </div>
      </main>
    </div>
  );
}

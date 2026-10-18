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
// ============================================================

import { Link } from 'react-router-dom';
import { useLegalPages } from '../../modules/legal/useLegalPages.js';
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

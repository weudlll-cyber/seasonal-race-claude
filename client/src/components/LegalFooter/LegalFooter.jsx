// ============================================================
// File:        LegalFooter.jsx
// Path:        client/src/components/LegalFooter/LegalFooter.jsx
// Project:     RaceArena — LEGAL-PAGES-1 (the owner's decision of 2026-10-18)
// Description: The small footer of the sign-in screen, the setup screen and the public join page
//              (REGISTRATION-1, screens/Join/JoinPage.jsx):
//                · "Source code" — ALWAYS. The game is AGPL-3.0-or-later; the link offers the
//                  source of the running version (where it points: modules/legal/sourceCodeUrl.js).
//                · "Legal notice" and "Privacy policy" — only when the operator has filled them in
//                  on the Dev Screen; they open the public pages /legal-notice and /privacy.
//
// The build identity comes from `virtual:ra-build`, the stamp the build badge reads; the operator's
// texts and `RA_SOURCE_URL` from the public `GET /api/settings/legal-pages` (useLegalPages.js).
// While that answer is on its way, and when it never comes, only "Source code" shows — with the
// build's own link, which needs no server.
//
// Always visible without scrolling (decided 2026-10-18): the bar is fixed to the window's bottom
// edge, and an empty spacer of the same height (LegalFooter.module.css) is left in the screen's flow
// so the bar never covers the screen's last content. Not used on the race screen.
// ============================================================

import { Link } from 'react-router-dom';
import RA_BUILD from 'virtual:ra-build';
import { sourceCodeUrl } from '../../modules/legal/sourceCodeUrl.js';
import { useLegalPages } from '../../modules/legal/useLegalPages.js';
import styles from './LegalFooter.module.css';

/** Said on the link when it cannot name the running commit (an unknown or a dirty build). */
export const INEXACT_SOURCE_NOTE =
  'This build names no published commit, so the link opens the repository rather than the exact running version.';

const hasText = (t) => typeof t === 'string' && t.trim() !== '';

export default function LegalFooter() {
  const pages = useLegalPages();
  const source = sourceCodeUrl({ override: pages?.sourceUrl, build: RA_BUILD });
  return (
    <>
      {/* The page's bottom padding: keeps the bar's height free at the end of the flow. */}
      <div className={styles.spacer} data-testid="legal-footer-spacer" aria-hidden="true" />
      <footer className={styles.footer} data-testid="legal-footer">
        <a
          className={styles.link}
          href={source.href}
          target="_blank"
          rel="noopener noreferrer"
          title={source.exact ? undefined : INEXACT_SOURCE_NOTE}
        >
          Source code
        </a>
        {hasText(pages?.legalNotice) && (
          <Link className={styles.link} to="/legal-notice">
            Legal notice
          </Link>
        )}
        {hasText(pages?.privacyPolicy) && (
          <Link className={styles.link} to="/privacy">
            Privacy policy
          </Link>
        )}
      </footer>
    </>
  );
}

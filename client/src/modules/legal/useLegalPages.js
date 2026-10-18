// ============================================================
// File:        useLegalPages.js
// Path:        client/src/modules/legal/useLegalPages.js
// Project:     RaceArena — LEGAL-PAGES-1
// Description: The operator's legal pages as the footer and the two public pages read them: asked
//              once per mount from the public `GET /api/settings/legal-pages` (services/
//              legalPagesApi.js).
//
//              `null` while the answer is on its way; `EMPTY` when the server could not be asked —
//              the footer then shows only "Source code" with its own default, which needs no server,
//              and a legal page says it could not load the text rather than claiming there is none.
// ============================================================

import { useEffect, useState } from 'react';
import { fetchLegalPages } from '../../services/legalPagesApi.js';

/** What the screens use when the server gave no answer. */
export const EMPTY_LEGAL_PAGES = Object.freeze({
  legalNotice: '',
  privacyPolicy: '',
  sourceUrl: null,
  unavailable: true,
});

/** @returns {null | import('../../services/legalPagesApi.js').LegalPages & {unavailable?: true}} */
export function useLegalPages() {
  const [pages, setPages] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchLegalPages()
      .then((p) => !cancelled && setPages(p))
      .catch(() => !cancelled && setPages(EMPTY_LEGAL_PAGES));
    return () => {
      cancelled = true;
    };
  }, []);
  return pages;
}

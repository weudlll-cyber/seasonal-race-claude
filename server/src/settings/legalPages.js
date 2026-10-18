// ============================================================
// File:        legalPages.js
// Path:        server/src/settings/legalPages.js
// Project:     RaceArena — LEGAL-PAGES-1 (the owner's decision of 2026-10-18)
// Description: THE OPERATOR'S TWO LEGAL TEXTS — the legal notice and the privacy policy — stored ON
//              THE SERVER, one file for the whole installation (`legal-pages.json` in the data root,
//              so `npm run backup` archives it with everything else under that root).
//
// ── WHAT IT IS ──────────────────────────────────────────────────────────────────────────────────
// The owner decided on 2026-10-18 that the game provides a legal notice, written by each operator
// for their own install: many operators in different countries run the game, so the details are
// OPERATOR DATA, entered on the install, never shipped. Each text is PLAIN TEXT — the client shows it
// as text with its line breaks, never as markup — and empty means "not provided": the start screen
// then shows no link to it.
//
// ── THE BOUNDS ──────────────────────────────────────────────────────────────────────────────────
// Each text is a string of at most `LEGAL_TEXT_MAX_CHARS` characters; anything else is refused with
// a sentence (400), using the shared field checks of `utils/recordFields.js` (`checkString`,
// `unknownFields`). A missing or damaged file reads as two empty texts, said once in the log
// (`utils/jsonSettingStore.js`) — the pages then simply have no text, which is today's behaviour.
// ============================================================

import { join } from 'node:path';
import { createJsonSettingStore } from '../../utils/jsonSettingStore.js';
import { checkString, unknownFields, unknownFieldsMessage } from '../../utils/recordFields.js';
import { DATA_ROOT } from '../dataPaths.js';

/** The longest text either page may hold. The client reads it from the GET answer (`maxChars`). */
export const LEGAL_TEXT_MAX_CHARS = 20_000;

/** The two texts, by the key they are stored and sent under. */
export const LEGAL_TEXT_KEYS = Object.freeze(['legalNotice', 'privacyPolicy']);

const ALLOWED = new Set(LEGAL_TEXT_KEYS);

export const DEFAULT_LEGAL_PAGES = Object.freeze({ legalNotice: '', privacyPolicy: '' });

/**
 * Check a change sent by a client. Either text may be left out (it keeps its stored value); a text
 * that is sent must be a string within the bound, and no other key is accepted.
 *
 * @param {unknown} body
 * @returns {{ value?: Partial<{legalNotice: string, privacyPolicy: string}>, error?: string }}
 */
export function validateLegalPages(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'The legal pages are { "legalNotice": "…", "privacyPolicy": "…" }.' };
  }
  const unknown = unknownFields(body, ALLOWED);
  if (unknown.length) return { error: unknownFieldsMessage(unknown, 'The legal pages setting') };
  for (const key of LEGAL_TEXT_KEYS) {
    const err = checkString(body, key, { max: LEGAL_TEXT_MAX_CHARS });
    if (err) return { error: err };
  }
  const value = {};
  for (const key of LEGAL_TEXT_KEYS) if (key in body) value[key] = body[key];
  return { value };
}

/** A stored file is valid only when it holds both texts, each within the bound. */
function validateStored(raw) {
  const { value, error } = validateLegalPages(raw);
  if (error || LEGAL_TEXT_KEYS.some((k) => typeof value[k] !== 'string')) return null;
  return value;
}

/** @param {string} [filePath] */
export function createLegalPagesStore(filePath = join(DATA_ROOT, 'legal-pages.json')) {
  const store = createJsonSettingStore({
    filePath,
    validate: validateStored,
    fallback: () => ({ ...DEFAULT_LEGAL_PAGES }),
    tag: 'legal-pages',
    name: 'legal pages setting',
  });
  return {
    get: store.get,
    /** Merge a validated change into what is stored, and store the whole. */
    update: (change) => store.set({ ...store.get(), ...change }),
  };
}

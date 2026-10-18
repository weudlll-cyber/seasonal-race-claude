// ============================================================
// File:        sourceUrl.js
// Path:        server/src/sourceUrl.js
// Project:     RaceArena — LEGAL-PAGES-1 (the owner's decision of 2026-10-18)
// Description: `RA_SOURCE_URL` — where this install's "Source code" link points, when the operator
//              says so. Read here, judged here, handed to the client in the public answer of
//              `GET /api/settings/legal-pages` (`sourceUrl`, null when unset).
//
// ── WHY IT EXISTS ───────────────────────────────────────────────────────────────────────────────
// The game is AGPL-3.0-or-later, so everyone who uses it over a network is offered its source. The
// client's own default is the upstream repository at the commit it was built from
// (`client/src/modules/legal/sourceCodeUrl.js`). An operator who runs a MODIFIED copy must point the
// link at THEIR source instead — that is what this variable is for.
//
// ── PRESENT BUT WRONG STOPS THE START ───────────────────────────────────────────────────────────
// The same asymmetry as `RA_PUBLIC_ORIGIN` (`runtimeConfig.js`): unset is fine and the client uses
// its default; set to something that is not an absolute http(s) address refuses to start, because a
// silently ignored value would send visitors of a modified copy to source that is not what runs.
// ============================================================

/**
 * @param {unknown} raw
 * @returns {{ok: true, url: string} | {ok: false, reason: string}}
 */
export function judgeSourceUrl(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return { ok: false, reason: 'it is empty' };
  let url;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, reason: `${JSON.stringify(text)} is not a URL` };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'the scheme must be http or https' };
  }
  if (url.username || url.password) {
    return { ok: false, reason: 'it carries credentials, which never belong in a public link' };
  }
  return { ok: true, url: url.href };
}

const isUnset = (raw) => raw === undefined || raw === null || String(raw).trim() === '';

/** The operator's source link, or null when unset (or unusable — the start-up gate refuses that). */
export function resolveSourceUrl(env = process.env) {
  if (isUnset(env.RA_SOURCE_URL)) return null;
  const verdict = judgeSourceUrl(env.RA_SOURCE_URL);
  return verdict.ok ? verdict.url : null;
}

/** The start-up gate: returns the link or null, and throws naming the fault when it is wrong. */
export function assertSourceUrlUsable(env = process.env) {
  if (isUnset(env.RA_SOURCE_URL)) return null;
  const verdict = judgeSourceUrl(env.RA_SOURCE_URL);
  if (!verdict.ok) {
    throw new Error(
      `RA_SOURCE_URL is set but unusable: ${verdict.reason}. ` +
        'It must be the full address of the source code this install runs, for example ' +
        'https://example.org/your-fork — or unset it to link to the upstream repository.'
    );
  }
  return verdict.url;
}

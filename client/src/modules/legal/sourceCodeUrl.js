// ============================================================
// File:        sourceCodeUrl.js
// Path:        client/src/modules/legal/sourceCodeUrl.js
// Project:     RaceArena — LEGAL-PAGES-1 (the owner's decision of 2026-10-18)
// Description: WHERE THE "Source code" LINK POINTS. Pure — the build identity and the operator's
//              override are passed in, so this can be tested without a Vite build or a server.
//
// The game is AGPL-3.0-or-later; the link offers the source of the RUNNING version. In order:
//   1. the operator's `RA_SOURCE_URL` (server/src/sourceUrl.js), sent in the public answer of
//      `GET /api/settings/legal-pages` — an operator running a modified copy points it at theirs;
//   2. the upstream repository at the commit this bundle was built from — the `commit` of the
//      `virtual:ra-build` stamp (client/vite-plugin-ra-build.js), the same stamp the build badge and
//      race identifiers read;
//   3. the repository ROOT when the stamp names no commit — an unknown build, or a DIRTY one, which
//      no commit describes (the reasoning of modules/buildInfo.js). `exact: false` then says so, and
//      the footer tells the visitor.
// ============================================================

/** The upstream repository. */
export const REPOSITORY_URL = 'https://github.com/weudlll-cyber/seasonal-race-claude';

/** A commit stamp worth linking to: a hex sha, nothing else (never 'unknown'). */
const SHA = /^[0-9a-f]{7,40}$/i;

/**
 * @param {{ override?: string|null, build?: {commit?: string, dirty?: boolean}|null }} input
 * @returns {{ href: string, exact: boolean }} `exact` false = the link is not the running version
 */
export function sourceCodeUrl({ override = null, build = null } = {}) {
  if (typeof override === 'string' && override.trim()) {
    return { href: override.trim(), exact: true };
  }
  const commit = build?.commit ?? '';
  if (SHA.test(commit) && !build?.dirty) {
    return { href: `${REPOSITORY_URL}/tree/${commit}`, exact: true };
  }
  return { href: REPOSITORY_URL, exact: false };
}

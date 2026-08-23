// ============================================================
// File:        buildIdentity.js
// Path:        server/src/buildIdentity.js
// Project:     RaceArena — BUILD-FROM-OUTSIDE-1
//
// WHAT IT IS FOR: answering "which build is live?" from OUTSIDE the browser.
//
// The client already answers it INSIDE the browser — `client/src/modules/buildInfo.js` draws a pill
// into the race picture from the `virtual:ra-build` module the Vite plugin fills at build time. That
// is the right instrument for the owner watching a race. It is no use at all to anyone holding a
// URL, which is the first question anybody asks about a server.
//
// ── IT NEVER GUESSES, AND THAT RULE IS BORROWED RATHER THAN INVENTED ─────────────────────────────
//
// `client/vite-plugin-ra-build.js` was corrected once for exactly this: its first version treated an
// unreadable `git status` as `dirty: false` — reporting a clean tree it had not been able to look
// at. So the rules here are the client's rules:
//
//   * `commit` and `branch` are 'unknown' unless something SUPPLIED them. There is no plausible
//     -looking fallback, because a plausible-looking sha is worse than no sha.
//   * an unknown identity carries a `reason`. An instrument that fails must say WHY; "unknown" with
//     no cause is the amber badge that cost this project two days.
//   * `dirty` is only ever reported when it was actually determined.
//
// ── WHERE THE VALUES COME FROM, in order ────────────────────────────────────────────────────────
//
//   1. THE ENVIRONMENT — `RA_BUILD_COMMIT`, `RA_BUILD_BRANCH`, `RA_BUILD_DIRTY`. This is the one
//      that matters on a deployed host: the thing that builds the artefact knows what it built, and
//      the running process does not have to be in a git tree to be able to say so.
//   2. NOTHING ELSE. Deliberately: shelling out to `git` from a long-running server would work in
//      development and quietly report the DEPLOY HOST's checkout — or nothing — in production,
//      which is the class of answer that is worse than no answer.
//
// So in development, where nobody sets these, the endpoint honestly says it does not know and names
// the variable that would tell it. That is the intended behaviour, not a gap.
// ============================================================

/** What is reported when nothing supplied an identity — never a plausible-looking sha. */
export const UNKNOWN_BUILD = Object.freeze({ commit: 'unknown', branch: 'unknown' });

/**
 * The build identity this process can honestly claim.
 *
 * @param {Record<string, string|undefined>} [env=process.env]
 * @returns {{commit: string, branch: string, dirty?: boolean, reason?: string}}
 */
export function buildIdentity(env = process.env) {
  const commit = (env.RA_BUILD_COMMIT ?? '').trim();
  const branch = (env.RA_BUILD_BRANCH ?? '').trim();

  if (!commit && !branch) {
    return {
      ...UNKNOWN_BUILD,
      reason: 'RA_BUILD_COMMIT and RA_BUILD_BRANCH are unset — the build did not identify itself',
    };
  }

  const out = {
    commit: commit || UNKNOWN_BUILD.commit,
    branch: branch || UNKNOWN_BUILD.branch,
  };

  // A PARTIAL IDENTITY STILL SAYS WHICH HALF IS MISSING. Reporting `{commit: 'abc', branch:
  // 'unknown'}` with no reason invites the reader to assume the branch is genuinely unknowable
  // rather than simply unset.
  if (!commit) out.reason = 'RA_BUILD_COMMIT is unset';
  else if (!branch) out.reason = 'RA_BUILD_BRANCH is unset';

  // `dirty` is reported ONLY when it was determined. Absent means "not established", which is a
  // different statement from `false`, and conflating them is the correction the client plugin
  // already paid for.
  const dirty = (env.RA_BUILD_DIRTY ?? '').trim().toLowerCase();
  if (dirty === 'true') out.dirty = true;
  else if (dirty === 'false') out.dirty = false;

  return out;
}

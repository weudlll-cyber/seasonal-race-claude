// ============================================================
// File:        buildInfo.js
// Path:        client/src/modules/buildInfo.js
// Project:     RaceArena — BUILD-TRUTH-1
//
// WHAT THIS IS FOR: turning a build identity into the one short string the owner reads off the HUD,
// and nothing else. Pure — no git, no imports, no environment. The identity itself is supplied by
// `virtual:ra-build` (see client/vite-plugin-ra-build.js), which is imported in exactly one place.
//
// WHY THE DIRTY MARK IS NOT DECORATION. A dirty tree means the screen is showing something that NO
// COMMIT DESCRIBES, so the sha alone would be a lie of omission: quoting it invites somebody to
// check that commit out later and expect the same picture. `+dirty` says "this exact frame is not
// reproducible from a commit".
// ============================================================

/** What the badge shows when nothing supplied an identity — never a plausible-looking sha. */
export const UNKNOWN_BUILD = { commit: 'unknown', branch: 'unknown', dirty: false };

/**
 * The HUD label. Short enough to sit beside the config badge, complete enough to settle an argument.
 *
 *   build 3b857d05 · master
 *   build fac83f1a · anchor-truth +dirty
 *   build unknown
 *
 * @param {{commit?: string, branch?: string, dirty?: boolean}|null|undefined} info
 * @returns {string}
 */
export function formatBuildLabel(info) {
  const commit = info?.commit || UNKNOWN_BUILD.commit;
  const branch = info?.branch || UNKNOWN_BUILD.branch;
  if (commit === 'unknown') return 'build unknown';
  const dirty = info?.dirty ? ' +dirty' : '';
  return `build ${commit} · ${branch}${dirty}`;
}

/**
 * Whether the badge should read as a WARNING rather than as information.
 *
 * Dirty is the warning case, because it is the case where the picture cannot be reproduced from any
 * commit. An unknown build is also a warning: it means the identity could not be read at all, and a
 * badge that quietly says nothing is how this failure went unnoticed for twenty-two hours.
 */
export function isBuildUncertain(info) {
  return !info?.commit || info.commit === 'unknown' || !!info.dirty;
}

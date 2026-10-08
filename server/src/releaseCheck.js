// ============================================================
// File:        releaseCheck.js
// Path:        server/src/releaseCheck.js
// Project:     RaceArena — AUDIT-1 D2 (the admin status box)
// Description: "Is there a newer release than the one running?" — asked of GitHub by the SERVER,
//              at most once a day per process, and answered `unknown` on any failure.
//
// ── WHAT A RELEASE IS ──────────────────────────────────────────────────────────────────────────
// A tag named `v<major>.<minor>` or `v<major>.<minor>.<patch>` — nothing else. The repository has
// dozens of `v-…` ship markers (`v-ship-the-night`, `v-perf-complete`) and the odd `v1-…` note;
// none of them is a release. This is the same rule as `newest_release_tag` in `deploy/racearena`
// (branch feat/vps-install): `^v[0-9]+\.[0-9]+(\.[0-9]+)?$`, newest by version order (`sort -V`).
//
// ── WHY AT MOST ONCE A DAY, AND WHY A FAILURE IS CACHED TOO ────────────────────────────────────
// Releases are rare and the box is opened often; GitHub rate-limits anonymous callers per IP, and an
// install behind one address must not spend that on a status line. So the answer AND the time it
// was asked are kept, and for 24 hours every caller gets the kept answer — a failure included.
// Retrying a failure on every page load would turn a GitHub outage into a request per view, which
// is exactly what the daily limit is for. A request already in flight is shared, so two admins
// opening the box at once still cost one request.
//
// ── WHY `unknown` AND NEVER AN ERROR ───────────────────────────────────────────────────────────
// No network, a timeout, a 403 from the rate limit, a body that is not what was expected: each is
// "we could not find out", which is a fact about the check and not about the install. The route
// that shows it stays 200 and the box says "unknown". No credentials are sent — the repository is
// public — so nothing secret can reach a log line from here.
// ============================================================

export const RELEASE_REPO = 'weudlll-cyber/seasonal-race-claude';
export const RELEASE_CHECK_TTL_MS = 24 * 60 * 60 * 1000;
export const RELEASE_CHECK_TIMEOUT_MS = 5000;

const RELEASE_TAG = /^v(\d+)\.(\d+)(?:\.(\d+))?$/;

/** `[major, minor, patch]` of a release tag, or null for anything that is not one. */
export function parseRelease(tag) {
  const m = RELEASE_TAG.exec(String(tag ?? '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] : null;
}

/** Negative, zero or positive, as `a` is older than, the same as, or newer than `b`. */
export function compareReleases(a, b) {
  const pa = parseRelease(a);
  const pb = parseRelease(b);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** The newest release tag among names, or null when there is none. `v-…` markers are ignored. */
export function newestRelease(names) {
  const releases = names.filter((n) => parseRelease(n));
  if (!releases.length) return null;
  return releases.reduce((best, n) => (compareReleases(n, best) > 0 ? n : best));
}

/**
 * The version this build can claim, or null. ONLY a build that identified itself by a release tag
 * has one: `buildIdentity().branch` set to `vX.Y[.Z]`. A branch name, a sha or 'unknown' is not a
 * version, and comparing it would be a guess — so the box then reports the newest release and
 * says it cannot compare, the rule `buildIdentity.js` already lives by.
 */
export function buildVersion(build) {
  return parseRelease(build?.branch) ? build.branch.trim() : null;
}

/**
 * A release checker with its own daily cache. `fetchImpl` and `now` are injected so tests never
 * touch the network or the clock.
 *
 * @param {{ fetchImpl?: typeof fetch, now?: () => number, repo?: string, ttlMs?: number,
 *           timeoutMs?: number, log?: (msg: string) => void }} [deps]
 * @returns {() => Promise<{ newest: string|null, checkedAt: string, state: 'ok'|'unknown' }>}
 */
export function createReleaseChecker({
  fetchImpl = (...args) => globalThis.fetch(...args),
  now = () => Date.now(),
  repo = RELEASE_REPO,
  ttlMs = RELEASE_CHECK_TTL_MS,
  timeoutMs = RELEASE_CHECK_TIMEOUT_MS,
  log = (msg) => console.warn(msg),
} = {}) {
  let cached = null; // { at: number, result }
  let inFlight = null;

  async function ask() {
    const at = now();
    const checkedAt = new Date(at).toISOString();
    try {
      // `matching-refs/tags/v` lists every tag that starts with "v" and no others, so the dozens of
      // non-release tags of other shapes never page the answer out of one response.
      const res = await fetchImpl(`https://api.github.com/repos/${repo}/git/matching-refs/tags/v`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RaceArena-status' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status !== 200) throw new Error(`GitHub answered HTTP ${res.status}`);
      const refs = await res.json();
      if (!Array.isArray(refs)) throw new Error('GitHub answered something that is not a tag list');
      const names = refs.map((r) => String(r?.ref ?? '').replace(/^refs\/tags\//, ''));
      return { at, result: { newest: newestRelease(names), checkedAt, state: 'ok' } };
    } catch (e) {
      // The reason only — never a header or a body.
      log(
        `[admin-status] release check failed, reported as unknown: ${e?.name ?? 'Error'}: ${e?.message ?? ''}`
      );
      return { at, result: { newest: null, checkedAt, state: 'unknown' } };
    }
  }

  return async function checkRelease() {
    if (cached && now() - cached.at < ttlMs) return cached.result;
    inFlight ??= ask().then((c) => {
      cached = c;
      inFlight = null;
      return c;
    });
    return (await inFlight).result;
  };
}

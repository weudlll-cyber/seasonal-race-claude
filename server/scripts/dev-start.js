// Dev-Launcher: sets local default env so the server is reachable from the Vite client
// (localhost:5173) without setting variables per shell. Never overwrites already-set values.
// DEV ONLY — production uses `npm start` and MUST set its own secrets.
import { readBuildInfo } from '../../client/vite-plugin-ra-build.js';

process.env.RA_CLIENT_ORIGIN ??= 'http://localhost:5173';
process.env.RA_SESSION_SECRET ??= 'dev-secret-not-for-production';
process.env.RA_BOOTSTRAP_TOKEN ??= 'dev-bootstrap-token-not-for-production';
process.env.PORT ??= '4000';

// ── ★ THE BUILD IDENTITY, FROM THE ONE HOME (2026-09-13) ────────────────────────────────────────
//
// `/api/health` reported `commit: unknown` in development because nothing set these, while the
// client badge in the same browser named a real commit — so the two halves of one running system
// disagreed about which code they were. `buildIdentity.js` is right to refuse to shell out to git
// from a long-running SERVER (in production that would report the deploy host's checkout, an answer
// worse than none). A dev LAUNCHER is the other case entirely: it is the thing that starts the
// artefact, it runs once, and it is in the tree it is about — which is exactly the role the
// environment variables are documented for.
//
// ★ ONE HOME, AND IT IS NOT A NEW ONE. `readBuildInfo` is the same reader the client badge uses, so
// the API and the badge cannot drift: there is no second `git rev-parse` anywhere. It reports
// `dirty` honestly, and on failure it returns an `unknown` identity with a REASON rather than a
// plausible-looking sha — so a git-less checkout degrades to exactly today's behaviour.
//
// `??=` throughout: a real deployment that sets these keeps its own values untouched.
try {
  const b = readBuildInfo();
  if (b.commit && b.commit !== 'unknown') {
    process.env.RA_BUILD_COMMIT ??= b.commit;
    process.env.RA_BUILD_BRANCH ??= b.branch;
    process.env.RA_BUILD_DIRTY ??= String(b.dirty);
  } else {
    console.warn(`[ra-build] dev identity unavailable: ${b.reason ?? 'no reason given'}`);
  }
} catch (err) {
  // Never let a missing git stop the dev server — the endpoint falls back to saying it does not know.
  console.warn(`[ra-build] dev identity unavailable: ${err.message}`);
}

await import('../src/index.js');

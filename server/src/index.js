// ============================================================
// File:        index.js
// Path:        server/src/index.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Server entry point — binds the Express app to a port
// ============================================================

import { createApp } from './app.js';
import { clientBuildExists } from './staticClient.js';
import { reportStartupReadiness } from './startupReadiness.js';
import { assertPublicOriginUsable } from './runtimeConfig.js';

// ── RUNTIME-API-URL-1: THE ADDRESS IS JUDGED BEFORE ANYTHING LISTENS ───────────────────────────
//
// ★ THIS REFUSES TO START, WHERE `reportStartupReadiness` ONLY WARNS, AND THE DIFFERENCE IS
// DELIBERATE. That one reports what an install CANNOT DO — a missing RA_CLIENT_ORIGIN is a
// legitimate same-origin install, so refusing there would break the arrangement SERVE-SPA-1 moved
// towards. This one reports an answer that is WRONG: RA_PUBLIC_ORIGIN present but unusable means an
// operator was asked for the address and gave something that cannot be one. Starting anyway would
// serve every visitor a bundle pointing at `http://localhost:4000` — their own machine — and the
// only symptom would be "Server not reachable", which names the wrong cause.
//
// ABSENT IS STILL FINE and still starts: that is the owner's dev machine, and the client falls back
// to today's address. The gate is on being WRONG, never on being unset.
//
// It runs BEFORE `createApp()` so nothing is bound, no port is taken and no data file is touched by
// an install that is about to be told to fix its configuration.
try {
  assertPublicOriginUsable(process.env);
} catch (err) {
  // eslint-disable-next-line no-console -- deliberate: a refusal to start is what stderr is for
  console.error(`RaceArena cannot start: ${err.message}`);
  process.exit(1);
}

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  // ★ STDOUT BY DECISION (the owner, 2026-09-06), not by oversight. This is the "it started" line,
  // and normal output belongs on stdout; stderr is for what is wrong. This file already draws that
  // line — `reportStartupReadiness` below defaults to `console.warn` (startupReadiness.js:95)
  // precisely because it reports what this install CANNOT do. WHAT WAITS ON THIS LINE IS A PERSON,
  // not a process: nothing in the tree parses it (Playwright waits on a URL —
  // client/playwright.config.js:64 — and neither server/Dockerfile nor docker-compose.yml declares
  // a HEALTHCHECK), while `.claude/skills/dev-start/SKILL.md:33` names it as the expected log line
  // and the line after it names the warning that must NOT appear beside it. That reading only works
  // while the go-ahead and the warnings are on different streams.
  // eslint-disable-next-line no-console -- deliberate: the startup banner is normal output, above
  console.log(`RaceArena server running on port ${PORT}`);
  // PUBLISH-STEPS-1: say what this install CANNOT do, while the operator is still looking at the
  // terminal they started it in. It only warns — a same-origin install needs no RA_CLIENT_ORIGIN,
  // so refusing to start without one would break the arrangement SERVE-SPA-1 moved towards. The
  // reasoning is in startupReadiness.js; nothing here changes what the server does.
  reportStartupReadiness({ env: process.env, servingClient: clientBuildExists() });
});

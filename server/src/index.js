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

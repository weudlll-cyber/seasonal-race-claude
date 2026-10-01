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
import { sweepOrphanTmp } from '../utils/sweepOrphanTmp.js';
import { resolveDataRoot } from './dataPaths.js';
import { resolveBindAddress, listenOn } from './bindAddress.js';

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
// RELEASE-BASICS-1 (c): the bind address is judged by the same gate, for the same reason — a value
// that is present but is not an address must stop the start, never fall back to every interface.
let bindAddress;
try {
  assertPublicOriginUsable(process.env);
  bindAddress = resolveBindAddress(process.env);
} catch (err) {
  // Deliberate: a refusal to start is what stderr is for. No eslint-disable is needed here —
  // `no-console` is configured as `["warn", { allow: ["warn", "error"] }]`
  // (`client/eslint.config.js:56`), so `console.error` is already allowed. The directive that
  // used to sit here was dead and the linter said so; removed 2026-09-27, DELIVERY-CLEAN-1 §10.
  console.error(`RaceArena cannot start: ${err.message}`);
  process.exit(1);
}

// ★ Q-20c (POLISH-2026-09-24B): clear `.tmp` files an interrupted atomic write left behind. Boot is
// the only safe moment — nothing is mid-write — and it is deliberately BEFORE `createApp()` so no
// request can be in flight. It never throws; see the util's header for why that matters.
sweepOrphanTmp(resolveDataRoot(), (msg) => {
  // eslint-disable-next-line no-console -- boot-time housekeeping belongs on the startup log
  console.log(`[ra-sweep] ${msg}`);
});

const app = createApp();
const PORT = process.env.PORT || 4000;

// Unset RA_BIND_ADDRESS → the same `listen(PORT, cb)` call as before; see bindAddress.js.
listenOn(app, PORT, bindAddress, () => {
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
  console.log(`RaceArena server running on port ${PORT}${bindAddress ? ` (bound to ${bindAddress})` : ''}`);
  // PUBLISH-STEPS-1: say what this install CANNOT do, while the operator is still looking at the
  // terminal they started it in. It only warns — a same-origin install needs no RA_CLIENT_ORIGIN,
  // so refusing to start without one would break the arrangement SERVE-SPA-1 moved towards. The
  // reasoning is in startupReadiness.js; nothing here changes what the server does.
  reportStartupReadiness({ env: process.env, servingClient: clientBuildExists() });
});

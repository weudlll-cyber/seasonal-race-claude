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
  console.log(`RaceArena server running on port ${PORT}`);
  // PUBLISH-STEPS-1: say what this install CANNOT do, while the operator is still looking at the
  // terminal they started it in. It only warns — a same-origin install needs no RA_CLIENT_ORIGIN,
  // so refusing to start without one would break the arrangement SERVE-SPA-1 moved towards. The
  // reasoning is in startupReadiness.js; nothing here changes what the server does.
  reportStartupReadiness({ env: process.env, servingClient: clientBuildExists() });
});

// ============================================================
// File:        basepath-env.js
// Path:        client/e2e-basepath/basepath-env.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 2
// Created:     2026-11-11
// Description: The one place the base-path arm's address and run credentials are decided, read by
//              its config (the server it starts) and its spec (the browser it drives). Values are
//              generated per run and written back to the environment, so the config's process and
//              the worker that runs the spec agree — the pattern e2e/e2e-env.js uses. Never printed.
// ============================================================

import { randomUUID } from 'node:crypto';

const stable = (name, make) => (process.env[name] ??= make());

/** Free of every other port in use: 4399/5399 dev arm, 4599 production arm; 4000/4173/5173 are the owner's. */
const PORT = 4699;
const ORIGIN = `http://localhost:${PORT}`;
const BASE_PATH = '/games/race';

export const BASEPATH_ARM = {
  port: PORT,
  origin: ORIGIN,
  basePath: BASE_PATH,
  appUrl: `${ORIGIN}${BASE_PATH}`,
  username: stable('RA_BP_USERNAME', () => `bp-${randomUUID().slice(0, 8)}`),
  password: stable('RA_BP_PASSWORD', () => randomUUID()),
  bootstrapToken: stable('RA_BP_BOOTSTRAP_TOKEN', () => randomUUID()),
};

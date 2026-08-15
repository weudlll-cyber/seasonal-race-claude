// ============================================================
// File:        client/e2e/e2e-env.js
// Path:        client/e2e/e2e-env.js
// Project:     RaceArena — E2E-LOGIN-1
//
// ONE HOME for what the e2e run is pointed at and what it logs in with.
//
// It is imported by BOTH `playwright.config.js` (which starts the servers) and `auth.setup.js`
// (which creates the account and logs in). Those run in different processes, so the values must be
// derivable identically in each rather than passed between them — which is why every one of them is
// read from the environment, with a generated default written back into `process.env` by whoever
// gets here first. Playwright loads the config in the main process before spawning workers, so the
// generated values are inherited rather than regenerated.
//
// NOTHING HERE IS A SECRET AT REST. Every default is random per run and lives only in the process
// environment; the saved browser state goes to `.auth/`, which is gitignored. The overrides exist so
// this can be pointed at an existing instance without editing a file.
//
// PORTS ARE DELIBERATELY NOT 4000/5173/4173. Those belong to the owner's dev server, his API and
// the production build he judges on. The old config used 5173 with `reuseExistingServer: true`, so
// a run on this machine silently tested whatever was already up — with his data and his login.
// ============================================================

import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Read an env var, or generate one and write it back so every process in the run agrees. */
const stable = (name, make) => (process.env[name] ??= make());

const API_PORT = Number(stable('RA_E2E_API_PORT', () => '4399'));
const APP_PORT = Number(stable('RA_E2E_APP_PORT', () => '5399'));

export const E2E = {
  apiPort: API_PORT,
  appPort: APP_PORT,
  apiUrl: `http://localhost:${API_PORT}`,
  appUrl: `http://localhost:${APP_PORT}`,

  // The account this run creates for itself. Random per run; overridable from outside.
  username: stable('RA_E2E_USERNAME', () => `e2e-${randomUUID().slice(0, 8)}`),
  password: stable('RA_E2E_PASSWORD', () => randomUUID()),

  // Server secrets for the isolated instance. Never reused, never written down.
  bootstrapToken: stable('RA_E2E_BOOTSTRAP_TOKEN', () => randomUUID()),
  sessionSecret: stable('RA_E2E_SESSION_SECRET', () => randomUUID()),

  // A DATA DIRECTORY OF ITS OWN, outside the repository. The server seeds it from server/seeds on
  // first boot (tracks, brands, backgrounds, player-groups), and having no `setup-complete.json` is
  // precisely what lets this run create its own first account.
  dataDir: stable('RA_E2E_DATA_DIR', () => join(tmpdir(), `racearena-e2e-${randomUUID().slice(0, 8)}`)),
};

/** Where the authenticated browser state is saved. Gitignored. */
export const STATE_FILE = join(HERE, '.auth', 'state.json');

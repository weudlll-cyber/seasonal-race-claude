// ============================================================
// File:        adminStatus.js
// Path:        server/src/routes/adminStatus.js
// Project:     RaceArena — AUDIT-1 D2 (the admin status box)
// Description: GET /api/admin/status — what the read-only status box at the top of the Dev
//              Screen's "Accounts and system" chapter shows. ADMIN-ONLY, by `ROUTE_POLICY` in
//              `auth/guards.js` (the whole `/api/admin` namespace), and reads only: nothing here
//              changes the install.
//
//   200 {
//     build:   buildIdentity()                          — the same answer /api/health gives
//     backup:  { newest: ISO|null, visible: boolean }   — visible=false: "not visible from the app"
//     status:  { ok: boolean, checks: [{name, ok, detail}] }
//     release: { newest: tag|null, current: tag|null, newer: boolean|null,
//                checkedAt: ISO, state: 'ok'|'unknown' }
//   }
//
// ── THE STATUS IS `npm run status`'s, NOT A SECOND OPINION ─────────────────────────────────────
// The checks are `shared/statusChecks.mjs`, the module `scripts/status.mjs` runs: free disk and a
// writable data directory, always; the newest backup's age and checksum, when the backups can be
// seen from here. The fourth check of the command — the API answering on /api/health — is left out:
// a server asking itself whether it answers proves nothing.
//
// ── WHERE THE BACKUPS ARE, AND WHEN THE APP CANNOT SEE THEM ────────────────────────────────────
// `RA_BACKUP_DIR`, the same setting `npm run backup` writes into and `npm run status` reads. Backups
// are usually taken on the HOST, into a directory the app process may not have (no mount, or the
// variable unset in its environment). Then the box says "not visible from the app" and the backup
// check is NOT run: `checkBackup` would fail on a directory it cannot see, and an overall FAIL that
// only means "this process is not where backups are" would be a false alarm on a healthy install.
// The status therefore lists the checks it ran, so it never claims more than it looked at.
// ============================================================

import { Router } from 'express';
import { buildIdentity } from '../buildIdentity.js';
import { resolveDataRoot } from '../dataPaths.js';
import { buildVersion, compareReleases, createReleaseChecker } from '../releaseCheck.js';
import {
  DEFAULTS,
  checkBackup,
  checkDisk,
  checkWritable,
  newestBackup,
} from '../../../shared/statusChecks.mjs';

/**
 * @param {{ env?: Record<string, string|undefined>, now?: () => number,
 *           checkRelease?: ReturnType<typeof createReleaseChecker> }} [deps] — tests inject these
 */
export function createAdminStatusRouter({
  env = process.env,
  now = () => Date.now(),
  checkRelease = createReleaseChecker({ now }),
} = {}) {
  const router = Router();

  router.get('/status', async (_req, res, next) => {
    try {
      const build = buildIdentity(env);
      const dataRoot = resolveDataRoot(env);
      const backupsDir = (env.RA_BACKUP_DIR ?? '').trim() || null;

      const backup = newestBackup(backupsDir);
      const checks = [checkDisk(dataRoot), checkWritable(dataRoot)];
      if (backup.visible)
        checks.push(checkBackup(backupsDir, DEFAULTS.maxBackupAgeHours, new Date(now())));

      const found = await checkRelease();
      const current = buildVersion(build);
      // `newer` is only stated when it is known: no release at all means nothing can be newer;
      // otherwise both sides must be versions, or it is null ("cannot compare").
      let newer = null;
      if (found.state === 'ok' && found.newest === null) newer = false;
      else if (found.state === 'ok' && current) newer = compareReleases(found.newest, current) > 0;

      res.json({
        build,
        backup,
        status: { ok: checks.every((c) => c.ok), checks },
        release: { ...found, current, newer },
      });
    } catch (e) {
      next(e);
    }
  });

  return router;
}

export default createAdminStatusRouter();

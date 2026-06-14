// ============================================================
// File:        _defaultPromote.js
// Path:        server/src/routes/_defaultPromote.js
// Project:     RaceArena
// Description: Shared admin helper — attaches promote/demote/export-seed routes
//              to an existing express Router. Reused by D1 (player-groups),
//              D3 (brands), D5 (racers), D7 (tracks).
//
//              Route policy (admin-only) is enforced via ROUTE_POLICY in guards.js,
//              not here. This module only defines the handlers.
// ============================================================

/**
 * Attaches three admin sub-routes to `router`:
 *   POST /:id/set-default    — promote: sets isDefault:true on the record
 *   POST /:id/clear-default  — demote:  sets isDefault:false on the record
 *   GET  /:id/export-seed    — returns the full record in seed-ready form.
 *                              Value-only types (player-groups) omit exportSeed and
 *                              get the default JSON handler. Binary-asset types (brands,
 *                              racers, tracks) pass an exportSeed callback to include
 *                              asset references alongside the JSON record.
 *
 * Guards: callers must add a ROUTE_POLICY entry in guards.js that matches exactly
 * these three path suffixes — not the general CRUD paths (role-leak risk).
 *
 * @param {import('express').Router} router
 * @param {{
 *   getRecord: (id: string) => object | undefined,
 *   saveRecord: (record: object) => void,
 *   exportSeed?: (req: import('express').Request, res: import('express').Response, record: object) => void,
 * }} opts
 */
export function attachPromoteExport(router, { getRecord, saveRecord, exportSeed }) {
  router.post('/:id/set-default', (req, res) => {
    const record = getRecord(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    const updated = { ...record, isDefault: true, updatedAt: new Date().toISOString() };
    saveRecord(updated);
    res.json(updated);
  });

  router.post('/:id/clear-default', (req, res) => {
    const record = getRecord(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    const updated = { ...record, isDefault: false, updatedAt: new Date().toISOString() };
    saveRecord(updated);
    res.json(updated);
  });

  router.get('/:id/export-seed', (req, res) => {
    const record = getRecord(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    if (exportSeed) {
      exportSeed(req, res, record);
    } else {
      res.json(record);
    }
  });
}

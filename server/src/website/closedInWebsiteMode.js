// ============================================================
// File:        closedInWebsiteMode.js
// Path:        server/src/website/closedInWebsiteMode.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3a
// Created:     2026-11-11
// Description: In website mode the website owns the accounts, so the race's own account doors are
//              CLOSED: local sign-in, first-admin setup, changing a password and account management
//              answer 404, exactly as a route that does not exist. Mounted only when RA_MODE=website
//              (app.js), ahead of the guards, so a caller with or without a session gets the same
//              answer. scripts/recover-admin.mjs is a command on the server and is not affected.
// ============================================================

import { routingPath } from '../../utils/apiPath.js';

/** [method, exact path] pairs; `/api/users` is closed with everything under it. */
const CLOSED = [
  ['POST', '/api/auth/login'],
  ['GET', '/api/auth/setup-needed'],
  ['HEAD', '/api/auth/setup-needed'],
  ['POST', '/api/auth/setup'],
  ['POST', '/api/auth/change-password'],
];

/** True when this request asks for one of the race's own account doors. Case as Express routes it. */
export function isClosedInWebsiteMode(method, path) {
  const p = routingPath(path).replace(/\/+$/, '');
  if (p === '/api/users' || p.startsWith('/api/users/')) return true;
  const m = String(method).toUpperCase();
  return CLOSED.some(([cm, cp]) => cm === m && cp === p);
}

export function closedInWebsiteMode(req, res, next) {
  if (!isClosedInWebsiteMode(req.method, req.path)) return next();
  return res.status(404).json({ error: `no such API route: ${req.method} ${req.originalUrl}` });
}

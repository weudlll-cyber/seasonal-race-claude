// ============================================================
// File:        app.js
// Path:        server/src/app.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Express app factory — separated from server listen for testability
// ============================================================

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import tracksRouter from './routes/tracks.js';
import surfaceClassesRouter from './routes/surfaceClasses.js';
import playerGroupsRouter from './routes/playerGroups.js';
import brandsRouter from './routes/brands.js';
import racersRouter from './routes/racers.js';
import seedNoticesRouter from './routes/seedNotices.js';
import racesRouter from './routes/races.js';
import registrationsRouter from './routes/registrations.js';
import joinRouter from './routes/join.js';
import integrationsRouter from './routes/integrations.js';
import settingsRouter from './routes/settings.js';
import adminStatusRouter from './routes/adminStatus.js';
import { createSessionMiddleware } from './auth/session.js';
import authRouter from './auth/authRouter.js';
import usersRouter from './auth/usersRouter.js';
import { requireAuth, requireAdmin } from './auth/guards.js';
import { corsOptions, csrfOriginGuard } from './auth/csrf.js';
import { createHealthHandler } from './health.js';
import { loginLimiter, setupLimiter, changePasswordLimiter } from './auth/rateLimit.js';
import { mountClientAssets, mountSpaFallback, mountApiNotFound } from './staticClient.js';
import { apiErrorHandler } from './apiErrorHandler.js';
import { applyTrustProxy } from './trustProxy.js';
import { cspDirectives } from './csp.js';

// Created once at module scope so all createApp instances share one store and timer.
const sessionMiddleware = createSessionMiddleware();

export function createApp() {
  const app = express();
  applyTrustProxy(app); // AUDIT-1 A5M-07: RA_TRUST_PROXY; unset keeps the NODE_ENV rule
  // AUDIT-1 D1: the Content-Security-Policy is ON; its directives and why each is what it is live in
  // csp.js. CORP stays `cross-origin` for the development split (5173 → 4000).
  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: false, directives: cspDirectives() },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(cors(corsOptions));
  // REGISTRATION-1: the two routes open to callers without a session get a 1 KB body limit, read
  // BEFORE the app's 1 MB parser (a body is parsed once; the first parser wins). The integration
  // seam is mounted here whole, ahead of the session and every guard, because its caller is a
  // server with a key and no session; it answers every request itself (routes/integrations.js).
  app.use('/api/join', express.json({ limit: '1kb' }));
  app.use('/api/integrations', express.json({ limit: '1kb' }), integrationsRouter);
  app.use(express.json({ limit: '1mb' }));
  // ★ EXPRESS 5 LEAVES `req.body` UNDEFINED when no parser read a body (its migration guide,
  // "req.body"); Express 4 gave `{}`. Every route here was written against `{}` — their validators
  // take the object and report what is missing — so under 5 a request with no body reached
  // `undefined.name` and answered 500 instead of 400 (POST /api/tracks, /api/player-groups,
  // /api/brands, /api/racers, /api/surface-classes and PUT /api/surface-classes/:id; A7-03 piece 4,
  // 2026-10-19). One line restores the contract they were written to, for all of them; a parser
  // that DID read a body (JSON above, multer on the upload routes) is left untouched.
  app.use((req, _res, next) => {
    req.body ??= {};
    next();
  });
  app.use(sessionMiddleware);
  app.use(csrfOriginGuard);

  // SERVE-SPA-1 — THE BUILT CLIENT, AND IT IS MOUNTED ABOVE THE GUARDS ON PURPOSE.
  // A visitor who is not signed in must still be able to load the app that draws the sign-in form,
  // and a deep link must still return the shell so the client's router can redirect. Both mounts
  // refuse anything under /api/, so no API path can ever be answered with the app's HTML. The whole
  // argument, including why serving the shell publicly grants nothing, is in staticClient.js.
  // With no build present these mount nothing and say so; the API is unaffected either way.
  mountClientAssets(app);
  mountSpaFallback(app);

  app.use(requireAuth);
  app.use(requireAdmin);

  // BUILD-FROM-OUTSIDE-1: the health endpoint NAMES THE BUILD, so "which build is live?" can be
  // asked from outside the browser; it never guesses (buildIdentity.js). AUDIT-1 A10-05, the
  // owner's decision of 2026-10-12: it also answers 503 with status 'error' when the account store
  // cannot be read, so a server nobody can sign in to no longer reports itself healthy. The healthy
  // answer is unchanged, key for key. Public by ROUTE_POLICY (guards.js), so it names no file path.
  // Both halves live in health.js.
  app.get('/api/health', createHealthHandler());

  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/setup', setupLimiter);
  // Mounted BELOW requireAuth deliberately: this limiter keys on req.authUser, which the guard
  // stack above has already resolved from the session cookie.
  app.use('/api/auth/change-password', changePasswordLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/tracks', tracksRouter);
  app.use('/api/surface-classes', surfaceClassesRouter);
  app.use('/api/player-groups', playerGroupsRouter);
  app.use('/api/brands', brandsRouter);
  app.use('/api/racers', racersRouter);
  app.use('/api/seed-notices', seedNoticesRouter);
  app.use('/api/races', racesRouter);
  // REGISTRATION-1: the director's registrations — signed in, operator+, team-scoped like races.
  app.use('/api/registrations', registrationsRouter);
  // REGISTRATION-1: the join link — PUBLIC by an anchored pattern on PUBLIC_PATHS (guards.js).
  app.use('/api/join', joinRouter);
  app.use('/api/settings', settingsRouter);
  // AUDIT-1 D2: the admin status box — read-only, admin-only by ROUTE_POLICY (all of /api/admin).
  app.use('/api/admin', adminStatusRouter);

  // SERVE-SPA-1: LAST, so every real route above wins. An unknown path under /api/ now answers as
  // the API rather than as Express's default HTML error page.
  mountApiNotFound(app);

  // AUDIT-1 A5M-08: LAST of all, so every error from any layer above is answered as JSON with no
  // stack trace, instead of by Express's default HTML page. See apiErrorHandler.js.
  app.use(apiErrorHandler);

  return app;
}

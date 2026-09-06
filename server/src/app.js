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
import { createSessionMiddleware } from './auth/session.js';
import authRouter from './auth/authRouter.js';
import usersRouter from './auth/usersRouter.js';
import { requireAuth, requireAdmin } from './auth/guards.js';
import { corsOptions, csrfOriginGuard } from './auth/csrf.js';
import { buildIdentity } from './buildIdentity.js';
import { loginLimiter, setupLimiter, changePasswordLimiter } from './auth/rateLimit.js';
import {
  mountClientAssets,
  mountSpaFallback,
  mountApiNotFound,
} from './staticClient.js';

// Created once at module scope so all createApp instances share one store and timer.
const sessionMiddleware = createSessionMiddleware();

export function createApp() {
  const app = express();
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));
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

  // BUILD-FROM-OUTSIDE-1: the health endpoint now NAMES THE BUILD. It answered only status and
  // timestamp, so "which build is live?" could not be asked from outside the browser — the client's
  // build pill is drawn into the race picture and is no use to anyone holding a URL.
  // It never guesses: with nothing supplied it reports 'unknown' AND the reason. See buildIdentity.js.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), build: buildIdentity() });
  });

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

  // SERVE-SPA-1: LAST, so every real route above wins. An unknown path under /api/ now answers as
  // the API rather than as Express's default HTML error page.
  mountApiNotFound(app);

  return app;
}

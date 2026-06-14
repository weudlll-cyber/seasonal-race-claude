// ============================================================
// File:        app.js
// Path:        server/src/app.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Express app factory — separated from server listen for testability
// ============================================================

import express from 'express';
import cors from 'cors';
import tracksRouter from './routes/tracks.js';
import surfaceClassesRouter from './routes/surfaceClasses.js';
import playerGroupsRouter from './routes/playerGroups.js';
import { createSessionMiddleware } from './auth/session.js';
import authRouter from './auth/authRouter.js';
import usersRouter from './auth/usersRouter.js';
import { requireAuth, requireAdmin } from './auth/guards.js';
import { corsOptions, csrfOriginGuard } from './auth/csrf.js';
import { loginLimiter, setupLimiter } from './auth/rateLimit.js';

// Created once at module scope so all createApp instances share one store and timer.
const sessionMiddleware = createSessionMiddleware();

export function createApp() {
  const app = express();
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));
  app.use(sessionMiddleware);
  app.use(csrfOriginGuard);
  app.use(requireAuth);
  app.use(requireAdmin);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/setup', setupLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/tracks', tracksRouter);
  app.use('/api/surface-classes', surfaceClassesRouter);
  app.use('/api/player-groups', playerGroupsRouter);

  return app;
}

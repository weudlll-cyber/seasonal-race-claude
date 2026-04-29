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

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/tracks', tracksRouter);

  return app;
}

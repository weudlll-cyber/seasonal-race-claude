// ============================================================
// File:        tracks.js
// Path:        server/src/routes/tracks.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Track API routes — list, detail, background image
// ============================================================

import express from 'express';
import { readFileSync, readdirSync, existsSync, createReadStream } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data/tracks');
const BG_DIR = join(__dirname, '../../data/backgrounds');

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

// Load all tracks into memory at startup.
function loadAllTracks() {
  const map = new Map();
  if (!existsSync(DATA_DIR)) return map;
  for (const file of readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))) {
    try {
      const track = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
      map.set(track.id, track);
    } catch {
      console.warn(`[tracks] Failed to load ${file}`);
    }
  }
  return map;
}

const tracksMap = loadAllTracks();

// Strip geometry arrays and internal file references from the list response.
function toSummary({ innerPoints, outerPoints, centerPoints, backgroundImageFile, ...rest }) {
  return rest;
}

const router = express.Router();

router.get('/', (_req, res) => {
  res.json([...tracksMap.values()].map(toSummary));
});

router.get('/:id', (req, res) => {
  const track = tracksMap.get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  const { backgroundImageFile, ...trackData } = track;
  res.json(trackData);
});

router.get('/:id/background', (req, res) => {
  const track = tracksMap.get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  if (!track.backgroundImageFile) return res.status(404).json({ error: 'No background' });

  const bgPath = join(BG_DIR, track.backgroundImageFile);
  if (!existsSync(bgPath)) return res.status(404).json({ error: 'Background file missing' });

  const ext = extname(track.backgroundImageFile).slice(1).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  createReadStream(bgPath).pipe(res);
});

export default router;

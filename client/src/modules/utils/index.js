// ============================================================
// File:        index.js
// Path:        client/src/modules/utils/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Shared utility functions used across client modules and screens
// ============================================================

export function formatLapTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
}

export function formatRank(rank) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = rank % 100;
  return rank + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

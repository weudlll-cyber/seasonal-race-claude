// ============================================================
// File:        useStorage.js
// Path:        client/src/modules/storage/useStorage.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: React hook that syncs component state with localStorage
// ============================================================

import { useState } from 'react';
import { storageGet, storageSet } from './storage.js';

/**
 * Like useState but backed by localStorage.
 * Reads the stored value on first render; writes on every update.
 *
 * @template T
 * @param {string} key - localStorage key (use KEYS constants)
 * @param {T} defaultValue - used when no stored value exists
 * @returns {[T, (value: T | ((prev: T) => T)) => void]}
 */
export function useStorage(key, defaultValue) {
  const [value, setLocal] = useState(() => storageGet(key, defaultValue));

  function setValue(next) {
    setLocal((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      storageSet(key, resolved);
      return resolved;
    });
  }

  return [value, setValue];
}

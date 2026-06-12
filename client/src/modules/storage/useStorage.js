// ============================================================
// File:        useStorage.js
// Path:        client/src/modules/storage/useStorage.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: React hook that syncs component state with localStorage
// ============================================================

import { useState, useEffect } from 'react';
import { storageGet, storageSet } from './storage.js';

// Fired whenever any useStorage instance writes a key in this tab.
// Lets sibling instances stay in sync without a shared context.
const STORAGE_SYNC_EVENT = 'racearena:storage-update';

/**
 * Like useState but backed by localStorage.
 * Reads the stored value on first render; writes on every update.
 * Sibling instances for the same key stay in sync via a custom window event.
 *
 * @template T
 * @param {string} key - localStorage key (use KEYS constants)
 * @param {T} defaultValue - used when no stored value exists
 * @returns {[T, (value: T | ((prev: T) => T)) => void]}
 */
export function useStorage(key, defaultValue) {
  const [value, setLocal] = useState(() => storageGet(key, defaultValue));

  useEffect(() => {
    function onSync(e) {
      if (e.detail?.key === key) {
        setLocal(storageGet(key, defaultValue));
      }
    }
    window.addEventListener(STORAGE_SYNC_EVENT, onSync);
    return () => window.removeEventListener(STORAGE_SYNC_EVENT, onSync);
    // defaultValue omitted: it's a stable module constant in all callers; the
    // handler only uses it as a storageGet fallback when nothing is stored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function setValue(next) {
    setLocal((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      storageSet(key, resolved);
      window.dispatchEvent(new CustomEvent(STORAGE_SYNC_EVENT, { detail: { key } }));
      return resolved;
    });
  }

  return [value, setValue];
}

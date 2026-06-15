// ============================================================
// File:        useStorage.js
// Path:        client/src/modules/storage/useStorage.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: React hook that syncs component state with localStorage.
//              Reactive to external writes via STORAGE_CHANGE_EVENT (D4 fix):
//              any storageSet() call for the same key — even from outside React —
//              triggers a re-read and re-render. Own setValue path unchanged.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { storageGet, storageSet, STORAGE_CHANGE_EVENT } from './storage.js';

/**
 * Like useState but backed by localStorage.
 * Reads the stored value on first render; writes on every update.
 * Also re-reads when another module writes the same key via storageSet().
 *
 * @template T
 * @param {string} key - localStorage key (use KEYS constants)
 * @param {T} defaultValue - used when no stored value exists
 * @returns {[T, (value: T | ((prev: T) => T)) => void]}
 */
export function useStorage(key, defaultValue) {
  const [value, setLocal] = useState(() => storageGet(key, defaultValue));
  const defaultRef = useRef(defaultValue);

  // Re-read from localStorage when another module writes to the same key.
  // Uses JSON.stringify comparison as a no-op guard to avoid render loops when
  // the value hasn't actually changed (e.g. setValue's own storageSet call).
  useEffect(() => {
    function onStorageChange(e) {
      if (e.detail?.key !== key) return;
      const next = storageGet(key, defaultRef.current);
      setLocal((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
    }
    window.addEventListener(STORAGE_CHANGE_EVENT, onStorageChange);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, onStorageChange);
  }, [key]);

  function setValue(next) {
    setLocal((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      storageSet(key, resolved);
      return resolved;
    });
  }

  return [value, setValue];
}

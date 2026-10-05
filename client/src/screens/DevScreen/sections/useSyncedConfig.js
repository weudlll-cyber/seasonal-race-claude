// ============================================================
// File:        useSyncedConfig.js
// Path:        client/src/screens/DevScreen/sections/useSyncedConfig.js
// Project:     RaceArena — DEVSCREEN-CHAPTERS-1
// Created:     2026-10-05
// Description: One stored config block as section state — read through its own loader, written
//              through its own saver, under its own storage key, exactly as the sections did with
//              `useState(load)` + `useEffect(save)`: saved once on mount and on every change.
//
//              WHAT IS ADDED, AND WHY: the chapter layout mounts one section's parts in several
//              places at once, and every copy holds the WHOLE block. Without this, two copies
//              would overwrite each other's edits (a part in The race and a part in Look write one
//              block). A write goes through `storageSet`, which announces the key
//              (STORAGE_CHANGE_EVENT); every other copy re-reads the block through the loader and
//              does not write it back.
//
//              The saver's failure (`false` from storageSet — storage full) is returned so a
//              section can say so, as Race Tuning always has.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { STORAGE_CHANGE_EVENT } from '../../../modules/storage/storage.js';

/**
 * @template T
 * @param {string} storageKey - the KEYS entry the saver writes
 * @param {() => T} load - the block's loader (module function, stable)
 * @param {(config: T) => unknown} save - the block's saver (module function, stable)
 * @returns {[T, (next: T | ((prev: T) => T)) => void, boolean]} config, setter, last save failed
 */
export function useSyncedConfig(storageKey, load, save) {
  const [config, setConfig] = useState(load);
  const [saveFailed, setSaveFailed] = useState(false);
  // What this copy shows, and the last value it READ BACK from another copy's write — that one is
  // already in storage and is not saved a second time.
  const current = useRef(config);
  const readBack = useRef(null);

  useEffect(() => {
    current.current = config;
    if (config === readBack.current) return;
    setSaveFailed(save(config) === false);
  }, [config, save]);

  useEffect(() => {
    function onStorageChange(e) {
      if (e.detail?.key !== storageKey) return;
      const next = load();
      if (JSON.stringify(next) === JSON.stringify(current.current)) return;
      readBack.current = next;
      setConfig(next);
    }
    window.addEventListener(STORAGE_CHANGE_EVENT, onStorageChange);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, onStorageChange);
  }, [storageKey, load]);

  return [config, setConfig, saveFailed];
}

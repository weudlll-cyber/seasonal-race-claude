// ============================================================
// File:        useStorage.test.js
// Path:        client/src/modules/storage/useStorage.test.js
// Project:     RaceArena
// Created:     2026-06-10
// Description: Contract tests for useStorage — lazy read, missing key,
//              and functional update path.
// ============================================================

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useStorage } from './useStorage.js';

const KEY = 'racearena:test-hook';

describe('useStorage', () => {
  beforeEach(() => localStorage.clear());

  // ── Invariant: lazy initializer reads from storage when key exists ──────────
  it('returns the stored value when the key already exists in localStorage', () => {
    localStorage.setItem(KEY, JSON.stringify({ count: 7 }));
    const { result } = renderHook(() => useStorage(KEY, { count: 0 }));
    expect(result.current[0]).toEqual({ count: 7 });
  });

  // ── Invariant: lazy initializer falls back to default when key is absent ────
  it('returns the default value when the key is absent from localStorage', () => {
    const { result } = renderHook(() => useStorage(KEY, 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  // ── Invariant: functional update receives current value and persists ─────────
  it('functional update receives current state as prev and writes the result to localStorage', () => {
    localStorage.setItem(KEY, JSON.stringify(10));
    const { result } = renderHook(() => useStorage(KEY, 0));

    act(() => {
      result.current[1]((prev) => prev + 5);
    });

    expect(result.current[0]).toBe(15);
    expect(JSON.parse(localStorage.getItem(KEY))).toBe(15);
  });
});

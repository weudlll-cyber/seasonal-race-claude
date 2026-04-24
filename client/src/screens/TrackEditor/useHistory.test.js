import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from './useHistory.js';

const snap = (n) => ({ n });

describe('useHistory', () => {
  it('initial state: canUndo and canRedo are both false', () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('after pushHistory: canUndo is true and canRedo is false', () => {
    const { result } = renderHook(() => useHistory());
    act(() => {
      result.current.pushHistory(snap(1));
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo returns the last-pushed snapshot and canRedo becomes true', () => {
    const { result } = renderHook(() => useHistory());
    act(() => {
      result.current.pushHistory(snap(1));
    });
    let restored;
    act(() => {
      restored = result.current.undo(snap(99));
    });
    expect(restored).toEqual(snap(1));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo returns the snapshot that was passed to undo', () => {
    const { result } = renderHook(() => useHistory());
    act(() => {
      result.current.pushHistory(snap(1));
    });
    act(() => {
      result.current.undo(snap(2));
    });
    let reapplied;
    act(() => {
      reapplied = result.current.redo(snap(1));
    });
    expect(reapplied).toEqual(snap(2));
    expect(result.current.canRedo).toBe(false);
    expect(result.current.canUndo).toBe(true);
  });

  it('a new push after undo clears the redo stack', () => {
    const { result } = renderHook(() => useHistory());
    act(() => {
      result.current.pushHistory(snap(1));
    });
    act(() => {
      result.current.undo(snap(2));
    });
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.pushHistory(snap(3));
    });
    expect(result.current.canRedo).toBe(false);
  });

  it('history is capped at 50: push 60, then only 50 undos are possible', () => {
    const { result } = renderHook(() => useHistory());
    act(() => {
      for (let i = 0; i < 60; i++) result.current.pushHistory(snap(i));
    });
    act(() => {
      for (let i = 0; i < 50; i++) result.current.undo(snap(999));
    });
    expect(result.current.canUndo).toBe(false);
  });

  it('resetHistory clears both the undo and redo stacks', () => {
    const { result } = renderHook(() => useHistory());
    act(() => {
      result.current.pushHistory(snap(1));
      result.current.undo(snap(2));
    });
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.resetHistory();
    });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

// ============================================================
// File:        useHistory.js
// Path:        client/src/screens/TrackEditor/useHistory.js
// Project:     RaceArena
// Description: Undo/redo history hook for the Track Editor
// ============================================================

import { useState, useRef, useCallback } from 'react';

const MAX_HISTORY = 50;

export function useHistory() {
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushHistory = useCallback((snapshot) => {
    undoRef.current = [...undoRef.current, snapshot].slice(-MAX_HISTORY);
    redoRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback((currentSnapshot) => {
    if (undoRef.current.length === 0) return null;
    const prev = undoRef.current[undoRef.current.length - 1];
    undoRef.current = undoRef.current.slice(0, -1);
    redoRef.current = [...redoRef.current, currentSnapshot];
    setCanUndo(undoRef.current.length > 0);
    setCanRedo(true);
    return prev;
  }, []);

  const redo = useCallback((currentSnapshot) => {
    if (redoRef.current.length === 0) return null;
    const next = redoRef.current[redoRef.current.length - 1];
    redoRef.current = redoRef.current.slice(0, -1);
    undoRef.current = [...undoRef.current, currentSnapshot];
    setCanUndo(true);
    setCanRedo(redoRef.current.length > 0);
    return next;
  }, []);

  const resetHistory = useCallback(() => {
    undoRef.current = [];
    redoRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { pushHistory, undo, redo, canUndo, canRedo, resetHistory };
}

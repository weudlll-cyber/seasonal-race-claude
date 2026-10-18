// ============================================================
// File:        RaceServerNote.test.jsx
// Path:        client/src/screens/RaceScreen/RaceServerNote.test.jsx
// Project:     RaceArena — OFFLINE-1 F3
// Description: The standings note follows serverStatus.js through its events: shown while the
//              server is unreachable — including when the outage began before the race screen
//              mounted — and gone once the server answers.
// ============================================================

import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import RaceServerNote, { RACE_SERVER_NOTE } from './RaceServerNote.jsx';
import {
  markServerReachable,
  markServerUnreachable,
  resetServerStatus,
} from '../../modules/serverStatus.js';

beforeEach(() => resetServerStatus());
afterEach(() => resetServerStatus());

describe('RaceServerNote', () => {
  it('shows nothing while the server answers, or before anything is known', () => {
    render(<RaceServerNote />);
    expect(screen.queryByTestId('race-server-note')).toBeNull();
    act(() => markServerReachable());
    expect(screen.queryByTestId('race-server-note')).toBeNull();
  });

  it('appears when the server stops answering, and goes when it answers again', () => {
    render(<RaceServerNote />);
    act(() => markServerUnreachable());
    expect(screen.getByTestId('race-server-note').textContent).toBe(RACE_SERVER_NOTE);
    act(() => markServerReachable());
    expect(screen.queryByTestId('race-server-note')).toBeNull();
  });

  it('is there at once when the race screen mounts during an outage', () => {
    markServerUnreachable();
    render(<RaceServerNote />);
    expect(screen.getByTestId('race-server-note')).toBeTruthy();
  });
});

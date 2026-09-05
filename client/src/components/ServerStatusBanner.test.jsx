// ============================================================
// File:        ServerStatusBanner.test.jsx
// Path:        client/src/components/ServerStatusBanner.test.jsx
// Project:     RaceArena — SERVER-GONE-1
//
// THE BANNER IS THE WHOLE POINT OF THE PIECE: the failure was always handled, and always in the
// console. These tests hold that it reaches the INTERFACE, that it says what still works, and that
// it does not appear before anything has been tried.
// ============================================================

import { render, screen, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ServerStatusBanner from './ServerStatusBanner.jsx';
import {
  markServerReachable,
  markServerUnreachable,
  resetServerStatus,
} from '../modules/serverStatus.js';

beforeEach(() => resetServerStatus());
afterEach(() => {
  cleanup();
  resetServerStatus();
});

describe('ServerStatusBanner', () => {
  // What breaks if deleted: a banner announcing a dead server on every cold start, before a single
  // request has been made.
  it('shows nothing before anything has been tried', () => {
    render(<ServerStatusBanner />);
    expect(screen.queryByTestId('server-status-banner')).not.toBeInTheDocument();
  });

  // What breaks if deleted: a working server would carry a permanent warning.
  it('shows nothing while the server is answering', () => {
    render(<ServerStatusBanner />);
    act(() => markServerReachable());
    expect(screen.queryByTestId('server-status-banner')).not.toBeInTheDocument();
  });

  // ★ What breaks if deleted: the piece. The failure goes back to being console-only.
  it('tells the player, in the interface, when the server stops answering', () => {
    render(<ServerStatusBanner />);
    act(() => markServerUnreachable());

    const banner = screen.getByTestId('server-status-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/server is not answering/i);
  });

  // What breaks if deleted: the message could shrink to "server unreachable", which leaves the
  // reader to guess whether the evening is over. It is not — the race is client-side.
  it('names what still works, so the message is an instruction and not just a warning', () => {
    render(<ServerStatusBanner />);
    act(() => markServerUnreachable());

    const banner = screen.getByTestId('server-status-banner');
    expect(banner).toHaveTextContent(/run races/i);
    expect(banner).toHaveTextContent(/need the server/i);
  });

  // What breaks if deleted: the banner could stay up after the server came back.
  it('clears itself when the server answers again', () => {
    render(<ServerStatusBanner />);
    act(() => markServerUnreachable());
    expect(screen.getByTestId('server-status-banner')).toBeInTheDocument();

    act(() => markServerReachable());
    expect(screen.queryByTestId('server-status-banner')).not.toBeInTheDocument();
  });
});

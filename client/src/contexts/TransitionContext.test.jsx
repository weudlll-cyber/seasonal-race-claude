// ============================================================
// File:        TransitionContext.test.jsx
// Path:        client/src/contexts/TransitionContext.test.jsx
// Project:     RaceArena
// Created:     2026-06-10
// Description: Contract tests for TransitionContext — fallback navigate,
//              provider path, and fade-navigate behavior.
// ============================================================

import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransitionProvider, useFadeNavigate } from './TransitionContext.jsx';

function WithProvider({ children }) {
  return (
    <MemoryRouter>
      <TransitionProvider>{children}</TransitionProvider>
    </MemoryRouter>
  );
}

// ── Invariant: fallback when no Provider in tree ──────────────────────────────

describe('useFadeNavigate — outside TransitionProvider', () => {
  it('returns a navigate function without throwing', () => {
    const { result } = renderHook(() => useFadeNavigate(), { wrapper: MemoryRouter });
    expect(typeof result.current).toBe('function');
  });
});

// ── Invariant: provider path returns context function ─────────────────────────

describe('useFadeNavigate — inside TransitionProvider', () => {
  it('returns a function when context is present', () => {
    const { result } = renderHook(() => useFadeNavigate(), { wrapper: WithProvider });
    expect(typeof result.current).toBe('function');
  });
});

// ── Behavior: navigation actually occurs after timers advance ────────────────

describe('fadeNavigate — navigation behavior', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('navigates to the given path after all timers advance', async () => {
    function ShowPath() {
      return <span data-testid="path">{useLocation().pathname}</span>;
    }

    function TestApp() {
      const fadeNav = useFadeNavigate();
      return (
        <>
          <button onClick={() => fadeNav('/destination')}>go</button>
          <ShowPath />
        </>
      );
    }

    render(
      <MemoryRouter>
        <TransitionProvider>
          <TestApp />
        </TransitionProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button'));

    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.getByTestId('path')).toHaveTextContent('/destination');
  });
});

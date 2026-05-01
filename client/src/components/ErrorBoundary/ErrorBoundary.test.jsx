// ============================================================
// File:        ErrorBoundary.test.jsx
// Path:        client/src/components/ErrorBoundary/ErrorBoundary.test.jsx
// Project:     RaceArena
// Created:     2026-05-01
// Description: Tests for the ErrorBoundary component
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, afterEach, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary.jsx';

// Component that throws on demand.
function Bomb({ shouldThrow = false }) {
  if (shouldThrow) throw new Error('Test render crash');
  return <div>App content</div>;
}

// Component that throws with undefined message edge case.
function BombUndefined({ shouldThrow = false }) {
  if (shouldThrow) {
    const e = new Error();
    e.message = undefined;
    throw e;
  }
  return <div>App content</div>;
}

// Suppress React's own console.error output during intentional error tests.
function suppressConsoleError() {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  return spy;
}

describe('ErrorBoundary', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = suppressConsoleError();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('App content')).toBeTruthy();
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('shows fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText(/An unexpected error occurred/)).toBeTruthy();
    expect(screen.queryByText('App content')).toBeNull();
  });

  it('logs render crash to console.error with prefix', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    const calls = consoleSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((msg) => msg.includes('[RaceArena] Render crash:'))).toBe(true);
    expect(calls.some((msg) => msg.includes('[RaceArena] Component stack:'))).toBe(true);
  });

  it('"Show technical details" toggles the details panel', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.queryByTestId('error-details')).toBeNull();

    fireEvent.click(screen.getByText('Show technical details'));
    expect(screen.getByTestId('error-details')).toBeTruthy();
    expect(screen.getByTestId('error-details').textContent).toContain('Test render crash');

    fireEvent.click(screen.getByText('Hide technical details'));
    expect(screen.queryByTestId('error-details')).toBeNull();
  });

  it('"Reload page" calls window.location.reload', () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy });

    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText('Reload page'));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('"Reset local data" with confirm=true clears racearena:* storage and reloads', () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    localStorage.setItem('racearena:tracks', 'data');
    localStorage.setItem('racearena:cache:bg-1', 'img');
    sessionStorage.setItem('racearena:race', 'session');
    localStorage.setItem('other-key', 'keep');

    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText('Reset local data'));

    expect(localStorage.getItem('racearena:tracks')).toBeNull();
    expect(localStorage.getItem('racearena:cache:bg-1')).toBeNull();
    expect(sessionStorage.getItem('racearena:race')).toBeNull();
    expect(localStorage.getItem('other-key')).toBe('keep');
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('"Reset local data" with confirm=false changes nothing and does not reload', () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    localStorage.setItem('racearena:tracks', 'data');

    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText('Reset local data'));

    expect(localStorage.getItem('racearena:tracks')).toBe('data');
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('handles error with undefined message without crashing the fallback', () => {
    render(
      <ErrorBoundary>
        <BombUndefined shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    fireEvent.click(screen.getByText('Show technical details'));
    const details = screen.getByTestId('error-details');
    expect(details.textContent).not.toContain('[object Object]');
  });
});

// ============================================================
// File:        startupReadiness.test.js
// Path:        server/src/startupReadiness.test.js
// Project:     RaceArena — PUBLISH-STEPS-1
//
// The property that matters is not "it warns" but WHEN IT DOES NOT. A readiness banner that fires on
// a correctly configured install is noise, and noise is how an operator learns to skip the thing that
// was going to save them. So the silence cases are asserted first and hardest.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { startupReadinessLines, reportStartupReadiness } from './startupReadiness.js';

const FULLY_CONFIGURED = {
  RA_BOOTSTRAP_TOKEN: 'tok',
  RA_SESSION_SECRET: 'sec',
  RA_CLIENT_ORIGIN: 'http://localhost:5173',
};

describe('startupReadiness — when it says NOTHING', () => {
  it('a fully configured install produces no lines at all', () => {
    expect(startupReadinessLines({ env: FULLY_CONFIGURED, servingClient: false })).toEqual([]);
  });

  it('★ a SAME-ORIGIN install needs no RA_CLIENT_ORIGIN and is not warned about it', () => {
    const env = { RA_BOOTSTRAP_TOKEN: 'tok', RA_SESSION_SECRET: 'sec' };
    // Serving its own client build: the browser reaches the app on THIS origin, CORS is irrelevant.
    expect(startupReadinessLines({ env, servingClient: true })).toEqual([]);
    // With no build to serve, the only way in is from another origin — which is the broken case.
    expect(startupReadinessLines({ env, servingClient: false })).toHaveLength(2);
  });

  it('production does not repeat the session warning — the server already throws there', () => {
    const env = { NODE_ENV: 'production', RA_BOOTSTRAP_TOKEN: 'tok', RA_CLIENT_ORIGIN: 'http://x' };
    expect(startupReadinessLines({ env, servingClient: false })).toEqual([]);
  });
});

describe('startupReadiness — what it catches', () => {
  it('the missing override file produces all three lines plus the pointer', () => {
    const lines = startupReadinessLines({ env: {}, servingClient: false });
    expect(lines).toHaveLength(4);
    expect(lines[0]).toMatch(/RA_BOOTSTRAP_TOKEN/);
    expect(lines[1]).toMatch(/RA_SESSION_SECRET/);
    expect(lines[2]).toMatch(/RA_CLIENT_ORIGIN/);
    expect(lines[3]).toMatch(/docker-compose\.override\.yml\.example/);
  });

  it('every line names a CONSEQUENCE, not just a variable', () => {
    const lines = startupReadinessLines({ env: {}, servingClient: false });
    expect(lines[0]).toMatch(/cannot create one/);
    expect(lines[1]).toMatch(/SIGNS ALL|SIGNS EVERYONE OUT/i);
    expect(lines[2]).toMatch(/REFUSED BY CORS/);
  });

  it('an empty or whitespace value counts as missing, not as set', () => {
    const env = { ...FULLY_CONFIGURED, RA_BOOTSTRAP_TOKEN: '   ' };
    expect(startupReadinessLines({ env, servingClient: true })).toHaveLength(2);
  });

  it('the pointer appears only when something else did', () => {
    expect(startupReadinessLines({ env: FULLY_CONFIGURED, servingClient: true })).toEqual([]);
  });
});

describe('startupReadiness — it is a pure decision, printed separately', () => {
  it('reportStartupReadiness prints each line through the log it is given', () => {
    const log = vi.fn();
    reportStartupReadiness({ env: {}, servingClient: false }, log);
    expect(log).toHaveBeenCalledTimes(4);
  });

  it('prints nothing for a healthy install', () => {
    const log = vi.fn();
    reportStartupReadiness({ env: FULLY_CONFIGURED, servingClient: true }, log);
    expect(log).not.toHaveBeenCalled();
  });

  it('defaults are safe: no arguments at all does not throw', () => {
    expect(() => startupReadinessLines()).not.toThrow();
  });
});

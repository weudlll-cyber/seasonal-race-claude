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

// ★ `RA_COOKIE_SECURE` JOINED THIS FIXTURE ON 2026-09-27 (B9, DELIVERY-CLEAN-3 piece 1), and that
// is the point rather than a detail: adding a fourth readiness condition CHANGED WHAT "FULLY
// CONFIGURED" MEANS. An install that has not answered the transport question is no longer fully
// configured, and every silence assertion below now has to say so. Seven of these ten tests failed
// when the line was added, which is the correct way to learn that.
const FULLY_CONFIGURED = {
  RA_BOOTSTRAP_TOKEN: 'tok',
  RA_SESSION_SECRET: 'sec',
  RA_CLIENT_ORIGIN: 'http://localhost:5173',
  RA_COOKIE_SECURE: 'true',
};

describe('startupReadiness — when it says NOTHING', () => {
  it('a fully configured install produces no lines at all', () => {
    expect(startupReadinessLines({ env: FULLY_CONFIGURED, servingClient: false })).toEqual([]);
  });

  it('★ a SAME-ORIGIN install needs no RA_CLIENT_ORIGIN and is not warned about it', () => {
    const env = { RA_BOOTSTRAP_TOKEN: 'tok', RA_SESSION_SECRET: 'sec', RA_COOKIE_SECURE: 'true' };
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
  it('the missing override file produces all FOUR lines plus the pointer', () => {
    const lines = startupReadinessLines({ env: {}, servingClient: false });
    expect(lines).toHaveLength(5);
    expect(lines[0]).toMatch(/RA_BOOTSTRAP_TOKEN/);
    expect(lines[1]).toMatch(/RA_SESSION_SECRET/);
    expect(lines[2]).toMatch(/RA_CLIENT_ORIGIN/);
    // B9: an empty env is not production, so the cookie resolves insecure.
    expect(lines[3]).toMatch(/SIGN-IN TRAVELS UNENCRYPTED/);
    expect(lines[4]).toMatch(/docker-compose\.override\.yml\.example/);
  });

  it('every line names a CONSEQUENCE, not just a variable', () => {
    const lines = startupReadinessLines({ env: {}, servingClient: false });
    expect(lines[0]).toMatch(/cannot create one/);
    expect(lines[1]).toMatch(/SIGNS ALL|SIGNS EVERYONE OUT/i);
    expect(lines[2]).toMatch(/REFUSED BY CORS/);
    expect(lines[3]).toMatch(/readable by anything on the network path/);
  });

  it('an empty or whitespace value counts as missing, not as set', () => {
    const env = { ...FULLY_CONFIGURED, RA_BOOTSTRAP_TOKEN: '   ' };
    expect(startupReadinessLines({ env, servingClient: true })).toHaveLength(2);
    // And a whitespace RA_COOKIE_SECURE is not 'true' either, so the transport line joins it.
    const ws = { ...FULLY_CONFIGURED, RA_COOKIE_SECURE: '  ' };
    expect(startupReadinessLines({ env: ws, servingClient: true })).toHaveLength(2);
  });

  it('the pointer appears only when something else did', () => {
    expect(startupReadinessLines({ env: FULLY_CONFIGURED, servingClient: true })).toEqual([]);
  });
});

describe('startupReadiness — it is a pure decision, printed separately', () => {
  it('reportStartupReadiness prints each line through the log it is given', () => {
    const log = vi.fn();
    reportStartupReadiness({ env: {}, servingClient: false }, log);
    expect(log).toHaveBeenCalledTimes(5);
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

// ── B9: THE TRANSPORT LINE (DELIVERY-CLEAN-3 piece 1, 2026-09-27) ─────────────────────────────
//
// The finding this closes: the entire cookie-Secure posture hangs on NODE_ENV === 'production',
// which is set in NO shipped file, so the DEFAULT deployment serves sign-in in clear and nothing
// said so. These tests pin both directions, because a warning that cannot go quiet is noise and a
// warning that cannot fire is decoration.
describe('startupReadiness — B9, the transport', () => {
  const CONFIGURED_BUT_INSECURE = {
    RA_BOOTSTRAP_TOKEN: 'tok',
    RA_SESSION_SECRET: 'sec',
    RA_CLIENT_ORIGIN: 'http://localhost:5173',
    // RA_COOKIE_SECURE deliberately absent, NODE_ENV deliberately absent: THE SHIPPED DEFAULT.
  };

  it('★ FIRES on the shipped default — no NODE_ENV, no RA_COOKIE_SECURE', () => {
    const lines = startupReadinessLines({ env: CONFIGURED_BUT_INSECURE, servingClient: true });
    expect(lines.some((l) => /SIGN-IN TRAVELS UNENCRYPTED/.test(l))).toBe(true);
  });

  it('names the consequence before the fix, like every other line', () => {
    const [warning] = startupReadinessLines({ env: CONFIGURED_BUT_INSECURE, servingClient: true });
    // consequence first...
    expect(warning.indexOf('UNENCRYPTED')).toBeLessThan(warning.indexOf('RA_COOKIE_SECURE=true'));
    // ...and it names the switch that fixes it, and where the fuller explanation lives.
    expect(warning).toMatch(/RA_COOKIE_SECURE=true/);
    expect(warning).toMatch(/DEPLOY-NOTES/);
  });

  it('★ SILENT when RA_COOKIE_SECURE=true', () => {
    const env = { ...CONFIGURED_BUT_INSECURE, RA_COOKIE_SECURE: 'true' };
    expect(startupReadinessLines({ env, servingClient: true })).toEqual([]);
  });

  it('★ SILENT when NODE_ENV=production resolves it secure without an explicit flag', () => {
    const env = { ...CONFIGURED_BUT_INSECURE, NODE_ENV: 'production' };
    expect(startupReadinessLines({ env, servingClient: true })).toEqual([]);
  });

  it("★ SILENT on 'auto' — trust-proxy decides per request, so this cannot know", () => {
    // Warning here would be the noise this file's header exists to prevent: an install behind a
    // TLS terminator that sets X-Forwarded-Proto is correctly configured and must not be nagged.
    const env = { ...CONFIGURED_BUT_INSECURE, RA_COOKIE_SECURE: 'auto' };
    expect(startupReadinessLines({ env, servingClient: true })).toEqual([]);
  });

  it('fires whether or not this server serves a client build', () => {
    // Unlike CORS, the transport question does not depend on who serves the app.
    for (const servingClient of [true, false]) {
      const lines = startupReadinessLines({ env: CONFIGURED_BUT_INSECURE, servingClient });
      expect(lines.some((l) => /UNENCRYPTED/.test(l))).toBe(true);
    }
  });

  it('★ it WARNS and does not refuse — the function still returns, never throws', () => {
    expect(() => startupReadinessLines({ env: CONFIGURED_BUT_INSECURE })).not.toThrow();
  });
});

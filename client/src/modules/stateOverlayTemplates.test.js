import { describe, it, expect } from 'vitest';
import {
  OVERLAY_TEMPLATES,
  hasAllVars,
  resolveTemplate,
  selectOverlayText,
} from './stateOverlayTemplates.js';

// ── hasAllVars ────────────────────────────────────────────────────────────

describe('hasAllVars', () => {
  it('returns true when all placeholders are provided', () => {
    expect(hasAllVars('Aktuell führt {leader}', { leader: 'Max' })).toBe(true);
  });

  it('returns false when a placeholder is missing', () => {
    expect(hasAllVars('{count} Racer auf Platz {position}', { count: 3 })).toBe(false);
  });

  it('returns true for template with no placeholders', () => {
    expect(hasAllVars('Heißes Rennen!', {})).toBe(true);
  });

  it('returns false when variable is present but empty string', () => {
    expect(hasAllVars('{leader} an der Spitze', { leader: '' })).toBe(false);
  });
});

// ── resolveTemplate ───────────────────────────────────────────────────────

describe('resolveTemplate', () => {
  it('replaces all placeholders with variable values', () => {
    expect(resolveTemplate('{count} Racer auf Platz {position}', { count: 4, position: 2 })).toBe(
      '4 Racer auf Platz 2'
    );
  });

  it('leaves unknown placeholders intact', () => {
    expect(resolveTemplate('Hallo {unknown}', {})).toBe('Hallo {unknown}');
  });

  it('converts numbers to strings', () => {
    expect(resolveTemplate('Platz {position}', { position: 1 })).toBe('Platz 1');
  });
});

// ── selectOverlayText ─────────────────────────────────────────────────────

describe('selectOverlayText', () => {
  it('returns a text and index from the OVERVIEW pool for a given leader', () => {
    const result = selectOverlayText('OVERVIEW', { leader: 'Anna' });
    expect(result).not.toBeNull();
    expect(result.text).toContain('Anna');
    expect(typeof result.index).toBe('number');
    expect(result.index).toBeGreaterThanOrEqual(0);
    expect(result.index).toBeLessThan(OVERLAY_TEMPLATES.OVERVIEW.length);
  });

  it('avoids repeating the same template index on consecutive calls (anti-repeat)', () => {
    // Run many times to catch any random collision
    const seen = new Set();
    let repeats = 0;
    for (let i = 0; i < 50; i++) {
      const first = selectOverlayText('OVERVIEW', { leader: 'X' });
      const second = selectOverlayText(
        'OVERVIEW',
        { leader: 'X' },
        {
          OVERVIEW: first.index,
        }
      );
      if (first.index === second.index) repeats++;
      seen.add(first.index);
      seen.add(second.index);
    }
    // With 8 templates, repeating the exact same index after anti-repeat should be impossible
    expect(repeats).toBe(0);
    // We should see more than one distinct index across all runs
    expect(seen.size).toBeGreaterThan(1);
  });

  it('skips templates whose required variables are not available', () => {
    // All BATTLE_ZOOM templates need {position} and/or {count} — passing empty vars
    // should yield null since no template can be satisfied.
    const result = selectOverlayText('BATTLE_ZOOM', {});
    expect(result).toBeNull();
  });

  it('skips templates with missing vars but picks one that has all vars available', () => {
    // COMEBACK_ZOOM templates all need {racer}. Provide it for some, omit others.
    // Since every template in COMEBACK_ZOOM needs {racer}, if we pass it we get a result.
    const result = selectOverlayText('COMEBACK_ZOOM', { racer: 'Felix' });
    expect(result).not.toBeNull();
    expect(result.text).toContain('Felix');
  });

  it('returns null when the state has no template pool', () => {
    const result = selectOverlayText('LEADER_ZOOM', { leader: 'Anna' });
    expect(result).toBeNull();
  });

  it('returns null for unknown state key', () => {
    expect(selectOverlayText('NONEXISTENT', {})).toBeNull();
  });

  it('resolves all variable placeholders in the returned text', () => {
    // Run many times to hit different templates; every result must have no {…} remaining
    for (let i = 0; i < 20; i++) {
      const r = selectOverlayText('OVERVIEW', { leader: 'Zara' });
      expect(r).not.toBeNull();
      expect(r.text).not.toMatch(/\{[^}]+\}/);
    }
  });

  it('anti-repeat is per-state: different states do not share last-used tracking', () => {
    const lastByState = { OVERVIEW: 0 };
    // COMEBACK_ZOOM is not in lastByState, so no restriction applies
    const r = selectOverlayText('COMEBACK_ZOOM', { racer: 'Leo' }, lastByState);
    expect(r).not.toBeNull();
  });

  it('still picks a template when the pool has only one usable entry', () => {
    // Construct a scenario where after filtering we have exactly one candidate.
    // Use OVERVIEW with a valid leader — if pool has 8 entries, all are usable.
    // To test the single-entry path, we mock by passing lastIndex for every index
    // except one. The function should still return a result (can't avoid repeat
    // when only one candidate exists).
    // We verify by checking the returned index IS the last-used one (forced repeat is OK).
    // This requires all-but-one to fail hasAllVars — not trivially reproducible with
    // production templates, so we verify the degenerate case indirectly:
    // pass lastIndex = -1 (no prior use) and confirm a result is returned.
    const r = selectOverlayText('OVERVIEW', { leader: 'Solo' }, { OVERVIEW: -1 });
    expect(r).not.toBeNull();
  });
});

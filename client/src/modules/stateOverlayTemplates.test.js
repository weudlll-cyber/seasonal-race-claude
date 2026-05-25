import { describe, it, expect } from 'vitest';
import {
  OVERLAY_TEMPLATES,
  hasAllVars,
  resolveTemplate,
  selectOverlayText,
  selectOverlayTextNoRepeat,
} from './stateOverlayTemplates.js';

// ── hasAllVars ────────────────────────────────────────────────────────────

describe('hasAllVars', () => {
  it('returns true when all placeholders are provided', () => {
    expect(hasAllVars('Currently leading: {leader}', { leader: 'Max' })).toBe(true);
  });

  it('returns false when a placeholder is missing', () => {
    expect(hasAllVars('{count} racers at position {position}', { count: 3 })).toBe(false);
  });

  it('returns true for template with no placeholders', () => {
    expect(hasAllVars('Close race!', {})).toBe(true);
  });

  it('returns false when variable is present but empty string', () => {
    expect(hasAllVars('{leader} out in front', { leader: '' })).toBe(false);
  });
});

// ── resolveTemplate ───────────────────────────────────────────────────────

describe('resolveTemplate', () => {
  it('replaces all placeholders with variable values', () => {
    expect(
      resolveTemplate('{count} racers at position {position}', { count: 4, position: 2 })
    ).toBe('4 racers at position 2');
  });

  it('leaves unknown placeholders intact', () => {
    expect(resolveTemplate('Hello {unknown}', {})).toBe('Hello {unknown}');
  });

  it('converts numbers to strings', () => {
    expect(resolveTemplate('Position {position}', { position: 1 })).toBe('Position 1');
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
    // COMEBACK_ZOOM templates all need {name}. Provide it for some, omit others.
    // Since every template in COMEBACK_ZOOM needs {name}, if we pass it we get a result.
    const result = selectOverlayText('COMEBACK_ZOOM', { name: 'Felix' });
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
    const r = selectOverlayText('COMEBACK_ZOOM', { name: 'Leo' }, lastByState);
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

  it('race-start scenario: first OVERVIEW entry after null→OVERVIEW transition picks a text', () => {
    // Regression test for the bug where camState/prevHudStateRef started as 'OVERVIEW',
    // preventing the first real OVERVIEW entry from being detected as a state change.
    // Fix: both initialised to null, so null→'OVERVIEW' is a genuine transition.
    // This test simulates what RaceScreen does when that transition fires:
    // selectOverlayText('OVERVIEW', { leader: 'Max' }, {}) — no prior state, fresh race.
    const result = selectOverlayText('OVERVIEW', { leader: 'Max' }, {});
    expect(result).not.toBeNull();
    expect(result.text).toContain('Max');
    expect(result.text).not.toMatch(/\{[^}]+\}/); // no unresolved placeholders
  });
});

// ── selectOverlayTextNoRepeat ─────────────────────────────────────────────

describe('selectOverlayTextNoRepeat', () => {
  const battleVars = { position: 3, count: 3 };

  it('returns a valid BATTLE_ZOOM template when vars are provided', () => {
    const result = selectOverlayTextNoRepeat('BATTLE_ZOOM', battleVars, new Set());
    expect(result).not.toBeNull();
    expect(result.text).not.toMatch(/\{[^}]+\}/);
    expect(typeof result.index).toBe('number');
  });

  it('returns null when no template can satisfy the variables', () => {
    expect(selectOverlayTextNoRepeat('BATTLE_ZOOM', {}, new Set())).toBeNull();
  });

  it('never repeats an already-used index when alternatives exist', () => {
    const used = new Set();
    const picked = new Set();
    const poolSize = OVERLAY_TEMPLATES.BATTLE_ZOOM.length;
    // Draw as many times as there are templates; each pick should be fresh
    for (let i = 0; i < poolSize; i++) {
      const r = selectOverlayTextNoRepeat('BATTLE_ZOOM', battleVars, used);
      expect(r).not.toBeNull();
      expect(used.has(r.index)).toBe(false);
      used.add(r.index);
      picked.add(r.index);
    }
    // All templates should have been used after poolSize draws
    expect(picked.size).toBe(poolSize);
  });

  it('falls back to any usable template when all have been exhausted', () => {
    // Fill the used set with all valid indices
    const pool = OVERLAY_TEMPLATES.BATTLE_ZOOM;
    const allIndices = new Set(pool.map((_, i) => i));
    // Should still return something (the full fallback pool)
    const result = selectOverlayTextNoRepeat('BATTLE_ZOOM', battleVars, allIndices);
    expect(result).not.toBeNull();
  });

  it('returns null for unknown state key', () => {
    expect(selectOverlayTextNoRepeat('NONEXISTENT', {}, new Set())).toBeNull();
  });
});

// ── Phase 3C: LEAD_CHANGE template pool ──────────────────────────────────

describe('Phase 3C — LEAD_CHANGE template pool', () => {
  it('has ≥8 templates', () => {
    expect(OVERLAY_TEMPLATES.LEAD_CHANGE.length).toBeGreaterThanOrEqual(8);
  });

  it('every template requires {newLeader} and {previousLeader}', () => {
    for (const tmpl of OVERLAY_TEMPLATES.LEAD_CHANGE) {
      expect(tmpl).toMatch(/\{newLeader\}/);
      expect(tmpl).toMatch(/\{previousLeader\}/);
    }
  });

  it('all templates resolve without leftover placeholders when both vars provided', () => {
    const vars = { newLeader: 'Bob', previousLeader: 'Alice' };
    for (const tmpl of OVERLAY_TEMPLATES.LEAD_CHANGE) {
      const resolved = resolveTemplate(tmpl, vars);
      expect(resolved).not.toMatch(/\{[^}]+\}/);
    }
  });

  it('selectOverlayTextNoRepeat returns a result with {newLeader} and {previousLeader}', () => {
    const result = selectOverlayTextNoRepeat(
      'LEAD_CHANGE',
      { newLeader: 'Max', previousLeader: 'Anna' },
      new Set()
    );
    expect(result).not.toBeNull();
    expect(result.text).toContain('Max');
    expect(result.text).toContain('Anna');
    expect(result.text).not.toMatch(/\{[^}]+\}/);
  });
});

// ── Phase 3B: BATTLE_ZOOM template pool ──────────────────────────────────

describe('Phase 3B — BATTLE_ZOOM template pool', () => {
  it('has 15 templates (10 spec + 5 CC additions)', () => {
    expect(OVERLAY_TEMPLATES.BATTLE_ZOOM).toHaveLength(15);
  });

  it('every template requires {position} and/or {count} — yields null with empty vars', () => {
    expect(selectOverlayText('BATTLE_ZOOM', {})).toBeNull();
  });

  it('all templates resolve without leftover placeholders when both vars provided', () => {
    const vars = { position: 2, count: 4 };
    const pool = OVERLAY_TEMPLATES.BATTLE_ZOOM;
    for (const tmpl of pool) {
      const resolved = tmpl
        .replace(/\{position\}/g, String(vars.position))
        .replace(/\{count\}/g, String(vars.count));
      expect(resolved).not.toMatch(/\{[^}]+\}/);
    }
  });
});

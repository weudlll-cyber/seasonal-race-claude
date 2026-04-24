import { describe, it, expect, vi } from 'vitest';
import {
  buildTrackFromEditorState,
  validateEditorState,
  extractEffects,
} from './trackEditorSave.js';

const two = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
];
const three = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 50, y: 100 },
];

describe('buildTrackFromEditorState', () => {
  it('Center Mode produces sourceMode=center with centerPoints, width, and derived boundaries', () => {
    const result = buildTrackFromEditorState({
      mode: 'center',
      centerPoints: two,
      centerWidth: 80,
      innerPoints: [],
      outerPoints: [],
      closed: false,
      name: 'Test Track',
      backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
    });
    expect(result.sourceMode).toBe('center');
    expect(result.centerPoints).toEqual(two);
    expect(result.width).toBe(80);
    expect(result.innerPoints.length).toBeGreaterThan(0);
    expect(result.outerPoints.length).toBeGreaterThan(0);
    expect(result.name).toBe('Test Track');
  });

  it('Boundary Mode produces sourceMode=boundary with inner/outer only — no centerPoints or width', () => {
    const result = buildTrackFromEditorState({
      mode: 'boundary',
      centerPoints: [],
      centerWidth: 120,
      innerPoints: two,
      outerPoints: two,
      closed: false,
      name: 'Boundary Track',
      backgroundImage: '/assets/tracks/backgrounds/city-circuit.png',
    });
    expect(result.sourceMode).toBe('boundary');
    expect(result.innerPoints).toEqual(two);
    expect(result.outerPoints).toEqual(two);
    expect(result.centerPoints).toBeUndefined();
    expect(result.width).toBeUndefined();
  });

  it('closed flag is carried through', () => {
    const result = buildTrackFromEditorState({
      mode: 'center',
      centerPoints: three,
      centerWidth: 100,
      innerPoints: [],
      outerPoints: [],
      closed: true,
      name: 'Loop',
      backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
    });
    expect(result.closed).toBe(true);
  });

  it('background image is stored as provided', () => {
    const img = '/assets/tracks/backgrounds/space-sprint.jpg';
    const result = buildTrackFromEditorState({
      mode: 'center',
      centerPoints: two,
      centerWidth: 120,
      innerPoints: [],
      outerPoints: [],
      closed: false,
      name: 'Sprint',
      backgroundImage: img,
    });
    expect(result.backgroundImage).toBe(img);
  });

  it('Center Mode with fewer than minPts throws a descriptive error', () => {
    expect(() =>
      buildTrackFromEditorState({
        mode: 'center',
        centerPoints: [{ x: 0, y: 0 }],
        centerWidth: 120,
        innerPoints: [],
        outerPoints: [],
        closed: false,
        name: 'Bad',
        backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
      })
    ).toThrow(/at least 2/);
  });

  it('Boundary Mode with empty inner list throws', () => {
    expect(() =>
      buildTrackFromEditorState({
        mode: 'boundary',
        centerPoints: [],
        centerWidth: 120,
        innerPoints: [],
        outerPoints: two,
        closed: false,
        name: 'Bad',
        backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
      })
    ).toThrow();
  });

  it('Boundary Mode with empty outer list throws', () => {
    expect(() =>
      buildTrackFromEditorState({
        mode: 'boundary',
        centerPoints: [],
        centerWidth: 120,
        innerPoints: two,
        outerPoints: [],
        closed: false,
        name: 'Bad',
        backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
      })
    ).toThrow();
  });
});

describe('buildTrackFromEditorState — effects field', () => {
  it('includes effects array in the payload when provided', () => {
    const effects = [{ id: 'stars', config: { count: 200 } }];
    const result = buildTrackFromEditorState({
      mode: 'center',
      centerPoints: two,
      centerWidth: 80,
      innerPoints: [],
      outerPoints: [],
      closed: false,
      name: 'Effect Track',
      backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
      effects,
    });
    expect(result.effects).toEqual(effects);
  });

  it('defaults effects to [] when not provided', () => {
    const result = buildTrackFromEditorState({
      mode: 'center',
      centerPoints: two,
      centerWidth: 80,
      innerPoints: [],
      outerPoints: [],
      closed: false,
      name: 'No Effect',
      backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
    });
    expect(result.effects).toEqual([]);
  });

  it('caps effects at 3 entries', () => {
    const effects = [
      { id: 'stars', config: {} },
      { id: 'rain', config: {} },
      { id: 'mud', config: {} },
      { id: 'wave', config: {} },
    ];
    const result = buildTrackFromEditorState({
      mode: 'center',
      centerPoints: two,
      centerWidth: 80,
      innerPoints: [],
      outerPoints: [],
      closed: false,
      name: 'Many Effects',
      backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
      effects,
    });
    expect(result.effects).toHaveLength(3);
  });
});

describe('extractEffects', () => {
  it('returns empty array for geometry with no effects', () => {
    const result = extractEffects({ name: 'Old Track' });
    expect(result).toEqual([]);
  });

  it('returns valid effects unchanged', () => {
    const effects = [{ id: 'stars', config: { count: 100 } }];
    const result = extractEffects({ effects });
    expect(result).toEqual(effects);
  });

  it('filters out unknown effect ids and logs a warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = extractEffects({ effects: [{ id: 'nonexistent-effect', config: {} }] });
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('keeps valid entries and drops unknown ones from a mixed array', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = extractEffects({
      effects: [
        { id: 'stars', config: {} },
        { id: 'nonexistent', config: {} },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('stars');
    warnSpy.mockRestore();
  });
});

describe('validateEditorState', () => {
  it('empty name returns an error with "name" in message', () => {
    const result = validateEditorState({
      mode: 'center',
      centerPoints: two,
      innerPoints: [],
      outerPoints: [],
      closed: false,
      name: '',
    });
    expect(result).not.toBeNull();
    expect(result.message).toMatch(/name/i);
  });

  it('center open mode with 1 point (< 2) returns error referencing 2', () => {
    const result = validateEditorState({
      mode: 'center',
      centerPoints: [{ x: 0, y: 0 }],
      innerPoints: [],
      outerPoints: [],
      closed: false,
      name: 'Test',
    });
    expect(result).not.toBeNull();
    expect(result.message).toMatch(/2/);
  });

  it('center closed mode with 2 points (< 3) returns error referencing 3', () => {
    const result = validateEditorState({
      mode: 'center',
      centerPoints: two,
      innerPoints: [],
      outerPoints: [],
      closed: true,
      name: 'Test',
    });
    expect(result).not.toBeNull();
    expect(result.message).toMatch(/3/);
  });

  it('boundary open mode with empty inner returns error', () => {
    const result = validateEditorState({
      mode: 'boundary',
      centerPoints: [],
      innerPoints: [],
      outerPoints: two,
      closed: false,
      name: 'Test',
    });
    expect(result).not.toBeNull();
  });

  it('boundary closed mode with 2 inner and 2 outer points (< 3) returns error referencing 3', () => {
    const result = validateEditorState({
      mode: 'boundary',
      centerPoints: [],
      innerPoints: two,
      outerPoints: two,
      closed: true,
      name: 'Test',
    });
    expect(result).not.toBeNull();
    expect(result.message).toMatch(/3/);
  });

  it('valid open center state with 2 points and a name returns null', () => {
    const result = validateEditorState({
      mode: 'center',
      centerPoints: two,
      innerPoints: [],
      outerPoints: [],
      closed: false,
      name: 'Valid Track',
    });
    expect(result).toBeNull();
  });
});

// Regression guard: loading a saved track and immediately re-saving must be a data no-op.
describe('buildTrackFromEditorState — load/save round-trip fidelity', () => {
  it('closed: true survives a build → re-build cycle', () => {
    const geometry = buildTrackFromEditorState({
      mode: 'center',
      centerPoints: three,
      centerWidth: 80,
      innerPoints: [],
      outerPoints: [],
      closed: true,
      name: 'Horse Race',
      backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
    });
    expect(geometry.closed).toBe(true);

    const resaved = buildTrackFromEditorState({
      mode: geometry.sourceMode,
      centerPoints: geometry.centerPoints,
      centerWidth: geometry.width,
      innerPoints: [],
      outerPoints: [],
      closed: geometry.closed === true,
      name: geometry.name,
      backgroundImage: geometry.backgroundImage,
    });
    expect(resaved.closed).toBe(true);
  });

  it('closed: false survives a build → re-build cycle (no accidental flip)', () => {
    const geometry = buildTrackFromEditorState({
      mode: 'center',
      centerPoints: two,
      centerWidth: 80,
      innerPoints: [],
      outerPoints: [],
      closed: false,
      name: 'Open Track',
      backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
    });
    expect(geometry.closed).toBe(false);

    const resaved = buildTrackFromEditorState({
      mode: geometry.sourceMode,
      centerPoints: geometry.centerPoints,
      centerWidth: geometry.width,
      innerPoints: [],
      outerPoints: [],
      closed: geometry.closed === true,
      name: geometry.name,
      backgroundImage: geometry.backgroundImage,
    });
    expect(resaved.closed).toBe(false);
  });

  it('closed: undefined (pre-history save) normalizes to false and is stored as false', () => {
    const legacyTrack = { name: 'Legacy', backgroundImage: '/x.jpg' };
    const normalizedClosed = legacyTrack.closed === true;
    const resaved = buildTrackFromEditorState({
      mode: 'center',
      centerPoints: two,
      centerWidth: 80,
      innerPoints: [],
      outerPoints: [],
      closed: normalizedClosed,
      name: 'Legacy Track',
      backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
    });
    expect(resaved.closed).toBe(false);
  });
});

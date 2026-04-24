import { describe, it, expect, vi } from 'vitest';
import {
  buildTrackFromEditorState,
  validateEditorState,
  extractEffectConfig,
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

describe('buildTrackFromEditorState — effect fields', () => {
  it('includes effectId and effectConfig in the payload when provided', () => {
    const result = buildTrackFromEditorState({
      mode: 'center',
      centerPoints: two,
      centerWidth: 80,
      innerPoints: [],
      outerPoints: [],
      closed: false,
      name: 'Effect Track',
      backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
      effectId: 'stars',
      effectConfig: { count: 200, color: '#ff0000', twinkleSpeed: 1, opacity: 0.8, size: 1.5 },
    });
    expect(result.effectId).toBe('stars');
    expect(result.effectConfig.count).toBe(200);
  });

  it('defaults effectId to null and effectConfig to {} when not provided', () => {
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
    expect(result.effectId).toBeNull();
    expect(result.effectConfig).toEqual({});
  });
});

describe('extractEffectConfig', () => {
  it('returns effectId: null and effectConfig: {} for an old geometry with no effect fields', () => {
    const result = extractEffectConfig({ name: 'Old Track' });
    expect(result.effectId).toBeNull();
    expect(result.effectConfig).toEqual({});
  });

  it('returns the stored effectId and effectConfig for a valid known effect', () => {
    const result = extractEffectConfig({ effectId: 'stars', effectConfig: { count: 100 } });
    expect(result.effectId).toBe('stars');
    expect(result.effectConfig.count).toBe(100);
  });

  it('clears effectId and logs a warning for an unknown effect id', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = extractEffectConfig({ effectId: 'nonexistent-effect', effectConfig: {} });
    expect(result.effectId).toBeNull();
    expect(result.effectConfig).toEqual({});
    expect(warnSpy).toHaveBeenCalled();
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

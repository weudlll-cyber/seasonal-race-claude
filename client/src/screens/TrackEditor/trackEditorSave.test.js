import { describe, it, expect } from 'vitest';
import { buildTrackFromEditorState } from './trackEditorSave.js';

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

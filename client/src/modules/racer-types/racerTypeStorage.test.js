// ============================================================
// File:        racerTypeStorage.test.js
// Path:        client/src/modules/racer-types/racerTypeStorage.test.js
// Project:     RaceArena
// Created:     2026-05-27
// Description: Unit tests for racerTypeStorage persistence layer.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadStoredRacerTypes,
  saveStoredRacerType,
  deleteStoredRacerType,
} from './racerTypeStorage.js';

const STORAGE_KEY = 'racearena:racerTypes:v1';

const VALID_CONFIG = Object.freeze({
  id: 'test-cat',
  name: 'Cat',
  emoji: '🐱',
  spriteDataUrl: 'data:image/png;base64,abc',
  frameCount: 1,
  basePeriodMs: 500,
  displaySize: 40,
  trailStyle: 'dust',
  coats: [{ id: 'default', name: 'Default', tint: null }],
  primaryColor: '#ff0000',
});

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
});

describe('loadStoredRacerTypes', () => {
  it('returns [] when key is absent', () => {
    expect(loadStoredRacerTypes()).toEqual([]);
  });

  it('returns [] for corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json}');
    expect(loadStoredRacerTypes()).toEqual([]);
  });

  it('returns [] when stored value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(loadStoredRacerTypes()).toEqual([]);
  });

  it('returns stored array when valid', () => {
    const data = [VALID_CONFIG];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    expect(loadStoredRacerTypes()).toEqual(data);
  });
});

describe('saveStoredRacerType — round-trip', () => {
  it('persists and reloads a valid config', () => {
    saveStoredRacerType(VALID_CONFIG);
    const loaded = loadStoredRacerTypes();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject(VALID_CONFIG);
  });

  it('upserts when id already exists', () => {
    saveStoredRacerType(VALID_CONFIG);
    const updated = { ...VALID_CONFIG, name: 'Big Cat' };
    saveStoredRacerType(updated);
    const loaded = loadStoredRacerTypes();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Big Cat');
  });

  it('appends when id is new', () => {
    saveStoredRacerType(VALID_CONFIG);
    saveStoredRacerType({ ...VALID_CONFIG, id: 'test-dog', name: 'Dog', emoji: '🐶' });
    expect(loadStoredRacerTypes()).toHaveLength(2);
  });

  it('returns the saved config', () => {
    const result = saveStoredRacerType(VALID_CONFIG);
    expect(result).toMatchObject(VALID_CONFIG);
  });
});

describe('saveStoredRacerType — built-in collision guard', () => {
  it('throws when id matches a built-in id', () => {
    expect(() => saveStoredRacerType({ ...VALID_CONFIG, id: 'horse' }, ['horse', 'duck'])).toThrow(
      /collides with a built-in/
    );
  });

  it('accepts id not in builtInIds', () => {
    expect(() => saveStoredRacerType(VALID_CONFIG, ['horse', 'duck'])).not.toThrow();
  });
});

describe('saveStoredRacerType — validation errors', () => {
  it('throws for null config', () => {
    expect(() => saveStoredRacerType(null)).toThrow(/config must be an object/);
  });

  it('throws for missing id', () => {
    const { id: _, ...noId } = VALID_CONFIG;
    expect(() => saveStoredRacerType(noId)).toThrow(/id must be a non-empty string/);
  });

  it('throws for id with whitespace', () => {
    expect(() => saveStoredRacerType({ ...VALID_CONFIG, id: 'test cat' })).toThrow(
      /must not contain whitespace/
    );
  });

  it('throws for empty coats array', () => {
    expect(() => saveStoredRacerType({ ...VALID_CONFIG, coats: [] })).toThrow(
      /coats must be a non-empty array/
    );
  });

  it('throws for missing required field (spriteDataUrl)', () => {
    const { spriteDataUrl: _, ...noSprite } = VALID_CONFIG;
    expect(() => saveStoredRacerType(noSprite)).toThrow(
      /required field "spriteDataUrl" is missing/
    );
  });

  it('throws for missing required field (primaryColor)', () => {
    const { primaryColor: _, ...noColor } = VALID_CONFIG;
    expect(() => saveStoredRacerType(noColor)).toThrow(/required field "primaryColor" is missing/);
  });
});

describe('saveStoredRacerType — tintMode optional field', () => {
  it('preserves tintMode when present', () => {
    saveStoredRacerType({ ...VALID_CONFIG, tintMode: 'screen' });
    expect(loadStoredRacerTypes()[0].tintMode).toBe('screen');
  });

  it('tintMode is absent from storage when not provided', () => {
    saveStoredRacerType(VALID_CONFIG);
    expect('tintMode' in loadStoredRacerTypes()[0]).toBe(false);
  });

  it('round-trips all three valid tintMode values', () => {
    for (const mode of ['auto', 'multiply', 'screen']) {
      localStorage.removeItem('racearena:racerTypes:v1');
      saveStoredRacerType({ ...VALID_CONFIG, tintMode: mode });
      expect(loadStoredRacerTypes()[0].tintMode).toBe(mode);
    }
  });
});

describe('deleteStoredRacerType', () => {
  it('removes the entry by id', () => {
    saveStoredRacerType(VALID_CONFIG);
    deleteStoredRacerType('test-cat');
    expect(loadStoredRacerTypes()).toEqual([]);
  });

  it('is a no-op for unknown id', () => {
    saveStoredRacerType(VALID_CONFIG);
    deleteStoredRacerType('does-not-exist');
    expect(loadStoredRacerTypes()).toHaveLength(1);
  });

  it('only removes the matching id when multiple exist', () => {
    saveStoredRacerType(VALID_CONFIG);
    saveStoredRacerType({ ...VALID_CONFIG, id: 'test-dog', name: 'Dog', emoji: '🐶' });
    deleteStoredRacerType('test-cat');
    const loaded = loadStoredRacerTypes();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('test-dog');
  });
});

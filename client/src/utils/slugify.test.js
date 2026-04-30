import { describe, it, expect } from 'vitest';
import { slugify, uniqueSlug } from './slugify.js';

describe('slugify', () => {
  it('lowercases text', () => {
    expect(slugify('Mud')).toBe('mud');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('Black Sea')).toBe('black-sea');
  });

  it('trims leading and trailing whitespace', () => {
    expect(slugify('  mud  ')).toBe('mud');
  });

  it('removes characters outside [a-z0-9_-]', () => {
    expect(slugify('Lava!')).toBe('lava');
    expect(slugify('wet/sand')).toBe('wetsand');
    expect(slugify('hello@world')).toBe('helloworld');
  });

  it('collapses multiple hyphens into one', () => {
    expect(slugify('wet  sand')).toBe('wet-sand');
    expect(slugify('a---b')).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('-mud-')).toBe('mud');
    // space + hyphen: space becomes hyphen → '--class' → leading hyphens trimmed → 'class'
    expect(slugify('- class')).toBe('class');
  });

  it('preserves underscores', () => {
    expect(slugify('my_class')).toBe('my_class');
  });

  it('passes through an already-valid slug unchanged', () => {
    expect(slugify('dry-mud')).toBe('dry-mud');
    expect(slugify('sand_01')).toBe('sand_01');
  });

  it('falls back to "class" when no usable characters remain', () => {
    expect(slugify('!!!')).toBe('class');
    expect(slugify('   ')).toBe('class');
    expect(slugify('')).toBe('class');
  });
});

describe('uniqueSlug', () => {
  it('returns base if not present in existing set', () => {
    expect(uniqueSlug('mud', new Set())).toBe('mud');
    expect(uniqueSlug('mud', new Set(['sand']))).toBe('mud');
  });

  it('appends -2 when base already exists', () => {
    expect(uniqueSlug('mud', new Set(['mud']))).toBe('mud-2');
  });

  it('skips to the next available numeric suffix', () => {
    expect(uniqueSlug('mud', new Set(['mud', 'mud-2']))).toBe('mud-3');
    expect(uniqueSlug('mud', new Set(['mud', 'mud-2', 'mud-3']))).toBe('mud-4');
  });

  it('does not skip a suffix that is in the set', () => {
    expect(uniqueSlug('x', new Set(['x', 'x-3']))).toBe('x-2');
  });
});

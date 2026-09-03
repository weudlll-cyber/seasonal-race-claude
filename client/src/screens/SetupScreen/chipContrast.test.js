// ============================================================
// chipContrast.test.js — CHIP-CONTRAST-1
//
// SABOTAGE — the defect this pins is one a screenshot review catches and a test suite normally does
//   not: a control that declares a BACKGROUND and no COLOR. The label then falls back to the user
//   agent's default button text, which is BLACK, and this app is dark — 1.20:1, which the owner
//   could not read on his own screen. Nothing in the suite had an opinion, because every test that
//   touched the picker asserted behaviour and behaviour was correct.
//   What breaks if I delete this: any control in this stylesheet can go back to inventing its own
//   colours, or to naming a custom property this project does not define, and the first person to
//   find out is whoever is looking at the screen.
//
// IT MEASURES THE STYLESHEET, not a rendered page. jsdom does not compute colours and a browser
// test would put a ten-minute suite in front of a question that is arithmetic. The cost of that
// choice is stated in the last test: the ratios below are only true if the declarations are the
// ones that actually apply, so the file also has to be free of the tokens it does not define.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS_RAW = readFileSync(join(HERE, 'SetupScreen.module.css'), 'utf8');
// Comments are stripped before anything is parsed: this file's comments are long, and a
// selector matcher that swallowed one would silently stop matching the rule after it.
const CSS = CSS_RAW.replace(/\/\*[\s\S]*?\*\//g, '');
const MAIN = readFileSync(join(HERE, '../../styles/main.css'), 'utf8');

/** WCAG 2.1: sRGB -> linear -> relative luminance. */
function luminance(hex) {
  const h = hex.replace('#', '');
  const w = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(w.slice(i, i + 2), 16) / 255)
    .map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

/** The value of a `--token` as `main.css` defines it on :root. */
function token(name) {
  const m = MAIN.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

/**
 * The declarations that apply to one class, as a map.
 *
 * EVERY block that targets it, merged in source order, because the cascade is the thing being
 * measured: `.groupChip, .groupChipOn { background }` followed by `.groupChipOn { background }` is
 * how this stylesheet is written, and reading only the first block would measure the wrong colour.
 * A block whose selector continues past the class (`.groupChipOn .groupChipCount`) targets
 * something else and is skipped.
 */
function rule(className) {
  const out = {};
  for (const m of CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const targets = m[1]
      .split(',')
      .map((sel) => sel.trim())
      .some((sel) => sel === `.${className}`);
    if (!targets) continue;
    for (const line of m[2].split(';')) {
      const [k, ...v] = line.split(':');
      if (!k?.trim() || !v.length) continue;
      out[k.trim()] = v.join(':').trim();
    }
  }
  return Object.keys(out).length ? out : null;
}

/** Resolve a declared value to a hex, following one level of `var(--token)`. */
function resolve(value) {
  if (!value) return null;
  const v = value.trim();
  if (v.startsWith('#')) return v;
  const m = v.match(/var\(\s*(--[a-z-]+)\s*(?:,\s*([^)]+))?\)/);
  if (!m) return null;
  return token(m[1]) ?? (m[2] ? m[2].trim() : null);
}

const MIN_TEXT_CONTRAST = 4.5; // WCAG AA, normal-size text

describe('CHIP-CONTRAST-1 — the group chips are readable', () => {
  it('the unselected chip declares its own colour — the defect was that it did not', () => {
    // Without an explicit `color` the label is the UA's `buttontext`, i.e. black, on a near-black
    // field. That is the whole of the original bug and it is one missing declaration.
    expect(
      rule('groupChip')?.color,
      'the unselected chip must state its own text colour, or it inherits black'
    ).toBeTruthy();
    expect(
      rule('groupChipOn')?.color,
      'the selected chip must state its own text colour too'
    ).toBeTruthy();
    // And it must resolve to something this test can measure, rather than to a token that is not
    // there — an unresolvable colour is how the first version passed every behaviour test it had.
    expect(resolve(rule('groupChip').color)).toMatch(/^#[0-9a-f]{3,8}$/i);
    expect(resolve(rule('groupChipOn').color)).toMatch(/^#[0-9a-f]{3,8}$/i);
  });

  it('★ the unselected chip label clears 4.5:1 against the field it sits on', () => {
    const r = rule('groupChip');
    const ratio = contrast(resolve(r.color), resolve(r.background));
    expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('★ the selected chip label clears 4.5:1 against the field it sits on', () => {
    const r = rule('groupChipOn');
    const ratio = contrast(resolve(r.color), resolve(r.background));
    expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('the count pill on each chip clears it too, on both chip states', () => {
    const off = rule('groupChipCount');
    expect(contrast(resolve(off.color), resolve(off.background))).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST
    );
    // The selected override changes only the field.
    const onBg = CSS.match(/\.groupChipOn\s+\.groupChipCount\s*\{([^}]*)\}/)[1].match(
      /background:\s*([^;]+);/
    )[1];
    expect(contrast(resolve(off.color), onBg.trim())).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('the over-capacity notice clears it, and is the ACCENT rather than the error colour', () => {
    const r = rule('groupNotice');
    expect(contrast(resolve(r.color), resolve(r.background))).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST
    );
    // A warning, not an error: nothing is broken when a field hits its cap, and a normal outcome
    // dressed as a failure teaches an operator to skip the real ones.
    expect(r.color).toBe('var(--color-accent)');
    expect(r.color).not.toBe('var(--color-primary)');
  });

  it('★ it follows THIS SCREEN’S convention rather than inventing one', () => {
    // `.optionBtn` / `.optionBtnActive` is the pattern the lap choices already use, and `.tab` /
    // `.tabActive` follows the same idea. A chip with its own palette is a second mechanism beside
    // a working one, and it is what produced the unreadable version.
    const off = rule('groupChip');
    const on = rule('groupChipOn');
    const optOff = rule('optionBtn');
    const optOn = rule('optionBtnActive');
    expect(off.background).toBe(optOff.background);
    expect(off.color).toBe(optOff.color);
    expect(on.background).toBe(optOn.background);
    expect(on.color).toBe(optOn.color);
    expect(on['border-color']).toBe(optOn['border-color']);
  });

  it('★ names no custom property this project does not define', () => {
    // The first version used --border, --panel-alt and --brand-primary as a chip FILL. The first
    // two do not exist anywhere, so their fallbacks silently applied; the third exists only while a
    // branding profile is loaded, which made the chip's readability depend on a colour the operator
    // picks for their event. A control's contrast cannot be a property of somebody's logo.
    const used = [...CSS.matchAll(/var\(\s*(--[a-z-]+)/g)].map((m) => m[1]);
    const defined = new Set([...MAIN.matchAll(/(--[a-z-]+)\s*:/g)].map((m) => m[1]));
    // Brand and track colours are injected at runtime and are legitimate WHERE A FALLBACK IS GIVEN.
    const runtime = /^--(brand-|track-color)/;
    const unknown = [...new Set(used)].filter((v) => !defined.has(v) && !runtime.test(v));
    expect(unknown, `undefined custom properties: ${unknown.join(', ')}`).toEqual([]);
  });
});

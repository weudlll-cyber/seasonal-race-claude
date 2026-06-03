// ============================================================
// File:        lugeCoats.js
// Path:        client/src/modules/racer-types/lugeCoats.js
// Project:     RaceArena
// Created:     2026-06-01
// Description: Winter coat palette for the luge racer type.
//              Replaces STANDARD_COAT_PALETTE with winter-themed hues tuned
//              for visibility under tintMode:'multiply' on a dark sprite.
//              Luminance is kept high enough (L 55–100%) that multiply
//              tinting produces clearly distinct colors at race size.
// ============================================================

export const LUGE_COAT_PALETTE = [
  { id: 'base', name: 'Base', tint: null },
  { id: 'ice', name: 'Ice Blue', tint: '#7bafd4' },
  { id: 'bordeaux', name: 'Bordeaux', tint: '#c45c7a' },
  { id: 'forest', name: 'Forest', tint: '#5a9e6f' },
  { id: 'navy', name: 'Navy', tint: '#4a7ab5' },
  { id: 'slate', name: 'Slate', tint: '#7a8fa8' },
  { id: 'snow', name: 'Snow', tint: '#ffffff' },
  { id: 'charcoal', name: 'Charcoal', tint: '#8a9ab0' },
  { id: 'crimson', name: 'Crimson', tint: '#d44a6a' },
  { id: 'teal', name: 'Teal', tint: '#4a9eb5' },
  { id: 'olive', name: 'Olive', tint: '#8aaa4a' },
  { id: 'plum', name: 'Plum', tint: '#8a5aaa' },
  { id: 'rust', name: 'Rust', tint: '#d4724a' },
  { id: 'mint', name: 'Mint', tint: '#5ac8a0' },
  { id: 'gold', name: 'Gold', tint: '#d4aa4a' },
  { id: 'rose', name: 'Rose', tint: '#d48aaa' },
  { id: 'sky', name: 'Sky', tint: '#5aaad4' },
];

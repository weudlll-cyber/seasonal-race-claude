// ============================================================
// File:        standardCoats.js
// Path:        client/src/modules/racer-types/standardCoats.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Standard 20-coat palette for vehicle racer types.
//              Animal types define their own coat lists with species-specific names.
// ============================================================

/**
 * STANDARD_COAT_PALETTE — 20-coat palette for vehicle racer types.
 *
 * First coat (id: 'base', tint: null) renders the unmodified sprite.
 * Spread a copy into each config: coats: [...STANDARD_COAT_PALETTE]
 *
 * Colors are chosen for maximum visual distinction across the hue spectrum,
 * with mid-range brightness (L 40–75%) so they work with both multiply and
 * screen tint modes.
 */
export const STANDARD_COAT_PALETTE = [
  { id: 'base', name: 'Base', tint: null },
  { id: 'red', name: 'Red', tint: '#cc3333' },
  { id: 'blue', name: 'Blue', tint: '#3366cc' },
  { id: 'green', name: 'Green', tint: '#33aa44' },
  { id: 'yellow', name: 'Yellow', tint: '#dddd33' },
  { id: 'orange', name: 'Orange', tint: '#dd7733' },
  { id: 'purple', name: 'Purple', tint: '#993399' },
  { id: 'pink', name: 'Pink', tint: '#ee88aa' },
  { id: 'cyan', name: 'Cyan', tint: '#33cccc' },
  { id: 'brown', name: 'Brown', tint: '#8b4513' },
  { id: 'gray', name: 'Gray', tint: '#888888' },
  { id: 'coral', name: 'Coral', tint: '#ee5533' },
  { id: 'gold', name: 'Gold', tint: '#ddaa22' },
  { id: 'lime', name: 'Lime', tint: '#77dd22' },
  { id: 'mint', name: 'Mint', tint: '#22dd88' },
  { id: 'sky', name: 'Sky', tint: '#2299ee' },
  { id: 'indigo', name: 'Indigo', tint: '#5544cc' },
  { id: 'violet', name: 'Violet', tint: '#9944cc' },
  { id: 'magenta', name: 'Magenta', tint: '#cc3399' },
  { id: 'rose', name: 'Rose', tint: '#dd3377' },
];

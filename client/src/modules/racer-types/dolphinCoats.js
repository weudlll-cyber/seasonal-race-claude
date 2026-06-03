// ============================================================
// File:        dolphinCoats.js
// Path:        client/src/modules/racer-types/dolphinCoats.js
// Project:     RaceArena
// Description: 18 dolphin coats using the body+mask system.
//              Each coat has:
//                tint        — back/body color (multiply whole body)
//                patchTint   — lighter belly/sides color (screen blend via mask)
//                patternMask — dolphin-mask-belly.png
//              Colors span distinct hue families (blue, teal, brown, purple,
//              green, olive, wine) so coats are clearly distinguishable at
//              small render sizes.
// ============================================================

const BELLY = '/assets/racers/dolphin-mask-belly.png';

export const DOLPHIN_COATS = [
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    tint: '#2a5a8a',
    patchTint: '#e8f0f8',
    patternMask: BELLY,
  },
  { id: 'teal-grey', name: 'Teal Grey', tint: '#2a6a6a', patchTint: '#d8f0e8', patternMask: BELLY },
  {
    id: 'slate-blue',
    name: 'Slate Blue',
    tint: '#3a4a7a',
    patchTint: '#d8e8f8',
    patternMask: BELLY,
  },
  {
    id: 'warm-brown',
    name: 'Warm Brown',
    tint: '#6a4a3a',
    patchTint: '#f0e8d8',
    patternMask: BELLY,
  },
  {
    id: 'purple-grey',
    name: 'Purple Grey',
    tint: '#5a4a6a',
    patchTint: '#e8e0f0',
    patternMask: BELLY,
  },
  {
    id: 'forest-grey',
    name: 'Forest Grey',
    tint: '#3a5a4a',
    patchTint: '#d8ece0',
    patternMask: BELLY,
  },
  {
    id: 'steel-blue',
    name: 'Steel Blue',
    tint: '#2a4a6a',
    patchTint: '#f0f0f8',
    patternMask: BELLY,
  },
  { id: 'charcoal', name: 'Charcoal', tint: '#3a3a4a', patchTint: '#e8e8f0', patternMask: BELLY },
  {
    id: 'copper-grey',
    name: 'Copper Grey',
    tint: '#6a5a4a',
    patchTint: '#f0e8d8',
    patternMask: BELLY,
  },
  { id: 'dark-teal', name: 'Dark Teal', tint: '#1a4a4a', patchTint: '#c8e8e8', patternMask: BELLY },
  {
    id: 'indigo-grey',
    name: 'Indigo Grey',
    tint: '#3a3a6a',
    patchTint: '#d8d8f0',
    patternMask: BELLY,
  },
  {
    id: 'olive-grey',
    name: 'Olive Grey',
    tint: '#5a5a3a',
    patchTint: '#f0f0d8',
    patternMask: BELLY,
  },
  { id: 'wine-grey', name: 'Wine Grey', tint: '#5a3a4a', patchTint: '#f0d8d8', patternMask: BELLY },
  { id: 'navy', name: 'Navy', tint: '#1a2a4a', patchTint: '#d0e0f8', patternMask: BELLY },
  { id: 'moss', name: 'Moss', tint: '#3a4a2a', patchTint: '#e0f0d8', patternMask: BELLY },
  { id: 'rust-grey', name: 'Rust Grey', tint: '#6a4a3a', patchTint: '#f0ece8', patternMask: BELLY },
  { id: 'deep-blue', name: 'Deep Blue', tint: '#1a3a5a', patchTint: '#e8eef8', patternMask: BELLY },
  { id: 'midnight', name: 'Midnight', tint: '#2a2a3a', patchTint: '#e8e8f0', patternMask: BELLY },
];

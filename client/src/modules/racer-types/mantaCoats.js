// ============================================================
// File:        mantaCoats.js
// Path:        client/src/modules/racer-types/mantaCoats.js
// Project:     RaceArena
// Description: 9 manta ray coats using the body+mask system.
//              Each coat has:
//                tint        — dark body/wing color (multiply whole body)
//                patchTint   — light shoulder patch color (screen blend via mask)
//                patternMask — manta-mask-shoulders.png
// ============================================================

const SHOULDERS = '/assets/racers/manta-mask-shoulders.png';

export const MANTA_COATS = [
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    tint: '#1a2a4a',
    patchTint: '#f0f0f0',
    patternMask: SHOULDERS,
  },
  {
    id: 'deep-navy',
    name: 'Deep Navy',
    tint: '#1a1a3a',
    patchTint: '#f0e8d0',
    patternMask: SHOULDERS,
  },
  {
    id: 'dark-slate',
    name: 'Dark Slate',
    tint: '#2a3a4a',
    patchTint: '#d0d0d0',
    patternMask: SHOULDERS,
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    tint: '#2a2a2a',
    patchTint: '#e8e8e0',
    patternMask: SHOULDERS,
  },
  {
    id: 'dark-teal',
    name: 'Dark Teal',
    tint: '#1a3a3a',
    patchTint: '#d0e0f0',
    patternMask: SHOULDERS,
  },
  {
    id: 'gunmetal',
    name: 'Gunmetal',
    tint: '#2a3a3a',
    patchTint: '#c8c8c8',
    patternMask: SHOULDERS,
  },
  {
    id: 'deep-brown',
    name: 'Deep Brown',
    tint: '#3a2a1a',
    patchTint: '#f0e0d0',
    patternMask: SHOULDERS,
  },
  {
    id: 'dark-purple',
    name: 'Dark Purple',
    tint: '#2a1a3a',
    patchTint: '#d8c8a8',
    patternMask: SHOULDERS,
  },
  {
    id: 'iron-grey',
    name: 'Iron Grey',
    tint: '#3a3a3a',
    patchTint: '#e8e0d8',
    patternMask: SHOULDERS,
  },
];

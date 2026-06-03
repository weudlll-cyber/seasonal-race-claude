// ============================================================
// File:        turtleCoats.js
// Path:        client/src/modules/racer-types/turtleCoats.js
// Project:     RaceArena
// Description: 18 turtle shell coats using the dual-mask system.
//              Each coat has:
//                tint       — shell plate center color (warm naturals)
//                borderTint — seam/border color (70% brightness of tint)
//                patternMask — turtle-mask-plates.png (applied to plate areas)
//                borderMask  — turtle-mask-borders.png (applied to seam areas)
// ============================================================

const PLATES = '/assets/racers/turtle-mask-plates.png';
const BORDERS = '/assets/racers/turtle-mask-borders.png';

function darken(hex) {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * 0.62);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * 0.62);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * 0.62);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

const PLATE_COLORS = [
  { id: 'olive-green', name: 'Olive Green', tint: '#6b7c3a' },
  { id: 'amber-brown', name: 'Amber Brown', tint: '#8b5e2a' },
  { id: 'moss-green', name: 'Moss Green', tint: '#4a6b3a' },
  { id: 'sandy-tan', name: 'Sandy Tan', tint: '#c8a45a' },
  { id: 'dark-olive', name: 'Dark Olive', tint: '#4a5a2a' },
  { id: 'warm-ochre', name: 'Warm Ochre', tint: '#b8882a' },
  { id: 'forest-green', name: 'Forest Green', tint: '#3a5a2a' },
  { id: 'burnt-sienna', name: 'Burnt Sienna', tint: '#8b4a2a' },
  { id: 'slate-green', name: 'Slate Green', tint: '#5a6b5a' },
  { id: 'copper-brown', name: 'Copper Brown', tint: '#7a4a1a' },
  { id: 'teal-green', name: 'Teal Green', tint: '#2a6b5a' },
  { id: 'dark-brown', name: 'Dark Brown', tint: '#5a3a1a' },
  { id: 'sage-green', name: 'Sage Green', tint: '#7a8b5a' },
  { id: 'mahogany', name: 'Mahogany', tint: '#6a2a1a' },
  { id: 'khaki', name: 'Khaki', tint: '#9a8b5a' },
  { id: 'umber', name: 'Umber', tint: '#6a4a2a' },
  { id: 'seaweed', name: 'Seaweed', tint: '#3a5a4a' },
  { id: 'driftwood', name: 'Driftwood', tint: '#8a7a5a' },
];

export const TURTLE_COATS = PLATE_COLORS.map(({ id, name, tint }) => ({
  id,
  name,
  tint,
  borderTint: darken(tint),
  patternMask: PLATES,
  borderMask: BORDERS,
}));

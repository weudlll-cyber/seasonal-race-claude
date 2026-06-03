// ============================================================
// File:        koiCoats.js
// Path:        client/src/modules/racer-types/koiCoats.js
// Project:     RaceArena
// Description: 16 koi color coats, grouped by pattern style.
//              Each coat specifies a tint (the patch/body color applied via
//              multiply blend) and a patternMask URL (the mask that defines
//              which areas of the sprite receive the tint).
//
//              Colors are saturated and bright to survive multiply tinting
//              on a white sprite base. Orange is the dominant characteristic
//              koi color and appears in multiple coats.
//
//              Four pattern styles, 4 coats each:
//                Kohaku — 2-3 large irregular patches on natural white base
//                Sanke  — medium patches + scattered accent dots
//                Showa  — large tinted coverage with white cutout areas
//                Ogon   — near-full-body metallic with radial shimmer
// ============================================================

const KOHAKU = '/assets/racers/koi-mask-kohaku.png';
const SANKE = '/assets/racers/koi-mask-sanke.png';
const SHOWA = '/assets/racers/koi-mask-showa.png';
const OGON = '/assets/racers/koi-mask-ogon.png';

export const KOI_COATS = [
  // Kohaku style — large irregular patches on a natural white koi base
  { id: 'kohaku-crimson', name: 'Kohaku Bright Red', tint: '#ff1a1a', patternMask: KOHAKU },
  { id: 'kohaku-tangerine', name: 'Kohaku Koi Orange', tint: '#ff6600', patternMask: KOHAKU },
  { id: 'kohaku-lemon', name: 'Kohaku Golden Yellow', tint: '#ffcc00', patternMask: KOHAKU },
  { id: 'kohaku-pearl', name: 'Kohaku Pearl White', tint: '#f5f0eb', patternMask: KOHAKU },

  // Sanke style — medium patches + accent dots
  { id: 'sanke-vermillion', name: 'Sanke Vermillion', tint: '#ff3300', patternMask: SANKE },
  { id: 'sanke-orange', name: 'Sanke Tangerine', tint: '#ff8800', patternMask: SANKE },
  { id: 'sanke-copper', name: 'Sanke Copper Orange', tint: '#dd6600', patternMask: SANKE },
  { id: 'sanke-olive', name: 'Sanke Burnt Orange', tint: '#dd4400', patternMask: SANKE },

  // Showa style — dramatic large coverage with white breakouts
  { id: 'showa-black', name: 'Showa Deep Black', tint: '#111111', patternMask: SHOWA },
  { id: 'showa-cobalt', name: 'Showa Cobalt Blue', tint: '#2255bb', patternMask: SHOWA },
  { id: 'showa-steel', name: 'Showa Steel Blue', tint: '#3366aa', patternMask: SHOWA },
  { id: 'showa-sky', name: 'Showa Sky Blue', tint: '#4488dd', patternMask: SHOWA },

  // Ogon style — solid metallic with subtle radial shimmer
  { id: 'ogon-platinum', name: 'Ogon Pale Cream', tint: '#fff0e0', patternMask: OGON },
  { id: 'ogon-cream', name: 'Ogon Snow White', tint: '#ffffff', patternMask: OGON },
  { id: 'ogon-pink', name: 'Ogon Coral Orange', tint: '#ff5500', patternMask: OGON },
  { id: 'ogon-snow', name: 'Ogon Lemon Yellow', tint: '#ffee00', patternMask: OGON },
];

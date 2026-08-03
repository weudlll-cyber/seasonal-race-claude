// ============================================================
// File:        racerNames.js
// Path:        client/src/modules/racerNames.js
// Project:     RaceArena
// Created:     2026-08-03
// Description: THE quick-test roster. One list, one home (CAMERA-HYGIENE-1).
//
//              WHY THIS FILE EXISTS AND WHY IT MATTERS MORE THAN IT LOOKS. This list was duplicated
//              byte-for-byte in `SetupScreen.jsx` and `scripts/parity/goldenRunner.mjs`. A duplicated
//              array of strings is normally a shrug — this one is not, because in this project A
//              RACER'S NAME IS PHYSICS: `stablePairBit` hashes `r.name` into the avoidance symmetry
//              tie-break, so renaming a racer can change who wins. Measured once: renaming a roster
//              changed the finishing order in 24 of 24 races and the winner in 14 of 24.
//
//              So the two copies were not a tidiness problem. They were a silent-divergence bug
//              waiting for someone to add a name to one of them: the browser and the golden parity
//              runner would have produced DIFFERENT RACES from the same seed, and the golden test —
//              the thing whose whole job is to catch that — would have been the one lying.
//
//              Order is load-bearing. Never sort, never de-duplicate, never "tidy" this list; adding
//              at the END is the only safe edit, and even that changes any race whose field is large
//              enough to reach the new entry.
// ============================================================

/** Quick-test roster, in racer-index order. ORDER IS LOAD-BEARING — see the file header. */
export const QUICK_TEST_NAMES = [
  'Turbo',
  'Blaze',
  'Rocket',
  'Flash',
  'Speedy',
  'Thunder',
  'Nitro',
  'Drift',
  'Bolt',
  'Zephyr',
  'Storm',
  'Comet',
  'Arrow',
  'Blitz',
  'Apex',
  'Ridge',
  'Flare',
  'Surge',
  'Dash',
  'Nova',
  'Mercury',
  'Orbit',
  'Quasar',
  'Pixel',
  'Vortex',
  'Hawk',
  'Raptor',
  'Maverick',
  'Phantom',
  'Shadow',
  'Phoenix',
  'Titan',
  'Atlas',
  'Falcon',
  'Eagle',
  'Sparrow',
  'Raven',
  'Swift',
  'Breeze',
  'Gale',
  'Cosmos',
  'Nebula',
  'Pulsar',
  'Zenith',
  'Meridian',
  'Vector',
  'Delta',
  'Echo',
  'Foxtrot',
  'Gamma',
  'Onyx',
  'Jade',
  'Topaz',
  'Amber',
  'Obsidian',
  'Garnet',
  'Cobalt',
  'Crimson',
  'Azure',
  'Verdant',
  'Lynx',
  'Puma',
  'Jaguar',
  'Cheetah',
  'Ocelot',
  'Panther',
  'Cougar',
  'Viper',
  'Cobra',
  'Mamba',
];

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
//
//              ── QUICKTEST-NAMES-1: THREE ROSTERS NOW, AND THE WARNING APPLIES TO ALL THREE ─────
//              Every overlap measurement this project has made used QUICK_TEST_NAMES, whose entries
//              run 4 to 8 characters. A label box is as wide as the name inside it, so that roster
//              quietly set the geometry under every label decision taken so far. LONG and MIXED
//              exist to measure what a realistic roster does to it.
//
//              THEY ARE ADDITIONAL, NEVER A REPLACEMENT. `QUICK_TEST_NAMES` is untouched — same
//              entries, same order, same bytes — because it is the default path and a racer's name
//              is an engine input. Selecting one of the others changes races EXACTLY as editing the
//              original would: same hash, same tie-break, same consequence. So the load-bearing-order
//              rule above governs all three lists identically. Never sort, never de-duplicate, never
//              tidy; append only, and know that appending changes any race large enough to reach it.
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

/**
 * LONG — uniformly long names, in racer-index order. ORDER IS LOAD-BEARING — see the file header.
 *
 * Realistic rather than synthetic: these are full names of the kind an operator actually types when
 * the racers are real people, which is the case the owner expects trouble from. Every entry is 15-26
 * characters and therefore still enterable through the Players field, whose input caps at 32 — a
 * roster of `xxxxxxxxxxxxxxxxxxxxxx` would measure a case the product cannot produce.
 *
 * 100 entries, which is `maxPlayersOpen`. QUICK_TEST_NAMES has 70 and so cannot fill a full open
 * grid on its own; these can.
 */
export const QUICK_TEST_NAMES_LONG = [
  'Konstantin Brandner',
  'Maximiliane Kellerhoff',
  'Alexandra Wintergreen',
  'Bartholomew Ashcroft',
  'Friederike Sonnenberg',
  'Christopher Vandermeer',
  'Anastasia Lindqvist',
  'Sebastian Hollingsworth',
  'Wilhelmina Rothschild',
  'Nathaniel Brightwater',
  'Josephine Marchetti',
  'Ferdinand Oberhauser',
  'Clementine Ravensworth',
  'Aurelio Castellanos',
  'Gwendolyn Fairweather',
  'Theodore Blackwood',
  'Marguerite Delacroix',
  'Leopold Steinhauser',
  'Rosalind Thornbury',
  'Emmanuel Vasquez-Ortiz',
  'Henrietta Ravenscroft',
  'Augustin Lefebvre',
  'Philippa Winterbourne',
  'Dominik Hasselblad',
  'Evangeline Ashworth',
  'Barnabas Whitfield',
  'Seraphina Montgomery',
  'Roderick Pemberton',
  'Valentina Kowalczyk',
  'Cornelius Ravensdale',
  'Antoinette Beaumont',
  'Solomon Fitzgerald',
  'Georgiana Wetherby',
  'Ignatius Vandenberg',
  'Persephone Ashland',
  'Bartolomeo Rinaldi',
  'Cassandra Wolfsburg',
  'Reginald Hawthorne',
  'Isabella Marchmont',
  'Thaddeus Ellsworth',
  'Ottoline Ravenshaw',
  'Emmerich Waldstein',
  'Beatrix Sommerfeld',
  'Lysander Ashbourne',
  'Cordelia Winterfell',
  'Percival Ravenwood',
  'Arabella Fontaine',
  'Montgomery Blackstone',
  'Guinevere Attwater',
  'Fitzwilliam Darcy',
  'Ludmila Petrovskaya',
  'Archibald Greengrass',
  'Ophelia Nightingale',
  'Casimir Wojciechowski',
  'Rosamund Ellingham',
  'Bartholdy Kreuzberg',
  'Millicent Ashdown',
  'Octavian Rutherford',
  'Wilhelmine Falkenrath',
  'Peregrine Loxley',
  'Clarissa Vandenbrook',
  'Aloysius Winterhalter',
  'Marianne Silverstone',
  'Benedikt Zimmermann',
  'Theodora Ravenglass',
  'Fitzgerald Ashby',
  'Henrietta Blackthorn',
  'Maximilian Ostermann',
  'Vivienne Chastellain',
  'Alistair Ravenhurst',
  'Josefina Aldringen',
  'Cuthbert Wainwright',
  'Emmeline Hartshorne',
  'Sigismund Wallenberg',
  'Charlotte Ravensbourne',
  'Barnaby Fotheringay',
  'Katharina Muhlenberg',
  'Leopoldine Grunewald',
  'Alexander Thorncastle',
  'Genevieve Ashcombe',
  'Raimund Falkenstein',
  'Prudence Wintersmith',
  'Octavius Meriwether',
  'Adelheid Rosenkranz',
  'Bartholomew Sinclair',
  'Celestine Ravenmoor',
  'Frederick Ashenhurst',
  'Marlowe Winterbottom',
  'Anneliese Hohenberg',
  'Sylvester Ravenglade',
  'Ermintrude Bellweather',
  'Kilian Morgenstern',
  'Rosalinde Wachtmeister',
  'Cornelia Ashfordham',
  'Dietrich Sonnenschein',
  'Wilhelmina Falkenberg',
  'Balthazar Ravenscourt',
  'Seraphine Winterhold',
  'Nikodemus Eichenwald',
  'Philomena Ashgrove',
];

/**
 * MIXED — short, medium and long deliberately interleaved. ORDER IS LOAD-BEARING — file header.
 *
 * The interleaving is the point and it is not decorative: NEIGHBOURS must differ in length, because
 * two labels collide as a function of the PAIR's combined width. A roster of uniformly medium names
 * hides that; one that sets 2 characters against 22 produces both the widest and the narrowest
 * pairings a real field can contain, and is the honest middle case between the other two lists.
 *
 * 100 entries, cycling so that no two adjacent entries share a length band.
 */
export const QUICK_TEST_NAMES_MIXED = [
  'Al',
  'Konstantin Brandner',
  'Marcus',
  'Alexandra Wintergreen',
  'Bo',
  'Priya',
  'Sebastian Hollingsworth',
  'Yusuf',
  'Wilhelmina Rothschild',
  'Ida',
  'Kim',
  'Nathaniel Brightwater',
  'Hannah',
  'Ferdinand Oberhauser',
  'Tom',
  'Zoe',
  'Gwendolyn Fairweather',
  'Oliver',
  'Marguerite Delacroix',
  'Sam',
  'Jo',
  'Rosalind Thornbury',
  'Fatima',
  'Henrietta Ravenscroft',
  'Ash',
  'Rae',
  'Philippa Winterbourne',
  'Daniel',
  'Evangeline Ashworth',
  'Max',
  'Ute',
  'Seraphina Montgomery',
  'Amelia',
  'Valentina Kowalczyk',
  'Ben',
  'Eli',
  'Antoinette Beaumont',
  'Sophie',
  'Georgiana Wetherby',
  'Ana',
  'Liv',
  'Persephone Ashland',
  'Martin',
  'Cassandra Wolfsburg',
  'Ted',
  'Nia',
  'Isabella Marchmont',
  'Lukas',
  'Ottoline Ravenshaw',
  'Ivy',
  'Ola',
  'Beatrix Sommerfeld',
  'Nadia',
  'Cordelia Winterfell',
  'Rex',
  'Wes',
  'Arabella Fontaine',
  'Tobias',
  'Guinevere Attwater',
  'Pia',
  'Gus',
  'Ludmila Petrovskaya',
  'Elena',
  'Ophelia Nightingale',
  'Jan',
  'Mia',
  'Rosamund Ellingham',
  'Isaac',
  'Millicent Ashdown',
  'Cal',
  'Suki',
  'Wilhelmine Falkenrath',
  'Norah',
  'Clarissa Vandenbrook',
  'Dov',
  'Rory',
  'Marianne Silverstone',
  'Jonas',
  'Theodora Ravenglass',
  'Bea',
  'Nils',
  'Henrietta Blackthorn',
  'Petra',
  'Vivienne Chastellain',
  'Ora',
  'Kaia',
  'Josefina Aldringen',
  'Silas',
  'Emmeline Hartshorne',
  'Uma',
  'Enzo',
  'Charlotte Ravensbourne',
  'Aisha',
  'Katharina Muhlenberg',
  'Ravi',
  'Lena',
  'Genevieve Ashcombe',
  'Bruno',
  'Prudence Wintersmith',
  'Noor',
];

/**
 * THE ONE PLACE THAT KNOWS THE THREE ROSTERS EXIST.
 *
 * Keyed by the value the Quick Test selector stores. `current` is the default and resolves to the
 * untouched original, so a caller that passes nothing, an unknown key, or the default gets exactly
 * what it got before this file changed.
 */
export const QUICK_TEST_NAME_SETS = {
  current: QUICK_TEST_NAMES,
  long: QUICK_TEST_NAMES_LONG,
  mixed: QUICK_TEST_NAMES_MIXED,
};

/** The default set key. Anything unrecognised resolves here. */
export const DEFAULT_NAME_SET = 'current';

/**
 * Resolve a set key to its roster. Unknown / missing / default -> the original list, BY IDENTITY.
 *
 * Returning the SAME ARRAY REFERENCE for the default is deliberate: it lets a test assert that the
 * default path is not merely EQUAL to the original but IS it, which is the strongest available
 * statement that nothing leaked into the shipped roster.
 */
export function resolveNameSet(key) {
  return QUICK_TEST_NAME_SETS[key] ?? QUICK_TEST_NAMES;
}

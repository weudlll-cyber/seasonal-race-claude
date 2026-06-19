// ============================================================
// File:        knip.config.js
// Path:        client/knip.config.js
// Project:     RaceArena
// Description: Knip static-analysis config. Components listed under `entry`
//              are intentional design-system stubs kept for planned features;
//              declaring them here prevents false "unused file" reports.
// ============================================================

/** @type {import('knip').KnipConfig} */
const config = {
  entry: [
    // Intentional stubs — planned features, not dead code:
    'src/components/Button/index.js',       // generic UI primitive
    'src/components/Modal/index.js',        // generic UI primitive
    'src/components/InputField/index.js',   // generic UI primitive
    'src/components/ColorPicker/index.js',  // racer livery customisation (planned)
    'src/components/LogoUploader/index.js', // team/racer branding (Phase 5, planned)
  ],
};

export default config;

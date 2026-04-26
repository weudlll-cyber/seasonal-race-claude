// ============================================================
// File:        index.js
// Path:        client/src/modules/track-effects/index.js
// Project:     RaceArena
// Description: Track-effects registry — auto-loads all effect modules and
//              exposes listEffects / getEffect / getDefaultConfig
// ============================================================

// Exclude *.test.js — without the negation glob matched test files too, causing
// stars.test.js to run at app load and crash with "Cannot read properties of undefined".
const modules = import.meta.glob(['./effects/*.js', '!./effects/*.test.js'], { eager: true });

const effects = [];
for (const [path, mod] of Object.entries(modules)) {
  try {
    if (mod && mod.default) {
      effects.push(mod.default);
    }
  } catch (err) {
    console.error(`[track-effects] Failed to load effect from ${path}:`, err);
  }
}

effects.sort((a, b) => a.id.localeCompare(b.id));

export function listEffects() {
  return effects.map(({ id, label, description, configSchema, defaultConfig }) => ({
    id,
    label,
    description,
    configSchema,
    defaultConfig,
  }));
}

export function getEffect(id) {
  return effects.find((e) => e.id === id);
}

export function getDefaultConfig(id) {
  const effect = getEffect(id);
  return effect ? effect.defaultConfig : null;
}

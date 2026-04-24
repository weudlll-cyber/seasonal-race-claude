const modules = import.meta.glob('./effects/*.js', { eager: true });

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

// ============================================================
// File:        stateOverlayTemplates.js
// Path:        client/src/modules/stateOverlayTemplates.js
// Project:     RaceArena
// Description: Template pools and selection logic for per-state
//              narrative overlay text. Used by StateOverlay component.
//              States: OVERVIEW, BATTLE_ZOOM, COMEBACK_ZOOM.
//              LEADER_ZOOM / COUNTDOWN / ENDPHASE get no text.
// ============================================================

// Template pools keyed by CAM_STATE value.
// Variables are {leader}, {position}, {count}, {racer}.
// BATTLE_ZOOM and COMEBACK_ZOOM templates are ready for future specs
// (no text renders until the caller supplies the required variables).
export const OVERLAY_TEMPLATES = {
  OVERVIEW: [
    'Leading: {leader}',
    '{leader} at the front',
    'P1: {leader}',
    '{leader} sets the pace',
    'Out front: {leader}',
    'The field chases {leader}',
    '{leader} holds the lead',
    '{leader} still in front',
  ],
  BATTLE_ZOOM: [
    'Battle for P{position} — {count} racers',
    '{count} racers fighting for P{position}',
    'Tight pack at P{position}',
    'Who takes P{position}? — {count} contenders',
    'Close racing for position {position}',
    'Packed together: {count} at P{position}',
    'No way through — pack at P{position}',
    'Thrilling: {count} racers for P{position}',
  ],
  COMEBACK_ZOOM: [
    'Comeback! {racer} climbs the ranks',
    '{racer} fights their way forward',
    'Charging back: {racer}',
    '{racer} works through the field',
    "{racer} won't give up",
    'Back in it: {racer}',
    '{racer} surges through',
    'Strong ride: {racer} makes up ground',
  ],
};

// Returns true when every {variable} placeholder in `template` has a
// corresponding non-empty entry in `variables`.
export function hasAllVars(template, variables) {
  const placeholders = template.match(/\{(\w+)\}/g) ?? [];
  return placeholders.every((p) => {
    const key = p.slice(1, -1);
    return variables[key] != null && variables[key] !== '';
  });
}

// Replaces all {variable} placeholders in `template` with values from
// `variables`. Unknown placeholders are left as-is.
export function resolveTemplate(template, variables) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    variables[key] != null ? String(variables[key]) : match
  );
}

/**
 * Selects a random template for `stateKey` that can be satisfied by
 * `variables`, avoiding the index used last time (anti-repeat).
 *
 * @param {string} stateKey       - CAM_STATE value (e.g. 'OVERVIEW')
 * @param {Object} variables      - Variable bindings, e.g. { leader: 'Max' }
 * @param {Object} lastIndexByState - Map of stateKey → last-used template index
 * @returns {{ text: string, index: number } | null}
 */
export function selectOverlayText(stateKey, variables = {}, lastIndexByState = {}) {
  const pool = OVERLAY_TEMPLATES[stateKey];
  if (!pool || pool.length === 0) return null;

  // Filter to templates whose required variables are all available
  const usable = pool
    .map((tmpl, i) => ({ tmpl, i }))
    .filter(({ tmpl }) => hasAllVars(tmpl, variables));

  if (usable.length === 0) return null;

  // Anti-repeat: exclude the previously used index when alternatives exist
  const lastIdx = lastIndexByState[stateKey] ?? -1;
  const candidates = usable.length > 1 ? usable.filter(({ i }) => i !== lastIdx) : usable;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { text: resolveTemplate(pick.tmpl, variables), index: pick.i };
}

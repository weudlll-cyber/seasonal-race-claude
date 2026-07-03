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
    'BATTLE FOR POSITION {position}!',
    '{count} RACERS — ONE SPOT!',
    'WHO TAKES {position}?',
    'Three-way fight for position {position}!',
    '{count} racers scrapping for spot {position}!',
    'Nobody giving up position {position}!',
    'BATTLE — P{position}',
    '{count}-way battle, position {position}',
    "Somebody's losing position {position} today.",
    'Position {position} — not settled yet.',
    'P{position} up for grabs — {count} takers!',
    'This is what racing looks like — P{position}!',
    'Not an inch of room — P{position} on the line',
    "{count} racers, one position. Something's gotta give.",
    'Pure wheel-to-wheel — fighting for P{position}',
  ],
  COMEBACK_ZOOM: [
    'COMEBACK! {name} pushing through the field!',
    '{name} is on the move!',
    '{name} charging back — watch out!',
    'Positions gained: {name} surges forward',
    '{name} clawing back into contention',
    "Somebody forgot to tell {name} it's over.",
    '{name} works through the pack',
    'The comeback is real — {name}!',
    'Back in the fight: {name}',
    "Don't write off {name} just yet.",
    '{name} reclaims ground — lap by lap',
    'Strong push from {name} — ranks falling fast',
  ],
  LEAD_CHANGE: [
    '{newLeader} takes the lead from {previousLeader}!',
    'LEAD CHANGE! {newLeader} passes {previousLeader}!',
    '{previousLeader} overtaken! {newLeader} hits the front!',
    '{newLeader} blows past {previousLeader}!',
    'New leader: {newLeader}. {previousLeader} drops back.',
    '{newLeader} surges ahead — {previousLeader} loses the lead!',
    '{previousLeader} out — {newLeader} is in front!',
    '{previousLeader} out, {newLeader} in — this race just changed!',
    'Watch out — {newLeader} has taken over from {previousLeader}!',
    '{newLeader} pushes past {previousLeader} — can they hold it?',
  ],
  // 15a-predictive winner text — shown on the persistent overlay channel when the winner crosses
  // during a photo-finish. Picked deterministically per race via selectWinnerText (racePlanSeed),
  // NOT the Math.random() selectors above.
  PHOTO_FINISH_WINNER: [
    '{name} takes it — by a nose!',
    'Photo finish — {name} wins it!',
    '{name} steals it at the line!',
    'By inches… {name}!',
    '{name} edges ahead — what a finish!',
    'Too close to call… {name} wins!',
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

/**
 * Deterministic template pick for `stateKey`, seeded by the race seed so a given race always
 * shows the same line. Separate from the Math.random() selectors above (those are intentionally
 * unchanged). Used for the photo-finish winner text.
 *
 * @param {string} stateKey - OVERLAY_TEMPLATES key (e.g. 'PHOTO_FINISH_WINNER')
 * @param {Object} variables - Variable bindings, e.g. { name: 'Max' }
 * @param {number} seed - deterministic seed (e.g. racePlanSeed)
 * @returns {{ text: string, index: number } | null}
 */
export function selectWinnerText(stateKey, variables = {}, seed = 0) {
  const pool = OVERLAY_TEMPLATES[stateKey];
  if (!pool || pool.length === 0) return null;
  const usable = pool
    .map((tmpl, i) => ({ tmpl, i }))
    .filter(({ tmpl }) => hasAllVars(tmpl, variables));
  if (usable.length === 0) return null;
  // Small integer hash of the seed → deterministic index in [0, usable.length).
  let x = (seed | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = (x ^ (x >>> 16)) >>> 0;
  const pick = usable[x % usable.length];
  return { text: resolveTemplate(pick.tmpl, variables), index: pick.i };
}

/**
 * Selects a random template for `stateKey`, excluding ALL indices already used
 * in the current race (per-race no-repeat). Falls back to any usable template
 * when every template has been exhausted.
 *
 * @param {string} stateKey    - CAM_STATE value (e.g. 'BATTLE_ZOOM')
 * @param {Object} variables   - Variable bindings, e.g. { position: 3, count: 3 }
 * @param {Set<number>} usedSet - Set of template indices already shown this race
 * @returns {{ text: string, index: number } | null}
 */
export function selectOverlayTextNoRepeat(stateKey, variables = {}, usedSet = new Set()) {
  const pool = OVERLAY_TEMPLATES[stateKey];
  if (!pool || pool.length === 0) return null;

  const usable = pool
    .map((tmpl, i) => ({ tmpl, i }))
    .filter(({ tmpl }) => hasAllVars(tmpl, variables));

  if (usable.length === 0) return null;

  // Prefer templates not yet shown this race; fall back to full usable pool when exhausted
  const fresh = usable.filter(({ i }) => !usedSet.has(i));
  const candidates = fresh.length > 0 ? fresh : usable;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { text: resolveTemplate(pick.tmpl, variables), index: pick.i };
}

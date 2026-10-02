// ============================================================
// File:        scripts/lib/trackScope.mjs
// Project:     RaceArena — WORKBENCH-THREE part 1
//
// WHAT THIS OWNS: turning a `--tracks=` argument into the geometries to run, and REFUSING loudly
// when that would be nothing. One home, so the refusal is written once and every caller gets the
// same one.
//
// ── WHY IT EXISTS ─────────────────────────────────────────────────────────────────────────────
//
// `loadTracks({only})` (`raceDriver.mjs:284`) matches ONE exact id and returns `[]` for a name it
// does not know. Callers then filtered with `.includes(g.id)` and never looked at what came back, so
// a scope that matched nothing produced a full set of table headers, zero data rows, and EXIT 0.
// Reproduced on 2026-09-25 with `--tracks=all` on `line-visible-truth.mjs` and `pan-lag-account.mjs`
// — there is no track called "all", so the filter matched nothing and both reported success.
//
// A measurement that can measure nothing quietly is worse than no measurement: it answers in the
// voice used for a clean result.
//
// ── ONE HOME, TWO DOORS (NIGHT-2026-09-26 PIECE 4) ─────────────────────────────────────────────
//
// The `scripts/` measuring tools resolve `--tracks=` into a list of GEOMETRIES up front and then
// iterate the geometries. `scripts/diag/*.mjs` resolve into a list of NAMES up front, and then
// look each name up per iteration through a `Map.get(id) → geo`. Same rule, two calling shapes;
// two entry points. `resolveTrackScope` returns geos (the main tools). `resolveTrackScopeIds`
// takes an already-parsed list of ids and returns validated ids (the diag tools). The refusal
// itself is written once, in the private helper `refuse` below — one home, two doors, not two
// homes.
//
// ── THE REFUSAL IS NOT NEW ────────────────────────────────────────────────────────────────────
//
// Its wording and shape are taken from the guard `scripts/viewer-invariants.mjs` carried, which
// already said the useful things: name what was asked for, name what exists, say there is no "all",
// and say why exiting 0 would be wrong. This file is those sentences moved somewhere every tool can
// reach, not a second style of refusal invented beside them — and since HARNESS-EMPTY-SCOPE-1 that
// harness calls this file instead of keeping its original copy.
//
// EXITS 2 on refusal, which is what the guarded sites already use.
//
// ── EVERY `--tracks` TOOL OUTSIDE THE RACE HULL IS ON IT (HARNESS-EMPTY-SCOPE-1, 2026-10-02) ───
//
// The last callers that took `--tracks` and validated nothing were brought onto these two doors,
// including the file-reading `-sum` analysers: their scope is still a list of TRACK names, so the
// registry is still the known set, and an omitted `--tracks` on them printed headers over nothing.
// The list of tools, and how each was proven to refuse, is in
// reports/evolution/HARNESS-EMPTY-SCOPE-1.md. A NEW tool that takes `--tracks` belongs here too —
// `trackScopeWiring.test.mjs` fails until it is.
//
// ★ THIS FILE MUST STAY OUTSIDE THE RACE HULL. A script that imports `raceCore.js` directly is a
// hull DRIVER, and `engine-reach.mjs` counts its whole import closure; one such driver importing
// this file would make every edit here a change that "can move a race". So hull drivers
// (`outcome-phase-window.mjs`, `pair-reach-census.mjs` today) are not wired, and the wiring test
// pins this file outside the hull.
// ============================================================

/**
 * Resolve a `--tracks=` argument to the geometries to run, or refuse.
 *
 * @param {object}   p
 * @param {string}   p.tool   the tool's own name, so the refusal says who is refusing
 * @param {string?}  p.arg    the raw `--tracks=` value; null/undefined (flag absent) means "every
 *                            track"; an empty string is a scope naming nothing and is refused
 * @param {Array}    p.all    every geometry that exists, from `loadTracks()`
 * @param {string}   [p.flag] the flag's name, for tools that spell it `--track=`
 * @returns {Array}  the geometries to run — never empty; the process exits instead
 */
export function resolveTrackScope({ tool, arg, all, flag = "--tracks" }) {
  const known = new Set(all.map((g) => g.id));

  // OMITTED MEANS EVERY TRACK, and that is the only way to ask for all of them. It is checked
  // against `all` being non-empty too: an empty tracks directory is itself a silent zero.
  // HARNESS-EMPTY-SCOPE-1: an EMPTY value (`--tracks=`, typically an unset shell variable) is NOT
  // "omitted" — it is a scope that names nothing, and it falls through to the refusal below. It
  // used to be read as "every track", which turned a typo into the longest possible run.
  if (arg === null || arg === undefined) {
    if (all.length === 0) {
      console.error(
        `${tool}: no tracks exist at all, so this run would measure nothing. Refusing to start.\n` +
          `  Looked in server/data/tracks, falling back to server/seeds/tracks.\n` +
          `  A sweep that measures nothing must not report success; that is how a silent zero gets ` +
          `read as a clean result.`
      );
      process.exit(2);
    }
    return all;
  }

  const asked = String(arg)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const unknown = asked.filter((id) => !known.has(id));

  // THE TWO WAYS A SCOPE BECOMES NOTHING, and both are refused by name: a value that parses to no
  // names at all, and a name no track answers to — `all` being the one that has actually happened.
  if (asked.length === 0 || unknown.length > 0) {
    console.error(
      `${tool}: ${flag}=${arg} names ${
        asked.length === 0 ? "no track at all" : `no such track: ${unknown.join(", ")}`
      }.\n` +
        `  asked for: ${asked.length ? asked.join(", ") : "(nothing)"}\n` +
        `  this repository has: ${[...known].join(", ")}\n` +
        `  There is no "all" — OMIT ${flag} to run every track.\n` +
        `  Refusing to run: a filter that matches nothing would report 0 races and exit 0.`
    );
    process.exit(2);
  }

  const geos = all.filter((g) => asked.includes(g.id));

  // BELT AND BRACES. Every name was known, so this cannot fire today — but it is the condition the
  // callers were actually missing, and a later change to `all`'s shape would reach it first.
  if (geos.length === 0) {
    console.error(
      `${tool}: ${flag}=${arg} resolved to 0 tracks although every name was known. Refusing to start.\n` +
        `  A sweep that measures nothing must not report success.`
    );
    process.exit(2);
  }
  return geos;
}

/**
 * The SECOND DOOR — for tools whose calling shape hands the resolver an already-split list of
 * track ids and then iterates the ids through a `Map.get(id) → geo` per iteration. That is the
 * shape most of `scripts/diag/*.mjs` uses, and it cannot be brought under `resolveTrackScope`
 * without changing every one of them from iterating names to iterating geos. The refusal itself
 * is identical — same wording, same exit code — so the two doors open on one home.
 *
 * @param {object}   p
 * @param {string}   p.tool  the tool's own name, so the refusal says who is refusing
 * @param {string[]|string} p.ids  the track ids the caller asked for — an array, or the raw
 *                            comma-separated `--tracks=` value, split here so no caller re-writes it
 * @param {Array}    p.all   every geometry that exists, from `loadTracks()`
 * @param {string}   [p.flag] the flag's name, for tools that spell it `--track=`
 * @returns {string[]} the validated ids — never empty; the process exits instead
 */
export function resolveTrackScopeIds({ tool, ids, all, flag = "--tracks" }) {
  const known = new Set(all.map((g) => g.id));

  // An empty tracks directory is a silent zero even if the ids array is not empty; refuse first.
  if (all.length === 0) {
    console.error(
      `${tool}: no tracks exist at all, so this run would measure nothing. Refusing to start.\n` +
        `  Looked in server/data/tracks, falling back to server/seeds/tracks.\n` +
        `  A sweep that measures nothing must not report success; that is how a silent zero gets ` +
        `read as a clean result.`
    );
    process.exit(2);
  }

  // A raw flag value is split HERE (HARNESS-EMPTY-SCOPE-1) so the twenty-odd callers do not each
  // carry their own `.split(",").map(trim).filter(Boolean)`. Anything else — null, a number — is a
  // scope that names nothing and is refused below.
  const list = typeof ids === "string" ? ids.split(",") : Array.isArray(ids) ? ids : [];
  const asked = list.map((s) => String(s).trim()).filter(Boolean);
  const unknown = asked.filter((id) => !known.has(id));

  if (asked.length === 0 || unknown.length > 0) {
    console.error(
      `${tool}: ${flag} names ${
        asked.length === 0 ? "no track at all" : `no such track: ${unknown.join(", ")}`
      }.\n` +
        `  asked for: ${asked.length ? asked.join(", ") : "(nothing)"}\n` +
        `  this repository has: ${[...known].join(", ")}\n` +
        `  There is no "all" — pass ${flag}=<id>[,<id>...] with a KNOWN id to run.\n` +
        `  Refusing to run: a filter that matches nothing would report 0 rows and exit 0.`
    );
    process.exit(2);
  }
  return asked;
}

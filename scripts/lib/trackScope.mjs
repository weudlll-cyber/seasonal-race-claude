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
// ── THE REFUSAL IS NOT NEW ────────────────────────────────────────────────────────────────────
//
// Its wording and shape are taken from `scripts/viewer-invariants.mjs:313-331` and `:353-362`, which
// already guard exactly this and already say the useful things: name what was asked for, name what
// exists, say there is no "all", and say why exiting 0 would be wrong. This file is those sentences
// moved somewhere every tool can reach, not a second style of refusal invented beside them.
// `scripts/company-bind-truth.mjs:137` guards the single-track form the same way.
//
// EXITS 2 on refusal, which is what the guarded sites already use.
// ============================================================

/**
 * Resolve a `--tracks=` argument to the geometries to run, or refuse.
 *
 * @param {object}   p
 * @param {string}   p.tool   the tool's own name, so the refusal says who is refusing
 * @param {string?}  p.arg    the raw `--tracks=` value; null/undefined means "every track"
 * @param {Array}    p.all    every geometry that exists, from `loadTracks()`
 * @param {string}   [p.flag] the flag's name, for tools that spell it `--track=`
 * @returns {Array}  the geometries to run — never empty; the process exits instead
 */
export function resolveTrackScope({ tool, arg, all, flag = "--tracks" }) {
  const known = new Set(all.map((g) => g.id));

  // OMITTED MEANS EVERY TRACK, and that is the only way to ask for all of them. It is checked
  // against `all` being non-empty too: an empty tracks directory is itself a silent zero.
  if (arg === null || arg === undefined || arg === "") {
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

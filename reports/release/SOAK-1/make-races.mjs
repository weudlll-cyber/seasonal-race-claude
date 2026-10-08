// ============================================================
// File:        make-races.mjs
// Path:        reports/release/SOAK-1/make-races.mjs
// Project:     RaceArena
// Created:     2026-10-07
// Description: SOAK-1 harness — produces REAL recorded races (the engine actually run), so that
//              every race the soak stores can also be verified by the server and come back identical.
//
// Usage (from the root of a checkout AT THE COMMIT THE IMAGE WAS BUILT FROM, so the engine is the
// image's engine):
//   node <path>/make-races.mjs <repoRoot> <out.json>
//
// The shape is the one `server/src/routes/racesVerify.test.js` stores and verifies; the record is
// the template, and the load script gives each stored copy its own clientRaceId and finishedAt.
// ============================================================

import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] ?? '.');
const out = process.argv[3];
if (!out) throw new Error('usage: make-races.mjs <repoRoot> <out.json>');

const u = (p) => pathToFileURL(join(root, p)).href;
const { resolveIdentity, loadTracks, buildRace, runRace, DEFAULT_CONFIG_WORLD } = await import(
  u('scripts/lib/raceDriver.mjs')
);
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u('client/src/modules/racerNames.js'));
const { PODIUM_PLACES } = await import(u('shared/podium.mjs'));

// Two closed tracks of different size, two field sizes, three seeds each: twelve templates.
const PLAN = [];
for (const trackId of ['dirt-oval', 'city-circuit'])
  for (const racers of [20, 40]) for (const seed of [3, 7, 11]) PLAN.push({ trackId, racers, seed });

const templates = [];
for (const { trackId, racers, seed } of PLAN) {
  const t0 = Date.now();
  const [geo] = loadTracks({ only: trackId });
  const names = resolveNameSet(DEFAULT_NAME_SET).slice(0, racers);
  const identity = resolveIdentity({ racers, raceSeed: seed, roster: names });
  const race = buildRace(geo, identity, DEFAULT_CONFIG_WORLD.cameraConfig, DEFAULT_CONFIG_WORLD);
  runRace(race, identity, DEFAULT_CONFIG_WORLD.cameraConfig, () => true);
  const results = race.st.racers
    .filter((r) => r.finishRank != null)
    .sort((a, b) => a.finishRank - b.finishRank)
    .map((r) => ({ name: r.name, finishTimeMs: r.finishTimeMs, index: r.index }));
  const lastMs = results.length ? results[results.length - 1].finishTimeMs : null;
  templates.push({
    geometryId: geo.geometryId,
    targetLaps: geo.closed ? geo.defaultLaps : undefined,
    worldConfigs: DEFAULT_CONFIG_WORLD,
    fieldSize: racers,
    racePlanSeed: seed,
    racerTypeId: identity.racerType,
    names,
    results,
    winners: results.slice(0, PODIUM_PLACES).map((r) => r.name),
    identifierVersion: 1,
    buildId: 'soak-1',
    raceActionStage: 'quiet',
    raceSource: 'race',
    elapsedSec: lastMs == null ? undefined : lastMs / 1000,
  });
  console.log(`${trackId} racers=${racers} seed=${seed}: ${results.length} finished, ${Date.now() - t0} ms`);
}
writeFileSync(out, JSON.stringify(templates));
console.log(`wrote ${templates.length} templates, ${JSON.stringify(templates).length} bytes, to ${out}`);

// ============================================================
// File:        real-site-record.mjs
// Path:        deploy/test/real-site-record.mjs
// Project:     RaceArena — WEBSITE-EMBED-1 piece 6 (2026-11-11), the rehearsal
// Description: Runs ONE real race with the engine the app image carries (/scripts/lib/raceDriver.mjs,
//              as `racearena`'s verify does) on a track of the install's own data, and prints the
//              POST /api/races body a browser would send for it — so the rehearsal's "a finished
//              race still verifies" is a race the engine ran, not a made-up record. Test only;
//              run inside the race's app container:
//
//   docker exec -i -e NAMES='["Mia",…]' -e WEBSITE_RACERS='[{"index":0,"websiteUserId":"7"}]' \
//     racearena-app-1 node --input-type=module - <real-site-record.mjs
// ============================================================

import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  resolveIdentity,
  buildRace,
  runRace,
  DEFAULT_CONFIG_WORLD,
} from '/scripts/lib/raceDriver.mjs';

const names = JSON.parse(process.env.NAMES);
const websiteRacers = JSON.parse(process.env.WEBSITE_RACERS ?? '[]');
// The install's own tracks (seeded into its data folder on the first start); a closed one.
const dir = '/app/data/tracks';
const tracks = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));
const geo = tracks.find((t) => t.id === 'dirt-oval') ?? tracks.find((t) => t.closed) ?? tracks[0];
const seed = 11;
const identity = resolveIdentity({ racers: names.length, raceSeed: seed, roster: names });
const race = buildRace(geo, identity, DEFAULT_CONFIG_WORLD.cameraConfig, DEFAULT_CONFIG_WORLD);
runRace(race, identity, DEFAULT_CONFIG_WORLD.cameraConfig, () => true);
const results = race.st.racers
  .filter((r) => r.finishRank != null)
  .sort((a, b) => a.finishRank - b.finishRank)
  .map((r) => ({ name: r.name, finishTimeMs: r.finishTimeMs, index: r.index }));
process.stdout.write(
  JSON.stringify({
    clientRaceId: `rehearsal-${randomUUID()}`,
    finishedAt: new Date().toISOString(),
    identifierVersion: 1,
    buildId: 'rehearsal',
    geometryId: geo.geometryId,
    racerTypeId: identity.racerType,
    racePlanSeed: seed,
    raceActionStage: 'wild',
    racePlanEnabled: true,
    targetLaps: geo.closed ? geo.defaultLaps : undefined,
    names,
    worldConfigs: DEFAULT_CONFIG_WORLD,
    results,
    winners: results.slice(0, 3).map((r) => r.name),
    raceSource: 'race',
    websiteRacers,
  })
);

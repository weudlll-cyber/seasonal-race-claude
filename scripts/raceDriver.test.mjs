// ============================================================
// File:        scripts/raceDriver.test.mjs
// Project:     RaceArena — ONE-DRIVER-1
//
// Tests for the SHARED DRIVER itself, not only for its callers. The point of the module is that four
// harnesses cannot drift apart while their numbers are read side by side, so the properties worth
// asserting are about the IDENTITY: that nothing is hidden, that the printed line carries what makes
// two runs incomparable, and — the one that matters most — that the identity a script PRINTS is the
// identity it actually RAN. An identity line that can drift from its run is the same class of defect
// as the frozen build value, and this project has now paid for that twice.
// ============================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  trackWidthOf,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from './lib/raceDriver.mjs';

const { DEFAULT_CAMERA_CONFIG } = await import(
  new URL('../client/src/modules/storage/defaults.js', import.meta.url).href
);

test('resolveIdentity has NO hidden defaults — every field comes back out', () => {
  const id = resolveIdentity();
  for (const k of [
    'racers',
    'raceSeed',
    'cameraSeed',
    'racerType',
    'seconds',
    'canvasW',
    'canvasH',
  ]) {
    assert.notEqual(id[k], undefined, `${k} must be present even when the caller omits it`);
  }
});

test('a caller override survives, and an omission is visible rather than implicit', () => {
  const id = resolveIdentity({ racers: 65, cameraSeed: 882944666, racerType: 'boarder' });
  assert.equal(id.racers, 65);
  assert.equal(id.cameraSeed, 882944666);
  assert.equal(id.racerType, 'boarder');
  // Not overridden — but still stated, which is the whole point.
  assert.equal(id.raceSeed, 5601);
});

test('formatIdentity carries every value that makes two runs INCOMPARABLE', () => {
  const line = formatIdentity(
    resolveIdentity({ racers: 65, raceSeed: 5601, cameraSeed: 882944666, racerType: 'boarder' })
  );
  for (const needle of ['n=65', 'raceSeed=5601', 'camSeed=882944666', 'racer=boarder', '60s']) {
    assert.match(line, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), needle);
  }
});

test('THE TWO REAL IDENTITIES DIFFER, and their printed lines differ too', () => {
  // This is the defect that started the block: NIGHT-1 put a figure measured at n=65 beside figures
  // measured at n=40, and nothing on the page said so.
  const measurement = resolveIdentity({ racers: 40, cameraSeed: 1439767152 });
  const owner = resolveIdentity({ racers: 65, cameraSeed: 882944666, racerType: 'boarder' });
  assert.notEqual(formatIdentity(measurement), formatIdentity(owner));
});

test('loadTracks returns the ten tracks, sorted, and honours a filter', () => {
  const all = loadTracks();
  assert.equal(all.length, 10);
  assert.deepEqual(
    all.map((g) => g.id),
    [...all.map((g) => g.id)].sort()
  );
  const one = loadTracks({ only: 'searound' });
  assert.equal(one.length, 1);
  assert.equal(one[0].id, 'searound');
});

test('trackWidthOf agrees with what buildRace resolves — no second source of truth', () => {
  for (const geo of loadTracks()) {
    const race = buildRace(geo, resolveIdentity(), DEFAULT_CAMERA_CONFIG);
    assert.equal(trackWidthOf(geo), race.trackWidthPx, geo.id);
  }
});

test('TRACK_DEFAULT_RACER resolves per track; an explicit id overrides it everywhere', () => {
  const geo = loadTracks({ only: 'searound' })[0];
  const perTrack = buildRace(
    geo,
    resolveIdentity({ racerType: TRACK_DEFAULT_RACER }),
    DEFAULT_CAMERA_CONFIG
  );
  assert.equal(perTrack.racerTypeId, geo.defaultRacerTypeId ?? 'horse');
  const forced = buildRace(geo, resolveIdentity({ racerType: 'boarder' }), DEFAULT_CAMERA_CONFIG);
  assert.equal(forced.racerTypeId, 'boarder');
});

test('THE IDENTITY PRINTED IS THE IDENTITY RUN — field size and camera seed reach the race', () => {
  // The assertion the spec asks for. A line that says n=65 while the race ran 40 would be the frozen
  // build value again, one layer down.
  const geo = loadTracks({ only: 'searound' })[0];
  for (const n of [12, 40]) {
    const identity = resolveIdentity({ racers: n, cameraSeed: 4242 });
    const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
    assert.equal(race.st.racers.length, n, `the race must hold the ${n} the identity claims`);
    assert.match(formatIdentity(identity), new RegExp(`n=${n}\\b`));
    assert.match(formatIdentity(identity), /camSeed=4242/);
  }
});

test('runRace drives frames and stops; the frame count is what the loop actually ran', () => {
  const geo = loadTracks({ only: 'searound' })[0];
  const identity = resolveIdentity({ racers: 8, seconds: 20 });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  let seen = 0;
  let lastFrame = -1;
  const { frames } = runRace(race, identity, DEFAULT_CAMERA_CONFIG, ({ frame, cd }) => {
    assert.equal(frame, lastFrame + 1, 'frames must arrive in order with no gaps');
    lastFrame = frame;
    assert.ok(cd.zoom > 0, 'the camera must be live on every frame handed to a harness');
    seen++;
  });
  assert.equal(seen, frames);
  assert.ok(seen > 100, 'a 20 s race must produce more than a handful of frames');
});

test('THE COUNTDOWN COMES FROM THE CONFIG BEING RUN, not the shipped default', () => {
  // The divergence this block resolved. Two harnesses read the default while running a modified
  // config; had they ever overridden this key, their warm-up would have desynchronised from the
  // thing under test. A longer countdown must delay the race start, i.e. change the frame budget.
  const geo = loadTracks({ only: 'searound' })[0];
  const identity = resolveIdentity({ racers: 8, seconds: 20 });
  const runWith = (countdownDurationMs) => {
    const cfg = { ...DEFAULT_CAMERA_CONFIG, countdownDurationMs };
    const race = buildRace(geo, identity, cfg);
    let firstTs = null;
    runRace(race, identity, cfg, ({ ts }) => {
      if (firstTs === null) firstTs = ts;
    });
    return firstTs;
  };
  const short = runWith(1000);
  const long = runWith(9000);
  assert.ok(
    long > short + 7000,
    `a 9 s countdown must start the race ~8 s later than a 1 s one (got ${short} vs ${long})`
  );
});

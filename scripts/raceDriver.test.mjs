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

import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  trackWidthOf,
  buildRace,
  runRace,
  raceHash,
  stampRaceHash,
  TRACK_DEFAULT_RACER,
} from "./lib/raceDriver.mjs";

const { DEFAULT_CAMERA_CONFIG } = await import(
  new URL("../client/src/modules/storage/defaults.js", import.meta.url).href
);

test("resolveIdentity has NO hidden defaults — every field comes back out", () => {
  const id = resolveIdentity();
  for (const k of [
    "racers",
    "raceSeed",
    "cameraSeed",
    "racerType",
    "seconds",
    "canvasW",
    "canvasH",
  ]) {
    assert.notEqual(
      id[k],
      undefined,
      `${k} must be present even when the caller omits it`,
    );
  }
});

test("a caller override survives, and an omission is visible rather than implicit", () => {
  const id = resolveIdentity({
    racers: 65,
    cameraSeed: 882944666,
    racerType: "boarder",
  });
  assert.equal(id.racers, 65);
  assert.equal(id.cameraSeed, 882944666);
  assert.equal(id.racerType, "boarder");
  // Not overridden — but still stated, which is the whole point.
  assert.equal(id.raceSeed, 5601);
});

test("formatIdentity carries every value that makes two runs INCOMPARABLE", () => {
  const line = formatIdentity(
    resolveIdentity({
      racers: 65,
      raceSeed: 5601,
      cameraSeed: 882944666,
      racerType: "boarder",
    }),
  );
  for (const needle of [
    "n=65",
    "raceSeed=5601",
    "camSeed=882944666",
    "racer=boarder",
    "60s",
  ]) {
    assert.match(
      line,
      new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      needle,
    );
  }
});

test("THE TWO REAL IDENTITIES DIFFER, and their printed lines differ too", () => {
  // This is the defect that started the block: NIGHT-1 put a figure measured at n=65 beside figures
  // measured at n=40, and nothing on the page said so.
  const measurement = resolveIdentity({ racers: 40, cameraSeed: 1439767152 });
  const owner = resolveIdentity({
    racers: 65,
    cameraSeed: 882944666,
    racerType: "boarder",
  });
  assert.notEqual(formatIdentity(measurement), formatIdentity(owner));
});

test("loadTracks returns the ten tracks, sorted, and honours a filter", () => {
  const all = loadTracks();
  assert.equal(all.length, 10);
  assert.deepEqual(
    all.map((g) => g.id),
    [...all.map((g) => g.id)].sort(),
  );
  const one = loadTracks({ only: "searound" });
  assert.equal(one.length, 1);
  assert.equal(one[0].id, "searound");
});

test("trackWidthOf agrees with what buildRace resolves — no second source of truth", () => {
  for (const geo of loadTracks()) {
    const race = buildRace(geo, resolveIdentity(), DEFAULT_CAMERA_CONFIG);
    assert.equal(trackWidthOf(geo), race.trackWidthPx, geo.id);
  }
});

test("TRACK_DEFAULT_RACER resolves per track; an explicit id overrides it everywhere", () => {
  const geo = loadTracks({ only: "searound" })[0];
  const perTrack = buildRace(
    geo,
    resolveIdentity({ racerType: TRACK_DEFAULT_RACER }),
    DEFAULT_CAMERA_CONFIG,
  );
  assert.equal(perTrack.racerTypeId, geo.defaultRacerTypeId ?? "horse");
  const forced = buildRace(
    geo,
    resolveIdentity({ racerType: "boarder" }),
    DEFAULT_CAMERA_CONFIG,
  );
  assert.equal(forced.racerTypeId, "boarder");
});

test("THE IDENTITY PRINTED IS THE IDENTITY RUN — field size and camera seed reach the race", () => {
  // The assertion the spec asks for. A line that says n=65 while the race ran 40 would be the frozen
  // build value again, one layer down.
  const geo = loadTracks({ only: "searound" })[0];
  for (const n of [12, 40]) {
    const identity = resolveIdentity({ racers: n, cameraSeed: 4242 });
    const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
    assert.equal(
      race.st.racers.length,
      n,
      `the race must hold the ${n} the identity claims`,
    );
    assert.match(formatIdentity(identity), new RegExp(`n=${n}\\b`));
    assert.match(formatIdentity(identity), /camSeed=4242/);
  }
});

test("runRace drives frames and stops; the frame count is what the loop actually ran", () => {
  const geo = loadTracks({ only: "searound" })[0];
  const identity = resolveIdentity({ racers: 8, seconds: 20 });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  let seen = 0;
  let lastFrame = -1;
  const { frames } = runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ frame, cd }) => {
      assert.equal(
        frame,
        lastFrame + 1,
        "frames must arrive in order with no gaps",
      );
      lastFrame = frame;
      assert.ok(
        cd.zoom > 0,
        "the camera must be live on every frame handed to a harness",
      );
      seen++;
    },
  );
  assert.equal(seen, frames);
  assert.ok(
    seen > 100,
    "a 20 s race must produce more than a handful of frames",
  );
});

test("THE COUNTDOWN COMES FROM THE CONFIG BEING RUN, not the shipped default", () => {
  // The divergence this block resolved. Two harnesses read the default while running a modified
  // config; had they ever overridden the countdown, their warm-up would have desynchronised from
  // the thing under test. A longer countdown must delay the race start, i.e. change the frame
  // budget.
  //
  // REWRITTEN BY START-BOARD-2, because the key it used to turn is gone. `countdownDurationMs` no
  // longer exists: the countdown's length is the SUM of the ceremony beats, one of which is the
  // runners' board's hold. So the knob this test turns is now a beat — which is a STRONGER version
  // of the same assertion, because it also proves the derived total reaches the driver at all.
  const geo = loadTracks({ only: "searound" })[0];
  const identity = resolveIdentity({ racers: 8, seconds: 20 });
  const runWith = (ceremonyVenueMs) => {
    const cfg = { ...DEFAULT_CAMERA_CONFIG, ceremonyVenueMs };
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
    `a venue beat 8 s longer must start the race ~8 s later (got ${short} vs ${long})`,
  );
});

// ── THE RACE HASH (RACE-IDENTITY-HASH-1) ─────────────────────────────────────────
//
// "Did these two numbers come from the same race?" A hash is only worth having if it SEPARATES what
// must be separated and JOINS what must be joined. Both directions are asserted, and the roster case
// is asserted with two rosters OF THE SAME LENGTH, because the length is what the identity line
// already printed and it is exactly what failed to catch the soak's null roster.

test("the hash JOINS: same identity, same config, key order irrelevant", () => {
  const a = resolveIdentity({ racers: 12, raceSeed: 3 });
  const b = resolveIdentity({ racers: 12, raceSeed: 3 });
  assert.equal(raceHash(a, { x: 1, y: 2 }), raceHash(b, { x: 1, y: 2 }));
  // Canonicalisation: a config written in a different key order is the SAME config.
  assert.equal(raceHash(a, { x: 1, y: 2 }), raceHash(a, { y: 2, x: 1 }));
});

test("the hash SEPARATES on the CONFIG alone — the case identity cannot answer", () => {
  const id = resolveIdentity({ racers: 12, raceSeed: 3 });
  const armA = raceHash(id, { companyOnlyFraming: false });
  const armB = raceHash(id, { companyOnlyFraming: true });
  assert.notEqual(armA, armB);
  // And the identity LINE is identical between them without the hash — which is the whole problem.
  const bare = (line) => line.split(" · race=")[0];
  assert.equal(
    bare(formatIdentity(id, { companyOnlyFraming: false })),
    bare(formatIdentity(id, { companyOnlyFraming: true })),
  );
  assert.notEqual(formatIdentity(id, { companyOnlyFraming: false }), formatIdentity(id, { companyOnlyFraming: true }));
});

test("the hash covers the ROSTER'S NAMES, not its length — the input that was missing", () => {
  const cfg = { x: 1 };
  const abc = resolveIdentity({ racers: 3, roster: ["Turbo", "Blaze", "Rocket"] });
  const abx = resolveIdentity({ racers: 3, roster: ["Turbo", "Blaze", "Nitro"] });
  const none = resolveIdentity({ racers: 3, roster: null });
  assert.equal(abc.roster.length, abx.roster.length, "the fixture must have equal-length rosters");
  assert.notEqual(raceHash(abc, cfg), raceHash(abx, cfg));
  assert.notEqual(raceHash(abc, cfg), raceHash(none, cfg));
  // A racer's NAME is physics here (stablePairBit hashes r.name), so this is not cosmetic.
});

test("the hash REFUSES a missing config rather than hashing less", () => {
  const id = resolveIdentity({});
  assert.throws(() => raceHash(id, undefined), /cameraConfig is required/);
  assert.throws(() => raceHash(id, null), /cameraConfig is required/);
});

test("an unstamped identity says so LOUDLY rather than printing a blank", () => {
  const id = resolveIdentity({});
  assert.match(formatIdentity(id), /race=NO-CONFIG-GIVEN/);
});

test("buildRace STAMPS the hash, so an instrument printing after the build needs no edit", () => {
  const geo = loadTracks({ only: "city-circuit" })[0];
  const id = resolveIdentity({ racers: 6, raceSeed: 4 });
  assert.match(formatIdentity(id), /race=NO-CONFIG-GIVEN/);
  buildRace(geo, id, DEFAULT_CAMERA_CONFIG);
  assert.match(formatIdentity(id), /race=[0-9a-f]{12}/);
  assert.equal(formatIdentity(id).includes("NO-CONFIG-GIVEN"), false);
});

test("TWO CONFIGS UNDER ONE IDENTITY read MIXED — it accumulates rather than overwriting", () => {
  const id = resolveIdentity({ racers: 6, raceSeed: 4 });
  stampRaceHash(id, { arm: "A" });
  const one = formatIdentity(id);
  assert.match(one, /race=[0-9a-f]{12}/);
  stampRaceHash(id, { arm: "A" });
  assert.equal(formatIdentity(id), one, "the same config twice is still one race");
  stampRaceHash(id, { arm: "B" });
  assert.match(formatIdentity(id), /race=MIXED\(.+,.+\) — 2 configs under ONE identity/);
});

test("the stamp is NON-ENUMERABLE — --json consumers see no new key", () => {
  const id = resolveIdentity({ racers: 6 });
  stampRaceHash(id, { x: 1 });
  assert.equal(JSON.stringify(id).includes("__raceHashes"), false);
  assert.deepEqual(Object.keys(id), Object.keys(resolveIdentity({ racers: 6 })));
});

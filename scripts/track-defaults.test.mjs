// ============================================================
// scripts/track-defaults.test.mjs — GARDEN-PATH-DEFAULTS-1
//
// THE OWNER'S DECISION OF 2026-08-25: on `garden-path` the default racer becomes BEETLE and the
// default lap count becomes 2.
//
// WHY THE TEST LIVES HERE AND NOT IN THE CLIENT SUITE. What shipped is a TRACK RECORD, and
// `server/seeds/tracks/` is the one place that owns it — `server/data/**` is a gitignored runtime
// directory (see `.gitignore`: "server/data is a pure runtime dir (gitignored). Shipped defaults live
// in server/seeds/"). A test of a shipped default has to read the shipped file, and the script suite
// is the one that runs in node with the repository on disk.
//
// EVERY TEST CARRIES ITS SABOTAGE. A test that has never been seen to fail proves nothing, so each
// one either mutates a copy of the record and asserts the opposite, or asserts a property that such
// a mutation demonstrably breaks. The sabotage sits next to the assertion it justifies.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEEDS = join(ROOT, "server", "seeds", "tracks");
const readSeed = (id) => JSON.parse(readFileSync(join(SEEDS, `${id}.json`), "utf8"));
const allSeeds = () =>
  readdirSync(SEEDS)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(SEEDS, f), "utf8")));

const { trackDefaultLaps } = await import(
  pathToFileURL(join(ROOT, "client", "src", "modules", "durationModel.js")).href
);
// The racer-type registry warms sprites on load and logs to stderr in node, where `Image` does not
// exist. Silenced across the import exactly as `scripts/lib/raceDriver.mjs` does, so this suite's
// output is its own.
const { getRacerType, listAllRacerTypes } = await (async () => {
  const re = console.error;
  console.error = () => {};
  try {
    return await import(
      pathToFileURL(join(ROOT, "client", "src", "modules", "racer-types", "index.js")).href
    );
  } finally {
    console.error = re;
  }
})();
const { filterRacerTypesForTrack } = await import(
  pathToFileURL(join(ROOT, "client", "src", "modules", "surface-effects", "registry.js")).href
);

test("garden-path ships BEETLE as its default racer", () => {
  const gp = readSeed("garden-path");
  assert.equal(gp.defaultRacerTypeId, "beetle");

  // SABOTAGE — the record as it shipped before this block. The assertion above is what separates
  // the two, and it is the only thing that does.
  const before = { ...gp, defaultRacerTypeId: "snail" };
  assert.notEqual(before.defaultRacerTypeId, "beetle");
});

test("garden-path ships a DEFAULT LAP COUNT of 2, through the function the product reads it with", () => {
  const gp = readSeed("garden-path");
  assert.equal(trackDefaultLaps(gp), 2);

  // SABOTAGE — the record as it shipped: `defaultLaps` 4. Asserting through `trackDefaultLaps`
  // rather than on the raw field is deliberate: the product never reads the field directly, and a
  // record could satisfy the field and still resolve to another number.
  assert.equal(trackDefaultLaps({ ...gp, defaultLaps: 4 }), 4);
  // ...and the LEGACY route the live record used to take, which resolved to 4 from a duration.
  assert.equal(trackDefaultLaps({ ...gp, defaultLaps: undefined, defaultDuration: 120 }), 4);
});

test("BEETLE is actually selectable on garden-path — the surface classes admit it", () => {
  const gp = readSeed("garden-path");
  const active = listAllRacerTypes().filter((t) => t.isActive);
  const selectable = filterRacerTypesForTrack(active, gp.surfaceClasses, (id) =>
    getRacerType(id).getSurfaceClasses()
  ).map((t) => t.id);
  assert.ok(
    selectable.includes("beetle"),
    "a default racer the setup screen would filter out is not a default at all"
  );

  // AND WHY it is admitted, so a later change to either list is caught here rather than in the UI:
  // the beetle runs on `earth`, and garden-path carries `earth`.
  assert.ok(getRacerType("beetle").getSurfaceClasses().includes("earth"));
  assert.ok(gp.surfaceClasses.includes("earth"));

  // SABOTAGE — take `earth` off the track and the beetle stops being selectable.
  const noEarth = { ...gp, surfaceClasses: gp.surfaceClasses.filter((c) => c !== "earth") };
  const without = filterRacerTypesForTrack(active, noEarth.surfaceClasses, (id) =>
    getRacerType(id).getSurfaceClasses()
  ).map((t) => t.id);
  assert.ok(!without.includes("beetle"));
});

test("NO OTHER TRACK is touched — every other closed track keeps its own racer and 2 laps", () => {
  const expected = {
    "city-circuit": "motorbike",
    "dirt-oval": "horse",
    "ice-track": "snowmobile",
    searound: "manta",
  };
  for (const [id, racer] of Object.entries(expected)) {
    const t = readSeed(id);
    assert.equal(t.defaultRacerTypeId, racer, `${id} default racer`);
    assert.equal(trackDefaultLaps(t), 2, `${id} default laps`);
  }
  // The OPEN tracks have no lap default to move; assert their racers are untouched all the same,
  // because "no other track is touched" is the claim and it is cheap to make it whole.
  const openExpected = {
    "luger-hill": "luge",
    mountainstreet: "boarder",
    "river-run": "duck",
    seatrack: "dolphin",
    "space-sprint": "rocket",
  };
  for (const [id, racer] of Object.entries(openExpected)) {
    assert.equal(readSeed(id).defaultRacerTypeId, racer, `${id} default racer`);
  }

  // SABOTAGE — one wrong racer anywhere in the map fails the loop above.
  assert.notEqual(readSeed("dirt-oval").defaultRacerTypeId, "beetle");
});

test("garden-path is no longer the outlier it was — one racer, one lap count, nothing else", () => {
  const gp = readSeed("garden-path");
  // It used to be the ONLY closed track without `defaultLaps: 2`, and the only one carrying a
  // legacy `defaultDuration`. Both are what made it the outlier GARDEN-PATH-NO-FINISH-1 found.
  const closed = allSeeds().filter((t) => t.closed);
  assert.ok(closed.length >= 5);
  for (const t of closed) assert.equal(trackDefaultLaps(t), 2, `${t.id} now agrees on laps`);
  assert.equal(gp.defaultDuration, undefined, "the legacy duration field is not reintroduced");

  // THE SKIN NOW MATCHES THE RACER (GARDEN-PATH-BEETLE-SKIN-1, 2026-08-26).
  //
  // This pair used to assert the SNAIL, with the note that the owner had named two changes and the
  // skin was not among them — "asserted so that a later block cannot quietly 'tidy' them without
  // saying so". **It did its job and the answer came back: not quietly.** He instructed the icon and
  // the description explicitly on 2026-08-26, and GARDEN-PATH-BEETLE-SKIN-1 changed exactly those
  // two fields in `server/seeds/tracks/garden-path.json` and reported them.
  //
  // THE ASSERTION IS UPDATED, NOT REMOVED, and the purpose is unchanged: a future block still cannot
  // move this skin without turning this test red and having to say why.
  //
  // WHY IT WAS RED ON MASTER FOR A DAY, which is the part worth keeping. That merge went green
  // because `verify` routes `script-suite` on changes under `scripts/` and the change was under
  // `server/seeds/` — so the one guard that could catch it was never selected. Same shape as
  // ENGINE-REACH-DATA-1: a data file is invisible to routing built on code paths. It surfaced only
  // when GATE-SERIAL-BCRYPT-1 touched `scripts/` and pulled this suite into the run.
  assert.equal(gp.icon, "🪲");
  assert.match(gp.description, /scuttle through the roses/);
});

test("an explicitly chosen racer or lap count still overrides the default", () => {
  const gp = readSeed("garden-path");
  // THE LAP OVERRIDE — `trackDefaultLaps` is the DEFAULT; an operator's choice is a separate value
  // carried on the race payload, so the test is that the default never overrides a stated number.
  for (const chosen of [1, 3, 4]) {
    assert.equal(trackDefaultLaps({ ...gp, defaultLaps: chosen }), chosen);
    assert.notEqual(trackDefaultLaps({ ...gp, defaultLaps: chosen }), 2);
  }
  // THE RACER OVERRIDE — the setup screen resolves an override before the track default
  // (`effectiveTypeId`), and every racer the filter admits is a legal override here.
  const active = listAllRacerTypes().filter((t) => t.isActive);
  const selectable = filterRacerTypesForTrack(active, gp.surfaceClasses, (id) =>
    getRacerType(id).getSurfaceClasses()
  ).map((t) => t.id);
  assert.ok(selectable.includes("snail"), "the snail must remain CHOOSABLE on his own track");
  assert.ok(selectable.length > 1, "an override is only meaningful if something else is offered");

  // SABOTAGE — if the default ever won over a stated choice, this is the shape that would break.
  const resolve = (override, track) => override ?? track.defaultRacerTypeId;
  assert.equal(resolve("snail", gp), "snail");
  assert.equal(resolve(undefined, gp), "beetle");
});

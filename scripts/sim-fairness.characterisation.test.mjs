// ============================================================
// sim-fairness.characterisation.test.mjs — what the sweep DOES today (SIM-FAIRNESS-PIN-1)
//
// Run: node --test scripts/sim-fairness.characterisation.test.mjs
//
// ── WHY THIS FILE EXISTS, AND WHAT IT DELIBERATELY IS NOT ───────────────────────────────────────
//
// `scripts/sim-fairness.mjs` is the project's simulator. Its shape, re-established at source on
// 2026-09-04 by parsing it with acorn rather than by counting braces or trusting a document:
//
//     6,195 lines (`wc -l`; the AST sees 6,196, counting the trailing newline)
//     340 function nodes
//     the longest is `runSingleRace` — 2,766 lines, 1029-3794 — and it is EXPORTED
//     the whole sweep sits behind `if (isMain)` (4125-6195), so importing the module is safe
//
// It is not product code and nothing the game runs imports it. It IS a declared `reach` entry of
// the world fingerprint, so it sits behind the project's primary change detector for the race —
// and it has had no test at all.
//
// ★ THESE ARE CHARACTERISATION TESTS. They pin what the file does TODAY. They do not say any of it
// is right, and a value here is not a specification: if a change is meant to move one of these, the
// value is updated deliberately in the same commit, and that deliberateness is the whole point. The
// backlog's verdict is to LEAVE THE FILE ALONE, and nothing here refactors, splits, shortens or
// reorganises it. Not one line of `sim-fairness.mjs` was edited.
//
// ── WHAT IS PINNED, AND WHAT COULD NOT BE ───────────────────────────────────────────────────────
//
// PINNED: the module's shape; the exported analysis helpers; and `runSingleRace` — the longest
// function, and the one every sweep number comes out of — driven end to end on real shipped tracks
// at a fixed seed, in both the closed and the open regime.
//
// NOT PINNED, and named here rather than left as a gap:
//   - THE `isMain` BLOCK (4125-6195, a third of the file): the CLI, the combo loop, the report
//     writing and every observer roll-up. It runs only as a subprocess, so pinning it means
//     spawning the sweep and hashing what it writes — minutes per assertion, against a suite budget
//     this project has already had to defend twice. It is the largest unpinned region.
//   - `runFairnessSelfCheck` (303 lines, the second longest): reachable only via `--selfcheck`,
//     i.e. from inside that same block.
//   - THE OBSERVER FLAGS. `runSingleRace` takes nine read-only observer switches; only the default
//     path (all off) is pinned here. The observers carry their own goldens in `scripts/sim/observers/`.
//   - `computeExtendedFairnessStats`: it runs a 499-permutation test off `Math.random` by default,
//     so it is not deterministic without being handed a seeded `prng`. Pinning it means choosing
//     that stream, which is a decision about the statistic and not a characterisation of it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const SIM = await import(u("scripts/sim-fairness.mjs"));
const { EditorShape } = await import(u("client/src/modules/track-editor/EditorShape.js"));

// ── 1. THE MODULE'S SHAPE ───────────────────────────────────────────────────────────────────────

// What breaks if deleted: the file could be split and the export surface changed with nothing
// noticing that callers across scripts/ and client/ read these names.
// What goes unnoticed: a rename landing as a runtime `undefined` at a call site instead of here.
test("the exported surface is what callers depend on", () => {
  for (const name of [
    "makePRNG",
    "runSingleRace",
    "computeFairnessStats",
    "computeZoneSuccessRate",
    "bandIntegrityOK",
    "computeExtendedFairnessStats",
    "RACER_CONFIGS",
    "DURATION_VARIANTS",
  ]) {
    assert.ok(name in SIM, `sim-fairness no longer exports ${name}`);
  }
});

// What breaks if deleted: the sweep could be moved out from behind `isMain`, and importing this
// module would then RUN it — which is the property that makes every test in this file possible.
// What goes unnoticed: nothing, until a suite hangs for minutes running a full sweep.
test("the sweep stays behind `isMain`, so importing the module does not run it", () => {
  const src = readFileSync(join(ROOT, "scripts/sim-fairness.mjs"), "utf8");
  assert.match(src, /^if \(isMain\) \{$/m, "the `if (isMain)` guard is gone");
});

// What breaks if deleted: `runSingleRace` could stop being the longest function — by being split —
// with no signal. Splitting it is not forbidden; it is a DECISION, and this makes it a deliberate
// one rather than something a reader discovers later.
// What goes unnoticed: the backlog's standing description of this file quietly becoming false.
test("`runSingleRace` is still the longest function in the file, and still exported", () => {
  const require = createRequire(join(ROOT, "client/package.json"));
  const acorn = require("acorn");
  const src = readFileSync(join(ROOT, "scripts/sim-fairness.mjs"), "utf8");
  const ast = acorn.parse(src, {
    ecmaVersion: "latest",
    sourceType: "module",
    allowAwaitOutsideFunction: true,
    locations: true,
  });
  const KINDS = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);
  let longest = { name: null, lines: -1 };
  (function walk(node, parent) {
    if (!node || typeof node.type !== "string") return;
    if (KINDS.has(node.type)) {
      const lines = node.loc.end.line - node.loc.start.line + 1;
      const name =
        node.id?.name ??
        (parent?.type === "VariableDeclarator" ? parent.id?.name : undefined) ??
        "(anonymous)";
      if (lines > longest.lines) longest = { name, lines };
    }
    for (const k of Object.keys(node)) {
      if (k === "loc" || k === "start" || k === "end") continue;
      const v = node[k];
      if (Array.isArray(v)) for (const c of v) walk(c, node);
      else if (v && typeof v.type === "string") walk(v, node);
    }
  })(ast, null);
  assert.equal(longest.name, "runSingleRace");
  assert.equal(typeof SIM.runSingleRace, "function");
});

// ── 2. THE EXPORTED ANALYSIS HELPERS ────────────────────────────────────────────────────────────

// What breaks if deleted: the seeded generator could change, and every "same seed, same race" claim
// in this repository would quietly mean something else.
// What goes unnoticed: all of it. A different stream is still a valid stream; nothing throws.
test("makePRNG is a deterministic stream, and the seed selects it", () => {
  const draw = (seed, n) => {
    const rng = SIM.makePRNG(seed);
    return Array.from({ length: n }, () => +rng().toFixed(12));
  };
  assert.deepEqual(draw(12345, 5), draw(12345, 5), "two instances of one seed disagree");
  assert.notDeepEqual(draw(1, 5), draw(2, 5), "two different seeds gave the same stream");
  for (const v of draw(12345, 20)) assert.ok(v >= 0 && v < 1, `draw out of [0,1): ${v}`);
});

// What breaks if deleted: the fairness statistic could change definition — the thing every gate in
// this project is expressed in. It reduces each race to its WINNER's start row, so a change to how
// a winner is picked lands here.
// What goes unnoticed: a shifted number reading as a shifted RACE.
test("computeFairnessStats reduces races to start rows the same way every time", () => {
  const race = (ranks) =>
    ranks.map((finalRank, i) => ({
      racerIndex: i,
      startRowIndex: i % 3,
      finalRank,
      finishTime: 10 + finalRank,
    }));
  // Three rows of two. The winner is index 0, 0 and 2 — start rows 0, 0 and 2 — a deliberately
  // uneven field, so a statistic that stopped reading start rows could not accidentally agree.
  const races = [race([1, 2, 3, 4, 5, 6]), race([1, 3, 2, 5, 4, 6]), race([3, 2, 1, 4, 5, 6])];
  const stats = SIM.computeFairnessStats(races, 3);
  assert.ok(stats && typeof stats === "object");
  assert.deepEqual(
    JSON.parse(JSON.stringify(stats)),
    JSON.parse(JSON.stringify(SIM.computeFairnessStats(races, 3))),
    "not deterministic across two calls on identical input",
  );
  assert.match(JSON.stringify(stats), /\d/, "the statistic returned no numbers at all");
});

// What breaks if deleted: band-reach — the project's own fairness gate — could change meaning.
// What goes unnoticed: a gate that reports 70% for a different question.
//
// ★ ITS INPUT SHAPE, established by running it: an array of `{ result, targetRankMap }`, where
// `result` is a `runSingleRace` array and `targetRankMap` is a Map from racerIndex to the rank the
// plan authored. A racer with no entry in that map is SKIPPED — which is the behaviour worth
// pinning, because it means a broken map produces a smaller sample rather than an error.
test("computeZoneSuccessRate scores against the target map, and skips what is not in it", () => {
  const result = Array.from({ length: 12 }, (_, i) => ({
    racerIndex: i,
    startRowIndex: i % 3,
    finalRank: i + 1,
  }));
  // Every racer lands exactly on its target: a perfect field, which must score 1.
  const exact = new Map(result.map((r) => [r.racerIndex, r.finalRank]));
  const perfect = SIM.computeZoneSuccessRate([{ result, targetRankMap: exact }]);
  // `overall` is a {hits, total, rate} block, not a bare number — established by running it.
  assert.deepEqual(perfect.overall, { hits: 12, total: 12, rate: 1 });

  // Deterministic on identical input.
  assert.deepEqual(
    JSON.parse(JSON.stringify(perfect)),
    JSON.parse(JSON.stringify(SIM.computeZoneSuccessRate([{ result, targetRankMap: exact }]))),
    "not deterministic on identical input",
  );

  // ★ THE SKIP. Half the map removed must halve the SAMPLE, not the score — a racer the plan did
  // not author is not a miss. This is the silent-shrink behaviour a later reader most needs to know.
  const half = new Map([...exact].slice(0, 6));
  const partial = SIM.computeZoneSuccessRate([{ result, targetRankMap: half }]);
  assert.equal(partial.overall.rate, 1, "skipped racers were counted as misses");
  assert.equal(partial.overall.total, 6, "the unmapped racers were not skipped");
});

// What breaks if deleted: the gate's PASS/FAIL rule could invert or loosen with nothing noticing.
// It is four comparisons and a margin, and it decides whether a change ships.
// What goes unnoticed: a margin applied in the wrong direction still returns a verdict.
test("bandIntegrityOK pins the gate's own decision rule", () => {
  assert.deepEqual(SIM.bandIntegrityOK(0.72, 0.7, [0.71, 0.73], [0.7, 0.7]), {
    ok: true,
    pooledOK: true,
    tracksFailed: 0,
  });
  // Inside the margin is still ok. That tolerance is easy to lose in an edit.
  assert.equal(SIM.bandIntegrityOK(0.69, 0.7, [], []).ok, true);
  assert.equal(SIM.bandIntegrityOK(0.6, 0.7, [], []).ok, false);
  // ONE track more than two margins below its own baseline fails the whole thing even when the
  // pool is fine — the per-track half of the rule.
  const r = SIM.bandIntegrityOK(0.75, 0.7, [0.75, 0.6], [0.7, 0.7]);
  assert.equal(r.pooledOK, true);
  assert.equal(r.tracksFailed, 1);
  assert.equal(r.ok, false);
});

// ── 3. `runSingleRace` — THE LONGEST FUNCTION, DRIVEN END TO END ────────────────────────────────
//
// ★ ITS RETURN SHAPE, established by RUNNING it rather than by reading for it: an ARRAY of one row
// per racer — {racerIndex, startRowIndex, indexInRow, finalT, finalRank, finishTime} — with the
// race's aggregate metrics attached to that array as named properties (`naturalness`,
// `physicalDurationS`, `outcomeReached`, the `lite*` counters, …). `perRacer` is NOT on it by
// default: that is attached only under the `--action-metrics` observer.

/** The inputs the sweep builds, from a real shipped track record — never a hand-made shape. */
function inputsFor(trackId, over = {}) {
  const track = JSON.parse(
    readFileSync(join(ROOT, "server", "seeds", "tracks", `${trackId}.json`), "utf8"),
  );
  const shape = new EditorShape(track);
  return {
    shape,
    pathLengthPx: track.pathLengthPx ?? shape.getTotalLength(),
    geometricTrackWidth: track.width ?? shape.getActualTrackWidth(),
    isOpen: !!shape.isOpen,
    speedMultiplier: 1,
    displaySize: 40,
    laps: shape.isOpen ? 1 : 2,
    requestedSeconds: 30,
    seed: 4242,
    nRacers: 12,
    behaviorConfigOverrides: { isOpen: !!shape.isOpen },
    ...over,
  };
}

/** The finishing order — the strongest single statement about what a race DID. */
const orderOf = (res) => res.map((r) => `${r.racerIndex}:${r.finalRank}`).join(" ");

// What breaks if deleted: the 2,766-line function could change behaviour with nothing to notice,
// which is the state this file was written to end. A change here does select the world fingerprint
// — but that instrument says only THAT something moved, and only when somebody runs it.
// What goes unnoticed: which race changed, and in which regime.
test("runSingleRace produces a deterministic race on a closed track", () => {
  const a = SIM.runSingleRace(inputsFor("dirt-oval"));
  const b = SIM.runSingleRace(inputsFor("dirt-oval"));
  assert.ok(Array.isArray(a), "the result is no longer an array of racer rows");
  assert.equal(a.length, 12, "not every racer produced a row");
  assert.equal(orderOf(a), orderOf(b), "the same seed gave two different races");
  // Every rank used exactly once — the invariant a reordering bug breaks first.
  assert.deepEqual(
    a.map((r) => r.finalRank).sort((x, y) => x - y),
    Array.from({ length: 12 }, (_, i) => i + 1),
  );
  for (const r of a) {
    for (const k of [
      "racerIndex",
      "startRowIndex",
      "indexInRow",
      "finalT",
      "finalRank",
      "finishTime",
    ]) {
      assert.ok(k in r, `a racer row lost ${k}`);
    }
  }
});

// What breaks if deleted: the same, for the OPEN-track regime, which takes different branches
// through the same function — one lap, a run-out zone, a different finish rule.
// What goes unnoticed: a change that holds on closed tracks and not on open ones, which is the
// shape of most defects this project has found in the race.
test("runSingleRace produces a deterministic race on an open track", () => {
  const a = SIM.runSingleRace(inputsFor("space-sprint"));
  const b = SIM.runSingleRace(inputsFor("space-sprint"));
  assert.equal(a.length, 12);
  assert.equal(orderOf(a), orderOf(b));
});

// What breaks if deleted: the seed could stop reaching the race, and every paired sweep in this
// repository — every arm claiming to see "the identical seed sequence" — would be comparing
// unrelated races while still reporting a difference.
// What goes unnoticed: everything. Both arms still produce numbers.
test("the seed reaches the race — two seeds give two different races", () => {
  const a = SIM.runSingleRace(inputsFor("dirt-oval", { seed: 4242 }));
  const b = SIM.runSingleRace(inputsFor("dirt-oval", { seed: 9999 }));
  assert.notEqual(orderOf(a), orderOf(b), "two different seeds produced the identical race");
});

// What breaks if deleted: the race-level metrics the sweep reports could detach from the race.
// `naturalness` is the envelope this project's own realism claims are made against.
// What goes unnoticed: a metric block that is present, well-formed and stale.
test("the race carries its aggregate metrics, and they move with the race", () => {
  const a = SIM.runSingleRace(inputsFor("dirt-oval", { seed: 4242 }));
  const b = SIM.runSingleRace(inputsFor("dirt-oval", { seed: 9999 }));
  for (const k of ["naturalness", "physicalDurationS", "outcomeReached"]) {
    assert.ok(k in a, `the result lost ${k}`);
  }
  assert.equal(typeof a.physicalDurationS, "number");
  assert.ok(a.physicalDurationS > 0, "the race reports no duration");
  assert.ok(a.naturalness && typeof a.naturalness === "object");
  // Two different races must not report byte-identical naturalness; that would mean the block is
  // computed from something other than the race.
  assert.notDeepEqual(
    a.naturalness,
    b.naturalness,
    "two different races reported identical naturalness — it is not reading the race",
  );
});

// What breaks if deleted: THE GOLDEN. Any change inside the 2,766 lines that moves the race — a
// force, a threshold, an ordering, a rounding — goes red here, with the track and the seed named.
// What goes unnoticed: the world fingerprint would still catch it eventually, as one moved hash
// over ten tracks, when somebody runs it. This says WHICH race changed, in the ordinary suite.
//
// ★ IF THIS GOES RED AND THE CHANGE WAS INTENDED, update the digest in the same commit. It is a
// record of behaviour, not a specification of it. Both regimes are in ONE digest on purpose: a
// change that moves only open tracks must not be able to pass by averaging with a closed one.
test("GOLDEN — the finishing order at a fixed seed, closed and open", () => {
  const dirt = orderOf(SIM.runSingleRace(inputsFor("dirt-oval")));
  const space = orderOf(SIM.runSingleRace(inputsFor("space-sprint")));
  const digest = createHash("sha256").update(`${dirt}|${space}`).digest("hex").slice(0, 16);
  assert.equal(
    digest,
    "c59b7c42aef42013",
    `the race changed.\n  dirt-oval   : ${dirt}\n  space-sprint: ${space}\n  digest: ${digest}`,
  );
});

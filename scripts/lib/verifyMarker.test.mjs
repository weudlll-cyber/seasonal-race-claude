// ============================================================
// File:        scripts/lib/verifyMarker.test.mjs
// Project:     RaceArena — VERIFY-INCREMENTAL-1
//
// THE INCREMENTAL BASE IS ONLY SAFE IF EVERY DOUBT FALLS BACK TO MASTER, SO EVERY DOUBT IS TESTED.
//
// `chooseBase` is pure — no git, no filesystem — which is the whole reason it was split out of
// `verify.mjs`: a fallback that only shows up when somebody rebases at the wrong moment is not
// something to discover from a run. Each case below is one way the recorded marker can be wrong,
// and the assertion is always the same two things: master, and a reason that SAYS so.
//
// The one case that must NOT fall back is last, because a mode that always falls back is safe and
// useless.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MARKER_VERSION,
  advanceMarker,
  chooseBase,
  markerFileName,
  shouldAdvance,
} from "./verifyMarker.mjs";

const BRANCH = "feat/playable-four-1";
const MASTER = "d407f090aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

/** The healthy case, which each test below spoils in exactly one way. */
const good = (over = {}) => ({
  premerge: false,
  explicitBase: false,
  branch: BRANCH,
  defaultBranch: "master",
  marker: {
    version: MARKER_VERSION,
    branch: BRANCH,
    head: "cfe3e6d5bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    master: MASTER,
  },
  masterSha: MASTER,
  markerIsAncestor: true,
  ...over,
});

/** Every fallback must be master AND must carry a reason — a silent fallback is the defect. */
function assertFellBack(r, /** @type {RegExp} */ why) {
  assert.equal(r.base, "master");
  assert.equal(r.incremental, false);
  assert.match(r.note, why);
  assert.ok(r.note.length > 20, "a fallback must explain itself, not just happen");
}

// ── The one that is not a doubt at all: the run the whole mode leans on ─────────────────────────

test("--premerge always compares against master, whatever the marker says", () => {
  // What breaks if deleted: the pre-merge run could go incremental, and the FULL comparison that
  // makes every skipped intermediate run safe would stop happening.
  assertFellBack(chooseBase(good({ premerge: true })), /PRE-MERGE/i);
});

test("an explicit --base is never second-guessed", () => {
  const r = chooseBase(good({ explicitBase: true }));
  assert.equal(r.base, null, "verify keeps the caller's own value");
  assert.equal(r.incremental, false);
});

// ── The three fallbacks the brief names, plus the two the shape implies ─────────────────────────

test("NO MARKER falls back to master and says the branch has no green run yet", () => {
  assertFellBack(chooseBase(good({ marker: null })), /no fully green verify/i);
});

test("A MARKER THAT IS NOT AN ANCESTOR falls back and names rebase/reset/switch", () => {
  // The dangerous one: the recorded commit is no longer on this history, so that run says nothing
  // about this tree, and diffing against it would skip real work.
  assertFellBack(
    chooseBase(good({ markerIsAncestor: false })),
    /not an ancestor of HEAD/i,
  );
});

test("MASTER HAVING MOVED falls back, because a guard's answer can change underneath the branch", () => {
  const r = chooseBase(good({ masterSha: "9999999999999999999999999999999999999999" }));
  assertFellBack(r, /has moved since that run/i);
  // Both ends are named, so the reader can see what moved.
  assert.match(r.note, /d407f090/);
  assert.match(r.note, /99999999/);
});

test("a marker written on ANOTHER BRANCH falls back", () => {
  assertFellBack(
    chooseBase(good({ marker: { ...good().marker, branch: "other" } })),
    /written on other/i,
  );
});

test("a marker in an OLDER FORMAT falls back rather than being misread", () => {
  assertFellBack(
    chooseBase(good({ marker: { ...good().marker, version: MARKER_VERSION + 1 } })),
    /format/i,
  );
});

test("a DETACHED HEAD falls back — there is no branch to record progress against", () => {
  assertFellBack(chooseBase(good({ branch: null })), /detached/i);
});

test("on master itself the mode stays off, so an empty run keeps meaning what it means", () => {
  assertFellBack(
    chooseBase(good({ branch: "master", marker: { ...good().marker, branch: "master" } })),
    /this IS master/i,
  );
});

// ── And the case that must NOT fall back ────────────────────────────────────────────────────────

test("a healthy marker IS used, and the note names the commit", () => {
  // What breaks if deleted: every guard above could be satisfied by a function that returns master
  // unconditionally — safe, and the feature would do nothing.
  const r = chooseBase(good());
  assert.equal(r.base, good().marker.head);
  assert.equal(r.incremental, true);
  assert.match(r.note, /last fully green verify/i);
  assert.match(r.note, /cfe3e6d5/);
});

// ── The marker file itself ──────────────────────────────────────────────────────────────────────

test("a branch name with slashes becomes one file name", () => {
  assert.equal(markerFileName("feat/a/b"), "feat_a_b.json");
  assert.ok(!markerFileName(BRANCH).includes("/"));
});

// ── ★ THE GREEN-ONLY RULE, which is the other half of the mode's safety ────────────────────────

test("a RED run is never recorded as verified", () => {
  // ★ SABOTAGE (a) IS AIMED HERE. If a failed run advanced the marker, the NEXT run would diff
  // from it and skip the very ground that just failed — a defect that hides a defect.
  const r = shouldAdvance({ failed: 1, premerge: false, dry: false });
  assert.equal(r.advance, false);
  assert.match(r.why, /partially verified tree must never be recorded/i);
});

test("--premerge never records, and --dry never records", () => {
  assert.equal(shouldAdvance({ failed: 0, premerge: true, dry: false }).advance, false);
  assert.equal(shouldAdvance({ failed: 0, premerge: false, dry: true }).advance, false);
});

test("a failure count that was never established is refused, not assumed green", () => {
  // An interrupted run, or a caller that forgot to pass the outcome. Silence must not read as zero.
  assert.equal(shouldAdvance({ premerge: false, dry: false }).advance, false);
  assert.equal(shouldAdvance({ failed: null, premerge: false, dry: false }).advance, false);
});

test("a fully green, complete run IS recorded", () => {
  const r = shouldAdvance({ failed: 0, premerge: false, dry: false });
  assert.equal(r.advance, true);
  assert.match(r.why, /every selected guard passed/i);
});

test("advanceMarker REFUSES a red run even if the call site asks it to", () => {
  // Defence in depth: sabotage (a) removed the call-site guard in verify.mjs, so the writer itself
  // has to refuse. This is the assertion that caught it.
  const dir = mkdtempSync(join(tmpdir(), "ra-marker-"));
  mkdirSync(join(dir, "racearena-verify"), { recursive: true });
  const path = join(dir, "racearena-verify", markerFileName(BRANCH));
  const wrote = advanceMarker(dir, {
    path,
    head: "abc1234500000000000000000000000000000000",
    branch: BRANCH,
    masterSha: MASTER,
    failed: 2,
  });
  assert.equal(wrote, false);
  assert.equal(existsSync(path), false, "nothing may be written for a red run");
});

test("advanceMarker writes what chooseBase reads back", () => {
  const dir = mkdtempSync(join(tmpdir(), "ra-marker-"));
  mkdirSync(join(dir, "racearena-verify"), { recursive: true });
  const path = join(dir, "racearena-verify", markerFileName(BRANCH));

  const ok = advanceMarker(dir, {
    path,
    head: "abc1234500000000000000000000000000000000",
    branch: BRANCH,
    masterSha: MASTER,
    failed: 0,
  });
  assert.equal(ok, true);

  const written = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(written.version, MARKER_VERSION);
  assert.equal(written.branch, BRANCH);
  assert.equal(written.head, "abc1234500000000000000000000000000000000");
  assert.equal(written.master, MASTER);
  // It says how to get rid of it, because a state file nobody knows how to reset is a trap.
  assert.match(written.note, /Delete this file/i);

  // And the decision accepts it, so the two halves cannot drift apart.
  const r = chooseBase(good({ marker: written }));
  assert.equal(r.incremental, true);
});

test("advanceMarker reports failure rather than throwing when there is nowhere to write", () => {
  // What breaks if deleted: a checkout without a git dir could take verify down at the very end of
  // a green run — after all the work, for a bookkeeping file.
  assert.equal(
    advanceMarker("/nope", { path: null, head: "a", branch: BRANCH, failed: 0 }),
    false,
  );
});

test("a DAMAGED marker file is read as no marker, and no marker means master", () => {
  const dir = mkdtempSync(join(tmpdir(), "ra-marker-"));
  const path = join(dir, "broken.json");
  writeFileSync(path, "{ this is not json");
  // `gatherMarkerContext` swallows the parse and yields null; the decision then falls back.
  assertFellBack(chooseBase(good({ marker: null })), /no fully green verify/i);
});

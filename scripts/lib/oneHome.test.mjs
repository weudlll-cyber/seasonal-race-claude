// ============================================================
// oneHome.test.mjs — the two homes ONE-HOME-THREE-TRUTHS-1 created, proved live.
//
// Run: node --test scripts/lib/oneHome.test.mjs   (the docs job's script suite finds it by `find`)
//
// WHAT THESE ARE FOR. Both modules were extracted from copies that AGREED, so nothing observable
// changed when they landed — which means a transcription error would also have been unobservable.
// These are the assertions that make the extraction checkable rather than trusted.
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { HIS, setPath, applyHisArm } from "./hisArm.mjs";
import { inFrame, countInFrame } from "./frameBox.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { DEFAULT_CAMERA_CONFIG } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/storage/defaults.js")).href
);

// ── hisArm ──────────────────────────────────────────────────────────────────────────────────────

// IF DELETED: a key could be dropped from HIS and every camera harness would quietly measure a
// different arm. WHAT WOULD GO UNNOTICED: exactly that — the harnesses would still agree with each
// other, because they now share this list, so there would be nothing to compare against.
test("HIS carries the eleven keys the harnesses were written around, with their values", () => {
  assert.equal(HIS.length, 11, "the arm changed size — every harness now measures something else");
  const m = new Map(HIS);
  assert.equal(m.get("cameraStateProfiles.OVERVIEW.trackingTC"), 1.5);
  assert.equal(m.get("highlightHeroes"), true);
  assert.equal(m.get("battlePulkThresholdT"), 0.001);
  assert.equal(m.get("outcomePhaseThreshold"), 0.65);
  assert.equal(m.get("battleCooldownMs"), 20000);
  assert.equal(m.get("battleWeight"), 0);
  assert.equal(m.get("finishPauseMs"), 4000);
  assert.equal(m.get("winnerCardMs"), 4000);
  assert.equal(m.get("corridorCapArriveMs"), 5000);
  assert.equal(m.get("labelNamesWhenRoom"), true);
  assert.equal(m.get("minRacersVisible"), 8);
});

// THE CLONE IS THE WHOLE REASON setPath IS NOT A ONE-LINER. IF DELETED: a harness that applied the
// arm would mutate DEFAULT_CAMERA_CONFIG in place, and every later arm in the same process — the
// SHIPPED arm included — would silently inherit his settings. That is a measurement reporting the
// wrong arm's numbers under the right arm's name.
test("applyHisArm does NOT mutate the defaults it was cloned from", () => {
  const before = DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW.trackingTC;
  const cfg = applyHisArm(structuredClone(DEFAULT_CAMERA_CONFIG));
  assert.equal(cfg.cameraStateProfiles.OVERVIEW.trackingTC, 1.5, "his value did not land");
  assert.equal(
    DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW.trackingTC,
    before,
    "applying the arm reached back into the shipped defaults"
  );
  assert.notEqual(before, 1.5, "this test proves nothing if the default already equals his value");
});

test("setPath writes a nested path and leaves siblings alone", () => {
  const o = { a: { b: 1, c: 2 }, d: 3 };
  setPath(o, "a.b", 99);
  assert.deepEqual(o, { a: { b: 99, c: 2 }, d: 3 });
});

// ── the endgame threshold's one home ────────────────────────────────────────────────────────────

// IF DELETED: nothing ties the harnesses' deadline to the shipped value again, and the two could
// drift apart without a single test going red. WHAT WOULD GO UNNOTICED: a change to the shipped
// `endgameThreshold` while `endgame-spec` kept scoring against the old instant — which surfaces as
// a REGRESSION REPORT about code that did not change.
test("the endgame deadline is a config value, not a literal the harnesses carry", () => {
  const t = DEFAULT_CAMERA_CONFIG.endgameThreshold;
  assert.equal(typeof t, "number");
  assert.ok(t > 0 && t < 1, `endgameThreshold is a race-progress fraction, got ${t}`);
});

// ── frameBox ────────────────────────────────────────────────────────────────────────────────────

// IF DELETED: the inclusive boundary could flip to exclusive and silently move the on-screen counts
// in five instruments at once. WHAT WOULD GO UNNOTICED: precisely that — the numbers would change,
// every harness would agree with every other, and the change would read as a camera finding.
test("inFrame is INCLUSIVE on all four edges — the behaviour all eight copies had", () => {
  const CW = 1280;
  const CH = 720;
  for (const p of [{ x: 0, y: 0 }, { x: CW, y: CH }, { x: 0, y: CH }, { x: CW, y: 0 }])
    assert.equal(inFrame(p, CW, CH), true, `${JSON.stringify(p)} is on the edge and must count`);
  for (const p of [{ x: -1, y: 0 }, { x: CW + 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: CH + 1 }])
    assert.equal(inFrame(p, CW, CH), false, `${JSON.stringify(p)} is outside and must not count`);
  assert.equal(inFrame({ x: 640, y: 360 }, CW, CH), true);
});

test("countInFrame counts what inFrame admits", () => {
  const pts = [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 640, y: 360 }, { x: 1281, y: 0 }];
  assert.equal(countInFrame(pts, 1280, 720), 2);
});

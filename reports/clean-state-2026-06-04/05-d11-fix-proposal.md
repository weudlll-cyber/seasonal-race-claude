# d11-ux-verification.spec.js — Diagnosis & Fix Proposal

**File:** `client/e2e/d11-ux-verification.spec.js`
**Date:** 2026-06-04 (clean-state follow-up)
**Status:** PROPOSAL ONLY — test file NOT changed; requires browser run against dev server to confirm.

---

## Executive Summary

The spec tests the Race Behavior Dev Screen UI. The **8 physics sliders were removed from the Dev Screen** in `feat/dynamic-speed-brake` (commit `99e50bd`). Three slider labels are now absent from `BehaviorTuningSection.jsx`: `Home Force Strength`, `Avoidance Distance`, and `Speed Brake Factor`. Any test using these labels will throw a `locator.fill()` or `expect()` timeout immediately.

Additionally, `draftingBoost` default changed from `1.1` → `1.04` since this spec was written, causing two value-assertion failures.

**Net result: 9 tests will FAIL; 9 tests should still PASS.**

---

## Dev Screen Audit — Which Labels Still Exist

Checked `client/src/screens/DevScreen/sections/BehaviorTuningSection.jsx`:

| Label (`getByLabel(...)`) | aria-label in component | Exists? | Notes |
|---|---|---|---|
| `'Home Force Strength'` | removed with 8 params | **GONE** | Was Block 6 |
| `'Avoidance Distance'` | removed with 8 params | **GONE** | Was Block 6 |
| `'Speed Brake Factor'` | removed with 8 params | **GONE** | Was Block 8 |
| `'Enabled'` | "Race Behavior Enabled" | ✅ Yes | Playwright substring match |
| `'Boost Factor'` | "Boost Factor" | ✅ Yes | Default now 1.04, not 1.1 |
| `'Drafting Cone Angle'` | "Drafting Cone Angle" | ✅ Yes | Default still 30 |
| `'Avoidance Warmup Ms'` | "Avoidance Warmup Ms" | ✅ Yes | Can substitute for removed fields |
| `'Comfort Threshold'` | "Comfort Threshold" | ✅ Yes | |
| `'Soft Repulsion Strength'` | "Soft Repulsion Strength" | ✅ Yes | |
| `'Max Lateral'` | "Max Lateral" | ✅ Yes | |
| `'Stuck Mode Suppression'` | "Stuck Mode Suppression" | ✅ Yes | checkbox |

Note: Playwright `getByLabel()` uses case-insensitive substring matching by default, so `getByLabel('Enabled')` correctly finds the element whose label is "Race Behavior Enabled".

---

## Per-Test Diagnosis

| Test | Reason to fail / pass | Fix |
|---|---|---|
| V1 — default homeForceStrength is 0.018 | Label `Home Force Strength` GONE | **DELETE** |
| V1 — default avoidanceDistance is 0.35 | Label `Avoidance Distance` GONE | **DELETE** |
| V1 — default draftingBoost is 1.1 | Label exists; `draftingBoost` default is now 1.04 | **UPDATE** 1.1 → 1.04 |
| V1 — default enabled is true | Label exists, value unchanged | No change |
| V2 — changed avoidanceDistance persists | Label `Avoidance Distance` GONE | **REPLACE** with `Avoidance Warmup Ms` (persists the same way) |
| V3 — Reset Defaults restores avoidanceDistance | Label `Avoidance Distance` GONE | **DELETE** |
| V3 — Reset Defaults restores draftingBoost to 1.1 | Label exists; expected 1.1, should be 1.04 | **UPDATE** 1.1 → 1.04 |
| V3 — Reset Defaults re-enables toggle | Label exists, logic unchanged | No change |
| V4 — unchecking Enabled persists | Label exists, logic unchanged | No change |
| V5 — avoidanceDistance stored immediately | Label `Avoidance Distance` GONE | **REPLACE** with `Avoidance Warmup Ms` or `Comfort Threshold` |
| V6 — race engine reads custom behavior config | Uses `addInitScript` (no UI labels); stale `DEFAULT_CFG` fields are stored but unknown params are harmlessly ignored. Race just checks for JS errors. | **UPDATE `DEFAULT_CFG`** to remove stale physics params (cosmetic — V6 probably passes anyway) |
| V7 — race works when disabled | Uses `addInitScript`, no UI labels | Update `DEFAULT_CFG` (cosmetic) |
| V8 — race with 5 racers | No UI labels | No change |
| V9 — homeForceStrength can be changed | Label `Home Force Strength` GONE | **DELETE** |
| V9 — speedBrakeFactor can be changed | Label `Speed Brake Factor` GONE | **DELETE** |
| V9 — draftingConeAngle can be changed | Label `Drafting Cone Angle` exists | No change |
| V10 — drafting summary reflects boost factor | Label `Boost Factor` exists | No change (just fill + check; no default assertion) |

---

## Proposed Patch

> **Do NOT apply until browser-verified.** Run the dev server + `npx playwright test client/e2e/d11-ux-verification.spec.js` to confirm each passing/failing test before committing.

### 1. Update `DEFAULT_CFG` object

Remove the four removed-slider fields and update `draftingBoost`:

```diff
 const DEFAULT_CFG = {
   enabled: true,
-  homeForceStrength: 0.018,
   comfortThreshold: 0.70,
   softRepulsionStrength: 0.06,
-  avoidanceDistance: 0.35,
   tWeight: 2.0,
   yWeight: 1.0,
-  lateralForce: 0.015,
   maxLateral: 0.95,
   speedBrakeYThreshold: 0.12,
-  speedBrakeTThreshold: 0.008,
-  speedBrakeFactor: 0.98,
   draftingMaxDistance: 110,
   draftingConeAngle: 30,
-  draftingBoost: 1.1,
+  draftingBoost: 1.04,
 };
```

Note: `speedBrakeYThreshold` and `draftingMaxDistance` still have UI sliders, so they stay in DEFAULT_CFG. `speedBrakeTThreshold` was replaced by `speedBrakeTMultiplier` — remove it.

### 2. Delete 6 tests (labels gone)

Remove entirely:
- `test('V1 — default homeForceStrength is 0.018', ...)`
- `test('V1 — default avoidanceDistance is 0.35', ...)`
- `test('V3 — Reset Defaults restores avoidanceDistance to 0.35', ...)`
- `test('V9 — homeForceStrength can be changed', ...)`
- `test('V9 — speedBrakeFactor can be changed', ...)`

### 3. Update 2 draftingBoost value assertions

```diff
 test('V1 — default draftingBoost is 1.1', async ({ page }) => {
   await openBehaviorSection(page);
-  await expect(page.getByLabel('Boost Factor')).toHaveValue('1.1');
+  await expect(page.getByLabel('Boost Factor')).toHaveValue('1.04');
 });

 test('V3 — Reset Defaults restores draftingBoost to 1.1', async ({ page }) => {
   await openBehaviorSection(page);
   await page.getByLabel('Boost Factor').fill('1.5');
   // ... click Reset ...
-  await expect(page.getByLabel('Boost Factor')).toHaveValue('1.1');
+  await expect(page.getByLabel('Boost Factor')).toHaveValue('1.04');
 });
```

### 4. Rewrite V2 using `Avoidance Warmup Ms` (a field that still persists)

```diff
-test('V2 — changed avoidanceDistance persists across reload', async ({ page }) => {
+test('V2 — changed avoidanceWarmupMs persists across reload', async ({ page }) => {
   await openBehaviorSection(page);
-  await page.getByLabel('Avoidance Distance').fill('0.5');
+  await page.getByLabel('Avoidance Warmup Ms').fill('5000');
   await page.reload();
   await openBehaviorSection(page);
-  await expect(page.getByLabel('Avoidance Distance')).toHaveValue('0.5');
+  await expect(page.getByLabel('Avoidance Warmup Ms')).toHaveValue('5000');
 });
```

### 5. Rewrite V5 using `Avoidance Warmup Ms`

```diff
-test('V5 — config change is stored in localStorage immediately', async ({ page }) => {
+test('V5 — avoidanceWarmupMs config change stored in localStorage immediately', async ({ page }) => {
   await openBehaviorSection(page);
-  await page.getByLabel('Avoidance Distance').fill('0.6');
+  await page.getByLabel('Avoidance Warmup Ms').fill('5000');
   const stored = await page.evaluate(() => {
     const raw = localStorage.getItem('racearena:raceBehaviorConfig');
     return raw ? JSON.parse(raw) : null;
   });
   expect(stored).not.toBeNull();
-  expect(stored.avoidanceDistance).toBeCloseTo(0.6, 5);
+  expect(stored.avoidanceWarmupMs).toBeCloseTo(5000, 0);
 });
```

---

## Summary of Changes

| Change | Count |
|---|---|
| Tests deleted (label gone) | 5 |
| Tests updated (value stale) | 2 |
| Tests rewritten (use different field) | 2 |
| DEFAULT_CFG fields removed | 5 (homeForceStrength, avoidanceDistance, lateralForce, speedBrakeTThreshold, speedBrakeFactor) |
| DEFAULT_CFG values updated | 1 (draftingBoost: 1.1 → 1.04) |
| **Tests expected to pass after fix** | ≈ 12 |

---

## What This Does NOT Fix

- The test description for `V1 — default draftingBoost is 1.1` title should be updated to say `1.04` after the value change.
- `V3 — Reset Defaults restores draftingBoost to 1.1` title should be updated similarly.
- `DEFAULT_CFG.draftingMaxDistance: 110` is stale — the current default is `80`. This means the V6/V7 tests seed a config with `draftingMaxDistance: 110`, which silently overrides the real default without breaking the race. Update to `80` for accuracy.
- `DEFAULT_CFG.draftingConeAngle: 30` and `DEFAULT_CFG.draftingBoost: 1.04` (after update) match current defaults. No further change needed for those.

---

## Browser Verification Checklist

Before committing the fix:
1. `cd client && npm run dev` (both client + server)
2. `npx playwright test client/e2e/d11-ux-verification.spec.js --headed` (or `--reporter=list`)
3. Confirm the deleted tests no longer exist
4. Confirm the renamed/rewritten tests pass
5. Confirm the updated value assertions pass
6. Commit with message: `test: fix d11-ux-verification — remove deleted physics sliders, update draftingBoost default`

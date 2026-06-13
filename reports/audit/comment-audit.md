# Inline Comment Accuracy Audit

**Date:** 2026-06-13  
**Base commit:** ea6f2b31efa90bd5bf01dd265ede274beecae6be  
**Scope:** `client/src/**` and `server/src/**` (excluding `*.test.*`, `*.spec.*`, node_modules, build output)

---

## Category Count Summary

| Category | Count |
|---|---|
| C1 Value mismatch | 4 |
| C2 Stale reference | 0 |
| C3 Outdated behavior | 0 |
| C4 Non-English comment | 2 |
| C5 Stale marker | 0 |
| C6 Misleading label | 0 |
| **Total** | **6** |

---

## Triage Table

| ID | File:line | Category | Comment (abridged) | Code reality | Suggested fix |
|---|---|---|---|---|---|
| CA-01 | [raceBehavior.js:20](client/src/modules/raceBehavior.js#L20) | C1 | "Dirt Oval track width in px" | `REFERENCE_TRACK_WIDTH = 98`; actual Dirt Oval `"width": 93` in `server/data/tracks/dirt-oval.json` and `DIRT_OVAL_TRACK_WIDTH_PX = 93` in `headlessRaceSimulator.js` | Change comment to "calibration-reference width in px (93 = Dirt Oval at original-build time)" or update the constant to 93 |
| CA-02 | [CameraDirector.js:75](client/src/modules/camera/CameraDirector.js#L75) | C1 | "others TC=0.8s" | Adjacent fallback constants `_TC_LEADER = _TC_BATTLE = _TC_COMEBACK = 0.3` (lines 47–49); the 5000 ms values were derived using the *default-config* `entryTC = 0.8`, not these fallback constants | Clarify: "others use default-config entryTC=0.8s; bare TC fallbacks above are 0.3s (lerp only)" |
| CA-03 | [autoSpriteScale.js:31](client/src/modules/autoSpriteScale.js#L31) | C1 | "at the default 140px track with 6 racers (ratio ≈ 23.3)" | No track has width=140 px; actual track widths range 93–300 px (dirt-oval=93, garden-path=100, ice-track=110, searound=131 …) | Replace example with a real track, e.g. "at dirt-oval (93px) with 6 racers (ratio ≈ 0.67 → minScale)" and update the referenceValue origin note |
| CA-04 | [index.jsx:836](client/src/screens/RaceScreen/index.jsx#L836) | C1 | "long frames (50ms) yield 3 steps" | Catch-up loop on line 844: `_catchupSteps++ < 2` caps at **2** steps per rAF; 50 ms frames yield 2 steps, not 3 | Change "yield 3 steps" to "yield at most 2 steps (cap below)"; keep "short frames (12ms) yield 0" unchanged |
| CA-05 | [App.jsx:112](client/src/App.jsx#L112) | C4 | "via /diagnose-verteilung in the address bar" | "Verteilung" is German (= distribution); CLAUDE.md mandates English only, including in comments | Rename the route/component to English (e.g. `/distribution-diagnose`) or render the path in English comment prose |
| CA-06 | [DiagnoseVerteilung.jsx:5](client/src/screens/DiagnoseVerteilung/DiagnoseVerteilung.jsx#L5) | C4 | "Hidden diagnostic route /diagnose-verteilung." | Same German compound; also appears in file header on lines 2–3 | Follows from CA-05: once the route is renamed the comment updates automatically; until then replace with English equivalent |

---

## Notes

- **CA-01 vs CA-02 are independent**: `REFERENCE_TRACK_WIDTH` in `raceBehavior.js` (98) is a *calibration reference*, not the exact Dirt Oval width. The comment conflates the two. `headlessRaceSimulator.js` uses the correct Dirt Oval value (93).
- **CA-02 detail**: `_DEFAULT_MAX_ENTRY_DURATION_MS` (5000 ms for non-overview states) was derived from `3.45 × 0.8 × 2 = 5.52 s ≈ 5000 ms`, where 0.8 s matches `defaults.js` `cameraStateProfiles.*.entryTC`. The comment is arithmetically correct for that derivation, but its placement immediately below `_TC_LEADER/BATTLE/COMEBACK = 0.3` creates a direct reader confusion.
- **CA-03 detail**: `referenceValue = 23` produces density-factor ≈ 1.0 when `trackWidth/racerCount ≈ 23`. No real track/racer-count combination hits 140px/6 = 23.3. The closest is dirt-oval (93px) at 4 racers (23.25) or garden-path (100px) at ~4 racers.
- **CA-04 detail**: The cap is described in the very next comment block (lines 840–842), but line 836's explicit "3 steps" contradicts the cap. The remainder accumulates normally so no physics time is lost — only the step-per-frame limit is 2, not 3.
- **CA-05 / CA-06**: The route `/diagnose-verteilung` and component `DiagnoseVerteilung` are German identifiers. These violations cascade into every file header comment that mentions the path. The fix requires renaming the route, component, and directory; the comment fixes then follow automatically.

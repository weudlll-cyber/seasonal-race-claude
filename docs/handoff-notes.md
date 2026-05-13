# Handoff Notes

## 2026-05-14 - Relaxed Defaults (Speed + Drafting)

- Branch: claude/relaxed-defaults
- Base: master@47b10ef
- Scope: Nur Default-Werte angepasst, keine neuen Mechaniken.

Geänderte Defaults:
- BASE_SPEED_MIN: 0.00091 -> 0.00096
- BASE_SPEED_MAX: 0.00118 -> 0.00113
- reRollVariationPercent: 85 -> 45
- draftingBoost: 1.10 -> 1.04
- draftingMaxDistance: 110 -> 80

Unverändert gelassen:
- speedBonusFactor (1.0)
- draftingConeAngle (30)
- Force-basierte Anti-Collision-Logik
- Racer-Dichte/Geometrie

Tests:
- Pre: 94 files / 1728 tests passed
- Post: 94 files / 1728 tests passed

Wichtig (localStorage):
- Bei bestehenden Overrides greifen neue Defaults erst nach "Reset All Defaults" im DevScreen.

Detailbericht:
- docs/diagnose/relaxed-defaults-report.md

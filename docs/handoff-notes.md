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

## 2026-05-14 - Free-Lane Separation + reRoll-Erhoehung

- Branch: claude/free-lane-separation
- Base: master@a49636e
- Worktree: c:\Users\weudl\OneDrive\Dokumente\Seasonal race claude-master-merge
- Scope: Additive Free-Lane-Separation in raceBehavior + reRoll-Default 45 -> 58.

Implementiert:
- Free-Lane-Overlap-Check (additiv zur bestehenden Force-Logik)
- Platzpruefung links/rechts pro ueberlappendem Racer
- Deterministische Tie-Break-Entscheidung bei exakt gleicher physicalY
- MaxLateral/Clamp weiterhin als harte Begrenzung

Geaenderter Default:
- reRollVariationPercent: 45 -> 58

Tests:
- Pre (master a49636e): 94 files / 1728 tests passed
- Post (free-lane branch): 94 files / 1734 tests passed
- Neue Tests: 6 in client/src/modules/raceBehavior.test.js

Wichtig (localStorage):
- Neue reRoll-Defaults greifen bei bestehenden Overrides erst nach "Reset All Defaults".

Detailbericht:
- docs/diagnose/free-lane-separation-report.md

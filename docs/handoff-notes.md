# Handoff Notes

## 2026-05-14 — PR #98 Cleanup-Sprint (stand nach Merge)

- Branch: `claude/free-lane-separation` → squash-merged to `master`
- Session: 13./14.5. Anti-Collision-Session + Cleanup-Sprint 14.5.
- Tests (post-merge): 94 files / 1741 tests passed

### Was implementiert wurde (PR #98)

**Free-Lane Separation** (`client/src/modules/raceBehavior.js`):
- Additive Impulse-Logik wenn zwei Racer geometrisch überlappen
- Links/rechts-Platzprüfung per `isSideFree()` gegen alle anderen aktiven Racer
- Deterministische Tie-Break via `stablePairBit` (stable hash) bei exakt gleicher physicalY
- Nutzt Sprite-Geometrie-Metadaten die RaceScreen an jeden Racer übergibt

**Home-Force-Reduktion bei Overlap** (`homeForceReductionOnOverlap: 0.3`):
- Während geometrischem Overlap: Home-Force auf 30% reduziert
- Verhindert dass Home-Force Free-Lane-Separation überwältigt
- Tunable im DevScreen → Race Tuning → Home Force Block

**reRollVariationPercent** Default: `45 → 58`

### Was im Cleanup-Sprint gefixt wurde

- `homeForceReductionOnOverlap` war in Block 2 (Start Layout) platziert, Reset-Handler aber in Block 9 (Home Force) → verschoben nach Block 9
- InfoTooltip für das Feld war auf Deutsch → auf Englisch geändert
- Prettier-Formatting auf raceBehavior.js und raceBehavior.test.js angewendet

### Anti-Collision-Status (Stand nach Merge)

**Was funktioniert:**
- Free-Lane Separation trennt überlappende Racer deterministisch
- Home-Force-Reduktion gibt der Trennung Raum
- Avoidance (Trailer yields, Leader holds) verhindert Stacking
- Speed Brake reduziert side-by-side-Geschwindigkeit
- Anti-Stacking sqrt(neighborCount)-Normalisierung bei dichtem Pack

**Bekannte Limitierungen:**
- Persistente Pulks (3+ Racer) können sich weiterhin bilden — das ist kein Bug, sondern Race-Feel; Free-Lane greift erst bei geometrischem Overlap, nicht bei Nähe
- Drafting-Cone auf engen Kurven kann slipstream-follower verpassen (PR-A2.6 Diagnose-Note, Backlog-Item)
- `reRollVariationPercent: 58` sorgt für deutlich mehr Positions-Wechsel als die alten 45 — kann bei wenigen Racern weniger relevant sein

### DevScreen-Defaults nach Merge (alle Race Tuning Werte)

| Wert | Default |
|------|---------|
| homeForceStrength | 0.04 |
| homeForceReductionOnOverlap | 0.3 |
| comfortThreshold | 0.7 |
| softRepulsionStrength | 0.1 |
| avoidanceDistance | 0.35 |
| tWeight | 2.0 |
| yWeight | 1.0 |
| lateralForce | 0.01 |
| maxLateral | 0.95 |
| speedBrakeYThreshold | 0.2 |
| speedBrakeTThreshold | 0.015 |
| speedBrakeFactor | 0.95 |
| draftingMaxDistance | 80 |
| draftingConeAngle | 30 |
| draftingBoost | 1.04 |
| reRollVariationPercent | 58 |
| reRollTransitionDuration | 5.0 |
| reRollIntervalDivisor | 15 |
| reRollLastPositionPercent | 80 |
| BASE_SPEED_MIN | 0.00096 |
| BASE_SPEED_MAX | 0.00113 |

**localStorage-Hinweis:** Bei bestehenden Overrides gelten neue Defaults erst nach
"Reset All Defaults" im DevScreen.

### Offene Punkte für nächste Session

- PR #97 (Relaxed Defaults) noch offen — prüfen ob merge nach PR #98 sinnvoll
- PR #96 (Phased Racing Logic) und PR #83 (Project Knowledge Inventory) noch offen
- Backlog: Drafting-Cone auf Kurven (PR-A2.6 Diagnose-Note)
- Backlog: Persistent Pulk-Auflösung wenn Free-Lane blockiert ist

### Diagnose-Artefakte

Alle in `docs/diagnose/` mit Index-Datei `docs/diagnose/README.md`.

---

## Ältere Einträge

### 2026-05-14 - Relaxed Defaults (Speed + Drafting) — PR #97

- Branch: claude/relaxed-defaults
- Scope: Nur Default-Werte, keine neuen Mechaniken.

Geänderte Defaults:
- BASE_SPEED_MIN: 0.00091 → 0.00096
- BASE_SPEED_MAX: 0.00118 → 0.00113
- reRollVariationPercent: 85 → 45
- draftingBoost: 1.10 → 1.04
- draftingMaxDistance: 110 → 80

Tests: 94 files / 1728 tests passed. Detailbericht: docs/diagnose/relaxed-defaults-report.md

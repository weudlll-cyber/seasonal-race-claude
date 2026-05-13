# DevScreen Config Audit

**Branch:** `claude/speed-range-fix`
**Datum:** 2026-05-13
**Methodik:** Code-Analyse (RaceTuningSection.jsx, defaults.js, constraintsPlanner.js, RaceScreen/index.jsx)
**Fragestellung:** Welche renn-verhaltens-relevanten Werte sind im DevScreen einstellbar,
welche sind hartgecodet, und welche müssen im Rahmen dieses Sprints exponiert werden?

---

## Klassifikation

- **A — Soll im DevScreen sein:** Renn-verhaltens-relevant, würde beim Tunen eingestellt werden
- **B — Interne Konstante:** Technisch notwendig, aber nicht gameplay-relevant (Solver-Iterationen, Toleranzen)
- **C — Unklar:** Rückfrage an User/Plan-Claude nötig

---

## 1. Werte aktuell im DevScreen (Klasse A, bereits exponiert)

### 1.1 Speed Range — `baseSpeedConfig`

| Parameter | Config-Key | Datei | Aktueller Default | Slider-Range |
|---|---|---|---|---|
| Min Speed | `speedConfig.min` | defaults.js:115 | 0.00091 | 0.0001–0.005 |
| Max Speed | `speedConfig.max` | defaults.js:116 | 0.00118 | 0.0001–0.005 |

**Status:** ✅ Im DevScreen (Block 1: Speed Range)

### 1.2 Start Layout — `raceBehaviorConfig`

| Parameter | Config-Key | Datei | Default | Slider-Range |
|---|---|---|---|---|
| Start Spread Range | `startSpreadRange` | defaults.js:217 | 0.95 | 0.1–1.0 |
| Runout Zone | `runoutZone` | defaults.js:219 | 0.05 | 0.0–0.2 |

**Status:** ✅ Im DevScreen (Block 2: Start Layout)

### 1.3 Row Start — `rowLayoutConfig`

| Parameter | Config-Key | Datei | Default | Slider-Range |
|---|---|---|---|---|
| Row Gap Multiplier | `rowGapMultiplier` | defaults.js:120 | 1.5 | 0.5–4.0 |
| Speed Bonus Factor | `speedBonusFactor` | defaults.js:121 | 1.0 | 0.0–2.0 |
| Max Capacity Factor | `maxCapacityFactor` | defaults.js:122 | 0.3 | 0.1–0.6 |

**Status:** ✅ Im DevScreen (Block 3: Row Start)

### 1.4 Speed Re-Roll — `raceDynamicsConfig`

| Parameter | Config-Key | Datei | Default | Slider-Range |
|---|---|---|---|---|
| Variation Width (%) | `reRollVariationPercent` | defaults.js:208 | 85 | 10–150 |
| Transition Smoothness (s) | `reRollTransitionDuration` | defaults.js:209 | 5.0 | 0.5–10.0 |
| Re-Roll Frequency | `reRollIntervalDivisor` | defaults.js:210 | 15 | 5–30 |
| Last Roll Position (%) | `reRollLastPositionPercent` | defaults.js:211 | 80 | 50–95 |

**Status:** ✅ Im DevScreen (Block 4: Speed Re-Roll)

### 1.5 Drafting / Slipstream — `raceBehaviorConfig`

| Parameter | Config-Key | Datei | Default | Slider-Range |
|---|---|---|---|---|
| Max Distance (world px) | `draftingMaxDistance` | defaults.js:237 | 110 | 10–300 |
| Cone Angle (°) | `draftingConeAngle` | defaults.js:238 | 30 | 5–89 |
| Boost Factor | `draftingBoost` | defaults.js:239 | 1.1 | 1.0–2.0 |

**Status:** ✅ Im DevScreen (Block 5: Drafting / Slipstream)

### 1.6 Comfort Zone — `raceBehaviorConfig`

| Parameter | Config-Key | Datei | Default | Slider-Range |
|---|---|---|---|---|
| Comfort Threshold | `comfortThreshold` | defaults.js:222 | 0.7 | 0.3–0.95 |
| Soft Repulsion Strength | `softRepulsionStrength` | defaults.js:223 | 0.1 | 0.01–0.3 |

**Status:** ✅ Im DevScreen (Block 6: Comfort Zone)

### 1.7 Soft Avoidance — `raceBehaviorConfig`

| Parameter | Config-Key | Datei | Default | Slider-Range |
|---|---|---|---|---|
| Avoidance Distance | `avoidanceDistance` | defaults.js:225 | 0.35 | 0.05–1.0 |
| T Weight | `tWeight` | defaults.js:226 | 2.0 | 0.1–10 |
| Y Weight | `yWeight` | defaults.js:227 | 1.0 | 0.1–10 |
| Lateral Force | `lateralForce` | defaults.js:229 | 0.01 | 0.001–0.1 |
| Max Lateral | `maxLateral` | defaults.js:230 | 0.95 | 0.1–1.0 |

**Status:** ✅ Im DevScreen (Block 7: Soft Avoidance)

### 1.8 Speed Brake — `raceBehaviorConfig`

| Parameter | Config-Key | Datei | Default | Slider-Range |
|---|---|---|---|---|
| Adjacent Y Threshold | `speedBrakeYThreshold` | defaults.js:232 | 0.2 | 0.01–0.5 |
| Adjacent T Threshold | `speedBrakeTThreshold` | defaults.js:233 | 0.015 | 0.001–0.1 |
| Speed Brake Factor | `speedBrakeFactor` | defaults.js:234 | 0.95 | 0.5–1.0 |

**Status:** ✅ Im DevScreen (Block 8: Speed Brake)

### 1.9 Home Force — `raceBehaviorConfig`

| Parameter | Config-Key | Datei | Default | Slider-Range |
|---|---|---|---|---|
| Home Force Strength | `homeForceStrength` | defaults.js:221 | 0.04 | 0.005–0.1 |

**Status:** ✅ Im DevScreen (Block 9: Home Force)

---

## 2. Renn-verhaltens-relevante Werte NICHT im DevScreen (Klasse A, hartgecodet)

Diese Werte sind im `DEFAULT_PLANNER_CONFIG` des Constraints-First-Planers definiert oder direkt in
der `_computeIntents`-Funktion hartgecodet. Sie beeinflussen direkt das Renn-Verhalten und müssen
im DevScreen einstellbar sein.

### 2.1 Kinematische Limits — `DEFAULT_PLANNER_CONFIG`

| Parameter | Key | Datei | Wert | Einheit | Beschreibung |
|---|---|---|---|---|---|
| Max Deceleration | `aSMin` | constraintsPlanner.js:42 | -50.0 | px/s² | Maximale Bremsbeschleunigung (bei vS_ref=200px/s) |
| Max Acceleration | `aSMax` | constraintsPlanner.js:43 | 30.0 | px/s² | Maximale Vorwärtsbeschleunigung |
| Max Lateral Speed | `vYMax` | constraintsPlanner.js:44 | 30.0 | px/s | Maximale laterale Geschwindigkeit |
| Max Lateral Accel | `aYMax` | constraintsPlanner.js:45 | 90.0 | px/s² | Maximale laterale Beschleunigung |

**Klasse:** A — Diese Werte bestimmen wie abrupt/flüssig Racer bremsen und ausweichen.
Zu starke Bremsung sieht abgehackt aus; zu schwache führt zu Kollisionen.

### 2.2 Safety Buffers — `DEFAULT_PLANNER_CONFIG`

| Parameter | Key | Datei | Wert | Einheit | Beschreibung |
|---|---|---|---|---|---|
| Longitudinal Buffer | `safetyBufferS` | constraintsPlanner.js:49 | 14 | px | Extra-Abstand hinter dem physischen Bounding Box |
| Lateral Buffer | `safetyBufferY` | constraintsPlanner.js:50 | 4 | px | Extra-Abstand neben dem physischen Bounding Box |

**Klasse:** A — Der "Persönlichkeitsraum" der Racer. Höhere Werte = Racer halten mehr Abstand.
Direkt sichtbar im Renn-Bild als Dichte des Feldes.

### 2.3 Planning Horizon — `DEFAULT_PLANNER_CONFIG`

| Parameter | Key | Datei | Wert | Einheit | Beschreibung |
|---|---|---|---|---|---|
| Planning Horizon | `horizonSeconds` | constraintsPlanner.js:24 | 0.8 | s | Wie weit voraus der Planer rechnet |

**Klasse:** A — Beeinflusst wie früh/smooth Ausweichmanöver eingeleitet werden. Kürzerer Horizont =
reaktiver und abrupter; längerer = smoother aber rechenintensiver.

### 2.4 Objective Weights — hartgecodet in `_computeIntents` (Racing Phase)

| Parameter | Hardcode-Zeile | Wert | Beschreibung |
|---|---|---|---|
| Speed Weight | constraintsPlanner.js:234 | 1.6 | Gewicht: Zielgeschwindigkeit einhalten |
| Centerline Weight | constraintsPlanner.js:235 | 0.015 | Gewicht: Rückkehr zur Mittellinie |
| Draft Weight | constraintsPlanner.js:236 | 0.7 | Gewicht: Windschatten-Bonus verwirklichen |
| Smooth-Y Weight | constraintsPlanner.js:237 | 1.0 | Gewicht: laterale Beschleunigungsglättung |
| Smooth-S Weight | constraintsPlanner.js:238 | 0.6 | Gewicht: longitudinale Beschleunigungsglättung |

**Klasse:** A — Diese Gewichte bestimmen die "Persönlichkeit" der KI-Racer. Höheres `wDraft` =
Racer suchen aktiver Windschatten; höheres `wCenterline` = Racer bleiben mehr auf der Mittellinie.
Direkte Auswirkung auf Renn-Action und Drafting-Sichtbarkeit.

---

## 3. Interne Konstanten (Klasse B, kein DevScreen nötig)

| Parameter | Datei | Wert | Begründung |
|---|---|---|---|
| `maxIterations` | constraintsPlanner.js:26 | 50 | Solver-Limit: technisch, kein gameplay-Effekt |
| `gradientStep` | constraintsPlanner.js:27 | 0.12 | Solver-Schrittweite: numerisch |
| `feasibilityEpsilon` | constraintsPlanner.js:28 | 1e-3 | Konvergenzschwelle: numerisch |
| `safetyGainLateral` | constraintsPlanner.js:29 | 0.9 | Korrektur-Gain: internes Regler-Param |
| `safetyGainLongitudinal` | constraintsPlanner.js:30 | 3.5 | Korrektur-Gain: internes Regler-Param |
| `planningStepSec` | constraintsPlanner.js:25 | 0.05 | Solver-Zeitschritt: numerisch |
| `vS_ref` | constraintsPlanner.js:33 | 200 | Interne Referenz-Geschwindigkeit für Skalierung |
| `sWindowForConstraints` | constraintsPlanner.js:38 | 160 | Constraint-Lookup-Fenster: technisch |
| `yWindowForConstraints` | constraintsPlanner.js:40 | 160 | Constraint-Lookup-Fenster: technisch |
| `maxSimSubsteps` | constraintsPlanner.js:51 | 2 | Solver-Substep-Zahl: numerisch |
| `startPhaseSeconds` | constraintsPlanner.js:23 | 3.0 | Diagnose-Startphase: nur für KPI-Timing |
| Follow-Mode-Epsilon | constraintsPlanner.js:~319 | 4 px | Internes Follow-Mode-Schwellwert |
| Burst-Partikel-Anzahl | RaceScreen/index.jsx | 45 | Visuell, kein Renn-Effekt |
| Partikel-Gravitation | RaceScreen/index.jsx | 0.18 | Visuell, kein Renn-Effekt |
| Partikel-Decay | RaceScreen/index.jsx | 0.014/0.022 | Visuell, kein Renn-Effekt |
| Stack-Detection-Bins | constraintsPlanner.js | 25/20 px | Diagnostik, kein gameplay-Effekt |

---

## 4. Zusammenfassung: Handlungsbedarf

### Defaults ändern (alle 4 bereits im DevScreen):

| Parameter | Alt | Neu | Effekt |
|---|---|---|---|
| `BASE_SPEED_MIN` | 0.00091 | **0.00102** | SpreadFactor-Anteil ~23% → ~4.5% (E[max-min] mit 20 Racern) |
| `BASE_SPEED_MAX` | 0.00118 | **0.00107** | — |
| `speedBonusFactor` | 1.0 | **1.0 (unverändert)** | Start-Kompensation bleibt — User-Entscheidung 13.05.2026 |
| `reRollVariationPercent` | 85 | **85 (unverändert)** | Dramatische Zufalls-Wechsel bleiben — Kernfeature |

**User-Entscheidung 13.05.2026:** `speedBonusFactor=1.0` ist absichtlich (Startpositions-Kompensation).
`reRollVariationPercent=85` ist Kernfeature — Zufalls-Speed-Wechsel während des Rennens sind das
Herzstück der Race-Excitement. Nur `BASE_SPEED_MIN/MAX` werden eingeengt.

### Neue DevScreen-Sliders (Klasse A, neu zu exponieren):

**Block 10: Planner Physics** (neuer Block in RaceTuningSection.jsx)

| Parameter | Key | Aktueller Wert | Slider-Range |
|---|---|---|---|
| Max Deceleration | `plannerConfig.aSMin` | -50.0 | -100 bis -5 |
| Max Acceleration | `plannerConfig.aSMax` | 30.0 | 5 bis 100 |
| Max Lateral Speed | `plannerConfig.vYMax` | 30.0 | 5 bis 80 |
| Max Lateral Accel | `plannerConfig.aYMax` | 90.0 | 10 bis 200 |
| Longitudinal Buffer | `plannerConfig.safetyBufferS` | 14 | 2 bis 40 |
| Lateral Buffer | `plannerConfig.safetyBufferY` | 4 | 0 bis 20 |
| Planning Horizon (s) | `plannerConfig.horizonSeconds` | 0.8 | 0.2 bis 2.0 |
| Speed Weight | `plannerConfig.wSpeed` | 1.6 | 0.0 bis 5.0 |
| Centerline Weight | `plannerConfig.wCenterline` | 0.015 | 0.0 bis 0.5 |
| Draft Weight | `plannerConfig.wDraft` | 0.7 | 0.0 bis 3.0 |

---

*Audit durchgeführt am 2026-05-13 für Branch `claude/speed-range-fix`.*
*Bezug: Diagnose PR #94 (Speed-Range-Analyse), User-Feedback 13.05.2026.*

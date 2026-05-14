# Home-Force Reduction On Overlap Report

## 1. Was wurde implementiert

Dateien:
- client/src/modules/raceBehavior.js
- client/src/modules/storage/defaults.js
- client/src/modules/raceBehaviorConfig.js
- client/src/screens/DevScreen/sections/RaceTuningSection.jsx
- client/src/modules/raceBehavior.test.js
- client/src/modules/raceBehaviorConfig.test.js
- client/src/screens/DevScreen/sections/RaceTuningSection.test.jsx

Code-Delta (nur Fix-Umfang, ohne Report-Datei):
- Added lines: 124
- Removed lines: 5

Conditional-Logik:
- Overlap-Erkennung nutzt dieselbe Geometrie-Bedingung wie Free-Lane (dT/tHalfSpan + dY/lateralHalfSpan).
- Pro Racer wird ein Overlap-Flag gesammelt.
- Home-Force wird pro Frame skaliert:
  - ohne Overlap: factor = 1.0
  - mit Overlap: factor = homeForceReductionOnOverlap
- Avoidance, Free-Lane, Drafting, ReRoll und restliche Mechanik bleiben unverandert.

## 2. Werte-Tabelle

| Wert | Neu | Default | Tunbar im DevScreen |
|---|---|---|---|
| homeForceReductionOnOverlap | Ja | 0.3 | Ja |

Hinweis zur UI:
- Neuer Input in Block "Home Force": "Home Force Reduction On Overlap" (Range 0.0 bis 1.0).
- Tooltip: "Home-Force-Faktor bei aktivem Overlap. 0.3 = 30% normale Starke wenn Racer uberlappt."
- localStorage-Hinweis fur PR-Update: User muss "Reset All Defaults" klicken, damit der neue Wert sicher im gespeicherten Config-Objekt landet.

## 3. Test-Ergebnisse

Volltest Pre (vor Fix):
- Test Suites: 506
- Tests: 1734
- Passed: 1734
- Failed: 0

Volltest Post (nach Fix):
- Test Suites: 506
- Tests: 1741
- Passed: 1741
- Failed: 0

Neue Unit-Tests (gefordert):
- applyRacerBehavior — home force:
  - reduces home force by factor during active overlap
  - keeps full home force when there is no overlap
  - homeForceReductionOnOverlap=1.0 disables reduction (backwards-compat)
  - homeForceReductionOnOverlap=0.0 disables home force during overlap

Zusatz-Validierung:
- raceBehaviorConfig.test.js:
  - default range-check fur homeForceReductionOnOverlap (0..1)
  - invalid >1 fallback to defaults
  - invalid <0 fallback to defaults
- RaceTuningSection.test.jsx:
  - neuer Input wird gerendert

## 4. Status der drei ABSOLUTEN Regeln

Regel #1 (keine weiteren neuen Konstanten):
- Erfullt. Nur homeForceReductionOnOverlap neu eingefuhrt.

Regel #2 (DevScreen Single Source of Truth):
- Erfullt. Wert ist in DEFAULT_RACE_BEHAVIOR_CONFIG, load/save-Config und DevScreen-Input integriert.

Regel #3 (localStorage-Hinweis):
- Erfullt. Hinweis dokumentiert: "Reset All Defaults" klicken.

## 5. Erwartung vs. Realitat

Diagnose-Basis (vor Fix):
- 99.1% persistente Overlap-Transitions
- Home-Force im Misserfolg 2.8x starker als Free-Lane

Erwartung nach Fix (datenbasiert):
- Bei Overlap wird Home-Force mit 0.3 skaliert.
- Effektive Home-Magnitude sinkt von ca. 0.0062 auf ca. 0.0019.
- Das liegt knapp unter Free-Lane ca. 0.0022, daher sollte Free-Lane deutlich ofter "gewinnen".
- Erwartete Grobordnung: persistente Overlaps deutlich reduziert, plausibel in Richtung <50%.

Wichtig:
- Tatsachliche Wirksamkeit muss visuell durch User-Verifikation im Race-Screen bestaetigt werden (20 Racer, dirt-oval, drafting on).

## 6. Tuning-Empfehlung falls Ergebnis nicht uberzeugt

- Wenn Pulks weiter persistent sind:
  - homeForceReductionOnOverlap Richtung 0.15 oder 0.0 senken.
- Wenn Racer zu weit auseinander driften:
  - homeForceReductionOnOverlap Richtung 0.5 bis 1.0 erhohen.
- Wenn Rennfeld zu stark zerfallt:
  - auf >=0.5 zuruckstellen und erneut beobachten.

## 7. Was als nachstes getestet werden musste

Falls Home-Force-Reduktion allein nicht reicht:
- Nacheinander (separater Scope) eine overlap-konditionale Avoidance-Reduktion testen.
- Diese Folgespec ist bewusst nicht Teil dieses Fixes.

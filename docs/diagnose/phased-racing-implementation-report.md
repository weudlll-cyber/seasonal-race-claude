# Phased Racing Implementation Report

Date: 2026-05-13
Branch: claude/phased-racing-logic
Base: 47b10eff327aabd332d54af722ce79d7f6546df4

## 1. Was wurde tatsächlich implementiert

Geänderte Dateien:
- client/src/modules/storage/defaults.js
  - Neue UI-Mechanik-Defaults fuer Soft-Launch in DEFAULT_RACE_BEHAVIOR_CONFIG hinzugefuegt.
- client/src/modules/raceBehaviorConfig.js
  - Validation fuer enableSoftLaunch, softLaunchDurationSeconds, softLaunchRampMode hinzugefuegt.
- client/src/modules/raceBehaviorConfig.test.js
  - Tests fuer Soft-Launch-Defaults und Validation hinzugefuegt.
- client/src/modules/raceBehavior.js
  - applyRacerBehavior um antiCollisionFactor erweitert.
  - Lateralbewegung wird progressiv skaliert.
  - Speed-Brake-Aktivierung wird als avoidanceBrakeFactor [0..1] ausgegeben.
  - Drafting bleibt unveraendert.
- client/src/modules/raceBehavior.test.js
  - Tests fuer Anti-Collision-Skalierung und Speed-Brake-Skalierung hinzugefuegt.
- client/src/screens/RaceScreen/index.jsx
  - Soft-Launch-Faktor pro Frame berechnet und an applyRacerBehavior uebergeben.
  - Effektive Speed-Brake-Formel auf teilaktive Bremse umgestellt.
- client/src/screens/DevScreen/sections/RaceTuningSection.jsx
  - Neuer Block Soft Launch (Enable, Duration, Ramp Mode) mit Reset hinzugefuegt.
- client/src/screens/DevScreen/sections/RaceTuningSection.test.jsx
  - Tests auf 10 Bloecke erweitert und Soft-Launch-UI abgedeckt.

Neue Dateien:
- client/src/modules/softLaunch.js
  - computeSoftLaunchFactor fuer Countdown/Soft-Launch/Race.
- client/src/modules/softLaunch.test.js
  - Unit-Tests fuer Countdown=0, linear ramp, race=1, disable-softlaunch und twoStep.

Netto-LOC:
- Additions: 403
- Deletions: 25
- Netto: +378

## 2. Welche Werte werden tatsaechlich verwendet

| Wert | Default | DevScreen? | Code-Pfad wo verwendet | Quelle |
|---|---:|---|---|---|
| BASE_SPEED_MIN | 0.00091 | ja | client/src/screens/RaceScreen/index.jsx:227 | DevScreen Speed Range / Default fallback |
| BASE_SPEED_MAX | 0.00118 | ja | client/src/screens/RaceScreen/index.jsx:228 | DevScreen Speed Range / Default fallback |
| startSpreadRange | 0.95 | ja | client/src/screens/RaceScreen/index.jsx:287 | DevScreen Start Layout / Default fallback |
| runoutZone | 0.05 | ja | client/src/screens/RaceScreen/index.jsx:256 | DevScreen Start Layout / Default fallback |
| rowGapMultiplier | 1.5 | ja | client/src/screens/RaceScreen/index.jsx:284 | DevScreen Row Start / Default fallback |
| speedBonusFactor | 1.0 | ja | client/src/screens/RaceScreen/index.jsx:331 | DevScreen Row Start / Default fallback |
| maxCapacityFactor | 0.3 | ja | client/src/modules/rowLayout.js:97 | DevScreen Row Start / Default fallback |
| reRollVariationPercent | 85 | ja | client/src/screens/RaceScreen/index.jsx:853 | DevScreen Speed Re-Roll / Default fallback |
| reRollTransitionDuration | 5.0 | ja | client/src/screens/RaceScreen/index.jsx:355 | DevScreen Speed Re-Roll / Default fallback |
| reRollIntervalDivisor | 15 | ja | client/src/screens/RaceScreen/index.jsx:294 | DevScreen Speed Re-Roll / Default fallback |
| reRollLastPositionPercent | 80 | ja | client/src/screens/RaceScreen/index.jsx:295 | DevScreen Speed Re-Roll / Default fallback |
| homeForceStrength | 0.04 | ja | client/src/modules/raceBehavior.js:76 | DevScreen Home Force / Default fallback |
| comfortThreshold | 0.7 | ja | client/src/modules/raceBehavior.js:140 | DevScreen Comfort Zone / Default fallback |
| softRepulsionStrength | 0.1 | ja | client/src/modules/raceBehavior.js:143 | DevScreen Comfort Zone / Default fallback |
| avoidanceDistance | 0.35 | ja | client/src/modules/raceBehavior.js:91 | DevScreen Soft Avoidance / Default fallback |
| tWeight | 2.0 | ja | client/src/modules/raceBehavior.js:90 | DevScreen Soft Avoidance / Default fallback |
| yWeight | 1.0 | ja | client/src/modules/raceBehavior.js:91 | DevScreen Soft Avoidance / Default fallback |
| lateralForce | 0.01 | ja | client/src/modules/raceBehavior.js:95 | DevScreen Soft Avoidance / Default fallback |
| maxLateral | 0.95 | ja | client/src/modules/raceBehavior.js:147 | DevScreen Soft Avoidance / Default fallback |
| speedBrakeYThreshold | 0.2 | ja | client/src/modules/raceBehavior.js:105 | DevScreen Speed Brake / Default fallback |
| speedBrakeTThreshold | 0.015 | ja | client/src/modules/raceBehavior.js:105 | DevScreen Speed Brake / Default fallback |
| speedBrakeFactor | 0.95 | ja | client/src/screens/RaceScreen/index.jsx:891 | DevScreen Speed Brake / Default fallback |
| draftingMaxDistance | 110 | ja | client/src/modules/raceBehavior.js:174 | DevScreen Drafting / Default fallback |
| draftingConeAngle | 30 | ja | client/src/modules/raceBehavior.js:166 | DevScreen Drafting / Default fallback |
| draftingBoost | 1.1 | ja | client/src/screens/RaceScreen/index.jsx:886 | DevScreen Drafting / Default fallback |
| enableSoftLaunch | true | ja (neu) | client/src/screens/RaceScreen/index.jsx:845 | DevScreen Soft Launch / Default fallback |
| softLaunchDurationSeconds | 3.0 | ja (neu) | client/src/screens/RaceScreen/index.jsx:846 | DevScreen Soft Launch / Default fallback |
| softLaunchRampMode | linear | ja (neu) | client/src/screens/RaceScreen/index.jsx:847 | DevScreen Soft Launch / Default fallback |

Referenzdefaults:
- client/src/modules/storage/defaults.js:114
- client/src/modules/storage/defaults.js:119
- client/src/modules/storage/defaults.js:207
- client/src/modules/storage/defaults.js:214

## 3. Test-Ergebnisse

- Pre-Test-Count (master 47b10ef):
  - Test Files: 94 passed
  - Tests: 1728 passed
- Post-Test-Count:
  - Test Files: 95 passed
  - Tests: 1742 passed
- Differenz:
  - +1 Test File
  - +14 Tests
- Alle gruen: ja

Neue Tests (relevant):
- client/src/modules/softLaunch.test.js
  - softLaunchFactor waehrend Countdown = 0
  - linear ramp von 0 auf 1
  - Race-Phase = 1
  - enableSoftLaunch=false => sofort 1
  - twoStep = diskrete Stufen
- client/src/modules/raceBehavior.test.js
  - Lateralkraft wird mit antiCollisionFactor skaliert
  - Speed-Brake-Aktivierung wird mit antiCollisionFactor skaliert

## 4. Unsicherheiten und offene Punkte

- Eigenstaendige Entscheidung: twoStep wurde als 0 -> 0.5 -> 1 umgesetzt (diskrete Stufen).
- Offener Review-Punkt: Falls gewuenscht, kann twoStep-Verlauf (Zeitpunkt/Step-Hoehe) noch angepasst werden, ohne Renn-Physik-Konstanten zu aendern.
- Limitierung: Diese Umsetzung reduziert Startchaos progressiv, ersetzt aber keine geometrischen Kapazitaetsgrenzen bei sehr dichten Feldern.

## 5. Visueller Test - Hinweise fuer User

Beim visuellen Test beachten:
- Direkt nach GO sollten Racer kurz freier entflechten (weniger abrupte Seitenschuebe).
- Nach Ablauf der Soft-Launch-Dauer muss Vermeidung wieder voll greifen.
- Drafting-Verhalten sollte unveraendert bleiben.
- A/B-Test:
  - enableSoftLaunch=false (Legacy-Verhalten)
  - enableSoftLaunch=true, Duration 3.0, linear
  - enableSoftLaunch=true, Duration 3.0, twoStep

Empfohlene DevScreen-Toggles fuers Verstaendnis:
- Soft Launch Duration (0, 1.5, 3.0, 5.0)
- Soft Launch Ramp Mode (linear vs twoStep)
- Enable Soft Launch (on/off)

## 6. Status der drei ABSOLUTEN Regeln

- Regel #1 (keine neuen Renn-Konstanten): eingehalten = ja.
  - Keine neuen Force-/Drafting-/Speed-Konstanten eingefuehrt.
  - Nur UI-Mechanik-Werte eingefuehrt: enableSoftLaunch, softLaunchDurationSeconds, softLaunchRampMode.
- Regel #2 (DevScreen Single Source of Truth): eingehalten = ja.
  - Die drei neuen Soft-Launch-Werte sind im DevScreen sichtbar und gespeichert.
- Regel #3 (localStorage-Hinweis): dokumentiert = ja.
  - Hinweis: Neue Defaults greifen nur, wenn keine bestehenden localStorage-Overrides fuer raceBehaviorConfig aktiv sind.
  - Falls noetig im DevScreen auf "Reset All Defaults" klicken.

## 7. PR-Status

- PR-Nummer: 96
- PR-URL: https://github.com/weudlll-cyber/seasonal-race-claude/pull/96
- Branch-Name: claude/phased-racing-logic
- Commit-SHAs:
  - ad1707c (feat)
  - c9b1b42 (test)
  - 0b87c98 (docs)

## Grep-Check (bestehende Renn-Konstanten unveraendert)

- BASE_SPEED_MIN/MAX Werte unveraendert in client/src/modules/storage/defaults.js:115-116.
- Drafting-Werte unveraendert in client/src/modules/storage/defaults.js:239-241.
- Bestehende Anti-Collision-Defaults (homeForceStrength, comfortThreshold, softRepulsionStrength, avoidanceDistance, tWeight, yWeight, lateralForce, maxLateral, speedBrake*) unveraendert in client/src/modules/storage/defaults.js:225-238.

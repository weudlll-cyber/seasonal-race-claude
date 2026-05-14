# Free-Lane Separation Report

Date: 2026-05-14
Branch: claude/free-lane-separation
Base commit: a49636e
Worktree: c:\Users\weudl\OneDrive\Dokumente\Seasonal race claude-master-merge

## 1. Was wurde implementiert

Geaenderte Dateien:
- client/src/modules/raceBehavior.js (+133/-0)
- client/src/screens/RaceScreen/index.jsx (+3/-0)
- client/src/modules/storage/defaults.js (+1/-1)
- client/src/modules/raceBehavior.test.js (+116/-0)
- client/src/modules/raceDynamicsConfig.test.js (+2/-2)
- client/src/screens/DevScreen/sections/RaceTuningSection.test.jsx (+4/-4)

Algorithmus (Free-Lane Separation, additiv):
- Pro Racer-Paar wird weiterhin die bestehende Force-Logik gerechnet.
- Zusaetzlich wird bei aktiver Ueberlappung geprueft, ob links/rechts Platz ist.
- Platzpruefung nutzt bestehende Geometrieableitung (spriteWorldSizePx, trackWidthPx, pathLengthPx), keine neuen Tuning-Defaults.
- Bei beidseitig freiem Raum greift die Y-Geometrie-Regel (links/rechts nach aktueller physicalY-Lage).
- Bei exakt gleicher physicalY wird deterministisch per stabilem Hash aus Racer-IDs entschieden (kein Math.random).
- Die resultierende Free-Lane-Bewegung wird als additive Delta-Kraft zum bestehenden yDelta addiert.
- Finale Positionsbegrenzung bleibt unveraendert ueber bestehendes maxLateral + Clamp.

## 2. Werte-Tabelle vorher/nachher

| Wert | Alt | Neu | Begruendung |
|---|---:|---:|---|
| reRollVariationPercent | 45 | 58 | Mehr Renn-Drama/Positionswechsel, innerhalb Zielbereich 55-60 |
| alle anderen Defaults | unveraendert | unveraendert | Nur angeforderte Erhoehung fuer reRoll |

## 3. Test-Ergebnisse

- Pre-Count (Basis master a49636e): 94 Files / 1728 Tests (gruen, zuvor verifiziert)
- Post-Count (Branch claude/free-lane-separation): 94 Files / 1734 Tests (gruen)
- Neue Tests: 6 Free-Lane-Unit-Tests in client/src/modules/raceBehavior.test.js

Neue Testfaelle:
- Ueberlappung, beide Seiten frei -> Y-Geometrie-Regel trennt links/rechts
- Ueberlappung, ein Racer nur eine Seite frei -> einseitiges Ausweichen + Geometrie beim anderen
- A nur links frei, B nur rechts frei -> A links, B rechts
- Alle Seiten blockiert -> keine zusaetzliche Free-Lane-Aktion
- Exakt gleiche physicalY -> deterministische Auswahl (stabil wiederholbar)
- Free-Lane respektiert maxLateral (kein Sprung ausserhalb des Caps)

## 4. Status der drei ABSOLUTEN Regeln

- Regel #1 (keine neuen renn-verhaltens-relevanten Konstanten): eingehalten.
  - Keine neuen tunbaren Defaults oder neuen Mechanik-Konstanten in defaults.js.
  - Free-Lane-Schwellenwerte werden aus vorhandener Geometrie (Sprite/Track/Path) abgeleitet.
- Regel #2 (DevScreen Single Source of Truth): eingehalten.
  - geaenderter Default bleibt im bestehenden DevScreen-Re-Roll-Block tunbar.
- Regel #3 (localStorage-Hinweis): eingehalten.
  - Im PR-Text wird explizit auf "Reset All Defaults" hingewiesen.

## 5. Visueller Test - Hinweise fuer User

Vor Test zwingend:
- DevScreen -> "Reset All Defaults" klicken (sonst bleiben alte localStorage-Werte aktiv).

Beobachten:
- Trennen sich ueberlappte Racer frueher/zuverlaessiger in seitliche freie Bereiche?
- Bleibt Bewegung glatt (keine Spruenge, keine Doppelbilder)?
- Ist reRoll-bedingte Race-Action sichtbar hoeher als bei Default 45?
- Bleiben Drafting-Effekte erkennbar aktiv?

Wenn zu wenig Action:
- reRollVariationPercent leicht weiter erhoehen (z. B. 60 -> 65) im DevScreen.

Wenn wieder zu starke Pulks:
- reRollVariationPercent leicht senken (z. B. 58 -> 55).
- Drafting-Werte aus PR #97 feinjustieren statt neue Mechaniken einzufuehren.

## 6. Beobachtungen aus der Implementation

- Ohne pro-Racer Geometrie-Metadaten (sprite/track/path) war die geforderte "halbe Spritebreite"-Pruefung in raceBehavior.js nicht robust moeglich.
- Daher wurden bestehende, bereits berechnete Groessen aus RaceScreen in jeden Racer geschrieben (abgeleitet, nicht neu getuned).
- Keine offene Blocker-Frage mehr fuer diese Spec identifiziert.

## 7. PR-Status

- PR-Nummer: TBD
- PR-URL: TBD
- Branch-Name: claude/free-lane-separation
- Commit-SHAs: TBD

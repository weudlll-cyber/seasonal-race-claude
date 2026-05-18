# Phase 2F — Outcome-First Architektur-Skizze

**Datum:** 2026-05-18  
**Status:** Konzept-Skizze — kein Code, keine Implementation  
**Zweck:** Abschätzen ob Outcome-First ein 3-Tages-Prototyp oder ein 2-Wochen-Projekt ist

---

## 1. Grundkonzept

**Kernidee:** Vor dem Rennen wird eine faire Zielreihenfolge gewürfelt. Während des Rennens gibt es einen unsichtbaren **Pace-Controller** der pro Racer berechnet, ob der Racer "on track" für seine Ziel-Platzierung ist — und bei Abweichung einen sanften Korrektur-Impuls auf seine Geschwindigkeit anwendet.

**Unterschied zu Sim 2 (Phase 2E, fehlerhaft):**
Sim 2 hat eine positions-unabhängige Zielgeschwindigkeit berechnet (`targetSpreadFactor`) und bei Re-Rolls daran gezogen. Das hat drei Probleme:
1. `targetSpreadFactor` ignorierte `tStart` → Racer in Row 0 konnten Ziel trotz langsamer Zielgeschwindigkeit erreichen dank Startvorsprung
2. Korrektur nur bei Re-Rolls (alle ~8s) → grob und träge
3. kein `isOpen`-Guard → Closed Tracks ungewollt beeinflusst

Korrekte Outcome-First-Implementation verwendet stattdessen:
- **Positions-aware Ziel-Trajektorie** (jeder Racer hat eine Soll-t-Position für jeden Renntimeframe)
- **Kontinuierliche Korrektur** (jeden Frame oder wenige Frames, nicht nur bei Re-Rolls)
- **isOpen-Guard** (Closed Tracks unberührt)

---

## 2. Konkrete Architektur

### Komponente A: FairOrderGenerator (Pre-Race)

```
Input:  nRacers, rng
Output: targetRank[i] für jeden Racer i (0 = Gewinner, N-1 = Letzter)

Implementierung:
  fairPerm = shuffle([0..N-1]) via Fisher-Yates
  targetRank[i] = fairPerm[i]
```

**Wichtig:** `targetRank` wird Racer-Index zugewiesen, nicht Row-Index. Da Racer in der Reihenfolge Row-0, Row-1, ... initialisiert werden, ist die Zuweisung uniform über alle Reihen.

### Komponente B: Soll-Trajektorie (Pre-Race)

Für jeden Racer berechne eine **Ziel-Ankunftszeit** und daraus eine **lineare Soll-Trajektorie**:

```
raceDurationEstimate = (finishT - tStart_row0) / (race_baseSpeed × speedMultiplier × avgSpreadFactor)
  // Hinweis: tStart_row0 ist der höchste tStart (Front-Row bei Open Tracks)

targetFinishTime[i] = raceDurationEstimate × (1 + targetRank[i] × SPREAD_FACTOR)
  // SPREAD_FACTOR ≈ 0.05–0.15: Streckung der Zielzeiten (10-15% zwischen Erster und Letzter)

targetT_at_time(i, raceTs) = tStart[i] + (finishT - tStart[i]) × (raceTs / targetFinishTime[i])
  // Lineare Interpolation von tStart → finishT über targetFinishTime[i]
```

Dies ist **positions-kompensiert**: Row-3-Racer haben kleineres `tStart[i]`, müssen also dieselbe Distanz `(finishT - tStart[i])` zurücklegen wie Row-0-Racer mit `(finishT - tStart_row0)`. Der Pace-Controller vergleicht `r.t` mit `targetT_at_time(i, raceTs)` — nicht mit einer Zielgeschwindigkeit.

### Komponente C: Pace-Controller (Jeden Frame oder alle K Frames)

```
gap(i, raceTs) = r.t - targetT_at_time(i, raceTs)
  // positiv: Racer ist ahead of target → wird leicht verlangsamt
  // negativ: Racer ist behind of target → wird leicht beschleunigt

correction(i) = -α × clamp(gap(i), -MAX_GAP, +MAX_GAP)
  // α ≈ 0.02–0.05 (sanfte Regelung)
  // MAX_GAP ≈ 0.01 (≈1% der Strecke)

r.baseSpeed *= (1 + correction(i))
r.baseSpeed  = clamp(r.baseSpeed, BASE_MIN × 0.85, BASE_MAX × 1.15)
  // Absolute Clamp: nie mehr als 15% Abweichung vom normalen Wertebereich
```

**NICHT angewendet:**
- Wenn `raceTs < warmupMs` (erste 3s, Chaos ist OK)
- Wenn `r.finished`
- Wenn `isOpen = false` (isOpen-Guard)

### Komponente D: Decay und Fade-Out

Gegen Rennende sollte die Korrektur abklingen — damit das Rennen fair startet aber die letzten Sekunden "natürlich" ausklingen:

```
decayFactor = 1 - max(0, (raceTs - (targetFinishTime_winner - FADE_DURATION)) / FADE_DURATION)
correction(i) *= decayFactor
  // FADE_DURATION ≈ 5s: Korrektur klingt in den letzten 5s ab
```

---

## 3. Interaction mit bestehenden Mechanismen

### avoidanceWarmupMs (Phase 2B.1)

**Kompatibel.** Phase 2B.1 rampte die Bremskraft über 3s. Der Pace-Controller startet nach `warmupMs`. Beide können parallel aktiv sein — es gibt keine direkte Konfliktstelle.

**Potenzieller Interaktionseffekt:** Die Avoidance bremst Row-1+ Racer (Front-Bias-Ursache). Der Pace-Controller beschleunigt sie gleichzeitig, falls sie hinter ihrer Ziel-Trajektorie liegen. Net-Effekt: die beiden Kräfte kämpfen gegeneinander für Racer die hinter Ziel UND in Avoidance sind.

**Auflösung:** Der Pace-Controller müsste entweder:
a) Stärker als die Avoidance sein (α groß genug), oder
b) Avoidance während aktiver Pace-Korrektur temporär reduzieren

Option (b) ist eleganter aber komplexer.

### Closed Tracks

**Unberührt** durch `isOpen`-Guard. Zero Regression garantiert wenn isOpen-Guard korrekt implementiert.

### speedBonus-System

**Kompatibel.** speedBonus multipliziert `baseSpeed` bei der Initialisierung (`speedBonusMult`). Der Pace-Controller modifiziert `baseSpeed` dynamisch. Da die Ziel-Trajektorie auf `finishT - tStart[i]` basiert und nicht auf absolutem Speed, ist die Kompensation implizit korrekt — Racer mit hohem speedBonus brauchen weniger Korrektur.

---

## 4. Game-Feel-Strategie

**Sanfte Regelung:**
- α = 0.02–0.05: Korrektur ist unmerklich klein pro Frame
- Bei 60fps und α=0.03: ~2% Geschwindigkeitsänderung pro Sekunde bei 1% gap — nicht sichtbar

**Keine sichtbaren Sprünge:**
- Korrektur auf `baseSpeed` nicht auf `r.t` direkt
- Die Änderung wirkt sich über mehrere Sekunden aus (graduelle Anpassung)
- Absolute Clamp verhindert extreme Ausreißer

**Natürliches Rennen-Chaos:**
- Erster Teil (warmupMs) vollständig unkontrolliert: sichtbarer Startchaos, Pulks, echte Überholaktionen
- Re-Rolls (existierender Mechanismus) bleiben aktiv: Geschwindigkeits-Variabilität bleibt erhalten
- Pace-Controller ist korrektiv, nicht direktiv: wenn Racer zufällig "on target" liegen, passiert nichts

**Worst Case:**
- Racer mit extremen Re-Rolls können kurz sichtbar langsamer/schneller wirken
- Clamp auf ±15% begrenzt das Schlimmste
- Bei α=0.02 braucht ein 1% Gap ca. 50 Frames (~0.8s) um korrigiert zu werden — unmerklich

---

## 5. Abgrenzung zu Sim 2 (Phase 2E)

| Aspekt | Sim 2 (fehlerhaft) | Korrektes Design |
|--------|-------------------|------------------|
| Zielgröße | `targetSpreadFactor` (Geschwindigkeit) | `targetT_at_time(raceTs)` (Position) |
| Positionskompensation | Keine — ignoriert tStart | Explizit — `tStart[i]` in Trajektorie |
| Korrektur-Zeitpunkt | Nur bei Re-Rolls (~alle 8s) | Jeden Frame (kontinuierlich) |
| isOpen-Guard | Fehlte | Vorhanden |
| Korrektur-Stärke | 50% Bias (stark, sichtbar) | α=0.02–0.05 (sanft, unsichtbar) |
| Closed-Track-Schäden | 7 neue Failures | Null (Guard verhindert jeden Eingriff) |

---

## 6. Implementierungsaufwand

### Scope

Nur `scripts/sim-fairness.mjs` — keine Produktions-Code-Änderungen für PoC.

**Für finalen Produktions-Einsatz** (falls PoC erfolgreich): ~100-150 Zeilen in einem neuen Modul (`paceController.js`) + Integration in den Race-Loop (`index.jsx` oder `racingLoop.js`).

### Aufwand für Sim-PoC (sim-fairness.mjs only)

| Task | Stunden |
|------|---------|
| FairOrderGenerator (Pre-Race Shuffle) | 0.5h |
| Soll-Trajektorie berechnen (per Racer) | 1h |
| Pace-Controller im Race-Loop | 1h |
| Decay/Fade-Out | 0.5h |
| Smoke-Tests und Debugging | 1h |
| Gesamt | **~4h (halber Tag)** |

### Aufwand für Produktions-Implementation (falls PoC ≥40/72)

| Task | Tage |
|------|------|
| paceController.js Modul | 0.5 |
| Integration in Race-Loop | 0.5 |
| DevScreen-Sliders (α, MAX_GAP, FADE_DURATION) | 0.5 |
| Unit-Tests (fairness-sim auf Production-Code-Pfad) | 0.5 |
| Manuelle Qualitäts-Tests (10 Rennen verschiedene Tracks) | 1 |
| **Gesamt** | **~3 Tage** |

---

## 7. Risiken

### Risiko 1: α-Kalibrierung (MITTEL)

Das kritische Parameterpaar ist α und MAX_GAP. Zu groß → sichtbare Manipulation. Zu klein → kein Effekt. Ein PoC-Sim kann verschiedene Werte testen, aber das "subjektive Gefühl" lässt sich erst in der Browser-Version beurteilen.

**Mitigation:** α und MAX_GAP als Slider im DevScreen. Mehrere Rennen spielen.

### Risiko 2: Avoidance × Pace-Controller Konflikt (HOCH)

Die Avoidance-Asymmetrie (Front-Bias-Ursache) bremst hintere Racer, während der Pace-Controller sie beschleunigt. Wenn die Avoidance zu dominant ist, hebt sie die Korrektur auf.

**Mitigation:** Testen ob α=0.05 ausreicht um Avoidance zu kompensieren. Falls nicht: `applyRacerBehavior` erst nach Pace-Controller aufrufen und dann prüfen ob `r.avoidanceActive && pace > 0` → temporär Avoidance reduzieren.

### Risiko 3: Trajektorie-Instabilität bei Closed Tracks (NIEDRIG)

Wenn isOpen-Guard vergessen wird → Closed Tracks betroffen. Explizites Risiko aus Sim 2.

**Mitigation:** Guard als erste Zeile in PaceController-Call: `if (!isOpen) return;`

### Risiko 4: "Zu deterministische" Rennen (MITTEL)

Bei α=0.05 und N=100 Racern ist das Rennen de facto gelenkt. Kann sich anfühlen als wären die Platzierungen vorausbestimmt. Echter Zufalls-Unterschied (wer wirklich besser/schlechter ist) wird eingeschränkt.

**Mitigation:** α klein halten (0.02–0.03). Das Gate-Kriterium von 1.5× erlaubt natürliche Varianz — wir brauchen keine perfekte Fairness, nur "fair enough". Bei kleinem α ist das Rennen nicht determiniert sondern nur geringfügig gesteuert.

### Risiko 5: Spec-Drift bei Implementation (NIEDRIG)

Komplexeres Design als Sim 2 → mehr Stellen wo Implementation von Spec abweicht.

**Mitigation:** Architektur-Skizze ist präzise genug für direkte Implementation. PoC in sim-fairness.mjs zuerst, Produktions-Port erst nach Gate-Bestätigung.

---

## 8. Entscheidungsmatrix nach N-T-Sim-Ergebnissen

| N-T-Ergebnis | Outcome-First-Status | Empfehlung |
|-------------|---------------------|------------|
| ≥62/72 | Nicht nötig (N-T löst es) | N-T direkt implementieren |
| 40–61/72 | Optionaler Backup | N-T + Outcome-First parallel vorbereiten |
| 20–39/72 | Aktiver Kandidat | N=50 für N-T, gleichzeitig Outcome-First PoC starten |
| <20/72 | Primärer Pfad | Outcome-First PoC direkt starten |

---

*Geschätzte Zeit bis erster PoC-Datenstand: 4h Implementierung + ~15min Sim-Lauf.*

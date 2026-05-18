# Phase 2E — Diagnostische Mess-Sims: Ergebnis-Report

**Datum:** 2026-05-18  
**Branch:** feat/phase-2e-mess-sims (von master 6ff2e5f)  
**Tag:** pre-phase-2e-mess-sims  
**Adaptive Stichprobe:** N=20, r=40 (erste Stufe)  
**Gate:** ≥62/72 Open-Track-Kombos statistisch fair (p≥0.05) bei N=100 für offizielle Validierung  
**Adaptive Stop-Schwelle:** ≤30/72 → Stopp (kein Extend auf N=50)  

---

## 0. Baseline (Referenz)

Zur Einordnung: **Baseline N=20 r=40** (kein Override) zeigt:

| Typ | Fair | Unfair | Front-Bias | Rear-Bias |
|-----|------|--------|------------|-----------|
| Closed (72 Kombos) | 69 | 3 | 0 | 3 |
| **Open (72 Kombos)** | **0** | **72** | **72** | **0** |

Alle 72 Open-Track-Kombos zeigen Front-Bias. Dies war das bekannte Problem aus Phase 2D.

---

## 1. Übersicht Ergebnisse

| Sim | Overrides | Open fair | Closed fair | Gesamt fair | Urteil |
|-----|-----------|-----------|-------------|-------------|--------|
| Baseline | — | 0/72 | 69/72 | 69/144 | Referenz |
| **Sim 1** | gradientBrake=true, symmetricBrakeMs=2000, speedBonusFactor=0.8 | **12/72** | **71/72** | **83/144** | **FAIL** (≤30/72 → Stopp) |
| **Sim 2** | rerollBias=true, rerollBiasStrength=0.5 | **0/72** | **65/72** | **65/144** | **FAIL** (≤30/72 → Stopp) |

Beide Sims verfehlen die adaptive Stop-Schwelle von 30/72 Open-Track-Fairness. Kein Extend auf N=50.

---

## 2. Sim 1 — Klasse A+S kombiniert mit speedBonusFactor=0.8

### Konfiguration
```
--gradientBrake true      Klasse A: Bremskraft = tFrac × yFrac (Float statt binär)
--symmetricBrakeMs 2000   Klasse S: Erste 2000ms bremsen BEIDE Racer eines Paars
--speedBonusFactor 0.8    SpeedBonus für hintere Reihen reduziert (Rear-Bias-Adresse)
```

### Ergebnisse nach Track

| Track | Typ | Reihen (typisch) | Baseline fair | Sim 1 fair |
|-------|-----|-----------------|---------------|------------|
| River Run | open | 2–3 | 0/24 | 0/24 |
| Space Sprint | open | 2–3 | 0/24 | 6/24 |
| Weltall | open | 2–3 | 0/24 | 6/24 |
| (Closed tracks) | closed | 2–14 | 69/72 | 71/72 |

### Typische Failure-Werte

| Kombination | Reihen | Row-0 Win% | Erwartet | p-Wert |
|-------------|--------|-----------|----------|--------|
| River Run × horse × 30s | 3 | 70% | 33% | 0.002 |
| River Run × duck × 30s | 3 | 75% | 33% | 0.000 |
| Weltall × horse × 30s | 3 | 80% | 33% | 0.000 |
| Weltall × horse × 120s | 3 | 80% | 33% | 0.000 |
| Space Sprint × horse × 30s | 2 | 75% | 50% | 0.024 |

### Mechanismus-Analyse

**Was hilft:**
- Der Gradient reduziert die Cliff-Kante zwischen „volle Bremse" und „keine Bremse". Racer nahe der Grenze bremsen jetzt nur teilweise → weniger abrupte Geschwindigkeitsdifferenzen.
- SpeedBonusFactor=0.8 dämpft die Varianz-Amplifikation durch den SpeedBonus leicht.
- Closed tracks verbessern sich minimal (69→71 fair).

**Warum es nicht reicht:**
- Die strukturelle Ursache des Front-Bias bleibt: `aIsTrailer = rA.t < rB.t` — Row-0 ist immer Leader, bremst nie.
- Gradient: Row-0-Racer bekommen weiterhin 0% Bremskraft. Das Gradient-System setzt auf beiden Seiten an, aber nur als Stärke-Abstufung. Die asymmetrische Richtung (Leader/Trailer) bleibt erhalten.
- Symmetric 2000ms: Hilft kurz am Start, aber nach 2s herrscht wieder vollständige Asymmetrie.
- SpeedBonusFactor=0.8: Adressiert Rear-Bias (Varianz-Amplifikation bei 5+ Reihen). Bei r=40 (2–4 Reihen) ist Rear-Bias nicht der dominante Effekt.

**Fazit Sim 1:** FAIL. 12/72 < 30/72. Kein Extend. Klasse A+S kombiniert mit Bonus-Reduktion schafft partielle Verbesserung bei 2-Reihen-Open-Tracks (Space Sprint, Weltall teilweise), aber nicht genug. River Run (3 Reihen, breiter Track) bleibt vollständig Front-biased.

---

## 3. Sim 2 — Re-Roll-Bias (Outcome-First PoC)

### Konfiguration
```
--rerollBias true          Aktiviert Outcome-First-Steuerung
--rerollBiasStrength 0.5   50% Bias-Anteil bei jedem Re-Roll
```

**Mechanismus:** Vor dem Rennen wird eine faire Zielreihenfolge als zufällige Permutation aller Racer erzeugt. Jedem Racer wird ein `targetSpreadFactor` zugewiesen (Rang 1 → hohe Zielgeschwindigkeit, Rang N → niedrige). Bei jedem Re-Roll wird `newTarget = randomTarget × 0.5 + targetSpreadFactor × 0.5`.

### Ergebnisse

| Track | Typ | Baseline fair | Sim 2 fair |
|-------|-----|---------------|------------|
| River Run | open | 0/24 | 0/24 |
| Space Sprint | open | 0/24 | 0/24 |
| Weltall | open | 0/24 | 0/24 |
| Closed tracks | closed | 69/72 | 65/72 |

### Qualitative Traces (Open Tracks)

**Trace 1 — River Run × duck × 30s (3 Reihen):**
- Baseline: Row 0 gewinnt 20/20 (100%)
- Sim 2:    Row 0 gewinnt 20/20 (100%) — identisch
- Beobachtung: Der Speed-Bias verändert die Ergebnisse nicht. Row-0-Racer mit schnellem Ziel gewinnen sicher. Row-0-Racer mit langsamem Ziel gewinnen ebenfalls — ihr Positionsvorsprung (tStart ≈ 3×deltaT = 0.026) kann von langsamen Row-2-Racern nicht aufgeholt werden, auch wenn deren Zielgeschwindigkeit höher ist.

**Trace 2 — River Run × snake × 120s (3 Reihen):**
- Baseline: Row 0 gewinnt 20/20 (100%)
- Sim 2:    Row 0 gewinnt 20/20 (100%) — identisch
- Beobachtung: Langstreckenrennen verstärken den Effekt nicht. Der Bias „zieht" über viele Re-Rolls, aber da der Zielspeed positions-unabhängig ist, können hintere Racer mit schnellem Ziel ihren Abstand nicht aufholen.

**Trace 3 — Closed Tracks (Dirt Oval × buggy × 120s):**
- Baseline: Row 0 gewinnt 1/20 (5%) — fair (p=0.867)
- Sim 2:    Row 0 gewinnt 1/20 (5%) → p=0.048 — UNFAIR (Rear-Bias)
- Beobachtung: Auf Closed Tracks entsteht durch den Bias sporadisch Rear-Bias, wenn Row-0-Racer systematisch langsame Ziele zugewiesen bekommen. Die Varianzreduktion verhindert ausgleichende Zufallsschwankungen.

### Mechanismus-Diagnose: Warum Re-Roll-Bias versagt

**Root Cause:** Der `targetSpreadFactor` kompensiert Geschwindigkeit, nicht Position.

Die Fairness-Voraussetzung auf Open Tracks ist:
```
Racer in Row k finisht gleichwahrscheinlich als Erster
⟺ BaseSpeed(k) × RaceTime ≈ finishT - tStart(k)
```
Da `tStart(k) = (totalRows - k) × deltaT` variiert nach Row, bräuchte Racer k eine **positions-kompensierte** Zielgeschwindigkeit. Der aktuelle Mechanismus ignoriert `tStart` komplett.

**Paradox-Effekt:** Durch den Bias wird die natürliche Geschwindigkeits-Varianz reduziert. Diese Varianz war der einzige Mechanismus, durch den hintere Reihen gelegentlich gewinnen konnten (Glücks-Roll mit sehr hohem spreadFactor). Der Bias nimmt diesen Zufall weg → mehr Front-Bias, nicht weniger.

**Nebeneffekt Closed Tracks:** Auf Closed Tracks (tStart ≈ 0 für alle) funktioniert die Positions-Kompensation eigentlich nicht nötig. Aber die Varianzreduktion durch den Bias schwächt auch dort die Zufalls-Ausgleichswirkung → sporadische neue Failures (7 neue Unfair-Kombos).

**Fazit Sim 2:** FAIL. 0/72 Open (keine Verbesserung) und 65/72 Closed (schlechter als Baseline). Der Re-Roll-Bias-Mechanismus ist in dieser Form **konzeptuell gebrochen**: Nur Geschwindigkeits-Biasing ohne Positionskompensation kann einen Positionsvorteil nicht neutralisieren.

---

## 4. Adaptive Entscheidung

| Sim | Open fair N=20 | Schwelle | Entscheidung |
|-----|---------------|----------|--------------|
| Sim 1 | 12/72 | ≤30/72 → Stopp | **STOPP** |
| Sim 2 | 0/72 | ≤30/72 → Stopp | **STOPP** |

Kein Extend auf N=50 oder N=100 für beide Sims.

---

## 5. Gesamtbefund und Konsequenzen

### Was Phase 2E bestätigt

1. **Avoidance-Reform (Klasse A+S) ist unzureichend:** Die strukturelle Asymmetrie (`aIsTrailer = r.t < rB.t`) ist der Kernmechanismus des Front-Bias auf Open Tracks. Gradient-Stärke und temporäre Symmetrisierung beim Start können diese Asymmetrie abschwächen, aber nicht neutralisieren. Mit Klasse A+S erreichen wir 12/72 statt 0/72 — eine messbare, aber nicht ausreichende Verbesserung.

2. **Outcome-First Re-Roll-Bias (Klasse D) ist konzeptuell gebrochen:** Geschwindigkeits-Biasing ohne Positionskompensation verschlimmert Front-Bias aktiv durch Varianzreduktion. Eine korrekte Outcome-First-Implementierung müsste `targetSpreadFactor(k) = f(targetRank, tStart(k))` berechnen — d.h. die Zielgeschwindigkeit explizit an den Startpositionsabstand anpassen.

### Verbleibende Mechanismus-Optionen

| Option | Beschreibung | Status |
|--------|-------------|--------|
| A. Start-T-Korrektur | Row-k-Racer auf demselben tStart wie Row 0 (Open-Track-only) | Nicht getestet |
| B. Positionskompensierter Re-Roll-Bias | `targetSpreadFactor(k) = f(rank, tStart(k))` | Nicht implementiert |
| C. speedBonusFactor weiter reduzieren | 0.6, 0.4, 0.0 — für r=100 Rear-Bias-Test | Nicht getestet |
| D. Status Quo akzeptieren | Front-Bias auf Open Tracks als bekanntes Verhalten dokumentieren | Option |

### Empfehlung für Phase 2F

Optionen geordnet nach erwarteter Wirksamkeit und Implementierungsrisiko:

1. **Start-T-Korrektur (Option A):** Alle Open-Track-Racer beginnen auf demselben tStart (= Row-0-Startposition). Mechanisch präzise: eliminiert den Positionsvorteil vollständig. Risiko: verändert das Rennen-Starterlebnis sichtbar (kein gestaffelter Start). Testbar in sim-fairness.mjs als Override.

2. **Positionskompensierter Re-Roll-Bias (Option B):** Fix für den konzeptuellen Fehler in Sim 2. Aufwändiger: `targetSpreadFactor` muss aus Startposition und Zielpfad berechnet werden. Kann in sim-fairness.mjs als Override implementiert werden.

3. **Status Quo (Option D):** Front-Bias auf Open Tracks ist ein bekanntes, gut dokumentiertes Verhalten. Auswirkung auf Spieler: Row 0 hat 2–3× erwartete Win-Rate. Akzeptierbar wenn Open-Track-Races selten sind oder explizit als „Positionsstars mit Vorteil" kommuniziert werden.

---

## 6. Dateien

| Datei | Inhalt |
|-------|--------|
| `client/tmp/phase-2e-baseline-r40/fairness-data.json` | Baseline N=20 r=40 |
| `client/tmp/phase-2e-sim1-r40/fairness-data.json` | Sim 1 N=20 r=40 |
| `client/tmp/phase-2e-sim2-r40/fairness-data.json` | Sim 2 N=20 r=40 |
| `scripts/sim-fairness.mjs` | Erweiterter Sim mit Phase-2E-Overrides |

---

*Implementierung: CLI-only in sim-fairness.mjs, keine Produktions-Code-Änderungen.*

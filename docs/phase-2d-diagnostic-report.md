# Phase 2D — Diagnostic Report

**Branch:** feat/phase-2d-diagnostics  
**Date:** 2026-05-18  
**Sims run:** 10 total (5 × N=40, 5 × N=100), N=50 races each  
**Acceptance criterion:** 1.5×-Gate per row (win rate ∈ [0.5×E, 1.5×E]), ≥62/72 open-track combos

---

## TL;DR

Phase 2D hat **zwei unabhängige Root Causes** für Open-Track-Unfairness identifiziert, die sich im aktuellen System gegenseitig teilweise aufheben. Jede Lösung die nur einen Root Cause adressiert wird den anderen freilegen.

| Root Cause | Richtung | Mechanismus | Beweis |
|------------|----------|-------------|--------|
| Avoidance-Asymmetrie | Front-Bias | Row-0 ist immer Leader, bremst nie | Test A Baseline: Row-0 med=90%, alle 72 Combos |
| SpeedBonus-Varianz-Amplifikation | Rear-Bias | `spreadFactor × speedBonusMult` amplifiziert Zufall für tiefe Reihen | Test B N=100: Last Row 2–3× erwartet |

**Phase 2E muss beide gleichzeitig adressieren.**

---

## Test A — rowGapMultiplier Sweep (Lesart D)

### Hypothese
Größerer Startabstand zwischen Reihen könnte Front-Bias reduzieren indem Racer weniger dicht starten.

### Ergebnis: Lesart D widerlegt

| Sim | Open Gate | Row-0 median | Row-0 max |
|-----|-----------|--------------|-----------|
| rowGap=1.5 N=40  | 0/72 | 90.0% | 96.0% |
| rowGap=2.0 N=40  | 0/72 | 92.0% | 96.0% |
| rowGap=2.5 N=40  | 0/72 | 94.0% | 98.0% |
| rowGap=3.0 N=40  | 0/72 | 96.0% | 100.0% |
| rowGap=1.5 N=100 | 0/72 | 90.0% | 98.0% |
| rowGap=2.0 N=100 | 0/72 | 94.0% | 100.0% |
| rowGap=2.5 N=100 | 0/72 | 96.0% | 100.0% |
| rowGap=3.0 N=100 | 0/72 | 96.0% | 100.0% |

**Befund:** Größerer rowGap **verschlechtert** Front-Bias monoton. Bei rowGap=3.0 erreicht Row-0 median 96% (Erwartung ~20–33% je nach Reihenanzahl). Mechanismus: mehr Abstand = längerer freier Vorlauf von Row-0 bevor Avoidance eingreift.

Lesart D (Geometrie als Lösung) ist widerlegt. Kein Parameterwert wirkt in die gewünschte Richtung.

---

## Test B — speedBrakeFactor=1.0 (Avoidance komplett aus)

### Hypothese
Avoidance-System ist die primäre Ursache für Front-Bias. Ohne Bremsung sollte speedBonus Fairness herstellen.

### Ergebnis: Lesart C bestätigt — aber mit kritischem Befund

| Sim | Open Gate | Row-0 median | Last-Row median |
|-----|-----------|--------------|-----------------|
| brake=1.0 N=40  | 38/72 | 30.0% | ~36–62% |
| brake=1.0 N=100 | 0/72  |  0.0% | ~44–50% |

**N=40: Teilweise Fairness.** Die 38/72 bestehenden Combos sind ausschließlich 2-Reihen-Tracks:

| Reihenanzahl | N=40 Gate | Row-0 median | Bewertung |
|--------------|-----------|--------------|-----------|
| 2 Reihen | 30/30 ✅ | 40.0% (E=50%) | Fair |
| 3 Reihen | 8/38 ❌  | 18.0% (E=33%) | Rear-Bias |
| 4 Reihen | 0/4  ❌  |  4.0% (E=25%) | starker Rear-Bias |

**N=100: Vollständiger Rear-Bias.** Bei 100 Racern entstehen 5–9 Reihen auf Open Tracks. Ohne Avoidance-Bremsung dominiert die letzte Reihe massiv:

| Reihenanzahl | N=100 Gate | Row-0 median | Last-Row median | Ratio |
|--------------|------------|--------------|-----------------|-------|
| 5 Reihen | 0/30 ❌ |  4.0% (E=20%) | 44.0% | **2.2×** erwartet |
| 6 Reihen | 0/22 ❌ |  0.0% (E=17%) | 50.0% | **3.0×** erwartet |
| 7 Reihen | 0/14 ❌ |  0.0% (E=14%) | 44.0% | **3.1×** erwartet |
| 8 Reihen | 0/4  ❌ |  0.0% (E=12%) | 38.0% | **3.0×** erwartet |

---

## Diagnose: Dualer Root Cause

### Root Cause 1 — Avoidance-Asymmetrie (Front-Bias)

In `raceBehavior.js:248`:
```javascript
const aIsTrailer = rA.t < rB.t || (rA.t === rB.t && rA.index < rB.index);
```
Trailer = niedrigeres t. Row-0 startet mit höchstem t → ist immer Leader → bremst nie.  
Row-1+ starten mit niedrigerem t → sind immer Trailer → bremsen wenn nahe an Row-0.

In `headlessRaceSimulator.js:264`:
```javascript
const brake = r.avoidanceActive ? behaviorConfig.speedBrakeFactor : 1.0;
```
Binärer Switch: Row-0 = 1.0, Row-1+ = 0.95. Permanente ~5% Geschwindigkeitsdifferenz in Paketen.

**Folge:** Row-0 hat systematischen Geschwindigkeitsvorteil während aller Avoidance-Interaktionen in der Startphase.

### Root Cause 2 — SpeedBonus-Varianz-Amplifikation (Rear-Bias)

In `headlessRaceSimulator.js:181`:
```javascript
baseSpeed: race_baseSpeed * spreadFactor * speedBonusMult,
```

Das Problem: `spreadFactor` ist stochastisch (Normalverteilung ±Streuung). `speedBonusMult = 1 + bonus_N` ist deterministisch. Die multiplikative Verknüpfung amplifiziert die Varianz für tiefe Reihen:

```
Var[speed_N] = Var[speed_0] × speedBonusMult_N²
```

Für 6 Reihen (N=100, River Run): `bonus_5 ≈ 0.091` → `speedBonusMult_5 ≈ 1.091`.  
Letzte Reihe hat 19% mehr Varianz als Row-0 → gewinnt systematisch mehr als erwartet.

**Folge:** Deep Rows haben mehr Gewinnchancen als der speedBonus-Erwartungswert suggeriert. Dieser Effekt wächst mit Reihenanzahl und ist bei 5+ Reihen dominant.

### Warum das aktuelle System "funktioniert" bei N=40

Root Cause 1 (Front-Bias) und Root Cause 2 (Rear-Bias) heben sich bei N=40 teilweise auf:
- Avoidance-Asymmetrie begünstigt Row-0 (Front-Bias)
- SpeedBonus-Varianz-Amplifikation benachteiligt Row-0 bei 3+ Reihen (Rear-Bias)
- Netto-Ergebnis: ~70/72 Combos verbessert durch Phase 2B.1, aber kein Gate erfüllt

Bei N=100 hat der zweite Effekt deutlich mehr Gewicht (5-9 Reihen statt 2-4), sodass die Balance verschoben ist und beide Effekte sichtbar werden.

---

## Schlussfolgerungen

### Was Phase 2D bewiesen hat

1. **Lesart D widerlegt:** Geometrische Eingriffe (rowGapMult) lösen das Problem nicht, sie verschlimmern es.

2. **Lesart C bestätigt:** Avoidance ist primäre Front-Bias-Ursache. Bestätigt durch Test B N=40 (38/72 pass).

3. **Neuer kritischer Befund:** SpeedBonus-Varianz-Amplifikation ist ein zweiter, unabhängiger Root Cause der bei N=100 mit 5-9 Reihen dominiert. Bisher von Avoidance-Asymmetrie maskiert.

4. **Keine Einzel-Lösung reicht:** Jede Phase-2E-Lösung die nur Avoidance-Asymmetrie adressiert (Klasse A, S) wird bei N=100 den SpeedBonus-Rear-Bias freilegen.

### Was Phase 2E adressieren muss

**Zwei Eingriffe, beide zwingend:**

**E1 — Avoidance-Reform (Klasse A/S):**  
Gradient oder symmetrische Startphase-Bremsung. Entfernt oder reduziert Row-0-Vorteil im Avoidance-System.  
Details: siehe Cross-Review-Konsultation.

**E2 — SpeedBonus-Varianz-Fix (Klasse E):**  
Additiver statt multiplikativer speedBonus. Trennt stochastische Varianz von deterministischer Kompensation:

```javascript
// Aktuell (amplifiziert Varianz):
baseSpeed = race_baseSpeed * spreadFactor * speedBonusMult;

// Vorgeschlagen (keine Varianz-Amplifikation):
baseSpeed = race_baseSpeed * (spreadFactor + bonus_N);
// Äquivalent: race_baseSpeed * spreadFactor + race_baseSpeed * bonus_N
```

Erwartungswert ist identisch. Varianz ist für alle Reihen gleich: `Var = race_baseSpeed² × Var[spreadFactor]`.

**Validierungsstrategie Phase 2E:**
- Sim-Test: E1 allein, E2 allein, E1+E2 kombiniert — je N=50 für Exploration
- Finale Validation: N=100, alle Open + Closed Tracks
- Akzeptanzkriterium: ≥62/72 Open Gate, 0 Closed-Track-Regression

---

## Anhang: Vollständige Gate-Ergebnisse

### Test A — Open Tracks (0/72 bei allen Werten)

Row-0 median win rate nach rowGapMultiplier:

```
rowGap | N=40 med | N=40 max | N=100 med | N=100 max
-------|----------|----------|-----------|----------
  1.5  |   90.0%  |   96.0%  |    90.0%  |    98.0%
  2.0  |   92.0%  |   96.0%  |    94.0%  |   100.0%
  2.5  |   94.0%  |   98.0%  |    96.0%  |   100.0%
  3.0  |   96.0%  |  100.0%  |    96.0%  |   100.0%
```

### Test B — Row-by-row bei N=40 (ausgewählte Combos)

**River Run, horse, 30s (3 Reihen bei N=40):**
Row-0=12%, Row-1=32%, Row-2=56% — Rear-Bias, letzte Reihe 1.7× erwartet

**Space Sprint, horse, 30s (2 Reihen bei N=40):**  
Row-0=40%, Row-1=60% — Fair (Gate bestanden ✅)

### Test B — Row-by-row bei N=100 (ausgewählte Combos)

**River Run, horse, 30s (7 Reihen bei N=100):**
[0%, 0%, 0%, 6%, 16%, 30%, 48%] — massiver Rear-Bias

**Space Sprint, horse, 30s (5 Reihen bei N=100):**
[8%, 4%, 12%, 32%, 44%] — Rear-Bias, letzte Reihe 2.2×

### Closed-Track Hinweis (Gate-Instabilität bei N=50)

Closed-Track-Ergebnisse bei N=100 zeigen 0/72 gate — das ist **Stichproben-Instabilität**, keine echte Regression:  
Mit 25 Reihen (100 Racer / ~4 pro Reihe) sind nur 2 Siege pro Reihe in 50 Rennen erwartet.  
P(0 Siege | λ=2) ≈ 13.5% — ca. 9 von 72 Combos würden zufällig 0 zeigen.  
Für Closed-Track-Regression-Test: N=200+ oder separate dedizierte Validation.

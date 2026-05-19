# Phase 2N — Algorithm Summary & Structural Analysis

**Ziel:** 8/9 Configs (3 Racer × r40/r70/r100) bestehen 1.5×-Gate bei N=50 für jeden Open Track.

**Gate:** Jede Row im Bereich [erw./1.5, erw.×1.5]  
**Fixe Parameter:** avoidanceWarmupMs=0, dur=60s, v4MetricType=per_racer, v4ThresholdActive=true  
**Schwellen:** Row1=20/40/60, Row2+=20/40/70  
**Schedule:** Drittel-Schema: [B, 1+(B-1)×2/3, 1+(B-1)×1/3, 1.0]

---

## Ergebnisse

| Track | Beste N=50 | bei boost | Fazit |
|-------|-----------|-----------|-------|
| Space Sprint (air, 19772px) | **2/9** — rocket@r40, plane@r40 | 1.082 | Nicht konvergierbar |
| Weltall (air, 15986px) | **0/9** | — | Nicht konvergierbar |
| River Run (water, 6156px) | **0/9** (N=10) | — | Nicht konvergierbar |

---

## Iterationsübersicht

### Space Sprint — 9 Iterationen
boost: 1.07 → 1.10 → 1.085 → 1.07(Schwellen) → 1.07(Schwellen) → 1.075 → 1.09 → 1.082 → 1.086  
Bestes Ergebnis bei 1.082: rocket@r40 ✅, plane@r40 ✅; alle anderen ❌  
N=50 Gesamt: 2/9

### Weltall — 2 Iterationen
boost: 1.082 → 1.09  
Bestes Ergebnis: 0/9 bei N=50 (beide Iterationen)  
Theoretisches Maximum: 7/9 (dragon@r40 nahe fair, alle r70/r100 bei höherem Boost möglicherweise)

### River Run — 3 Iterationen
boost: 1.15 → 1.10 → 1.13  
Bestes Ergebnis: 0/9 bei N=10 (strukturell non-konvergent)

---

## Strukturelle Limitierungen

### 1. Cross-Racercount Inkompatibilität

Jeder Racercount (r40/r70/r100) erzeugt eine andere Anzahl von Rows für jeden Racer:

**Space Sprint Beispiel:**
| Racer | r40 | r70 | r100 |
|-------|-----|-----|------|
| dragon | 3 rows | 5 rows | 6 rows |
| rocket | 2 rows | 4 rows | 5 rows |
| plane | 2 rows | 4 rows | 5 rows |

Je mehr Rows, desto höher der benötigte Boost für hintere Rows. Das Boost-Optimum für r100 liegt immer höher als für r40. Die Bereiche überlappen nicht.

**Gemessene Boost-Optima (approximiert):**
- r40 (2-4 Rows): optimal ~1.082-1.090
- r70 (4-6 Rows): optimal >1.09
- r100 (5-9 Rows): optimal >1.10+

### 2. Sehr kleine Last-Row Racer-Anzahl

Bei einigen Kombinationen haben die letzten Rows extrem wenige Racer:

**Beispiel rocket@Weltall-r40:**
- Row 0: 950 Racer, Row 1: 950 Racer, **Row 2: 100 Racer (5%)**
- Gate-Minimum: 22.2% × 50 Rennen = 11.1 Rennen
- Baseline-Erwartung (kein Boost): 2/40 × 50 = 2.5 Rennen
- **Benötigter Faktor: 4.4× — strukturell nicht erreichbar**

Row-2 bleibt bei 6% Gewinnrate unabhängig vom Boost (gemessen bei 1.082 UND 1.09).

### 3. Boost-Erschöpfung bei tiefen Rows

Der v4 per_racer Mechanismus erschöpft den Bonus nach Erreichen der Überhol-Schwellen (20%/40%/70%). Bei hohen Racercounts müssen hintere Rows sehr viele Racer überholen:

**Beispiel dragon@River Run-r100 (9 Rows):**
- Row-8-Racer müssen 80%+ des Feldes überholen
- Row-8 Bonus-End: kein=60% (60% verlieren Bonus vollständig vor Rennende)
- Trotz Boost gewinnt Row 8: 0% der Rennen (erwartet 11.1%)

Bei v4 per_racer Row-7 60%-Schwelle: Ø 44.5s (von 60s) — erst nach ~75% der Rennzeit erreicht. Danach kein Boost mehr für die letzten 15s.

### 4. Boost shiftet primär R0→R1, nicht R0→R2+

Der größte Effekt des Boosts ist die Umverteilung von Siegen von Row 0 (Front) zu Row 1:
- Row 0 verliert 20-30% Gewinnrate pro 0.01 Boost-Erhöhung (Row 1 gewinnt das)
- Row 2+ gewinnen kaum dazu (oft 0-6% konstant über alle Boost-Werte)

Ursache: Row-1-Racer müssen nur 20-40% des Feldes überholen um konkurrenzfähig zu werden. Row-2+-Racer brauchen 60-80% und erschöpfen ihren Boost dabei.

---

## Empfehlungen für Phase 2O

### Option A: Boost nach Racercount differenzieren
- Statt eines globalen Boosts: `boostByRacercount = {40: 1.082, 70: 1.09, 100: 1.10}`
- Durchbricht "einen Parameter" Prinzip aber adressiert strukturelle Ursache

### Option B: Threshold-Anpassung für tiefere Rows
- Niedrigere Schwellen für Row 2+ (z.B. 15%/30%/55% statt 20%/40%/70%)
- Boost wird früher abgebaut → weniger Überkorrektur bei Row 1
- Oder: per_racer durch einen anderen Metrik-Typ ersetzen

### Option C: Fairness-Gate lockern
- 1.5×-Gate ist streng; 2.0× wäre realistischer für Open-Tracks mit vielen Rows
- Bei 2.0×-Gate: Space Sprint 2/9 → vermutlich 5+/9

### Option D: v4 nur für r40 aktivieren
- Bei r70/r100 ist die Bias-Korrektur zu komplex
- r70/r100 Open Tracks ohne v4 lassen → dort keine künstliche Fairness

### Option E: Separate Boost-Parameter per Row-Tiefe
- statt einem Boost für alle: `rowBoostMultipliers = [1.0, 1.09, 1.15, 1.22, ...]`
- Jede Row bekommt ihren eigenen Boost-Wert

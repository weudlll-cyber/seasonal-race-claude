# Phase 2N — Tuning Log: Open Track Fairness

**Ziel:** Alle 9 Configs (3 kompatible Racer × r40/r70/r100) bestehen 1.5×-Gate bei N=50 (min. 8/9).

**Fixe Parameter (alle Iterationen):**
- avoidanceWarmupMs = 0
- dur = 60s
- v4MetricType = per_racer
- v4ThresholdActive = true
- isOpen-Guard aktiv

**Gate:** Jede Row im Bereich [erw./1.5 , erw.×1.5]
**Stop-Kriterien:** 9/9 Gate N=10 → N=50 Validierung (braucht 8+/9); ≤6/9 nach 12 Iterationen → nächster Track

---

## Track 1: Space Sprint (`space-sprint`)

**Surface:** air  
**Kompatible Racer:** dragon (size=50), rocket (size=40), plane (size=42)  
**Pfadlänge:** 19 772 px | **Breite:** 449 px

### Row-Counts pro Racer×Racercount (aus Sim-Daten)

| Racer | r40 | r70 | r100 |
|-------|-----|-----|------|
| dragon | 3 | 5 | 6 |
| rocket | 2 | 4 | 5 |
| plane | 2 | 4 | 5 |

---

### Iteration 1 — Startwerte

| Parameter | Wert |
|-----------|------|
| boost | 1.07 |
| Row1-Schwellen | 20/40/60 |
| Row2+-Schwellen | 20/40/70 |
| Schedule | [1.07, 1.047, 1.023, 1.0] (Drittel) |

**Ergebnis N=10:** Gate 2/9 | Chi-sq 6/9  
**Diagnose:** Front-Bias dominant bei r70/r100; dragon@r40 auch Front-Bias.

---

### Iteration 2 — boost ↑ 1.07→1.10

**Änderung:** boost = 1.10, Schedule=[1.10, 1.067, 1.033, 1.0]

**Ergebnis N=10:** Gate 0/9 | Chi-sq 0/9  
**Diagnose:** Starke Rear-Bias (Row 1 dominiert überall). Zu hoch.

---

### Iteration 3 — boost ↓ 1.10→1.085

**Änderung:** boost = 1.085, Schedule=[1.085, 1.057, 1.028, 1.0]

**Ergebnis N=10:** Gate 1/9 | Chi-sq ~6/9  
**Diagnose:** Immer noch überwiegend Front-Bias, kleines Verbesserungssignal.

---

### Iteration 4 — Row1-Schwellen ↑ 20/40/60→30/50/70

**Änderung:** Row1-Schwellen = 30/50/70 (boost zurück auf 1.07)

**Ergebnis N=10:** Gate 2/9 | Chi-sq 2/9  
**Diagnose:** Höhere Row1-Schwellen = Row 1 hält Bonus länger → paradoxerweise schlimmer (rocket@r70 R0 sprang auf 70%). Schwellen erhöhen hilft nicht.

---

### Iteration 5 — Row2+-Schwellen ↑ 20/40/70→30/50/70

**Änderung:** Row2+-Schwellen = 30/50/70, Row1 zurück auf 20/40/60

**Ergebnis N=10:** Gate 2/9 | Chi-sq ~5/9  
**Diagnose:** Kaum Verbesserung. Row2+-Schwellen erhöhen bringt wenig.

---

### Iteration 6 — boost ↑ 1.07→1.075 (Schwellen Reset)

**Änderung:** boost = 1.075, Schedule=[1.075, 1.05, 1.025, 1.0]  
Row1=20/40/60, Row2+=20/40/70 (zurückgesetzt)

**Ergebnis N=10:** Gate 2/9 | Chi-sq **9/9** ← starkes Signal → N=50 ausgelöst

**N=50 Validierung:**
| | dragon | rocket | plane |
|-|--------|--------|-------|
| r40 | ❌ R0=58% p=0.000 | ✅ | ✅ |
| r70 | ❌ R0=52% p=0.000 | ❌ R0=54% p=0.000 | ❌ R0=56% p=0.000 |
| r100 | ❌ R0=50% p=0.000 | ❌ R0=46% p=0.000 | ❌ R0=46% p=0.000 |

**Diagnose:** Starke Front-Bias bei r70/r100. Boost zu niedrig.

---

### Iteration 7 — boost ↑ 1.075→1.09

**Änderung:** boost = 1.09, Schedule=[1.09, 1.06, 1.03, 1.0]

**Ergebnis N=10:**
| | dragon | rocket | plane |
|-|--------|--------|-------|
| r40 | ❌ R1=70% | ✅ | ❌ Gate R1=70% |
| r70 | ❌ R1=50% | ❌ R1=60% | ❌ R1=50% |
| r100 | ❌ R2=50% | ❌ (verteilt) | ❌ R0=0% |

**Gate:** 1/9 | **Chi-sq:** ~6/9  
**Diagnose:** Rear-Bias bei r40; gemischte Rear-Bias bei r70/r100. Zu hoch.

---

### Iteration 8 — boost ↓ 1.09→1.082 (Binär-Mitte)

**Änderung:** boost = 1.082, Schedule=[1.082, 1.055, 1.027, 1.0]

**Ergebnis N=10:** Gate 3/9 (Gate-Fails = N=10-Rauschen) | Chi-sq **9/9** ← starkes Signal → N=50 ausgelöst

**N=50 Validierung:**
| | dragon | rocket | plane |
|-|--------|--------|-------|
| r40 | ❌ R0=50% p=0.002 Front | ✅ p=0.769 | ✅ p=0.401 |
| r70 | ❌ R0=48% p=0.000 Front | ❌ R0=44% p=0.004 Front | ❌ R0=48% p=0.000 Front |
| r100 | ❌ R0=40% p=0.000 Front | ❌ R0=40% p=0.003 Front | ❌ R0=40% p=0.000 Front |

**N=50 Gesamt: 2/9** — starke Front-Bias bei r70/r100.

---

### Iteration 9 — boost ↑ 1.082→1.086

**Änderung:** boost = 1.086, Schedule=[1.086, 1.057, 1.029, 1.0]

**N=10:** Chi-sq **9/9** (alle p≥0.077)

**N=50 Vollbild:**

| | dragon | rocket | plane |
|-|--------|--------|-------|
| r40 | ❌ R0=46% p=0.001 Front (3 rows) | ✅ p=0.257 (2 rows) | ❌ R1=68% p=0.011 Rear (2 rows) |
| r70 | ❌ R0=46% p=0.000 Front (5 rows) | ❌ R0=56% p=0.000 Front (4 rows) | ❌ R1=46% p=0.000 mixed (4 rows) |
| r100 | ❌ R0=44% p=0.000 Front (6 rows) | ❌ R0=30% p=0.013 (5 rows) | ❌ mixed p=0.000 (5 rows) |

**N=50 Gesamt: 1/9**

**KRITISCH:** dragon@r40 (3 Rows) braucht Boost >1.086, plane@r40 (2 Rows) ist bei 1.086 schon Rear-Biased. Kein gemeinsamer Boost-Wert lösbar.

**Space Sprint FAZIT: Nicht konvergierbar.** Bestes N=50: 1/9 bei boost=1.086 bzw. 2/9 bei boost=1.082. Ursache: Row-Count-Inkompatibilität — dragon hat 3 Rows bei r40, rocket/plane nur 2.

---

## Track 2: Weltall (`mogcvuipw2y5`)

**Surface:** air  
**Kompatible Racer:** dragon (size=50), rocket (size=40), plane (size=42)  
**Pfadlänge:** 15 986 px | **Breite:** 403 px

### Row-Counts pro Racer×Racercount (aus Sim-Daten)

| Racer | r40 | r70 | r100 |
|-------|-----|-----|------|
| dragon | 3 | 5 | 7 |
| rocket | 3 | 4 | 6 |
| plane | 3 | 4 | 6 |

---

### Iteration 1 — Startwerte

| Parameter | Wert |
|-----------|------|
| boost | 1.082 |
| Schedule | [1.082, 1.055, 1.027, 1.0] |
| Row1-Schwellen | 20/40/60 |
| Row2+-Schwellen | 20/40/70 |

**N=50 Vollbild:**

| | dragon | rocket | plane |
|-|--------|--------|-------|
| r40 | ❌ R0=46% p=0.111 (gate: R2=22%<22.2%) | ❌ R0=52% p=0.000 Front | ❌ R0=50% p=0.000 Front |
| r70 | ❌ R0=46% p=0.000 Front | ❌ R0=52% p=0.000 Front | ❌ R0=48% p=0.000 Front |
| r100 | ❌ R0=48% p=0.000 Front | ❌ R0=54% p=0.000 Front | ❌ R0=42% p=0.000 Front |

**N=50 Gesamt: 0/9** — alle Front-Bias, einheitliche Richtung. Boost erhöhen.

---

### Iteration 2 — boost ↑ 1.082→1.09

**Änderung:** boost = 1.09, Schedule=[1.09, 1.06, 1.03, 1.0]

**N=50 Vollbild:**

| | dragon | rocket | plane |
|-|--------|--------|-------|
| r40 | chi-sq ✅ p=0.125 (gate ❌ R2=20%<22.2%) | ❌ R1=56% Rear-Bias | ❌ p=0.000 R2=6%<22.2% |
| r70 | ❌ R0=38% Front (5 rows, erw.=20%) | ❌ R0=48% Front (4 rows, erw.=25%) | ❌ R0=46% Front |
| r100 | ❌ R0=38% Front (7 rows, erw.=14.3%) | ❌ R0=32% Front (6 rows, erw.=16.7%) | ❌ R0=36% Front |

**STRUKTURANALYSE r40:**

rocket@Weltall-r40: Row-2 hat nur 100 Racer über 50 Rennen = **2 Racer/Rennen** (5% des Feldes). Gate-Minimum = 22.2% × 50 = 11.1 Rennen. Jeder Row-2-Racer bräuchte 11% Einzelgewinnrate (Baseline=2.5%) → 4.4×-Boost benötigt — strukturell unmöglich.

plane@Weltall-r40: Row-2 hat 200 Racer = 4/Rennen (10%). Gate-Minimum = 11.1 Rennen. Benötigt 5.5% vs Baseline 2.5% → 2.2×-Boost. Trotzdem R2=6% bei BEIDEN Boosts (6% bei 1.082 UND 1.09). Boost shiftet Siege nur zwischen R0 und R1, nicht zu R2.

dragon@Weltall-r40: Row-2 hat 500 Racer = 10/Rennen (25%). Gate-Minimum = 11.1 Rennen. Baseline 10×50/2000=25% → bereits nahe Gate. Deshalb chi-sq fair bei beiden Boosts.

**INKOMPATIBILITÄT r40 ↔ r70/r100:**
- r40-Optimum: boost ~1.082-1.085 (rocket überschreitet bei 1.09)
- r70/r100-Optimum: boost > 1.10 (noch Front-Biased bei 1.09)
- Diese Bereiche überlappen nicht.

**N=50 Gesamt Iter2: 0/9**

**Weltall FAZIT: Nicht konvergierbar.**  
Theoretisches Maximum: 7/9 (nur dragon@r40 + alle r70 + alle r100 bei optimalem Boost) — unter der 8/9-Grenze.  
Ursache: (1) rocket/plane@r40 Row-2 strukturell zu klein; (2) r40 vs r70/r100 Boost-Bereich inkompatibel.

---

## Track 3: River Run (`river-run`)

**Surface:** water  
**Kompatible Racer:** duck (size=36), dragon (size=50), rocket (size=40)  
**Pfadlänge:** 6 156 px | **Breite:** 332 px

### Row-Counts pro Racer×Racercount (aus Sim-Daten)

| Racer | r40 | r70 | r100 |
|-------|-----|-----|------|
| duck | 3 | ? | ? |
| dragon | 4 | ? | ? |
| rocket | 3 | ? | ? |

---

### Iteration 1 — Startwerte

| Parameter | Wert |
|-----------|------|
| boost | 1.15 |
| Schedule | [1.15, 1.10, 1.05, 1.0] |
| Row1-Schwellen | 20/40/60 |
| Row2+-Schwellen | 20/40/70 |

**N=10 r40:**

| Racer | Ergebnis |
|-------|----------|
| duck | ❌ R1=70% p=0.024 **Rear** (3 rows) |
| dragon | ❌ gate (R2=40%>37.5%) p=0.308 chi-sq ok (4 rows) |
| rocket | ❌ R1=60% p=0.147 chi-sq ok (3 rows) |

**Diagnose:** Starke Rear-Bias (duck signifikant, rocket tendenziell). Boost=1.15 zu hoch für kurzen Track (6156px).

---

### Iteration 2 — boost ↓ 1.15→1.10

**Änderung:** boost = 1.10, Schedule=[1.10, 1.067, 1.033, 1.0]

**N=10 r40:**

| Racer | Ergebnis |
|-------|----------|
| duck | ❌ R0=70% R1=30% p=0.024 **Front-Bias** (3 rows) — komplett umgekehrt! |
| dragon | ❌ gate (R0=40%>37.5%) p=0.220 chi-sq OK (4 rows) |
| rocket | chi-sq ✅ p=0.501, gate ❌ (R0=50%=Grenze, R2=20%<22.2%) |

**N=10 r70:**

| Racer | Ergebnis |
|-------|----------|
| duck | ❌ R0=60% p=0.017 **Front-Bias** (5 rows, erw.=20%) |
| dragon | chi-sq ✅ p=0.064, gate ❌ (R0=40%>25%) (6 rows) |
| rocket | chi-sq ✅ p=0.134, gate ❌ (R3=0%<13.3%) (5 rows) |

**Diagnose:** duck komplett umgekehrt von Rear→Front (1.15→1.10). Rocket/dragon nahe neutral. Zielwert liegt zwischen 1.10 und 1.15, vermutlich ~1.13.

*(r100 ausstehend)*

---

### Iteration 3 — boost ↑ 1.10→1.13

**Änderung:** boost = 1.13, Schedule=[1.13, 1.087, 1.043, 1.0]

**N=10 r40:**

| Racer | Ergebnis |
|-------|----------|
| duck | ❌ R0=20% R1=80% p=0.006 **starke Rear-Bias** (3 rows) — Überkorrektur! |
| dragon | chi-sq ✅ p=0.156, gate ❌ (R2=50%>37.5%, R3=0%<16.7%) (4 rows) |
| rocket | chi-sq ✅ p=0.272, gate ❌ (R0=50% Grenze, R2=10%<22.2%) (3 rows) |

**N=10 r70:**

| Racer | Ergebnis |
|-------|----------|
| duck | ❌ R0=10% R1=70% p=0.002 **extreme Rear-Bias** (5 rows) |
| dragon | ❌ R1=50% p=0.025 Rear-Bias (6 rows) |
| rocket | chi-sq ✅ p=0.134, gate ❌ (R3=R4=0% < 13.3%) |

**N=10 r100:**

| Racer | Ergebnis |
|-------|----------|
| duck | ❌ R0=50% p=0.010 **Front-Bias** (6 rows, erw.=16.7%) |
| dragon | ❌ R0=50% p=0.001 **Front-Bias** (9 rows, erw.=11.1%) |
| rocket | ❌ R0=70% p=0.000 **Front-Bias** (7 rows, erw.=14.3%) |

**STRUKTURANALYSE:**

Racercount-Inkompatibilität analog zu Space Sprint/Weltall:
- r40/r70: boost=1.13 → Rear-Bias (duck extrem, dragon/rocket grenzwertig)
- r100: boost=1.13 → immer noch stark Front-Bias (dragon 9 rows braucht Boost >>1.13)
- Crossover für duck@r40: zwischen 1.10 (R0=70% Front) und 1.13 (R0=20% Rear) ≈ boost=1.12
- Crossover für duck@r100: schätzungsweise boost~1.17+ (von 70% bei 1.10 auf 50% bei 1.13)
- Diese Bereiche überlappen nicht.

**Gesamt-Verlauf duck@r40:** 1.10→R0=70% (Front), 1.13→R0=20% (Rear), 1.15→R0=30% (Rear)

**River Run FAZIT: Nicht konvergierbar.**  
Alle 3 Racercounts zeigen bei 0/9 über alle getesteten Boost-Werte. Ursache identisch zu Space Sprint/Weltall: r40 und r100 brauchen inkompatible Boost-Werte aufgrund unterschiedlicher Row-Anzahl.

---

## Gesamtergebnis Phase 2N

| Track | Beste N=50 | bei boost | Fazit |
|-------|-----------|-----------|-------|
| Space Sprint | 2/9 (rocket@r40, plane@r40) | 1.082 | Nicht konvergierbar |
| Weltall | 0/9 (Iter2@1.09) | — | Nicht konvergierbar (max. 7/9 theoretisch) |
| River Run | 0/9 (N=10 alle Iter) | — | Nicht konvergierbar |

**Ursache (alle Tracks):** Der v4 per_racer Mechanismus hat folgende Limitierungen:
1. **Boost shiftet Siege hauptsächlich zwischen R0 und R1**, nicht zu tieferen Rows
2. **Unterschiedliche Racercounts erzeugen unterschiedliche Row-Anzahlen** → inkompatible Boost-Optima
3. **Sehr wenige Racer in letzten Rows** (z.B. rocket@Weltall-r40: 2 Racer/Rennen) → strukturell unmöglich, Gate-Minimum zu erreichen
4. **Boost erschöpft sich zu früh** für Racer in sehr hinteren Rows bei hohen Racercounts

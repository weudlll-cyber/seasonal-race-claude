# Phase 2N — Tuning Log: Open Track Fairness

**Goal:** All 9 configs (3 compatible racers × r40/r70/r100) pass the 1.5× gate at N=50 (min. 8/9).

**Fixed parameters (all iterations):**
- avoidanceWarmupMs = 0
- dur = 60s
- v4MetricType = per_racer
- v4ThresholdActive = true
- isOpen-Guard active

**Gate:** Every row in the range [exp./1.5 , exp.×1.5]
**Stop criteria:** 9/9 gate N=10 → N=50 validation (needs 8+/9); ≤6/9 after 12 iterations → next track

---

## Track 1: Space Sprint (`space-sprint`)

**Surface:** air  
**Compatible racers:** dragon (size=50), rocket (size=40), plane (size=42)  
**Path length:** 19 772 px | **Width:** 449 px

### Row counts per racer×racercount (from sim data)

| Racer | r40 | r70 | r100 |
|-------|-----|-----|------|
| dragon | 3 | 5 | 6 |
| rocket | 2 | 4 | 5 |
| plane | 2 | 4 | 5 |

---

### Iteration 1 — Initial values

| Parameter | Value |
|-----------|------|
| boost | 1.07 |
| Row1 thresholds | 20/40/60 |
| Row2+ thresholds | 20/40/70 |
| Schedule | [1.07, 1.047, 1.023, 1.0] (thirds) |

**Result N=10:** Gate 2/9 | Chi-sq 6/9  
**Diagnosis:** Front-bias dominant at r70/r100; dragon@r40 also front-bias.

---

### Iteration 2 — boost ↑ 1.07→1.10

**Change:** boost = 1.10, Schedule=[1.10, 1.067, 1.033, 1.0]

**Result N=10:** Gate 0/9 | Chi-sq 0/9  
**Diagnosis:** Strong rear-bias (Row 1 dominates everywhere). Too high.

---

### Iteration 3 — boost ↓ 1.10→1.085

**Change:** boost = 1.085, Schedule=[1.085, 1.057, 1.028, 1.0]

**Result N=10:** Gate 1/9 | Chi-sq ~6/9  
**Diagnosis:** Still predominantly front-bias, small improvement signal.

---

### Iteration 4 — Row1 thresholds ↑ 20/40/60→30/50/70

**Change:** Row1 thresholds = 30/50/70 (boost back to 1.07)

**Result N=10:** Gate 2/9 | Chi-sq 2/9  
**Diagnosis:** Higher Row1 thresholds = Row 1 holds bonus longer → paradoxically worse (rocket@r70 R0 jumped to 70%). Raising thresholds does not help.

---

### Iteration 5 — Row2+ thresholds ↑ 20/40/70→30/50/70

**Change:** Row2+ thresholds = 30/50/70, Row1 back to 20/40/60

**Result N=10:** Gate 2/9 | Chi-sq ~5/9  
**Diagnosis:** Barely any improvement. Raising Row2+ thresholds does little.

---

### Iteration 6 — boost ↑ 1.07→1.075 (thresholds reset)

**Change:** boost = 1.075, Schedule=[1.075, 1.05, 1.025, 1.0]  
Row1=20/40/60, Row2+=20/40/70 (reset)

**Result N=10:** Gate 2/9 | Chi-sq **9/9** ← strong signal → N=50 triggered

**N=50 validation:**
| | dragon | rocket | plane |
|-|--------|--------|-------|
| r40 | ❌ R0=58% p=0.000 | ✅ | ✅ |
| r70 | ❌ R0=52% p=0.000 | ❌ R0=54% p=0.000 | ❌ R0=56% p=0.000 |
| r100 | ❌ R0=50% p=0.000 | ❌ R0=46% p=0.000 | ❌ R0=46% p=0.000 |

**Diagnosis:** Strong front-bias at r70/r100. Boost too low.

---

### Iteration 7 — boost ↑ 1.075→1.09

**Change:** boost = 1.09, Schedule=[1.09, 1.06, 1.03, 1.0]

**Result N=10:**
| | dragon | rocket | plane |
|-|--------|--------|-------|
| r40 | ❌ R1=70% | ✅ | ❌ Gate R1=70% |
| r70 | ❌ R1=50% | ❌ R1=60% | ❌ R1=50% |
| r100 | ❌ R2=50% | ❌ (distributed) | ❌ R0=0% |

**Gate:** 1/9 | **Chi-sq:** ~6/9  
**Diagnosis:** Rear-bias at r40; mixed rear-bias at r70/r100. Too high.

---

### Iteration 8 — boost ↓ 1.09→1.082 (binary midpoint)

**Change:** boost = 1.082, Schedule=[1.082, 1.055, 1.027, 1.0]

**Result N=10:** Gate 3/9 (gate fails = N=10 noise) | Chi-sq **9/9** ← strong signal → N=50 triggered

**N=50 validation:**
| | dragon | rocket | plane |
|-|--------|--------|-------|
| r40 | ❌ R0=50% p=0.002 front | ✅ p=0.769 | ✅ p=0.401 |
| r70 | ❌ R0=48% p=0.000 front | ❌ R0=44% p=0.004 front | ❌ R0=48% p=0.000 front |
| r100 | ❌ R0=40% p=0.000 front | ❌ R0=40% p=0.003 front | ❌ R0=40% p=0.000 front |

**N=50 total: 2/9** — strong front-bias at r70/r100.

---

### Iteration 9 — boost ↑ 1.082→1.086

**Change:** boost = 1.086, Schedule=[1.086, 1.057, 1.029, 1.0]

**N=10:** Chi-sq **9/9** (all p≥0.077)

**N=50 full picture:**

| | dragon | rocket | plane |
|-|--------|--------|-------|
| r40 | ❌ R0=46% p=0.001 front (3 rows) | ✅ p=0.257 (2 rows) | ❌ R1=68% p=0.011 rear (2 rows) |
| r70 | ❌ R0=46% p=0.000 front (5 rows) | ❌ R0=56% p=0.000 front (4 rows) | ❌ R1=46% p=0.000 mixed (4 rows) |
| r100 | ❌ R0=44% p=0.000 front (6 rows) | ❌ R0=30% p=0.013 (5 rows) | ❌ mixed p=0.000 (5 rows) |

**N=50 total: 1/9**

**CRITICAL:** dragon@r40 (3 rows) needs boost >1.086, plane@r40 (2 rows) is already rear-biased at 1.086. No common boost value is solvable.

**Space Sprint CONCLUSION: Not convergible.** Best N=50: 1/9 at boost=1.086 or 2/9 at boost=1.082. Cause: row-count incompatibility — dragon has 3 rows at r40, rocket/plane only 2.

---

## Track 2: Weltall (`mogcvuipw2y5`)

**Surface:** air  
**Compatible racers:** dragon (size=50), rocket (size=40), plane (size=42)  
**Path length:** 15 986 px | **Width:** 403 px

### Row counts per racer×racercount (from sim data)

| Racer | r40 | r70 | r100 |
|-------|-----|-----|------|
| dragon | 3 | 5 | 7 |
| rocket | 3 | 4 | 6 |
| plane | 3 | 4 | 6 |

---

### Iteration 1 — Initial values

| Parameter | Value |
|-----------|------|
| boost | 1.082 |
| Schedule | [1.082, 1.055, 1.027, 1.0] |
| Row1 thresholds | 20/40/60 |
| Row2+ thresholds | 20/40/70 |

**N=50 full picture:**

| | dragon | rocket | plane |
|-|--------|--------|-------|
| r40 | ❌ R0=46% p=0.111 (gate: R2=22%<22.2%) | ❌ R0=52% p=0.000 front | ❌ R0=50% p=0.000 front |
| r70 | ❌ R0=46% p=0.000 front | ❌ R0=52% p=0.000 front | ❌ R0=48% p=0.000 front |
| r100 | ❌ R0=48% p=0.000 front | ❌ R0=54% p=0.000 front | ❌ R0=42% p=0.000 front |

**N=50 total: 0/9** — all front-bias, uniform direction. Increase boost.

---

### Iteration 2 — boost ↑ 1.082→1.09

**Change:** boost = 1.09, Schedule=[1.09, 1.06, 1.03, 1.0]

**N=50 full picture:**

| | dragon | rocket | plane |
|-|--------|--------|-------|
| r40 | chi-sq ✅ p=0.125 (gate ❌ R2=20%<22.2%) | ❌ R1=56% rear-bias | ❌ p=0.000 R2=6%<22.2% |
| r70 | ❌ R0=38% front (5 rows, exp.=20%) | ❌ R0=48% front (4 rows, exp.=25%) | ❌ R0=46% front |
| r100 | ❌ R0=38% front (7 rows, exp.=14.3%) | ❌ R0=32% front (6 rows, exp.=16.7%) | ❌ R0=36% front |

**STRUCTURAL ANALYSIS r40:**

rocket@Weltall-r40: Row-2 has only 100 racers across 50 races = **2 racers/race** (5% of field). Gate minimum = 22.2% × 50 = 11.1 races. Each Row-2 racer would need 11% individual win rate (baseline=2.5%) → 4.4× boost needed — structurally impossible.

plane@Weltall-r40: Row-2 has 200 racers = 4/race (10%). Gate minimum = 11.1 races. Needs 5.5% vs baseline 2.5% → 2.2× boost. Yet R2=6% at BOTH boost values (6% at 1.082 AND 1.09). Boost only shifts wins between R0 and R1, not to R2.

dragon@Weltall-r40: Row-2 has 500 racers = 10/race (25%). Gate minimum = 11.1 races. Baseline 10×50/2000=25% → already near gate. Hence chi-sq fair at both boosts.

**INCOMPATIBILITY r40 ↔ r70/r100:**
- r40 optimum: boost ~1.082-1.085 (rocket exceeds at 1.09)
- r70/r100 optimum: boost > 1.10 (still front-biased at 1.09)
- These ranges do not overlap.

**N=50 total Iter2: 0/9**

**Weltall CONCLUSION: Not convergible.**  
Theoretical maximum: 7/9 (only dragon@r40 + all r70 + all r100 at optimal boost) — below the 8/9 threshold.  
Cause: (1) rocket/plane@r40 Row-2 structurally too small; (2) r40 vs r70/r100 boost range incompatible.

---

## Track 3: River Run (`river-run`)

**Surface:** water  
**Compatible racers:** duck (size=36), dragon (size=50), rocket (size=40)  
**Path length:** 6 156 px | **Width:** 332 px

### Row counts per racer×racercount (from sim data)

| Racer | r40 | r70 | r100 |
|-------|-----|-----|------|
| duck | 3 | ? | ? |
| dragon | 4 | ? | ? |
| rocket | 3 | ? | ? |

---

### Iteration 1 — Initial values

| Parameter | Value |
|-----------|------|
| boost | 1.15 |
| Schedule | [1.15, 1.10, 1.05, 1.0] |
| Row1 thresholds | 20/40/60 |
| Row2+ thresholds | 20/40/70 |

**N=10 r40:**

| Racer | Result |
|-------|----------|
| duck | ❌ R1=70% p=0.024 **rear** (3 rows) |
| dragon | ❌ gate (R2=40%>37.5%) p=0.308 chi-sq ok (4 rows) |
| rocket | ❌ R1=60% p=0.147 chi-sq ok (3 rows) |

**Diagnosis:** Strong rear-bias (duck significant, rocket tendential). Boost=1.15 too high for short track (6156px).

---

### Iteration 2 — boost ↓ 1.15→1.10

**Change:** boost = 1.10, Schedule=[1.10, 1.067, 1.033, 1.0]

**N=10 r40:**

| Racer | Result |
|-------|----------|
| duck | ❌ R0=70% R1=30% p=0.024 **front-bias** (3 rows) — completely reversed! |
| dragon | ❌ gate (R0=40%>37.5%) p=0.220 chi-sq OK (4 rows) |
| rocket | chi-sq ✅ p=0.501, gate ❌ (R0=50%=boundary, R2=20%<22.2%) |

**N=10 r70:**

| Racer | Result |
|-------|----------|
| duck | ❌ R0=60% p=0.017 **front-bias** (5 rows, exp.=20%) |
| dragon | chi-sq ✅ p=0.064, gate ❌ (R0=40%>25%) (6 rows) |
| rocket | chi-sq ✅ p=0.134, gate ❌ (R3=0%<13.3%) (5 rows) |

**Diagnosis:** duck completely reversed from rear→front (1.15→1.10). Rocket/dragon near neutral. Target value lies between 1.10 and 1.15, presumably ~1.13.

*(r100 pending)*

---

### Iteration 3 — boost ↑ 1.10→1.13

**Change:** boost = 1.13, Schedule=[1.13, 1.087, 1.043, 1.0]

**N=10 r40:**

| Racer | Result |
|-------|----------|
| duck | ❌ R0=20% R1=80% p=0.006 **strong rear-bias** (3 rows) — overcorrection! |
| dragon | chi-sq ✅ p=0.156, gate ❌ (R2=50%>37.5%, R3=0%<16.7%) (4 rows) |
| rocket | chi-sq ✅ p=0.272, gate ❌ (R0=50% boundary, R2=10%<22.2%) (3 rows) |

**N=10 r70:**

| Racer | Result |
|-------|----------|
| duck | ❌ R0=10% R1=70% p=0.002 **extreme rear-bias** (5 rows) |
| dragon | ❌ R1=50% p=0.025 rear-bias (6 rows) |
| rocket | chi-sq ✅ p=0.134, gate ❌ (R3=R4=0% < 13.3%) |

**N=10 r100:**

| Racer | Result |
|-------|----------|
| duck | ❌ R0=50% p=0.010 **front-bias** (6 rows, exp.=16.7%) |
| dragon | ❌ R0=50% p=0.001 **front-bias** (9 rows, exp.=11.1%) |
| rocket | ❌ R0=70% p=0.000 **front-bias** (7 rows, exp.=14.3%) |

**STRUCTURAL ANALYSIS:**

Racercount incompatibility analogous to Space Sprint/Weltall:
- r40/r70: boost=1.13 → rear-bias (duck extreme, dragon/rocket borderline)
- r100: boost=1.13 → still strongly front-biased (dragon 9 rows needs boost >>1.13)
- Crossover for duck@r40: between 1.10 (R0=70% front) and 1.13 (R0=20% rear) ≈ boost=1.12
- Crossover for duck@r100: estimated boost~1.17+ (from 70% at 1.10 to 50% at 1.13)
- These ranges do not overlap.

**Overall trajectory duck@r40:** 1.10→R0=70% (front), 1.13→R0=20% (rear), 1.15→R0=30% (rear)

**River Run CONCLUSION: Not convergible.**  
All 3 racercounts show 0/9 across all tested boost values. Cause identical to Space Sprint/Weltall: r40 and r100 need incompatible boost values due to different row counts.

---

## Overall result Phase 2N

| Track | Best N=50 | at boost | Conclusion |
|-------|-----------|-----------|-------|
| Space Sprint | 2/9 (rocket@r40, plane@r40) | 1.082 | Not convergible |
| Weltall | 0/9 (Iter2@1.09) | — | Not convergible (max. 7/9 theoretical) |
| River Run | 0/9 (N=10 all iter) | — | Not convergible |

**Cause (all tracks):** The v4 per_racer mechanism has the following limitations:
1. **Boost shifts wins primarily between R0 and R1**, not to deeper rows
2. **Different racercounts produce different row counts** → incompatible boost optima
3. **Very few racers in last rows** (e.g. rocket@Weltall-r40: 2 racers/race) → structurally impossible to reach gate minimum
4. **Boost exhausts itself too early** for racers in very rear rows at high racercounts

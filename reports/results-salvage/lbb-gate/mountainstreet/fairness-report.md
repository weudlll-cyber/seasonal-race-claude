# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-16  
**Rennen pro Kombination:** 300  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–300  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Mountainstreet | boarder | 60s | 3 | 33.3% | 31.3% | 28.0% | 40.7% | 7.8 | * (p<0.05) | ⚠️ Unequal |

---

## Detail-Auswertung pro Kombination

### Mountainstreet × boarder × 60s

- **finishT:** 0.5003 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 7.76 — * (p<0.05)

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 94 | 31.3% | 33.3% | -2.0% | 30.7 | 17.4 |
| Row 1 | 84 | 28.0% | 33.3% | -5.3% | 30.4 | 17.2 |
| Row 2 | 122 | 40.7% | 33.3% | +7.3% | 30.4 | 17.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(2) = 7.76 | * (p<0.05)


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 1500 | 1095 | 73.0% |
| B2 (Pl. 6–15) | 3000 | 2206 | 73.5% |
| B3 (Pl. 16–25) | 3000 | 2054 | 68.5% |
| B4 (Pl. 26–40) | 4500 | 3249 | 72.2% |
| B5 (Pl. 41–60) | 6000 | 5267 | 87.8% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (20R) | Row 1 (20R) | Row 2 (20R) | Gesamt |
|---|---|---|---|---|
| 1 | 94 (31.3%) | 84 (28.0%) | 122 (40.7%) | 300 |
| 2 | 112 (37.3%) | 93 (31.0%) | 95 (31.7%) | 300 |
| 3 | 87 (29.0%) | 102 (34.0%) | 111 (37.0%) | 300 |
| 4 | 112 (37.3%) | 106 (35.3%) | 82 (27.3%) | 300 |
| 5 | 90 (30.0%) | 109 (36.3%) | 101 (33.7%) | 300 |
| 6–10 | 497 (33.1%) | 483 (32.2%) | 520 (34.7%) | 1500 |
| 11–15 | 492 (32.8%) | 504 (33.6%) | 504 (33.6%) | 1500 |
| 16–25 | 1000 (33.3%) | 1050 (35.0%) | 950 (31.7%) | 3000 |
| 26–40 | 1511 (33.6%) | 1497 (33.3%) | 1492 (33.2%) | 4500 |
| 41–60 | 2005 (33.4%) | 1972 (32.9%) | 2023 (33.7%) | 6000 |
| *(erw. je Pl.1)* | 33.3% | 33.3% | 33.3% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 299 (99.7%) | 1 (0.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 2 | 284 (94.7%) | 16 (5.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 3 | 241 (80.3%) | 58 (19.3%) | 1 (0.3%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 4 | 167 (55.7%) | 131 (43.7%) | 0 (0.0%) | 0 (0.0%) | 2 (0.7%) | 300 |
| 5 | 104 (34.7%) | 195 (65.0%) | 1 (0.3%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 6–10 | 242 (16.1%) | 1241 (82.7%) | 8 (0.5%) | 5 (0.3%) | 4 (0.3%) | 1500 |
| 11–15 | 76 (5.1%) | 965 (64.3%) | 433 (28.9%) | 14 (0.9%) | 12 (0.8%) | 1500 |
| 16–25 | 54 (1.8%) | 311 (10.4%) | 2054 (68.5%) | 530 (17.7%) | 51 (1.7%) | 3000 |
| 26–40 | 28 (0.6%) | 71 (1.6%) | 488 (10.8%) | 3249 (72.2%) | 664 (14.8%) | 4500 |
| 41–60 | 5 (0.1%) | 11 (0.2%) | 15 (0.3%) | 702 (11.7%) | 5267 (87.8%) | 6000 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 1095 | 73.0% |
| Pl. 6–10 | 242 | 16.1% |
| Pl. 11–15 | 76 | 5.1% |
| Pl. 16–25 | 54 | 3.6% |
| Pl. 26–40 | 28 | 1.9% |
| Pl. 41–60 ❌ schwerer Miss | 5 | 0.3% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 374/507 (73.8%) | 340/479 (71.0%) | 381/514 (74.1%) |
| Schwerer Miss (Pl. 41+) | 1 (0.2%) | 2 (0.4%) | 2 (0.4%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 5267 | 87.8% |
| Pl. 26–40 | 664 | 11.1% |
| Pl. 16–25 | 51 | 0.9% |
| Pl. 6–15 | 16 | 0.3% |
| Pl. 1–5 ❌ Brems-Leck | 2 | 0.0% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/1987 (0.0%) | 2/1949 (0.1%) | 0/2064 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Mountainstreet | boarder | 60s | 46.2% | ⚠️ Zu wenig Mixing |

---

## Gesamtauswertung

**Getestete Kombinationen:** 1  
**Davon statistisch fair (p≥0.05):** 0  
**Davon statistisch unfair (p<0.05):** 1  

**Kombinationen mit signifikantem Ungleichgewicht (p < 0.05):**

- **Mountainstreet × boarder × 60s:** Row 0 zu selten (31.3% statt erw. 33.3%) — * (p<0.05)

---

## Empfehlung

### Front-Row-Vorteil (Row 0 gewinnt zu oft)
Keine Kombination zeigt statistisch signifikanten Front-Row-Vorteil.

### Hinter-Row-Nachteil (Row 0 gewinnt zu selten / Catch-Up überkompensiert)
Keine Kombination zeigt Hinter-Row-Nachteil oder Überkompensation.

### Catch-Up-Mechanismus (speedBonusFactor = 1.0)
Unfairness verteilt sich gleichmäßig auf kurze und lange Rennen (0 × 30s, 0 × 120s).

*Hinweis: Dieser Abschnitt enthält ausschließlich statistische Beurteilungen, keine Code-Empfehlungen.*

---

## Phase-3A — Naturalness-Metriken (Open Tracks)

Stabile Phase: 25%–95% der targetDuration. Jerk: |Δ(effSpeed)/DT| / max(baseSpeed, ε). naturalOvt: Anteil Überholungen mit tDiff ≤ 30% des Referenzabstands.

| Track | Racer | Dist | meanJerk | maxJerk | jerkHigh% | natOvt% | pulkTime% | pulkTrigIn | pulkTrigOut |
|-------|-------|------|----------|---------|-----------|---------|-----------|-----------|-------------|
| Mountainstreet | boarder | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |

---

## Lateral Quality Metrics

overlapRate: % of active pair-frames with |dT|<10%·bodyH/pathLen AND |dY|<10%·bodyW/trackW (old center-proximity metric).  
honestOverlapRate: % of pair-frames where rendered body boxes actually overlap — full body extents, all pairs, open+closed (NEW).  
overlapResolution: avg consecutive frames a pair stays in overlap before separating.  
zigzagScore: avg |physicalYVelocity change| per racer-frame (after 4s) — target < 0.003.  
lateralSpeedScore: avg |physicalYVelocity| per racer-frame (after 4s) — lower = smoother.  
brakeRate: fraction of racer-frames where speed-brake is active (after 4s) — lower = less blockage.  
stableOvertakes: confirmed lead-swaps (≥3s) per racer in 20%–80% of race — higher = more action.

| Track | Racer | Dist | N | overlapRate% | honestOverlap% | gap | overlapResolution (fr) | zigzagScore |
|-------|-------|------|---|-------------|----------------|-----|------------------------|-------------|
| Mountainstreet | boarder | 60s | 60 | 0.0% | 2.5% ⚠️ | +2.5% | 0.0 | 0.000050 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Mountainstreet | boarder | 60s | 60 | 16.5% | 73.0% | 56.5% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Mountainstreet | boarder | 60s | 18% | 74% | 507 | 15% | 71% | 479 | 16% | 74% | 514 |

# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-16  
**Rennen pro Kombination:** 100  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–100  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| City Circuit | motorbike | 60s | 4 | 25.0% | 19.0% | 36.0% | 22.5% | 8.4 | * (p<0.05) | ⚠️ Rear-Bias |

---

## Detail-Auswertung pro Kombination

### City Circuit × motorbike × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 8.40 — * (p<0.05)

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 19 | 19.0% | 25.0% | -6.0% | 19.7 | 11.4 |
| Row 1 | 36 | 36.0% | 25.0% | +11.0% | 19.6 | 11.5 |
| Row 2 | 27 | 27.0% | 25.0% | +2.0% | 20.9 | 11.9 |
| Row 3 | 18 | 18.0% | 25.0% | -7.0% | 21.8 | 11.2 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 8.40 | * (p<0.05)


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 324 | 64.8% |
| B2 (Pl. 6–15) | 1000 | 555 | 55.5% |
| B3 (Pl. 16–25) | 1000 | 515 | 51.5% |
| B4 (Pl. 26–40) | 1500 | 1071 | 71.4% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 19 (19.0%) | 36 (36.0%) | 27 (27.0%) | 18 (18.0%) | 100 |
| 2 | 25 (25.0%) | 30 (30.0%) | 28 (28.0%) | 17 (17.0%) | 100 |
| 3 | 23 (23.0%) | 31 (31.0%) | 30 (30.0%) | 16 (16.0%) | 100 |
| 4 | 33 (33.0%) | 25 (25.0%) | 27 (27.0%) | 15 (15.0%) | 100 |
| 5 | 31 (31.0%) | 27 (27.0%) | 15 (15.0%) | 27 (27.0%) | 100 |
| 6–10 | 138 (27.6%) | 127 (25.4%) | 124 (24.8%) | 111 (22.2%) | 500 |
| 11–15 | 139 (27.8%) | 120 (24.0%) | 116 (23.2%) | 125 (25.0%) | 500 |
| 16–25 | 250 (25.0%) | 253 (25.3%) | 237 (23.7%) | 260 (26.0%) | 1000 |
| 26–40 | 342 (22.8%) | 351 (23.4%) | 396 (26.4%) | 411 (27.4%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 97 (97.0%) | 0 (0.0%) | 2 (2.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 2 | 91 (91.0%) | 4 (4.0%) | 2 (2.0%) | 3 (3.0%) | 0 (0.0%) | 100 |
| 3 | 66 (66.0%) | 18 (18.0%) | 7 (7.0%) | 9 (9.0%) | 0 (0.0%) | 100 |
| 4 | 43 (43.0%) | 47 (47.0%) | 5 (5.0%) | 5 (5.0%) | 0 (0.0%) | 100 |
| 5 | 27 (27.0%) | 56 (56.0%) | 10 (10.0%) | 7 (7.0%) | 0 (0.0%) | 100 |
| 6–10 | 48 (9.6%) | 319 (63.8%) | 51 (10.2%) | 82 (16.4%) | 0 (0.0%) | 500 |
| 11–15 | 32 (6.4%) | 236 (47.2%) | 139 (27.8%) | 93 (18.6%) | 0 (0.0%) | 500 |
| 16–25 | 50 (5.0%) | 206 (20.6%) | 515 (51.5%) | 229 (22.9%) | 0 (0.0%) | 1000 |
| 26–40 | 46 (3.1%) | 114 (7.6%) | 269 (17.9%) | 1071 (71.4%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 324 | 64.8% |
| Pl. 6–10 | 48 | 9.6% |
| Pl. 11–15 | 32 | 6.4% |
| Pl. 16–25 | 50 | 10.0% |
| Pl. 26–40 | 46 | 9.2% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 76/106 (71.7%) | 103/146 (70.5%) | 91/131 (69.5%) | 54/117 (46.2%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–40 ✅ Soll erreicht | 0 | — |
| Pl. 26–40 | 0 | — |
| Pl. 16–25 | 0 | — |
| Pl. 6–15 | 0 | — |
| Pl. 1–5 ❌ Brems-Leck | 0 | — |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) |

---

## Gesamtauswertung

**Getestete Kombinationen:** 1  
**Davon statistisch fair (p≥0.05):** 0  
**Davon statistisch unfair (p<0.05):** 1  

**Kombinationen mit signifikantem Ungleichgewicht (p < 0.05):**

- **City Circuit × motorbike × 60s:** Row 0 zu selten (19.0% statt erw. 25.0%) — * (p<0.05)

---

## Empfehlung

### Front-Row-Vorteil (Row 0 gewinnt zu oft)
Keine Kombination zeigt statistisch signifikanten Front-Row-Vorteil.

### Hinter-Row-Nachteil (Row 0 gewinnt zu selten / Catch-Up überkompensiert)
- **City Circuit × motorbike × 60s** — * (p<0.05)

### Catch-Up-Mechanismus (speedBonusFactor = 1.0)
Unfairness verteilt sich gleichmäßig auf kurze und lange Rennen (0 × 30s, 0 × 120s).

*Hinweis: Dieser Abschnitt enthält ausschließlich statistische Beurteilungen, keine Code-Empfehlungen.*

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
| City Circuit | motorbike | 60s | 40 | 0.0% | 2.3% ⚠️ | +2.3% | 0.0 | 0.000086 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| City Circuit | motorbike | 60s | 40 | 16.6% | 64.8% | 48.2% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| City Circuit | motorbike | 60s | 25% | 72% | 106 | 19% | 71% | 146 | 13% | 69% | 131 | 10% | 46% | 117 |

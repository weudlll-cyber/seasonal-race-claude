# RaceArena — Fairness Simulation Report

**Datum:** 2026-07-06  
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
| Searound | manta | 60s | 7 | 15.0% | 18.0% | 17.0% | 13.0% | 4.8 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 4.83 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 18 | 18.0% | 15.0% | +3.0% | 20.4 | 12.0 |
| Row 1 | 17 | 17.0% | 15.0% | +2.0% | 20.5 | 11.6 |
| Row 2 | 20 | 20.0% | 15.0% | +5.0% | 20.9 | 11.9 |
| Row 3 | 13 | 13.0% | 15.0% | -2.0% | 20.7 | 11.7 |
| Row 4 | 14 | 14.0% | 15.0% | -1.0% | 20.4 | 11.4 |
| Row 5 | 9 | 9.0% | 12.5% | -3.5% | 19.9 | 11.0 |
| Row 6 | 9 | 9.0% | 12.5% | -3.5% | 20.7 | 11.0 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(6) = 4.83 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 402 | 80.4% |
| B2 (Pl. 6–15) | 1000 | 764 | 76.4% |
| B3 (Pl. 16–25) | 1000 | 673 | 67.3% |
| B4 (Pl. 26–40) | 1500 | 1308 | 87.2% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 18 (18.0%) | 17 (17.0%) | 20 (20.0%) | 13 (13.0%) | 14 (14.0%) | 9 (9.0%) | 9 (9.0%) | 100 |
| 2 | 20 (20.0%) | 18 (18.0%) | 15 (15.0%) | 13 (13.0%) | 15 (15.0%) | 9 (9.0%) | 10 (10.0%) | 100 |
| 3 | 15 (15.0%) | 14 (14.0%) | 14 (14.0%) | 14 (14.0%) | 19 (19.0%) | 11 (11.0%) | 13 (13.0%) | 100 |
| 4 | 16 (16.0%) | 15 (15.0%) | 18 (18.0%) | 16 (16.0%) | 8 (8.0%) | 14 (14.0%) | 13 (13.0%) | 100 |
| 5 | 11 (11.0%) | 13 (13.0%) | 14 (14.0%) | 17 (17.0%) | 21 (21.0%) | 15 (15.0%) | 9 (9.0%) | 100 |
| 6–10 | 89 (17.8%) | 67 (13.4%) | 65 (13.0%) | 84 (16.8%) | 71 (14.2%) | 64 (12.8%) | 60 (12.0%) | 500 |
| 11–15 | 67 (13.4%) | 82 (16.4%) | 69 (13.8%) | 68 (13.6%) | 74 (14.8%) | 78 (15.6%) | 62 (12.4%) | 500 |
| 16–25 | 133 (13.3%) | 153 (15.3%) | 149 (14.9%) | 142 (14.2%) | 162 (16.2%) | 124 (12.4%) | 137 (13.7%) | 1000 |
| 26–40 | 231 (15.4%) | 221 (14.7%) | 236 (15.7%) | 233 (15.5%) | 216 (14.4%) | 176 (11.7%) | 187 (12.5%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 98 (98.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 96 (96.0%) | 4 (4.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 94 (94.0%) | 4 (4.0%) | 1 (1.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 4 | 71 (71.0%) | 27 (27.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 43 (43.0%) | 55 (55.0%) | 1 (1.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 6–10 | 83 (16.6%) | 399 (79.8%) | 16 (3.2%) | 2 (0.4%) | 0 (0.0%) | 500 |
| 11–15 | 9 (1.8%) | 365 (73.0%) | 117 (23.4%) | 9 (1.8%) | 0 (0.0%) | 500 |
| 16–25 | 5 (0.5%) | 143 (14.3%) | 673 (67.3%) | 179 (17.9%) | 0 (0.0%) | 1000 |
| 26–40 | 1 (0.1%) | 1 (0.1%) | 190 (12.7%) | 1308 (87.2%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 402 | 80.4% |
| Pl. 6–10 | 83 | 16.6% |
| Pl. 11–15 | 9 | 1.8% |
| Pl. 16–25 | 5 | 1.0% |
| Pl. 26–40 | 1 | 0.2% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 60/75 (80.0%) | 65/80 (81.3%) | 62/71 (87.3%) | 63/86 (73.3%) | 60/74 (81.1%) | 48/59 (81.4%) | 44/55 (80.0%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–40 ✅ Soll erreicht | 0 | — |
| Pl. 26–40 | 0 | — |
| Pl. 16–25 | 0 | — |
| Pl. 6–15 | 0 | — |
| Pl. 1–5 ❌ Brems-Leck | 0 | — |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) |

---

## Gesamtauswertung

**Getestete Kombinationen:** 1  
**Davon statistisch fair (p≥0.05):** 1  
**Davon statistisch unfair (p<0.05):** 0  

**Befund:** Keine Kombination zeigt statistisch signifikante Unfairness. ✅

---

## Empfehlung

### Front-Row-Vorteil (Row 0 gewinnt zu oft)
Keine Kombination zeigt statistisch signifikanten Front-Row-Vorteil.

### Hinter-Row-Nachteil (Row 0 gewinnt zu selten / Catch-Up überkompensiert)
Keine Kombination zeigt Hinter-Row-Nachteil oder Überkompensation.

### Catch-Up-Mechanismus (speedBonusFactor = 1.0)
Der Catch-Up-Mechanismus wirkt auf allen getesteten Tracks und Racer-Typen ausreichend. Kein statistisch signifikanter Reihen-Bias nachweisbar.

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
| Searound | manta | 60s | 40 | 0.0% | 3.8% ⚠️ | +3.8% | 0.0 | 0.000043 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 29.6% | 80.4% | 50.8% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 27% | 80% | 75 | 30% | 81% | 80 | 41% | 87% | 71 | 34% | 73% | 86 | 34% | 81% | 74 | 17% | 81% | 59 | 20% | 80% | 55 |

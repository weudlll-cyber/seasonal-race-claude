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
| Searound | manta | 60s | 7 | 15.0% | 15.0% | 17.0% | 13.6% | 3.6 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 3.64 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 15 | 15.0% | 15.0% | +0.0% | 21.0 | 11.9 |
| Row 1 | 17 | 17.0% | 15.0% | +2.0% | 20.8 | 11.6 |
| Row 2 | 15 | 15.0% | 15.0% | +0.0% | 21.0 | 11.7 |
| Row 3 | 14 | 14.0% | 15.0% | -1.0% | 20.6 | 11.7 |
| Row 4 | 14 | 14.0% | 15.0% | -1.0% | 20.3 | 11.5 |
| Row 5 | 8 | 8.0% | 12.5% | -4.5% | 19.4 | 11.0 |
| Row 6 | 17 | 17.0% | 12.5% | +4.5% | 20.1 | 11.2 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 3.64 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 404 | 80.8% |
| B2 (Pl. 6–15) | 1000 | 762 | 76.2% |
| B3 (Pl. 16–25) | 1000 | 679 | 67.9% |
| B4 (Pl. 26–40) | 1500 | 1310 | 87.3% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 15 (15.0%) | 17 (17.0%) | 15 (15.0%) | 14 (14.0%) | 14 (14.0%) | 8 (8.0%) | 17 (17.0%) | 100 |
| 2 | 13 (13.0%) | 13 (13.0%) | 19 (19.0%) | 14 (14.0%) | 14 (14.0%) | 16 (16.0%) | 11 (11.0%) | 100 |
| 3 | 19 (19.0%) | 13 (13.0%) | 13 (13.0%) | 16 (16.0%) | 13 (13.0%) | 12 (12.0%) | 14 (14.0%) | 100 |
| 4 | 10 (10.0%) | 17 (17.0%) | 11 (11.0%) | 17 (17.0%) | 15 (15.0%) | 15 (15.0%) | 15 (15.0%) | 100 |
| 5 | 11 (11.0%) | 14 (14.0%) | 14 (14.0%) | 22 (22.0%) | 17 (17.0%) | 10 (10.0%) | 12 (12.0%) | 100 |
| 6–10 | 91 (18.2%) | 74 (14.8%) | 67 (13.4%) | 70 (14.0%) | 77 (15.4%) | 68 (13.6%) | 53 (10.6%) | 500 |
| 11–15 | 64 (12.8%) | 65 (13.0%) | 75 (15.0%) | 72 (14.4%) | 82 (16.4%) | 76 (15.2%) | 66 (13.2%) | 500 |
| 16–25 | 134 (13.4%) | 165 (16.5%) | 158 (15.8%) | 141 (14.1%) | 145 (14.5%) | 126 (12.6%) | 131 (13.1%) | 1000 |
| 26–40 | 243 (16.2%) | 222 (14.8%) | 228 (15.2%) | 234 (15.6%) | 223 (14.9%) | 169 (11.3%) | 181 (12.1%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 98 (98.0%) | 1 (1.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 96 (96.0%) | 3 (3.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 89 (89.0%) | 8 (8.0%) | 3 (3.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 69 (69.0%) | 28 (28.0%) | 1 (1.0%) | 2 (2.0%) | 0 (0.0%) | 100 |
| 5 | 52 (52.0%) | 48 (48.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 70 (14.0%) | 399 (79.8%) | 22 (4.4%) | 9 (1.8%) | 0 (0.0%) | 500 |
| 11–15 | 20 (4.0%) | 363 (72.6%) | 106 (21.2%) | 11 (2.2%) | 0 (0.0%) | 500 |
| 16–25 | 4 (0.4%) | 149 (14.9%) | 679 (67.9%) | 168 (16.8%) | 0 (0.0%) | 1000 |
| 26–40 | 2 (0.1%) | 1 (0.1%) | 187 (12.5%) | 1310 (87.3%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 404 | 80.8% |
| Pl. 6–10 | 70 | 14.0% |
| Pl. 11–15 | 20 | 4.0% |
| Pl. 16–25 | 4 | 0.8% |
| Pl. 26–40 | 2 | 0.4% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 54/75 (72.0%) | 63/80 (78.8%) | 60/71 (84.5%) | 64/86 (74.4%) | 61/74 (82.4%) | 50/59 (84.7%) | 52/55 (94.5%) |
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
| Searound | manta | 60s | 40 | 0.0% | 7.4% ⚠️ | +7.4% | 1.1 | 0.000021 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 30.6% | 80.8% | 50.2% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 37% | 72% | 75 | 30% | 79% | 80 | 35% | 85% | 71 | 26% | 74% | 86 | 36% | 82% | 74 | 17% | 85% | 59 | 31% | 95% | 55 |

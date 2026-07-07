# RaceArena — Fairness Simulation Report

**Datum:** 2026-07-03  
**Rennen pro Kombination:** 50  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–50  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Searound | manta | 60s | 7 | 15.0% | 12.0% | 20.0% | 13.6% | 8.8 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 8.83 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 12.0% | 15.0% | -3.0% | 21.4 | 11.4 |
| Row 1 | 10 | 20.0% | 15.0% | +5.0% | 20.0 | 11.9 |
| Row 2 | 3 | 6.0% | 15.0% | -9.0% | 21.0 | 11.7 |
| Row 3 | 5 | 10.0% | 15.0% | -5.0% | 20.0 | 11.0 |
| Row 4 | 12 | 24.0% | 15.0% | +9.0% | 20.6 | 11.9 |
| Row 5 | 5 | 10.0% | 12.5% | -2.5% | 20.3 | 11.8 |
| Row 6 | 9 | 18.0% | 12.5% | +5.5% | 20.1 | 11.2 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 8.83 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 250 | 212 | 84.8% |
| B2 (Pl. 6–15) | 500 | 403 | 80.6% |
| B3 (Pl. 16–25) | 500 | 360 | 72.0% |
| B4 (Pl. 26–40) | 750 | 665 | 88.7% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 6 (12.0%) | 10 (20.0%) | 3 (6.0%) | 5 (10.0%) | 12 (24.0%) | 5 (10.0%) | 9 (18.0%) | 50 |
| 2 | 3 (6.0%) | 7 (14.0%) | 14 (28.0%) | 5 (10.0%) | 8 (16.0%) | 8 (16.0%) | 5 (10.0%) | 50 |
| 3 | 2 (4.0%) | 10 (20.0%) | 8 (16.0%) | 10 (20.0%) | 9 (18.0%) | 5 (10.0%) | 6 (12.0%) | 50 |
| 4 | 10 (20.0%) | 7 (14.0%) | 4 (8.0%) | 9 (18.0%) | 5 (10.0%) | 8 (16.0%) | 7 (14.0%) | 50 |
| 5 | 5 (10.0%) | 11 (22.0%) | 9 (18.0%) | 8 (16.0%) | 5 (10.0%) | 5 (10.0%) | 7 (14.0%) | 50 |
| 6–10 | 38 (15.2%) | 38 (15.2%) | 37 (14.8%) | 31 (12.4%) | 40 (16.0%) | 37 (14.8%) | 29 (11.6%) | 250 |
| 11–15 | 38 (15.2%) | 35 (14.0%) | 30 (12.0%) | 49 (19.6%) | 36 (14.4%) | 33 (13.2%) | 29 (11.6%) | 250 |
| 16–25 | 76 (15.2%) | 73 (14.6%) | 77 (15.4%) | 81 (16.2%) | 64 (12.8%) | 59 (11.8%) | 70 (14.0%) | 500 |
| 26–40 | 122 (16.3%) | 109 (14.5%) | 118 (15.7%) | 102 (13.6%) | 121 (16.1%) | 90 (12.0%) | 88 (11.7%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 50 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 2 | 48 (96.0%) | 2 (4.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 3 | 46 (92.0%) | 3 (6.0%) | 1 (2.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 4 | 37 (74.0%) | 13 (26.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 5 | 31 (62.0%) | 19 (38.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 6–10 | 34 (13.6%) | 213 (85.2%) | 2 (0.8%) | 1 (0.4%) | 0 (0.0%) | 250 |
| 11–15 | 2 (0.8%) | 190 (76.0%) | 55 (22.0%) | 3 (1.2%) | 0 (0.0%) | 250 |
| 16–25 | 1 (0.2%) | 58 (11.6%) | 360 (72.0%) | 81 (16.2%) | 0 (0.0%) | 500 |
| 26–40 | 1 (0.1%) | 2 (0.3%) | 82 (10.9%) | 665 (88.7%) | 0 (0.0%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 212 | 84.8% |
| Pl. 6–10 | 34 | 13.6% |
| Pl. 11–15 | 2 | 0.8% |
| Pl. 16–25 | 1 | 0.4% |
| Pl. 26–40 | 1 | 0.4% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 22/31 (71.0%) | 38/45 (84.4%) | 34/39 (87.2%) | 29/34 (85.3%) | 35/42 (83.3%) | 25/29 (86.2%) | 29/30 (96.7%) |
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
| Searound | manta | 60s | 40 | 0.0% | 3.8% ⚠️ | +3.8% | 0.0 | 0.000070 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 29.6% | 84.8% | 55.2% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 29% | 71% | 31 | 22% | 84% | 45 | 33% | 87% | 39 | 29% | 85% | 34 | 29% | 83% | 42 | 31% | 86% | 29 | 37% | 97% | 30 |

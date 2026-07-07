# RaceArena — Fairness Simulation Report

**Datum:** 2026-07-05  
**Rennen pro Kombination:** 30  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–30  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Searound | manta | 60s | 7 | 15.0% | 16.7% | 16.7% | 13.3% | 2.8 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 2.76 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 16.7% | 15.0% | +1.7% | 20.1 | 12.0 |
| Row 1 | 5 | 16.7% | 15.0% | +1.7% | 20.2 | 11.6 |
| Row 2 | 5 | 16.7% | 15.0% | +1.7% | 21.3 | 12.3 |
| Row 3 | 6 | 20.0% | 15.0% | +5.0% | 21.2 | 11.7 |
| Row 4 | 4 | 13.3% | 15.0% | -1.7% | 20.2 | 11.4 |
| Row 5 | 1 | 3.3% | 12.5% | -9.2% | 20.3 | 10.7 |
| Row 6 | 4 | 13.3% | 12.5% | +0.8% | 20.0 | 11.0 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 2.76 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 150 | 121 | 80.7% |
| B2 (Pl. 6–15) | 300 | 229 | 76.3% |
| B3 (Pl. 16–25) | 300 | 194 | 64.7% |
| B4 (Pl. 26–40) | 450 | 388 | 86.2% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 5 (16.7%) | 5 (16.7%) | 5 (16.7%) | 6 (20.0%) | 4 (13.3%) | 1 (3.3%) | 4 (13.3%) | 30 |
| 2 | 3 (10.0%) | 6 (20.0%) | 7 (23.3%) | 2 (6.7%) | 5 (16.7%) | 4 (13.3%) | 3 (10.0%) | 30 |
| 3 | 5 (16.7%) | 2 (6.7%) | 5 (16.7%) | 6 (20.0%) | 7 (23.3%) | 1 (3.3%) | 4 (13.3%) | 30 |
| 4 | 6 (20.0%) | 8 (26.7%) | 4 (13.3%) | 1 (3.3%) | 6 (20.0%) | 2 (6.7%) | 3 (10.0%) | 30 |
| 5 | 5 (16.7%) | 4 (13.3%) | 6 (20.0%) | 7 (23.3%) | 0 (0.0%) | 3 (10.0%) | 5 (16.7%) | 30 |
| 6–10 | 29 (19.3%) | 23 (15.3%) | 18 (12.0%) | 24 (16.0%) | 23 (15.3%) | 21 (14.0%) | 12 (8.0%) | 150 |
| 11–15 | 21 (14.0%) | 18 (12.0%) | 17 (11.3%) | 18 (12.0%) | 24 (16.0%) | 26 (17.3%) | 26 (17.3%) | 150 |
| 16–25 | 39 (13.0%) | 51 (17.0%) | 48 (16.0%) | 39 (13.0%) | 46 (15.3%) | 33 (11.0%) | 44 (14.7%) | 300 |
| 26–40 | 67 (14.9%) | 63 (14.0%) | 70 (15.6%) | 77 (17.1%) | 65 (14.4%) | 59 (13.1%) | 49 (10.9%) | 450 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 30 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 2 | 27 (90.0%) | 3 (10.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 3 | 25 (83.3%) | 4 (13.3%) | 1 (3.3%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 4 | 26 (86.7%) | 4 (13.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 5 | 13 (43.3%) | 16 (53.3%) | 0 (0.0%) | 1 (3.3%) | 0 (0.0%) | 30 |
| 6–10 | 20 (13.3%) | 122 (81.3%) | 6 (4.0%) | 2 (1.3%) | 0 (0.0%) | 150 |
| 11–15 | 4 (2.7%) | 107 (71.3%) | 38 (25.3%) | 1 (0.7%) | 0 (0.0%) | 150 |
| 16–25 | 4 (1.3%) | 44 (14.7%) | 194 (64.7%) | 58 (19.3%) | 0 (0.0%) | 300 |
| 26–40 | 1 (0.2%) | 0 (0.0%) | 61 (13.6%) | 388 (86.2%) | 0 (0.0%) | 450 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 121 | 80.7% |
| Pl. 6–10 | 20 | 13.3% |
| Pl. 11–15 | 4 | 2.7% |
| Pl. 16–25 | 4 | 2.7% |
| Pl. 26–40 | 1 | 0.7% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 18/22 (81.8%) | 21/22 (95.5%) | 19/20 (95.0%) | 18/25 (72.0%) | 21/28 (75.0%) | 9/14 (64.3%) | 15/19 (78.9%) |
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
| Searound | manta | 60s | 40 | 0.0% | 4.0% ⚠️ | +4.0% | 0.0 | 0.000041 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 29.3% | 80.7% | 51.3% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 41% | 82% | 22 | 27% | 95% | 22 | 30% | 95% | 20 | 28% | 72% | 25 | 25% | 75% | 28 | 14% | 64% | 14 | 37% | 79% | 19 |

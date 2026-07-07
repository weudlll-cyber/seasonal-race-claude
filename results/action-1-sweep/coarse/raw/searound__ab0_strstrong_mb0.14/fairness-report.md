# RaceArena — Fairness Simulation Report

**Datum:** 2026-07-06  
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
| Searound | manta | 60s | 7 | 15.0% | 16.7% | 16.7% | 13.3% | 3.6 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 3.64 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 16.7% | 15.0% | +1.7% | 20.6 | 11.7 |
| Row 1 | 5 | 16.7% | 15.0% | +1.7% | 20.2 | 11.3 |
| Row 2 | 4 | 13.3% | 15.0% | -1.7% | 20.7 | 12.2 |
| Row 3 | 7 | 23.3% | 15.0% | +8.3% | 21.2 | 12.1 |
| Row 4 | 4 | 13.3% | 15.0% | -1.7% | 20.5 | 11.4 |
| Row 5 | 1 | 3.3% | 12.5% | -9.2% | 20.1 | 10.7 |
| Row 6 | 4 | 13.3% | 12.5% | +0.8% | 20.0 | 11.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 3.64 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 150 | 120 | 80.0% |
| B2 (Pl. 6–15) | 300 | 232 | 77.3% |
| B3 (Pl. 16–25) | 300 | 202 | 67.3% |
| B4 (Pl. 26–40) | 450 | 397 | 88.2% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 5 (16.7%) | 5 (16.7%) | 4 (13.3%) | 7 (23.3%) | 4 (13.3%) | 1 (3.3%) | 4 (13.3%) | 30 |
| 2 | 3 (10.0%) | 3 (10.0%) | 6 (20.0%) | 3 (10.0%) | 5 (16.7%) | 3 (10.0%) | 7 (23.3%) | 30 |
| 3 | 5 (16.7%) | 6 (20.0%) | 5 (16.7%) | 4 (13.3%) | 5 (16.7%) | 2 (6.7%) | 3 (10.0%) | 30 |
| 4 | 5 (16.7%) | 3 (10.0%) | 4 (13.3%) | 5 (16.7%) | 5 (16.7%) | 3 (10.0%) | 5 (16.7%) | 30 |
| 5 | 2 (6.7%) | 9 (30.0%) | 4 (13.3%) | 5 (16.7%) | 5 (16.7%) | 3 (10.0%) | 2 (6.7%) | 30 |
| 6–10 | 27 (18.0%) | 16 (10.7%) | 25 (16.7%) | 26 (17.3%) | 16 (10.7%) | 22 (14.7%) | 18 (12.0%) | 150 |
| 11–15 | 20 (13.3%) | 24 (16.0%) | 24 (16.0%) | 14 (9.3%) | 27 (18.0%) | 25 (16.7%) | 16 (10.7%) | 150 |
| 16–25 | 43 (14.3%) | 48 (16.0%) | 39 (13.0%) | 42 (14.0%) | 46 (15.3%) | 42 (14.0%) | 40 (13.3%) | 300 |
| 26–40 | 70 (15.6%) | 66 (14.7%) | 69 (15.3%) | 74 (16.4%) | 67 (14.9%) | 49 (10.9%) | 55 (12.2%) | 450 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 30 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 2 | 26 (86.7%) | 1 (3.3%) | 2 (6.7%) | 1 (3.3%) | 0 (0.0%) | 30 |
| 3 | 26 (86.7%) | 3 (10.0%) | 1 (3.3%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 4 | 24 (80.0%) | 5 (16.7%) | 1 (3.3%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 5 | 14 (46.7%) | 16 (53.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 6–10 | 17 (11.3%) | 126 (84.0%) | 5 (3.3%) | 2 (1.3%) | 0 (0.0%) | 150 |
| 11–15 | 3 (2.0%) | 106 (70.7%) | 39 (26.0%) | 2 (1.3%) | 0 (0.0%) | 150 |
| 16–25 | 8 (2.7%) | 42 (14.0%) | 202 (67.3%) | 48 (16.0%) | 0 (0.0%) | 300 |
| 26–40 | 2 (0.4%) | 1 (0.2%) | 50 (11.1%) | 397 (88.2%) | 0 (0.0%) | 450 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 120 | 80.0% |
| Pl. 6–10 | 17 | 11.3% |
| Pl. 11–15 | 3 | 2.0% |
| Pl. 16–25 | 8 | 5.3% |
| Pl. 26–40 | 2 | 1.3% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 19/22 (86.4%) | 19/22 (86.4%) | 18/20 (90.0%) | 18/25 (72.0%) | 20/28 (71.4%) | 10/14 (71.4%) | 16/19 (84.2%) |
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
| Searound | manta | 60s | 40 | 0.0% | 6.2% ⚠️ | +6.2% | 2.8 | 0.000030 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 30.7% | 80.0% | 49.3% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 45% | 86% | 22 | 36% | 86% | 22 | 35% | 90% | 20 | 24% | 72% | 25 | 29% | 71% | 28 | 21% | 71% | 14 | 21% | 84% | 19 |

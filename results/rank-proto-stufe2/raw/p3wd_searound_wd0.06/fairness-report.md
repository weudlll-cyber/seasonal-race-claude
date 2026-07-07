# RaceArena — Fairness Simulation Report

**Datum:** 2026-07-06  
**Rennen pro Kombination:** 15  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–15  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Searound | manta | 60s | 7 | 15.0% | 13.3% | 13.3% | 14.7% | 6.4 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 6.42 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 13.3% | 15.0% | -1.7% | 21.0 | 11.1 |
| Row 1 | 2 | 13.3% | 15.0% | -1.7% | 20.6 | 12.0 |
| Row 2 | 1 | 6.7% | 15.0% | -8.3% | 21.6 | 12.1 |
| Row 3 | 4 | 26.7% | 15.0% | +11.7% | 21.4 | 12.2 |
| Row 4 | 2 | 13.3% | 15.0% | -1.7% | 19.5 | 11.0 |
| Row 5 | 0 | 0.0% | 12.5% | -12.5% | 20.5 | 10.9 |
| Row 6 | 4 | 26.7% | 12.5% | +14.2% | 18.7 | 11.5 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(6) = 6.42 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 75 | 60 | 80.0% |
| B2 (Pl. 6–15) | 150 | 115 | 76.7% |
| B3 (Pl. 16–25) | 150 | 96 | 64.0% |
| B4 (Pl. 26–40) | 225 | 192 | 85.3% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 2 (13.3%) | 2 (13.3%) | 1 (6.7%) | 4 (26.7%) | 2 (13.3%) | 0 (0.0%) | 4 (26.7%) | 15 |
| 2 | 1 (6.7%) | 3 (20.0%) | 5 (33.3%) | 0 (0.0%) | 2 (13.3%) | 3 (20.0%) | 1 (6.7%) | 15 |
| 3 | 3 (20.0%) | 2 (13.3%) | 3 (20.0%) | 1 (6.7%) | 2 (13.3%) | 1 (6.7%) | 3 (20.0%) | 15 |
| 4 | 0 (0.0%) | 2 (13.3%) | 0 (0.0%) | 5 (33.3%) | 4 (26.7%) | 1 (6.7%) | 3 (20.0%) | 15 |
| 5 | 1 (6.7%) | 3 (20.0%) | 3 (20.0%) | 3 (20.0%) | 1 (6.7%) | 1 (6.7%) | 3 (20.0%) | 15 |
| 6–10 | 17 (22.7%) | 11 (14.7%) | 9 (12.0%) | 12 (16.0%) | 10 (13.3%) | 9 (12.0%) | 7 (9.3%) | 75 |
| 11–15 | 5 (6.7%) | 11 (14.7%) | 8 (10.7%) | 8 (10.7%) | 16 (21.3%) | 15 (20.0%) | 12 (16.0%) | 75 |
| 16–25 | 25 (16.7%) | 22 (14.7%) | 25 (16.7%) | 19 (12.7%) | 24 (16.0%) | 19 (12.7%) | 16 (10.7%) | 150 |
| 26–40 | 36 (16.0%) | 34 (15.1%) | 36 (16.0%) | 38 (16.9%) | 29 (12.9%) | 26 (11.6%) | 26 (11.6%) | 225 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 15 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 2 | 14 (93.3%) | 1 (6.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 3 | 13 (86.7%) | 0 (0.0%) | 2 (13.3%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 4 | 13 (86.7%) | 2 (13.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 5 | 5 (33.3%) | 10 (66.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 6–10 | 10 (13.3%) | 62 (82.7%) | 1 (1.3%) | 2 (2.7%) | 0 (0.0%) | 75 |
| 11–15 | 3 (4.0%) | 53 (70.7%) | 18 (24.0%) | 1 (1.3%) | 0 (0.0%) | 75 |
| 16–25 | 2 (1.3%) | 22 (14.7%) | 96 (64.0%) | 30 (20.0%) | 0 (0.0%) | 150 |
| 26–40 | 0 (0.0%) | 0 (0.0%) | 33 (14.7%) | 192 (85.3%) | 0 (0.0%) | 225 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 60 | 80.0% |
| Pl. 6–10 | 10 | 13.3% |
| Pl. 11–15 | 3 | 4.0% |
| Pl. 16–25 | 2 | 2.7% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 5/9 (55.6%) | 11/11 (100.0%) | 8/10 (80.0%) | 10/14 (71.4%) | 10/12 (83.3%) | 6/8 (75.0%) | 10/11 (90.9%) |
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
| Searound | manta | 60s | 40 | 0.0% | 7.4% ⚠️ | +7.4% | 1.8 | 0.000020 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 24.0% | 80.0% | 56.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 22% | 56% | 9 | 18% | 100% | 11 | 40% | 80% | 10 | 21% | 71% | 14 | 33% | 83% | 12 | 0% | 75% | 8 | 27% | 91% | 11 |

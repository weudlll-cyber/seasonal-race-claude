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
| Searound | manta | 60s | 7 | 15.0% | 6.7% | 13.3% | 16.0% | 9.9 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 9.89 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 1 | 6.7% | 15.0% | -8.3% | 21.0 | 10.7 |
| Row 1 | 2 | 13.3% | 15.0% | -1.7% | 20.7 | 11.7 |
| Row 2 | 1 | 6.7% | 15.0% | -8.3% | 22.1 | 12.3 |
| Row 3 | 4 | 26.7% | 15.0% | +11.7% | 21.0 | 12.6 |
| Row 4 | 2 | 13.3% | 15.0% | -1.7% | 19.4 | 11.1 |
| Row 5 | 0 | 0.0% | 12.5% | -12.5% | 20.1 | 10.9 |
| Row 6 | 5 | 33.3% | 12.5% | +20.8% | 18.8 | 11.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(6) = 9.89 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 75 | 62 | 82.7% |
| B2 (Pl. 6–15) | 150 | 121 | 80.7% |
| B3 (Pl. 16–25) | 150 | 104 | 69.3% |
| B4 (Pl. 26–40) | 225 | 196 | 87.1% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 (6.7%) | 2 (13.3%) | 1 (6.7%) | 4 (26.7%) | 2 (13.3%) | 0 (0.0%) | 5 (33.3%) | 15 |
| 2 | 2 (13.3%) | 3 (20.0%) | 3 (20.0%) | 1 (6.7%) | 4 (26.7%) | 2 (13.3%) | 0 (0.0%) | 15 |
| 3 | 0 (0.0%) | 2 (13.3%) | 3 (20.0%) | 4 (26.7%) | 0 (0.0%) | 2 (13.3%) | 4 (26.7%) | 15 |
| 4 | 2 (13.3%) | 3 (20.0%) | 2 (13.3%) | 0 (0.0%) | 4 (26.7%) | 2 (13.3%) | 2 (13.3%) | 15 |
| 5 | 2 (13.3%) | 1 (6.7%) | 4 (26.7%) | 3 (20.0%) | 4 (26.7%) | 0 (0.0%) | 1 (6.7%) | 15 |
| 6–10 | 12 (16.0%) | 11 (14.7%) | 9 (12.0%) | 13 (17.3%) | 9 (12.0%) | 11 (14.7%) | 10 (13.3%) | 75 |
| 11–15 | 11 (14.7%) | 11 (14.7%) | 7 (9.3%) | 10 (13.3%) | 12 (16.0%) | 14 (18.7%) | 10 (13.3%) | 75 |
| 16–25 | 26 (17.3%) | 24 (16.0%) | 21 (14.0%) | 16 (10.7%) | 26 (17.3%) | 18 (12.0%) | 19 (12.7%) | 150 |
| 26–40 | 34 (15.1%) | 33 (14.7%) | 40 (17.8%) | 39 (17.3%) | 29 (12.9%) | 26 (11.6%) | 24 (10.7%) | 225 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 15 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 2 | 15 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 3 | 12 (80.0%) | 0 (0.0%) | 2 (13.3%) | 1 (6.7%) | 0 (0.0%) | 15 |
| 4 | 10 (66.7%) | 4 (26.7%) | 1 (6.7%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 5 | 10 (66.7%) | 5 (33.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 6–10 | 10 (13.3%) | 63 (84.0%) | 1 (1.3%) | 1 (1.3%) | 0 (0.0%) | 75 |
| 11–15 | 2 (2.7%) | 58 (77.3%) | 14 (18.7%) | 1 (1.3%) | 0 (0.0%) | 75 |
| 16–25 | 1 (0.7%) | 19 (12.7%) | 104 (69.3%) | 26 (17.3%) | 0 (0.0%) | 150 |
| 26–40 | 0 (0.0%) | 1 (0.4%) | 28 (12.4%) | 196 (87.1%) | 0 (0.0%) | 225 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 62 | 82.7% |
| Pl. 6–10 | 10 | 13.3% |
| Pl. 11–15 | 2 | 2.7% |
| Pl. 16–25 | 1 | 1.3% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 6/9 (66.7%) | 10/11 (90.9%) | 8/10 (80.0%) | 11/14 (78.6%) | 11/12 (91.7%) | 5/8 (62.5%) | 11/11 (100.0%) |
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
| Searound | manta | 60s | 40 | 0.0% | 6.5% ⚠️ | +6.5% | 0.3 | 0.000024 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 22.7% | 82.7% | 60.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 11% | 67% | 9 | 9% | 91% | 11 | 40% | 80% | 10 | 29% | 79% | 14 | 25% | 92% | 12 | 25% | 63% | 8 | 18% | 100% | 11 |

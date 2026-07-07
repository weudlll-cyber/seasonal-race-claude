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
| Searound | manta | 60s | 7 | 15.0% | 13.3% | 6.7% | 16.0% | 4.9 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 4.91 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 13.3% | 15.0% | -1.7% | 21.7 | 11.4 |
| Row 1 | 1 | 6.7% | 15.0% | -8.3% | 20.0 | 11.2 |
| Row 2 | 2 | 13.3% | 15.0% | -1.7% | 21.9 | 12.1 |
| Row 3 | 4 | 26.7% | 15.0% | +11.7% | 21.2 | 12.5 |
| Row 4 | 3 | 20.0% | 15.0% | +5.0% | 19.0 | 11.2 |
| Row 5 | 0 | 0.0% | 12.5% | -12.5% | 20.5 | 10.9 |
| Row 6 | 3 | 20.0% | 12.5% | +7.5% | 19.1 | 11.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(6) = 4.91 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 75 | 60 | 80.0% |
| B2 (Pl. 6–15) | 150 | 113 | 75.3% |
| B3 (Pl. 16–25) | 150 | 100 | 66.7% |
| B4 (Pl. 26–40) | 225 | 194 | 86.2% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 2 (13.3%) | 1 (6.7%) | 2 (13.3%) | 4 (26.7%) | 3 (20.0%) | 0 (0.0%) | 3 (20.0%) | 15 |
| 2 | 0 (0.0%) | 4 (26.7%) | 4 (26.7%) | 0 (0.0%) | 3 (20.0%) | 1 (6.7%) | 3 (20.0%) | 15 |
| 3 | 3 (20.0%) | 2 (13.3%) | 2 (13.3%) | 3 (20.0%) | 2 (13.3%) | 1 (6.7%) | 2 (13.3%) | 15 |
| 4 | 2 (13.3%) | 2 (13.3%) | 1 (6.7%) | 3 (20.0%) | 2 (13.3%) | 3 (20.0%) | 2 (13.3%) | 15 |
| 5 | 3 (20.0%) | 2 (13.3%) | 2 (13.3%) | 2 (13.3%) | 3 (20.0%) | 2 (13.3%) | 1 (6.7%) | 15 |
| 6–10 | 11 (14.7%) | 12 (16.0%) | 11 (14.7%) | 15 (20.0%) | 9 (12.0%) | 7 (9.3%) | 10 (13.3%) | 75 |
| 11–15 | 7 (9.3%) | 10 (13.3%) | 6 (8.0%) | 7 (9.3%) | 17 (22.7%) | 17 (22.7%) | 11 (14.7%) | 75 |
| 16–25 | 25 (16.7%) | 27 (18.0%) | 25 (16.7%) | 15 (10.0%) | 22 (14.7%) | 17 (11.3%) | 19 (12.7%) | 150 |
| 26–40 | 37 (16.4%) | 30 (13.3%) | 37 (16.4%) | 41 (18.2%) | 29 (12.9%) | 27 (12.0%) | 24 (10.7%) | 225 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 15 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 2 | 14 (93.3%) | 0 (0.0%) | 1 (6.7%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 3 | 12 (80.0%) | 2 (13.3%) | 0 (0.0%) | 1 (6.7%) | 0 (0.0%) | 15 |
| 4 | 12 (80.0%) | 3 (20.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 5 | 7 (46.7%) | 8 (53.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 6–10 | 13 (17.3%) | 60 (80.0%) | 1 (1.3%) | 1 (1.3%) | 0 (0.0%) | 75 |
| 11–15 | 1 (1.3%) | 53 (70.7%) | 19 (25.3%) | 2 (2.7%) | 0 (0.0%) | 75 |
| 16–25 | 0 (0.0%) | 23 (15.3%) | 100 (66.7%) | 27 (18.0%) | 0 (0.0%) | 150 |
| 26–40 | 1 (0.4%) | 1 (0.4%) | 29 (12.9%) | 194 (86.2%) | 0 (0.0%) | 225 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 60 | 80.0% |
| Pl. 6–10 | 13 | 17.3% |
| Pl. 11–15 | 1 | 1.3% |
| Pl. 16–25 | 0 | 0.0% |
| Pl. 26–40 | 1 | 1.3% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 7/9 (77.8%) | 9/11 (81.8%) | 7/10 (70.0%) | 10/14 (71.4%) | 10/12 (83.3%) | 7/8 (87.5%) | 10/11 (90.9%) |
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
| Searound | manta | 60s | 40 | 0.0% | 7.5% ⚠️ | +7.5% | 0.0 | 0.000021 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 25.3% | 80.0% | 54.7% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 22% | 78% | 9 | 9% | 82% | 11 | 30% | 70% | 10 | 21% | 71% | 14 | 33% | 83% | 12 | 25% | 88% | 8 | 36% | 91% | 11 |

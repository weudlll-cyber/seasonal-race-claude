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
| Searound | manta | 60s | 7 | 15.0% | 16.7% | 16.7% | 13.3% | 1.6 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 1.56 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 16.7% | 15.0% | +1.7% | 20.7 | 11.6 |
| Row 1 | 5 | 16.7% | 15.0% | +1.7% | 21.0 | 11.4 |
| Row 2 | 4 | 13.3% | 15.0% | -1.7% | 21.0 | 12.1 |
| Row 3 | 6 | 20.0% | 15.0% | +5.0% | 21.1 | 11.9 |
| Row 4 | 4 | 13.3% | 15.0% | -1.7% | 19.9 | 11.8 |
| Row 5 | 2 | 6.7% | 12.5% | -5.8% | 19.9 | 10.8 |
| Row 6 | 4 | 13.3% | 12.5% | +0.8% | 19.8 | 11.2 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 1.56 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 150 | 118 | 78.7% |
| B2 (Pl. 6–15) | 300 | 233 | 77.7% |
| B3 (Pl. 16–25) | 300 | 211 | 70.3% |
| B4 (Pl. 26–40) | 450 | 393 | 87.3% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 5 (16.7%) | 5 (16.7%) | 4 (13.3%) | 6 (20.0%) | 4 (13.3%) | 2 (6.7%) | 4 (13.3%) | 30 |
| 2 | 3 (10.0%) | 3 (10.0%) | 6 (20.0%) | 4 (13.3%) | 6 (20.0%) | 3 (10.0%) | 5 (16.7%) | 30 |
| 3 | 4 (13.3%) | 4 (13.3%) | 6 (20.0%) | 5 (16.7%) | 6 (20.0%) | 2 (6.7%) | 3 (10.0%) | 30 |
| 4 | 1 (3.3%) | 3 (10.0%) | 3 (10.0%) | 5 (16.7%) | 8 (26.7%) | 4 (13.3%) | 6 (20.0%) | 30 |
| 5 | 5 (16.7%) | 7 (23.3%) | 5 (16.7%) | 4 (13.3%) | 5 (16.7%) | 2 (6.7%) | 2 (6.7%) | 30 |
| 6–10 | 30 (20.0%) | 19 (12.7%) | 22 (14.7%) | 19 (12.7%) | 22 (14.7%) | 24 (16.0%) | 14 (9.3%) | 150 |
| 11–15 | 25 (16.7%) | 22 (14.7%) | 18 (12.0%) | 22 (14.7%) | 21 (14.0%) | 20 (13.3%) | 22 (14.7%) | 150 |
| 16–25 | 36 (12.0%) | 49 (16.3%) | 45 (15.0%) | 44 (14.7%) | 42 (14.0%) | 43 (14.3%) | 41 (13.7%) | 300 |
| 26–40 | 71 (15.8%) | 68 (15.1%) | 71 (15.8%) | 71 (15.8%) | 66 (14.7%) | 50 (11.1%) | 53 (11.8%) | 450 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 29 (96.7%) | 0 (0.0%) | 0 (0.0%) | 1 (3.3%) | 0 (0.0%) | 30 |
| 2 | 28 (93.3%) | 1 (3.3%) | 1 (3.3%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 3 | 28 (93.3%) | 1 (3.3%) | 0 (0.0%) | 1 (3.3%) | 0 (0.0%) | 30 |
| 4 | 19 (63.3%) | 9 (30.0%) | 0 (0.0%) | 2 (6.7%) | 0 (0.0%) | 30 |
| 5 | 14 (46.7%) | 12 (40.0%) | 2 (6.7%) | 2 (6.7%) | 0 (0.0%) | 30 |
| 6–10 | 20 (13.3%) | 123 (82.0%) | 3 (2.0%) | 4 (2.7%) | 0 (0.0%) | 150 |
| 11–15 | 7 (4.7%) | 110 (73.3%) | 30 (20.0%) | 3 (2.0%) | 0 (0.0%) | 150 |
| 16–25 | 4 (1.3%) | 41 (13.7%) | 211 (70.3%) | 44 (14.7%) | 0 (0.0%) | 300 |
| 26–40 | 1 (0.2%) | 3 (0.7%) | 53 (11.8%) | 393 (87.3%) | 0 (0.0%) | 450 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 118 | 78.7% |
| Pl. 6–10 | 20 | 13.3% |
| Pl. 11–15 | 7 | 4.7% |
| Pl. 16–25 | 4 | 2.7% |
| Pl. 26–40 | 1 | 0.7% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 17/22 (77.3%) | 18/22 (81.8%) | 18/20 (90.0%) | 17/25 (68.0%) | 22/28 (78.6%) | 9/14 (64.3%) | 17/19 (89.5%) |
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
| Searound | manta | 60s | 40 | 0.0% | 6.0% ⚠️ | +6.0% | 0.2 | 0.000030 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 22.7% | 78.7% | 56.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 32% | 77% | 22 | 18% | 82% | 22 | 35% | 90% | 20 | 24% | 68% | 25 | 25% | 79% | 28 | 0% | 64% | 14 | 16% | 89% | 19 |

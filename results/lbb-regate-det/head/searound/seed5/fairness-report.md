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
| Searound | manta | 60s | 7 | 15.0% | 22.0% | 16.0% | 12.4% | 5.2 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 5.23 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 11 | 22.0% | 15.0% | +7.0% | 19.4 | 11.7 |
| Row 1 | 8 | 16.0% | 15.0% | +1.0% | 21.9 | 11.8 |
| Row 2 | 8 | 16.0% | 15.0% | +1.0% | 20.8 | 12.2 |
| Row 3 | 4 | 8.0% | 15.0% | -7.0% | 20.8 | 11.3 |
| Row 4 | 10 | 20.0% | 15.0% | +5.0% | 20.1 | 11.2 |
| Row 5 | 5 | 10.0% | 12.5% | -2.5% | 20.4 | 11.8 |
| Row 6 | 4 | 8.0% | 12.5% | -4.5% | 20.1 | 10.6 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 5.23 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 250 | 211 | 84.4% |
| B2 (Pl. 6–15) | 500 | 399 | 79.8% |
| B3 (Pl. 16–25) | 500 | 352 | 70.4% |
| B4 (Pl. 26–40) | 750 | 657 | 87.6% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 11 (22.0%) | 8 (16.0%) | 8 (16.0%) | 4 (8.0%) | 10 (20.0%) | 5 (10.0%) | 4 (8.0%) | 50 |
| 2 | 8 (16.0%) | 7 (14.0%) | 10 (20.0%) | 8 (16.0%) | 3 (6.0%) | 11 (22.0%) | 3 (6.0%) | 50 |
| 3 | 7 (14.0%) | 8 (16.0%) | 7 (14.0%) | 9 (18.0%) | 10 (20.0%) | 0 (0.0%) | 9 (18.0%) | 50 |
| 4 | 10 (20.0%) | 6 (12.0%) | 10 (20.0%) | 9 (18.0%) | 4 (8.0%) | 6 (12.0%) | 5 (10.0%) | 50 |
| 5 | 8 (16.0%) | 5 (10.0%) | 8 (16.0%) | 6 (12.0%) | 8 (16.0%) | 10 (20.0%) | 5 (10.0%) | 50 |
| 6–10 | 43 (17.2%) | 30 (12.0%) | 36 (14.4%) | 34 (13.6%) | 40 (16.0%) | 35 (14.0%) | 32 (12.8%) | 250 |
| 11–15 | 45 (18.0%) | 37 (14.8%) | 28 (11.2%) | 40 (16.0%) | 37 (14.8%) | 31 (12.4%) | 32 (12.8%) | 250 |
| 16–25 | 68 (13.6%) | 63 (12.6%) | 75 (15.0%) | 77 (15.4%) | 83 (16.6%) | 58 (11.6%) | 76 (15.2%) | 500 |
| 26–40 | 100 (13.3%) | 136 (18.1%) | 118 (15.7%) | 113 (15.1%) | 105 (14.0%) | 94 (12.5%) | 84 (11.2%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 50 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 2 | 48 (96.0%) | 2 (4.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 3 | 45 (90.0%) | 4 (8.0%) | 1 (2.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 4 | 43 (86.0%) | 7 (14.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 5 | 25 (50.0%) | 25 (50.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 6–10 | 33 (13.2%) | 209 (83.6%) | 6 (2.4%) | 2 (0.8%) | 0 (0.0%) | 250 |
| 11–15 | 5 (2.0%) | 190 (76.0%) | 50 (20.0%) | 5 (2.0%) | 0 (0.0%) | 250 |
| 16–25 | 1 (0.2%) | 61 (12.2%) | 352 (70.4%) | 86 (17.2%) | 0 (0.0%) | 500 |
| 26–40 | 0 (0.0%) | 2 (0.3%) | 91 (12.1%) | 657 (87.6%) | 0 (0.0%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 211 | 84.4% |
| Pl. 6–10 | 33 | 13.2% |
| Pl. 11–15 | 5 | 2.0% |
| Pl. 16–25 | 1 | 0.4% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 37/44 (84.1%) | 32/37 (86.5%) | 35/41 (85.4%) | 32/33 (97.0%) | 27/34 (79.4%) | 27/32 (84.4%) | 21/29 (72.4%) |
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
| Searound | manta | 60s | 40 | 0.0% | 3.6% ⚠️ | +3.6% | 0.1 | 0.000070 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 38.8% | 84.4% | 45.6% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 43% | 84% | 44 | 59% | 86% | 37 | 37% | 85% | 41 | 36% | 97% | 33 | 24% | 79% | 34 | 41% | 84% | 32 | 28% | 72% | 29 |

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
| Searound | manta | 60s | 7 | 15.0% | 22.0% | 14.0% | 12.8% | 6.5 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 6.53 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 11 | 22.0% | 15.0% | +7.0% | 20.4 | 11.8 |
| Row 1 | 7 | 14.0% | 15.0% | -1.0% | 20.4 | 11.4 |
| Row 2 | 6 | 12.0% | 15.0% | -3.0% | 21.1 | 11.8 |
| Row 3 | 11 | 22.0% | 15.0% | +7.0% | 20.4 | 12.0 |
| Row 4 | 7 | 14.0% | 15.0% | -1.0% | 20.5 | 11.7 |
| Row 5 | 2 | 4.0% | 12.5% | -8.5% | 20.7 | 11.0 |
| Row 6 | 6 | 12.0% | 12.5% | -0.5% | 20.0 | 11.0 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 6.53 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 250 | 202 | 80.8% |
| B2 (Pl. 6–15) | 500 | 386 | 77.2% |
| B3 (Pl. 16–25) | 500 | 347 | 69.4% |
| B4 (Pl. 26–40) | 750 | 665 | 88.7% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 11 (22.0%) | 7 (14.0%) | 6 (12.0%) | 11 (22.0%) | 7 (14.0%) | 2 (4.0%) | 6 (12.0%) | 50 |
| 2 | 7 (14.0%) | 7 (14.0%) | 7 (14.0%) | 6 (12.0%) | 11 (22.0%) | 7 (14.0%) | 5 (10.0%) | 50 |
| 3 | 8 (16.0%) | 8 (16.0%) | 5 (10.0%) | 10 (20.0%) | 9 (18.0%) | 4 (8.0%) | 6 (12.0%) | 50 |
| 4 | 6 (12.0%) | 11 (22.0%) | 8 (16.0%) | 8 (16.0%) | 8 (16.0%) | 5 (10.0%) | 4 (8.0%) | 50 |
| 5 | 7 (14.0%) | 7 (14.0%) | 8 (16.0%) | 8 (16.0%) | 6 (12.0%) | 4 (8.0%) | 10 (20.0%) | 50 |
| 6–10 | 41 (16.4%) | 35 (14.0%) | 39 (15.6%) | 40 (16.0%) | 36 (14.4%) | 31 (12.4%) | 28 (11.2%) | 250 |
| 11–15 | 34 (13.6%) | 36 (14.4%) | 40 (16.0%) | 31 (12.4%) | 33 (13.2%) | 38 (15.2%) | 38 (15.2%) | 250 |
| 16–25 | 69 (13.8%) | 78 (15.6%) | 70 (14.0%) | 74 (14.8%) | 74 (14.8%) | 67 (13.4%) | 68 (13.6%) | 500 |
| 26–40 | 117 (15.6%) | 111 (14.8%) | 117 (15.6%) | 112 (14.9%) | 116 (15.5%) | 92 (12.3%) | 85 (11.3%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 49 (98.0%) | 1 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 2 | 49 (98.0%) | 1 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 3 | 41 (82.0%) | 7 (14.0%) | 0 (0.0%) | 2 (4.0%) | 0 (0.0%) | 50 |
| 4 | 37 (74.0%) | 11 (22.0%) | 2 (4.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 5 | 26 (52.0%) | 23 (46.0%) | 1 (2.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 6–10 | 33 (13.2%) | 210 (84.0%) | 7 (2.8%) | 0 (0.0%) | 0 (0.0%) | 250 |
| 11–15 | 12 (4.8%) | 176 (70.4%) | 61 (24.4%) | 1 (0.4%) | 0 (0.0%) | 250 |
| 16–25 | 3 (0.6%) | 68 (13.6%) | 347 (69.4%) | 82 (16.4%) | 0 (0.0%) | 500 |
| 26–40 | 0 (0.0%) | 3 (0.4%) | 82 (10.9%) | 665 (88.7%) | 0 (0.0%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 202 | 80.8% |
| Pl. 6–10 | 33 | 13.2% |
| Pl. 11–15 | 12 | 4.8% |
| Pl. 16–25 | 3 | 1.2% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 34/38 (89.5%) | 33/39 (84.6%) | 27/31 (87.1%) | 33/46 (71.7%) | 36/46 (78.3%) | 18/24 (75.0%) | 21/26 (80.8%) |
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
| Searound | manta | 60s | 40 | 0.0% | 3.8% ⚠️ | +3.8% | 0.0 | 0.000069 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 30.8% | 80.8% | 50.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 34% | 89% | 38 | 38% | 85% | 39 | 23% | 87% | 31 | 37% | 72% | 46 | 35% | 78% | 46 | 13% | 75% | 24 | 23% | 81% | 26 |

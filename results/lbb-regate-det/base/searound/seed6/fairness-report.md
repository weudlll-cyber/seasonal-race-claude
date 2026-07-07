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
| Searound | manta | 60s | 7 | 15.0% | 16.0% | 16.0% | 13.6% | 6.6 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 6.59 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 8 | 16.0% | 15.0% | +1.0% | 20.5 | 12.0 |
| Row 1 | 8 | 16.0% | 15.0% | +1.0% | 20.8 | 11.9 |
| Row 2 | 8 | 16.0% | 15.0% | +1.0% | 21.0 | 11.8 |
| Row 3 | 5 | 10.0% | 15.0% | -5.0% | 21.1 | 11.3 |
| Row 4 | 13 | 26.0% | 15.0% | +11.0% | 19.7 | 11.6 |
| Row 5 | 4 | 8.0% | 12.5% | -4.5% | 19.7 | 11.3 |
| Row 6 | 4 | 8.0% | 12.5% | -4.5% | 20.6 | 10.8 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 6.59 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 250 | 209 | 83.6% |
| B2 (Pl. 6–15) | 500 | 384 | 76.8% |
| B3 (Pl. 16–25) | 500 | 351 | 70.2% |
| B4 (Pl. 26–40) | 750 | 666 | 88.8% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 8 (16.0%) | 8 (16.0%) | 8 (16.0%) | 5 (10.0%) | 13 (26.0%) | 4 (8.0%) | 4 (8.0%) | 50 |
| 2 | 5 (10.0%) | 3 (6.0%) | 10 (20.0%) | 8 (16.0%) | 6 (12.0%) | 11 (22.0%) | 7 (14.0%) | 50 |
| 3 | 10 (20.0%) | 9 (18.0%) | 7 (14.0%) | 4 (8.0%) | 7 (14.0%) | 8 (16.0%) | 5 (10.0%) | 50 |
| 4 | 11 (22.0%) | 6 (12.0%) | 9 (18.0%) | 4 (8.0%) | 6 (12.0%) | 9 (18.0%) | 5 (10.0%) | 50 |
| 5 | 7 (14.0%) | 10 (20.0%) | 7 (14.0%) | 8 (16.0%) | 8 (16.0%) | 4 (8.0%) | 6 (12.0%) | 50 |
| 6–10 | 35 (14.0%) | 41 (16.4%) | 30 (12.0%) | 36 (14.4%) | 47 (18.8%) | 34 (13.6%) | 27 (10.8%) | 250 |
| 11–15 | 45 (18.0%) | 35 (14.0%) | 37 (14.8%) | 42 (16.8%) | 36 (14.4%) | 22 (8.8%) | 33 (13.2%) | 250 |
| 16–25 | 64 (12.8%) | 76 (15.2%) | 72 (14.4%) | 78 (15.6%) | 67 (13.4%) | 72 (14.4%) | 71 (14.2%) | 500 |
| 26–40 | 115 (15.3%) | 112 (14.9%) | 120 (16.0%) | 115 (15.3%) | 110 (14.7%) | 86 (11.5%) | 92 (12.3%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 50 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 2 | 49 (98.0%) | 1 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 3 | 48 (96.0%) | 2 (4.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 4 | 33 (66.0%) | 17 (34.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 5 | 29 (58.0%) | 21 (42.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 6–10 | 37 (14.8%) | 200 (80.0%) | 10 (4.0%) | 3 (1.2%) | 0 (0.0%) | 250 |
| 11–15 | 3 (1.2%) | 184 (73.6%) | 57 (22.8%) | 6 (2.4%) | 0 (0.0%) | 250 |
| 16–25 | 1 (0.2%) | 73 (14.6%) | 351 (70.2%) | 75 (15.0%) | 0 (0.0%) | 500 |
| 26–40 | 0 (0.0%) | 2 (0.3%) | 82 (10.9%) | 666 (88.8%) | 0 (0.0%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 209 | 83.6% |
| Pl. 6–10 | 37 | 14.8% |
| Pl. 11–15 | 3 | 1.2% |
| Pl. 16–25 | 1 | 0.4% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 38/44 (86.4%) | 27/33 (81.8%) | 36/39 (92.3%) | 23/32 (71.9%) | 35/42 (83.3%) | 30/37 (81.1%) | 20/23 (87.0%) |
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
| Searound | manta | 60s | 40 | 0.0% | 3.8% ⚠️ | +3.8% | 0.2 | 0.000024 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 30.8% | 83.6% | 52.8% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 27% | 86% | 44 | 39% | 82% | 33 | 31% | 92% | 39 | 28% | 72% | 32 | 45% | 83% | 42 | 24% | 81% | 37 | 13% | 87% | 23 |

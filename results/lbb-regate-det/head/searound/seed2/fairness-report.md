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
| Searound | manta | 60s | 7 | 15.0% | 12.0% | 16.0% | 14.4% | 9.0 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 9.04 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 12.0% | 15.0% | -3.0% | 20.7 | 11.5 |
| Row 1 | 8 | 16.0% | 15.0% | +1.0% | 19.7 | 11.9 |
| Row 2 | 7 | 14.0% | 15.0% | -1.0% | 21.1 | 11.7 |
| Row 3 | 5 | 10.0% | 15.0% | -5.0% | 21.5 | 10.9 |
| Row 4 | 6 | 12.0% | 15.0% | -3.0% | 20.7 | 11.7 |
| Row 5 | 13 | 26.0% | 12.5% | +13.5% | 18.7 | 11.5 |
| Row 6 | 5 | 10.0% | 12.5% | -2.5% | 20.9 | 11.5 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 9.04 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 250 | 208 | 83.2% |
| B2 (Pl. 6–15) | 500 | 394 | 78.8% |
| B3 (Pl. 16–25) | 500 | 353 | 70.6% |
| B4 (Pl. 26–40) | 750 | 666 | 88.8% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 6 (12.0%) | 8 (16.0%) | 7 (14.0%) | 5 (10.0%) | 6 (12.0%) | 13 (26.0%) | 5 (10.0%) | 50 |
| 2 | 6 (12.0%) | 9 (18.0%) | 6 (12.0%) | 2 (4.0%) | 10 (20.0%) | 9 (18.0%) | 8 (16.0%) | 50 |
| 3 | 10 (20.0%) | 9 (18.0%) | 4 (8.0%) | 8 (16.0%) | 8 (16.0%) | 3 (6.0%) | 8 (16.0%) | 50 |
| 4 | 4 (8.0%) | 14 (28.0%) | 12 (24.0%) | 3 (6.0%) | 6 (12.0%) | 6 (12.0%) | 5 (10.0%) | 50 |
| 5 | 6 (12.0%) | 7 (14.0%) | 9 (18.0%) | 8 (16.0%) | 10 (20.0%) | 4 (8.0%) | 6 (12.0%) | 50 |
| 6–10 | 38 (15.2%) | 35 (14.0%) | 29 (11.6%) | 40 (16.0%) | 42 (16.8%) | 39 (15.6%) | 27 (10.8%) | 250 |
| 11–15 | 38 (15.2%) | 52 (20.8%) | 40 (16.0%) | 28 (11.2%) | 26 (10.4%) | 33 (13.2%) | 33 (13.2%) | 250 |
| 16–25 | 83 (16.6%) | 54 (10.8%) | 77 (15.4%) | 89 (17.8%) | 74 (14.8%) | 61 (12.2%) | 62 (12.4%) | 500 |
| 26–40 | 109 (14.5%) | 112 (14.9%) | 116 (15.5%) | 117 (15.6%) | 118 (15.7%) | 82 (10.9%) | 96 (12.8%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 50 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 2 | 50 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 3 | 50 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 4 | 35 (70.0%) | 14 (28.0%) | 1 (2.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 5 | 23 (46.0%) | 26 (52.0%) | 1 (2.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 6–10 | 29 (11.6%) | 213 (85.2%) | 7 (2.8%) | 1 (0.4%) | 0 (0.0%) | 250 |
| 11–15 | 10 (4.0%) | 181 (72.4%) | 55 (22.0%) | 4 (1.6%) | 0 (0.0%) | 250 |
| 16–25 | 3 (0.6%) | 65 (13.0%) | 353 (70.6%) | 79 (15.8%) | 0 (0.0%) | 500 |
| 26–40 | 0 (0.0%) | 1 (0.1%) | 83 (11.1%) | 666 (88.8%) | 0 (0.0%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 208 | 83.2% |
| Pl. 6–10 | 29 | 11.6% |
| Pl. 11–15 | 10 | 4.0% |
| Pl. 16–25 | 3 | 1.2% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 27/33 (81.8%) | 39/45 (86.7%) | 31/35 (88.6%) | 19/25 (76.0%) | 35/40 (87.5%) | 30/39 (76.9%) | 27/33 (81.8%) |
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
| Searound | manta | 60s | 40 | 0.0% | 3.9% ⚠️ | +3.9% | 0.0 | 0.000068 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 41.2% | 83.2% | 42.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 52% | 82% | 33 | 33% | 87% | 45 | 54% | 89% | 35 | 40% | 76% | 25 | 38% | 88% | 40 | 31% | 77% | 39 | 45% | 82% | 33 |

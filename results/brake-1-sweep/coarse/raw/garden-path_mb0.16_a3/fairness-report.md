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
| Garden Path | snail | 60s | 3 | 35.0% | 40.0% | 30.0% | 30.0% | 0.3 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Garden Path × snail × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 0.33 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 12 | 40.0% | 35.0% | +5.0% | 19.9 | 11.6 |
| Row 1 | 9 | 30.0% | 32.5% | -2.5% | 20.4 | 11.2 |
| Row 2 | 9 | 30.0% | 32.5% | -2.5% | 21.2 | 11.8 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(2) = 0.33 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 150 | 125 | 83.3% |
| B2 (Pl. 6–15) | 300 | 239 | 79.7% |
| B3 (Pl. 16–25) | 300 | 200 | 66.7% |
| B4 (Pl. 26–40) | 450 | 387 | 86.0% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (14R) | Row 1 (13R) | Row 2 (13R) | Gesamt |
|---|---|---|---|---|
| 1 | 12 (40.0%) | 9 (30.0%) | 9 (30.0%) | 30 |
| 2 | 10 (33.3%) | 9 (30.0%) | 11 (36.7%) | 30 |
| 3 | 11 (36.7%) | 9 (30.0%) | 10 (33.3%) | 30 |
| 4 | 14 (46.7%) | 7 (23.3%) | 9 (30.0%) | 30 |
| 5 | 11 (36.7%) | 10 (33.3%) | 9 (30.0%) | 30 |
| 6–10 | 54 (36.0%) | 50 (33.3%) | 46 (30.7%) | 150 |
| 11–15 | 57 (38.0%) | 48 (32.0%) | 45 (30.0%) | 150 |
| 16–25 | 100 (33.3%) | 108 (36.0%) | 92 (30.7%) | 300 |
| 26–40 | 151 (33.6%) | 140 (31.1%) | 159 (35.3%) | 450 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 35.0% | 32.5% | 32.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 30 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 2 | 28 (93.3%) | 2 (6.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 3 | 27 (90.0%) | 3 (10.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 4 | 24 (80.0%) | 5 (16.7%) | 0 (0.0%) | 1 (3.3%) | 0 (0.0%) | 30 |
| 5 | 16 (53.3%) | 13 (43.3%) | 1 (3.3%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 6–10 | 19 (12.7%) | 127 (84.7%) | 4 (2.7%) | 0 (0.0%) | 0 (0.0%) | 150 |
| 11–15 | 5 (3.3%) | 112 (74.7%) | 33 (22.0%) | 0 (0.0%) | 0 (0.0%) | 150 |
| 16–25 | 1 (0.3%) | 37 (12.3%) | 200 (66.7%) | 62 (20.7%) | 0 (0.0%) | 300 |
| 26–40 | 0 (0.0%) | 1 (0.2%) | 62 (13.8%) | 387 (86.0%) | 0 (0.0%) | 450 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 125 | 83.3% |
| Pl. 6–10 | 19 | 12.7% |
| Pl. 11–15 | 5 | 3.3% |
| Pl. 16–25 | 1 | 0.7% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 51/55 (92.7%) | 35/44 (79.5%) | 39/51 (76.5%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–40 ✅ Soll erreicht | 0 | — |
| Pl. 26–40 | 0 | — |
| Pl. 16–25 | 0 | — |
| Pl. 6–15 | 0 | — |
| Pl. 1–5 ❌ Brems-Leck | 0 | — |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/0 (—) | 0/0 (—) | 0/0 (—) |

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
| Garden Path | snail | 60s | 40 | 0.0% | 2.2% ⚠️ | +2.2% | 0.0 | 0.000060 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Garden Path | snail | 60s | 40 | 38.7% | 83.3% | 44.7% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Garden Path | snail | 60s | 35% | 93% | 55 | 39% | 80% | 44 | 43% | 76% | 51 |

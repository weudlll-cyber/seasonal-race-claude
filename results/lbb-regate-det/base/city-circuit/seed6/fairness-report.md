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
| City Circuit | motorbike | 60s | 4 | 25.0% | 26.0% | 28.0% | 23.0% | 2.3 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### City Circuit × motorbike × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 2.32 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 13 | 26.0% | 25.0% | +1.0% | 21.0 | 11.5 |
| Row 1 | 14 | 28.0% | 25.0% | +3.0% | 20.4 | 11.7 |
| Row 2 | 8 | 16.0% | 25.0% | -9.0% | 20.6 | 11.6 |
| Row 3 | 15 | 30.0% | 25.0% | +5.0% | 20.0 | 11.5 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(3) = 2.32 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 250 | 216 | 86.4% |
| B2 (Pl. 6–15) | 500 | 403 | 80.6% |
| B3 (Pl. 16–25) | 500 | 341 | 68.2% |
| B4 (Pl. 26–40) | 750 | 649 | 86.5% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 13 (26.0%) | 14 (28.0%) | 8 (16.0%) | 15 (30.0%) | 50 |
| 2 | 12 (24.0%) | 10 (20.0%) | 9 (18.0%) | 19 (38.0%) | 50 |
| 3 | 10 (20.0%) | 12 (24.0%) | 14 (28.0%) | 14 (28.0%) | 50 |
| 4 | 9 (18.0%) | 12 (24.0%) | 14 (28.0%) | 15 (30.0%) | 50 |
| 5 | 7 (14.0%) | 14 (28.0%) | 18 (36.0%) | 11 (22.0%) | 50 |
| 6–10 | 57 (22.8%) | 77 (30.8%) | 65 (26.0%) | 51 (20.4%) | 250 |
| 11–15 | 76 (30.4%) | 49 (19.6%) | 60 (24.0%) | 65 (26.0%) | 250 |
| 16–25 | 123 (24.6%) | 124 (24.8%) | 125 (25.0%) | 128 (25.6%) | 500 |
| 26–40 | 193 (25.7%) | 188 (25.1%) | 187 (24.9%) | 182 (24.3%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 50 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 2 | 47 (94.0%) | 3 (6.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 3 | 46 (92.0%) | 4 (8.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 4 | 40 (80.0%) | 10 (20.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 5 | 33 (66.0%) | 16 (32.0%) | 1 (2.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 6–10 | 26 (10.4%) | 219 (87.6%) | 4 (1.6%) | 1 (0.4%) | 0 (0.0%) | 250 |
| 11–15 | 5 (2.0%) | 184 (73.6%) | 55 (22.0%) | 6 (2.4%) | 0 (0.0%) | 250 |
| 16–25 | 3 (0.6%) | 62 (12.4%) | 341 (68.2%) | 94 (18.8%) | 0 (0.0%) | 500 |
| 26–40 | 0 (0.0%) | 2 (0.3%) | 99 (13.2%) | 649 (86.5%) | 0 (0.0%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 216 | 86.4% |
| Pl. 6–10 | 26 | 10.4% |
| Pl. 11–15 | 5 | 2.0% |
| Pl. 16–25 | 3 | 1.2% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 43/49 (87.8%) | 53/61 (86.9%) | 53/65 (81.5%) | 67/75 (89.3%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–40 ✅ Soll erreicht | 0 | — |
| Pl. 26–40 | 0 | — |
| Pl. 16–25 | 0 | — |
| Pl. 6–15 | 0 | — |
| Pl. 1–5 ❌ Brems-Leck | 0 | — |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) |

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
| City Circuit | motorbike | 60s | 40 | 0.0% | 2.8% ⚠️ | +2.8% | 0.0 | 0.000029 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| City Circuit | motorbike | 60s | 40 | 31.2% | 86.4% | 55.2% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| City Circuit | motorbike | 60s | 43% | 88% | 49 | 36% | 87% | 61 | 22% | 82% | 65 | 28% | 89% | 75 |

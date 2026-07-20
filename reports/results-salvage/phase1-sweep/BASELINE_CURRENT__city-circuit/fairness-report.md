# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-17  
**Rennen pro Kombination:** 40  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–40  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| City Circuit | motorbike | 60s | 4 | 25.0% | 12.5% | 40.0% | 23.8% | 7.4 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### City Circuit × motorbike × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 7.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 12.5% | 25.0% | -12.5% | 21.1 | 11.6 |
| Row 1 | 16 | 40.0% | 25.0% | +15.0% | 19.7 | 11.4 |
| Row 2 | 12 | 30.0% | 25.0% | +5.0% | 20.4 | 11.8 |
| Row 3 | 7 | 17.5% | 25.0% | -7.5% | 20.8 | 11.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(3) = 7.40 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 200 | 161 | 80.5% |
| B2 (Pl. 6–15) | 400 | 308 | 77.0% |
| B3 (Pl. 16–25) | 400 | 269 | 67.3% |
| B4 (Pl. 26–40) | 600 | 510 | 85.0% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 5 (12.5%) | 16 (40.0%) | 12 (30.0%) | 7 (17.5%) | 40 |
| 2 | 8 (20.0%) | 13 (32.5%) | 11 (27.5%) | 8 (20.0%) | 40 |
| 3 | 12 (30.0%) | 9 (22.5%) | 12 (30.0%) | 7 (17.5%) | 40 |
| 4 | 6 (15.0%) | 9 (22.5%) | 15 (37.5%) | 10 (25.0%) | 40 |
| 5 | 13 (32.5%) | 7 (17.5%) | 9 (22.5%) | 11 (27.5%) | 40 |
| 6–10 | 51 (25.5%) | 50 (25.0%) | 48 (24.0%) | 51 (25.5%) | 200 |
| 11–15 | 50 (25.0%) | 52 (26.0%) | 44 (22.0%) | 54 (27.0%) | 200 |
| 16–25 | 98 (24.5%) | 104 (26.0%) | 94 (23.5%) | 104 (26.0%) | 400 |
| 26–40 | 157 (26.2%) | 140 (23.3%) | 155 (25.8%) | 148 (24.7%) | 600 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 39 (97.5%) | 1 (2.5%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 2 | 40 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 3 | 33 (82.5%) | 5 (12.5%) | 0 (0.0%) | 2 (5.0%) | 0 (0.0%) | 40 |
| 4 | 32 (80.0%) | 7 (17.5%) | 1 (2.5%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 5 | 17 (42.5%) | 21 (52.5%) | 0 (0.0%) | 2 (5.0%) | 0 (0.0%) | 40 |
| 6–10 | 17 (8.5%) | 174 (87.0%) | 5 (2.5%) | 4 (2.0%) | 0 (0.0%) | 200 |
| 11–15 | 11 (5.5%) | 134 (67.0%) | 46 (23.0%) | 9 (4.5%) | 0 (0.0%) | 200 |
| 16–25 | 5 (1.3%) | 53 (13.3%) | 269 (67.3%) | 73 (18.3%) | 0 (0.0%) | 400 |
| 26–40 | 6 (1.0%) | 5 (0.8%) | 79 (13.2%) | 510 (85.0%) | 0 (0.0%) | 600 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 161 | 80.5% |
| Pl. 6–10 | 17 | 8.5% |
| Pl. 11–15 | 11 | 5.5% |
| Pl. 16–25 | 5 | 2.5% |
| Pl. 26–40 | 6 | 3.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 31/37 (83.8%) | 48/65 (73.8%) | 50/55 (90.9%) | 32/43 (74.4%) |
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
| City Circuit | motorbike | 60s | 40 | 0.0% | 2.7% ⚠️ | +2.7% | 0.0 | 0.000089 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| City Circuit | motorbike | 60s | 40 | 21.5% | 80.5% | 59.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| City Circuit | motorbike | 60s | 19% | 84% | 37 | 20% | 74% | 65 | 16% | 91% | 55 | 33% | 74% | 43 |

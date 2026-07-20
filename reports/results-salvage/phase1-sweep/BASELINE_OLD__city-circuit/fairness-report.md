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
| City Circuit | motorbike | 60s | 4 | 25.0% | 17.5% | 42.5% | 20.0% | 6.6 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### City Circuit × motorbike × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 6.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 7 | 17.5% | 25.0% | -7.5% | 21.3 | 11.7 |
| Row 1 | 17 | 42.5% | 25.0% | +17.5% | 19.8 | 11.4 |
| Row 2 | 8 | 20.0% | 25.0% | -5.0% | 20.4 | 11.7 |
| Row 3 | 8 | 20.0% | 25.0% | -5.0% | 20.6 | 11.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(3) = 6.60 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 200 | 170 | 85.0% |
| B2 (Pl. 6–15) | 400 | 318 | 79.5% |
| B3 (Pl. 16–25) | 400 | 274 | 68.5% |
| B4 (Pl. 26–40) | 600 | 523 | 87.2% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 7 (17.5%) | 17 (42.5%) | 8 (20.0%) | 8 (20.0%) | 40 |
| 2 | 7 (17.5%) | 12 (30.0%) | 12 (30.0%) | 9 (22.5%) | 40 |
| 3 | 9 (22.5%) | 9 (22.5%) | 10 (25.0%) | 12 (30.0%) | 40 |
| 4 | 9 (22.5%) | 12 (30.0%) | 14 (35.0%) | 5 (12.5%) | 40 |
| 5 | 11 (27.5%) | 4 (10.0%) | 13 (32.5%) | 12 (30.0%) | 40 |
| 6–10 | 58 (29.0%) | 48 (24.0%) | 46 (23.0%) | 48 (24.0%) | 200 |
| 11–15 | 44 (22.0%) | 54 (27.0%) | 53 (26.5%) | 49 (24.5%) | 200 |
| 16–25 | 98 (24.5%) | 104 (26.0%) | 88 (22.0%) | 110 (27.5%) | 400 |
| 26–40 | 157 (26.2%) | 140 (23.3%) | 156 (26.0%) | 147 (24.5%) | 600 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 39 (97.5%) | 1 (2.5%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 2 | 40 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 3 | 35 (87.5%) | 4 (10.0%) | 0 (0.0%) | 1 (2.5%) | 0 (0.0%) | 40 |
| 4 | 36 (90.0%) | 4 (10.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 5 | 20 (50.0%) | 20 (50.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 6–10 | 18 (9.0%) | 180 (90.0%) | 2 (1.0%) | 0 (0.0%) | 0 (0.0%) | 200 |
| 11–15 | 10 (5.0%) | 138 (69.0%) | 49 (24.5%) | 3 (1.5%) | 0 (0.0%) | 200 |
| 16–25 | 1 (0.3%) | 52 (13.0%) | 274 (68.5%) | 73 (18.3%) | 0 (0.0%) | 400 |
| 26–40 | 1 (0.2%) | 1 (0.2%) | 75 (12.5%) | 523 (87.2%) | 0 (0.0%) | 600 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 170 | 85.0% |
| Pl. 6–10 | 18 | 9.0% |
| Pl. 11–15 | 10 | 5.0% |
| Pl. 16–25 | 1 | 0.5% |
| Pl. 26–40 | 1 | 0.5% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 34/37 (91.9%) | 50/65 (76.9%) | 49/55 (89.1%) | 37/43 (86.0%) |
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
| City Circuit | motorbike | 60s | 40 | 0.0% | 3.1% ⚠️ | +3.1% | 0.0 | 0.000086 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| City Circuit | motorbike | 60s | 40 | 23.5% | 85.0% | 61.5% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| City Circuit | motorbike | 60s | 27% | 92% | 37 | 22% | 77% | 65 | 25% | 89% | 55 | 21% | 86% | 43 |

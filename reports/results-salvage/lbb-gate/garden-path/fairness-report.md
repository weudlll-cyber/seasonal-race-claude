# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-16  
**Rennen pro Kombination:** 300  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–300  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Garden Path | snail | 60s | 3 | 35.0% | 30.0% | 33.7% | 36.3% | 3.6 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Garden Path × snail × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 3.62 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 90 | 30.0% | 35.0% | -5.0% | 20.7 | 11.6 |
| Row 1 | 101 | 33.7% | 32.5% | +1.2% | 20.4 | 11.5 |
| Row 2 | 109 | 36.3% | 32.5% | +3.8% | 20.5 | 11.5 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(2) = 3.62 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 1500 | 1210 | 80.7% |
| B2 (Pl. 6–15) | 3000 | 2391 | 79.7% |
| B3 (Pl. 16–25) | 3000 | 2188 | 72.9% |
| B4 (Pl. 26–40) | 4500 | 3994 | 88.8% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (14R) | Row 1 (13R) | Row 2 (13R) | Gesamt |
|---|---|---|---|---|
| 1 | 90 (30.0%) | 101 (33.7%) | 109 (36.3%) | 300 |
| 2 | 114 (38.0%) | 85 (28.3%) | 101 (33.7%) | 300 |
| 3 | 106 (35.3%) | 100 (33.3%) | 94 (31.3%) | 300 |
| 4 | 103 (34.3%) | 108 (36.0%) | 89 (29.7%) | 300 |
| 5 | 108 (36.0%) | 92 (30.7%) | 100 (33.3%) | 300 |
| 6–10 | 515 (34.3%) | 500 (33.3%) | 485 (32.3%) | 1500 |
| 11–15 | 531 (35.4%) | 496 (33.1%) | 473 (31.5%) | 1500 |
| 16–25 | 1034 (34.5%) | 985 (32.8%) | 981 (32.7%) | 3000 |
| 26–40 | 1599 (35.5%) | 1433 (31.8%) | 1468 (32.6%) | 4500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 35.0% | 32.5% | 32.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 300 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 2 | 295 (98.3%) | 4 (1.3%) | 1 (0.3%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 3 | 285 (95.0%) | 15 (5.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 4 | 228 (76.0%) | 70 (23.3%) | 1 (0.3%) | 1 (0.3%) | 0 (0.0%) | 300 |
| 5 | 102 (34.0%) | 196 (65.3%) | 2 (0.7%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 6–10 | 197 (13.1%) | 1274 (84.9%) | 18 (1.2%) | 11 (0.7%) | 0 (0.0%) | 1500 |
| 11–15 | 46 (3.1%) | 1117 (74.5%) | 315 (21.0%) | 22 (1.5%) | 0 (0.0%) | 1500 |
| 16–25 | 35 (1.2%) | 305 (10.2%) | 2188 (72.9%) | 472 (15.7%) | 0 (0.0%) | 3000 |
| 26–40 | 12 (0.3%) | 19 (0.4%) | 475 (10.6%) | 3994 (88.8%) | 0 (0.0%) | 4500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 1210 | 80.7% |
| Pl. 6–10 | 197 | 13.1% |
| Pl. 11–15 | 46 | 3.1% |
| Pl. 16–25 | 35 | 2.3% |
| Pl. 26–40 | 12 | 0.8% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 422/529 (79.8%) | 391/469 (83.4%) | 397/502 (79.1%) |
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
| Garden Path | snail | 60s | 40 | 0.0% | 2.6% ⚠️ | +2.6% | 0.0 | 0.000099 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Garden Path | snail | 60s | 40 | 20.7% | 80.7% | 60.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Garden Path | snail | 60s | 21% | 80% | 529 | 21% | 83% | 469 | 20% | 79% | 502 |

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
| Searound | manta | 60s | 7 | 15.0% | 20.7% | 17.3% | 12.4% | 11.8 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 11.76 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 62 | 20.7% | 15.0% | +5.7% | 20.9 | 11.9 |
| Row 1 | 52 | 17.3% | 15.0% | +2.3% | 20.9 | 11.8 |
| Row 2 | 38 | 12.7% | 15.0% | -2.3% | 20.8 | 11.7 |
| Row 3 | 35 | 11.7% | 15.0% | -3.3% | 20.3 | 11.6 |
| Row 4 | 40 | 13.3% | 15.0% | -1.7% | 20.4 | 11.5 |
| Row 5 | 39 | 13.0% | 12.5% | +0.5% | 19.6 | 11.2 |
| Row 6 | 34 | 11.3% | 12.5% | -1.2% | 20.5 | 11.1 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(6) = 11.76 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 1500 | 1201 | 80.1% |
| B2 (Pl. 6–15) | 3000 | 2306 | 76.9% |
| B3 (Pl. 16–25) | 3000 | 2133 | 71.1% |
| B4 (Pl. 26–40) | 4500 | 3979 | 88.4% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 62 (20.7%) | 52 (17.3%) | 38 (12.7%) | 35 (11.7%) | 40 (13.3%) | 39 (13.0%) | 34 (11.3%) | 300 |
| 2 | 36 (12.0%) | 46 (15.3%) | 49 (16.3%) | 47 (15.7%) | 47 (15.7%) | 36 (12.0%) | 39 (13.0%) | 300 |
| 3 | 39 (13.0%) | 54 (18.0%) | 52 (17.3%) | 62 (20.7%) | 40 (13.3%) | 30 (10.0%) | 23 (7.7%) | 300 |
| 4 | 41 (13.7%) | 36 (12.0%) | 52 (17.3%) | 44 (14.7%) | 49 (16.3%) | 46 (15.3%) | 32 (10.7%) | 300 |
| 5 | 46 (15.3%) | 34 (11.3%) | 46 (15.3%) | 43 (14.3%) | 49 (16.3%) | 43 (14.3%) | 39 (13.0%) | 300 |
| 6–10 | 235 (15.7%) | 204 (13.6%) | 210 (14.0%) | 252 (16.8%) | 223 (14.9%) | 191 (12.7%) | 185 (12.3%) | 1500 |
| 11–15 | 216 (14.4%) | 221 (14.7%) | 209 (13.9%) | 208 (13.9%) | 228 (15.2%) | 216 (14.4%) | 202 (13.5%) | 1500 |
| 16–25 | 397 (13.2%) | 472 (15.7%) | 454 (15.1%) | 437 (14.6%) | 467 (15.6%) | 388 (12.9%) | 385 (12.8%) | 3000 |
| 26–40 | 728 (16.2%) | 681 (15.1%) | 690 (15.3%) | 672 (14.9%) | 657 (14.6%) | 511 (11.4%) | 561 (12.5%) | 4500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 297 (99.0%) | 3 (1.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 2 | 291 (97.0%) | 7 (2.3%) | 1 (0.3%) | 1 (0.3%) | 0 (0.0%) | 300 |
| 3 | 277 (92.3%) | 21 (7.0%) | 1 (0.3%) | 1 (0.3%) | 0 (0.0%) | 300 |
| 4 | 210 (70.0%) | 87 (29.0%) | 1 (0.3%) | 2 (0.7%) | 0 (0.0%) | 300 |
| 5 | 126 (42.0%) | 172 (57.3%) | 0 (0.0%) | 2 (0.7%) | 0 (0.0%) | 300 |
| 6–10 | 190 (12.7%) | 1254 (83.6%) | 31 (2.1%) | 25 (1.7%) | 0 (0.0%) | 1500 |
| 11–15 | 66 (4.4%) | 1052 (70.1%) | 340 (22.7%) | 42 (2.8%) | 0 (0.0%) | 1500 |
| 16–25 | 36 (1.2%) | 383 (12.8%) | 2133 (71.1%) | 448 (14.9%) | 0 (0.0%) | 3000 |
| 26–40 | 7 (0.2%) | 21 (0.5%) | 493 (11.0%) | 3979 (88.4%) | 0 (0.0%) | 4500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 1201 | 80.1% |
| Pl. 6–10 | 190 | 12.7% |
| Pl. 11–15 | 66 | 4.4% |
| Pl. 16–25 | 36 | 2.4% |
| Pl. 26–40 | 7 | 0.5% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 186/223 (83.4%) | 191/228 (83.8%) | 191/226 (84.5%) | 185/227 (81.5%) | 178/239 (74.5%) | 140/188 (74.5%) | 130/169 (76.9%) |
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
| Searound | manta | 60s | 40 | 0.0% | 4.6% ⚠️ | +4.6% | 0.2 | 0.000098 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 60s | 40 | 20.1% | 80.1% | 60.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 60s | 25% | 83% | 223 | 22% | 84% | 228 | 21% | 85% | 226 | 21% | 81% | 227 | 17% | 74% | 239 | 15% | 74% | 188 | 19% | 77% | 169 |

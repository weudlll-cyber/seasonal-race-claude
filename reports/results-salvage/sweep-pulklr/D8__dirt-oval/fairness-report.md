# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-13  
**Rennen pro Kombination:** 100  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–100  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Dirt Oval | horse | 60s | 4 | 25.0% | 32.0% | 25.0% | 21.5% | 3.0 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Dirt Oval × horse × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 2.96 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 32 | 32.0% | 25.0% | +7.0% | 21.0 | 11.8 |
| Row 1 | 25 | 25.0% | 25.0% | +0.0% | 20.4 | 11.4 |
| Row 2 | 21 | 21.0% | 25.0% | -4.0% | 20.3 | 11.5 |
| Row 3 | 22 | 22.0% | 25.0% | -3.0% | 20.3 | 11.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 2.96 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 418 | 83.6% |
| B2 (Pl. 6–15) | 1000 | 805 | 80.5% |
| B3 (Pl. 16–25) | 1000 | 710 | 71.0% |
| B4 (Pl. 26–40) | 1500 | 1310 | 87.3% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 32 (32.0%) | 25 (25.0%) | 21 (21.0%) | 22 (22.0%) | 100 |
| 2 | 28 (28.0%) | 22 (22.0%) | 29 (29.0%) | 21 (21.0%) | 100 |
| 3 | 23 (23.0%) | 19 (19.0%) | 22 (22.0%) | 36 (36.0%) | 100 |
| 4 | 17 (17.0%) | 30 (30.0%) | 29 (29.0%) | 24 (24.0%) | 100 |
| 5 | 27 (27.0%) | 22 (22.0%) | 26 (26.0%) | 25 (25.0%) | 100 |
| 6–10 | 120 (24.0%) | 130 (26.0%) | 129 (25.8%) | 121 (24.2%) | 500 |
| 11–15 | 114 (22.8%) | 137 (27.4%) | 117 (23.4%) | 132 (26.4%) | 500 |
| 16–25 | 240 (24.0%) | 243 (24.3%) | 265 (26.5%) | 252 (25.2%) | 1000 |
| 26–40 | 399 (26.6%) | 372 (24.8%) | 362 (24.1%) | 367 (24.5%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 99 (99.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 94 (94.0%) | 6 (6.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 81 (81.0%) | 19 (19.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 44 (44.0%) | 56 (56.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 56 (11.2%) | 434 (86.8%) | 3 (0.6%) | 7 (1.4%) | 0 (0.0%) | 500 |
| 11–15 | 15 (3.0%) | 371 (74.2%) | 102 (20.4%) | 12 (2.4%) | 0 (0.0%) | 500 |
| 16–25 | 10 (1.0%) | 109 (10.9%) | 710 (71.0%) | 171 (17.1%) | 0 (0.0%) | 1000 |
| 26–40 | 1 (0.1%) | 4 (0.3%) | 185 (12.3%) | 1310 (87.3%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 418 | 83.6% |
| Pl. 6–10 | 56 | 11.2% |
| Pl. 11–15 | 15 | 3.0% |
| Pl. 16–25 | 10 | 2.0% |
| Pl. 26–40 | 1 | 0.2% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 109/124 (87.9%) | 101/122 (82.8%) | 103/126 (81.7%) | 105/128 (82.0%) |
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
| Dirt Oval | horse | 60s | 40 | 0.0% | 3.1% ⚠️ | +3.1% | 0.0 | 0.000057 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Dirt Oval | horse | 60s | 40 | 22.4% | 83.6% | 61.2% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Dirt Oval | horse | 60s | 19% | 88% | 124 | 23% | 83% | 122 | 22% | 82% | 126 | 26% | 82% | 128 |

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
| Garden Path | snail | 60s | 3 | 35.0% | 36.0% | 32.0% | 32.0% | 0.0 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Garden Path × snail × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 0.04 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 36 | 36.0% | 35.0% | +1.0% | 20.3 | 11.5 |
| Row 1 | 32 | 32.0% | 32.5% | -0.5% | 20.6 | 11.6 |
| Row 2 | 32 | 32.0% | 32.5% | -0.5% | 20.7 | 11.6 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(2) = 0.04 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 406 | 81.2% |
| B2 (Pl. 6–15) | 1000 | 788 | 78.8% |
| B3 (Pl. 16–25) | 1000 | 691 | 69.1% |
| B4 (Pl. 26–40) | 1500 | 1311 | 87.4% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (14R) | Row 1 (13R) | Row 2 (13R) | Gesamt |
|---|---|---|---|---|
| 1 | 36 (36.0%) | 32 (32.0%) | 32 (32.0%) | 100 |
| 2 | 33 (33.0%) | 40 (40.0%) | 27 (27.0%) | 100 |
| 3 | 38 (38.0%) | 26 (26.0%) | 36 (36.0%) | 100 |
| 4 | 37 (37.0%) | 34 (34.0%) | 29 (29.0%) | 100 |
| 5 | 37 (37.0%) | 22 (22.0%) | 41 (41.0%) | 100 |
| 6–10 | 177 (35.4%) | 162 (32.4%) | 161 (32.2%) | 500 |
| 11–15 | 170 (34.0%) | 168 (33.6%) | 162 (32.4%) | 500 |
| 16–25 | 363 (36.3%) | 334 (33.4%) | 303 (30.3%) | 1000 |
| 26–40 | 509 (33.9%) | 482 (32.1%) | 509 (33.9%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 35.0% | 32.5% | 32.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 98 (98.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 97 (97.0%) | 3 (3.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 96 (96.0%) | 2 (2.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 66 (66.0%) | 32 (32.0%) | 1 (1.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 5 | 49 (49.0%) | 50 (50.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 59 (11.8%) | 429 (85.8%) | 7 (1.4%) | 5 (1.0%) | 0 (0.0%) | 500 |
| 11–15 | 15 (3.0%) | 359 (71.8%) | 117 (23.4%) | 9 (1.8%) | 0 (0.0%) | 500 |
| 16–25 | 15 (1.5%) | 120 (12.0%) | 691 (69.1%) | 174 (17.4%) | 0 (0.0%) | 1000 |
| 26–40 | 5 (0.3%) | 3 (0.2%) | 181 (12.1%) | 1311 (87.4%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 406 | 81.2% |
| Pl. 6–10 | 59 | 11.8% |
| Pl. 11–15 | 15 | 3.0% |
| Pl. 16–25 | 15 | 3.0% |
| Pl. 26–40 | 5 | 1.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 148/179 (82.7%) | 121/150 (80.7%) | 137/171 (80.1%) |
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
| Garden Path | snail | 60s | 40 | 0.0% | 2.5% ⚠️ | +2.5% | 0.0 | 0.000064 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Garden Path | snail | 60s | 40 | 22.0% | 81.2% | 59.2% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Garden Path | snail | 60s | 20% | 83% | 179 | 25% | 81% | 150 | 22% | 80% | 171 |

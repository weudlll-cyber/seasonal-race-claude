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
| Dirt Oval | horse | 60s | 4 | 25.0% | 27.0% | 23.3% | 24.8% | 1.4 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Dirt Oval × horse × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 1.36 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 81 | 27.0% | 25.0% | +2.0% | 20.9 | 11.6 |
| Row 1 | 70 | 23.3% | 25.0% | -1.7% | 20.2 | 11.6 |
| Row 2 | 79 | 26.3% | 25.0% | +1.3% | 20.4 | 11.6 |
| Row 3 | 70 | 23.3% | 25.0% | -1.7% | 20.5 | 11.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 1.36 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 1500 | 1250 | 83.3% |
| B2 (Pl. 6–15) | 3000 | 2417 | 80.6% |
| B3 (Pl. 16–25) | 3000 | 2129 | 71.0% |
| B4 (Pl. 26–40) | 4500 | 3952 | 87.8% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 81 (27.0%) | 70 (23.3%) | 79 (26.3%) | 70 (23.3%) | 300 |
| 2 | 72 (24.0%) | 80 (26.7%) | 71 (23.7%) | 77 (25.7%) | 300 |
| 3 | 79 (26.3%) | 92 (30.7%) | 67 (22.3%) | 62 (20.7%) | 300 |
| 4 | 69 (23.0%) | 74 (24.7%) | 81 (27.0%) | 76 (25.3%) | 300 |
| 5 | 66 (22.0%) | 69 (23.0%) | 87 (29.0%) | 78 (26.0%) | 300 |
| 6–10 | 337 (22.5%) | 409 (27.3%) | 381 (25.4%) | 373 (24.9%) | 1500 |
| 11–15 | 379 (25.3%) | 374 (24.9%) | 371 (24.7%) | 376 (25.1%) | 1500 |
| 16–25 | 768 (25.6%) | 722 (24.1%) | 729 (24.3%) | 781 (26.0%) | 3000 |
| 26–40 | 1149 (25.5%) | 1110 (24.7%) | 1134 (25.2%) | 1107 (24.6%) | 4500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 300 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 2 | 297 (99.0%) | 3 (1.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 3 | 288 (96.0%) | 11 (3.7%) | 0 (0.0%) | 1 (0.3%) | 0 (0.0%) | 300 |
| 4 | 237 (79.0%) | 63 (21.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 5 | 128 (42.7%) | 168 (56.0%) | 1 (0.3%) | 3 (1.0%) | 0 (0.0%) | 300 |
| 6–10 | 177 (11.8%) | 1303 (86.9%) | 11 (0.7%) | 9 (0.6%) | 0 (0.0%) | 1500 |
| 11–15 | 44 (2.9%) | 1114 (74.3%) | 327 (21.8%) | 15 (1.0%) | 0 (0.0%) | 1500 |
| 16–25 | 26 (0.9%) | 325 (10.8%) | 2129 (71.0%) | 520 (17.3%) | 0 (0.0%) | 3000 |
| 26–40 | 3 (0.1%) | 13 (0.3%) | 532 (11.8%) | 3952 (87.8%) | 0 (0.0%) | 4500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 1250 | 83.3% |
| Pl. 6–10 | 177 | 11.8% |
| Pl. 11–15 | 44 | 2.9% |
| Pl. 16–25 | 26 | 1.7% |
| Pl. 26–40 | 3 | 0.2% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 313/372 (84.1%) | 329/379 (86.8%) | 319/387 (82.4%) | 289/362 (79.8%) |
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
| Dirt Oval | horse | 60s | 40 | 0.0% | 3.0% ⚠️ | +3.0% | 0.0 | 0.000083 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Dirt Oval | horse | 60s | 40 | 20.4% | 83.3% | 62.9% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Dirt Oval | horse | 60s | 19% | 84% | 372 | 21% | 87% | 379 | 23% | 82% | 387 | 19% | 80% | 362 |

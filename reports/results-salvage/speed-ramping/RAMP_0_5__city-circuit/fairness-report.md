# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-17  
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
| City Circuit | motorbike | 60s | 4 | 25.0% | 22.0% | 30.0% | 24.0% | 2.7 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### City Circuit × motorbike × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 2.72 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 22 | 22.0% | 25.0% | -3.0% | 20.8 | 11.5 |
| Row 1 | 30 | 30.0% | 25.0% | +5.0% | 20.0 | 11.6 |
| Row 2 | 28 | 28.0% | 25.0% | +3.0% | 20.5 | 11.7 |
| Row 3 | 20 | 20.0% | 25.0% | -5.0% | 20.7 | 11.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 2.72 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 385 | 77.0% |
| B2 (Pl. 6–15) | 1000 | 702 | 70.2% |
| B3 (Pl. 16–25) | 1000 | 583 | 58.3% |
| B4 (Pl. 26–40) | 1500 | 1230 | 82.0% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 22 (22.0%) | 30 (30.0%) | 28 (28.0%) | 20 (20.0%) | 100 |
| 2 | 18 (18.0%) | 33 (33.0%) | 28 (28.0%) | 21 (21.0%) | 100 |
| 3 | 20 (20.0%) | 32 (32.0%) | 21 (21.0%) | 27 (27.0%) | 100 |
| 4 | 34 (34.0%) | 19 (19.0%) | 25 (25.0%) | 22 (22.0%) | 100 |
| 5 | 21 (21.0%) | 34 (34.0%) | 16 (16.0%) | 29 (29.0%) | 100 |
| 6–10 | 126 (25.2%) | 118 (23.6%) | 139 (27.8%) | 117 (23.4%) | 500 |
| 11–15 | 123 (24.6%) | 118 (23.6%) | 126 (25.2%) | 133 (26.6%) | 500 |
| 16–25 | 255 (25.5%) | 257 (25.7%) | 235 (23.5%) | 253 (25.3%) | 1000 |
| 26–40 | 381 (25.4%) | 359 (23.9%) | 382 (25.5%) | 378 (25.2%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 99 (99.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 95 (95.0%) | 4 (4.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 86 (86.0%) | 13 (13.0%) | 0 (0.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 4 | 66 (66.0%) | 32 (32.0%) | 1 (1.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 5 | 39 (39.0%) | 56 (56.0%) | 5 (5.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 68 (13.6%) | 403 (80.6%) | 16 (3.2%) | 13 (2.6%) | 0 (0.0%) | 500 |
| 11–15 | 24 (4.8%) | 299 (59.8%) | 154 (30.8%) | 23 (4.6%) | 0 (0.0%) | 500 |
| 16–25 | 18 (1.8%) | 167 (16.7%) | 583 (58.3%) | 232 (23.2%) | 0 (0.0%) | 1000 |
| 26–40 | 5 (0.3%) | 25 (1.7%) | 240 (16.0%) | 1230 (82.0%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 385 | 77.0% |
| Pl. 6–10 | 68 | 13.6% |
| Pl. 11–15 | 24 | 4.8% |
| Pl. 16–25 | 18 | 3.6% |
| Pl. 26–40 | 5 | 1.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 90/106 (84.9%) | 115/146 (78.8%) | 97/131 (74.0%) | 83/117 (70.9%) |
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
| City Circuit | motorbike | 60s | 40 | 0.0% | 2.8% ⚠️ | +2.8% | 0.0 | 0.000090 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| City Circuit | motorbike | 60s | 40 | 19.4% | 77.0% | 57.6% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| City Circuit | motorbike | 60s | 25% | 85% | 106 | 18% | 79% | 146 | 18% | 74% | 131 | 16% | 71% | 117 |

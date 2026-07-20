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
| Ice Track | snowmobile | 60s | 4 | 25.0% | 26.0% | 23.0% | 25.5% | 0.7 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Ice Track × snowmobile × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 0.72 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 26 | 26.0% | 25.0% | +1.0% | 20.7 | 11.7 |
| Row 1 | 23 | 23.0% | 25.0% | -2.0% | 20.7 | 11.5 |
| Row 2 | 23 | 23.0% | 25.0% | -2.0% | 20.6 | 11.5 |
| Row 3 | 28 | 28.0% | 25.0% | +3.0% | 20.0 | 11.5 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 0.72 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 373 | 74.6% |
| B2 (Pl. 6–15) | 1000 | 683 | 68.3% |
| B3 (Pl. 16–25) | 1000 | 592 | 59.2% |
| B4 (Pl. 26–40) | 1500 | 1242 | 82.8% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 26 (26.0%) | 23 (23.0%) | 23 (23.0%) | 28 (28.0%) | 100 |
| 2 | 27 (27.0%) | 26 (26.0%) | 24 (24.0%) | 23 (23.0%) | 100 |
| 3 | 22 (22.0%) | 22 (22.0%) | 28 (28.0%) | 28 (28.0%) | 100 |
| 4 | 28 (28.0%) | 23 (23.0%) | 25 (25.0%) | 24 (24.0%) | 100 |
| 5 | 24 (24.0%) | 29 (29.0%) | 24 (24.0%) | 23 (23.0%) | 100 |
| 6–10 | 128 (25.6%) | 113 (22.6%) | 118 (23.6%) | 141 (28.2%) | 500 |
| 11–15 | 115 (23.0%) | 126 (25.2%) | 134 (26.8%) | 125 (25.0%) | 500 |
| 16–25 | 249 (24.9%) | 263 (26.3%) | 240 (24.0%) | 248 (24.8%) | 1000 |
| 26–40 | 381 (25.4%) | 375 (25.0%) | 384 (25.6%) | 360 (24.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 95 (95.0%) | 2 (2.0%) | 0 (0.0%) | 3 (3.0%) | 0 (0.0%) | 100 |
| 3 | 86 (86.0%) | 13 (13.0%) | 0 (0.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 4 | 58 (58.0%) | 38 (38.0%) | 1 (1.0%) | 3 (3.0%) | 0 (0.0%) | 100 |
| 5 | 34 (34.0%) | 63 (63.0%) | 0 (0.0%) | 3 (3.0%) | 0 (0.0%) | 100 |
| 6–10 | 77 (15.4%) | 389 (77.8%) | 21 (4.2%) | 13 (2.6%) | 0 (0.0%) | 500 |
| 11–15 | 25 (5.0%) | 294 (58.8%) | 157 (31.4%) | 24 (4.8%) | 0 (0.0%) | 500 |
| 16–25 | 18 (1.8%) | 179 (17.9%) | 592 (59.2%) | 211 (21.1%) | 0 (0.0%) | 1000 |
| 26–40 | 7 (0.5%) | 22 (1.5%) | 229 (15.3%) | 1242 (82.8%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 373 | 74.6% |
| Pl. 6–10 | 77 | 15.4% |
| Pl. 11–15 | 25 | 5.0% |
| Pl. 16–25 | 18 | 3.6% |
| Pl. 26–40 | 7 | 1.4% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 94/119 (79.0%) | 98/124 (79.0%) | 96/127 (75.6%) | 85/130 (65.4%) |
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
| Ice Track | snowmobile | 60s | 40 | 0.0% | 2.7% ⚠️ | +2.7% | 0.0 | 0.000097 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Ice Track | snowmobile | 60s | 40 | 19.0% | 74.6% | 55.6% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Ice Track | snowmobile | 60s | 22% | 79% | 119 | 24% | 79% | 124 | 13% | 76% | 127 | 17% | 65% | 130 |

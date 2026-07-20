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
| Ice Track | snowmobile | 60s | 4 | 25.0% | 24.0% | 27.0% | 24.5% | 1.0 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Ice Track × snowmobile × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 0.99 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 72 | 24.0% | 25.0% | -1.0% | 20.8 | 11.6 |
| Row 1 | 81 | 27.0% | 25.0% | +2.0% | 20.4 | 11.5 |
| Row 2 | 77 | 25.7% | 25.0% | +0.7% | 20.4 | 11.6 |
| Row 3 | 70 | 23.3% | 25.0% | -1.7% | 20.4 | 11.5 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 0.99 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 1500 | 1237 | 82.5% |
| B2 (Pl. 6–15) | 3000 | 2374 | 79.1% |
| B3 (Pl. 16–25) | 3000 | 2123 | 70.8% |
| B4 (Pl. 26–40) | 4500 | 3971 | 88.2% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 72 (24.0%) | 81 (27.0%) | 77 (25.7%) | 70 (23.3%) | 300 |
| 2 | 74 (24.7%) | 84 (28.0%) | 69 (23.0%) | 73 (24.3%) | 300 |
| 3 | 67 (22.3%) | 80 (26.7%) | 86 (28.7%) | 67 (22.3%) | 300 |
| 4 | 63 (21.0%) | 67 (22.3%) | 74 (24.7%) | 96 (32.0%) | 300 |
| 5 | 76 (25.3%) | 63 (21.0%) | 84 (28.0%) | 77 (25.7%) | 300 |
| 6–10 | 385 (25.7%) | 376 (25.1%) | 376 (25.1%) | 363 (24.2%) | 1500 |
| 11–15 | 362 (24.1%) | 362 (24.1%) | 382 (25.5%) | 394 (26.3%) | 1500 |
| 16–25 | 751 (25.0%) | 777 (25.9%) | 718 (23.9%) | 754 (25.1%) | 3000 |
| 26–40 | 1150 (25.6%) | 1110 (24.7%) | 1134 (25.2%) | 1106 (24.6%) | 4500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 299 (99.7%) | 1 (0.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 2 | 298 (99.3%) | 2 (0.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 3 | 277 (92.3%) | 23 (7.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 4 | 226 (75.3%) | 73 (24.3%) | 0 (0.0%) | 1 (0.3%) | 0 (0.0%) | 300 |
| 5 | 137 (45.7%) | 162 (54.0%) | 0 (0.0%) | 1 (0.3%) | 0 (0.0%) | 300 |
| 6–10 | 193 (12.9%) | 1289 (85.9%) | 13 (0.9%) | 5 (0.3%) | 0 (0.0%) | 1500 |
| 11–15 | 46 (3.1%) | 1085 (72.3%) | 355 (23.7%) | 14 (0.9%) | 0 (0.0%) | 1500 |
| 16–25 | 19 (0.6%) | 350 (11.7%) | 2123 (70.8%) | 508 (16.9%) | 0 (0.0%) | 3000 |
| 26–40 | 5 (0.1%) | 15 (0.3%) | 509 (11.3%) | 3971 (88.2%) | 0 (0.0%) | 4500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 1237 | 82.5% |
| Pl. 6–10 | 193 | 12.9% |
| Pl. 11–15 | 46 | 3.1% |
| Pl. 16–25 | 19 | 1.3% |
| Pl. 26–40 | 5 | 0.3% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 292/351 (83.2%) | 332/404 (82.2%) | 320/386 (82.9%) | 293/359 (81.6%) |
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
| Ice Track | snowmobile | 60s | 40 | 0.0% | 2.8% ⚠️ | +2.8% | 0.0 | 0.000092 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Ice Track | snowmobile | 60s | 40 | 21.5% | 82.5% | 61.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Ice Track | snowmobile | 60s | 23% | 83% | 351 | 22% | 82% | 404 | 20% | 83% | 386 | 21% | 82% | 359 |

# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-16  
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
| Ice Track | snowmobile | 60s | 4 | 25.0% | 31.0% | 28.0% | 20.5% | 4.4 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Ice Track × snowmobile × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 4.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 31 | 31.0% | 25.0% | +6.0% | 19.4 | 11.6 |
| Row 1 | 28 | 28.0% | 25.0% | +3.0% | 20.3 | 11.4 |
| Row 2 | 24 | 24.0% | 25.0% | -1.0% | 21.4 | 11.6 |
| Row 3 | 17 | 17.0% | 25.0% | -8.0% | 20.9 | 11.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 4.40 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 307 | 61.4% |
| B2 (Pl. 6–15) | 1000 | 575 | 57.5% |
| B3 (Pl. 16–25) | 1000 | 562 | 56.2% |
| B4 (Pl. 26–40) | 1500 | 1079 | 71.9% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 31 (31.0%) | 28 (28.0%) | 24 (24.0%) | 17 (17.0%) | 100 |
| 2 | 28 (28.0%) | 23 (23.0%) | 24 (24.0%) | 25 (25.0%) | 100 |
| 3 | 26 (26.0%) | 21 (21.0%) | 27 (27.0%) | 26 (26.0%) | 100 |
| 4 | 25 (25.0%) | 24 (24.0%) | 23 (23.0%) | 28 (28.0%) | 100 |
| 5 | 31 (31.0%) | 21 (21.0%) | 28 (28.0%) | 20 (20.0%) | 100 |
| 6–10 | 149 (29.8%) | 131 (26.2%) | 96 (19.2%) | 124 (24.8%) | 500 |
| 11–15 | 125 (25.0%) | 132 (26.4%) | 130 (26.0%) | 113 (22.6%) | 500 |
| 16–25 | 257 (25.7%) | 258 (25.8%) | 217 (21.7%) | 268 (26.8%) | 1000 |
| 26–40 | 328 (21.9%) | 362 (24.1%) | 431 (28.7%) | 379 (25.3%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 94 (94.0%) | 2 (2.0%) | 0 (0.0%) | 4 (4.0%) | 0 (0.0%) | 100 |
| 2 | 87 (87.0%) | 5 (5.0%) | 3 (3.0%) | 5 (5.0%) | 0 (0.0%) | 100 |
| 3 | 67 (67.0%) | 17 (17.0%) | 5 (5.0%) | 11 (11.0%) | 0 (0.0%) | 100 |
| 4 | 37 (37.0%) | 47 (47.0%) | 5 (5.0%) | 11 (11.0%) | 0 (0.0%) | 100 |
| 5 | 22 (22.0%) | 52 (52.0%) | 14 (14.0%) | 12 (12.0%) | 0 (0.0%) | 100 |
| 6–10 | 60 (12.0%) | 321 (64.2%) | 54 (10.8%) | 65 (13.0%) | 0 (0.0%) | 500 |
| 11–15 | 42 (8.4%) | 254 (50.8%) | 128 (25.6%) | 76 (15.2%) | 0 (0.0%) | 500 |
| 16–25 | 38 (3.8%) | 163 (16.3%) | 562 (56.2%) | 237 (23.7%) | 0 (0.0%) | 1000 |
| 26–40 | 53 (3.5%) | 139 (9.3%) | 229 (15.3%) | 1079 (71.9%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 307 | 61.4% |
| Pl. 6–10 | 60 | 12.0% |
| Pl. 11–15 | 42 | 8.4% |
| Pl. 16–25 | 38 | 7.6% |
| Pl. 26–40 | 53 | 10.6% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 82/119 (68.9%) | 79/124 (63.7%) | 80/127 (63.0%) | 66/130 (50.8%) |
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
| Ice Track | snowmobile | 60s | 40 | 0.0% | 2.2% ⚠️ | +2.2% | 0.0 | 0.000089 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Ice Track | snowmobile | 60s | 40 | 16.4% | 61.4% | 45.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Ice Track | snowmobile | 60s | 23% | 69% | 119 | 16% | 64% | 124 | 10% | 63% | 127 | 17% | 51% | 130 |

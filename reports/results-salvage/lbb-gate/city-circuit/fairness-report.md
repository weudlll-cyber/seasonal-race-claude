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
| City Circuit | motorbike | 60s | 4 | 25.0% | 27.0% | 30.3% | 21.3% | 7.5 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### City Circuit × motorbike × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 7.55 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 81 | 27.0% | 25.0% | +2.0% | 21.0 | 11.6 |
| Row 1 | 91 | 30.3% | 25.0% | +5.3% | 20.3 | 11.5 |
| Row 2 | 60 | 20.0% | 25.0% | -5.0% | 20.7 | 11.5 |
| Row 3 | 68 | 22.7% | 25.0% | -2.3% | 20.0 | 11.6 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 7.55 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 1500 | 1251 | 83.4% |
| B2 (Pl. 6–15) | 3000 | 2392 | 79.7% |
| B3 (Pl. 16–25) | 3000 | 2099 | 70.0% |
| B4 (Pl. 26–40) | 4500 | 3938 | 87.5% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 81 (27.0%) | 91 (30.3%) | 60 (20.0%) | 68 (22.7%) | 300 |
| 2 | 61 (20.3%) | 73 (24.3%) | 78 (26.0%) | 88 (29.3%) | 300 |
| 3 | 71 (23.7%) | 78 (26.0%) | 61 (20.3%) | 90 (30.0%) | 300 |
| 4 | 82 (27.3%) | 75 (25.0%) | 74 (24.7%) | 69 (23.0%) | 300 |
| 5 | 58 (19.3%) | 74 (24.7%) | 81 (27.0%) | 87 (29.0%) | 300 |
| 6–10 | 377 (25.1%) | 368 (24.5%) | 371 (24.7%) | 384 (25.6%) | 1500 |
| 11–15 | 348 (23.2%) | 349 (23.3%) | 403 (26.9%) | 400 (26.7%) | 1500 |
| 16–25 | 755 (25.2%) | 793 (26.4%) | 733 (24.4%) | 719 (24.0%) | 3000 |
| 26–40 | 1167 (25.9%) | 1099 (24.4%) | 1139 (25.3%) | 1095 (24.3%) | 4500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 299 (99.7%) | 1 (0.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 2 | 296 (98.7%) | 4 (1.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 3 | 283 (94.3%) | 16 (5.3%) | 0 (0.0%) | 1 (0.3%) | 0 (0.0%) | 300 |
| 4 | 233 (77.7%) | 65 (21.7%) | 1 (0.3%) | 1 (0.3%) | 0 (0.0%) | 300 |
| 5 | 140 (46.7%) | 159 (53.0%) | 0 (0.0%) | 1 (0.3%) | 0 (0.0%) | 300 |
| 6–10 | 172 (11.5%) | 1301 (86.7%) | 14 (0.9%) | 13 (0.9%) | 0 (0.0%) | 1500 |
| 11–15 | 54 (3.6%) | 1091 (72.7%) | 340 (22.7%) | 15 (1.0%) | 0 (0.0%) | 1500 |
| 16–25 | 19 (0.6%) | 351 (11.7%) | 2099 (70.0%) | 531 (17.7%) | 0 (0.0%) | 3000 |
| 26–40 | 4 (0.1%) | 12 (0.3%) | 546 (12.1%) | 3938 (87.5%) | 0 (0.0%) | 4500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 1251 | 83.4% |
| Pl. 6–10 | 172 | 11.5% |
| Pl. 11–15 | 54 | 3.6% |
| Pl. 16–25 | 19 | 1.3% |
| Pl. 26–40 | 4 | 0.3% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 311/363 (85.7%) | 327/401 (81.5%) | 286/352 (81.3%) | 327/384 (85.2%) |
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
| City Circuit | motorbike | 60s | 40 | 0.0% | 3.0% ⚠️ | +3.0% | 0.0 | 0.000087 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| City Circuit | motorbike | 60s | 40 | 22.1% | 83.4% | 61.3% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| City Circuit | motorbike | 60s | 23% | 86% | 363 | 22% | 82% | 401 | 24% | 81% | 352 | 21% | 85% | 384 |

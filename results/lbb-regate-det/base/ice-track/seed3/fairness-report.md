# RaceArena — Fairness Simulation Report

**Datum:** 2026-07-03  
**Rennen pro Kombination:** 50  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–50  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Ice Track | snowmobile | 60s | 4 | 25.0% | 28.0% | 22.0% | 25.0% | 0.7 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Ice Track × snowmobile × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 0.72 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 14 | 28.0% | 25.0% | +3.0% | 20.0 | 11.4 |
| Row 1 | 11 | 22.0% | 25.0% | -3.0% | 21.2 | 11.3 |
| Row 2 | 11 | 22.0% | 25.0% | -3.0% | 20.9 | 11.7 |
| Row 3 | 14 | 28.0% | 25.0% | +3.0% | 19.8 | 11.8 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 0.72 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 250 | 220 | 88.0% |
| B2 (Pl. 6–15) | 500 | 397 | 79.4% |
| B3 (Pl. 16–25) | 500 | 339 | 67.8% |
| B4 (Pl. 26–40) | 750 | 652 | 86.9% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 14 (28.0%) | 11 (22.0%) | 11 (22.0%) | 14 (28.0%) | 50 |
| 2 | 12 (24.0%) | 9 (18.0%) | 15 (30.0%) | 14 (28.0%) | 50 |
| 3 | 16 (32.0%) | 9 (18.0%) | 13 (26.0%) | 12 (24.0%) | 50 |
| 4 | 11 (22.0%) | 14 (28.0%) | 13 (26.0%) | 12 (24.0%) | 50 |
| 5 | 13 (26.0%) | 10 (20.0%) | 14 (28.0%) | 13 (26.0%) | 50 |
| 6–10 | 64 (25.6%) | 57 (22.8%) | 53 (21.2%) | 76 (30.4%) | 250 |
| 11–15 | 54 (21.6%) | 61 (24.4%) | 62 (24.8%) | 73 (29.2%) | 250 |
| 16–25 | 145 (29.0%) | 130 (26.0%) | 117 (23.4%) | 108 (21.6%) | 500 |
| 26–40 | 171 (22.8%) | 199 (26.5%) | 202 (26.9%) | 178 (23.7%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 50 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 2 | 50 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 3 | 48 (96.0%) | 2 (4.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 4 | 43 (86.0%) | 7 (14.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 5 | 29 (58.0%) | 21 (42.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 6–10 | 20 (8.0%) | 220 (88.0%) | 7 (2.8%) | 3 (1.2%) | 0 (0.0%) | 250 |
| 11–15 | 9 (3.6%) | 177 (70.8%) | 57 (22.8%) | 7 (2.8%) | 0 (0.0%) | 250 |
| 16–25 | 1 (0.2%) | 72 (14.4%) | 339 (67.8%) | 88 (17.6%) | 0 (0.0%) | 500 |
| 26–40 | 0 (0.0%) | 1 (0.1%) | 97 (12.9%) | 652 (86.9%) | 0 (0.0%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 220 | 88.0% |
| Pl. 6–10 | 20 | 8.0% |
| Pl. 11–15 | 9 | 3.6% |
| Pl. 16–25 | 1 | 0.4% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 60/65 (92.3%) | 46/50 (92.0%) | 58/69 (84.1%) | 56/66 (84.8%) |
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
| Ice Track | snowmobile | 60s | 40 | 0.0% | 2.6% ⚠️ | +2.6% | 0.0 | 0.000028 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Ice Track | snowmobile | 60s | 40 | 38.4% | 88.0% | 49.6% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Ice Track | snowmobile | 60s | 42% | 92% | 65 | 44% | 92% | 50 | 32% | 84% | 69 | 38% | 85% | 66 |

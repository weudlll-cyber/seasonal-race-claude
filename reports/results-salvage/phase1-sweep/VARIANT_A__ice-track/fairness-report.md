# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-17  
**Rennen pro Kombination:** 40  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–40  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Ice Track | snowmobile | 60s | 4 | 25.0% | 27.5% | 17.5% | 27.5% | 1.4 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Ice Track × snowmobile × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 1.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 11 | 27.5% | 25.0% | +2.5% | 20.4 | 11.7 |
| Row 1 | 7 | 17.5% | 25.0% | -7.5% | 20.8 | 11.2 |
| Row 2 | 10 | 25.0% | 25.0% | +0.0% | 20.9 | 11.6 |
| Row 3 | 12 | 30.0% | 25.0% | +5.0% | 19.9 | 11.7 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 1.40 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 200 | 154 | 77.0% |
| B2 (Pl. 6–15) | 400 | 301 | 75.3% |
| B3 (Pl. 16–25) | 400 | 278 | 69.5% |
| B4 (Pl. 26–40) | 600 | 520 | 86.7% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (10R) | Row 1 (10R) | Row 2 (10R) | Row 3 (10R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 11 (27.5%) | 7 (17.5%) | 10 (25.0%) | 12 (30.0%) | 40 |
| 2 | 12 (30.0%) | 7 (17.5%) | 11 (27.5%) | 10 (25.0%) | 40 |
| 3 | 6 (15.0%) | 9 (22.5%) | 12 (30.0%) | 13 (32.5%) | 40 |
| 4 | 15 (37.5%) | 10 (25.0%) | 7 (17.5%) | 8 (20.0%) | 40 |
| 5 | 10 (25.0%) | 10 (25.0%) | 9 (22.5%) | 11 (27.5%) | 40 |
| 6–10 | 45 (22.5%) | 56 (28.0%) | 43 (21.5%) | 56 (28.0%) | 200 |
| 11–15 | 59 (29.5%) | 38 (19.0%) | 50 (25.0%) | 53 (26.5%) | 200 |
| 16–25 | 86 (21.5%) | 115 (28.7%) | 107 (26.8%) | 92 (23.0%) | 400 |
| 26–40 | 156 (26.0%) | 148 (24.7%) | 151 (25.2%) | 145 (24.2%) | 600 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 40 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 2 | 37 (92.5%) | 2 (5.0%) | 0 (0.0%) | 1 (2.5%) | 0 (0.0%) | 40 |
| 3 | 36 (90.0%) | 4 (10.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 4 | 29 (72.5%) | 11 (27.5%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 5 | 12 (30.0%) | 25 (62.5%) | 1 (2.5%) | 2 (5.0%) | 0 (0.0%) | 40 |
| 6–10 | 24 (12.0%) | 169 (84.5%) | 3 (1.5%) | 4 (2.0%) | 0 (0.0%) | 200 |
| 11–15 | 7 (3.5%) | 132 (66.0%) | 51 (25.5%) | 10 (5.0%) | 0 (0.0%) | 200 |
| 16–25 | 10 (2.5%) | 49 (12.3%) | 278 (69.5%) | 63 (15.8%) | 0 (0.0%) | 400 |
| 26–40 | 5 (0.8%) | 8 (1.3%) | 67 (11.2%) | 520 (86.7%) | 0 (0.0%) | 600 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 154 | 77.0% |
| Pl. 6–10 | 24 | 12.0% |
| Pl. 11–15 | 7 | 3.5% |
| Pl. 16–25 | 10 | 5.0% |
| Pl. 26–40 | 5 | 2.5% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 39/48 (81.3%) | 37/46 (80.4%) | 40/56 (71.4%) | 38/50 (76.0%) |
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
| Ice Track | snowmobile | 60s | 40 | 0.0% | 2.5% ⚠️ | +2.5% | 0.0 | 0.000091 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Ice Track | snowmobile | 60s | 40 | 25.0% | 77.0% | 52.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Ice Track | snowmobile | 60s | 38% | 81% | 48 | 28% | 80% | 46 | 16% | 71% | 56 | 20% | 76% | 50 |

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
| Searound | manta | 30s | 7 | 15.0% | 14.0% | 22.0% | 12.8% | 13.9 | * (p<0.05) | ⚠️ Unequal |
| Searound | manta | 60s | 7 | 15.0% | 21.0% | 24.0% | 11.0% | 12.4 | n.s. | ✅ Fair |
| Searound | manta | 120s | 7 | 15.0% | 17.0% | 14.0% | 13.8% | 1.6 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 30s

- **finishT:** 1.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 13.85 — * (p<0.05)

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 14 | 14.0% | 15.0% | -1.0% | 20.0 | 12.2 |
| Row 1 | 22 | 22.0% | 15.0% | +7.0% | 20.1 | 12.0 |
| Row 2 | 14 | 14.0% | 15.0% | -1.0% | 20.9 | 12.0 |
| Row 3 | 14 | 14.0% | 15.0% | -1.0% | 21.0 | 11.5 |
| Row 4 | 23 | 23.0% | 15.0% | +8.0% | 20.8 | 11.5 |
| Row 5 | 8 | 8.0% | 12.5% | -4.5% | 20.0 | 10.5 |
| Row 6 | 5 | 5.0% | 12.5% | -7.5% | 20.7 | 10.6 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 13.85 | * (p<0.05)


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 342 | 68.4% |
| B2 (Pl. 6–15) | 1000 | 672 | 67.2% |
| B3 (Pl. 16–25) | 1000 | 641 | 64.1% |
| B4 (Pl. 26–40) | 1500 | 1278 | 85.2% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 14 (14.0%) | 22 (22.0%) | 14 (14.0%) | 14 (14.0%) | 23 (23.0%) | 8 (8.0%) | 5 (5.0%) | 100 |
| 2 | 25 (25.0%) | 21 (21.0%) | 17 (17.0%) | 11 (11.0%) | 11 (11.0%) | 8 (8.0%) | 7 (7.0%) | 100 |
| 3 | 19 (19.0%) | 10 (10.0%) | 18 (18.0%) | 20 (20.0%) | 10 (10.0%) | 17 (17.0%) | 6 (6.0%) | 100 |
| 4 | 20 (20.0%) | 17 (17.0%) | 15 (15.0%) | 10 (10.0%) | 19 (19.0%) | 9 (9.0%) | 10 (10.0%) | 100 |
| 5 | 21 (21.0%) | 15 (15.0%) | 10 (10.0%) | 12 (12.0%) | 21 (21.0%) | 11 (11.0%) | 10 (10.0%) | 100 |
| 6–10 | 75 (15.0%) | 81 (16.2%) | 85 (17.0%) | 72 (14.4%) | 58 (11.6%) | 65 (13.0%) | 64 (12.8%) | 500 |
| 11–15 | 67 (13.4%) | 75 (15.0%) | 64 (12.8%) | 72 (14.4%) | 71 (14.2%) | 68 (13.6%) | 83 (16.6%) | 500 |
| 16–25 | 141 (14.1%) | 137 (13.7%) | 140 (14.0%) | 154 (15.4%) | 154 (15.4%) | 141 (14.1%) | 133 (13.3%) | 1000 |
| 26–40 | 218 (14.5%) | 222 (14.8%) | 237 (15.8%) | 235 (15.7%) | 233 (15.5%) | 173 (11.5%) | 182 (12.1%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 96 (96.0%) | 2 (2.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 88 (88.0%) | 5 (5.0%) | 4 (4.0%) | 3 (3.0%) | 0 (0.0%) | 100 |
| 3 | 78 (78.0%) | 17 (17.0%) | 0 (0.0%) | 5 (5.0%) | 0 (0.0%) | 100 |
| 4 | 45 (45.0%) | 49 (49.0%) | 3 (3.0%) | 3 (3.0%) | 0 (0.0%) | 100 |
| 5 | 35 (35.0%) | 64 (64.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 78 (15.6%) | 380 (76.0%) | 20 (4.0%) | 22 (4.4%) | 0 (0.0%) | 500 |
| 11–15 | 40 (8.0%) | 292 (58.4%) | 146 (29.2%) | 22 (4.4%) | 0 (0.0%) | 500 |
| 16–25 | 30 (3.0%) | 162 (16.2%) | 641 (64.1%) | 167 (16.7%) | 0 (0.0%) | 1000 |
| 26–40 | 10 (0.7%) | 29 (1.9%) | 183 (12.2%) | 1278 (85.2%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 342 | 68.4% |
| Pl. 6–10 | 78 | 15.6% |
| Pl. 11–15 | 40 | 8.0% |
| Pl. 16–25 | 30 | 6.0% |
| Pl. 26–40 | 10 | 2.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 60/75 (80.0%) | 63/80 (78.8%) | 56/71 (78.9%) | 48/86 (55.8%) | 55/74 (74.3%) | 36/59 (61.0%) | 24/55 (43.6%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–40 ✅ Soll erreicht | 0 | — |
| Pl. 26–40 | 0 | — |
| Pl. 16–25 | 0 | — |
| Pl. 6–15 | 0 | — |
| Pl. 1–5 ❌ Brems-Leck | 0 | — |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) |

### Searound × manta × 60s

- **finishT:** 2.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 12.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 21 | 21.0% | 15.0% | +6.0% | 20.6 | 12.0 |
| Row 1 | 24 | 24.0% | 15.0% | +9.0% | 20.4 | 11.7 |
| Row 2 | 13 | 13.0% | 15.0% | -2.0% | 20.9 | 11.8 |
| Row 3 | 10 | 10.0% | 15.0% | -5.0% | 20.5 | 11.7 |
| Row 4 | 14 | 14.0% | 15.0% | -1.0% | 20.5 | 11.4 |
| Row 5 | 7 | 7.0% | 12.5% | -5.5% | 19.8 | 11.1 |
| Row 6 | 11 | 11.0% | 12.5% | -1.5% | 20.7 | 10.9 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 12.40 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 393 | 78.6% |
| B2 (Pl. 6–15) | 1000 | 767 | 76.7% |
| B3 (Pl. 16–25) | 1000 | 705 | 70.5% |
| B4 (Pl. 26–40) | 1500 | 1319 | 87.9% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 21 (21.0%) | 24 (24.0%) | 13 (13.0%) | 10 (10.0%) | 14 (14.0%) | 7 (7.0%) | 11 (11.0%) | 100 |
| 2 | 19 (19.0%) | 13 (13.0%) | 14 (14.0%) | 16 (16.0%) | 19 (19.0%) | 12 (12.0%) | 7 (7.0%) | 100 |
| 3 | 17 (17.0%) | 11 (11.0%) | 18 (18.0%) | 17 (17.0%) | 13 (13.0%) | 12 (12.0%) | 12 (12.0%) | 100 |
| 4 | 9 (9.0%) | 15 (15.0%) | 18 (18.0%) | 21 (21.0%) | 12 (12.0%) | 16 (16.0%) | 9 (9.0%) | 100 |
| 5 | 10 (10.0%) | 18 (18.0%) | 18 (18.0%) | 16 (16.0%) | 13 (13.0%) | 10 (10.0%) | 15 (15.0%) | 100 |
| 6–10 | 87 (17.4%) | 68 (13.6%) | 67 (13.4%) | 79 (15.8%) | 76 (15.2%) | 69 (13.8%) | 54 (10.8%) | 500 |
| 11–15 | 64 (12.8%) | 72 (14.4%) | 71 (14.2%) | 75 (15.0%) | 76 (15.2%) | 74 (14.8%) | 68 (13.6%) | 500 |
| 16–25 | 136 (13.6%) | 166 (16.6%) | 149 (14.9%) | 134 (13.4%) | 152 (15.2%) | 131 (13.1%) | 132 (13.2%) | 1000 |
| 26–40 | 237 (15.8%) | 213 (14.2%) | 232 (15.5%) | 232 (15.5%) | 225 (15.0%) | 169 (11.3%) | 192 (12.8%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 98 (98.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 98 (98.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 93 (93.0%) | 5 (5.0%) | 1 (1.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 4 | 62 (62.0%) | 36 (36.0%) | 0 (0.0%) | 2 (2.0%) | 0 (0.0%) | 100 |
| 5 | 42 (42.0%) | 55 (55.0%) | 3 (3.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 71 (14.2%) | 411 (82.2%) | 13 (2.6%) | 5 (1.0%) | 0 (0.0%) | 500 |
| 11–15 | 20 (4.0%) | 356 (71.2%) | 107 (21.4%) | 17 (3.4%) | 0 (0.0%) | 500 |
| 16–25 | 14 (1.4%) | 125 (12.5%) | 705 (70.5%) | 156 (15.6%) | 0 (0.0%) | 1000 |
| 26–40 | 2 (0.1%) | 8 (0.5%) | 171 (11.4%) | 1319 (87.9%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 393 | 78.6% |
| Pl. 6–10 | 71 | 14.2% |
| Pl. 11–15 | 20 | 4.0% |
| Pl. 16–25 | 14 | 2.8% |
| Pl. 26–40 | 2 | 0.4% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 59/75 (78.7%) | 67/80 (83.8%) | 60/71 (84.5%) | 62/86 (72.1%) | 60/74 (81.1%) | 45/59 (76.3%) | 40/55 (72.7%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–40 ✅ Soll erreicht | 0 | — |
| Pl. 26–40 | 0 | — |
| Pl. 16–25 | 0 | — |
| Pl. 6–15 | 0 | — |
| Pl. 1–5 ❌ Brems-Leck | 0 | — |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) |

### Searound × manta × 120s

- **finishT:** 4.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 1.56 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 17 | 17.0% | 15.0% | +2.0% | 21.0 | 11.8 |
| Row 1 | 14 | 14.0% | 15.0% | -1.0% | 20.8 | 11.7 |
| Row 2 | 12 | 12.0% | 15.0% | -3.0% | 20.8 | 11.7 |
| Row 3 | 15 | 15.0% | 15.0% | +0.0% | 20.3 | 12.0 |
| Row 4 | 17 | 17.0% | 15.0% | +2.0% | 20.2 | 11.4 |
| Row 5 | 14 | 14.0% | 12.5% | +1.5% | 19.7 | 10.9 |
| Row 6 | 11 | 11.0% | 12.5% | -1.5% | 20.5 | 11.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(6) = 1.56 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 416 | 83.2% |
| B2 (Pl. 6–15) | 1000 | 807 | 80.7% |
| B3 (Pl. 16–25) | 1000 | 695 | 69.5% |
| B4 (Pl. 26–40) | 1500 | 1302 | 86.8% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 17 (17.0%) | 14 (14.0%) | 12 (12.0%) | 15 (15.0%) | 17 (17.0%) | 14 (14.0%) | 11 (11.0%) | 100 |
| 2 | 18 (18.0%) | 14 (14.0%) | 11 (11.0%) | 18 (18.0%) | 16 (16.0%) | 10 (10.0%) | 13 (13.0%) | 100 |
| 3 | 12 (12.0%) | 17 (17.0%) | 17 (17.0%) | 18 (18.0%) | 12 (12.0%) | 14 (14.0%) | 10 (10.0%) | 100 |
| 4 | 9 (9.0%) | 19 (19.0%) | 18 (18.0%) | 21 (21.0%) | 10 (10.0%) | 11 (11.0%) | 12 (12.0%) | 100 |
| 5 | 10 (10.0%) | 14 (14.0%) | 11 (11.0%) | 16 (16.0%) | 18 (18.0%) | 13 (13.0%) | 18 (18.0%) | 100 |
| 6–10 | 77 (15.4%) | 71 (14.2%) | 86 (17.2%) | 75 (15.0%) | 75 (15.0%) | 60 (12.0%) | 56 (11.2%) | 500 |
| 11–15 | 78 (15.6%) | 69 (13.8%) | 71 (14.2%) | 71 (14.2%) | 73 (14.6%) | 75 (15.0%) | 63 (12.6%) | 500 |
| 16–25 | 138 (13.8%) | 149 (14.9%) | 140 (14.0%) | 145 (14.5%) | 164 (16.4%) | 130 (13.0%) | 134 (13.4%) | 1000 |
| 26–40 | 241 (16.1%) | 233 (15.5%) | 234 (15.6%) | 221 (14.7%) | 215 (14.3%) | 173 (11.5%) | 183 (12.2%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 98 (98.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 71 (71.0%) | 29 (29.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 47 (47.0%) | 53 (53.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 61 (12.2%) | 430 (86.0%) | 8 (1.6%) | 1 (0.2%) | 0 (0.0%) | 500 |
| 11–15 | 18 (3.6%) | 377 (75.4%) | 103 (20.6%) | 2 (0.4%) | 0 (0.0%) | 500 |
| 16–25 | 5 (0.5%) | 105 (10.5%) | 695 (69.5%) | 195 (19.5%) | 0 (0.0%) | 1000 |
| 26–40 | 0 (0.0%) | 4 (0.3%) | 194 (12.9%) | 1302 (86.8%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 416 | 83.2% |
| Pl. 6–10 | 61 | 12.2% |
| Pl. 11–15 | 18 | 3.6% |
| Pl. 16–25 | 5 | 1.0% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 56/75 (74.7%) | 69/80 (86.3%) | 58/71 (81.7%) | 76/86 (88.4%) | 58/74 (78.4%) | 49/59 (83.1%) | 50/55 (90.9%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–40 ✅ Soll erreicht | 0 | — |
| Pl. 26–40 | 0 | — |
| Pl. 16–25 | 0 | — |
| Pl. 6–15 | 0 | — |
| Pl. 1–5 ❌ Brems-Leck | 0 | — |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) |

---

## Gesamtauswertung

**Getestete Kombinationen:** 3  
**Davon statistisch fair (p≥0.05):** 2  
**Davon statistisch unfair (p<0.05):** 1  

**Kombinationen mit signifikantem Ungleichgewicht (p < 0.05):**

- **Searound × manta × 30s:** Row 0 zu selten (14.0% statt erw. 15.0%) — * (p<0.05)

---

## Empfehlung

### Front-Row-Vorteil (Row 0 gewinnt zu oft)
Keine Kombination zeigt statistisch signifikanten Front-Row-Vorteil.

### Hinter-Row-Nachteil (Row 0 gewinnt zu selten / Catch-Up überkompensiert)
Keine Kombination zeigt Hinter-Row-Nachteil oder Überkompensation.

### Catch-Up-Mechanismus (speedBonusFactor = 1.0)
Unfairness tritt häufiger bei **kurzen Rennen (30s)** auf (1/1 unfaire Kombos). Der Catch-Up-Mechanismus benötigt Renndauer zum Wirken — bei sehr kurzen Rennen ist die Ausgleichswirkung begrenzt.

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
| Searound | manta | 30s | 40 | 0.0% | 5.8% ⚠️ | +5.8% | 0.2 | 0.000030 ✅ |
| Searound | manta | 60s | 40 | 0.0% | 4.6% ⚠️ | +4.6% | 0.2 | 0.000039 ✅ |
| Searound | manta | 120s | 40 | 0.0% | 3.6% ⚠️ | +3.6% | 0.2 | 0.000045 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 30s | 40 | 13.2% | 68.4% | 55.2% |
| Searound | manta | 60s | 40 | 20.4% | 78.6% | 58.2% |
| Searound | manta | 120s | 40 | 21.8% | 83.2% | 61.4% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 30s | 11% | 80% | 75 | 18% | 79% | 80 | 18% | 79% | 71 | 8% | 56% | 86 | 14% | 74% | 74 | 12% | 61% | 59 | 13% | 44% | 55 |
| Searound | manta | 60s | 23% | 79% | 75 | 19% | 84% | 80 | 28% | 85% | 71 | 26% | 72% | 86 | 15% | 81% | 74 | 14% | 76% | 59 | 16% | 73% | 55 |
| Searound | manta | 120s | 25% | 75% | 75 | 24% | 86% | 80 | 15% | 82% | 71 | 20% | 88% | 86 | 32% | 78% | 74 | 14% | 83% | 59 | 20% | 91% | 55 |

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
| Searound | manta | 30s | 7 | 15.0% | 13.0% | 20.0% | 13.4% | 9.5 | n.s. | ✅ Fair |
| Searound | manta | 60s | 7 | 15.0% | 19.0% | 21.0% | 12.0% | 7.9 | n.s. | ✅ Fair |
| Searound | manta | 120s | 7 | 15.0% | 19.0% | 16.0% | 13.0% | 3.1 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 30s

- **finishT:** 1.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 9.47 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 13 | 13.0% | 15.0% | -2.0% | 20.0 | 12.3 |
| Row 1 | 20 | 20.0% | 15.0% | +5.0% | 20.1 | 12.0 |
| Row 2 | 17 | 17.0% | 15.0% | +2.0% | 20.8 | 12.0 |
| Row 3 | 12 | 12.0% | 15.0% | -3.0% | 21.0 | 11.5 |
| Row 4 | 22 | 22.0% | 15.0% | +7.0% | 20.7 | 11.5 |
| Row 5 | 9 | 9.0% | 12.5% | -3.5% | 20.0 | 10.5 |
| Row 6 | 7 | 7.0% | 12.5% | -5.5% | 20.8 | 10.6 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 9.47 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 338 | 67.6% |
| B2 (Pl. 6–15) | 1000 | 678 | 67.8% |
| B3 (Pl. 16–25) | 1000 | 660 | 66.0% |
| B4 (Pl. 26–40) | 1500 | 1285 | 85.7% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 13 (13.0%) | 20 (20.0%) | 17 (17.0%) | 12 (12.0%) | 22 (22.0%) | 9 (9.0%) | 7 (7.0%) | 100 |
| 2 | 27 (27.0%) | 22 (22.0%) | 14 (14.0%) | 17 (17.0%) | 9 (9.0%) | 5 (5.0%) | 6 (6.0%) | 100 |
| 3 | 16 (16.0%) | 12 (12.0%) | 15 (15.0%) | 16 (16.0%) | 16 (16.0%) | 19 (19.0%) | 6 (6.0%) | 100 |
| 4 | 20 (20.0%) | 17 (17.0%) | 15 (15.0%) | 10 (10.0%) | 19 (19.0%) | 8 (8.0%) | 11 (11.0%) | 100 |
| 5 | 21 (21.0%) | 16 (16.0%) | 14 (14.0%) | 12 (12.0%) | 17 (17.0%) | 13 (13.0%) | 7 (7.0%) | 100 |
| 6–10 | 81 (16.2%) | 77 (15.4%) | 83 (16.6%) | 77 (15.4%) | 60 (12.0%) | 60 (12.0%) | 62 (12.4%) | 500 |
| 11–15 | 67 (13.4%) | 78 (15.6%) | 65 (13.0%) | 65 (13.0%) | 77 (15.4%) | 65 (13.0%) | 83 (16.6%) | 500 |
| 16–25 | 134 (13.4%) | 140 (14.0%) | 141 (14.1%) | 159 (15.9%) | 146 (14.6%) | 151 (15.1%) | 129 (12.9%) | 1000 |
| 26–40 | 221 (14.7%) | 218 (14.5%) | 236 (15.7%) | 232 (15.5%) | 234 (15.6%) | 170 (11.3%) | 189 (12.6%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 96 (96.0%) | 3 (3.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 87 (87.0%) | 6 (6.0%) | 4 (4.0%) | 3 (3.0%) | 0 (0.0%) | 100 |
| 3 | 76 (76.0%) | 21 (21.0%) | 0 (0.0%) | 3 (3.0%) | 0 (0.0%) | 100 |
| 4 | 42 (42.0%) | 49 (49.0%) | 3 (3.0%) | 6 (6.0%) | 0 (0.0%) | 100 |
| 5 | 37 (37.0%) | 62 (62.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 77 (15.4%) | 380 (76.0%) | 20 (4.0%) | 23 (4.6%) | 0 (0.0%) | 500 |
| 11–15 | 44 (8.8%) | 298 (59.6%) | 136 (27.2%) | 22 (4.4%) | 0 (0.0%) | 500 |
| 16–25 | 32 (3.2%) | 150 (15.0%) | 660 (66.0%) | 158 (15.8%) | 0 (0.0%) | 1000 |
| 26–40 | 9 (0.6%) | 31 (2.1%) | 175 (11.7%) | 1285 (85.7%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 338 | 67.6% |
| Pl. 6–10 | 77 | 15.4% |
| Pl. 11–15 | 44 | 8.8% |
| Pl. 16–25 | 32 | 6.4% |
| Pl. 26–40 | 9 | 1.8% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 60/75 (80.0%) | 62/80 (77.5%) | 56/71 (78.9%) | 49/86 (57.0%) | 54/74 (73.0%) | 35/59 (59.3%) | 22/55 (40.0%) |
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
- **Chi²(6):** 7.87 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 19 | 19.0% | 15.0% | +4.0% | 20.8 | 12.1 |
| Row 1 | 21 | 21.0% | 15.0% | +6.0% | 20.2 | 11.7 |
| Row 2 | 16 | 16.0% | 15.0% | +1.0% | 20.9 | 11.8 |
| Row 3 | 10 | 10.0% | 15.0% | -5.0% | 20.6 | 11.6 |
| Row 4 | 16 | 16.0% | 15.0% | +1.0% | 20.4 | 11.3 |
| Row 5 | 7 | 7.0% | 12.5% | -5.5% | 19.9 | 11.1 |
| Row 6 | 11 | 11.0% | 12.5% | -1.5% | 20.6 | 10.9 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 7.87 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 396 | 79.2% |
| B2 (Pl. 6–15) | 1000 | 769 | 76.9% |
| B3 (Pl. 16–25) | 1000 | 720 | 72.0% |
| B4 (Pl. 26–40) | 1500 | 1338 | 89.2% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 19 (19.0%) | 21 (21.0%) | 16 (16.0%) | 10 (10.0%) | 16 (16.0%) | 7 (7.0%) | 11 (11.0%) | 100 |
| 2 | 18 (18.0%) | 16 (16.0%) | 12 (12.0%) | 22 (22.0%) | 13 (13.0%) | 11 (11.0%) | 8 (8.0%) | 100 |
| 3 | 13 (13.0%) | 14 (14.0%) | 19 (19.0%) | 12 (12.0%) | 17 (17.0%) | 13 (13.0%) | 12 (12.0%) | 100 |
| 4 | 15 (15.0%) | 17 (17.0%) | 16 (16.0%) | 15 (15.0%) | 6 (6.0%) | 18 (18.0%) | 13 (13.0%) | 100 |
| 5 | 16 (16.0%) | 13 (13.0%) | 16 (16.0%) | 15 (15.0%) | 14 (14.0%) | 13 (13.0%) | 13 (13.0%) | 100 |
| 6–10 | 84 (16.8%) | 76 (15.2%) | 67 (13.4%) | 81 (16.2%) | 80 (16.0%) | 59 (11.8%) | 53 (10.6%) | 500 |
| 11–15 | 68 (13.6%) | 72 (14.4%) | 76 (15.2%) | 79 (15.8%) | 68 (13.6%) | 77 (15.4%) | 60 (12.0%) | 500 |
| 16–25 | 123 (12.3%) | 155 (15.5%) | 143 (14.3%) | 135 (13.5%) | 166 (16.6%) | 127 (12.7%) | 151 (15.1%) | 1000 |
| 26–40 | 244 (16.3%) | 216 (14.4%) | 235 (15.7%) | 231 (15.4%) | 220 (14.7%) | 175 (11.7%) | 179 (11.9%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 99 (99.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 98 (98.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 94 (94.0%) | 5 (5.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 69 (69.0%) | 29 (29.0%) | 1 (1.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 5 | 36 (36.0%) | 58 (58.0%) | 4 (4.0%) | 2 (2.0%) | 0 (0.0%) | 100 |
| 6–10 | 59 (11.8%) | 417 (83.4%) | 16 (3.2%) | 8 (1.6%) | 0 (0.0%) | 500 |
| 11–15 | 31 (6.2%) | 352 (70.4%) | 101 (20.2%) | 16 (3.2%) | 0 (0.0%) | 500 |
| 16–25 | 13 (1.3%) | 132 (13.2%) | 720 (72.0%) | 135 (13.5%) | 0 (0.0%) | 1000 |
| 26–40 | 1 (0.1%) | 4 (0.3%) | 157 (10.5%) | 1338 (89.2%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 396 | 79.2% |
| Pl. 6–10 | 59 | 11.8% |
| Pl. 11–15 | 31 | 6.2% |
| Pl. 16–25 | 13 | 2.6% |
| Pl. 26–40 | 1 | 0.2% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 62/75 (82.7%) | 67/80 (83.8%) | 64/71 (90.1%) | 61/86 (70.9%) | 53/74 (71.6%) | 47/59 (79.7%) | 42/55 (76.4%) |
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
- **Chi²(6):** 3.11 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 19 | 19.0% | 15.0% | +4.0% | 21.0 | 11.8 |
| Row 1 | 16 | 16.0% | 15.0% | +1.0% | 20.7 | 11.6 |
| Row 2 | 13 | 13.0% | 15.0% | -2.0% | 20.9 | 11.6 |
| Row 3 | 15 | 15.0% | 15.0% | +0.0% | 20.3 | 11.9 |
| Row 4 | 16 | 16.0% | 15.0% | +1.0% | 20.1 | 11.4 |
| Row 5 | 13 | 13.0% | 12.5% | +0.5% | 19.7 | 10.9 |
| Row 6 | 8 | 8.0% | 12.5% | -4.5% | 20.6 | 11.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 3.11 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 417 | 83.4% |
| B2 (Pl. 6–15) | 1000 | 808 | 80.8% |
| B3 (Pl. 16–25) | 1000 | 710 | 71.0% |
| B4 (Pl. 26–40) | 1500 | 1321 | 88.1% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 19 (19.0%) | 16 (16.0%) | 13 (13.0%) | 15 (15.0%) | 16 (16.0%) | 13 (13.0%) | 8 (8.0%) | 100 |
| 2 | 14 (14.0%) | 15 (15.0%) | 12 (12.0%) | 19 (19.0%) | 16 (16.0%) | 11 (11.0%) | 13 (13.0%) | 100 |
| 3 | 13 (13.0%) | 14 (14.0%) | 20 (20.0%) | 16 (16.0%) | 14 (14.0%) | 14 (14.0%) | 9 (9.0%) | 100 |
| 4 | 11 (11.0%) | 14 (14.0%) | 12 (12.0%) | 26 (26.0%) | 12 (12.0%) | 10 (10.0%) | 15 (15.0%) | 100 |
| 5 | 16 (16.0%) | 14 (14.0%) | 10 (10.0%) | 14 (14.0%) | 16 (16.0%) | 14 (14.0%) | 16 (16.0%) | 100 |
| 6–10 | 69 (13.8%) | 75 (15.0%) | 79 (15.8%) | 73 (14.6%) | 84 (16.8%) | 64 (12.8%) | 56 (11.2%) | 500 |
| 11–15 | 81 (16.2%) | 70 (14.0%) | 75 (15.0%) | 72 (14.4%) | 73 (14.6%) | 63 (12.6%) | 66 (13.2%) | 500 |
| 16–25 | 138 (13.8%) | 156 (15.6%) | 143 (14.3%) | 136 (13.6%) | 160 (16.0%) | 142 (14.2%) | 125 (12.5%) | 1000 |
| 26–40 | 239 (15.9%) | 226 (15.1%) | 236 (15.7%) | 229 (15.3%) | 209 (13.9%) | 169 (11.3%) | 192 (12.8%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 98 (98.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 72 (72.0%) | 28 (28.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 47 (47.0%) | 53 (53.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 64 (12.8%) | 426 (85.2%) | 9 (1.8%) | 1 (0.2%) | 0 (0.0%) | 500 |
| 11–15 | 13 (2.6%) | 382 (76.4%) | 102 (20.4%) | 3 (0.6%) | 0 (0.0%) | 500 |
| 16–25 | 6 (0.6%) | 109 (10.9%) | 710 (71.0%) | 175 (17.5%) | 0 (0.0%) | 1000 |
| 26–40 | 0 (0.0%) | 0 (0.0%) | 179 (11.9%) | 1321 (88.1%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 417 | 83.4% |
| Pl. 6–10 | 64 | 12.8% |
| Pl. 11–15 | 13 | 2.6% |
| Pl. 16–25 | 6 | 1.2% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 62/75 (82.7%) | 64/80 (80.0%) | 57/71 (80.3%) | 76/86 (88.4%) | 60/74 (81.1%) | 49/59 (83.1%) | 49/55 (89.1%) |
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
**Davon statistisch fair (p≥0.05):** 3  
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
| Searound | manta | 30s | 40 | 0.0% | 5.8% ⚠️ | +5.8% | 0.1 | 0.000030 ✅ |
| Searound | manta | 60s | 40 | 0.0% | 4.6% ⚠️ | +4.6% | 0.2 | 0.000040 ✅ |
| Searound | manta | 120s | 40 | 0.0% | 3.6% ⚠️ | +3.6% | 0.1 | 0.000045 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 30s | 40 | 15.4% | 67.6% | 52.2% |
| Searound | manta | 60s | 40 | 18.0% | 79.2% | 61.2% |
| Searound | manta | 120s | 40 | 23.6% | 83.4% | 59.8% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 30s | 13% | 80% | 75 | 18% | 78% | 80 | 23% | 79% | 71 | 14% | 57% | 86 | 16% | 73% | 74 | 12% | 59% | 59 | 11% | 40% | 55 |
| Searound | manta | 60s | 17% | 83% | 75 | 20% | 84% | 80 | 23% | 90% | 71 | 23% | 71% | 86 | 15% | 72% | 74 | 7% | 80% | 59 | 18% | 76% | 55 |
| Searound | manta | 120s | 31% | 83% | 75 | 24% | 80% | 80 | 20% | 80% | 71 | 9% | 88% | 86 | 36% | 81% | 74 | 19% | 83% | 59 | 29% | 89% | 55 |

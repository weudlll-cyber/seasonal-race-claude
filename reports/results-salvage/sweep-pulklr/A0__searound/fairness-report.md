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
| Searound | manta | 30s | 7 | 15.0% | 21.0% | 20.0% | 11.8% | 12.1 | n.s. | ✅ Fair |
| Searound | manta | 60s | 7 | 15.0% | 25.0% | 21.0% | 10.8% | 12.9 | * (p<0.05) | ⚠️ Front-Bias |
| Searound | manta | 120s | 7 | 15.0% | 20.0% | 19.0% | 12.2% | 8.6 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Searound × manta × 30s

- **finishT:** 1.0000 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 12.07 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 21 | 21.0% | 15.0% | +6.0% | 19.5 | 12.6 |
| Row 1 | 20 | 20.0% | 15.0% | +5.0% | 20.5 | 11.9 |
| Row 2 | 13 | 13.0% | 15.0% | -2.0% | 20.9 | 11.8 |
| Row 3 | 13 | 13.0% | 15.0% | -2.0% | 21.3 | 11.6 |
| Row 4 | 20 | 20.0% | 15.0% | +5.0% | 20.7 | 11.3 |
| Row 5 | 6 | 6.0% | 12.5% | -6.5% | 20.0 | 10.5 |
| Row 6 | 7 | 7.0% | 12.5% | -5.5% | 20.5 | 10.7 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 12.07 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 337 | 67.4% |
| B2 (Pl. 6–15) | 1000 | 697 | 69.7% |
| B3 (Pl. 16–25) | 1000 | 670 | 67.0% |
| B4 (Pl. 26–40) | 1500 | 1293 | 86.2% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 21 (21.0%) | 20 (20.0%) | 13 (13.0%) | 13 (13.0%) | 20 (20.0%) | 6 (6.0%) | 7 (7.0%) | 100 |
| 2 | 27 (27.0%) | 15 (15.0%) | 16 (16.0%) | 18 (18.0%) | 8 (8.0%) | 12 (12.0%) | 4 (4.0%) | 100 |
| 3 | 29 (29.0%) | 16 (16.0%) | 18 (18.0%) | 10 (10.0%) | 17 (17.0%) | 4 (4.0%) | 6 (6.0%) | 100 |
| 4 | 20 (20.0%) | 14 (14.0%) | 12 (12.0%) | 15 (15.0%) | 14 (14.0%) | 14 (14.0%) | 11 (11.0%) | 100 |
| 5 | 16 (16.0%) | 23 (23.0%) | 12 (12.0%) | 12 (12.0%) | 13 (13.0%) | 14 (14.0%) | 10 (10.0%) | 100 |
| 6–10 | 85 (17.0%) | 66 (13.2%) | 77 (15.4%) | 69 (13.8%) | 68 (13.6%) | 65 (13.0%) | 70 (14.0%) | 500 |
| 11–15 | 61 (12.2%) | 68 (13.6%) | 71 (14.2%) | 79 (15.8%) | 72 (14.4%) | 72 (14.4%) | 77 (15.4%) | 500 |
| 16–25 | 118 (11.8%) | 150 (15.0%) | 151 (15.1%) | 140 (14.0%) | 162 (16.2%) | 144 (14.4%) | 135 (13.5%) | 1000 |
| 26–40 | 223 (14.9%) | 228 (15.2%) | 230 (15.3%) | 244 (16.3%) | 226 (15.1%) | 169 (11.3%) | 180 (12.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 96 (96.0%) | 4 (4.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 85 (85.0%) | 7 (7.0%) | 5 (5.0%) | 3 (3.0%) | 0 (0.0%) | 100 |
| 3 | 75 (75.0%) | 18 (18.0%) | 1 (1.0%) | 6 (6.0%) | 0 (0.0%) | 100 |
| 4 | 50 (50.0%) | 42 (42.0%) | 7 (7.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 5 | 31 (31.0%) | 63 (63.0%) | 4 (4.0%) | 2 (2.0%) | 0 (0.0%) | 100 |
| 6–10 | 78 (15.6%) | 388 (77.6%) | 16 (3.2%) | 18 (3.6%) | 0 (0.0%) | 500 |
| 11–15 | 46 (9.2%) | 309 (61.8%) | 126 (25.2%) | 19 (3.8%) | 0 (0.0%) | 500 |
| 16–25 | 31 (3.1%) | 141 (14.1%) | 670 (67.0%) | 158 (15.8%) | 0 (0.0%) | 1000 |
| 26–40 | 8 (0.5%) | 28 (1.9%) | 171 (11.4%) | 1293 (86.2%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 337 | 67.4% |
| Pl. 6–10 | 78 | 15.6% |
| Pl. 11–15 | 46 | 9.2% |
| Pl. 16–25 | 31 | 6.2% |
| Pl. 26–40 | 8 | 1.6% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 58/75 (77.3%) | 63/80 (78.8%) | 53/71 (74.6%) | 52/86 (60.5%) | 51/74 (68.9%) | 35/59 (59.3%) | 25/55 (45.5%) |
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
- **Chi²(6):** 12.93 — * (p<0.05)

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 25 | 25.0% | 15.0% | +10.0% | 20.3 | 12.1 |
| Row 1 | 21 | 21.0% | 15.0% | +6.0% | 20.4 | 11.7 |
| Row 2 | 12 | 12.0% | 15.0% | -3.0% | 20.9 | 11.9 |
| Row 3 | 10 | 10.0% | 15.0% | -5.0% | 20.8 | 11.6 |
| Row 4 | 12 | 12.0% | 15.0% | -3.0% | 20.4 | 11.4 |
| Row 5 | 10 | 10.0% | 12.5% | -2.5% | 19.9 | 11.1 |
| Row 6 | 10 | 10.0% | 12.5% | -2.5% | 20.7 | 10.9 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 12.93 | * (p<0.05)


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 396 | 79.2% |
| B2 (Pl. 6–15) | 1000 | 766 | 76.6% |
| B3 (Pl. 16–25) | 1000 | 697 | 69.7% |
| B4 (Pl. 26–40) | 1500 | 1314 | 87.6% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 25 (25.0%) | 21 (21.0%) | 12 (12.0%) | 10 (10.0%) | 12 (12.0%) | 10 (10.0%) | 10 (10.0%) | 100 |
| 2 | 15 (15.0%) | 14 (14.0%) | 18 (18.0%) | 18 (18.0%) | 16 (16.0%) | 10 (10.0%) | 9 (9.0%) | 100 |
| 3 | 16 (16.0%) | 11 (11.0%) | 14 (14.0%) | 20 (20.0%) | 13 (13.0%) | 15 (15.0%) | 11 (11.0%) | 100 |
| 4 | 17 (17.0%) | 23 (23.0%) | 12 (12.0%) | 16 (16.0%) | 15 (15.0%) | 8 (8.0%) | 9 (9.0%) | 100 |
| 5 | 20 (20.0%) | 12 (12.0%) | 21 (21.0%) | 12 (12.0%) | 11 (11.0%) | 9 (9.0%) | 15 (15.0%) | 100 |
| 6–10 | 75 (15.0%) | 69 (13.8%) | 75 (15.0%) | 75 (15.0%) | 76 (15.2%) | 72 (14.4%) | 58 (11.6%) | 500 |
| 11–15 | 62 (12.4%) | 79 (15.8%) | 69 (13.8%) | 71 (14.2%) | 88 (17.6%) | 75 (15.0%) | 56 (11.2%) | 500 |
| 16–25 | 145 (14.5%) | 155 (15.5%) | 144 (14.4%) | 141 (14.1%) | 150 (15.0%) | 127 (12.7%) | 138 (13.8%) | 1000 |
| 26–40 | 225 (15.0%) | 216 (14.4%) | 235 (15.7%) | 237 (15.8%) | 219 (14.6%) | 174 (11.6%) | 194 (12.9%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 96 (96.0%) | 4 (4.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 98 (98.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 91 (91.0%) | 9 (9.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 74 (74.0%) | 20 (20.0%) | 3 (3.0%) | 3 (3.0%) | 0 (0.0%) | 100 |
| 5 | 37 (37.0%) | 58 (58.0%) | 2 (2.0%) | 3 (3.0%) | 0 (0.0%) | 100 |
| 6–10 | 62 (12.4%) | 421 (84.2%) | 12 (2.4%) | 5 (1.0%) | 0 (0.0%) | 500 |
| 11–15 | 29 (5.8%) | 345 (69.0%) | 113 (22.6%) | 13 (2.6%) | 0 (0.0%) | 500 |
| 16–25 | 10 (1.0%) | 131 (13.1%) | 697 (69.7%) | 162 (16.2%) | 0 (0.0%) | 1000 |
| 26–40 | 3 (0.2%) | 10 (0.7%) | 173 (11.5%) | 1314 (87.6%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 396 | 79.2% |
| Pl. 6–10 | 62 | 12.4% |
| Pl. 11–15 | 29 | 5.8% |
| Pl. 16–25 | 10 | 2.0% |
| Pl. 26–40 | 3 | 0.6% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 64/75 (85.3%) | 69/80 (86.3%) | 62/71 (87.3%) | 62/86 (72.1%) | 57/74 (77.0%) | 43/59 (72.9%) | 39/55 (70.9%) |
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
- **Chi²(6):** 8.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 20 | 20.0% | 15.0% | +5.0% | 20.8 | 11.7 |
| Row 1 | 19 | 19.0% | 15.0% | +4.0% | 20.8 | 11.7 |
| Row 2 | 13 | 13.0% | 15.0% | -2.0% | 20.9 | 11.7 |
| Row 3 | 15 | 15.0% | 15.0% | +0.0% | 20.5 | 12.0 |
| Row 4 | 18 | 18.0% | 15.0% | +3.0% | 20.2 | 11.4 |
| Row 5 | 10 | 10.0% | 12.5% | -2.5% | 19.7 | 10.9 |
| Row 6 | 5 | 5.0% | 12.5% | -7.5% | 20.6 | 11.1 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(6) = 8.60 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 418 | 83.6% |
| B2 (Pl. 6–15) | 1000 | 810 | 81.0% |
| B3 (Pl. 16–25) | 1000 | 702 | 70.2% |
| B4 (Pl. 26–40) | 1500 | 1311 | 87.4% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (6R) | Row 1 (6R) | Row 2 (6R) | Row 3 (6R) | Row 4 (6R) | Row 5 (5R) | Row 6 (5R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 20 (20.0%) | 19 (19.0%) | 13 (13.0%) | 15 (15.0%) | 18 (18.0%) | 10 (10.0%) | 5 (5.0%) | 100 |
| 2 | 18 (18.0%) | 17 (17.0%) | 10 (10.0%) | 19 (19.0%) | 13 (13.0%) | 12 (12.0%) | 11 (11.0%) | 100 |
| 3 | 9 (9.0%) | 13 (13.0%) | 21 (21.0%) | 18 (18.0%) | 10 (10.0%) | 14 (14.0%) | 15 (15.0%) | 100 |
| 4 | 16 (16.0%) | 12 (12.0%) | 15 (15.0%) | 16 (16.0%) | 13 (13.0%) | 15 (15.0%) | 13 (13.0%) | 100 |
| 5 | 14 (14.0%) | 12 (12.0%) | 14 (14.0%) | 20 (20.0%) | 16 (16.0%) | 11 (11.0%) | 13 (13.0%) | 100 |
| 6–10 | 66 (13.2%) | 79 (15.8%) | 75 (15.0%) | 71 (14.2%) | 89 (17.8%) | 63 (12.6%) | 57 (11.4%) | 500 |
| 11–15 | 76 (15.2%) | 69 (13.8%) | 77 (15.4%) | 69 (13.8%) | 67 (13.4%) | 73 (14.6%) | 69 (13.8%) | 500 |
| 16–25 | 152 (15.2%) | 150 (15.0%) | 133 (13.3%) | 137 (13.7%) | 156 (15.6%) | 141 (14.1%) | 131 (13.1%) | 1000 |
| 26–40 | 229 (15.3%) | 229 (15.3%) | 242 (16.1%) | 235 (15.7%) | 218 (14.5%) | 161 (10.7%) | 186 (12.4%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 15.0% | 12.5% | 12.5% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 99 (99.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 94 (94.0%) | 6 (6.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 78 (78.0%) | 22 (22.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 47 (47.0%) | 53 (53.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 73 (14.6%) | 419 (83.8%) | 7 (1.4%) | 1 (0.2%) | 0 (0.0%) | 500 |
| 11–15 | 6 (1.2%) | 391 (78.2%) | 102 (20.4%) | 1 (0.2%) | 0 (0.0%) | 500 |
| 16–25 | 3 (0.3%) | 108 (10.8%) | 702 (70.2%) | 187 (18.7%) | 0 (0.0%) | 1000 |
| 26–40 | 0 (0.0%) | 0 (0.0%) | 189 (12.6%) | 1311 (87.4%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 418 | 83.6% |
| Pl. 6–10 | 73 | 14.6% |
| Pl. 11–15 | 6 | 1.2% |
| Pl. 16–25 | 3 | 0.6% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 64/75 (85.3%) | 66/80 (82.5%) | 64/71 (90.1%) | 74/86 (86.0%) | 58/74 (78.4%) | 47/59 (79.7%) | 45/55 (81.8%) |
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

- **Searound × manta × 60s:** Row 0 zu oft (25.0% statt erw. 15.0%) — * (p<0.05)

---

## Empfehlung

### Front-Row-Vorteil (Row 0 gewinnt zu oft)
- **Searound × manta × 60s** — * (p<0.05)

### Hinter-Row-Nachteil (Row 0 gewinnt zu selten / Catch-Up überkompensiert)
Keine Kombination zeigt Hinter-Row-Nachteil oder Überkompensation.

### Catch-Up-Mechanismus (speedBonusFactor = 1.0)
Unfairness verteilt sich gleichmäßig auf kurze und lange Rennen (0 × 30s, 0 × 120s).

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
| Searound | manta | 30s | 40 | 0.0% | 5.8% ⚠️ | +5.8% | 0.0 | 0.000030 ✅ |
| Searound | manta | 60s | 40 | 0.0% | 4.5% ⚠️ | +4.5% | 0.2 | 0.000039 ✅ |
| Searound | manta | 120s | 40 | 0.0% | 3.5% ⚠️ | +3.5% | 0.1 | 0.000045 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Searound | manta | 30s | 40 | 19.0% | 67.4% | 48.4% |
| Searound | manta | 60s | 40 | 20.2% | 79.2% | 59.0% |
| Searound | manta | 120s | 40 | 23.2% | 83.6% | 60.4% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Searound | manta | 30s | 20% | 77% | 75 | 18% | 79% | 80 | 31% | 75% | 71 | 16% | 60% | 86 | 22% | 69% | 74 | 12% | 59% | 59 | 13% | 45% | 55 |
| Searound | manta | 60s | 20% | 85% | 75 | 25% | 86% | 80 | 31% | 87% | 71 | 19% | 72% | 86 | 19% | 77% | 74 | 15% | 73% | 59 | 9% | 71% | 55 |
| Searound | manta | 120s | 28% | 85% | 75 | 25% | 83% | 80 | 21% | 90% | 71 | 16% | 86% | 86 | 27% | 78% | 74 | 24% | 80% | 59 | 22% | 82% | 55 |

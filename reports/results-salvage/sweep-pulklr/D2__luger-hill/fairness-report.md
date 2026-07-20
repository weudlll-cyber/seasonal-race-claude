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
| Luger hill | luge | 30s | 5 | 20.0% | 12.0% | 22.0% | 22.0% | 5.3 | n.s. | ✅ Fair |
| Luger hill | luge | 60s | 5 | 20.0% | 14.0% | 17.0% | 23.0% | 4.3 | n.s. | ✅ Fair |
| Luger hill | luge | 120s | 5 | 20.0% | 20.0% | 23.0% | 19.0% | 4.5 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Luger hill × luge × 30s

- **finishT:** 0.4166 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 5.30 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 12 | 12.0% | 20.0% | -8.0% | 21.7 | 11.9 |
| Row 1 | 22 | 22.0% | 20.0% | +2.0% | 20.3 | 11.8 |
| Row 2 | 19 | 19.0% | 20.0% | -1.0% | 20.8 | 11.4 |
| Row 3 | 21 | 21.0% | 20.0% | +1.0% | 20.3 | 11.3 |
| Row 4 | 26 | 26.0% | 20.0% | +6.0% | 19.3 | 11.2 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(4) = 5.30 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 374 | 74.8% |
| B2 (Pl. 6–15) | 1000 | 706 | 70.6% |
| B3 (Pl. 16–25) | 1000 | 666 | 66.6% |
| B4 (Pl. 26–40) | 1500 | 1306 | 87.1% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (8R) | Row 1 (8R) | Row 2 (8R) | Row 3 (8R) | Row 4 (8R) | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 12 (12.0%) | 22 (22.0%) | 19 (19.0%) | 21 (21.0%) | 26 (26.0%) | 100 |
| 2 | 18 (18.0%) | 23 (23.0%) | 21 (21.0%) | 19 (19.0%) | 19 (19.0%) | 100 |
| 3 | 19 (19.0%) | 25 (25.0%) | 16 (16.0%) | 21 (21.0%) | 19 (19.0%) | 100 |
| 4 | 24 (24.0%) | 19 (19.0%) | 14 (14.0%) | 20 (20.0%) | 23 (23.0%) | 100 |
| 5 | 17 (17.0%) | 15 (15.0%) | 22 (22.0%) | 21 (21.0%) | 25 (25.0%) | 100 |
| 6–10 | 91 (18.2%) | 109 (21.8%) | 95 (19.0%) | 94 (18.8%) | 111 (22.2%) | 500 |
| 11–15 | 95 (19.0%) | 106 (21.2%) | 99 (19.8%) | 94 (18.8%) | 106 (21.2%) | 500 |
| 16–25 | 183 (18.3%) | 183 (18.3%) | 212 (21.2%) | 222 (22.2%) | 200 (20.0%) | 1000 |
| 26–40 | 341 (22.7%) | 298 (19.9%) | 302 (20.1%) | 288 (19.2%) | 271 (18.1%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 20.0% | 20.0% | 20.0% | 20.0% | 20.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 98 (98.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 96 (96.0%) | 3 (3.0%) | 0 (0.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 3 | 87 (87.0%) | 12 (12.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 58 (58.0%) | 42 (42.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 35 (35.0%) | 64 (64.0%) | 0 (0.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 6–10 | 73 (14.6%) | 402 (80.4%) | 18 (3.6%) | 7 (1.4%) | 0 (0.0%) | 500 |
| 11–15 | 34 (6.8%) | 304 (60.8%) | 145 (29.0%) | 17 (3.4%) | 0 (0.0%) | 500 |
| 16–25 | 14 (1.4%) | 152 (15.2%) | 666 (66.6%) | 168 (16.8%) | 0 (0.0%) | 1000 |
| 26–40 | 5 (0.3%) | 19 (1.3%) | 170 (11.3%) | 1306 (87.1%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 374 | 74.8% |
| Pl. 6–10 | 73 | 14.6% |
| Pl. 11–15 | 34 | 6.8% |
| Pl. 16–25 | 14 | 2.8% |
| Pl. 26–40 | 5 | 1.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 |
|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 81/115 (70.4%) | 87/106 (82.1%) | 67/89 (75.3%) | 73/95 (76.8%) | 66/95 (69.5%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–40 ✅ Soll erreicht | 0 | — |
| Pl. 26–40 | 0 | — |
| Pl. 16–25 | 0 | — |
| Pl. 6–15 | 0 | — |
| Pl. 1–5 ❌ Brems-Leck | 0 | — |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 |
|---|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) |

### Luger hill × luge × 60s

- **finishT:** 0.8332 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 4.30 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 14 | 14.0% | 20.0% | -6.0% | 21.2 | 11.8 |
| Row 1 | 17 | 17.0% | 20.0% | -3.0% | 20.4 | 11.7 |
| Row 2 | 22 | 22.0% | 20.0% | +2.0% | 20.5 | 11.4 |
| Row 3 | 21 | 21.0% | 20.0% | +1.0% | 20.5 | 11.5 |
| Row 4 | 26 | 26.0% | 20.0% | +6.0% | 20.0 | 11.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(4) = 4.30 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 394 | 78.8% |
| B2 (Pl. 6–15) | 1000 | 773 | 77.3% |
| B3 (Pl. 16–25) | 1000 | 728 | 72.8% |
| B4 (Pl. 26–40) | 1500 | 1337 | 89.1% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (8R) | Row 1 (8R) | Row 2 (8R) | Row 3 (8R) | Row 4 (8R) | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 14 (14.0%) | 17 (17.0%) | 22 (22.0%) | 21 (21.0%) | 26 (26.0%) | 100 |
| 2 | 19 (19.0%) | 24 (24.0%) | 17 (17.0%) | 22 (22.0%) | 18 (18.0%) | 100 |
| 3 | 24 (24.0%) | 20 (20.0%) | 19 (19.0%) | 17 (17.0%) | 20 (20.0%) | 100 |
| 4 | 24 (24.0%) | 18 (18.0%) | 19 (19.0%) | 20 (20.0%) | 19 (19.0%) | 100 |
| 5 | 15 (15.0%) | 19 (19.0%) | 21 (21.0%) | 19 (19.0%) | 26 (26.0%) | 100 |
| 6–10 | 94 (18.8%) | 112 (22.4%) | 95 (19.0%) | 104 (20.8%) | 95 (19.0%) | 500 |
| 11–15 | 98 (19.6%) | 106 (21.2%) | 107 (21.4%) | 92 (18.4%) | 97 (19.4%) | 500 |
| 16–25 | 186 (18.6%) | 194 (19.4%) | 204 (20.4%) | 210 (21.0%) | 206 (20.6%) | 1000 |
| 26–40 | 326 (21.7%) | 290 (19.3%) | 296 (19.7%) | 295 (19.7%) | 293 (19.5%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 20.0% | 20.0% | 20.0% | 20.0% | 20.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 99 (99.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 96 (96.0%) | 3 (3.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 96 (96.0%) | 4 (4.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 69 (69.0%) | 31 (31.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 34 (34.0%) | 65 (65.0%) | 0 (0.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 6–10 | 75 (15.0%) | 414 (82.8%) | 7 (1.4%) | 4 (0.8%) | 0 (0.0%) | 500 |
| 11–15 | 22 (4.4%) | 359 (71.8%) | 113 (22.6%) | 6 (1.2%) | 0 (0.0%) | 500 |
| 16–25 | 7 (0.7%) | 113 (11.3%) | 728 (72.8%) | 152 (15.2%) | 0 (0.0%) | 1000 |
| 26–40 | 2 (0.1%) | 10 (0.7%) | 151 (10.1%) | 1337 (89.1%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 394 | 78.8% |
| Pl. 6–10 | 75 | 15.0% |
| Pl. 11–15 | 22 | 4.4% |
| Pl. 16–25 | 7 | 1.4% |
| Pl. 26–40 | 2 | 0.4% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 |
|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 85/115 (73.9%) | 84/106 (79.2%) | 75/89 (84.3%) | 76/95 (80.0%) | 74/95 (77.9%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–40 ✅ Soll erreicht | 0 | — |
| Pl. 26–40 | 0 | — |
| Pl. 16–25 | 0 | — |
| Pl. 6–15 | 0 | — |
| Pl. 1–5 ❌ Brems-Leck | 0 | — |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 |
|---|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) |

### Luger hill × luge × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 4.50 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 20 | 20.0% | 20.0% | +0.0% | 21.3 | 12.0 |
| Row 1 | 23 | 23.0% | 20.0% | +3.0% | 20.4 | 11.7 |
| Row 2 | 14 | 14.0% | 20.0% | -6.0% | 20.4 | 11.4 |
| Row 3 | 17 | 17.0% | 20.0% | -3.0% | 20.5 | 11.3 |
| Row 4 | 26 | 26.0% | 20.0% | +6.0% | 20.0 | 11.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(4) = 4.50 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 425 | 85.0% |
| B2 (Pl. 6–15) | 1000 | 814 | 81.4% |
| B3 (Pl. 16–25) | 1000 | 706 | 70.6% |
| B4 (Pl. 26–40) | 1500 | 1316 | 87.7% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (8R) | Row 1 (8R) | Row 2 (8R) | Row 3 (8R) | Row 4 (8R) | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 20 (20.0%) | 23 (23.0%) | 14 (14.0%) | 17 (17.0%) | 26 (26.0%) | 100 |
| 2 | 25 (25.0%) | 15 (15.0%) | 21 (21.0%) | 21 (21.0%) | 18 (18.0%) | 100 |
| 3 | 19 (19.0%) | 25 (25.0%) | 17 (17.0%) | 22 (22.0%) | 17 (17.0%) | 100 |
| 4 | 19 (19.0%) | 22 (22.0%) | 21 (21.0%) | 17 (17.0%) | 21 (21.0%) | 100 |
| 5 | 19 (19.0%) | 17 (17.0%) | 28 (28.0%) | 16 (16.0%) | 20 (20.0%) | 100 |
| 6–10 | 94 (18.8%) | 104 (20.8%) | 100 (20.0%) | 102 (20.4%) | 100 (20.0%) | 500 |
| 11–15 | 94 (18.8%) | 100 (20.0%) | 102 (20.4%) | 99 (19.8%) | 105 (21.0%) | 500 |
| 16–25 | 183 (18.3%) | 199 (19.9%) | 201 (20.1%) | 211 (21.1%) | 206 (20.6%) | 1000 |
| 26–40 | 327 (21.8%) | 295 (19.7%) | 296 (19.7%) | 295 (19.7%) | 287 (19.1%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 20.0% | 20.0% | 20.0% | 20.0% | 20.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 98 (98.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 73 (73.0%) | 27 (27.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 54 (54.0%) | 46 (46.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 65 (13.0%) | 433 (86.6%) | 2 (0.4%) | 0 (0.0%) | 0 (0.0%) | 500 |
| 11–15 | 7 (1.4%) | 381 (76.2%) | 110 (22.0%) | 2 (0.4%) | 0 (0.0%) | 500 |
| 16–25 | 3 (0.3%) | 109 (10.9%) | 706 (70.6%) | 182 (18.2%) | 0 (0.0%) | 1000 |
| 26–40 | 0 (0.0%) | 2 (0.1%) | 182 (12.1%) | 1316 (87.7%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 425 | 85.0% |
| Pl. 6–10 | 65 | 13.0% |
| Pl. 11–15 | 7 | 1.4% |
| Pl. 16–25 | 3 | 0.6% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 |
|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 91/115 (79.1%) | 94/106 (88.7%) | 78/89 (87.6%) | 83/95 (87.4%) | 79/95 (83.2%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–40 ✅ Soll erreicht | 0 | — |
| Pl. 26–40 | 0 | — |
| Pl. 16–25 | 0 | — |
| Pl. 6–15 | 0 | — |
| Pl. 1–5 ❌ Brems-Leck | 0 | — |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 |
|---|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Luger hill | luge | 30s | 6.4% | ⚠️ Zu wenig Mixing |
| Luger hill | luge | 60s | 2.6% | ⚠️ Zu wenig Mixing |
| Luger hill | luge | 120s | 0.0% | ⚠️ Zu wenig Mixing |

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

## Phase-3A — Naturalness-Metriken (Open Tracks)

Stabile Phase: 25%–95% der targetDuration. Jerk: |Δ(effSpeed)/DT| / max(baseSpeed, ε). naturalOvt: Anteil Überholungen mit tDiff ≤ 30% des Referenzabstands.

| Track | Racer | Dist | meanJerk | maxJerk | jerkHigh% | natOvt% | pulkTime% | pulkTrigIn | pulkTrigOut |
|-------|-------|------|----------|---------|-----------|---------|-----------|-----------|-------------|
| Luger hill | luge | 30s | 0.0000 | 0.0008 | 0.0% | 100.0% | 96.5% | 0.00 | 1.00 |
| Luger hill | luge | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 98.5% | 0.00 | 1.00 |
| Luger hill | luge | 120s | 0.0000 | 0.0008 | 0.0% | 100.0% | 98.9% | 0.00 | 1.01 |

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
| Luger hill | luge | 30s | 40 | 0.0% | 4.7% ⚠️ | +4.7% | 0.0 | 0.000080 ✅ |
| Luger hill | luge | 60s | 40 | 0.0% | 3.4% ⚠️ | +3.4% | 0.0 | 0.000071 ✅ |
| Luger hill | luge | 120s | 40 | 0.0% | 3.5% ⚠️ | +3.5% | 0.0 | 0.000064 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Luger hill | luge | 30s | 40 | 18.4% | 74.8% | 56.4% |
| Luger hill | luge | 60s | 40 | 22.0% | 78.8% | 56.8% |
| Luger hill | luge | 120s | 40 | 22.6% | 85.0% | 62.4% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|---|
| Luger hill | luge | 30s | 19% | 70% | 115 | 16% | 82% | 106 | 20% | 75% | 89 | 21% | 77% | 95 | 16% | 69% | 95 |
| Luger hill | luge | 60s | 22% | 74% | 115 | 19% | 79% | 106 | 18% | 84% | 89 | 25% | 80% | 95 | 26% | 78% | 95 |
| Luger hill | luge | 120s | 20% | 79% | 115 | 24% | 89% | 106 | 13% | 88% | 89 | 27% | 87% | 95 | 28% | 83% | 95 |

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
| Luger hill | luge | 30s | 5 | 20.0% | 13.0% | 23.0% | 21.3% | 6.9 | n.s. | ✅ Fair |
| Luger hill | luge | 60s | 5 | 20.0% | 22.0% | 16.0% | 20.7% | 3.1 | n.s. | ✅ Fair |
| Luger hill | luge | 120s | 5 | 20.0% | 22.0% | 20.0% | 19.3% | 4.0 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Luger hill × luge × 30s

- **finishT:** 0.4166 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 6.90 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 13 | 13.0% | 20.0% | -7.0% | 21.4 | 12.0 |
| Row 1 | 23 | 23.0% | 20.0% | +3.0% | 20.8 | 11.9 |
| Row 2 | 16 | 16.0% | 20.0% | -4.0% | 20.8 | 11.3 |
| Row 3 | 20 | 20.0% | 20.0% | +0.0% | 20.3 | 11.2 |
| Row 4 | 28 | 28.0% | 20.0% | +8.0% | 19.2 | 11.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(4) = 6.90 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 364 | 72.8% |
| B2 (Pl. 6–15) | 1000 | 706 | 70.6% |
| B3 (Pl. 16–25) | 1000 | 660 | 66.0% |
| B4 (Pl. 26–40) | 1500 | 1295 | 86.3% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (8R) | Row 1 (8R) | Row 2 (8R) | Row 3 (8R) | Row 4 (8R) | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 13 (13.0%) | 23 (23.0%) | 16 (16.0%) | 20 (20.0%) | 28 (28.0%) | 100 |
| 2 | 23 (23.0%) | 21 (21.0%) | 20 (20.0%) | 15 (15.0%) | 21 (21.0%) | 100 |
| 3 | 25 (25.0%) | 20 (20.0%) | 19 (19.0%) | 20 (20.0%) | 16 (16.0%) | 100 |
| 4 | 18 (18.0%) | 15 (15.0%) | 21 (21.0%) | 20 (20.0%) | 26 (26.0%) | 100 |
| 5 | 16 (16.0%) | 21 (21.0%) | 14 (14.0%) | 26 (26.0%) | 23 (23.0%) | 100 |
| 6–10 | 96 (19.2%) | 105 (21.0%) | 93 (18.6%) | 95 (19.0%) | 111 (22.2%) | 500 |
| 11–15 | 108 (21.6%) | 97 (19.4%) | 100 (20.0%) | 94 (18.8%) | 101 (20.2%) | 500 |
| 16–25 | 173 (17.3%) | 191 (19.1%) | 214 (21.4%) | 225 (22.5%) | 197 (19.7%) | 1000 |
| 26–40 | 328 (21.9%) | 307 (20.5%) | 303 (20.2%) | 285 (19.0%) | 277 (18.5%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 20.0% | 20.0% | 20.0% | 20.0% | 20.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 98 (98.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 93 (93.0%) | 6 (6.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 85 (85.0%) | 14 (14.0%) | 0 (0.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 4 | 55 (55.0%) | 45 (45.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 33 (33.0%) | 64 (64.0%) | 2 (2.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 6–10 | 82 (16.4%) | 389 (77.8%) | 16 (3.2%) | 13 (2.6%) | 0 (0.0%) | 500 |
| 11–15 | 32 (6.4%) | 317 (63.4%) | 136 (27.2%) | 15 (3.0%) | 0 (0.0%) | 500 |
| 16–25 | 17 (1.7%) | 148 (14.8%) | 660 (66.0%) | 175 (17.5%) | 0 (0.0%) | 1000 |
| 26–40 | 5 (0.3%) | 15 (1.0%) | 185 (12.3%) | 1295 (86.3%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 364 | 72.8% |
| Pl. 6–10 | 82 | 16.4% |
| Pl. 11–15 | 32 | 6.4% |
| Pl. 16–25 | 17 | 3.4% |
| Pl. 26–40 | 5 | 1.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 |
|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 82/115 (71.3%) | 82/106 (77.4%) | 69/89 (77.5%) | 68/95 (71.6%) | 63/95 (66.3%) |
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
- **Chi²(4):** 3.10 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 22 | 22.0% | 20.0% | +2.0% | 20.8 | 11.8 |
| Row 1 | 16 | 16.0% | 20.0% | -4.0% | 20.5 | 11.7 |
| Row 2 | 16 | 16.0% | 20.0% | -4.0% | 20.5 | 11.3 |
| Row 3 | 21 | 21.0% | 20.0% | +1.0% | 20.6 | 11.5 |
| Row 4 | 25 | 25.0% | 20.0% | +5.0% | 20.2 | 11.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(4) = 3.10 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 407 | 81.4% |
| B2 (Pl. 6–15) | 1000 | 779 | 77.9% |
| B3 (Pl. 16–25) | 1000 | 706 | 70.6% |
| B4 (Pl. 26–40) | 1500 | 1321 | 88.1% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (8R) | Row 1 (8R) | Row 2 (8R) | Row 3 (8R) | Row 4 (8R) | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 22 (22.0%) | 16 (16.0%) | 16 (16.0%) | 21 (21.0%) | 25 (25.0%) | 100 |
| 2 | 18 (18.0%) | 25 (25.0%) | 20 (20.0%) | 17 (17.0%) | 20 (20.0%) | 100 |
| 3 | 26 (26.0%) | 18 (18.0%) | 20 (20.0%) | 21 (21.0%) | 15 (15.0%) | 100 |
| 4 | 20 (20.0%) | 22 (22.0%) | 18 (18.0%) | 19 (19.0%) | 21 (21.0%) | 100 |
| 5 | 21 (21.0%) | 17 (17.0%) | 17 (17.0%) | 27 (27.0%) | 18 (18.0%) | 100 |
| 6–10 | 87 (17.4%) | 115 (23.0%) | 104 (20.8%) | 91 (18.2%) | 103 (20.6%) | 500 |
| 11–15 | 103 (20.6%) | 94 (18.8%) | 104 (20.8%) | 101 (20.2%) | 98 (19.6%) | 500 |
| 16–25 | 196 (19.6%) | 200 (20.0%) | 198 (19.8%) | 202 (20.2%) | 204 (20.4%) | 1000 |
| 26–40 | 307 (20.5%) | 293 (19.5%) | 303 (20.2%) | 301 (20.1%) | 296 (19.7%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 20.0% | 20.0% | 20.0% | 20.0% | 20.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 98 (98.0%) | 1 (1.0%) | 0 (0.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 2 | 98 (98.0%) | 2 (2.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 92 (92.0%) | 8 (8.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 71 (71.0%) | 28 (28.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 48 (48.0%) | 51 (51.0%) | 0 (0.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 6–10 | 62 (12.4%) | 429 (85.8%) | 4 (0.8%) | 5 (1.0%) | 0 (0.0%) | 500 |
| 11–15 | 15 (3.0%) | 350 (70.0%) | 121 (24.2%) | 14 (2.8%) | 0 (0.0%) | 500 |
| 16–25 | 15 (1.5%) | 121 (12.1%) | 706 (70.6%) | 158 (15.8%) | 0 (0.0%) | 1000 |
| 26–40 | 1 (0.1%) | 10 (0.7%) | 168 (11.2%) | 1321 (88.1%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 407 | 81.4% |
| Pl. 6–10 | 62 | 12.4% |
| Pl. 11–15 | 15 | 3.0% |
| Pl. 16–25 | 15 | 3.0% |
| Pl. 26–40 | 1 | 0.2% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 |
|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 94/115 (81.7%) | 84/106 (79.2%) | 71/89 (79.8%) | 82/95 (86.3%) | 76/95 (80.0%) |
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
- **Chi²(4):** 4.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 22 | 22.0% | 20.0% | +2.0% | 21.1 | 12.0 |
| Row 1 | 20 | 20.0% | 20.0% | +0.0% | 20.5 | 11.7 |
| Row 2 | 14 | 14.0% | 20.0% | -6.0% | 20.3 | 11.4 |
| Row 3 | 18 | 18.0% | 20.0% | -2.0% | 20.5 | 11.4 |
| Row 4 | 26 | 26.0% | 20.0% | +6.0% | 20.1 | 11.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(4) = 4.00 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 427 | 85.4% |
| B2 (Pl. 6–15) | 1000 | 819 | 81.9% |
| B3 (Pl. 16–25) | 1000 | 701 | 70.1% |
| B4 (Pl. 26–40) | 1500 | 1304 | 86.9% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (8R) | Row 1 (8R) | Row 2 (8R) | Row 3 (8R) | Row 4 (8R) | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 22 (22.0%) | 20 (20.0%) | 14 (14.0%) | 18 (18.0%) | 26 (26.0%) | 100 |
| 2 | 26 (26.0%) | 18 (18.0%) | 22 (22.0%) | 18 (18.0%) | 16 (16.0%) | 100 |
| 3 | 18 (18.0%) | 23 (23.0%) | 18 (18.0%) | 23 (23.0%) | 18 (18.0%) | 100 |
| 4 | 15 (15.0%) | 26 (26.0%) | 19 (19.0%) | 24 (24.0%) | 16 (16.0%) | 100 |
| 5 | 20 (20.0%) | 19 (19.0%) | 24 (24.0%) | 11 (11.0%) | 26 (26.0%) | 100 |
| 6–10 | 95 (19.0%) | 102 (20.4%) | 101 (20.2%) | 101 (20.2%) | 101 (20.2%) | 500 |
| 11–15 | 96 (19.2%) | 91 (18.2%) | 110 (22.0%) | 96 (19.2%) | 107 (21.4%) | 500 |
| 16–25 | 190 (19.0%) | 197 (19.7%) | 203 (20.3%) | 206 (20.6%) | 204 (20.4%) | 1000 |
| 26–40 | 318 (21.2%) | 304 (20.3%) | 289 (19.3%) | 303 (20.2%) | 286 (19.1%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 20.0% | 20.0% | 20.0% | 20.0% | 20.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 97 (97.0%) | 3 (3.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 85 (85.0%) | 15 (15.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 45 (45.0%) | 55 (55.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 64 (12.8%) | 435 (87.0%) | 1 (0.2%) | 0 (0.0%) | 0 (0.0%) | 500 |
| 11–15 | 7 (1.4%) | 384 (76.8%) | 104 (20.8%) | 5 (1.0%) | 0 (0.0%) | 500 |
| 16–25 | 2 (0.2%) | 106 (10.6%) | 701 (70.1%) | 191 (19.1%) | 0 (0.0%) | 1000 |
| 26–40 | 0 (0.0%) | 2 (0.1%) | 194 (12.9%) | 1304 (86.9%) | 0 (0.0%) | 1500 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 427 | 85.4% |
| Pl. 6–10 | 64 | 12.8% |
| Pl. 11–15 | 7 | 1.4% |
| Pl. 16–25 | 2 | 0.4% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 |
|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 87/115 (75.7%) | 96/106 (90.6%) | 76/89 (85.4%) | 87/95 (91.6%) | 81/95 (85.3%) |
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
| Luger hill | luge | 30s | 0.0000 | 0.0008 | 0.0% | 100.0% | 96.7% | 0.00 | 1.00 |
| Luger hill | luge | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 98.5% | 0.00 | 1.00 |
| Luger hill | luge | 120s | 0.0000 | 0.0008 | 0.0% | 100.0% | 98.9% | 0.00 | 1.00 |

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
| Luger hill | luge | 30s | 40 | 0.0% | 4.5% ⚠️ | +4.5% | 0.0 | 0.000075 ✅ |
| Luger hill | luge | 60s | 40 | 0.0% | 3.2% ⚠️ | +3.2% | 0.0 | 0.000071 ✅ |
| Luger hill | luge | 120s | 40 | 0.0% | 3.3% ⚠️ | +3.3% | 0.0 | 0.000064 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Luger hill | luge | 30s | 40 | 19.0% | 72.8% | 53.8% |
| Luger hill | luge | 60s | 40 | 20.8% | 81.4% | 60.6% |
| Luger hill | luge | 120s | 40 | 20.2% | 85.4% | 65.2% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|---|
| Luger hill | luge | 30s | 18% | 71% | 115 | 22% | 77% | 106 | 21% | 78% | 89 | 17% | 72% | 95 | 17% | 66% | 95 |
| Luger hill | luge | 60s | 17% | 82% | 115 | 17% | 79% | 106 | 16% | 80% | 89 | 28% | 86% | 95 | 26% | 80% | 95 |
| Luger hill | luge | 120s | 17% | 76% | 115 | 20% | 91% | 106 | 11% | 85% | 89 | 26% | 92% | 95 | 27% | 85% | 95 |

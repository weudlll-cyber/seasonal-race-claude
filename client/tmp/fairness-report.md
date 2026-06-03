# RaceArena — Fairness Simulation Report

**Datum:** 2026-06-03  
**Rennen pro Kombination:** 10  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–10  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Dirt Oval | horse | 60s | 6 | 17.5% | 20.0% | 20.0% | 15.0% | 0.8 | n.s. | ✅ Fair |
| Dirt Oval | elephant | 60s | 7 | 15.0% | 20.0% | 40.0% | 8.0% | 10.0 | n.s. | ✅ Fair |
| Dirt Oval | giraffe | 60s | 8 | 12.5% | 0.0% | 20.0% | 13.3% | 6.0 | n.s. | ✅ Fair |
| Dirt Oval | snake | 60s | 6 | 17.5% | 40.0% | 10.0% | 12.5% | 6.2 | n.s. | ✅ Fair |
| Dirt Oval | dragon | 60s | 8 | 12.5% | 30.0% | 20.0% | 8.3% | 14.0 | n.s. | ✅ Fair |
| Dirt Oval | buggy | 60s | 6 | 17.5% | 30.0% | 20.0% | 12.5% | 7.2 | n.s. | ✅ Fair |
| Dirt Oval | motorbike | 60s | 6 | 17.5% | 40.0% | 0.0% | 15.0% | 5.3 | n.s. | ✅ Fair |
| Dirt Oval | beetle | 60s | 6 | 17.5% | 60.0% | 10.0% | 7.5% | 14.1 | * (p<0.05) | ⚠️ Front-Bias |
| Dirt Oval | boarder | 60s | 6 | 17.5% | 50.0% | 10.0% | 10.0% | 7.3 | n.s. | ✅ Fair |
| Dirt Oval | snowmobile | 60s | 8 | 12.5% | 20.0% | 10.0% | 11.7% | 2.8 | n.s. | ✅ Fair |
| River Run | duck | 60s | 2 | 50.0% | 70.0% | 30.0% | — | 1.6 | n.s. | ✅ Fair |
| River Run | dragon | 60s | 2 | 50.0% | 60.0% | 40.0% | — | 0.4 | n.s. | ✅ Fair |
| River Run | rocket | 60s | 2 | 50.0% | 60.0% | 40.0% | — | 0.4 | n.s. | ✅ Fair |
| River Run | koi | 60s | 2 | 50.0% | 80.0% | 20.0% | — | 3.6 | n.s. | ✅ Fair |
| River Run | turtle | 60s | 2 | 50.0% | 50.0% | 50.0% | — | 0.0 | n.s. | ✅ Fair |
| River Run | manta | 60s | 2 | 50.0% | 70.0% | 30.0% | — | 1.6 | n.s. | ✅ Fair |
| River Run | dolphin | 60s | 2 | 50.0% | 70.0% | 30.0% | — | 1.6 | n.s. | ✅ Fair |
| Space Sprint | dragon | 60s | 2 | 50.0% | 50.0% | 50.0% | — | 0.0 | n.s. | ✅ Fair |
| Space Sprint | rocket | 60s | 2 | 50.0% | 70.0% | 30.0% | — | 1.6 | n.s. | ✅ Fair |
| Space Sprint | plane | 60s | 2 | 50.0% | 60.0% | 40.0% | — | 0.4 | n.s. | ✅ Fair |
| Garden Path | horse | 60s | 6 | 17.5% | 20.0% | 10.0% | 17.5% | 2.4 | n.s. | ✅ Fair |
| Garden Path | duck | 60s | 5 | 20.0% | 30.0% | 40.0% | 10.0% | 5.0 | n.s. | ✅ Fair |
| Garden Path | snail | 60s | 5 | 20.0% | 20.0% | 20.0% | 20.0% | 0.0 | n.s. | ✅ Fair |
| Garden Path | elephant | 60s | 7 | 15.0% | 20.0% | 10.0% | 14.0% | 6.3 | n.s. | ✅ Fair |
| Garden Path | giraffe | 60s | 7 | 15.0% | 20.0% | 20.0% | 12.0% | 7.5 | n.s. | ✅ Fair |
| Garden Path | snake | 60s | 5 | 20.0% | 30.0% | 30.0% | 13.3% | 7.0 | n.s. | ✅ Fair |
| Garden Path | dragon | 60s | 7 | 15.0% | 30.0% | 20.0% | 10.0% | 3.5 | n.s. | ✅ Fair |
| Garden Path | buggy | 60s | 5 | 20.0% | 20.0% | 30.0% | 16.7% | 5.0 | n.s. | ✅ Fair |
| Garden Path | motorbike | 60s | 5 | 20.0% | 70.0% | 30.0% | 0.0% | 19.0 | *** (p<0.001) | ⚠️ Front-Bias |
| Garden Path | beetle | 60s | 5 | 20.0% | 30.0% | 20.0% | 16.7% | 3.0 | n.s. | ✅ Fair |
| Garden Path | boarder | 60s | 6 | 17.5% | 30.0% | 20.0% | 12.5% | 3.8 | n.s. | ✅ Fair |
| Garden Path | snowmobile | 60s | 8 | 12.5% | 10.0% | 20.0% | 11.7% | 6.0 | n.s. | ✅ Fair |
| City Circuit | horse | 60s | 6 | 17.5% | 20.0% | 40.0% | 10.0% | 6.0 | n.s. | ✅ Fair |
| City Circuit | dragon | 60s | 8 | 12.5% | 10.0% | 20.0% | 11.7% | 2.8 | n.s. | ✅ Fair |
| City Circuit | f1 | 60s | 6 | 17.5% | 50.0% | 20.0% | 7.5% | 9.4 | n.s. | ✅ Fair |
| City Circuit | motorbike | 60s | 5 | 20.0% | 60.0% | 20.0% | 6.7% | 11.0 | * (p<0.05) | ⚠️ Front-Bias |
| City Circuit | beetle | 60s | 6 | 17.5% | 50.0% | 0.0% | 12.5% | 9.8 | n.s. | ✅ Fair |
| City Circuit | boarder | 60s | 6 | 17.5% | 50.0% | 10.0% | 10.0% | 9.8 | n.s. | ✅ Fair |
| Luger hill | dragon | 60s | 3 | 35.0% | 40.0% | 20.0% | 40.0% | 0.7 | n.s. | ✅ Fair |
| Luger hill | rocket | 60s | 2 | 50.0% | 70.0% | 30.0% | — | 1.6 | n.s. | ✅ Fair |
| Luger hill | plane | 60s | 2 | 50.0% | 50.0% | 50.0% | — | 0.0 | n.s. | ✅ Fair |
| Luger hill | luge | 60s | 2 | 50.0% | 40.0% | 60.0% | — | 0.4 | n.s. | ✅ Fair |
| Luger hill | snowmobile | 60s | 3 | 35.0% | 60.0% | 20.0% | 20.0% | 2.7 | n.s. | ✅ Fair |
| Ice Track | horse | 60s | 5 | 20.0% | 50.0% | 10.0% | 13.3% | 6.0 | n.s. | ✅ Fair |
| Ice Track | luge | 60s | 5 | 20.0% | 10.0% | 10.0% | 26.7% | 8.0 | n.s. | ✅ Fair |
| Ice Track | snowmobile | 60s | 7 | 15.0% | 20.0% | 0.0% | 16.0% | 3.6 | n.s. | ✅ Fair |
| Mountainstreet | horse | 60s | 2 | 50.0% | 60.0% | 40.0% | — | 0.4 | n.s. | ✅ Fair |
| Mountainstreet | dragon | 60s | 2 | 50.0% | 50.0% | 50.0% | — | 0.0 | n.s. | ✅ Fair |
| Mountainstreet | f1 | 60s | 2 | 50.0% | 40.0% | 60.0% | — | 0.4 | n.s. | ✅ Fair |
| Mountainstreet | motorbike | 60s | 2 | 50.0% | 60.0% | 40.0% | — | 0.4 | n.s. | ✅ Fair |
| Mountainstreet | beetle | 60s | 2 | 50.0% | 70.0% | 30.0% | — | 1.6 | n.s. | ✅ Fair |
| Mountainstreet | boarder | 60s | 2 | 50.0% | 80.0% | 20.0% | — | 3.6 | n.s. | ✅ Fair |
| Searound | duck | 60s | 4 | 25.0% | 50.0% | 10.0% | 20.0% | 4.4 | n.s. | ✅ Fair |
| Searound | dragon | 60s | 5 | 20.0% | 30.0% | 20.0% | 16.7% | 1.0 | n.s. | ✅ Fair |
| Searound | rocket | 60s | 4 | 25.0% | 40.0% | 30.0% | 15.0% | 2.0 | n.s. | ✅ Fair |
| Searound | koi | 60s | 5 | 20.0% | 50.0% | 20.0% | 10.0% | 9.0 | n.s. | ✅ Fair |
| Searound | turtle | 60s | 5 | 20.0% | 20.0% | 30.0% | 16.7% | 1.0 | n.s. | ✅ Fair |
| Searound | manta | 60s | 6 | 17.5% | 40.0% | 10.0% | 12.5% | 4.2 | n.s. | ✅ Fair |
| Searound | dolphin | 60s | 5 | 20.0% | 20.0% | 30.0% | 16.7% | 1.0 | n.s. | ✅ Fair |
| Seatrack | duck | 60s | 2 | 50.0% | 70.0% | 30.0% | — | 1.6 | n.s. | ✅ Fair |
| Seatrack | dragon | 60s | 2 | 50.0% | 50.0% | 50.0% | — | 0.0 | n.s. | ✅ Fair |
| Seatrack | rocket | 60s | 2 | 50.0% | 60.0% | 40.0% | — | 0.4 | n.s. | ✅ Fair |
| Seatrack | koi | 60s | 2 | 50.0% | 60.0% | 40.0% | — | 0.4 | n.s. | ✅ Fair |
| Seatrack | turtle | 60s | 2 | 50.0% | 80.0% | 20.0% | — | 3.6 | n.s. | ✅ Fair |
| Seatrack | manta | 60s | 2 | 50.0% | 40.0% | 60.0% | — | 0.4 | n.s. | ✅ Fair |
| Seatrack | dolphin | 60s | 2 | 50.0% | 50.0% | 50.0% | — | 0.0 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Dirt Oval × horse × 60s

- **finishT:** 4.1886 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 0.76 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 20.0% | 17.5% | +2.5% | 20.3 | 11.4 |
| Row 1 | 2 | 20.0% | 17.5% | +2.5% | 20.5 | 11.5 |
| Row 2 | 1 | 10.0% | 17.5% | -7.5% | 20.4 | 11.5 |
| Row 3 | 2 | 20.0% | 17.5% | +2.5% | 20.8 | 11.1 |
| Row 4 | 1 | 10.0% | 15.0% | -5.0% | 21.6 | 12.5 |
| Row 5 | 2 | 20.0% | 15.0% | +5.0% | 19.2 | 11.8 |

### Dirt Oval × elephant × 60s

- **finishT:** 2.5131 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 10.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 20.0% | 15.0% | +5.0% | 20.2 | 10.7 |
| Row 1 | 4 | 40.0% | 15.0% | +25.0% | 20.3 | 11.5 |
| Row 2 | 0 | 0.0% | 15.0% | -15.0% | 22.6 | 10.9 |
| Row 3 | 1 | 10.0% | 15.0% | -5.0% | 23.4 | 11.4 |
| Row 4 | 3 | 30.0% | 15.0% | +15.0% | 17.9 | 12.3 |
| Row 5 | 0 | 0.0% | 12.5% | -12.5% | 19.9 | 11.7 |
| Row 6 | 0 | 0.0% | 12.5% | -12.5% | 18.9 | 12.0 |

### Dirt Oval × giraffe × 60s

- **finishT:** 3.7697 (Ziellinie in t-Raum)
- **Reihen:** 8 (gewichtete Erwartung nach Reihengröße)
- **Chi²(7):** 6.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 0 | 0.0% | 12.5% | -12.5% | 22.6 | 10.7 |
| Row 1 | 2 | 20.0% | 12.5% | +7.5% | 20.1 | 11.2 |
| Row 2 | 3 | 30.0% | 12.5% | +17.5% | 20.7 | 12.1 |
| Row 3 | 1 | 10.0% | 12.5% | -2.5% | 23.7 | 12.2 |
| Row 4 | 2 | 20.0% | 12.5% | +7.5% | 18.6 | 11.5 |
| Row 5 | 1 | 10.0% | 12.5% | -2.5% | 17.8 | 11.2 |
| Row 6 | 1 | 10.0% | 12.5% | -2.5% | 20.7 | 11.3 |
| Row 7 | 0 | 0.0% | 12.5% | -12.5% | 19.7 | 12.0 |

### Dirt Oval × snake × 60s

- **finishT:** 3.1414 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 6.19 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 4 | 40.0% | 17.5% | +22.5% | 19.6 | 11.3 |
| Row 1 | 1 | 10.0% | 17.5% | -7.5% | 20.2 | 11.0 |
| Row 2 | 0 | 0.0% | 17.5% | -17.5% | 20.4 | 11.8 |
| Row 3 | 3 | 30.0% | 17.5% | +12.5% | 20.3 | 12.4 |
| Row 4 | 1 | 10.0% | 15.0% | -5.0% | 23.1 | 11.4 |
| Row 5 | 1 | 10.0% | 15.0% | -5.0% | 19.6 | 11.5 |

### Dirt Oval × dragon × 60s

- **finishT:** 4.6074 (Ziellinie in t-Raum)
- **Reihen:** 8 (gewichtete Erwartung nach Reihengröße)
- **Chi²(7):** 14.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 3 | 30.0% | 12.5% | +17.5% | 18.6 | 11.7 |
| Row 1 | 2 | 20.0% | 12.5% | +7.5% | 20.8 | 11.5 |
| Row 2 | 0 | 0.0% | 12.5% | -12.5% | 19.3 | 10.9 |
| Row 3 | 4 | 40.0% | 12.5% | +27.5% | 20.1 | 12.7 |
| Row 4 | 0 | 0.0% | 12.5% | -12.5% | 23.0 | 10.9 |
| Row 5 | 0 | 0.0% | 12.5% | -12.5% | 20.0 | 12.7 |
| Row 6 | 1 | 10.0% | 12.5% | -2.5% | 21.9 | 10.5 |
| Row 7 | 0 | 0.0% | 12.5% | -12.5% | 20.3 | 11.5 |

### Dirt Oval × buggy × 60s

- **finishT:** 3.9791 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 7.24 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 3 | 30.0% | 17.5% | +12.5% | 17.5 | 11.9 |
| Row 1 | 2 | 20.0% | 17.5% | +2.5% | 23.1 | 10.8 |
| Row 2 | 4 | 40.0% | 17.5% | +22.5% | 17.7 | 11.2 |
| Row 3 | 0 | 0.0% | 17.5% | -17.5% | 22.4 | 11.7 |
| Row 4 | 0 | 0.0% | 15.0% | -15.0% | 21.9 | 10.8 |
| Row 5 | 1 | 10.0% | 15.0% | -5.0% | 20.6 | 12.1 |

### Dirt Oval × motorbike × 60s

- **finishT:** 4.3980 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 5.33 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 4 | 40.0% | 17.5% | +22.5% | 17.8 | 10.8 |
| Row 1 | 0 | 0.0% | 17.5% | -17.5% | 21.6 | 11.0 |
| Row 2 | 2 | 20.0% | 17.5% | +2.5% | 19.6 | 12.2 |
| Row 3 | 1 | 10.0% | 17.5% | -7.5% | 23.4 | 12.2 |
| Row 4 | 1 | 10.0% | 15.0% | -5.0% | 21.9 | 10.9 |
| Row 5 | 2 | 20.0% | 15.0% | +5.0% | 18.7 | 11.5 |

### Dirt Oval × beetle × 60s

- **finishT:** 3.7697 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 14.10 — * (p<0.05)

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 60.0% | 17.5% | +42.5% | 20.3 | 11.9 |
| Row 1 | 1 | 10.0% | 17.5% | -7.5% | 20.0 | 10.2 |
| Row 2 | 0 | 0.0% | 17.5% | -17.5% | 22.4 | 11.5 |
| Row 3 | 2 | 20.0% | 17.5% | +2.5% | 20.8 | 11.5 |
| Row 4 | 1 | 10.0% | 15.0% | -5.0% | 17.9 | 11.4 |
| Row 5 | 0 | 0.0% | 15.0% | -15.0% | 21.3 | 12.8 |

### Dirt Oval × boarder × 60s

- **finishT:** 4.1886 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 7.33 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 17.5% | +32.5% | 19.0 | 12.6 |
| Row 1 | 1 | 10.0% | 17.5% | -7.5% | 19.8 | 11.3 |
| Row 2 | 1 | 10.0% | 17.5% | -7.5% | 21.2 | 11.0 |
| Row 3 | 1 | 10.0% | 17.5% | -7.5% | 22.4 | 11.8 |
| Row 4 | 1 | 10.0% | 15.0% | -5.0% | 19.8 | 11.5 |
| Row 5 | 1 | 10.0% | 15.0% | -5.0% | 20.9 | 11.2 |

### Dirt Oval × snowmobile × 60s

- **finishT:** 4.6074 (Ziellinie in t-Raum)
- **Reihen:** 8 (gewichtete Erwartung nach Reihengröße)
- **Chi²(7):** 2.80 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 20.0% | 12.5% | +7.5% | 23.0 | 12.1 |
| Row 1 | 1 | 10.0% | 12.5% | -2.5% | 19.2 | 9.6 |
| Row 2 | 1 | 10.0% | 12.5% | -2.5% | 20.8 | 12.2 |
| Row 3 | 1 | 10.0% | 12.5% | -2.5% | 21.2 | 11.3 |
| Row 4 | 1 | 10.0% | 12.5% | -2.5% | 20.5 | 10.7 |
| Row 5 | 0 | 0.0% | 12.5% | -12.5% | 17.9 | 11.6 |
| Row 6 | 2 | 20.0% | 12.5% | +7.5% | 21.0 | 11.5 |
| Row 7 | 2 | 20.0% | 12.5% | +7.5% | 20.5 | 13.2 |

### River Run × duck × 60s

- **finishT:** 0.5101 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 1.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 7 | 70.0% | 50.0% | +20.0% | 20.2 | 12.0 |
| Row 1 | 3 | 30.0% | 50.0% | -20.0% | 20.8 | 11.1 |

### River Run × dragon × 60s

- **finishT:** 0.6601 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 60.0% | 50.0% | +10.0% | 20.5 | 12.0 |
| Row 1 | 4 | 40.0% | 50.0% | -10.0% | 20.5 | 11.1 |

### River Run × rocket × 60s

- **finishT:** 0.7501 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 60.0% | 50.0% | +10.0% | 20.4 | 11.5 |
| Row 1 | 4 | 40.0% | 50.0% | -10.0% | 20.6 | 11.6 |

### River Run × koi × 60s

- **finishT:** 0.5701 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 3.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 8 | 80.0% | 50.0% | +30.0% | 20.9 | 11.6 |
| Row 1 | 2 | 20.0% | 50.0% | -30.0% | 20.1 | 11.5 |

### River Run × turtle × 60s

- **finishT:** 0.5101 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 50.0% | +0.0% | 21.0 | 11.6 |
| Row 1 | 5 | 50.0% | 50.0% | +0.0% | 20.0 | 11.5 |

### River Run × manta × 60s

- **finishT:** 0.6601 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 1.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 7 | 70.0% | 50.0% | +20.0% | 20.1 | 11.7 |
| Row 1 | 3 | 30.0% | 50.0% | -20.0% | 20.9 | 11.4 |

### River Run × dolphin × 60s

- **finishT:** 0.6901 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 1.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 7 | 70.0% | 50.0% | +20.0% | 20.9 | 11.4 |
| Row 1 | 3 | 30.0% | 50.0% | -20.0% | 20.1 | 11.7 |

### Space Sprint × dragon × 60s

- **finishT:** 0.4360 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 50.0% | +0.0% | 20.6 | 11.9 |
| Row 1 | 5 | 50.0% | 50.0% | +0.0% | 20.4 | 11.2 |

### Space Sprint × rocket × 60s

- **finishT:** 0.4955 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 1.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 7 | 70.0% | 50.0% | +20.0% | 20.2 | 11.7 |
| Row 1 | 3 | 30.0% | 50.0% | -20.0% | 20.8 | 11.4 |

### Space Sprint × plane × 60s

- **finishT:** 0.4558 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 60.0% | 50.0% | +10.0% | 21.0 | 11.5 |
| Row 1 | 4 | 40.0% | 50.0% | -10.0% | 20.0 | 11.6 |

### Garden Path × horse × 60s

- **finishT:** 5.4238 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 2.38 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 20.0% | 17.5% | +2.5% | 21.3 | 11.7 |
| Row 1 | 1 | 10.0% | 17.5% | -7.5% | 21.6 | 10.8 |
| Row 2 | 1 | 10.0% | 17.5% | -7.5% | 19.5 | 10.9 |
| Row 3 | 2 | 20.0% | 17.5% | +2.5% | 21.6 | 11.9 |
| Row 4 | 3 | 30.0% | 15.0% | +15.0% | 19.5 | 11.9 |
| Row 5 | 1 | 10.0% | 15.0% | -5.0% | 19.3 | 12.4 |

### Garden Path × duck × 60s

- **finishT:** 4.6103 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 5.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 3 | 30.0% | 20.0% | +10.0% | 18.8 | 10.8 |
| Row 1 | 4 | 40.0% | 20.0% | +20.0% | 19.8 | 10.7 |
| Row 2 | 1 | 10.0% | 20.0% | -10.0% | 19.7 | 11.8 |
| Row 3 | 2 | 20.0% | 20.0% | +0.0% | 24.1 | 13.1 |
| Row 4 | 0 | 0.0% | 20.0% | -20.0% | 20.2 | 10.7 |

### Garden Path × snail × 60s

- **finishT:** 1.6271 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 0.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 20.0% | 20.0% | +0.0% | 21.5 | 11.3 |
| Row 1 | 2 | 20.0% | 20.0% | +0.0% | 19.5 | 11.1 |
| Row 2 | 2 | 20.0% | 20.0% | +0.0% | 19.1 | 11.5 |
| Row 3 | 2 | 20.0% | 20.0% | +0.0% | 21.8 | 11.9 |
| Row 4 | 2 | 20.0% | 20.0% | +0.0% | 20.6 | 12.0 |

### Garden Path × elephant × 60s

- **finishT:** 3.2543 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 6.27 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 20.0% | 15.0% | +5.0% | 19.7 | 11.5 |
| Row 1 | 1 | 10.0% | 15.0% | -5.0% | 20.9 | 12.2 |
| Row 2 | 1 | 10.0% | 15.0% | -5.0% | 19.8 | 10.4 |
| Row 3 | 0 | 0.0% | 15.0% | -15.0% | 22.5 | 10.9 |
| Row 4 | 4 | 40.0% | 15.0% | +25.0% | 19.8 | 11.9 |
| Row 5 | 1 | 10.0% | 12.5% | -2.5% | 21.4 | 11.3 |
| Row 6 | 1 | 10.0% | 12.5% | -2.5% | 19.3 | 13.1 |

### Garden Path × giraffe × 60s

- **finishT:** 4.8814 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 7.47 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 20.0% | 15.0% | +5.0% | 20.0 | 10.7 |
| Row 1 | 2 | 20.0% | 15.0% | +5.0% | 20.7 | 12.0 |
| Row 2 | 1 | 10.0% | 15.0% | -5.0% | 24.0 | 11.9 |
| Row 3 | 0 | 0.0% | 15.0% | -15.0% | 18.4 | 11.5 |
| Row 4 | 4 | 40.0% | 15.0% | +25.0% | 18.4 | 11.3 |
| Row 5 | 1 | 10.0% | 12.5% | -2.5% | 20.7 | 12.0 |
| Row 6 | 0 | 0.0% | 12.5% | -12.5% | 21.4 | 11.1 |

### Garden Path × snake × 60s

- **finishT:** 4.0679 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 7.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 3 | 30.0% | 20.0% | +10.0% | 19.8 | 12.4 |
| Row 1 | 3 | 30.0% | 20.0% | +10.0% | 19.5 | 11.9 |
| Row 2 | 0 | 0.0% | 20.0% | -20.0% | 21.4 | 10.7 |
| Row 3 | 0 | 0.0% | 20.0% | -20.0% | 20.1 | 11.0 |
| Row 4 | 4 | 40.0% | 20.0% | +20.0% | 21.7 | 11.8 |

### Garden Path × dragon × 60s

- **finishT:** 5.9662 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 3.47 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 3 | 30.0% | 15.0% | +15.0% | 18.6 | 12.5 |
| Row 1 | 2 | 20.0% | 15.0% | +5.0% | 19.8 | 10.7 |
| Row 2 | 1 | 10.0% | 15.0% | -5.0% | 20.6 | 12.2 |
| Row 3 | 1 | 10.0% | 15.0% | -5.0% | 21.3 | 10.7 |
| Row 4 | 2 | 20.0% | 15.0% | +5.0% | 21.6 | 11.6 |
| Row 5 | 0 | 0.0% | 12.5% | -12.5% | 22.5 | 11.1 |
| Row 6 | 1 | 10.0% | 12.5% | -2.5% | 19.2 | 12.2 |

### Garden Path × buggy × 60s

- **finishT:** 5.1526 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 5.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 20.0% | 20.0% | +0.0% | 21.2 | 11.4 |
| Row 1 | 3 | 30.0% | 20.0% | +10.0% | 21.2 | 11.6 |
| Row 2 | 4 | 40.0% | 20.0% | +20.0% | 19.0 | 11.9 |
| Row 3 | 0 | 0.0% | 20.0% | -20.0% | 20.0 | 11.8 |
| Row 4 | 1 | 10.0% | 20.0% | -10.0% | 21.1 | 11.2 |

### Garden Path × motorbike × 60s

- **finishT:** 5.6950 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 19.00 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 7 | 70.0% | 20.0% | +50.0% | 16.5 | 11.5 |
| Row 1 | 3 | 30.0% | 20.0% | +10.0% | 19.4 | 11.3 |
| Row 2 | 0 | 0.0% | 20.0% | -20.0% | 21.8 | 12.1 |
| Row 3 | 0 | 0.0% | 20.0% | -20.0% | 23.5 | 11.3 |
| Row 4 | 0 | 0.0% | 20.0% | -20.0% | 21.3 | 10.7 |

### Garden Path × beetle × 60s

- **finishT:** 4.8814 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 3.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 3 | 30.0% | 20.0% | +10.0% | 19.3 | 11.1 |
| Row 1 | 2 | 20.0% | 20.0% | +0.0% | 20.4 | 11.6 |
| Row 2 | 0 | 0.0% | 20.0% | -20.0% | 19.5 | 11.5 |
| Row 3 | 2 | 20.0% | 20.0% | +0.0% | 22.4 | 11.0 |
| Row 4 | 3 | 30.0% | 20.0% | +10.0% | 20.9 | 12.5 |

### Garden Path × boarder × 60s

- **finishT:** 5.4238 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 3.81 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 3 | 30.0% | 17.5% | +12.5% | 20.7 | 11.0 |
| Row 1 | 2 | 20.0% | 17.5% | +2.5% | 21.2 | 11.9 |
| Row 2 | 1 | 10.0% | 17.5% | -7.5% | 20.3 | 11.0 |
| Row 3 | 3 | 30.0% | 17.5% | +12.5% | 18.3 | 11.7 |
| Row 4 | 1 | 10.0% | 15.0% | -5.0% | 20.5 | 11.1 |
| Row 5 | 0 | 0.0% | 15.0% | -15.0% | 22.3 | 12.7 |

### Garden Path × snowmobile × 60s

- **finishT:** 5.9662 (Ziellinie in t-Raum)
- **Reihen:** 8 (gewichtete Erwartung nach Reihengröße)
- **Chi²(7):** 6.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 1 | 10.0% | 12.5% | -2.5% | 19.3 | 11.7 |
| Row 1 | 2 | 20.0% | 12.5% | +7.5% | 21.2 | 11.8 |
| Row 2 | 1 | 10.0% | 12.5% | -2.5% | 22.7 | 12.1 |
| Row 3 | 1 | 10.0% | 12.5% | -2.5% | 19.9 | 12.1 |
| Row 4 | 0 | 0.0% | 12.5% | -12.5% | 19.4 | 11.3 |
| Row 5 | 3 | 30.0% | 12.5% | +17.5% | 21.1 | 11.8 |
| Row 6 | 0 | 0.0% | 12.5% | -12.5% | 18.6 | 10.0 |
| Row 7 | 2 | 20.0% | 12.5% | +7.5% | 21.8 | 11.7 |

### City Circuit × horse × 60s

- **finishT:** 4.3950 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 6.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 20.0% | 17.5% | +2.5% | 20.1 | 11.5 |
| Row 1 | 4 | 40.0% | 17.5% | +22.5% | 19.0 | 10.7 |
| Row 2 | 2 | 20.0% | 17.5% | +2.5% | 19.9 | 11.6 |
| Row 3 | 2 | 20.0% | 17.5% | +2.5% | 20.8 | 12.0 |
| Row 4 | 0 | 0.0% | 15.0% | -15.0% | 22.1 | 12.5 |
| Row 5 | 0 | 0.0% | 15.0% | -15.0% | 21.5 | 11.3 |

### City Circuit × dragon × 60s

- **finishT:** 4.8345 (Ziellinie in t-Raum)
- **Reihen:** 8 (gewichtete Erwartung nach Reihengröße)
- **Chi²(7):** 2.80 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 1 | 10.0% | 12.5% | -2.5% | 18.5 | 11.3 |
| Row 1 | 2 | 20.0% | 12.5% | +7.5% | 19.5 | 11.2 |
| Row 2 | 1 | 10.0% | 12.5% | -2.5% | 22.2 | 11.8 |
| Row 3 | 0 | 0.0% | 12.5% | -12.5% | 24.2 | 10.6 |
| Row 4 | 1 | 10.0% | 12.5% | -2.5% | 18.2 | 11.4 |
| Row 5 | 2 | 20.0% | 12.5% | +7.5% | 20.7 | 13.0 |
| Row 6 | 1 | 10.0% | 12.5% | -2.5% | 23.1 | 11.9 |
| Row 7 | 2 | 20.0% | 12.5% | +7.5% | 17.6 | 10.0 |

### City Circuit × f1 × 60s

- **finishT:** 5.2740 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 9.43 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 17.5% | +32.5% | 17.7 | 11.2 |
| Row 1 | 2 | 20.0% | 17.5% | +2.5% | 19.9 | 11.9 |
| Row 2 | 2 | 20.0% | 17.5% | +2.5% | 20.0 | 11.6 |
| Row 3 | 1 | 10.0% | 17.5% | -7.5% | 20.5 | 10.9 |
| Row 4 | 0 | 0.0% | 15.0% | -15.0% | 22.8 | 10.7 |
| Row 5 | 0 | 0.0% | 15.0% | -15.0% | 22.8 | 12.6 |

### City Circuit × motorbike × 60s

- **finishT:** 4.6148 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 11.00 — * (p<0.05)

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 60.0% | 20.0% | +40.0% | 19.9 | 11.7 |
| Row 1 | 2 | 20.0% | 20.0% | +0.0% | 18.1 | 12.0 |
| Row 2 | 1 | 10.0% | 20.0% | -10.0% | 20.9 | 10.7 |
| Row 3 | 1 | 10.0% | 20.0% | -10.0% | 21.2 | 11.3 |
| Row 4 | 0 | 0.0% | 20.0% | -20.0% | 22.4 | 11.8 |

### City Circuit × beetle × 60s

- **finishT:** 3.9555 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 9.81 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 17.5% | +32.5% | 18.4 | 12.2 |
| Row 1 | 0 | 0.0% | 17.5% | -17.5% | 20.7 | 10.6 |
| Row 2 | 1 | 10.0% | 17.5% | -7.5% | 21.4 | 11.0 |
| Row 3 | 2 | 20.0% | 17.5% | +2.5% | 22.2 | 11.7 |
| Row 4 | 0 | 0.0% | 15.0% | -15.0% | 20.6 | 11.6 |
| Row 5 | 2 | 20.0% | 15.0% | +5.0% | 19.5 | 12.4 |

### City Circuit × boarder × 60s

- **finishT:** 4.3950 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 9.81 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 17.5% | +32.5% | 21.6 | 12.4 |
| Row 1 | 1 | 10.0% | 17.5% | -7.5% | 21.8 | 11.6 |
| Row 2 | 2 | 20.0% | 17.5% | +2.5% | 18.7 | 11.4 |
| Row 3 | 0 | 0.0% | 17.5% | -17.5% | 19.1 | 11.4 |
| Row 4 | 2 | 20.0% | 15.0% | +5.0% | 21.2 | 11.2 |
| Row 5 | 0 | 0.0% | 15.0% | -15.0% | 20.7 | 11.2 |

### Luger hill × dragon × 60s

- **finishT:** 0.8332 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 0.73 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 4 | 40.0% | 35.0% | +5.0% | 20.5 | 11.6 |
| Row 1 | 2 | 20.0% | 32.5% | -12.5% | 20.0 | 11.6 |
| Row 2 | 4 | 40.0% | 32.5% | +7.5% | 20.9 | 11.5 |

### Luger hill × rocket × 60s

- **finishT:** 0.9468 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 1.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 7 | 70.0% | 50.0% | +20.0% | 20.2 | 11.8 |
| Row 1 | 3 | 30.0% | 50.0% | -20.0% | 20.8 | 11.3 |

### Luger hill × plane × 60s

- **finishT:** 0.8710 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 50.0% | +0.0% | 20.5 | 11.6 |
| Row 1 | 5 | 50.0% | 50.0% | +0.0% | 20.5 | 11.5 |

### Luger hill × luge × 60s

- **finishT:** 0.8332 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 4 | 40.0% | 50.0% | -10.0% | 20.2 | 11.4 |
| Row 1 | 6 | 60.0% | 50.0% | +10.0% | 20.8 | 11.7 |

### Luger hill × snowmobile × 60s

- **finishT:** 0.8332 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 2.75 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 60.0% | 35.0% | +25.0% | 19.4 | 11.9 |
| Row 1 | 2 | 20.0% | 32.5% | -12.5% | 21.7 | 11.5 |
| Row 2 | 2 | 20.0% | 32.5% | -12.5% | 20.5 | 11.2 |

### Ice Track × horse × 60s

- **finishT:** 4.4760 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 6.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 20.0% | +30.0% | 17.8 | 12.0 |
| Row 1 | 1 | 10.0% | 20.0% | -10.0% | 19.1 | 11.9 |
| Row 2 | 1 | 10.0% | 20.0% | -10.0% | 22.6 | 10.7 |
| Row 3 | 1 | 10.0% | 20.0% | -10.0% | 20.7 | 11.1 |
| Row 4 | 2 | 20.0% | 20.0% | +0.0% | 22.2 | 11.5 |

### Ice Track × luge × 60s

- **finishT:** 4.9236 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 8.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 1 | 10.0% | 20.0% | -10.0% | 20.5 | 12.4 |
| Row 1 | 1 | 10.0% | 20.0% | -10.0% | 20.3 | 10.9 |
| Row 2 | 5 | 50.0% | 20.0% | +30.0% | 19.4 | 11.4 |
| Row 3 | 0 | 0.0% | 20.0% | -20.0% | 22.8 | 11.3 |
| Row 4 | 3 | 30.0% | 20.0% | +10.0% | 19.6 | 11.7 |

### Ice Track × snowmobile × 60s

- **finishT:** 4.9236 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 3.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 20.0% | 15.0% | +5.0% | 18.9 | 10.6 |
| Row 1 | 0 | 0.0% | 15.0% | -15.0% | 22.9 | 10.3 |
| Row 2 | 1 | 10.0% | 15.0% | -5.0% | 19.4 | 11.8 |
| Row 3 | 3 | 30.0% | 15.0% | +15.0% | 20.7 | 12.0 |
| Row 4 | 2 | 20.0% | 15.0% | +5.0% | 22.5 | 12.8 |
| Row 5 | 1 | 10.0% | 12.5% | -2.5% | 19.3 | 12.4 |
| Row 6 | 1 | 10.0% | 12.5% | -2.5% | 19.3 | 10.8 |

### Mountainstreet × horse × 60s

- **finishT:** 0.5003 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 60.0% | 50.0% | +10.0% | 20.9 | 12.2 |
| Row 1 | 4 | 40.0% | 50.0% | -10.0% | 20.1 | 10.9 |

### Mountainstreet × dragon × 60s

- **finishT:** 0.5503 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 50.0% | +0.0% | 21.4 | 11.6 |
| Row 1 | 5 | 50.0% | 50.0% | +0.0% | 19.6 | 11.4 |

### Mountainstreet × f1 × 60s

- **finishT:** 0.6004 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 4 | 40.0% | 50.0% | -10.0% | 20.5 | 11.6 |
| Row 1 | 6 | 60.0% | 50.0% | +10.0% | 20.5 | 11.6 |

### Mountainstreet × motorbike × 60s

- **finishT:** 0.5253 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 60.0% | 50.0% | +10.0% | 20.4 | 11.6 |
| Row 1 | 4 | 40.0% | 50.0% | -10.0% | 20.6 | 11.5 |

### Mountainstreet × beetle × 60s

- **finishT:** 0.4503 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 1.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 7 | 70.0% | 50.0% | +20.0% | 20.6 | 11.5 |
| Row 1 | 3 | 30.0% | 50.0% | -20.0% | 20.4 | 11.6 |

### Mountainstreet × boarder × 60s

- **finishT:** 0.5003 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 3.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 8 | 80.0% | 50.0% | +30.0% | 20.6 | 11.9 |
| Row 1 | 2 | 20.0% | 50.0% | -30.0% | 20.4 | 11.2 |

### Searound × duck × 60s

- **finishT:** 2.2445 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 4.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 25.0% | +25.0% | 19.0 | 11.5 |
| Row 1 | 1 | 10.0% | 25.0% | -15.0% | 20.5 | 11.7 |
| Row 2 | 3 | 30.0% | 25.0% | +5.0% | 21.9 | 11.1 |
| Row 3 | 1 | 10.0% | 25.0% | -15.0% | 20.6 | 11.9 |

### Searound × dragon × 60s

- **finishT:** 2.9047 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 1.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 3 | 30.0% | 20.0% | +10.0% | 21.5 | 11.7 |
| Row 1 | 2 | 20.0% | 20.0% | +0.0% | 21.4 | 11.9 |
| Row 2 | 2 | 20.0% | 20.0% | +0.0% | 20.5 | 12.1 |
| Row 3 | 2 | 20.0% | 20.0% | +0.0% | 20.4 | 11.3 |
| Row 4 | 1 | 10.0% | 20.0% | -10.0% | 18.7 | 10.8 |

### Searound × rocket × 60s

- **finishT:** 3.3008 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 2.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 4 | 40.0% | 25.0% | +15.0% | 19.2 | 11.9 |
| Row 1 | 3 | 30.0% | 25.0% | +5.0% | 20.3 | 11.5 |
| Row 2 | 1 | 10.0% | 25.0% | -15.0% | 21.7 | 11.4 |
| Row 3 | 2 | 20.0% | 25.0% | -5.0% | 20.8 | 11.5 |

### Searound × koi × 60s

- **finishT:** 2.5086 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 9.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 20.0% | +30.0% | 20.4 | 12.4 |
| Row 1 | 2 | 20.0% | 20.0% | +0.0% | 19.0 | 11.7 |
| Row 2 | 3 | 30.0% | 20.0% | +10.0% | 21.5 | 12.4 |
| Row 3 | 0 | 0.0% | 20.0% | -20.0% | 20.3 | 10.5 |
| Row 4 | 0 | 0.0% | 20.0% | -20.0% | 21.2 | 10.9 |

### Searound × turtle × 60s

- **finishT:** 2.2445 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 1.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 20.0% | 20.0% | +0.0% | 22.1 | 11.2 |
| Row 1 | 3 | 30.0% | 20.0% | +10.0% | 17.9 | 11.3 |
| Row 2 | 2 | 20.0% | 20.0% | +0.0% | 21.7 | 11.4 |
| Row 3 | 2 | 20.0% | 20.0% | +0.0% | 19.8 | 11.0 |
| Row 4 | 1 | 10.0% | 20.0% | -10.0% | 21.0 | 12.7 |

### Searound × manta × 60s

- **finishT:** 2.9047 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 4.19 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 4 | 40.0% | 17.5% | +22.5% | 21.6 | 11.7 |
| Row 1 | 1 | 10.0% | 17.5% | -7.5% | 19.9 | 10.4 |
| Row 2 | 1 | 10.0% | 17.5% | -7.5% | 22.0 | 11.7 |
| Row 3 | 1 | 10.0% | 17.5% | -7.5% | 20.1 | 11.5 |
| Row 4 | 2 | 20.0% | 15.0% | +5.0% | 19.0 | 12.4 |
| Row 5 | 1 | 10.0% | 15.0% | -5.0% | 20.1 | 11.8 |

### Searound × dolphin × 60s

- **finishT:** 3.0367 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 1.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 20.0% | 20.0% | +0.0% | 21.9 | 11.8 |
| Row 1 | 3 | 30.0% | 20.0% | +10.0% | 20.0 | 11.2 |
| Row 2 | 2 | 20.0% | 20.0% | +0.0% | 20.8 | 10.8 |
| Row 3 | 2 | 20.0% | 20.0% | +0.0% | 18.9 | 12.5 |
| Row 4 | 1 | 10.0% | 20.0% | -10.0% | 20.9 | 11.3 |

### Seatrack × duck × 60s

- **finishT:** 0.5436 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 1.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 7 | 70.0% | 50.0% | +20.0% | 19.9 | 11.8 |
| Row 1 | 3 | 30.0% | 50.0% | -20.0% | 21.1 | 11.3 |

### Seatrack × dragon × 60s

- **finishT:** 0.7035 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 50.0% | +0.0% | 21.1 | 11.9 |
| Row 1 | 5 | 50.0% | 50.0% | +0.0% | 19.9 | 11.2 |

### Seatrack × rocket × 60s

- **finishT:** 0.7994 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 60.0% | 50.0% | +10.0% | 21.4 | 11.5 |
| Row 1 | 4 | 40.0% | 50.0% | -10.0% | 19.6 | 11.6 |

### Seatrack × koi × 60s

- **finishT:** 0.6075 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 60.0% | 50.0% | +10.0% | 20.4 | 11.7 |
| Row 1 | 4 | 40.0% | 50.0% | -10.0% | 20.6 | 11.4 |

### Seatrack × turtle × 60s

- **finishT:** 0.5436 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 3.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 8 | 80.0% | 50.0% | +30.0% | 20.5 | 12.1 |
| Row 1 | 2 | 20.0% | 50.0% | -30.0% | 20.5 | 11.0 |

### Seatrack × manta × 60s

- **finishT:** 0.7035 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 4 | 40.0% | 50.0% | -10.0% | 20.5 | 11.9 |
| Row 1 | 6 | 60.0% | 50.0% | +10.0% | 20.5 | 11.2 |

### Seatrack × dolphin × 60s

- **finishT:** 0.7354 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 5 | 50.0% | 50.0% | +0.0% | 21.1 | 11.6 |
| Row 1 | 5 | 50.0% | 50.0% | +0.0% | 19.9 | 11.5 |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| River Run | duck | 60s | 19.5% | ⚠️ Zu wenig Mixing |
| River Run | dragon | 60s | 44.0% | ⚠️ Zu wenig Mixing |
| River Run | rocket | 60s | 51.0% | ⚠️ Zu wenig Mixing |
| River Run | koi | 60s | 36.5% | ⚠️ Zu wenig Mixing |
| River Run | turtle | 60s | 25.5% | ⚠️ Zu wenig Mixing |
| River Run | manta | 60s | 40.5% | ⚠️ Zu wenig Mixing |
| River Run | dolphin | 60s | 42.5% | ⚠️ Zu wenig Mixing |
| Space Sprint | dragon | 60s | 37.0% | ⚠️ Zu wenig Mixing |
| Space Sprint | rocket | 60s | 36.5% | ⚠️ Zu wenig Mixing |
| Space Sprint | plane | 60s | 37.5% | ⚠️ Zu wenig Mixing |
| Luger hill | dragon | 60s | 33.8% | ⚠️ Zu wenig Mixing |
| Luger hill | rocket | 60s | 56.0% | ⚠️ Zu wenig Mixing |
| Luger hill | plane | 60s | 51.5% | ⚠️ Zu wenig Mixing |
| Luger hill | luge | 60s | 50.5% | ⚠️ Zu wenig Mixing |
| Luger hill | snowmobile | 60s | 16.9% | ⚠️ Zu wenig Mixing |
| Mountainstreet | horse | 60s | 41.5% | ⚠️ Zu wenig Mixing |
| Mountainstreet | dragon | 60s | 46.5% | ⚠️ Zu wenig Mixing |
| Mountainstreet | f1 | 60s | 50.0% | ⚠️ Zu wenig Mixing |
| Mountainstreet | motorbike | 60s | 45.0% | ⚠️ Zu wenig Mixing |
| Mountainstreet | beetle | 60s | 28.0% | ⚠️ Zu wenig Mixing |
| Mountainstreet | boarder | 60s | 31.5% | ⚠️ Zu wenig Mixing |
| Seatrack | duck | 60s | 17.0% | ⚠️ Zu wenig Mixing |
| Seatrack | dragon | 60s | 48.5% | ⚠️ Zu wenig Mixing |
| Seatrack | rocket | 60s | 47.5% | ⚠️ Zu wenig Mixing |
| Seatrack | koi | 60s | 29.0% | ⚠️ Zu wenig Mixing |
| Seatrack | turtle | 60s | 19.0% | ⚠️ Zu wenig Mixing |
| Seatrack | manta | 60s | 38.0% | ⚠️ Zu wenig Mixing |
| Seatrack | dolphin | 60s | 42.5% | ⚠️ Zu wenig Mixing |

---

## Gesamtauswertung

**Getestete Kombinationen:** 66  
**Davon statistisch fair (p≥0.05):** 63  
**Davon statistisch unfair (p<0.05):** 3  

**Kombinationen mit signifikantem Ungleichgewicht (p < 0.05):**

- **Dirt Oval × beetle × 60s:** Row 0 zu oft (60.0% statt erw. 17.5%) — * (p<0.05)
- **Garden Path × motorbike × 60s:** Row 0 zu oft (70.0% statt erw. 20.0%) — *** (p<0.001)
- **City Circuit × motorbike × 60s:** Row 0 zu oft (60.0% statt erw. 20.0%) — * (p<0.05)

---

## Empfehlung

### Front-Row-Vorteil (Row 0 gewinnt zu oft)
- **Dirt Oval × beetle × 60s** — * (p<0.05)
- **Garden Path × motorbike × 60s** — *** (p<0.001)
- **City Circuit × motorbike × 60s** — * (p<0.05)

### Hinter-Row-Nachteil (Row 0 gewinnt zu selten / Catch-Up überkompensiert)
Keine Kombination zeigt Hinter-Row-Nachteil oder Überkompensation.

### Catch-Up-Mechanismus (speedBonusFactor = 1.0)
Unfairness verteilt sich gleichmäßig auf kurze und lange Rennen (0 × 30s, 0 × 120s).

*Hinweis: Dieser Abschnitt enthält ausschließlich statistische Beurteilungen, keine Code-Empfehlungen.*

---

## Phase-3A — Naturalness-Metriken (Open Tracks)

Stabile Phase: 25%–95% der targetDuration. Jerk: |Δ(effSpeed)/DT| / max(baseSpeed, ε). naturalOvt: Anteil Überholungen mit tDiff ≤ 30% des Referenzabstands.

| Track | Racer | Dist | meanJerk | maxJerk | jerkHigh% | natOvt% | pulkTime% | pulkTrigIn | pulkTrigOut |
|-------|-------|------|----------|---------|-----------|---------|-----------|-----------|-------------|
| River Run | duck | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| River Run | dragon | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| River Run | rocket | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| River Run | koi | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| River Run | turtle | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| River Run | manta | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 99.9% | 0.00 | 1.00 |
| River Run | dolphin | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Space Sprint | dragon | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Space Sprint | rocket | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Space Sprint | plane | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Luger hill | dragon | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Luger hill | rocket | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Luger hill | plane | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Luger hill | luge | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 99.9% | 0.00 | 1.00 |
| Luger hill | snowmobile | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 99.9% | 0.00 | 1.00 |
| Mountainstreet | horse | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Mountainstreet | dragon | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Mountainstreet | f1 | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Mountainstreet | motorbike | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Mountainstreet | beetle | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Mountainstreet | boarder | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 99.9% | 0.00 | 1.00 |
| Seatrack | duck | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Seatrack | dragon | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Seatrack | rocket | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Seatrack | koi | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Seatrack | turtle | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 99.5% | 0.00 | 1.00 |
| Seatrack | manta | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |
| Seatrack | dolphin | 60s | 0.0000 | 0.0001 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |

---

## Lateral Quality Metrics

overlapRate: % of active pair-frames with |dY|<0.08 AND |dT|<0.03 (lateral collision zone).  
overlapResolution: avg consecutive frames a pair stays in overlap before separating.  
zigzagScore: avg |physicalYVelocity change| per racer-frame (after 4s) — target < 0.003.  
lateralSpeedScore: avg |physicalYVelocity| per racer-frame (after 4s) — lower = smoother.  
brakeRate: fraction of racer-frames where speed-brake is active (after 4s) — lower = less blockage.  
stableOvertakes: confirmed lead-swaps (≥3s) per racer in 20%–80% of race — higher = more action.

| Track | Racer | Dist | overlapRate% | overlapResolution (fr) | zigzagScore |
|-------|-------|------|-------------|------------------------|-------------|
| Dirt Oval | horse | 60s | 3.9% | 151.1 | 0.000068 ✅ |
| Dirt Oval | elephant | 60s | 4.7% | 199.9 | 0.000074 ✅ |
| Dirt Oval | giraffe | 60s | 3.5% | 158.8 | 0.000070 ✅ |
| Dirt Oval | snake | 60s | 4.7% | 182.0 | 0.000071 ✅ |
| Dirt Oval | dragon | 60s | 3.1% | 136.5 | 0.000070 ✅ |
| Dirt Oval | buggy | 60s | 4.0% | 159.8 | 0.000070 ✅ |
| Dirt Oval | motorbike | 60s | 3.8% | 146.5 | 0.000068 ✅ |
| Dirt Oval | beetle | 60s | 4.1% | 160.2 | 0.000070 ✅ |
| Dirt Oval | boarder | 60s | 4.0% | 148.8 | 0.000068 ✅ |
| Dirt Oval | snowmobile | 60s | 3.1% | 134.3 | 0.000071 ✅ |
| River Run | duck | 60s | 17.1% | 189.6 | 0.000319 ✅ |
| River Run | dragon | 60s | 16.3% | 174.0 | 0.000316 ✅ |
| River Run | rocket | 60s | 16.0% | 175.4 | 0.000325 ✅ |
| River Run | koi | 60s | 17.0% | 185.1 | 0.000309 ✅ |
| River Run | turtle | 60s | 16.9% | 180.8 | 0.000326 ✅ |
| River Run | manta | 60s | 16.5% | 171.5 | 0.000311 ✅ |
| River Run | dolphin | 60s | 16.1% | 168.2 | 0.000324 ✅ |
| Space Sprint | dragon | 60s | 18.3% | 177.6 | 0.000332 ✅ |
| Space Sprint | rocket | 60s | 18.5% | 163.7 | 0.000342 ✅ |
| Space Sprint | plane | 60s | 18.4% | 174.7 | 0.000339 ✅ |
| Garden Path | horse | 60s | 3.1% | 119.6 | 0.000067 ✅ |
| Garden Path | duck | 60s | 3.8% | 150.8 | 0.000068 ✅ |
| Garden Path | snail | 60s | 5.8% | 267.9 | 0.000068 ✅ |
| Garden Path | elephant | 60s | 3.6% | 174.9 | 0.000064 ✅ |
| Garden Path | giraffe | 60s | 3.0% | 134.2 | 0.000066 ✅ |
| Garden Path | snake | 60s | 3.9% | 163.9 | 0.000070 ✅ |
| Garden Path | dragon | 60s | 2.7% | 107.6 | 0.000066 ✅ |
| Garden Path | buggy | 60s | 3.4% | 126.9 | 0.000067 ✅ |
| Garden Path | motorbike | 60s | 3.3% | 115.7 | 0.000066 ✅ |
| Garden Path | beetle | 60s | 3.6% | 137.0 | 0.000068 ✅ |
| Garden Path | boarder | 60s | 3.1% | 122.8 | 0.000067 ✅ |
| Garden Path | snowmobile | 60s | 1.9% | 115.8 | 0.000056 ✅ |
| City Circuit | horse | 60s | 3.8% | 142.5 | 0.000067 ✅ |
| City Circuit | dragon | 60s | 3.0% | 139.1 | 0.000065 ✅ |
| City Circuit | f1 | 60s | 3.4% | 130.9 | 0.000064 ✅ |
| City Circuit | motorbike | 60s | 3.9% | 152.3 | 0.000066 ✅ |
| City Circuit | beetle | 60s | 4.0% | 166.7 | 0.000069 ✅ |
| City Circuit | boarder | 60s | 3.9% | 150.3 | 0.000067 ✅ |
| Luger hill | dragon | 60s | 11.8% | 219.8 | 0.000105 ✅ |
| Luger hill | rocket | 60s | 15.1% | 171.1 | 0.000315 ✅ |
| Luger hill | plane | 60s | 15.2% | 173.9 | 0.000303 ✅ |
| Luger hill | luge | 60s | 15.7% | 179.1 | 0.000308 ✅ |
| Luger hill | snowmobile | 60s | 12.0% | 223.4 | 0.000107 ✅ |
| Ice Track | horse | 60s | 3.9% | 151.2 | 0.000068 ✅ |
| Ice Track | luge | 60s | 3.6% | 141.4 | 0.000065 ✅ |
| Ice Track | snowmobile | 60s | 3.2% | 130.7 | 0.000063 ✅ |
| Mountainstreet | horse | 60s | 18.1% | 181.4 | 0.000316 ✅ |
| Mountainstreet | dragon | 60s | 18.1% | 177.8 | 0.000325 ✅ |
| Mountainstreet | f1 | 60s | 18.1% | 175.1 | 0.000308 ✅ |
| Mountainstreet | motorbike | 60s | 18.2% | 184.9 | 0.000295 ✅ |
| Mountainstreet | beetle | 60s | 17.8% | 184.3 | 0.000309 ✅ |
| Mountainstreet | boarder | 60s | 18.6% | 182.8 | 0.000308 ✅ |
| Searound | duck | 60s | 6.6% | 203.6 | 0.000066 ✅ |
| Searound | dragon | 60s | 5.3% | 185.8 | 0.000062 ✅ |
| Searound | rocket | 60s | 5.6% | 177.9 | 0.000065 ✅ |
| Searound | koi | 60s | 5.7% | 210.1 | 0.000061 ✅ |
| Searound | turtle | 60s | 5.9% | 204.2 | 0.000063 ✅ |
| Searound | manta | 60s | 4.9% | 182.7 | 0.000059 ✅ |
| Searound | dolphin | 60s | 5.2% | 185.6 | 0.000060 ✅ |
| Seatrack | duck | 60s | 16.4% | 190.8 | 0.000319 ✅ |
| Seatrack | dragon | 60s | 15.9% | 172.3 | 0.000314 ✅ |
| Seatrack | rocket | 60s | 15.7% | 171.7 | 0.000318 ✅ |
| Seatrack | koi | 60s | 16.3% | 180.6 | 0.000321 ✅ |
| Seatrack | turtle | 60s | 16.7% | 185.4 | 0.000300 ✅ |
| Seatrack | manta | 60s | 15.7% | 168.0 | 0.000340 ✅ |
| Seatrack | dolphin | 60s | 15.2% | 170.4 | 0.000323 ✅ |

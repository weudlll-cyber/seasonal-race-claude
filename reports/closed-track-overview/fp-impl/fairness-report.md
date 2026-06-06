# RaceArena — Fairness Simulation Report

**Datum:** 2026-06-04  
**Rennen pro Kombination:** 5  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–5  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Dirt Oval | horse | 30s | 7 | 15.0% | 20.0% | 40.0% | 8.0% | 4.3 | n.s. | ✅ Fair |
| Dirt Oval | elephant | 30s | 7 | 15.0% | 0.0% | 20.0% | 16.0% | 5.4 | n.s. | ✅ Fair |
| Dirt Oval | giraffe | 30s | 8 | 12.5% | 0.0% | 20.0% | 13.3% | 3.0 | n.s. | ✅ Fair |
| Dirt Oval | snake | 30s | 7 | 15.0% | 20.0% | 0.0% | 16.0% | 4.6 | n.s. | ✅ Fair |
| Dirt Oval | dragon | 30s | 8 | 12.5% | 0.0% | 20.0% | 13.3% | 9.4 | n.s. | ✅ Fair |
| Dirt Oval | buggy | 30s | 6 | 17.5% | 20.0% | 0.0% | 20.0% | 7.6 | n.s. | ✅ Fair |
| Dirt Oval | motorbike | 30s | 7 | 15.0% | 20.0% | 20.0% | 12.0% | 4.6 | n.s. | ✅ Fair |
| Dirt Oval | beetle | 30s | 6 | 17.5% | 0.0% | 20.0% | 20.0% | 7.8 | n.s. | ✅ Fair |
| Dirt Oval | boarder | 30s | 6 | 17.5% | 0.0% | 40.0% | 15.0% | 9.9 | n.s. | ✅ Fair |
| Dirt Oval | snowmobile | 30s | 8 | 12.5% | 0.0% | 20.0% | 13.3% | 9.4 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Dirt Oval × horse × 30s

- **finishT:** 2.0943 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 4.33 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 1 | 20.0% | 15.0% | +5.0% | 19.9 | 12.4 |
| Row 1 | 2 | 40.0% | 15.0% | +25.0% | 21.7 | 12.8 |
| Row 2 | 0 | 0.0% | 15.0% | -15.0% | 21.2 | 11.3 |
| Row 3 | 1 | 20.0% | 15.0% | +5.0% | 21.0 | 11.8 |
| Row 4 | 1 | 20.0% | 15.0% | +5.0% | 18.8 | 11.9 |
| Row 5 | 0 | 0.0% | 12.5% | -12.5% | 19.2 | 11.0 |
| Row 6 | 0 | 0.0% | 12.5% | -12.5% | 21.8 | 10.2 |

### Dirt Oval × elephant × 30s

- **finishT:** 1.2566 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 5.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 0 | 0.0% | 15.0% | -15.0% | 22.0 | 12.7 |
| Row 1 | 1 | 20.0% | 15.0% | +5.0% | 21.4 | 11.9 |
| Row 2 | 0 | 0.0% | 15.0% | -15.0% | 20.9 | 12.3 |
| Row 3 | 1 | 20.0% | 15.0% | +5.0% | 21.4 | 10.9 |
| Row 4 | 1 | 20.0% | 15.0% | +5.0% | 19.0 | 11.1 |
| Row 5 | 2 | 40.0% | 12.5% | +27.5% | 18.3 | 11.3 |
| Row 6 | 0 | 0.0% | 12.5% | -12.5% | 20.0 | 11.3 |

### Dirt Oval × giraffe × 30s

- **finishT:** 1.8849 (Ziellinie in t-Raum)
- **Reihen:** 8 (gewichtete Erwartung nach Reihengröße)
- **Chi²(7):** 3.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 0 | 0.0% | 12.5% | -12.5% | 21.7 | 11.2 |
| Row 1 | 1 | 20.0% | 12.5% | +7.5% | 20.8 | 12.1 |
| Row 2 | 1 | 20.0% | 12.5% | +7.5% | 21.9 | 12.2 |
| Row 3 | 0 | 0.0% | 12.5% | -12.5% | 23.7 | 12.1 |
| Row 4 | 1 | 20.0% | 12.5% | +7.5% | 20.3 | 11.4 |
| Row 5 | 1 | 20.0% | 12.5% | +7.5% | 17.0 | 11.1 |
| Row 6 | 0 | 0.0% | 12.5% | -12.5% | 18.6 | 11.0 |
| Row 7 | 1 | 20.0% | 12.5% | +7.5% | 20.0 | 11.6 |

### Dirt Oval × snake × 30s

- **finishT:** 1.5707 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 4.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 1 | 20.0% | 15.0% | +5.0% | 20.7 | 12.8 |
| Row 1 | 0 | 0.0% | 15.0% | -15.0% | 22.1 | 11.4 |
| Row 2 | 0 | 0.0% | 15.0% | -15.0% | 20.7 | 11.7 |
| Row 3 | 1 | 20.0% | 15.0% | +5.0% | 21.1 | 11.8 |
| Row 4 | 2 | 40.0% | 15.0% | +25.0% | 18.6 | 11.6 |
| Row 5 | 1 | 20.0% | 12.5% | +7.5% | 19.0 | 11.5 |
| Row 6 | 0 | 0.0% | 12.5% | -12.5% | 21.0 | 10.9 |

### Dirt Oval × dragon × 30s

- **finishT:** 2.3037 (Ziellinie in t-Raum)
- **Reihen:** 8 (gewichtete Erwartung nach Reihengröße)
- **Chi²(7):** 9.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 0 | 0.0% | 12.5% | -12.5% | 21.1 | 11.4 |
| Row 1 | 1 | 20.0% | 12.5% | +7.5% | 20.4 | 12.2 |
| Row 2 | 0 | 0.0% | 12.5% | -12.5% | 21.4 | 11.3 |
| Row 3 | 0 | 0.0% | 12.5% | -12.5% | 23.8 | 12.8 |
| Row 4 | 2 | 40.0% | 12.5% | +27.5% | 20.3 | 12.0 |
| Row 5 | 2 | 40.0% | 12.5% | +27.5% | 16.8 | 11.1 |
| Row 6 | 0 | 0.0% | 12.5% | -12.5% | 18.7 | 10.6 |
| Row 7 | 0 | 0.0% | 12.5% | -12.5% | 21.4 | 11.3 |

### Dirt Oval × buggy × 30s

- **finishT:** 1.9896 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 7.57 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 1 | 20.0% | 17.5% | +2.5% | 20.2 | 12.8 |
| Row 1 | 0 | 0.0% | 17.5% | -17.5% | 20.6 | 10.6 |
| Row 2 | 1 | 20.0% | 17.5% | +2.5% | 21.6 | 11.8 |
| Row 3 | 3 | 60.0% | 17.5% | +42.5% | 18.2 | 12.4 |
| Row 4 | 0 | 0.0% | 15.0% | -15.0% | 20.5 | 11.1 |
| Row 5 | 0 | 0.0% | 15.0% | -15.0% | 22.2 | 10.7 |

### Dirt Oval × motorbike × 30s

- **finishT:** 2.1990 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 4.60 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 1 | 20.0% | 15.0% | +5.0% | 20.5 | 12.9 |
| Row 1 | 1 | 20.0% | 15.0% | +5.0% | 21.3 | 12.3 |
| Row 2 | 0 | 0.0% | 15.0% | -15.0% | 21.0 | 11.0 |
| Row 3 | 2 | 40.0% | 15.0% | +25.0% | 20.8 | 12.1 |
| Row 4 | 0 | 0.0% | 15.0% | -15.0% | 19.2 | 11.6 |
| Row 5 | 1 | 20.0% | 12.5% | +7.5% | 19.6 | 11.2 |
| Row 6 | 0 | 0.0% | 12.5% | -12.5% | 21.1 | 10.5 |

### Dirt Oval × beetle × 30s

- **finishT:** 1.8849 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 7.76 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 0 | 0.0% | 17.5% | -17.5% | 20.6 | 12.8 |
| Row 1 | 1 | 20.0% | 17.5% | +2.5% | 20.5 | 10.9 |
| Row 2 | 0 | 0.0% | 17.5% | -17.5% | 21.5 | 12.1 |
| Row 3 | 3 | 60.0% | 17.5% | +42.5% | 18.0 | 12.1 |
| Row 4 | 1 | 20.0% | 15.0% | +5.0% | 20.4 | 10.5 |
| Row 5 | 0 | 0.0% | 15.0% | -15.0% | 22.3 | 11.1 |

### Dirt Oval × boarder × 30s

- **finishT:** 2.0943 (Ziellinie in t-Raum)
- **Reihen:** 6 (gewichtete Erwartung nach Reihengröße)
- **Chi²(5):** 9.86 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 0 | 0.0% | 17.5% | -17.5% | 20.4 | 12.7 |
| Row 1 | 2 | 40.0% | 17.5% | +22.5% | 20.4 | 10.8 |
| Row 2 | 0 | 0.0% | 17.5% | -17.5% | 21.6 | 11.9 |
| Row 3 | 3 | 60.0% | 17.5% | +42.5% | 18.2 | 12.1 |
| Row 4 | 0 | 0.0% | 15.0% | -15.0% | 20.7 | 10.6 |
| Row 5 | 0 | 0.0% | 15.0% | -15.0% | 22.0 | 11.5 |

### Dirt Oval × snowmobile × 30s

- **finishT:** 2.3037 (Ziellinie in t-Raum)
- **Reihen:** 8 (gewichtete Erwartung nach Reihengröße)
- **Chi²(7):** 9.40 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 0 | 0.0% | 12.5% | -12.5% | 21.1 | 11.4 |
| Row 1 | 1 | 20.0% | 12.5% | +7.5% | 20.4 | 12.2 |
| Row 2 | 0 | 0.0% | 12.5% | -12.5% | 21.4 | 11.3 |
| Row 3 | 0 | 0.0% | 12.5% | -12.5% | 23.8 | 12.8 |
| Row 4 | 2 | 40.0% | 12.5% | +27.5% | 20.3 | 12.0 |
| Row 5 | 2 | 40.0% | 12.5% | +27.5% | 16.8 | 11.1 |
| Row 6 | 0 | 0.0% | 12.5% | -12.5% | 18.7 | 10.6 |
| Row 7 | 0 | 0.0% | 12.5% | -12.5% | 21.4 | 11.3 |

---

## Gesamtauswertung

**Getestete Kombinationen:** 10  
**Davon statistisch fair (p≥0.05):** 10  
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

overlapRate: % of active pair-frames with |dT|<10%·bodyH/pathLen AND |dY|<10%·bodyW/trackW.  
overlapResolution: avg consecutive frames a pair stays in overlap before separating.  
zigzagScore: avg |physicalYVelocity change| per racer-frame (after 4s) — target < 0.003.  
lateralSpeedScore: avg |physicalYVelocity| per racer-frame (after 4s) — lower = smoother.  
brakeRate: fraction of racer-frames where speed-brake is active (after 4s) — lower = less blockage.  
stableOvertakes: confirmed lead-swaps (≥3s) per racer in 20%–80% of race — higher = more action.

| Track | Racer | Dist | overlapRate% | overlapResolution (fr) | zigzagScore |
|-------|-------|------|-------------|------------------------|-------------|
| Dirt Oval | horse | 30s | 0.0% | 2.2 | 0.000055 ✅ |
| Dirt Oval | elephant | 30s | 0.0% | 34.4 | 0.000054 ✅ |
| Dirt Oval | giraffe | 30s | 0.0% | 10.8 | 0.000058 ✅ |
| Dirt Oval | snake | 30s | 0.0% | 23.6 | 0.000056 ✅ |
| Dirt Oval | dragon | 30s | 0.0% | 23.1 | 0.000058 ✅ |
| Dirt Oval | buggy | 30s | 0.0% | 39.9 | 0.000061 ✅ |
| Dirt Oval | motorbike | 30s | 0.0% | 19.2 | 0.000050 ✅ |
| Dirt Oval | beetle | 30s | 0.0% | 12.4 | 0.000061 ✅ |
| Dirt Oval | boarder | 30s | 0.0% | 32.3 | 0.000067 ✅ |
| Dirt Oval | snowmobile | 30s | 0.0% | 20.2 | 0.000058 ✅ |

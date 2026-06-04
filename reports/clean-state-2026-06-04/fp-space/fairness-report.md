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
| Space Sprint | dragon | 30s | 2 | 50.0% | 20.0% | 80.0% | — | 1.8 | n.s. | ✅ Fair |
| Space Sprint | rocket | 30s | 2 | 50.0% | 60.0% | 40.0% | — | 0.2 | n.s. | ✅ Fair |
| Space Sprint | plane | 30s | 2 | 50.0% | 40.0% | 60.0% | — | 0.2 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Space Sprint × dragon × 30s

- **finishT:** 0.2180 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 1.80 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 1 | 20.0% | 50.0% | -30.0% | 22.1 | 12.0 |
| Row 1 | 4 | 80.0% | 50.0% | +30.0% | 18.9 | 11.0 |

### Space Sprint × rocket × 30s

- **finishT:** 0.2477 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.20 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 3 | 60.0% | 50.0% | +10.0% | 21.9 | 12.0 |
| Row 1 | 2 | 40.0% | 50.0% | -10.0% | 19.1 | 11.0 |

### Space Sprint × plane × 30s

- **finishT:** 0.2279 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.20 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 2 | 40.0% | 50.0% | -10.0% | 22.0 | 12.0 |
| Row 1 | 3 | 60.0% | 50.0% | +10.0% | 19.0 | 11.0 |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Space Sprint | dragon | 30s | 48.0% | ⚠️ Zu wenig Mixing |
| Space Sprint | rocket | 30s | 57.0% | ⚠️ Zu wenig Mixing |
| Space Sprint | plane | 30s | 52.0% | ⚠️ Zu wenig Mixing |

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
| Space Sprint | dragon | 30s | 0.0000 | 0.0001 | 0.0% | 100.0% | 99.7% | 0.00 | 1.00 |
| Space Sprint | rocket | 30s | 0.0000 | 0.0001 | 0.0% | 100.0% | 99.3% | 0.00 | 1.00 |
| Space Sprint | plane | 30s | 0.0000 | 0.0001 | 0.0% | 100.0% | 99.8% | 0.00 | 1.00 |

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
| Space Sprint | dragon | 30s | 0.0% | 56.9 | 0.000196 ✅ |
| Space Sprint | rocket | 30s | 0.0% | 16.8 | 0.000199 ✅ |
| Space Sprint | plane | 30s | 0.0% | 33.4 | 0.000197 ✅ |

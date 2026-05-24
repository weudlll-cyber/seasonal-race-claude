# RaceArena — Fairness Simulation Report

**Datum:** 2026-05-22  
**Rennen pro Kombination:** 5  
**Teilnehmer pro Rennen:** 51  
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
| Space Sprint | dragon | 60s | 2 | 51.0% | 60.0% | 40.0% | — | 0.2 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Space Sprint × dragon × 60s

- **finishT:** 0.4360 (Ziellinie in t-Raum)
- **Reihen:** 2 (gewichtete Erwartung nach Reihengröße)
- **Chi²(1):** 0.16 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 3 | 60.0% | 51.0% | +9.0% | 25.1 | 14.5 |
| Row 1 | 2 | 40.0% | 49.0% | -9.0% | 26.9 | 15.1 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(1) = 0.16 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 25 | 15 | 60.0% |
| B2 (Pl. 6–15) | 50 | 24 | 48.0% |
| B3 (Pl. 16–25) | 50 | 24 | 48.0% |
| B4 (Pl. 26–40) | 75 | 40 | 53.3% |
| B5 (Pl. 41–51) | 55 | 33 | 60.0% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (26R) | Row 1 (25R) | Gesamt |
|---|---|---|---|
| 1 | 3 (60.0%) | 2 (40.0%) | 5 |
| 2 | 1 (20.0%) | 4 (80.0%) | 5 |
| 3 | 3 (60.0%) | 2 (40.0%) | 5 |
| 4 | 4 (80.0%) | 1 (20.0%) | 5 |
| 5 | 2 (40.0%) | 3 (60.0%) | 5 |
| 6–10 | 12 (48.0%) | 13 (52.0%) | 25 |
| 11–15 | 14 (56.0%) | 11 (44.0%) | 25 |
| 16–25 | 28 (56.0%) | 22 (44.0%) | 50 |
| 26–40 | 37 (49.3%) | 38 (50.7%) | 75 |
| 41–51 | 26 (47.3%) | 29 (52.7%) | 55 |
| *(erw. je Pl.1)* | 51.0% | 49.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 3 (60.0%) | 1 (20.0%) | 1 (20.0%) | 0 (0.0%) | 0 (0.0%) | 5 |
| 2 | 4 (80.0%) | 1 (20.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 5 |
| 3 | 4 (80.0%) | 0 (0.0%) | 1 (20.0%) | 0 (0.0%) | 0 (0.0%) | 5 |
| 4 | 2 (40.0%) | 3 (60.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 5 |
| 5 | 2 (40.0%) | 2 (40.0%) | 0 (0.0%) | 1 (20.0%) | 0 (0.0%) | 5 |
| 6–10 | 1 (4.0%) | 14 (56.0%) | 5 (20.0%) | 3 (12.0%) | 2 (8.0%) | 25 |
| 11–15 | 3 (12.0%) | 10 (40.0%) | 5 (20.0%) | 5 (20.0%) | 2 (8.0%) | 25 |
| 16–25 | 3 (6.0%) | 8 (16.0%) | 24 (48.0%) | 9 (18.0%) | 6 (12.0%) | 50 |
| 26–40 | 3 (4.0%) | 10 (13.3%) | 10 (13.3%) | 40 (53.3%) | 12 (16.0%) | 75 |
| 41–51 | 0 (0.0%) | 1 (1.8%) | 4 (7.3%) | 17 (30.9%) | 33 (60.0%) | 55 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 15 | 60.0% |
| Pl. 6–10 | 1 | 4.0% |
| Pl. 11–15 | 3 | 12.0% |
| Pl. 16–25 | 3 | 12.0% |
| Pl. 26–40 | 3 | 12.0% |
| Pl. 41–51 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 |
|---|---|---|
| Treffer (Pl. 1–5) | 7/15 (46.7%) | 8/10 (80.0%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–51 ✅ Soll erreicht | 33 | 60.0% |
| Pl. 26–40 | 12 | 21.8% |
| Pl. 16–25 | 6 | 10.9% |
| Pl. 6–15 | 4 | 7.3% |
| Pl. 1–5 ❌ Brems-Leck | 0 | 0.0% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 |
|---|---|---|
| Top-5 trotz B5-Ziel | 0/27 (0.0%) | 0/28 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Space Sprint | dragon | 60s | 48.0% | ⚠️ Zu wenig Mixing |

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

## Phase-3A — Naturalness-Metriken (Open Tracks)

Stabile Phase: 25%–95% der targetDuration. Jerk: |Δ(effSpeed)/DT| / max(baseSpeed, ε). naturalOvt: Anteil Überholungen mit tDiff ≤ 30% des Referenzabstands.

| Track | Racer | Dist | meanJerk | maxJerk | jerkHigh% | natOvt% | pulkTime% | pulkTrigIn | pulkTrigOut |
|-------|-------|------|----------|---------|-----------|---------|-----------|-----------|-------------|
| Space Sprint | dragon | 60s | 0.0000 | 0.0005 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |

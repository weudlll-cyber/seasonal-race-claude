# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-16  
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
| Mountainstreet | boarder | 60s | 3 | 33.3% | 37.0% | 43.0% | 20.0% | 8.5 | * (p<0.05) | ⚠️ Unequal |

---

## Detail-Auswertung pro Kombination

### Mountainstreet × boarder × 60s

- **finishT:** 0.5003 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 8.54 — * (p<0.05)

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 37 | 37.0% | 33.3% | +3.7% | 30.0 | 17.3 |
| Row 1 | 43 | 43.0% | 33.3% | +9.7% | 29.7 | 17.2 |
| Row 2 | 20 | 20.0% | 33.3% | -13.3% | 31.8 | 17.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(2) = 8.54 | * (p<0.05)


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 288 | 57.6% |
| B2 (Pl. 6–15) | 1000 | 421 | 42.1% |
| B3 (Pl. 16–25) | 1000 | 418 | 41.8% |
| B4 (Pl. 26–40) | 1500 | 748 | 49.9% |
| B5 (Pl. 41–60) | 2000 | 1311 | 65.5% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (20R) | Row 1 (20R) | Row 2 (20R) | Gesamt |
|---|---|---|---|---|
| 1 | 37 (37.0%) | 43 (43.0%) | 20 (20.0%) | 100 |
| 2 | 37 (37.0%) | 27 (27.0%) | 36 (36.0%) | 100 |
| 3 | 23 (23.0%) | 45 (45.0%) | 32 (32.0%) | 100 |
| 4 | 39 (39.0%) | 31 (31.0%) | 30 (30.0%) | 100 |
| 5 | 35 (35.0%) | 38 (38.0%) | 27 (27.0%) | 100 |
| 6–10 | 178 (35.6%) | 166 (33.2%) | 156 (31.2%) | 500 |
| 11–15 | 176 (35.2%) | 176 (35.2%) | 148 (29.6%) | 500 |
| 16–25 | 336 (33.6%) | 341 (34.1%) | 323 (32.3%) | 1000 |
| 26–40 | 500 (33.3%) | 512 (34.1%) | 488 (32.5%) | 1500 |
| 41–60 | 639 (31.9%) | 621 (31.1%) | 740 (37.0%) | 2000 |
| *(erw. je Pl.1)* | 33.3% | 33.3% | 33.3% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 98 (98.0%) | 0 (0.0%) | 1 (1.0%) | 0 (0.0%) | 1 (1.0%) | 100 |
| 2 | 86 (86.0%) | 10 (10.0%) | 1 (1.0%) | 0 (0.0%) | 3 (3.0%) | 100 |
| 3 | 50 (50.0%) | 43 (43.0%) | 1 (1.0%) | 3 (3.0%) | 3 (3.0%) | 100 |
| 4 | 40 (40.0%) | 50 (50.0%) | 2 (2.0%) | 6 (6.0%) | 2 (2.0%) | 100 |
| 5 | 14 (14.0%) | 72 (72.0%) | 0 (0.0%) | 9 (9.0%) | 5 (5.0%) | 100 |
| 6–10 | 58 (11.6%) | 296 (59.2%) | 37 (7.4%) | 56 (11.2%) | 53 (10.6%) | 500 |
| 11–15 | 32 (6.4%) | 125 (25.0%) | 184 (36.8%) | 75 (15.0%) | 84 (16.8%) | 500 |
| 16–25 | 34 (3.4%) | 114 (11.4%) | 418 (41.8%) | 236 (23.6%) | 198 (19.8%) | 1000 |
| 26–40 | 43 (2.9%) | 161 (10.7%) | 208 (13.9%) | 748 (49.9%) | 340 (22.7%) | 1500 |
| 41–60 | 45 (2.3%) | 129 (6.5%) | 148 (7.4%) | 367 (18.4%) | 1311 (65.5%) | 2000 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 288 | 57.6% |
| Pl. 6–10 | 58 | 11.6% |
| Pl. 11–15 | 32 | 6.4% |
| Pl. 16–25 | 34 | 6.8% |
| Pl. 26–40 | 43 | 8.6% |
| Pl. 41–60 ❌ schwerer Miss | 45 | 9.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 106/171 (62.0%) | 100/174 (57.5%) | 82/155 (52.9%) |
| Schwerer Miss (Pl. 41+) | 9 (5.3%) | 17 (9.8%) | 19 (12.3%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 1311 | 65.5% |
| Pl. 26–40 | 340 | 17.0% |
| Pl. 16–25 | 198 | 9.9% |
| Pl. 6–15 | 137 | 6.9% |
| Pl. 1–5 ❌ Brems-Leck | 14 | 0.7% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Top-5 trotz B5-Ziel | 7/668 (1.0%) | 3/633 (0.5%) | 4/699 (0.6%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Mountainstreet | boarder | 60s | 48.2% | ⚠️ Zu wenig Mixing |

---

## Gesamtauswertung

**Getestete Kombinationen:** 1  
**Davon statistisch fair (p≥0.05):** 0  
**Davon statistisch unfair (p<0.05):** 1  

**Kombinationen mit signifikantem Ungleichgewicht (p < 0.05):**

- **Mountainstreet × boarder × 60s:** Row 0 zu oft (37.0% statt erw. 33.3%) — * (p<0.05)

---

## Empfehlung

### Front-Row-Vorteil (Row 0 gewinnt zu oft)
Keine Kombination zeigt statistisch signifikanten Front-Row-Vorteil.

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
| Mountainstreet | boarder | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |

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
| Mountainstreet | boarder | 60s | 60 | 0.0% | 2.0% ⚠️ | +2.0% | 0.0 | 0.000057 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Mountainstreet | boarder | 60s | 60 | 12.6% | 57.6% | 45.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Mountainstreet | boarder | 60s | 15% | 62% | 171 | 15% | 57% | 174 | 7% | 53% | 155 |

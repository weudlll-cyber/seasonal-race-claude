# RaceArena — Fairness Simulation Report

**Datum:** 2026-07-06  
**Rennen pro Kombination:** 100  
**Teilnehmer pro Rennen:** 60  
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
| Seatrack | dolphin | 60s | 4 | 25.0% | 26.0% | 35.0% | 19.5% | 6.5 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Seatrack × dolphin × 60s

- **finishT:** 0.7354 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 6.48 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 26 | 26.0% | 25.0% | +1.0% | 31.4 | 17.5 |
| Row 1 | 35 | 35.0% | 25.0% | +10.0% | 30.0 | 17.5 |
| Row 2 | 19 | 19.0% | 25.0% | -6.0% | 30.7 | 17.0 |
| Row 3 | 20 | 20.0% | 25.0% | -5.0% | 29.9 | 17.2 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 6.48 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 411 | 82.2% |
| B2 (Pl. 6–15) | 1000 | 780 | 78.0% |
| B3 (Pl. 16–25) | 1000 | 702 | 70.2% |
| B4 (Pl. 26–40) | 1500 | 1077 | 71.8% |
| B5 (Pl. 41–60) | 2000 | 1744 | 87.2% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (15R) | Row 1 (15R) | Row 2 (15R) | Row 3 (15R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 26 (26.0%) | 35 (35.0%) | 19 (19.0%) | 20 (20.0%) | 100 |
| 2 | 32 (32.0%) | 27 (27.0%) | 18 (18.0%) | 23 (23.0%) | 100 |
| 3 | 21 (21.0%) | 28 (28.0%) | 23 (23.0%) | 28 (28.0%) | 100 |
| 4 | 28 (28.0%) | 28 (28.0%) | 18 (18.0%) | 26 (26.0%) | 100 |
| 5 | 23 (23.0%) | 25 (25.0%) | 26 (26.0%) | 26 (26.0%) | 100 |
| 6–10 | 115 (23.0%) | 121 (24.2%) | 138 (27.6%) | 126 (25.2%) | 500 |
| 11–15 | 108 (21.6%) | 146 (29.2%) | 115 (23.0%) | 131 (26.2%) | 500 |
| 16–25 | 239 (23.9%) | 240 (24.0%) | 250 (25.0%) | 271 (27.1%) | 1000 |
| 26–40 | 374 (24.9%) | 365 (24.3%) | 388 (25.9%) | 373 (24.9%) | 1500 |
| 41–60 | 534 (26.7%) | 485 (24.3%) | 505 (25.3%) | 476 (23.8%) | 2000 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 99 (99.0%) | 1 (1.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 90 (90.0%) | 10 (10.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 67 (67.0%) | 33 (33.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 55 (55.0%) | 45 (45.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 71 (14.2%) | 423 (84.6%) | 5 (1.0%) | 0 (0.0%) | 1 (0.2%) | 500 |
| 11–15 | 5 (1.0%) | 357 (71.4%) | 133 (26.6%) | 2 (0.4%) | 3 (0.6%) | 500 |
| 16–25 | 5 (0.5%) | 103 (10.3%) | 702 (70.2%) | 182 (18.2%) | 8 (0.8%) | 1000 |
| 26–40 | 7 (0.5%) | 18 (1.2%) | 154 (10.3%) | 1077 (71.8%) | 244 (16.3%) | 1500 |
| 41–60 | 1 (0.1%) | 10 (0.5%) | 6 (0.3%) | 239 (11.9%) | 1744 (87.2%) | 2000 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 411 | 82.2% |
| Pl. 6–10 | 71 | 14.2% |
| Pl. 11–15 | 5 | 1.0% |
| Pl. 16–25 | 5 | 1.0% |
| Pl. 26–40 | 7 | 1.4% |
| Pl. 41–60 ❌ schwerer Miss | 1 | 0.2% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 109/133 (82.0%) | 122/143 (85.3%) | 84/109 (77.1%) | 96/115 (83.5%) |
| Schwerer Miss (Pl. 41+) | 1 (0.8%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 1744 | 87.2% |
| Pl. 26–40 | 244 | 12.2% |
| Pl. 16–25 | 8 | 0.4% |
| Pl. 6–15 | 4 | 0.2% |
| Pl. 1–5 ❌ Brems-Leck | 0 | 0.0% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/516 (0.0%) | 0/490 (0.0%) | 0/510 (0.0%) | 0/484 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Seatrack | dolphin | 60s | 41.9% | ⚠️ Zu wenig Mixing |

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
| Seatrack | dolphin | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 99.7% | 0.00 | 1.00 |

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
| Seatrack | dolphin | 60s | 60 | 0.0% | 2.8% ⚠️ | +2.8% | 0.0 | 0.000026 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Seatrack | dolphin | 60s | 60 | 27.8% | 82.2% | 54.4% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Seatrack | dolphin | 60s | 27% | 82% | 133 | 26% | 85% | 143 | 28% | 77% | 109 | 30% | 83% | 115 |

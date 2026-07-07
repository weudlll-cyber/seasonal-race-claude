# RaceArena — Fairness Simulation Report

**Datum:** 2026-07-06  
**Rennen pro Kombination:** 30  
**Teilnehmer pro Rennen:** 60  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–30  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Seatrack | dolphin | 60s | 4 | 25.0% | 20.0% | 30.0% | 25.0% | 3.9 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Seatrack × dolphin × 60s

- **finishT:** 0.7354 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 3.87 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 20.0% | 25.0% | -5.0% | 30.8 | 17.3 |
| Row 1 | 9 | 30.0% | 25.0% | +5.0% | 30.1 | 18.1 |
| Row 2 | 4 | 13.3% | 25.0% | -11.7% | 31.2 | 16.6 |
| Row 3 | 11 | 36.7% | 25.0% | +11.7% | 29.9 | 17.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(3) = 3.87 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 150 | 120 | 80.0% |
| B2 (Pl. 6–15) | 300 | 228 | 76.0% |
| B3 (Pl. 16–25) | 300 | 205 | 68.3% |
| B4 (Pl. 26–40) | 450 | 316 | 70.2% |
| B5 (Pl. 41–60) | 600 | 521 | 86.8% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (15R) | Row 1 (15R) | Row 2 (15R) | Row 3 (15R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 6 (20.0%) | 9 (30.0%) | 4 (13.3%) | 11 (36.7%) | 30 |
| 2 | 8 (26.7%) | 5 (16.7%) | 7 (23.3%) | 10 (33.3%) | 30 |
| 3 | 7 (23.3%) | 10 (33.3%) | 3 (10.0%) | 10 (33.3%) | 30 |
| 4 | 8 (26.7%) | 12 (40.0%) | 6 (20.0%) | 4 (13.3%) | 30 |
| 5 | 8 (26.7%) | 12 (40.0%) | 5 (16.7%) | 5 (16.7%) | 30 |
| 6–10 | 37 (24.7%) | 39 (26.0%) | 37 (24.7%) | 37 (24.7%) | 150 |
| 11–15 | 34 (22.7%) | 42 (28.0%) | 41 (27.3%) | 33 (22.0%) | 150 |
| 16–25 | 75 (25.0%) | 66 (22.0%) | 68 (22.7%) | 91 (30.3%) | 300 |
| 26–40 | 112 (24.9%) | 96 (21.3%) | 136 (30.2%) | 106 (23.6%) | 450 |
| 41–60 | 155 (25.8%) | 159 (26.5%) | 143 (23.8%) | 143 (23.8%) | 600 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 30 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 2 | 29 (96.7%) | 1 (3.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 3 | 28 (93.3%) | 2 (6.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 4 | 21 (70.0%) | 9 (30.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 5 | 12 (40.0%) | 18 (60.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 6–10 | 29 (19.3%) | 119 (79.3%) | 2 (1.3%) | 0 (0.0%) | 0 (0.0%) | 150 |
| 11–15 | 1 (0.7%) | 109 (72.7%) | 39 (26.0%) | 1 (0.7%) | 0 (0.0%) | 150 |
| 16–25 | 0 (0.0%) | 41 (13.7%) | 205 (68.3%) | 54 (18.0%) | 0 (0.0%) | 300 |
| 26–40 | 0 (0.0%) | 1 (0.2%) | 54 (12.0%) | 316 (70.2%) | 79 (17.6%) | 450 |
| 41–60 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 79 (13.2%) | 521 (86.8%) | 600 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 120 | 80.0% |
| Pl. 6–10 | 29 | 19.3% |
| Pl. 11–15 | 1 | 0.7% |
| Pl. 16–25 | 0 | 0.0% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–60 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 28/32 (87.5%) | 37/43 (86.0%) | 19/30 (63.3%) | 36/45 (80.0%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 521 | 86.8% |
| Pl. 26–40 | 79 | 13.2% |
| Pl. 16–25 | 0 | 0.0% |
| Pl. 6–15 | 0 | 0.0% |
| Pl. 1–5 ❌ Brems-Leck | 0 | 0.0% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/152 (0.0%) | 0/155 (0.0%) | 0/152 (0.0%) | 0/141 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Seatrack | dolphin | 60s | 44.7% | ⚠️ Zu wenig Mixing |

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
| Seatrack | dolphin | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |

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
| Seatrack | dolphin | 60s | 60 | 0.0% | 2.0% ⚠️ | +2.0% | 0.0 | 0.000031 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Seatrack | dolphin | 60s | 60 | 28.0% | 80.0% | 52.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Seatrack | dolphin | 60s | 22% | 88% | 32 | 40% | 86% | 43 | 17% | 63% | 30 | 29% | 80% | 45 |

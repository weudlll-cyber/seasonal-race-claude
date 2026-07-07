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
| Mountainstreet | boarder | 60s | 3 | 33.3% | 36.7% | 16.7% | 46.7% | 4.2 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Mountainstreet × boarder × 60s

- **finishT:** 0.5003 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 4.20 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 11 | 36.7% | 33.3% | +3.3% | 31.1 | 17.5 |
| Row 1 | 5 | 16.7% | 33.3% | -16.7% | 29.9 | 16.8 |
| Row 2 | 14 | 46.7% | 33.3% | +13.3% | 30.4 | 17.6 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(2) = 4.20 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 150 | 113 | 75.3% |
| B2 (Pl. 6–15) | 300 | 227 | 75.7% |
| B3 (Pl. 16–25) | 300 | 211 | 70.3% |
| B4 (Pl. 26–40) | 450 | 335 | 74.4% |
| B5 (Pl. 41–60) | 600 | 531 | 88.5% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (20R) | Row 1 (20R) | Row 2 (20R) | Gesamt |
|---|---|---|---|---|
| 1 | 11 (36.7%) | 5 (16.7%) | 14 (46.7%) | 30 |
| 2 | 8 (26.7%) | 10 (33.3%) | 12 (40.0%) | 30 |
| 3 | 6 (20.0%) | 13 (43.3%) | 11 (36.7%) | 30 |
| 4 | 10 (33.3%) | 10 (33.3%) | 10 (33.3%) | 30 |
| 5 | 10 (33.3%) | 12 (40.0%) | 8 (26.7%) | 30 |
| 6–10 | 51 (34.0%) | 55 (36.7%) | 44 (29.3%) | 150 |
| 11–15 | 50 (33.3%) | 42 (28.0%) | 58 (38.7%) | 150 |
| 16–25 | 102 (34.0%) | 104 (34.7%) | 94 (31.3%) | 300 |
| 26–40 | 138 (30.7%) | 161 (35.8%) | 151 (33.6%) | 450 |
| 41–60 | 214 (35.7%) | 188 (31.3%) | 198 (33.0%) | 600 |
| *(erw. je Pl.1)* | 33.3% | 33.3% | 33.3% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 30 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 2 | 27 (90.0%) | 3 (10.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 3 | 25 (83.3%) | 5 (16.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 4 | 21 (70.0%) | 9 (30.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 5 | 10 (33.3%) | 20 (66.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 6–10 | 22 (14.7%) | 126 (84.0%) | 0 (0.0%) | 0 (0.0%) | 2 (1.3%) | 150 |
| 11–15 | 4 (2.7%) | 101 (67.3%) | 42 (28.0%) | 2 (1.3%) | 1 (0.7%) | 150 |
| 16–25 | 6 (2.0%) | 29 (9.7%) | 211 (70.3%) | 51 (17.0%) | 3 (1.0%) | 300 |
| 26–40 | 3 (0.7%) | 5 (1.1%) | 44 (9.8%) | 335 (74.4%) | 63 (14.0%) | 450 |
| 41–60 | 2 (0.3%) | 2 (0.3%) | 3 (0.5%) | 62 (10.3%) | 531 (88.5%) | 600 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 113 | 75.3% |
| Pl. 6–10 | 22 | 14.7% |
| Pl. 11–15 | 4 | 2.7% |
| Pl. 16–25 | 6 | 4.0% |
| Pl. 26–40 | 3 | 2.0% |
| Pl. 41–60 ❌ schwerer Miss | 2 | 1.3% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 37/47 (78.7%) | 33/46 (71.7%) | 43/57 (75.4%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 1 (2.2%) | 1 (1.8%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 531 | 88.5% |
| Pl. 26–40 | 63 | 10.5% |
| Pl. 16–25 | 3 | 0.5% |
| Pl. 6–15 | 3 | 0.5% |
| Pl. 1–5 ❌ Brems-Leck | 0 | 0.0% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/207 (0.0%) | 0/189 (0.0%) | 0/204 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Mountainstreet | boarder | 60s | 46.3% | ⚠️ Zu wenig Mixing |

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
| Mountainstreet | boarder | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 99.9% | 0.00 | 1.00 |

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
| Mountainstreet | boarder | 60s | 60 | 0.0% | 2.9% ⚠️ | +2.9% | 0.0 | 0.000027 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Mountainstreet | boarder | 60s | 60 | 25.3% | 75.3% | 50.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Mountainstreet | boarder | 60s | 30% | 79% | 47 | 13% | 72% | 46 | 32% | 75% | 57 |

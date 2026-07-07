# RaceArena — Fairness Simulation Report

**Datum:** 2026-07-06  
**Rennen pro Kombination:** 15  
**Teilnehmer pro Rennen:** 60  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–15  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Seatrack | dolphin | 60s | 4 | 25.0% | 6.7% | 26.7% | 33.3% | 7.7 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Seatrack × dolphin × 60s

- **finishT:** 0.7354 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 7.67 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 1 | 6.7% | 25.0% | -18.3% | 31.0 | 16.7 |
| Row 1 | 4 | 26.7% | 25.0% | +1.7% | 29.7 | 18.1 |
| Row 2 | 2 | 13.3% | 25.0% | -11.7% | 32.0 | 16.9 |
| Row 3 | 8 | 53.3% | 25.0% | +28.3% | 29.4 | 17.6 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(3) = 7.67 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 75 | 63 | 84.0% |
| B2 (Pl. 6–15) | 150 | 117 | 78.0% |
| B3 (Pl. 16–25) | 150 | 100 | 66.7% |
| B4 (Pl. 26–40) | 225 | 161 | 71.6% |
| B5 (Pl. 41–60) | 300 | 264 | 88.0% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (15R) | Row 1 (15R) | Row 2 (15R) | Row 3 (15R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 1 (6.7%) | 4 (26.7%) | 2 (13.3%) | 8 (53.3%) | 15 |
| 2 | 6 (40.0%) | 3 (20.0%) | 2 (13.3%) | 4 (26.7%) | 15 |
| 3 | 1 (6.7%) | 5 (33.3%) | 4 (26.7%) | 5 (33.3%) | 15 |
| 4 | 2 (13.3%) | 6 (40.0%) | 3 (20.0%) | 4 (26.7%) | 15 |
| 5 | 4 (26.7%) | 3 (20.0%) | 3 (20.0%) | 5 (33.3%) | 15 |
| 6–10 | 16 (21.3%) | 27 (36.0%) | 18 (24.0%) | 14 (18.7%) | 75 |
| 11–15 | 17 (22.7%) | 19 (25.3%) | 19 (25.3%) | 20 (26.7%) | 75 |
| 16–25 | 47 (31.3%) | 31 (20.7%) | 33 (22.0%) | 39 (26.0%) | 150 |
| 26–40 | 58 (25.8%) | 53 (23.6%) | 59 (26.2%) | 55 (24.4%) | 225 |
| 41–60 | 73 (24.3%) | 74 (24.7%) | 82 (27.3%) | 71 (23.7%) | 300 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 15 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 2 | 15 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 3 | 13 (86.7%) | 2 (13.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 4 | 11 (73.3%) | 4 (26.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 5 | 9 (60.0%) | 6 (40.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 15 |
| 6–10 | 9 (12.0%) | 66 (88.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 75 |
| 11–15 | 2 (2.7%) | 51 (68.0%) | 21 (28.0%) | 0 (0.0%) | 1 (1.3%) | 75 |
| 16–25 | 0 (0.0%) | 20 (13.3%) | 100 (66.7%) | 29 (19.3%) | 1 (0.7%) | 150 |
| 26–40 | 0 (0.0%) | 1 (0.4%) | 29 (12.9%) | 161 (71.6%) | 34 (15.1%) | 225 |
| 41–60 | 1 (0.3%) | 0 (0.0%) | 0 (0.0%) | 35 (11.7%) | 264 (88.0%) | 300 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 63 | 84.0% |
| Pl. 6–10 | 9 | 12.0% |
| Pl. 11–15 | 2 | 2.7% |
| Pl. 16–25 | 0 | 0.0% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–60 ❌ schwerer Miss | 1 | 1.3% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 11/14 (78.6%) | 17/20 (85.0%) | 13/17 (76.5%) | 22/24 (91.7%) |
| Schwerer Miss (Pl. 41+) | 1 (7.1%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 264 | 88.0% |
| Pl. 26–40 | 34 | 11.3% |
| Pl. 16–25 | 1 | 0.3% |
| Pl. 6–15 | 1 | 0.3% |
| Pl. 1–5 ❌ Brems-Leck | 0 | 0.0% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/68 (0.0%) | 0/77 (0.0%) | 0/83 (0.0%) | 0/72 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Seatrack | dolphin | 60s | 48.9% | ⚠️ Zu wenig Mixing |

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
| Seatrack | dolphin | 60s | 60 | 0.0% | 4.1% ⚠️ | +4.1% | 0.0 | 0.000018 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Seatrack | dolphin | 60s | 60 | 25.3% | 84.0% | 58.7% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Seatrack | dolphin | 60s | 7% | 79% | 14 | 40% | 85% | 20 | 12% | 76% | 17 | 33% | 92% | 24 |

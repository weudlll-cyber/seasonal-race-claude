# RaceArena — Fairness Simulation Report

**Datum:** 2026-07-05  
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
| Seatrack | dolphin | 60s | 4 | 25.0% | 33.3% | 26.7% | 20.0% | 2.5 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Seatrack × dolphin × 60s

- **finishT:** 0.7354 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 2.53 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 10 | 33.3% | 25.0% | +8.3% | 30.8 | 17.3 |
| Row 1 | 8 | 26.7% | 25.0% | +1.7% | 30.1 | 18.1 |
| Row 2 | 4 | 13.3% | 25.0% | -11.7% | 31.0 | 16.5 |
| Row 3 | 8 | 26.7% | 25.0% | +1.7% | 30.1 | 17.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(3) = 2.53 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 150 | 123 | 82.0% |
| B2 (Pl. 6–15) | 300 | 224 | 74.7% |
| B3 (Pl. 16–25) | 300 | 199 | 66.3% |
| B4 (Pl. 26–40) | 450 | 324 | 72.0% |
| B5 (Pl. 41–60) | 600 | 527 | 87.8% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (15R) | Row 1 (15R) | Row 2 (15R) | Row 3 (15R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 10 (33.3%) | 8 (26.7%) | 4 (13.3%) | 8 (26.7%) | 30 |
| 2 | 5 (16.7%) | 6 (20.0%) | 5 (16.7%) | 14 (46.7%) | 30 |
| 3 | 7 (23.3%) | 10 (33.3%) | 6 (20.0%) | 7 (23.3%) | 30 |
| 4 | 6 (20.0%) | 9 (30.0%) | 8 (26.7%) | 7 (23.3%) | 30 |
| 5 | 6 (20.0%) | 11 (36.7%) | 8 (26.7%) | 5 (16.7%) | 30 |
| 6–10 | 42 (28.0%) | 41 (27.3%) | 34 (22.7%) | 33 (22.0%) | 150 |
| 11–15 | 28 (18.7%) | 47 (31.3%) | 35 (23.3%) | 40 (26.7%) | 150 |
| 16–25 | 80 (26.7%) | 61 (20.3%) | 73 (24.3%) | 86 (28.7%) | 300 |
| 26–40 | 118 (26.2%) | 100 (22.2%) | 132 (29.3%) | 100 (22.2%) | 450 |
| 41–60 | 148 (24.7%) | 157 (26.2%) | 145 (24.2%) | 150 (25.0%) | 600 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 30 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 2 | 29 (96.7%) | 1 (3.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 3 | 26 (86.7%) | 4 (13.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 4 | 20 (66.7%) | 10 (33.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 5 | 18 (60.0%) | 12 (40.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 6–10 | 24 (16.0%) | 120 (80.0%) | 6 (4.0%) | 0 (0.0%) | 0 (0.0%) | 150 |
| 11–15 | 2 (1.3%) | 104 (69.3%) | 42 (28.0%) | 2 (1.3%) | 0 (0.0%) | 150 |
| 16–25 | 1 (0.3%) | 48 (16.0%) | 199 (66.3%) | 51 (17.0%) | 1 (0.3%) | 300 |
| 26–40 | 0 (0.0%) | 1 (0.2%) | 53 (11.8%) | 324 (72.0%) | 72 (16.0%) | 450 |
| 41–60 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 73 (12.2%) | 527 (87.8%) | 600 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 123 | 82.0% |
| Pl. 6–10 | 24 | 16.0% |
| Pl. 11–15 | 2 | 1.3% |
| Pl. 16–25 | 1 | 0.7% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–60 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 27/32 (84.4%) | 35/43 (81.4%) | 24/30 (80.0%) | 37/45 (82.2%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 527 | 87.8% |
| Pl. 26–40 | 72 | 12.0% |
| Pl. 16–25 | 1 | 0.2% |
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
| Seatrack | dolphin | 60s | 44.2% | ⚠️ Zu wenig Mixing |

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
| Seatrack | dolphin | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 99.9% | 0.00 | 1.00 |

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
| Seatrack | dolphin | 60s | 60 | 0.0% | 2.0% ⚠️ | +2.0% | 0.0 | 0.000030 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Seatrack | dolphin | 60s | 60 | 28.7% | 82.0% | 53.3% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Seatrack | dolphin | 60s | 31% | 84% | 32 | 33% | 81% | 43 | 20% | 80% | 30 | 29% | 82% | 45 |

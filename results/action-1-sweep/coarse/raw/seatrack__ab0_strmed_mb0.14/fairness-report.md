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
| Seatrack | dolphin | 60s | 4 | 25.0% | 23.3% | 23.3% | 26.7% | 6.8 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Seatrack × dolphin × 60s

- **finishT:** 0.7354 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 6.80 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 7 | 23.3% | 25.0% | -1.7% | 31.3 | 17.2 |
| Row 1 | 7 | 23.3% | 25.0% | -1.7% | 30.3 | 18.1 |
| Row 2 | 3 | 10.0% | 25.0% | -15.0% | 30.7 | 16.7 |
| Row 3 | 13 | 43.3% | 25.0% | +18.3% | 29.8 | 17.2 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(3) = 6.80 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 150 | 122 | 81.3% |
| B2 (Pl. 6–15) | 300 | 218 | 72.7% |
| B3 (Pl. 16–25) | 300 | 185 | 61.7% |
| B4 (Pl. 26–40) | 450 | 304 | 67.6% |
| B5 (Pl. 41–60) | 600 | 513 | 85.5% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (15R) | Row 1 (15R) | Row 2 (15R) | Row 3 (15R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 7 (23.3%) | 7 (23.3%) | 3 (10.0%) | 13 (43.3%) | 30 |
| 2 | 6 (20.0%) | 9 (30.0%) | 5 (16.7%) | 10 (33.3%) | 30 |
| 3 | 7 (23.3%) | 11 (36.7%) | 5 (16.7%) | 7 (23.3%) | 30 |
| 4 | 6 (20.0%) | 12 (40.0%) | 6 (20.0%) | 6 (20.0%) | 30 |
| 5 | 7 (23.3%) | 6 (20.0%) | 12 (40.0%) | 5 (16.7%) | 30 |
| 6–10 | 34 (22.7%) | 42 (28.0%) | 44 (29.3%) | 30 (20.0%) | 150 |
| 11–15 | 36 (24.0%) | 43 (28.7%) | 32 (21.3%) | 39 (26.0%) | 150 |
| 16–25 | 82 (27.3%) | 58 (19.3%) | 71 (23.7%) | 89 (29.7%) | 300 |
| 26–40 | 110 (24.4%) | 103 (22.9%) | 126 (28.0%) | 111 (24.7%) | 450 |
| 41–60 | 155 (25.8%) | 159 (26.5%) | 146 (24.3%) | 140 (23.3%) | 600 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 30 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 2 | 29 (96.7%) | 1 (3.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 3 | 25 (83.3%) | 5 (16.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 4 | 21 (70.0%) | 9 (30.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 5 | 17 (56.7%) | 13 (43.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 6–10 | 16 (10.7%) | 131 (87.3%) | 1 (0.7%) | 0 (0.0%) | 2 (1.3%) | 150 |
| 11–15 | 5 (3.3%) | 87 (58.0%) | 52 (34.7%) | 4 (2.7%) | 2 (1.3%) | 150 |
| 16–25 | 5 (1.7%) | 41 (13.7%) | 185 (61.7%) | 64 (21.3%) | 5 (1.7%) | 300 |
| 26–40 | 1 (0.2%) | 10 (2.2%) | 57 (12.7%) | 304 (67.6%) | 78 (17.3%) | 450 |
| 41–60 | 1 (0.2%) | 3 (0.5%) | 5 (0.8%) | 78 (13.0%) | 513 (85.5%) | 600 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 122 | 81.3% |
| Pl. 6–10 | 16 | 10.7% |
| Pl. 11–15 | 5 | 3.3% |
| Pl. 16–25 | 5 | 3.3% |
| Pl. 26–40 | 1 | 0.7% |
| Pl. 41–60 ❌ schwerer Miss | 1 | 0.7% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 27/32 (84.4%) | 36/43 (83.7%) | 23/30 (76.7%) | 36/45 (80.0%) |
| Schwerer Miss (Pl. 41+) | 1 (3.1%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 513 | 85.5% |
| Pl. 26–40 | 78 | 13.0% |
| Pl. 16–25 | 5 | 0.8% |
| Pl. 6–15 | 4 | 0.7% |
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
| Seatrack | dolphin | 60s | 40.7% | ⚠️ Zu wenig Mixing |

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
| Seatrack | dolphin | 60s | 60 | 0.0% | 2.9% ⚠️ | +2.9% | 0.0 | 0.000027 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Seatrack | dolphin | 60s | 60 | 28.0% | 81.3% | 53.3% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Seatrack | dolphin | 60s | 19% | 84% | 32 | 35% | 84% | 43 | 30% | 77% | 30 | 27% | 80% | 45 |

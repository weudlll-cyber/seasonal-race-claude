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
| Seatrack | dolphin | 60s | 4 | 25.0% | 20.0% | 26.7% | 26.7% | 4.7 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Seatrack × dolphin × 60s

- **finishT:** 0.7354 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 4.67 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 6 | 20.0% | 25.0% | -5.0% | 31.6 | 17.3 |
| Row 1 | 8 | 26.7% | 25.0% | +1.7% | 30.1 | 18.0 |
| Row 2 | 4 | 13.3% | 25.0% | -11.7% | 30.8 | 16.7 |
| Row 3 | 12 | 40.0% | 25.0% | +15.0% | 29.5 | 17.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(3) = 4.67 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 150 | 118 | 78.7% |
| B2 (Pl. 6–15) | 300 | 217 | 72.3% |
| B3 (Pl. 16–25) | 300 | 190 | 63.3% |
| B4 (Pl. 26–40) | 450 | 314 | 69.8% |
| B5 (Pl. 41–60) | 600 | 517 | 86.2% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (15R) | Row 1 (15R) | Row 2 (15R) | Row 3 (15R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 6 (20.0%) | 8 (26.7%) | 4 (13.3%) | 12 (40.0%) | 30 |
| 2 | 7 (23.3%) | 8 (26.7%) | 3 (10.0%) | 12 (40.0%) | 30 |
| 3 | 7 (23.3%) | 9 (30.0%) | 7 (23.3%) | 7 (23.3%) | 30 |
| 4 | 4 (13.3%) | 11 (36.7%) | 7 (23.3%) | 8 (26.7%) | 30 |
| 5 | 7 (23.3%) | 11 (36.7%) | 7 (23.3%) | 5 (16.7%) | 30 |
| 6–10 | 38 (25.3%) | 44 (29.3%) | 37 (24.7%) | 31 (20.7%) | 150 |
| 11–15 | 37 (24.7%) | 36 (24.0%) | 37 (24.7%) | 40 (26.7%) | 150 |
| 16–25 | 73 (24.3%) | 61 (20.3%) | 79 (26.3%) | 87 (29.0%) | 300 |
| 26–40 | 109 (24.2%) | 113 (25.1%) | 122 (27.1%) | 106 (23.6%) | 450 |
| 41–60 | 162 (27.0%) | 149 (24.8%) | 147 (24.5%) | 142 (23.7%) | 600 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 30 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 2 | 29 (96.7%) | 1 (3.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 3 | 26 (86.7%) | 4 (13.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 4 | 20 (66.7%) | 10 (33.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 30 |
| 5 | 13 (43.3%) | 16 (53.3%) | 0 (0.0%) | 0 (0.0%) | 1 (3.3%) | 30 |
| 6–10 | 23 (15.3%) | 123 (82.0%) | 3 (2.0%) | 0 (0.0%) | 1 (0.7%) | 150 |
| 11–15 | 3 (2.0%) | 94 (62.7%) | 48 (32.0%) | 3 (2.0%) | 2 (1.3%) | 150 |
| 16–25 | 2 (0.7%) | 41 (13.7%) | 190 (63.3%) | 61 (20.3%) | 6 (2.0%) | 300 |
| 26–40 | 2 (0.4%) | 8 (1.8%) | 53 (11.8%) | 314 (69.8%) | 73 (16.2%) | 450 |
| 41–60 | 2 (0.3%) | 3 (0.5%) | 6 (1.0%) | 72 (12.0%) | 517 (86.2%) | 600 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 118 | 78.7% |
| Pl. 6–10 | 23 | 15.3% |
| Pl. 11–15 | 3 | 2.0% |
| Pl. 16–25 | 2 | 1.3% |
| Pl. 26–40 | 2 | 1.3% |
| Pl. 41–60 ❌ schwerer Miss | 2 | 1.3% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 26/32 (81.3%) | 34/43 (79.1%) | 21/30 (70.0%) | 37/45 (82.2%) |
| Schwerer Miss (Pl. 41+) | 1 (3.1%) | 1 (2.3%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 517 | 86.2% |
| Pl. 26–40 | 73 | 12.2% |
| Pl. 16–25 | 6 | 1.0% |
| Pl. 6–15 | 3 | 0.5% |
| Pl. 1–5 ❌ Brems-Leck | 1 | 0.2% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/152 (0.0%) | 0/155 (0.0%) | 1/152 (0.7%) | 0/141 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Seatrack | dolphin | 60s | 38.4% | ⚠️ Zu wenig Mixing |

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
| Seatrack | dolphin | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 99.8% | 0.00 | 1.00 |

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
| Seatrack | dolphin | 60s | 60 | 0.0% | 2.9% ⚠️ | +2.9% | 0.0 | 0.000026 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Seatrack | dolphin | 60s | 60 | 26.7% | 78.7% | 52.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Seatrack | dolphin | 60s | 25% | 81% | 32 | 37% | 79% | 43 | 13% | 70% | 30 | 27% | 82% | 45 |

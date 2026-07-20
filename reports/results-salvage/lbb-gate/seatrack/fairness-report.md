# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-16  
**Rennen pro Kombination:** 300  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–300  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Seatrack | dolphin | 60s | 4 | 25.0% | 27.0% | 23.7% | 24.7% | 0.8 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Seatrack × dolphin × 60s

- **finishT:** 0.7354 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 0.83 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 81 | 27.0% | 25.0% | +2.0% | 30.6 | 17.4 |
| Row 1 | 71 | 23.7% | 25.0% | -1.3% | 30.4 | 17.4 |
| Row 2 | 76 | 25.3% | 25.0% | +0.3% | 30.7 | 17.2 |
| Row 3 | 72 | 24.0% | 25.0% | -1.0% | 30.3 | 17.2 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 0.83 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 1500 | 1121 | 74.7% |
| B2 (Pl. 6–15) | 3000 | 2196 | 73.2% |
| B3 (Pl. 16–25) | 3000 | 2030 | 67.7% |
| B4 (Pl. 26–40) | 4500 | 3198 | 71.1% |
| B5 (Pl. 41–60) | 6000 | 5203 | 86.7% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (15R) | Row 1 (15R) | Row 2 (15R) | Row 3 (15R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 81 (27.0%) | 71 (23.7%) | 76 (25.3%) | 72 (24.0%) | 300 |
| 2 | 80 (26.7%) | 69 (23.0%) | 67 (22.3%) | 84 (28.0%) | 300 |
| 3 | 69 (23.0%) | 88 (29.3%) | 66 (22.0%) | 77 (25.7%) | 300 |
| 4 | 87 (29.0%) | 76 (25.3%) | 64 (21.3%) | 73 (24.3%) | 300 |
| 5 | 73 (24.3%) | 84 (28.0%) | 75 (25.0%) | 68 (22.7%) | 300 |
| 6–10 | 354 (23.6%) | 373 (24.9%) | 379 (25.3%) | 394 (26.3%) | 1500 |
| 11–15 | 372 (24.8%) | 405 (27.0%) | 355 (23.7%) | 368 (24.5%) | 1500 |
| 16–25 | 771 (25.7%) | 725 (24.2%) | 768 (25.6%) | 736 (24.5%) | 3000 |
| 26–40 | 1093 (24.3%) | 1091 (24.2%) | 1154 (25.6%) | 1162 (25.8%) | 4500 |
| 41–60 | 1520 (25.3%) | 1518 (25.3%) | 1496 (24.9%) | 1466 (24.4%) | 6000 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 300 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 2 | 286 (95.3%) | 14 (4.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 3 | 250 (83.3%) | 50 (16.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 4 | 179 (59.7%) | 121 (40.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 5 | 106 (35.3%) | 193 (64.3%) | 0 (0.0%) | 1 (0.3%) | 0 (0.0%) | 300 |
| 6–10 | 237 (15.8%) | 1236 (82.4%) | 15 (1.0%) | 6 (0.4%) | 6 (0.4%) | 1500 |
| 11–15 | 67 (4.5%) | 960 (64.0%) | 447 (29.8%) | 12 (0.8%) | 14 (0.9%) | 1500 |
| 16–25 | 48 (1.6%) | 334 (11.1%) | 2030 (67.7%) | 534 (17.8%) | 54 (1.8%) | 3000 |
| 26–40 | 23 (0.5%) | 71 (1.6%) | 485 (10.8%) | 3198 (71.1%) | 723 (16.1%) | 4500 |
| 41–60 | 4 (0.1%) | 21 (0.4%) | 23 (0.4%) | 749 (12.5%) | 5203 (86.7%) | 6000 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 1121 | 74.7% |
| Pl. 6–10 | 237 | 15.8% |
| Pl. 11–15 | 67 | 4.5% |
| Pl. 16–25 | 48 | 3.2% |
| Pl. 26–40 | 23 | 1.5% |
| Pl. 41–60 ❌ schwerer Miss | 4 | 0.3% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 306/406 (75.4%) | 292/384 (76.0%) | 264/357 (73.9%) | 259/353 (73.4%) |
| Schwerer Miss (Pl. 41+) | 1 (0.2%) | 1 (0.3%) | 1 (0.3%) | 1 (0.3%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 5203 | 86.7% |
| Pl. 26–40 | 723 | 12.0% |
| Pl. 16–25 | 54 | 0.9% |
| Pl. 6–15 | 20 | 0.3% |
| Pl. 1–5 ❌ Brems-Leck | 0 | 0.0% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/1452 (0.0%) | 0/1499 (0.0%) | 0/1518 (0.0%) | 0/1531 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Seatrack | dolphin | 60s | 38.8% | ⚠️ Zu wenig Mixing |

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
| Seatrack | dolphin | 60s | 60 | 0.0% | 2.4% ⚠️ | +2.4% | 0.0 | 0.000048 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Seatrack | dolphin | 60s | 60 | 17.7% | 74.7% | 57.1% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Seatrack | dolphin | 60s | 16% | 75% | 406 | 16% | 76% | 384 | 20% | 74% | 357 | 18% | 73% | 353 |

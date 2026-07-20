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
| Space Sprint | rocket | 60s | 4 | 25.0% | 31.0% | 23.0% | 23.0% | 5.8 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Space Sprint × rocket × 60s

- **finishT:** 0.4955 (Ziellinie in t-Raum)
- **Reihen:** 4 (gewichtete Erwartung nach Reihengröße)
- **Chi²(3):** 5.79 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 93 | 31.0% | 25.0% | +6.0% | 30.3 | 17.6 |
| Row 1 | 69 | 23.0% | 25.0% | -2.0% | 30.4 | 17.2 |
| Row 2 | 68 | 22.7% | 25.0% | -2.3% | 30.2 | 17.2 |
| Row 3 | 70 | 23.3% | 25.0% | -1.7% | 31.1 | 17.2 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(3) = 5.79 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 1500 | 1085 | 72.3% |
| B2 (Pl. 6–15) | 3000 | 2040 | 68.0% |
| B3 (Pl. 16–25) | 3000 | 1820 | 60.7% |
| B4 (Pl. 26–40) | 4500 | 3060 | 68.0% |
| B5 (Pl. 41–60) | 6000 | 5125 | 85.4% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (15R) | Row 1 (15R) | Row 2 (15R) | Row 3 (15R) | Gesamt |
|---|---|---|---|---|---|
| 1 | 93 (31.0%) | 69 (23.0%) | 68 (22.7%) | 70 (23.3%) | 300 |
| 2 | 89 (29.7%) | 73 (24.3%) | 65 (21.7%) | 73 (24.3%) | 300 |
| 3 | 81 (27.0%) | 78 (26.0%) | 64 (21.3%) | 77 (25.7%) | 300 |
| 4 | 75 (25.0%) | 75 (25.0%) | 80 (26.7%) | 70 (23.3%) | 300 |
| 5 | 70 (23.3%) | 65 (21.7%) | 92 (30.7%) | 73 (24.3%) | 300 |
| 6–10 | 378 (25.2%) | 361 (24.1%) | 388 (25.9%) | 373 (24.9%) | 1500 |
| 11–15 | 362 (24.1%) | 382 (25.5%) | 403 (26.9%) | 353 (23.5%) | 1500 |
| 16–25 | 771 (25.7%) | 807 (26.9%) | 727 (24.2%) | 695 (23.2%) | 3000 |
| 26–40 | 1098 (24.4%) | 1093 (24.3%) | 1139 (25.3%) | 1170 (26.0%) | 4500 |
| 41–60 | 1483 (24.7%) | 1497 (24.9%) | 1474 (24.6%) | 1546 (25.8%) | 6000 |
| *(erw. je Pl.1)* | 25.0% | 25.0% | 25.0% | 25.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 299 (99.7%) | 1 (0.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 2 | 281 (93.7%) | 19 (6.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 3 | 236 (78.7%) | 63 (21.0%) | 1 (0.3%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 4 | 174 (58.0%) | 125 (41.7%) | 0 (0.0%) | 0 (0.0%) | 1 (0.3%) | 300 |
| 5 | 95 (31.7%) | 202 (67.3%) | 1 (0.3%) | 1 (0.3%) | 1 (0.3%) | 300 |
| 6–10 | 191 (12.7%) | 1231 (82.1%) | 46 (3.1%) | 15 (1.0%) | 17 (1.1%) | 1500 |
| 11–15 | 83 (5.5%) | 809 (53.9%) | 502 (33.5%) | 51 (3.4%) | 55 (3.7%) | 1500 |
| 16–25 | 70 (2.3%) | 348 (11.6%) | 1820 (60.7%) | 641 (21.4%) | 121 (4.0%) | 3000 |
| 26–40 | 50 (1.1%) | 143 (3.2%) | 567 (12.6%) | 3060 (68.0%) | 680 (15.1%) | 4500 |
| 41–60 | 21 (0.4%) | 59 (1.0%) | 63 (1.1%) | 732 (12.2%) | 5125 (85.4%) | 6000 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 1085 | 72.3% |
| Pl. 6–10 | 191 | 12.7% |
| Pl. 11–15 | 83 | 5.5% |
| Pl. 16–25 | 70 | 4.7% |
| Pl. 26–40 | 50 | 3.3% |
| Pl. 41–60 ❌ schwerer Miss | 21 | 1.4% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Treffer (Pl. 1–5) | 319/412 (77.4%) | 257/341 (75.4%) | 249/357 (69.7%) | 260/390 (66.7%) |
| Schwerer Miss (Pl. 41+) | 4 (1.0%) | 4 (1.2%) | 6 (1.7%) | 7 (1.8%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 5125 | 85.4% |
| Pl. 26–40 | 680 | 11.3% |
| Pl. 16–25 | 121 | 2.0% |
| Pl. 6–15 | 72 | 1.2% |
| Pl. 1–5 ❌ Brems-Leck | 2 | 0.0% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 |
|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/1515 (0.0%) | 0/1517 (0.0%) | 2/1452 (0.1%) | 0/1516 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Space Sprint | rocket | 60s | 39.7% | ⚠️ Zu wenig Mixing |

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
| Space Sprint | rocket | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 99.6% | 0.00 | 1.00 |

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
| Space Sprint | rocket | 60s | 60 | 0.0% | 1.5% ⚠️ | +1.5% | 0.0 | 0.000033 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Space Sprint | rocket | 60s | 60 | 18.7% | 72.3% | 53.6% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n |
|-------|-------|------|---|---|------|---|------|---|------|---|---|
| Space Sprint | rocket | 60s | 23% | 77% | 412 | 15% | 75% | 341 | 19% | 70% | 357 | 17% | 67% | 390 |

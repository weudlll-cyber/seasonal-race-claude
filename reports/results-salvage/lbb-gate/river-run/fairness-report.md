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
| River Run | duck | 60s | 3 | 33.3% | 34.7% | 34.0% | 31.3% | 0.6 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### River Run × duck × 60s

- **finishT:** 0.5101 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 0.56 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 104 | 34.7% | 33.3% | +1.3% | 30.4 | 17.3 |
| Row 1 | 102 | 34.0% | 33.3% | +0.7% | 30.2 | 17.4 |
| Row 2 | 94 | 31.3% | 33.3% | -2.0% | 30.9 | 17.2 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(2) = 0.56 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 1500 | 1129 | 75.3% |
| B2 (Pl. 6–15) | 3000 | 2231 | 74.4% |
| B3 (Pl. 16–25) | 3000 | 2069 | 69.0% |
| B4 (Pl. 26–40) | 4500 | 3253 | 72.3% |
| B5 (Pl. 41–60) | 6000 | 5262 | 87.7% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (20R) | Row 1 (20R) | Row 2 (20R) | Gesamt |
|---|---|---|---|---|
| 1 | 104 (34.7%) | 102 (34.0%) | 94 (31.3%) | 300 |
| 2 | 93 (31.0%) | 113 (37.7%) | 94 (31.3%) | 300 |
| 3 | 94 (31.3%) | 103 (34.3%) | 103 (34.3%) | 300 |
| 4 | 103 (34.3%) | 97 (32.3%) | 100 (33.3%) | 300 |
| 5 | 101 (33.7%) | 104 (34.7%) | 95 (31.7%) | 300 |
| 6–10 | 495 (33.0%) | 528 (35.2%) | 477 (31.8%) | 1500 |
| 11–15 | 521 (34.7%) | 485 (32.3%) | 494 (32.9%) | 1500 |
| 16–25 | 1040 (34.7%) | 991 (33.0%) | 969 (32.3%) | 3000 |
| 26–40 | 1456 (32.4%) | 1519 (33.8%) | 1525 (33.9%) | 4500 |
| 41–60 | 1993 (33.2%) | 1958 (32.6%) | 2049 (34.2%) | 6000 |
| *(erw. je Pl.1)* | 33.3% | 33.3% | 33.3% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 296 (98.7%) | 4 (1.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 2 | 289 (96.3%) | 10 (3.3%) | 0 (0.0%) | 1 (0.3%) | 0 (0.0%) | 300 |
| 3 | 249 (83.0%) | 51 (17.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 4 | 172 (57.3%) | 128 (42.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 5 | 123 (41.0%) | 177 (59.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 6–10 | 246 (16.4%) | 1238 (82.5%) | 9 (0.6%) | 4 (0.3%) | 3 (0.2%) | 1500 |
| 11–15 | 68 (4.5%) | 993 (66.2%) | 401 (26.7%) | 12 (0.8%) | 26 (1.7%) | 1500 |
| 16–25 | 34 (1.1%) | 333 (11.1%) | 2069 (69.0%) | 523 (17.4%) | 41 (1.4%) | 3000 |
| 26–40 | 18 (0.4%) | 54 (1.2%) | 507 (11.3%) | 3253 (72.3%) | 668 (14.8%) | 4500 |
| 41–60 | 5 (0.1%) | 12 (0.2%) | 14 (0.2%) | 707 (11.8%) | 5262 (87.7%) | 6000 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 1129 | 75.3% |
| Pl. 6–10 | 246 | 16.4% |
| Pl. 11–15 | 68 | 4.5% |
| Pl. 16–25 | 34 | 2.3% |
| Pl. 26–40 | 18 | 1.2% |
| Pl. 41–60 ❌ schwerer Miss | 5 | 0.3% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 370/497 (74.4%) | 398/547 (72.8%) | 361/456 (79.2%) |
| Schwerer Miss (Pl. 41+) | 3 (0.6%) | 1 (0.2%) | 1 (0.2%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 5262 | 87.7% |
| Pl. 26–40 | 668 | 11.1% |
| Pl. 16–25 | 41 | 0.7% |
| Pl. 6–15 | 29 | 0.5% |
| Pl. 1–5 ❌ Brems-Leck | 0 | 0.0% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/1943 (0.0%) | 0/1981 (0.0%) | 0/2076 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| River Run | duck | 60s | 38.8% | ⚠️ Zu wenig Mixing |

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
| River Run | duck | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 99.9% | 0.00 | 1.00 |

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
| River Run | duck | 60s | 60 | 0.0% | 3.4% ⚠️ | +3.4% | 0.0 | 0.000089 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| River Run | duck | 60s | 60 | 17.4% | 75.3% | 57.9% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| River Run | duck | 60s | 17% | 74% | 497 | 18% | 73% | 547 | 18% | 79% | 456 |

# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-17  
**Rennen pro Kombination:** 40  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–40  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Mountainstreet | boarder | 60s | 3 | 33.3% | 40.0% | 17.5% | 42.5% | 4.5 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Mountainstreet × boarder × 60s

- **finishT:** 0.5003 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 4.55 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 16 | 40.0% | 33.3% | +6.7% | 30.5 | 17.7 |
| Row 1 | 7 | 17.5% | 33.3% | -15.8% | 30.4 | 16.9 |
| Row 2 | 17 | 42.5% | 33.3% | +9.2% | 30.6 | 17.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(2) = 4.55 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 200 | 145 | 72.5% |
| B2 (Pl. 6–15) | 400 | 273 | 68.3% |
| B3 (Pl. 16–25) | 400 | 251 | 62.7% |
| B4 (Pl. 26–40) | 600 | 401 | 66.8% |
| B5 (Pl. 41–60) | 800 | 668 | 83.5% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (20R) | Row 1 (20R) | Row 2 (20R) | Gesamt |
|---|---|---|---|---|
| 1 | 16 (40.0%) | 7 (17.5%) | 17 (42.5%) | 40 |
| 2 | 16 (40.0%) | 10 (25.0%) | 14 (35.0%) | 40 |
| 3 | 5 (12.5%) | 21 (52.5%) | 14 (35.0%) | 40 |
| 4 | 14 (35.0%) | 15 (37.5%) | 11 (27.5%) | 40 |
| 5 | 11 (27.5%) | 15 (37.5%) | 14 (35.0%) | 40 |
| 6–10 | 78 (39.0%) | 60 (30.0%) | 62 (31.0%) | 200 |
| 11–15 | 65 (32.5%) | 59 (29.5%) | 76 (38.0%) | 200 |
| 16–25 | 130 (32.5%) | 146 (36.5%) | 124 (31.0%) | 400 |
| 26–40 | 195 (32.5%) | 201 (33.5%) | 204 (34.0%) | 600 |
| 41–60 | 270 (33.8%) | 266 (33.3%) | 264 (33.0%) | 800 |
| *(erw. je Pl.1)* | 33.3% | 33.3% | 33.3% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 40 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 2 | 38 (95.0%) | 2 (5.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 3 | 33 (82.5%) | 7 (17.5%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 4 | 19 (47.5%) | 20 (50.0%) | 1 (2.5%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 5 | 15 (37.5%) | 24 (60.0%) | 0 (0.0%) | 0 (0.0%) | 1 (2.5%) | 40 |
| 6–10 | 30 (15.0%) | 166 (83.0%) | 0 (0.0%) | 2 (1.0%) | 2 (1.0%) | 200 |
| 11–15 | 10 (5.0%) | 107 (53.5%) | 66 (33.0%) | 11 (5.5%) | 6 (3.0%) | 200 |
| 16–25 | 9 (2.3%) | 42 (10.5%) | 251 (62.7%) | 81 (20.3%) | 17 (4.3%) | 400 |
| 26–40 | 5 (0.8%) | 23 (3.8%) | 65 (10.8%) | 401 (66.8%) | 106 (17.7%) | 600 |
| 41–60 | 1 (0.1%) | 9 (1.1%) | 17 (2.1%) | 105 (13.1%) | 668 (83.5%) | 800 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 145 | 72.5% |
| Pl. 6–10 | 30 | 15.0% |
| Pl. 11–15 | 10 | 5.0% |
| Pl. 16–25 | 9 | 4.5% |
| Pl. 26–40 | 5 | 2.5% |
| Pl. 41–60 ❌ schwerer Miss | 1 | 0.5% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 50/69 (72.5%) | 44/61 (72.1%) | 51/70 (72.9%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 1 (1.4%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 668 | 83.5% |
| Pl. 26–40 | 106 | 13.3% |
| Pl. 16–25 | 17 | 2.1% |
| Pl. 6–15 | 8 | 1.0% |
| Pl. 1–5 ❌ Brems-Leck | 1 | 0.1% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/273 (0.0%) | 1/255 (0.4%) | 0/272 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Mountainstreet | boarder | 60s | 46.8% | ⚠️ Zu wenig Mixing |

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
| Mountainstreet | boarder | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |

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
| Mountainstreet | boarder | 60s | 60 | 0.0% | 2.1% ⚠️ | +2.1% | 0.0 | 0.000056 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Mountainstreet | boarder | 60s | 60 | 17.5% | 72.5% | 55.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Mountainstreet | boarder | 60s | 19% | 72% | 69 | 16% | 72% | 61 | 17% | 73% | 70 |

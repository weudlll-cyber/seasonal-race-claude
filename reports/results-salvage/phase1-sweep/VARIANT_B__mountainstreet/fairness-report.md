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
| Row 0 | 16 | 40.0% | 33.3% | +6.7% | 30.7 | 17.6 |
| Row 1 | 7 | 17.5% | 33.3% | -15.8% | 30.2 | 17.0 |
| Row 2 | 17 | 42.5% | 33.3% | +9.2% | 30.6 | 17.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(2) = 4.55 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 200 | 140 | 70.0% |
| B2 (Pl. 6–15) | 400 | 267 | 66.8% |
| B3 (Pl. 16–25) | 400 | 250 | 62.5% |
| B4 (Pl. 26–40) | 600 | 408 | 68.0% |
| B5 (Pl. 41–60) | 800 | 670 | 83.8% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (20R) | Row 1 (20R) | Row 2 (20R) | Gesamt |
|---|---|---|---|---|
| 1 | 16 (40.0%) | 7 (17.5%) | 17 (42.5%) | 40 |
| 2 | 15 (37.5%) | 12 (30.0%) | 13 (32.5%) | 40 |
| 3 | 7 (17.5%) | 21 (52.5%) | 12 (30.0%) | 40 |
| 4 | 10 (25.0%) | 18 (45.0%) | 12 (30.0%) | 40 |
| 5 | 15 (37.5%) | 14 (35.0%) | 11 (27.5%) | 40 |
| 6–10 | 77 (38.5%) | 56 (28.0%) | 67 (33.5%) | 200 |
| 11–15 | 63 (31.5%) | 63 (31.5%) | 74 (37.0%) | 200 |
| 16–25 | 129 (32.3%) | 144 (36.0%) | 127 (31.8%) | 400 |
| 26–40 | 197 (32.8%) | 194 (32.3%) | 209 (34.8%) | 600 |
| 41–60 | 271 (33.9%) | 271 (33.9%) | 258 (32.3%) | 800 |
| *(erw. je Pl.1)* | 33.3% | 33.3% | 33.3% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 40 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 2 | 38 (95.0%) | 2 (5.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 3 | 30 (75.0%) | 10 (25.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 40 |
| 4 | 20 (50.0%) | 19 (47.5%) | 0 (0.0%) | 1 (2.5%) | 0 (0.0%) | 40 |
| 5 | 12 (30.0%) | 26 (65.0%) | 1 (2.5%) | 0 (0.0%) | 1 (2.5%) | 40 |
| 6–10 | 30 (15.0%) | 166 (83.0%) | 1 (0.5%) | 0 (0.0%) | 3 (1.5%) | 200 |
| 11–15 | 12 (6.0%) | 101 (50.5%) | 66 (33.0%) | 13 (6.5%) | 8 (4.0%) | 200 |
| 16–25 | 12 (3.0%) | 41 (10.3%) | 250 (62.5%) | 78 (19.5%) | 19 (4.8%) | 400 |
| 26–40 | 5 (0.8%) | 25 (4.2%) | 63 (10.5%) | 408 (68.0%) | 99 (16.5%) | 600 |
| 41–60 | 1 (0.1%) | 10 (1.3%) | 19 (2.4%) | 100 (12.5%) | 670 (83.8%) | 800 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 140 | 70.0% |
| Pl. 6–10 | 30 | 15.0% |
| Pl. 11–15 | 12 | 6.0% |
| Pl. 16–25 | 12 | 6.0% |
| Pl. 26–40 | 5 | 2.5% |
| Pl. 41–60 ❌ schwerer Miss | 1 | 0.5% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 48/69 (69.6%) | 43/61 (70.5%) | 49/70 (70.0%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 1 (1.4%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 670 | 83.8% |
| Pl. 26–40 | 99 | 12.4% |
| Pl. 16–25 | 19 | 2.4% |
| Pl. 6–15 | 11 | 1.4% |
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
| Mountainstreet | boarder | 60s | 60 | 14.0% | 70.0% | 56.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Mountainstreet | boarder | 60s | 14% | 70% | 69 | 15% | 70% | 61 | 13% | 70% | 70 |

# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-18  
**Rennen pro Kombination:** 100  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–100  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Mountainstreet | boarder | 60s | 3 | 33.3% | 33.0% | 37.0% | 30.0% | 0.7 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Mountainstreet × boarder × 60s

- **finishT:** 0.5003 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 0.74 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 33 | 33.0% | 33.3% | -0.3% | 30.7 | 17.3 |
| Row 1 | 37 | 37.0% | 33.3% | +3.7% | 29.8 | 17.2 |
| Row 2 | 30 | 30.0% | 33.3% | -3.3% | 31.0 | 17.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(2) = 0.74 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 357 | 71.4% |
| B2 (Pl. 6–15) | 1000 | 671 | 67.1% |
| B3 (Pl. 16–25) | 1000 | 606 | 60.6% |
| B4 (Pl. 26–40) | 1500 | 988 | 65.9% |
| B5 (Pl. 41–60) | 2000 | 1666 | 83.3% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (20R) | Row 1 (20R) | Row 2 (20R) | Gesamt |
|---|---|---|---|---|
| 1 | 33 (33.0%) | 37 (37.0%) | 30 (30.0%) | 100 |
| 2 | 38 (38.0%) | 24 (24.0%) | 38 (38.0%) | 100 |
| 3 | 31 (31.0%) | 38 (38.0%) | 31 (31.0%) | 100 |
| 4 | 30 (30.0%) | 43 (43.0%) | 27 (27.0%) | 100 |
| 5 | 30 (30.0%) | 32 (32.0%) | 38 (38.0%) | 100 |
| 6–10 | 166 (33.2%) | 173 (34.6%) | 161 (32.2%) | 500 |
| 11–15 | 163 (32.6%) | 178 (35.6%) | 159 (31.8%) | 500 |
| 16–25 | 335 (33.5%) | 339 (33.9%) | 326 (32.6%) | 1000 |
| 26–40 | 512 (34.1%) | 494 (32.9%) | 494 (32.9%) | 1500 |
| 41–60 | 662 (33.1%) | 642 (32.1%) | 696 (34.8%) | 2000 |
| *(erw. je Pl.1)* | 33.3% | 33.3% | 33.3% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 90 (90.0%) | 10 (10.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 81 (81.0%) | 18 (18.0%) | 0 (0.0%) | 0 (0.0%) | 1 (1.0%) | 100 |
| 4 | 58 (58.0%) | 42 (42.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 28 (28.0%) | 71 (71.0%) | 0 (0.0%) | 0 (0.0%) | 1 (1.0%) | 100 |
| 6–10 | 62 (12.4%) | 423 (84.6%) | 4 (0.8%) | 8 (1.6%) | 3 (0.6%) | 500 |
| 11–15 | 26 (5.2%) | 248 (49.6%) | 187 (37.4%) | 17 (3.4%) | 22 (4.4%) | 500 |
| 16–25 | 21 (2.1%) | 101 (10.1%) | 606 (60.6%) | 220 (22.0%) | 52 (5.2%) | 1000 |
| 26–40 | 21 (1.4%) | 71 (4.7%) | 165 (11.0%) | 988 (65.9%) | 255 (17.0%) | 1500 |
| 41–60 | 13 (0.7%) | 16 (0.8%) | 38 (1.9%) | 267 (13.4%) | 1666 (83.3%) | 2000 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 357 | 71.4% |
| Pl. 6–10 | 62 | 12.4% |
| Pl. 11–15 | 26 | 5.2% |
| Pl. 16–25 | 21 | 4.2% |
| Pl. 26–40 | 21 | 4.2% |
| Pl. 41–60 ❌ schwerer Miss | 13 | 2.6% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 126/171 (73.7%) | 120/174 (69.0%) | 111/155 (71.6%) |
| Schwerer Miss (Pl. 41+) | 2 (1.2%) | 7 (4.0%) | 4 (2.6%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 1666 | 83.3% |
| Pl. 26–40 | 255 | 12.8% |
| Pl. 16–25 | 52 | 2.6% |
| Pl. 6–15 | 25 | 1.3% |
| Pl. 1–5 ❌ Brems-Leck | 2 | 0.1% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/668 (0.0%) | 2/633 (0.3%) | 0/699 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Mountainstreet | boarder | 60s | 48.2% | ⚠️ Zu wenig Mixing |

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
| Mountainstreet | boarder | 60s | 60 | 0.0% | 2.2% ⚠️ | +2.2% | 0.0 | 0.000056 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Mountainstreet | boarder | 60s | 60 | 17.6% | 71.4% | 53.8% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Mountainstreet | boarder | 60s | 18% | 74% | 171 | 18% | 69% | 174 | 17% | 72% | 155 |

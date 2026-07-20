# RaceArena — Fairness Simulation Report

**world:** ASSUMED-DEFAULTS (schema v2) — ⚠️ PROVISIONAL (ASSUMED-DEFAULTS, no --config; may not describe the owner's race)  
**Datum:** 2026-07-17  
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
| Mountainstreet | boarder | 60s | 3 | 33.3% | 36.0% | 37.0% | 27.0% | 1.8 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Mountainstreet × boarder × 60s

- **finishT:** 0.5003 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 1.82 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 36 | 36.0% | 33.3% | +2.7% | 30.7 | 17.3 |
| Row 1 | 37 | 37.0% | 33.3% | +3.7% | 29.8 | 17.2 |
| Row 2 | 27 | 27.0% | 33.3% | -6.3% | 31.0 | 17.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(2) = 1.82 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 353 | 70.6% |
| B2 (Pl. 6–15) | 1000 | 630 | 63.0% |
| B3 (Pl. 16–25) | 1000 | 486 | 48.6% |
| B4 (Pl. 26–40) | 1500 | 854 | 56.9% |
| B5 (Pl. 41–60) | 2000 | 1608 | 80.4% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (20R) | Row 1 (20R) | Row 2 (20R) | Gesamt |
|---|---|---|---|---|
| 1 | 36 (36.0%) | 37 (37.0%) | 27 (27.0%) | 100 |
| 2 | 34 (34.0%) | 29 (29.0%) | 37 (37.0%) | 100 |
| 3 | 31 (31.0%) | 38 (38.0%) | 31 (31.0%) | 100 |
| 4 | 32 (32.0%) | 36 (36.0%) | 32 (32.0%) | 100 |
| 5 | 40 (40.0%) | 33 (33.0%) | 27 (27.0%) | 100 |
| 6–10 | 151 (30.2%) | 176 (35.2%) | 173 (34.6%) | 500 |
| 11–15 | 164 (32.8%) | 176 (35.2%) | 160 (32.0%) | 500 |
| 16–25 | 326 (32.6%) | 351 (35.1%) | 323 (32.3%) | 1000 |
| 26–40 | 530 (35.3%) | 472 (31.5%) | 498 (33.2%) | 1500 |
| 41–60 | 656 (32.8%) | 652 (32.6%) | 692 (34.6%) | 2000 |
| *(erw. je Pl.1)* | 33.3% | 33.3% | 33.3% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 95 (95.0%) | 4 (4.0%) | 0 (0.0%) | 0 (0.0%) | 1 (1.0%) | 100 |
| 3 | 75 (75.0%) | 25 (25.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 54 (54.0%) | 45 (45.0%) | 0 (0.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 5 | 29 (29.0%) | 68 (68.0%) | 2 (2.0%) | 1 (1.0%) | 0 (0.0%) | 100 |
| 6–10 | 77 (15.4%) | 396 (79.2%) | 13 (2.6%) | 10 (2.0%) | 4 (0.8%) | 500 |
| 11–15 | 12 (2.4%) | 234 (46.8%) | 202 (40.4%) | 27 (5.4%) | 25 (5.0%) | 500 |
| 16–25 | 31 (3.1%) | 138 (13.8%) | 486 (48.6%) | 294 (29.4%) | 51 (5.1%) | 1000 |
| 26–40 | 19 (1.3%) | 62 (4.1%) | 254 (16.9%) | 854 (56.9%) | 311 (20.7%) | 1500 |
| 41–60 | 8 (0.4%) | 28 (1.4%) | 43 (2.1%) | 313 (15.7%) | 1608 (80.4%) | 2000 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 353 | 70.6% |
| Pl. 6–10 | 77 | 15.4% |
| Pl. 11–15 | 12 | 2.4% |
| Pl. 16–25 | 31 | 6.2% |
| Pl. 26–40 | 19 | 3.8% |
| Pl. 41–60 ❌ schwerer Miss | 8 | 1.6% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 126/171 (73.7%) | 122/174 (70.1%) | 105/155 (67.7%) |
| Schwerer Miss (Pl. 41+) | 1 (0.6%) | 4 (2.3%) | 3 (1.9%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 1608 | 80.4% |
| Pl. 26–40 | 311 | 15.6% |
| Pl. 16–25 | 51 | 2.5% |
| Pl. 6–15 | 29 | 1.5% |
| Pl. 1–5 ❌ Brems-Leck | 1 | 0.1% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Top-5 trotz B5-Ziel | 1/668 (0.1%) | 0/633 (0.0%) | 0/699 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Mountainstreet | boarder | 60s | 48.3% | ⚠️ Zu wenig Mixing |

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
| Mountainstreet | boarder | 60s | 0.0001 | 0.0148 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |

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
| Mountainstreet | boarder | 60s | 60 | 0.0% | 2.3% ⚠️ | +2.3% | 0.0 | 0.000055 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Mountainstreet | boarder | 60s | 60 | 19.6% | 70.6% | 51.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Mountainstreet | boarder | 60s | 22% | 74% | 171 | 20% | 70% | 174 | 17% | 68% | 155 |

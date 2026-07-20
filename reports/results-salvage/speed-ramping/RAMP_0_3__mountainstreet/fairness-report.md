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
| Mountainstreet | boarder | 60s | 3 | 33.3% | 37.0% | 36.0% | 27.0% | 1.8 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Mountainstreet × boarder × 60s

- **finishT:** 0.5003 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 1.82 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 37 | 37.0% | 33.3% | +3.7% | 30.6 | 17.4 |
| Row 1 | 36 | 36.0% | 33.3% | +2.7% | 29.9 | 17.2 |
| Row 2 | 27 | 27.0% | 33.3% | -6.3% | 31.0 | 17.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(2) = 1.82 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 347 | 69.4% |
| B2 (Pl. 6–15) | 1000 | 621 | 62.1% |
| B3 (Pl. 16–25) | 1000 | 492 | 49.2% |
| B4 (Pl. 26–40) | 1500 | 846 | 56.4% |
| B5 (Pl. 41–60) | 2000 | 1583 | 79.1% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (20R) | Row 1 (20R) | Row 2 (20R) | Gesamt |
|---|---|---|---|---|
| 1 | 37 (37.0%) | 36 (36.0%) | 27 (27.0%) | 100 |
| 2 | 33 (33.0%) | 27 (27.0%) | 40 (40.0%) | 100 |
| 3 | 35 (35.0%) | 34 (34.0%) | 31 (31.0%) | 100 |
| 4 | 30 (30.0%) | 36 (36.0%) | 34 (34.0%) | 100 |
| 5 | 31 (31.0%) | 38 (38.0%) | 31 (31.0%) | 100 |
| 6–10 | 163 (32.6%) | 174 (34.8%) | 163 (32.6%) | 500 |
| 11–15 | 161 (32.2%) | 180 (36.0%) | 159 (31.8%) | 500 |
| 16–25 | 327 (32.7%) | 341 (34.1%) | 332 (33.2%) | 1000 |
| 26–40 | 517 (34.5%) | 496 (33.1%) | 487 (32.5%) | 1500 |
| 41–60 | 666 (33.3%) | 638 (31.9%) | 696 (34.8%) | 2000 |
| *(erw. je Pl.1)* | 33.3% | 33.3% | 33.3% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 94 (94.0%) | 4 (4.0%) | 0 (0.0%) | 1 (1.0%) | 1 (1.0%) | 100 |
| 3 | 80 (80.0%) | 19 (19.0%) | 0 (0.0%) | 0 (0.0%) | 1 (1.0%) | 100 |
| 4 | 46 (46.0%) | 51 (51.0%) | 2 (2.0%) | 0 (0.0%) | 1 (1.0%) | 100 |
| 5 | 27 (27.0%) | 70 (70.0%) | 1 (1.0%) | 0 (0.0%) | 2 (2.0%) | 100 |
| 6–10 | 71 (14.2%) | 399 (79.8%) | 12 (2.4%) | 8 (1.6%) | 10 (2.0%) | 500 |
| 11–15 | 26 (5.2%) | 222 (44.4%) | 199 (39.8%) | 28 (5.6%) | 25 (5.0%) | 500 |
| 16–25 | 27 (2.7%) | 139 (13.9%) | 492 (49.2%) | 288 (28.8%) | 54 (5.4%) | 1000 |
| 26–40 | 20 (1.3%) | 70 (4.7%) | 241 (16.1%) | 846 (56.4%) | 323 (21.5%) | 1500 |
| 41–60 | 9 (0.4%) | 26 (1.3%) | 53 (2.6%) | 329 (16.4%) | 1583 (79.1%) | 2000 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 347 | 69.4% |
| Pl. 6–10 | 71 | 14.2% |
| Pl. 11–15 | 26 | 5.2% |
| Pl. 16–25 | 27 | 5.4% |
| Pl. 26–40 | 20 | 4.0% |
| Pl. 41–60 ❌ schwerer Miss | 9 | 1.8% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 123/171 (71.9%) | 116/174 (66.7%) | 108/155 (69.7%) |
| Schwerer Miss (Pl. 41+) | 1 (0.6%) | 6 (3.4%) | 2 (1.3%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 1583 | 79.1% |
| Pl. 26–40 | 323 | 16.2% |
| Pl. 16–25 | 54 | 2.7% |
| Pl. 6–15 | 35 | 1.8% |
| Pl. 1–5 ❌ Brems-Leck | 5 | 0.3% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Top-5 trotz B5-Ziel | 1/668 (0.1%) | 2/633 (0.3%) | 2/699 (0.3%) |

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
| Mountainstreet | boarder | 60s | 0.0001 | 0.0157 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |

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
| Mountainstreet | boarder | 60s | 60 | 17.0% | 69.4% | 52.4% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Mountainstreet | boarder | 60s | 18% | 72% | 171 | 18% | 67% | 174 | 15% | 70% | 155 |

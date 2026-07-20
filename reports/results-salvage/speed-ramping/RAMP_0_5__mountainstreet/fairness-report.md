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
| Mountainstreet | boarder | 60s | 3 | 33.3% | 36.0% | 36.0% | 28.0% | 1.3 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Mountainstreet × boarder × 60s

- **finishT:** 0.5003 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 1.28 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 36 | 36.0% | 33.3% | +2.7% | 30.6 | 17.4 |
| Row 1 | 36 | 36.0% | 33.3% | +2.7% | 29.9 | 17.2 |
| Row 2 | 28 | 28.0% | 33.3% | -5.3% | 31.0 | 17.3 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(2) = 1.28 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 350 | 70.0% |
| B2 (Pl. 6–15) | 1000 | 631 | 63.1% |
| B3 (Pl. 16–25) | 1000 | 491 | 49.1% |
| B4 (Pl. 26–40) | 1500 | 840 | 56.0% |
| B5 (Pl. 41–60) | 2000 | 1591 | 79.5% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (20R) | Row 1 (20R) | Row 2 (20R) | Gesamt |
|---|---|---|---|---|
| 1 | 36 (36.0%) | 36 (36.0%) | 28 (28.0%) | 100 |
| 2 | 36 (36.0%) | 30 (30.0%) | 34 (34.0%) | 100 |
| 3 | 30 (30.0%) | 40 (40.0%) | 30 (30.0%) | 100 |
| 4 | 37 (37.0%) | 32 (32.0%) | 31 (31.0%) | 100 |
| 5 | 30 (30.0%) | 41 (41.0%) | 29 (29.0%) | 100 |
| 6–10 | 163 (32.6%) | 171 (34.2%) | 166 (33.2%) | 500 |
| 11–15 | 157 (31.4%) | 171 (34.2%) | 172 (34.4%) | 500 |
| 16–25 | 338 (33.8%) | 337 (33.7%) | 325 (32.5%) | 1000 |
| 26–40 | 510 (34.0%) | 495 (33.0%) | 495 (33.0%) | 1500 |
| 41–60 | 663 (33.1%) | 647 (32.4%) | 690 (34.5%) | 2000 |
| *(erw. je Pl.1)* | 33.3% | 33.3% | 33.3% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 95 (95.0%) | 4 (4.0%) | 0 (0.0%) | 0 (0.0%) | 1 (1.0%) | 100 |
| 3 | 79 (79.0%) | 21 (21.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 54 (54.0%) | 43 (43.0%) | 3 (3.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 22 (22.0%) | 76 (76.0%) | 0 (0.0%) | 1 (1.0%) | 1 (1.0%) | 100 |
| 6–10 | 68 (13.6%) | 405 (81.0%) | 7 (1.4%) | 11 (2.2%) | 9 (1.8%) | 500 |
| 11–15 | 24 (4.8%) | 226 (45.2%) | 202 (40.4%) | 22 (4.4%) | 26 (5.2%) | 500 |
| 16–25 | 25 (2.5%) | 141 (14.1%) | 491 (49.1%) | 296 (29.6%) | 47 (4.7%) | 1000 |
| 26–40 | 23 (1.5%) | 64 (4.3%) | 248 (16.5%) | 840 (56.0%) | 325 (21.7%) | 1500 |
| 41–60 | 10 (0.5%) | 20 (1.0%) | 49 (2.5%) | 330 (16.5%) | 1591 (79.5%) | 2000 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 350 | 70.0% |
| Pl. 6–10 | 68 | 13.6% |
| Pl. 11–15 | 24 | 4.8% |
| Pl. 16–25 | 25 | 5.0% |
| Pl. 26–40 | 23 | 4.6% |
| Pl. 41–60 ❌ schwerer Miss | 10 | 2.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 125/171 (73.1%) | 120/174 (69.0%) | 105/155 (67.7%) |
| Schwerer Miss (Pl. 41+) | 1 (0.6%) | 6 (3.4%) | 3 (1.9%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 1591 | 79.5% |
| Pl. 26–40 | 325 | 16.3% |
| Pl. 16–25 | 47 | 2.4% |
| Pl. 6–15 | 35 | 1.8% |
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
| Mountainstreet | boarder | 60s | 0.0001 | 0.0156 | 0.0% | 100.0% | 100.0% | 0.00 | 1.00 |

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
| Mountainstreet | boarder | 60s | 60 | 0.0% | 2.3% ⚠️ | +2.3% | 0.0 | 0.000056 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Mountainstreet | boarder | 60s | 60 | 18.4% | 70.0% | 51.6% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Mountainstreet | boarder | 60s | 19% | 73% | 171 | 21% | 69% | 174 | 15% | 68% | 155 |

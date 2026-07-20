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
| Mountainstreet | boarder | 60s | 3 | 33.3% | 37.0% | 32.0% | 31.0% | 0.6 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Mountainstreet × boarder × 60s

- **finishT:** 0.5003 (Ziellinie in t-Raum)
- **Reihen:** 3 (gewichtete Erwartung nach Reihengröße)
- **Chi²(2):** 0.62 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 37 | 37.0% | 33.3% | +3.7% | 30.7 | 17.4 |
| Row 1 | 32 | 32.0% | 33.3% | -1.3% | 29.9 | 17.2 |
| Row 2 | 31 | 31.0% | 33.3% | -2.3% | 30.9 | 17.4 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(2) = 0.62 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 500 | 354 | 70.8% |
| B2 (Pl. 6–15) | 1000 | 673 | 67.3% |
| B3 (Pl. 16–25) | 1000 | 614 | 61.4% |
| B4 (Pl. 26–40) | 1500 | 1003 | 66.9% |
| B5 (Pl. 41–60) | 2000 | 1674 | 83.7% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (20R) | Row 1 (20R) | Row 2 (20R) | Gesamt |
|---|---|---|---|---|
| 1 | 37 (37.0%) | 32 (32.0%) | 31 (31.0%) | 100 |
| 2 | 33 (33.0%) | 33 (33.0%) | 34 (34.0%) | 100 |
| 3 | 30 (30.0%) | 40 (40.0%) | 30 (30.0%) | 100 |
| 4 | 39 (39.0%) | 30 (30.0%) | 31 (31.0%) | 100 |
| 5 | 31 (31.0%) | 39 (39.0%) | 30 (30.0%) | 100 |
| 6–10 | 162 (32.4%) | 177 (35.4%) | 161 (32.2%) | 500 |
| 11–15 | 157 (31.4%) | 163 (32.6%) | 180 (36.0%) | 500 |
| 16–25 | 332 (33.2%) | 355 (35.5%) | 313 (31.3%) | 1000 |
| 26–40 | 502 (33.5%) | 485 (32.3%) | 513 (34.2%) | 1500 |
| 41–60 | 677 (33.9%) | 646 (32.3%) | 677 (33.9%) | 2000 |
| *(erw. je Pl.1)* | 33.3% | 33.3% | 33.3% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 100 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 2 | 92 (92.0%) | 8 (8.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 3 | 75 (75.0%) | 25 (25.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 4 | 53 (53.0%) | 47 (47.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 5 | 34 (34.0%) | 66 (66.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 100 |
| 6–10 | 72 (14.4%) | 409 (81.8%) | 4 (0.8%) | 9 (1.8%) | 6 (1.2%) | 500 |
| 11–15 | 19 (3.8%) | 264 (52.8%) | 170 (34.0%) | 21 (4.2%) | 26 (5.2%) | 500 |
| 16–25 | 22 (2.2%) | 107 (10.7%) | 614 (61.4%) | 212 (21.2%) | 45 (4.5%) | 1000 |
| 26–40 | 20 (1.3%) | 55 (3.7%) | 173 (11.5%) | 1003 (66.9%) | 249 (16.6%) | 1500 |
| 41–60 | 13 (0.7%) | 19 (0.9%) | 39 (1.9%) | 255 (12.8%) | 1674 (83.7%) | 2000 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 354 | 70.8% |
| Pl. 6–10 | 72 | 14.4% |
| Pl. 11–15 | 19 | 3.8% |
| Pl. 16–25 | 22 | 4.4% |
| Pl. 26–40 | 20 | 4.0% |
| Pl. 41–60 ❌ schwerer Miss | 13 | 2.6% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Treffer (Pl. 1–5) | 125/171 (73.1%) | 122/174 (70.1%) | 107/155 (69.0%) |
| Schwerer Miss (Pl. 41+) | 3 (1.8%) | 8 (4.6%) | 2 (1.3%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 1674 | 83.7% |
| Pl. 26–40 | 249 | 12.4% |
| Pl. 16–25 | 45 | 2.3% |
| Pl. 6–15 | 32 | 1.6% |
| Pl. 1–5 ❌ Brems-Leck | 0 | 0.0% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 |
|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/668 (0.0%) | 0/633 (0.0%) | 0/699 (0.0%) |

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
| Mountainstreet | boarder | 60s | 60 | 16.8% | 70.8% | 54.0% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n |
|-------|-------|------|---|---|------|---|------|---|---|
| Mountainstreet | boarder | 60s | 21% | 73% | 171 | 14% | 70% | 174 | 15% | 69% | 155 |

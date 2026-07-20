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
| Luger hill | luge | 60s | 7 | 15.0% | 11.0% | 11.7% | 15.5% | 11.9 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Luger hill × luge × 60s

- **finishT:** 0.8332 (Ziellinie in t-Raum)
- **Reihen:** 7 (gewichtete Erwartung nach Reihengröße)
- **Chi²(6):** 11.93 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 33 | 11.0% | 15.0% | -4.0% | 31.6 | 17.7 |
| Row 1 | 35 | 11.7% | 15.0% | -3.3% | 31.3 | 17.7 |
| Row 2 | 40 | 13.3% | 15.0% | -1.7% | 30.2 | 17.3 |
| Row 3 | 48 | 16.0% | 15.0% | +1.0% | 30.9 | 17.4 |
| Row 4 | 45 | 15.0% | 13.3% | +1.7% | 30.1 | 17.0 |
| Row 5 | 53 | 17.7% | 13.3% | +4.3% | 29.8 | 16.9 |
| Row 6 | 46 | 15.3% | 13.3% | +2.0% | 29.4 | 17.0 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **✅ PASS** | χ²(6) = 11.93 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 1500 | 1095 | 73.0% |
| B2 (Pl. 6–15) | 3000 | 2167 | 72.2% |
| B3 (Pl. 16–25) | 3000 | 1946 | 64.9% |
| B4 (Pl. 26–40) | 4500 | 3048 | 67.7% |
| B5 (Pl. 41–60) | 6000 | 5135 | 85.6% |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (9R) | Row 1 (9R) | Row 2 (9R) | Row 3 (9R) | Row 4 (8R) | Row 5 (8R) | Row 6 (8R) | Gesamt |
|---|---|---|---|---|---|---|---|---|
| 1 | 33 (11.0%) | 35 (11.7%) | 40 (13.3%) | 48 (16.0%) | 45 (15.0%) | 53 (17.7%) | 46 (15.3%) | 300 |
| 2 | 46 (15.3%) | 46 (15.3%) | 47 (15.7%) | 39 (13.0%) | 43 (14.3%) | 36 (12.0%) | 43 (14.3%) | 300 |
| 3 | 47 (15.7%) | 36 (12.0%) | 46 (15.3%) | 42 (14.0%) | 40 (13.3%) | 41 (13.7%) | 48 (16.0%) | 300 |
| 4 | 49 (16.3%) | 37 (12.3%) | 53 (17.7%) | 39 (13.0%) | 36 (12.0%) | 36 (12.0%) | 50 (16.7%) | 300 |
| 5 | 50 (16.7%) | 45 (15.0%) | 34 (11.3%) | 54 (18.0%) | 46 (15.3%) | 29 (9.7%) | 42 (14.0%) | 300 |
| 6–10 | 208 (13.9%) | 234 (15.6%) | 238 (15.9%) | 227 (15.1%) | 183 (12.2%) | 212 (14.1%) | 198 (13.2%) | 1500 |
| 11–15 | 211 (14.1%) | 230 (15.3%) | 243 (16.2%) | 203 (13.5%) | 218 (14.5%) | 201 (13.4%) | 194 (12.9%) | 1500 |
| 16–25 | 422 (14.1%) | 450 (15.0%) | 447 (14.9%) | 455 (15.2%) | 379 (12.6%) | 431 (14.4%) | 416 (13.9%) | 3000 |
| 26–40 | 663 (14.7%) | 618 (13.7%) | 668 (14.8%) | 676 (15.0%) | 645 (14.3%) | 598 (13.3%) | 632 (14.0%) | 4500 |
| 41–60 | 971 (16.2%) | 969 (16.2%) | 884 (14.7%) | 917 (15.3%) | 765 (12.8%) | 763 (12.7%) | 731 (12.2%) | 6000 |
| *(erw. je Pl.1)* | 15.0% | 15.0% | 15.0% | 15.0% | 13.3% | 13.3% | 13.3% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 300 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 2 | 287 (95.7%) | 13 (4.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 3 | 241 (80.3%) | 58 (19.3%) | 1 (0.3%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 4 | 158 (52.7%) | 142 (47.3%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 5 | 109 (36.3%) | 191 (63.7%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 300 |
| 6–10 | 245 (16.3%) | 1233 (82.2%) | 16 (1.1%) | 3 (0.2%) | 3 (0.2%) | 1500 |
| 11–15 | 73 (4.9%) | 934 (62.3%) | 471 (31.4%) | 7 (0.5%) | 15 (1.0%) | 1500 |
| 16–25 | 55 (1.8%) | 335 (11.2%) | 1946 (64.9%) | 611 (20.4%) | 53 (1.8%) | 3000 |
| 26–40 | 29 (0.6%) | 76 (1.7%) | 553 (12.3%) | 3048 (67.7%) | 794 (17.6%) | 4500 |
| 41–60 | 3 (0.1%) | 18 (0.3%) | 13 (0.2%) | 831 (13.9%) | 5135 (85.6%) | 6000 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 1095 | 73.0% |
| Pl. 6–10 | 245 | 16.3% |
| Pl. 11–15 | 73 | 4.9% |
| Pl. 16–25 | 55 | 3.7% |
| Pl. 26–40 | 29 | 1.9% |
| Pl. 41–60 ❌ schwerer Miss | 3 | 0.2% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 176/230 (76.5%) | 163/212 (76.9%) | 172/245 (70.2%) | 160/207 (77.3%) | 140/198 (70.7%) | 135/193 (69.9%) | 149/215 (69.3%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 1 (0.5%) | 1 (0.5%) | 1 (0.5%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–60 ✅ Soll erreicht | 5135 | 85.6% |
| Pl. 26–40 | 794 | 13.2% |
| Pl. 16–25 | 53 | 0.9% |
| Pl. 6–15 | 18 | 0.3% |
| Pl. 1–5 ❌ Brems-Leck | 0 | 0.0% |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/896 (0.0%) | 0/909 (0.0%) | 0/867 (0.0%) | 0/906 (0.0%) | 0/800 (0.0%) | 0/786 (0.0%) | 0/836 (0.0%) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Luger hill | luge | 60s | 10.9% | ⚠️ Zu wenig Mixing |

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
| Luger hill | luge | 60s | 0.0000 | 0.0008 | 0.0% | 100.0% | 98.4% | 0.00 | 1.00 |

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
| Luger hill | luge | 60s | 60 | 0.0% | 3.2% ⚠️ | +3.2% | 0.0 | 0.000090 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Luger hill | luge | 60s | 60 | 16.5% | 73.0% | 56.5% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n | R5 exact% | R5 top5% | R5 n | R6 exact% | R6 top5% | R6 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|------|---|------|---|---|
| Luger hill | luge | 60s | 14% | 77% | 230 | 16% | 77% | 212 | 14% | 70% | 245 | 21% | 77% | 207 | 17% | 71% | 198 | 17% | 70% | 193 | 17% | 69% | 215 |

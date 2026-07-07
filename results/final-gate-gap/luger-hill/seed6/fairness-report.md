# RaceArena — Fairness Simulation Report

**Datum:** 2026-07-03  
**Rennen pro Kombination:** 50  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–50  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Luger hill | luge | 60s | 5 | 20.0% | 24.0% | 10.0% | 22.0% | 5.0 | n.s. | ✅ Fair |

---

## Detail-Auswertung pro Kombination

### Luger hill × luge × 60s

- **finishT:** 0.8332 (Ziellinie in t-Raum)
- **Reihen:** 5 (gewichtete Erwartung nach Reihengröße)
- **Chi²(4):** 5.00 — n.s.

| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|-----------------|------------|--------|--------|
| Row 0 | 12 | 24.0% | 20.0% | +4.0% | 21.2 | 12.1 |
| Row 1 | 5 | 10.0% | 20.0% | -10.0% | 22.0 | 11.5 |
| Row 2 | 8 | 16.0% | 20.0% | -4.0% | 20.1 | 11.2 |
| Row 3 | 14 | 28.0% | 20.0% | +8.0% | 19.4 | 11.5 |
| Row 4 | 11 | 22.0% | 20.0% | +2.0% | 19.8 | 11.2 |


#### E — 1.5×-Gate Aggregat (gewichtet)

Gate-Status: **❌ FAIL** | χ²(4) = 5.00 | n.s.


#### A — Bereichstreue

| Soll-Bereich | Zugewiesen | Treffer | Quote |
|---|---|---|---|
| B1 (Pl. 1–5) | 250 | 210 | 84.0% |
| B2 (Pl. 6–15) | 500 | 402 | 80.4% |
| B3 (Pl. 16–25) | 500 | 355 | 71.0% |
| B4 (Pl. 26–40) | 750 | 658 | 87.7% |
| B5 (Pl. 41–40) | 0 | 0 | — |

#### B.1 — End-Platz-Gruppen × Start-Reihe

| End-Platz | Row 0 (8R) | Row 1 (8R) | Row 2 (8R) | Row 3 (8R) | Row 4 (8R) | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 12 (24.0%) | 5 (10.0%) | 8 (16.0%) | 14 (28.0%) | 11 (22.0%) | 50 |
| 2 | 13 (26.0%) | 11 (22.0%) | 8 (16.0%) | 8 (16.0%) | 10 (20.0%) | 50 |
| 3 | 6 (12.0%) | 9 (18.0%) | 9 (18.0%) | 16 (32.0%) | 10 (20.0%) | 50 |
| 4 | 11 (22.0%) | 8 (16.0%) | 13 (26.0%) | 6 (12.0%) | 12 (24.0%) | 50 |
| 5 | 13 (26.0%) | 5 (10.0%) | 8 (16.0%) | 15 (30.0%) | 9 (18.0%) | 50 |
| 6–10 | 45 (18.0%) | 46 (18.4%) | 51 (20.4%) | 53 (21.2%) | 55 (22.0%) | 250 |
| 11–15 | 52 (20.8%) | 42 (16.8%) | 52 (20.8%) | 55 (22.0%) | 49 (19.6%) | 250 |
| 16–25 | 79 (15.8%) | 106 (21.2%) | 115 (23.0%) | 104 (20.8%) | 96 (19.2%) | 500 |
| 26–40 | 169 (22.5%) | 168 (22.4%) | 136 (18.1%) | 129 (17.2%) | 148 (19.7%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |
| *(erw. je Pl.1)* | 20.0% | 20.0% | 20.0% | 20.0% | 20.0% | — |

#### B.2 — End-Platz-Gruppen × Soll-Bereich

| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |
|---|---|---|---|---|---|---|
| 1 | 50 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 2 | 50 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 3 | 47 (94.0%) | 3 (6.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 4 | 36 (72.0%) | 13 (26.0%) | 1 (2.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 5 | 27 (54.0%) | 23 (46.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 50 |
| 6–10 | 32 (12.8%) | 209 (83.6%) | 6 (2.4%) | 3 (1.2%) | 0 (0.0%) | 250 |
| 11–15 | 3 (1.2%) | 193 (77.2%) | 51 (20.4%) | 3 (1.2%) | 0 (0.0%) | 250 |
| 16–25 | 5 (1.0%) | 54 (10.8%) | 355 (71.0%) | 86 (17.2%) | 0 (0.0%) | 500 |
| 26–40 | 0 (0.0%) | 5 (0.7%) | 87 (11.6%) | 658 (87.7%) | 0 (0.0%) | 750 |
| 41–40 | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 (—) | 0 |

#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 1–5 ✅ Soll erreicht | 210 | 84.0% |
| Pl. 6–10 | 32 | 12.8% |
| Pl. 11–15 | 3 | 1.2% |
| Pl. 16–25 | 5 | 2.0% |
| Pl. 26–40 | 0 | 0.0% |
| Pl. 41–40 ❌ schwerer Miss | 0 | 0.0% |

Trefferquote B1 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 |
|---|---|---|---|---|---|
| Treffer (Pl. 1–5) | 48/54 (88.9%) | 34/42 (81.0%) | 40/52 (76.9%) | 45/52 (86.5%) | 43/50 (86.0%) |
| Schwerer Miss (Pl. 41+) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)

| Tatsächlich gelandet | Anzahl | Anteil |
|---|---|---|
| Pl. 41–40 ✅ Soll erreicht | 0 | — |
| Pl. 26–40 | 0 | — |
| Pl. 16–25 | 0 | — |
| Pl. 6–15 | 0 | — |
| Pl. 1–5 ❌ Brems-Leck | 0 | — |

Brems-Leck Top-5 nach Start-Reihe:

| Metrik | Row 0 | Row 1 | Row 2 | Row 3 | Row 4 |
|---|---|---|---|---|---|
| Top-5 trotz B5-Ziel | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) | 0/0 (—) |

---

## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)

Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer im t-Raum überholt haben. Zielbereich: **60–95 %**.

| Track | Racer | Dist | Mixing-Quote | Bewertung |
|-------|-------|------|-------------|-----------|
| Luger hill | luge | 60s | 5.8% | ⚠️ Zu wenig Mixing |

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
| Luger hill | luge | 60s | 40 | 0.0% | 3.0% ⚠️ | +3.0% | 0.0 | 0.000072 ✅ |

---

## Fair-Chance Placement (B1 target ranks 1–5)

B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  
B1top5: fraction finishing anywhere in top 5.  
Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.

### Aggregate (all B1 racers, across all races)

| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |
|-------|-------|------|---|----------|---------|------|
| Luger hill | luge | 60s | 40 | 31.6% | 84.0% | 52.4% |

### Per-Starting-Row Breakdown

Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  
n = total B1-racer appearances from that row across all 10 races.  
exact% and top5% are the hit rates for that starting row only.

| Track | Racer | Dist | R0 exact% | R0 top5% | R0 n | R1 exact% | R1 top5% | R1 n | R2 exact% | R2 top5% | R2 n | R3 exact% | R3 top5% | R3 n | R4 exact% | R4 top5% | R4 n |
|-------|-------|------|---|---|------|---|------|---|------|---|------|---|---|
| Luger hill | luge | 60s | 24% | 89% | 54 | 33% | 81% | 42 | 29% | 77% | 52 | 37% | 87% | 52 | 36% | 86% | 50 |

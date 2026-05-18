# Phase 2F — N-T Avoidance: Ergebnis-Report

**Datum:** 2026-05-18  
**Branch:** feat/phase-2f-nt-avoidance (von master 6ff2e5f)  
**Tag:** pre-phase-2f-nt-avoidance  
**Adaptive Stichprobe:** N=20, r=40 (erste Stufe)  
**Adaptive Stop-Schwelle:** ≤20/72 Open-Track-Gate → klares Scheitern, Stopp  

---

## 0. Baseline

| Typ | Fair | Bias |
|-----|------|------|
| Closed (72 Kombos) | 69/72 | 3 Rear |
| **Open (72 Kombos)** | **0/72** | **72 Front-Bias** |

---

## 1. N-T Avoidance — Ergebnis

**Override:** `--normalizedTAvoidance=true --normalizedTPermanent=true`

| Typ | Fair | Bias |
|-----|------|------|
| Closed (72 Kombos) | 69/72 | 3 Rear (unverändert) |
| **Open (72 Kombos)** | **0/72** | **72 Rear-Bias** |

**Adaptive Entscheidung:** 0/72 < 20/72 → KLARES SCHEITERN → STOPP. Kein Extend auf N=50 oder N=100.

---

## 2. Bias-Flip-Analyse

N-T hat eine **vollständige Bias-Umkehrung** bewirkt:

| Track | Baseline | N-T | Δ |
|-------|----------|-----|---|
| River Run | 0/24 fair, 24 Front | 0/24 fair, 24 **Rear** | Flip |
| Space Sprint | 0/24 fair, 24 Front | 0/24 fair, 24 **Rear** | Flip |
| Weltall | 0/24 fair, 24 Front | 0/24 fair, 24 **Rear** | Flip |

Beispiel-Extremwerte (Row-0-Win-Rate, erwartet 33–50%):
- Weltall × buggy × 30s: **0%** (Baseline: 80%)
- Weltall × motorbike × 30s: **0%** (Baseline: 75%)
- Space Sprint × horse × 30s: **0%** (Baseline: 95%)

---

## 3. Mechanismus-Diagnose

### Was N-T tut

```javascript
// N-T: progress = t - tStart für Trailer-Bestimmung
const progressA = rA.t - rA.tStart;
const progressB = rB.t - rB.tStart;
const aIsTrailer = progressA < progressB || (progressA === progressB && rA.index < rB.index);
```

### Warum N-T den Bias vollständig flippt

**Ursache 1 — Index-Tie-Break:** Bei Rennenstart haben alle Racer `progress ≈ 0`. Tie-Break `rA.index < rB.index` gibt Row-0-Racern (niedrige Indices 0..M-1) systematisch Trailer-Status. Row-0 wird ab Frame 1 gebremst — der Rücken der Bias-Richtung gegenüber dem Ziel.

**Ursache 2 — speedBonusMult-Amplifikation:** Die hintere Reihe hat höheres `speedBonusMult` und damit mehr normalisierten Fortschritt über Zeit:
```
progress_row1 = row1.t - tStart_row1 ≈ speed_row1 × t = race_baseSpeed × speedMult × spreadFactor × speedBonusMult_row1 × t
progress_row0 = row0.t - tStart_row0 ≈ race_baseSpeed × speedMult × spreadFactor × 1.0 × t
```
Da `speedBonusMult_row1 > 1.0`, hat Row-1 nach kurzer Zeit typischerweise `progressB > progressA`. N-T identifiziert dann Row-0 als permanenten Trailer — auch wenn Row-0 in absoluter t-Position noch vorne ist.

**Ursache 3 — Konzeptionelle Inkoheränz:** N-T prüft **Proximity** in absolutem t-Raum (`dT = |rA.t - rB.t|`) aber bestimmt **Leadership** in normalisiertem Progress-Raum (`progressA < progressB`). Diese Mischung aus zwei verschiedenen Koordinatensystemen erzeugt einen widersprüchlichen Mechanismus: Racer können im Bremsbereich sein (dT < Schwelle) aber das "Wer-bremst-wen" ist in einem anderen Frame definiert.

### Kritischer Fall: Legitimes Überholen

Wenn Row-1 Row-0 in absolutem t-Raum überholt (der Fairness-Fall den wir wollen):
- Produktion: `rA.t < rB.t` → Row-0 ist Trailer → Row-0 wird gebremst (korrekt)
- N-T: `progressA = row0.t - tStart_row0 < progressB = row1.t - tStart_row1` nur wenn `(row1.t - row0.t) > (tStart_row1 - tStart_row0) = -deltaT`

Da `tStart_row1 < tStart_row0` (row-1 startet weiter hinten), gilt `tStart_row1 - tStart_row0 = -deltaT < 0`. Also: N-T identifiziert Row-1 als Trailer SOBALD `row1.t - row0.t > -deltaT`, d.h. sobald Row-1 nur `deltaT` hinter Row-0 ist — was von Anfang an der Fall ist (`deltaT = tStart_row0 - tStart_row1`).

**Konkret:** Wenn Row-1 Row-0 in absolutem t um `epsilon` überholt:
- Produktion: Row-0 wird gebremst — das Überholen wird bestätigt ✓
- N-T: Row-1 wird gebremst — das Überholen wird verhindert ✗

N-T bestraft legitimate Überholmanöver der hinteren Reihen.

---

## 4. Warum der Fehler nicht früher erkennbar war

Die Idee "Trailer = wer weniger Fortschritt von seinem Start aus gemacht hat" klingt intuitiv fair. Der Denkfehler: bei Open Tracks ist der Fortschritt von unterschiedlichen Startpositionen aus inhärent unvergleichbar. Row-0 mit Startposition 0.026 und Row-1 mit Startposition 0.013 können bei identischem `progress = 0.15` komplett verschiedene Race-Positionen haben (Row-0 bei 0.176, Row-1 bei 0.163). N-T interpretiert sie als gleich-behandlungswürdig, obwohl Row-0 absolut weiter vorne ist.

---

## 5. Adaptive Entscheidung

| Schwelle | Ergebnis | Entscheidung |
|----------|----------|--------------|
| ≤20/72 = klares Scheitern | 0/72 | **STOPP** |

Kein Extend auf N=50 oder N=100. r=100-Sim wurde nach Erhalt der r=40-Daten abgebrochen.

---

## 6. Gesamtstand Physik-Reform-Versuche

| Phase | Mechanismus | Open fair | Urteil |
|-------|-------------|-----------|--------|
| Baseline | — | 0/72 | Referenz |
| 2B.1 | avoidanceWarmupMs (gemerged) | Verbesserung, nicht quantifiziert | Teilerfolg |
| 2B.2 | row0StartSpeedMult | Fail | Binäres Schwellwert-Verhalten |
| 2C | followerBoostMult | 0/72 | Fail, Bias-Flip |
| 2E Sim 1 | Gradient+Symmetric+sb=0.8 | 12/72 | Fail ≤30/72 |
| 2E Sim 2 | Re-Roll-Bias (fehlerhafte Spec) | 0/72 | Fail |
| **2F** | **N-T Avoidance** | **0/72 (Rear-Bias)** | **Fail, vollständiger Bias-Flip** |

**Fazit:** Alle getesteten Avoidance-System-Reformen haben die Front-Bias-Wurzel nicht neutralisieren können. Klasse A+S+speedBonus hat 12/72 erreicht (beste Physik-Leistung), aber weit unter dem Gate. Alle direkten Eingriffe in die Trailer-Bestimmungslogik (Phase 2B.2, 2C, 2F) erzeugen Bias-Flips statt Fairness.

---

## 7. Konsequenz: Physik-Pfad erschöpft

Nach sieben Physik-Reform-Versuchen ist die strukturelle Grenze erreicht:

1. Die Avoidance-Asymmetrie (`aIsTrailer = rA.t < rB.t`) ist ein Invariant des aktuellen Systems. Jeder Versuch sie zu umgehen (Gradient, Symmetric, Normalized-T) erzeugt entweder unzureichende Wirkung (12/72) oder Bias-Flip (0/72 Rear).

2. Das speedBonus-System neutralisiert teilweise den Start-Vorteil, ist aber nicht stark genug oder kalibriert falsch für alle Track/Racer-Kombinationen.

3. Es gibt keine verbleibenden Physik-Varianten die nicht strukturell äquivalent zu bereits getesteten Varianten sind.

### Verbleibende Pfade

| Option | Beschreibung | Aufwand |
|--------|-------------|---------|
| **A. Start-T-Equalization** | Alle Open-Track-Racer starten bei tStart(row0). Eliminiert Positionsvorteil vollständig. Visueller Impact. | ~1h Sim-Override |
| **B. Outcome-First (korrekte Spec)** | Positions-bewusste Ziel-Trajektorie, kontinuierliche Korrektur (Architektur-Skizze in Phase-2F-Sketch) | ~4h PoC → 3 Tage Produktion |
| **C. Status Quo** | Phase 2B.1 bleibt. Front-Bias dokumentiert als bekanntes Verhalten auf Open Tracks. | 0h |

---

*Outcome-First-Architektur-Skizze: `docs/phase-2f-outcome-first-sketch.md`*  
*Implementierung: CLI-only in sim-fairness.mjs, keine Produktions-Code-Änderungen.*

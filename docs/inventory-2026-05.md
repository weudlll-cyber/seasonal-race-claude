# RaceArena — Mechanik-Inventur Mai 2026

**Zweck:** Vollständige Lesedokumentation der Startphase und aller auf einen Racer wirkenden Kräfte.
Grundlage für die geplante Priorität-basierte Anti-Kollisions-Architektur.

**Branch:** `master` @ `be436b5`
**Datum:** 2026-05-14
**Einschränkung:** Reine Inventur — keine Code-Änderungen, kein Refactoring, keine Vorschläge.

---

## Frage 1 — Wie läuft die Startphase ab?

### 1.1 Technische Definition

Drei Phasen, definiert als Enum-Objekt in [`client/src/screens/RaceScreen/index.jsx:94`](../client/src/screens/RaceScreen/index.jsx#L94):

```
PHASE = { COUNTDOWN: 0, RACING: 1, FINISHED: 2 }
```

Die „Startphase" entspricht `PHASE.COUNTDOWN` (Wert `0`).

Initialer Zustand beim Race-Start: `phase: PHASE.COUNTDOWN` ([index.jsx:311](../client/src/screens/RaceScreen/index.jsx#L311)).

### 1.2 Dauer und Abbruchbedingung

- **Dauer:** 4000 ms (hardcoded, nicht über DevScreen konfigurierbar)
- **Start:** `countdownStart` wird beim ersten rAF-Frame lazy gesetzt (`if (!st.countdownStart) st.countdownStart = ts`)
- **Trigger zum Ende:** `ts - st.countdownStart >= 4000` ([index.jsx:836](../client/src/screens/RaceScreen/index.jsx#L836))
- **Übergang:** `phase` wechselt auf `PHASE.RACING`; `raceStart` wird gesetzt; `nextRollTime` aller Racer wird von relativen Offsets auf absolute Timestamps umgerechnet

### 1.3 Aktive Logik während COUNTDOWN vs. RACING

| Logik | COUNTDOWN | RACING |
|---|---|---|
| `r.t` (Rennfortschritt) vorwärts | ✗ | ✓ |
| `applyRacerBehavior()` (alle Kräfte) | ✗ | ✓ |
| Re-Roll (spreadFactor) | ✗ | ✓ |
| `computePositions()` (Rendering) | ✓ | ✓ |
| CameraDirector | ✓ (passive) | ✓ |
| `runoutDecay` (für fertige Racer) | ✗ | ✓ |

Während COUNTDOWN bewegen sich alle Racer **nicht** — `computePositions()` rendert nur die initialen `t`-Werte, die beim Race-Init gesetzt wurden.

### 1.4 Startpositions-Zuweisung

Die Startreihen-Berechnung erfolgt einmalig beim Race-Init, **vor** dem ersten rAF-Frame ([index.jsx:280–383](../client/src/screens/RaceScreen/index.jsx#L280)).

**Schritt 1 — racersPerRow** ([rowLayout.js](../client/src/modules/rowLayout.js)):
```
effectiveWidth = geometricTrackWidthPx × startSpreadRange
racersPerRow = floor((2 × effectiveWidth) / spriteSize)
```
`startSpreadRange` ist DevScreen-konfigurierbar (default `0.95`).

**Schritt 2 — Row-Zuweisung:**
`computeRowLayout(nRacers, racersPerRow)` mischt alle Racer-Indizes zufällig und verteilt sie auf Reihen.

**Schritt 3 — tStart (Rennfortschritts-Offset):**
```
deltaT_per_row = rowGapPx / pathLengthPx
rowGapPx = spriteSize × rowGapMultiplier

Open Track:  tStart = (totalRows − rowIndex) × deltaT_per_row   // Front-Reihe am weitesten vorne
Closed Track: tStart = −(rowIndex × deltaT_per_row)              // Front-Reihe bei t=0
```
`rowGapMultiplier` ist DevScreen-konfigurierbar (default `1.5`).

**Schritt 4 — physicalY (Lateralposition):**
```
computeRowPhysicalY(indexInRow, rowSize, startSpreadRange)
= −startSpreadRange + (2 × startSpreadRange × indexInRow) / (rowSize − 1)
```
Gleichmäßige Verteilung von `−startSpreadRange` bis `+startSpreadRange`.

**Schritt 5 — speedBonusMult (Hinterreihen-Kompensation):**
```
speedBonus = (rowIndex × rowGapPx / pathLengthPx) × speedBonusFactor
speedBonusMult = 1 + speedBonus
```
`speedBonusFactor` ist DevScreen-konfigurierbar (default `1.0`).

**Schritt 6 — spreadFactor (Zufallsgeschwindigkeits-Draw):**
```
spreadFactor = (BASE_SPEED_MIN + random() × (BASE_SPEED_MAX − BASE_SPEED_MIN)) / BASE_SPEED_MEAN
baseSpeed = race_baseSpeed × speedMultiplier × spreadFactor × speedBonusMult
```
Dieser Wert ist zur Laufzeit durch Re-Rolls veränderlich (nur während RACING).

### 1.5 DevScreen-Sichtbarkeit (Startphase)

Alle Start-Parameter liegen in **Race Tuning**:

| Parameter | DevScreen-Label | Block |
|---|---|---|
| `startSpreadRange` | Start Spread Range | Block 2: Start Layout |
| `runoutZone` | Runout Zone | Block 2: Start Layout |
| `rowGapMultiplier` | Row Gap Multiplier | Block 3: Row Start |
| `speedBonusFactor` | Speed Bonus Factor | Block 3: Row Start |
| `maxCapacityFactor` | Max Capacity Factor | Block 3: Row Start |

**Nicht konfigurierbar:** Countdown-Dauer (4000 ms) — hardcoded in [`index.jsx:836`](../client/src/screens/RaceScreen/index.jsx#L836).

---

## Frage 2 — Welche Kräfte wirken auf einen Racer?

Koordinatensystem: `physicalY ∈ [−1, +1]`, `0 = Mittellinie`, `−1 = innere Begrenzung`, `+1 = äußere Begrenzung`. `t ∈ [0, 1)` = Rennfortschritt entlang des Pfads.

Die Kräfte werden in zwei Dateien definiert:
- **Geschwindigkeit:** [`RaceScreen/index.jsx`](../client/src/screens/RaceScreen/index.jsx)
- **Lateralbewegung:** [`raceBehavior.js`](../client/src/modules/raceBehavior.js) — aufgerufen als `applyRacerBehavior(racers, config)`, rein in-place, kein React/DOM

---

### Kraft 1 — spreadFactor / Re-Roll

**Code-Name:** `spreadFactor`, `r.baseSpeed`
**Effekt:** Bestimmt die individuelle Basisgeschwindigkeit eines Racers relativ zum Feldmittel. Variiert durch periodische Re-Rolls über die Rennlaufzeit.
**Wann aktiv:** Initialer Draw beim Race-Init; Re-Rolls feuern während RACING jede `rollInterval`-ms bis `lastRollDeadline` (= `reRollLastPositionPercent`% der Zieldauer).
**Magnitude:**
- Anfangswert: `BASE_SPEED_MIN / MEAN` bis `BASE_SPEED_MAX / MEAN` (defaults: 0.00096–0.00113, Mittel 0.001045 → Faktor-Range ≈ 0.919–1.082)
- Re-Roll-Schritt: ±`halfWidth = spreadRange × reRollVariationPercent / 100`
- Übergang: `easeInOutCubic` über `reRollTransitionDuration × 1000` ms
**DevScreen:** Race Tuning → Speed Re-Roll (4 Parameter: Variation Width %, Transition Smoothness s, Re-Roll Frequency Divisor, Last Roll Position %)
**Code:** [`index.jsx:838–877`](../client/src/screens/RaceScreen/index.jsx#L838)

---

### Kraft 2 — speedBonusMult (Hinterreihen-Kompensation)

**Code-Name:** `speedBonusMult`, `r.baseSpeed`
**Effekt:** Permanenter Geschwindigkeitsbonus für Racer, die weiter hinten starten — kompensiert den strukturellen Nachteil durch den größeren Startrückstand.
**Wann aktiv:** Wird beim Race-Init berechnet und ändert sich nie. Wirkt für die gesamte Rennlaufzeit.
**Magnitude:** `speedBonus = (rowIndex × rowGapPx / pathLengthPx) × speedBonusFactor`; default `speedBonusFactor = 1.0`. Multiplikator `= 1 + speedBonus` (typisch < 1–3% Abweichung).
**DevScreen:** Race Tuning → Row Start → Speed Bonus Factor
**Code:** [`rowLayout.js:computeSpeedBonus`](../client/src/modules/rowLayout.js), [`index.jsx:326–342`](../client/src/screens/RaceScreen/index.jsx#L326)

---

### Kraft 3 — Drafting (Windschatten-Boost)

**Code-Name:** `draftingBoostActive`, `draftingBoost`
**Effekt:** Racer im Windsog eines Führenden erhalten einen Geschwindigkeitsbonus. Geprüft im Kegel direkt hinter dem Leader in World-Pixel-Koordinaten.
**Wann aktiv:** RACING-Phase, jeder Frame nach `applyRacerBehavior()`. Leader muss `leader.t > follower.t`.
**Magnitude:** `boost = draftingBoost = 1.04` (+4% Geschwindigkeit); Kegel-Halböffnung `= draftingConeAngle/2 = 15°`; Maximalabstand `= draftingMaxDistance = 80` World-px.
**Kegel-Geometrie:** `behindAngle = leader.angle + π`; Prüfung `|followerAngle − behindAngle| ≤ coneHalf`. Hinweis (Backlog): Auf engen Kurven kann der Kegel den Windschatten-Bereich verfehlen (bekanntes Architekturproblem, noch nicht behoben).
**DevScreen:** Race Tuning → Drafting / Slipstream (Max Distance, Cone Angle °, Boost Factor)
**Code:** [`raceBehavior.js:291–319`](../client/src/modules/raceBehavior.js#L291)

---

### Kraft 4 — Speed Brake (Nebeneinander-Abbremsung)

**Code-Name:** `avoidanceActive`, `speedBrakeFactor`
**Effekt:** Der Trailer (hinterer Racer) verlangsamt sich, wenn er wirklich nebeneinander mit dem Leader fährt — verhindert Überholen auf gleicher Linie.
**Wann aktiv:** RACING-Phase; wenn `|dY| < speedBrakeYThreshold` UND `dT < speedBrakeTThreshold`; nur der Trailer wird gebremst (asymmetrisch).
**Magnitude:** `brake = speedBrakeFactor = 0.95` (−5% Geschwindigkeit); defaults: `speedBrakeYThreshold = 0.2`, `speedBrakeTThreshold = 0.015`.
**DevScreen:** Race Tuning → Speed Brake (Adjacent Y Threshold, Adjacent T Threshold, Speed Brake Factor)
**Code:** [`raceBehavior.js:167–169`](../client/src/modules/raceBehavior.js#L167)

---

### Kraft 5 — Avoidance (Lateraler Yield: Trailer weicht Führendem)

**Code-Name:** `yAvoidDeltas`, `lateralForce`, `tWeight`, `yWeight`, `avoidanceDistance`
**Effekt:** Schiebt den Trailer lateral weg von der physicalY des Leaders, wenn beide innerhalb der anisotropischen Vermeidungsdistanz liegen. Der Leader hält seine Linie.
**Wann aktiv:** RACING-Phase, jeder Frame für jedes Racer-Paar innerhalb der Distanz. Nur der Trailer wird bewegt.
**Magnitude:**
```
dist = sqrt((dT × tWeight)² + (dY × yWeight)²)
forceMag = lateralForce × (1 − dist / avoidanceDistance)
```
Defaults: `lateralForce = 0.01`, `avoidanceDistance = 0.35`, `tWeight = 2.0`, `yWeight = 1.0`.
Anti-Stacking: Bei mehreren Nachbarn wird die akkumulierte Avoidance durch `sqrt(neighborCount)` normiert.
**DevScreen:** Race Tuning → Soft Avoidance (Avoidance Distance, T Weight, Y Weight, Lateral Force, Max Lateral)
**Code:** [`raceBehavior.js:144–251`](../client/src/modules/raceBehavior.js#L144)

---

### Kraft 6 — Free-Lane Separation (Geometrische Überlappungsauflösung)

**Code-Name:** `yFreeLaneDeltas`, `overlapSet`, `stablePairBit`
**Effekt:** Wenn zwei Racer-Sprites sich tatsächlich überschneiden (geometrischer Overlap), prüft freie linke/rechte Spurlücken und lenkt jeden Racer in die freie Spur.
**Wann aktiv:** RACING-Phase; nur wenn `dT ≤ tHalfSpan AND |dY| ≤ lateralHalfSpan` (echte Sprite-Überlappung). `tHalfSpan = spriteSize / pathLength`, `lateralHalfSpan = spriteSize / trackWidth`.
**Magnitude:** Gleiche `forceMag` wie Avoidance. Richtung durch Free-Space-Geometrie bestimmt; Gleichstand-Auflösung deterministisch via `stablePairBit` (FNV-1a-Hash der Racer-Namen). Racer im `overlapSet` reduzieren gleichzeitig die Home-Force (siehe Kraft 7).
**DevScreen:** Kein eigener Block — nutzt `lateralForce` und `maxLateral` aus Soft Avoidance; `homeForceReductionOnOverlap` aus Home Force.
**Code:** [`raceBehavior.js:171–239`](../client/src/modules/raceBehavior.js#L171)

---

### Kraft 7 — Home Force (Rückkehr zur Mittellinie)

**Code-Name:** `homeForceStrength`, `homeForceReductionOnOverlap`, `yDeltas`
**Effekt:** Federkraft zurück zur Mittellinie (`physicalY = 0`). Reduziert sich während aktiver Sprite-Überlappung, damit Free-Lane-Separation Raum zur Entflechtung hat.
**Wann aktiv:** RACING-Phase, jeder Frame für alle aktiven Racer.
**Magnitude:**
```
overlapFactor = overlapSet.has(r) ? homeForceReductionOnOverlap : 1.0
delta = −physicalY × homeForceStrength × overlapFactor
```
Defaults: `homeForceStrength = 0.04`, `homeForceReductionOnOverlap = 0.3`.
**DevScreen:** Race Tuning → Home Force (Home Force Strength, Home Force Reduction On Overlap)
**Code:** [`raceBehavior.js:253–261`](../client/src/modules/raceBehavior.js#L253)

---

### Kraft 8 — Soft Repulsion (Randpuffer)

**Code-Name:** `comfortThreshold`, `softRepulsionStrength`
**Effekt:** Quadratische Rückstoßkraft, die stärker wird, je näher ein Racer der Streckenbegrenzung kommt. Erzeugt eine weiche „Bumper"-Zone vor dem harten Clamp.
**Wann aktiv:** RACING-Phase, jeder Frame nach Summierung aller Delta-Y-Kräfte, bevor der harte Clamp angewendet wird.
**Magnitude:**
```
if |newY| ≥ comfortThreshold:
  pen = (|newY| − comfortThreshold) / (1.0 − comfortThreshold)
  newY -= sign(newY) × softRepulsionStrength × pen²
```
Defaults: `comfortThreshold = 0.7`, `softRepulsionStrength = 0.1`.
**DevScreen:** Race Tuning → Comfort Zone (Comfort Threshold, Soft Repulsion Strength)
**Code:** [`raceBehavior.js:278–284`](../client/src/modules/raceBehavior.js#L278)

---

### Kraft 9 — Hard Clamp (Absolute Grenze)

**Code-Name:** `maxLateral`, `cap`
**Effekt:** Harter Clamp — `physicalY` wird nach Soft Repulsion auf `[−cap, +cap]` begrenzt. Absolute letzte Absicherung gegen Boundary-Ausbrechen.
**Wann aktiv:** RACING-Phase, jeder Frame, letzter Schritt in `applyRacerBehavior()`.
**Magnitude:** `cap = min(maxLateral, 1.0)`; default `maxLateral = 0.95`.
**DevScreen:** Race Tuning → Soft Avoidance → Max Lateral
**Code:** [`raceBehavior.js:286–287`](../client/src/modules/raceBehavior.js#L286)

---

### Kraft 10 — Run-out Decay (Post-Finish-Auslauf)

**Code-Name:** `runoutDecay`, `r.finished`
**Effekt:** Fertige Racer laufen noch ein Stück weiter, aber mit exponentiell zerfallender Geschwindigkeit. Kein abruptes Stoppen.
**Wann aktiv:** Pro Racer, wenn `r.finished === true`; nicht für laufende Racer.
**Magnitude:** `runoutDecay *= 0.97` pro Frame; `r.t += r.baseSpeed × runoutDecay × (dt/16)`. Stoppt praktisch nach ~100 Frames (0.97^100 ≈ 0.048).
**DevScreen:** `runoutZone` (Start Layout) bestimmt auf Open Tracks `finishT = 1.0 − runoutZone` — beeinflusst also wo das Ziel liegt, nicht die Decay-Rate selbst. Die Decay-Rate `0.97` ist hardcoded.
**Code:** [`index.jsx:885–888`](../client/src/screens/RaceScreen/index.jsx#L885)

---

## Übersicht: Kraft-Aktivierungsreihenfolge pro Frame (RACING-Phase)

```
1. applyRacerBehavior(racers, config) wird aufgerufen:
   a. Avoidance-Paarscan → yAvoidDeltas, speedBrakeSet befüllen
   b. Free-Lane-Check → yFreeLaneDeltas, overlapSet befüllen
   c. Home Force → yDeltas befüllen
   d. Anti-Stacking → yAvoidDeltas / sqrt(neighborCount) normieren
   e. Delta-Y anwenden → newY = physicalY + Σ(yDeltas)
   f. Soft Repulsion → newY korrigieren
   g. Hard Clamp → physicalY = clamp(newY, −cap, +cap)
   h. r.avoidanceActive = speedBrakeSet.has(r.index) setzen
   i. Drafting-Kegel scannen → r.draftingBoostActive setzen

2. computePositions() → World-Koordinaten (r.x, r.y, r.angle) berechnen

3. Per-Racer-Schleife (Geschwindigkeit):
   a. Re-Roll prüfen → spreadFactor ggf. neu ziehen + easeInOutCubic-Transition
   b. boost = draftingBoostActive ? draftingBoost : 1.0
   c. brake = avoidanceActive ? speedBrakeFactor : 1.0
   d. r.t += r.baseSpeed × boost × brake × (dt / 16)     ← Kernbewegung
```

---

## Konfigurierbarkeit — Zusammenfassung

| Kraft | DevScreen-Block | Konfigurierbare Parameter |
|---|---|---|
| Re-Roll | Speed Re-Roll | Variation Width %, Transition s, Freq-Divisor, Last Roll % |
| Back-row Bonus | Row Start | Speed Bonus Factor |
| Drafting | Drafting / Slipstream | Max Distance, Cone Angle, Boost Factor |
| Speed Brake | Speed Brake | Y Threshold, T Threshold, Brake Factor |
| Avoidance | Soft Avoidance | Distance, T Weight, Y Weight, Lateral Force, Max Lateral |
| Free-Lane | (kein eigener Block) | via Lateral Force + Max Lateral + homeForceReductionOnOverlap |
| Home Force | Home Force | Strength, Reduction On Overlap |
| Soft Repulsion | Comfort Zone | Threshold, Strength |
| Hard Clamp | Soft Avoidance | Max Lateral |
| Run-out Decay | (hardcoded: 0.97/Frame) | `runoutZone` bestimmt nur Zielposition |
| Countdown-Dauer | (hardcoded: 4000 ms) | — |
| Startpositionen | Start Layout + Row Start | startSpreadRange, rowGapMultiplier, maxCapacityFactor |
| Speed-Baseline | Speed Range | Min Speed, Max Speed |

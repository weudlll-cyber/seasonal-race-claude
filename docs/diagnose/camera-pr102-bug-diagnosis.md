# Diagnose: PR #102 — Kamera-Rückwärts-dann-Vorwärts-Bug

**Branch:** `fix/camera-track-aware-transitions`  
**Commit:** `af256db`  
**Analysiert:** 2026-05-15 (read-only, kein Code verändert)

---

## Punkt 1: Lap-Counter-Verhalten in `_camT`

**Befund:**  
`_camT` ist kumulativ (unboundeded float, e.g. 2.42 = Runde 3, Position 0.42). Normalisierung beim Zugriff auf die Track-Geometrie erfolgt inline mit `((this._camT % 1) + 1) % 1` (CameraDirector.js:877, 897, 914). Racer `.t` ist ebenfalls kumulativ (monoton wachsend bis `raceState.finishT`). Beide Seiten verwenden dasselbe Koordinatensystem.

In `_transition()` (Zeile 725–730):
```javascript
if (this._camT === null) {
  this._camT = focusT; // focusT = ordered[0].t (kumulativ)
}
```
Wenn `_camT !== null`, wird der alte Wert beibehalten — beides kommt aus derselben kumulativen T-Domäne. Keine Lap-Nummer-Diskrepanz.

In `_shortestTDelta` (Zeile 57):
```javascript
let delta = (to - from) % 1;
```
`% 1` strippt den Lap-Counter. Damit handelt die Funktion auf den fractional parts. Das ist korrekt und konsistent.

**Bezug zur Rückwärts-Hypothese:** Widerlegt. Kein Lap-Counter-Bug. Die User-Hypothese "Lap aus altem Kontext vs. aktueller" trifft nicht zu, da beide Werte kumulativ und konsistent sind.

**Beispielwerte:**  
- Leader Runde 3: `t = 2.42`, `_camT = 2.42` → `getPosition(0.42, 0)` ✓  
- `_shortestTDelta(2.42, 2.48) = (2.48-2.42)%1 = 0.06` ✓

---

## Punkt 2: ShortestTDelta-Verhalten bei großem Lead-Ahead

**Befund:**  
```javascript
function _shortestTDelta(from, to) {
  let delta = (to - from) % 1;
  if (delta > 0.5) delta -= 1;   // ← flippt zu negativ!
  if (delta < -0.5) delta += 1;
  return delta;
}
```
Wenn `(to - from) % 1 > 0.5`, gibt die Funktion einen **negativen** Wert zurück — der kurze Bogen geht rückwärts.

Das passiert wenn `leadAhead % 1 > 0.5` (da `_camT ≈ focusT` am Transition-Start, also `to - from ≈ leadAhead`):

| leadAhead | leadAhead % 1 | `_shortestTDelta` | Bewegung |
|-----------|---------------|-------------------|----------|
| 0.06      | 0.06          | +0.06             | vorwärts ✓ |
| 0.54      | 0.54          | −0.46             | **rückwärts ✗** |
| 2.4       | 0.4           | +0.4              | vorwärts, zu weit |
| 0.7       | 0.7           | −0.3              | **rückwärts ✗** |
| 1.56      | 0.56          | −0.44             | **rückwärts ✗** |

**Bezug zur Rückwärts-Beobachtung:** Bestätigt als Mechanismus. Die Frage ist: wann wird `leadAhead > 0.5` oder `leadAhead % 1 > 0.5`? Antwort: in Punkt 3.

---

## Punkt 3: Transition-Start — Initialisierung von `_camT` und das stale `_prevFocusT`-Problem

**Befund:**  
`_prevFocusT` wird in `_transition()` **NIE** zurückgesetzt (Zeile 698–757 vollständig geprüft). Es wird nur im Konstruktor auf `null` initialisiert (Zeile 141).

Der T-Space-Lerp-Block in `update()` (Zeile 449–492) setzt `_prevFocusT = fT` jedes Frame — aber **nur wenn er aktiv ist**, d.h. wenn `_camT !== null && _transitionTargetT !== null`.

**Lebenszyklus bei OVERVIEW → LEADER_ZOOM:**

**Phase A — OVERVIEW Entry (T-Space Lerp aktiv):**
- `_camT` gesetzt auf `focusT` in `_transition()`
- T-Space-Block läuft: `_prevFocusT = fT` jedes Frame
- Convergence fires: `|_shortestTDelta(_camT, leader.t)| < 0.005`

**Phase B — OVERVIEW Tracking (T-Space Lerp INAKTIV):**
- `_camT = null` (Convergence hat es released, Zeile 543)
- T-Space-Block läuft NICHT (`_camT === null`)
- `_prevFocusT` wird **eingefroren** — hält den Wert vom letzten OVERVIEW-Entry-Frame
- OVERVIEW-Tracking dauert 15–25 Sekunden → Racer bewegt sich weiter
- `_prevFocusT` ist jetzt **veraltet**

**Phase C — OVERVIEW → LEADER_ZOOM, Frame 1:**
In `_transition()` (Zeile 703): `_entrySpeedEstimate = NOMINAL_T_PER_FRAME = 0.001`

Aber sofort in `update()` Frame 1, BEVOR `_transitionTargetT` aus `_transition()` genutzt wird:
```javascript
if (this._prevFocusT !== null) {          // ← true, wert ist eingefroren aus Phase A
  this._entrySpeedEstimate = Math.max(0, fT - this._prevFocusT);
}
this._prevFocusT = fT;                    // ← erst jetzt aktualisiert
const leadAhead = this._entrySpeedEstimate * FRAME_RATE * prof.leadInDuration;
this._transitionTargetT = fT + leadAhead; // ← benutzt schon den falschen Wert!
```

`_entrySpeedEstimate` in `_transition()` wird **sofort auf Frame 1** überschrieben, noch bevor `_transitionTargetT` benutzt wird.

**Konkrete Zahlen:**  
- OVERVIEW-Tracking: 15 Sekunden = 900 Frames, Racer-Speed = 0.001 T/Frame
- Racer bewegt sich: 0.001 × 900 = 0.9 T
- `_prevFocusT` eingefroren bei `focusT_at_OVERVIEW_convergence = 2.38`
- Aktuell: `fT = 3.28` (0.9 T später)
- Frame 1: `speed = 3.28 − 2.38 = 0.90` (das ist 900× die echte Speed!)
- `leadAhead = 0.90 × 60 × 1.0 = 54.0`
- `54.0 % 1 = 0.0` → `_shortestTDelta = 0` → keine Bewegung Frame 1 ✗

Für 9-Sekunden-OVERVIEW-Tracking (540 Frames):
- `stale_speed = 0.54`; `leadAhead = 32.4`; `32.4 % 1 = 0.4` → vorwärts
  
Für ~9-Frame-OVERVIEW (Sonderfall, sehr kurzes Tracking):
- `stale_speed = 0.009`; `leadAhead = 0.54`; `0.54 % 1 = 0.54 > 0.5` → **rückwärts −0.46 T!**

Das Ergebnis auf Frame 2 ist immer korrekt: `_prevFocusT = fT_frame1`, `speed = 0.001`, `leadAhead = 0.06`. Die Kamera geht dann vorwärts.

**Frame 1 bewegt `_camT` falsch, dann korrigiert Frame 2+ — genau das Rückwärts-dann-Vorwärts-Muster!**

**Bezug zur Beobachtung:** Bestätigt als primäre Ursache. Das Muster ist timing-abhängig (abhängig von `leadAhead % 1 > oder < 0.5`), was erklärt warum "bei mindestens einer LEADER-Phase korrekt."

Zeile des Bugs: `update()` Zeile 476–479 (Speed-Schätzung ohne Prüfung ob `_prevFocusT` aktuell ist) + fehlendes `this._prevFocusT = null` in `_transition()`.

---

## Punkt 4: Lead-Ahead-Offset Größe

**Befund:**  
Selbst bei korrekter Speed-Schätzung (Frame 2+):
```
leadAhead = 0.001 [T/Frame] × 60 [Frames/s] × leadInDuration [s]
```
Für `leadInDuration = 1.0s`: `leadAhead = 0.06 T`

Auf einem Oval mit z.B. worldW = 2000px (typisch für einen mittelgroßen Track):
- `bsX = 1280 / 2000 = 0.64`
- `effectiveZoom = 3.5 × 0.64 = 2.24`
- Sichtbarer Halb-Viewport in Welt-Px: `1280 / (2 × 2.24) = 286 Welt-Px`
- Oval-Perimeter ≈ 4000 Welt-Px → `0.06 T × 4000 = 240 Welt-Px` lead-ahead
- Leader ist 240 Welt-Px **hinter** der Kamera-Mitte
- In Screen-Px: `240 × 2.24 = 538 Screen-Px` hinter Mitte
- Canvas 1280px breit, Kante bei 640px: Leader bei `640 + 538 = 1178 Screen-Px` = 92% von links

**→ Leader am rechten Rand des Bildes. Genau der User-Screenshot.**

Das `resolveCamera`-Clamping kann den Effekt leicht dämpfen (wenn der Track-Rand eingreift), aber die Grundlage bleibt: der Lead-Ahead-Offset ist für den verwendeten Zoom-Faktor zu groß.

**Bezug zur Beobachtung:** Bestätigt als sekundäre Ursache für "Leader fast aus dem Bild." Tritt auch dann auf wenn Bug 1 (stale prevFocusT) gefixed ist.

---

## Punkt 5: Tracking-Phase — bleibt Lead-Ahead aktiv?

**Befund:**  
Nein. Bei Convergence (Zeile 528):
```javascript
this._transitionTargetT = null; // ← T-Space Lerp gestoppt
```

T-Space-Lerp-Block-Bedingung (Zeile 449–455):
```javascript
if (this._lerpPhase === 'entry' && ... && this._transitionTargetT !== null)
```
→ läuft in Tracking-Phase nicht.

`tSpaceLerpActive` (Zeile 498–503):
```javascript
this._lerpPhase === 'entry' && ... && this._transitionTargetT !== null
```
→ false in Tracking-Phase → normaler Pixel-Lerp.

In `_computePhasedPanTarget`:
- 'lead-in': `_camT` bleibt bei Convergence-Position (fT + leadAhead), Camera hält Position
- 'follow': `this._camT = focusT` (Zeile 1021) → Camera pinnt an Racer
- `_prevFocusT = focusT` wird in allen `_computePhasedPanTarget`-Branches gesetzt → ist aktuell

Lead-Ahead akkumuliert **nicht** in der Tracking-Phase. User-Hypothese 2 widerlegt.

---

## Punkt 6: Schritt-für-Schritt-Trace OVERVIEW → LEADER

Ausgangslage: Racer Leader at `t = 3.28` (Runde 4, Position 0.28), Rennen läuft seit ~30s.  
`_prevFocusT = 2.38` (eingefroren vor 15s OVERVIEW-Tracking).  
`leadInDuration = 1.0s`, `entryTC = 0.5s` → `lf ≈ 0.073/Frame`.

**`_transition()` fires (OVERVIEW → LEADER_ZOOM):**
```
_camT = null → _camT = 3.28 (focusT)
_entrySpeedEstimate = 0.001 (NOMINAL_T_PER_FRAME)
_transitionTargetT = 3.28 + 0.001×60×1.0 = 3.34
_prevFocusT: 2.38 (unberührt!)
```

**Frame 1 — update() T-Space-Lerp-Block:**
```
fT = 3.281 (Racer hat sich 0.001 T bewegt)
_prevFocusT = 2.38 → speed = max(0, 3.281 − 2.38) = 0.901   ← stale!
_entrySpeedEstimate = 0.901  (überschreibt 0.001 aus _transition()!)
leadAhead = 0.901 × 60 × 1.0 = 54.06
_transitionTargetT = 3.281 + 54.06 = 57.341
_shortestTDelta(3.28, 57.341) = (57.341 − 3.28) % 1 = 54.061 % 1 = 0.061
_camT += 0.061 × 0.073 = +0.0045 → _camT = 3.2845
_prevFocusT = 3.281 (jetzt aktuell)
```
In diesem Fall: fast keine Bewegung (0.061 % 1 < 0.5 → vorwärts, klein). Kein Rückwärts bei 15s-Tracking. (Runde 0.06×900=54, `% 1 = 0`).

Für **8s OVERVIEW-Tracking** (480 Frames, Racer bewegt 0.48 T):
```
_prevFocusT = 2.80, fT = 3.28
speed = 0.48, leadAhead = 28.8, 28.8%1 = 0.8 > 0.5
_shortestTDelta = 0.8 − 1.0 = −0.2  ← RÜCKWÄRTS!
_camT += −0.2 × 0.073 = −0.0146 → _camT = 3.265  (hinter Leader!)
```

**Frame 2:**
```
fT = 3.282, _prevFocusT = 3.281
speed = 0.001, leadAhead = 0.06
_transitionTargetT = 3.342
_shortestTDelta(3.265, 3.342) = +0.077
_camT += 0.077 × 0.073 = +0.0056 → _camT = 3.271  ← VORWÄRTS!
```

Kamera geht RÜCKWÄRTS auf Frame 1 (von 3.28 auf 3.265), dann VORWÄRTS auf Frame 2+ (Richtung 3.34). Das ist genau das beobachtete Muster.

Nach Convergence (zoom+T konvergiert):
```
_camT ≈ 3.34 (leader bei 3.30)
Shape.getPosition(0.34) = 240 Welt-Px vor dem Leader
Bei Zoom 3.5: 538 Screen-Px hinter Kamera-Mitte = rechter Bildrand
```

---

## Verdikt

### User-Hypothese 1 (Lap-Counter-Bug): Widerlegt

`_camT` und `focusT` sind konsistent kumulativ. Kein Lap-Kontext-Mismatch. Die eigentliche Ursache ist verwandt aber anders: **nicht der Lap-Counter, sondern `_prevFocusT` das eingefroren ist.**

### User-Hypothese 2 (Lead-Ahead-Persistenz): Widerlegt

`_transitionTargetT = null` bei Convergence. T-Space-Lerp läuft in Tracking-Phase nicht. Lead-Ahead akkumuliert nicht weiter.

---

## Wahrscheinlichste Wurzeln

### Bug 1 (primär): Stale `_prevFocusT` → falscher Lead-Ahead auf Frame 1

**Datei:** `CameraDirector.js`  
**Zeilen:** 476–478 (Speed-Berechnung aus `_prevFocusT`) + Zeile 703 (`_entrySpeedEstimate` reset ohne `_prevFocusT` reset)  
**Mechanismus:** `_prevFocusT` wird während OVERVIEW-Tracking eingefroren (T-Space-Lerp inaktiv). Frame 1 des nächsten States berechnet Speed als Differenz über den gesamten OVERVIEW-Zeitraum → explosiver Lead-Ahead → `_shortestTDelta` kann negativ sein (je nach `leadAhead % 1`) → kurze Rückwärtsbewegung → ab Frame 2 normalisiert → Vorwärtsbewegung zu Lead-Ahead-Position.

**Fix-Richtung:** `this._prevFocusT = null` in `_transition()` nach Zeile 703 (zwischen `_entrySpeedEstimate` reset und dem Shape-Block). Dann bleibt Speed auf Frame 1 bei `NOMINAL_T_PER_FRAME`.

### Bug 2 (sekundär): Lead-Ahead zu groß für den verwendeten Zoom-Faktor

**Datei:** `CameraDirector.js`  
**Zeile:** 484–487 (leadAhead-Berechnung in update) + Zeile 738–741 (leadAhead in _transition)  
**Mechanismus:** Selbst bei korrekter Speed (0.001 T/Frame) ergibt `leadAhead = 0.001×60×1.0 = 0.06 T`. Bei typischer Oval-Länge und Zoom 3.5x entspricht das dem Leader am rechten Bildrand (92% quer über den Viewport).  
**Fix-Richtung:** `leadInDuration` reduzieren, oder Lead-Ahead in Pixel statt T-Space kalibrieren, oder Clamp: `leadAhead = min(leadAhead, 0.5 × viewport_half_width_in_T)`.

---

## Fix-Reihenfolge

1. **Zuerst Bug 1 (stale `_prevFocusT`):** Einfach, ein Zeile. Eliminiert das unvorhersehbare Rückwärts-Flackern und die random Richtungsumkehr auf Frame 1.
2. **Dann Bug 2 (Lead-Ahead-Größe):** Nach Bug-1-Fix wird das Ausmaß des "Leader am Rand"-Effekts klarer sichtbar. Dann entscheiden ob `leadInDuration` kleiner gesetzt wird (Config-Änderung) oder ob die Lead-Ahead-Berechnung geändert wird.

---

## Diagnostic-Logging für visuelle Verifikation

Falls die Analyse nach einem Fix noch Unklarheiten lässt, wäre dieses Logging sinnvoll in `update()` direkt vor `this._camT += ...`:

```javascript
if (this._showDiagnostics && this._lerpPhase === 'entry') {
  console.log(
    `[CAM-T] state=${this.state} phase=${this._lerpPhase}` +
    ` camT=${this._camT?.toFixed(4)} target=${this._transitionTargetT?.toFixed(4)}` +
    ` delta=${_shortestTDelta(this._camT, this._transitionTargetT).toFixed(4)}` +
    ` prevFocusT=${this._prevFocusT?.toFixed(4)} speedEst=${this._entrySpeedEstimate?.toFixed(6)}` +
    ` leadAhead=${((this._entrySpeedEstimate ?? 0) * FRAME_RATE * (this._phasedByState?.[this.state]?.leadInDuration ?? 0)).toFixed(4)}`
  );
}
```

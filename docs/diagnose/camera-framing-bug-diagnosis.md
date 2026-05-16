# Camera Framing Bug — Diagnose-Report
**Stand:** 2026-05-14 | Branch: master (`5088639`) | Rein read-only

---

## Untersuchte Dateien

| Datei | Relevante Zeilen |
|-------|-----------------|
| `CameraDirector.js` | 389–514 (`update`), 517–684 (`_transition`), 629–683 (observer init), 429–450 (entry align), 460–476 (convergence gate), 738–762 (`_setClosedTrackTargets`), 864–978 (`_computePhasedPanTarget`) |
| `RaceScreen/index.jsx` | 1120–1177 (open-track pan + canvas transform) |
| `panTarget.js` | Vollständig (75 Zeilen) |
| `resolveCamera.js` | Vollständig (118 Zeilen) |

---

## Hypothesen

---

### Hypothese 1: Lead-in-Startposition wird im selben Frame vernichtet

**These:**
`_transition()` setzt `_camT = focusT + leadInDt` (eine Lead-in-Distanz *vor* dem Racer). Noch im *selben* `update()`-Aufruf wird dieser Wert durch die Entry-Alignment-Logik (Zeilen 429–450) sofort wieder überschrieben. Das Pan-Ziel während der Lead-in-Phase zeigt deshalb *hinter* den Racer, nicht davor.

**Code-Pfad im Detail (eine `update()`-Iteration nach Transition):**

```
_transition() → Zeile 659–660:
  speedPerFrame = focusT - _prevFocusT   (gemessene Racer-Geschwindigkeit)
  _camT = focusT + speedPerFrame * 60 * leadInDuration  ← VORNE

SELBER update()-Aufruf, Zeilen 429–450:
  if (_lerpPhase === 'entry' && _camT !== null && !isOpenTrack && shape) {
    fT = fr[0]?.t   ← leader.t (aktuelle Position)
    _camT = fT      ← SOFORT ÜBERSCHRIEBEN
    _prevFocusT = fT
  }

_setTargets() → Zeile 802–803:
  panTarget = shape.getPosition(_camT, 0)  ← benutzt fT, NICHT focusT+leadInDt
```

**Was danach passiert:**

Nach Konvergenz (Entry→Tracking, Zeile 473–474):
```javascript
this._lerpPhase = 'tracking';
this._leadInStartTs = ts;  // ← Timer RESET auf jetzt
```

`_computePhasedPanTarget()` prüft (Zeile 931):
```javascript
const elapsed = ts - (this._leadInStartTs ?? ts);  // elapsed ≈ 0 (gerade resettet)
if (elapsed >= prof.leadInDuration * 1000) { /* follow */ }
else {
  this._prevFocusT = focusT;
  return;  // ← 1,0s lang nichts tun
}
```

Während der Lead-in-Phase (Tracking-Phase, 1,0 s lang):
- `_computePhasedPanTarget()` gibt early return
- `_camT` wird NICHT aktualisiert (entry alignment läuft nur bei `_lerpPhase === 'entry'`)
- `_setTargets()` benutzt frozen `_camT` = Position des Racers bei Tracking-Start
- Racer bewegt sich weiter; Kamera schaut auf die alte Position

**Evidence:**
- `_transition()` Zeile 659–660: `this._camT = focusT + leadInDt`
- `update()` Zeile 429–448: Entry-Alignment überschreibt `_camT = fT` im selben Call
- `update()` Zeile 474: `this._leadInStartTs = ts` — Timer-Reset nach Konvergenz
- `_computePhasedPanTarget()` Zeile 865: `if (this._lerpPhase !== 'tracking') return;` — läuft nicht während entry
- `_computePhasedPanTarget()` Zeile 934–938: Lead-in gibt early return; `_camT` bleibt eingefroren

**Auswirkung bei aktuellem Zoom-Setup:**

Annahmen: `referenceSpriteSize ≈ 30px`, `bsX = 1.0`, `leaderZoom ≈ 2.16` (aus `0.09 * 720 / 30 = 2.16`). Sichtbarer Weltausschnitt: `1280 / 2.16 ≈ 593px` breit → halbe Breite ≈ 297px.

Typische Racer-Geschwindigkeit: wenn `speedPerFrame ≈ 0.003 t/frame` (schnell) und Track-Umfang ≈ 4000px effektiv, dann ≈ 12px/frame Weltbewegung = 720px/s.

In 1,0s Lead-in auf einem Geraden: Racer bewegt sich ≈ 720px entlang Weltkoordinate-X. Bei Zoom 2.16: Kamera verfehlt den Racer um 720px in Weltkoordinaten → **weit außerhalb der 297px-Halbbreite → Off-Screen.**

Auch bei langsamen Racern (z.B. 200px/s): 200px in 1,0s. Bei Zoom 2.16 ist die sichtbare Halbbreite 297px. Racer bleibt noch sichtbar, verlässt aber den Inner-Frame (70% × 297px = 208px) sofort.

**Falsifizierbar durch:**
Wenn das Problem auch bei `leadInDuration = 0` (im DevPanel auf 0 setzen) auftritt, ist H1 *nicht* die Ursache (da kein Lead-in-Freeze existiert). Wenn das Problem bei `leadInDuration = 0` verschwindet, ist H1 bestätigt.

**Confidence: Hoch**

---

### Hypothese 2: Convergence Gate bypasst Pan-Check bei aktivem phasedObserver

**These:**
Wenn `phasedActive = true` (closed track mit shape + `_camT !== null`), wird die Pan-Konvergenz-Bedingung im Entry-Gate vollständig übersprungen. Die Entry→Tracking-Transition erfolgt sobald nur der *Zoom* konvergiert ist, unabhängig davon, wie weit die Kamera noch vom Pan-Ziel entfernt ist.

**Code (Zeilen 468–472):**
```javascript
const phasedActive = this._camT !== null && !this._isOpenTrack && this._shape;
const zoomConverged = this._lastEntryDeltaZoom < this._entryConvergenceZoom;
const xConverged = phasedActive || this._lastEntryDeltaX < this._entryConvergencePx;
const yConverged = phasedActive || this._lastEntryDeltaY < this._entryConvergencePx;
if (zoomConverged && xConverged && yConverged) {
  this._lerpPhase = 'tracking';
  this._leadInStartTs = ts;
```

Wenn `phasedActive = true`: `xConverged = true` und `yConverged = true` immer, unabhängig von `_lastEntryDeltaX` und `_lastEntryDeltaY`.

**Ursache des Bypasses (Kommentar Zeile 465–467):**
```
// When phased observer is active, _camT tracks focusT (above), so targetOffsetX
// moves with the racers every frame — the pixel lag cannot converge to the fixed
// threshold regardless of zoom factor (H-E).
```

Die Begründung ist korrekt: während Entry bewegt sich `_camT = fT` jedes Frame mit dem Racer → `targetOffsetX` ist immer der laufenden Racer-Position → die Delta-Messung (`_lastEntryDeltaX`) bleibt hoch, weil sie den Pan vs. Target auf jeder Frame misst, nicht die Konvergenz zu einer Ruhepositon.

**Problem:** Das Bypass-Flag bleibt `true` in *derselben* `_camT`-Variablen, die danach im Lead-in eingefroren wird. Das bedeutet: die Konvergenz-Aussage „wenn phasedActive, dann gilt pan als konvergiert" ist korrekt für die *Entry-Phase*, aber sie bedeutet auch, dass **Tracking beginnt, bevor die Kamera räumlich an den Racer herangekommen ist** — und damit beginnt die Lead-in-Freeze mit potenziell großem räumlichem Rückstand.

**Evidence:**
- Zeilen 468–472: `phasedActive`-Short-Circuit für `xConverged`/`yConverged`
- Zeile 429–450: Entry-Alignment begründet den Bypass korrekt (Target bewegt sich)
- Zeilen 474: `_leadInStartTs = ts` direkt nach Konvergenz → Lead-in startet mit vorhandenem Lag

**Auswirkung:**
Entry-Phase mit TC=0.8s und Zoom von 1.0 → 2.16: Zoom konvergiert nach ~74 Frames (1,23s). Während dieser Zeit folgt `offsetX` dem laufenden Racer, ist aber wegen Entry-TC (langsam) permanent ~1–3 Frames hinter dem Target. Beim Wechsel zu Tracking ist `offsetX` ~40–80 Screen-Pixel hinter dem Racer. Die Lead-in-Freeze fixiert diese Lücke und der Racer läuft weiter heraus.

**Falsifizierbar durch:**
Wenn das Problem bei sehr kleinen Racer-Geschwindigkeiten (langsame Tracks) wegfällt, wäre H2 der Haupttreiber. Bei schnellen Tracks: H2 verstärkt H1.

**Confidence: Hoch** (verschärft H1, wirkt nicht unabhängig)

---

### Hypothese 3: Pan-Target-Lag während Zoom-Transition (Zoom-Pan-Race)

**These:**
`_setClosedTrackTargets()` berechnet `targetOffsetX` mit `currEffZoom = this.zoom * this._bsX` — dem *aktuellen* Zoom vor dem Lerp-Schritt. Da Zoom und Pan mit demselben Faktor lerpen, aber der Pan-Target eine Funktion des aktuell-lerpenden Zooms ist, entsteht ein systematischer Ein-Frame-Lag.

**Code (Zeilen 750–760):**
```javascript
const currEffZoom = Math.max(this.zoom * this._bsX, minEffZoom);  // ← pre-lerp zoom
const panResolved = resolveCamera({ desiredEffZoom: currEffZoom, ... });
this.targetOffsetX = -panResolved.camX * panResolved.effectiveZoom;
// Danach:
this.zoom += (this.targetZoom - this.zoom) * lf;          // zoom lerpt
this.offsetX += (this.targetOffsetX - this.offsetX) * lf; // pan lerpt zu veralteter Basis
```

Das Pan-Ziel auf Frame N basiert auf `zoom_N` (vor Lerp). Auf Frame N+1 ist `zoom_{N+1} = zoom_N + Δzoom`. Das „korrekte" Pan für `zoom_{N+1}` wäre `f(zoom_{N+1})`, aber `targetOffsetX` wurde mit `f(zoom_N)` berechnet. `offsetX` lerpt zu einem veralteten Ziel.

**Quantifizierung:**

Für den unklampierten Fall (Racer weit genug vom Weltrand): `targetOffsetX ≈ -racer.x × effZoom + canvasW/2` (linear in effZoom).

Lag in Screen-Pixeln ≈ `(racer.x - worldW/2) × Δzoom_per_frame`

Bei Entry-TC=0.8s, Δzoom_max am Frame 0 = `(2.16 - 1.0) × lf ≈ 1.16 × 0.047 = 0.055`.
Bei Racer 200px außerhalb Bildmitte: Lag Frame 0 ≈ `200 × 0.055 = 11px`. Gering.

**Kritischer Punkt: World-Edge-Clamping bei kleinem Zoom**

Bei Overview-Zoom (effZoom=bsX=1.0) kann das Kamera-Pan nicht erfolgen, weil `camXMax = max(0, worldW - canvasW/effZoom) = 0`. Pan ist clamped auf 0. Wenn Zoom über den „Unclamp-Schwellwert" steigt (Racer kann erstmals zentriert werden), springt `targetOffsetX` schlagartig von 0 auf einen signifikanten Wert.

Unclamp-Schwellwert für Racer bei worldX=700 auf worldW=1280:
`effZoom_unclamp = canvasW / (2 * (worldW - racer.x)) = 1280 / (2 × 580) ≈ 1.10`

Unterhalb 1.10: targetOffset = 0. Direkt darüber: targetOffset springt auf > 100px. Der Pan hat keine Vorwarnung — er muss von 0 aus nachholen.

**Auswirkung bei aktuellem Zoom-Setup:**

Berechnung: Racer worldX=700, OVERVIEW→LEADER (zoom 1.0→2.16, lf=0.047/Frame):

| Frame | effZoom | targetOffset (px) | offsetX (px) | Racer-Screen-X |
|-------|---------|-------------------|--------------|----------------|
| 0 | 1.000 | 0 | 0 | 700 |
| 1 | 1.054 | –69 | –3.2 | 1082→ |
| 10 | 1.475 | –405 | –98 | 1079→ |
| 20 | 1.840 | –681 | –267 | 1117→ |
| 30 | 2.077 | –856 | –443 | 873 |
| 48 | 2.155 | –930 | –634 | 605 ✓ |

Racer bei worldX=700 bleibt bei diesem Beispiel auf dem Bildschirm (screen x < 1280), kommt aber sehr nah heran. Bei worldX=900 (260px rechts von Mitte) wäre Racer bei Frame 10–20 rechts von screen x=1280: **Off-Screen**.

Diese Hypothese ist relevant für Racer, die zum Zeitpunkt der Transition stark außermittig sind (Geraden nahe Weltrand, enge Kurven).

**Falsifizierbar durch:**
Wenn das Problem nur bei Racern auftritt, die weit außerhalb der Bildschirmmitte sind (Nähe zum Weltrand), ist H3 ein Faktor. Wenn es auch in Bildmitte auftritt, ist H3 allein nicht ausreichend.

**Confidence: Mittel** (verstärkender Faktor, selten alleinige Ursache)

---

### Hypothese 4: Follow-Phase-Snap nach 1,0s Lead-in

**These:**
Der Übergang von Lead-in zu Follow setzt `this.offsetX` und `this.targetOffsetX` direkt (kein Lerp). Wenn die Kamera während der Lead-in-Phase den Racer verloren hat, korrigiert der Snap die Kamera schlagartig zum Racer zurück. Visuell: Racer springt aus dem Off zurück ins Bild.

**Code (Zeilen 970–975):**
```javascript
// Follow phase in _computePhasedPanTarget():
this.offsetX = this.targetOffsetX = -resolved.camX * resolved.effectiveZoom;
this.offsetY = this.targetOffsetY = this._closedOffsetY(camPos.y, ...);
```

Dies sind direkte Assignments auf die Live-Werte `this.offsetX` und `this.targetOffsetX` — keine Lerp-Annäherung. In derselben Renderfunktion, nach Rückkehr zu `update()`, werden die bereits gesnappten `offsetX/Y` zurückgegeben.

**Zusammenspiel mit H1:**
- Lead-in (1,0s): Racer läuft aus dem Bild
- Follow-Übergang: Kamera springt zurück zum Racer (Snap)
- User-Wahrnehmung: „Racer verschwindet kurz, erscheint dann wieder"

**Evidence:**
- `_computePhasedPanTarget()` Zeile 970: `this.offsetX = this.targetOffsetX = ...`
- `update()` gibt `{ zoom: this.zoom, offsetX: this.offsetX, offsetY: this.offsetY }` zurück (Zeile 514)
- Kein Interpolation-Schritt zwischen Lead-in-Exit und Follow-Entry

**Auswirkung:**
Je länger die Lead-in-Phase und je schneller der Racer, desto größer der Snap. Bei 1,0s Lead-in und 720px/s Racer ≈ 720px Weltbewegung → bei Zoom 2.16 ≈ 1555 Screen-Pixel Snap in einem Frame.

**Falsifizierbar durch:**
Wenn der „Wiederauftaucht"-Moment abrupt ist (Racer springt schlagartig in die Mitte, nicht hinein-zoomed), ist H4 bestätigt. Wenn der Racer sanft wieder einfährt, ist H4 nicht der Follow-Snap.

**Confidence: Hoch** (erklärt „verschwindet, dann snap zurück" direkt)

---

### Hypothese 5: Open Track — Pan-Lag durch hardcoded 0.05-Lerp

**These:**
Auf Open Tracks wird Pan-Smoothing nicht aus dem CameraDirector-TC-System berechnet, sondern mit einem fixen Faktor 0.05 pro Frame in `RaceScreen/index.jsx:1132`. Dies entspricht einer effektiven Zeitkonstante von ca. 3,3s — rund 4× langsamer als Entry-TC=0.8s auf Closed Tracks.

**Code (`RaceScreen/index.jsx` Zeile 1132):**
```javascript
st.camX = isFinite(st.camX)
  ? st.camX + (resolved.camX - st.camX) * 0.05
  : resolved.camX;
```

`tcToLerpFactor(tc) = 0.05` → `tc ≈ 1/FRAME_RATE × log(0.1)/log(1-0.05) ≈ 3.3s`

Der phased Observer (Lead-in/Follow/Lead-out) ist auf Open Tracks DEAKTIVIERT (Zeile 485–487):
```javascript
if (!this._isOpenTrack && this._camT !== null && this._shape) {
  this._computePhasedPanTarget(...);
}
```

H1-H4 gelten damit ausschließlich für **Closed Tracks**. Auf Open Tracks gibt es stattdessen einen permanenten langsamen Pan-Lag nach jeder Transition.

**Evidence:**
- `RaceScreen/index.jsx:1132`: Hardcoded 0.05
- `CameraDirector.js:485`: `if (!this._isOpenTrack && ...)`
- Kein `dt`-Scaling auf Open Track (Pan-TC nicht framerate-unabhängig)

**Falsifizierbar durch:**
Wenn der Bug ausschließlich auf Closed Tracks auftritt, schließt das H5 als Ursache des berichteten Bugs aus (und bestätigt H1–H4).

**Confidence: Niedrig** (erklärt ein anderes Problem, nicht das berichtete)

---

## Ranking nach Wahrscheinlichkeit

| Rang | Hypothese | Confidence | Unabhängig? | Erklärt Off-Screen? | Erklärt Snap zurück? |
|------|-----------|-----------|-------------|--------------------|--------------------|
| 1 | H1: Lead-in-Freeze zeigt hinter Racer | Hoch | Ja | Ja (bei schnellen Racern) | Nein (aber H4 erklärt das) |
| 2 | H4: Follow-Phase-Snap | Hoch | Nein (Konsequenz von H1) | Nein | Ja |
| 3 | H2: Convergence Gate Bypass | Hoch | Nein (verschärft H1) | Nein allein | Nein |
| 4 | H3: Pan-Target-Lag / World-Edge-Clamp | Mittel | Ja | Nur bei extremer Off-Center-Position | Nein |
| 5 | H5: Open Track hardcoded Lerp | Niedrig | Ja (anderes Problem) | Nein | Nein |

**Wahrscheinlichste Erklärung für das berichtete Bug-Muster:**

H1 + H2 + H4 zusammen erklären den vollständigen Bug-Zyklus:

1. **H2**: Entry→Tracking wechselt sobald Zoom konvergiert, ohne dass Pan vollständig konvergiert ist.
2. **H1**: Lead-in-Timer wird bei Tracking-Start resettet. `_camT` ist eingefroren. Kamera schaut auf die Racer-Position von vor 1,2s. Racer läuft aus dem Bild.
3. **H4**: Nach 1,0s Lead-in snappt Follow den Offset direkt auf den Racer → abruptes Wiedererscheinen.

---

## Empfehlung: Verifikations-Reihenfolge

**Schritt 1 — Schnelltest ohne Browser-Test:**
Wert `leadInDuration` für LEADER_ZOOM im DevPanel auf `0.0` setzen. Wenn das Problem dadurch verschwindet, ist H1+H4 bestätigt. Kein Code nötig, reine Config-Änderung.

**Schritt 2 — Diagnostic Log:**
In `_computePhasedPanTarget()` vor dem Lead-in-Early-Return (Zeile 935) loggen: `console.log('[LEAD-IN] camT=', this._camT, 'focusT=', focusT, 'delta=', focusT - this._camT)`. Wenn `focusT - _camT` monoton wächst (Racer läuft weg von Frozen-Position), ist H1 direkt messbar ohne Browser-interaktion.

**Schritt 3 — Convergence-Gate-Check:**
`_lastEntryDeltaX` und `_lastEntryDeltaY` zu dem Zeitpunkt loggen, wenn `_lerpPhase` von `'entry'` auf `'tracking'` wechselt. Wenn die Werte > 50px sind, bestätigt das H2 (Pan war noch nicht konvergiert als Lead-in startete).

---

## Offene Fragen

1. **`shape.getPosition(_camT, 0)` vs. `r0.x, r0.y`:** Während der Entry-Phase wird `panTarget = shape.getPosition(leader.t, 0)` berechnet. Wenn Racer physikalisch neben der Mittellinie laufen (Lane-Offset), könnte `shape.getPosition()` die Gleismitte zurückgeben, nicht die tatsächliche Racer-Position. Unklar ob dies ein relevanter Faktor ist — hängt davon ab, ob `r0.x/r0.y` aus dem Shape-Offset oder direkt aus Physik kommen.

2. **BATTLE→LEADER Zoom-Richtung:** Bei BATTLE→LEADER verringert sich der Zoom (Battle-Zoom > Leader-Zoom, da `spritePct` battle=0.14 > leader=0.09). H3 (Clamp-Übergang) wirkt bei Zoom-Verringerung anders als bei Zoom-Erhöhung — es wurde oben nur der OVERVIEW→LEADER-Fall quantifiziert.

3. **`_prevFocusT`-Qualität:** Die Lead-in-Startposition `focusT + speedPerFrame × 60 × leadInDuration` basiert auf `_prevFocusT` aus dem letzten Frame. Wenn der vorherige State ein OVERVIEW war (pan zu Schwerpunkt, nicht zum Leader), ist `_prevFocusT` möglicherweise nicht die Leader-Geschwindigkeit. Konkrete Initialisierung unklar.

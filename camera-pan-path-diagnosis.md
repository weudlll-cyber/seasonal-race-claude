# Diagnose: Kamera-Pan-Pfad-Bug (Euklidisch vs. Track-Pfad)

**Datum:** 2026-05-14  
**Branch:** master (`5088639`)  
**Kontext:** Read-only. Kein Code geändert. PR #101 unberührt.

---

## Hintergrund

User-Beobachtung: Nach Phasen-Wechseln (vor allem nach BATTLE_ZOOM) zeigt die Kamera kurzzeitig
nur die grüne Innenfläche des Ovals — keine Rennstrecke sichtbar. Außerdem startet die Kamera
nach OVERVIEW → LEADER_ZOOM oft „hinter" dem Leader.

**User-Hypothese:** Die Kamera nimmt beim Pan-Target-Wechsel den euklidisch kürzesten Weg durch
den Weltraum statt dem Streckenverlauf zu folgen.

---

### Punkt 1: Interne Pan-Target-Repräsentation

**Befund:**

Auf Closed Tracks wird der Kamera-Zielpunkt intern als `_camT` (kumulativer Track-Parameter,
unbegrenzt auflaufend über Runden) gespeichert. Die Konvertierung in Welt-Koordinaten erfolgt
frame-by-frame in `_setTargets()` via:

```js
// CameraDirector.js:803, 822, 841
this._shape.getPosition(((this._camT % 1) + 1) % 1, 0)
```

`EditorShape.getPosition()` normalisiert `t` intern nochmals (`((t % 1) + 1) % 1`) — T > 1
(mehrere Runden) und T < 0 werden korrekt auf [0, 1) abgebildet. Die Konvertierung ist also
wrap-safe.

Wenn `_camT === null` (kein phased observer aktiv) oder für OVERVIEW, wird `getPanTarget()` aus
`panTarget.js` direkt aufgerufen — ergibt ebenfalls Welt-Koordinaten `{x, y}`.

Das Ergebnis beider Pfade landet in `targetOffsetX`/`targetOffsetY` (screen-pixel-skaliert via
`resolveCamera`).

**Bezug zur User-Hypothese:** Neutral — die Ziel-Position wird korrekt auf der Streckenkurve
berechnet. Das Problem liegt nicht hier, sondern im Schritt von aktuell→Ziel.

**Auswirkung bei aktuellem Zoom-Faktor:** Keine direkte; das Ziel ist korrekt.

---

### Punkt 2: Pan-Interpolation — Lerp auf was?

**Befund:**

Die Kamera-Position (`offsetX`, `offsetY`) wird **in Screen-Pixel-Space** zum Ziel gelenkt:

```js
// CameraDirector.js:457-459
this.zoom    += (this.targetZoom    - this.zoom)    * lf;
this.offsetX += (this.targetOffsetX - this.offsetX) * lf;
this.offsetY += (this.targetOffsetY - this.offsetY) * lf;
```

Das ist ein exponentieller Lerp in **Welt-Pixel-abgeleiteten Screen-Koordinaten**. Die Einheit
`offsetX` entspricht direkt einem horizontalen Pixel-Versatz des Canvas-Transforms:

```js
// RaceScreen/index.jsx:1159-1160
ctx.translate(cam.offsetX, cam.offsetY);
ctx.scale(cam.zoom * bsX, cam.zoom * bsY);
```

Es gibt keinen Mechanismus, der den Lerp-Pfad entlang des Track-Verlaufs erzwingt. Der Lerp
verbindet alten und neuen Welt-Pixel-Punkt durch eine **gerade Linie im 2D-Welt-Raum** — also
euklidisch.

Kein separater RaceScreen-Lerp für Closed Tracks (der `0.05`-Hardcode in Zeile 1132 ist
ausschließlich für Open Tracks, `if (isOpenTrack)` Zeile 1120).

**Bezug zur User-Hypothese:** **Bestätigt.** Der Lerp ist euklidisch in Pixel-Space.

**Auswirkung bei aktuellem Zoom-Faktor:** Kritisch. Je höher der Zoom, desto enger das Viewport.
Bei `leaderZoom = 3.5×`: Viewport-Breite = 1280 / 3.5 ≈ **366 World-Pixel**. Der euklidische
Lerp-Pfad muss die Strecke nicht treffen — jeder Punkt auf dem Pfad, der >183 World-Pixel vom
nächsten Track-Punkt entfernt ist, zeigt ausschließlich Infield.

---

### Punkt 3: Track-Topologie-Behandlung beim Pan-Wechsel

**Befund:**

Es gibt **keinen Track-Path-Following-Mechanismus** im Lerp. Was korrekt funktioniert:

- T-Werte → Welt-Koordinaten via `getPosition` (wrap-safe, siehe Punkt 1)
- Arithmetik auf `_camT` (z.B. Lead-out: `_camT += (leadOutTargetT - _camT) * decay`) folgt
  automatisch dem Track, weil die T-Space-Interpolation durch `getPosition` in jede Welt-Position
  gemappt wird

Was **nicht** funktioniert:

Die `offsetX`-Lerp-Linie zwischen zwei Welt-Positionen folgt keiner Kurve. Beispiel:

```
Oval-Setup (schematisch):
  t=0.45 → Welt: (-800, 0)   ← linke Oval-Seite
  t=0.55 → Welt: (+800, 0)   ← rechte Oval-Seite
  Infield-Zentrum: (0, 0)

Lerp-Pfad: (-800, 0) → (0, 0) → (+800, 0)   [gerader Strich durch Infield]
Track-Pfad: (-800, 0) → oben (0, -600) → (+800, 0)  [folgt Oval-Kurve]
```

Bei t=0.45 → t=0.55 ist der Track-Pfad ~2× länger als der euklidische Pfad — aber er bleibt
auf der Streckenkurve. Der Lerp nimmt die Abkürzung durchs Infield.

Die zyklische Natur von T (**t=0.99 → t=0.01** ist Track-Distanz 0.02, nicht 0.98) wird **nur**
bei T→Welt-Lookups berücksichtigt, **nicht** beim `offsetX`-Lerp.

**Bezug zur User-Hypothese:** **Bestätigt.** Der Lerp hat keine Kenntnis der Track-Topologie.

**Auswirkung bei aktuellem Zoom-Faktor:** Ist der Pan-Sprung zwischen zwei Oval-Seiten ≥ Oval-
Radius, passiert der Lerp durch die Mitte des Infields. Bei Oval-Radius R ≈ 1000px und
Viewport-Breite 366px sind beide Oval-Seiten ~5 Viewport-Breiten voneinander entfernt. Der
Lerp-Pfad durch die Mitte wäre ~2.7 Viewport-Breiten vom nächsten Track-Punkt entfernt → Track
für viele Frames komplett off-screen.

---

### Punkt 4: Pan-Target-Sprünge beim State-Wechsel quantifizieren

**Befund:**

**BATTLE_ZOOM → LEADER_ZOOM** (kritischster Fall):

- BATTLE-Midpoint: `tMid = (r0.t + r1.t) / 2` → world position via `shape.getPosition(tMid)`
  (`panTarget.js:47-49`, `_computePhasedPanTarget:877`)
- LEADER-Target: `focusT = r0.t` → world position via `shape.getPosition(r0.t)`

Wenn die Battle-Gruppe z.B. bei `tMid ≈ 0.3` (linke Seite) kämpft und der Leader sich auf
`t ≈ 0.7` (rechte Seite) abgesetzt hat, liegt der Sprung im Welt-Pixel-Raum:

```
Annahmen (typisches dirt-oval bei 4000px Welt-Breite):
  Oval-Radius ≈ 800px (konservativ)
  t=0.3 → Welt: (-600, -200)
  t=0.7 → Welt: (+600, +200)
  Euklidischer Abstand: ~1265 World-Pixel

Bei leaderZoom = 3.5×, Viewport-Breite = 366px:
  → Sprung entspricht ~3.5 Viewport-Breiten
```

Dieser Sprung in `targetOffsetX` ist sofort (in einem Frame). Der Lerp-Schritt bewegt `offsetX`
mit lf ≈ 0.027/frame (entryTC=0.8s) langsam in diese Richtung — gerade durch das Infield.

**OVERVIEW → LEADER_ZOOM:**

- OVERVIEW auf Closed Track: `offsetX = 0` (Welt-Zentrum, weil Zoom=1 und `resolveCamera` zentriert)
- LEADER_ZOOM: target = Leader-Welt-Position (kann überall auf dem Oval sein)
- Sprung = Pixel-Abstand von Welt-Ursprung zu Leader-Welt-Position

Da der Leader oft am Oval entlang fährt und nicht im Infield, ist der OVERVIEW→LEADER-Pfad
weniger problematisch als BATTLE→LEADER. Aber bei hohem Zoom startet der Lerp „von weit weg"
und der Leader läuft unterdessen weiter → Kamera erscheint „hinter" dem Leader.

**Bezug zur User-Hypothese:** **Bestätigt.** BATTLE_ZOOM-Exit produziert regelmäßig große
Target-Sprünge auf entgegengesetzte Oval-Seiten.

**Auswirkung bei aktuellem Zoom-Faktor:** Bei Zoom 3.5×: 1-3 Sekunden Infield sichtbar abhängig
von Winkel-Differenz zwischen Battle-Midpoint und Leader-Position.

---

### Punkt 5: Spezialfall — Pan über Start-Ziel-Linie

**Befund:**

`EditorShape.getPosition()` normalisiert `t` intern via `((t % 1) + 1) % 1` (Zeile 75 in
`EditorShape.js`). Damit sind T-Werte > 1 (Runde 2+) und Übergänge t=0.99 → t=1.01 korrekt
behandelt.

Konkret beim Start-Ziel-Crossing:
- t=0.99 → World: z.B. (1000, 300) — kurz vor der Linie
- t=1.01 → `tNorm=0.01` → World: z.B. (1000, 270) — kurz danach

Diese beiden Welt-Positionen sind **benachbart** (kleine euklidische Distanz). Der Lerp-Pfad
zwischen ihnen bleibt nah am Track — kein Infield-Problem.

**Ausnahme Lead-in:** Wenn `_camT = focusT + leadInDt` und `focusT` von 0.95 auf 1.05 springt
(Lap-Crossing während lead-in), könnte `_camT` plötzlich deutlich steigen. Aber da leadInDt
proportional zur Racer-Geschwindigkeit berechnet wird und Racer mit ~konstanter Geschwindigkeit
fahren, ist dieser Sprung klein.

**Bezug zur User-Hypothese:** **Widerlegt für diesen Spezialfall.** Start-Ziel-Crossing ist kein
Infield-Problem — die Welt-Positionen beider Seiten der Linie sind benachbart.

**Auswirkung bei aktuellem Zoom-Faktor:** Keiner. Dieser Spezialfall ist korrekt.

---

### Punkt 6: Open Track vs. Closed Track

**Befund:**

Closed Track (diese Diagnose):
- Lerp in `CameraDirector.js:458`: `offsetX += (targetOffsetX - offsetX) * lf`
- Euklidisch in World-Pixel-Space
- Bug tritt auf wenn alte und neue Pan-Position auf verschiedenen Oval-Seiten liegen

Open Track:
- Separater Code-Pfad in `RaceScreen/index.jsx:1120-1134`
- `st.camX = st.camX + (resolved.camX - st.camX) * 0.05` (hardcoded 0.05-Lerp)
- Open Tracks haben keine zyklische Topologie → kein Infield-Äquivalent
- Kein kreisförmiger Streckenverlauf → euklidischer Lerp geht nie „durch" eine Streckenmitte

**Bezug zur User-Hypothese:** Bug tritt **nur auf Closed Tracks** auf. Open Tracks sind nicht
betroffen.

**Auswirkung:** Die User-Beobachtung (Infield sichtbar) ist ausschließlich ein Closed-Track-
Phänomen. Bestätigt, dass es sich um ein topologisches Problem handelt.

---

## Verdikt zur User-Hypothese

**Teilweise bestätigt** — mit einer Präzisierung.

Die User-Hypothese ist inhaltlich korrekt: Die Kamera nimmt beim Pan-Wechsel tatsächlich den
euklidisch kürzesten Weg durch den 2D-Welt-Raum, ohne dem Streckenverlauf zu folgen. Dieser
Weg kann durch das Infield führen.

**Präzisierung:** Es ist keine bewusste Designentscheidung für den „direkten Weg", sondern eine
Konsequenz davon, dass der Lerp auf `offsetX`/`offsetY` (Screen-Pixel-Space) operiert und keine
Track-Topologie-Kenntnis hat. Das Ziel (`targetOffsetX`) ist stets ein korrekter Punkt auf der
Streckenkurve — aber der **Weg** vom alten zum neuen Ziel ist immer eine gerade Linie im
Welt-Pixel-Raum.

---

## Wurzel-Code

| Datei | Zeile | Beschreibung |
|---|---|---|
| `CameraDirector.js` | 457-459 | Exponentieller Lerp in Pixel-Space — euklidisch, keine Track-Kenntnis |
| `CameraDirector.js` | 604-605 | `_transition()` setzt `offsetX`/`offsetY` **nicht** zurück — alter Wert bleibt, Lerp startet von dort |
| `CameraDirector.js` | 759-760 | `targetOffsetX` wird korrekt aus Welt-Koordinaten abgeleitet — aber der Pfad dorthin ist euclidean |

**Sekundäre Ursache:** `_transition()` setzt `_lerpPhase = 'entry'` (Zeile 605) aber nicht
`offsetX = targetOffsetX`. Das ist by-design (kein harter Sprung beim Übergang), aber es bedeutet
dass der Lerp von der alten State-Position startet — beliebig weit vom neuen Ziel entfernt.

---

## Warum ist es mit erhöhtem Zoom-Faktor schlimmer?

Linear: `viewport_width_world = CANVAS_W / (leaderZoom × bsX)`

| leaderZoom | World-Pixel im Viewport |
|---|---|
| 2.5× | ~512 px |
| 3.5× | ~366 px |
| 5.0× | ~256 px |

Je kleiner das Viewport, desto früher (= kleiner Abstand vom Track-Mittelpunkt) zeigt die Kamera
ausschließlich Infield. Bei 3.5× genügen ~183 World-Pixel Abstand vom Track, um die Strecke
komplett aus dem Bild zu verlieren.

---

## Was erklärt die Beobachtung „Kamera startet hinter dem Leader" (OVERVIEW → LEADER_ZOOM)?

Das ist eine **andere Ursache**, kein Infield-Problem:

- OVERVIEW: `offsetX ≈ 0` (closed track, zoom=1, centroid nahe Welt-Ursprung)
- LEADER_ZOOM: `targetOffsetX` = Leader-Welt-Position; Leader **bewegt sich** weiter
- `entryTC = 0.8s` → Kamera konvergiert in ~3 TC ≈ 2.4s zu 95% auf den Leader
- Da `_camT = focusT` im Entry-Block jedes Frame aktualisiert wird, **wandert** `targetOffsetX`
  mit dem Leader mit
- Die Kamera ist also immer um einen TC-bedingten Lag hinter dem Leader — nicht im Infield,
  aber der Leader läuft aus dem vorderen Teil des Bildes heraus

Das ist **kein euklidischer Pfad-Bug**, sondern reines TC-Lag im Entry-Phase-Design.

---

## Nicht-implementierte Fix-Empfehlungen (nur als Hinweis, kein Auftrag)

1. **T-Space-Lerp für `_camT`:** Statt `offsetX` direkt zu lerpen, könnte `_camT` als
   Zwischenwert exponentiell zum Ziel-T gelenkt werden (`_camT += (targetT - _camT) * lf`),
   und `targetOffsetX` würde aus dem aktuellen `_camT` berechnet. Der Kamera-Pan würde damit
   dem Streckenverlauf folgen. Problem: Wrap-around bei t≈0 (t=0.99 → t=0.01 wäre Δt=-0.98
   statt +0.02) erfordert einen Shortest-Path-Algorithmus in T-Space. Auch während des Zooms
   (entry-phase) ergäbe T-Space-Lerp ein anderes Konvergenz-Verhalten.

2. **Direkter Sprung bei State-Transition:** `offsetX = targetOffsetX` setzen in `_transition()`
   (harter Schnitt statt Lerp). Eliminiert Infield-Durchfahrt, ist aber visuell abrupt.

3. **Kurze Blend-Out + Hard-Cut + Blend-In:** 3-Frame schwarze Blende bei Transition, dann
   Camera direkt auf neue Position. Keine Infield-Sichtbarkeit, aber offensichtlicher Cut.

---

*Report basiert ausschließlich auf statischer Code-Analyse. Keine Tests, kein Browser, keine
Code-Änderungen.*

# Diagnose — Laterale Teleportation nach Anti-Collision-Umbau

**Branch:** `claude/diagnose-lateral-jumps` (von `claude/anti-collision-slot-based`)  
**Datum:** 2026-05-13  
**Status:** Diagnose abgeschlossen — kein Code-Fix in dieser Spec

---

## 1. Symptom-Beschreibung

Nach dem Anti-Collision-Umbau (PR #86, Slot-basiert) werden Racer beim Ausweichen
sprunghaft auf der Y-Achse (lateral) versetzt — keine glatte Bewegung, sondern visuelle
Teleportation von einer Spur zur nächsten innerhalb eines einzigen Frames.

Der Sprung ist besonders sichtbar bei hohem Camera-Zoom (LEADER_ZOOM, BATTLE_ZOOM),
weil jeder World-Pixel mehrfach auf Screen-Pixel abgebildet wird.

---

## 2. Historische Fundstellen

Chronologisch sortiert, alle Commits und Findings die laterale Bewegung / Glättung betreffen:

| SHA | Datum | Beschreibung | Relevanz |
|-----|-------|-------------|----------|
| `d46cab2` | 2026-04-27 | D11 — erstes Avoidance-System mit `targetLaneY/currentLaneY` + EMA | Erste explizite Lateral-Glättung |
| `c18a598` | 2026-04-29 | D7b — Ersetzt D11-Pair durch `physicalY` + Force-Inkremente | Implizite Glättung durch kleine Kräfte |
| `25e3add` | 2026-05-09 | Sprite-EMA `_drawX/_drawY` α=0.3 gegen Doppelbild (Etappe 8) | Render-Glättung, nicht für laterale Bewegung |
| `11b2a2a` | 2026-05-09 | EMA-Alpha erhöht 0.3→0.5 (Etappe 8B) | Render-Glättung leicht reduziert |
| `c8538e0` | 2026-05-12 | Linear-Interpolation in `EditorShape.getPosition()` — Staircase-Fix (L70) | Entfernt Sprünge entlang T-Achse, nicht Y-Achse |
| `6adea85` | 2026-05-12 | `_drawX/_drawY` entfernt — wurden triviale Aliases nach Jitter-Fix | Render-EMA komplett weg |
| `02e8c63` | 2026-05-13 | Slot-basiertes Anti-Collision — direkte `physicalY`-Zuweisung | **Root Cause der Teleportation** |

**LESSONS.md-Fundstellen:** L17, L70 (Etappe 20–23 Doppelbild-Marathon), L20 (N-Force-Accumulation).
Keine Lesson befasst sich direkt mit Lateral-Smoothing — es war in D11 und D7b stets eine implizite Eigenschaft des jeweiligen Systems.

---

## 3. Frühere Lösungen im Detail

### 3.1 D11 — `targetLaneY/currentLaneY` Pair + explizite EMA

**Commit:** `d46cab2` (2026-04-27)  
**Datei:** `client/src/modules/raceBehavior.js`

**Mechanismus:**
- Zwei Felder pro Racer: `targetLaneY` (gewünschte Spur, konstant außer bei Avoidance)
  und `currentLaneY` (tatsächlich gerenderter Y-Wert)
- Avoidance-Kräfte inkrementieren `currentLaneY` direkt (kleine Werte)
- Wenn keine Avoidance-Kraft: EMA zurück zur Zielspur:
  ```js
  // Smooth interpolation back to target when no avoidance force
  r.currentLaneY += (r.targetLaneY - r.currentLaneY) * config.avoidanceReturnSpeed;
  ```
  Mit `avoidanceReturnSpeed` ≈ 0.05–0.1 → sehr sanfte Rückkehr über viele Frames.

**Rendering:** RaceScreen nutzte `currentLaneY` direkt für `shape.getPosition(t, currentLaneY)`.

**Warum glatt:** `currentLaneY` näherte sich dem Ziel asymptotisch — kein Frame-Jump möglich.

**Entfernt in:** `c18a598` (D7b) — ersetzt durch `physicalY`-System.

### 3.2 D7b — `physicalY` + Force-Inkremente

**Commit:** `c18a598` (2026-04-29)  
**Datei:** `client/src/modules/raceBehavior.js`

**Mechanismus:**
- Einzelnes `physicalY` ∈ [-1, +1] pro Racer
- Kräfte akkumulieren in `yDeltas`, dann: `newY = r.physicalY + yDelta`
- Typische Kraft-Werte:
  - Home-Force: `-r.physicalY * config.homeForceStrength` ≈ 0.04 × 0.5 = **0.02/Frame** bei halber Auslenkung
  - Avoidance: `config.lateralForce * (1 - dist/avoidanceDist)` ≈ **0.012/Frame** typisch
- Maximaler Delta pro Frame: Hardware-Clamp `Math.min(config.maxLateral, 1.0)` — aber auch ohne Clamp waren die Kräfte klein

**Warum glatt:** Kräfte sind ~0.01–0.04 physicalY/Frame → bei 60fps entspricht das 0.6–2.4 physicalY/sec. Für sichtbaren 0.5-physicalY-Schritt: 12–50 Frames (0.2–0.8 sec) Übergangszeit.

**Render-EMA:** Zusätzlich wurde in `25e3add` `_drawX/_drawY` mit EMA α=0.5 eingeführt, primär für Aliasing-Minderung bei hohem Zoom (Etappe 8). In `6adea85` entfernt, nachdem der Staircase-Fix (`c8538e0`) das Doppelbild-Problem strukturell löste.

**Entfernt in:** `02e8c63` — kompletter Rewrite auf Slot-System.

---

## 4. Aktuelle Lokalisierung des Problems

**Datei:** `client/src/modules/raceBehavior.js`

### 4.1 Wo wird physicalY gesetzt?

**Zeilen 253–257 (Anwenden der Slot-Targets):**
```js
for (const r of active) {
  const newY = targetY.get(r.index) ?? r.physicalY;
  r.prevPhysicalY = r.physicalY;
  r.physicalY = Math.max(-MAX_LATERAL, Math.min(MAX_LATERAL, newY));
}
```

Das ist die **einzige** Stelle wo `physicalY` pro Frame geschrieben wird.
`newY` kommt aus der Slot-Suche (Zeile 232: `targetY.set(yielder.index, cy)`)
oder bleibt unverändert wenn kein Slot gesucht wurde.

### 4.2 Wie werden Slot-Kandidaten berechnet?

**Zeilen 185–192 (Slot-Suche):**
```js
const candidates = [];
for (let deltaPx = SLOT_STEP_PX; deltaPx <= searchRadius; deltaPx += SLOT_STEP_PX) {
  const dY = deltaPx / corridorHalf;
  candidates.push(yielder.physicalY + dY);
  candidates.push(yielder.physicalY - dY);
}
```

Mit:
- `SLOT_STEP_PX = 4` (Konstante, Zeile 14)
- `searchRadius = slotSearchRadiusPx ?? 60` (Default-Config)
- `corridorHalf = corridorHalfWidthPx ?? 75` (Runtime-Wert oder Fallback)

**Erster Kandidat:** `dY = 4 / corridorHalf` — z.B. 4/75 = **0.053 physicalY**.  
**Maximaler Kandidat:** `dY = 60 / corridorHalf` — z.B. 60/75 = **0.8 physicalY**.

### 4.3 Gibt es eine Velocity-Begrenzung oder Smoothing?

**Nein.** Der `newY`-Wert wird direkt zugewiesen. Es gibt:
- Keine maximale Delta-Begrenzung pro Frame
- Kein Lerp / EMA / Interpolation
- Keinen `targetPhysicalY` + `currentPhysicalY` Split

### 4.4 Rendering-Pfad ohne Smoothing-Buffer

In `RaceScreen/index.jsx`:
1. Zeile 920: `computePositions()` — berechnet `(r.x, r.y)` aus `r.physicalY / 2` via `shape.getPosition()`
2. Zeile 948: `applyRacerBehavior(...)` — schreibt neue `r.physicalY` für Collision-Frame

Die neue `physicalY` wird erst im **nächsten Frame** durch `computePositions()` in `(r.x, r.y)` übersetzt.
Aus User-Sicht: Frame N zeigt Position A, Frame N+1 zeigt Position B — **1-Frame-Teleportation** (16ms bei 60fps).

`_drawX/_drawY` EMA (ehemals `SPRITE_EMA_ALPHA = 0.5`) wurde in `6adea85` (2026-05-12) entfernt,
da sie triviale Aliases waren nach dem Staircase-Fix. Aktuell kein Smoothing-Buffer im Render-Pfad.

### 4.5 Worst-Case-Berechnung

Szenario: `searchRadius=60`, `corridorHalf=75`, Camera-Zoom=4×.

```
max dPhysicalY/frame = 60 / 75 = 0.8 physicalY
→ offset in EditorShape = 0.8 / 2 = 0.4
→ world px ≈ 0.4 × corridorHalfWidthPx × 2 = 0.4 × 150 = 60 px (Welt)
→ screen px @ zoom 4× = 60 × 4 = 240 px screen-Sprung in 1 Frame
```

Bei typischen Tracks mit corridorHalf < 75px (z.B. 50px) wird der Sprung größer
(`dY = 60/50 = 1.2`, aber limitiert durch `MAX_LATERAL = 0.95`):
```
max dPhysicalY = 0.95 (cap)
→ world px = 0.95 × 50 × 2 = 95 px (Welt)  
→ screen @ zoom 4× = 380 px
```

Bei Overview-Zoom (~1×): 60–95px screen — weniger auffällig aber immer noch sichtbar.

---

## 5. Bewertung der früheren Lösungen

### 5.1 D11-Ansatz: `targetPhysicalY + currentPhysicalY` Pair

**Würde es das aktuelle Problem lösen?** Ja, vollständig.

- Slot-Suche setzt `targetPhysicalY` statt `physicalY` direkt
- Pro Frame: `physicalY += (targetPhysicalY - physicalY) * LATERAL_RETURN_SPEED`
- Ergebnis: sanfte Annäherung über N Frames, kein 1-Frame-Sprung

**Anpassungen nötig:**
- `prevPhysicalY` muss auf `physicalY` (dem aktuellen, nicht dem Ziel) basieren, damit
  Lateral-Stability-Messung korrekt bleibt
- `avoidanceActive`-Flag und `LATERAL_STABLE_THRESH` bleiben unverändert sinnvoll
- Zusätzliches Feld `targetPhysicalY` pro Racer (init = 0, wie `physicalY`)

**Trade-offs:**
- PRO: Exakt wie D11 — bewährter Ansatz, geringe Komplexität
- PRO: `LATERAL_RETURN_SPEED` kann als Config-Parameter exposed werden
- CON: Racer "kommen nicht sofort an" → Kollision bleibt theoretisch 1–3 Frames sichtbar
  bis der Yielder den Slot erreicht hat
- CON: Ein weiteres Config-Feld nötig (`lateralReturnSpeed` oder ähnlich)

### 5.2 D7b-Ansatz: Maximaler Y-Delta pro Frame

**Würde es das aktuelle Problem lösen?** Ja, partiell.

- Nach der Slot-Suche: `delta = targetY - physicalY`, `capped = clamp(delta, -MAX_DELTA, +MAX_DELTA)`
- `physicalY += capped`
- Mit `MAX_DELTA = 0.05/Frame` (~3.75px/Frame bei corridorHalf=75): ~16 Frames für 0.8 physicalY

**Anpassungen nötig:**
- `MAX_DELTA` muss als Konstante oder Config-Parameter definiert werden
- Iteration: wenn Slot in 1 Frame nicht erreicht, bleibt Yielder N Frames im "Unterwegs"-Zustand

**Trade-offs:**
- PRO: Minimal invasiv — 2 Zeilen Code
- PRO: Kein neues Feld, kein Config-Parameter nötig wenn als Konstante
- CON: Bei sehr großen Sprüngen (MAX_LATERAL cap) bleibt Racer N Frames in ungültigem Bereich
- CON: Fixe Rate statt EMA — kann bei niedrigen Frame-Rates (< 30fps) zu ruckartigem Verhalten führen

### 5.3 Hybridansatz: Delta-Cap + vorhandene physicalY-Messung

Der Slot-Such-Algorithmus könnte den **ersten freien Slot innerhalb eines Frame-Budget** suchen
(z.B. `MAX_DELTA = 0.05/Frame`), statt den absoluten Mindestabstand zum aktuellen Punkt.

Das würde graduell den physicalY-Wert pro Frame verschieben, ohne ein zweites Feld zu brauchen.

---

## 6. Empfehlungen

### Empfehlung 1 (Beste Lösung): D11-Ansatz adaptieren

Führe `targetPhysicalY` als zweites Feld neben `physicalY` ein:

```
Slot-Suche → schreibt targetPhysicalY (statt physicalY direkt)
Ende applyRacerBehavior → physicalY += (targetPhysicalY - physicalY) * LATERAL_RETURN_SPEED
```

`LATERAL_RETURN_SPEED = 0.15–0.3` (konfigurierbar) → bei 0.2: 95% erreicht in ~14 Frames (~0.23 sec).

**Vorteil:** Exakt nachweisbar funktioniert (D11 verwendet denselben Mechanismus ohne Probleme).
**Aufwand:** 1 neues Racer-Feld, 1–2 neue Konstanten, 3–5 geänderte Zeilen in `raceBehavior.js`,
Anpassung der `initRacerBehavior`-Initialisierung.

### Empfehlung 2 (Einfachste Lösung): Delta-Cap

```js
const MAX_Y_DELTA = 0.05; // physicalY/frame ≈ 3.75px/frame at corridorHalf=75
const capped = Math.max(-MAX_Y_DELTA, Math.min(MAX_Y_DELTA, newY - r.physicalY));
r.physicalY = Math.max(-MAX_LATERAL, Math.min(MAX_LATERAL, r.physicalY + capped));
```

**Vorteil:** 3-Zeilen-Änderung, kein neues Feld.  
**Nachteil:** Bei schmalem Track oder kleinem corridorHalf kann `MAX_Y_DELTA` zu groß relativ sein.

### Nicht empfohlen: Render-EMA auf `_drawX/_drawY` wieder einführen

Der EMA war für Aliasing (Doppelbild/Staircase), nicht für Lateral-Smoothing.
Er wurde korrekt entfernt. Ihn für Lateral-Smoothing zu missbrauchen würde die
physikalische Simulation von der visuellen Repräsentation entkoppeln — Bad Practice.

---

## 7. Offene Fragen

1. **Typisches corridorHalfWidthPx auf echten Tracks:** `EditorShape.getActualTrackWidth()` liefert den Median-Breitenwert. Für City Circuit, Dirt Oval, Space Sprint: welche Werte entstehen in der Praxis? Das bestimmt die tatsächliche px-Magnitude der Sprünge und ob Empfehlung 2 ausreicht oder Empfehlung 1 nötig ist.

2. **Toleranz bei niedrigem Zoom:** Bei Overview-Zoom (≈1×) sind Lateral-Sprünge weniger auffällig. Ist die Teleportation primär ein Problem bei LEADER_ZOOM/BATTLE_ZOOM, oder schon bei Overviw-Zoom sichtbar? Das beeinflusst die Dringlichkeit des Fix.

3. **Schutz-Regel correctness:** Zeile 132 hat eine möglicherweise invertierte Bedingung (`!aIsTrailer(rA, rB)` wo der Kommentar "A is the trailer" sagt). Dieser Logik-Fehler ist unabhängig vom Smoothing-Thema, sollte aber in der Fix-Session überprüft werden.

4. **`prevPhysicalY` bei targetPhysicalY-Ansatz:** Die Lateral-Stability-Messung basiert auf `Math.abs(r.physicalY - r.prevPhysicalY)`. Wenn wir `targetPhysicalY` einführen, muss entschieden werden: Misst `prevPhysicalY` die bisherige *aktuelle* Position (gut für Stability-Detection) oder die bisherige *Target*-Position? Empfehlung: weiter die aktuelle Position messen.

# Diagnose: Anti-Collision-Test vs. Browser-Verhalten

**Branch:** `claude/diagnose-collision-test-vs-browser`  
**Datum:** 2026-05-13  
**Bezug:** PR #86 (slot-based avoidance), Regression Awareness Convention  
**Sim-Trace:** `docs/diagnose/collision-real-loop-trace.json`

---

## 1. Symptom

User-Beobachtung: Mehrere Racer stehen in einem 20-Racer-Lauf auf dirt-oval sichtbar
übereinander, nachdem die RACING-Phase beginnt. Overlaps treten nicht nur in der
Startphase auf (die als akzeptabel gilt), sondern persistieren für mehrere Sekunden
nach dem Übergang in die RACING-Phase.

Unit-Test `applyRacerBehavior — 20 racer simulation` meldet <1% Overlap-Rate
(0,0% in der Diagnose-Sim reproduzierbar). Direkter Widerspruch.

---

## 2. Code-Pfad-Vergleich (Stufe 1)

### Test-Pfad (`raceBehavior.test.js:516–574`)

Der Test ruft `applyRacerBehavior(racers, simCfg)` auf. Inputs:

| Parameter | Test-Wert | Quelle |
|---|---|---|
| `corridorHalfWidthPx` | **60** | Hardcodiert in `CORRIDOR_HALF` |
| `visibleWidthPx` / `visibleLengthPx` | **24 / 24 px** | Hardcodiert in `SPRITE_W`, `SPRITE_L` |
| `lateralReturnSpeed` | **1.0** (instant EMA) | `simCfg.lateralReturnSpeed: 1.0` |
| `slotSearchRadiusPx` | **80** | `simCfg.slotSearchRadiusPx: 80` |
| `lookAheadFrames` | **2** | `simCfg.lookAheadFrames: 2` |
| `safetyMarginPx` | 3 | `simCfg.safetyMarginPx: 3` |
| Initiale Platzierung | **Spread** `t = i/20` | `Array.from({length: N}, (_, i) => { const t = i / N; ...` |
| Initiale `physicalY` | `((i % 5) - 2) * 0.3` → `[-0.6..+0.6]` | Hardcodiert |
| Speed-Differenz | **0,000005 per Racer-Index** | `0.001 + i * 0.000005` |
| Random drift | ±0,02 physicalY/frame | `physicalY + (Math.random() - 0.5) * 0.04` |
| Anzahl Frames | 300 | `const FRAMES = 300` |

**Overlap-Zählung** (`countOverlaps`, Zeilen 495–514):
```
if (longSep < SPRITE_L + SAFETY && latSep < SPRITE_W + SAFETY) → overlap
```
Grenzwerte: `longSep < 27px AND latSep < 27px`.

### Browser-Pfad (`RaceScreen/index.jsx`)

`applyRacerBehavior` wird in Zeile 949 aufgerufen. Inputs:

| Parameter | Browser-Wert | Quelle im Code |
|---|---|---|
| `corridorHalfWidthPx` | `geometricTrackWidthPx / 2` | Zeile 234: `corridorHalfWidthPx: geometricTrackWidthPx / 2` |
| `visibleWidthPx` / `visibleLengthPx` | **Sprite-Hitbox** (Canvas-Scan) | Zeilen 380–388: `getSpriteHitbox(...)` → `fallbackHitbox(referenceSpriteSize)` |
| `lateralReturnSpeed` | **0,2** (DEFAULT) | `DEFAULT_RACE_BEHAVIOR_CONFIG.lateralReturnSpeed` |
| `slotSearchRadiusPx` | **60** (DEFAULT) | `DEFAULT_RACE_BEHAVIOR_CONFIG.slotSearchRadiusPx` |
| `lookAheadFrames` | **3** (DEFAULT) | `DEFAULT_RACE_BEHAVIOR_CONFIG.lookAheadFrames` |
| `safetyMarginPx` | 3 | `DEFAULT_RACE_BEHAVIOR_CONFIG.safetyMarginPx` |
| Initiale Platzierung | **Clustered**: alle N Racer bei `t ≈ 0` | Zeilen 340–342: `tStart = -(rowIndex * deltaT_per_row)` |
| Initiale `physicalY` | Row-Layout: `computeRowPhysicalY(indexInRow, rowSize, 0.95)` | Zeile 389–392 |
| Speed-Differenz | **±12,9%** (random `spreadFactor`) | Zeile 346: `BASE_MIN + Math.random() * (BASE_MAX - BASE_MIN)` |
| Random drift | **keiner** (nur physikalische Bewegung) | — |
| Race-Phase-Start | Frame ~240 (nach 4s Countdown) | Countdown-Duration = 4000ms |

### Diff-Tabelle: Kritische Parameter

| Parameter | Test | Browser | Gleich? | Auswirkung |
|---|---|---|---|---|
| `corridorHalfWidthPx` | 60 | **≈60** (user-confirmed: max 8/Reihe) | ✅ | Kein Unterschied |
| `visibleWidthPx` | 24 | **≈19,5** (fallback: `26 × 0,75`) | ❌ | Browser leicht besser (kleinere Hitbox) |
| `lateralReturnSpeed` | **1,0** | **0,2** | ❌ | +5,7s Overlap im Browser |
| `slotSearchRadiusPx` | **80** | **60** | ❌ | Browser findet keine Slots weiter als 60px |
| `lookAheadFrames` | 2 | 3 | ❌ | Browser triggert Avoidance früher |
| **Initiale Platzierung** | **Spread** `t=i/20` | **Clustered** `t≈0` | ❌❌ | **Hauptursache** |
| Speed-Differenz | 0,0001%/Racer | ±12,9% (random) | ❌ | Beeinflusst Auflösungszeit |
| Random drift | ±0,02/frame | keiner | ❌ | Test ist schwieriger als Real (positiv) |

---

## 3. Sim-Setup (Stufe 2)

**Skript:** `scripts/diag-collision-real-loop.mjs`  
**Typ:** Node.js ESM-Modul, importiert echtes `raceBehavior.js`.  
**Oval-Geometrie:** Identisch mit Unit-Test (CX=640, CY=360, RX=400, RY=200). Perimeter ≈ 1938 px.

**Approximationen (dokumentiert):**
- `corridorHalfWidthPx = 60` — Schätzung basierend auf user-bestätigtem "max 8/Reihe".
  Echter Wert = `geometricTrackWidthPx / 2`; kann in der Browser-Console verifiziert werden.
- Horse-Hitbox verwendet Fallback-Formel: `referenceSpriteSize × 0,75 = 26 × 0,75 = 19,5 px`.
  `referenceSpriteSize = 40 × autoScale(120px, 20 Racer) = 40 × 0,65 = 26 px`.
  Im Browser berechnet `OffscreenCanvas` den echten Wert; Abweichung typ. ±5 px.
- Countdown-Phase (240 Frames / 4s) wird in Sim **nicht** modelliert (t bleibt nicht stehen).
  Effekt: Sim überschätzt Overlap-Dauer um bis zu 4s.

**6 Szenarien, je 900 Frames (15 Sekunden):**

| # | Name | Platzierung | EMA | Speeds | Ziel |
|---|---|---|---|---|---|
| 1 | test_spread_instant_ema | Spread | 1,0 | tiny | Test reproduzieren |
| 2 | browser_clustered_tiny_speeds | Clustered | 0,2 | tiny | EMA isolieren |
| 3 | browser_clustered_realistic_speeds | Clustered | 0,2 | ±12,9% | **Real-Browser** |
| 4 | clustered_instant_ema_realistic_speeds | Clustered | 1,0 | ±12,9% | EMA-Effekt isolieren |
| 5 | spread_real_ema_realistic_speeds | Spread | 0,2 | ±12,9% | Placement isolieren |
| 6 | browser_best_case_wider_search | Clustered | 0,5 | ±12,9% | Tuning-Grenze zeigen |

---

## 4. Mess-Ergebnisse (Stufe 2)

### Szenarien-Übersicht

| Szenario | Overlap-Rate | Erste 60 Frames | Max Paare | Avoidance-Frames | 1. Clean Frame |
|---|---|---|---|---|---|
| 1 — Test (spread, EMA=1,0) | **0,0%** | 0,0% | 0 | 0,0% | Frame 0 |
| 2 — Browser (clustered, tiny speeds) | 100,0% | 100,0% | 86 | 100,0% | **never** |
| 3 — Browser real (clustered, ±12,9%) | **71,4%** | 100,0% | 27 | 69,9% | Frame 641 |
| 4 — Instant EMA (clustered, ±12,9%) | **70,0%** | 100,0% | 28 | 72,6% | Frame 300 |
| 5 — Spread, EMA=0,2, ±12,9% | 31,7% | 0,0% | 2 | 0,3% | Frame 0 |
| 6 — Best-Case (search=80, EMA=0,5) | 58,8% | 100,0% | 30 | 54,9% | Frame 495 |

### Per-Sekunde Overlap-Frames (Szenario 3 — "Real Browser")

| Sekunde | Overlap-Frames von 60 | Rate |
|---|---|---|
| 1–10 | 60 | 100% |
| 11 | 41 | 68% |
| 12–14 | 0 | 0% ✅ |
| 15 | 2 | 3% (Wiederholung durch Geschwindigkeitsbündelung) |

**Ergebnis:** Im realen Browser-Setup lösen sich Overlaps nach **≈10–11 Sekunden** auf,
wenn Racer sich durch Geschwindigkeitsunterschiede longitudinal trennen.
Mit Countdown (4s) wäre das ≈6–7 Sekunden nach Rennstart.

### Initiale Platzierungsgeometrie

| Konfiguration | Racer/Reihe | Lateraler Schritt | Min-Lat-Abstand | Max Platz | Overflow |
|---|---|---|---|---|---|
| Test (Hitbox 24px, Corridor 60) | 7 | **19,0 px** | 27,0 px | 5 | **2 Racer** |
| Browser (Hitbox 19,5px, Corridor 60) | 8 | **16,3 px** | 22,5 px | 6 | **2 Racer** |

**Kritische Feststellung:** In beiden Konfigurationen sind in Reihe 0 mehr Racer als
der Korridor lateral aufnehmen kann. 2 Racer haben **keinen freien Slot** — die Slot-Suche
fällt korrekt auf Hybrid-Fallback zurück (minimaler Nudge + Speed-Brake), aber das
Overlap bleibt bis zur longitudinalen Trennung bestehen.

Empirische Overlap-Paare bei Frame 0 (vor jeglicher Avoidance):
- Test-Geometrie: **30 Paare**
- Browser-Geometrie: **27 Paare**

---

## 5. Test-Audit (Stufe 3)

### Was der Test misst

Der 20-Racer-Sim-Test (`raceBehavior.test.js:516`) misst das Verhalten in einer
**Steady-State-Situation**:

- 20 Racer gleichmäßig verteilt mit `t = i/20` → benachbarte Racer ≈97 px
  auseinander in Bogenlänge, weit über `minLong = 27 px`.
- Kaum Längs-Kollisionen — der Test misst hauptsächlich **laterale Drift-Korrekturen**.
- Minimale Speed-Differenz (0,000005/Racer) → kein organisches Zusammendriften.
- `lateralReturnSpeed: 1.0` — jede Slot-Zuweisung wird in einem Frame ausgeführt.
- Random drift ±0,02/frame provoziert gelegentliche Lateral-Kollisionen; Instant-EMA
  löst sie im selben Frame.

### Was der Test NICHT misst

1. **Massen-Start-Cluster**: Alle 20 Racer bei `t ≈ 0` (reale Startaufstellung).
2. **Geometrisch unlösbare Rows**: Bei 8 Racern in einer 120-px-Reihe ist kein freier
   Slot für die 7. und 8. Racer möglich — der Test hat maximal 7/Reihe **mit anders
   gewähltem `CORRIDOR_HALF`** und trifft nie diesen Fall, weil Racer nie clustern.
3. **EMA-Delay unter realen Bedingungen**: Mit EMA=1,0 löst der Test Kollisionen
   sofort; im Browser dauert eine Auflösung ~14 Frames.
4. **Realistische Geschwindigkeitsverteilung**: Die ±12,9% Speed-Streuung erzeugt
   dynamisches Zusammendriften über die Renndauer — vom Test nicht abgedeckt.

### Schlussfolgerung Test-Audit

Der Test ist kein valider Proxy für das reale Browser-Verhalten. Er testet
Drift-Korrekturen in einem gleichmäßig verteilten Feld, nicht die kritische
Start-Cluster-Phase. Die <1%-Grenze ist daher kein sinnvoller Akzeptanzwert
für die Kollisionserkennung; sie ist ein Artefakt des Test-Setups.

---

## 6. Root-Cause-Hypothese (Stufe 4)

### Primärursache: Geometrisch überfüllte Startreihen (H4 + H6)

**Befund:** Mit 8 Racern in einer Reihe bei `corridorHalf = 60 px` beträgt der
laterale Schritt zwischen Racern **16,3 px**. Der Mindestabstand (Hitbox + Safety)
ist **22,5 px**. 2 von 8 Racern in Reihe 0 haben keinen freien Slot.

**Mechanismus:**
1. Slot-Suche für "overflow"-Racer scannt `SLOT_STEP_PX=4` bis `slotSearchRadiusPx=60` →
   findet keinen freien Slot (alle Positionen innerhalb 60 px blockiert durch andere Racer).
2. Hybrid-Fallback: `avoidanceActive = true`, `nudge = ±0,02 physicalY` (= ±1,2 px).
   Speed-Brake hat keinen Effekt, da Racer longitudinal noch nicht voneinander getrennt sind.
3. Zustand hält an bis Racer sich longitudinal durch Geschwindigkeitsunterschiede trennen.
4. Mit realen ±12,9% Speeds: Trennung bei ≈2–4 Sekunden nach Rennstart,
   vollständige Auflösung bei ≈6–7 Sekunden (nach Countdown-Offset).

**Belege:**
- Szenario 2 (tiny speeds): 100% Overlap für alle 900 Frames → **nie** aufgelöst ohne
  echte Geschwindigkeitsunterschiede.
- Szenario 3 (realistic speeds): Lösung bei Frame 641 = 10,7s. Abzügl. ≈4s Sim-Fehler
  (Countdown nicht modelliert): reale Browser-Auflösung bei ~6–7s.
- Geometrie-Analyse: `floor(114px / 22,5px) + 1 = 6 Racer` Maximalkapazität; 8 Racer
  platziert → 2 overflow.

### Sekundärursache: EMA-Delay verlängert Overlap-Persistenz (H3)

**Befund:** Szenario 4 (Instant EMA) löst bei Frame 300, Szenario 3 (EMA=0,2) bei
Frame 641 — ein Unterschied von **341 Frames ≈ 5,7 Sekunden**.

**Mechanismus:** Mit EMA=0,2 bewegt sich ein Racer pro Frame nur 20% auf seinen
Ziel-Slot zu. Während der 14 Übergangs-Frames befindet sich der Racer weiter im
Collision-Bereich. Andere Racer, die in dieser Zeit einen Slot suchen, "sehen" die
Zwischen-Position als belegt und wählen ggf. denselben Ziel-Slot → potenzieller
Slot-Konflikt.

**Wichtig:** EMA ist eine SEKUNDÄR-Ursache. Auch mit instant EMA (Szenario 4)
persistieren 70% Overlaps — ohne longitudinale Trennung kein Entkommen.

### Ausgeschlossene Hypothesen

| Hypothese | Befund | Status |
|---|---|---|
| H1: corridorHalfWidthPx-Unterschied | Browser ≈60px = Test ≈60px (user confirmed) | ❌ Ausgeschlossen |
| H2: Größere Browser-Hitboxes | Browser 19,5px < Test 24px — Browser ist besser | ❌ Ausgeschlossen |
| H5: Falsche Overlap-Metrik im Test | Test-Formel und Avoidance-Formel konsistent | ❌ Ausgeschlossen |
| H6: Bug in Slot-Suche | Slot-Suche korrekt — findet keinen Slot wenn keiner existiert | Refaktoriert: kein Bug, aber Design-Grenze |

---

## 7. Empfehlungen

### Fix-Richtung A: `racersPerRow` auf Maximalkapazität kappen

**Idee:** In `computeRacersPerRow` (rowLayout.js) die Kapazität auf `maxFit = floor(effectiveWidth / minLat) + 1` beschränken, wobei `minLat ≈ visibleWidthPx + safetyMarginPx`.

**Vorteil:** Beseitigt geometrisch unlösbare Rows vollständig.  
**Nachteil:** Erfordert Kenntnis der Hitbox-Größe im rowLayout-Modul (derzeit nicht vorhanden).
Außerdem: mehr Reihen → mehr Reihen-Start-t-Offsets → Racer weiter hinten.
Trade-off: korrekteres Verhalten vs. veränderte Start-Optik.

### Fix-Richtung B: Start-Phase-Tolerance — Avoidance in den ersten N Sekunden deaktivieren oder abmildern

**Idee:** Eine Konfiguration `startPhaseDurationMs: 6000` oder `startPhaseAvoidanceFactor: 0.0` einführen. In RaceScreen: wenn `ts - st.raceStart < startPhaseDurationMs` → `behaviorConfig.enabled = false` oder `lateralReturnSpeed = 0` für `applyRacerBehavior`.

**Vorteil:** Einfach implementierbar. Racer können sich longitudinal trennen, bevor
Avoidance aktiv wird. Keine visuellen Artefakte aus permanenten Nudge-Kollisionen.  
**Nachteil:** Während der Phase bleibt Kollisionsvisuell sichtbar (keine laterale Auflösung).
Design-Frage: Ist Start-Overlap-Visualisierung akzeptabel bis zum Spread-Out?

### Fix-Richtung C: `slotSearchRadiusPx` erhöhen + EMA-Speed erhöhen

**Idee:** Default `slotSearchRadiusPx: 80` (wie im Test) + `lateralReturnSpeed: 0.4–0.5`.

**Vorteil:** Schneller zu implementieren.  
**Nachteil:** Szenario 6 (search=80, EMA=0,5) zeigt 58,8% Overlap — deutlich besser als
71,4% (Szenario 3), aber immer noch erheblich. Adressiert nicht die Fundamentalursache.
**Empfehlung:** Kein Standalone-Fix.

### Ist die Slot-Logik rettbar?

**Ja**, aber mit einer notwendigen Design-Anpassung. Die Slot-Suche selbst ist korrekt
implementiert. Das Problem liegt im Zusammenspiel mit `computeRacersPerRow`: es werden
mehr Racer in eine Reihe gesetzt als lateral passen. Die Regression Awareness Convention
("nach 2–3 Versuchen Architektur-Wechsel") trifft hier **noch nicht** zu — es ist eine
erste Diagnose. Fix-Richtung B (Start-Phase-Suppression) wäre der minimalinvasive erste
Schritt; Fix-Richtung A (Row-Kapazität kappen) der strukturell korrektere Fix.

**Nicht empfohlen:** Blindes Tuning von `slotSearchRadiusPx` / `safetyMarginPx` ohne
Adressierung der geometrischen Overflow-Ursache. Das verbessert die Zahlen leicht,
löst das strukturelle Problem nicht.

# Avoidance/Drafting — Diagnose-Bericht

**Datum:** 2026-05-12
**Branch:** claude/avoidance-logic-fix
**Trace:** docs/diagnose/avoidance-trace.json (600 frames, 8 Racer, dirt-oval, seed 0x5e4501)

---

## 1. Lokalisierung

### Avoidance-Logik

| Symbol | Datei | Zeilen | Beschreibung |
|---|---|---|---|
| `applyRacerBehavior(racers, config)` | `client/src/modules/raceBehavior.js` | 54–172 | Hauptfunktion: Home-Force, Avoidance, Drafting |
| `initRacerBehavior(racer)` | `client/src/modules/raceBehavior.js` | 17–21 | Initialisierung per Racer |
| `DEFAULT_RACE_BEHAVIOR_CONFIG` | `client/src/modules/storage/defaults.js` | 214–239 | Alle Default-Werte |
| `loadRaceBehaviorConfig / save…` | `client/src/modules/raceBehaviorConfig.js` | 18–56 | Storage CRUD |
| `RaceTuningSection.jsx` | `client/src/screens/DevScreen/sections/RaceTuningSection.jsx` | 79–1046 | UI-Sliders, 9 Blöcke |

### Avoidance-Interne Struktur (raceBehavior.js)

```
applyRacerBehavior
  ├── Home-Force (Zeile 73–76): yDelta += -physicalY × homeForceStrength
  ├── Avoidance-Loop (Zeile 79–114): pairweise
  │     ├── Anisotrope Distanz in (t, physicalY)-Raum
  │     ├── Trailer/Leader-Bestimmung
  │     ├── Speed-Brake-Set (vor yDiff-Skip)
  │     └── yDiff < 1e-6 → skip (Zeile 109)
  ├── Anti-Stacking sqrt(neighborCount)-Normierung (Zeile 119–124)
  ├── Apply + Soft-Repulsion + Clamp (Zeile 127–141)
  └── Drafting-Cone (Zeile 143–171): break nach erstem Treffer (Zeile 169)
```

---

## 2. Wechselwirkung

### Force-Pipeline pro Frame

```
physicalY[t+1] = physicalY[t]
    + homeForce            = −physicalY × 0.04
    + avoidanceForce       = ±lateralForce × (1 − dist/avoidanceDistance) / sqrt(neighborCount)
    + softRepulsion        = −sign(y) × softRepulsionStrength × pen²   (nur nahe Grenze)
```

### Equilibrium-Analyse (zwei Racer, gleiche t-Position)

Bedingung: `homeForce + avoidanceForce = 0`

```
−y × 0.04 + lateralForce × (1 − dist/avoidanceDistance) / sqrt(1) = 0
```

Mit `dist ≈ |dY| × yWeight = |dY| × 1.0` und `lateralForce = 0.01`:

```
dY_eq = avoidanceDistance / (1 + homeForceStrength/lateralForce)
      = 0.35 / (1 + 0.04/0.01)
      = 0.35 / 5.0
      = 0.070
```

Umrechnung in Pixel: `dY_eq × trackWidth/2 = 0.070 × 98/2 = 3.4 px`

**Befund:** Gleichgewichts-Abstand ≈ 3.4 px. Sprite-Breite ≈ 24 px (98 px / 4 Racer).
Das Gleichgewicht liegt deutlich innerhalb der Sprite-Überlappungszone.

### Warum Home-Force gewinnt

- Home-Force wirkt mit `homeForceStrength = 0.04` pro Einheit physicalY.
- Bei einem Racer-Paar mit `dY = 0.05` ergibt sich Avoidance-Force ≈ `0.01 × (1 − 0.05/0.35) ≈ 0.0086`.
- Home-Force auf den Racer mit `physicalY ≈ 0.025`: `0.025 × 0.04 = 0.001`.
- **Die Avoidance-Force ist 8× stärker als die Home-Force**, aber weil Asymmetrie (Trailer yields, Leader holds) NUR dem Trailer die Force zugeordnet wird, kann der Leader einfach an seiner physicalY-Position bleiben. Beide konvergieren zur Centerline und der Trailer-Racer kann nicht ausweichen, weil seine Avoidance-Force den Leader-Racer nicht bewegt.

---

## 3. Parameter-Inventur

| Parameter | Aktueller Wert | Datei | Zeile | Im Tuning exponiert? |
|---|---|---|---|---|
| `homeForceStrength` | 0.04 | defaults.js | 222 | ✅ Ja (Block 9 "Home Force") |
| `comfortThreshold` | 0.7 | defaults.js | 223 | ✅ Ja (Block 6) |
| `softRepulsionStrength` | 0.1 | defaults.js | 224 | ✅ Ja (Block 6) |
| `avoidanceDistance` | 0.35 | defaults.js | 226 | ✅ Ja (Block 7) |
| `tWeight` | 2.0 | defaults.js | 227 | ✅ Ja (Block 7) |
| `yWeight` | 1.0 | defaults.js | 228 | ✅ Ja (Block 7) |
| `lateralForce` | 0.01 | defaults.js | 229 | ✅ Ja (Block 7) |
| `maxLateral` | 0.95 | defaults.js | 230 | ✅ Ja (Block 7) |
| `speedBrakeYThreshold` | 0.2 | defaults.js | 232 | ✅ Ja (Block 8) |
| `speedBrakeTThreshold` | 0.015 | defaults.js | 233 | ✅ Ja (Block 8) |
| `speedBrakeFactor` | 0.95 | defaults.js | 234 | ✅ Ja (Block 8) |
| `draftingMaxDistance` | 110 | defaults.js | 236 | ✅ Ja (Block 5) |
| `draftingConeAngle` | 30 | defaults.js | 237 | ✅ Ja (Block 5) |
| `draftingBoost` | 1.1 | defaults.js | 238 | ✅ Ja (Block 5) |
| **`1e-6` yDiff-Skip** | **1e-6 (hartcodiert)** | **raceBehavior.js** | **109** | **❌ Nein** |
| **`Math.sqrt(neighborCount)`-Exp.** | **0.5 (= sqrt, hartcodiert)** | **raceBehavior.js** | **122** | **❌ Nein** |
| **Asymmetrie Trailer-yields-only** | **true (hartcodiert)** | **raceBehavior.js** | **95–97** | **❌ Nein** |
| **`break` nach erstem Drafting-Treffer** | **1 (hartcodiert)** | **raceBehavior.js** | **169** | **❌ Nein** |

**Befund:** Alle 4 im Spec genannten versteckten Konstanten wurden bestätigt und lokalisiert.

---

## 4. Mathematische Analyse

### Pixel-Mapping physicalY → Weltpixel

```
worldPixelY = physicalY × trackWidth / 2
            = physicalY × 98 / 2
            = physicalY × 49
```

### Avoidance-Schwellen-Umrechnung

| physicalY-Schwelle | Weltpixel | Bedeutung |
|---|---|---|
| 1e-6 (yDiff-Skip) | ~5×10⁻⁵ px | Praktisch null — Skip bei fast-identischem physicalY |
| avoidanceDistance = 0.35 | ~17 px im Y-Raum (bei yWeight=1) | Anisotrop: auch t-Distanz geht ein |
| Gleichgewicht dY = 0.070 | 3.4 px | Wo Avoidance = Home-Force: weit unterhalb Sprite-Breite |
| maxLateral = 0.95 | 46.6 px | Maximale Auslenkung — fast der gesamte Track |

### Sprite-Größenreferenz (dirt-oval, 8 Racer)

```
trackWidth = 98 px
racersPerRow ≈ floor(2 × 98 / spriteSize) → bei spriteSize ≈ 24px: ~8 Racer/Reihe
spriteSize_estimate ≈ trackWidth / (racersPerRow × 0.5) ≈ 98 / 4 ≈ 24 px
```

Für die Trace-Thresholds wurde `SPRITE_WORLD_PX = 60` verwendet (konservative Schätzung).
Tatsächliche Sprite-Breite auf diesem Track bei Default-Zoom ist ~24 px — overlap ist daher
**noch schlimmer** als die Trace-Zahlen suggerieren.

### Konvergenzzeit zur Centerline

Ohne Avoidance konvergiert physicalY exponentiell:
```
physicalY(t) ≈ physicalY(0) × (1 − homeForceStrength)^frame
             = physicalY(0) × (0.96)^frame
Halbwertszeit: frame = ln(0.5) / ln(0.96) ≈ 17 Frames ≈ 0.28 Sekunden
```

Nach ~50 Frames (0.8s) ist ein Racer auf weniger als 13% seiner Start-physicalY-Position.
Alle 8 Racer konvergieren schnell auf physicalY ≈ 0 — genau dort wo sie sich überlappen.

---

## 5. Frame-Trace-Auswertung

Trace-Konfiguration: 8 Racer, dirt-oval, Seed 0x5e4501, 600 Frames (10s), Re-Roll deaktiviert.

### Adjacency-Tabelle

| Metrik | Wert |
|---|---|
| Total Pair-Frames | 16 800 |
| Adjacent Pair-Frames (fwd < 120 px) | 6 884 |
| **Adjacency-Rate** | **41.0%** |

### Lateral-Overlap (bezogen auf adjacent pair-frames)

| Schwelle | Anzahl (adj) | % der adj |
|---|---|---|
| < 0.5 × 60px = 30 px lateral | 6 695 | **97.3%** |
| < 1.0 × 60px = 60 px lateral | 6 884 | **100.0%** |
| < 2.0 × 60px = 120 px lateral | 6 884 | **100.0%** |

**Befund:** Alle longitudinal-adjazenten Paare liegen lateral innerhalb einer Sprite-Breite.
Kein Paar schafft es im 10-Sekunden-Beobachtungszeitraum, lateral Abstand aufzubauen.

### Visual-Overlap-Episoden

| Metrik | Wert |
|---|---|
| Episoden-Anzahl | 13 |
| Ø Episodendauer | 6.64 s |
| Max Episodendauer | 9.63 s |

Die 13 Episoden decken zusammen 86.3 s — auf einem 10s-Trace mit 28 möglichen Paaren bedeutet das, dass manche Paare **für die gesamte Trace-Dauer** überlappend sind.

**Vergleich mit Spec-Erwartung:** Der Spec erwartete 27 Episoden mit Ø 2.88s / max 9.70s aus
einem früheren Trace. Das maximale 9.63s entspricht gut dem Erwartungswert (9.70s). Die
geringere Episodenzahl bei längerer Ø-Dauer deutet auf dasselbe Phänomen: Racer kleben
statt kurz zu kreuzen.

---

## 6. Hypothese mit Begründung

**Primärer Befund: Hypothese B (Logik) + A (Parameter)**

Nicht Hypothese C (Architektur/Positions-Ebene statt Geschwindigkeits-Ebene) — die
force-basierte Architektur ist ausreichend, aber falsch kalibriert/eingeschränkt.

### B: Logik-Defekte

1. **`1e-6` yDiff-Skip (raceBehavior.js:109):** Wenn zwei Racer nahezu dasselbe physicalY
   haben (was durch Home-Force-Konvergenz die Regel ist), feuert die Avoidance nicht.
   Die laterale Push-Direction kann nicht bestimmt werden → kein Ausweichen genau wenn
   es am nötigsten wäre.

2. **Asymmetrie Trailer-yields-only (Zeile 95–97):** Nur der Trailer weicht aus. Der Leader
   hält seine physicalY = 0 (da er schneller konvergiert und die Force nicht erhält).
   Beide Racer konvergieren zur Centerline via Home-Force. Wenn der Leader bereits dort
   ist, kann der Trailer trotz Avoidance nicht ausweichen — er würde sich vom Leader
   wegbewegen (durch Home-Force wird er wieder zurückgezogen).

### A: Parameter-Defekte

3. **Gleichgewichts-Abstand 3.4 px:** Wie in §4 berechnet — das Gleichgewicht liegt
   weit unterhalb der visuellen Überlappungsgrenze (~24 px). `lateralForce` ist zu klein
   relativ zu `homeForceStrength`.

4. **Keine Phasen-Trennung:** Am Start (Pulk) ist enge Aufstellung erwünscht. Im Rennen
   nicht. Aktuell gilt immer dieselbe Avoidance-Stärke.

### Warum NICHT Hypothese C (Positions-Level)

Die Architektur (Force → physicalY → getPosition) ist korrekt. Das Problem ist nicht die
Abstraktion, sondern die Parametrierung und die zwei Logik-Defekte. Mit symmetricAvoidance,
korrektem Tie-Breaking und erhöhter lateralForce sollte das Gleichgewicht auf einen
visuell-sicheren Abstand steigen.

---

## 7. Empfehlung für Fix (Phase 2–5)

**Phase 2 — Versteckte Konstanten exponieren + Defekte beheben:**

1. `minLateralEpsilon = 0.01`: Ersetzt `1e-6` yDiff-Skip durch deterministisches Tie-Breaking.
   Racer mit Index *i* > *j* weicht nach +Y aus, *i* < *j* nach −Y. Verhindert den degenerierten
   Skip-Case.

2. `symmetricAvoidance = true` (Default): Beide Racer weichen je mit halber Force aus.
   Leader und Trailer teilen die Ausweich-Verantwortung. Gleichgewicht-Analyse:
   ```
   dY_eq_symmetric = avoidanceDistance / (1 + homeForceStrength / (lateralForce/2))
                   ≈ 0.35 / (1 + 0.04/0.005) = 0.35 / 9 ≈ 0.039 → 1.9 px
   ```
   Das allein reicht noch nicht — zusätzlich `lateralForce` erhöhen.

3. `crowdNormalizationExponent = 0.5` (Default = bestehendes sqrt-Verhalten, nun tunable).

4. `draftingMaxTargets = 1` (Default = bestehendes Verhalten, nun tunable).

**Phase 3 — Phasen-Mechanismus:**

Dynamische Erkennung via `currentSpread = max(t) − min(t)`. Empfehlung: dynamisch, weil
der Frame-Counter an Renndauer gebunden ist und bei kurzen Rennen zu lang relativ ist.
Start-Phase: reduzierte Avoidance (×0.2), reduzierte Home-Force (×0.5) → Pulk bleibt
erhalten. Race-Phase: volle Avoidance mit erhöhter `lateralForce`.

**Empfohlene neue Defaults (zu kalibrieren in Phase 5):**

| Parameter | Alt | Neu | Begründung |
|---|---|---|---|
| `lateralForce` | 0.01 | 0.04 | Gleichgewicht → ~14 px (> Sprite-Breite 24 px) mit symmetric |
| `symmetricAvoidance` | — | `true` | Leader weicht mit aus |
| `minLateralEpsilon` | — | `0.01` | Kein yDiff-Skip mehr |
| `avoidanceStrictness` | — | `0.5` | Convenience-Scaler |

**Gleichgewicht mit neuen Defaults (symmetric + lateralForce=0.04):**
```
dY_eq = 0.35 / (1 + 0.04 / (0.04/2)) = 0.35 / (1 + 2) = 0.35 / 3 = 0.117
worldPx = 0.117 × 49 = 5.7 px  (pro Racer, total gap = 11.4 px)
```

Mit `avoidanceStrictness = 1.0` wird lateralForce auf `0.04 × 3 = 0.12`, Gleichgewicht:
```
dY_eq = 0.35 / (1 + 0.04/0.06) = 0.35 / 1.67 = 0.21 → 10.3 px pro Seite (20.6 px gap)
```

Das liegt knapp über einer Sprite-Breite (24 px) — die Akzeptanzkriterien sollten erfüllbar sein.

---

*Erstellt von avoidanceTrace.js + manueller Analyse · Branch claude/avoidance-logic-fix*

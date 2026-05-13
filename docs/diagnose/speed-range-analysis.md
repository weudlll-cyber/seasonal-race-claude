# Speed-Range Diagnose — Racer Speed Spread

**Branch:** `claude/diagnose-speed-range`
**Datum:** 2026-05-13
**Methodik:** Code-Analyse + Node-Simulation (scripts/diagnose-speed-range.mjs)
**Fragestellung:** Ist die Speed-Range zwischen den 20 Racern im realistischen 2-5%-Bereich, oder zu groß?

---

## 1. Speed-Quellen

### 1.1 Formel für `baseSpeed` je Racer

```
r.baseSpeed = race_baseSpeed
            × speedMultiplier   (Type: Horse=1.0, Rocket=1.25, Snail=0.30 ...)
            × spreadFactor      (Zufalls-Losglück; re-rollbar)
            × speedBonusMult    (Reihen-Kompensation; konstant)
```

### 1.2 `race_baseSpeed` — globaler Kalibrierungsfaktor

**Datei:** `client/src/modules/raceBaseSpeed.js:29`

```js
computeRaceBaseSpeed(finishT, targetDuration) = finishT / (REFERENCE_FPS × targetDuration)
```

- Für 60-s-Rennen, 2 Runden: `race_baseSpeed ≈ 6.04e-4` (t-Fortschritt pro Frame)
- Für alle Racer identisch — keine Spreizung hier

### 1.3 `spreadFactor` — Losglück (Hauptquelle der Spreizung)

**Datei:** `client/src/screens/RaceScreen/index.jsx:352`

```js
spreadFactor = uniform([BASE_SPEED_MIN, BASE_SPEED_MAX]) / BASE_SPEED_MEAN
```

**Default-Config** (`client/src/modules/storage/defaults.js:114`):
```js
DEFAULT_BASE_SPEED_CONFIG = { min: 0.00091, max: 0.00118 }
BASE_SPEED_MEAN = (0.00091 + 0.00118) / 2 = 0.001045
```

| Kennzahl | Wert |
|---|---|
| Min-Faktor | `0.00091 / 0.001045 = 0.871` |
| Max-Faktor | `0.00118 / 0.001045 = 1.129` |
| **Spreizung (±% vom Mittel)** | **±12.9%** |
| **Gesamtbereich** | **25.8% vom Mittel** |

### 1.4 `speedBonusMult` — Reihen-Kompensation (konstant)

**Datei:** `client/src/modules/rowLayout.js:82`

```js
speedBonus(rowIndex) = (rowIndex × rowGapPx / pathLengthPx) × speedBonusFactor
speedBonusMult = 1 + speedBonus
```

**Default:** `speedBonusFactor = 1.0`, `rowGapPx ≈ 42px`, `pathLengthPx ≈ 1200px`

| Reihe | `speedBonusMult` | Bonus vs. Front |
|---|---|---|
| 0 (Front) | 1.0000 | +0.0% |
| 1 | 1.0350 | +3.5% |
| 2 | 1.0700 | +7.0% |
| 3 (hinten) | 1.1050 | **+10.5%** |

### 1.5 Re-Roll-Mechanismus

**Datei:** `client/src/screens/RaceScreen/index.jsx:897–922`

- **Was wird ge-re-rolled:** Nur `spreadFactor` (nicht `speedBonusMult`)
- **Häufigkeit:** `rollCount = max(2, floor(60/15)) = 4` Rolls, verteilt über 0–80% der Rennzeit → alle **12 Sekunden**
- **Variation pro Roll:** `halfWidth = spreadRange × 85% = 0.258 × 0.85 = ±0.220`
- **Effekt:** Ein einziger Re-Roll kann den `spreadFactor` **von 0.871 bis 1.129 springen** (volle Bandbreite in einem Schritt)
- **Übergang:** 5-Sekunden easeInOutCubic-Smooth-Transition

### 1.6 Drafting-Bonus (nicht Teil der baseSpeed)

- `draftingBoost = 1.1` (10% Wunschgeschwindigkeits-Boost)
- Wird als Soft-Intent im Constraints-First-Planner verarbeitet
- Modifiziert **nicht** `baseSpeed`, nur `horse.target.desiredVS`

---

## 2. Mess-Methodik

**Skript:** `scripts/diagnose-speed-range.mjs`

- 20 Racer initialisiert mit denselben Formeln wie `RaceScreen/index.jsx`
- 1200 Frames × 16ms = ~19.2 Sekunden simuliert
- Re-Rolls und Smooth-Transitions exakt repliziert
- Pro Frame berechnet: `min`, `max`, `mean`, `std`, `spreadPct = (max−min)/mean × 100`
- Trace-Daten: `docs/diagnose/speed-range-trace.ndjson` (1200 Zeilen)
- Stats-JSON: `docs/diagnose/speed-range-stats.json`

**Simulation-Parameter:**
```
race: 60 s, 2 Runden, Horse (speedMultiplier=1.0)
race_baseSpeed = 6.0392e-4
Re-Rolls: 4 gesamt, rollInterval = 12000 ms, halfWidth = ±0.220
pathLengthPx = 1200, rowGapPx = 42, speedBonusFactor = 1.0
```

---

## 3. Mess-Ergebnisse

### 3.1 Speed-Spread in % des Mittelwerts

| Kennzahl | Wert |
|---|---|
| **Mittlerer Spread (Mean)** | **33.95%** |
| Min-Spread | 33.63% |
| Max-Spread | 34.83% |
| p10 | 33.63% |
| p50 | 33.63% |
| p90 | 34.80% |

**Interpretation p50 = p10 = 33.63%:** Die Spreizung ist von Frame 1 an konstant ~34% und ändert sich kaum. Erst gegen Frame 750 (nach dem ersten Re-Roll bei ~12s) gibt es eine leichte Erhöhung.

### 3.2 Speed-Spread in px/s (Frenet-Space)

| Kennzahl | Wert |
|---|---|
| Mean | 16.6 px/s |
| Min | 16.4 px/s |
| Max | 17.1 px/s |

Zum Vergleich: Mittlere Racer-Geschwindigkeit ≈ 48 px/s, der schnellste Racer ist ~17 px/s schneller als der langsamste.

### 3.3 Aufschlüsselung der Spreizungsquellen

| Quelle | Beitrag zur Spreizung |
|---|---|
| `spreadFactor` (20 Racer, uniform [0.871, 1.129]) | ~23% erwartet (E[max-min] = 19/21 × 25.8%) |
| `speedBonusMult` (Reihe 0 bis 3) | **+10.5%** für hinterste Reihe |
| Re-Roll halfWidth | ±22% theoretisch, in 20s nicht voll ausgeschöpft |
| **Gesamt** | **~34%** gemessen |

---

## 4. Hypothesen-Auswertung

### S1 — Speed-Range zu groß: **BESTÄTIGT**

| | Gemessen | Ziel |
|---|---|---|
| Spread (max-min)/mean | **33.95%** | 2–5% |
| Faktor Überschreitung | **~7×** | — |

**S1 ist klar bestätigt.** Der gemessene Spread von ~34% ist ~7× zu groß. Selbst ohne jede Rennmechanik würde das Feld zwangsläufig zerfallen: der schnellste Racer bewegt sich 17 px/s schneller als der langsamste — bei 1200px Rundenumfang legt er pro Runde 21.6 Sekunden früher an als der langsamste, was bei einem 60-Sekunden-Rennen unhaltbar ist.

### S2 — Speed-Range ok, Verlust durch Mechanik: **WIDERLEGT**

Der Spread ist von Initialisierung an ~34%. Keine Follow-Mode, kein Drafting, kein Safety-Shield könnte einen 34%-Speed-Unterschied kompensieren.

### S3 — speedBonusMult zu wirksam: **TEILBESTÄTIGT** (Neben-Ursache)

`speedBonusMult` von 1.0 bis 1.105 ist für sich allein schon ein 10.5%-Spread — bereits das Doppelte des Zielbereichs. Der Haupttreiber ist aber `spreadFactor`.

### Hauptursache der zu großen Spreizung

**Zwei unabhängige Probleme:**

1. **`spreadFactor`-Bereich zu breit:** `[0.871, 1.129]` = ±12.9% pro Racer. Mit 20 Racern uniform verteilt ergibt das einen erwarteten Spread von ~23% zwischen Schnellstem und Langsamstem — schon vor `speedBonusMult`.

2. **`speedBonusMult` zu stark:** Der Back-Row-Bonus von +10.5% (Reihe 3) ist für sich allein bereits 2–5× zu groß. Er addiert sich zum `spreadFactor`-Spread.

3. **Re-Roll-Sprungweite zu groß:** `halfWidth = ±0.220` bedeutet ein einziger Re-Roll kann den `spreadFactor` über die gesamte Bandbreite springen — von langsamst zu schnellst möglich. Das erzeugt abrupte Speed-Änderungen.

---

## 5. Empfehlung

**Hinweis: Kein Fix in dieser Spec — nur Empfehlung.**

Für ein realistisches Renn-Feld (2–5% Spread) müssen **zwei Parameter reduziert** werden:

### 5.1 `DEFAULT_BASE_SPEED_CONFIG.min/max` einengen

Ziel: `(max - min) / MEAN × 100 ≤ 2.5%` (sodass 20 Racer im Schnitt ≤ 5% Gesamtspread haben)

Formel für 20 Racer: `E[spread] ≈ (19/21) × (max-min)/MEAN`

| Szenario | min | max | E[Spread] mit 20 Racern |
|---|---|---|---|
| Aktuell | 0.00091 | 0.00118 | **~23%** |
| 5%-Ziel | 0.00102 | 0.00107 | ~4.5% |
| 3%-Ziel | 0.00103 | 0.00106 | ~2.7% |

**Vorschlag:** `min = 0.00102, max = 0.00107`

### 5.2 `speedBonusFactor` reduzieren

Aktuell: `speedBonusFactor = 1.0` → Reihe 3 hat +10.5% Bonus.

Ziel: Reihe 3 mit ≤ 2% Bonus (als restlicher Spielraum nach speedFactor-Einengung)

```
speedBonusFactor_neu = 0.02 / (3 × 42/1200) = 0.02 / 0.105 ≈ 0.19
```

**Vorschlag:** `speedBonusFactor = 0.2`

### 5.3 `reRollVariationPercent` reduzieren

Aktuell: `85%` der Range = ±0.220 pro Roll → Racer kann in einem Roll von langsamst zu schnellst springen.

Nach Einengung der Range auf [0.00102, 0.00107] ist das Problem kleiner, aber die `reRollVariationPercent = 85%` bedeutet immer noch, dass ein einzelner Re-Roll fast die volle neue Range abdeckt. Empfehlung: auf `50%` reduzieren (graduelle Änderungen statt Sprünge).

### 5.4 Zusammenfassung

| Parameter | Aktuell | Vorschlag | Erwarteter Effekt |
|---|---|---|---|
| `BASE_SPEED_MIN` | `0.00091` | `0.00102` | — |
| `BASE_SPEED_MAX` | `0.00118` | `0.00107` | Spread ~23% → ~4.5% |
| `speedBonusFactor` | `1.0` | `0.2` | Reihen-Bonus ~10.5% → ~2.1% |
| `reRollVariationPercent` | `85` | `50` | Ruhigere Speed-Transitions |

**Erwartetes Ergebnis nach den drei Änderungen:** Gesamtspread von ~34% auf ~5–6%.

---

*Messung durchgeführt am 2026-05-13 mit `scripts/diagnose-speed-range.mjs`.*
*Trace-Daten: `docs/diagnose/speed-range-trace.ndjson`*

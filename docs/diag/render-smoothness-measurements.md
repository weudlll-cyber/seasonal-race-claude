# Render-Smoothness — Mess-Werte

## Setup-Bedingungen

- **Track**: Dirt Oval (Closed, 1280×720)
- **Racer**: 5 (Pferde)
- **Mess-Datum**: 2026-05-08
- **Mess-Tools**: CameraDiagnosticsHUD (PR #79, Branch `diag/render-smoothness-hud`) + Playwright-Frame-Sampling (`client/e2e/render-smoothness-camera-tracking.spec.js`, Branch `diag/playwright-camera-tracking`)
- **Frames gesammelt**: 608 (LEADER_ZOOM) + 602 (BATTLE_ZOOM), je ≥ 2500 ms nach State-Eintritt
- **Race-Dauer**: 180 s

## Mess-Werte

| State | Zoom (Ø) | Δscreen Ø | Δscreen P95 | Δscreen max¹ | Cam-Lag Ø | Cam-Lag max¹ | Steady-State Jitter StdDev² |
|---|---|---|---|---|---|---|---|
| OVERVIEW | ~1.0× | –³ | –³ | –³ | –³ | –³ | –³ |
| LEADER_ZOOM | 2.23× | 3.46 px/frame | 8.75 px/frame | 83.01 px/frame | 18.18 px | 245.65 px | **2.49 px/frame** |
| BATTLE_ZOOM | 3.30× | 6.02 px/frame | 12.35 px/frame | 284.01 px/frame | 32.80 px | 308.41 px | **3.52 px/frame** |

¹ Max-Werte enthalten Transition-Spikes (State-Wechsel-Artefakte).  
² Steady-State: Leader-Jitter StdDev nach Ausschluss ±50 Frames um jeden State-Wechsel.  
³ OVERVIEW nicht via Playwright gemessen; Test erfasste nur LEADER_ZOOM und BATTLE_ZOOM.

**Frame-Timing (beide States zusammen, 1210 Frames total):**

| Metrik | Wert |
|---|---|
| dt Ø | 17.02 ms (Ziel 16.67 ms @ 60fps) |
| dt max | 33.4 ms |
| Frames > 20 ms | 26 von 1210 (2.1 %) |

## Mathematische Begründung (Aliasing-Schwelle)

Bei LEADER_ZOOM (Zoom 2.23×) bewegt sich der Leader im Schnitt 3.46 px/frame auf dem Screen,
Spitzen bis ~14 px/frame sind im Steady-State regulär (≈ 97. Perzentil: Ø + 1.9 × StdDev).
Ein Pferde-Schild (Trikot-Nummer) misst bei diesem Zoom-Faktor ca. 25 px Bildschirmbreite.

**Verhältnis Bewegung / Objekt-Breite:**
- Ø-Fall: 3.46 / 25 ≈ **14 %** pro Frame — smooth
- Spitze 14 px: 14 / 25 ≈ **56 %** pro Frame — Objekt wandert mehr als die Hälfte seiner eigenen
  Breite in einem Frame; das Auge kann keine kontinuierliche Bewegung interpolieren → sichtbares
  Ratcheting / Alias-Ruckeln

**Zoom-Skalierung**: Der Effekt skaliert linear mit dem Zoom-Faktor. Bei BATTLE_ZOOM (3.30×,
Faktor 1.48× gegenüber LEADER_ZOOM) steigen die Screen-Pixel-Werte proportional:
P95 12.35 px/frame → 12.35 / 25 ≈ 49 % der Objekt-Breite. Kombiniert mit dem höheren
Centroid-Movement (3.4× vs. 1.9× Welt-Pixel/Frame) erklärt das den deutlich stärkeren
Jitter in BATTLE_ZOOM (StdDev 13.6 vs. 5.6 px/frame vor Bereinigung).

Jede Erhöhung des Zoom-Faktors um Faktor k multipliziert die Screen-Pixel-Verschiebung
pro Frame ebenfalls mit k — ohne Änderung der Lerp-Geschwindigkeit oder des
Frame-Timings verschlechtert sich das sichtbare Ruckeln proportional.

---

_Lösungs-Diskussion und gewählter Ansatz: siehe [HANDOFF.md](../HANDOFF.md)_

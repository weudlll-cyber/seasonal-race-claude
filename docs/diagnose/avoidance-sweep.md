# Avoidance Parameter Sweep

**Datum:** 2026-05-12
**Track:** Dirt Oval (98 px wide)
**Setup:** 8 racers, seed 0x5e4501, 600 frames (10 s @ 60 fps)
**Sprite reference:** 60 px · Forward-adjacency window: 120 px

---

## Haupt-Tabelle

Equilibrium-Spalte: algebraisch / gemessen (2-Racer-Simulation, 200 Frames). ∞ = homeForce=0.
Kriterien: Overlap<0.5sprite ≤ 20% **UND** Max-Episode ≤ 1.5 s.

| Config | Adj % | Ov<0.5S% | Ov<1.0S% | Ep | Ø Ep s | Max Ep s | Eq alg/meas px | Kriterien |
|---|---|---|---|---|---|---|---|---|
| baseline-defaults | 40.6% | 95.1% | 99.8% | 13 | 6.72s | 9.55s | 20.4 / 20.4 | ❌ (overlap95.1%>20%, maxEp9.55s>1.5s) |
| strictness-max | 40.7% | 90.6% | 99.6% | 14 | 5.95s | 9.53s | 27.8 / 27.8 | ❌ (overlap90.6%>20%, maxEp9.53s>1.5s) |
| strictness-zero | 40.9% | 97.2% | 100.0% | 15 | 5.91s | 9.62s | 12.7 / 12.7 | ❌ (overlap97.2%>20%, maxEp9.62s>1.5s) |
| strength-3x | 40.7% | 89.3% | 99.6% | 29 | 2.85s | 9.52s | 23.7 / 23.6 | ❌ (overlap89.3%>20%, maxEp9.52s>1.5s) |
| strength-10x | 40.3% | 54.4% | 92.1% | 78 | 0.94s | 8.77s | 25.1 / 25.0 | ❌ (overlap54.4%>20%, maxEp8.77s>1.5s) |
| distance-2x | 40.7% | 89.4% | 99.6% | 16 | 5.28s | 9.12s | 33.7 / 33.7 | ❌ (overlap89.4%>20%, maxEp9.12s>1.5s) |
| home-half | 40.7% | 91.7% | 99.6% | 15 | 5.58s | 9.53s | 22.7 / 22.7 | ❌ (overlap91.7%>20%, maxEp9.53s>1.5s) |
| home-zero | 40.7% | 87.3% | 99.3% | 18 | 4.62s | 9.42s | ∞ / 25.7 | ❌ (overlap87.3%>20%, maxEp9.42s>1.5s) |
| asymmetric-old | 41.5% | 90.5% | 99.0% | 18 | 4.87s | 9.42s | 22.7 / 20.4 | ❌ (overlap90.5%>20%, maxEp9.42s>1.5s) |
| crowd-linear | 40.9% | 96.2% | 99.7% | 13 | 6.83s | 9.58s | 20.4 / 20.4 | ❌ (overlap96.2%>20%, maxEp9.58s>1.5s) |
| crowd-none | 40.8% | 92.3% | 99.6% | 13 | 6.61s | 9.53s | 20.4 / 20.4 | ❌ (overlap92.3%>20%, maxEp9.53s>1.5s) |
| combined-aggressive | 40.7% | 79.4% | 98.5% | 50 | 1.62s | 9.52s | 33.0 / 33.0 | ❌ (overlap79.4%>20%, maxEp9.52s>1.5s) |

---

## Akzeptanzkriterien-Analyse

Ursprüngliche Kriterien (aus Phase 5.2):
- **Overlap < 0.5 Sprite auf ≤ 20%** der Adjacent-Pair-Frames
- **Max Episode ≤ 1.5 s**

**Kein Config erfüllt beide Kriterien.** Der beste Config ("strength-10x"):
- Overlap<0.5S: 54.4% (Kriterium: ≤ 20%)
- Max Episode: 8.77 s (Kriterium: ≤ 1.5 s)

---

## Sensitivitäts-Analyse

### Parameter-Effekte

| Parameter | Baseline | Geändert | Overlap<0.5S Δ | Max-Ep Δ | Bewertung |
|---|---|---|---|---|---|
| strictness-max | — | — | -4.4pp | -0.02s | ✓ besser |
| strictness-zero | — | — | +2.1pp | +0.07s | ✗ schlechter |
| strength-3x | — | — | -5.8pp | -0.03s | ✓ besser |
| strength-10x | — | — | -40.7pp | -0.78s | ✓ besser |
| distance-2x | — | — | -5.6pp | -0.43s | ✓ besser |
| home-half | — | — | -3.4pp | -0.02s | ✓ besser |
| home-zero | — | — | -7.7pp | -0.13s | ✓ besser |
| asymmetric-old | — | — | -4.5pp | -0.13s | ✓ besser |
| crowd-linear | — | — | +1.1pp | +0.03s | ✗ schlechter |
| crowd-none | — | — | -2.8pp | -0.02s | ✓ besser |
| combined-aggressive | — | — | -15.7pp | -0.03s | ✓ besser |

### Stärkste Effekte

Größte absolute Verbesserung (Overlap<0.5S): **strength-10x**
(95.1% → 54.4%)

Schlechteste Config: **strictness-zero**
(97.2% Overlap<0.5S, 9.62s Max-Ep)

### Sanity-Check (strictness-zero)

Erwartung: Overlap schlechter als Baseline.
✅ Erfüllt: strictness=0 ergibt 97.2% vs Baseline 95.1%. Strictness-Slider wirkt wie spezifiziert.

### Home-Force-Effekt

home-zero vs baseline:
- Overlap<0.5S: 87.3% vs 95.1%
→ Home-Force hat keinen klaren negativen Effekt auf Overlap. Deutet darauf hin, dass Centerline-Konvergenz in diesem Setup nicht der dominante Overlap-Faktor ist.

---

## Strukturelle Limit-Aussage

### Geometrische Grenze

Track-Breite: **98 px**
Sprites: **8 × 60 px = 480 px** gesamt
Overpack-Faktor: **4.9×** (> 1 = geometrische Überlappung unvermeidlich)

### Erforderliches lateralForce für Equilibrium ≥ 30 px (0.5 Sprite)

Algebraisch bei s=0.5, symmetricAvoidance=true, aktuelle homeForce+avoidanceDist:
```
Benötigt: effectiveLateralForce ≈ -0.1474
         → lateralForce ≈ -0.0737 (≈ -2× aktueller Default)
```

**Das ist theoretisch erreichbar** (-2× aktueller Wert), aber die Track-Breite-Einschränkung bedeutet, dass selbst mit korrekt-berechnetem Equilibrium die 8 Racer nicht visuell überlappungsfrei auf 98 px passen.

### Kernfrage: Kann User-Ziel erreicht werden?

**Nein, nicht mit Parameter-Tuning allein auf dieser Track-Konfiguration.**

Begründung: 8 Racer × 60 px Sprite = 480 px benötigte Breite.
Track-Breite: 98 px. Selbst bei perfekter lateraler Aufteilung
(gleichmäßig verteilt) wäre der Abstand nur 12.3 px pro Racer-Slot — weniger als ein Sprite (60 px).

**Mögliche strukturelle Ansätze (nicht in dieser Spec):**
1. Größere Track-Geometrie (breitere Splines auf dirt-oval)
2. Kleinere Sprite-Größe (SPRITE_WORLD_PX reduzieren)
3. Weniger Racer in der Race-Konfiguration (≤ 1 statt 8)
4. Racer zeitlich-gestaffelt starten (t-Spread ≥ Sprite-Länge, verhindert simultane Adjacency)

---

## User-Browser-Check

3 empfohlene Configs + 1 Negativ-Vergleich:

### Config für Browser-Check 1: `strength-10x`
lateralForce × 10

Dev Screen → Race Tuning → Avoidance Advanced:
- **lateralForce**: 0.4

Was zu beobachten: Seconds 5–20 im Race — berühren die Racer-Sprites einander?

### Config für Browser-Check 2: `combined-aggressive`
Combined: s=1.0 + force×3 + home×0.5 + crowdExp=0

Dev Screen Einstellungen:
- **homeForceStrength**: 0.02
- **lateralForce**: 0.12
- **crowdNormalizationExponent**: 0
- **avoidanceStrictness**: 1

### Config für Browser-Check 3: `combined-aggressive`
Kombiniert alle Verbesserungs-Parameter.

Dev Screen Einstellungen:
- **homeForceStrength**: 0.02
- **lateralForce**: 0.12
- **crowdNormalizationExponent**: 0
- **avoidanceStrictness**: 1

### Negativ-Vergleich: `strictness-zero`
Zum Vergleich — sollte klar mehr Overlap zeigen.
- **avoidanceStrictness**: 0

**Beobachtungs-Anleitung:**
1. Dev Screen öffnen (localhost:3000 → Dev-Icon)
2. Race Tuning → Abschnitt mit den Avoidance-Parametern finden
3. Werte wie oben setzen
4. Race starten mit Dirt Oval, 8 Racer
5. Sekunden 5–20 beobachten: fahren Racer-Sprites übereinander?
6. Vergleich: schlechteste Config sollte klar mehr Überlapung zeigen

---

## Empfehlung

**→ Option C**

Track-Breite ist fundamentale geometrische Grenze (98 px, 8×60 px Sprites). Merge PR #84 (verbessert Physics-Korrektheit), strukturelle Lösung als Folge-Spec.


### Begründung im Detail

PR #84 liefert physikalisch korrektere Avoidance-Logik:
- Centerline-Deadlock behoben (symmetricAvoidance=true)
- 1e-6-Skip behoben (deterministisches Epsilon-Tie-Breaking)
- Equilibrium-Gap 5× größer (3.4 px → ~20.4 px gemessen)
- 4 vorher hard-coded Konstanten sind jetzt tunable

Die Track-Breite-Limitation (98 px / 8×60 px = 4.9× overpack) ist ein
unabhängiges Problem, das nur durch geometrische Änderungen (Track, Sprite-Größe,
Racer-Anzahl) oder zeitliche Staffelung lösbar ist. Dies ist **Hypothese C** aus der
ursprünglichen Diagnose (docs/diagnose/avoidance-diagnose.md) — ein separates Backlog-Item.

PR #84 mergen: Die Logic-Fixes sind korrekt und die Tuning-Infrastructure ist wertvoll.
Hypothese-C-Folge-Spec separat, wenn strukturelle Lösung gewünscht.


---

*Generated by avoidanceSweep.js — Etappe-23-Pattern diagnostic tool*

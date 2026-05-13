# Inventur — Architektur-Wechsel: Force-Modell → Sicht-Modell

**Branch:** `claude/sight-model-anti-collision`  
**Datum:** 2026-05-13  
**Regression Awareness Convention Schritt 1**  
**Rollback-SHA:** `47b10ef` (master vor diesem Branch)  
**Rollback-Befehl:** `git reset --hard 47b10ef` oder `git revert <merge-commit>`

---

## 1. Was leistete das Force-Modell (`47b10ef`)

### 1.1 Mechanik

Datei: `client/src/modules/raceBehavior.js` auf master `47b10ef`.

**Home Force:** Feder-Kraft Richtung Centerline (`physicalY = 0`).
```
yDelta += -physicalY * homeForceStrength
```
Default `homeForceStrength = 0.04`. Bei `physicalY = 0.95` → Rückzug 0.038 physY/Frame.

**Anisotrope Avoidance:** Paarweise Abstands-Berechnung in `(t, physicalY)`-Raum:
```
dist = sqrt((dT * tWeight)^2 + (dY * yWeight)^2)
if dist < avoidanceDistance:
    pushDir = sign(trailer.physicalY - leader.physicalY)
    yDelta[trailer] += pushDir * lateralForce * (1 - dist/avoidanceDistance)
```
- Trailer (niedriger t) weicht aus, Leader hält
- Symmetrische Distanz-Berechnung: nahe-zu-in-beiden-Achsen = stärkere Kraft
- Anti-Stacking-Normalisierung: `yDelta[trailer] /= sqrt(neighborCount)` wenn >1 Nachbar
- Speed Brake für side-by-side: `speedBrakeSet.add(trailer)` wenn `|dY| < speedBrakeYThreshold AND dT < speedBrakeTThreshold`

**Soft Repulsion:** Quadratische Grenz-Abstoßung nahe den Wänden:
```
if |physicalY| >= comfortThreshold and < 1.0:
    pen = (|physicalY| - comfortThreshold) / (1 - comfortThreshold)
    newY -= sign(physicalY) * softRepulsionStrength * pen^2
```
Default `comfortThreshold = 0.7`, `softRepulsionStrength = 0.1`.

**maxLateral Cap + Hard Clamp:** `physicalY ∈ [-maxLateral, +maxLateral]`, default `maxLateral = 0.95`.

**Drafting (Cone):** World-Pixel-Distanz + Cone-Winkel-Prüfung, unverändert. Binär an/aus.

### 1.2 Glättungs-Mechanismen auf `47b10ef`

| Mechanismus | Status auf `47b10ef` |
|---|---|
| Home Force als implizite Glättung | **Aktiv** — stabilisiert physicalY-Drift |
| Soft Boundary Repulsion | **Aktiv** |
| `_drawX`/`_drawY` Render-EMA | **Entfernt** (in `6adea85`, Etappe 20-23 Fix) |
| `avoidanceReturnSpeed` EMA (0.05) | **Nicht vorhanden** auf master 47b10ef (war in einem Zwischen-Branch D11) |
| Hard `maxLateralStepPerFrame`-Limit | **Nicht vorhanden** |

Max. physicalY-Änderung pro Frame auf master: `homeForce + avoidanceForce ≈ 0.038 + 0.01 = 0.048 physY/Frame ≈ 3.6 px/Frame` (bei corridorHalf=75). Praktisch glatt, aber **ohne garantierte Obergrenze**.

### 1.3 Konstanten und Konfigurations-Felder

```javascript
homeForceStrength: 0.04      // Heim-Feder
comfortThreshold: 0.7        // Grenz-Abstoßung ab hier
softRepulsionStrength: 0.1   // Stärke der Grenz-Abstoßung
avoidanceDistance: 0.35      // Wirkungsradius in (t,physY)-Raum
tWeight: 2.0                 // t-Achse Skalierung im Distanz-Maß
yWeight: 1.0                 // physicalY-Achse Skalierung
lateralForce: 0.01           // Kraft pro Frame bei vollem Overlap
maxLateral: 0.95             // Harte Grenze
speedBrakeYThreshold: 0.2    // Side-by-side-Erkennung (lateral)
speedBrakeTThreshold: 0.015  // Side-by-side-Erkennung (longitudinal)
speedBrakeFactor: 0.95       // Brems-Faktor wenn avoidanceActive
draftingMaxDistance: 110     // Drafting-Distanz (World-px)
draftingConeAngle: 30        // Cone-Winkel (Grad)
draftingBoost: 1.1           // Geschwindigkeits-Bonus
startSpreadRange: 0.95       // Startgitter-Spread
runoutZone: 0.05             // Auslauf-Zone am Ende
```

### 1.4 Behandelte Edge-Cases

- **Wrap-around auf geschlossener Bahn:** `dT = abs(rA.t - rB.t); if dT > 0.5: dT = 1 - dT`
- **yDiff ≈ 0 skip:** wenn Trailer direkt auf Leader-Linie, kein Push-Richtungs-Flip
- **Anti-Stacking:** `sqrt(neighborCount)` Normalisierung für dichte Gruppen
- **maxLateral cap:** explizit `Math.min(config.maxLateral, 1.0)`
- **Drafting-Tie-Break:** `leader.t > follower.t` (vor dem Ziel = Leader)

### 1.5 User-Anforderungen die sichtbar erfüllt wurden

- ✅ Racer verteilen sich auf der Bahn (Home Force)
- ✅ Speed-Brake bei direktem Side-by-Side-Kontakt
- ✅ Drafting-Slipstream (Cone-Mechanik)
- ✅ Keine Render-EMA-Doppelbilder (seit `6adea85`)

### 1.6 User-Anforderungen die NICHT erfüllt wurden

- ❌ Keine persistenten Pulks in der Renn-Phase (99.2 % Force-Cancellation in Pulks, PR #88)
- ❌ Spurwechsel ohne Teleportation-/Sprung-Artefakte (kein `maxLatStep`-Limit)
- ❌ Racer lösen Overlaps aktiv lateral auf (64 % Frames mit Cluster nach Slot-Umbau, PR #90)
- ❌ Smooth Drafting-Übergang (binäres an/aus)

### 1.7 Historischer Diagnose-Kontext

| PR | Inhalt | Quantitatives Ergebnis |
|---|---|---|
| #86 | Slot-basierte Anti-Collision ersetzt Force | 86 % Fallback-Rate, Slot-Oscillation |
| #88 | EMA-Glättung, Wall-Escape-Diagnose | Pair 8_11 / 4_9 identifiziert |
| #89 | Wall-Escape + Slot-Step ≥ minLat | Beide Dead-Locks gelöst, Macro-Oscillation neu |
| #90 | Pulk-Genese, Auflösungs-Diagnose | 64 % Frames mit Cluster, 12/20 Hüpfer, t50 max 3s |

Alle drei Fix-Versuche innerhalb der Slot-Logik zeigten abnehmenden Grenznutzen gemäß
PROJECT-PRINCIPLES.md §7 (No hotfixes). Architektur-Wechsel ist konsequente Maßnahme.

---

## 2. Anforderungs-Matching — Sicht-Modell

### 2.1 Was das Sicht-Modell anders macht

| Anforderung | Force-Modell | Sicht-Modell |
|---|---|---|
| Pulk-Entstehung verhindern | Reaktiv (nach Kontakt) | **Präventiv** (Blick voraus ~1.5s) |
| Spurwechsel glätten | Keine Garantie | **Hard limit `maxLateralStepPerFrame`** |
| Oscillation verhindern | Nicht adressiert | **`laneCommitFrames`** (Cross-Frame-Stabilität) |
| Drafting-Übergang | Binär | **Smooth `draftingBoostFactor`** (0→1 über N Frames) |
| Heim-Spur | Centerline-Feder | **Keine** (opportunistische Spurwahl) |
| Wand-Flucht | Soft Repulsion | **Kandidaten-Priorisierung** (Center-first Sortierung) |
| Sichere Überhol-Entscheidung | Nicht vorhanden | **Phase 3 Überhol-Logik** mit Speed-Vorteil-Prüfung |

### 2.2 Bewegungs-Glättung im Sicht-Modell

Jede Bewegung läuft über den gleichen Mechanismus:
```
step = clamp(targetPhysicalY - physicalY, -maxLateralStepPerFrame, +maxLateralStepPerFrame)
physicalY = clamp(physicalY + step, -MAX_LATERAL, +MAX_LATERAL)
```

- **`maxLateralStepPerFrame`** (Default ~4px/Frame @corridorHalf=75 = 240px/s) garantiert
  keine sichtbaren Sprünge — eine Unit-Test-Invariante, nicht nur ein Richtwert
- Committed Manöver laufen vollständig ab (kein per-Frame-Flip)
- Keine EMA-Asymptote die bei Gegenkräften zu Oscillation führt

### 2.3 Doppelbilder-Check

Die Render-EMA (`_drawX`/`_drawY`) wurde in `6adea85` entfernt, weil die damaligen schnellen
Positionssprünge (`getPosition()` Staircase-Bug, Lesson 70) das Rendering destabilisierten.
Im Sicht-Modell sind Positionssprünge strukturell ausgeschlossen (hard `maxLatStep`-Limit).
Die Render-EMA wird **nicht** wieder eingebaut — sie würde die already-smooth Bewegung nur
doppelt dämpfen und Sprite/Tag-Desync einführen. Falls unerwartet Aliasing auftaucht: erst
diagnostizieren, dann Rücksprache.

### 2.4 Bewusste Trade-offs

- **Keine globale Positions-Optimierung:** Das Sicht-Modell ist lokal pro Racer. Wenn alle
  Spuren belegt sind, bremst der Racer. Globale PBD-Löser wären präziser aber unverhältnismäßig.
- **tHorizon = baseSpeed × sightHorizonFrames:** Schnellere Racer "sehen" mehr t-Distanz
  voraus. Langsamere sehen weniger. Das ist realistisch und günstig (schnelle Überhöler
  reagieren früher).
- **Kein Rückweg-zur-Mitte:** Racer bleiben auf gewählter Spur bis ein Grund kommt zu wechseln.
  Das sieht realistischer aus als erzwungene Centerline-Rückkehr.

---

## 3. Rollback-Pfad

**Pre-Wechsel master-SHA:** `47b10ef`

```bash
# Option A: Branch-basierter Rollback
git reset --hard 47b10ef        # zurück zur Force-Logik auf lokalem Branch

# Option B: Merge-Revert (nach PR-Merge auf master)
git revert <merge-commit-sha>   # erzeugt neuen Commit der den Merge rückgängig macht

# Option C: Sicht-Modell-Branch behalten, neuen Fix-Branch von 47b10ef
git checkout -b hotfix/avoidance-fix 47b10ef
```

Alle Commits auf `claude/sight-model-anti-collision` sind von master isoliert bis zum Merge.
Der Branch bleibt als Re-Try-Basis verfügbar.

---

## 4. Referenzen

- `client/src/modules/raceBehavior.js` auf `47b10ef` — Force-System (wird ersetzt)
- `docs/diagnose/classification-trace-analysis.md` — K1-K6 Hypothesen-Auswertung
- `docs/diagnose/pulk-decision.md` — Quantitative Entscheidungs-Grundlage für Architektur-Wechsel
- PROJECT-PRINCIPLES.md §6 (Diagnose before fix), §7 (No hotfixes)
- Lesson 71 — Symmetric Avoidance Default war eine Regression
- Lesson 74 — Reactive Anti-Collision Architecture Has Structural Limits (diese Etappe)

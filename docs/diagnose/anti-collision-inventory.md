# Anti-Collision Architecture — Inventory & Migration Plan

**Date:** 2026-05-13
**Branch:** `claude/anti-collision-slot-based`
**Context:** Regression Awareness Convention — Step 1 (Inventur) before replacing the force-based
avoidance system with a slot-based anti-collision system.
**Master SHA before this change:** `47b10ef`

---

## Section 1 — Inventur der alten Komponente

### 1.1 Existierende Kraft-Konstanten (DEFAULT_RACE_BEHAVIOR_CONFIG auf master)

| Konstante | Default | Funktion |
|---|---|---|
| `homeForceStrength` | 0.04 | Spring-Kraft zurück zur Centerline (physicalY = 0) |
| `comfortThreshold` | 0.7 | Ab welchem physicalY beginnt die Soft-Repulsion |
| `softRepulsionStrength` | 0.1 | Stärke der quadratischen Grenz-Repulsion |
| `avoidanceDistance` | 0.35 | Anisotrope Distanz-Schwelle für Pair-Avoidance |
| `tWeight` | 2.0 | Gewichtung der T-Achse im anisotropen Distanzmetrik |
| `yWeight` | 1.0 | Gewichtung der Y-Achse im anisotropen Distanzmetrik |
| `lateralForce` | 0.01 | Stärke der lateralen Avoidance-Kraft pro Frame |
| `maxLateral` | 0.95 | Maximale physicalY-Ablage nach Clamp |
| `speedBrakeYThreshold` | 0.2 | Y-Abstand-Schwelle für Speed-Brake-Aktivierung |
| `speedBrakeTThreshold` | 0.015 | T-Abstand-Schwelle für Speed-Brake-Aktivierung |
| `speedBrakeFactor` | 0.95 | Geschwindigkeitsmultiplikator wenn avoidanceActive=true |

### 1.2 Algorithmus (force-based)

**Ablauf pro Frame in `applyRacerBehavior`:**

1. **Home Force:** `deltaY = -physicalY * homeForceStrength` — zieht jeden Racer zur Centerline
2. **Anisotropes Paar-Avoidance:** für jedes Paar (i, j):
   - Anisotrope Distanz `d = sqrt((dT * tWeight)² + (dY * yWeight)²)`
   - Falls `d >= avoidanceDistance`: kein Effekt
   - Kraft-Magnitude: `forceMag = lateralForce * (1 - d/avoidanceDistance)`
   - Klassifikation: Trailer (niedrigeres T) weicht aus, Leader hält
   - Push: Trailer wird vom Leader-Y weg geschoben
3. **Anti-Stacking:** Avoidance-Kräfte werden durch `sqrt(neighborCount)` normiert
4. **Soft Repulsion:** quadratische Rückwärtskraft wenn `|physicalY| > comfortThreshold`
5. **Hard Clamp:** physicalY ∈ [-maxLateral, +maxLateral]
6. **Speed Brake:** wenn Racer seitlich nebeneinander sind (beide Schwellenwerte erfüllt) → `avoidanceActive = true`
7. **Drafting Cone:** separater Durchlauf in Weltpixel-Raum (bleibt unverändert)

### 1.3 Erfüllte Edge-Cases

- **Start-Phase:** `startSpreadRange` in `computeRowPhysicalY` verteilt Racer auf die Breite. Kein eigener Start-Phase-Code in `applyRacerBehavior` auf master (startPhaseAvoidanceFactor etc. waren auf dem Avoidance-Diagnose-Branch, nicht auf master).
- **Dichte Pulks:** Anti-Stacking durch `sqrt(N)` Normierung. Diagnose hat aber belegt: bei symmetrischen Nachbarschafts-Konstellationen heben sich Kräfte auf (99.2% Cancellation) → Root Cause der Cluster-Bildung.
- **Bahnränder:** Soft Repulsion + Hard Clamp verhindert Ausbruch über physicalY = ±1.
- **Speed-Brake-Interaktion:** `avoidanceActive`-Flag → `speedBrakeFactor` in RaceScreen. Flag wird gesetzt wenn Racer direkt nebeneinander (keine laterale Ausweichmöglichkeit geprüft).
- **Drafting-Interaktion:** Drafting ist komplett separat (Weltpixel-Cone-Check). Keine Wechselwirkung mit Avoidance-Kräften.

### 1.4 User-Anforderungen die sichtbar erfüllt werden

1. Racer überlappen sich nicht dauerhaft (aber 30.5% Mid-Track-Overlaps bei 20 Racern gemessen — Ziel nicht erreicht)
2. Racer kehren nach Ausweich-Manövern zur Centerline zurück
3. Racer bremsen bei Side-by-Side-Situation leicht ab
4. Drafting/Slipstream funktioniert unabhängig von Avoidance
5. Avoidance deaktivierbar (enabled-Flag)

---

## Section 2 — Anforderungs-Matching (neue Slot-Logik)

| Alte Anforderung | Slot-System-Coverage | Trade-off |
|---|---|---|
| Keine dauerhaften Overlaps | **Strukturell garantiert** via Hitbox-Constraint statt statistisch | Kein Trade-off — das ist der Hauptvorteil |
| Rückkehr zur Centerline | **Nicht mehr:** Slot-Logik bewegt Racer nur bei Kollision. Zentrierungsdrift entfällt bewusst. | Trade-off: Racers bleiben eher auf ihrer zugewiesenen Spur. Visueller Effekt: stabileres Fahrverhalten, weniger Pendeln |
| Speed-Brake bei Side-by-Side | **Übernommen:** `avoidanceActive`-Flag wird bei Hybrid-Fallback (kein Slot frei) gesetzt. `speedBrakeFactor` bleibt in Config. | Trigger-Bedingung ändert sich: war T/Y-Schwellenwert, neu: pixel-basierte Hitbox-Überlappung + kein freier Slot |
| Drafting unverändert | **Vollständig übernommen** — Drafting-Code unverändert | Kein Trade-off |
| Avoidance deaktivierbar | **Übernommen** — `enabled`-Flag bleibt | Kein Trade-off |
| Soft/Hard Boundary | **Ersetzt:** physicalY wird auf ±0.95 geclampt, keine Soft Repulsion mehr. Slot-Suche respektiert Grenze. | Racers können bis an die Grenze gedrückt werden ohne Soft Repulsion — wirkt ggf. direkter |
| Anti-Stacking bei N Racers | **Strukturell gelöst:** Pixel-Hitboxes schließen Überlappung aus, keine Kraft-Normierung nötig | Kein Trade-off — direkt besser |

### Neue Kapazitäten der Slot-Logik

- **Sprite-basierte Hitboxes:** automatisch aus Sprite-Asset ermittelt → schmalere Sprites fahren enger, breitere Sprites brauchen mehr Platz
- **Vorfahrt-Hierarchie:** explizite Regel wer ausweicht (Trailer yields, Linienhalter hat Vorfahrt, Schutz-Regel für Zurückfallende)
- **Pixel-Distanzmessung:** Kollisions-Erkennung in Weltpixeln statt normiertem Raum → skaliert korrekt mit Track-Geometrie

---

## Section 3 — Rollback-Pfad

**Pre-merge master SHA:** `47b10ef`

**Rollback-Befehl:**
```bash
git revert <merge-commit-sha>
```
oder falls kein Merge-Commit bekannt:
```bash
git reset --hard 47b10ef
```

**Branch bleibt verfügbar:** `claude/anti-collision-slot-based` — kann bei Bedarf neu gestartet oder als Referenz-Diff genutzt werden.

**Identifikation der geänderten Dateien (für selektiven Rollback):**
- `client/src/modules/raceBehavior.js` — Kern-Logik
- `client/src/modules/spriteHitbox.js` — neu (löschen für Rollback)
- `client/src/modules/storage/defaults.js` — Config-Konstanten
- `client/src/modules/raceBehaviorConfig.js` — Schema-Validierung
- `client/src/screens/DevScreen/sections/RaceTuningSection.jsx` — UI

---

## Bekannte offene Punkte (Out of Scope für diese Spec)

- **Drafting × Hitbox-Interaktion:** Drafting-Cone-Check verwendet Weltpixel-Distanzen. Falls neue Hitboxes die effektive Racer-Größe ändern, könnte der Cone für manche Sprite-Typen falsch liegen. Kein Fix in dieser Spec, als Befund dokumentiert.
- **Startaufstellung:** Row-Layout setzt Racer mit `startSpreadRange`. Falls `safetyMarginPx + visibleWidthPx × N > corridorWidthPx`, sind Racer in der Startlinie enger als der safetyMarginPx erlaubt. Das System wird dann beim ersten Frame Slot-Suchen ausführen und Racer ggf. verschieben. Kein Fix, als erwartetes Verhalten dokumentiert.
- **Open-Track vs. Closed-Track:** Der Algorithmus arbeitet mit Weltpixel-Positionen und ist Track-Typ-agnostisch. Kein bekanntes Problem, aber nicht explizit diagnosiert.

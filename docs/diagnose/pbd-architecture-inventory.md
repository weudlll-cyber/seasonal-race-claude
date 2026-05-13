# PBD Architecture Inventory
**Regression Awareness Convention — Schritt 1**
Branch: `claude/pbd-anti-collision` | Date: 2026-05-13

---

## 1. Was leistete das Sicht-Modell (`claude/sight-model-anti-collision`, Commit `191c3ce`)

### Mechanik
- **Phasen-Logik:** Jeder Racer schaut `sightHorizonFrames` Frames voraus.
  Erkennt er eine Bedrohung (Racer im eigenen Lane innerhalb des Horizonts), wechselt
  er in eine freie Lane. Commitment-Timer verhindert Frame-zu-Frame-Oszillation.
- **Lane-Commit:** `laneCommitFrames` hält den Racer an seiner gewählten Ziel-Lane fest,
  auch wenn zwischendurch neue Bedrohungen auftauchen.
- **Overtake-Aggression:** `overtakeAggressionDefault` + `speedAdvantageThreshold` steuern,
  ob ein schnellerer Racer aktiv überholt oder wartet.
- **Safety-Net:** World-Space-Overlap-Check am Ende jedes Frames; bei echtem Hitbox-Overlap
  wird der wandnähere Racer per Micro-Nudge aus dem Overlap geschoben.
- **Drafting:** Smooth activation via `draftingBoostFactor` (ramp 0→1 über
  `draftingActivationFrames` Frames). Cone-Geometrie (Winkel + Distanz).
- **Bewegungs-Glätte:** `maxLateralStepPerFrame` als harter Cap pro Frame auf physicalY-Delta.
  Keine Render-EMA.

### Konstanten
| Konstante | Default | Zweck |
|---|---|---|
| `sightHorizonFrames` | 90 | Wie weit voraus jeder Racer schaut |
| `safetyMarginPx` | 4 | Mindestabstand zwischen Hitboxen |
| `laneCommitFrames` | 30 | Frames die ein Lane-Wechsel gehalten wird |
| `overtakeAggressionDefault` | 0.5 | Wahrscheinlichkeit zu überholen bei Speed-Vorteil |
| `speedAdvantageThreshold` | 0.00003 | Mindest-Speed-Vorteil für Overtake |
| `maxLateralStepPerFrame` | 4 | px/Frame max laterale Bewegung |
| `draftingActivationFrames` | 20 | Frames für Drafting-Ramp (0→1) |
| `speedBrakeFactor` | 0.95 | Speed-Malus wenn alle Lanes blockiert |
| `draftingMaxDistance` | 110 | Maximale Distanz für Drafting (px) |
| `draftingConeAngle` | 30 | Cone-Halbwinkel für Drafting (°) |
| `draftingBoost` | 1.1 | Speed-Multiplikator bei Drafting |

### Was war erfüllt
- Bewegungs-Glätte: kein Frame mit `|ΔphysicalY| > maxLateralStepPerFrame` (numerisch verifiziert in Tests)
- Doppelbilder-Freiheit: keine Render-EMA, physicalY aus Modell selbst
- Drafting-Mechanik: smooth activation, keine binären Flips
- Sprite-Hitbox-Auto-Erkennung: spriteHitbox.js korrekt integriert

### Was war nicht erfüllt
- **Pulk-Auflösung im Browser:** Bei 20 Racern mit aktivem Drafting konvergieren
  Verfolger auf die Spur des Vordermanns, überwinden die proaktive Sicht-Logik.
  Visuelle Verifikation 13.05.2026 bestätigt persistente Pulks in Renn-Phase.
- **Safety-Net zu reaktiv:** World-Space Nudge greift erst bei echtem Overlap,
  löst keine Pulk-Formation präventiv auf.

### Übernehmenswerte Bausteine
- **spriteHitbox.js** — komplett übernommen (cherry-pick `e41a676`)
- **RaceScreen hitbox-wiring** — komplett übernommen (cherry-pick `b7b23cb`)
- **`maxLateralStepPerFrame`-Konzept** — wird in PBD als Step-3-Cap beibehalten
- **Smooth-Drafting `draftingBoostFactor`-Mechanik** — unverändert in PBD
- **physicalY-Normalisierung** ([-1, +1], corridorHalfWidthPx als Skala) — unverändert

---

## 2. Was leistete master `47b10ef` (Force-System)

### Mechanik
- **Home-Force:** Spring-Kraft Richtung physicalY=0 (`homeForceStrength: 0.04`).
- **Soft-Repulsion:** Comfort-Zone-basierte Abstoßung (`comfortThreshold`, `softRepulsionStrength`).
- **Anisotropic Avoidance:** Kräftefeld mit t-Gewichtung und Y-Gewichtung (`tWeight`, `yWeight`).
  Trailer yields, leader holds (asymmetrische Kraft).
- **Speed-Brake:** Wenn zwei Racer side-by-side (Schwellenwerte `speedBrakeYThreshold`,
  `speedBrakeTThreshold`).
- **Drafting:** Binärer Boost (kein Smooth-Ramp), Cone-Geometrie.
- **Keine Bewegungsglätte:** `maxLateralStepPerFrame` existiert nicht. Physische
  Y-Position ändert sich durch akkumulierte Kräfte, beliebige Sprünge möglich.

### Konstanten (aus master defaults.js)
| Konstante | Default | Problem |
|---|---|---|
| `homeForceStrength` | 0.04 | Zieht Racer zur Mitte, kompensiert Avoidance |
| `comfortThreshold` | 0.7 | Comfort-Zone-Grenze |
| `softRepulsionStrength` | 0.1 | Soft-Boundary-Kraft |
| `avoidanceDistance` | 0.35 | Anisotrope Avoidance-Distanz |
| `tWeight` | 2.0 | Longitudinales Gewicht in Avoidance-Metrik |
| `yWeight` | 1.0 | Laterales Gewicht in Avoidance-Metrik |
| `lateralForce` | 0.01 | Avoidance-Kraft lateral |

### Problematische Eigenschaften (User-Statement 13.05.2026)
- **Symmetric Cancellation:** In dichten Pulks heben sich Avoidance-Kräfte gegenseitig auf
  (Symmetrie-Problem, PR #88: 99.2% Cancellation Rate). Stärke der Kraft irrelevant.
- **"Es war schon vor PR #84 zeitweise besser"** — User-Beobachtung: Force-Modell hatte
  phasenweise akzeptables Verhalten, aber nicht reproduzierbar.
- Keine Bewegungsglätte: Racer konnten sprunghaft die Position wechseln.

---

## 3. Anforderungs-Matching PBD → Sicht-Modell + Force

| Anforderung | Force erfüllt | Sicht erfüllt | PBD-Ansatz |
|---|---|---|---|
| Keine sichtbaren Sprünge | ✗ | ✓ | Step-3 EMA mit maxLateralStepPerFrame |
| Keine Pulks in Renn-Phase | ✗ | ✗ | Harte Constraint-Iteration (garantiert) |
| Drafting smooth | ✗ | ✓ | Unverändert aus Sicht-Modell |
| Führender wird nicht verdrängt | Teilw. | Teilw. | Asymmetrie: frontWeight=0.2 |
| Racer zieht zur Mitte | ✓ | ✗ | centerlineForce in Step 1 |
| Doppelbilder-frei | ✗ | ✓ | Kein Render-EMA; Bewegung aus Modell |
| Sprite-Hitbox auto | ✗ | ✓ | Cherry-picked, unverändert |

### Bewusste Trade-offs
- **Centerline vs. Clustering:** PBD löst Clustering durch Constraints auf;
  Centerline-Anziehung führt Racer dann Richtung Mitte, ohne Clustering zu erzwingen.
- **Iterationsanzahl vs. Performance:** 5 Iterationen/Frame bei 20 Racern = 5×190 Paar-Checks.
  Bei 60fps vernachlässigbar, da reine Arithmetik ohne DOM-Zugriff.
- **Sub-Pixel-Restoverlap:** Nach 5 Iterationen können <1px Restoverlaps bestehen.
  Diese werden akzeptiert (nächster Frame löst weiter auf). Kein Crash-Risiko.

---

## 4. Rollback-Pfad

| Schritt | Kommando |
|---|---|
| Vollständiger Rollback auf Force-System | `git reset --hard 47b10ef` |
| Sicht-Modell als Referenz | `git checkout claude/sight-model-anti-collision` |
| Pre-PBD master SHA | `47b10ef` |

**Sicht-Modell-Branch** `claude/sight-model-anti-collision` bleibt erhalten.
PBD-Branch `claude/pbd-anti-collision` ist der aktive Arbeits-Branch.

# Constraints-First Planner — Regression Awareness Inventur

**Branch:** `claude/constraints-first-planner-impl`  
**Date:** 2026-05-13  
**Pre-work:** Regression Awareness Convention Schritte 1–3  
**Rollback-SHA:** `47b10ef` (master vor dieser Architektur)

---

## 1. Was leisteten die alten Systeme — und wo scheiterten sie konkret

### Force-Modell (vor PR #84)

**Was es leistete:** Radiale Abstoßungs-Kraft zwischen Racer-Paaren in (t, physicalY)-Raum. Trailer
yields, leader holds. Asymmetrische Kraft-Zuweisung.

**Wo es scheiterte:** Bei dichten Pulks (20 Racer auf dirt-oval) entstand symmetrische
Kraft-Cancellation: Racer A schiebt B nach rechts, B schiebt A nach links, Netto-Kraft null.
PR #88 Trace: 99.2 % der Frames mit aktivem Cluster ohne messbare Trennung. Die Stärke der Kraft
war irrelevant — das Problem war strukturell.

**Root Cause:** Anti-Collision war eine Kraft-Empfehlung neben anderen Kräften (Centerline,
Drafting). In einem symmetrischen Pulk kommt sie zur Kräfte-Summe null.

---

### Slot-Modell (PR #86 + drei Fix-Iterationen)

**Was es leistete:** Diskrete Slot-Zuweisung: jeder Racer bekommt einen Ziel-physicalY-Slot. Lokale
Pair-Resolution: zwei kollidierende Racer tauschen/wechseln Slots.

**Wo es scheiterte:**
- **Slot-Suche-Versagen (86 % Fallback-Rate):** In dichten Pulks kein freier Slot auffindbar → alle
  Racer bleiben wo sie sind.
- **Oscillation:** Slot-Zuweisung ändert sich Frame für Frame → Racer springen ±40–130 px lateral.
- **Squeeze-Resonanz:** Wall-Escape-Fix (Slot-Step ≥ minLat) erzeugte neue Oscillation an anderem
  Ort.
- PR #89 Trace: 64 % aller Frames mit aktiven Clustern.

**Root Cause:** Lokale Pair-Resolution ist frame-lokal. Sie erzeugt global inkonsistente Ziel-Slots
(A will links von B, B will links von C, C will links von A — kein globales Optimum). Kein
Cross-Frame-Memory → Oscillation.

---

### Sicht-Modell (PR #91)

**Was es leistete:** Proaktive Vorausschau: Racer "sieht" Hindernisse im Voraus (Lookahead-Cone)
und leitet frühzeitig Ausweich-Manöver ein. Laterale Soft-Repulsion mit maxLateralStepPerFrame-
Begrenzung. Sanftere Bewegung als Slot-Modell.

**Wo es scheiterte:** Proaktive Logik unterliegt konkurrierenden Anziehungen. Drafting zieht Racer
zur Mitte. Wenn 20 Racer drafting-getrieben zur Centerline streben, baut sich ein dichterer Pulk
auf als die Sicht-Logik auflösen kann. Anti-Collision war weiterhin eine Empfehlung neben
stärkeren Anziehungen. Visuelle Verifikation 13.05.2026: persistente Pulk-Bildung sichtbar.

**Root Cause:** Keine harten Constraints. Anziehung kann Abstoßung übertrumpfen.

---

### PBD-Modell (PR #92)

**Was es leistete:** Position-Based-Dynamics: harte laterale Constraints nach jedem Frame.
Symmetrie-Cancellation-Problem gelöst — Constraint-Verletzung wird direkt korrigiert, nicht als
Kraft hinzugefügt. Kein Force-Sum mehr.

**Wo es scheiterte:** PBD löst nur **lateral**. Wenn 20 Racer durch Centerline-Anziehung
gleichzeitig zur Mitte convergieren, verteilt PBD sie nebeneinander auf demselben s-Wert
(gleiche Längs-Position). Resultat: alle 20 Racer auf einer Linie quer zur Bahn.

User-Beobachtung 13.05.2026: *"jetzt haben wir die absolut schlechteste variante die racer laufen
alle auf einer linie auf allen möglichen spuren und springen zwischen den spuren stark hin und
her."*

**Root Cause:** PBD fehlte die **longitudinale Dimension**. Wenn lateral nicht ausweichbar, muss
der nachkommende Racer longitudinal bremsen (stau hinter dem Vordermann) — nicht lateral quetschen.

---

## 2. Anforderungs-Matching: wie deckt der Constraints-First-Planner jeden Failure-Mode ab

| Failure-Mode | Beschreibung | Lösung im Constraints-First-Planner |
|---|---|---|
| **Symmetrie-Cancellation** | Kräfte-Summe null bei dichtem Pulk | Harte Constraints statt Kraft-Summen. Solver erzwingt Separation — es gibt kein Gegenkraft-Argument. |
| **Slot-Oscillation** | Frame-lokale Pair-Resolution wechselt Ziel jedes Frame | Receding-Horizon-Planning mit SpaceTime-Reservation (0.6–1.0s Horizon). Einmal geplante Trajektorie bleibt bis zum nächsten Replanning stabil. |
| **Drafting-Konvergenz** | Drafting-Anziehung übertönt Anti-Collision | Drafting als **Soft-Ziel im Optimierer** (Intent-Layer), Anti-Collision als **Hard-Constraint** (Solver-Layer). Hard beats Soft strukturell — mathematische Garantie, kein Kräfte-Wettkampf. |
| **Lineare Querfront** | PBD trennt nur lateral, alle landen auf gleicher s-Position | **Longitudinale Bremsung als Fallback:** wenn lateral blockiert (`lateralBlocked` Flag), bremst der Solver in s-Richtung. Stauung statt Überlappung. |
| **Frame-lokale Reaktion** | Keine Vorausschau → Oscillation bei hoher Dichte | SpaceTime-Reservation über Horizon: bereits geplante Pfade höher-priorisierter Racer belegen Raum-Zeit-Kapseln. Niedrig-priorisierte Racer planen um diese herum. |
| **Gleichberechtigte Kräfte** | Anti-Collision kann verlieren | Asymmetrische Priorität (vorne zuerst). Leader plant zuerst, reserviert Raum. Verfolger planen danach um die Reservierung herum. |

---

## 3. Übernehmenswerte Bausteine aus früheren Branches

### Sprite-Hitbox-Modul (aus PR #86, mehrfach cherry-picked)

**Commits:** `25bfa03` (Modul), `edb5baa` (Attach zu Racers)

**Was es tut:** Auto-Erkennung von `visibleWidthPx` / `visibleLengthPx` aus dem Sprite-Sheet via
OffscreenCanvas-Pixel-Scan. Ergebnis wird auf jedem Racer als `.visibleWidthPx` / `.visibleLengthPx`
gespeichert. Der Planner nutzt diese Werte als `bboxLat` / `bboxLong` für
Collision-Detection-Margins.

**Warum übernehmen:** Ohne korrekte Sprite-Größe sind die Safety-Margins falsch → entweder zu
enge Separation (sichtbare Überlappungen) oder zu weite (Racer weichen unnötig weit aus).

**Status:** Cherry-pick auf Implementierungs-Branch als separater Commit.

---

### `maxLateralStepPerFrame`-Konzept (aus Sicht-Modell / PR #91)

**Was es tut:** Begrenzt den lateralen Positions-Sprung pro Frame auf einen konfigurierbaren
Maximalwert. Verhindert Doppelbilder und abrupte Positions-Änderungen.

**Wie übernommen:** Das Constraints-First-Skelett bildet dieses Konzept als kinematische Constraints
im Solver ab: `vYMax` und `aYMax` begrenzen laterale Geschwindigkeit und Beschleunigung. Da der
Solver kinematisch konsistente Trajektorien erzeugt, ist Glätte durch die Constraints garantiert —
keine nachgelagerte EMA-Schicht nötig (Lesson 70).

---

### Drafting-Mechanik (Cone, Bonus)

**Was es tut:** Berechnet ob ein Follower in der Wake-Zone eines Leaders liegt (Kegel hinter dem
Leader) und setzt `draftBonus` (Geschwindigkeits-Multiplikator).

**Wie übernommen:** Drafting-Logik bleibt als `draftApi.computeDraftBonus(horse, horses, track)`
erhalten. Wird in `computeIntents` (Step B der planFrame-Pipeline) als `desiredVS`-Modifikation
eingebaut. Drafting ist **nur noch ein Soft-Intent** — es kann Collision-Constraints nicht
überstimmen.

---

## 4. Rollback-Pfad

- **Pre-Constraints-First master-SHA:** `47b10ef`
- **Rollback-Befehl:** `git reset --hard 47b10ef`
- **Branch `claude/pbd-anti-collision`** bleibt verfügbar als Vorgänger-Architektur
- **Branch `claude/constraints-first-planner-skeleton`** (PR #93) ist Basis dieses Branches

---

## 5. Out-of-Scope-Befunde (dokumentieren, nicht fixen)

Diese Punkte können während der Implementierung auftreten und werden hier dokumentiert wenn
relevant, aber nicht im Rahmen dieser Spec behoben:

- **Track-Geometrie-Überfüllung:** Bei sehr schmalen Tracks mit vielen Racern (z.B. 20 Racer auf
  50 px Corridor-Half-Width) sind die Safety-Margins geometrisch nicht lösbar. Befund:
  Reservation-Infeasible-Rate steigt über 3 %. Korrektur: Track-Editor-seitig mehr Breite oder
  weniger Racer — kein Planner-Problem.

- **Externe Solver-Library:** Eigener Sequential-Projected-Gradient-Solver (wie im Skelett). Wenn
  Performance bei 100+ Racern unzureichend: separate Spec für quadprog-js oder OSQP-WASM.

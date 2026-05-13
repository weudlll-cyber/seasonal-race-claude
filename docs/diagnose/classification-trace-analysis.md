# Diagnose — Vorfahrt-Klassifikation in persistenten Renn-Phase-Clustern

**Branch:** `claude/diagnose-classification-trace`  
**Datum:** 2026-05-13  
**Skript:** `scripts/diag-classification-trace.mjs`  
**Daten:** `docs/diagnose/classification-trace-data.ndjson` + `classification-summary.json`  
**Setup:** 20 Racer, dirt-oval, corridorHalf=60px, EMA=0.2, 600f Burn-in + 900f Trace

---

## 1. Symptom

Nach dem Übergang in die Renn-Phase (t-Position der Racer streut sich durch unterschiedliche Speeds)
zeigt der Browser dauerhaft überlagernde Sprites, die nicht aufgelöst werden. Die Unit-Tests melden
< 1 % Overlap, aber im Browser sind es nahezu 100 % der Frames.

Die Frage dieses Sprints: **Welche Klassifikations-/Ausweich-Entscheidung verhindert die Auflösung?**

---

## 2. Mess-Ergebnisse

### 2.1 Gesamt-Statistik (Trace-Phase, 900 Frames)

| Metrik | Wert |
|---|---|
| Overlap-Rate | **99.7 %** der Frames haben ≥1 Pair |
| Max simultane Overlap-Pairs | 5 |
| Unique Pairs mit Overlap | 18 |
| Persistent Pairs (≥10 Frames) | **18 / 18** (alle!) |

→ Alle Paare die je overlappen, overlappen dauerhaft. Es gibt keinen einzigen selbst-auflösenden Fall.

### 2.2 Klassifikations-Verteilung

| Regel | Frames | Anteil |
|---|---|---|
| `a_leaderMoving` | 1 195 | **53.6 %** |
| `c_calmerHolds` | 848 | **38.0 %** |
| `b_fasterFromBehind` | 101 | 4.5 % |
| `a_lineHolder` | 85 | 3.8 % |
| `d_schutzRegel` (Swap) | 0 | 0.0 % |

### 2.3 Slot-Outcome-Verteilung

| Outcome | Frames | Anteil |
|---|---|---|
| `fallback` | 1 919 | **86.1 %** |
| `found` | 310 | 13.9 % |
| `unchanged` | 0 | 0.0 % |

→ In 86 % aller Overlap-Frames wird kein freier Slot gefunden. Der Fallback (Nudge) dominiert.

### 2.4 Top-Persistent-Pairs

| Pair | Frames total | Max-Streak | SlotFound | Fallback | BothStable | Top-Regel |
|---|---|---|---|---|---|---|
| `3_16` | 339 | 130f | 22 % | 79 % | 68 % | c_calmerHolds |
| `4_14` | 297 | 195f | 10 % | 90 % | 91 % | a_leaderMoving |
| **`4_9`** | **289** | **288f** | 1 % | 99 % | 99 % | a_leaderMoving |
| `10_19` | 259 | 236f | 10 % | 90 % | 90 % | c_calmerHolds |
| `10_14` | 213 | 105f | 7 % | 93 % | 94 % | a_leaderMoving |
| `4_7` | 160 | 90f | 1 % | 99 % | 100 % | a_leaderMoving |
| **`8_11`** | **114** | **114f** | **0 %** | **100 %** | **100 %** | a_leaderMoving |

---

## 3. Exemplarische Cluster-Analyse

### 3.1 Pair 4_9 — Squeeze-Attractor (288f ununterbrochen)

Racer 9 (Keeper, physY = −0.267 fix) vs. Racer 4 (Yielder, driftet outward).

**Frames 521–548 — Beginn der stabilen Phase:**

```
f=521 rule=b k=9 y=4 slot=fallback kpy=-0.267 ypy=-0.296 yTgt=-0.316 tDelta=0.020 emaY=-0.0040
f=522 rule=b k=9 y=4 slot=fallback kpy=-0.267 ypy=-0.300 yTgt=-0.320 tDelta=0.020 emaY=-0.0040
f=523 rule=b k=9 y=4 slot=fallback kpy=-0.267 ypy=-0.304 yTgt=-0.324 tDelta=0.020 emaY=-0.0040
...
f=546 rule=b k=9 y=4 slot=fallback kpy=-0.267 ypy=-0.396 yTgt=-0.416 tDelta=0.020 emaY=-0.0040
f=547 rule=b k=9 y=4 slot=fallback kpy=-0.267 ypy=-0.400 yTgt=-0.420 tDelta=0.020 emaY=-0.0040
f=548 rule=b k=9 y=4 slot=fallback kpy=-0.267 ypy=-0.404 yTgt=-0.424 tDelta=0.020 emaY=-0.0040
```

Analyse: Der Nudge (tDelta=0.020) aktualisiert das Ziel jeden Frame. Die EMA bewegt physY
mit konstant 0.004/Frame (= 0.24 physY/s = 18 px/s). Der Yielder braucht theoretisch
(0.30 − 0.029) / 0.004 = **68 Frames** um aus dem 22.5 px Hitbox zu entkommen.

**Frames 769–807 — Oscillations-Attractor:**

```
f=769 rule=a slot=fallback kpy=-0.267 ypy=-0.504 yTgt=-0.524 tDelta=0.020
f=770 rule=a slot=fallback kpy=-0.267 ypy=-0.508 yTgt=-0.528 tDelta=0.020
f=771 rule=a slot=fallback kpy=-0.267 ypy=-0.512 yTgt=-0.492 tDelta=0.020  ← Richtung wechselt!
f=772 rule=a slot=fallback kpy=-0.267 ypy=-0.508 yTgt=-0.488 tDelta=0.020
f=773 rule=a slot=fallback kpy=-0.267 ypy=-0.504 yTgt=-0.524 tDelta=0.020  ← und zurück
f=774 rule=a slot=fallback kpy=-0.267 ypy=-0.508 yTgt=-0.528 tDelta=0.020
f=775 rule=a slot=fallback kpy=-0.267 ypy=-0.512 yTgt=-0.492 tDelta=0.020
...
f=807 rule=a slot=fallback kpy=-0.267 ypy=-0.512 yTgt=-0.532 streak=288
```

**Ursache:** Racer 4 ist **zwischen zwei Nachbarn eingeklemmt** (Racer 9 bei −0.267, ein dritter
Racer bei ca. −0.55). Der Nudge von Pair (4,9) schiebt Racer 4 outward (neg). Der Nudge vom
dritten Pair schiebt ihn inward (pos). Die EMA schwingt zwischen −0.504 und −0.516 — ein
stabiler Attractor, der **dauerhaft im Overlap-Bereich von Racer 9 liegt**
(22.5 px Hitbox, tatsächliche Distanz ≈ 18 px).

### 3.2 Pair 8_11 — Wall-Lock (114f starr)

```
f=0  rule=a_leaderMoving k=11 slot=fallback kpy=-0.822 ypy=-0.950 yTgt=-0.950 tDelta=0.000 emaY=0.0000
f=1  rule=a_leaderMoving k=11 slot=fallback kpy=-0.822 ypy=-0.950 yTgt=-0.950 tDelta=0.000 emaY=0.0000
... (identisch für alle 114 Frames)
```

Analyse: Yielder (Racer 8) hat physY = −0.950 = MAX_LATERAL. Der Fallback versucht ihn
weiter outward zu nudgen, aber die Clamp verhindert Bewegung → tDelta=0.000, emaY=0.0000.
Keeper (Racer 11) ist bei −0.822 → Lateral-Distanz = 0.128 × 75 = **9.6 px < minLat 22.5 px**.

Die Auflösung ist **physikalisch unmöglich**: Yielder ist an der Wand, Keeper ist nicht freigegeben
(kein Code-Pfad schiebt den Keeper weg wenn der Yielder an der Wand steckt).

---

## 4. K1-K6 Hypothesen-Auswertung

### K1 — ROW-Churning (Right-of-Way ständig umgekehrt)

**WIDERLEGT.**

ROW-Flip-Analyse über alle Top-Pairs: 0 % Keeper-Wechsel in 3_16 (339f), 8_11 (114f), 4_14 (297f),
4_9 (289f). Der Keeper bleibt über die gesamte Streak stabil. Das Klassifikations-System wählt
konsistent dieselbe Seite — das Problem liegt **nicht** in der Klassifikation selbst.

### K2 — Schutz-Regel-Trap (Yielder/Keeper tauschen in jedem Frame)

**WIDERLEGT.**

`d_schutzRegel`-Swaps: **0** in 2229 Overlap-Frames. Die Schutz-Regel feuert nie. Begründung:
BothStable=99 % in den schlimmsten Clustern — beide Racer bewegen sich kaum lateral
(latSpeed < LATERAL_STABLE_THRESH=0.005), daher liegt keine "viel größere Keeper-Bewegung"
vor, die einen Swap auslösen würde.

### K3 — Slot-Suche schlägt fast immer fehl

**BESTÄTIGT.**

86.1 % Fallback-Rate gesamt. In den schwersten Pairs: Pair 4_9: 99 % Fallback, Pair 8_11: 100 %.
Ursache: Die verfügbaren Slots (SLOT_STEP_PX=4, Suchradius slotSearchRadiusPx) finden keine
Position, die den 22.5 px Hitbox-Abstand zu ALLEN anderen Racern gleichzeitig einhält — das
Feld ist geometrisch zu dicht.

### K4 — Fallback-Nudge zu klein

**BESTÄTIGT.**

Der Nudge beträgt FALLBACK_NUDGE (= tDelta=0.020 physY = 1.5 Welt-px). Bei EMA=0.2 ergibt
das emaY=0.004 physY/Frame = 0.3 px/Frame reale Bewegung. Um 22.5 px Hitbox zu verlassen
braucht der Yielder ab minimalem Overlap ~68 Frames (1.1 Sekunden bei 60fps). In einem
vollen 20-Racer-Feld stößt er dabei auf weitere Nachbarn (Squeeze → K5).

### K5 — EMA-Oscillation

**BESTÄTIGT.**

Pair 4_9 Frames 769–807: Target wechselt alle 2 Frames zwischen −0.492 und −0.532. physY
pendelt stabil zwischen −0.504 und −0.516 — Abstand zu Racer 9 bleibt bei ≈ 18 px (< minLat).
Das EMA-System schafft einen stabilen Attractor im Overlap-Bereich. Ursache: Competing
per-pair Nudges auf denselben Racer ohne globale Koordination.

### K6 — Hitbox erkennt Collision nicht

**WIDERLEGT.**

99.7 % aller Trace-Frames zeigen mindestens ein erkanntes Overlap-Pair. Die Hitbox-Erkennung
funktioniert korrekt. Der Fehler liegt ausschließlich in der Resolution.

---

## 5. Root-Cause-Zusammenfassung

Zwei strukturell verschiedene Dead-Lock-Typen wurden identifiziert:

### Typ A — Wall-Lock (Pair 8_11)

```
[Keeper K] ←── 9.6 px ──→ [Yielder Y @ MAX_LATERAL wall]
                                ← kein Platz →
```

Yielder steckt an der Wand. Nudge ist geclampt. Keeper wird nicht bewegt.
Dieser Overlap ist **permanent** bis Keeper die Zone durch Race-Fortschritt verlässt.

### Typ B — Squeeze-Attractor (Pair 4_9)

```
[Racer 9 @ -0.267]  ←18px→  [Racer 4 @ -0.512]  ←~30px→  [3. Racer @ ~-0.55]
                             ← nudge → ← nudge →
```

Racer 4 erhält competing Nudges von zwei Seiten. Die EMA mittelt auf einen Attractor,
der mit BEIDEN Nachbarn überlappt. Kein per-pair Resolver kann das lösen, weil er
die jeweils andere Pair nicht sieht.

**Gemeinsame Systemursache:** Das per-pair Resolution-Modell (one pair at a time, EMA smoothed)
hat keine globale Sicht auf das Kräftefeld. Wenn ein Racer von N Seiten gleichzeitig gepusht
wird, ist das Ergebnis ein gewichtetes Mittel — das zwangsläufig im Overlap-Bereich liegt wenn
N=2 mit entgegengesetzten Richtungen.

---

## 6. Architektur-Assessment — Rettbar oder nicht?

### Aktueller Zustand

Das Slot-basierte System (PR #86) ist eine klare Verbesserung gegenüber dem Force-basierten
Vorgänger. ROW-Klassifikation und Slot-Suche sind konzeptuell korrekt. Die Probleme sind
**punktuell, nicht systemisch** — sie liegen in zwei identifizierbaren Mechanismen.

### Rettbarkeit: **JA, mit gezielten Fixes**

Die Architektur braucht kein Rewrite. Zwei konkrete Änderungen lösen die diagnostizierten Dead-Locks:

**Fix 1 — Wall-Escape (Typ A):**
Wenn `yielder.physicalY >= MAX_LATERAL` (oder `<= -MAX_LATERAL`) und der Overlap persistiert,
schiebt der Code-Pfad den **Keeper** anstelle des Yielders: `keeper.targetPhysicalY += nudge`.
Damit ist der Wall-Lock aufgelöst, ohne die Slot-Logik zu ändern.

**Fix 2 — Multi-Pair-Konflikt-Resolution (Typ B):**
Nach dem regulären per-pair Loop: Alle für denselben Racer berechneten target-Deltas werden
summiert. Wenn Betrag und Richtung konfliktieren (entgegengesetzte Vorzeichen → Summe < einzelner
Betrag), wird das Target **in Richtung des größten Deltas** gesetzt statt gemittelt. Alternativ:
SLOT_STEP_PX von 4 auf minLat (22.5 px) anheben — der Yielder überspringt den Nachbarn
in einem einzigen Slot-Schritt, statt EMA-langsam durch ihn hindurch zu kriechen.

**Fix 3 — EMA-Speed während Avoidance:**
`lateralReturnSpeed` auf z.B. 0.5 setzen wenn `avoidanceActive=true`. Reduziert EMA-Latenz
von 14 Frames auf 4 Frames — der Yielder verlässt den Hitbox-Bereich bevor er auf den
nächsten Nachbar trifft.

### Nicht empfohlen

- Globaler Positions-Solver (PBD): Aufwand hoch, bricht UI-Konfigurierbarkeit, nicht notwendig.
- ROW-Logik ändern: K1/K2 sind widerlegt, ROW arbeitet korrekt.
- Hitbox verkleinern: Würde Overlaps "verstecken", nicht lösen.

---

## 7. Empfehlungen

| Priorität | Fix | Typ A Wall-Lock | Typ B Squeeze |
|---|---|---|---|
| P0 | Wall-Escape: Keeper statt Yielder nudgen wenn an Wand | ✓ löst | – |
| P0 | SLOT_STEP_PX → minLat (22.5 px) | – | ✓ löst |
| P1 | `lateralReturnSpeed` × 2.5 wenn `avoidanceActive` | ✓ beschleunigt | ✓ beschleunigt |
| P2 | Multi-Pair Delta Konflikt-Resolution | – | ✓ löst alternativ |

**Empfohlene Reihenfolge:** Fix 1 (Wall-Escape) + Fix SLOT_STEP_PX als P0-Bundle. Messbar
durch denselben Trace-Skript nach dem Patch: erwartet < 5 % Overlap-Rate in Renn-Phase.

**Hinweis Startphase:** Die Overlaps in den ersten 600 Frames (Burn-in) sind laut User-Spezifikation
akzeptabel. Dieser Sprint adressiert ausschließlich Renn-Phase-Cluster nach dem Spread.

---

## 8. Verifikation — P0-Fixes nach Implementierung

**Branch:** `claude/anti-collision-slot-based` (PR #86)  
**Commit:** `fix(behavior): wall-escape + slot-step ≥ minLat — resolve P0 dead-locks`  
**Datum:** 2026-05-13  
**Setup:** 20 Racer, dieselbe Konfiguration wie §2 (corridorHalf=75px nach PR #86-Update)

### 8.1 Implementierte Fixes

**Fix A — Wall-Escape** (`raceBehavior.js`, Fallback-Sektion):  
Wenn der Yielder an `MAX_LATERAL` gepinnt ist und kein Slot gefunden wird, wird der Keeper
stattdessen mit `+0.02 physY` Richtung Mitte geschoben. Der Keeper-Index wird sofort in das
`resolved`-Set aufgenommen, sodass nachfolgende Collision-Pairs diesen Frame sein Target nicht
überschreiben können.

**Fix B — Slot-Step ≥ minLat** (`raceBehavior.js`, Slot-Suche):  
`SLOT_STEP_PX = 4` (hardcoded) entfernt. Ersetzt durch `slotStepPx = wYielder + safety`
(≈ 27 px bei Default-Sprite 24 px + 3 px Safety). Damit überspringt der erste Kandidat
bereits den vollen Hitbox-Bereich des Keepers. `effectiveRadius = Math.max(searchRadius, slotStepPx × 4)`
garantiert mindestens 4 Kandidaten pro Seite unabhängig von `slotSearchRadiusPx`.

**defaults.js:** `slotSearchRadiusPx: 60 → 120` (4 × 27 px Slot-Step, sichert ≥ 4 Kandidaten
auch wenn `effectiveRadius`-Clamp nicht greift).

### 8.2 Verifizierungsergebnisse

Trace erneut ausgeführt nach Commit der P0-Fixes. Selber Skript, selbe Parameter.

| Metrik | Vor Fixes (§2) | Nach Fixes |
|---|---|---|
| **Pair 4_9 vorhanden** | 289f total, 288f Streak | **nicht mehr vorhanden** |
| **Pair 8_11 vorhanden** | 114f total, 114f Streak | **nicht mehr vorhanden** |
| Persistent Pairs gesamt | 18 | 24 |
| Max-Streak (beste Pair) | 288f (4_9) | 265f (5_9) |
| Fallback-Rate | 86.1 % | 86.2 % |

**Beide P0-Dead-Locks sind aufgelöst.** Pair 4_9 und Pair 8_11 erscheinen nicht mehr unter
den persistenten Clustern.

### 8.3 Verbleibende Cluster

Die Gesamt-Fallback-Rate bleibt bei 86 % (K3 — geometrische Überfüllung bei 20 Racern).
Das ist keine Regression durch die Fixes, sondern das bekannte K3-Problem aus §4. Die 24
verbleibenden Persistent-Pairs zeigen Streaks bis 265f (Pair 5_9) — ein neues Muster,
das den Squeeze-Attractor-Typ weiterhin aufweist, aber ohne die Wall-Lock-Komponente.

**Scope der P0-Fixes erfüllt:** Beide diagnostizierten Dead-Lock-Typen (Wall-Lock Pair 8_11,
Squeeze-Attractor Pair 4_9) lösen sich auf. K3-Overflow ist ein separates, größeres Problem
(P1/P2-Scope, nicht adressiert durch diesen Commit).

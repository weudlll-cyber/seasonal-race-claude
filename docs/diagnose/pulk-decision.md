# Diagnose — Pulk-Genese, Auflösungs-Geschwindigkeit, Hüpfen

**Branch:** `claude/diagnose-pulk-genesis-and-resolution`  
**Datum:** 2026-05-13  
**Skript:** `scripts/diag-pulk-genesis.mjs`  
**Daten:** `docs/diagnose/pulk-trace.ndjson` + `pulk-decision-data.json`  
**Setup:** 20 Racer, dirt-oval, corridorHalf=75px, EMA=0.2, 1500 Frames (25s @60fps), kein Burn-in

---

## 1. Symptome

User-Beobachtung (LAP 1/2, dirt-oval): Mehrere Racer liegen übereinander auf freier Bahn.
Plus sichtbares Hüpfen einzelner Racer. Trotz drei Fix-Stufen in PR #86.

User-Frage (wörtlich): *"wenn die ant kollision funktionieren würde dann dürfte es ja nicht
zu übereinanderliegen racern kommen (...) ich kann mir nicht vorstellen das so ein
übereinander liegender Pulk so lange nicht auflösbar ist."*

Screenshots zeigen Pulks während der Renn-Phase (LAP 1/2 = ca. Frame 300–600 bei 60fps und
normaler Renn-Dauer). Dieser Bericht quantifiziert Entstehung, Auflösungsgeschwindigkeit
und das Hüpf-Phänomen.

---

## 2. Stufe 1: Pulk-Genese

### 2.1 Start-Phase (Frames 0–180)

| Frame | Pair-Overlaps | Cluster | Größter Cluster |
|---|---|---|---|
| 0 | 28 | 1 | **18 Racer** (fast das gesamte Feld!) |
| 30 | 27 | 1 | 15 |
| 70 | 23 | 2 | 12 |
| 100 | 25 | 2 | 12 |
| 120 | 24 | 1 | 17 |
| 150 | 18 | 3 | 6 |
| 180 | 17 | 3 | 6 |

Das Startfeld beginnt als **ein einziger 18-Racer-Pulk** und bricht in den ersten 180 Frames
(3 Sekunden) in kleinere Gruppen auf. Dieser Verlauf ist physikalisch plausibel: Racer starten
dicht, Geschwindigkeitsunterschiede treiben das Feld auseinander.

### 2.2 Renn-Phase (Frames 300–570)

| Frame | Pair-Overlaps | Cluster | Größter Cluster | Racer in Clustern |
|---|---|---|---|---|
| 300 | 7 | 3 | 5 | **9** |
| 330 | 7 | 4 | 3 | 10 |
| 360 | 7 | 3 | 6 | 10 |
| 390 | 8 | 4 | 4 | 10 |
| 420 | 5 | 3 | 4 | 8 |
| 450 | 8 | 3 | 6 | 11 |
| 480 | 6 | 3 | 4 | 9 |
| 510 | 4 | 2 | 4 | 6 |
| 540 | 4 | 2 | 4 | 6 |
| 570 | 0 | 0 | — | 0 |

Während LAP 1/2 (typisch Frames 300–600) sind **7–11 von 20 Racern konstant in Clustern**.
Das sind 35–55 % des Feldes. Die User-Beobachtung ist damit quantitativ bestätigt.

### 2.3 Vollständige Cluster-Episoden-Tabelle (relevante Einträge)

Gesamt: **253 Episoden** (31 Startphase, 222 Renn-Phase).

| ID | Phase | Start | Ende | Dauer (s) | Peak | t50 (s) | Primärer Trigger |
|---|---|---|---|---|---|---|---|
| 0 | start | 0 | 17 | 0.3 | **18** | 0.3 | brake-drift |
| 2 | start | 18 | 103 | 1.4 | 17 | 0.9 | brake-drift |
| 12 | start | 107 | 222 | **1.9** | 17 | 0.4 | brake-drift |
| 13 | start | 133 | 204 | 1.2 | 7 | 1.2 | longitudinal-drift |
| 42 | race | 207 | 437 | **3.8** | 8 | 0.5 | brake-drift |
| 44 | race | 297 | 486 | 3.2 | 4 | **2.3** | longitudinal-drift |
| 38 | race | 198 | 378 | 3.0 | 3 | **3.0** | cluster-dissolved |
| 78 | race | 435 | 548 | 1.9 | 8 | 0.3 | brake-drift |
| 85 | race | 449 | 534 | 1.4 | 6 | 0.1 | longitudinal-drift |

Cluster-Klassifikation:
- **Startphase-Cluster** (begann vor Frame 180): 31 Episoden
- **Renn-Phase-Cluster** (begann ab Frame 180): 222 Episoden

---

## 3. Stufe 2: Auflösungs-Geschwindigkeit

### 3.1 Time-to-50%-Metrik

| Gruppe | Episoden | Median t50 | Max t50 | Überschreiten 2s-Grenze |
|---|---|---|---|---|
| Startphase | 31 | 0.0 s | **1.2 s** | **0 / 31** |
| Renn-Phase | 222 | 0.0 s | **3.0 s** | **2 / 222** |
| Gesamt | 253 | 0.0 s | 3.0 s | 2 / 253 |

Der Median von 0s bedeutet: die Mehrheit der Episoden löst sich innerhalb eines Frames auf
(sie sind transiente Kollisionen zwischen zwei Racern, die natürlich auseinanderdriften).

### 3.2 Auslöser-Verteilung

Pro Member-Austritt aus einem Cluster:

| Trigger | Bedeutung |
|---|---|
| `brake-drift` | Racer hatte `avoidanceActive=true` — Speed Brake aktiv; longitudinale Trennung |
| `longitudinal-drift` | Geschwindigkeitsunterschied trennte Racer ohne Slot-Wechsel |
| `lateral-slot` | Slot-Suche erfolgreich, EMA hat den Racer lateral weggebracht |
| `cluster-dissolved` | Gesamtcluster löste sich auf (alle Member gleichzeitig frei) |

Dominant: **brake-drift** und **longitudinal-drift**. Lateral-slot (echte Seitenbewegung) ist
selten — in Episode 42 (3.8s, peak 8) nur 2 von 10 Member-Exits.

### 3.3 Detail: Die zwei Ausreißer-Episoden

**Episode 44 (t50=2.27s, Renn-Phase):**
```
Racer 0:  Exit f433,  2 Frames im Cluster,  Trigger: longitudinal-drift
Racer 9:  Exit f433,  2 Frames im Cluster,  Trigger: longitudinal-drift
Racer 17: Exit f486, 189 Frames im Cluster, Trigger: cluster-dissolved ← Problem
Racer 19: Exit f486, 189 Frames im Cluster, Trigger: cluster-dissolved ← Problem
```

Racers 17 und 19 bleiben **189 Frames (3.15s)** zusammen. Die anderen zwei Racer driften nach
2 Frames weg. Trigger "cluster-dissolved" bedeutet: das Cluster endet nicht durch aktive Auflösung
sondern durch die natürliche Bewegung beider Racer aus dem Hitbox-Bereich (longitudinal).
Der Slot-Resolver hat in diesen 189 Frames kein Lateral-Slot gefunden.

**Episode 38 (t50=3.0s, Renn-Phase):**
```
Racer 7:  Exit f372, 174 Frames im Cluster, Trigger: longitudinal-drift
Racer 14: Exit f378,   7 Frames im Cluster, Trigger: cluster-dissolved
Racer 15: Exit f378, 180 Frames im Cluster, Trigger: cluster-dissolved
```

Racers 7 und 15 bleiben 174–180 Frames (2.9–3.0s) zusammen. Auflösung rein durch
longitudinalen Drift — der Slot-Resolver generiert keine erfolgreiche Lateral-Bewegung.

### 3.4 Vergleich zur Erwartung

Erwartung für ein realistisches Pferderennen: Pulk löst sich innerhalb **1–2 Sekunden** auf.

- Startphase: ✅ max 1.2s (alle innerhalb Erwartung)
- Renn-Phase: ⚠️ 2/222 Episoden überschreiten 2s (max 3.0s, Racers in 180-Frame-Lock)
- Episode 42 (Peak 8): t50=0.5s ✅ — aber Racer 4 bleibt 229 Frames (3.8s!) als Einzelpaar

**Fazit Auflösung:** Die meisten Cluster sind kurz und unkritisch. Das Problem ist eine kleine
Minderheit (1–2 %) die 2–4 Sekunden dauert. Bei 20 Racern bedeutet das im Schnitt durchgehend
1–2 solcher Paare auf der Bahn.

---

## 4. Stufe 3: Hüpfen

### 4.1 Übersicht

| Metrik | Wert |
|---|---|
| Racer mit Hüpfern nach Frame 300 | **12 / 20** |
| Davon ≥50 % in Cluster-Frame | **7 / 12** |
| Hüpf-Definition | ≥2 Target-Sprünge ≥20px in entgegengesetzte Richtungen in 30-Frame-Fenster |

### 4.2 Top-5 Hüpf-Sequenzen

**Racer 0 — 24 Hüpf-Fenster, 66 % in-cluster:**
```
f=327–329: +22.5px → -40.5px → +40.5px       (±40px Amplitude, jeder Frame)
f=331–334: +40.5px → -40.5px → +40.5px → -40.5px
f=361–364: +40.5px → -40.5px → +40.5px → -40.5px
f=391–400: -94.5px → +108px → -94.5px → +108px  ← Amplitude verdoppelt sich!
f=421–430: -94.5px → +108px → -94.5px → +108px
```

**Racer 1 — 6 Hüpf-Fenster, 41 % in-cluster:**
```
f=593–595: +111.3px → -117.0px                  (Wand-zu-Wand, 230px Spannweite)
f=607–614: -130.5px → +112.5px (alle 1–5 Frames)
f=631–638: -130.5px → +112.5px (alle 1–5 Frames)
f=661–668: -130.5px → +112.5px (alle 1–5 Frames)
f=687–690: -40.5px  → +40.5px  (Amplitude fällt zurück)
```

**Racer 13 — 7 Fenster, 9 % in-cluster (Hüpfen ohne Cluster!):**
```
f=532–533: -43.8px → +37.5px
f=564–566: +21.3px → -63.0px
f=569–572: -40.5px → +40.5px → -40.5px → +40.5px
```

### 4.3 Diagnose der Hüpf-Mechanik

Die Muster sind eindeutig:

**Pattern A — ±40px Slot-Resonanz (Racer 0, 10):**
`targetPhysicalY` wechselt jeden Frame um ±40.5px = ±0.54 physY.
Mit corridorHalf=75px und slotStepPx=27px entspricht das 1.5 Slot-Schritten.
Ursache: Racer liegt zwischen zwei Nachbarn. Pair (Racer 0, Nachbar-links) weist Slot nach
rechts zu (+0.36 physY). Pair (Racer 0, Nachbar-rechts) weist Slot nach links zu (−0.36 physY).
Die EMA bewegt physicalY langsam, aber das Target springt jeden Frame zwischen den beiden Slots.
→ **Das ist der Squeeze-Attractor aus §4 von classification-trace-analysis.md — aber mit
deutlich größerer Amplitude** (Fix B hat den Schritt von 4px → 27px angehoben, was die
Amplitude von ±2px auf ±27–54px vergrößert hat).

**Pattern B — Wand-zu-Wand-Oscillation (Racer 1):**
`targetPhysicalY` springt zwischen +0.75 und -0.75 physY — nahezu von einer Wand zur anderen.
Mit EMA=0.2 ergibt das 0.2 × 1.5 physY × 75px/physY = **22.5 px/Frame reale Bewegung**.
Bei 60fps = 1350 px/s → sichtbares Rucken im Browser.
Ursache: Racer 1 ist zwischen zwei weit entfernten Nachbarn eingeklemmt. Fix B findet für
jeden Pair einen "freien" Slot auf der jeweils anderen Seite. Beide Slots sind gültig in Isolation,
aber kollidieren miteinander. Ohne Gedächtnis über Frames wechselt das Target wand-zu-wand.

**Korrelation Hüpfen ↔ Cluster:** 7/12 hüpfende Racer haben ≥50 % ihrer Hüpfer in Cluster-Frames.
Racer 0 (stärkster Hüpfer, 24 Fenster): 66 % in-cluster → Hüpfen ist primär ein Cluster-Phänomen.
Racer 13 (7 Fenster, 9 % in-cluster): Hüpfen auch ohne Cluster-Mitgliedschaft → sekundäres Phänomen
(zwei räumlich nahe Racer, die nicht exakt überlappen, aber Slots in entgegengesetzte Richtungen auslösen).

**Befund:** Hüpfen und persistierende Cluster sind **teilweise dasselbe Phänomen** (7/12 Fälle),
aber nicht vollständig. Es gibt auch Hüpfen ohne offizielle Cluster-Mitgliedschaft.

---

## 5. Stufe 4: Architektur-Bewertung

### 5.1 Fix-Bilanz der drei Stufen

| Fix-Stufe | Änderung | Quantitative Verbesserung | Neue Probleme |
|---|---|---|---|
| PR #86 (Slot-System) | Force → Slot, EMA 0.2 | Pair-Overlap 99.7% → 86% | Micro-Oscillation ±2px (K5) |
| PR #86 (Wall-Escape) | Keeper-Nudge wenn Yielder an Wand | Pair 8_11 (Wall-Lock) gelöst | — |
| PR #86 (Slot-Step ≥ minLat) | Step 4px → 27px, radius 60 → 120 | Pair 4_9 (Squeeze-Attractor micro) gelöst | **Macro-Oscillation ±40–130px (Hüpfen)** |

Die Fixes haben echte Fortschritte erzielt. Gleichzeitig zeigt Fix 3 einen charakteristischen
Grenznutzen-Effekt: Das Micro-Oscillation-Problem (±2px, nicht sichtbar) wurde durch ein
Macro-Oscillation-Problem (±130px, sichtbar als Hüpfen) ersetzt.

### 5.2 Quantitative Grenznutzen-Analyse

Overlap-Rate (pair-basiert): 99.7% → 86% → stabil (keine Verbesserung durch Fix 2 oder 3,
da K3 — geometrische Überfüllung — das dominante Signal ist).

Cluster-basiert (dieses Trace):
- 64 % aller Frames haben mindestens einen Cluster
- Start-Phase: Median t50=0s, max=1.2s → OK
- Renn-Phase: Median t50=0s, max=3.0s, **2/222 Episoden überschreiten 2s**
- Hüpfen: 12/20 Racer, Amplitude bis 130px

**Der Grenznutzen nimmt ab: jeder weitere Fix löst einen spezifischeren Mechanismus, aber
die strukturelle Überfüllungs-Rate von 64 % (Frames-with-cluster) bleibt.**

### 5.3 Strukturelles Argument: Reaktiv vs. Vorausschauend

Die Slot-Logik ist **reaktiv**: Sie detektiert Kollisionen NACHDEM sie entstanden sind, weist
dann einen neuen Slot zu, ohne zu wissen, ob dieser Slot im nächsten Frame erneut zu einer
Kollision führt.

**Grundproblem:** Per-pair Resolution ohne Cross-Frame-Gedächtnis.

```
Frame F:   Pair (A, B) → A bekommt Slot @+0.36
Frame F+1: Pair (A, C) → A bekommt Slot @-0.36
Frame F+2: Pair (A, B) → A bekommt Slot @+0.36
...
```

Jede Zuweisung ist lokal korrekt. Die Abfolge erzeugt permanentes Hüpfen. Fix B hat die Slots
auf ≥minLat angehoben — das löst den micro-Fall (±2px), skaliert aber das Amplituden-Problem
linear mit der Slot-Größe.

**Kann ein vorausschauender Mechanismus gepatcht werden?** Ja — ohne Grundsatz-Umbau.
Der Mechanismus heißt **Target-Commitment** (Cross-Frame-Speicher):
- Sobald ein Yielder-Slot gefunden wird, wird dieser Target für N Frames gehalten
- Neue Pair-Resolver dürfen das Target nur überschreiben, wenn die neue Kollision am
  committed Target SELBST liegt (d.h. der Slot ist blockiert)
- Damit werden einzelne konkurrierende Pairs nicht als Anlass genug, das Target zu wechseln

Das `resolved`-Set macht genau das — aber nur innerhalb eines einzelnen Frames. Die Extension
auf N Frames ist der einzige fehlende Mechanismus.

---

## 6. Empfehlung

### **(R) — Rettbar**

**Begründung:**

1. **Start-Phase:** Alle Episoden lösen sich innerhalb 1.9s auf (t50 ≤ 1.2s). Das ist im
   akzeptablen Bereich — kein Fix nötig.

2. **Renn-Phase:** Nur 2/222 Episoden überschreiten die 2s-Grenze. Der überwiegende Teil
   (220/222) löst sich schnell. Das Problem ist quantitativ begrenzt.

3. **Hüpfen:** Der Mechanismus ist klar und direkt aus den Trace-Daten ableitbar (Pattern A:
   Slot-Resonanz ±40px, Pattern B: Wand-zu-Wand ±130px). Beide haben dieselbe Ursache
   (fehlendes Cross-Frame-Gedächtnis) und dieselbe Lösung (Target-Commitment).

4. **Fix-Aufwand:** Ein neues Feld pro Racer (`targetCommitFrames`), eine Bedingung im
   Slot-Loop. Kein Umbau der Klassifikation, Slot-Suche oder EMA.

5. **Abgrenzung von K3:** K3 (geometrische Überfüllung, 64 % Frames-with-cluster) ist ein
   separates, tieferes Problem. Es spiegelt, dass 20 Racer auf einem Korridor-halben von 75px
   geometrisch nicht vollständig überlappungsfrei positioniert werden können. K3 erfordert
   möglicherweise Korridor-Erweiterung oder Racer-Anzahl-Reduction — kein Slot-Fix löst das.
   Dieser Entscheidungs-Kontext betrifft nur die lösbaren Probleme (Hüpfen, persistente Paare).

---

## 7. Fix-Richtungen (bei (R))

### Fix 1 — Target-Commitment (Inertia)

**Problem:** Racer-Target wechselt ohne Gedächtnis zwischen konkurrierenden Slots.

**Mechanismus:**
- Neues Feld pro Racer: `r.slotCommitFrames = 0` (initialisiert 0, zählt runter pro Frame)
- Wenn Slot-Suche einen Slot findet UND `r.slotCommitFrames === 0`:
  - Setze Target wie bisher
  - Setze `r.slotCommitFrames = N` (z.B. 10 Frames = 167ms @60fps)
- Wenn `r.slotCommitFrames > 0`:
  - Überprüfe: ist das committed Target selbst in einer neuen Kollision? Wenn nein → skip
  - Nur wenn das committed Target kollidiert → neuen Slot suchen, Counter zurücksetzen
- `resolved`-Set-Logik bleibt unverändert (same-frame locking)

**Erwartetes Ergebnis:** Racer hält seinen Slot für ≥167ms, auch wenn in diesem Zeitraum
ein anderes Pair ihn als Yielder klassifiziert. Das Target kann sich nur ändern, wenn er
am committed Slot tatsächlich kollidiert. Amplitude der Oscillation: 0 (keine Wechsel).

**Risiko:** Ein committed Target kann transient mit einem dritten Racer kollidieren. Dieses
Risiko wird durch die "nur überschreiben wenn kollidiert" Bedingung mitigiert.

### Fix 2 — Committed-Target-Validation (optional, nur bei unzureichendem Fix 1)

**Problem:** Der committed Slot könnte durch externe Racer-Bewegung blockiert werden.

**Mechanismus:** Pro Frame, bevor der Slot-Loop läuft: für alle Racer mit `slotCommitFrames > 0`,
prüfe ob ihr committed Target noch kollisionsfrei ist. Falls nicht → setze `slotCommitFrames = 0`
(freigeben für neue Slot-Suche). Die normale Slot-Loop greift dann in diesem Frame.

**Dies ist ein ergänzender Guard**, kein eigener Fix. Setzt auf Fix 1 auf.

---

## 8. Vergleich Slot vs. Force vs. Hybrid (Referenz für (W)-Fall)

Nicht anwendbar — Empfehlung ist (R). Zur Dokumentation trotzdem kurz:

| Ansatz | Pro | Contra |
|---|---|---|
| Slot (aktuell) | ROW-Klassifikation, explizite Positionen | Reaktiv, Oscillation ohne Cross-Frame-Gedächtnis |
| Force (Vorgänger) | Smooth, kontinuierlich | Symmetrische Kräfte canceln in Pulks (99.2 % Cancellation-Rate, PR #88) |
| Hybrid | Force für freie Racer, Slot für Overlap | Complexity; Oscillation an Force↔Slot-Grenze |
| PBD / globaler Solver | Kein Oscillation, optimal | Erheblicher Aufwand, bricht UI-Konfigurierbarkeit |

Der Force-Vorgänger hatte das gleiche Grundproblem in anderer Form (Cancellation statt Oscillation).
Ein Hybrid erbt das Oscillation-Problem an der Grenze. PBD ist nicht verhältnismäßig.
Target-Commitment patcht die Slot-Logik mit minimalem Aufwand.

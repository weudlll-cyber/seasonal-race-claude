# RaceArena — Camera-Director + RaceScreen-Refactor Konzept

**Status:** Konzept-Doku — vor Implementation (Konzept-Doku-Sprint 2026-05-02)
**Phase:** Kamera-Phase + RaceScreen-Refactor (Hot Pos 1)
**Related:** `docs/BACKLOG.md — Hot §1`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`

---

## Präambel: Dieses System ist verzahnt

Camera-Verhalten, Strecken-Größe, Sprite-Größe und Name-Tag-Lesbarkeit sind kein
voneinander unabhängiges Quartett. Sie teilen einen gemeinsamen Constraint-Raum:

```
pathLengthPx  →  speedScaleFactor  →  visuelle Traversal-Rate
worldWidth    →  overviewZoom      →  CameraDirector-Zoom-States
Camera-Zoom   →  effektive Sprite-Px im Viewport
Sprite-Px     →  Racer-Erkennbarkeit
Racer-Abstand →  Tag-Überlappung
```

Eine Änderung an einem Hebel zieht alle anderen. Sektion 9 (Synthese) macht die
Kopplungen explizit. Wer einen Slider tunet, soll verstehen warum ein anderer sich mitbewegt.

---

## 1. Problemstatement

### 1.1 Was nicht funktioniert — User-Beobachtungen aus Race-Tests

| # | Strecke | Beobachtung | Diagnose (siehe Sektion) |
|---|---------|-------------|--------------------------|
| P1 | Garden Path | Sprites kleben in Ecke oben-links, Camera schaut auf Strecke, nicht auf Racer | §4 — OVERVIEW-Pan ist ein No-Op |
| P2 | River Run | Camera zoomt zu weit raus wenn Pulk auseinandergeht | §4 — Zoom-Inversion auf großen Open-Tracks |
| P3 | River Run Spitzenkampf | Nur kleiner Cluster sichtbar, Rest des Frames leer | §4 — openTrackPanTarget nutzt alle Racer, nicht Focus-Group |
| P4 | Space Sprint | Vollbild-Button macht nicht echtes Browser-Vollbild | §8 — CSS-Expansion statt Fullscreen API |
| P5 | Space Sprint | Setup-Button bringt zu Setup, kein Rückweg zu laufendem Rennen | §8 — Kein Race-State-Persist |
| P6 | Open Tracks | Fühlen sich zu kurz an bei großem Background | §6 — speedScaleFactor.maxScale=4.0 zu niedrig |
| P7 | Alle Tracks | Name-Tags überlappen in dichten Pulks | §5 — kein Anti-Overlap |
| P8 | Alle Tracks | Sprite-Größe vs Camera-Zoom Tradeoff nicht gelöst | §5 — kein harter Min-Constraint |

### 1.2 Was PR #26 (B-16) und PR #28 (Camera-Polish + Q-14) bereits gelöst haben

**PR #26 — B-16 Adaptive Zoom:**
- Zoom-Formel `overviewZoom = CANVAS_W / worldW` ersetzt altes `zoom = clamp(worldW/VIEW_W, 1, 6)` — Zoom-States bleiben visuell konsistent bei jeder Worldbreite
- Zoom-Ratios (LEADER_ZOOM_RATIO=1.4, BATTLE_ZOOM_RATIO=1.6, COMEBACK_ZOOM_RATIO=1.3) relativ zu overviewZoom statt absolute Werte
- B-17 speedScaleFactor (B-17) eingeführt — gleiche visuelle Traversal-Rate unabhängig von pathLengthPx (aber mit falschem maxScale, siehe §6)

**PR #28 — Camera-Polish + Q-14:**
- OVERVIEW-Pan zu Centroid top-N Racer (statt starres Zentrum)
- COMEBACK_ZOOM zielt auf 3rd-Place statt last-place (verhindert Kamera auf sehr weit abgehängten Racer)
- MIN_ZOOM=0.15, MAX_ZOOM=2.5 Guards eingeführt
- World-Edge-Clamp (verhindert schwarze Ränder wenn Welt kleiner als Viewport)

**Was trotzdem noch offen ist:** Die drei strukturellen Bugs in §4 wurden nicht behoben (OVERVIEW-Pan-Clamp-Bug, Zoom-Inversion auf Open-Tracks, openTrackPanTarget nutzt alle Racer). Die User-Beobachtungen P1–P3 existieren weiterhin.

### 1.3 Anti-Patterns zu vermeiden

- **Hardcoded Magic-Numbers** für Camera-Tunables — alles muss ins Dev-Panel (Project-Principle 1)
- **Track-spezifische Code-Pfade** — alle Lösungen müssen über die ganze Range 1280×720 bis 8000×6000 funktionieren
- **"Soft floors" die bei Bedarf gebrochen werden** — Mindest-Sprite-Größe muss harter Constraint sein
- **Getrennte Fixes ohne Gesamtbild** — Camera + Sprites + Tags gemeinsam denken

---

## 2. Strecken-Größen-Range

### 2.1 Gemessene Werte der aktuellen Default-Tracks

| Track | worldW × worldH | closed | pathLengthPx | speedScaleFactor | Est. Race-Zeit\* |
|-------|----------------|--------|-------------|-----------------|-----------------|
| Dirt Oval | 1536 × 1024 | ✓ | 3 245 | 1.62 | ~50 s (2 Laps) |
| Garden Path | 1536 × 1024 | ✓ | 2 506 | 1.25 | ~77 s (4 Laps) |
| City Circuit | 1536 × 1024 | ✓ | 3 093 | 1.55 | ~47 s (2 Laps) |
| River Run | 6000 × 4000 | ✗ | 6 156 | 3.08 | ~45 s |
| Space Sprint | 6000 × 4000 | ✗ | 19 772 | **4.0 (CAPPED)** | ~58 s |

\* Baseline: speedMultiplier=1.0, baseSpeedMean=0.001045, REFERENCE_FPS=62.5.

### 2.2 Unterstützte Range

- **Kleinstes aktuelles Track-Canvas:** 1280×720 (alte Tracks, Code-Bundle-Fallback)
- **Mittlere Tracks:** 1536×1024 (alle 5 gezeichneten Default-Tracks, geschlossen)
- **Große Open-Tracks:** 6000×4000 (River Run, Space Sprint)
- **Geplantes Maximum:** 8000×6000 (User-Vorgabe, noch kein Beispiel-Track)
- **pathLengthPx-Range:** ~2500 (kurze Closed-Track) bis ~50 000+ (langer Pfad auf 8000×6000)

### 2.3 Skaleninvariante vs. strecken-spezifische Parameter

**Skaleninvariant (können global gelten):**
- Zoom-Ratios (LEADER_ZOOM_RATIO etc.) — relativ zum overviewZoom, funktionieren bei jeder Worldbreite
- Mindest-Sprite-Größe in Bildschirm-Px — absolut, worldW-unabhängig
- Tag-Skalierungs-Formel mit `inv = 1/ezoom` — schon korrekt implementiert

**Strecken-spezifisch (müssen pro Track einstellbar sein):**
- `speedScaleFactor.maxScale` oder alternatives Capping — aktuelle 4.0 ist zu niedrig für pathLengthPx > 8000
- `OPEN_TRACK_BASE_ZOOM` — aktuell 1.5 global, könnte per Track variieren
- Camera-State-Schwellen (gap01 < 0.05 für Battle etc.) — bei N=20 Racern andere Verhältnisse als N=4

---

## 3. Race-Phasen-Analyse

### 3.1 Beobachtbare Renn-Phasen

| Phase | Charakteristik | Programmatisch erkennbar |
|-------|---------------|--------------------------|
| **Start-Pulk** | Alle Racer dicht beieinander (start-layout). Keine Führung etabliert. | `gapLeadLast < 0.05` (alle innerhalb 5% des Tracks) |
| **Auseinanderziehen** | Feld spreizt sich auf, kein klarer Sieger erkennbar. | `gapLeadLast 0.05..0.15` |
| **Spitzenkampf** | 2 Racer eng beieinander vorn. | `gap01 < 0.05` (top-2 innerhalb 5%) |
| **Klarer Anführer** | Leader >15% vor 2nd. | `gap01 >= 0.15` |
| **Endspurt** | Leader nähert sich finishT. | `leader.t / finishT > 0.85` |
| **Outlier** | Letzter Racer weit abgehängt. | `gapLeadLast > 0.3` |
| **Finish** | Erster Racer hat finishT überschritten. | `st.finishedCount >= 1` |

### 3.2 Camera-Action pro Phase

| Phase | Sinnvolle Camera-Action | Anti-Pattern |
|-------|------------------------|--------------|
| Start-Pulk | LEADER_ZOOM auf gesamtes Pulk-Zentrum (nicht OVERVIEW) | OVERVIEW mit vollständig sichtbarem Track — Racer zu klein |
| Auseinanderziehen | OVERVIEW mit Pan auf top-3 Zentroid | Statisches OVERVIEW ohne Pan |
| Spitzenkampf | BATTLE_ZOOM auf top-2 Midpoint | zu weit raus zoomen (zeigt Platz 8–12) |
| Klarer Anführer | LEADER_ZOOM auf Leader | COMEBACK ohne Begründung |
| Endspurt | LEADER_ZOOM mit leicht höherem Zoom | Kein Übergang zur Finish-Dramatik |
| Outlier | Gelegentlich COMEBACK_ZOOM | Dauerhaft auf Outlier — langweilig |

### 3.3 Phase-Erkennung in Code

Aktuell (`_transition` in CameraDirector.js:75–97) basiert die State-Machine auf:
- `gap01` (t-Distanz top-2)
- `gapLeadLast` (t-Distanz Leader zu Letztem)
- Zufalls-Roll für nicht-deterministische Abwechslung

Was fehlt:
- `startPhase` (Renn-Alter < T_start, alle Racer noch dicht)
- `endspurtPhase` (leader.t / finishT > 0.85)
- `finishPhase` (finishedCount >= 1)

Diese drei können mit `raceElapsed` (ms seit race start) und den bestehenden t-Werten berechnet werden, ohne neue State hinzuzufügen.

### 3.4 Smooth Transitions vs. harte Cuts

Aktuell: `MAX_STATE_DURATION = 8000ms` — harter State-Reset alle 8s unabhängig von Renn-Situation.

Besser: Hysterese-Schwellen — ein State bleibt aktiv solange seine Bedingung gilt, auch über 8s hinaus. Harte Cuts nur wenn ein "dramatic event" eintritt (Finish, Outlier-Erkennung). Der LERP-Faktor (0.04 = ~1.5s zu 90%) ergibt bereits sanfte Camera-Übergänge beim State-Wechsel.

---

## 4. Camera-Parameter und Trigger-Logik

### 4.1 Strukturelle Bugs im aktuellen System

**Bug A — OVERVIEW-Pan ist ein No-Op:**

```js
// CameraDirector.js:178-183 — World-Edge-Clamp
const edgeLoX = canvasW * (1 - this.targetZoom);  // = 1280 * (1-1) = 0 im OVERVIEW
this.targetOffsetX = edgeLoX > 0 ? edgeLoX / 2 : Math.max(edgeLoX, Math.min(0, this.targetOffsetX));
//                                                 → Math.max(0, Math.min(0, any)) = 0 ← immer 0!
```

Wenn `targetZoom = 1` (OVERVIEW-State), wird `edgeLoX = 0`, und der Clamp fixiert `targetOffsetX = 0`.
Gleichzeitig klemmt `_clampOffset` für einen Track der den Canvas genau ausfüllt ebenfalls auf 0.
Resultat: **OVERVIEW-Pan zu Racer-Centroid hat keinen Effekt** — die Camera steht immer bei (0,0).

**Sichtbar als:** P1 (Garden Path — Racer starten oben-links, Camera dreht sich nicht hin).

**Bug B — Zoom-Inversion auf großen Open-Tracks:**

Für River Run / Space Sprint (worldW=6000): `overviewZoom = 1280/6000 = 0.213`.
- LEADER_ZOOM: `leaderZoom = clamp(0.213 * 1.4, 0.15, 2.5) = 0.298`
- Effective zoom auf Open-Track: `effZoom = OPEN_TRACK_BASE_ZOOM * cam.zoom = 1.5 * 0.298 = 0.447`
- OVERVIEW effZoom: `1.5 * 1.0 = 1.5`
- **LEADER_ZOOM (effZoom=0.447) ist kleiner als OVERVIEW (effZoom=1.5) → Camera zoomt RAUS!**

LEADER_ZOOM sollte nähranzoomen, zoomt aber auf großen Open-Tracks heraus.

**Sichtbar als:** P2 (River Run zoomt raus wenn Pulk auseinandergeht — wechselt in LEADER_ZOOM der den Viewport vergrößert).

**Bug C — openTrackPanTarget nutzt alle Racer:**

```js
// RaceScreen/index.jsx:838-845
const { targetX, targetY } = openTrackPanTarget(
  st.racers,        // alle Racer, nicht top-N
  CW, CH, effZoom, camXMax, camYMax
);
```

Midpoint aller Racer liegt oft in der Mitte des Feldes, nicht beim Spitzenkampf.

**Sichtbar als:** P3 (River Run Spitzenkampf — Camera zeigt Pulk-Mitte statt Spitze).

### 4.2 Korrektur-Richtungen

**Fix A — OVERVIEW-Pan wiederherstellen:**
Option 1: Im OVERVIEW-State `targetZoom = overviewZoom` statt 1 setzen — dann ist Platz für Pan.
Option 2: World-Edge-Clamp für OVERVIEW deaktivieren wenn Racer-Centroid weit vom Canvas-Zentrum liegt.

> **User-Input nötig:** Option 1 ändert visuell wie OVERVIEW aussieht (Track füllt nicht mehr 100% den Canvas). Bevorzugte Variante?

**Fix B — Zoom-Inversion auf Open-Tracks:**
CameraDirector für Open-Tracks anders kalibrieren: `overviewZoom = OPEN_TRACK_BASE_ZOOM` (=1.5) statt `CANVAS_W/worldW`. Dann geben LEADER/BATTLE/COMEBACK sinnvolle Ratios: LEADER=2.1, BATTLE=2.4, COMEBACK=1.95.
Alternativ: Separater OpenTrackCameraDirector der nicht die geschlossene-Track-Logik recycelt.

**Fix C — openTrackPanTarget auf Focus-Group beschränken:**
```js
const focusRacers = [...st.racers].sort((a, b) => b.t - a.t).slice(0, TOP_N);
openTrackPanTarget(focusRacers, ...)
```

### 4.3 Trigger-Logik (Erweiterung)

Aktuell: `_transition()` wird aufgerufen wenn `ts - stateEnteredAt >= MAX_STATE_DURATION`.

Erweitert: Zusätzliche Event-getriggerte Übergänge:
- Finish-Event (`finishedCount > 0`): erzwingt LEADER_ZOOM auf winner
- Endspurt (`leader.t/finishT > 0.85`): erhöht Wechsel-Wahrscheinlichkeit zu LEADER_ZOOM
- Start-Pulk-Phase (`raceElapsed < 3000ms`): erzwingt OVERVIEW oder LEADER_ZOOM auf Pulk-Zentroid

---

## 5. Sprite-Size + Name-Tag-Readability (verzahnt)

### 5.1 Das System ist ein einziger Constraint-Graph

```
pathLengthPx (Strecke)
  → speedScaleFactor (wie schnell traversieren Racer)
    → visuelle Traversal-Rate (Px/s)

worldWidth (Strecke)
  → overviewZoom (Basis-Zoom)
    → State-Zooms (LEADER etc.)
      → frameEffZoom (Effektiv-Zoom dieses Frames)
        → Sprite-Px = displaySize × displaySizeScale × frameEffZoom
          → Name-Tag-Größe = f(1/frameEffZoom)
            → Tag-Overlap-Wahrscheinlichkeit
```

Eine engere Camera (höheres frameEffZoom) macht Sprites größer und Tags größer — das reduziert Overlap.
Eine weitere Camera (niedrigeres frameEffZoom) zeigt mehr Strecke — Sprites und Tags schrumpfen.

### 5.2 Mindest-Sprite-Größe als harter Constraint

Aktuell: `computeRenderDisplayScale` hat einen Soft-Floor (`minTargetScreenPx = 32px` default).
Diese Floor verhindert dass Sprites unter 32px sinken — aber sie verhindert NICHT dass die Camera
so weit rauszoomt dass der Floor die ganze Zeit aktiv ist.

**Empfehlung:** Der Camera-State darf nur wechseln/zoomen wenn die Mindest-Sprite-Größe erhalten bleibt:

```
erlaubter_min_frameEffZoom = minTargetScreenPx / (displaySize × displaySizeScale)
```

Wenn ein Zoom-Wechsel `frameEffZoom` unter diesen Wert bringt, wird er nicht ausgeführt.
Stattdessen bleibt die Camera auf dem letzten erlaubten Zoom.

Dieser Check ist tunable: `minTargetScreenPx` bereits im Dev-Panel.

### 5.3 Name-Tag-Strategie pro Camera-State

Aktuelle Implementierung (`drawNameTag`): Tags skalieren korrekt mit `inv = 1/ezoom` — sie erscheinen in konstanter Bildschirmgröße. Das ist korrekt, führt aber dazu dass Tags auf voller Racer-Dichte überlappen.

**Vorschlag — gestaffelte Tag-Visibilität:**

| Camera-State | Tag-Strategie |
|-------------|---------------|
| OVERVIEW | Nur Top-3 Tags (Leader + 2. + 3.) — Rest ausgeblendet |
| LEADER_ZOOM | Leader-Tag prominent (Crown-Icon), 2nd/3rd reduziert, Rest aus |
| BATTLE_ZOOM | Top-2 Tags prominent, Rest aus |
| COMEBACK_ZOOM | Focus-Racer-Tag prominent, Leader-Tag (als Referenz), Rest aus |

**Anti-Overlap — zwei Optionen:**

Option A: **Vertikales Stapeln** — kollidierende Tags werden vertikal versetzt. Einfach zu implementieren, kann aber weit vom Racer wegdriften.

Option B: **Top-N ausblenden** — alle Tags außer den N relevantesten (je nach Camera-State) werden ausgeblendet. Einfachste Implementierung, verliert aber Kontext für abonnierte Racer.

**Empfehlung:** Option B als erster Schritt (wenig Code, große UX-Verbesserung), Option A als optionaler zweiter Schritt.

**B-UX1-Bewertung** (aus BACKLOG):
- "Tags ausblenden": ✅ empfohlen als Basis (Option B oben)
- "Top-N": ✅ Teil von Option B
- "Anti-Overlap/Stapeln": ⏳ Iteration 2 (Option A)
- "Größen-Skalierung": ✅ bereits implementiert (inv-Formel)
- "Hover/Click": ⏳ später (erfordert Input-Events auf Canvas)

### 5.4 Der Tradeoff explizit

Bei N=4 Racern: BATTLE_ZOOM (höheres Zoom) macht Sprites groß genug dass alle Tags lesbar sind.
Bei N=20 Racern: BATTLE_ZOOM macht Sprites groß, aber 20 Tags auf einem 1280px-Canvas überlappen immer.

**Lösung:** N-adaptives Tag-Limit. Bei N≤6: alle Tags. Bei N≤12: Top-5. Bei N>12: Top-3.
Diese Schwellen müssen tunable sein (Dev-Panel).

---

## 6. Open-Track-Länge — Q-25 Empirische Untersuchung

### 6.1 Messergebnisse

Alle Messungen: `baseSpeedMean=0.001045`, `REFERENCE_FPS=62.5`, `speedMultiplier=1.0`.

| Track | pathLengthPx | ssf_raw | ssf_applied | Traversal-Rate | Renndauer |
|-------|-------------|---------|-------------|----------------|-----------|
| Dirt Oval | 3 245 | 1.62 | 1.62 | 131 px/s | ~50 s |
| Garden Path | 2 506 | 1.25 | 1.25 | 131 px/s | ~77 s |
| City Circuit | 3 093 | 1.55 | 1.55 | 131 px/s | ~47 s |
| River Run | 6 156 | 3.08 | 3.08 | 131 px/s | ~45 s |
| Space Sprint | 19 772 | **9.89** | **4.00 (CAPPED)** | **323 px/s** | ~58 s |

Die Formel ist korrekt für alle Tracks außer Space Sprint. River Run erzielt exakt die gleiche Traversal-Rate (131 px/s) wie die geschlossenen Tracks — das ist das gewünschte Verhalten.

### 6.2 Das Bottleneck identifiziert

**Root Cause: `DEFAULT_SPEED_SCALE_CONFIG.maxScale = 4.0`** in `client/src/modules/storage/defaults.js:112`.

Der Cap entspricht einem effektiven pathLengthPx-Maximum von `4.0 × 2000 = 8000px`.
Space Sprint hat pathLengthPx=19772 — **2.5× über dem Cap**.

Resultat: Space Sprint-Racer traversieren bei 323 px/s statt der Referenz-131 px/s.
Auf dem Open-Track-Viewport (effZoom=1.5, viewport=853px): Racer queren den Viewport in 853/323=2.6s statt 853/131=6.5s.
Das Rennen fühlt sich "gehetzt" an — Racer fliegen durch das Bild.

**Was das Canvas-Koordinatensystem (CW/CH=1280×720) NICHT ist:**
Die Track-Geometrie liegt in World-Koordinaten (Space Sprint: 256..5707 in X, 302..3718 in Y).
Der Track-Editor hat einen Pan/Zoom-Viewport der diese World-Koordinaten abbildet.
Das Canvas limitiert NICHT die geometrische Pfadlänge — es ist nur das Render-Fenster.
Der User-Verdacht "Canvas-Koordinatensystem begrenzt die Geometrie" ist **empirisch widerlegt**.

**Kein Einfluss von:**
- runoutZone (0.05) — kürzt finishT von 1.0 → 0.95, kein dramatischer Effekt
- Canvas-Größe — keine Limitierung für Geometrie-Koordinaten

### 6.3 Sekundäres Problem: finishT für Open-Tracks ignoriert configured duration

In RaceScreen.jsx:204–209:
```js
const finishT = isOpenTrack
  ? 1.0 - behaviorConfig.runoutZone   // = 0.95 immer
  : (raceData.targetLaps ?? lapsFromDuration(duration));
```

Für Open-Tracks ist finishT=0.95 **fest**, unabhängig von der konfigurierten `duration` (z.B. 90s für Space Sprint).
Die 90s-Einstellung hat **keinen Effekt** auf die tatsächliche Renndauer!

`openTrackFinishT()` in lapUtils.js existiert und wäre der richtige Weg, wird aber in RaceScreen nicht genutzt.

### 6.4 Lösungs-Optionen

**Option A — maxScale anheben (kleinstes Eingriff):**
```js
DEFAULT_SPEED_SCALE_CONFIG.maxScale = 10.0  // oder 12.0
```
Direkte Lösung. Space Sprint würde bei ~131 px/s traversieren, Renndauer ~144s.
Nachteil: Renndauer steigt dramatisch — User muss überprüfen ob das erwünscht ist.

> **User-Input nötig:** Soll Space Sprint ~144s dauern (bei speedMultiplier=1.0)?
> Oder lieber kürzere Rennen mit schnellerer Traversal?

**Option B — finishT für Open-Tracks aus configured duration ableiten:**
```js
// openTrackFinishT bereits in lapUtils.js implementiert
const finishT = isOpenTrack
  ? openTrackFinishT(duration, speedMultiplier, baseSpeedConfig.max)
  : lapsFromDuration(duration);
```
Macht die duration-Einstellung wirksam für Open-Tracks. Erfordert dass der speedScaleFactor-Effekt
(langsamerer t-Fortschritt auf langen Tracks) korrekt in openTrackFinishT eingerechnet wird.

**Option C — Canvas an Background-Auflösung koppeln:**
TrackEditor: wenn Background 6000×4000, setze editorWorldW/H=6000×4000 automatisch.
Bereits implementiert (editorWorldW/H State), aber wird der Viewport-Transform korrekt gesetzt?
Diese Option löst Q-25 nicht direkt — der Kausal-Pfad läuft über speedScaleFactor, nicht Canvas-Größe.

**Empfehlung:** Option A (maxScale anheben) + Option B (finishT wirksam machen) kombinieren.
Schritt 1: maxScale=10.0 setzt, Rennen testen.
Schritt 2: finishT für Open-Tracks aus duration ableiten.

---

## 7. Dev-Panel-Integration

### 7.1 Welche Parameter ins Dev-Panel

Alle Camera-Tunables entsprechen Project-Principle 1 (UI-konfigurierbar). Vorbild: Race-Behavior-Panel.

**Neue Sektion "Camera" im Dev-Screen:**

| Parameter | Typ | Default | Beschreibung |
|-----------|-----|---------|--------------|
| `overviewZoomBase` | select (auto/custom) | auto | Auto = CANVAS_W/worldW. Custom = fester Wert. |
| `leaderZoomRatio` | slider 1.0–3.0 | 1.4 | Multiplikator auf overviewZoom für LEADER-State |
| `battleZoomRatio` | slider 1.0–3.0 | 1.6 | Multiplikator für BATTLE-State |
| `comebackZoomRatio` | slider 1.0–3.0 | 1.3 | Multiplikator für COMEBACK-State |
| `openTrackBaseZoom` | slider 0.5–3.0 | 1.5 | Basis-Zoom für Open-Tracks |
| `maxStateDuration` | slider 2000–15000 ms | 8000 | Max Verweildauer in einem Camera-State |
| `lerpFactor` | slider 0.01–0.15 | 0.04 | Camera-Übergangs-Geschwindigkeit |
| `startPhaseSeconds` | slider 1–10 s | 3 | Dauer der erzwungenen Start-Phase-Camera |

**Bestehende Sektion "Speed Scale" erweitern:**

| Parameter | Aktuell | Empfehlung |
|-----------|---------|------------|
| `maxScale` | 4.0 | 10.0 (oder User-Input) |
| `referencePathLength` | 2000 | beibehalten |

**Name-Tags-Sektion:**

| Parameter | Typ | Default |
|-----------|-----|---------|
| `tagMaxVisible` | Formel: cutoffs per N-range | Top-3 bei N>12, Top-5 bei N≤12, Alle bei N≤6 |
| `tagScaleWithZoom` | toggle | true (schon implementiert) |

### 7.2 Live-Apply

Analogie zu Race-Behavior-Panel: alle Camera-Parameter sofort live-wirksam beim nächsten Frame.
CameraDirector-Instanz wird nicht neu erstellt — Parameter werden direkt auf dem Objekt geändert.

### 7.3 Per-Track-Overrides

D3.5.5-Pattern (Racer-Types) als Vorbild: globale Defaults + optionale per-Track-Overrides in `localStorage`.
Konkret: Track-Editor könnte einen "Camera"-Tab bekommen wo `openTrackBaseZoom` und `maxScale` 
pro Track gesteuert werden können. Das ist aber Zukunft — zuerst globale Tunables.

### 7.4 Tooltip-Convention

Alle neuen Sliders folgen der bestehenden Tooltip-Convention aus dem Dev-Panel.
Format: "Kurze Beschreibung. Wert: [aktuell]. Auswirkung: [was ändert sich]."

---

## 8. UI-Bugs

### 8.1 Vollbild-Button (P4)

**Aktuell (RaceScreen/index.jsx:938–944):**
```js
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    screenRef.current?.requestFullscreen?.();  // ← Browser Fullscreen API
  } else {
    document.exitFullscreen?.();
  }
}
```

Die `requestFullscreen()`-Implementierung ist bereits korrekt. `screenRef` zeigt auf `<div className="screen screen--race">`.

**Problem:** Die CSS-Klasse `screen--race` enthält `<aside className="race-hud">` (Sidebar mit Scoreboard). Im Fullscreen-Modus ist die HUD-Sidebar weiterhin sichtbar, weil der ganze Screen-Container in Fullscreen geht.

**Fix:** `canvasRef.current?.requestFullscreen?.()` statt `screenRef.current?.requestFullscreen?.()` — Canvas-Element direkt in Fullscreen. Die HUD-Sidebar fällt weg. Alternativ: HUD per CSS verbergen wenn `document.fullscreenElement` gesetzt ist.

> **User-Input nötig:** Soll die HUD im Fullscreen-Modus sichtbar bleiben (als Overlay) oder verschwinden?

### 8.2 Setup-Button während laufendem Rennen (P5)

**Aktuell (RaceScreen/index.jsx:1036–1044):**
```js
<button
  className="race-back-btn"
  onClick={() => {
    sessionStorage.removeItem('activeRace');  // ← Race-State wird gelöscht
    fadeNavigate('/setup');
  }}
>
  ← Setup
</button>
```

Der Click löscht `activeRace` aus sessionStorage und navigiert zur Setup-Seite. Kein Confirm-Dialog. Das Rennen kann nicht fortgesetzt werden — `activeRace` ist weg.

**Optionen:**

| Option | Verhalten | Pro | Con |
|--------|----------|-----|-----|
| A — Pause + Confirm | Rennen pausiert, Dialog "Rennen abbrechen?" | Explizit, kein Datenverlust | Pause-Mechanismus fehlt |
| B — Race abbrechen ohne Confirm | Aktuelles Verhalten, aber Button-Label "✕ Abbrechen" statt "← Setup" | Ehrlicher | Kein Weg zurück |
| C — Button ausblenden während RACING | Button nur in COUNTDOWN und FINISHED sichtbar | Einfachste Implementierung | Kein Notausgang |
| D — Rennen-State erhalten | `activeRace` bleibt in sessionStorage, Button navigiert zu Setup. Zurück-Button auf Setup navigiert zur Race | Kein Datenverlust | Race-State-Management komplex |

**Empfehlung Option B** als erster Schritt: Button-Label ändern zu "✕ Abbrechen", keinen Confirm-Dialog (less code). Rennen-Intent ist dann klar. Option D wenn "Rückweg zum Rennen" explizit gewünscht wird.

> **User-Input nötig:** Option B oder Option D?

### 8.3 Minimap

Die Minimap (`renderMinimap` in Minimap.js) zeigt den kompletten Track mit einem Leader-Dot.

**Nützlichkeit:** Sehr hoch wenn Camera nicht alle Racer zeigt (LEADER_ZOOM, BATTLE_ZOOM) — der Operator sieht auf der Minimap wo das gesamte Feld steht. Niedrig im OVERVIEW-Modus wo sowieso alles sichtbar ist.

**Empfehlung:** Minimap behalten, aber alle N Racer als Dots anzeigen (nicht nur Leader) — gibt im BATTLE_ZOOM Kontext über den Rest des Feldes.

---

## 9. Synthese — Wie alles zusammenhängt

### 9.1 Primäre Kopplungen

**Kopplung 1: worldWidth → overviewZoom → State-Zooms**
Wenn eine Strecke breiter als 1280px wird, sinkt overviewZoom unter 1.
Alle State-Zoom-Ratios multiplizieren sich damit — bei worldW=6000 ist LEADER_ZOOM=0.298 statt 1.4.
Auf Open-Tracks multipliziert OPEN_TRACK_BASE_ZOOM nochmal: 1.5×0.298=0.447 (BUG B, §4).
→ Korrektur erfordert separaten Camera-Kalibrier-Pfad für Open-Tracks.

**Kopplung 2: pathLengthPx → speedScaleFactor → visuelle Traversal-Rate**
Wenn pathLengthPx den maxScale-Cap überschreitet, steigt die visuelle Geschwindigkeit überproportional.
Das macht unabhängig von Camera-State das Rennen hektisch.
→ maxScale muss hoch genug sein dass der B-17-Algorithmus funktioniert (min: pathLengthPx_max / referencePathLength).

**Kopplung 3: Camera-Zoom → Sprite-Größe in Bildschirm-Px**
Proportional-Scaling: `screenPx = displaySize × displaySizeScale × frameEffZoom`.
`computeRenderDisplayScale` aktiviert den Floor wenn screenPx < minTargetScreenPx.
Wenn Camera raus-zoomt (kleines frameEffZoom) und Floor aktiv ist, werden Sprites größer als "natürlich" — optisch seltsam.
→ Camera-Zoom sollte durch minTargetScreenPx-Constraint limitiert werden (nicht umgekehrt).

**Kopplung 4: Sprite-Größe → Tag-Overlap**
Große Sprites → Racer weiter auseinander auf Bildschirm → weniger Tag-Overlap.
BATTLE_ZOOM auf N=4 Racern: Sprites groß, Tags gut lesbar.
OVERVIEW auf N=20 Racern: Sprites klein, 20 Tags überlappen massiv.
→ Tag-Visibility muss N-adaptiv sein (§5.3).

### 9.2 Konkrete Abhängigkeits-Beispiele für Operator-Tuning

```
"Wenn Camera in BATTLE näher ranzoomt (battleZoomRatio erhöhen):
  → Sprites werden proportional größer (+screenPx)
  → Falls displaySize groß genug: Floor wird nicht aktiviert
  → Tags werden größer (inv-Skalierung) — weniger Overlap
  → Aber: weniger Strecke sichtbar, mehr Racer off-screen
  → Anti-Pattern bei N=20, akzeptabel bei N=4"

"Wenn pathLengthPx auf 8000-Strecken größer wird (maxScale anheben):
  → speedScaleFactor steigt → effectiveBaseSpeed sinkt → Rennen dauert länger
  → Camera-Zoom-States bleiben gleich (pathLengthPx beeinflusst nicht worldWidth)
  → Aber Traversal-Rate in px/s sinkt → Rennen wirkt langsamer
  → Ziel: gleiche px/s wie reference track = 131 px/s"

"Wenn openTrackBaseZoom von 1.5 auf 2.0 erhöht:
  → Viewport zeigt weniger Welt (1280/2.0 = 640px statt 853px)
  → Sprites erscheinen 33% größer
  → Tags leichter lesbar
  → Aber: Pulk muss sehr eng sein damit alle im Bild bleiben
  → Kompensation: openTrackPanTarget muss noch aggressiver auf Focus-Group zeigen"

"Wenn minTargetScreenPx von 32 auf 48 erhöht:
  → Floor wird öfter aktiv → Sprites bleiben größer auf großen Tracks
  → Camera-Zoom darf weniger weit raus (Constraint-Limit)
  → Mehr Camera-States können durch Zoom-Limit blockiert werden
  → Muss koordiniert mit Camera-Tunables eingestellt werden"
```

### 9.3 Empfohlene Tuning-Reihenfolge

1. **speedScaleFactor.maxScale anheben** (Q-25) — behebt hektische Open-Tracks unabhängig von Camera
2. **Bug B fixen** (Zoom-Inversion Open-Tracks) — dann erst werden State-Zooms testbar
3. **Bug A fixen** (OVERVIEW-Pan) — Camera folgt endlich Racern im OVERVIEW
4. **Bug C fixen** (openTrackPanTarget Focus-Group) — Spitzenkampf-Camera korrekt
5. **minTargetScreenPx-Constraint als Camera-Limit** — erst wenn Camera-Zooms korrekt arbeiten
6. **Tag-Visibility N-adaptiv** — auf bestehende korrekte Camera aufsetzen
7. **Dev-Panel-Integration** — alles tunable machen

---

## 10. RaceScreen-Refactor (Q-7) und Test-Infrastruktur (Q-18)

### 10.1 Aktuelle Camera-Logik-Verteilung

```
RaceScreen/index.jsx (1032 LOC, 0 Unit-Tests)
  ├─ Camera-Init (lines 210–219): CameraDirector-Konstruktion + bbox-Skalierung
  ├─ Camera-Update (lines 819–848): openTrack vs. closedTrack Camera-Pfad
  ├─ drawRacers (lines 387–407): drawRacer-Aufruf + drawNameTag
  └─ drawNameTag (lines 366–385): Tag-Rendering mit inv-Skalierung

modules/camera/ (vollständig extrahiert, gut testbar)
  ├─ CameraDirector.js — State-Machine + Zoom-Logik
  ├─ openTrackCamera.js — Pan-Bounds + Pan-Target
  ├─ Minimap.js — PiP-Renderer
  └─ lapUtils.js — Lap-Arithmetik

modules/autoSpriteScale.js — Sprite-Scaling-Formula (gut testbar)
```

**Was in RaceScreen.jsx bleiben sollte:** React-State, rAF-Loop, Canvas-Setup, Overlay-Rendering.

**Was extrahiert werden sollte:**
- `computeRaceCameraTransform(st, camDirRef, bsX, bsY, worldWidth, worldHeight, isOpenTrack)` → `modules/camera/raceCamera.js`
- `drawNameTag` → `modules/camera/nameTagRenderer.js` (testbar ohne Canvas-Context-Vollaufsatz)
- Camera-Initialisierungs-Logik (bbox-Skalierung) → Teil von `raceCamera.js`

### 10.2 Test-Strategie für Camera-Logik (Q-18)

CameraDirector.js und openTrackCamera.js haben bereits Unit-Tests.
Das Problem liegt in den ungetesteten Integrationen innerhalb des rAF-Loops.

**Mock-rAF-Pattern (vi.stubGlobal):**
```js
let rafCallback = null;
vi.stubGlobal('requestAnimationFrame', (cb) => { rafCallback = cb; return 1; });

// Frame simulieren:
rafCallback(timestamp);
```

**Was testbar ist ohne Browser:**
- `computeRaceCameraTransform` mit mock-Racer-Positionen → prüft ob Pan/Zoom-Output korrekt
- `drawNameTag` mit mock-CanvasRenderingContext2D → prüft Text/Rect-Calls
- Camera-State-Transitions unter simulierten Renn-Zuständen

**Was nicht testbar ohne Browser:**
- Tatsächliches Canvas-Rendering (Pixel-Vergleich)
- Fullscreen-API-Interaktionen
- Performance unter echtem 60fps-rAF

### 10.3 Sub-PR-Aufteilung für Q-7-Refactor

**PR-B: RaceScreen-Split (reines Refactor, kein Behavior-Change)**
1. Extrahiere `computeRaceCameraTransform` → `modules/camera/raceCamera.js`
2. Extrahiere `drawNameTag` → `modules/camera/nameTagRenderer.js`
3. Extrahiere Camera-Initialisierung → Hilfsfunktion
4. RaceScreen importiert diese Module
5. Tests für die neuen reinen Funktionen
6. Kein visueller Unterschied — 100% Behavior-preserving

---

## 11. Implementation-Aufteilung

### 11.1 Vorgeschlagene Sub-PR-Reihenfolge

```
PR-A: Q-25 + finishT-Fix (2 kleine Änderungen, große Auswirkung)
  - speedScaleFactor.maxScale: 4.0 → 10.0 in defaults.js
  - finishT für Open-Tracks aus duration ableiten (openTrackFinishT nutzen)
  - +Tests: speedScale (neue maxScale-Grenze), openTrackFinishT-Integration
  - Prerequisite: User bestätigt maxScale=10.0 und gewünschte Renndauer

PR-B: RaceScreen-Split (Refactor, kein Behavior-Change)
  - computeRaceCameraTransform extrahieren
  - drawNameTag extrahieren
  - +Tests: neue reine Funktionen
  - Kein Behavior-Change — nur Struktur

PR-C: Camera-Bug-Fixes (3 Bugs, alle in CameraDirector/openTrackCamera)
  - Bug A: OVERVIEW-Pan wiederherstellen (targetZoom-Fix)
  - Bug B: Open-Track-Zoom-Inversion beheben (OpenTrackCameraDirector)
  - Bug C: openTrackPanTarget auf Focus-Group beschränken
  - +Tests: erweiterte CameraDirector-Tests für Bug-Szenarien

PR-D: Phase-Erkennung + Camera-State-Machine (neue Logik)
  - Start-Pulk-Phase (erzwingt OVERVIEW auf gesamten Start)
  - Endspurt-Phase (LEADER_ZOOM priorisiert)
  - Finish-Event (erzwungener Leader-Zoom)
  - +Tests: State-Transitions unter simulierten Rennphasen

PR-E: Sprite-Min-Constraint + Tag-Visibility N-adaptiv (B-UX1)
  - minTargetScreenPx als Camera-Zoom-Limit
  - Tag-Visibility: Alle/Top-5/Top-3 nach N-Range
  - +Tests: computeRenderDisplayScale mit Zoom-Limit, drawNameTag mit Visibility-Flag

PR-F: Dev-Panel Camera-Tunables
  - Neue "Camera"-Sektion im Dev-Screen
  - Alle §7.1-Parameter als Sliders/Inputs
  - Live-Apply auf CameraDirector-Instanz
  - +Tests: Config-Persistenz, Live-Apply

PR-G: UI-Bugs (Fullscreen + Setup-Button)
  - Vollbild: canvas.requestFullscreen() statt screen.requestFullscreen()
  - Setup-Button: Label + Verhalten nach User-Input
  - +Tests: toggleFullscreen-Logik (mock document.fullscreenElement)
```

### 11.2 Alternative Reihenfolgen

**Alternative 1 — Q-25 und Bug-Fixes zusammen (PR-A+C):**
Vorteil: eine PR testet das neue Camera-Verhalten auf korrekter Q-25-Basis.
Nachteil: größere PR, Rollback schwieriger.

**Alternative 2 — Refactor zuerst (PR-B vor PR-A):**
Vorteil: Bugs werden in sauberem Code-Zustand gefixt.
Nachteil: Refactor-PR ohne sichtbare Verbesserung ist schwerer zu motivieren.

**Alternative 3 — UI-Bugs zuerst (PR-G):**
Vorteil: sofortige User-sichtbare Verbesserungen (Fullscreen funktioniert).
Nachteil: Setup-Button-Frage braucht User-Input (§8.2).

**Empfehlung:** PR-A (Q-25) → PR-C (Bug-Fixes) → PR-B (Refactor) → PR-D → PR-E → PR-F → PR-G.
Begründung: Q-25-Fix macht sofort Open-Track-Races besser. Bug-Fixes sind dann direkt testbar.

---

## 12. Risiken und offene Fragen

### 12.1 Architektur-Risiken

**R1 — Open-Track-Camera-Refactor Scope-Creep:**
Bug B (Zoom-Inversion) erfordert einen separaten Kalibrier-Pfad für Open-Track-Camera-Zooms.
Das könnte bedeuten: eigener `OpenTrackCameraDirector` statt CameraDirector zu recyceln.
Scope: mittel. Risiko: Doppelcode wenn nicht sauber abstrahiert.

**R2 — RaceScreen rAF-Loop Testbarkeit:**
Der rAF-Loop ist 1032 LOC mit starken Closures. Extraktion einzelner Funktionen bricht ggf. Closure-Zugriffe.
Mitigation: Extraktion nur von Funktionen ohne rAF-Loop-State (drawNameTag, computeRaceCameraTransform).

**R3 — Camera-State-Machine Instabilität nach Phase-Detection:**
Neue Phase-Erkennung + Events müssen mit dem bestehenden MAX_STATE_DURATION-Timer interagieren.
Wenn Event-Trigger und Timer gleichzeitig feuern, kann die State-Machine in unerwartete Zustände kommen.

### 12.2 User-Input-Fragen (vor Implementation nötig)

Diese Entscheidungen können nicht aus dem Code abgeleitet werden:

| # | Frage | Sektion |
|---|-------|---------|
| UI-1 | OVERVIEW-Pan: Zoom-Out (overviewZoom) oder bestehenden Zoom-Level mit erweitertem Pan? | §4.2 Fix A |
| UI-2 | Space Sprint Renndauer: ~144s (maxScale=10) oder kürzer gewünscht? | §6.4 Option A |
| UI-3 | finishT für Open-Tracks: aus configured duration ableiten (Option B) oder fix 0.95 belassen? | §6.4 Option B |
| UI-4 | Setup-Button: "Abbrechen ohne Rückweg" (Option B) oder "Race-State erhalten" (Option D)? | §8.2 |
| UI-5 | Fullscreen: HUD-Overlay beibehalten im Fullscreen oder ausblenden? | §8.1 |
| UI-6 | B-UX1 Name-Tags: Priorität Iteration 1 (Top-N ausblenden) oder direkt Stapeln? | §5.3 |

### 12.3 Annahmen die validiert werden müssen

- **Annahme:** speedMultiplier der Racer-Types sind ~1.0 für die meisten Typen. Nicht gemessen — könnte Renndauer-Berechnungen verschieben. Messen vor PR-A.
- **Annahme:** maxScale=10.0 ergibt ~131 px/s für Space Sprint. Gilt nur wenn baseSpeedMean korrekt ist. Muss im Browser-Test verifiziert werden.
- **Annahme:** Garden-Path-Ecke-Problem ist Bug A (OVERVIEW-Pan). Ohne Browser-Run nicht 100% sicher — könnte auch ein unbekannter Effekt sein.

---

## Cross-References

- `client/src/modules/camera/CameraDirector.js` — State-Machine (Bugs A+B beschrieben in §4)
- `client/src/modules/camera/openTrackCamera.js` — Open-Track-Pan (Bug C in §4)
- `client/src/screens/RaceScreen/index.jsx` — Camera-Integration (lines 210–219, 819–848)
- `client/src/modules/autoSpriteScale.js` — computeRenderDisplayScale (§5.2)
- `client/src/modules/speedScale.js` — computeSpeedScaleFactor + DEFAULT_SPEED_SCALE_CONFIG
- `client/src/modules/storage/defaults.js:112` — DEFAULT_SPEED_SCALE_CONFIG.maxScale = 4.0 ← Q-25 Root Cause
- `docs/BACKLOG.md — Hot §1` — Kamera-Phase als nächste Implementierungsphase
- `docs/BACKLOG.md — B-UX1` — Name-Tag-Readability (B-UX1 hier integriert)
- `docs/BACKLOG.md — Q-25` — Open-Track-Länge (hier empirisch gelöst)
- `docs/BACKLOG.md — Q-7` — RaceScreen-Split (§10)
- `docs/BACKLOG.md — Q-18` — Test-RaceScreen (§10.2)

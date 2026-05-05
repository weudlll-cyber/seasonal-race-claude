# RaceArena — Camera-Director + RaceScreen-Refactor Konzept

**Status:** Konzept-Doku — User-Klärungen abgeschlossen 2026-05-02
**Phase:** Kamera-Phase + RaceScreen-Refactor (Hot Pos 1)
**Related:** `docs/BACKLOG.md — Hot §1`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`

---

## Präambel: Dieses System ist verzahnt

Camera-Verhalten, Strecken-Größe, Sprite-Größe, Name-Tag-Lesbarkeit und Racer-Anzahl teilen
einen gemeinsamen Constraint-Raum:

```
pathLengthPx     →  speedScaleFactor  →  visuelle Traversal-Rate
worldWidth       →  overviewZoom      →  CameraDirector-Zoom-States
Camera-Zoom      →  effektive Sprite-Px im Viewport
Sprite-Px        →  Racer-Erkennbarkeit
Racer-Abstand    →  Tag-Überlappung
N (Racer-Anzahl) →  Spitzengruppe  →  Tag-Anzahl  →  HUD-Overlay-Größe
```

Eine Änderung an einem Hebel zieht alle anderen. Sektion 10 (Synthese) macht Kopplungen explizit.
N=4 bis N=100 sind keine zwei Modi — es ist dieselbe Logik auf einem Kontinuum.

---

## 1. Problemstatement

### 1.1 Was nicht funktioniert — User-Beobachtungen aus Race-Tests

| # | Strecke | Beobachtung | Diagnose |
|---|---------|-------------|----------|
| P1 | Garden Path | Sprites kleben in Ecke oben-links, Camera schaut auf Strecke, nicht auf Racer | §5 — OVERVIEW-Pan ist ein No-Op |
| P2 | River Run | Camera zoomt zu weit raus wenn Pulk auseinandergeht | §5 — Zoom-Inversion auf großen Open-Tracks |
| P3 | River Run Spitzenkampf | Nur kleiner Cluster sichtbar, Rest des Frames leer | §5 — openTrackPanTarget nutzt alle Racer |
| P4 | Space Sprint | Vollbild-Button macht nicht echtes Browser-Vollbild | §9 — CSS-Expansion statt Fullscreen API |
| P5 | Space Sprint | Setup-Button bringt zu Setup, kein Rückweg zu laufendem Rennen | §9 — Kein Cancel-Dialog |
| P6 | Open Tracks | Fühlen sich zu kurz an bei großem Background | §7 — speedScaleFactor.maxScale=4.0 zu niedrig |
| P7 | Alle Tracks | Name-Tags überlappen in dichten Pulks | §6 — kein Anti-Overlap |
| P8 | Alle Tracks | Sprite-Größe vs Camera-Zoom Tradeoff nicht gelöst | §5/§6 — kein harter Camera-Constraint |

### 1.2 Was PR #26 (B-16) und PR #28 (Camera-Polish + Q-14) bereits gelöst haben

**PR #26 — B-16 Adaptive Zoom:**
- `overviewZoom = CANVAS_W / worldW` — Zoom-States visuell konsistent bei jeder Worldbreite
- Zoom-Ratios (LEADER=1.4×, BATTLE=1.6×, COMEBACK=1.3×) relativ zu overviewZoom
- B-17 speedScaleFactor — gleiche Traversal-Rate unabhängig von pathLengthPx (aber maxScale=4.0 zu niedrig, §7)

**PR #28 — Camera-Polish + Q-14:**
- OVERVIEW-Pan zu Centroid top-N Racer (Bug verhindert Wirksamkeit — §5.1 Bug A)
- COMEBACK_ZOOM zielt auf 3rd-Place statt last-place
- MIN_ZOOM=0.15, MAX_ZOOM=2.5 Guards

### 1.3 Anti-Patterns zu vermeiden

- Hardcoded Magic-Numbers für Camera-Tunables — alles ins Dev-Panel (Project-Principle 1)
- Track-spezifische Code-Pfade — Lösungen müssen 1280×720 bis 8000×6000 und N=4 bis N=100 abdecken
- Soft-Floors die gebrochen werden — Sprite-Min-Floor ist HARTER Constraint (§6.2)
- Getrennte Fixes ohne Gesamtbild — Camera + Sprites + Tags + N gemeinsam denken

---

## 2. Strecken-Größen-Range

### 2.1 Gemessene Werte der aktuellen Default-Tracks

| Track | worldW × worldH | closed | pathLengthPx | speedScaleFactor | Est. Race-Zeit\* |
|-------|----------------|--------|-------------|-----------------|-----------------|
| Dirt Oval | 1536 × 1024 | ✓ | 3 245 | 1.62 | ~50 s (2 Laps) |
| Garden Path | 1536 × 1024 | ✓ | 2 506 | 1.25 | ~77 s (4 Laps) |
| City Circuit | 1536 × 1024 | ✓ | 3 093 | 1.55 | ~47 s (2 Laps) |
| River Run | 6000 × 4000 | ✗ | 6 156 | 3.08 | ~45 s |
| Space Sprint | 6000 × 4000 | ✗ | 19 772 | **4.0 (CAPPED)** | ~58 s (→ ~144 s bei maxScale=10) |

\* Baseline: speedMultiplier=1.0, baseSpeedMean=0.001045, REFERENCE_FPS=62.5.

### 2.2 Unterstützte Track-Range

- **Kleinstes Track-Canvas:** 1280×720
- **Mittlere Tracks:** 1536×1024 (alle 5 Default-Tracks geschlossen)
- **Große Open-Tracks:** 6000×4000
- **Geplantes Maximum:** 8000×6000
- **pathLengthPx-Range:** ~2500 bis ~50 000+

### 2.3 Skaleninvariante vs. strecken-spezifische Parameter

**Skaleninvariant:** Zoom-Ratios, Mindest-Sprite-Größe in Bildschirm-Px, Tag-Skalierungsformel.

**Strecken-spezifisch:** speedScaleFactor.maxScale, OPEN_TRACK_BASE_ZOOM, Camera-State-Schwellen.

### 2.4 Racer-Anzahl-Range

Das System muss N=4 bis N=100 Racer unterstützen. D7d (BACKLOG) adressiert Performance.
Die Camera-Logik muss von Anfang an N-adaptiv sein.

**Spitzengruppen-Formel:**

```
spitzengruppe = clamp(round(N × 0.1), spitzengruppeMin, spitzengruppeMax)
```

Defaults: `spitzengruppeMin=3`, `spitzengruppeMax=10`. Beide als Dev-Panel-Tunable.

| N | Spitzengruppe (User-Vorgabe) |
|---|------------------------------|
| 4–8 | 3 |
| 9–20 | 5 |
| 21–50 | 7 |
| 51–100 | 10 |

*Formula als Annäherung; Tunable-Defaults können angepasst werden.*

**Wie N andere Parameter beeinflusst:**

| Parameter | N=4 | N=20 | N=100 |
|-----------|-----|------|-------|
| Spitzengruppe | 3 | 5 | 10 |
| Tags sichtbar (Default) | 3 | 5 | 10 |
| HUD-Standings | Top-3 | Top-5 | Top-10 |
| Pulk-Spread-Erwartung | eng | mittel | breit |
| BATTLE_ZOOM Häufigkeit | hoch | mittel | niedrig (nur Spitzengruppen-Duelle) |

**N=100 Skalierbarkeit:** Camera-Logik ist O(1) pro Frame (nur Spitzengruppe betrachtet).
`openTrackPanTarget` mit focusRacers berechnet Midpoint über max. 10 Racer — akzeptabel.
D7d-Performance-Work (Spatial-Grid, LOD) ist Voraussetzung für Avoidance bei 100 Racern,
aber Camera-Architektur selbst skaliert.

---

## 3. Camera-Regie-Philosophie

Dieser normative Rahmen leitet alle Camera-State-Entscheidungen. Im bestehenden Code
nur implizit — hier explizit formuliert.

> **Architektur-Hinweis:** Die Camera-Regie ist als TENDENZ-LOGIK formuliert, nicht als
> Constraint-System. Default-Tendenzen (LEADER_ZOOM ist häufigster State) und Spannungs-Metriken
> (engstes Duell in Spitzengruppe triggert BATTLE_ZOOM) ersetzen feste Prioritäten-Hierarchien.
> Das ist bewusste Architektur-Entscheidung — Camera reagiert auf Race-Dynamik, nicht auf
> starre Reihenfolge.

### 3.1 Leitsätze

**LEADER_ZOOM ist Default-Modus, nicht OVERVIEW.**
Das Rennen dreht sich um die Spitze. LEADER_ZOOM auf die Spitzengruppe ist der Ruhezustand
zwischen dramatischen Momenten. OVERVIEW ist ein periodischer Kontext-Geber, kein Heimat-State.

**Die Spitze ist die Default-Aufmerksamkeit der Camera.**
LEADER_ZOOM ist Default-State, der Leader ist meistens im Bild.
Andere States dürfen den Fokus temporär verschieben:
- BATTLE_ZOOM auf Spitzengruppen-Duelle (auch wenn Leader nicht im Duell ist)
- COMEBACK_ZOOM auf besondere Fälle (Last-place-Drama, schneller Aufholer)
- OVERVIEW auf Pulk-Mitte (periodisch)
Nach temporärem Abstecher kehrt Camera zu LEADER_ZOOM zurück.
Es gibt KEIN hartes Constraint dass der Leader in jedem Frame sichtbar sein muss.

**Jeder Camera-State hat eine Ziel-Sprite-Größe.**
Statt Zoom-Multiplikatoren definiert jeder State, wie groß Sprites auf dem Bildschirm
erscheinen sollen (als % der Canvas-Höhe). Die Camera berechnet den nötigen Zoom rückwärts
daraus — deshalb "inverse Camera Logic" (§10.2). OVERVIEW-Größe dient gleichzeitig als
skaleninvarianter Sprite-Floor.

**Sprite-Min-Floor ist HARTER Constraint.**
Wenn ein Camera-Zoom den Sprite unter `spritePctOfCanvas.overview × CANVAS_H` bringen würde,
wird der Zoom blockiert. Der Floor überschreibt Camera-Entscheidungen. (§6.2)

**Entfernte Nachzügler dürfen aus dem Frame fallen.**
"Wie im Fernsehen": wenn das Feld sich streckt, zeigt die Camera die Spitze.
Der Spielleiter sieht auf der Minimap wo alle Racer sind.
Last-Place-Drama (COMEBACK_ZOOM) ist ein dramatischer Ausnahmefall.

**OVERVIEW ist periodischer Kontext-Geber.**
Alle [overviewCooldownMin–overviewCooldownMax]s (Random-Jitter, tunbar im Dev-Panel) gibt es eine kurze OVERVIEW-Phase (overviewDuration, tunbar) die das gesamte
Feld zeigt. Zusätzlich am Start und am Ende des Rennens. Nicht öfter.

### 3.2 Aufmerksamkeits-Tendenzen

```
1. Spitzengruppe           — LEADER_ZOOM als Default-Tendenz (häufigster State)
2. Spitzengruppen-Duelle   — Camera zoomt ran wenn eng (BATTLE_ZOOM)
3. Pulk-Übersicht          — Kurze periodische OVERVIEW-Checks (OVERVIEW)
4. Last-place-Drama        — Gelegentlich wenn besonders (COMEBACK_ZOOM)
```

Das sind **Tendenzen**, keine starre Prioritäts-Hierarchie. Wenn zwei States gleichzeitig
triggern, gewinnt der mit höherer Spannungs-Stärke (§5.3) — nicht per fixer Reihenfolge.
LEADER_ZOOM ist häufigster State, aber andere States dürfen den Fokus temporär verschieben.

### 3.3 Implikationen für N=4 vs N=100

Bei N=4: BATTLE_ZOOM fast immer relevant.
Bei N=100: BATTLE_ZOOM nur innerhalb der Top-10-Spitzengruppe — nicht für den Kampf um Platz 47.
Camera ignoriert den Rest des Feldes bewusst — das ist Feature, kein Bug.

---

## 4. Race-Phasen-Analyse

### 4.1 Beobachtbare Renn-Phasen

| Phase | Charakteristik | Programmatisch erkennbar |
|-------|---------------|--------------------------|
| **PRE_RACE** | Startreihen aufgebaut, Countdown läuft | `racePhase === 'COUNTDOWN'` |
| **Start-Pulk** | Rennen gestartet, Racer noch dicht beieinander | `raceElapsed < 3000ms` |
| **Auseinanderziehen** | Feld spreizt sich auf | `gapLeadLast 0.05..0.15` |
| **Spitzenkampf** | Engster Abstand innerhalb Spitzengruppe | `minGapInSpitzengruppe < 0.05` |
| **Klarer Anführer** | Leader weit vor 2nd | `gap01 >= 0.15` |
| **Endspurt** | Leader nähert sich finishT | `leader.t / finishT > 0.85` |
| **Outlier / Last-place-Drama** | Letzter weit abgehängt, vorne klar entschieden | `gapLeadLast > 0.3 && firstHalfClear` |
| **Finish** | Erster hat finishT überschritten | `st.finishedCount >= 1` |
| **RACE_END** | Alle Racer fertig oder Timeout | `st.finishedCount === N` |

### 4.2 Camera-State-Tabelle (nach User-Klärung UI-1)

| State | Trigger | Tendenz-Stärke | Default Dauer | Anmerkung |
|-------|---------|----------------|---------------|-----------|
| **LEADER_ZOOM** | Default-Modus | 1 (stärkste Tendenz) | unbegrenzt | Zielt auf Spitzengruppe-Centroid |
| **BATTLE_ZOOM** | minGapInSpitzengruppe < 0.05 (engstes Duell in Spitzengruppe) | 2 | bis minGapInSpitzengruppe ≥ 0.07 | Hysterese: eintritt 0.05, austritt 0.07 |
| **OVERVIEW** | Cooldown abgelaufen ([overviewCooldownMin–overviewCooldownMax]s, Random-Jitter) + Start + Ende | 3 | overviewDuration, dann LEADER_ZOOM | Zeigt gesamtes Feld mit Pan |
| **COMEBACK_ZOOM** | Last-place-Drama (gapLeadLast>0.3 + firstHalfClear) | 4 (schwächste Tendenz) | max 8s | Gelegentlich, nicht dauerhaft |

OVERVIEW-Cooldown wird zufällig aus [overviewCooldownMin, overviewCooldownMax] gezogen (Defaults 15s/25s).
OVERVIEW-Dauer (overviewDuration) sind Dev-Panel-Tunables.

### 4.3 OVERVIEW als wiederkehrender State

OVERVIEW wird dreifach ausgelöst:
1. **Start** — erste ~3s des Rennens, zeigt gesamten Start-Pulk
2. **Periodisch** — Cooldown zufällig aus [overviewCooldownMin, overviewCooldownMax] gezogen (Defaults 15s/25s), Dauer overviewDuration, dann zurück zu LEADER_ZOOM
3. **Finish** — bei `finishedCount >= 1`: 1.5 s LEADER_ZOOM als Drama-Puls auf den Gewinner (`_finishMomentExpiry = ts + 1500 ms`), danach dauerhaft OVERVIEW bis Rennende. Kein OVERVIEW-Cooldown, kein Rückfall in andere States — Priority-1-Guard blockiert alle anderen Pfade für den Rest des Rennens.

### 4.4 MANUAL_FOCUS (aufgeschoben)

User-Wunsch: Spielleiter-Klick auf Racer sperrt Camera auf diesen Racer.

Aufwand-Bewertung: Canvas-Click-Handler, Hit-Test aller Racer, neuer MANUAL_FOCUS-State
in CameraDirector, Lock-UI-Indikator, Unlock-Mechanismus. ~150–200 LOC, neuer State.

**Entscheidung:** Eigenes BACKLOG-Item **MANUAL_FOCUS**, nicht Teil dieser Phase.

### 4.5 Smooth Transitions

`MAX_STATE_DURATION=8000ms` als globaler Timer bleibt, ergänzt durch:
- **Hysterese:** BATTLE_ZOOM bleibt aktiv solange `minGapInSpitzengruppe < 0.07` (Eintritt 0.05, Austritt 0.07)
- **Event-Trigger:** `finishedCount > 0` erzwingt sofort LEADER_ZOOM auf winner
- LERP=0.04 (~1.5s zu 90%) gibt bereits sanfte Übergänge beim State-Wechsel

---

## 5. Camera-Parameter und Trigger-Logik

### 5.1 Strukturelle Bugs im aktuellen System

**Bug A — OVERVIEW-Pan ist ein No-Op:**

```js
// CameraDirector.js:178-183 — World-Edge-Clamp
const edgeLoX = canvasW * (1 - this.targetZoom);  // = 1280 * (1-1) = 0 im OVERVIEW
this.targetOffsetX = edgeLoX > 0 ? edgeLoX / 2 : Math.max(edgeLoX, Math.min(0, this.targetOffsetX));
//                                                 → Math.max(0, Math.min(0, any)) = 0 ← immer 0!
```

Wenn `targetZoom = 1` (OVERVIEW-State), ist `edgeLoX = 0`, der Clamp fixiert `targetOffsetX = 0`.
**Sichtbar als P1** (Garden Path — Racer oben-links, Camera dreht sich nicht hin).

**Bug B — Zoom-Inversion auf großen Open-Tracks:**

Für River Run / Space Sprint (worldW=6000): `overviewZoom = 1280/6000 = 0.213`.
- LEADER_ZOOM: `clamp(0.213 × 1.4, 0.15, 2.5) = 0.298`
- effZoom Open-Track: `1.5 × 0.298 = 0.447` vs OVERVIEW effZoom `1.5 × 1.0 = 1.5`
- **LEADER_ZOOM zoomt RAUS** — invertiertes Verhalten.

**Sichtbar als P2** (River Run zoomt raus wenn Pulk auseinandergeht).

**Bug C — openTrackPanTarget nutzt alle Racer:**

```js
// RaceScreen/index.jsx:838-845
const { targetX, targetY } = openTrackPanTarget(
  st.racers,  // alle Racer, nicht Spitzengruppe
  CW, CH, effZoom, camXMax, camYMax
);
```

Midpoint aller Racer liegt oft in der Mitte des Feldes, nicht bei der Spitze.
**Sichtbar als P3** (River Run Spitzenkampf — zeigt Pulk-Mitte statt Spitze).

### 5.2 Korrektur-Richtungen

**Fix A — OVERVIEW-Pan wiederherstellen:**
Im OVERVIEW-State `targetZoom = overviewZoom` statt 1 setzen. Dann ist `edgeLoX = canvasW × (1 - overviewZoom)` > 0
wenn worldW > canvasW — Pan-Offset hat Spielraum.
OVERVIEW zeigt den Track auf adaptiven Zoom, der alle Racer im Bild hält (Sprite-Min-Floor als untere Grenze).

**Fix B — Zoom-Inversion auf Open-Tracks:**
CameraDirector für Open-Tracks mit `overviewZoom = OPEN_TRACK_BASE_ZOOM` (=1.5) kalibrieren statt
`CANVAS_W/worldW`. State-Ratios dann: LEADER=2.1×, BATTLE=2.4×, COMEBACK=1.95× — alle > OVERVIEW=1.5. ✓

Implementation: CameraDirector erhält `isOpenTrack`-Parameter oder expliziten `openTrackBaseZoom`-Wert;
`overviewZoom`-Berechnung wird daran gebunden.

**Fix C — openTrackPanTarget auf Focus-Group beschränken:**
```js
const focusRacers = [...st.racers].sort((a, b) => b.t - a.t).slice(0, spitzengruppe);
const { targetX, targetY } = openTrackPanTarget(focusRacers, CW, CH, effZoom, camXMax, camYMax);
```

### 5.3 Spannungs-Stärke-Logik im Code

`_transition()` evaluiert Race-Zustand und wählt den passendsten State:

```js
// findBattleCandidate — engstes Duell innerhalb Spitzengruppe
function findBattleCandidate(racersByPosition, spitzengruppe) {
  const top = racersByPosition.slice(0, spitzengruppe);
  let minGap = Infinity, candidatePair = null;
  for (let i = 0; i < top.length - 1; i++) {
    const gap = top[i].t - top[i + 1].t;
    if (gap < minGap) { minGap = gap; candidatePair = [top[i], top[i + 1]]; }
  }
  return { minGap, candidatePair };
}
// minGapInSpitzengruppe = findBattleCandidate(...).minGap
// firstHalfClear       = minGapInSpitzengruppe >= 0.05
```

Evaluierungs-Logik in `_transition()` (harte Overrides zuerst, dann Tendenzen):

1. `finishedCount > 0` → **Drama-Puls (Block W):** Beim ersten Auftreten (`_finishMomentExpiry === null`) → LEADER_ZOOM für 1.5 s (`_finishMomentExpiry = ts + 1500`). Nach Ablauf → OVERVIEW, dauerhaft. Der gesamte Priority-1-Block wird bei jedem `_transition()`-Aufruf solange `finishedCount > 0` als erstes evaluiert — alle anderen Pfade sind gesperrt.
2. `raceElapsed < startPhaseSeconds×1000` → erzwingt OVERVIEW *(hartes Override — Startphase)*
3. `minGapInSpitzengruppe < 0.05` → BATTLE_ZOOM auf candidatePair-Centroid
4. `overviewCooldownExpired` → OVERVIEW *(Kontext-Check, tritt zurück wenn BATTLE_ZOOM aktiv)*
5. Sonst → LEADER_ZOOM *(Default-Tendenz)*

COMEBACK_ZOOM als gelegentliche Variante: aktiv wenn `gapLeadLast > 0.3 && firstHalfClear` —
kein enges Duell vorne, Nachzügler weit abgehängt. Wird zufällig eingemischt, ersetzt kurz
LEADER_ZOOM. Camera muss danach nicht sofort zurück — natürlicher Abstecher.

### 5.4 Trigger-Erweiterung

Zusätzlich zu MAX_STATE_DURATION-Timer:
- **Start-Pulk** (`raceElapsed < 3000ms`): erzwingt OVERVIEW auf Feld-Centroid
- **Endspurt** (`leader.t/finishT > endgameThreshold`, Default 0.85): priorisiert LEADER_ZOOM, unterdrückt OVERVIEW-Cooldown. Threshold tunable via Dev-Panel (Block X).
- **Finish-Event** (`finishedCount > 0`): 1.5 s Drama-Puls LEADER_ZOOM auf Gewinner, danach dauerhaft OVERVIEW (Block W). `FINISH_DRAMA_DURATION = 1500 ms` hardcoded.

---

## 6. Sprite-Size + Name-Tag-Readability (verzahnt)

### 6.1 Das System ist ein einziger Constraint-Graph

```
pathLengthPx → speedScaleFactor → visuelle Traversal-Rate

worldWidth → overviewZoom → State-Zooms → frameEffZoom
  → Sprite-Px = displaySize × displaySizeScale × frameEffZoom
    → Name-Tag-Größe = f(1/frameEffZoom)
      → Tag-Overlap-Wahrscheinlichkeit

N → spitzengruppe → Tag-Anzahl sichtbar
```

### 6.2 Sprite-Größen per Camera-State (Round 3: inverse Camera Logic)

**Block Y (2026-05-05):** Skaleninvarianter Sprite-Floor (% der Canvas-Höhe).
**Block Z Round 3 (2026-05-05):** State-spezifische Ziel-Sprite-Größen ersetzen Zoom-Multiplikatoren.

**Konzept: Jeder Camera-State hat eine Ziel-Sprite-Größe:**

| State | Config-Key | Default | Bedeutung |
|-------|-----------|---------|-----------|
| OVERVIEW | `spritePctOfCanvas.overview` | 5% | Floor + OVERVIEW-Sprite-Größe |
| LEADER_ZOOM | `spritePctOfCanvas.leader` | 8% | Sprite-Größe beim Leader-Fokus |
| BATTLE_ZOOM | `spritePctOfCanvas.battle` | 12% | Sprite-Größe beim Duell-Zoom |
| COMEBACK_ZOOM | `spritePctOfCanvas.comeback` | 6.5% | Sprite-Größe beim Comeback-Zoom |

**Inverse Berechnung** (warum "rückwärts" — siehe §10.2):

```
targetPx = spritePctOfCanvas[state] × CANVAS_H
cam.zoom  = targetPx / (referenceSpriteSize × bsX)    -- Closed-Track
cam.zoom  = targetPx / (referenceSpriteSize × BASE)   -- Open-Track (BASE=1.5)
```

`referenceSpriteSize = displaySize × displaySizeScale` (gesetzt beim Race-Start).

**Cross-Track-Invarianz (L62 gelöst):** Dasselbe % gibt auf jedem Track denselben
screen-px-Wert — weil `cam.zoom × bsX = targetPx / referenceSpriteSize = konstant`.
Beweis: Garden Path (bsX=1.0) und River Run (OPEN_BASE=1.5) liefern bei 8% beide ~57.6px.

**Sicherheitsnetze:**
```
cam.zoom ≥ 1.0              (Closed: nie unter OVERVIEW-Level)
cam.zoom ≥ overviewZoom     (Open: nie unter OVERVIEW-Level)
cam.zoom ≤ 5.0              (absolutes Maximum für beide Track-Typen)
```

**Max-Cap (absolut für Q-13-Schutz):**
- `maxTargetScreenPx = 160px` — harte Obergrenze für Sprite-Bildschirm-Größe
- Camera zoomt nicht nah genug ran um sprites ruckartig groß werden zu lassen (Q-13)

**Konfiguration:** `spritePctOfCanvas` ist im Dev-Panel "Camera Behavior" tunable.
`maxTargetScreenPx` ist in "Sprite Size Cap" tunable. Beide ohne Code-Änderung (Project-Principle 1).

### 6.3 Name-Tags — Iteration 1 (umzusetzen in PR-E)

**Ziel:** Klare Tags für die Führenden, keine Überlappungs-Kakophonie.

**Tag-Strategie nach Phase:**

| Phase | Tag-Strategie | Begründung |
|-------|---------------|------------|
| PRE_RACE (Countdown) | **Alle Racer** haben Tags | Spieler findet sich in Startreihe ("welcher bin ich?") |
| RACE_START (0–3s) | Fade-out für Nicht-Spitzengruppe | Weicher Übergang, kurz Zeit zur Orientierung |
| RACING | Top-N nach `tagVisibleCount` | Lesbarkeit, Fokus auf Spitze |
| RACE_END | Optional: Tags wieder einblenden | Kontext für Auflösung + Ergebnis-Anzeige |

PRE_RACE → RACE_START Übergangspunkt: Startsignal + `tagFadeOutDelay` (Tunable, Default 3s).
Bei N=100 in PRE_RACE: 100 Tags, dicht, akzeptabel — Spieler scannt aktiv, kein passiver Konsum.
Tag-Größe in PRE_RACE kann etwas kleiner sein als in RACING (eigener Tunable oder fixer Faktor 0.8×).

**RACING-Regeln:**
- Nur Top-N Tags sichtbar, N = `tagVisibleCount` (Dev-Panel-Slider)
- Default für `tagVisibleCount` = `spitzengruppe` (round(N×0.1), cap 3–10)
- **Kein "eigener Spieler"** — Project-Principle 3: alle Racer gleichberechtigt
- Alle Racer außerhalb Top-N: kein Tag

N-Skalierung (Defaults):

| N | Tags sichtbar |
|---|---------------|
| 4–8 | 3 |
| 9–20 | 5 |
| 21–50 | 7 |
| 51–100 | 10 |

### 6.4 Name-Tags — Iteration 2 (BACKLOG B-UX1-Iter2, nicht diese Phase)

Langfristige Vision: state-abhängige Tag-Strategie:

| Camera-State | Tag-Strategie |
|-------------|---------------|
| OVERVIEW | Nur Spitzengruppe-Tags oder keine |
| LEADER_ZOOM | Spitzengruppe-Tags prominent |
| BATTLE_ZOOM | Tags der beteiligten Racer prominent |
| COMEBACK_ZOOM | Tag des fokussierten Racers + Leader als Referenz |
| Zoom-Out | Alle konfliktfreien Tags (Anti-Overlap wenn Platz) |

Anti-Overlap: Tags die sich nicht überlappen werden angezeigt (bbox-Vergleich).
Erfordert: State-Tracking in `drawNameTag`, Anti-Overlap-Check.

→ BACKLOG: **B-UX1-Iter2** — state-abhängige Tag-Strategie. Verweis: §6.4 dieses Dokuments.
  User möchte das explizit umsetzen sobald Iteration 1 läuft.

### 6.5 N=100 Durchspielen (Iteration 1)

Mit N=100, spitzengruppe=10: 10 Tags auf Canvas.
displaySize vermutlich kleiner (LOD aus D7d) → Tags skalieren mit `inv=1/ezoom`.
Auf LEADER_ZOOM: 10 Tags, dicht, aber nicht 100 Tags → akzeptabel.
Auf OVERVIEW: inv-Skalierung hält Tags lesbar auf weitem Zoom.
Risiko: 10 Tags können sich bei engem Pulk noch überlappen → Iteration 2 löst das.

### 6.6 Der Tradeoff explizit

```
"Wenn BATTLE_ZOOM ran-zoomt (battleZoomRatio erhöhen):
  → Sprites proportional größer
  → Tags größer (inv-Skalierung)
  → Weniger Overlap
  → Aber: weniger Strecke sichtbar, mehr Racer off-screen
  → Anti-Pattern bei N=20, akzeptabel bei N=4"

"Wenn minTargetScreenPx von 32 auf 48 erhöht:
  → Floor öfter aktiv → Sprites bleiben größer auf großen Tracks
  → Camera darf weniger weit raus (Constraint-Limit wirkt früher)
  → Mehr Camera-States können durch Zoom-Limit blockiert werden
  → Koordiniert mit Camera-Tunables einstellen"
```

---

## 7. Open-Track-Länge — Q-25 Empirische Untersuchung

### 7.1 Messergebnisse (empirisch bestätigt)

Alle Messungen: baseSpeedMean=0.001045, REFERENCE_FPS=62.5, speedMultiplier=1.0.

| Track | pathLengthPx | ssf_raw | ssf_applied | Traversal-Rate | Renndauer |
|-------|-------------|---------|-------------|----------------|-----------|
| Dirt Oval | 3 245 | 1.62 | 1.62 | 131 px/s | ~50 s |
| Garden Path | 2 506 | 1.25 | 1.25 | 131 px/s | ~77 s |
| City Circuit | 3 093 | 1.55 | 1.55 | 131 px/s | ~47 s |
| River Run | 6 156 | 3.08 | 3.08 | 131 px/s | ~45 s |
| Space Sprint | 19 772 | **9.89** | **4.00 (CAPPED)** | **323 px/s** | ~58 s (→ ~144 s bei maxScale=10) |

**Root Cause: `DEFAULT_SPEED_SCALE_CONFIG.maxScale = 4.0`** in `client/src/modules/storage/defaults.js:112`.
Canvas-Koordinatensystem-Hypothese **empirisch widerlegt** — Space Sprint World-Koordinaten 256..5707, nicht Canvas-gebunden.

### 7.2 Lösung (User-Entscheidung UI-2+UI-3)

**Schritt 1 — maxScale anheben:**
```js
// defaults.js:112
DEFAULT_SPEED_SCALE_CONFIG.maxScale = 10.0
```
Space Sprint traversiert dann bei ~131 px/s. Renndauer ~144s bei speedMultiplier=1.0.

**Schritt 2 — Open-Track Setup-Screen: Duration-Slider:**
- Spielleiter wählt Gesamt-Renndauer für Open-Tracks
- **Min-Zeit:** ~30s (physikalisches Minimum)
- **Max-Zeit:** abgeleitet aus `pathLengthPx / (baseSpeedMean × referencePathLength × minScale)` — was die Strecke physikalisch hergibt
- **Empfohlener Default:** ~65% der Max-Zeit (CC-Vorschlag: angenehme Länge ohne zu hetzen)
- User sieht nur erreichbare Zeiten — Slider-Range kommt aus Strecken-Physik
- Estimated-Duration-Anzeige (analog zu closed-track Lap-Zeit-Anzeige)

**Schritt 3 — finishT für Open-Tracks dynamisch berechnen:**
```js
// RaceScreen/index.jsx — nach Fix:
const finishT = isOpenTrack
  ? Math.min(
      openTrackFinishT(duration, speedMultiplier, baseSpeedConfig.max),
      1.0 - behaviorConfig.runoutZone
    )
  : lapsFromDuration(duration);
```

`openTrackFinishT` existiert bereits in `lapUtils.js` — bisher ungenutzt in RaceScreen.
`runoutZone` (Default 0.05) bleibt als **Sicherheitspuffer** am Streckenende (CC-Empfehlung).
`Math.min`-Clamp: finishT überschreitet nie `1.0 - runoutZone` auch bei sehr langer duration.

**Warum runoutZone behalten:** Schützt vor Racer-am-Ende-des-Pfades-Bug wenn finishT zu nah an 1.0.
Kann tunable bleiben oder auf Default=0.05 eingefroren werden.

### 7.3 Was dadurch geklärt ist (PR-A1)

- Q-25 Root Cause: identifiziert und lösbar mit 1-Zeilen-Fix in defaults.js
- Space Sprint ~144s ist die korrekte Referenz-Dauer bei maxScale=10
- Duration-Slider macht Open-Track-Setup für Spielleiter intuitiv
- finishT-Bug (duration-Einstellung hatte keinen Effekt auf Open-Tracks) wird behoben

### 7.4 Speed-Pipeline-Architektur (PR-A2)

**Aktueller Stack:**
```
baseSpeed (global Default) × speedMultiplier (per Type) × speedScaleFactor (per Track)
  → effektive px/s des Racers
```

`speedScaleFactor` gleicht unterschiedliche pathLengthPx aus (B-17). Bei maxScale=10 funktioniert
das für alle aktuellen Tracks (pathLengthPx ≤ 20 000). Aber das User-Modell ist noch nicht konsistent:
Spielleiter denkt in Sekunden, Code denkt in px/s + Faktoren. Sehr kurze Strecken (~800px) würden
in 6s enden — die untere Schranke ist nicht kontrollierbar ohne Code-Änderung.

**Ziel-Stack (PR-A2 — User-Option C):**
```
gewählte_renndauer (Spielleiter-Input)
  → race_baseSpeed = f(pathLengthPx, renndauer, speedMultiplier_distribution)
    → effektive px/s = race_baseSpeed × speedMultiplier (per Type)
```

Kernprinzip: **Spielleiter wählt Renndauer, alles andere folgt daraus.**
- `race_baseSpeed` wird bei Race-Init berechnet damit der Median-Racer nach `renndauer` Sekunden fertig ist
- `speedMultiplier`-Verhältnisse zwischen Racer-Types bleiben unverändert (Rocket ist immer 1.25× schneller als Basis)
- `speedScaleFactor` wird überflüssig oder wird zu einem simplen Korrekturfaktor für Track-Geometrie-Anomalien
- Closed-Tracks: Spielleiter wählt Rundenzahl + optionale Wunsch-Dauer; race_baseSpeed so gesetzt
  dass N Runden in etwa der Wunsch-Dauer entsprechen
- Open-Tracks: Spielleiter wählt Gesamt-Dauer; race_baseSpeed direkt daraus

**Was sich für den Spielleiter ändert:**
- Slider "Renndauer" wird zur zentralen Steuerung — menschenfreundlich
- Keine px/s-Denkweise mehr nötig
- Unterschiedlich schnelle Racer-Types erzeugen natürliche Streuung um die Ziel-Dauer

**Empfohlene Pipeline-Architektur:**
- `speedScaleFactor` entfällt als eigenständiger Wert. Die Berechnung wird in `race_baseSpeed` integriert.
- `speedMultiplier`-Override pro Race ist nicht nötig — `race_baseSpeed` steuert die Strecke ausreichend.
- Detaillierte Scope-Analyse erfolgt in PR-A2-Diagnose (siehe §13.1 R7).

**Scope-Risiko:** Bestehende Tests aus D9/D10/D11/D7a/D7b basieren auf aktueller Speed-Pipeline.
PR-A2 muss Tests anpassen ohne Race-Verhalten zu brechen. Mitigation: Speed-Formel-Änderung in
isolierter Funktion (`computeRaceBaseSpeed`) — Rest des Systems referenziert diese Funktion.

---

## 8. Dev-Panel-Integration

### 8.1 Vollständige Tunable-Liste

**Neue Sektion "Camera" im Dev-Screen:**

| Parameter | Typ | Default | Tooltip |
|-----------|-----|---------|---------|
| `overviewCooldownMin` | slider 5–60 s | 15 | "Kürzeste Pause zwischen OVERVIEW-Checks. Nächster Cooldown wird zufällig aus [Min, Max] gezogen. Beide gleich = fester Rhythmus. Wert: [x]s." |
| `overviewCooldownMax` | slider 5–60 s | 25 | "Längste Pause zwischen OVERVIEW-Checks. Zufalls-Jitter wirkt menschlicher als fester Takt (TV-Regie-Analogie). Max ≥ Min. Wert: [x]s." |
| `overviewDuration` | slider 2–10 s | 4 | "Dauer des OVERVIEW-Modus. Dann zurück zu LEADER. Wert: [x]s." |
| `spitzengruppeMin` | slider 1–5 | 3 | "Mindest-Größe der Camera-Fokusgruppe. round(N×0.1) wird nach oben auf diesen Wert gecappt. Wert: [x]." |
| `spitzengruppeMax` | slider 5–20 | 10 | "Maximal-Größe der Camera-Fokusgruppe. Wert: [x]." |
| `spritePctOfCanvas.overview` | slider 2–10% | 5% | "Ziel-Sprite-Größe in OVERVIEW (auch floor). Wert: [x]%." |
| `spritePctOfCanvas.leader` | slider 6–16% | 8% | "Ziel-Sprite-Größe in LEADER_ZOOM. Wert: [x]%." |
| `spritePctOfCanvas.battle` | slider 8–20% | 12% | "Ziel-Sprite-Größe in BATTLE_ZOOM. Wert: [x]%." |
| `spritePctOfCanvas.comeback` | slider 4–12% | 6.5% | "Ziel-Sprite-Größe in COMEBACK_ZOOM. Wert: [x]%." |
| `maxStateDuration` | slider 2000–12000 ms | 4000 | "Max Verweildauer in einem Camera-State. Wert: [x]ms." |
| `lerpFactor` | slider 0.01–0.15 | 0.04 | "Camera-Übergangs-Geschwindigkeit. Kleiner = langsamer/sanfter. Wert: [x]." |
| `startPhaseSeconds` | slider 1–10 s | 3 | "Dauer der erzwungenen Start-OVERVIEW-Phase. Wert: [x]s." |

**Neue Sektion "Name Tags" im Dev-Screen:**

| Parameter | Typ | Default | Tooltip |
|-----------|-----|---------|---------|
| `tagVisibleCount` | slider 0–20 | = spitzengruppe | "Anzahl Tags die im Rennen sichtbar sind (Top-N nach Position). 0 = keine. Default = Camera-Spitzengruppe. Wert: [x]." |
| `tagScaleWithZoom` | toggle | true | "Tags skalieren mit Camera-Zoom (konstante Bildschirm-Größe). Aus = Tags skalieren mit Welt." |

**Neue Sektion "HUD Overlay" im Dev-Screen:**

| Parameter | Typ | Default | Tooltip |
|-----------|-----|---------|---------|
| `hudOverlayOpacity` | slider 0–1 step 0.05 | 0.75 | "Transparenz der HUD-Elemente im Fullscreen-Modus. 1.0 = vollständig opak. Wert: [x]." |
| `hudStandingsPosition` | select left/right | right | "Position des Live-Standings-Overlays im Fullscreen." |
| `hudMaxStandings` | slider 5–30 | 15 | "Obere Grenze für Standings-Einträge. Tatsächliche Anzeige = min(Wert, passt in Viewport). Wert: [x]." |

**HUD-Layout-Constraint:** `hudMaxStandings` ist obere Grenze, kein statischer Wert.
Zur Laufzeit wird die tatsächliche Anzeige-Anzahl aus der verfügbaren Viewport-Höhe berechnet:
`actualShowCount = min(hudMaxStandings, floor((viewportH - reservedButtonsH - padding) / rowH))`.
Buttons (Cancel Race, Fullscreen) sind immer vollständig sichtbar — werden nie durch Standings verdeckt.
"More..." Indikator wenn hudMaxStandings > fitsInViewport (kein Scrollen). reservedButtonsH ≈ 120px.

**Bestehende Sektion "Speed Scale" — Default ändern:**

| Parameter | Alt-Default | Neu-Default |
|-----------|-------------|-------------|
| `maxScale` | 4.0 | **10.0** |

**Neue Sektion "Sprite-Größen-Korridor" im Dev-Screen** (Slider, beide live-apply):

| Parameter | Typ | Default | Tooltip |
|-----------|-----|---------|---------|
| `maxTargetScreenPx` | slider 32–256 px | 160 | "Größte zulässige Sprite-Größe in Bildschirm-Px. Camera zoomt nicht näher ran als dieser Wert erlaubt. Wert: [x]px." |

Per-Type-Override: `getEffectiveMaxTargetScreenPx()` analog zu existierendem `getEffectiveMinTargetScreenPx()`
aus D3.5.5. Beide Overrides in PR-E implementieren — nicht aufschieben.

### 8.2 Live-Apply

Alle neuen Camera-Parameter sofort live-wirksam beim nächsten Frame.
CameraDirector-Instanz wird nicht neu erstellt — Parameter direkt auf dem Objekt aktualisiert.
`overviewCooldownMin`, `overviewCooldownMax` und `overviewDuration` werden in `_transition()` live gelesen. Bei jedem OVERVIEW wird ein neuer Cooldown-Wert zufällig aus [Min, Max] gezogen.

### 8.3 Per-Track-Overrides (Zukunft)

Globale Defaults zuerst. Per-Track-Overrides (openTrackBaseZoom, maxScale pro Track) in einem
späteren "Camera"-Tab im Track-Editor. Gehört in eine spätere Phase.

### 8.4 Tooltip-Convention

Format: "Kurze Beschreibung. Wert: [aktuell]. Auswirkung: [was ändert sich]."
Bestehende Tooltips im Dev-Panel als Vorbild.

---

## 9. UI-Bugs

### 9.1 Cancel-Race-Button (P5 / UI-4)

**Aktuell (RaceScreen/index.jsx:1036–1044):**
Button-Label "← Setup", löscht `activeRace` sofort ohne Confirm-Dialog.

**Fix:**
- Button-Label während aktivem Race: **"Cancel Race"**
- Confirm-Dialog: `"Are you sure? Current race will be lost."`
- Bei Bestätigung: rAF-Loop abbrechen, `sessionStorage.removeItem('activeRace')`, `fadeNavigate('/setup')`
- Button-Label bleibt "← Setup" im FINISHED-State (kein Confirm nötig — Race ist vorbei)

**Pause+Resume:** Explizit NICHT Teil dieser Phase. → BACKLOG-Item: **"Pause+Resume Race"**

### 9.2 Fullscreen-HUD (P4 / UI-5)

**Fix — echtes Browser-Fullscreen auf Canvas:**
```js
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    canvasRef.current?.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}
```

**HUD-Elemente als halbtransparente Overlays** (`position: fixed` über Canvas im Fullscreen):

| Element | Position (Vorschlag CC) | Verhalten |
|---------|------------------------|-----------|
| Live-Standings | rechts | zeigt Top-`hudMaxStandings` Racer |
| Buttons (Cancel, Fullscreen) | oben rechts | immer sichtbar |
| Status (Renndauer, Phase) | oben links | Renn-Kontext |

Transparenz: `hudOverlayOpacity` (Dev-Panel, Default 0.75).
Position: `hudStandingsPosition` (Dev-Panel, Default right).

Technisch: wenn `canvasRef.current` fullscreen ist, brauchen Overlay-Divs `position: fixed`
und hohen Z-Index um über dem Canvas sichtbar zu bleiben. CSS `::backdrop` für Hintergrund-Dimming.

**HUD-Layout-Constraint:** Buttons (Cancel Race, Fullscreen) sind IMMER vollständig sichtbar —
nie durch Standings verdeckbar. Standings-Anzahl wird zur Laufzeit aus Viewport-Höhe berechnet
(`hudMaxStandings` ist obere Grenze, nicht statischer Wert). Kein Scrollen — "More..." Indikator
wenn Liste abgeschnitten wird. Implementierung in PR-F mit dem HUD-Overlay.

Bei N=100: Standings-Anzeige = min(hudMaxStandings=15, fitsInViewport) — max. 15 Racer sichtbar.

### 9.3 Minimap

**Empfehlung:** Minimap behalten. Bei LEADER_ZOOM sieht der Operator auf der Minimap
das gesamte Feld — essentiell bei N=20+ wenn Camera aktiv den Rest ignoriert (§3.1).

**Verbesserung:** Alle N Racer als Dots anzeigen (nicht nur Leader).
Leader-Dot bleibt größer/heller. Bei N=100: Dots sehr klein, aber skalierbar.

---

## 10. Synthese — Wie alles zusammenhängt

### 10.1 Primäre Kopplungen

**Kopplung 1: worldWidth → overviewZoom → State-Zooms**
worldW=6000 → overviewZoom=0.213 → LEADER_ZOOM=0.298 → effZoom=0.447 < OVERVIEW=1.5 → BUG B.
Korrektur: Open-Track Camera-Kalibrierung mit OPEN_TRACK_BASE_ZOOM als overviewZoom.

**Kopplung 2: pathLengthPx → speedScaleFactor → Traversal-Rate**
maxScale-Cap verhindert korrekte B-17-Formel bei langen Pfaden. maxScale=10 behebt für alle
aktuellen Tracks (pathLengthPx_max = 19772 < 10 × 2000 = 20000).

**Kopplung 3: Camera-Zoom → Sprite-Px → Camera-Constraint**
`screenPx = displaySize × displaySizeScale × frameEffZoom`.
Floor aktiv wenn screenPx < minTargetScreenPx. Floor wirkt jetzt als CAMERA-LIMIT.
Camera darf nicht weiter rauszoomen als dieser Floor erlaubt.

**Kopplung 4: Sprite-Px → Tag-Overlap**
Größere Sprites → weiter auseinander → weniger Overlap. N-adaptives Tag-Limit löst den Rest.

**Kopplung 6: Sprite-Korridor [min, max] → effektive Camera-Zoom-Range**
`erlaubter_min_zoom = minTargetScreenPx / (displaySize × displaySizeScale)`
`erlaubter_max_zoom = maxTargetScreenPx / (displaySize × displaySizeScale)`
Wenn Korridor eng (max - min klein): Camera-Zoom-Range wird eingefroren — alle States sehen gleich aus.
Wenn Korridor weit (max sehr groß): Q-13-Risiko (Sprite-Animation ruckartig bei großen Sprites).
Optimum: max ≈ 4× min gibt ~2 f-Stops Spielraum ohne Q-13-Bereich zu erreichen.

**Kopplung 5: N → Spitzengruppe → Tag-Anzahl + HUD-Overlay-Größe**
Wenn N steigt, wächst spitzengruppe. `tagVisibleCount` und `hudMaxStandings` defaulten auf spitzengruppe,
können aber unabhängig gesetzt werden. Ein Tunable (`spitzengruppeMax`) steuert alle drei indirekt.

### 10.2 Inverse Camera Logic — Warum rückwärts gerechnet wird

**Das Problem der vorwärts gerechneten Multiplikatoren:**
Klassische Camera-Systeme definieren Zoom direkt: `battleZoom = overviewZoom × 2.5`. Das führt zu
Track-Abhängigkeit: derselbe Multiplikator liefert bei worldW=1280 einen Sprite der 180px groß ist,
bei worldW=6000 aber nur 38px — obwohl der Operator "näher dran" wollte. Jeder Track braucht eigene
Multiplikatoren, und der Dev-Panel wird zur Kalibrierhölle.

**Die Lösung: Rückwärts vom gewünschten Ergebnis rechnen:**
```
cam.zoom = targetSizePx / (referenceSpriteSize × bsX)   // Closed Track
cam.zoom = targetSizePx / (referenceSpriteSize × OPEN_TRACK_BASE_ZOOM)  // Open Track
```
Der Operator definiert "Leader-Sprite soll 8% der Canvas-Höhe einnehmen" — die Camera löst den
nötigen Zoom aus dieser Zielgröße. `bsX = CANVAS_W / worldW` ist der Basis-Skalierungsfaktor
des Pixi-Containers. Da `bsX` in der Formel landet, hebt er sich mit dem worldW-Einfluss auf.

**Cross-Track-Invarianz-Beweis:**
```
screenPx = referenceSpriteSize × bsX × cam.zoom
         = referenceSpriteSize × bsX × (targetPx / (referenceSpriteSize × bsX))
         = targetPx   ← konstant, unabhängig von worldW
```
Dieselbe `spritePctOfCanvas`-Config ergibt auf jedem Track denselben Sprite-Screen-Anteil.

**Warum das nie umkehren:**
- `referenceSpriteSize` muss die Welt-Pixel-Größe NACH Density-Skalierung sein (`displaySize × displaySizeScale`)
- Die Formel ist nur korrekt wenn `bsX` den tatsächlichen Pixi-Container-Scale widerspiegelt
- Wird `bsX` durch den Camera-Zoom bereits beeinflusst (circular dependency), bricht die Invarianz
- Safety nets (min = 1.0 / overviewZoom, max = 5.0) sind Notbremsen für Edge Cases, kein Design-Target
- Der Fallback-Pfad (`referenceSpriteSize=0`) nutzt alte Multiplikatoren — nur für Tests und Legacy-Code

**Kopplung zur §10.1 Kopplung 6:**
Die absolute Pixel-Grenze `maxTargetScreenPx` bleibt als Hard-Cap. Wenn der inverse Zoom eine
zu große Darstellung berechnet, greift `Math.min(MAX_INVERSE_ZOOM, rawZoom)` und anschließend
die Pixi-seitige `maxTargetScreenPx`-Prüfung. Beide Systeme sind komplementär, nicht redundant.

### 10.3 Neue Kopplungen aus User-Klärungen

**OVERVIEW-Cooldown: Random-Jitter statt fester Takt:**
Nach jedem OVERVIEW wird der nächste Cooldown zufällig aus [overviewCooldownMin, overviewCooldownMax]
gezogen. Default 15–25s. Begründung: im Fernsehen springt man auch nicht roboterhaft alle 20 Minuten
um — leichte Zufalls-Variation wirkt menschlicher. Beide Slider auf gleichen Wert = fester Takt.
Bei 30s-Race: 1–2 OVERVIEW-Slots. Bei 144s-Race: 5–9 Slots (natürliche Streuung, kein Klackern).

**finishT + Duration-Slider Kopplung für Open-Tracks:**
Duration-Slider beeinflusst direkt finishT. speedMultiplier der Racer beeinflusst ebenfalls
die effektive Dauer. Setup-Screen sollte Estimated-Duration-Anzeige haben.

**Minimap + Camera-Regie:**
Minimap gibt dem Operator den Kontext den die Camera bewusst ignoriert (§3.1).
Diese Komplementarität macht die Regie-Philosophie "entfernte Nachzügler dürfen fallen" tragfähig.

**Renndauer-Slider als zentrale Spielleiter-Größe (nach PR-A2):**
Nach der Speed-Pipeline-Architektur-Änderung (§7.4) denkt der Spielleiter nur noch in Sekunden.
`race_baseSpeed` wird intern berechnet — px/s ist ein Implementierungsdetail, kein UX-Concept.
Konsequenz: Setup-Screen vereinfacht sich: Closed-Track = Runden + optionale Wunschdauer,
Open-Track = Dauer. Beide sehen für den Spielleiter konsistent aus.

### 10.4 N=100: Was kollabiert wenn nicht vorbereitet

| Component | N=100 Risiko | Status |
|-----------|-------------|--------|
| Camera State-Machine | O(1) — nur Spitzengruppe | Skaliert out-of-the-box |
| openTrackPanTarget (nach Fix C) | O(N log N) sort, dann top-10 | ~0.1ms, akzeptabel |
| drawNameTag (nach Iter 1) | 10 Tags gezeichnet | OK |
| Minimap-Dots | 100 Dots sehr klein | Akzeptabel |
| Avoidance-Kräfte | O(N²) → 10000 Checks | **D7d Prerequisite** |
| Canvas-Render | 100 Sprites pro Frame | Profiling nötig (D7d) |

Camera-Logik skaliert. Performance-Bottleneck ist Avoidance (D7d, BACKLOG).

### 10.4 Empfohlene Tuning-Reihenfolge

1. **maxScale anheben** (Q-25) — behebt hektische Open-Tracks, unabhängig von Camera
2. **Bug B fixen** (Zoom-Inversion) — dann State-Zooms erstmals testbar
3. **Bug A fixen** (OVERVIEW-Pan) — Camera folgt endlich Racern
4. **Bug C fixen** (Focus-Group Pan) — Spitzenkampf-Camera korrekt
5. **minTargetScreenPx als Camera-Constraint** — erst wenn Camera-Zooms korrekt
6. **Tag-Visibility Iter 1** — auf korrekter Camera aufsetzen
7. **Dev-Panel-Integration** — alles tunable
8. **HUD + Fullscreen + Cancel Race** — UI-Verbesserungen

---

## 11. RaceScreen-Refactor (Q-7) und Test-Infrastruktur (Q-18)

### 11.1 Aktuelle Camera-Logik-Verteilung

```
RaceScreen/index.jsx (1032 LOC, 0 Unit-Tests)
  ├─ Camera-Init (lines 210–219): CameraDirector-Konstruktion + bbox-Skalierung
  ├─ Camera-Update (lines 819–848): openTrack vs. closedTrack — Bug C hier
  ├─ drawRacers (lines 387–407)
  └─ drawNameTag (lines 366–385)

modules/camera/ (extrahiert, testbar)
  ├─ CameraDirector.js — Bugs A+B
  ├─ openTrackCamera.js — openTrackPanTarget (Bug C Aufruf-Seite)
  ├─ Minimap.js
  └─ lapUtils.js — openTrackFinishT (bisher ungenutzt in RaceScreen)
```

### 11.2 Extraktion-Plan

- `computeRaceCameraTransform(st, camDirRef, bsX, bsY, worldWidth, worldHeight, isOpenTrack)`
  → `modules/camera/raceCamera.js`
- `drawNameTag` → `modules/camera/nameTagRenderer.js` (testbar ohne Canvas-Context-Vollaufsatz)
- Camera-Initialisierungs-Logik (bbox-Skalierung) → Hilfsfunktion in `raceCamera.js`

Bug C (3 Zeilen in RaceScreen) wird in PR-B behoben bevor PR-C (Refactor) beginnt.
PR-C ist dann 100% behavior-preserving.

### 11.3 Test-Strategie

**Mock-rAF-Pattern:**
```js
let rafCallback = null;
vi.stubGlobal('requestAnimationFrame', (cb) => { rafCallback = cb; return 1; });
rafCallback(timestamp); // Frame simulieren
```

**Testbar ohne Browser:**
- `computeRaceCameraTransform` mit mock-Racer-Positionen → Pan/Zoom-Output korrekt?
- `drawNameTag` mit mock-CanvasRenderingContext2D → Text/Rect-Calls korrekt?
- Camera-State-Transitions unter simulierten Rennphasen

**Neue Tunables (§8) brauchen:** Config-Persistenz-Tests, Live-Apply-Tests.

---

## 12. Implementation-Aufteilung

### 12.1 Reihenfolge-Entscheidung

Bug-Fixes (PR-B) kommen VOR dem Refactor (PR-C).

Begründung: Bug A+B sind in `modules/camera/` — unabhängig von RaceScreen, sofort fixbar.
Bug C ist eine 3-Zeilen-Änderung in RaceScreen — kein Grund auf Refactor zu warten.
PR-C (Refactor) danach ist 100% behavior-preserving von Anfang an. Kein "Refactor eines buggy State".

### 12.2 Sub-PR-Plan (9 PRs: PR-A aufgeteilt in A1 + A2-Diagnose + A2)

```
PR-A1: Q-25-Fix + Duration-Slider + finishT (bestehende Pipeline)
  - DEFAULT_SPEED_SCALE_CONFIG.maxScale: 4.0 → 10.0 (defaults.js:112)
  - finishT: openTrackFinishT(duration, ...) clamped by runoutZone (lapUtils.js)
  - Duration-Slider im Setup-Screen für Open-Tracks (Min/Max aus Strecken-Physik)
  - Estimated-Duration-Anzeige im Setup-Screen
  - +Tests: speedScale neue maxScale-Grenze, openTrackFinishT-Integration
  - Macht Space Sprint sofort spielbar (~131 px/s, ~144s)

PR-A2-Diagnose: Speed-Pipeline Lese-PR (kein Code-Change)
  - Analog TLH-Konzept-Sprint-Pattern: Diagnose vor Implementation
  - CC liest alle relevanten Speed-Pipeline-Files vollständig
  - Output: docs/SPEED_REFACTOR_ANALYSIS.md
    - Welche Files betroffen (Ziel: < 30)
    - Welche Tests touchiert
    - Welche Pattern-Brüche entstehen
    - Geschätzter Scope
  - PR-Body: "Diagnose vor PR-A2-Implementation, kein Code-Change"
  - User + Strategie-Review der Diagnose vor PR-A2-Start
  - Falls Scope groß (> 30 Files / Test-Architektur-Umbau): zusätzlicher Konzept-Sprint

PR-A2: Speed-Pipeline-Architektur-Umbau (§7.4, startet erst nach Diagnose-Review)
  - computeRaceBaseSpeed(pathLengthPx, renndauer, speedMultiplier_distribution) neue Funktion
  - race_baseSpeed wird race-spezifisch bei Race-Init berechnet
  - speedScaleFactor entfällt als eigenständige Größe (in computeRaceBaseSpeed integriert)
  - Closed-Tracks: optionale Wunschdauer zusätzlich zur Rundenzahl
  - +Tests: alle bestehenden Speed-Tests anpassen (D9/D10/D11 Basis nicht brechen)

PR-B: Camera-Bug-Fixes (Bug A + Bug B + Bug C)
  - Bug A: targetZoom = overviewZoom statt 1 im OVERVIEW-State (CameraDirector.js:178-183)
  - Bug B: Open-Track-Zoom-Kalibrierung — isOpenTrack-Modus in CameraDirector
  - Bug C: openTrackPanTarget auf Spitzengruppe (RaceScreen/index.jsx:838-845, 3 Zeilen)
  - +Tests: CameraDirector Bug-Szenarien (Pan-Offset non-zero, Open-Track-Zoom-Richtung)

PR-C: RaceScreen-Split (reines Refactor, kein Behavior-Change)
  - computeRaceCameraTransform → modules/camera/raceCamera.js
  - drawNameTag → modules/camera/nameTagRenderer.js
  - Camera-Init → Hilfsfunktion
  - +Tests: neue reine Funktionen
  - Prerequisite: PR-B gemergt

PR-D: Camera-State-Machine (neue Logik)
  - LEADER_ZOOM als Default-Modus (Default-Tendenz, §3.2)
  - OVERVIEW-Cooldown-Logik (Random-Jitter aus [overviewCooldownMin, overviewCooldownMax], Dauer overviewDuration, soft-Trigger über Spannungs-Stärke)
  - Start-Pulk + Endspurt + Finish-Event-Trigger
  - findBattleCandidate() für engstes Duell in Spitzengruppe (§5.3)
  - Hysterese-Schwellen (BATTLE: eintritt 0.05, austritt 0.07 auf minGapInSpitzengruppe)
  - COMEBACK_ZOOM: Last-place-Drama-Trigger (gapLeadLast>0.3 && firstHalfClear)
  - +Tests: State-Transitions unter simulierten Rennphasen

PR-E: Sprite-Korridor + Tag-Visibility Iter 1 (B-UX1)
  - Sprite-Korridor: minTargetScreenPx UND maxTargetScreenPx als Camera-Zoom-Limits (§6.2)
  - getEffectiveMaxTargetScreenPx() analog zu getEffectiveMinTargetScreenPx() (per-Type-Override)
  - Beide als Dev-Panel-Sliders — nicht aufschieben in spätere PR
  - Q-13 strukturell gelöst durch maxTargetScreenPx
  - Tag-Visibility: Top-N nach tagVisibleCount (Default = spitzengruppe)
  - tagVisibleCount als Dev-Panel-Tunable
  - +Tests: computeRenderDisplayScale mit Korridor-Limits, drawNameTag mit Visibility-Flag

PR-F: Dev-Panel Camera-Tunables + HUD-Overlay
  - Neue "Camera"-Sektion (§8.1 vollständige Liste)
  - Neue "Name Tags"-Sektion (§8.1)
  - Neue "HUD Overlay"-Sektion (§8.1)
  - Fullscreen-HUD-Overlays (CSS + opacity-Tunable)
  - Live-Apply auf CameraDirector-Instanz
  - +Tests: Config-Persistenz, Live-Apply

PR-G: UI-Bugs
  - Cancel Race: Button-Label + Confirm-Dialog (§9.1)
  - Fullscreen API: canvasRef statt screenRef (§9.2)
  - +Tests: toggleFullscreen mock, Cancel-Dialog-Logik
```

**MANUAL_FOCUS:** Nicht in dieser Phase — eigenes BACKLOG-Item.

### 12.3 Alternative Reihenfolgen

**Alternative — Q-25 und Bugs zusammen (PR-A+B kombiniert):**
Vorteil: eine PR etabliert korrekte Basis. Nachteil: größere PR, schwieriger zu reverten.

---

## 13. Risiken und offene Fragen

### 13.1 Architektur-Risiken

**R1 — Open-Track-Camera-Refactor Scope-Creep:**
Bug B Fix erfordert separaten Kalibrier-Pfad für Open-Track-Camera.
Mitigation: CameraDirector erhält `isOpenTrack`-Flag + `openTrackBaseZoom`-Parameter —
kein eigener OpenTrackCameraDirector nötig, Parameter-Konfiguration statt Subklasse.

**R2 — RaceScreen rAF-Loop Testbarkeit:**
Extraktion nur von Funktionen ohne rAF-Loop-State (`drawNameTag`, `computeRaceCameraTransform`).
Beide haben keine State-Closures die den rAF-Loop referenzieren — sicher extrahierbar.

**R3 — OVERVIEW-Cooldown + BATTLE_ZOOM-Konflikt:**
Wenn BATTLE_ZOOM aktiv und OVERVIEW-Cooldown abläuft: BATTLE_ZOOM hat höhere Spannungs-Stärke
(enges Duell in Spitzengruppe > periodischer Kontext-Check). OVERVIEW wird zurückgestellt —
Cooldown-Timer wartet bis BATTLE_ZOOM endet. Nach BATTLE_ZOOM-Ende wird ein neuer Cooldown
zufällig aus [overviewCooldownMin, overviewCooldownMax] gezogen. Korrekt nach Tendenz-Logik (§3.2).

**R4 — finishT + Duration-Slider Kopplung:**
`openTrackFinishT` berechnet finishT bei Race-Init. Wenn Spielleiter während Race speedMultiplier
ändert (Dev-Panel), ändert sich finishT nicht retroaktiv. Das ist korrekt und akzeptabel.

**R5 — N=100 + Camera Performance:**
OVERVIEW-Pan mit Centroid aller N Racer: O(N) pro Frame. Bei N=100: ~0.01ms — akzeptabel.
Avoidance-Kräfte (O(N²)) sind das eigentliche Performance-Problem — D7d zuständig.

**R6 — Sprite-Korridor schlecht kalibriert:**
Wenn `maxTargetScreenPx` zu klein: alle Camera-States zoomen ähnlich nah → kein visueller Unterschied
zwischen BATTLE_ZOOM und OVERVIEW. Wenn `maxTargetScreenPx` zu groß: Q-13-Bereich erreichbar.
Default 128px (4× min=32) ist Ausgangspunkt — muss mit Browser-Tests nach PR-E kalibriert werden
bevor als stabiler Default festgelegt. Bei kleinen Racer-Types (kleines displaySize) muss max
entsprechend angepasst werden.

**R7 — Speed-Pipeline-Refactor (PR-A2) Scope-Unsicherheit:**
Speed-Pipeline (baseSpeed, speedMultiplier, speedScaleFactor) ist in vielen Stellen referenziert.
D9/D10/D11/D7a/D7b/D7c bauen auf aktueller Pipeline. PR-A2 muss alle Tests anpassen.
**Mitigation: PR-A2-Diagnose-PR** (Lese-PR vor Implementation) — CC analysiert Scope vollständig,
schreibt `docs/SPEED_REFACTOR_ANALYSIS.md`, User reviewed vor PR-A2-Start. Scope-Risiko damit
strukturell adressiert. Weiteres Mitigation: `computeRaceBaseSpeed` als isolierte Funktion.

**R8 — PRE_RACE-Phase Tag-Dichte bei N=100:**
100 Tags gleichzeitig in PRE_RACE. Bei kleinem Canvas könnten Tags komplett überlappen.
Mitigation: Tag-Größe in PRE_RACE 0.8× der RACING-Größe. Falls noch zu dicht:
Tags in PRE_RACE ebenfalls limitieren (nur Name-Tags der ersten 20 Racer), aber das
konterkariert den "Spieler findet sich"-Use-Case. Erst im Browser-Test bewerten.

### 13.2 Geklärte Konzept-Fragen (alle beantwortet 2026-05-02/03)

| # | Frage | Entscheidung |
|---|-------|--------------|
| UI-1 | OVERVIEW-Camera-Verhalten | LEADER_ZOOM als Default; OVERVIEW-Cooldown [15s, 25s] Random-Jitter |
| UI-2+UI-3 | Renndauer + finishT für Open-Tracks | Duration-Slider + maxScale=10 + finishT dynamisch aus openTrackFinishT |
| UI-4 | Setup-Button während Race | "Cancel Race" + Confirm-Dialog; Pause+Resume als separates BACKLOG-Item |
| UI-5 | Fullscreen HUD | Echtes Browser-Fullscreen via API; HUD als halbtransparente Overlays; hudMaxStandings viewport-aware |
| UI-6 | Name-Tags | Iter 1 (Top-N, PR-E) + Iter 2 state-abhängig als B-UX1-Iter2 im BACKLOG |
| UI-7 | OVERVIEW-Cooldown-Rhythmus | Random-Jitter [overviewCooldownMin=15s, overviewCooldownMax=25s] — TV-Regie-Analogie |
| UI-8 | PR-A2 Speed-Refactor Scope-Risiko | Diagnose-Lese-PR (PR-A2-Diagnose) vor Implementation — analog TLH-Pattern |

### 13.3 Annahmen

- **A1:** speedMultiplier der Racer-Types ~1.0. Messen vor PR-A (beeinflusst Renndauer-Schätzung).
- **A2:** maxScale=10.0 → ~131 px/s für Space Sprint. Im Browser-Test nach PR-A verifizieren.
- **A3:** Garden-Path-Ecke-Problem (P1) ist Bug A. Nicht 100% sicher ohne Browser-Run.
- ~~**A4:**~~ Canvas-Koordinatensystem begrenzt Geometrie-Länge — **empirisch widerlegt** (§7.1).

---

## Cross-References

- `client/src/modules/camera/CameraDirector.js` — State-Machine (Bugs A+B in §5)
- `client/src/modules/camera/openTrackCamera.js` — openTrackPanTarget (Bug C in §5)
- `client/src/screens/RaceScreen/index.jsx` — Camera-Integration (lines 210–219, 819–848)
- `client/src/modules/autoSpriteScale.js` — computeRenderDisplayScale (§6.2)
- `client/src/modules/speedScale.js` — computeSpeedScaleFactor
- `client/src/modules/storage/defaults.js:112` — DEFAULT_SPEED_SCALE_CONFIG.maxScale = 4.0 ← Q-25 Root Cause
- `client/src/modules/camera/lapUtils.js` — openTrackFinishT (§7.2, bisher ungenutzt in RaceScreen)
- `docs/BACKLOG.md — Hot §1` — Kamera-Phase als nächste Implementierungsphase
- `docs/BACKLOG.md — B-UX1` — Name-Tag Iter 1 hier integriert (§6.3)
- `docs/BACKLOG.md — B-UX1-Iter2` — state-abhängige Tags (§6.4)
- `docs/BACKLOG.md — Q-25` — Open-Track-Länge (hier empirisch gelöst)
- `docs/BACKLOG.md — Q-7` — RaceScreen-Split (§11)
- `docs/BACKLOG.md — Q-18` — Test-RaceScreen (§11.3)
- `docs/BACKLOG.md — D7d` — 100-Racer-Performance (Spatial-Grid, Camera Pulk-Übersicht, LOD)

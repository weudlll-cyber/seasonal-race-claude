# LESSONS.md — Erkenntnisse aus der Entwicklung

Lessons die in der Vergangenheit gelernt wurden und für künftige Phasen relevant sind.
Wird ergänzt nach jeder größeren Phase oder bei wichtigen Erkenntnissen.

---

## Lesson 1 — UI-Drift trotz grüner Tests (PR #16)

**Kontext:** D3.5.3 stellte die Code-Registry auf 12 Types um. Alle Tests passierten.
Die UI (RacerManager im Dev-Screen) las aber weiter aus der alten 5-Type-localStorage-Liste —
vollständig unbemerkt bis zum visuellen Smoke-Test.

**Erkenntnis:** Code-Tests decken nicht ab, ob UI-Komponenten ihre Daten aus der korrekten
Quelle lesen. Eine Komponente kann Daten aus einer obsoleten Quelle rendern während alle
zugehörigen Unit-Tests grün bleiben.

**Konsequenz:** Bei großen Daten-Modell-Änderungen (neuer Storage-Key, neues API, andere
Source of Truth) UI-Layer explizit mit-spezifizieren und visuell verifizieren.
CC-Smoke-Test-Convention als direkte Folge etabliert.

---

## Lesson 2 — Migration-Sweep muss alle Felder abdecken (PR #17)

**Kontext:** Track-Configs hatten `defaultRacerTypeId`, `racerTypeId`, `racerId` und `icon`
parallel — alle potenziell mit dem alten 'car'-Wert. Die ursprüngliche `migrateCarToBuggy()`
IIFE patched nur `defaultRacerTypeId`. Bei City Circuit (localStorage-Eintrag mit
`racerTypeId: 'car'`) zeigte die SetupScreen-Merge-Logik `racerTypeId: 'car'` →
`getRacerType('car')` → Fallback Horse → falsches Emoji. Bug fiel erst beim Playwright-
Smoke-Test auf, obwohl die Migration "complete" aussah.

**Erkenntnis:** Storage-Migrationen müssen alle semantisch gleichwertigen Felder abdecken,
nicht nur das offensichtlich benannte. Cosmetics (icon, emoji) die aus denselben IDs abgeleitet
werden gehören ebenfalls zum Sweep.

**Konsequenz:** Vor jeder Storage-Migration Code-Sweep über alle ID-Felder und davon
abgeleitete Cosmetics machen, nicht nur das offensichtlich benannte.

---

## Lesson 3 — Sprite-Perspektive vor Implementation prüfen (D3.5.3 Drachen)

**Kontext:** Erste Drachen-Sprite-Generation war 3/4-Front-Perspektive statt top-down
(konsistent mit allen anderen Types in der App). Diskrepanz zur App-Konvention erst beim
visuellen Vergleich entdeckt.

**Erkenntnis:** AI-generierte oder externe Sprites können stilistisch und perspektivisch
inkonsistent mit der App-Konvention sein. Das ist nicht durch Code-Tests erkennbar.

**Konsequenz:** Bei AI-generierten oder externen Sprites Stil/Perspektive visuell
verifizieren bevor implementieren. Bei Sprite-Reviews: top-down, Größe ca. 128px,
Bewegungsrichtung nach rechts, transparenter Hintergrund.

---

## Lesson 4 — Spec-Schreibstil disziplinieren

**Kontext:** Frühe Specs hatten zu viel Implementation-Detail (konkrete Variablennamen,
Schleifenstrukturen, spezifische Algorithmus-Umsetzungen). Das schränkte Claude Code
unnötig ein und führte zu suboptimalen Lösungen wo Claude Code einen besseren Ansatz
gewählt hätte.

**Erkenntnis:** Claude Code ist näher am Code-Stack und trifft bessere Entscheidungen
über interne Implementation. Strategischer Claude kennt besser Was und Warum, Claude
Code kennt besser Wie.

**Konsequenz:** Spec-Schreibstil-Convention etabliert — strategischer Claude beschreibt
Was+Warum (Anforderungen, API-Signaturen, Storage-Schemas, Test-Erwartungen). Implementation
(das Wie) überlässt strategischer Claude an Claude Code. Code-Beispiele in Specs nur wenn
Schnittstellen oder APIs definiert werden, nicht als Implementations-Vorgabe für interne
Logik.

---

## Lesson 5 — Pre-existing-vs-PR-verursacht trennen (PR #17 Quality-Gate)

**Kontext:** Quality-Gate auf PR #17 fand pre-existing tech debts: TrackEditor.jsx (1006 LOC)
und RaceScreen/index.jsx (886 LOC) — beide weit über dem 400-LOC-Threshold. Diese als
Merge-Blocker zu behandeln wäre falsch gewesen, da PR #17 diese Probleme nicht eingeführt hat.

**Erkenntnis:** Quality-Gate-Findings müssen nach Herkunft getrennt werden. Pre-existing
Probleme sind valide Tech-Debt, aber kein Grund eine unabhängige PR zu blockieren.

**Konsequenz:** Quality-Gate-Reports trennen "durch diese PR eingeführt" und "pre-existing".
Pre-existing Findings als eigene Phase getrackt (hier: Phase Q-6, Q-7). Merge-Entscheidung
basiert primär auf PR-eingeführten Findings.

---

## Lesson 6 — Schema-Wechsel: neuer Key besser als umfunktionieren (PR #17)

**Kontext:** Ursprüngliche Spec für B-7 sagte den bestehenden `racearena:racerTypes` Key
umzufunktionieren (vom Array zur Override-Map). Claude Code wählte stattdessen einen neuen
Key `racearena:racerTypeOverrides`. Das war sauberer: klare Trennung Legacy vs Neu, Migrations-
IIFE konnte den alten Key lesen und direkt konvertieren, neuer Key hat immer nur den neuen
semantischen Inhalt.

**Erkenntnis:** Wenn ein Storage-Key semantisch umfunktioniert wird (anderer Inhalt, anderes
Format), ist ein neuer Key fast immer sauberer. Der alte Key wird zum klaren Legacy-Marker
für Migration.

**Konsequenz:** Bei künftigen Storage-Schema-Änderungen neuen Key als Default, alter Key
wird Legacy. Migrations-IIFE liest alten Key, schreibt neuen Key, entfernt alten Key.

---

## Lesson 7 — Quality-Gate-Findings können falsch-positiv sein (PR #17 Cleanup)

**Kontext:** Quality-Gate-Finding "SystemSettings JSON.parse ohne try/catch" stimmte nicht —
die Inspektion des Codes zeigte, dass try/catch bereits vorhanden war (Zeile 47-54).
Der automatisierte Grep hatte nur die `JSON.parse`-Zeile gefunden, nicht die umgebende
try/catch-Struktur.

**Erkenntnis:** Quality-Gate-Reports sind Hinweise, keine absoluten Wahrheiten. Grepping
auf Pattern-Ebene kann den Kontext (umgebender try/catch-Block) übersehen.

**Konsequenz:** Findings beim Fixen immer im Kontext prüfen. Korrektur ehrlich melden
wenn Finding sich als falsch-positiv herausstellt. Das erhöht Vertrauen in zukünftige
Reports.

---

## Lesson 8 — Test-Framework-Integration braucht Exclude-Patterns (PR #19)

**Kontext:** Bei der Einführung von Playwright in PR #19 wurde das `e2e/`-Pattern nicht in
`vitest.config.js` ausgeschlossen. Vitest versuchte den Playwright-Spec zu
importieren — `npm test` schlug rot fehl, obwohl 628 Unit-Tests und 22
e2e-Tests einzeln grün waren. Erst Quality-Gate hat das aufgedeckt.

**Erkenntnis:** Vitest matcht standardmäßig alle `*.spec.*`-Dateien — inkl. Playwright-Specs
die vollkommen andere Globals (`test.describe`, `page`) erwarten. Die Fehler erscheinen
erst beim Versuch den Spec zu importieren, nicht beim Schreiben.

**Konsequenz:** Bei Integration eines neuen Test-Frameworks: explizit
`exclude`-Patterns in den anderen Test-Configs ergänzen. Beim Hinzufügen
einer neuen Test-Verzeichnis-Struktur (`e2e/`, `integration/`, etc.):
Code-Sweep über alle Test-Configs, sicherstellen dass keiner versucht den
falschen Verzeichnis-Inhalt zu laden.

---

## Lesson 9 — Konstanten-Extraktion ist nur halb-fertig wenn nicht alle Konsumenten umgestellt werden (PR #19)

**Kontext:** D9 hat Konstanten in `lapUtils.js` exportiert (`BASE_SPEED_MIN`, `BASE_SPEED_MAX`,
`REFERENCE_FPS`) damit UI-Estimates und Race-Engine dieselben Werte verwenden.
RaceScreen importierte sie aber nicht und duplizierte die Werte direkt im Code.
Numerisch identisch zum Zeitpunkt — aber wenn die Konstanten getunt würden,
wäre stilles Drift entstanden.

**Erkenntnis:** Konstanten-Extraktion in eine Shared-Datei ist erst vollständig wenn alle
Konsumenten — bestehende und neue — tatsächlich importieren. Numerische Gleichheit im
Moment der Extraktion schützt nicht vor künftigem Drift.

**Konsequenz:** Wenn Konstanten in eine Shared-Datei extrahiert werden:
Code-Sweep über alle Stellen wo der gleiche Wert vorkommt, alle Konsumenten
auf den Import umstellen. Nicht nur die "neuen" Konsumenten — auch die
bestehenden. Tests sollten die Symmetrie absichern.

---

## Lesson 11 — UX-Verifikation als zusätzliche Smoke-Test-Schicht (PR #21)

**Kontext:** D3.5.5 hatte umfangreichen UI-Impact (Edit-Modal, 6 Felder, Tooltips, Override-
Indikatoren, Validation). Neben dem normalen Smoke-Test (`d355-smoke.spec.js`, 14 Tests) wurde
eine separate UX-Verifikations-Spec (`d3-5-5-ux-verification.spec.js`, 21 Tests) erstellt.
Sie deckte Verhaltens-Aspekte ab die normale Smoke-Tests nicht prüfen: Tooltip-Inhalte,
Override-Indikator-Sichtbarkeit, Validation-Recovery, Modal-Layout-Konsistenz auf verschiedenen
Viewports, State-Isolation zwischen Modal-Aufrufen. Alle 21/21 grün.

**Erkenntnis:** Funktionale Smoke-Tests (öffnet Modal? schreibt localStorage?) decken nicht ab,
ob die UX korrekt ist: ob Badges erscheinen/verschwinden, ob Fehler-Messages nach Korrektur
weggeräumt werden, ob Buttons korrekt disabled sind. Diese Schicht braucht eigene Tests.

**Konsequenz:** Bei UI-schweren Phasen separate UX-Verifikations-Spec erwägen
(`*-ux-verification.spec.js`). Spec wird permanent behalten als Regressions-Schutz.
Convention-Erweiterung der CC-Smoke-Test-Convention (→ PROJECT-PRINCIPLES.md).

---

## Lesson 12 — CI-Wartezeit beim Auto-Merge-Workflow (PR #21)

**Kontext:** Beim Merge von PR #21 zeigte `gh pr merge` zunächst Fehler
`Pull Request is not mergeable (mergePullRequest)`. Status via `gh pr view` war
`mergeStateStatus: UNSTABLE` weil GitHub Actions CI-Run für den letzten Commit noch
nicht abgeschlossen war. Korrektur: `gh run watch` für Wartezeit, dann erneuter
`gh pr merge` — erfolgreich.

**Erkenntnis:** GitHub betrachtet eine PR als "not mergeable" wenn CI noch pending ist,
auch wenn kein Branch-Protection-Requirement auf grünen CI besteht. `UNSTABLE` ≠ `BLOCKED`.
Kurzes Warten auf CI-Completion löst das Problem.

**Konsequenz:** Auto-Merge-Prompts sollten `gh pr checks` oder kurze CI-Wartezeit einplanen.
Workflow: nach Push warten bis CI grün, dann `gh pr merge`. Bei `UNSTABLE`:
`gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')`.

---

## Lesson 13 — Pre-Sets können einen echten Bug verschleiern (D10)

**Kontext:** Bei D10 (Track-Größen-Variabilität) wurden zunächst Pre-Set-Buttons
(HD/FHD/QHD/4K) für `worldWidth` und `worldHeight` implementiert. Das funktionierte
technisch, aber der User-Einwand "warum sollte ich überhaupt ein Format wählen?" deckte
auf: tatsächliche Bild-Dimensionen (1168×784, 1536×1024) passten niemals zu Pre-Set-Werten
— der Code arbeitete also mit fundamental falschen worldWidth/Height-Werten gegenüber den
echten Bildern.

Erst beim Bild-First-Workflow-Fix wurde sichtbar dass Dimensionen eine Eigenschaft des
Bildes sind, nicht eine Setting des Tracks.

**Erkenntnis:** Wenn UI vom User Werte verlangt die aus einem Asset abgeleitet werden
könnten (Bild-Dimensionen, File-Größen, etc.), lieber automatisch ableiten statt
User-Wahl. User hat sonst keine sinnvolle Wahl-Basis und wählt vermutlich falsch.

**Konsequenz:** Bei UI-Designs die Werte erfragen die aus vorhandenen Assets ableitbar
sind: automatisch ableiten. Pre-Sets die "ungefähr passen" verschleiern den eigentlichen
Bug (falsche Werte) und geben dem User eine sinnlose Wahl.

---

## Lesson 14 — User-Bauchgefühl wertvoller als Spec-Antizipation (D10 Post-Test)

**Kontext:** Strategischer Claude hatte in der D10-Spec Pre-Set-Buttons als pragmatische
Lösung vorgesehen, ohne zu hinterfragen ob die Werte zu echten Bildern passen. Erst der
User-Einwand "warum überhaupt ein Format auswählen" hat das Design-Problem aufgedeckt
(→ Lesson 13).

Ähnlich bei B-16/B-17: User-Test mit großem Track hat zwei kritische Probleme aufgedeckt
(Camera bleibt still, Race-Speed wirkt zu schnell) die in der D10-Spec nicht antizipiert
wurden. Track-Größen-Änderungen haben Auswirkungen auf Camera-Heuristiken und
Speed-Empfindung die nur durch praktischen Test sichtbar werden.

**Erkenntnis:** Bei UX-Designs immer aus User-Sicht hinterfragen, auch wenn die
Implementation funktional korrekt ist. User-Browser-Tests sind eine eigene Verifikations-
Schicht die systematische Tests nicht ersetzen können: sie decken Probleme auf die in
Specs übersehen wurden, weil Specs logisch denken, User aber intuitiv reagieren.

**Konsequenz:** Nach jeder größeren Phase User-Browser-Test einplanen, nicht nur
automatisierte Tests als Verifikation zählen. Wenn User-Einwand "warum X?" kommt:
zuerst fragen ob X überhaupt nötig ist statt X zu rechtfertigen.

---

## Lesson 15 — E2E-Selector-Drift: Tests veralten wenn UI-Text sich ändert (PR #27)

**Kontext:** Nach B-Wave (PR #25) wurden in b-wave-smoke und b1617-smoke 7 pre-existing
Selector-Fehler entdeckt: Ein Label hatte sich von Deutsch auf Englisch geändert, ein
`getByRole` traf einen anderen DOM-Knoten, ein Text-Match war nicht lang genug angebunden.
Diese Tests waren beim Schreiben korrekt — aber jede UI-String-Änderung macht Text-basierte
Selektoren fragil.

**Erkenntnis:** Playwright-Tests mit hartem Text-Match (`getByText('Geometrie wählen')`,
`getByRole('option', { name: 'City Circuit' })`) veralten leise wenn UI-Text in einer
anderen PR geändert wird. Die Tests schlagen erst im nächsten CI-Run fehl, nicht beim
Schreiben der UI-Änderung.

**Konsequenz:** Bei UI-String-Änderungen (Deutsch → Englisch, Label-Umbenennungen): Code-Sweep
über alle e2e-Specs nach betroffenen Selektoren. Robustere Selektoren bevorzugen: `data-testid`,
ARIA-Rollen mit partiellem Match (`{ name: /City/ }`), oder `.first()` bei unvermeidlicher
Ambiguität.

---

## Lesson 16 — Rückgabe-Lücke in Storage-Layer maskiert Feature-Bug (fix/list-tracks)

**Kontext:** `listTracks()` in `trackStorage.js` gab `worldWidth` und `worldHeight` nicht zurück.
Das war seit D10 ein Bug, aber für alle bestehenden Tracks (1280×720) war die Konsequenz
unsichtbar: bsX=1.0 war korrekt für 1280px. Erst beim Test mit einem echten 6000px-Track
wurde sichtbar dass nur ~549px der World gerendert wurden.

**Erkenntnis:** Storage-Layer-Lücken (fehlende Felder im Return-Objekt) können durch Default-
Fallbacks (`?? 1280`) im Consumer vollständig versteckt werden solange der Default-Wert dem
realen Wert entspricht. Eine neue Feature-Klasse (große Tracks) hebelt den Default aus und
macht den Bug erst sichtbar.

**Konsequenz:** Nach Storage-Schema-Erweiterungen (neues Feld) alle Read-Paths explizit
testen, nicht nur Write-Paths. Unit-Test für `listTracks()` sollte alle Felder aus dem
gespeicherten Objekt im Return-Objekt verifizieren — nicht nur die offensichtlichen
(id, name, icon).

---

## Lesson 17 — Browser-Test als Ground-Truth, auch wenn Unit + E2E grün sind (D11)

**Kontext:** Vor dem Merge von PR #30 waren 809 Unit-Tests und 183 e2e-Tests grün.
Browser-Test durch User fand dennoch 4 visuelle Bugs: (1) schwarze Ränder auf kleinen
Tracks bei hohem Zoom (Camera world-edge clamp fehlte), (2) Sprite minScale 0.4 zu klein
(Racers wurden fast unsichtbar), (3) symmetrische Avoidance-Kräfte cancelten sich in
gleichmäßig verteilten Packs (mittlere Racer bewegten sich nicht), (4) Auto-Sprite-Scale
auf Open-Tracks ignorierte Camera-Zoom → falsche Sprite-Größe.

**Erkenntnis:** Unit- und E2E-Tests prüfen, was der Code berechnet — nicht, was der
Nutzer sieht. Es gibt mindestens 4 Test-Lücken die systemisch immer wieder visuelle
Bugs durchlassen:

1. **Visual-Outcome-Tests** fehlen: kein Test prüft "sieht der Racer im Canvas
   sichtbar aus", "gibt es schwarze Ränder"
2. **Boundary-Geometry-Tests** fehlen: Tests mit kleinen Tracks, extremen Racer-Counts,
   hohen Zoom-Levels
3. **Realistic-Configuration-Tests** fehlen: echte Track-Racer-Kombos (6000px Track,
   20+ Racers) als Test-Input statt Unit-Minimal-Values
4. **Effect-Verification** fehlt: Tests prüfen ob Avoidance-Code läuft — nicht ob
   Racers sich tatsächlich merkbar bewegen

**Konsequenz:** Bei jedem Feature mit visuellem Output: nach automatisierten Tests
Browser-Test einplanen. Grüne Tests sind notwendig aber nicht hinreichend für visuell
korrekte Ergebnisse. Bei Rendering, Kamera, Skalierung: explizit Boundary-Configs
und Realistic-Configs als Test-Input verwenden.

---

## Lesson 18 — Accumulated Complexity erkennen und Stop-and-Refactor entscheiden (D11)

**Kontext:** Nach D11 waren 4 multiplikative Skalierungsfaktoren aktiv:
`speedScale` (Track-Länge), `displaySizeScale` (lane-basiert + pixelFloor),
`cameraZoomFactor` (Closed-Track-Invariante oder Open-Track-Formel),
`behaviorSpeedFactor` (Drafting-Boost). Jeder Faktor wurde korrekt und isoliert
eingeführt, aber ihr Zusammenspiel ist durch Browser-Tests als visuell opak identifiziert
worden. Das Tuning von einem Faktor hat unerwartete Wechselwirkungen auf andere.

Das Ergebnis (D11 + Visual-Fixes) wurde trotzdem gemergt — als "funktional gut genug"
für den aktuellen Use-Case — statt weiter zu tunen. Gleichzeitig wurde D7 als nächste
Phase priorisiert mit dem expliziten Auftrag: Vision-Diskussion zuerst, dann
strukturiertes Refactor der Skalierungs-Pipeline.

**Erkenntnis:** Wenn mehrere Features unabhängig korrekt entwickelt werden aber ihre
Kombinationen schwer vorhersagbar werden, ist "noch ein Feature drauf" oft der falsche
Weg. Das Muster: Bugs tauchen verstärkt in Kombinations-Szenarien auf, Fixes für A
brechen B. Das ist das Signal für Accumulated Complexity — die Architektur hat die
Feature-Dichte überholt.

Die richtige Reaktion: Merge was funktioniert, dann Stop-and-Refactor als eigene Phase
planen (D7). Nicht: weiteres Tuning auf fragiler Basis.

**Konsequenz:** Wenn Feature-Korrekturen zunehmend in Kombinations-Szenarien auftreten
statt isoliert: Architektur-Review priorisieren. Merge "funktional gut genug" ist eine
valide Entscheidung wenn ein strukturierter Follow-up-Plan existiert. Vision-Diskussion
vor Code schreiben: klärt was "gut" heißt bevor die Implementierung festlegt wie.

---

## Lesson 19 — Browser-Test-driven Architecture-Correction (D7a)

**Kontext:** D7a wurde mit Math-Korrektheit als primärem Ziel implementiert: Sprites
sollten konstante Bildschirm-Größe über alle Camera-Zoom-States behalten (`cameraZoomFactor`
× `effZoom = REFERENCE_CAMERA_ZOOM`). 819 Unit + 183 e2e Tests bestätigten korrekte
Implementation.

**Aber:** User-Browser-Test zeigte dass die Sprites sich "falsch anfühlen". Auf Open-Track
wirkten Sprites bei Zoom-IN kleiner statt größer: das Sprite-Track-Verhältnis verkleinerte
sich von 27% (OVERVIEW) auf 17% (LEADER) während die Track-Hintergründe mit dem Zoom wuchsen.

Statt weiter zu tunen: Diagnose-Auftrag an Claude Code. Ergebnis: Math war korrekt (Sprites
objektiv 56.8px in allen States), aber das Verhältnis Sprite/Track-Hintergrund änderte sich
wahrnehmbar. Drei Optionen wurden präsentiert (Konstant, Proportional, Proportional+Floor).

User entschied für Option 3: natürliches "näher = größer"-Verhalten mit Mindest-Sichtbarkeit
als Sicherheits-Floor. Korrektur in derselben PR:
- `cameraZoomFactor` + `REFERENCE_CAMERA_ZOOM` komplett entfernt
- `computeRenderDisplayScale` als Single-Source der Render-Pipeline
- `autoSpriteScale.js` massiv vereinfacht (19 obsolete Tests entfernt, 10 neue hinzugefügt)

**Wichtige Erkenntnis:** Die User-driven Korrektur machte die Architektur **einfacher**,
nicht komplexer. Browser-Test entdeckte UX-Problem → Diagnose verstand die Math → User-
Entscheidung produzierte saubere Architektur. 4 Skalierungs-Faktoren → 1 Pipeline.

**Pattern für künftige Visual-Phasen:**
1. Implementation mit Math-Korrektheit
2. Browser-Test mit ehrlicher User-Wahrnehmung
3. Bei Problemen: Diagnose-Auftrag (nicht raten, nicht tunen)
4. Optionen mit Trade-offs präsentieren
5. User-Entscheidung treibt Architektur
6. Korrektur in derselben PR möglich und bevorzugt

---

## Lesson 20 — N-Force-Accumulation braucht N-Scaling by Design, nicht nach Browser-Test (D7b B3)

**Kontext:** Die D7b-Avoidance akkumulierte Lateral-Forces linear über alle `neighborCount`
Nachbarn — ein Racer mit N=10 Nachbarn erhielt 10× die Per-Pair-Force. Das war als
"Force-Stacking bei 20+ Racers" im D11-Backlog bekannt und explizit deferred.

Browser-Test nach D7b B1+B2 zeigte sofort: alle 20 Racer clusterten an den Boundaries in
zwei Gruppen. Home-Force (~0.04/Frame) wurde von akkumulierter Avoidance (~0.4/Frame von 10
Paaren) overwhelmt. Diagnose war korrekt — aber die Behebung kostete einen zusätzlichen
Commit-Sprint obwohl das Problem beim D11-Befund vorhersehbar war.

**Erkenntnis:** Jedes Force-System wo ein Entity Beiträge von N Nachbarn sammelt muss
N-Scaling from the start berücksichtigen. `sqrt(N)` als Normalisierung ist 4 Zeilen Code
— aber sie müssen bei System-Design stehen, nicht nach dem ersten Scale-Test.

Backlog-Eintrag "defer pending browser-test" für bekannte Force-Balance-Issues ist eine
Hochrisiko-Entscheidung: bei 2-Racer-Tests ist das Problem unsichtbar, bei N=20 sofort
sichtbar. Das ist das Muster.

**Konsequenz:** Bei Force/Physics-Systemen: explizit fragen "was passiert bei N=20 Entities
die alle auf dasselbe Ziel einwirken?" bevor Feature shipped. N-Scaling (÷sqrt(N) oder
÷N) als Default-Kandidat, nicht als spätere Optimierung.

---

## Lesson 21 — Metadata-Werte sind keine Messung — Skalen-Berechnung braucht echte Geometrie (D7c-fix)

**Kontext:** D7c nutzte `trackWidth` (Operator-deklarierte Metadata, Default 140 px) als
Eingabe für `computeRowLayout`. Das ergab `racersPerRow = floor(140 / 80) = 1` auf allen
Tracks — korrekt für 1280px-Referenz-Welten, aber fatal auf großen Welten (z.B. 6000px):
dort entsprachen 140 Metadata-Pixel nur ~30 Screen-Pixel, und alle 20 Racer wurden in
Einzelreihen platziert → eine einzelne vertikale Linie beim Race-Start.

Die Metadata war nie eine Messung. Sie war eine UI-Wahl aus `[100, 140, 200, 280, 360]`
und kalibriert für 1280px-Welten. Auf anderen Weltgrößen war sie bedeutungslos.

**Erkenntnis:** Wenn ein Wert für eine Skalen-Berechnung verwendet wird, muss er die
richtige physikalische Einheit in Bezug auf die aktuelle Welt haben. Operator-deklarierte
Metadata (die für eine Referenz-Welt sinnvoll war) ist keine Messung — sie bricht silently
in anderen Skalierungsbereichen. Die echte Track-Breite liegt nur in der Geometrie (Abstand
inner/outer Kurve in World-Koordinaten).

**Konsequenz:** Bei Layout- oder Skalen-Berechnungen die von Track-Geometrie abhängen:
immer `EditorShape.getActualTrackWidth()` (oder Äquivalent) statt Metadata verwenden.
Metadata-Felder sind für UI-Anzeige und User-Kommunikation — nicht als Messgröße in Berechnungen.

**Eskalation (D7c-fix-v2):** Das `trackWidth`-Feld wurde komplett aus dem Track-Datenmodell entfernt, nachdem sich auch nach der ersten Fix-Iteration herausstellte, dass die Formel noch auf einem falschen Einheitenkonzept basierte (Screen-Pixel statt World-Pixel). Wenn ein Metadata-Feld in Berechnungen nicht sinnvoll einsetzbar ist, ist das richtige Vorgehen seine vollständige Entfernung — nicht Umwege über Korrekturfaktoren.

---

## Lesson 22 — floor() ist sensitiv gegenüber Floating-Point-Fehlern nahe Ganzzahlen (D7c-fix-v3)

**Kontext:** Nach D7c-fix-v2 zeigte der Browser-Test `racersPerRow=11` statt erwarteter 12.
Diagnose über Diagnostic-Snapshot-Tool: `getActualTrackWidth()` lieferte `299.9999999999994`
statt `300` — catmullRom-Hermite-Interpolation über 500 Sample-Punkte akkumuliert ~6×10⁻¹³
Rundungsfehler. Mit `spriteSize = 50` (Rocket-Override deaktiviert Auto-Scale) ergibt das
`floor(2×299.9999.../50) = floor(11.9999...) = 11` statt 12.

**Erkenntnis:** `Math.floor()` ist nicht tolerant gegenüber floating-point Underflow.
Ein Wert der konzeptuell exakt 12.0 ist, aber durch Akkumulation winziger Fehler als
11.9999...998 repräsentiert wird, gibt floor=11 — eine Reihe zu viel, 9 Racer falsch platziert.
Das ist besonders gefährlich wenn: (1) der Eingangs-Wert durch mehrere fp-Operationen berechnet
wird, und (2) das Ergebnis diskret ist (ganzzahlige Reihenanzahl).

**Konsequenz:** Werte die konzeptuell ganzzahlig sind (Track-Breiten in World-Pixeln, die der
Editor in ganzen Zahlen setzt) vor dem Eingang in `floor()`-Berechnungen durch `Math.round()`
normalisieren. `Math.round()` absorbiert den Fehler; `Math.floor()` verstärkt ihn.
Fix: `getActualTrackWidth()` rundet den Median-Wert per `Math.round()` bevor er gecacht wird.

---

## Lesson 23 — Open-Track-Layout parallel zu Closed-Track denken, nicht als Sonderfall (D7c-Phase4)

**Kontext:** D7c implementierte Row-Start mit negativem t für hintere Reihen. Closed tracks:
korrekt — `tPos(t)` wraps negatives t hinter die Startlinie. Open tracks: `_idx(t)` klemmt
auf idx=0 → alle Reihen stehen am selben Punkt. Statt eigener Lösung für Open-Track wurde
der Closed-Track-Ansatz kommentarlos als "für Open Tracks kein Problem" übernommen.

**Erkenntnis:** Open-Track-Strecken haben eine andere Topologie als Closed-Track-Strecken:
kein Wrap-Around, Anfang und Ende sind echte Grenzen. Ein Mechanismus der bei Closed
Tracks funktioniert (negativer t) bricht bei Open Tracks auf eine Weise die visuell wie
"kein Problem" aussieht (alle Reihen am Startpunkt) aber tatsächlich die Row-Logik
vollständig außer Kraft setzt.

**Konsequenz:** Für jeden neuen Mechanismus der t-Werte manipuliert: explizit prüfen ob
das Verhalten für Open und Closed Tracks separat korrekt ist. Nicht von einem Tracktyp
auf den anderen schließen — die Topologien sind grundlegend verschieden.

---

## Lesson 11 — Container-First: Skeleton vor Logik (Phase L / PR #43)

**Kontext:** Statt den Backend-Server erst in Phase 5 als vollständiges System aufzubauen,
wurde in Phase L zunächst nur das Container-Skeleton etabliert (Express + Dockerfile +
docker-compose, ein einziger Health-Check-Endpunkt). Keine Datenbank, keine Authentifizierung,
keine Geschäftslogik.

**Erkenntnis:** Container-Integrationsthemen (Port-Konflikte, Build-Kontext, Volume-Mounts,
CORS-Config) treten immer beim ersten Aufsetzen auf, unabhängig davon wie viel Logik im
Container läuft. Diese Probleme früh zu lösen — wenn der Code noch trivial ist — kostet
wenig. Wenn sie erst bei Phase 5 (mit Datenbank, Auth, Socket.IO) auftreten, blockieren
sie das gesamte Feature-Delivery.

**Konsequenz:** Für jeden neuen Infra-Layer (Backend, Worker, Queue) zuerst das
Container-Skeleton etablieren und einen Smoke-Endpunkt deployen, bevor echte Logik
hinzukommt. Dadurch kann die CI-Pipeline und das lokale Setup vertraut werden mit der
Infrastruktur, bevor der Komplexitätssockel steigt.

---

## Lesson 10 — File-Header-Convention auch für Test-Infrastruktur (PR #19)

**Kontext:** `playwright.config.js` und `e2e/d9-smoke.spec.js` wurden zunächst ohne den
Standard-Projekt-File-Header geschrieben. Test-Infrastruktur ist auch Repo-Code
und sollte denselben Konventionen folgen wie Source-Files.

**Erkenntnis:** Der Reflex "das ist nur eine Config / ein Test" führt dazu dass neue
Infrastruktur-Files die im Rest des Repos etablierten Konventionen nicht erben. Das
fällt erst beim Quality-Gate auf, nicht beim Schreiben.

**Konsequenz:** Bei Erstellung neuer Files (egal ob Source, Config, oder Test):
Standard-Header anwenden. Quality-Gate-Check für File-Headers gilt für alle
`.js`/`.jsx`/`.config.*` Files, nicht nur Source.

---

## Lesson 12 — Server-Daten mit Code-Defaults über gemeinsame ID-Deduplication mergen (L.2–L.4)

**Kontext:** Phase L führte Server-Tracks (Weltall) ein, aber dieselbe Track-ID existierte
noch in localStorage aus der Zeit bevor sie "auf den Server gewandert" ist. Die kombinierte
Track-Liste (Frontend) müsste Weltall aus localStorage UND vom Server zeigen, was zu doppelten
Einträgen führt.

**Erkenntnis:** Wenn Daten von einer Quelle (localStorage) zu einer anderen (Server) migrieren,
bleibt die alte Kopie in der Quell-Quelle — bis eine explizite localStorage-Migration die
Daten bereinigt. Die sauberste Lösung in der Zwischenzeit: Server-Track-IDs als autoritative
Menge definieren und lokale Kopien beim Merge herausfiltern (`serverIds`-Deduplication in
`getInitialTracks()`/`loadAllTracks()`).

**Konsequenz:** Bei Read-Path-Integrationen, die Daten aus mehreren Quellen kombinieren,
immer explizit prüfen welche Quelle Vorrang hat und Duplikate by-ID herausfiltern.
Merge-Logik die stillschweigend die erste Kopie bevorzugt, ohne explizite Quelle-Priorisierung,
führt zu schwer debuggbaren UI-Zuständen.

---

## Lesson 24 — Atomic Write: temp + rename schützt vor korrupten Dateien (L.5)

**Kontext:** Die L.5-Write-Endpoints mussten Track-JSON-Dateien updaten ohne das Risiko einer halbfertigen Datei (z.B. bei Absturz während des Schreibens oder volllaufender Disk). Standard `writeFileSync` direkt auf die Zieldatei ist nicht atomar — ein Leser zwischen Write-Start und Write-Ende sieht inkonsistenten Inhalt.

**Erkenntnis:** Das OS garantiert dass `rename()` auf demselben Filesystem atomar ist: Leser sehen entweder die alte oder die neue Datei, nie eine unvollständige. Temporäre Datei auf demselben Volume schreiben (`.tmp`-Suffix auf selber Partition), dann `renameSync` zur finalen Adresse.

**Konsequenz:** Für alle Datei-Writes die konsistenten Zustand erfordern: `writeFileSync(tmpPath, content)` dann `renameSync(tmpPath, finalPath)`. Node-built-ins — kein Extra-Package nötig. Test-Absicherung: prüfe dass `.tmp`-Datei nach erfolgreichem Save nicht existiert.

---

## Lesson 26 — Cache und Index müssen synchron gehalten werden (L.6-Bug2)

**Kontext:** `cacheTrackGeometry` (trackLoader.js) speicherte Server-Geometrien unter `racearena:trackGeometries:<id>` — genau dort wo auch `getTrack(id)` liest. Aber `racearena:trackGeometries:index` wurde nicht aktualisiert. `listTracks()` liest ausschließlich aus dem Index. Ergebnis: Geometrie-Daten lagen im Storage, waren aber für alle Index-Leser unsichtbar. Der Modal-Dropdown zeigte "No tracks drawn yet", obwohl die Geometrie vorhanden war.

**Erkenntnis:** Wenn zwei Funktionen dasselbe Storage-Schema verwenden aber eine davon den Index überspringt, entsteht ein stiller Konsistenzbruch. Tests prüfen in der Regel "Daten können geschrieben und gelesen werden" — aber nicht "sind die Daten über alle vorgesehenen Read-Paths erreichbar". Der Bruch wird erst sichtbar wenn eine UI-Komponente den indirekten Read-Path (via Index) verwendet statt direkt per ID zu lesen.

**Konsequenz:** Bei Storage-Schemas mit Index-Pointer-Struktur: jede Write-Operation (sowohl lokale saves als auch externe Cache-Einträge) muss den Index mitpflegen. Index-Registrierung und Daten-Write als unteilbares Paar behandeln. Beim Löschen analog: erst Daten entfernen, dann Index-Eintrag entfernen.

---

## Lesson 25 — One-shot Migration: Marker-Key erst nach vollständigem Erfolg setzen (L.5)

**Kontext:** L.5-Migration von localStorage-Tracks zum Server: alle Custom-Tracks lesen, jeden zum Server POSTen, localStorage-Eintrag löschen. Zwei Fehlerfälle: Marker zu früh setzen → verbleibende Tracks werden nie migriert. Marker nie setzen bei Fehlern → Migration läuft bei jedem Mount erneut und postet bereits migrierte Tracks nochmals.

**Erkenntnis:** Der Marker muss exakt dann gesetzt werden wenn alle Tracks erfolgreich übertragen wurden. Einzelne Track-Fehler loggen und Migration fortsetzen (kein Early-Exit), am Ende Marker setzen wenn `allSucceeded === true`. Versionierter Key-Name (`...-v1`) erlaubt Folge-Migrationen durch neuen Key.

**Konsequenz:** One-shot Migrations-Pattern: (1) Marker prüfen → abbrechen wenn gesetzt. (2) Jeden Eintrag individuell verarbeiten, Fehler loggen, kein Early-Exit. (3) Marker nur setzen wenn `allSucceeded`. (4) Marker-Key versionieren: `racearena:migration:tracks-to-server-v1`.

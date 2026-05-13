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

## Lesson 24 — Atomic Write: temp + rename schützt vor korrupten Dateien (L.5)

**Kontext:** Die L.5-Write-Endpoints mussten Track-JSON-Dateien updaten ohne das Risiko einer halbfertigen Datei (z.B. bei Absturz während des Schreibens oder volllaufender Disk). Standard `writeFileSync` direkt auf die Zieldatei ist nicht atomar — ein Leser zwischen Write-Start und Write-Ende sieht inkonsistenten Inhalt.

**Erkenntnis:** Das OS garantiert dass `rename()` auf demselben Filesystem atomar ist: Leser sehen entweder die alte oder die neue Datei, nie eine unvollständige. Temporäre Datei auf demselben Volume schreiben (`.tmp`-Suffix auf selber Partition), dann `renameSync` zur finalen Adresse.

**Konsequenz:** Für alle Datei-Writes die konsistenten Zustand erfordern: `writeFileSync(tmpPath, content)` dann `renameSync(tmpPath, finalPath)`. Node-built-ins — kein Extra-Package nötig. Test-Absicherung: prüfe dass `.tmp`-Datei nach erfolgreichem Save nicht existiert.

---

## Lesson 25 — One-shot Migration: Marker-Key erst nach vollständigem Erfolg setzen (L.5)

**Kontext:** L.5-Migration von localStorage-Tracks zum Server: alle Custom-Tracks lesen, jeden zum Server POSTen, localStorage-Eintrag löschen. Zwei Fehlerfälle: Marker zu früh setzen → verbleibende Tracks werden nie migriert. Marker nie setzen bei Fehlern → Migration läuft bei jedem Mount erneut und postet bereits migrierte Tracks nochmals.

**Erkenntnis:** Der Marker muss exakt dann gesetzt werden wenn alle Tracks erfolgreich übertragen wurden. Einzelne Track-Fehler loggen und Migration fortsetzen (kein Early-Exit), am Ende Marker setzen wenn `allSucceeded === true`. Versionierter Key-Name (`...-v1`) erlaubt Folge-Migrationen durch neuen Key.

**Konsequenz:** One-shot Migrations-Pattern: (1) Marker prüfen → abbrechen wenn gesetzt. (2) Jeden Eintrag individuell verarbeiten, Fehler loggen, kein Early-Exit. (3) Marker nur setzen wenn `allSucceeded`. (4) Marker-Key versionieren: `racearena:migration:tracks-to-server-v1`.

---

## Lesson 26 — Cache und Index müssen synchron gehalten werden (L.6-Bug2)

**Kontext:** `cacheTrackGeometry` (trackLoader.js) speicherte Server-Geometrien unter `racearena:trackGeometries:<id>` — genau dort wo auch `getTrack(id)` liest. Aber `racearena:trackGeometries:index` wurde nicht aktualisiert. `listTracks()` liest ausschließlich aus dem Index. Ergebnis: Geometrie-Daten lagen im Storage, waren aber für alle Index-Leser unsichtbar. Der Modal-Dropdown zeigte "No tracks drawn yet", obwohl die Geometrie vorhanden war.

**Erkenntnis:** Wenn zwei Funktionen dasselbe Storage-Schema verwenden aber eine davon den Index überspringt, entsteht ein stiller Konsistenzbruch. Tests prüfen in der Regel "Daten können geschrieben und gelesen werden" — aber nicht "sind die Daten über alle vorgesehenen Read-Paths erreichbar". Der Bruch wird erst sichtbar wenn eine UI-Komponente den indirekten Read-Path (via Index) verwendet statt direkt per ID zu lesen.

**Konsequenz:** Bei Storage-Schemas mit Index-Pointer-Struktur: jede Write-Operation (sowohl lokale saves als auch externe Cache-Einträge) muss den Index mitpflegen. Index-Registrierung und Daten-Write als unteilbares Paar behandeln. Beim Löschen analog: erst Daten entfernen, dann Index-Eintrag entfernen.

---

## Lesson 27 — Metadaten-UI und Asset-UI gehören in getrennte Oberflächen (L.6-Bug2-UX)

**Kontext:** Das Edit-Track-Modal zeigte eine read-only "Effects: none/..."-Zeile die aus der verknüpften Geometrie gelesen wurde. Die Effects werden im Track-Editor konfiguriert und sind Teil der Geometrie — nicht der Track-Metadaten. Browser-Test zeigte: User sucht Background-Bild-Verwaltung im Modal und findet sie nicht. Die Effects-Anzeige im Modal gab keinen Hinweis wohin man für Asset-Verwaltung gehen muss.

**Erkenntnis:** Eine UI-Oberfläche die Daten aus zwei semantisch unterschiedlichen Quellen anzeigt (Metadaten + Asset-Eigenschaften) erzeugt Verwirrung wo welche Verwaltung stattfindet. Read-only Anzeige von Asset-Properties im Metadaten-Modal gibt keine Orientierung — im Gegenteil: sie suggeriert dass Assets hier verwaltbar sind. Ein klarer Hinweis-Text ("Background image and effects are managed in the Track Editor") ist informativer als das Anzeigen von Werten ohne Edit-Möglichkeit.

**Konsequenz:** Jede UI-Oberfläche sollte eine klar definierte Domäne haben: Metadaten-Modal für Metadaten, Track-Editor für Assets/Geometrie. Informationen aus der anderen Domäne entweder weglassen oder durch Hinweis-Text auf die zuständige Oberfläche zeigen. Read-only Properties aus einer anderen Domäne anzeigen ohne Edit-Pfad führt zu UX-Verwirrung.

---

## Lesson 28 — Canvas-Lesbarkeit: Overlay und Kontrast-Defaults für dunkle Hintergründe (L.6-VIS)

**Kontext:** Der Track-Editor renderte Track-Linien direkt auf das Hintergrundbild ohne Zwischenschicht. Auf Bildern mit helleren Bereichen (Gras, Himmel, Beton) verschwanden die farbigen Linien (#4fc3f7 auf weißem Untergrund) oder die Cyan-gefüllten Kontrollpunkte waren kaum von hellen Bildregionen zu unterscheiden. Erst ein Browser-Test auf echtem Track-Material machte das Problem sichtbar — Unit-Tests und Code-Review gaben kein Signal.

**Erkenntnis:** Canvas-Overlays (globalAlpha + fillRect) sind der einfachste Weg um einen zuverlässigen Kontrast-Boden zu schaffen unabhängig vom Bild-Inhalt. Eine 35%-Opacity-Schicht zwischen Bild und Linien kostet eine Zeile Code und macht alle weiteren Farb-Entscheidungen Bild-agnostisch. Kontrollpunkte mit weißer Füllung und dunklem Rand (Kreismarkierung-Prinzip) sind auf jedem Hintergrund sichtbar — Cyan auf Cyan-Hintergrund nie.

**Konsequenz:** Bei Canvas-Editoren die auf variablem Bildmaterial arbeiten: immer Overlay-Schicht zwischen Bild und interaktive Elemente einplanen. Kontrollpunkte mit Komplementär-Kontrast zeichnen: helle Füllung + dunkler Rand (oder umgekehrt), nie einfarbig ohne Rand. Für Linien: kontrastreiche Farbe (Magenta) die in keinem typischen Bildinhalt vorkommt, plus weiße Outline dahinter — damit ist die Lesbarkeit auf beliebigem Hintergrund garantiert ohne auf den Hintergrund-Typ angewiesen zu sein.

---

## Lesson 29 — Partielle State-Updates: nie mehr Felder überschreiben als nötig (L.6-BgBug)

**Kontext:** Der Bild-Upload-Handler im Track-Editor enthielt eine `dimChanged && hasPoints`-Verzweigung die bei Dimensionsunterschied zwischen neuem Bild und aktueller Welt `setCenterPoints([])`, `setInnerPoints([])`, `setOuterPoints([])` aufrief. Intention: vermeiden dass gezeichnete Punkte nach Dimensions-Änderung "falsch positioniert" sind. Effekt: jeder Bild-Upload auf einem neuen Track (Standardgröße 1280×720, Foto typisch andere Auflösung) zerstörte die gezeichnete Strecke.

**Erkenntnis:** Handler die primär eine einzige Ressource ändern (hier: Background-Bild) dürfen keine anderen State-Felder als unbeabsichtigten Nebeneffekt zurücksetzen. Die "Schutz"-Logik war schlechter als nichts: sie überschrieb User-Arbeit, die der User nicht zurückfordern kann wenn er den confirm-Dialog bestätigt. State-Updates sollten chirurgisch sein — nur das ändern, was der Handler explizit ändern soll.

**Konsequenz:** Bei jedem Handler der State ändert: prüfen welche anderen State-Felder er berührt und ob das beabsichtigt ist. "Cleanup für den Fall dass X" in einem State-Update-Handler ist ein Warnsignal — das gehört entweder in einen separaten Handler (der explizit ausgelöst wird) oder gar nicht rein.

---

## Lesson 30 — Container-First: Skeleton vor Logik (Phase L / PR #43)

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

## Lesson 31 — Server-Daten mit Code-Defaults über gemeinsame ID-Deduplication mergen (L.2–L.4)

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

## Lesson 32 — `docker compose up` ohne `--build` ist nicht idempotent gegenüber Code-Änderungen (VRE-2 Browser-Test)

**Kontext:** VRE-1 (PR #46) fügte die Surface-Classes-API-Routes hinzu (`server/src/routes/surfaceClasses.js`,
registriert in `app.js`). VRE-2 (PR #47) baute den Frontend-Editor darauf auf. Beim ersten Browser-Test
nach VRE-2 erschien beim Save einer Default-Klasse "HTTP 404". Diagnose: Der Docker-Container lief
noch aus einer Session vor VRE-1 — das Image enthielt die Surface-Classes-Routes nicht. Gleichzeitig
fehlten `volumes:`-Mounts in `docker-compose.yml`, sodass laufende Container niemals aktualisierten
Quellcode sahen.

`docker compose up -d` — das Kommando das beim Session-Start zum "Server starten" genutzt wurde —
startet existierende Container ohne Rebuild. Die Ausgabe `Container seasonalraceclaude-server-1 Running`
ist kein Indikator für Code-Aktualität, sondern nur ein Liveness-Check.

**Erkenntnis:** `docker compose up` ohne `--build` baut das Image nie neu. Wenn kein `volumes:`-Mount
existiert, laufen Code-Änderungen an `src/` unsichtbar am Container vorbei. "Der Container läuft"
bedeutet nicht "der Container hat den aktuellen Code." Dieses Muster führt zu Phantom-404s die schwer
zu debuggen sind, weil Code und Routen korrekt aussehen — der Fehler liegt im Deployment-Gap.

**Konsequenz:** `docker-compose.yml` erhält immer `volumes:`-Mounts für Quellcode-Verzeichnisse
(`./server/src:/app/src`) und persistente Daten (`./server/data:/app/data`). Mit Live-Mount reicht
`docker compose restart server` statt `docker compose build`. Rebuild bleibt nötig bei
`package.json`-Änderungen (neue Dependencies) oder Dockerfile-Änderungen. Regeln:
- Code-Änderung (`src/`): `docker compose restart server`
- Neue npm-Dependency: `docker compose up --build -d`
- Frischer Start: `docker compose down && docker compose up -d`

---

## Lesson 33 — Server-Resource-Edits brauchen API-Calls in allen Mutations-Flows, nicht nur Delete (VRE-3 Bug)

**Kontext:** VRE-3 fügte `surfaceClasses: string[]` zu Server-Tracks hinzu. TrackManager hatte `handleDelete()` korrekt implementiert (prüft `serverTrackIds.has(id)`, ruft `deleteTrackFromServer()`). `handleSave()` tat das aber nicht — es schrieb immer nur in localStorage via `setTracks()`. User-Änderungen (z.B. "air" zuweisen) schienen zu funktionieren, gingen aber beim nächsten Render verloren: `useServerTracks()` feuert im Hintergrund, holt `surfaceClasses: []` vom Server, und der SetupScreen-Merge überschreibt den localStorage-Wert bedingungslos mit dem Server-Stand.

**Erkenntnis:** Wenn ein Merge-Layer existiert der Server-Daten gegenüber localStorage priorisiert, ist ein "nur localStorage schreiben" nicht nur unvollständig — es ist effektiv ein No-Op. Der Fehler ist zudem schwer zu entdecken: Die UI sieht sofort korrekt aus (der localStorage-Wert wird kurz gerendert), und erst nach dem Hintergrund-Fetch oder einem Reload verschwindet die Änderung. Tests die localStorage direkt prüfen, anstatt das Merge-Ergebnis, maskieren diesen Bug.

**Konsequenz:** Bei jeder neuen Mutations-Operation (Save, Update, Clone, Set-Default, usw.) für Server-Resources explizit prüfen: Unterscheidet der Handler zwischen Server-Track und Local-Track? Muster: `if (serverTrackIds.has(id)) { await apiCall(); await refresh(); } else { setLocalState(); }`. `handleDelete()` ist die Referenz-Implementation. Analog gilt das Muster für Surface-Classes, Racer-Overrides oder andere Ressourcen mit dualem Speicherpfad.

---

## Lesson 34 — POST und PUT brauchen unterschiedliche Validation-Strenge (VRE-3 Bug)

**Kontext:** `validateTrackBody()` war eine einzige Funktion die für POST und PUT gleich verwendet wurde. Sie verlangte `closed` als Boolean und vollständige Geometrie-Arrays. TrackManager sendet beim PUT nur Metadaten-Felder (name, icon, surfaceClasses, etc.) — keine Geometrie. Der PUT schlug deshalb mit 400 fehl, obwohl das Track-Objekt im Backend vollständige Geometrie hatte. Der Merge `{ ...existing, ...rest }` hätte die Geometrie erhalten — aber die Validierung lief auf `req.body` bevor der Merge stattfand.

**Erkenntnis:** POST-Validation prüft Vollständigkeit (ist das Objekt komplett genug um erstellt zu werden?). PUT-Validation prüft Korrektheit der gesendeten Felder (ist was gesendet wurde valide?). Das sind zwei verschiedene Fragen. Eine strikte Create-Validation auf Update anzuwenden zwingt den Client dazu, Felder zu schicken die er gar nicht kennt oder ändern möchte — und versteckt den Merge, der danach sowieso passiert.

**Konsequenz:** Bei CRUD-APIs getrennte Validierungs-Funktionen für POST und PUT schreiben. PUT-Validation iteriert über vorhandene Keys im Body (`'field' in body`), nicht über ein fixes Schema. Felder die nicht gesendet werden, werden nicht validiert — der Merge mit `existing` macht sie idempotent. Geometrie-Felder in PUT: nur validieren wenn mindestens ein Geometrie-Key im Body vorhanden ist; sonst aus `existing` übernehmen.

---

## Lesson 35 — Stateful Generatoren brauchen eine Instanz pro Racer, nicht pro Race (VRE-4)

**Kontext:** Der `line`-Generator (`line.js`) schließt über `let lastX = null; let lastY = null;` — er merkt sich die letzte bekannte Racer-Position um kontinuierliche Linien-Segmente zu zeichnen. Wenn ein einzelner Emitter über alle Racers geteilt würde (einmal pro Race erstellt), würden die Position-Werte von verschiedenen Racers sich überschreiben: Racer A schreibt `lastX=200`, Racer B überschreibt mit `lastX=800`, nächstes Segment von A läuft von 800 nach 205 statt von 200 nach 205.

**Erkenntnis:** Generator-Module deren `create()`-Funktion über mutablem State schließt müssen einmal pro Consumer (hier: pro Racer) instantiiert werden. Die `create()`-API ist explizit so designed: jeder Call gibt ein frisches Closure-Objekt zurück. Wird das ignoriert und `create()` nur einmal aufgerufen, funktioniert die `particle`- oder `cloud`-Implementierung noch zufällig korrekt — aber `line` bricht sofort bei mehr als einem Racer.

**Konsequenz:** Wenn eine Funktion `create()` als Factory exportiert die einen Emitter zurückgibt: immer pro Konsument aufrufen, nie das Ergebnis teilen. Dokumentiert in `trailResolver.js` im JSDoc. Test `line-generator emitters maintain independent position state per instance` verifiziert dieses Verhalten explizit.

## Lesson 36 — Performance-Smoke-Tests brauchen unterschiedliche Thresholds für Dev und CI (VRE-4)

**Symptom:** Performance-Test läuft lokal in ~5ms und ist grün. Auf CI (GitHub Actions) läuft derselbe Test in ~74ms und schlägt fehl — obwohl kein Regressionsfall vorliegt.

**Ursache:** CI-Runner (GitHub Actions Ubuntu shared runner) starten V8 cold ohne JIT-Warmup. Mikrobenchmarks die auf Dev durch JIT-Optimierung beschleunigt werden laufen auf CI ~10-15× langsamer. Ein globaler Threshold der auf Dev sinnvoll ist (z.B. 50ms = 10× über Dev-Baseline) ist auf CI zu eng.

**Anti-Pattern:** Threshold global hochziehen (z.B. 50ms → 200ms) löst das CI-Problem aber verliert den Dev-seitigen Regressionsschutz. Bei 200ms würde eine quadratische Regression auf Dev erst bei ~40× Verschlechterung auffallen — de facto kein Guard mehr.

**Konsequenz:** Umgebungsabhängigen Threshold verwenden:
```js
const threshold = process.env.CI ? 200 : 50;
expect(elapsed).toBeLessThan(threshold);
```
- Dev: 50ms = sinnvoller Guard (10× über ~5ms Baseline)
- CI: 200ms = sinnvoller Guard (2.7× über ~74ms gemessener CI-Baseline)
- `process.env.CI` ist auf GitHub Actions automatisch gesetzt

---

## Lesson 37 — Explizite Feld-Listen in Cache/Build-Funktionen sind ein Bug-Magnet (PR #52)

**Symptom:** User ändert `trackLights.style` im Track-Editor, speichert, öffnet den Track erneut — Style steht wieder auf dem Default. Kein Fehler, keine Warnung. Die Änderung sieht funktional korrekt aus (Server speichert korrekt, Tests grün), aber geht beim nächsten Laden lautlos verloren.

**Ursache:** `cacheTrackGeometry` in `trackLoader.js` baute ein `geometry`-Objekt aus einer expliziten Feld-Liste:
```js
const geometry = {
  id: full.geometryId,
  name: full.name,
  effects: full.effects ?? [],
  // ... 10 weitere Felder
  // ❌ trackLights fehlt — nie eingetragen
};
```
Neues Datenmodell-Feld (`trackLights`) wurde im Server, im Editor, im Save-Pfad korrekt implementiert — aber in dieser einen Cache-Funktion vergessen. `surfaceClasses` hatte dasselbe Problem, fiel nur nicht auf weil es über einen anderen Lese-Pfad läuft.

**Konsequenz — Spread-Pattern mit bewussten Ausschlüssen:**
```js
// Statt Whitelist: Spread + explizite Ausschlüsse für Felder die NICHT gecached werden sollen
const { id: serverId, geometryId, backgroundImageFile, ...rest } = full;
const geometry = {
  ...rest,                         // alle Felder automatisch durch
  id: geometryId,                  // Umbenennung
  backgroundImage: computedUrl,   // Überschreibung
};
```
Neue Datenmodell-Felder fließen automatisch durch — kein Code-Change in der Cache-Funktion nötig.

**Test-Pattern als Sicherheitsnetz:**
Round-Trip-Tests pro Feld garantieren dass `cacheTrackGeometry` keinen Server-Response-Inhalt fallen lässt:
```js
for (const field of PASSTHROUGH_FIELDS) {
  it(`preserves field "${field}" from server response`, () => {
    expect(cached[field]).toEqual(FULL_TRACK_ALL_FIELDS[field]);
  });
}
```
Fängt Regressionen auch im Spread-Pattern ab (z.B. wenn `backgroundImageFile` versehentlich NICHT mehr ausgeschlossen wird).

**Wann Whitelist legitim ist:** Build-Funktionen die einen definierten Output-Shape erzeugen (z.B. `buildTrackFromEditorState` — nur Editor-bekannte Felder sollen gespeichert werden). Cache/Passthrough-Funktionen dagegen sollen transparent sein — dort ist Whitelist falsch.

---

## Lesson 38 — UI-Felder die nicht der Server-Realität entsprechen führen zu Daten-Verlust

**Kontext:** User wollte eine Default-Track-Geometrie über das Edit-Modal neu verknüpfen, indem er "Geometry = none" wählte und speicherte — in der Annahme das entkoppele das Preset von der alten Geometrie. Stattdessen ignorierte der Backend-PUT-Handler das `geometryId`-Feld vom Client komplett (`existing.geometryId` wurde hartcodiert übernommen). Gleichzeitig öffnete der "Draw Geometry"-Button den Track-Editor ohne Preset-Kontext — in "neuer Track"-Modus — und die gezeichnete Geometrie wurde als separater Track gespeichert statt das Preset zu aktualisieren. Das Ergebnis: die gezeichnete Geometrie war irreversibel verloren (als unbenannter verwaister Track im System), das Original-Preset unverändert.

**Symptom:** User führt eine UI-Aktion aus die dem gewünschten Ergebnis entspricht (Geometrie neu verknüpfen), erhält keine Fehlermeldung, und verliert dabei Arbeit die er nicht zurückfordern kann.

**Ursache:** Zwei voneinander unabhängige Fehler, beide mit demselben Root-Cause:
1. Der "Geometry = none"-Dropdown im Edit-Modal suggeriert dass das Preset von einer Geometrie entkoppelt werden kann — aber das Backend hat diesen Pfad nie implementiert.
2. Der "Draw Geometry"-Button im Edit-Modal suggeriert dass die Geometrie für dieses Preset gezeichnet wird — aber der Navigationspfad transportiert keinen Preset-Kontext.

**Konsequenz:** UI muss entweder exakt das widerspiegeln was der Server tatsächlich tut, oder Felder entfernen / deaktivieren die Aktionen suggerieren die der Server nicht ausführt. Eine UI-Option die immer eine No-Op ist (oder schlimmer: eine andere als die gezeigte Aktion auslöst) ist schlimmer als keine Option.

**Leitfrage für UI-Design:** "Wenn der User diese Schaltfläche / dieses Dropdown betätigt und speichert — tut der Server exakt das was die UI andeutet?" Wenn nein: die Option entfernen oder eine Warnung zeigen, niemals still divergieren.

**Abgeleitete Entscheidungen (TLH):**
- "Geometry = none"-Option: konzeptionell überprüfen — wenn "kein Geometrie-Link" ein unterstützter Zustand ist, muss der Server ihn auch unterstützen; sonst Option entfernen
- "Draw Geometry"-Button: sendet jetzt Preset-Kontext (`/track-editor?load=<serverId>`) damit der Editor weiß für welches Preset er arbeitet
- Backend-PUT: respektiert `geometryId` vom Client wenn im Body vorhanden

---

## Lesson 39 — List-APIs die Felder strippen müssen mit dem Code synchron sein der diese Felder liest

**Kontext:** `toSummary` in `server/src/routes/tracks.js` entfernt `innerPoints`/`outerPoints` aus der List-API-Response für Performance. `TrackManager.jsx` prüfte `srv.innerPoints.length > 0` um den Geometry-Status anzuzeigen — ein Feld das nicht mehr in der Response enthalten war. Ergebnis: `hasGeo` war immer `false`, das Modal zeigte immer "Geometry: not yet drawn" egal ob Geometrie gespeichert war oder nicht.

**Symptom:** Status-Anzeige zeigt immer dasselbe egal was tatsächlich gespeichert ist — keine Fehlermeldung, kein sichtbarer Hinweis.

**Ursache:** List-API strippt Performance-Felder, Frontend liest diese gestrippten Felder.

**Konsequenz:** Bei `toSummary`-Pattern explizit dokumentieren welche Felder verfügbar bleiben. Frontend soll IDs oder kompakte Zähler nutzen, nicht die gestrippten Daten selbst. Konkret: `geometryId` für `hasGeo`-Check, `pointCount: { inner, outer }` für Anzeige.

**Leitfrage:** "Welche Felder werden von der List-API geliefert? Sind alle Frontend-Reads auf Felder die garantiert in der Response sind?"

**Audit-Pattern nach toSummary-Änderungen:** Für jedes Feld das aus `toSummary` entfernt oder durch ein kompaktes Äquivalent ersetzt wird:
1. `grep -r "srv\.<field>\|track\.<field>\|geom\.<field>"` in `client/src/` nach allen Lesestellen des Feldes
2. Jede Stelle prüfen: kommt das Objekt aus der List-API (`serverTracks`, `tracks`-Array) oder aus einer vollständigen Quelle (localStorage-Cache, GET `:id`)?
3. List-API-Konsumenten müssen auf die neuen kompakten Felder umgestellt werden
4. Eine Stelle zu fixen reicht nicht — der gleiche Pattern kann an mehreren Stellen vorkommen (F2: `hasGeo` in TrackManager; Folge-Bug: `autoMaxRacers` in `handleEdit`)

---

## Lesson 40 — Stille Fehlerzustände sind das gefährlichste UI-Verhalten

**Kontext:** Beim TLH-2 Browser-Test zeigte der Track-Editor nach einer gescheiterten (oder scheinbar erfolgreichen) Speicherung kein sichtbares Feedback. Die Fehler-Anzeige (`saveBar` mit `serverError`) befand sich im DOM oberhalb der Canvas — aber React Router setzt die Scroll-Position nicht zurück bei Navigation. Der User öffnete den Editor scrolled to canvas, sah das Save-Ergebnis nicht, und dachte der Save sei erfolgreich gewesen.

**Symptom:** Save klingt erfolgreich, User sieht keine Fehlermeldung, Geometrie ist verloren.

**Ursache:** Fehler-Anzeige war außerhalb des sichtbaren Bereichs (Scroll-Bug), und `hasGeo`-Status las falsche Felder (Lesson 39).

**Konsequenz:** Errors müssen erzwungen sichtbar sein. `window.scrollTo(0, 0)` beim Mount des Track-Editors stellt sicher dass die Save-Bar sichtbar ist. `scrollIntoView` wenn `serverError` gesetzt wird ist eine zweite Absicherung. Status-Anzeigen müssen die echte Quelle der Wahrheit nutzen.

**Leitfrage:** "Wenn der Save fehlschlägt, sieht der User es garantiert? Oder kann der Fehler unsichtbar sein?"

---

## Lesson 41 — Lösch-Buttons müssen klar machen WAS sie löschen

**Kontext:** City-Circuit-Bug (TLH-2 Followup). User wollte das falsche Background-Bild eines Default-Tracks entfernen. Im Track-Editor gab es nur einen roten "Delete"-Button — keinen separaten "Background entfernen"-Button. User klickte "Delete", bestätigte den Confirm-Dialog ohne die genaue Wirkung zu verstehen, und der gesamte Track (inklusive Geometrie und Background) wurde permanent gelöscht.

**Symptom:** User klickt Lösch-Button mit Erwartung A ("Background entfernen"), tatsächlich passiert B ("gesamter Track gelöscht"). Kein Feedback über den erweiterten Scope der Aktion.

**Ursache:** Generischer "Delete"-Button ohne Scope-Klarstellung. Confirm-Dialog enthielt nicht die vollständige Information ("Track UND Background-Bild werden gelöscht"). Kein separater Button für die tatsächlich gewollte Aktion.

**Konsequenz:** (1) Separate Buttons für separate Lösch-Aktionen: "Remove background" für nur das Bild, "Delete track" für den ganzen Track. (2) Confirm-Dialog muss den vollständigen Scope nennen: "Delete track 'X' and its background image permanently? This cannot be undone." (3) Lösch-Aktionen mit großem Scope brauchen explizite Scope-Benennung im Button-Label oder Tooltip.

**Leitfrage:** "Wenn der User diesen Button klickt — sieht er danach was er erwartet hat? Oder mehr?"

**Konkrete Umsetzung:** Track-Editor hat jetzt einen "Remove background"-Button der neben dem Background-Upload-Button erscheint wenn ein Bild geladen ist. Der Delete-Button löscht weiterhin den ganzen Track, aber der Confirm-Dialog nennt jetzt explizit dass auch das Background-Bild permanent gelöscht wird.

---

## Lesson 42 — Default-Records brauchen server-seitigen Schutz

**Kontext:** City-Circuit-Bug (TLH-2 Followup). Die 5 Default-Tracks aus der TLH-1-Migration hatten `isDefault: true` als Daten-Flag, aber kein Verhaltens-Unterschied im API-Handler. `DELETE /api/tracks/:id` löschte Default-Tracks ohne Prüfung. Außerdem: `migrateDefaultTracks()` lief nur einmal beim ersten Boot (marker-geschützt) — ein einmal gelöschter Default-Track konnte nicht automatisch wiederhergestellt werden.

**Symptom:** Kritische System-Records (Defaults, Templates, Seed-Daten) werden versehentlich via API gelöscht. Nach Server-Neustart fehlen sie immer noch.

**Ursache:** `isDefault`-Flag nur als Metadaten-Feld ohne API-Enforcement. Migration nur als einmalige Initialisierung statt als idempotente Startup-Routine.

**Konsequenz:** (1) DELETE-Handler muss `isDefault: true` mit 403 ablehnen. (2) Migrations-/Seeding-Routinen müssen fehlende Default-Records bei jedem Boot wiederherstellen (idempotent, nicht nur beim ersten Boot). Marker-Files für "bereits migriert" sind sinnvoll für Einmal-Transformationen, aber nicht für Daten-Integrität. (3) PUT-Handler sollte `isDefault`-Flag nie aus dem Request-Body übernehmen (bereits korrekt via `isDefault: existing.isDefault`).

**Leitfrage:** "Welche Records dürfen niemals fehlen? Sind sie durch API-Guards UND Startup-Wiederherstellung geschützt?"

**Konkrete Umsetzung:** `DELETE /api/tracks/:id` gibt 403 für Default-Tracks. `migrateDefaultTracks()` läuft bei jedem Boot und sät fehlende Default-Tracks nach.

---

## Lesson 43 — useEffect mit asynchronen Callbacks brauchen Cleanup

**Symptom:** State wechselt mehrfach schnell, alte async Callbacks (`onload`, `onerror`, `fetch.then`, `setTimeout`) überschreiben das Resultat neuer Effekte. Sichtbar z.B. als: UI-Button zeigt "Remove background" (state truthy), Canvas bleibt aber schwarz (bgRef.current ist null, weil ein alter Callback ihn nach dem erfolgreichen Load wieder auf null gesetzt hat).

**Ursache:** `useEffect` ohne Cleanup — alte Callbacks bleiben aktiv auch wenn ein neuer Effect-Run bereits läuft. Wenn `backgroundImage` von `null` auf eine URL wechselt (z.B. beim Track-Load), überleben Callbacks des null-Runs und können den bgRef nach erfolgreichem Load erneut nullen.

**Konsequenz:** `useEffect` mit asynchronen Callbacks IMMER mit `cancelled`-Flag oder `AbortController` + `return cleanup`.

```js
useEffect(() => {
  if (!backgroundImage) {
    bgRef.current = null;
    setBgReady(true);
    return;
  }
  setBgReady(false);
  bgRef.current = null;
  const img = new Image();
  let cancelled = false;
  img.onload = () => { if (!cancelled) { bgRef.current = img; setBgReady(true); } };
  img.onerror = () => { if (!cancelled) { bgRef.current = null; setBgReady(true); } };
  img.src = backgroundImage;
  return () => { cancelled = true; };
}, [backgroundImage]);
```

Zusätzlich: Null-Guard am Anfang verhindert `img.src = "null"` komplett wenn der State-Wert `null` oder `undefined` ist.

**Konkret in TrackEditor:** Background-Image-Effect ohne Cleanup führte zu Race-Condition wenn `backgroundImage` von `null` auf URL wechselte beim Track-Load (fix/track-delete-safeguards, PR #58 Followup).

---

## Lesson 44 — Tendenz-Drift bei Konzept-Doc-Sprints

**Kontext:** Camera-Director-Konzept-Sprint (PR #60). Beim Übersetzen von User-Regie-Vorgaben in eine Spezifikation entstand über mehrere Nachtrag-Runden ein konsistentes Drift-Pattern: Tendenz-Aussagen wurden schrittweise zu starren Algorithmen verfestigt.

**Symptom (Kette, die sich in PR #60 ergab):**
1. User-Aussage: "Leader soll am häufigsten im Bild sein" (Tendenz)
2. Konzept-Doc: "Leader muss in jedem Frame sichtbar sein — hartes Constraint"
3. Folge: starre Prioritäts-Hierarchie 1–4
4. Folge: `gap01`-Trigger der algorithmisch nur Leader-vs-Zweiter erlaubt
5. Folge: Risiko-Doku beschreibt den entstehenden Bug als "korrekt per Hierarchie"

**Ursache:** Jede einzelne Übersetzungsstufe wirkt logisch konsequent. Erst beim Gesamtbild widerspricht das Resultat der ursprünglichen Aussage. CC hat keine Rückkopplung zur User-Intention zwischen den Stufen.

**Konsequenz:** (1) Bei Konzept-Docs explizit zwischen TENDENZ und CONSTRAINT unterscheiden — beide Typen sind valide, müssen aber benannt werden. (2) Reviews brauchen Aufmerksamkeit für Verfestigungs-Drift: "War das als Constraint gemeint oder als Tendenz?". (3) Architektur-Hinweis früh im Doc verankern: "Dieses System ist als Tendenz-Logik formuliert, nicht als Constraint-System."

**Leitfrage:** "Ist das eine Tendenz-Aussage oder ein hartes Constraint? Hätte der User das auch so formuliert?"

**Verweis:** `docs/CAMERA_DIRECTOR.md §3` Architektur-Hinweis-Blockquote, K1+K2+K5+K6 in Nachtrag 5.

---

## Lesson 45 — Doc-weite Konsistenz bei Variablen-Refactor

**Kontext:** Camera-Director-Konzept-Sprint (PR #60). Variablen-Rename `overviewCooldown → overviewCooldownMin + overviewCooldownMax` sowie Wert-Änderung "fest 20s → Random-Jitter [15s/25s]" wurden nicht doc-weit durchgezogen. Erst beim Sammel-Review wurden 5 Stellen mit dem alten Wert und 2 Stellen mit dem alten Variablen-Namen gefunden.

**Symptom:** Tunable-Definition in §8.1 korrekt (`overviewCooldownMin`, `overviewCooldownMax`), aber §3.1, §4.2, §4.3, §8.2 und §12.2 noch mit altem Wert/Namen. Gleiches Muster bei `hudShowCount → hudMaxStandings`.

**Ursache:** Variablen-Refactor nur an der Definition-Stelle gemacht, nicht überall wo der Wert oder Name vorkommt. Docs sind anders als Code — kein Compiler prüft Konsistenz.

**Konsequenz:** Bei jedem Variablen-Rename oder Wert-Änderung in einem Konzept-Doc: Grep nach altem Namen/Wert und alle Treffer in einem Batch ersetzen. "Definition aktualisiert" ist nicht dasselbe wie "Doc-weit konsistent".

**Leitfrage:** "Gibt es noch andere Stellen im Doc wo der alte Wert oder Name steht?"

**Verweis:** K3 (5 Stellen "20s"), K9 (2 Stellen "overviewCooldown" Singular), K7 (2 Stellen "hudShowCount") aus PR #60 Nachtrag 5.

---

## Lesson 46 — Empirische Messung schlägt strukturelle Vermutung

**Kontext:** Camera-Director-Konzept-Sprint (PR #60). Q-25-Diagnose: Space Sprint fühlte sich zu kurz an. Eine strukturelle Hypothese ("Canvas-Koordinaten sind auf 1280×720 begrenzt, daher ist Space Sprint kurz") war im HANDOFF dokumentiert. Tatsächliche Ursache: `maxScale=4.0` zu niedrig.

**Symptom:** HANDOFF beschreibt Hypothese A als "wahrscheinliche Ursache". Wenn man Hypothese A glaubt, folgt ein Refactor der Canvas-Koordinaten-Logik. Tatsächlich ist Hypothese A falsch — empirische Messung widerlegt sie sofort.

**Ursache:** Strukturelle Hypothesen klingen plausibel und werden ohne Mess-Schritt als Grundlage für Lösungs-Konzepte verwendet. Empirische Verifikation wird als "offensichtlich" übersprungen.

**Konsequenz:** Bei strukturellen Vermutungen ("wahrscheinlich liegt es an X") immer einen Mess-Auftrag in den Diagnose-Sprint einbauen bevor Lösungs-Konzepte entwickelt werden. Der Mess-Auftrag kostet wenig; das falsche Refactor kostet viel.

**Leitfrage:** "Ist das eine Messung oder eine Vermutung? Kann ich die Vermutung in 5 Minuten empirisch prüfen?"

**Verweis:** PR #60 Phase 1 — empirische Widerlegung der Canvas-Koordinaten-Hypothese, `DEFAULT_SPEED_SCALE_CONFIG.maxScale=4.0` als Root Cause identifiziert.

---

## Lesson 47 — Konzept-Doc-Reviews brauchen zwei Perspektiven

**Kontext:** Camera-Director-Konzept-Sprint (PR #60). Das abschließende Review vor Merge fand 10 Korrektur-Punkte (K1–K10) die in 5 vorherigen Commits unentdeckt geblieben waren.

**Beobachtung:** User-Review und Strategie-Claude-Review fanden unterschiedliche Probleme:
- **User** fand K1+K2+K3: Wording-Sensibilität ("das habe ich nicht gesagt"), Hierarchie-Logik, offensichtliche Zahlenwidersprüche
- **Strategie-Claude** fand K4–K10: technische Variablen-Inkonsistenzen, algorithmische Widersprüche in Trigger-Logik, Folge-Effekte von Architektur-Änderungen in abhängigen Sektionen

**Ursache:** User kennt die eigenen Intentions am besten (Wording-Check), hat aber keine Zeit für vollständige technische Konsistenzprüfung. Strategie-Claude prüft technische Konsistenz, kennt aber die User-Intentionen nur aus dem Doc-Text.

**Konsequenz:** Zwei-stufiges Review-Pattern für Konzept-Docs: (1) User-Review zuerst — Wording, Intention-Check, offensichtliche Widersprüche zur eigenen Aussage. (2) Strategie-Claude-Review — vollständiger Konsistenz-Scan, Variablen-Grep, Folge-Effekte prüfen. (3) Sammel-Nachtrag in einem Commit, nicht einzeln.

**Leitfrage:** "Gibt es jemanden der prüft ob das technisch konsistent ist — und jemanden der prüft ob das die eigene Aussage korrekt wiedergibt?"

---

## Lesson 48 — Symptom-Fix vs. Architektur-Fix (PR-A1 / PR-A2)

**Kontext:** Q-25 (Space Sprint zu schnell) wurde in PR-A1 als Symptom-Fix gelöst:
`maxScale` von 4.0 auf 10.0 erhöht. Das Ergebnis war besser, aber der fundamentale
Defekt blieb: `openTrackFinishT` teilte nicht durch `speedScaleFactor`, d.h. der
Duration-Slider hatte bei langen Strecken null Wirkung.

**PR-A2-Diagnose** identifizierte den Architectural Gap. **PR-A2** löste ihn durch
einen anderen Ansatz: statt "baseSpeed durch Länge dividieren" nun "baseSpeed so
berechnen dass der Median-Racer in targetDuration fertig wird". 3-Zeilen-Formel,
kein Konfigurationsparameter.

**Erkenntnis:** Symptom-Fixes (maxScale erhöhen) können als Stepping-Stone sinnvoll
sein — PR-A1 war notwendig um das Problem sichtbar zu machen. Aber ein Diagnose-Sprint
vor der Implementierung (PR-A2-Diagnose) verhindert, dass man sich mit dem nächsten
Symptom-Fix in eine Sackgasse manövriert.

**Konsequenz:** Bei komplexen Bugs die UI-Parameter-Tuning erfordern: prüfen ob
die Architektur selbst das Problem verursacht. Eine 3-Zeilen-Formel kann eine
10-Parameter-Konfiguration überflüssig machen.

**Verweis:** PR #60 Nachtrag 5 — 10 K-Korrekturen aus kombiniertem User+Strategie-Claude-Review.

---

## Lesson 49 — Last-Finisher vs. Median-Racer Semantics bei duration-driven Speed

**Kontext:** PR-A2 implementierte `computeRaceBaseSpeed(finishT, targetDuration)` so dass der
Median-Racer (spreadFactor=1.0) in `targetDuration` fertig wird. Browser-Test (2026-05-04) zeigte:
Dirt Oval Horse 46s → 48s (+4%, akzeptabel), Space Sprint Rocket 30s → 26s (-13%). Zwei Bugs:
E1: `speedMultiplier` nicht normalisiert (Rocket sm=1.25 läuft 25% schneller → fertig nach 24s).
E2: "Race Duration 30s" war de facto ein Median-Versprechen, nicht ein Last-Finisher-Versprechen.

**Update PR-A2.6:** Empirische Messung in der Diagnose-Phase zeigte: nur 39-63% der Races landeten
tatsächlich innerhalb ±5% des Targets beim Race-Ende. Die ±5%-Garantie galt implizit für den
Median-Racer. Race-Ende-Abweichung ist 1σ ≈ 4-6% abhängig von N — intrinsisch durch die
Spread-Mechanik (Minimum von N stochastischen Draws). Die Garantie ist auf den *erwarteten* letzten
Finisher, nicht auf jeden einzelnen Run. Dokumentiert in ARCHITECTURE.md § Speed Pipeline.
Wichtig: Garantien immer explizit zuordnen — Median-Racer vs. Race-Ende sind verschieden.

**Erkenntnis:** Eine duration-driven Speed-Architektur braucht zwei explizite Entscheidungen:

1. **Was verspricht die Duration?** Median-Racer-Semantik: Mitte des Feldes fertig bei T. Last-Finisher-Semantik: letzter Racer fertig bei T. Beide sind valide — aber es muss eine Entscheidung getroffen werden und sie muss im Code codiert sein.

2. **Welchen speedMultiplier hat die Kalibrierung?** Wenn `computeRaceBaseSpeed` für sm=1.0 kalibriert ist, muss der Aufruf T mit sm multiplizieren damit der Racer-eigene sm sich herauskürzt.

**Korrekte Formel (Last-Finisher + sm-normalisiert):**
```
T = targetDuration × spreadMinFactor × speedMultiplier
race_baseSpeed = finishT / (REFERENCE_FPS × T)
```
Der sloweste Racer zeichnet BASE_SPEED_MIN → spreadFactor = BASE_SPEED_MIN/MEAN = spreadMinFactor.
Sein Finish: `finishT / (race_baseSpeed × sm × spreadMinFactor × FPS)` = targetDuration ✓.
Der Median-Racer fertig bei `targetDuration × spreadMinFactor ≈ 87%` von targetDuration.

**Spec-Fehler-Lektion:** Die Spec zeigte `T = targetDuration × spreadMinFactor / speedMultiplier`.
Das ist falsch. Die eigenen Validierungszahlen der Spec (Rocket 30s → letzter fertig bei 30s)
sind nur mit Multiplikation erreichbar. Immer die Validierungszahlen gegen die Formel prüfen,
nicht nur die Formel-Zeile im Spec-Text.

**Konsequenz:** Bei der Implementierung einer duration-driven Speed-Architektur:
1. Die Duration-Semantik explizit festlegen und im Code kommentieren (last-finisher vs. median).
2. `speedMultiplier`-Normalisierung am Aufruf-Ort, nicht in der Pure Function — die Pure Function bleibt generisch.
3. Pipeline-Contract-Tests schreiben die End-to-End verifizieren dass der sloweste und median Racer zur richtigen Zeit ankommen.

**Verweis:** PR-A2-fix-commit (2026-05-04), `raceBaseSpeed.test.js` describe-Block "pipeline contract — last-finisher semantics".


---

## Lesson 50 — T-Parameter-Sampling vs Arc-Length-Sampling bei stochastischen Visualisierungen

**Kontext:** PR-A2.5 — Racer bewegten sich visuell mit wechselnder Pixel-Geschwindigkeit (Beschleunigen + Bremsen) obwohl ihre `t`-Fortschritt-Rate konstant war. Root-Cause: `catmullRomSpline` sampelte im T-Parameter-Raum gleichmäßig; aufeinanderfolgende Samples hatten aber unterschiedliche Pixel-Abstände (2.69×–7.72× max/min-Verhältnis je nach Track-Geometrie).

**Erkenntnis:** T-Parameter-Gleichmäßigkeit ≠ Pixel-Gleichmäßigkeit. Die Spline-Segmente im T-Raum können unterschiedlich lange Bogenlängen haben — z.B. wenn der Editor-Nutzer viele Punkte in Kurven platziert (kurze Segmente) und wenige in Geraden (lange Segmente). Jede Simulation die `t` gleichmäßig inkrementiert und dann T→Pixel abbildet hat dieses Problem.

**Lösung:** Arc-Length-Reparametrisierung als One-Shot-Schritt beim Sampling:
1. Dense Sampling im T-Raum (5× Ziel-Samples, min 1000)
2. Kumulative Bogenlängen berechnen → Lookup-Tabelle
3. Für jeden Output-Sample: Ziel-Bogenlänge = `i/N × totalLength`, Binary-Search in LUT → T-Wert → Spline-Punkt

O(N log N) einmalig beim Track-Laden (nicht pro Frame). Closed-Tracks: eine extra Eintrag für das Wrap-Segment schließt den Loop korrekt.

**Generalisierung:** Jede Visualisierung die eine Simulation über eine parametrische Kurve zeigt, muss zwischen T-Parameter-Gleichmäßigkeit und Pixel-Gleichmäßigkeit unterscheiden. Für wahrnehmbare Bewegung (Rennfahrer) ist Pixel-Gleichmäßigkeit (arc-length) immer die richtige Wahl. Für Connectivity-Checks oder Punkt-Validierung reicht T-uniform.

**Diagnose-Disziplin (L46):** Vor dem Fix wurde eine Diagnostic-Messung mit 6 synthetischen Track-Shapes gemacht. Hypothese (max/min > 1.3×) wurde mit Werten 1.36×–7.72× bestätigt. Erst dann wurde implementiert.

**Sub-Caveat — Aufrufer von `derivativeAt` direkt:** Code der `derivativeAt(controlPoints, t)` direkt aufruft (statt das Sample-Array zu konsumieren) umgeht die Arc-Length-Reparametrisierung. `derivativeAt` erwartet `t` als T-Parameter im Kontrollpunkt-Raum; nach dem Wechsel auf arc-length-uniform Sampling ist Racer-`t` aber eine Arc-Length-Fraktion. Das gibt falsche Tangenten an falschen Spline-Punkten — auf asymmetrischen Tracks sichtbar als "Rotation hinkt der Kurve hinterher". Zusätzlich: `derivativeAt` clampt `t` auf `[0,1]`, was bei Closed-Track-Mehrfachrunden (t > 1) alle Racer ab Runde 2 auf die konstante End-Tangente zwang. Fix: Tangenten aus dem arc-length-gesampleten Array via finiter Differenz berechnen (O(1) pro Frame, kein Bug durch T-Raum-Mapping). **Bei jedem Refactoring von Spline-Sampling alle Aufrufer prüfen — nicht nur Sample-Output-Konsumenten, sondern auch Code der auf rohen Kontrollpunkten und Racer-t arbeitet.**

**Verweis:** PR-A2.5 `catmullRom.js`, `catmullRom.diagnostic.test.js`, `EditorShape.js`.

---

## Lesson 51 — Silent Failures in Async Resource Loaders brauchen Observability

**Kontext:** PR-A2.8 — User berichtete dass Backgrounds im Race fehlen, ohne zu wissen warum. Root-Cause: `bgImageCache.js` setzte `record.failed = true` im `img.onerror`-Handler, gab aber keine Rückmeldung. Kein `console.warn`, kein UI-Hinweis, kein Retry. Der User hatte mehrfach Background-Bilder hochgeladen und wusste nicht, dass das Problem der offline Docker-Server war — nicht die Bilder.

**Erkenntnis:** Async Resource Loader (Image, fetch, FileReader) die UX-sichtbare Inhalte laden, müssen bei Failure mindestens eine Konsolen-Warnung ausgeben. Silent-fail ist nur akzeptabel wenn der Caller bereits einen sichtbaren Fehlerzustand anzeigt. `img.onerror = () => { record.failed = true; }` ohne jede Ausgabe macht die Ursache beim Debuggen unsichtbar — auch für den Entwickler selbst.

**Pattern:** Beim ersten Fehler pro Cache-Eintrag (Flag `record.warned`) einmal warnen; danach silent. Verhindert Frame-Spam bei rAF-Loop-Callers, gibt aber dennoch einen klaren Hinweis im ersten Fehlerfall. Warn-Message soll enthalten: was fehlschlug (URL), warum wahrscheinlich (mögliche Ursache), wie zu beheben (konkreter Schritt).

**Generalisierung:** Jeder `onerror` / `catch`-Handler in einem Modul das Ressourcen cached und `null` zurückgibt sollte mit `console.warn` ausgestattet sein, wenn der Aufrufer nicht selbst warnt. Die Faustregel: Wenn das Fehlen der Ressource für den User sichtbar ist (fehlender Hintergrund, fehlendes Bild), muss die Ursache für den Entwickler sichtbar sein (Konsole).

**Verweis:** PR-A2.8 `bgImageCache.js`.

---

## Lesson 52 — Periodic State Re-Rolls mit Smooth Transition erzeugen Race-Dynamik ohne deterministische Garantien zu brechen

**Kontext:** PR-A2.6 — Diagnose zeigte 4.3 Lead-Changes pro 30s-Race, 3% der Races völlig ohne
Platzwechsel. Racers hielten ihre initiale Spread-Reihenfolge nahezu durchgehend.

**Erkenntnis:** Einmalig gezogene Zufallswerte (spreadFactor bei Race-Start) frieren das Feld ein.
Die Lösung: Periodische Re-Draws mit (a) Zentrierung auf den aktuellen Wert (Variant B — kein
Reset zum globalen Mittel) und (b) einer easeInOutCubic-Übergangsanimation. Damit entstehen
natürliche, graduelle Tempo-Schwankungen ohne ruckartige Sprünge.

**Kritische Trennung: speedBonusMult vs. spreadFactor.** Nur `spreadFactor` (Glücks-Zug) darf
re-gerollt werden. `speedBonusMult = 1 + speedBonus` (positions-basierter Back-Row-Ausgleich) ist
räumlich determiniert und muss konstant bleiben. Vor dieser PR war speedBonus in baseSpeed
eingerechnet — ein Re-Roll hätte den Back-Row-Ausgleich gelöscht und hintere Startpositionen
benachteiligt. Refactor: Beide Skalare explizit als separate Felder (`spreadFactor`,
`speedBonusMult`) — nur das erste wird re-gerollt.

**Timing-Regel:** Letzter Roll bei ~80% der Race-Dauer. Danach keine Änderungen mehr — die
Zielgerade soll von der aktuellen Reihenfolge entschieden werden, nicht von einem zufälligen
Late-Roll. Formel: `rollCount = max(2, floor(duration/15))`, `rollInterval = 0.80 × duration / rollCount`.
Für alle Standard-Dauern (30–120s) ergibt das konstant ~12s zwischen Rolls.

**Verweis:** PR-A2.6 `RaceScreen/index.jsx`, `reRoll.test.js`, ARCHITECTURE.md § Re-Roll Mechanism.

---

## Lesson 53 — Koordinatensystem-Dokumentation ist Pflicht: Pan-Offset und scaledRacersForCam (Phase-4 Diagnose-Session 2026-05-06)

**Kontext:** CameraDirector erhält von RaceScreen **canvas-space** Koordinaten via `scaledRacersForCam`: `r.x = worldX × bsX`, `r.y = worldY × bsY`. Die Render-Pipeline zeichnet Racer bei World-Koordinaten unter `ctx.scale(cam.zoom × bsX, cam.zoom × bsY)`. Damit gilt: `screenX = offsetX + worldX × zoom × bsX = offsetX + r.x × zoom`.

**Die triviale Pan-Formel ist korrekt:**
```
targetOffsetX = hw - r.x × zoom
targetOffsetY = hh - r.y × zoom
```
Beweis: `screenX = (hw - r.x×zoom) + worldX×zoom×bsX = hw - worldX×bsX×zoom + worldX×bsX×zoom = hw ✓`. Gilt für alle bsX/bsY-Kombinationen.

**Befund C (Phase-4) war ein Fehler:** Commit C führte `_computePanScale(zoom) = zoom × bsX` ein mit der Begründung, die Render-Pipeline brauche bsX im Pan. Das war falsch: bsX ist **bereits in `r.x`** enthalten. `r.x × zoom × bsX = worldX × bsX² × zoom` — ein doppelter bsX-Faktor. Für Dirt Oval (bsX=0.833, bsY=1.0) ergab das:
- X-Fehler: `screenX = hw + worldX × zoom × bsX × (1-bsX) ≈ +36px`
- Y-Fehler (bsX statt bsY): `screenY = hh + worldY × zoom × (1-bsX) ≈ +138px`

**Warum der Fehler nicht sofort auffiel:** Das Diagnose-Log verwendete `expectedScreenCenterX = offsetX + r.x × zoom × bsX`. Das ist eine Tautologie — da `offsetX = hw - r.x × zoom × bsX`, ergibt die Summe immer `hw`. Der X-Fehler war im Log unsichtbar.

**Diagnosbarkeit:** Empirische `[PAN]`-Logs zeigten `expectedScreenCenterY: 498.7 ≠ 360` (Y-Fehler sichtbar weil bsY=1.0 in diesem Track). Die korrekte Screen-Formel `screenY = offsetY + worldY × zoom × bsY = offsetY + r.y × zoom` war durch Zufall identisch mit der Log-Formel. Der X-Fehler (36px) war kleiner und wurde durch die Tautologie verdeckt.

**Lehre:** Koordinatensystem (`r.x`: canvas-space oder world-space?) muss an der Systemgrenze `scaledRacersForCam` explizit dokumentiert sein. Diagnostic-Log-Formeln müssen von den Pan-Formeln **unabhängig** sein — sonst sind sie Tautologien.

**Verweis:** Phase-4 Diagnose-Session 2026-05-06, `CameraDirector.js` `_setTargets()`, `index.jsx` L924–927 (`scaledRacersForCam`), L1022–1024 (Render-Transform). CAMERA_DIRECTOR.md §L62 (Zoom-Invarianz bleibt unverändert korrekt).

---

## Lesson 54 — Bauchgefühl als erstes Qualitätssignal (Phase-4-Diagnose)

**Kontext:** Phase-4 Commit C führte `_computePanScale(zoom) = zoom × bsX` ein. Die Formel "klang
plausibel" — bsX taucht in der Render-Pipeline auf, also schien es logisch sie in die Pan-Formel
einzubauen. Das Gefühl "hier stimmt etwas nicht" (zu viele Faktoren, bsX kommt doppelt vor) wurde
nicht ernst genommen. Kein algebraischer Beweis wurde aufgeschrieben. Diagnose-Session 2026-05-06
deckte den Fehler durch empirische Messung auf.

**Erkenntnis:** Das Bauchgefühl "diese Formel macht zu viel" ist oft das früheste und günstigste
Signal. Wenn Code "sich komisch anfühlt" — Formel die verdächtig komplex ist, Faktor der zweimal
vorkommt, Namenskonvention die verdächtig ähnlich zu einem anderen Wert ist — ist das ein Signal
für einen Beweis-Auftrag, nicht für "wird schon passen".

**Konsequenz:** Jede Camera-Formel die bsX, zoom, oder Koordinaten-Transformationen kombiniert:
direkt einen algebraischen Beweis aufschreiben bevor committed wird. 2–3 Zeilen Mathematik
(`screenX = offsetX + worldX × zoom × bsX = hw`) sparen Stunden Diagnose.

---

## Lesson 55 — Koordinatensystem-Grenzen müssen an der API-Grenze dokumentiert sein (Phase-4-Diagnose)

**Kontext:** `scaledRacersForCam` in `RaceScreen/index.jsx` liefert canvas-space Koordinaten an
CameraDirector: `r.x = worldX × bsX`. Weder die Variable noch der CameraDirector-Aufruf hatte
einen Kommentar der das explizit machte. Ergebnis: Commit C führte `r.x × zoom × bsX` ein (bsX
doppelt) ohne Widerspruch — weil "bsX in der Pipeline vorkommt" stimmte, aber "bsX ist bereits in
r.x enthalten" nicht dokumentiert war.

**Erkenntnis:** Koordinatensystem-Konventionen ("Wert ist canvas-space" vs. "Wert ist world-space")
müssen an der Systemgrenze explizit stehen. In einem Canvas-System wo beide Räume simultan existieren
und ineinander konvertiert werden, ist die implizite Annahme über den Raum eines Wertes der häufigste
Fehler-Mechanismus.

**Konsequenz:** Bei jedem Funktions-Parameter der Koordinaten enthält: Kommentar welcher Raum erwartet
wird. `// r.x: canvas-space (= worldX × bsX)` in dem Mapping wo scaledRacersForCam gebaut wird. Im
CameraDirector-Update-Kommentar analog. Ohne diesen Kommentar ist der nächste Entwickler (oder
Claude) blind gegenüber dem eingebauten bsX-Faktor.

**Verweis:** `index.jsx` L924–927 (`scaledRacersForCam`), Lesson 53.

---

## Lesson 56 — Config-Schema-Versionierung: Test-Fixtures müssen synchron bleiben (Phase-4)

**Kontext:** CameraDirector-Config wurde von v2 auf v3 erweitert: `battleGapThreshold` (war
`battleGapPct`), `battleMaxDurationMs` (war `battleMaxDuration`, ohne Ms-Suffix), neue Felder
`battleGapHysteresis`, `overviewCooldownMin/Max`. Tests die `inverseConfig` mit dem alten Schema
verwendeten liefen grün mit Fallback-Defaults — aber ohne die neuen Felder wurde das eigentliche
Verhalten (Hysterese, Max-Duration-Cap) nicht getestet.

**Erkenntnis:** Wenn ein Config-Objekt erweitert wird, müssen Test-Fixtures explizit mit den neuen
Feldern aktualisiert werden. "Läuft mit Defaults" maskiert fehlende Verifikation — die neuen Features
existieren im Code aber werden nie durch Tests ausgeübt.

**Konsequenz:** Config-Schema-Erweiterungen → sofort alle Test-Fixtures (inkl. `inverseConfig`,
Test-Helpers, `beforeEach`-Objekte) mit den neuen Feldern updaten. Idealerweise: ein zentraler
`TEST_CONFIG`-Objekt aus der vollständigen Schema-Definition generiert — dann sind neue Felder
automatisch in allen Tests präsent.

---

## Lesson 57 — Einheiten-Suffix als Pflicht für Timing-Parameter (Phase-4)

**Kontext:** `battleMaxDuration` war in Millisekunden — aber der Name gab keine Einheit an.
Commit 9a0d803 benannte es in `battleMaxDurationMs` um. Die Umbennenung war kein Refactor —
sie war notwendige Klarstellung, weil ein Wert `4000` ohne Einheit zweideutig ist (4 Sekunden
oder 4000 Sekunden?).

**Erkenntnis:** Parameter die in Millisekunden sind MÜSSEN `Ms` im Namen haben. Parameter in
Sekunden MÜSSEN `Seconds` oder `s` (bei sehr kurzen Namen) tragen. `duration` oder `cooldown`
alleine sind mehrdeutig — sie laden zur falschen Einheit ein. Das Problem taucht besonders
auf wenn Millisekunden mit Sekunden-Vergleichen gemischt werden (`timestamp > cooldown` wo
timestamp ms ist und cooldown s sein sollte).

**Konsequenz:** Bei jedem neuen Timing-Parameter direkt mit Einheiten-Suffix benennen:
`battleGapThresholdMs`, `overviewDurationMs`, `lerpFactor` (dimensionslos — explizit so kommentieren).
Bestehende Parameter ohne Suffix: bei nächster Berührung umbenennen + Schema-Version erhöhen.

---

## Lesson 58 — React StrictMode Double-Mount: useRef-Initialisierungen brauchen Cleanup (Phase-4)

**Kontext:** React StrictMode ruft `useEffect` zweifach auf in Development (mount → cleanup → mount).
Wenn `camDirRef.current = new CameraDirector(...)` in einem useEffect ohne Cleanup steht, laufen
beim zweiten Mount zwei Instanzen parallel bis der Ref überschrieben wird. In normalen Tests (kein
StrictMode-Doppel-Invoke) ist das unsichtbar — der Bug taucht nur im Dev-Browser auf.

**Erkenntnis:** Jede `useRef`-Zuweisung in einem `useEffect` die eine externe Instanz (State-Machine,
Timer, WebSocket) erstellt, braucht ein Cleanup-Return. Auch wenn das Objekt keinen formalen
`dispose()`-Aufruf hat, reicht `return () => { ref.current = null; }` um StrictMode-Doppel-Instanzen
zu verhindern.

**Konsequenz:** `useEffect` mit `useRef`-Zuweisung → immer prüfen ob Cleanup nötig.
Pattern: `useEffect(() => { ref.current = new Thing(config); return () => { ref.current = null; }; }, [])`.
B-1 (PlayerGroups StrictMode-Fix in B-Wave) hatte denselben Root-Cause — das Pattern ist systemisch.

**Verweis:** B-Wave PR #25, B-1. Lesson 1 (UI-Drift-Muster bei State-Quellen).

---

## Lesson 59 — beforeEach für zustandsbehaftete Testobjekte: nie State zwischen Tests teilen (Phase-4)

**Kontext:** CameraDirector-Tests die eine Instanz über mehrere `it`-Blöcke teilen akkumulieren
State: `_lastOverviewExitTs`, `_lastBattleExitTs`, `finishMomentExpiry`, Hysterese-State. Ein Test
der BATTLE_ZOOM aktiviert lässt das Hysterese-Band für den nächsten Test aktiv. Ergebnis: Tests die
in Isolation grün sind können in Suite-Reihenfolge fehlschlagen.

**Erkenntnis:** CameraDirector ist eine State-Machine — jeder Zustand der in einem Test verändert
wird beeinflusst alle nachfolgenden Tests bei geteilter Instanz. Das ist der häufigste Mechanismus
für "flaky tests" die manchmal grün und manchmal rot sind je nach Ausführungsreihenfolge.

**Konsequenz:** Für alle zustandsbehafteten Klassen (State-Machines, Timer-Manager, Caches):
`let obj; beforeEach(() => { obj = new Thing(...); });` statt shared let auf Modul-Ebene.
Keine Ausnahme. Tests sind schnell — eine neue CameraDirector-Instanz pro Test kostet <0.5ms.

---

## Lesson 60 — Hard-Refresh vor visueller Verifikation: Cache ist nicht trivial (Phase-4)

**Kontext:** Nach Code-Änderungen in Vite kann der Browser-Cache alte JavaScript-Bundles cachen.
Ohne Hard-Refresh (Ctrl+Shift+R / Cmd+Shift+R) kann der Browser die alte Version weiter ausführen —
was eine noch nicht behobene Regression vortäuscht oder eine behobene Regression verbirgt.

**Erkenntnis:** Browser-Cache hat eine längere Lebensdauer als intuitiv erwartet, besonders wenn
Vite's Hot-Module-Replacement fehlschlägt oder der Dev-Server neu gestartet wurde. Der erste
"visual check" nach einer Code-Änderung kann silent auf altem Code laufen.

**Konsequenz:** Checkliste vor jedem visuellen Smoke-Test:
1. Hard Refresh (Ctrl+Shift+R)
2. Vite Dev-Server läuft ohne Fehler (Terminal prüfen)
3. DevTools Network-Tab → "Disable Cache" aktivieren wenn systematische Verifikation nötig

Nach Build-Fehlern oder Server-Neustart immer Hard-Refresh, nicht normaler Reload.

---

## Lesson 61 — Remote-Push vor PR-Erstellung: Push ist Teil des Merge-Workflows (Meta)

**Kontext:** `gh pr create` erfordert dass der Branch auf `origin` gepusht ist. Der Aufruf schlägt
fehl wenn der Branch nur lokal existiert. Trivial — aber wird als "selbstverständlich" übersprungen
und dann blockiert er den Merge-Sprint.

**Erkenntnis:** Commit → Push → PR sind eine Einheit. Der Push-Schritt ist nicht optional und
nicht automatisch. Er muss explizit ausgeführt werden, besonders wenn zwischen Commit und PR-Erstellung
Zeit vergeht oder andere Commits hinzukommen.

**Konsequenz:** Jeder Merge-Sprint beginnt mit: `git status && git push origin <branch>`.
Erste Aktion, bevor `gh pr create`, bevor Doc-Updates, bevor Commit-Prüfung.
Pattern: Commit → Push → Verify-Push (`git log origin/<branch>`) → `gh pr create`.

---

## Lesson 62 — Render-Pipeline-Asymmetrien: Closed vs. Open Track erklären die Pan-Formel (Phase-4 Kernlektion)

**Kontext:** Phase-4-Diagnose enthüllte dass die Camera-Pan-Formeln fundamental verschieden sind für
Closed und Open Tracks — und dass diese Asymmetrie der Root-Cause des doppelten-bsX-Fehlers war.

**Closed-Track-Render-Pipeline** (`RaceScreen/index.jsx` L1022–1024):
```js
ctx.translate(cam.offsetX, cam.offsetY);
ctx.scale(cam.zoom * bsX, cam.zoom * bsY);
// Racer gezeichnet bei world-coordinates (r.x_world, r.y_world)
```
→ `screenX = cam.offsetX + worldX × cam.zoom × bsX`

**Open-Track-Render-Pipeline** (`RaceScreen/index.jsx` L1005–1006):
```js
ctx.translate(-st.camX * effZoom, -st.camY * effZoom);
ctx.scale(effZoom, effZoom);
// Racer gezeichnet bei world-coordinates (r.x_world, r.y_world)
```
→ `screenX = -camX × effZoom + worldX × effZoom`

**Key Asymmetrie:** Closed Track hat `cam.offsetX/Y` als Camera-Position; Open Track hat `st.camX/Y`.
Für Closed Tracks muss `cam.offsetX = hw - worldX×zoom×bsX` damit `screenX = hw` (Racer zentriert).
Da CameraDirector canvas-space empfängt (`r.x = worldX × bsX`), ist die Formel `hw - r.x × zoom`.

**Warum das L62 ist:** §6.2 des CAMERA_DIRECTOR.md dokumentiert "Cross-Track-Invarianz (L62 gelöst)" —
die inverse Camera-Formel `cam.zoom = targetPx / (referenceSpriteSize × bsX)` ist korrekt für Closed
Tracks weil bsX in der Render-Scale ist. Für Open Tracks ist `cam.offsetX/Y` irrelevant; der
Pan läuft über `openTrackCamera.js / openTrackPanTarget()`.

**Konsequenz:** Für jede neue Camera-Logik: zuerst fragen "welcher Render-Pfad ist aktiv — Closed oder
Open?" und den entsprechenden Pipeline-Pfad aus L1005–1006 bzw. L1022–1024 nachverfolgen bevor Formeln
geschrieben werden. Die Pipelines sind nicht austauschbar.

**Verweis:** `index.jsx` L1005–1006 (Open), L1022–1024 (Closed), L924–927 (`scaledRacersForCam`).
CAMERA_DIRECTOR.md §6.2, §10.2. Lesson 53.

---

## Lesson 63 — Aktivierungs-Kette: Implementierter State der nie erreichbar ist (Phase-4)

**Kontext:** Phase 4 implementierte BATTLE_ZOOM-Hysterese und Max-Duration-Cap korrekt.
Aber: der BATTLE_ZOOM-Trigger (`minGapInSpitzengruppe < battleGapThreshold=0.05`) setzt voraus
dass zwei Racer der Spitzengruppe ≤ 5% t-Wert auseinanderliegen. In Races mit früh auseinander
gehendem Feld oder wenigen Racers kann dieser Threshold nie unterschritten werden.
"Feature implementiert" ≠ "Feature im Betrieb aktiv".

**Erkenntnis:** Wenn eine State-Machine korrekt implementiert ist aber ihre Trigger-Schwellen zu
strikt kalibriert sind, ist der State funktional inaktiv. Das ist durch Unit-Tests unsichtbar (Tests
setzen den State direkt, ohne den echten Trigger auszulösen) und durch Code-Review nicht erkennbar.

**Konsequenz:** Für jeden neuen Camera-State nach Implementation: ein Mess-Commit der State-Transitions
in echten 60s-Races logt. Format: `[CAMERA] transition: LEADER_ZOOM→BATTLE_ZOOM at t=12.4s`. 
Wenn BATTLE_ZOOM in 10 Races nie auftaucht: Threshold anpassen. Lesson 67 beschreibt den Mess-Sprint.

---

## Lesson 64 — Lange Sessions und Kontext-Komprimierung: Stop-Points einplanen (Meta)

**Kontext:** Diese Diagnose-Session überschritt das Kontext-Limit und wurde komprimiert. Die
Komprimierung fand mitten in der Doc-Update-Phase statt — nach den Code-Commits aber vor den
Doc-Schreibschritten. Die Wiederaufnahme nach Komprimierung ist langsamer (Kontext neu aufbauen)
und birgt das Risiko dass offene Fragen oder Zwischenentscheidungen verloren gehen.

**Erkenntnis:** Kontext-Komprimierung ist kein Fehler — sie ist strukturell unvermeidlich bei sehr
langen Sessions. Aber der Zeitpunkt ist kontrollierbar: Komprimierung mitten in einem komplexen
Schritt kostet mehr als Komprimierung zwischen natürlichen Pausen.

**Konsequenz:** Bei langen Sessions natürliche Stop-Points als mentale Checkpoints setzen:
- Nach jedem Commit: kurze Zusammenfassung was offen ist (in Commit-Message oder HANDOFF-Notiz)
- Nach Diagnose-Phase: Ergebnis committen bevor Fix-Phase beginnt
- Vor Doc-Update-Phase: sicherstellen dass alle Code-Commits fertig sind
- "Ich mache jetzt einen Commit" ist oft der richtige Impuls auch wenn der Code noch nicht perfekt ist

**Leitfrage:** "Wenn die Session jetzt endet — weiß ich was der nächste Schritt ist?"

---

## Lesson 65 — Phantom-Probleme durch Browser-State: Verifikation vor Bisect (Phase-4-Diagnose)

**Kontext:** In der Phase-4-Diagnose-Session wurde eine Sprite-Verkleinerung nach einer Code-Änderung
beobachtet und als potenzielle Regression eingestuft. Ein Bisect-Sprint wurde begonnen. Root Cause:
Browser-Zoom war nicht 100% (Ctrl+0 vergessen) — was das Canvas-Rendering skaliert und Sprites
kleiner erscheinen lässt. Kein Code-Bug. Mehrere Bisect-Commits wurden auf einem Artefakt ausgeführt.

**Erkenntnis:** Visuell präsentierte Phänomene (Sprite-Größe, Canvas-Auflösung, Pan-Versatz) können
durch Browser-State vollständig simuliert werden. Ein Bisect auf einem Browser-State-Artefakt findet
kein "schlechtes Commit" — weil es keines gibt. Das frustriert und kostet Zeit.

**Konsequenz:** Vor jedem visuellen Bisect — 5-Punkte-Checkliste:
1. Browser-Zoom 100% (Ctrl+0 / Cmd+0 — in der Adressleiste bestätigen: "100%")
2. Hard Refresh (Ctrl+Shift+R)
3. DevTools geschlossen
4. Canvas in normaler Fenstergröße (kein sehr kleines oder sehr großes Fenster)
5. Phänomen exakt dokumentieren (screenshot oder Pixel-Messwert) bevor Bisect startet

Wenn das Phänomen nach Schritt 1–4 verschwunden ist: Bisect abbrechen, Browser-State war die Ursache.

---

## Lesson 66 — Pixel-Invarianz: Algebraischen Beweis vor Implementation schreiben (Phase-4)

**Kontext:** Die triviale Pan-Formel `targetOffsetX = hw - r.x × zoom` ist nicht offensichtlich
korrekt bis man die Algebra aufschreibt:
```
screenX = cam.offsetX + worldX × cam.zoom × bsX
        = (hw - worldX×bsX×zoom) + worldX×bsX×zoom
        = hw  ✓
```
Das Aufschreiben dieses 3-Zeilen-Beweises dauert 30 Sekunden und macht die Formel diskussionsfrei.
`_computePanScale(zoom) = zoom × bsX` hätte mit demselben Beweis sofort als falsch erkannt werden
können: `(hw - r.x×zoom×bsX) + worldX×zoom×bsX×bsX ≠ hw` — bsX² statt bsX.

**Erkenntnis:** Korrektheit von Camera-Formeln die Koordinaten transformieren ist nicht intuitiv.
"Klingt plausibel" ist kein Beweis. "Tests sind grün" ist kein Beweis für Korrektheit bei
Koordinaten-Formeln — Tests können falsch kalibriert sein (Tautologie, falsche Erwartungswerte).

**Konsequenz:** Für jede neue Camera-Formel die bsX, zoom, oder Koordinaten-Räume kombiniert:
algebraischen Beweis aufschreiben bevor committed wird. Format: 3 Zeilen (`screenX = ... = hw ✓`).
Beweis geht als Kommentar in den Code (direkt über der Formel) und als Verweis in die zugehörige
Lesson. Wenn der Beweis nicht aufgeht: Formel überdenken statt committen.

**Verweis:** `CameraDirector.js` `_setTargets()`, Lesson 53. CAMERA_DIRECTOR.md §10.2.

---

## Lesson 67 — Werte-Roulette: Ohne Baseline-Messung ist Tuning blind (Phase-4)

**Kontext:** Phase 4 übernahm Default-Werte aus dem Konzept-Doc: `battleGapThreshold=0.05`,
`battleGapHysteresis=0.02`, `battleMaxDurationMs=4000ms`, `overviewCooldownMin=15s/Max=25s`.
Diese Werte "klingen sinnvoll" aber wurden nicht gegen echte Race-Daten kalibriert.
Ohne Messung ist unbekannt ob BATTLE_ZOOM in typischen Races überhaupt je aktiviert wird
oder ob OVERVIEW alle 15–25s oder alle 5min feuert.

**Erkenntnis:** Default-Werte für State-Machine-Trigger sind Hypothesen. "Klingt gut" ist kein
Kalibrierungskriterium. Falsch kalibrierte Defaults bedeuten: implementiertes Feature das in
der Praxis nie aktiv ist (zu strenger Trigger) oder Feature das dauerhaft aktiv ist und andere
States verdrängt (zu breites Band).

**Konsequenz:** Für jede neue State-Machine-Transition einen Mess-Sprint einplanen:
1. Temporäre Logs einbauen: `console.log('[CAM]', newState, Date.now(), trigger_value)`
2. Echtes Race laufen lassen (30s Dirt Oval, 60s Space Sprint, 30s City Circuit)
3. Log auswerten: Wie oft tritt jeder State auf? Wie lang? Bei welchem Trigger-Wert?
4. Dann Defaults anpassen

Erst dann sind Defaults kalibriert — nicht nach Bauchgefühl aus dem Konzept-Doc.

---

## Lesson 68 — Browser-State vor Bisect: Die 5-Punkte-Umgebungs-Verifikation (Phase-4-Diagnose)

**Kontext:** Der verschwendete Bisect-Sprint aus L65 kam durch fehlende Umgebungs-Verifikation.
Das Problem ist nicht nur der Browser-Zoom — es ist das Prinzip dass Bisect auf einem bewegenden
Ziel läuft wenn die Umgebung nicht kontrolliert ist.

**Erkenntnis:** Bisect setzt Reproduzierbarkeit voraus: dasselbe Phänomen bei demselben Commit,
dieselbe Umgebung, dieselbe Messung. Browser-State (Zoom, Cache, DevTools, Hardware-Acceleration,
Tab-Isolation) ist Teil der "Umgebung" die reproduziert werden muss. Unkontrollierte Umgebung →
Bisect findet kein "schlechtes Commit" → frustrierende False-Negatives.

**Konsequenz:** Vor jedem Bisect:
1. Phänomen exakt dokumentieren (screenshot + Messwert, z.B. "Sprite ist 24px, erwartet 56px")
2. Umgebung stabilisieren (L65 Checkliste)
3. Phänomen reproduzieren bei HEAD → erst dann `git bisect start`
4. Nach jedem Bisect-Step: Messwert wiederholen (nicht "looks bad" — "Sprite ist X px")
5. Wenn Phänomen "verschwindet" ohne Commit-Begründung: Schritt 2 wiederholen

"Kein gutes Commit gefunden" + Phänomen weg = Browser-State war die Ursache.

---

## Lesson 69 — Modelle ohne Messung sind Hypothesen: Empirical First (Phase-4-Diagnose)

**Kontext:** `_computePanScale(zoom) = zoom × bsX` wurde mit dem Argument eingeführt:
"Die Render-Pipeline hat bsX in der Scale — also braucht die Pan-Formel bsX".
Das war ein konzeptuelles Argument ("so müsste es sein") ohne algebraische Verifikation.
Die empirischen `[PAN]`-Logs widerlegten das Modell in unter 5 Minuten: `expectedScreenCenterY: 498.7 ≠ 360`.

**Erkenntnis:** Ein Mental-Model über ein Koordinatensystem ist eine Hypothese bis es empirisch
bestätigt ist. Konzeptuelle Argumente ("bsX taucht in der Pipeline auf, also...") können elegant
klingen und trotzdem falsch sein. Das ist besonders gefährlich in Systemen wo mehrere Koordinaten-
Räume (world-space, canvas-space, screen-space) simultan existieren und ineinander transformiert werden.

**Konsequenz:** Für jedes neue Camera-Konzept das Koordinaten transformiert:
1. Algebraischen Beweis schreiben (L66)
2. Falls Beweis nicht eindeutig: empirische Messung mit Log-Ausgabe (5 Minuten Aufwand)
3. Erst wenn Beweis UND Messung übereinstimmen: committen

"Das klingt logisch" ist kein Commit-Kriterium für Camera-Mathematik.
Messungen sind günstiger als Diagnose-Sprints. Diagnose-Sprints sind günstiger als Browser-Bisect.

**Verweis:** Phase-4-Diagnose-Session 2026-05-06, `[PAN]`-Log-Analyse, Lesson 53, Lesson 66.

---

## Lesson 70 — EditorShape-Doppelbild-Marathon: Diagnose-Disziplin als Verhütungs-Prinzip (Phase 1)

**Kontext:** Der EditorShape-Staircase-Bug (Doppelbild / Zackensprünge bei Racer-Positionen)
beschäftigte die Entwicklung über Etappe 20–23. Root Cause: `Math.round()` in
`EditorShape.getPosition()` bildete arc-length-t auf den nächsten Sample-Index ab statt linear
zu interpolieren. Quantitativ gemessen (Etappe-23-Trace): 26.5–27.1 px Sprünge bei 500 Samples
auf einem ~2000px-Oval bei Zoom 4×. Fix: 3 Zeilen linearer Interpolation + Winkel-Wrap.

**Prozess:** Bevor die Root Cause identifiziert war, wurden Python-Frame-Analyse-Scripts,
Playwright-Frame-Capture-Specs, 20 PNGs und mehrere Bisect-Sprints auf Browser-State-Artefakten
ausgeführt (L65, L68). Der Diagnose-Prozess zog sich über mehrere Etappen hin weil die visuelle
Beobachtung ("Doppelbild", "Zucken") ohne quantitative Messung früh in False-Bisects und
Hypothesen-Roulette führte.

**Erkenntnis:** Ein algebraischer Beweis der `getPosition()`-Formel (L66: 3-Zeilen-Beweis für
Pixel-Invarianz) hätte die Root Cause in unter 30 Minuten identifiziert. Die ~14-stündige
Diagnose entstand durch wiederholte Unterlassung des "Messung vor Bisect"-Schritts.

**Konsequenz (Prinzipien-Erweiterung):** Diese Etappe war der direkte Anlass für die Erweiterung
von PROJECT-PRINCIPLES.md um §6 (Diagnose before fix) und §7 (No hotfixes) sowie die fünf
Diagnose-bezogenen Conventions (Quantitative Diagnose, Daten-Trace, Output-Medium,
Etappe-23-Pattern). Die Prinzipien sind so formuliert, dass ein ähnlicher Marathon erkennbar und
abbrechbar wird: sobald eine Diagnose-Session die quantitative Messung überspringt und mit
visuellen Eindrücken oder Bisect startet, ist §6 verletzt.

**Verweis:** PROJECT-PRINCIPLES.md §6, §7; LESSONS.md L46, L50, L65, L66, L68, L69;
`docs/diag/render-smoothness-measurements.md`; Commits `c8538e0`, `7333ec4`, `b53d7d6`.

## Lesson 71 — Symmetric Avoidance Default war eine Regression

**Kontext:** Der `symmetricAvoidance: true`-Default wurde im Force-Decomposition-Sprint eingeführt und
ersetzte stillschweigend die ursprüngliche Asymmetrie "Trailer yields, leader holds". Die alte
Asymmetrie hatte eine echte Funktion — klare Verantwortung wer ausweicht — und war ein Feature
der funktionierenden Anti-Collision-Logik der frühen Iterationen.

Sie wurde ohne Inventur ersetzt. In der Folge gab es symmetrische Force-Cancellation in dichten
Pulks, die einen ganzen Diagnose-Sprint kostete bis der Architektur-Mangel erkannt war.

**Take-away:** Behavior-Changes an Default-Werten sind keine kosmetische Änderung. Wenn ein
bestehender Default eine fachliche Funktion erfüllt (selbst wenn nicht explizit dokumentiert),
ist sein Ersatz ein Architektur-Eingriff und braucht die Regression Awareness Convention.

## Lesson 74 — Reactive Anti-Collision Architecture Has Structural Limits

**Kontext:** Sowohl das Force-basierte als auch das Slot-basierte Anti-Collision-System waren reaktiv —
sie erkannten Kollisionen oder unmittelbare Annäherungen und reagierten darauf. Beide zeigten in
dichten Pulks dieselben strukturellen Probleme in unterschiedlicher Form:

- Force-System: 99.2 % symmetrische Kraft-Cancellation in Pulks — Racer drücken sich gegenseitig
  zurück zur Ausgangslage, keine Netto-Trennung (PR #88 Trace)
- Slot-System: 86 % Fallback-Rate (kein freier Slot gefunden), Oscillation zwischen konkurrierenden
  lokalen Optimal-Slots, 64 % aller Frames mit aktiven Clustern (PR #90 Trace)

Drei Fix-Versuche im Slot-System (Hauptumbau PR #86, EMA-Glättung, Wall-Escape + Slot-Step ≥ minLat)
zeigten in den Trace-Berichten (PR #88, #89, #90) quantitativ abnehmenden Grenznutzen. Jeder Fix löste
ein spezifisches Symptom und legte ein neues frei: Micro-Oscillation wurde Macro-Oscillation (±40–130px),
Wall-Lock wurde Squeeze-Resonanz. Die Cluster lösten sich primär durch longitudinalen Drift statt durch
aktive Resolver-Logik — die Resolver-Logik war faktisch defekt.

**Take-away:** In Many-Agent-Simulationen mit lokaler Pair-Resolution erzeugt das reaktive Grundprinzip
Oscillationen (Slot-System) oder Cancellations (Force-System). Cross-Frame-Memory als Patch
(Target-Commitment) maskiert das Symptom, behebt aber nicht die Ursache — der Resolver findet gültige
aber wechselseitig inkonsistente Lösungen in jedem Frame.

Wenn Trace-Daten zeigen dass Cluster sich primär durch physikalische Drift statt durch aktive Resolver-Logik
auflösen, ist die Resolver-Logik faktisch defekt. Ein Architektur-Wechsel zu präventiv ("Vorausschau und
frühe Reaktion") ist die korrekte Konsequenz, nicht ein weiterer Patch auf demselben Mechanismus.

**Verweis:** PR #88 (Force-Diagnose), PR #89 (Slot-Klassifikations-Trace), PR #90 (Pulk-Genese-Entscheidung),
PROJECT-PRINCIPLES.md §6, §7, Lesson 71.

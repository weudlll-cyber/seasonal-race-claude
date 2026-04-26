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

# RaceArena — Project Knowledge Inventory

**Erstellt:** 2026-05-12  
**Scope:** Read-only audit. Keine Code-Änderungen.  
**Zweck:** Inventarisierung aller Regel-, Lessons- und Workflow-Dokumente; Cross-Check der 10 dokumentierten Workflow-Themen; Etappen-Lessons-Extraktion.

---

## 1. Inventar-Tabelle

Alle gefundenen Dateien mit Regeln, Lessons, Konventionen oder Workflow-Instruktionen.

| Pfad | Zweck (1 Satz) | Zeilen | Letzter Commit |
|---|---|---|---|
| `docs/LESSONS.md` | Zentrale Sammlung aller Entwicklungs-Erkenntnisse (Lesson 1–69) | 1389 | 2026-05-06 |
| `docs/PROJECT-PRINCIPLES.md` | Verbindliche Projekt-Prinzipien und Konventionen (UI-Config, Workflow, Spec-Style, Tests) | 134 | 2026-04-29 |
| `docs/ARCHITECTURE.md` | Technische Architektur-Übersicht inkl. Key Design Decisions und Workflow-Beschreibung | 575 | 2026-05-12 |
| `docs/AUDIT.md` | Sammlung aller Pre-Merge Audit-Berichte (Severities, Findings, Empfehlungen) | 530 | 2026-05-12 |
| `docs/BACKLOG.md` | Aufgaben-Backlog nach Phasen mit Status, Priorität und Scope-Notizen | 604 | 2026-05-06 |
| `docs/CAMERA_DIRECTOR.md` | Konzept-Spec für CameraDirector inkl. Architektur-Hinweisen und Tuning-Verweisen | 1122 | 2026-05-12 |
| `docs/CAMERA_TUNING_DIAGNOSIS.md` | Read-only Diagnose-Bericht (Phase-4, H1–H4) mit empirischen Messungen | 379 | 2026-05-06 |
| `docs/RACER_DATA_MODEL.md` | Daten-Modell-Referenz für Racer-Typen und Storage-Schema | 327 | 2026-05-01 |
| `docs/ROADMAP.md` | Phasen-Roadmap mit Changelog-Einträgen und abgeschlossenen Deliverables | 379 | 2026-05-12 |
| `docs/SETUP.md` | Einrichtungs-Anleitung für Entwickler (dev server, Tests, Docker) | 55 | 2026-05-04 |
| `docs/SPEED_REFACTOR_ANALYSIS.md` | Analyse und Rationale für den Speed-Pipeline-Refactor (PR-A2-Diagnose) | 499 | 2026-05-03 |
| `docs/TRACK_EDITOR.md` | Spezifikation des Track-Editors inkl. Geometrie-Modell und Konventionen | 403 | 2026-05-02 |
| `docs/TRACK_LIFECYCLE.md` | Lifecycle-Beschreibung für Tracks (Erstellung, Migration, Export, Default-Workflow) | 281 | 2026-05-02 |
| `docs/internal/README.md` | Beschreibung des `docs/internal/`-Verzeichnisses (Diagnostic-Snapshot-Workflow) | 61 | 2026-04-29 |
| `docs/internal/D3-5-1-diagnose.md` | Diagnose-Dokument für Sprite-RacerType-Klassen (read-only, pre-Refactor-Analyse) | 305 | 2026-04-29 |
| `docs/diag/render-smoothness-measurements.md` | Archivierte Mess-Daten zur Render-Smoothness (geschlossen ohne Merge, PR #80-Archiv) | 56 | 2026-05-08 |
| `docs/audit/audit-pre-merge.md` | Vollständiger 9-Sektionen Pre-Merge Audit für Phase 1 (2026-05-12) | 391 | 2026-05-12 |
| `README.md` | Projekt-Übersicht, Tech-Stack, Features, Project-Structure (öffentlich) | 75 | 2026-05-12 |
| `AUDIT.md` (Root) | Früher Pre-Merge Audit-Bericht (April 2026, Branch feat/track-editor) | 530 | 2026-05-12 |

**Keine gefundenen Dateien:** `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `CONTRIBUTING.md`, `.aider.conf` — nicht vorhanden.

---

## 2. LESSONS.md Status

**Datei existiert:** `docs/LESSONS.md` — 1389 Zeilen, Lesson 1 bis Lesson 69.

### Vollständiges Inhaltsverzeichnis

| # | Titel |
|---|---|
| 1 | UI-Drift trotz grüner Tests (PR #16) |
| 2 | Migration-Sweep muss alle Felder abdecken (PR #17) |
| 3 | Sprite-Perspektive vor Implementation prüfen (D3.5.3 Drachen) |
| 4 | Spec-Schreibstil disziplinieren |
| 5 | Pre-existing-vs-PR-verursacht trennen (PR #17 Quality-Gate) |
| 6 | Schema-Wechsel: neuer Key besser als umfunktionieren (PR #17) |
| 7 | Quality-Gate-Findings können falsch-positiv sein (PR #17 Cleanup) |
| 8 | Test-Framework-Integration braucht Exclude-Patterns (PR #19) |
| 9 | Konstanten-Extraktion ist nur halb-fertig wenn nicht alle Konsumenten umgestellt werden (PR #19) |
| 10 | File-Header-Convention auch für Test-Infrastruktur (PR #19) |
| 11 | UX-Verifikation als zusätzliche Smoke-Test-Schicht (PR #21) |
| 12 | CI-Wartezeit beim Auto-Merge-Workflow (PR #21) |
| 13 | Pre-Sets können einen echten Bug verschleiern (D10) |
| 14 | User-Bauchgefühl wertvoller als Spec-Antizipation (D10 Post-Test) |
| 15 | E2E-Selector-Drift: Tests veralten wenn UI-Text sich ändert (PR #27) |
| 16 | Rückgabe-Lücke in Storage-Layer maskiert Feature-Bug (fix/list-tracks) |
| 17 | Browser-Test als Ground-Truth, auch wenn Unit + E2E grün sind (D11) |
| 18 | Accumulated Complexity erkennen und Stop-and-Refactor entscheiden (D11) |
| 19 | Browser-Test-driven Architecture-Correction (D7a) |
| 20 | N-Force-Accumulation braucht N-Scaling by Design, nicht nach Browser-Test (D7b B3) |
| 21 | Metadata-Werte sind keine Messung — Skalen-Berechnung braucht echte Geometrie (D7c-fix) |
| 22 | floor() ist sensitiv gegenüber Floating-Point-Fehlern nahe Ganzzahlen (D7c-fix-v3) |
| 23 | Open-Track-Layout parallel zu Closed-Track denken, nicht als Sonderfall (D7c-Phase4) |
| 24 | Atomic Write: temp + rename schützt vor korrupten Dateien (L.5) |
| 25 | One-shot Migration: Marker-Key erst nach vollständigem Erfolg setzen (L.5) |
| 26 | Cache und Index müssen synchron gehalten werden (L.6-Bug2) |
| 27 | Metadaten-UI und Asset-UI gehören in getrennte Oberflächen (L.6-Bug2-UX) |
| 28 | Canvas-Lesbarkeit: Overlay und Kontrast-Defaults für dunkle Hintergründe (L.6-VIS) |
| 29 | Partielle State-Updates: nie mehr Felder überschreiben als nötig (L.6-BgBug) |
| 30 | Container-First: Skeleton vor Logik (Phase L / PR #43) |
| 31 | Server-Daten mit Code-Defaults über gemeinsame ID-Deduplication mergen (L.2–L.4) |
| 32 | `docker compose up` ohne `--build` ist nicht idempotent gegenüber Code-Änderungen (VRE-2 Browser-Test) |
| 33 | Server-Resource-Edits brauchen API-Calls in allen Mutations-Flows, nicht nur Delete (VRE-3 Bug) |
| 34 | POST und PUT brauchen unterschiedliche Validation-Strenge (VRE-3 Bug) |
| 35 | Stateful Generatoren brauchen eine Instanz pro Racer, nicht pro Race (VRE-4) |
| 36 | Performance-Smoke-Tests brauchen unterschiedliche Thresholds für Dev und CI (VRE-4) |
| 37 | Explizite Feld-Listen in Cache/Build-Funktionen sind ein Bug-Magnet (PR #52) |
| 38 | UI-Felder die nicht der Server-Realität entsprechen führen zu Daten-Verlust |
| 39 | List-APIs die Felder strippen müssen mit dem Code synchron sein der diese Felder liest |
| 40 | Stille Fehlerzustände sind das gefährlichste UI-Verhalten |
| 41 | Lösch-Buttons müssen klar machen WAS sie löschen |
| 42 | Default-Records brauchen server-seitigen Schutz |
| 43 | useEffect mit asynchronen Callbacks brauchen Cleanup |
| 44 | Tendenz-Drift bei Konzept-Doc-Sprints |
| 45 | Doc-weite Konsistenz bei Variablen-Refactor |
| 46 | Empirische Messung schlägt strukturelle Vermutung |
| 47 | Konzept-Doc-Reviews brauchen zwei Perspektiven |
| 48 | Symptom-Fix vs. Architektur-Fix (PR-A1 / PR-A2) |
| 49 | Last-Finisher vs. Median-Racer Semantics bei duration-driven Speed |
| 50 | T-Parameter-Sampling vs Arc-Length-Sampling bei stochastischen Visualisierungen |
| 51 | Silent Failures in Async Resource Loaders brauchen Observability |
| 52 | Periodic State Re-Rolls mit Smooth Transition erzeugen Race-Dynamik ohne deterministische Garantien zu brechen |
| 53 | Koordinatensystem-Dokumentation ist Pflicht: Pan-Offset und scaledRacersForCam (Phase-4 Diagnose-Session) |
| 54 | Bauchgefühl als erstes Qualitätssignal (Phase-4-Diagnose) |
| 55 | Koordinatensystem-Grenzen müssen an der API-Grenze dokumentiert sein (Phase-4-Diagnose) |
| 56 | Config-Schema-Versionierung: Test-Fixtures müssen synchron bleiben (Phase-4) |
| 57 | Einheiten-Suffix als Pflicht für Timing-Parameter (Phase-4) |
| 58 | React StrictMode Double-Mount: useRef-Initialisierungen brauchen Cleanup (Phase-4) |
| 59 | beforeEach für zustandsbehaftete Testobjekte: nie State zwischen Tests teilen (Phase-4) |
| 60 | Hard-Refresh vor visueller Verifikation: Cache ist nicht trivial (Phase-4) |
| 61 | Remote-Push vor PR-Erstellung: Push ist Teil des Merge-Workflows (Meta) |
| 62 | Render-Pipeline-Asymmetrien: Closed vs. Open Track erklären die Pan-Formel (Phase-4 Kernlektion) |
| 63 | Aktivierungs-Kette: Implementierter State der nie erreichbar ist (Phase-4) |
| 64 | Lange Sessions und Kontext-Komprimierung: Stop-Points einplanen (Meta) |
| 65 | Phantom-Probleme durch Browser-State: Verifikation vor Bisect (Phase-4-Diagnose) |
| 66 | Pixel-Invarianz: Algebraischen Beweis vor Implementation schreiben (Phase-4) |
| 67 | Werte-Roulette: Ohne Baseline-Messung ist Tuning blind (Phase-4) |
| 68 | Browser-State vor Bisect: Die 5-Punkte-Umgebungs-Verifikation (Phase-4-Diagnose) |
| 69 | Modelle ohne Messung sind Hypothesen: Empirical First (Phase-4-Diagnose) |

### Letzte 10 Lessons (Lesson 60–69) — vollständiger Text

#### Lesson 60 — Hard-Refresh vor visueller Verifikation: Cache ist nicht trivial (Phase-4)

**Kontext:** Nach Code-Änderungen in Vite kann der Browser-Cache alte JavaScript-Bundles cachen. Ohne Hard-Refresh (Ctrl+Shift+R / Cmd+Shift+R) kann der Browser die alte Version weiter ausführen — was eine noch nicht behobene Regression vortäuscht oder eine behobene Regression verbirgt.

**Erkenntnis:** Browser-Cache hat eine längere Lebensdauer als intuitiv erwartet, besonders wenn Vite's Hot-Module-Replacement fehlschlägt oder der Dev-Server neu gestartet wurde. Der erste "visual check" nach einer Code-Änderung kann silent auf altem Code laufen.

**Konsequenz:** Checkliste vor jedem visuellen Smoke-Test: (1) Hard Refresh (Ctrl+Shift+R). (2) Vite Dev-Server läuft ohne Fehler (Terminal prüfen). (3) DevTools Network-Tab → "Disable Cache" aktivieren wenn systematische Verifikation nötig. Nach Build-Fehlern oder Server-Neustart immer Hard-Refresh, nicht normaler Reload.

---

#### Lesson 61 — Remote-Push vor PR-Erstellung: Push ist Teil des Merge-Workflows (Meta)

**Kontext:** `gh pr create` erfordert dass der Branch auf `origin` gepusht ist. Der Aufruf schlägt fehl wenn der Branch nur lokal existiert. Trivial — aber wird als "selbstverständlich" übersprungen und dann blockiert er den Merge-Sprint.

**Erkenntnis:** Commit → Push → PR sind eine Einheit. Der Push-Schritt ist nicht optional und nicht automatisch.

**Konsequenz:** Jeder Merge-Sprint beginnt mit: `git status && git push origin <branch>`. Pattern: Commit → Push → Verify-Push (`git log origin/<branch>`) → `gh pr create`.

---

#### Lesson 62 — Render-Pipeline-Asymmetrien: Closed vs. Open Track erklären die Pan-Formel (Phase-4 Kernlektion)

**Kontext:** Phase-4-Diagnose enthüllte dass die Camera-Pan-Formeln fundamental verschieden sind für Closed und Open Tracks. Closed-Track: `ctx.translate(cam.offsetX, cam.offsetY); ctx.scale(cam.zoom * bsX, cam.zoom * bsY)` → `screenX = cam.offsetX + worldX × cam.zoom × bsX`. Open-Track: `ctx.translate(-st.camX * effZoom, -st.camY * effZoom); ctx.scale(effZoom, effZoom)`.

**Erkenntnis:** Die Pipelines sind nicht austauschbar. Für Closed Tracks muss `cam.offsetX = hw - worldX×zoom×bsX`. CameraDirector empfängt canvas-space (`r.x = worldX × bsX`), daher ist die korrekte Formel `hw - r.x × zoom`.

**Konsequenz:** Für jede neue Camera-Logik: zuerst fragen "welcher Render-Pfad ist aktiv — Closed oder Open?" und den entsprechenden Pipeline-Pfad nachverfolgen bevor Formeln geschrieben werden.

---

#### Lesson 63 — Aktivierungs-Kette: Implementierter State der nie erreichbar ist (Phase-4)

**Kontext:** Phase 4 implementierte BATTLE_ZOOM-Hysterese und Max-Duration-Cap korrekt. Aber der BATTLE_ZOOM-Trigger (`minGapInSpitzengruppe < battleGapThreshold=0.05`) kann in Races mit früh auseinander gehendem Feld oder wenigen Racers nie unterschritten werden. "Feature implementiert" ≠ "Feature im Betrieb aktiv".

**Erkenntnis:** Wenn eine State-Machine korrekt implementiert ist aber ihre Trigger-Schwellen zu strikt kalibriert sind, ist der State funktional inaktiv. Das ist durch Unit-Tests und Code-Review nicht erkennbar.

**Konsequenz:** Für jeden neuen Camera-State nach Implementation: ein Mess-Commit der State-Transitions in echten 60s-Races logt (`[CAMERA] transition: LEADER_ZOOM→BATTLE_ZOOM at t=12.4s`). Wenn BATTLE_ZOOM in 10 Races nie auftaucht: Threshold anpassen.

---

#### Lesson 64 — Lange Sessions und Kontext-Komprimierung: Stop-Points einplanen (Meta)

**Kontext:** Diese Diagnose-Session überschritt das Kontext-Limit und wurde komprimiert, mitten in der Doc-Update-Phase — nach den Code-Commits aber vor den Doc-Schreibschritten.

**Erkenntnis:** Kontext-Komprimierung ist strukturell unvermeidlich bei sehr langen Sessions. Der Zeitpunkt ist aber kontrollierbar.

**Konsequenz:** Bei langen Sessions natürliche Stop-Points setzen: nach jedem Commit kurze Zusammenfassung was offen ist; nach Diagnose-Phase Ergebnis committen bevor Fix-Phase beginnt; vor Doc-Update-Phase sicherstellen dass alle Code-Commits fertig sind. **Leitfrage:** "Wenn die Session jetzt endet — weiß ich was der nächste Schritt ist?"

---

#### Lesson 65 — Phantom-Probleme durch Browser-State: Verifikation vor Bisect (Phase-4-Diagnose)

**Kontext:** Eine Sprite-Verkleinerung nach einer Code-Änderung wurde als Regression eingestuft. Ein Bisect-Sprint wurde begonnen. Root Cause: Browser-Zoom war nicht 100% (Ctrl+0 vergessen). Kein Code-Bug. Mehrere Bisect-Commits wurden auf einem Artefakt ausgeführt.

**Erkenntnis:** Visuell präsentierte Phänomene können durch Browser-State vollständig simuliert werden. Ein Bisect auf einem Browser-State-Artefakt findet kein "schlechtes Commit" — weil es keines gibt.

**Konsequenz:** Vor jedem visuellen Bisect — 5-Punkte-Checkliste: (1) Browser-Zoom 100% (Ctrl+0). (2) Hard Refresh (Ctrl+Shift+R). (3) DevTools geschlossen. (4) Canvas in normaler Fenstergröße. (5) Phänomen exakt dokumentieren (screenshot oder Pixel-Messwert) bevor Bisect startet.

---

#### Lesson 66 — Pixel-Invarianz: Algebraischen Beweis vor Implementation schreiben (Phase-4)

**Kontext:** `_computePanScale(zoom) = zoom × bsX` hätte mit einem 3-Zeilen-Beweis sofort als falsch erkannt werden können: `(hw - r.x×zoom×bsX) + worldX×zoom×bsX×bsX ≠ hw` — bsX² statt bsX.

**Erkenntnis:** Korrektheit von Camera-Formeln die Koordinaten transformieren ist nicht intuitiv. "Klingt plausibel" ist kein Beweis. "Tests sind grün" ist kein Beweis für Korrektheit bei Koordinaten-Formeln.

**Konsequenz:** Für jede neue Camera-Formel die bsX, zoom, oder Koordinaten-Räume kombiniert: algebraischen Beweis aufschreiben bevor committed wird. Format: 3 Zeilen (`screenX = ... = hw ✓`). Beweis geht als Kommentar in den Code und als Verweis in die zugehörige Lesson.

---

#### Lesson 67 — Werte-Roulette: Ohne Baseline-Messung ist Tuning blind (Phase-4)

**Kontext:** Phase 4 übernahm Default-Werte aus dem Konzept-Doc: `battleGapThreshold=0.05`, `battleGapHysteresis=0.02`, `battleMaxDurationMs=4000ms`, `overviewCooldownMin=15s/Max=25s`. Diese Werte wurden nicht gegen echte Race-Daten kalibriert.

**Erkenntnis:** Default-Werte für State-Machine-Trigger sind Hypothesen. Falsch kalibrierte Defaults bedeuten: implementiertes Feature das in der Praxis nie aktiv ist (zu strenger Trigger) oder Feature das dauerhaft aktiv ist (zu breites Band).

**Konsequenz:** Für jede neue State-Machine-Transition einen Mess-Sprint einplanen: (1) Temporäre Logs einbauen. (2) Echtes Race laufen lassen (30s Dirt Oval, 60s Space Sprint, 30s City Circuit). (3) Log auswerten. (4) Dann Defaults anpassen. Erst dann sind Defaults kalibriert.

---

#### Lesson 68 — Browser-State vor Bisect: Die 5-Punkte-Umgebungs-Verifikation (Phase-4-Diagnose)

**Kontext:** Der verschwendete Bisect-Sprint aus L65 kam durch fehlende Umgebungs-Verifikation. Bisect setzt Reproduzierbarkeit voraus: dasselbe Phänomen bei demselben Commit, dieselbe Umgebung, dieselbe Messung.

**Erkenntnis:** Browser-State (Zoom, Cache, DevTools, Hardware-Acceleration, Tab-Isolation) ist Teil der "Umgebung" die reproduziert werden muss. Unkontrollierte Umgebung → Bisect findet kein "schlechtes Commit" → frustrierende False-Negatives.

**Konsequenz:** Vor jedem Bisect: (1) Phänomen exakt dokumentieren (screenshot + Messwert). (2) Umgebung stabilisieren (L65 Checkliste). (3) Phänomen reproduzieren bei HEAD → erst dann `git bisect start`. (4) Nach jedem Bisect-Step: Messwert wiederholen (nicht "looks bad" — "Sprite ist X px"). (5) Wenn Phänomen "verschwindet" ohne Commit-Begründung: Schritt 2 wiederholen.

---

#### Lesson 69 — Modelle ohne Messung sind Hypothesen: Empirical First (Phase-4-Diagnose)

**Kontext:** `_computePanScale(zoom) = zoom × bsX` wurde mit dem Argument eingeführt: "Die Render-Pipeline hat bsX in der Scale — also braucht die Pan-Formel bsX". Das war ein konzeptuelles Argument ohne algebraische Verifikation. Die empirischen `[PAN]`-Logs widerlegten das Modell in unter 5 Minuten: `expectedScreenCenterY: 498.7 ≠ 360`.

**Erkenntnis:** Ein Mental-Model über ein Koordinatensystem ist eine Hypothese bis es empirisch bestätigt ist. Konzeptuelle Argumente können elegant klingen und trotzdem falsch sein.

**Konsequenz:** Für jedes neue Camera-Konzept das Koordinaten transformiert: (1) Algebraischen Beweis schreiben (L66). (2) Falls Beweis nicht eindeutig: empirische Messung mit Log-Ausgabe (5 Minuten Aufwand). (3) Erst wenn Beweis UND Messung übereinstimmen: committen. "Das klingt logisch" ist kein Commit-Kriterium für Camera-Mathematik. Messungen sind günstiger als Diagnose-Sprints. Diagnose-Sprints sind günstiger als Browser-Bisect.

---

## 3. Workflow-Cross-Check-Tabelle

Für jedes der 10 Workflow-Themen wurde in `docs/`, `*.md` (Root), `CLAUDE.md` und `AGENTS.md` gesucht.

| Thema | Dokumentiert? | Datei | Wortlaut / Zusammenfassung |
|---|---|---|---|
| **1. Diagnose vor Lösung** — Root Cause analysieren bevor Fix-Spec geschrieben wird | Teilweise | `docs/LESSONS.md` L46, L48, L69 | L46: "Bei strukturellen Vermutungen immer einen Mess-Auftrag in den Diagnose-Sprint einbauen bevor Lösungs-Konzepte entwickelt werden." L48: "Diagnose-Sprint vor der Implementierung verhindert, dass man sich mit dem nächsten Symptom-Fix in eine Sackgasse manövriert." L69: "Modelle ohne Messung sind Hypothesen: Empirical First." Kein dedizierter, named Workflow-Eintrag "Diagnose-vor-Lösung-Regel" in PROJECT-PRINCIPLES.md. |
| **2. Mathematische/quantitative Diagnose** — Magnitude berechnen bevor Code-Änderung | Ja | `docs/LESSONS.md` L46, L50, L66, L69; `docs/diag/render-smoothness-measurements.md` | L50: "Diagnose-Disziplin (L46): Vor dem Fix wurde eine Diagnostic-Messung mit 6 synthetischen Track-Shapes gemacht. Hypothese (max/min > 1.3×) wurde mit Werten 1.36×–7.72× bestätigt. Erst dann wurde implementiert." L66 + L69 fordern algebraischen Beweis + empirische Messung vor jedem Commit. Mess-Werte-Dokument `docs/diag/render-smoothness-measurements.md` zeigt 26.5–27.1 px Sprünge (Etappe-23-Trace). |
| **3. Daten-Trace > visuelle Beobachtung** — instrumentierter Trace mit Zahlen statt "I see it flicker" | Ja | `docs/LESSONS.md` L46, L53, L67, L69; Commit `395e8d0` | L53: "`[PAN]`-Logs zeigten `expectedScreenCenterY: 498.7 ≠ 360`" — empirische Messung widerlegte das falsche Modell. L67: "Für jede neue State-Machine-Transition einen Mess-Sprint einplanen: console.log('[CAM]', newState, Date.now(), trigger_value)". Commit `395e8d0` "diag: add Δv, follow%, pixel-snap-check, constSpeed-toggle for aliasing diagnosis". |
| **4. Output-Medium-Regel** — HUD/Markdown statt Console-Logs | Teilweise | `docs/BACKLOG.md` (Phase 4: Diagnose-HUD); `docs/audit/audit-pre-merge.md` L168; Commit `8eb16e0` | BACKLOG: "Phase 4: Diagnose-HUD" als Deliverable genannt. Audit L168: "Diagnose-Tests: catmullRom.diagnostic.test.js enthalten console.log — diese sind explizit als Diagnose-Tools angelegt, akzeptabel." Kein explizit named "Output-Medium-Regel" in PROJECT-PRINCIPLES.md. |
| **5. Anti-Hotfix** — saubere Lösung statt Quick-Workaround | Teilweise | `docs/LESSONS.md` L48; `docs/audit/audit-pre-merge.md` (Etappe 26: `_display*`-Workaround entfernt) | L48: "Symptom-Fixes (maxScale erhöhen) können als Stepping-Stone sinnvoll sein — aber ein Diagnose-Sprint vor der Implementierung verhindert, dass man sich mit dem nächsten Symptom-Fix in eine Sackgasse manövriert." Commit `fc7ed46`: "refactor: remove _display* workaround fields". Kein dedizierter Anti-Hotfix-Abschnitt in PROJECT-PRINCIPLES.md. |
| **6. Tests-grün-Regel** — Tests grün vor und nach Änderung, mit Zählangaben | Teilweise | `docs/LESSONS.md` L1, L17, L8; `docs/audit/audit-pre-merge.md` | L17: "Vor dem Merge von PR #30 waren 809 Unit-Tests und 183 e2e-Tests grün. Browser-Test durch User fand dennoch 4 visuelle Bugs." Audit-Dateien dokumentieren Test-Counts bei Merge (1717/1717 Phase 1). Kein explizit named "Tests-grün-Regel" als Workflow-Verpflichtung in PROJECT-PRINCIPLES.md. |
| **7. Test-Anpassungs-Regel** — wann dürfen Tests modifiziert vs. nicht werden | Ja | `docs/LESSONS.md` L19, L22; `docs/internal/D3-5-1-diagnose.md` §5 | L19: "19 obsolete Tests entfernt, 10 neue hinzugefügt" bei D7a-Korrektur. D3-5-1-diagnose.md §5: "Beim Refactor: Leader-Farb-Tests bleiben valide (testen das Verhalten der Duck-Instanz, egal ob die Klasse SpriteRacerType extended)." Regel lautet: bestehende Tests dürfen angepasst werden wenn ein Refactor das Verhalten intentional ändert; Tests die korrekte Behavior sichern dürfen nicht stumm gelöscht werden. |
| **8. Self-contained-Spec-Regel** — jede Spec ist vollständig in sich | Ja | `docs/PROJECT-PRINCIPLES.md` §5 (Zeile 44); `docs/ARCHITECTURE.md` | PROJECT-PRINCIPLES.md §5: "Specs delivered to Claude Code must be fully self-contained. No follow-up clarification during execution. The PR body is the authoritative spec reference." ARCHITECTURE.md §3: "Specs delivered to Claude Code must be self-contained (no follow-up clarification during execution). PR bodies contain the authoritative spec reference." |
| **9. Diagnose-Tool-Lifecycle** — wann Trace-Tools entfernt werden; Etappe-23-Pattern | Ja | `docs/audit/audit-pre-merge.md` §5.3; Commits `7333ec4`, `b53d7d6` | Audit §5.3: "Alle Etappe-23-Trace-Instrukcmentierungen wurden in Etappe 27 vollständig entfernt." Commit `7333ec4`: "chore: remove Etappe 23 trace instrumentation — The BATTLE_ZOOM name-tag position trace [...] was diagnostic scaffolding that identified the EditorShape staircase bug. Bug is fixed; instrumentation removed." Commit `b53d7d6`: "chore: delete diagnostic artefacts — Remove [...] all untracked Etappe 20-22 diagnostic files [...] All were one-shot diagnostic tools for the EditorShape staircase bug, now fixed." **Etappe-23-Pattern dokumentiert:** Diagnose-Instrumentierung wird in demselben Zug entfernt wie der zugehörige Bug gefixed wird (oder im unmittelbar folgenden Commit). |
| **10. Commit-Naming-Conventions** — `diag:`, `feat:`, `fix:`, etc. | Teilweise | Commit-Historie (konsistente Nutzung); `docs/TRACK_LIFECYCLE.md` Zeile 268 | TRACK_LIFECYCLE.md Z268: `chore: update default track snapshot with drawn geometries` als Beispiel-Commit. Commit-Historie zeigt konsistent: `feat:`, `fix:`, `fix(scope):`, `refactor:`, `chore:`, `docs:`, `diag:`. Kein dedizierter Abschnitt in PROJECT-PRINCIPLES.md der alle erlaubten Prefixes auflistet und deren Semantik erklärt. |

---

## 4. Etappen-Lessons-Sektion

### Etappe: Camera Phase 1 + EditorShape-Interpolation (Etappe 19–27, ca. Mai 2026)

**Commits:** `a36f138` bis `cf77972` (2026-05-12)

**Identifizierter Kern-Bug: "EditorShape-Doppelbild / Staircase"**

Der Bug `c8538e0` "fix: linear interpolation in EditorShape.getPosition() — eliminate staircase" schließt einen diagnostisch aufwendigen Prozess ab, der über mehrere Etappen lief:

- **Etappe 20–22:** Forensische Diagnose via Python-Frame-Analysis-Scripts (`analyse_frames.py`), Playwright-Frame-Capture-Spec (`etappe20-frame-capture.spec.js`), 20 erfasste PNGs, Diff-Image-Outputs. Alle später in Commit `b53d7d6` als Artefakte gelöscht.
- **Etappe 23:** Trace-Instrumentierung in `RaceScreen/index.jsx` — `recordTrace`, `_analyzeEtappe23Trace`, `_triggerEtappe23Download`, `etappe23TraceRef`. Quantitative Messung: 26.5–27.1 px Sprünge (bestätigt in `docs/diag/render-smoothness-measurements.md`). Entfernt in Commit `7333ec4`.
- **Root Cause (bestätigt durch Trace):** `Math.round()` in `EditorShape.getPosition()` bildete arc-length-t auf den nächsten Sample-Index ab → diskrete Treppenfunktion. Mit 500 Samples auf einem ~2000px-Oval bei Zoom 4× entstanden ~20px-Sprünge pro Racer-Position-Update.
- **Fix:** `Math.floor()` + fraktionaler Blend zwischen idx0 und idx1. Winkel-Wrap mit Shortest-Path-Interpolation. Winkel precomputed in `_precomputeAngles()`. +3 Smoothness-Regression-Tests.

**Lessons aus dieser Etappe (dokumentiert in LESSONS.md):**

- L50 (T-Parameter vs. Arc-Length): "T-Parameter-Gleichmäßigkeit ≠ Pixel-Gleichmäßigkeit. [...] Diagnose-Disziplin (L46): Vor dem Fix wurde eine Diagnostic-Messung mit 6 synthetischen Track-Shapes gemacht."
- L53 (Koordinatensystem-Dokumentation): "`scaledRacersForCam` liefert canvas-space Koordinaten. [...] Diagnostic-Log-Formeln müssen von den Pan-Formeln unabhängig sein — sonst sind sie Tautologien."
- L65 (Phantom-Probleme): Bisect auf einem Browser-State-Artefakt (Zoom ≠ 100%) fand kein schlechtes Commit. Kosten: mehrere verschwendete Bisect-Steps.
- L66 (Algebraischer Beweis): "`_computePanScale(zoom) = zoom × bsX` hätte sofort als falsch erkannt werden können."
- L67 (Baseline-Messung): Default-Werte für Camera-State-Trigger sind Hypothesen ohne Mess-Kalibrierung.
- **Etappe-23-Pattern** (nicht als Lesson benannt, aber als Workflow etabliert): Diagnose-Instrumentierung wird im selben oder direkt folgenden Commit nach Bug-Fix entfernt. Bestätigt in `docs/audit/audit-pre-merge.md` §5.3: "Alle Etappe-23-Trace-Instrumentierungen wurden in Etappe 27 vollständig entfernt."

---

### Etappe: Camera Director — Phase 4 (Timing Tunables + Plan-B Pan, PR #75, ca. 2026-05-06)

**Commits:** `8eb16e0` (Phase 4 Merge-PR), Diagnose-Commits `f7d69f3`–`876cefb` auf Branch `diagnosis/camera-tuning-effectiveness`

**Diagnose-Session 2026-05-06:** Vier Hypothesen (H1–H4) getestet. H2 bestätigt: `openTrackBaseZoom` wurde doppelt multipliziert — einmal in `_computeZoomLevels()`, einmal im Render-Pfad (`OPEN_TRACK_BASE_ZOOM = 1.5`). Effektiver Render-Scale auf Standard-Track bei BATTLE_ZOOM: 3.75× statt 2.5×.

**Lessons aus dieser Etappe (L53–L69 in LESSONS.md):**

- L54: Bauchgefühl "diese Formel macht zu viel" war das früheste Signal — wurde ignoriert, kostete Diagnose-Session.
- L55: `scaledRacersForCam` als canvas-space-Input war undokumentiert → falscher bsX-Doppelfaktor in Commit C.
- L56: Config-Schema v3 — Test-Fixtures hatten altes Schema, neue Features wurden nie durch Tests ausgeübt.
- L57: `battleMaxDuration` ohne Einheit-Suffix war mehrdeutig → Rename zu `battleMaxDurationMs`.
- L58: React StrictMode Double-Mount → zwei CameraDirector-Instanzen parallel.
- L59: Geteilte Instanz zwischen Tests → flaky tests durch State-Akkumulation.

---

### Etappe: Speed Pipeline Reform (PR-A1/A2, ca. 2026-05-03/04)

**Commits:** `9a154bc` (PR-A2-Diagnose merge), `228be94` (PR-A2.6 Race Dynamics merge)

**Diagnose-Ergebnis:** `SPEED_REFACTOR_ANALYSIS.md` (499 Zeilen) dokumentiert: Symptom-Fix PR-A1 erhöhte `maxScale` 4.0→10.0. PR-A2-Diagnose identifizierte den Architectural Gap: `openTrackFinishT` dividierte nicht durch `speedScaleFactor`. PR-A2 löste mit 3-Zeilen-Formel (`computeRaceBaseSpeed`) statt Konfigurations-Parameter.

**Lessons aus dieser Etappe:**

- L48: "Symptom-Fixes können als Stepping-Stone sinnvoll sein — aber ein Diagnose-Sprint vor der Implementierung verhindert Sackgassen."
- L49: Last-Finisher vs. Median-Racer Semantics bei duration-driven Speed. "Spec-Fehler-Lektion: Die Validierungszahlen der Spec widersprechen der Formel-Zeile im Spec-Text. Immer die Validierungszahlen gegen die Formel prüfen."
- L52: Periodic State Re-Rolls mit Smooth Transition — nur `spreadFactor` re-rollen, nicht `speedBonusMult`.

---

## 5. Lücken-Sektion

Die folgenden Workflow-Themen aus dem Cross-Check (Sektion 3) sind **nicht explizit als benannte Regel in PROJECT-PRINCIPLES.md dokumentiert**:

| Thema | Status | Befund |
|---|---|---|
| **Diagnose vor Lösung** (als named Workflow-Schritt) | Nicht dokumentiert als Prinzip | Kommt als implizite Lektion in L46/L48/L69 vor, aber kein Eintrag "Diagnose-vor-Lösung-Regel" in PROJECT-PRINCIPLES.md |
| **Mathematische/quantitative Diagnose** (als Pflicht-Schritt) | Nicht dokumentiert als Pflicht | Lessons beschreiben das Muster (L50, L66, L69), aber kein verbindliches "Magnitude berechnen vor Code" in PROJECT-PRINCIPLES.md |
| **Daten-Trace > visuelle Beobachtung** (als Vorzugsregel) | Nicht dokumentiert als Regel | Gelebte Praxis (L53, L67, diag:-Commits), aber kein named Prinzip |
| **Output-Medium-Regel** (HUD/Markdown statt console.log für persistente Diagnose) | Nicht dokumentiert als Regel | Phase-4 Diagnose-HUD war Deliverable; audit-pre-merge.md akzeptiert console.log in Diagnose-Tests — kein einheitliches Prinzip |
| **Anti-Hotfix** (als benannte Regel) | Nicht dokumentiert als Regel | L48 beschreibt Symptom-Fix vs. Architektur-Fix; kein Eintrag "Anti-Hotfix-Regel" in PROJECT-PRINCIPLES.md |
| **Tests-grün-Regel** (explizite Verpflichtung mit Zählangaben vor/nach Änderung) | Nicht dokumentiert als Regel | Test-Counts in Audit-Reports vorhanden; Lessons 1/8/17 thematisieren Test-Grenzen; kein named "Tests grün vor und nach jeder Änderung mit Counts" Prinzip |
| **Test-Anpassungs-Regel** (wann Tests modifiziert werden dürfen) | Implizit dokumentiert | D3-5-1-diagnose.md und L19 geben Orientierung, aber kein named Prinzip in PROJECT-PRINCIPLES.md |
| **Diagnose-Tool-Lifecycle** (Etappe-23-Pattern, als named Regel) | Implizit dokumentiert | Commit-Messages und audit-pre-merge.md belegen die Praxis; kein named "Diagnose-Instrumentierung-Lifecycle-Regel" |
| **Commit-Naming-Conventions** (vollständige Präfix-Liste mit Semantik) | Nicht dokumentiert | Praxis konsistent in Commit-Historie; einzelne Beispiele in TRACK_LIFECYCLE.md; keine vollständige Präfix-Tabelle mit erlaubten Werten und Semantik |

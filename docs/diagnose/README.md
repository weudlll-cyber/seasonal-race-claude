# docs/diagnose/ — Diagnose-Sprint-Index

Alle Diagnose-Sprints chronologisch. Jeder Eintrag benennt das Problem,
das Ergebnis, und welche Dateien die Messdaten enthalten.

---

## 2026-05-14 — Free-Lane Separation (PR #98, Sprint 1)

**Problem:** Racers overlapped visually at high densities. Home force pulled
overlapping racers back toward centerline instead of letting them separate.

**Methode:** Simulation-Trace über 1800 Frames, 20 Racer, dirt-oval.
Free-lane firing-rate und Richtungsverteilung gemessen.

**Ergebnis:** Free-lane-separation fires korrekt. Persistente Overlap-Clusters
identifiziert als Home-Force-dominiertes System — führte zu Sprint 2.

**Dateien:**
- [free-lane-separation-report.md](free-lane-separation-report.md) — Implementierungsbericht PR #98 (Free-Lane-Logik)
- [free-lane-firing-summary.md](free-lane-firing-summary.md) — Sprint-1-Messung: Firing-Rate, Framing
- [free-lane-firing-trace.ndjson](free-lane-firing-trace.ndjson) — Rohdaten (1800 Frames)

---

## 2026-05-14 — Free-Lane Force Attribution (PR #98, Sprint 2)

**Problem:** Trotz Free-Lane-Logic blieben Racer-Clusters persistent. Ursache
unklar — entweder Free-Lane feuert nicht, Home-Force überwältigt, oder beides.

**Methode:** Granulare Per-Force-Attribution pro Racer pro Frame. Jede Kraft-
Komponente (homeForce, avoidance, freeLane) separat gemessen und aufsummiert.

**Ergebnis:** Home-Force-Dominanz bestätigt — in Overlap-Situationen zog Home-Force
Racer zurück bevor Free-Lane trennen konnte. Fix: `homeForceReductionOnOverlap = 0.3`
reduziert Home-Force auf 30% während geometrischem Overlap.

**Dateien:**
- [free-lane-force-attribution-summary.md](free-lane-force-attribution-summary.md) — Analyse-Bericht mit Force-Breakdown
- [free-lane-force-attribution-trace.ndjson](free-lane-force-attribution-trace.ndjson) — Rohdaten (1800 Frames, per-force)
- [scripts/diag-free-lane-force-attribution.mjs](../../scripts/diag-free-lane-force-attribution.mjs) — Simulations-Script
- [scripts/diag-free-lane-force-attribution-summary.mjs](../../scripts/diag-free-lane-force-attribution-summary.mjs) — Aggregations-Script

---

## 2026-05-14 — Home-Force Reduction On Overlap (PR #98, Sprint 3)

**Problem:** Nach Sprint 2: Fix `homeForceReductionOnOverlap` implementieren und
verifizieren dass die Overlap-Clusters sich auflösen.

**Methode:** Implementierungsbericht mit Code-Delta, Validierungs-Tests, visueller
Verifikation durch User.

**Ergebnis:** `homeForceReductionOnOverlap: 0.3` als Default gesetzt. User hat
visuell bestätigt: Clusters lösen sich auf, Separation funktioniert.

**Dateien:**
- [home-force-reduction-report.md](home-force-reduction-report.md) — Implementierungsbericht

---

## 2026-05-14 — Relaxed Defaults (PR #97)

**Problem:** Standard-Defaults aus früherer Sprint-Phase waren zu konservativ —
Racer zu langsam, Re-Roll-Variation zu niedrig, Drafting zu stark.

**Methode:** Default-Wert-Analyse gegen beobachtetes Race-Feel. Keine neuen
Mechaniken, nur Wert-Anpassungen.

**Ergebnis:** 5 Default-Werte angepasst (Speed min/max, reRollVariationPercent,
draftingBoost, draftingMaxDistance). Getrennt in PR #97 (nicht PR #98).

**Dateien:**
- [relaxed-defaults-report.md](relaxed-defaults-report.md) — Änderungsbericht

---

## 2026-05-14 — Cleanup Audit PR #98

**Problem:** Vor Merge systematische Prüfung auf Code-Smells, UI-Konsistenz,
Test-Qualität, Security, Doku-Stand.

**Ergebnis:**
- 1 Bug gefunden: `homeForceReductionOnOverlap` in falschem DevScreen-Block (gefixt)
- 1 Language-Convention-Verletzung: deutscher Tooltip (gefixt)
- 0 Ghost-Tests, 0 Ghost-UI-Bindings, 0 Security-Issues
- Alle 18 Config-Felder 100% HOT (UI ↔ Backend vollständig verdrahtet)

**Dateien:**
- [cleanup-audit-pr98.md](cleanup-audit-pr98.md) — Vollständiger Audit-Bericht

---

## Ältere Sprints

Ältere Diagnose-Messungen aus Phase 4 (Camera-System, Render-Smoothness):

- [docs/diag/render-smoothness-measurements.md](../diag/render-smoothness-measurements.md) — Phase-4: Render-Smoothness-Messung (EditorShape staircase fix, Etappe 23)

# Relaxed Defaults Report

Date: 2026-05-14
Branch: claude/relaxed-defaults
Base commit: 47b10eff327aabd332d54af722ce79d7f6546df4

## 1. Vorher/Nachher-Tabelle

| Wert | Alt | Neu | Begründung |
|---|---:|---:|---|
| BASE_SPEED_MIN | 0.00091 | 0.00096 | Spread reduziert, Mittelwert bleibt gleich (0.001045). |
| BASE_SPEED_MAX | 0.00118 | 0.00113 | Spread reduziert, Mittelwert bleibt gleich (0.001045). |
| Spread berechnet ((max-min)/min) | 29.7% | 17.7% | Zielkorridor unter 15-18% getroffen (nahe oberem Ende, aber innerhalb). |
| reRollVariationPercent | 85 | 45 | In empfohlenem Bereich 35-50, weniger volatile Pulk-Neubildung. |
| draftingBoost | 1.10 | 1.04 | In empfohlenem Bereich 1.02-1.05, weniger pack-treibende Anziehung. |
| draftingMaxDistance | 110 | 80 | Kürzere Reichweite, Drafting wirkt lokaler statt großflächig. |

Hinweis zur Kegelbreite (draftingConeAngle):
- Unverändert bei 30.
- Bewertung: unklar, ob pauschale Reduktion auf 25 sofort sinnvoll ist, da dies stark strecken- und kameraabhängig wirkt.
- Vorschlag für A/B im visuellen Test (ohne Default-Entscheidung hier): 30 vs 25.

## 2. Status der drei ABSOLUTEN Regeln

- Regel #1 (keine neuen Konstanten): eingehalten.
  - Es wurden nur bestehende Defaults geändert.
  - Keine neue Mechanik, kein neuer Modus, keine neue Renn-Konstante eingeführt.
- Regel #2 (DevScreen Single Source of Truth): eingehalten.
  - Alle geänderten Werte bleiben über bestehende DevScreen-Slider einstellbar.
- Regel #3 (localStorage-Hinweis): eingehalten.
  - Neue Defaults greifen nur nach "Reset All Defaults", wenn alte localStorage-Werte vorhanden sind.

## 3. Visueller Test - Hinweise für User

Besonders beobachten:
- Werden Final-Lap-Stacks kleiner bzw. lösen sich häufiger auf?
- Entstehen weiterhin sichtbare Überholmanöver statt "ein Block"?
- Bleibt Race-Drama erhalten (Positionswechsel), ohne chaotische Neubildung großer Pulks?

Gutes Ergebnis:
- Weniger dauerhafte Überlagerungen in Mittel-/Spätphase.
- Drafting sichtbar, aber nicht als dominanter "Sammelmagnet".
- Rangwechsel vorhanden, aber weniger extremer Sprungcharakter.

Warnsignal:
- Große Mehrfach-Overlaps bleiben nahezu unverändert.
- Oder Rennen wirkt "zu statisch" ohne erkennbare Duelle.

## 4. Tuning-Empfehlungen falls visueller Test nicht überzeugt

Wenn Pulks immer noch zu groß sind:
- `draftingMaxDistance` weiter senken (z. B. 80 -> 70 -> 60).
- `reRollVariationPercent` weiter senken (z. B. 45 -> 40 -> 35).
- optional A/B: `draftingConeAngle` 30 -> 25.

Wenn Renn-Drama jetzt zu langweilig ist:
- `reRollVariationPercent` leicht erhöhen (z. B. 45 -> 50).
- `draftingBoost` leicht erhöhen (z. B. 1.04 -> 1.05).

Wenn Drafting zu schwach sichtbar ist:
- zuerst `draftingMaxDistance` leicht erhöhen (80 -> 90),
- danach ggf. `draftingBoost` minimal erhöhen (1.04 -> 1.05),
- `draftingConeAngle` zunächst unverändert lassen, dann A/B 30 vs 35.

## 5. PR-Status

- PR-Nummer: #97
- PR-URL: https://github.com/weudlll-cyber/seasonal-race-claude/pull/97
- Branch-Name: claude/relaxed-defaults
- Commit-SHAs:
  - fd50e98 (feat)
  - 437b494 (test)
  - 830af80 (docs)
  - 15a76fe (docs-fix)

## Test-Ergebnisse

- Pre-Test-Count: 94 Files, 1728 Tests, alle grün.
- Post-Test-Count: 94 Files, 1728 Tests, alle grün.
- Differenz: 0 neue Tests (nur Erwartungswerte für geänderte Defaults angepasst).

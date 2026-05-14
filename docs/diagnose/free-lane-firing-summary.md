# Free-Lane Firing Summary

Date: 2026-05-14T11:29:46.085Z
Branch: claude/free-lane-separation
Frames simulated: 1800
Track: dirt-oval (server/data/tracks/dirt-oval.json)
Racers: 20

Sim setup:
- Base speed defaults: min=0.00096, max=0.00113
- Dynamics default: reRollVariationPercent=58
- Behavior defaults: draftingBoost=1.04, draftingMaxDistance=80
- Track width (median geometric): 98px
- Sprite world size: 26.00px
- pathLengthPx: 3244.93

## Frage 1
Wie viele Frames hatten mindestens einen Overlap?

- Overlap-Frames: **1799 / 1800** (99.9%)

## Frage 2
Davon: in wie vielen Frames hat die Free-Lane-Logik gefeuert?

- Fired-Frames: **1799 / 1799** Overlap-Frames (100.0%)
- Aussage: Ausloesung ist meist aktiv; H1 ist nicht die Hauptursache.

## Frage 3
Branch-Verteilung bei gefeuerten Logik-Aufrufen

| Branch | Count | Anteil |
|---|---:|---:|
| both_left_only | 4057 | 32.6% |
| a_blocked_b_moves | 2918 | 23.5% |
| both_right_only | 2397 | 19.3% |
| both_free_geometry | 1217 | 9.8% |
| b_blocked_a_moves | 810 | 6.5% |
| a_geometry_b_single | 547 | 4.4% |
| a_single_b_geometry | 455 | 3.7% |
| opposite_single_sides | 30 | 0.2% |

## Frage 4
Delta vor/nach Clamp bei gefeuerten Aufrufen

- Durchschnitt |y-delta| vor Clamp (fired samples): **0.005439**
- Durchschnitt |y-delta| netto angewendet nach Clamp/Repulsion (fired samples): **0.005730**
- Verhältnis applied/pre: **1.054**
- Aussage: Keine dominante Clamp-Abwuergung sichtbar; eher Interaktionsproblem (H2).

## Frage 5
Bewegen sich ueberlappende Racer ueber mehrere Frames auseinander?

Metrik: fuer persistierende, gefeuert markierte Paare wird in Folgeframes geprueft, ob |dY| steigt.

- Verfolgte Pair-Transitions: **12373**
- Separation (|dY| steigt): **5278** (42.7%)
- Flat (|dY| unveraendert): **282** (2.3%)
- Aussage: Viele Paare trennen sich trotz Firing nicht stabil -> H2 dominiert.

## Hypothese-Auswahl

- Hauptursache: **H2**
- Begruendung: Free-Lane feuert haeufig, aber Separation in Folgeframes bleibt zu oft aus (Rueckzug/Neutralisierung durch andere Kraefte).

Priorisierung (qualitativ):
1. H2 (Haupttreiber)
2. H1/H3 (sekundaer je nach Szene)
3. H3

## Empfehlung naechster Schritt (kein Fix in dieser Aufgabe)

- Wenn H1: Triggerkriterium in longitudinaler/lateraler Overlap-Erkennung gegen visuelle Sprite-Overlap-Diagnose kalibrieren.
- Wenn H2: Konkurrenzkraefte im selben Frame als A/B-Diag isolieren (Free-Lane nur markieren, keine Wirkung) und Rueckzugsanteil quantifizieren.
- Wenn H3: Netto-Dämpfung durch Clamp/Repulsion in kontrolliertem Sim-Case mit festen Paaren messen (gleiche Inputs, variable maxLateral).

## Sim-Grenzen

- Sim reproduziert Race-Loop-Physik (t-Update, Re-Roll, Positionsberechnung, applyRacerBehavior), aber ohne Canvas/React/Camera Side-Effects.
- Visuelle Wahrnehmung (Sprite-Silhouette vs. physische Y-Hitbox) kann im Browser trotzdem leicht abweichen.

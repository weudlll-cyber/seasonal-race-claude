Kamera-States und Event-Trigger — Konzept (Stand 15.5. Nachmittag)

Diese Übersicht beschreibt das angestrebte Verhalten der Kamera-Stages 
und das Event-Trigger-System, das zwischen ihnen wechselt. Sie dient 
als Referenz für die Specs der kommenden Sessions. Beschreibt was und 
warum, nicht wie und mit welchem Code.

============================================================
STATES
============================================================

COUNTDOWN
---------
Funktion: Spannung aufbauen vor Rennstart.
Verlauf: Beginnt mit der ganzen Strecke sichtbar, zoomt während des 
Countdowns langsam auf den Start-Pulk rein. Bei RACING-Beginn ist die 
Kamera bereits auf Pulk-Distanz.
Endpunkt-Zoom: in Welt-Pixeln Sprite-Größe, DevScreen-konfigurierbar.
Dauer: DevScreen-konfigurierbar, Default 4000ms.
Anschluss: Geht nahtlos in OVERVIEW über (Anfangs-Zoom von OVERVIEW = 
Endpunkt-Zoom von Countdown).
UI: Bestehender Countdown-Text (3, 2, 1, GO) bleibt erhalten, wird aber 
nicht mehr groß in der Bildmitte angezeigt, sondern dezent am Rand 
(z.B. oben rechts) damit Sprites und Namens-Tags der Spieler sichtbar 
bleiben.


OVERVIEW
--------
Funktion: Räumlicher Überblick und Atempause. Zeigt das aktuelle 
Renngeschehen mit der Spitze klar im Bild und dem Feld dahinter 
sichtbar.
Pan-Logik: Folgt dem Führenden, wie LEADER.
Komposition: Der Führende ist radial vom Track-Mittelpunkt weg an den 
Bildrand verschoben, sodass hinter ihm möglichst viel vom restlichen 
Feld sichtbar wird. Auf einem Oval wandert dieser Bildrand entsprechend 
der Position auf dem Track mit (oben/rechts/unten/links).
Backlog: Die saubere fahrtrichtungs-treue Komposition mit Kamera-
Rotation auf Closed Tracks bleibt als spätere Erweiterung notiert. 
Aktuelle Variante ist der einfachere Offset-Ansatz.
Zoom: Größer (weiter rausgezoomt) als LEADER, DevScreen-konfigurierbar. 
Anfangs-Zoom = Countdown-End-Zoom.
Offset-Stärke: DevScreen-konfigurierbar in Welt-Pixeln.
Dauer: DevScreen-konfigurierbar.
Einblende-Text: Erste Sekunden, unten Mitte, halbtransparent.


LEADER_ZOOM
-----------
Funktion: Hier vorne wird das Rennen entschieden. Hauptarbeitspferd der 
Kamera.
Komposition: Wie aktuell implementiert — Führender mit Lead-Ahead, 
sodass freier Track vor ihm sichtbar ist und er ins Bild reinläuft.
Zoom: DevScreen-konfigurierbar.
Bei Führungswechsel: Weicher Lerp-Übergang zum neuen Führenden.
Dauer: DevScreen-konfigurierbar.
Einblende-Text: keiner (Default-Zustand).


BATTLE_ZOOM
-----------
Funktion: Hier wird gerade um eine wichtige Position gekämpft — dichter 
Pulk mit Bewegung.
Trigger: Mindestens 3 Racer dicht beisammen, deren Vorderster auf einem 
Top-10-Platz steht. Zusätzlich aktive Bewegung im Pulk 
(Geschwindigkeitsunterschiede, Positionswechsel passieren oder stehen 
bevor).
Pulk-Dichte-Schwelle: T-Space-Abstand, DevScreen-konfigurierbar.
Bewegungs-Erkennung: DevScreen-konfigurierbar (Speed-Unterschied / 
Positionswechsel-Rate).
Komposition: Wie LEADER mit Lead-Ahead — der Vorderste des Pulks vorne 
im Frame, dahinter die anderen Pulk-Mitglieder sichtbar.
Bei mehreren validen Pulks: Gewichtete Auswahl nach Pulk-Größe, Enge 
und jüngster Action — höchste Punktzahl gewinnt.
Bei Führungswechsel innerhalb des Pulks: Weicher Lerp auf den neuen 
Vordersten, gleicher Pulk bleibt im Fokus.
Zoom: DevScreen-konfigurierbar.
Dauer: DevScreen-konfigurierbar, ABER Auflösung des Pulks (Dichte 
unterschreitet Schwelle) darf die Mindest-Dauer overrulen — Kamera 
wechselt sofort weg.
Einblende-Text: Erste Sekunden, unten Mitte. Beispiele: 
"Spannendes Rennen um Platz X mit Y Fahrern", "Y Fahrer kämpfen um 
Platz X", "Heißer Pulk auf Platz X". Templates werden später definiert.


COMEBACK_ZOOM
-------------
Funktion: Underdog-Story — Schaut, da kommt einer von hinten.
Trigger: Racer, dessen aktuelle Position deutlich besser ist als sein 
tiefster Punkt im bisherigen Rennen. Schwellenwerte für "deutlich 
besser" sowie für "weit hinten" und "nah genug an Top X" sind 
DevScreen-konfigurierbar.
Bei mehreren Kandidaten: Derjenige mit den meisten gutgemachten 
Plätzen gewinnt.
Komposition: Wie LEADER mit Lead-Ahead — Comeback-Racer vorne im 
Frame, vor ihm freier Track.
Zoom: DevScreen-konfigurierbar.
Dauer: DevScreen-konfigurierbar, ABER wenn der Comeback-Racer wieder 
deutlich langsamer wird oder Plätze verliert, darf das die Mindest-
Dauer overrulen — Kamera wechselt sofort weg.
Einblende-Text: Erste Sekunden, unten Mitte. Beispiele: 
"Comeback! [Name] holt Plätze auf", "[Name] kämpft sich nach vorne", 
"Aufholjagd von [Name]". Templates werden später definiert.


ENDPHASE
--------
Funktion: Würdigung des Siegers und Ausklang bis zum Winnerscreen.
Trigger: Sieger erreicht definierte Restdistanz zum Ziel — Default 5%, 
DevScreen-konfigurierbar.
Phase 1: Normaler LEADER_ZOOM auf den Sieger, Default 2 Sekunden, 
DevScreen-konfigurierbar.
Phase 2: Normaler OVERVIEW-State, bleibt aktiv bis alle Racer im Ziel 
sind.
Ende: Wechsel zum Winnerscreen sobald letzter Racer im Ziel.
Einblende-Text: Keiner — der Winnerscreen übernimmt die Sieger-
Würdigung.


============================================================
EVENT-TRIGGER-SYSTEM
============================================================

Auswahl-Mechanik:
Das System bewertet permanent die Punktzahl jedes Kamera-States. Die 
Punktzahl entsteht aus mehreren Faktoren:
- Verfügbarkeit (ist der State überhaupt sinnvoll möglich?)
- Dramatik (wie spannend ist die Situation?)
- Zeit-Bonus (wie lange wurde der State nicht mehr gezeigt?)
- Aktualität (wie frisch ist die Situation?)

Im DevScreen werden pro State die zwei wichtigsten Faktoren exposed, 
der Rest bleibt fix. Bei mehreren validen Kandidaten erfolgt gewichtete 
Zufallswahl nach Punktzahl.

Wann wird neu entschieden:
- Am Ende jedes States, nach Erreichen der Mindest-Dauer.
- Sofortige Re-Auswahl bei State-Auflösung (BATTLE-Pulk löst sich auf, 
  COMEBACK stockt) — Mindest-Dauer wird in diesen Fällen unterbrochen.

Garantien und Override-Regeln:
- COUNTDOWN läuft beim Spielstart, kein Wettbewerb mit anderen States.
- ENDPHASE überschreibt alles ab definierter Restdistanz zum Ziel.
- OVERVIEW als Fallback: Wenn kein anderer State valide ist, kommt 
  immer OVERVIEW. OVERVIEW geht immer.
- OVERVIEW als Frequenz-Garantie: Spätestens alle X Sekunden muss 
  OVERVIEW gezeigt werden (harte Regel, DevScreen-konfigurierbar).
- Niemals zweimal hintereinander der gleiche State.
- Erste Sequenz nach Countdown ist OVERVIEW → garantiert LEADER 
  (kein direkter Sprung in BATTLE oder COMEBACK).

Pro State im DevScreen einstellbar:
- Mindest-Dauer
- Maximum-Dauer (damit kein State unendlich lang dranbleibt)
- Die zwei wichtigsten Gewichtungs-Faktoren

Dramatik-Anpassung an Rennphase:
- Keine Anfang/Mitte/Ende-Differenzierung — durchgehend gleiche 
  Gewichtung.


============================================================
QUERSCHNITTSFEATURE: EINBLENDE-TEXT
============================================================

Position: Unten Mitte, halbtransparent, sodass das Renngeschehen 
dahinter sichtbar bleibt.
Dauer: Erste Sekunden des States, dann ausblenden. DevScreen-
konfigurierbar.
Betroffene States: OVERVIEW, BATTLE, COMEBACK.
Nicht betroffen: COUNTDOWN (eigenes UI), LEADER (Default-Zustand), 
ENDPHASE (Winnerscreen folgt).

Text-Pools: Jeder State hat eine Liste von Templates mit Variablen 
(Position, Anzahl, Name). Zufällige Auswahl bei jedem State-Eintritt 
verhindert Repetition.
Templates werden vor der Implementierung gemeinsam definiert 
(Vorschläge von CC oder Plan-Claude).


============================================================
OFFEN / BACKLOG
============================================================

- Fahrtrichtungs-treue OVERVIEW-Komposition auf Closed Tracks 
  (Kamera-Rotation oder dynamischer radialer Offset mit Kurven-
  Antizipation). Aktuell ist nur der einfachere radiale Offset 
  implementiert geplant.
- Text-Pool-Templates für OVERVIEW, BATTLE, COMEBACK werden vor der 
  ersten Spec mit Einblende-Text-Logik konkret formuliert.
- fot=0.0000-Logging-Bug aus der Konvergenz-Analyse vom 15.5. ist noch 
  offen, separater PR nach den hier dokumentierten State-Themen.
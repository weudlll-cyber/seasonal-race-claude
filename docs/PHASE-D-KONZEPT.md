# Phase D — Konzept: Brands + Racer serverseitig

**Stand:** master HEAD `0dda9db` · erstellt 2026-06-14 · Autor: Plan-Claude
**Zweck dieses Dokuments:** Fertiges Konzept für Phase D, strukturiert für einen **unabhängigen Copilot-Gegencheck**. Jede technische Behauptung ist mit einer Quell-Referenz versehen (Datei[:Zeile]). Entscheidungspunkte für den Owner sind explizit markiert. Es ist KEINE Implementierungs-Spec — die einzelnen CC-Blöcke (D1, D2, …) entstehen erst nach Owner-Entscheidungen.

> **GRUNDREGEL #0 (prüfen statt glauben):** Alle „IST"-Aussagen unten wurden am 14.6. gegen `origin/master @ 0dda9db` verifiziert. Copilot soll sie NICHT übernehmen, sondern gegen die Quelle prüfen und Abweichungen melden.

> **✓ COPILOT-GEGENCHECK (14.6.):** Copilot hat unabhängig gegen die Live-Source geprüft und die gesamte Faktenbasis (§2–§6) **ohne Widerspruch bestätigt**. Ergänzungen daraus sind unten eingearbeitet: vollständigere Konsumenten-Listen (§6) und das hochgestufte „stiller Horse-Fallback"-Risiko (§8 Invariante 2, §9 E7).

> **✓ COPILOT-RE-CHECK #2 (14.6., nach Default-Modell/Promote-Export/E1–E3):** Punkte 1–7 OK (Track-Default-Mechanik, Bild-als-Datei-Muster, Player-Gruppen, Gating, isDefault-Trennung, Async-Risiko, base64→Datei-Migration — alle code-belegt). Zwei Lücken gefunden und eingearbeitet: (a) `SystemSettings`-Reset-Pfade (Z.87/88) schreiben Branding+Gruppen lokal → müssen mitmigriert werden (§8 Invariante 10); (b) `racearena:racerTypeOverrides` (Racer-Tuning) bleibt lokal → **bewusst NICHT in Phase D** (Tuning ≠ Inhalt), als Entscheidungspunkt **Er** markiert.

---

## 1. Ziel

Brands (Branding-Profile), Racer (benutzererstellte Racer-Typen) **und Player-Gruppen (gespeicherte Teilnehmer-Namenslisten)** werden **serverseitig** persistiert — nach demselben „Defaults + User-Layer"-Muster wie Strecken. Heute liegen alle drei **nur im localStorage** des Browsers, d. h. sie sind:
- nicht zwischen Geräten/Nutzern geteilt,
- gehen bei Cache-Clear verloren,
- pro Browser isoliert.

Nach Phase D sind sie installationsweit persistent, über die authentifizierte API les-/schreibbar und über das vorhandene Rollen-/Gating-System geschützt.

---

## 2. Referenzmodell (verifizierter IST-Zustand) — die Blaupause

### 2.1 Strecken — `server/src/routes/tracks.js` (786 Z.)
- **In-Memory-Map + per-File-JSON:** `loadAllTracks()` liest beim Boot alle `*.json` aus `DATA_DIR = server/data/tracks/` in eine `Map id→record` (`tracksMap`). Quelle: `tracks.js:73-87`.
- **Schreiben atomar:** `atomicWriteJson(join(DATA_DIR, '<id>.json'), record)` aus `../../utils/atomicWriteJson.js`. Quelle: `tracks.js:23, 441, 654, 683`.
- **Default-Seeding idempotent:** `DEFAULT_TRACK_SEEDS` (Array, jeder Eintrag `isDefault:true`) wird beim Boot via `migrateDefaultTracks()` in den Store geschrieben — pro Seed nur, wenn `!tracksMap.has(seed.id)`. Marker-Datei `server/data/.tlh1-defaults-migrated`. Quelle: `tracks.js:89-251, 424-447, 585`.
- **Routen:** `GET /` (Summaries via `toSummary`), `GET /:id`, `GET /:id/background`, `POST /` (setzt `isDefault:false`), `PUT /:id` (übernimmt `isDefault: existing.isDefault`), `DELETE /:id` (→ **403**, falls `track.isDefault`), `DELETE /:id/background`, `POST /:id/background` (multer + Magic-Byte-Validierung `detectMagicType`). Quelle: `tracks.js:592-786`.
- **Validierung:** `validateTrackBodyForCreate` / `validateTrackBodyForUpdate`. Quelle: `tracks.js:456-583`.

### 2.2 Surface-Classes — `server/src/routes/surfaceClasses.js` (178 Z.)
- Gleiches Muster (`loadAll()` → `classesMap`, `atomicWriteJson`, per-File-JSON), aber **wertbasiert ohne Binärdaten** → das einfachere, passendere Template für **Brands** und **Racer-Configs**.
- Kennt `isDefault` **und** `isOverride` (Defaults überschreibbar als Override-Records). Quelle: `surfaceClasses.js:13, 119, 155`.
- `validateBody(body)` gibt ein **Fehler-Array** zurück (leer = valide). Quelle: `surfaceClasses.js:64-87`.
- Routen: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`. Quelle: `surfaceClasses.js:92-178`.

### 2.3 Gating — `server/src/auth/guards.js` + `server/src/app.js`
- **Default = operator+** (jeder authentifizierte User). `ROUTE_POLICY`-Einträge **heben** einzelne Routen auf `admin`. Quelle: `guards.js:22-37`.
- Einträge heute: `/api/users` (alle Methoden) → `admin`; `/api/surface-classes` **Mutationen** (POST/PUT/DELETE/PATCH) → `admin`, GET bleibt operator+. Quelle: `guards.js:23-36`.
- **`/api/tracks` steht NICHT in ROUTE_POLICY → operator+ für ALLE Methoden** (inkl. anlegen/bearbeiten/löschen). Verifiziert: kein tracks-Eintrag in `ROUTE_POLICY`.
- `requireAdmin` erzwingt NUR die `admin`-Einträge der Policy; alles andere ist mit gültiger Session erlaubt. Quelle: `guards.js:createRequireAdmin ~96-110`.
- Mount-Reihenfolge: `requireAuth` → `requireAdmin` global, dann `/api/auth`, `/api/users`, `/api/tracks`, `/api/surface-classes`. Quelle: `app.js:26-42`.

**Folgerung für Phase D:** Eine neue Route ist standardmäßig operator+. Will man sie admin-only, fügt man einen `ROUTE_POLICY`-Eintrag hinzu (wie bei surface-classes). Das ist der eine Hebel.

---

## 3. Client-IST-Zustand (zu migrieren)

### 3.1 Racer — `client/src/modules/racer-types/`
- **Built-ins sind hartkodierter Code, keine Daten:** `RACER_TYPES` (Objekt) + `RACER_TYPE_IDS`. Jeder Built-in ist eine Verhaltens-/Animationsklasse (z. B. `HorseRacerType`). Quelle: `index.js:85-108`.
- **Benutzererstellte Typen liegen im localStorage:** Key `racearena:racerTypes:v1`, reine Config-Objekte. `loadStoredRacerTypes` / `saveStoredRacerType` / `deleteStoredRacerType`. Pflichtfelder inkl. **`spriteDataUrl` (base64 Data-URL)**, `coats[]`, `primaryColor`, `frameCount`, `basePeriodMs`, `displaySize`, `trailStyle`, `emoji`, `name`, `id`. Quelle: `racerTypeStorage.js:11-24, 31-90`.
- **Boot-Merge:** `_initLoadedRacerTypes()` lädt beim Modul-Load aus localStorage in das interne `_loadedRacerTypes` (baut SpriteRacerType-Instanzen). Quelle: `index.js:143-144, 397-420, 454`.
- **Öffentliche, stabile API (Merge built-in + loaded):** `listAllRacerTypes()`, `getRacerType(id)` (Fallback-Kette `RACER_TYPES[id] ?? _loadedRacerTypes[id] ?? HorseRacerType`), `registerRacerType(config)` → `saveStoredRacerType`, `removeRacerType(id)`. Quelle: `index.js:175-181, 273, 423-454`.
- **Benutzererstellte Racer haben KEIN `isCustom`-Flag** — architektonisch identisch zu Built-ins (NICHT ANFASSEN-Liste).
- **Konsument:** `filterRacerTypesForTrack(racerTypes, trackSurfaceClasses, getRacerClassesFn)` nimmt die Liste aus `listAllRacerTypes()`. Quelle: `surface-effects/registry.js:114-119`.

### 3.2 Brands — `client/src/screens/DevScreen/sections/BrandingProfiles.jsx`
- **Speicher:** localStorage-Key `racearena:branding` (`KEYS.BRANDING`), ein **Array von Profil-Objekten**, via `useStorage`/`storageGet`/`storageSet`. Quelle: `storage/storage.js:13`, `BrandingProfiles.jsx:32`, `App.jsx:34`, `RaceScreen/index.jsx:198`, `SetupScreen.jsx:158`.
- **Profil-Felder:** `id`, `name`, `eventName`, `subtitle`, `sponsorText`, **`logo` (base64 Data-URL)**, `logoMaxHeight`, `logoOpacity`, `logoCorner`, `primaryColor`, `isDefault` (via „set default"), `showSponsor`/Sponsor-Toggle. Quelle: `BrandingProfiles.jsx:18-28, 53-90`.
- **Aktives Profil pro Session:** `activeSession.activeBrandingProfileId`; Wechsel feuert `CustomEvent('racearena:brand-active')`. Quelle: `SetupScreen.jsx:161-182, 498-524`, `App.jsx:47-54`.

### 3.3 Player-Gruppen — `client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx` (NACHTRAG 14.6.)
- **Was es ist:** gespeicherte Teilnehmer-Namenslisten („Klasse 4B" + N Namen), per Klick ladbar → Racer werden zugewiesen → Setup.
- **Speicher:** localStorage-Key `racearena:playerGroups` (`KEYS.PLAYER_GROUPS`), **Array von `{ id, name, players: string[] }`**. `DEFAULT_PLAYER_GROUPS = []` (KEINE ausgelieferten Defaults). Quelle: `storage/storage.js:10`, `defaults.js:195`, `PlayerGroupsManager.jsx:22, 39-44`.
- **CRUD im DevScreen** via `useStorage` (anlegen/bearbeiten/löschen + Komma-Import). Quelle: `PlayerGroupsManager.jsx:34-58`.
- **Laden:** `assignRacers(group.players)` → schreibt `KEYS.ACTIVE_GROUP` (`racearena:activeGroup`), `SetupScreen` liest es beim Mount und löscht es danach. Quelle: `PlayerGroupsManager.jsx:66-68`, `SetupScreen.jsx:189-191`.
- **Einfachster Fall von allen drei:** reine Textdaten, KEINE Bilder, KEIN async-Boot-Problem, KEINE Built-in-Defaults. `ACTIVE_GROUP` ist transient (Übergabe-Kanal) und bleibt clientseitig — nur `PLAYER_GROUPS` (die gespeicherten Gruppen) wandert auf den Server.
- **Server-Design:** `server/data/player-groups/<id>.json`, In-Memory-Map, `atomicWriteJson`; Router `/api/player-groups` (GET/POST/PUT/DELETE), Validierung (name nicht-leer, players nicht-leeres String-Array, Längen-Caps). `isDefault` optional (Entscheidungspunkt **Eg**). Template: `surfaceClasses.js`.
- **Client-Refactor:** `playerGroupApi.js`; `PlayerGroupsManager.jsx` liest/schreibt künftig vom Server statt `KEYS.PLAYER_GROUPS`; `ACTIVE_GROUP`-Mechanik bleibt unverändert (rein lokal). Migration (E4) analog Brands. **MITZIEHEN (Copilot #2):** `SystemSettings.jsx:87` setzt beim Reset `DEFAULT_PLAYER_GROUPS` in den localStorage zurück — dieser Pfad muss auf den Server umgestellt werden, sonst reaktiviert ein Reset die alte lokale Quelle.

---

## 4. Zentrale architektonische Klärung (Racer ≠ Strecken!)

> **Wichtigster Punkt für den Gegencheck.** Bei Strecken sind ALLE Records (auch Defaults) Server-Daten. Bei **Racern geht das NICHT**: Built-ins sind Verhaltens-/Animations-**Klassen im Code** (`HorseRacerType` etc.), nicht als reine Daten darstellbar. **Daher:**
> - **Racer-„Defaults" bleiben im Client-Code** (`RACER_TYPES`), unverändert.
> - **Nur benutzererstellte Racer-Configs** (reine Daten + Sprite) wandern serverseitig.
> - Der Server kennt also **keine** Racer-Defaults und kein Default-Seeding für Racer.
> - „Defaults + User-Layer" heißt für Racer: **Defaults = Code-Layer, User-Layer = Server** (statt localStorage).
>
> Für **Brands** gilt das nicht — Brand-Profile sind reine Daten; hier ist ein optionales Default-Seeding (wie bei Strecken) möglich (Entscheidungspunkt E5).

---

## 5. Vorgeschlagenes Server-Design

### 5.1 Brands (Template: surfaceClasses, wertbasiert)
- **Store:** `server/data/brands/<id>.json`, In-Memory-`Map`, Boot-Load, `atomicWriteJson`.
- **Router** `server/src/routes/brands.js`, gemountet als `/api/brands` in `app.js`:
  - `GET /` (Liste), `GET /:id`, `POST /` (`isDefault:false`), `PUT /:id` (bewahrt `isDefault`), `DELETE /:id` (403 falls `isDefault`).
- **Validierung:** Fehler-Array-Stil wie `surfaceClasses.validateBody`; Felder gemäß 3.2; Längen-/Typ-Caps; `logoCorner ∈ {…}`; `logoOpacity ∈ [0,1]`.
- **Logo (E3 = eigene Datei):** als separate Bilddatei unter `server/data/brand-logos/` gespeichert (Upload-Endpunkt + Magic-Byte-Validierung wie Track-Backgrounds); der Brand-Record speichert nur den Dateinamen, nicht das Bild. JSON bleibt klein.

### 5.2 Racer (Template: surfaceClasses + Validierung wie racerTypeStorage)
- **Store:** `server/data/racers/<id>.json`, In-Memory-`Map`, Boot-Load, `atomicWriteJson`.
- **Router** `server/src/routes/racers.js`, gemountet als `/api/racers`:
  - `GET /` (alle benutzererstellten Configs), `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`.
- **Kein** Default-Seeding (siehe §4). Server speichert ausschließlich die User-Configs.
- **Validierung:** Pflichtfelder + ID-Format wie `racerTypeStorage._validateConfig` (`REQUIRED_FIELDS`, kein Whitespace in `id`, **Kollision mit Built-in-IDs verboten** — die Built-in-ID-Liste muss serverseitig bekannt sein, Entscheidungspunkt **E6**), `coats` nicht-leer.
- **Sprite (E3 = eigene Datei):** der `spriteDataUrl` wird als separate Bilddatei unter `server/data/racer-sprites/` abgelegt (Upload + Magic-Byte-Validierung wie Track-Backgrounds); der Racer-Record speichert nur den Dateinamen. Vermeidet das 1-MB-`express.json`-Limit bei 16-Frame-Spritesheets.

### 5.3 Gating (ROUTE_POLICY)
- Standard (kein Policy-Eintrag) = **operator+**, wie Strecken. Entscheidungspunkt **E2** legt fest, ob Brands/Racer-Mutationen operator+ (Präzedenz: Strecken) oder admin (Präzedenz: surface-classes ADVANCED) sind.

---

## 6. Vorgeschlagener Client-Refactor (minimaler Blast-Radius)

**Leitprinzip:** Die **öffentlichen APIs stabil halten**, nur die **Datenquelle** dahinter von localStorage auf Server umstellen.

### 6.1 Brands
- Neuer Service `client/src/services/brandApi.js` (spiegelt `usersApi.js`/`surfaceClassApi.js`: geteilter `apiClient`, `encodeURIComponent` auf `:id`).
- Die Lese-/Schreib-Stellen beziehen Profile künftig vom Server statt aus `KEYS.BRANDING`. Profil-Form bleibt identisch → Render-Logik der Konsumenten unverändert. **Vollständige Konsumenten-Liste (Copilot-verifiziert, ALLE müssen mitgezogen werden, sonst bleibt die alte Quelle faktisch aktiv):** `App.jsx:34`, `RaceScreen/index.jsx:197`, `SetupScreen.jsx:158`, `ResultScreen`, `modules/branding/useActiveBrandProfile.js:15`, `BrandingProfiles.jsx:32` (CRUD) und `SystemSettings.jsx:88` (schreibt `DEFAULT_BRANDING`).
- `BrandingProfiles.jsx` CRUD ruft `brandApi` statt `storageSet`.

### 6.2 Racer
- Neuer Service `client/src/services/racerApi.js`.
- **`_loadedRacerTypes` wird künftig aus dem Server befüllt** (statt `loadStoredRacerTypes()` aus localStorage). `_initLoadedRacerTypes()` wird async / lazy (Boot lädt Server-Configs). **`listAllRacerTypes()`/`getRacerType()` behalten ihren Vertrag** (built-in + user gemerged) → Konsumenten bleiben unverändert. **Konsumenten-Liste (Copilot-verifiziert):** `SetupScreen.jsx:231/263`, `RaceScreen/index.jsx:416`, `TrackManager.jsx:556`, `RacerManager.jsx:37`.
- `registerRacerType`/`removeRacerType` schreiben künftig via `racerApi` statt localStorage.
- **⚠ HAUPTRISIKO (Copilot-hochgestuft):** `getRacerType(id)` fällt bei unbekannter ID **still auf `HorseRacerType` zurück** (`index.js:175-181`). Eine unvollständige Migration oder ein async-Boot-Timing-Fehler würde daher **NICHT crashen**, sondern lautlos den falschen Racer (Pferd) rennen lassen — eine Browser-Augenprobe könnte das übersehen. D4 braucht deshalb (a) einen expliziten Loading-/Ready-Zustand, bevor Race/Setup Racer lesen, und (b) einen Test/Diagnose, der den stillen Fallback sichtbar macht (z. B. „unbekannte ID → definierter Fehler/Warnung statt stillem Horse").
- **Offene Frage (E7):** `_initLoadedRacerTypes()` ist heute synchron beim Modul-Load (`index.js:456`), ebenso `warmUpAllRacerTypes()`. Server-Laden ist async → die Initialisierungs-Reihenfolge (Race-Screen darf erst nach geladenen Racern starten) muss sauber gelöst werden. Das ist der heikelste Teil von Phase D und braucht eine eigene, sorgfältige Spec.

---

## 7. Migration bestehender localStorage-Daten (Entscheidungspunkt E4)
Bestehende Nutzer haben Racer/Brands im Browser. Optionen:
- **(a) Auto-Migration einmalig:** Beim ersten authentifizierten Load nach Phase D vorhandene localStorage-Einträge in den Server hochladen (idempotent, Marker pro Installation), dann localStorage als Quelle abschalten.
- **(b) Manueller Import-Button** in den jeweiligen Verwaltungs-UIs.
- **(c) Frischer Start:** localStorage-Daten verwerfen (nur akzeptabel, wenn der Owner bestätigt, dass nichts Wertvolles drin ist).

**Risiko bei (a):** Doppel-Import / ID-Kollision; muss idempotent + kollisionssicher sein (Built-in-IDs! siehe E6).

---

## 8. Invarianten (müssen über Phase D erhalten bleiben)
1. **Built-in-Racer (`RACER_TYPES`) bleiben unverändert im Code** — keine Verhaltens-/Animationsänderung; kein `isCustom`-Flag eingeführt.
2. **`listAllRacerTypes()` / `getRacerType()` behalten ihren Vertrag** (built-in + user gemerged, Fallback auf Horse) → Konsumenten (insb. `surface-effects/registry.js`, `SetupScreen`, `RaceScreen`, `TrackManager`, `RacerManager`) unangetastet. **ABER:** der Horse-Fallback ist STILL — eine Lücke äußert sich als „falscher Racer rennt", nicht als Fehler. D4 muss diesen Fallback während/nach Migration sichtbar/abgesichert machen (Loading-Gate + Diagnose).
3. **Brand-Profil-Form bleibt identisch** → bestehende Lese-Stellen (`App`, `RaceScreen`, `SetupScreen`) funktionieren ohne Anpassung der Render-Logik.
4. **`isDefault`-Semantik** (für das, was als Default existiert): Defaults nicht löschbar (403), Edits bewahren `isDefault` — analog Strecken.
5. **Server bleibt Enforcement (deny-by-default):** neue Routen exakt auf dem in E2 entschiedenen Rollen-Level; GET ggf. operator+, Mutationen ggf. admin.
6. **Persistenz-Disziplin wie Strecken:** In-Memory-Map + Boot-Load + `atomicWriteJson`; Track-/Class-Pfade nie hartkodiert dupliziert (eine Quelle, L129).
7. **Bild-/Sprite-Speicherung = eigene Dateien (ENTSCHIEDEN E3=A):** Logos/Sprites als separate Bilddateien (`brand-logos/`, `racer-sprites/`) mit Upload-Endpunkt + Magic-Byte-Validierung + Größen-Cap wie Track-Backgrounds; JSON-Records speichern nur Dateinamen und bleiben klein → kein 1-MB-`express.json`-Problem. Migration muss bestehende base64-localStorage-Bilder in Dateien umwandeln.
8. **Keine Secrets/PII** — Brands/Racer sind nicht-sensible Inhalte.
9. **Sharing-Semantik ändert sich bewusst:** Server-Brands/Racer sind **installationsweit** sichtbar (vorher pro Browser). Muss gewollt sein (E1-nah, siehe E-Liste).
10. **Reset-Pfade mitziehen (Copilot #2):** Jeder Pfad, der einen migrierten Typ in den localStorage zurücksetzt (insb. `SystemSettings.jsx:87` Player-Gruppen, `:88` Branding), muss auf den Server umgestellt werden — sonst reaktiviert ein „Zurücksetzen" die alte lokale Quelle und erzeugt gemischte Datenquellen. Teil des jeweiligen Client-Schritts.

---

## 9. Entscheidungspunkte für den Owner (VOR der ersten Spec)

**Bereits vom Owner bestätigt (14.6.) — EINHEITLICHES DEFAULT-MODELL für alle 4 Typen (Strecken, Racer, Brands, Gruppen):**
- **Paket bringt Defaults mit:** 10 Strecken + 20 Racer + **≥1 Marke + ≥1 Beispiel-Gruppe** (vom Owner authored, ausgeliefert). Fresh-Install ist für keinen Typ leer.
- **Einheitliche Lösch-Regel:** Was Default ist (`isDefault:true`), kann NIEMAND direkt löschen (403) — identisch für alle 4 Typen. Selbst-Gebautes ist `isDefault:false` und voll löschbar.
- **`isDefault` ist ADMIN-setzbar** (nicht via normalem PUT/Operator). Operator: eigene Nicht-Default-Inhalte anlegen/löschen, Defaults weder löschen noch setzen. Admin: zusätzlich Default-Häkchen setzen (promote) / wegnehmen (demote → dann löschbar) + als Seed exportieren.
- **Promote-to-Default + Export-als-Seed = Teil von Phase D (Owner-Wahl Variante 2):** in jeden Typ-Schritt mitbauen, NICHT nachgelagert. Deckt auch die bestehenden **Strecken** ab (Owner-Schmerzpunkt). Siehe §10b.
- Damit sind E5 (Brand-Default) und Eg (Gruppen-Default) = **ja, als ausgelieferter Seed**; die „A/B-Lösch-Falle" entfällt (Defaults sind ausgeliefert, nicht operator-zur-Laufzeit-erstellt; Admin kann notfalls demoten).

| # | Entscheidung | Optionen | Plan-Claude-Tendenz |
|---|---|---|---|
| **E1** | **Zuschnitt / Reihenfolge** | ✅ **ENTSCHIEDEN: Player-Gruppen → Brands → Racer** (aufsteigende Komplexität). | — |
| **E2** | **Rollen-Level** Anlegen/Ändern | ✅ **ENTSCHIEDEN: operator+** für alle drei (wie Strecken). Promote/Export bleibt **admin** (§10b). | — |
| **E3** | **Bild-Speicherung** (Logo/Sprite) | ✅ **ENTSCHIEDEN: eigene Bilddatei wie Track-Backgrounds** (separate Datei + Upload-Endpunkt + Magic-Byte-Validierung; JSON speichert nur den Dateinamen). Betrifft nur Brands+Racer, nicht Gruppen. | — |
| **E4** | **Migration** bestehender Daten | Auto einmalig · manueller Import · frischer Start | **Auto einmalig, idempotent + kollisionssicher** — Owner sagt, ob localStorage-Bestand wertvoll ist. |
| **E5** | **Brand-Defaults** | ✅ **ENTSCHIEDEN: ja** — Owner legt eine eigene Default-Marke serverseitig ab (löschbar). | — |
| **E6** | **Built-in-ID-Kollisionsschutz** serverseitig (nur Racer) | Built-in-IDs serverseitig als geteilte Konstante pflegen · Client schickt sie mit | **Serverseitig pflegen** (eine Quelle, L129). |
| **E7** | **Async-Racer-Boot** (technisch, nur Racer) | — | Eigener, sorgfältiger Schritt; Race-Screen darf erst nach geladenen Server-Racern starten; stiller Horse-Fallback absichern (Loading-Gate + Diagnose). |
| **Eg** | **Player-Gruppen-Default** | ✅ via einheitliches Modell: Paket bringt ≥1 Beispielgruppe als Seed mit (`isDefault:true`, geschützt). | — |
| **Er** | **Racer-Tuning (`racearena:racerTypeOverrides`) serverseitig?** (Copilot #2) | In Phase D mitnehmen · bewusst draußen lassen (Tuning ≠ Inhalt) | **Tendenz: draußen lassen** — gleiche Kategorie wie die übrigen `*Config`-Keys (cameraConfig etc.), die alle nicht in Phase D sind. Folge: Racer-*Definitionen* werden geteilt, Racer-*Tuning* bleibt pro Browser (dokumentierte, bewusste Inkonsistenz). Betrifft nur die Racer-Schritte (D5/D6) → entscheidbar später. |

---

## 10. Vorgeschlagener Schritt-Zuschnitt (nach Owner-Entscheidungen)
Annahme E1 = Player-Gruppen → Brands → Racer (aufsteigende Komplexität). **Promote/Export (§10b) wird pro Typ-Server-Schritt mitgebaut (Variante 2), nicht nachgelagert.** Ein gemeinsamer Helfer (Admin „set/clear isDefault" + Export-Bündel) wird beim ersten Typ angelegt und von den weiteren genutzt.
- **D1** — Server: `player-groups.js` Store + CRUD + Validierung + **Default-Seed (≥1 Beispielgruppe, `isDefault:true`)** + **Admin „set/clear isDefault" + Export** (gemeinsamer Helfer, hier erstmals) + ROUTE_POLICY (E2; Admin-Aktionen admin-only) + Mount + Tests.
- **D2** — Client: `playerGroupApi.js` + `PlayerGroupsManager` auf Server (ACTIVE_GROUP bleibt lokal) + Migration (E4) + Promote/Export-UI (admin) + Tests + Browser-Augenprobe.
- **D3** — Server: `brands.js` Store + CRUD + (E3) Logo-Handling + **Default-Brand-Seed (Owner liefert Inhalt)** + Promote/Export (Helfer wiederverwenden) + Tests.
- **D4** — Client: `brandApi.js` + alle Brand-Konsumenten (§6.1) auf Server + Migration + Promote/Export-UI + Tests + Browser-Augenprobe.
- **D5** — Server: `racers.js` Store + CRUD + Validierung (Built-in-Kollision E6) + (E3) Sprite-Handling + Promote/Export (Daten-Racer-Default-Kategorie, §4) + Tests.
- **D6** — Client: `racerApi.js` + `_loadedRacerTypes`-Quelle auf Server (async-Boot E7, `listAllRacerTypes`-Vertrag stabil, stiller Fallback abgesichert) + Migration + Promote/Export-UI + Tests + Browser-Augenprobe.
- **D7 (optional, klein)** — Promote/Export auch für die bestehenden **Strecken** freischalten (Helfer wiederverwenden) — behebt direkt den Owner-Schmerzpunkt. Reihenfolge/Ob nach Owner-Wunsch.

Jeder Schritt: WAS-präzise/WIE-offen-Spec, Source-Hygiene-Abschnitt, Ehrlichkeits-Nachweis, `pre/`+`backup/`-Tag, Diff-Verifikation gegen origin, Copilot-Review, Owner-Browser-Augenprobe. Nach Abschluss der Phase: auf einen `v-phaseD-complete`-Anker kollabieren (Tag-Lifecycle-Disziplin).

---

## 10b. Default-Mechanik & Promote/Export-Feature (verifiziert 14.6. + geplant)

**Verifizierter IST-Zustand „Default-Strecke" (warum es heute mühsam ist):**
- Die 10 Default-Strecken sind **committete Datendateien** in git: `server/data/tracks/<id>.json` (`isDefault:true`, volle Geometrie, `backgroundImageFile`) + Bild in `server/data/backgrounds/`. „Ausliefern" = JSON **und** Bild committen. Quelle: `git ls-files server/data/tracks` (10 JSON) + `server/data/backgrounds` (10 Bilder); `seatrack.json`: `isDefault:true`, 200/200/31 Punkte, `backgroundImageFile:"seatrack.jpg"`.
- `DEFAULT_TRACK_SEEDS` + `migrateDefaultTracks()` erzeugen nur **leere Stubs** (geometryId:null, leere Punkt-Arrays), nur falls die Datei fehlt — Notnagel, nicht der echte Auslieferungsweg. Quelle: `tracks.js:424-447`.
- **`isDefault` ist über die API NICHT setzbar:** PUT erzwingt `isDefault: existing.isDefault`. Quelle: `tracks.js:677`. → Zum Befördern musste man die JSON-Datei + das Bild **von Hand** anfassen und committen. DAS war der Aufwand.

**Folgerung:** Der Auslieferungsweg „committe eine Datendatei mit `isDefault:true` (+ Bild)" existiert bereits — das Promote/Export-Feature versieht ihn nur mit Werkzeug, erfindet nichts Neues. **Relativ leicht lösbar.**

**Feature-Design (in Phase D, pro Typ mitgebaut — Variante 2):**
- **Admin-Aktion „Set/Clear isDefault"** (getrennt vom Operator-PUT): admin-only Endpoint/Flag-Setter, der `isDefault` auf einem Server-Record setzt (promote) oder entfernt (demote). PUT bleibt für Operatoren wie gehabt (rührt `isDefault` nicht an).
- **Export-als-Seed-Bündel:** liefert das fertige Paket-Stück zum Committen — bei wertbasierten Typen (Gruppen) nur das JSON; bei Brands/Racern/Strecken JSON **+ zugehörige Bilddatei**. Mit **E3 = separate Datei** ist das Bild bereits committierbar → Export trivial.
- **Git-Commit bleibt manuell** (bewusst Owner-Hand) — die Funktion erzeugt nur das committierbare Artefakt, schreibt NICHT selbst ins Repo.
- **Cross-cutting:** gilt für alle 4 Typen inkl. der bestehenden **Strecken** (Owner-Schmerzpunkt). Gemeinsamer Helfer (eine Quelle, L129) statt 4 Kopien.
- **Sicherheit:** „Set isDefault" + Export sind **admin-only** (ROUTE_POLICY-Eintrag wie surface-classes). Operator kann Defaults weiterhin weder setzen noch löschen.

**Zusätzliche Invariante (ergänzt §8):** `isDefault` darf NUR über die dedizierte Admin-Aktion wechseln, NIE über den normalen Create/Update-Pfad (Operator). Default-Records bleiben per 403 vor DELETE geschützt, solange `isDefault:true`.

## 11. Auftrag an Copilot (Gegencheck)Bitte prüfe gegen `origin/master @ 0dda9db` und melde Abweichungen, **ohne** etwas zu ändern:
1. **Quell-Treue:** Stimmen die IST-Aussagen in §2/§3 mit dem Code überein (Datei/Zeilen)? Insb.: ist `/api/tracks` wirklich NICHT in `ROUTE_POLICY` (→ operator+)? Setzt `tracks.js` POST `isDefault:false` und bewahrt PUT `existing.isDefault`, und gibt DELETE 403 auf Defaults?
2. **Racer-Klärung (§4):** Ist es korrekt, dass Built-in-Racer Verhaltensklassen im Code sind und NICHT als reine Daten darstellbar (→ kein Server-Seeding für Racer-Defaults)? Gibt es eine Stelle, die dem widerspricht?
3. **Vertrags-Stabilität (§6/§8):** Würde der vorgeschlagene Client-Refactor `listAllRacerTypes()`/`getRacerType()` und die Brand-Profil-Form wirklich unverändert lassen? Wo sind versteckte Konsumenten, die brechen könnten (z. B. synchroner Zugriff auf `_loadedRacerTypes` direkt nach Boot)?
4. **Async-Boot-Risiko (E7):** Welche Stellen lesen Racer-Typen synchron beim Start (Race-Screen, Setup, Preview-/Warmup-Pfade wie `warmUpAllRacerTypes`)? Liste sie — das ist das Hauptrisiko.
5. **Bild-Limit (Invariante 7, E3):** Ist `express.json` wirklich auf `1mb` limitiert (`app.js`)? Wären base64-Sprites/Logos damit ein Problem?
6. **Migration (§7):** Wo könnte Auto-Migration doppelt importieren oder mit Built-in-IDs kollidieren?
7. **Lücken:** Welche Konsumenten von `KEYS.BRANDING` oder den Racer-APIs habe ich übersehen?

Befunde bitte als Liste „Punkt N: OK / Abweichung + Codestelle".

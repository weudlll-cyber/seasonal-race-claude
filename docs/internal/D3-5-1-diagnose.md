# D3.5.1 — Diagnose: Sprite-RacerType-Klassen

**Erstellt:** 2026-04-26  
**Scope:** Read-only. Keine Code-Änderungen.  
**Basis:** `master` HEAD `b354032` — horse D2.5, duck D3.1, snail D3.2 alle gemergt.

---

## 1. Felder-Matrix

Alle Konfigurations-Felder der drei Klassen. Felder, die nur in einer Klasse existieren oder
dort einen anderen Typ haben, sind besonders markiert.

| Feld | Horse | Duck | Snail | Variabel pro Type? |
|---|---|---|---|---|
| Klassen-Name | `HorseRacerType` | `DuckRacerType` | `SnailRacerType` | ja |
| Modul-Key in `RACER_TYPES` | `'horse'` | `'duck'` | `'snail'` | ja |
| `SPRITE_URL` (Modul-Konstante) | `/assets/racers/horse-trot.png` | `/assets/racers/duck-walk.png` | `/assets/racers/snail-crawl.png` | ja |
| `style.primaryColor` | `'#E8DCC4'` (Creme) | `'#F5D020'` (Gelb) | `'#E8DCC4'` (Creme, **identisch Horse!**) | ja |
| `style.accentColor` | `'#2A1F18'` (Dunkelbraun) | `'#E06800'` (Orange) | `'#3A2E1F'` (Dunkelbraun) | ja |
| `style.silhouetteScale` | `1.0` | `1.0` | `1.0` | nein |
| `style.sprite.url` | (= SPRITE_URL) | (= SPRITE_URL) | (= SPRITE_URL) | ja |
| `style.sprite.frameWidth` | `128` | `128` | `128` | nein |
| `style.sprite.frameHeight` | `128` | `128` | `128` | nein |
| `style.sprite.frameCount` | `8` | `8` | `4` | ja |
| `style.sprite.basePeriodMs` | `700` | `700` | `1500` | ja |
| `style.sprite.baseRotationOffset` | `Math.PI / 2` | `Math.PI / 2` | `Math.PI / 2` | nein |
| `style.sprite.displaySize` | `40` | `36` | `35` | ja |
| `style.coats` | `HORSE_COATS` (11) | `DUCK_COATS` (11) | `SNAIL_COATS` (11) | ja |
| `style.defaultCoatId` | `'cream'` | `'yellow'` | `'garden'` | ja |
| `getEmoji()` Rückgabe | `'🐴'` | `'🦆'` | `'🐌'` | ja |
| `getSpeedMultiplier()` Rückgabe | `1.0` | `0.85` | `0.3` | ja |
| Leader-Ring-Farbe (in `drawRacer`) | `'#ffd700'` (Gold) | `'#00ccff'` (Cyan) | `'#88ff44'` (Grün) | ja |
| Leader-Ellipse Halbachsen | `(16, 10)` | `(14, 9)` | `(14, 9)` | ja — 2 Wertpaare |
| Fallback-Kreis-Farbe (`_drawBody`) | `primaryColor` | `primaryColor` | **`accentColor`** ⚠️ | inhomogen |
| Trail-Partikel-Farbe | `'#c4a060'` (Staub) | `'#7be0f8'` (Wasser) | `'#7ddc60'` (Schleim) | ja |
| Trail-TTL | `30` | `20` | `30` | ja |
| Trail-Radius-Range | `3–5 px` | `2–4 px` | `4–9 px` | ja |
| Trail-Radius-Expansion per Frame | `+0.05` | **keine** | **keine** | ja |
| Trail-Spawn-Strategie | Speed-basiert (0–2/frame) | Flat probability `0.4` | Flat probability `0.35` | ja |
| Trail-Partikel-Anzahl pro Spawn | `0–2` (speed-skaliert) | immer `2` | immer `1` | ja |
| Trail-Spawn-Position | `backX/backY` (angle-basiert, -12px) + perp `±5` | Aktuelles xy + perp `±5` | Aktuelles xy + Jitter `±2` | ja |
| Trail-Speed-Input genutzt? | ja (`racer.baseSpeed`) | nein (`_speed`) | nein (`_speed`) | inhomogen |
| Trail-Angle-Input genutzt? | ja (`racer.angle`) | ja (`racer.angle`) | **nein** (`_angle`) | inhomogen |

---

## 2. Methoden-Matrix

| Methode (Signatur) | Horse | Duck | Snail | Identisch? |
|---|---|---|---|---|
| `constructor()` | ✓ | ✓ | ✓ | **Struktur identisch**, Werte abweichend (alle konfigurierten Felder, s.o.) |
| `getEmoji()` | ✓ | ✓ | ✓ | Nein — typ-spezifischer Return-Wert |
| `getSpeedMultiplier()` | ✓ | ✓ | ✓ | Nein — `1.0` / `0.85` / `0.3` |
| `drawRacer(ctx, x, y, angle, racer, isLeader, frame)` | ✓ | ✓ | ✓ | **Fast identisch.** Unterschiede: (1) Leader-Ring-Farbe, (2) Ellipse-Halbachsen `(16,10)` vs `(14,9)`. Übrige 15 Zeilen byte-identisch. |
| `getTrailParticles(x, y, speed, angle, frame)` | ✓ | ✓ | ✓ | Komplett verschieden pro Type (s. Felder-Matrix). Signatur-Drift: Duck `_speed`, Snail `_speed, _angle`. |
| `_getFrameIndex(frame, speed)` | ✓ | ✓ | ✓ | **Byte-identisch.** Alle drei lesen `this.style.sprite.basePeriodMs` und `this.style.sprite.frameCount`. |
| `_drawBody(ctx, racer, frame)` | ✓ | ✓ | ✓ | **Fast identisch.** Einziger Unterschied: Fallback-Kreis-Farbe — Horse/Duck nutzen `primaryColor`, Snail nutzt `accentColor`. ⚠️ |
| `_createTrail(_racer)` | ✓ | ✓ | ✓ | **Äußere Struktur identisch** (`{ spawn, update, render }`). `update` byte-identisch (ttl-Decrement, splice, x/y += vx/vy). `spawn` und `render` komplett typ-spezifisch. |
| Modul-initialisierender Top-Level-Call | `getCoatVariants(SPRITE_URL, HORSE_COATS).catch(()=>{})` | analog | analog | Muster identisch, Argumente typ-spezifisch |

### `drawRacer` — Detail-Diff

```
Identisch:  ctx.save / translate(x,y) / rotate(angle) / leader-if-Block-Rahmen /
            render.drawBody(ctx, racer, frame) / ctx.restore()
Verschieden: leader-Ring-Farbe, ellipse-Halbachsen
```

### `_createTrail.update` — byte-identisch in allen drei:

```js
update(_dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.ttl--;
    if (p.ttl <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx;
    p.y += p.vy;
  }
}
```

Horse ergänzt darüber hinaus `p.r += 0.05`.

### `_createTrail.render` — Muster identisch, Farbe verschieden:

```js
render(ctx) {
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = '<typ-spezifische Farbe>';
    ctx.globalAlpha = 0.5 * (p.ttl / p.maxTtl);  // Duck/Snail: 0.45 statt 0.5 ⚠️
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
```

Kleiner Drift: Horse/Duck nutzen `globalAlpha = 0.5 × fade`, Snail nutzt `0.45 × fade`.

---

## 3. Tinting-Mechanik (`spriteTinter.js`)

### Wie es heute funktioniert

1. **Einstiegspunkt:** `getCoatVariants(sourceUrl, coats)` — async, cached per `sourceUrl`.
2. **Lade-Phase:** ruft intern `loadSprite(sourceUrl)` → `HTMLImageElement`.
3. **Tinting pro Coat:** Für jeden Coat im Array: `tint === null` → nimmt das Original-`HTMLImageElement`; `tint !== null` → ruft `tintSprite(img, tintColor)`.
4. **`tintSprite` Ablauf:**
   - Erstellt ein Offscreen-`<canvas>` in den natürlichen Bild-Dimensionen.
   - Zeichnet das Original mit `ctx.drawImage(sourceImage, 0, 0)` — Alpha-Kanal inklusive.
   - `ctx.globalCompositeOperation = 'multiply'` + `ctx.fillRect(...)` mit Tint-Farbe — multipliziert RGB des Sprites mit der Farbe, Alpha bleibt 1.
   - `ctx.globalCompositeOperation = 'destination-in'` + erneutes `ctx.drawImage` — restauriert den Original-Alpha-Kanal (schneidet transparente Bereiche wieder aus).
   - Reset auf `'source-over'`, gibt Canvas zurück.
5. **Cache-Strategie:** `_variantCache` ist eine `Map<sourceUrl, Map<coatId, drawable>>`. Der äußere Key ist die URL. Pro URL wird die gesamte Coat-Map gespeichert, nicht einzelne Coats.
6. **Synchron-Accessor:** `getCoatVariants.cached(url)` gibt `undefined` zurück solange der async Load nicht abgeschlossen ist. `_drawBody` nutzt diesen Check als non-blocking fallback.
7. **Warm-Up:** Alle drei Typen rufen `getCoatVariants(SPRITE_URL, COATS).catch(()=>{})` am Modul-Load-Zeitpunkt auf — Tinting läuft im Hintergrund während der App initialisiert.

### Vorbereitung für andere Modi?

**Nein.** `tintSprite` hat keine Parameter für den Composite-Modus. Der Multiply-Ablauf ist hardcoded als Sequenz in den 5 `ctx.`-Zeilen. Eine Mask/Overlay-Variante würde dieselbe Funktion duplizieren oder einen `mode`-Parameter brauchen.

Erweiterungspunkt: `tintSprite(sourceImage, tintColor, mode = 'multiply')` mit einem `switch` auf `mode`. Die Cache-Granularität würde sich dann ändern (s.u.).

### Cache-Granularität

Heute: Cache-Key = `sourceUrl`. Alle Coats einer URL werden in einem Batch berechnet. Das bedeutet:
- Kein partielles Nachladen (alles oder nichts pro URL).
- Wenn Mask-Tinting eingeführt wird und der Cache-Key weiterhin nur die URL ist, würden Multiply- und Mask-Coats desselben Sprites kollidieren, da beide unter derselben URL gespeichert wären.
- Für Mask-Tinting müsste der Cache-Key auf `sourceUrl + ':' + mode` erweitert werden.

---

## 4. Loader und Coat-Assignment

### `spriteLoader.js`

- **Was es tut:** Lädt `HTMLImageElement` von einer URL, cached im Modul-Level `Map<url, HTMLImageElement>`.
- **Cache-Mechanik:** Bei wiederholtem Aufruf mit derselben URL wird `Promise.resolve(cached)` zurückgegeben — keine zweite Netzwerk-Anfrage.
- **API:**
  - `loadSprite(url)` → `Promise<HTMLImageElement>` (async, cached)
  - `getCachedSprite(url)` → `HTMLImageElement | undefined` (sync, kein Load)
  - `_clearSpriteCache()` → nur für Tests

`spriteTinter.js` nutzt `loadSprite` intern — die beiden Caches sind voneinander unabhängig (`_cache` in spriteLoader, `_variantCache` in spriteTinter).

### `coatAssignment.js`

- **Hash-Algorithmus:** djb2 (`hash = ((hash << 5) + hash + charCode) | 0`), Startwert 5381, `Math.abs` am Ende.
- **Inputs:** `playerName` (string) und `coatList` (Array mit `.id`-Feldern).
- **Output:** `coatList[hash(playerName) % coatList.length].id` — deterministisch, gleicher Name ergibt immer denselben Coat.
- **Sonderfall:** leerer/null Name → erstes Element der Liste.
- `coatAssignment.js` ist von den drei RacerType-Klassen **nicht direkt importiert** — es wird von RaceScreen genutzt, um beim Race-Init `racer.coatId` zu setzen.

---

## 5. Test-Stichproben

### `horse.test.js` — 32 Tests, 3 `describe`-Blöcke

**Was geprüft wird:**
- Überwiegend **Verhalten** (Canvas-Calls, Frame-Index-Werte, Partikel-Lifetime).
- Wenige **Strukturprüfungen** (Methoden existieren, Typen korrekt, Coat-Array hat 11 Einträge).
- 2 Tests prüfen, dass `RocketRacerType` und `CarRacerType` *keine* manifest-Sektionen haben (Guard-Tests).

**Beispiel-Descriptions:**
- `"getFrameIndex cycles through all 8 frames over one period at speed=1"` — Verhalten
- `"spawns ~2 particles per frame at full speed — 30 frames yields 50–70 alive"` — Verhalten mit konkreten Bounds
- `"_drawBody with unknown coatId falls back to defaultCoatId variant"` — Verhalten (Fallback-Chain)

**Beim Refactor:** Die meisten Tests bleiben unverändert — sie testen das Verhalten von `HorseRacerType`-Instanzen, nicht Implementierungsdetails der Vererbung. Guard-Tests ("rocket/car haben kein style.sprite") bleiben ebenfalls gültig. Anzahl Tests: 32.

---

### `duck.test.js` — 19 Tests, 3 `describe`-Blöcke

**Was geprüft wird:**
- Mirrors horse.test.js. Gleiche Kategorien: Manifest-Shape, Frame-Index, Trail-Lifecycle, Canvas-Wiring, Sprite-Blit, Coat-Variants.
- **Fehlt gegenüber horse.test.js:** Kein Test für speed-basierte Spawn-Rate (Duck trail ist flat-probability, daher obsolet).
- Partikel-Lifetime-Test nutzt `vi.spyOn(Math, 'random').mockReturnValue(0)` um Spawn zu erzwingen (da flat probability ≤ 0.4 threshold).

**Beispiel-Descriptions:**
- `"getFrameIndex cycles through all 8 frames over one period at speed=1"` — Verhalten
- `"drawRacer with isLeader=true sets cyan strokeStyle (#00ccff)"` — Verhalten + hardcoded Farb-String
- `"_drawBody falls back to an arc circle when sprite is not loaded"` — Verhalten

**Beim Refactor:** Leader-Farb-Tests (`#00ccff`) testen einen Wert der in einem Config-Objekt stecken wird. Die Tests bleiben valide (sie testen das Verhalten der Duck-Instanz, egal ob die Klasse SpriteRacerType extended). Der Test `sprite.frameCount === 8` ist auf Duck-spezifischen Wert hardcoded — bleibt korrekt. Anzahl Tests: 19.

---

### `snail.test.js` — 21 Tests, 3 `describe`-Blöcke

**Was geprüft wird:**
- Mirrors duck.test.js, mit zwei Ergänzungen:
  1. `"_drawBody fallback circle uses accentColor"` — **einziger Test der diesen Drift explizit absichert** (Snail nutzt `accentColor` statt `primaryColor`).
  2. `"manifest has 11 coats, exactly one with tint: null (garden)"` — prüft die Tint-Verteilung (nur 1 Base-Coat, alle anderen tinted).
- Coat-Beschreibung prüft `nullTints.length === 1` und `nullTints[0].id === 'garden'`.

**Beispiel-Descriptions:**
- `"getFrameIndex cycles through all 4 frames over one period at speed=1"` — Verhalten
- `"_drawBody fallback circle uses accentColor"` — Verhalten (sichert bewussten Sonderfall ab)
- `"manifest has 11 coats, exactly one with tint: null (garden)"` — strukturell+inhaltlich

**Beim Refactor:** Der `accentColor`-Test ist ein Korrektheitswächter. Nach dem Refactor sollte der Base-Case konsolidiert werden (entweder immer `primaryColor` oder ein explizites Config-Feld `fallbackColor`). Der Test muss dann angepasst werden wenn die Snail-Config den Wert überschreibt. Anzahl Tests: 21.

---

## 6. Auffälligkeiten

### A — Zwei parallele Trail-Implementierungen

Alle drei Klassen haben **zwei vollständige Trail-Systeme:**

1. `getTrailParticles(x, y, speed, angle, frame)` — **stateless**, gibt pro Aufruf ein Array von Partikel-Objekten zurück. Wird (vermutlich) von RaceScreen aufgerufen.
2. `this.trail.createTrail(racer)` → `{ spawn, update, render }` — **stateful** Partikel-System mit eigenem Closure-State.

Beide Implementierungen haben unterschiedliche Partikel-Parameter (z.B. Horse `getTrailParticles` spawnt nur 1 Partikel mit Farbe `#c4a060`, während `_createTrail` 2 spawnt). Es ist unklar ob RaceScreen bereits auf das neue API umgestellt wurde oder noch das alte nutzt — das liegt außerhalb der gelesenen Files.

**Risiko beim Refactor:** Falls beide Systeme aktiv sind, können bei einem Refactor unterschiedliche Verhalten entstehen. Vor D3.5 klären, welches aktiv konsumiert wird.

### B — Fallback-Kreis-Farbe: `primaryColor` vs `accentColor` (Snail-Drift)

Horse und Duck: `ctx.fillStyle = this.style.primaryColor`  
Snail: `ctx.fillStyle = this.style.accentColor`

Snails `primaryColor` ist `#E8DCC4` (Creme, identisch Horse), was für einen Fallback-Kreis optisch sinnlos wäre. `accentColor` (`#3A2E1F`, Dunkelbraun) macht optisch mehr Sinn für eine Schnecke. Das war wahrscheinlich eine bewusste Entscheidung — aber es ist undokumentiert und inkonsistent mit Horse/Duck.

**Beim Refactor:** Als explizites Config-Feld `fallbackColor` herausziehen. Snail setzt es auf `accentColor`, Horse/Duck auf `primaryColor`.

### C — `globalAlpha`-Drift in `render`: `0.5` vs `0.45`

Horse/Duck trail `render`: `ctx.globalAlpha = 0.5 * (p.ttl / p.maxTtl)`  
Snail trail `render`: `ctx.globalAlpha = 0.45 * (p.ttl / p.maxTtl)`

Kein Test sichert diesen Wert ab. Wahrscheinlich unbeabsichtigter Drift, nicht semantisch.

### D — `style.primaryColor` Horse = Snail (beide `#E8DCC4`)

Zufällige Übereinstimmung oder absichtlich? Beide sind helle creme-beige Farben passend zur Original-Sprite-Palette. Kein Problem, aber beim Refactor nicht wegoptimieren.

### E — Leader-Ellipse: Duck und Snail haben dieselben Halbachsen `(14, 9)`, aber unterschiedliche `displaySize` (36 vs 35)

Duck displaySize=36, Snail displaySize=35 — beide nutzen Halbachse `(14, 9)`. Horse displaySize=40 → `(16, 10)`. Für ein config-getriebenes Design könnte man die Ellipse aus `displaySize` ableiten (etwa `displaySize * 0.35` × `displaySize * 0.225`), aber dann passt Snail nicht exakt. Empfehlung: als separate Config-Felder behalten (`leaderRingColor`, `leaderEllipseRx`, `leaderEllipseRy`).

### F — `getTrailParticles` Signatur-Drift: `speed` vs `_speed`, `angle` vs `_angle`

Horse nutzt beide. Duck ignoriert `speed`. Snail ignoriert beide. In der Basis-Klasse müsste eine einheitliche Signatur definiert werden, mit optionaler Nutzung.

### G — Kein expliziter `id`-String auf den Klassen-Instanzen

Die Klassen haben keinen `this.id = 'horse'` o.ä. Der Key im `RACER_TYPES`-Objekt (`'horse'`, `'duck'`, `'snail'`) ist der einzige Identifier — aber der ist nur am Registry-Eintrag, nicht auf der Instanz selbst. `getRacerType('horse')` gibt eine Instanz zurück, aber `instance.id` wäre `undefined`. Das ist heute kein Problem, wäre aber beim Refactor nützlich um Debugging/Logging zu vereinfachen.

### H — Mask-Tinting: spriteTinter.js blockiert leicht

`tintSprite` hat keinen Mode-Parameter, die Composite-Sequenz ist hardcoded. Für Vehicle-Sprites (Buggy, Motorrad, Plane) die z.B. Overlay-Tinting statt Multiply brauchen (um helle Farben auf dunklen Sprites zu erzielen), müsste `tintSprite` refactored werden. Der Cache-Key in `spriteTinter.js` müsste dann auf `url+mode` erweitert werden. Das ist eine kurze, isolierte Änderung, blockiert nichts — aber es ist kein Extension-Point vorhanden, man müsste anfassen.

---

## 7. Erste Refactor-These

**1. `SpriteRacerType` ist ein Konfigurations-Container, keine klassische Basisklasse.**

Der sauberste Weg ist kein `extends`, sondern ein einziger Konstruktor der ein Config-Objekt nimmt:

```js
new SpriteRacerType({
  id: 'horse',
  emoji: '🐴',
  spriteUrl: '/assets/racers/horse-trot.png',
  frameCount: 8,
  basePeriodMs: 700,
  displaySize: 40,
  coats: HORSE_COATS,
  defaultCoatId: 'cream',
  speedMultiplier: 1.0,
  primaryColor: '#E8DCC4',
  accentColor: '#2A1F18',
  fallbackColor: 'primaryColor',  // oder explizit '#E8DCC4'
  leaderRingColor: '#ffd700',
  leaderEllipseRx: 16,
  leaderEllipseRy: 10,
  trailFactory: horseTrailFactory,  // einziger nicht-konfigurierbarer Teil
})
```

`_getFrameIndex` und `_drawBody` wandern 1:1 in die Klasse (sie lesen nur `this.config`). `getEmoji`, `getSpeedMultiplier`, `drawRacer` werden aus Config generiert. Trail bleibt eine übergabene Factory-Funktion.

**2. Trail bleibt typ-spezifisch — kein Schema, sondern Factory-Funktion.**

Die drei Trail-Systeme (speed-reaktiv/angle-aware Horse, bilateral-spray Duck, radial-jitter Snail) sind zu verschieden für ein Schema. Ein Config-Objekt mit 10 Trail-Feldern wäre schwerer lesbar als eine kurze Factory-Funktion. `trailFactory` als Pflicht-Param im Config-Objekt ist sauber.

**3. `fallbackColor` als explizites Config-Feld.**

Damit der Snail-Drift (`accentColor` statt `primaryColor`) explizit dokumentiert ist. Default: `'primaryColor'` als Enum-Wert oder direkte Farbangabe.

**4. Parallele Trail-Systeme bereinigen.**

Vor dem Schreiben der Basis-Klasse klären ob RaceScreen noch `getTrailParticles` nutzt oder bereits auf `trail.createTrail` umgestellt ist. Wenn beide aktiv sind: erst RaceScreen umstellen, dann `getTrailParticles` aus allen drei Klassen entfernen, dann refactorn. Sonst entsteht ein Basis-Klassen-Design das eine tote Methode mitschleppt.

**5. `spriteTinter.js` braucht minimale Vorbereitung für Mask-Tinting.**

Einen `tintMode: 'multiply' | 'mask'` Parameter zu `tintSprite` hinzufügen (vor oder gleichzeitig mit D3.5) und den Cache-Key auf `url + ':' + mode` erweitern. Das ist ~15 Zeilen und entkoppelt D3.5 von D3.3/D3.4 (falls Vehicle-Sprites einen anderen Modus brauchen). Wenn D3.3/D3.4 noch Multiply nutzen, kann man das auch danach tun — aber das Fenster schließt sich sobald mehrere Sprite-URLs im Einsatz sind.

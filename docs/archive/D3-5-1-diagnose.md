# D3.5.1 — Diagnosis: Sprite-RacerType Classes

**Created:** 2026-04-26  
**Scope:** Read-only. No code changes.  
**Base:** `master` HEAD `b354032` — horse D2.5, duck D3.1, snail D3.2 all merged.

---

## 1. Field matrix

All configuration fields of the three classes. Fields that exist only in one class or
have a different type there are specially marked.

| Field                               | Horse                                          | Duck                           | Snail                                        | Variable per type?  |
| ----------------------------------- | ---------------------------------------------- | ------------------------------ | -------------------------------------------- | ------------------- |
| Class name                          | `HorseRacerType`                               | `DuckRacerType`                | `SnailRacerType`                             | yes                 |
| Module key in `RACER_TYPES`         | `'horse'`                                      | `'duck'`                       | `'snail'`                                    | yes                 |
| `SPRITE_URL` (module constant)      | `/assets/racers/horse-trot.png`                | `/assets/racers/duck-walk.png` | `/assets/racers/snail-crawl.png`             | yes                 |
| `style.primaryColor`                | `'#E8DCC4'` (cream)                            | `'#F5D020'` (yellow)           | `'#E8DCC4'` (cream, **identical to Horse!**) | yes                 |
| `style.accentColor`                 | `'#2A1F18'` (dark brown)                       | `'#E06800'` (orange)           | `'#3A2E1F'` (dark brown)                     | yes                 |
| `style.silhouetteScale`             | `1.0`                                          | `1.0`                          | `1.0`                                        | no                  |
| `style.sprite.url`                  | (= SPRITE_URL)                                 | (= SPRITE_URL)                 | (= SPRITE_URL)                               | yes                 |
| `style.sprite.frameWidth`           | `128`                                          | `128`                          | `128`                                        | no                  |
| `style.sprite.frameHeight`          | `128`                                          | `128`                          | `128`                                        | no                  |
| `style.sprite.frameCount`           | `8`                                            | `8`                            | `4`                                          | yes                 |
| `style.sprite.basePeriodMs`         | `700`                                          | `700`                          | `1500`                                       | yes                 |
| `style.sprite.baseRotationOffset`   | `Math.PI / 2`                                  | `Math.PI / 2`                  | `Math.PI / 2`                                | no                  |
| `style.sprite.displaySize`          | `40`                                           | `36`                           | `35`                                         | yes                 |
| `style.coats`                       | `HORSE_COATS` (11)                             | `DUCK_COATS` (11)              | `SNAIL_COATS` (11)                           | yes                 |
| `style.defaultCoatId`               | `'cream'`                                      | `'yellow'`                     | `'garden'`                                   | yes                 |
| `getEmoji()` return                 | `'🐴'`                                         | `'🦆'`                         | `'🐌'`                                       | yes                 |
| `getSpeedMultiplier()` return       | `1.0`                                          | `0.85`                         | `0.3`                                        | yes                 |
| Leader ring color (in `drawRacer`)  | `'#ffd700'` (gold)                             | `'#00ccff'` (cyan)             | `'#88ff44'` (green)                          | yes                 |
| Leader ellipse semi-axes            | `(16, 10)`                                     | `(14, 9)`                      | `(14, 9)`                                    | yes — 2 value pairs |
| Fallback circle color (`_drawBody`) | `primaryColor`                                 | `primaryColor`                 | **`accentColor`** ⚠️                         | inhomogeneous       |
| Trail particle color                | `'#c4a060'` (dust)                             | `'#7be0f8'` (water)            | `'#7ddc60'` (slime)                          | yes                 |
| Trail TTL                           | `30`                                           | `20`                           | `30`                                         | yes                 |
| Trail radius range                  | `3–5 px`                                       | `2–4 px`                       | `4–9 px`                                     | yes                 |
| Trail radius expansion per frame    | `+0.05`                                        | **none**                       | **none**                                     | yes                 |
| Trail spawn strategy                | Speed-based (0–2/frame)                        | Flat probability `0.4`         | Flat probability `0.35`                      | yes                 |
| Trail particles per spawn           | `0–2` (speed-scaled)                           | always `2`                     | always `1`                                   | yes                 |
| Trail spawn position                | `backX/backY` (angle-based, -12px) + perp `±5` | Current xy + perp `±5`         | Current xy + jitter `±2`                     | yes                 |
| Trail speed input used?             | yes (`racer.baseSpeed`)                        | no (`_speed`)                  | no (`_speed`)                                | inhomogeneous       |
| Trail angle input used?             | yes (`racer.angle`)                            | yes (`racer.angle`)            | **no** (`_angle`)                            | inhomogeneous       |

---

## 2. Method matrix

| Method (signature)                                    | Horse                                                    | Duck      | Snail     | Identical?                                                                                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------- | --------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor()`                                       | ✓                                                        | ✓         | ✓         | **Structure identical**, values differ (all configured fields, see above)                                                                                                  |
| `getEmoji()`                                          | ✓                                                        | ✓         | ✓         | No — type-specific return value                                                                                                                                            |
| `getSpeedMultiplier()`                                | ✓                                                        | ✓         | ✓         | No — `1.0` / `0.85` / `0.3`                                                                                                                                                |
| `drawRacer(ctx, x, y, angle, racer, isLeader, frame)` | ✓                                                        | ✓         | ✓         | **Nearly identical.** Differences: (1) leader ring color, (2) ellipse semi-axes `(16,10)` vs `(14,9)`. Remaining 15 lines byte-identical.                                  |
| `getTrailParticles(x, y, speed, angle, frame)`        | ✓                                                        | ✓         | ✓         | Completely different per type (see field matrix). Signature drift: Duck `_speed`, Snail `_speed, _angle`.                                                                  |
| `_getFrameIndex(frame, speed)`                        | ✓                                                        | ✓         | ✓         | **Byte-identical.** All three read `this.style.sprite.basePeriodMs` and `this.style.sprite.frameCount`.                                                                    |
| `_drawBody(ctx, racer, frame)`                        | ✓                                                        | ✓         | ✓         | **Nearly identical.** Only difference: fallback circle color — Horse/Duck use `primaryColor`, Snail uses `accentColor`. ⚠️                                                 |
| `_createTrail(_racer)`                                | ✓                                                        | ✓         | ✓         | **Outer structure identical** (`{ spawn, update, render }`). `update` byte-identical (ttl decrement, splice, x/y += vx/vy). `spawn` and `render` completely type-specific. |
| Module-initializing top-level call                    | `getCoatVariants(SPRITE_URL, HORSE_COATS).catch(()=>{})` | analogous | analogous | Pattern identical, arguments type-specific                                                                                                                                 |

### `drawRacer` — detail diff

```
Identical:  ctx.save / translate(x,y) / rotate(angle) / leader-if-block-frame /
            render.drawBody(ctx, racer, frame) / ctx.restore()
Different: leader ring color, ellipse semi-axes
```

### `_createTrail.update` — byte-identical in all three:

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

Horse additionally adds `p.r += 0.05`.

### `_createTrail.render` — pattern identical, color differs:

```js
render(ctx) {
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = '<type-specific color>';
    ctx.globalAlpha = 0.5 * (p.ttl / p.maxTtl);  // Duck/Snail: 0.45 instead of 0.5 ⚠️
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
```

Minor drift: Horse/Duck trail `render`: `ctx.globalAlpha = 0.5 × fade`, Snail uses `0.45 × fade`.

---

## 3. Tinting mechanism (`spriteTinter.js`)

### How it works today

1. **Entry point:** `getCoatVariants(sourceUrl, coats)` — async, cached per `sourceUrl`.
2. **Load phase:** internally calls `loadSprite(sourceUrl)` → `HTMLImageElement`.
3. **Tinting per coat:** For each coat in the array: `tint === null` → takes the original `HTMLImageElement`; `tint !== null` → calls `tintSprite(img, tintColor)`.
4. **`tintSprite` process:**
   - Creates an offscreen `<canvas>` at the natural image dimensions.
   - Draws the original with `ctx.drawImage(sourceImage, 0, 0)` — alpha channel included.
   - `ctx.globalCompositeOperation = 'multiply'` + `ctx.fillRect(...)` with tint color — multiplies RGB of the sprite with the color, alpha stays 1.
   - `ctx.globalCompositeOperation = 'destination-in'` + second `ctx.drawImage` — restores the original alpha channel (cuts out transparent areas again).
   - Reset to `'source-over'`, returns canvas.
5. **Cache strategy:** `_variantCache` is a `Map<sourceUrl, Map<coatId, drawable>>`. The outer key is the URL. Per URL the entire coat map is stored, not individual coats.
6. **Sync accessor:** `getCoatVariants.cached(url)` returns `undefined` while the async load has not completed. `_drawBody` uses this check as a non-blocking fallback.
7. **Warm-up:** All three types call `getCoatVariants(SPRITE_URL, COATS).catch(()=>{})` at module load time — tinting runs in the background while the app initializes.

### Prepared for other modes?

**No.** `tintSprite` has no parameter for the composite mode. The multiply process is hardcoded as a sequence in the 5 `ctx.` lines. A mask/overlay variant would duplicate the same function or need a `mode` parameter.

Extension point: `tintSprite(sourceImage, tintColor, mode = 'multiply')` with a `switch` on `mode`. The cache granularity would then change (see below).

### Cache granularity

Today: cache key = `sourceUrl`. All coats of a URL are computed in one batch. This means:

- No partial reloading (all or nothing per URL).
- If mask-tinting is introduced and the cache key remains only the URL, multiply and mask coats of the same sprite would collide, as both would be stored under the same URL.
- For mask-tinting the cache key would need to be extended to `sourceUrl + ':' + mode`.

---

## 4. Loader and coat assignment

### `spriteLoader.js`

- **What it does:** Loads `HTMLImageElement` from a URL, cached in a module-level `Map<url, HTMLImageElement>`.
- **Cache mechanism:** On repeated call with the same URL `Promise.resolve(cached)` is returned — no second network request.
- **API:**
  - `loadSprite(url)` → `Promise<HTMLImageElement>` (async, cached)
  - `getCachedSprite(url)` → `HTMLImageElement | undefined` (sync, no load)
  - `_clearSpriteCache()` → for tests only

`spriteTinter.js` uses `loadSprite` internally — the two caches are independent of each other (`_cache` in spriteLoader, `_variantCache` in spriteTinter).

### `coatAssignment.js`

- **Hash algorithm:** djb2 (`hash = ((hash << 5) + hash + charCode) | 0`), start value 5381, `Math.abs` at end.
- **Inputs:** `playerName` (string) and `coatList` (array with `.id` fields).
- **Output:** `coatList[hash(playerName) % coatList.length].id` — deterministic, same name always produces the same coat.
- **Special case:** empty/null name → first element of the list.
- `coatAssignment.js` is **not directly imported** by the three RacerType classes — it is used by RaceScreen to set `racer.coatId` during race init.

---

## 5. Test samples

### `horse.test.js` — 32 tests, 3 `describe` blocks

**What is checked:**

- Predominantly **behavior** (canvas calls, frame index values, particle lifetime).
- Few **structural checks** (methods exist, types correct, coat array has 11 entries).
- 2 tests check that `RocketRacerType` and `CarRacerType` have _no_ manifest sections (guard tests).

**Example descriptions:**

- `"getFrameIndex cycles through all 8 frames over one period at speed=1"` — behavior
- `"spawns ~2 particles per frame at full speed — 30 frames yields 50–70 alive"` — behavior with concrete bounds
- `"_drawBody with unknown coatId falls back to defaultCoatId variant"` — behavior (fallback chain)

**On refactor:** Most tests remain unchanged — they test the behavior of `HorseRacerType` instances, not implementation details of inheritance. Guard tests ("rocket/car have no style.sprite") remain valid as well. Number of tests: 32.

---

### `duck.test.js` — 19 tests, 3 `describe` blocks

**What is checked:**

- Mirrors horse.test.js. Same categories: manifest shape, frame index, trail lifecycle, canvas wiring, sprite blit, coat variants.
- **Missing vs. horse.test.js:** No test for speed-based spawn rate (duck trail is flat-probability, therefore obsolete).
- Particle lifetime test uses `vi.spyOn(Math, 'random').mockReturnValue(0)` to force spawn (since flat probability ≤ 0.4 threshold).

**Example descriptions:**

- `"getFrameIndex cycles through all 8 frames over one period at speed=1"` — behavior
- `"drawRacer with isLeader=true sets cyan strokeStyle (#00ccff)"` — behavior + hardcoded color string
- `"_drawBody falls back to an arc circle when sprite is not loaded"` — behavior

**On refactor:** Leader color tests (`#00ccff`) test a value that will live in a config object. The tests remain valid (they test the behavior of the Duck instance, regardless of whether the class extends SpriteRacerType). The test `sprite.frameCount === 8` is hardcoded to Duck-specific value — stays correct. Number of tests: 19.

---

### `snail.test.js` — 21 tests, 3 `describe` blocks

**What is checked:**

- Mirrors duck.test.js, with two additions:
  1. `"_drawBody fallback circle uses accentColor"` — **only test that explicitly guards this drift** (Snail uses `accentColor` instead of `primaryColor`).
  2. `"manifest has 11 coats, exactly one with tint: null (garden)"` — checks tint distribution (only 1 base coat, all others tinted).
- Coat description checks `nullTints.length === 1` and `nullTints[0].id === 'garden'`.

**Example descriptions:**

- `"getFrameIndex cycles through all 4 frames over one period at speed=1"` — behavior
- `"_drawBody fallback circle uses accentColor"` — behavior (guards deliberate special case)
- `"manifest has 11 coats, exactly one with tint: null (garden)"` — structural + content

**On refactor:** The `accentColor` test is a correctness guard. After refactoring the base case should be consolidated (either always `primaryColor` or an explicit config field `fallbackColor`). The test must then be adjusted if the Snail config overrides the value. Number of tests: 21.

---

## 6. Anomalies

### A — Two parallel trail implementations

All three classes have **two complete trail systems:**

1. `getTrailParticles(x, y, speed, angle, frame)` — **stateless**, returns an array of particle objects per call. Presumably called by RaceScreen.
2. `this.trail.createTrail(racer)` → `{ spawn, update, render }` — **stateful** particle system with its own closure state.

Both implementations have different particle parameters (e.g. Horse `getTrailParticles` spawns only 1 particle with color `#c4a060`, while `_createTrail` spawns 2). It is unclear whether RaceScreen has already switched to the new API or still uses the old one — that is outside the files read.

**Risk on refactor:** If both systems are active, different behaviors can emerge during a refactor. Before D3.5 clarify which one is actively consumed.

### B — Fallback circle color: `primaryColor` vs `accentColor` (Snail drift)

Horse and Duck: `ctx.fillStyle = this.style.primaryColor`  
Snail: `ctx.fillStyle = this.style.accentColor`

Snail's `primaryColor` is `#E8DCC4` (cream, identical to Horse), which would be visually meaningless for a fallback circle. `accentColor` (`#3A2E1F`, dark brown) makes more visual sense for a snail. This was probably a deliberate decision — but it is undocumented and inconsistent with Horse/Duck.

**On refactor:** Extract as an explicit config field `fallbackColor`. Snail sets it to `accentColor`, Horse/Duck to `primaryColor`.

### C — `globalAlpha` drift in `render`: `0.5` vs `0.45`

Horse/Duck trail `render`: `ctx.globalAlpha = 0.5 * (p.ttl / p.maxTtl)`  
Snail trail `render`: `ctx.globalAlpha = 0.45 * (p.ttl / p.maxTtl)`

No test guards this value. Probably unintentional drift, not semantic.

### D — `style.primaryColor` Horse = Snail (both `#E8DCC4`)

Coincidence or intentional? Both are light cream-beige colors matching the original sprite palette. No problem, but don't optimize away during refactor.

### E — Leader ellipse: Duck and Snail have the same semi-axes `(14, 9)`, but different `displaySize` (36 vs 35)

Duck displaySize=36, Snail displaySize=35 — both use semi-axis `(14, 9)`. Horse displaySize=40 → `(16, 10)`. For a config-driven design one could derive the ellipse from `displaySize` (e.g. `displaySize * 0.35` × `displaySize * 0.225`), but then Snail would not fit exactly. Recommendation: keep as separate config fields (`leaderRingColor`, `leaderEllipseRx`, `leaderEllipseRy`).

### F — `getTrailParticles` signature drift: `speed` vs `_speed`, `angle` vs `_angle`

Horse uses both. Duck ignores `speed`. Snail ignores both. In the base class a uniform signature would need to be defined, with optional usage.

### G — No explicit `id` string on class instances

The classes have no `this.id = 'horse'` or similar. The key in the `RACER_TYPES` object (`'horse'`, `'duck'`, `'snail'`) is the only identifier — but it is only on the registry entry, not on the instance itself. `getRacerType('horse')` returns an instance, but `instance.id` would be `undefined`. This is not a problem today, but would be useful on refactor to simplify debugging/logging.

### H — Mask-tinting: spriteTinter.js slightly blocking

`tintSprite` has no mode parameter, the composite sequence is hardcoded. For vehicle sprites (Buggy, Motorbike, Plane) that need e.g. overlay tinting instead of multiply (to achieve bright colors on dark sprites), `tintSprite` would need to be refactored. The cache key in `spriteTinter.js` would then need to be extended to `url+mode`. This is a short, isolated change, blocks nothing — but there is no extension point, you would have to touch it.

---

## 7. Initial refactor thesis

**1. `SpriteRacerType` is a configuration container, not a classic base class.**

The cleanest approach is not `extends`, but a single constructor that takes a config object:

```js
new SpriteRacerType({
  id: "horse",
  emoji: "🐴",
  spriteUrl: "/assets/racers/horse-trot.png",
  frameCount: 8,
  basePeriodMs: 700,
  displaySize: 40,
  coats: HORSE_COATS,
  defaultCoatId: "cream",
  speedMultiplier: 1.0,
  primaryColor: "#E8DCC4",
  accentColor: "#2A1F18",
  fallbackColor: "primaryColor", // or explicit '#E8DCC4'
  leaderRingColor: "#ffd700",
  leaderEllipseRx: 16,
  leaderEllipseRy: 10,
  trailFactory: horseTrailFactory, // only non-configurable part
});
```

`_getFrameIndex` and `_drawBody` move 1:1 into the class (they only read `this.config`). `getEmoji`, `getSpeedMultiplier`, `drawRacer` are generated from config. Trail remains a passed-in factory function.

**2. Trail stays type-specific — no schema, but factory function.**

The three trail systems (speed-reactive/angle-aware Horse, bilateral-spray Duck, radial-jitter Snail) are too different for a schema. A config object with 10 trail fields would be harder to read than a short factory function. `trailFactory` as a required param in the config object is clean.

**3. `fallbackColor` as an explicit config field.**

So the Snail drift (`accentColor` instead of `primaryColor`) is explicitly documented. Default: `'primaryColor'` as enum value or direct color specification.

**4. Clean up parallel trail systems.**

Before writing the base class, clarify whether RaceScreen still uses `getTrailParticles` or has already switched to `trail.createTrail`. If both are active: first switch RaceScreen, then remove `getTrailParticles` from all three classes, then refactor. Otherwise a base class design is created that carries a dead method.

**5. `spriteTinter.js` needs minimal preparation for mask-tinting.**

Add a `tintMode: 'multiply' | 'mask'` parameter to `tintSprite` (before or simultaneously with D3.5) and extend the cache key to `url + ':' + mode`. That is ~15 lines and decouples D3.5 from D3.3/D3.4 (if vehicle sprites need a different mode). If D3.3/D3.4 still use multiply, this can also be done afterwards — but the window closes once multiple sprite URLs are in use.

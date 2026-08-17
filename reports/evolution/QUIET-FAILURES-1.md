# QUIET-FAILURES-1 — it stops defaulting confidently

**Branch:** `fix/quiet-failures`, off master `2f22e140`. **No default value changed, no engine, no
camera, no drawing.** Every change is on a FAILURE path; the happy path is untouched and that is
asserted, not claimed.

---

## THE FIVE SITES, AND WHAT HE SEES NOW

| # | site | before | now |
| --- | --- | --- | --- |
| 1 | `trackLoader.cacheTrackGeometry` | geometry silently dropped; **the track raced anyway, guessing CLOSED** | the drop is named, and the track is **REFUSED** |
| 2 | `trackLoader.fetchServerTracks` | the last-known list shown as if it were the server's | says the list failed and how many tracks are from the last good load |
| 3 | `surfaceClassLoader.fetchServerSurfaceClasses` | custom classes and overrides silently absent | says the fetch failed and how many cached classes it fell back to |
| 4 | `storage.storageGet` | a corrupt value indistinguishable from an absent one | names the key and says what is **not in effect** — once per key |
| 5 | server route loaders (`tracks`, `racers`, `playerGroups`, `brands`, `surfaceClasses`) | — | **ALREADY COMPLIANT. Not touched.** |

**Site 5 is reported rather than changed**, per instruction. Each already does
`console.warn('[tracks] Failed to load <file>')` and skips — the failure is surfaced using this
app's own pattern, which is the whole ask. *One observation, not a change:* it names the file but
not the consequence (the track disappears from the API response), where the four client messages now
name both. That is a wording decision for the owner, not a defect.

**A SIXTH SILENT EXIT WAS FOUND WHILE FIXING THE FIRST.** `cacheTrackGeometry` had
`if (!res.ok) return null` — not an exception, so the `catch` below **never saw it**. An HTTP 500
from the geometry endpoint was even quieter than a timeout: it returned null without so much as
entering the failure path. It now throws into the same handler and is reported like everything else.

---

## THE REFUSAL — SAY IT PLAINLY SO HE CAN OBJECT

**A track whose geometry did not load can no longer be raced. Start Race and Quick Test are both
disabled, and the tooltip says the server could not supply the geometry.**

This is the piece's one place where honest handling means saying **no** to something he asked for,
and it is deliberate:

```js
// SetupScreen.jsx — before
const geom = getTrack(track.geometryId);
return geom ? !geom.closed : false;      // ← a MISSING geometry IS a closed track
```

That value becomes `raceMode: trackIsOpen ? 'time' : 'laps'`. **There is nothing honest to guess,
because the guess IS the race mode.** An open track whose geometry timed out ran as a laps race —
right name, right picture, wrong race, no message. `cacheTrackGeometry` drops a geometry on a 3 s
timeout and its caller discards the result, so this is one slow server away.

**The refusal reuses what the button already had** — `disabled` plus a `title` that says why. No new
component, no new message style, no new state. The Start button's tooltip is now split in two,
because the single old message blamed the operator (*"Add at least one player and select a track"*)
for what is a server failure.

**Belt and braces:** both handlers re-check and return, so a geometry evicted between render and
click cannot slip through the disabled button.

**IF HE OBJECTS**, the smallest revert is the two `disabled` expressions and the two handler guards;
the four console lines can stay, and he would be back to a guessed race mode with a console line
explaining it.

### The e2e suite will feel this, and it is better that it does

The browser suite's known flake is *this exact mechanism* — `client/e2e/appReady.js` documents it:
ten geometry fetches, seven workers, three seconds each, and a spec asserting `raceMode === 'time'`
reading `'laps'`. **That flake will now present as a disabled Quick Test button instead of a wrong
race mode.** Louder and truthful, but it is a changed failure signature in night work, named here so
nobody debugs it twice.

---

## THE TESTS ARE THE POINT

**28 assertions across 4 files, all exercising the FAILURE path** — the thing nothing had ever done,
which is precisely why the class survived.

| file | what breaks if it is deleted |
| --- | --- |
| `trackLoader.test.js` (+7) | the loader returns to failing in complete silence; a dropped geometry, an HTTP error, a failed list and a partial-geometry load all become invisible again |
| `storage.test.js` (+5) | `storageGet` can no longer tell an ABSENT value from an UNREADABLE one, and every loader in the app resolves through it |
| `surfaceClassLoader.test.js` (**new file**) | this loader returns to having **no tests at all** — it had none before today — and its 3 s timeout silently emptying the registry is unexercised |
| `SetupScreen.test.jsx` (+4) | the screen goes back to racing on a guessed open/closed flag |

**Every block also asserts the HAPPY PATH is silent and unchanged**, which is the other half of the
promise: a successful fetch returns the same object it always did and prints nothing.

### The old fixtures were reproducing the defect

Adding the refusal turned **seven existing tests red**, and every one of them deserved it: the Quick
Test fixtures seeded a `geometryId` with **no geometry behind it** and then started a race. They were
green because the screen guessed. The fixtures now seed a real geometry through one shared
`seedGeometry` helper, which is what makes those tests about *autofill* rather than about the guess.

**This is worth reading twice**: seven tests were passing *because* of the defect. Fixing it was
indistinguishable from breaking them until the fixtures were read.

---

## MEASURED, AND ONE THING THE MEASUREMENT CAUGHT

**`storage.js` is inside ALL THREE instruments' closures** — the closure walk says so, so all four
hashes were owed and all four were run:

```
WORLD      dc4647be0f55ebdb   unchanged
WORLD-OFF  854018ee5d3d83e1   unchanged
CAMERA     d9f45a4aea0e5778   unchanged
RENDER     1274c7e8444238e3   unchanged
```

**AND THE FIRST RUN FOUND A DEFECT IN THE FIX ITSELF.** The harness output carried:

```
[storage] "racearena:racerTypeOverrides" could not be read — localStorage is not defined;
          falling back to the default, so anything you had stored under it is NOT in effect
```

**No `localStorage` at all is not a failure — it is node.** The sim and all three fingerprint
harnesses import this module and have no storage API, so the warning fired on every run about a
value nobody had ever stored. A guard that cries wolf in the place it is read most is the failure
mode this project already has a name for. `storageGet` now returns silently when the API is absent
entirely, and speaks only when storage EXISTS and the read or parse failed — which is the browser
case the fix was written for. A test pins the headless silence.

**That correction only exists because the instruments were run rather than reasoned about**, and the
hashes were unchanged either way — so the measurement's value here was not the hash at all.

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `client/src/modules/storage/trackLoader.js` | +25 −5 — two failure paths named, one silent `return null` converted to a throw |
| `client/src/modules/storage/surfaceClassLoader.js` | +8 −1 |
| `client/src/modules/storage/storage.js` | +22 −1 — the warning, the one-per-key de-duplicator, the headless guard |
| `client/src/screens/SetupScreen/SetupScreen.jsx` | +45 −10 — two readiness checks, two handler guards, two tooltips |
| `client/src/modules/storage/trackLoader.test.js` | +7 tests |
| `client/src/modules/storage/storage.test.js` | +5 tests |
| `client/src/modules/storage/surfaceClassLoader.test.js` | **new**, 4 tests |
| `client/src/screens/SetupScreen/SetupScreen.test.jsx` | +4 tests, 2 fixtures corrected, 1 shared helper |

Tests added: **20**. Tests deleted: **0**. Tests merged: **0**. Fixtures corrected: **2** (they were
seeding the defective state).

**The `_reported` Set is not "a new state"** in the sense the brief forbids: it is module-local, it
is about logging only, nothing reads it, and it exists so that a browser with storage blocked cannot
fill the console with one line per render. One line per key is enough to name a cause; a thousand is
a different kind of silence.

### Noticed but left

- **`getTrack` already warns on corrupt geometry JSON** (`trackStorage.js`) — it was compliant
  before this piece and is untouched.
- **`apiClient.js` swallows a JSON parse failure** when building an error message
  (`catch { /* ignore parse failure */ }`). It is degrading an *error message*, not data, so nothing
  the user relies on is being substituted. Left deliberately.
- **`trackIsOpen` still computes `false` for a missing geometry.** The refusal means that value can
  no longer reach a race, but the lie is still computed. Making it `null` would ripple into the
  duration model and several displays — a bigger change than this piece should make unattended.
- **The two `useMemo`-free readiness checks run `getTrack` on every render.** It is a synchronous
  `localStorage` read that the screen already performed twice per render before this piece; no new
  I/O pattern was introduced.

---

## PROPOSALS

### Proposal A — one place that answers "what is degraded right now?"

Four sites now log, and a console line is only read by someone already suspicious. The cheap next
step is **not** a UI component: it is one module holding a list of `{source, cause, at}` that the
four call sites append to, and one line in the Dev Screen rendering it. The owner then has a single
place to look when something feels wrong, instead of a hypothesis and a console filter.

**Why it is worth doing and why it is separate:** it converts "I noticed a message" into "I can
check", and it is the first thing that would make the failure paths *observable* rather than merely
*audible*. It also needs his eye on where it belongs, which is why it is not in this piece.

### Proposal B — make the geometry load retry once before it gives up

The refusal is correct but blunt: a 3 s timeout on one of ten parallel geometry fetches now costs the
owner a track until he reloads. **One retry with a short backoff** — in `cacheTrackGeometry` only,
where the failure is per-track and cheap to repeat — would remove most refusals without weakening
any of them, because the honest handling stays in place for the case where the retry also fails.

**Deliberately not done here:** it changes the happy path's timing, and this piece promised that the
happy path stays byte-identical.

### Proposal C — teach the e2e suite to assert the refusal

The browser suite's flake and this defect are the same mechanism, and the suite currently works
*around* it (`appReady.js` waits for the data). Now that a missing geometry has a visible, stable
signature — a disabled button with a specific tooltip — a spec can assert **that** instead of
waiting. That turns the repository's longest-running flake into a test of the behaviour that causes
it, which is the strongest form the fix can take.

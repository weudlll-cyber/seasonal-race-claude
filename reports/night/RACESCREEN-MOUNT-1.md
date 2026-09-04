# RACESCREEN-MOUNT-1 — a test that mounts `RaceScreen`

**Block:** PIECE C of the night chain of 2026-09-04. Branch `night/2026-09-04`, off master `6953722d`.
**Answers:** `docs/BACKLOG.md` — *"`RaceScreen` is not testable"*, carried since 2026-08-22.

**No production code was changed. No fingerprint was minted.** One test file was added and one
backlog section moved from PART ONE to PART TWO.

---

## 1. It mounts

`client/src/screens/RaceScreen/mount.test.jsx` — three tests, green. They render the real component,
get it past its own `Loading…` placeholder, and assert the race chrome is on the page.

The proof that it is really running is in the test log, not in the assertions:

```
[RA CAMERA LIVE TRUTH] commit=… branch=night/2026-09-04 DIRTY resolvedGrammar=glide
leaderForwardFrac=0.66 hadStoredConfig=false … cameraSeed=2246827914
```

That line comes from the real `CameraDirector` announcing itself. **The race is built, not just the
chrome drawn.**

---

## 2. ★ It supersedes an owner decision, and that is said out loud

**D2, 2026-08-23:** *"`RaceScreen` is not testable — the finding STAYS, nothing is done… what is
closed is the question of whether to act on it."* And RACESCREEN-SEAM-1 (2026-09-02) priced a seam at
one line and concluded the file did not need it.

Tonight's chain re-opened exactly that question and ordered this test, with its own reason: **the
action dial is about to be built on this screen.** So this supersedes D2 by a later instruction, not
by ignoring it. **D2 was not wrong** — nothing here argues with its reasoning. The cost/benefit
changed when the next feature landed on the file.

---

## 3. What it took — and nothing of it is in the product

RACESCREEN-SEAM-1's one-line seam was **not** needed. `HTMLCanvasElement.prototype.getContext` is
stubbed in the test, which is where scaffolding belongs. Five things are supplied from outside:

| # | what | why, at source |
| --- | --- | --- |
| 1 | `sessionStorage['activeRace']` | the load effect throws without it and the screen renders its error card |
| 2 | the track geometry in `localStorage` | `getTrack` returns null otherwise → error card. **It is the real shipped record** from `server/seeds/tracks/dirt-oval.json`, not a hand-made shape: an invented geometry would drift from the ones the product runs |
| 3 | a 2D context | jsdom returns null, and the animation effect's first line is `ctx.imageSmoothingQuality = 'low'` |
| 4 | a bounded `requestAnimationFrame` | unbounded it spins for the whole test; at zero frames the loop is scheduled but never entered, which would make the test weaker than it looks |
| 5 | **a Router** | see below |

### ★ The fifth one is the finding worth keeping

`index.jsx` **imports no router package**. Grepping the file for `react-router` returns nothing, and
that reading is **wrong**: it calls `useFadeNavigate()` at `:121`, and that hook
(`client/src/contexts/TransitionContext.jsx:47`) falls back to `useNavigate()`, which throws outside
a Router.

**It was found by RUNNING the mount, not by reading for it** — the first run failed with
*"useNavigate() may be used only in the context of a `<Router>` component"*. That is a small live
example of the backlog entry's own thesis: a source-reading test is a lexical approximation of
behaviour, and this one had already misled the person writing the test that answers it.

---

## 4. The sabotage — 3 of 3, with a green control

Each mutation was applied to the real `index.jsx`, the test run, and the file restored and verified
byte-identical.

| the defect it stands for | result |
| --- | --- |
| a reference error in the animation effect — the screen never renders | **RED**, 3/3 tests |
| the load effect never setting `raceData` — a permanent `Loading…`, no error, no crash | **RED**, 3/3 tests |
| the geometry lookup always failing — the error card instead of the race | **RED**, 3/3 tests |

The second and third matter more than the first. A crash is loud; a screen that renders the *wrong*
thing — a placeholder, or an error card — is exactly what a test looking only for "no exception"
would pass. The third test in the file exists so that this file cannot quietly become a test of the
failure path.

**All three ship silently on master today**, because not one existing test renders the component:
`App.test.jsx:18` replaces it with `() => null`.

---

## 5. ★ AND THE SABOTAGE THE CHAIN NAMED IS STILL GREEN

The piece's own reason for existing cites it: *"setting every background path to null currently
leaves everything green."* **Re-measured tonight, and it still does.**

Forcing `bgImagePath` to `null` at `index.jsx:435` — which blanks every track background in the game
— passes **31 test files and 405 tests** in that directory, **the new mount test among them**.

**AND IT CANNOT BE CAUGHT THERE.** The mount test stubs the 2D context, so nothing it does is drawn.
It proves the screen RENDERS; it says nothing about WHAT it renders, and it must not try to — a test
asserting draw calls would be a worse copy of `render-fingerprint.mjs`, which draws the real bundle.

So the honest statement is that **the backlog item is half answered**, and the half that remains is a
different question from the one it asked: not "mount the screen" but "should the render fingerprint's
coverage reach the background layer". That belongs with the instrument. The backlog entry was
corrected to say so rather than struck.

---

## 6. What this does NOT do

- It is a **smoke test**. It proves the screen renders, not that it renders anything correctly.
- It asserts nothing about the picture, the camera or the physics, and must not grow into that.
  `render-fingerprint.mjs` and `viewer-invariants.mjs` drive the real bundle in a real browser and
  are strictly better instruments for every one of those questions. **What this catches is the class
  they cannot: the screen failing to render at all.**
- The file is still **1,959 lines** (1,917 when the finding was written). **No rewrite is implied,
  proposed or wanted.**

---

## 7. ⚠ The backlog entry's own verify command does not fire, and is not going to

The entry's liveness check was `git grep -n "render(<RaceScreen" -- '*.jsx'`, with *"the day it
returns a line, somebody has mounted the screen and the finding is answered"*.

**It still returns nothing and exits 1** — because the screen **cannot** be rendered in that shape.
It needs a Router, so the mount reads `render(<MemoryRouter …><RaceScreen /></MemoryRouter>)`.

The working check is `git grep -ln "RaceScreen" -- 'client/src/screens/RaceScreen/mount.test.jsx'`,
or simply running that file. This is **recorded rather than quietly fixed**: a liveness check that
was itself a lexical guess is the same lesson one level up, and it is worth a reader's attention.

---

## 8. Source hygiene

| file | before | after | what changed |
| --- | --- | --- | --- |
| `client/src/screens/RaceScreen/mount.test.jsx` | — | 203 | new |
| `docs/BACKLOG.md` | 4,202 | 4,269 | the PART ONE section (48 lines) moved to PART TWO carrying its original text verbatim, plus the answer; and the hygiene-phase list's item 1 rewritten to what is now true rather than struck |

**No production file was touched** — `git show --stat` on the commit lists exactly two files, and
`git status` on `index.jsx` was clean after every sabotage.

**Noticed and deliberately left:** the background-layer blindness (§5); `App.test.jsx:18` still
replaces the screen with `() => null`, which is correct for that test and is not a defect.

`node scripts/engine-reach.mjs --check client/src/screens/RaceScreen/mount.test.jsx docs/BACKLOG.md`,
verbatim:

```
ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  2 outside the hull (cannot reach the engine at all): client/src/screens/RaceScreen/mount.test.jsx, docs/BACKLOG.md
```

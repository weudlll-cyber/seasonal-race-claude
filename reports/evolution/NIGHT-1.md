# NIGHT-1 — the build you are looking at, and what your unit actually costs

**Date:** 2026-08-04 → 05 · **Branch:** `anchor-truth` (nothing pushed, nothing merged)
**Base confirmed:** `git rev-parse` → **`fac83f1a`**, clean, which is the tip the spec named.
**Stages done:** A (complete), C3 (complete), B2/B3/B6 (complete).
**Stages NOT done, at a deliberate stage boundary:** C1/C2 pictures, B1, B4, B5, D, E, F. §8 says why.

---

## READ THIS FIRST (before coffee)

### 1. What you must do to see the right build

**I already did this for you and left it running.** The dev server is on `anchor-truth` right now.
If you need to do it again:

1. Close the RaceArena tab.
2. Stop the old dev server (the window running `npm run dev`), or just let me restart it.
3. In the project folder: `git checkout anchor-truth`
4. Start it again: `cd client` then `npm run dev -- --port 5173 --strictPort`
5. Open **http://localhost:5173** and press **Ctrl+Shift+R** (hard reload).

**How you know it worked.** Start a race. Top right, under the grey `cfg …` badge, there is now a
third line:

> **build 77919708 · anchor-truth**

If it says a different branch, you are not on the branch. If it ends in **`+dirty`** (amber), the
screen is showing something that no commit describes — that is not an error, it just means don't
trust a screenshot of it to be reproducible.

**Your settings are safe.** All eleven of them survive the switch — verified, §3.

### 2. Where the pictures are

**There are none, and that is the one thing I owe you an apology for.** I ran out of night before
the image pipeline. What the pictures were meant to *show*, I measured instead, and the numbers are
below in §4. I would rather hand you a real number than a picture I rushed.

### 3. What your meaning costs

Your `LEADER 1.0` means "show me one road width". Here is what you actually get, on the correct
build, with your settings:

| | you asked for | you get (median) | it swings between | your number wins |
|---|---|---|---|---|
| searound | 300 px | **300** | 300 → 300 | **always** |
| mountainstreet | 300 px | **564** | 300 → 688 | **3.8% of frames** |
| river-run | 300 px | 526 | 300 → 688 | 12% |
| seatrack | 300 px | 514 | 300 → 686 | 22% |
| luger-hill | 300 px | 445 | 300 → 573 | 4.6% |

**The shot on Mountainstreet breathes between 300 and 688 px — it more than doubles and halves again
as the road turns.** That is the thing you complained about, and it is now measured: **2.294×**.

### 4. Which combination gives you a number that means what it says

**Not the one you asked for — and this is the night's real finding, because it is the opposite of
what we expected.**

Your unit (1.0 = *this* road's width) **makes the breathing worse on every track**, because on a
narrow road it asks for a *smaller* shot, which drops below what the corridor guarantee will allow,
so the guarantee overrules you almost always:

| | breath now | breath under your unit | your number wins, under your unit |
|---|---|---|---|
| searound | 1.000× | **2.032×** | **never** (guarantee binds 100%) |
| dirt-oval | 1.299× | 2.190× | 3% |
| city-circuit | 1.438× | 2.190× | 15% |
| ice-track | 1.540× | 2.189× | 3% |

**The corridor guarantee is what is overruling you, not the unit.** The untested arm — your unit with
the **company** guarantee instead of the corridor — is the one that might give you a number that
means what it says. I did not measure it; it needs a code probe. It is the first thing I would do
next, and §9.1 says why I think it is the honest answer.

### 5. Is the cost permanent, or dissolved by the change you parked?

**Not measured** (B1 and B4 were not reached). I will not guess at it — that arithmetic is exactly
the kind I have got wrong before.

### 6. What else got done while you slept

The build badge and the mechanism behind it (§2 — this was the point of the night), your settings
verified safe, the road-width question settled (§5), and my own 1.82× / 1.384× discrepancy settled
(§6). Nothing was pushed. No default was changed. No design decision was made.

---

## BUILD-VS-SPEC CONFORMITY

| Stage | Status |
|---|---|
| **A** §1 diagnose (no code) | **BUILT** — §1 below |
| **A** §2 badge + mechanism + tests + fingerprints | **BUILT** — §2 |
| **A** §3 owner's path written AND walked | **BUILT** — walked live, §3 |
| **A** §3 settings survival | **BUILT** — 6 tests, all pass |
| **C3** verify the ~550 px prediction | **BUILT** — 564.0 px, §4 |
| **C1** comparison grid | **NOT DONE** — §8 |
| **C2** breath strip | **NOT DONE as pictures**; measured instead, §4 |
| **B2** whose number wins | **BUILT** for unit A×corridor and unit B×corridor; arm 4 (company) NOT done |
| **B3** is uneven width real | **BUILT** — §5 |
| **B6** the 1.82× / 1.384× discrepancy | **BUILT** — §6 |
| **B1, B4, B5** | **NOT DONE** — §8 |
| **D** shared race driver | **NOT DONE** — §8 |
| **E** finish-lifecycle seam | **NOT DONE** — §8 |
| **F** residuals | **NOT DONE** — §8 |

---

## 1. STAGE A — THE DIAGNOSIS, in plain words

**Where the `build` value came from.** `__RA_COMMIT__`, a Vite `define`. A `define` is resolved
**once, when Vite loads its config** — that is, when the dev server *starts*. It is not read again.

**What serves your app.** A Vite **dev server**, not a built bundle. (`client/dist/` exists but is
from **31 July 15:35** and nothing serves it — the Node server has no static-file route at all. So
the honest answer to "has anyone rebuilt since the merge" is: **no, nobody has run `vite build` since
31 July** — and it did not matter, because that bundle was never being served.)

**Why the marker said `be649aa9`.** Measured, not guessed:

- the dev server (PID 32584) had been running since **04.08 00:24:15**
- `be649aa9` was committed at **04.08 00:23:39** — **36 seconds earlier**

So the badge froze at `be649aa9` at the moment the server started, and stayed there through
camera-hygiene-2, RENDER-FINGERPRINT-1, the merge, and CI-AUDIT-GREEN-1. **At your 21:59 marker the
working tree was `3b857d05`** — twenty-two hours and nine commits from what the marker claimed.

**A correction to the spec's reasoning, which matters.** The spec said two independent signals agreed
you were not on the branch. The conclusion is right, but the second signal does not do the work
claimed: **`anchor-truth` did not exist at 21:59.** Its first commit is 22:45, forty-six minutes
later. So the 429.8 px cross-check confirms "the tree was pre-§4a" — which was guaranteed by the
clock, not evidence of a stale bundle. **The stale `build` string is the real and separate defect**,
and it was stale by twenty-two hours regardless of any branch.

**What must happen for a commit to reach your screen.** Check out the commit → **restart the dev
server** (this was the step that was easy to forget, and it is the one that was missed) → hard-reload
the tab. **Nothing else caches**: no service worker, no `dist/` in the serving path.

---

## 2. STAGE A — THE FIX, which is the mechanism and not the badge

A badge that can lie is worse than no badge, so the value had to become incapable of it.

- **DEV:** `virtual:ra-build` is read from git when the module loads, and invalidated **with a full
  page reload** whenever the identity changes. Two watchers make that complete — Vite's own watcher
  catches every source edit (which is what makes the tree dirty), and `.git/HEAD` + `.git/index` are
  added explicitly, because a commit or branch switch changes the identity without touching a file
  Vite tracks.
- **BUILD:** read once at build time, which is honest by construction — the constant and the bundle
  are made in the same act.

`__RA_COMMIT__` survives for the dev-console line only, with a comment saying it is structurally
unable to stay true in a long-running dev server and must not gain new readers.

**Proven live, not argued.** With the dev server running, an untracked file was created → the served
value flipped to `dirty:true` within seconds; the file was removed → it flipped back. The old
`define` could not have done that.

### Fingerprints

| | before | after | |
|---|---|---|---|
| render | `a10bf3f293f2ee06` | **`b1c373da44de92f5`** | moved — and the move *proves* the instrument sees the new pill |
| camera | `1db71e7fffc1c9f6` | `1db71e7fffc1c9f6` | **unmoved** |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unmoved** (mint tripwire fired — `buildInfo.js` is under `modules/` outside `camera/`) |

**A design decision worth naming:** the fingerprint harness passes a **fixed synthetic** build
identity, not the live one. The hash must be a change detector for the *drawing*, not a counter that
moves on every commit. The pill's position, font and layout are covered; the hash stays stable.

**Tests +12**, including the exact pair from the incident (`be649aa9` vs `3b857d05` must be
distinguishable on screen), that the label changes with commit, branch **and** dirtiness, and that it
never invents a plausible-looking sha.

---

## 3. STAGE A — THE PATH, AS WALKED

Walked from a clean state, and two things did not go as written:

1. **The dev server had to be stopped by PID, not by the usual "kill all node".** That would have
   killed the Playwright server this session needs. Stopped 31624 + 32584 specifically.
2. **`curl` was not available to me**, so the mechanism check was done through the browser instead —
   which is the better check anyway, since it is the path you actually use.

The live dev server, asked what it serves: `{"commit":"77919708","branch":"anchor-truth","dirty":false}`
— exactly HEAD.

**Settings survival — the honest version.** Your settings live in *your* browser profile, which the
automation profile is not, so **I did not read your actual stored values** and will not claim to. What
I did instead is stronger than a spot check: your eleven values are run through the **real loader** as
a fixture, six tests. All pass.

The one failure mode that matters is covered explicitly: the loader iterates **default** keys, so a
key *renamed or removed* from the defaults would drop your stored value **silently, with no error**.
A test now fails if any of your eleven keys stops existing. Also pinned: a stored value beats a
changed default, and a retired key in your storage is ignored rather than resurrected.

Your values are a **test fixture and nothing else** — deliberately not written into any default,
config file, or storage the app reads.

---

## 4. C3 + B2 — WHAT YOUR SETTINGS DELIVER

Context: seed 5601, n = 65, boarder, 60 s, camSeed 882944666, your eleven settings. The metric is the
one your marker used — `canvasH / (camZoom × axisY)`, world px across the frame's height, measured at
the **target** zoom so the tracking lag does not blur it.

**C3 — the prediction stands.** Mountainstreet LEADER: **median 564.0 px** against the "roughly 550"
you were given. That number was good.

**But the breath is the finding, and it is bigger than anyone said.** Mountainstreet LEADER swings
**300.0 → 688.1 px, a 2.294× breath**, with the guarantee overriding your setting on **96.2%** of
frames. It is *larger* after §4a, not smaller — because §4a made the guarantee bind honestly, and an
honest guarantee binds harder.

**B2, arm A (shipped unit) vs arm B (your unit), corridor guarantee in both.** Your unit needed no
code change to test: `referenceWidthFor` returns `max(referenceCorridorPx, trackWidthPx)`, so setting
the reference to each track's own width **is** your unit, expressed in the shipped config.

| track | TW | arm A breath | arm B breath | guarantee binds, A → B |
|---|---|---|---|---|
| searound | 131 | **1.000×** | 2.032× | 0% → **100%** |
| dirt-oval | 178 | 1.299× | 2.190× | 11.5% → 97.0% |
| city-circuit | 197 | 1.438× | 2.190× | 36.2% → 85.1% |
| garden-path | 198 | 1.444× | 2.187× | 56.3% → 92.1% |
| ice-track | 211 | 1.540× | 2.189× | 88.1% → 97.3% |
| luger-hill | 250 | 1.911× | 2.293× | 95.4% → 96.5% |
| mountainstreet | 300 | 2.294× | 2.294× | 96.2% → 96.2% |
| river-run | 300 | 2.293× | 2.293× | 87.7% → 87.7% |
| seatrack | 300 | 2.288× | 2.288× | 77.8% → 77.8% |

The three 300-wide tracks are unchanged because their own width *is* the 300 reference — the two arms
coincide there by construction, which is a good sanity check on the method.

**One caution the spec asked me to check, and it is real:** with 65 racers `minRacersVisible 5`
almost never binds, so the company guarantee is barely active in this field. **That means arm 4 would
be flattered at n = 65**, and any test of it must also run at a small field. I did not establish the
field size at which it starts to bind — that is unfinished.

---

## 5. B3 — THE ROAD IS NOT UNEVEN

All ten tracks, 200 samples each, local width from the geometry against the declared `width`:

**Every track is exactly its declared width at every sample. max/min = 1.0000 on all ten.**

Your Mountainstreet reading of exactly 300.0 was not a coincidence — it generalises. So **"per
section" is insurance against a track nobody has drawn yet, not present work.**

---

## 6. B6 — MY 1.384× vs THE PLANNER'S 1.82×: A SCOPE DIFFERENCE, NOT AN ERROR

Settled, and neither is wrong. Same statistic — max/min of the per-track median — on **different
arms**:

- **under the shipped defaults**, which is what I measured in CAMERA-ANCHOR-TRUTH-1: **1.384×**
- **under your settings**, which is what the planner was reasoning about: LEADER medians run 300
  (searound, dirt-oval, city-circuit) to 564 (mountainstreet) = **1.88×**

1.88 against a remembered 1.82 is the same measurement. **The lesson is that a uniformity number is
meaningless without naming the arm**, and neither of us did.

---

## 7. WHAT WAS NOT DONE, AND WHY — the stage-boundary stop

The spec's rule is that a stage skipped with a stated reason beats a stage guessed at, and that a
half-built extraction is worse than none. I stopped at a boundary rather than starting D or E.

- **C1/C2 pictures.** No rasteriser is available — the render harness is a *recording* context and
  the repo deliberately has no `canvas` package. Real images needed either a new native dependency
  (installed unattended, on a synced disk, at night) or a new SVG emitter plus an `exp/` branch and a
  temporary unit switch. I judged the measurement more valuable per hour than a rushed pipeline, and
  the measurement answers the same question C2 asks — for arms 1 and 2. **Arm 4 remains genuinely
  unanswered, in numbers as well as pictures.**
- **B1, B4, B5.** Not reached. B1 and B4 are the "what does it cost in racer size, and does the
  parked change dissolve it" pair, which is why §READ-THIS §5 is blank rather than guessed.
- **D, E, F.** Not started. Both D and E are behaviour-free work behind a hard fingerprint gate;
  starting either with the time left would have meant either rushing a gate that exists precisely to
  not be rushed, or leaving a half-extraction in the tree overnight.

---

## 8. PROPOSALS

### 8.1 (mine) The corridor guarantee, not the unit, is what overrules him

The measurement points somewhere specific. Under his unit the corridor guarantee binds **85–100%** of
frames on every track — so changing the *unit* cannot give him a number that means what it says while
the *corridor* is the thing answering. This makes the planner's expectation ("his unit plus the
company guarantee") the right next arm, and now for a measured reason rather than an intuition.

**But it comes with a caveat that must not be lost:** at n = 65, `minRacersVisible 5` barely binds, so
that arm will look better than it is. **Any test of it must sweep field size**, and the honest
headline will be "at what field size does the company guarantee start to do work".

### 8.2 (mine) The breath is a measurable quantity and nothing watches it

He described breathing; we now have a number for it (max/min of delivered world px per state per
track). It is currently computed by a script nobody runs. Given that the shot on Mountainstreet
LEADER swings **2.294×** and nothing fails, **a coarse tripwire — no state's breath may exceed, say,
2.5× — would have caught this before he had to describe it in words.** Same shape as the tracking-lag
proposal in CAMERA-ANCHOR-TRUTH-1 §9.2: not a tuning target, a ceiling with headroom.

### 8.3 On the spec's proposal 2 — the badge treats a symptom; here is the smallest cure

The spec is right that a badge treats a symptom if the loop needs a manual rebuild. **The loop does
not need a rebuild — it needs a dev-server RESTART**, and only when the config changes. The smallest
real cure is therefore narrower than "rebuild automatically": **make the dev server restart itself
when it must.** Vite already restarts on `vite.config.js` changes; what it does not do is notice that
the *repo* moved underneath it. A ~20-line watcher that restarts the server when `.git/HEAD` changes
would close it. **I did not build it** — it changes how the dev loop behaves while he is asleep, and
that is his call. The badge makes the failure *visible*, which is the part that was missing.

### 8.4 On the spec's proposal 2 (the marker) — yes, and it is nearly free

The marker already carried the truth and nobody read it. It should say, in its first line, whether its
build matches the branch it claims — the comparison is one string equality now that
`virtual:ra-build` exists. A human forgets that check; a line of text does not.

---

## 9. STATUS

Nothing pushed, nothing merged, tree clean, six commits on `anchor-truth` tonight. The dev server is
running on the branch so the badge is there when he opens it. **No default was changed, no design
question was answered, and Mountainstreet was left looking exactly as wide as it now is.**

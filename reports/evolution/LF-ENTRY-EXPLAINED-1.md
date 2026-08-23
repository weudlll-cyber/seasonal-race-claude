# LF-ENTRY-EXPLAINED-1 — `_lfEntryByState` is not read at all

**Date:** 2026-08-23 · **Branch:** `measure/fairness-split` (carried with PIECE 8; documents only)
**Piece 10 of NIGHT-2026-08-22.** **READ-ONLY — explanation, no change.**

---

## THE ANSWER, MEASURED RATHER THAN READ

**`_lfEntryByState` is consumed on ZERO frames of a real race under the shipped configuration.**
Driven on two contrasting tracks, seed 9, 40 racers, through the whole race including the ending:

| track | frames | **`entry`** | `glide` | `tracking` | entry share |
| --- | ---: | ---: | ---: | ---: | ---: |
| dirt-oval (closed) | 5588 | **0** | 740 | 4848 | **0.0000%** |
| river-run (open) | 3862 | **0** | 592 | 3270 | **0.0000%** |

**The map is reachable only under one configuration value, and nothing ships it.** Forcing
`cameraTransitionGrammar: 'legacy'` and changing nothing else:

| track | frames | **`entry`** | `glide` | `tracking` | entry share |
| --- | ---: | ---: | ---: | ---: | ---: |
| dirt-oval | 5588 | **913** | 255 | 4420 | **16.34%** |
| river-run | 3862 | **363** | 255 | 3244 | **9.40%** |

**So the brief's premise is half right and the correction matters.** It says *"It is NOT vestigial —
all six states differ by a factor of three."* **The VALUES are deliberate-looking, and they do differ
— but the map is vestigial on the shipped path**, because nothing reads it. Both halves are stated
because acting on the first without the second would tune a quantity that produces no pixels.

## §1 — WHAT IT IS, AND WHAT READS IT

**One consumer, `CameraDirector.js:816`:**

```js
_lerpFactorForState(state) {
  const map = this._lerpPhase === 'entry' ? this._lfEntryByState : this._lfByState;
  return map[state] ?? map.OVERVIEW;
}
```

**So the map is selected by a single condition: `_lerpPhase === 'entry'`.**

It is built in `cameraTimingComputation.js:303-307` from each state's `entryTC`, falling back to that
state's `trackingTC` when no `entryTC` is given (`:228-230`) — so a profile that names no entry time
constant gets entry-equals-tracking rather than a default from somewhere else.

## §2 — WHY IT IS NEVER SELECTED

`_transition()` sets `this._lerpPhase = 'entry'` at `:1779`. **Later in the same transition it is
overwritten**, at `:2066`:

```js
} else if (this._transitionGrammar !== 'legacy') {
  this._observerPhase = 'follow';
  if (this._transitionGrammar === 'cut') { this._lerpPhase = 'tracking'; … }
  else { this._lerpPhase = 'glide'; … }
}
```

**The shipped value is `'glide'`** (`defaults.js:860`, `cameraTransitionGrammar: 'glide'`), and
`framingConfig.js:119` resolves anything that is not `'cut'` or `'glide'` to `'legacy'`. So on every
shipped transition the condition is true, `'entry'` is replaced before a frame is drawn, and the
entry map is never selected. **The `'entry'` assignment at `:1779` is live code whose effect is
undone a few hundred lines later, every time.**

**Two states never reach it even under `legacy`, for separate reasons**, which is worth knowing
before anyone tunes the six values:

- **LEAD_CHANGE** hard-cuts at `:1808` — `this._lerpPhase = 'tracking'` on entry, *"skip entry lerp —
  camera snaps to lead-change zoom immediately"*. It stands down only inside the scheduled endgame.
- **OVERVIEW** snaps its ZOOM on entry (`:1832`), so even where the entry factor applies it governs
  the PAN, not the zoom the value looks like it is about.

## §3 — WHAT EACH OF THE SIX VALUES WOULD PRODUCE, IF IT WERE READ

`tcToLerpFactor(tc) = 1 − 0.1^(1/(tc·60))`; 90% convergence ≈ 3.45·TC.

| state | trackingTC | entryTC | lf(tracking) | lf(entry) | 90% tracking | **90% entry** | entry is |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| OVERVIEW | 0.25 | **1.5** | 0.1423 | 0.0253 | 0.86 s | **5.18 s** | **6.0× slower** |
| LEADER_ZOOM | 0.25 | 0.8 | 0.1423 | 0.0468 | 0.86 s | 2.76 s | 3.2× slower |
| BATTLE_ZOOM | 0.25 | 0.8 | 0.1423 | 0.0468 | 0.86 s | 2.76 s | 3.2× slower |
| COMEBACK_ZOOM | 0.25 | 0.8 | 0.1423 | 0.0468 | 0.86 s | 2.76 s | 3.2× slower |
| PHOTO_FINISH | 0.25 | 0.8 | 0.1423 | 0.0468 | 0.86 s | 2.76 s | 3.2× slower |
| LEAD_CHANGE | 0.25 | 0.8 | 0.1423 | 0.0468 | 0.86 s | 2.76 s | 3.2× slower |

**On screen it would mean:** entering a shot, the camera takes **2.76 s** to close 90% of the
distance to its new framing instead of the 0.86 s it uses once settled — a deliberately gentler
arrival — and **5.18 s** for OVERVIEW, the widest and slowest move. **That is a coherent design.**
It is simply not the design that runs: the glide grammar replaced it with a *bounded ease of a
chosen duration* rather than an exponential time constant.

## §4 — THE HISTORY IS IN THE FILE, AND IT EXPLAINS THE SHAPE

`CameraDirector.js:1836-1843` records that FINISH-MOTION-1 removed a line which wrote
`_lfEntryByState[OVERVIEW] = tcToLerpFactor(...)` at the finish:

> *a SECOND representation of "how long the finish zoom-out takes" … It was also a permanent mutation
> of a shared map: nothing ever restored it, so every later OVERVIEW entry in that race inherited the
> finish's slow entry TC.*

**So this map has already caused one real defect** — not by its values, but by being a shared mutable
map that a special case wrote into. The removal fixed that; what it left behind is the map with no
remaining reader.

---

## THE ONE QUESTION FOR THE OWNER

**`_lfEntryByState` and the six `entryTC` values produce no pixels today. Three ways to leave it, and
this is your call, not mine:**

1. **Leave it exactly as it is.** Costs nothing at runtime; costs the next reader the hour this piece
   took to discover that a plausible-looking six-value map is inert.
2. **Delete the map and the six `entryTC` keys**, and delete the `'entry'` assignment at `:1779` that
   is undone every transition. **Blast radius:** `entryTC` is a Dev Screen-visible profile field and
   four tests assert on `_lfEntryByState`; deleting it removes the *option* of ever restoring the
   legacy grammar's gentler arrival.
3. **Keep it and say so where it is.** A comment on the map naming the one condition that selects it
   (`transitionGrammar: 'legacy'`) and the measured fact that nothing ships that value.

**My reading, offered because you asked for an explanation and not a recommendation:** option 3 is
the cheapest thing that stops this being rediscovered, and option 2 is only safe once you have
decided the legacy grammar is never coming back — which is a question about the camera's future, not
about this map.

---

## VERIFICATION

| instrument | ran? |
| --- | --- |
| the frame-by-frame probe | **RAN** on two contrasting tracks (R4), both grammars, whole race |
| fingerprints, suites, gates | **NOT RUN, and the answer is determined by construction: this piece changed no file.** The probe lives in the scratchpad and is not part of the repository. |

## BUILD VERSUS SPEC — conformity

| the spec asked | what happened |
| --- | --- |
| establish what it does | done — §1 |
| what reads it | done — **one** consumer, and on the shipped path **nothing**, measured (§2) |
| what each of the six values produces on screen | done — §3, converted to 90%-convergence seconds |
| what would change if it were set deliberately | **nothing, unless the grammar changes** — that is the finding |
| explanation only, no change | **no file in the repository was modified by this piece** |
| the decision goes on the morning sheet as one question | done |

**ONE DEVIATION FROM THE BRIEF'S PREMISE, stated rather than glossed:** it says *"It is NOT
vestigial."* Measured, **it is** — on the shipped path. The values are deliberate; the map is unread.

## PROPOSALS — for the owner, nothing done

1. **A guard against a config map with no reachable reader.** This map is selected by one condition
   whose only enabling value is unshipped, and nothing noticed for as long as the glide grammar has
   been the default. **Cost, and it is why this is a proposal:** "reachable" here needed a driven
   race to establish — a static check would have said the map IS read, because `:816` reads it. Any
   honest version of this guard is a runtime probe, which is a different and more expensive animal
   than the lexical guards this repo runs.
2. **Fold the probe into `viewer-invariants` as a counted event.** It already drives real races and
   already reports violations as EVENTS. A per-frame `_lerpPhase` histogram would make "which phase
   is the camera actually in" a standing number rather than something a night block rediscovers.
   **Cost:** one more column in an instrument whose output the owner reads; worth it only if the
   phase mix is a thing he wants to watch.

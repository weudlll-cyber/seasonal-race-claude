# FRAME-GAP-2 — production reproduced the 33 ms frame, and it is the page around the canvas

**Branch** `feat/frame-gap-2`, cut from `feat/frame-gap-1` (`860f3a05`). **Diagnosis only — nothing
fixed, nothing merged, React untouched.** No source file changed: this block is a measurement and its
record. All four fingerprints re-run and unchanged; `engine-reach --check` clears every changed path.

**THE HEADLINE. FRAME-GAP-1 could not make a 33 ms frame and therefore could not locate one.
Production made one.** With the page around the canvas, at a large window, in a minified production
bundle: **`total` p90 33.4 ms with `rafLate` p90 13.2 ms**, and the identical run with that page
hidden: **16.8 ms with `rafLate` p90 0.8 ms**. The doubt was worth testing, and it paid.

**AND THE SECOND FINDING IS THE ONE THAT MATCHES HIS EXPERIMENT.** In production the DOM's cost
**scales with window area**: at the small window it is **zero** (`rafLate` p90 0.7–0.8 with the page,
0.6 without). In the dev bundle the same arm cost a flat ~2.3 ms at *both* window sizes. **The dev
bundle's own overhead was masking the area-dependent part** — which is precisely the property the
owner's window-shrink established and which FRAME-GAP-1 reported as absent.

---

## 1. First, the thing he was waiting on

The dev server on **5173 is pointed at `feat/frame-gap-1`**, pill read from the module:
**`build 860f3a05 · feat/frame-gap-1`**, `dirty: false`, `uncertain: false`. The perf log was
exercised in that exact bundle: `rafLate` records and reaches the stats, and `longTasks.supported` is
`true` in his Chrome, so both new HUD rows will carry real numbers. **5173 was left there.**

## 2. What was built and how it differs

A production build of the SAME bench arms — same reconstruction of the race screen's DOM, same
100-row standings list on the same 250 ms cadence, same background canvas at 6144×4096 re-transformed
every frame, same real `renderRaceFrame` / physics / camera, same `rafLate` measurement — through
`vite build` and served by `vite preview` on 4173. **The only difference from FRAME-GAP-1 is the
bundle**: minified and tree-shaken, against hundreds of separate unminified ES modules.

Everything was deleted afterwards; no bench file is in the repository.

## 3. The numbers

100 racers, mountainstreet, mid-race, 420 measured frames per arm after a 90-frame warm-up, arms
interleaved. **Milliseconds, p50 / p90. His machine; not portable.**

### Production versus dev, same arms

| arm | bundle | total | rafLate | physics | render | pace |
| --- | --- | --- | --- | --- | --- | --- |
| A-on, large window | dev | 16.7 / 16.8 | 0.6 / 3.8 | 3.4 / 4.4 | 3.7 / 4.9 | 1002 |
| A-on, large window | **prod** | 16.7 / 16.8 | 0.5 / **1.0–3.1** | **2.2–2.4** / 3.5 | 3.2–3.5 / 5.2 | 1002 |
| A-off, large window | dev | 16.7 / 16.8 | 0.6 / 0.8 | 3.7 / 4.5 | 3.5 / 4.1 | 1002 |
| A-off, large window | **prod** | 16.7 / 16.8 | 0.5 / **0.6–0.8** | **2.2** / 3.1 | 2.9–3.1 / 4.5 | 1002 |
| A-on, small window | dev | 16.7 / 16.9 | 0.6 / **3.3** | 3.3 / 4.2 | 3.6 / 4.6 | 1002 |
| A-on, small window | **prod** | 16.7 / 16.8 | 0.5 / **0.7–0.8** | 2.0–2.2 / 3.2 | 2.7–2.9 / 4.8 | 1002 |
| A-off, small window | **prod** | 16.7 / 16.8 | 0.4 / 0.6 | 2.1–2.2 / 3.2 | 2.6–2.9 / 4.4 | 1002 |

**The dev bundle is a real cost and a modest one**: physics p50 **3.4 → 2.2–2.6 ms**, about a third
faster minified, and `rafLate` p90 lower everywhere. Worth knowing on its own — and note that the
owner's own reported physics figure, 2.6 ms, is the PRODUCTION number here, not the dev one.

### The event

One arm in roughly nineteen A-on arms at the large window — about two minutes of running — went
bimodal:

| | total p50 / p90 | rafLate p50 / p90 | render p50 |
| --- | --- | --- | --- |
| **A-on (the event)** | 16.7 / **33.4** | 4.6 / **13.2** | 6.2 |
| A-off, same batch, immediately after | 16.7 / 16.8 | 0.6 / 0.8 | 3.7 |

**33.4 ms is exactly one missed vsync**, which is the shape of his "40 % of frames take 33.3 ms".
`rafLate` p90 13.2 says where it went: **the browser was 13 ms late to us before our code ran.** Our
own draw rose too (6.2 vs 3.3 p50) — GPU back-pressure reaching back into our `drawImage` calls — but
that is a symptom of the same congestion, not its cause.

**It was never observed with the page hidden, never at the small window, and never in the dev
bundle.**

### Honesty about the frequency, and one hypothesis tested and refuted

**1 event in ~19 arms is not his 40 % of frames.** The mode is reproduced; its severity and rate are
not. A tempting explanation was that the event followed a fresh page build — three of the elevated
arms were the first after `setup()`. **Tested directly and refuted**: three cycles of
setup → measure-immediately gave `rafLate` p90 2.0, 2.2 and 1.5 with `total` p90 16.8 every time. It
is genuinely intermittent.

**Run-to-run spread, since the verdict rests on it.** `A-off` is remarkably stable — `rafLate` p90
**0.6–0.8 across every production arm at every window size**. `A-on` at the large window is the
opposite: **1.0, 1.1, 1.1, 1.4, 1.5, 1.5, 1.7, 2.0, 2.2, 2.2, 2.7, 2.7, 3.0, 3.1, 3.5, 7.1, 7.2,
13.2**. That distribution — a stable floor with a long tail — **is itself the finding**: the page
around the canvas does not add a fixed cost, it adds a RISK of a large one, and the risk exists only
at the large window.

## 4. What this changes

FRAME-GAP-1 concluded that arm A was "real but too small and does not scale with area", and used that
to demote it. **Both halves of that were artefacts of the dev bundle.** In production the cost
vanishes at a small window and grows a long tail at a large one. The corrected reading:

- **The page around the canvas is the leading suspect again**, and now for the right reason — it is
  the only thing whose cost depends on window area, which is the one property his own experiment
  established.
- **`rafLate` is doing its job.** In the one reproduced event it accounted for 13.2 of the ~16.6 ms
  gap. That is the instrument answering the question it was built for.
- **Our draw code is still not the problem.** With the page hidden, production holds 16.7 / 16.8 at
  every window size with `physics` at 2.2 and `render` at 2.9 p50.

## 5. What is NOT established, and what is his to decide

- **Which part of the page.** The arm hides the standings list AND the 6144×4096 background layer
  together. They are not separated here, and separating them is the obvious next measurement — the
  background canvas is the area-scaling suspect on its face, the list is the one that churns.
- **Why it is intermittent**, and why his session sustains it where this harness sees it once.
- **React.** Deliberately untouched, per the brief. This harness's list is hand-rolled DOM; his goes
  through the reconciler four times a second, which can only add to whatever is measured here.

**The cheapest thing that would settle it is still his own log**, now that 5173 carries the
instrument: one 100-racer race at full window, and the `rafLate` row against `other`.

# RACE-JUDDER-1 — where the jumps and the stutter come from, on his race

**2026-08-22 · branch `invest/race-judder` off master `4024024e` · INVESTIGATION ONLY — no camera
change, no key, no fix.**

**THE ANSWER, IN ONE SENTENCE: all three are true, and they are not independent — (b) is the
dominant camera-side defect (windows of one second in which the picture travels 757 px and ends 4 px
from where it started, with 42 direction reversals, every step far too small for a maximum-step bound
to see), (c) is real and large (28.6% of frames delivered at two vsyncs instead of one), and (c)
MAGNIFIES (a): 69 of the 100 worst-moving frames were doubled frames against a 33.5% base rate.**

**SKIPPED, per R15, and what determined each answer:** the 80-race sheet, the four fingerprints and
the client suite — no file in any of their reach was touched; this block adds one diagnostic script
and one opt-in flag to a harness. **The browser gate was NOT skipped**, and deliberately: this block
edits `viewer-invariants.mjs`, which IS the gate's own script, so the change could have altered the
gate's answer. Re-run after the edit: **2 races, 181 s, 0 violations, PASS.**

---

## 0 · THE SUBJECT, AND THAT IT REPRODUCES

space-sprint, seed 9, **his** config and roster, Race Plan ON, in Chromium on the production bundle,
**the whole race** — 5182 frames, not the endgame window. The camera seed now derives from the race
seed, so this race is the same race every time it is run; two independent runs produced the same
frame count and the same ranked moments.

Two arms, and they answer different questions:

| arm | clock | answers | blind to |
| --- | --- | --- | --- |
| virtual (`--dump`) | fixed 1/60 s step | (a) and (b) — deterministic, repeatable | **(c), by construction** |
| real (`--real-clock`) | the browser's own rAF | (c) — true delivery | camera determinism: the picture diverges on any timing change |

**The virtual arm is structurally blind to (c) and this had to be established rather than assumed.**
Its frame intervals across the whole race are 16 ms (1727 frames) and 17 ms (3454) **and nothing
else**. A flat pacing distribution there is an artefact of the instrument, not evidence that frames
arrive evenly — which is why the real-clock arm exists. The two arms' camera numbers are never quoted
beside each other.

---

## 1 · (a) THE SINGLE-FRAME STEPS — real, but smaller than the raw numbers suggest

| | space-sprint | city-circuit |
| --- | --- | --- |
| worst on-canvas movement in one frame | **53.0 px** | **127.6 px** |
| p50 / p90 / p99 | 3.0 / 10.0 / 36.3 px | 7.0 / 11.0 / 27.5 px |
| frames over 50 px | 7 (0.14%) | 12 (0.20%) |
| frames over 100 px | 0 | 1 |

**A single frame's worst movement is 53 px on his race.** That is a fast move, not a teleport, and
the distribution says it is a genuine outlier: half of all frames move the picture 3 px.

### The measurement, because the obvious one is wrong

A world point at screen `X` moves by `Δoffset + (X − offset) × (Δzoom / zoom)`. **Pan and zoom
largely cancel**, which is what zooming about an anchor means — so the raw offset change is not what
the eye sees. The gap is not small:

**On the frame with the largest raw pan step, the offset moved 742 px and the worst point on the
canvas moved 53 px.** Fourteen times smaller.

---

## 2 · (b) THE SEQUENCES — this is the dominant camera-side defect, and nothing looks for it

A maximum-step bound grades each frame against its predecessor. **It cannot see the shape of a
second, by construction.** Scoring one-second windows by total travel and by direction reversals:

**space-sprint — the ten worst seconds by reversals, all in PHOTO_FINISH:**

| ms | progress | reversals (of 59) | total travel | net travel |
| --- | --- | --- | --- | --- |
| 80933 | 0.9876 | **42** | 757 px | **4 px** |
| 80833 | 0.9868 | **42** | 718 px | 46 px |
| 80233 | 0.9817 | 41 | 434 px | 16 px |
| 80133 | 0.9805 | 41 | 407 px | 13 px |
| 80733 | 0.9859 | 40 | 643 px | 46 px |

**757 px of movement to arrive 4 px from where it started, changing direction 42 times in 60
frames.** Each individual step is about 12 px — a quarter of the single-frame worst case, and three
orders of magnitude inside invariant 4's bound. **Nothing in this repository currently looks at
this**, and it is the single clearest match to "judder" as a word.

It is an outlier, not the normal condition: reversals per second are **p50 = 0, p90 = 6, max = 42**.

---

## 3 · (c) FRAME DELIVERY — real, large, and it magnifies (a)

Real clock, same race, production bundle:

```
frames 3921 in 87.3 s   =  44.9 fps average
p50 16.7   p90 33.4   p99 50.0   p99.9 66.7   max 100.0 ms
over 17 ms: 1122 (28.62%)      over 33 ms: 1122 (28.62%)
longest run of consecutive long frames: 228
```

**The distribution is BIMODAL: 16.7 ms or 33.4 ms, and almost nothing between.** Those counts are
identical because a "long" frame is not a little long — it is exactly two vsyncs. **28.6% of frames
are doubled**, in runs as long as 228 consecutive frames.

### The coincidence test, which is what decides between (c) and the rest

Run with BOTH the real clock and the dump, so movement and pacing come from the same frames:

**69 of the 100 worst-moving frames were doubled frames, against a base rate of 33.5%.**

**So (c) is not an alternative to (a) — it is an amplifier of it.** In 33 ms the racers advance twice
as far as in 16.7 ms, so the camera's target moves twice as far, so the delivered step is twice as
large. The arithmetic is unavoidable; **whether the camera OVER-responds beyond that factor is NOT
ESTABLISHED** by this pass.

### The limitation, stated plainly

**This is headless Chromium under Playwright on this machine, and its pacing cannot be transferred to
his.** Headless rendering does not vsync the way a visible window does. What is established is that
the same production bundle, driving the same race, does not deliver evenly here. **Whether his
machine shows the same profile is NOT ESTABLISHED** — and the product already carries the instrument
that would settle it: `?perfprobe=1`, then `window.__perfProbe()` in the console.

---

## 4 · WHAT HE WOULD ACTUALLY SEE

- **space-sprint, 44.9–45.2 s, progress 0.382–0.386, LEADER_ZOOM, binding `state`** — the worst run
  of single frames, sixteen consecutive frames at 41–53 px. The shot tightens from 2.34 to 1.46
  corridors while panning. **Not a jump: a LURCH** — a fast zoom-in that starts and stops abruptly.
- **space-sprint, 79.7–81.0 s, progress 0.977–0.988, PHOTO_FINISH** — the reversal windows. The
  picture does not travel anywhere; it **SHAKES**. This is shimmer or vibration, not a move, and it
  sits in the last two seconds of the race, on the shot he watches most closely.
- **city-circuit, progress 0.0000, OVERVIEW** — 36 reversals, 1150 px total for 95 px net, during the
  opening. The same shaking, at the other end of the race.
- **Any doubled frame** — a **HITCH**: the picture holds for 33 ms and then moves twice as far.

---

## 5 · IS INVARIANT 4's BOUND TOO LOOSE? — the number, not a change

| | bound | worst PASSING step |
| --- | --- | --- |
| pan (`4-panstep`) | ≥ 1280 px — a whole canvas width in one frame | **742 px on space-sprint** (58% of the canvas) |
| width (`4-widthstep`) | > 0.6931 ln — a factor of 2 in one frame | **0.1276 ln on city-circuit** = a factor of 1.136, moving the frame edge **81.7 px** |

**Yes, and by a wide margin — but that is the less important half of the answer.** A 742 px offset
step passes, and it should: it corresponded to 53 px of actual picture movement. **The bound is not
merely loose; `4-panstep` measures the wrong quantity.** It grades the offset — the screen position
of the world origin, which is usually far outside the canvas — rather than the picture.

The width bound has no such excuse: **0.1276 ln moves the frame edge 81.7 px in one frame, and it
passes with a factor of five to spare.** A step that size is visible.

**No bound is changed here.** The numbers are reported and the proposals below name the terms.

---

## 6 · DOES THE WORST PATTERN OCCUR ELSEWHERE? — yes, on city-circuit, at a different moment

Checked one other track, city-circuit seed 9, same config and roster. **The reversal pattern is
present and comparable — max 36 reversals per second, 1150 px total for 95 px net — but it sits at
progress 0.0000 in OVERVIEW rather than at the photo finish.** So the shape is not specific to the
endgame or to one track; where it lands is.

City-circuit is also worse on the single-frame measure (127.6 px against 53.0) and on the worst
passing width step (0.1276 ln against 0.0454).

---

## 7 · PROPOSALS

**P1 — `4-panstep` should grade the PICTURE, not the offset.** Replace `hypot(Δoffset)` in
`viewerProbe.js` with the worst on-canvas point displacement,
`Δoffset + (X − offset) × (Δzoom / zoom)` evaluated at both canvas edges. The term that moves is
`4-panstep`'s measure. On this evidence the current measure over-reports by 14× on the worst frame,
which is why it can carry a 1280 px bound and still never fire. **A bound on the corrected quantity
could be set from the distribution measured here** (p99.9 = 51.5 px on space-sprint, 52.9 on
city-circuit) rather than invented.

**P2 — add a SEQUENCE invariant, because no step bound can ever see (b).** Over a one-second window:
direction reversals, and total travel against net travel. The candidate condition is a window whose
total travel exceeds its net travel by a large factor while reversing many times — 757 px against
4 px with 42 reversals is the worst case measured, and p90 is 6 reversals, so the two populations are
far apart. The term that moves is a new invariant beside `4-widthstep` in `viewerProbe.js`.

**P3 — settle (c) on HIS machine before touching the camera for it.** The product already carries
`?perfprobe=1` / `window.__perfProbe()`. If his profile is bimodal like the harness's, the camera is
innocent of the hitches and the work is in the frame loop, not the director. The term that would move
if it is confirmed is `rawDt`'s 50 ms cap and `dtSmoothingAlpha` in `defaults.js` — **but nothing
should move there until his own numbers exist**, because this thread has lost days to fixes aimed at
a machine's behaviour that was never measured on it.

---

## 8 · WHAT THIS BLOCK CHANGED

`scripts/diag/judder-census.mjs` — new, report-only. `scripts/viewer-invariants.mjs` — two opt-in
flags, `--real-clock` and `--pace-out`, both defaulting to today's behaviour; the gate was re-run and
passes. **No product file, no key, no default, no camera change. No fingerprint can move and none was
measured, per R15.**

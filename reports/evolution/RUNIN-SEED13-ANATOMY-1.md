# RUNIN-SEED13-ANATOMY-1 — the owner saw two things on one race; both are real, and only one of them is new

**Date:** 2026-08-25 · **Branch:** `diag/runin-seed13-anatomy-1` (off `master`, with `feat/runin-level-set-1`
merged in so the code under study is present) · **Verdict:** DIAGNOSIS ONLY. Nothing built, nothing
repaired, no config key added, no default moved, no fingerprint minted. The report is merged to
`master`; the branch carries the instrument and is pushed unmerged.

**The case.** `river-run` · 20 racers · **seed 13** · Quick Test · the served build `c0cef7b8`. The owner
watched it on 2026-08-25 and reported two things. **ONE:** a sudden step in the closing stretch.
**TWO:** *"the camera seems to move around without changing the zoom"*, nearer the line still — he was
unsure of it and could not describe it further. He said he understood neither.

**Both are there. They are different events with different causes, and they are connected in one
direction only: the first makes the second about twice as bad.** Event two appears in every race
measured here, including the one §14 held up as the counter-case, so it is not a property of seed 13
and it is not caused by the owner's rule.

---

## THE TWO EXPLANATIONS, IN PLAIN LANGUAGE — read only this if you read nothing else

### EVENT ONE — a third racer arrives, and the camera steps back to keep him

Three racers are contesting this finish. **Drift** leads. **Flare** is half a length back and running
**wide to one side** — about 72 px of road to the left of the leader. **Thunder** is a little further
back and running **wide to the other side**, about 61 px to the right.

The camera is framing Drift and Flare. It is a tight, fast shot — the visible world is about 198 px
across — and it has been holding roughly that size for the whole last half-second.

**Then Thunder closes to exactly one racer length behind the leader.** The owner's rule of 2026-08-24
says that anyone within one racer length of the leader must be in the picture, however far to the
side he is running. So the camera must now hold three racers instead of two — and the third one is on
the **opposite side** from the second.

**That is why it costs so much.** The camera is not pointed at the leader; it is pointed at the
midpoint between Drift and Flare, so it already sits shifted toward Flare's side of the road. Thunder
arrives on the far side of that. Measured from where the camera is actually looking, Flare is 34 px
away and Drift is 42 px away — but **Thunder is 107 px away**, two and a half times further than
either. To keep him in shot the camera has to pull back to a shot 386 px wide.

**And it happens in one frame, with no glide.** Thunder does not drift gradually into range: he crosses
the one-length line **by a tenth of a pixel** — the gap goes from 28.6 px to 28.4 px against a racer
length of 28.5 px — and on the frame before, the camera is ignoring him completely; on the frame
after, it is guaranteeing him completely. **His demand for width did not grow. It was 386 px on both
frames. What changed is whether anyone was listening to it.** So the shot goes from 198 px to 386 px
between two frames: everything on screen — racers, road, the finish gate — **drops to 51% of its size
in one frame, 0.150 s before the line.**

**Does the shot come back? Not before the line.** It holds the new width for the last nine frames and
the leader crosses at it. **What it buys is not nothing:** with the old framing kept, Thunder sits
**22 px below the bottom edge of the screen** on every frame from that point to the crossing — a racer
within one body length of the leader at the finish, not in the picture. That is exactly the failure
the rule exists to prevent, and this is the price of preventing it.

### EVENT TWO — at the moment of the crossing the picture swings out and takes a second and a half to come home

This is the one nobody had measured, and it is the larger of the two.

**At the instant the leader crosses the line, the run-in hands the shot back to the ordinary photo-finish
framing** — which wants a much tighter picture, 120 px across. So the camera has to close from 386 px
to 120 px, a shot three times tighter, and it does that over about four tenths of a second.

**While it is closing, the camera loses track of where it is supposed to be pointing.** The picture
swings hard toward the bottom-right: at its worst, a tenth of a second after the crossing, **the
subject is 973 px away from where the framing rule says he should be** — most of a screen width — and
**the leader is off the canvas entirely for 21 frames.** Then the camera swings back.

**And here is the part the owner actually noticed.** The size finishes arriving long before the aim
does. From about **0.43 s after the crossing the shot is 121 px wide and stops changing** — from there
to the end it moves by 1%, which no eye separates. But the camera is **still swinging home**: over the
next **1.4 seconds the picture slides 336 px across the frame**, at up to 32 px in a single frame.

**That is "moving around without changing the zoom", exactly.** It is not the world moving past a
still camera, and it is not the racers: the subject never changes — the director picks its pair once
and holds it all the way to the finish overview, with no re-targeting anywhere in the window. **It is
the camera itself, still recovering its aim after the size has settled.**

**Why it happens.** Each frame the director decides where to point, and it works that decision out
using **the zoom as it stood on the previous frame** — then the frame is drawn at the new zoom. While
the zoom is barely moving that mismatch is nothing. While the zoom is closing three-fold it is
enormous, because the error is multiplied by how far the racers are from the world's origin — about
3,500 px here. Measured: **the aim point the camera is chasing is thrown up to 2,427 px away from where
the framing rule wanted it, and re-stating that aim at the zoom the frame is actually drawn with
removes 90–97% of it.** The camera is not disobeying; it is faithfully chasing a target that is wrong
for about four tenths of a second, and then spending another second walking back.

**The repair for this already exists in the code and is switched on for the wrong window.** It runs
while the endgame schedule owns the zoom — and it stops at exactly the frame where the biggest zoom
move of the whole race begins.

### How the two are connected

**Event two is not caused by event one, and it is not specific to seed 13.** It happens in every race
measured: `river-run` seed 49 — the race §14 held up as the counter-case, with no width step at all —
swings **959 px**. `mountainstreet` seed 32 swings **1,011 px**. Even `dirt-oval`, his own reference
track, swings **202 px**.

**But event one makes event two nearly twice as bad**, because it doubles the distance the shot has to
close at the crossing. Replaying seed 13 with the third racer never admitted: the swing peaks at
**565 px instead of 973 px**, and the leader is off canvas for 15 frames instead of 21. **The swing is
governed by one thing — how wide the shot is when the run-in hands it back** — and admitting Thunder
is what made it 386 px instead of 197 px.

---

## 1. HOW THIS WAS MEASURED, AND WHICH CAMERA SEED

**The browser's camera seed, not the harness's.** Since the owner's decision of 2026-08-23 the running
game derives the camera's seed from the race's own seed (`RaceScreen/index.jsx`,
`cameraSeedForRace(racePlanSeed)`). `resolveIdentity` in the shared harness driver still defaults to
the constant **1439767152**, which RUNIN-LEVEL-SET-BUILD-1 §15 established is **a value the product
cannot produce for any race**. This report is about what the owner saw, so it uses what he ran:

> `RACE IDENTITY: n=20 · raceSeed=13 · camSeed=2246822502 · racer=track-default · 60s · 1280x720 · roster=70 names`

**`camSeed=2246822502` is `cameraSeedForRace(13)`.** For this race it makes no difference — §15 measured
both and the step is identical to three decimals — but running the harness default would have been
running a camera the game cannot make, and that is not what "explain what he saw" means.

Everything else follows the Quick Test path §15 verified field by field: `river-run`, the track's own
default racer, 60 s, race plan on with seed 13, the default 70-name roster, and **slow motion enabled**,
because `RaceScreen` dilates the physics during `BATTLE_ZOOM` and `PHOTO_FINISH` while the camera keeps
running on wall clock. All times below are **wall-clock seconds — what the viewer experiences.**

---

## 2. EVENT ONE — THE FRAME TABLE

`W` is the visible world width in px across the short screen axis, the same unit §14 uses. `set` is how
many racers the level guarantee is holding. `bind` names the term that produced the delivered width.

| frame | s to line | u | W (px) | set | bind | Thunder's gap along track | one racer length |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4164 | −0.233 | 0.9576 | 197.9 | 2 | level | 28.9 | 28.5 |
| 4165 | −0.217 | 0.9606 | 197.9 | 2 | level | 28.8 | 28.5 |
| 4166 | −0.200 | 0.9633 | 197.8 | 2 | level | 28.8 | 28.5 |
| 4167 | −0.183 | 0.9663 | 197.8 | 2 | level | 28.6 | 28.5 |
| **4168** | **−0.167** | 0.9691 | **197.7** | **2** | level | **28.6 — outside by 0.10 px** | 28.5 |
| **4169** | **−0.150** | **0.9720** | **386.3** | **3** | level | **28.4 — INSIDE by 0.10 px** | 28.5 |
| 4170 | −0.133 | 0.9748 | 386.3 | 3 | level | 28.4 | 28.5 |
| 4173 | −0.083 | 0.9834 | 386.3 | 3 | level | 28.1 | 28.5 |
| 4177 | −0.017 | 0.9951 | 386.3 | 3 | level | 27.7 | 28.5 |
| 4178 | 0.000 | — | 293.6 → 120 | 0 | state | — | — |

**Step: 0.670 ln = ×1.95 in width, everything on screen to 51%, in ONE frame.** It matches §14's figure
exactly, which is the check that this instrument and that one are measuring the same thing.

**No smoothing is involved and none was skipped.** While the run-in composes and its schedule is what
the width authorities settled on, the director sets `zoom = targetZoom` outright — the delivered width
equals the demanded width on every frame of this table. **The step is a cut by construction, not a
glide that ran out of time.**

### WHO IS WHERE, and what each one asks of the width

Measured on frame 4169. `from anchor` is the distance from the world point the camera is built around —
the midpoint of the photo-finish pair, which is **not** the leader. `costs` is that racer's own demand,
obtained by asking the shipped `contenderGuarantee` about him alone.

| racer | | along track behind leader | across track | from anchor | costs a width of |
| --- | --- | --- | --- | --- | --- |
| #7 **Drift** | leader | 0 | 0 | 42.3 px | 193 px |
| #16 **Flare** | already level | 17.5 px | **−71.6 px (left)** | 34.1 px | 120 px |
| #5 **Thunder** | **arrives here** | 28.4 px | **+60.7 px (right)** | **106.8 px** | **386 px** |
| #18 Dash | outside | 42.0 px | −16.9 px | 49.0 px | (165 px) |
| #17 Surge | outside | 48.7 px | −44.2 px | 48.7 px | (120 px) |

**Two facts in that table explain the whole cost.**

**One — the anchor is the pair midpoint, so it is already leaning toward Flare's side.** Flare is 72 px
to the left of the leader, and the camera's aim point sits between the two of them. Thunder arrives 61 px
to the RIGHT of the leader, which puts him on the far side of an aim point that has already moved away
from him. His 61 px of lane becomes **107 px from the camera's actual subject** — more than Drift's own
distance from it.

**Two — Thunder's demand did not grow.** On frame 4167, while he was still outside the set, his demand
was already **386.4 px**; on 4169, inside it, **386.3 px**. Between those frames he moved 0.2 px closer
along the track and nothing else changed. **The width did not follow the racing; it followed a
membership test crossing a threshold.**

### WITHOUT THE NEW MEMBER — the same race, the level set frozen at two

The race was replayed with the membership latched at frame 4168, so Thunder can never be admitted.
**The camera is downstream of the physics — nothing in the engine reads the director — so this is the
same race, frame for frame, and the only quantity that differs is the width.** That is what makes the
comparison a cost and not an argument.

| frame | s to line | **admitted (shipped)** | **frozen at two** | ratio |
| --- | --- | --- | --- | --- |
| 4168 | −0.167 | 197.7 px | 197.7 px | 1.00 |
| **4169** | **−0.150** | **386.3 px** | **197.6 px** | **×1.95** |
| 4171 | −0.117 | 386.3 px | 197.5 px | ×1.96 |
| 4174 | −0.067 | 386.3 px | 197.1 px | ×1.96 |
| 4177 | −0.017 | 386.3 px | 196.7 px | ×1.96 |

**And where the three racers actually appear**, on the 1280×720 canvas:

| frame | | Drift | Thunder | Flare |
| --- | --- | --- | --- | --- |
| 4169 | **admitted** | (643, 403) | **(626, 527)** | (573, 285) |
| 4177 | **admitted** | (665, 422) | **(649, 547)** | (595, 307) |
| 4169 | **frozen** | (710, 500) | **(676, 741) — OFF, 21 px below the edge** | (572, 269) |
| 4177 | **frozen** | (707, 498) | **(677, 744) — OFF, 24 px below the edge** | (572, 272) |

**That is the whole trade, stated once.** The shot the owner objects to is the price of Thunder being in
the picture at all. Keeping the old shot does not cost a little quality — it crops a racer who is
within one body length of the leader at the finish line, on every frame to the crossing.

---

## 3. EVENT TWO — THE FRAME TABLE

**"Framing error" is the one number that matters here:** how far the camera's subject actually appears
from where the framing rule says to put him. For this state the rule says dead centre, (640, 360) on a
1280×720 canvas. A framing error of 973 px means the subject is most of a screen away from his mark.

| frame | s from line | W (px) | framing error | the subject appears at | the rule says |
| --- | --- | --- | --- | --- | --- |
| 4177 | −0.017 | 386.3 | **12 px** | (642, 348) | (640, 360) |
| **4178** | **0.000** | 293.6 | **344 px** | (942, 525) | (640, 360) |
| 4180 | 0.033 | 212.4 | 765 px | (1304, 739) | (640, 360) |
| 4182 | 0.067 | 176.5 | 941 px | (1457, 828) | (640, 360) |
| **4184** | **0.100** | 156.9 | **973 px — the worst** | **(1485, 842)** | (640, 360) |
| 4188 | 0.167 | 137.5 | 834 px | (1367, 769) | (640, 360) |
| 4193 | 0.250 | 127.5 | 569 px | (1139, 634) | (640, 360) |
| **4204** | **0.433** | **121.3** | 200 px | (825, 437) | (640, 360) |
| 4212 | 0.567 | 120.4 | 97 px | (734, 382) | (640, 360) |
| 4220 | 0.700 | 120.1 | 58 px | (698, 361) | (640, 360) |
| 4232 | 0.900 | 120.0 | 30 px | (670, 355) | (640, 360) |
| 4248 | 1.167 | 120.0 | 17 px | (657, 355) | (640, 360) |
| 4260 | 1.367 | 120.0 | 11 px | (651, 357) | (640, 360) |

**Read the two right-hand columns from frame 4204 down and the owner's sentence is on the page.** The
width is 121 px and then 120 px — a 1% change no eye separates — and the picture is still travelling
185 px across the frame. **The size has arrived; the aim has not.**

**The longest stretch over which the size genuinely holds** (defined as: the longest run of frames after
the crossing over which the visible width changes by under 5% end to end, with any re-anchor jump
excluded):

| | duration | frames | width across the window | the subject travels | worst single frame |
| --- | --- | --- | --- | --- | --- |
| **river-run 20 seed 13** | **1.40 s** | 84 | 122.9 → 120.0 px (**−2.4%**) | **336 px** | **32.1 px** |

### THE MECHANISM, ISOLATED

Each frame the director resolves where to aim **using the zoom as it stands at that moment**, and the
frame is then drawn at the zoom this frame's lerp arrives at. The aim is stored as a screen offset,
which is a world position multiplied by the zoom — so **a small error in the zoom is multiplied by how
far the subject is from the world's origin.** Here the subject sits about 3,545 world px out.

| frame | s | zoom, previous → drawn | aim point thrown by | **re-stated at the drawn zoom** | removed |
| --- | --- | --- | --- | --- | --- |
| 4178 | 0.000 | 1.243 → 1.635 | **2,427 px** | 232 px | **90%** |
| 4180 | 0.033 | 1.972 → 2.260 | 1,786 px | 107 px | 94% |
| 4184 | 0.100 | 2.902 → 3.058 | 967 px | 39 px | 96% |
| 4190 | 0.200 | 3.563 → 3.625 | 385 px | 12 px | 97% |
| 4200 | 0.367 | 3.906 → 3.919 | 83 px | 2 px | 97% |

**90–97% of the thrown aim is that one mismatch.** The remainder is that re-stating an offset preserves
the camera's world position rather than the subject's place in frame — the same distinction the
existing correction's own header draws when it says it re-expresses the answer and re-decides nothing.

**The correction is already written, and its window ends one frame too early.** While the endgame
schedule owns the zoom, the director re-states the aim at the drawn zoom for exactly this reason, and
its header records the measurement that put it there: *"the framing error of the pan TARGET grew to
554 × 382 px … and it collapsed to 39 × 27 the instant the zoom stopped moving."* **That block is
scoped to the frames where the schedule is composing. At the crossing the schedule hands back — and
the largest zoom move of the entire race begins on the very next frame, outside the scope.**

### PLACEMENT, SEPARATED FROM WIDTH — the four questions asked directly

- **Does the anchor's identity change?** **No.** The director picks its photo-finish pair — racers #7
  and #16 — before the window opens and holds it unchanged through the crossing and the whole drama.
  There is **exactly one** re-targeting event in the entire trace, at 1.77 s after the crossing, when
  the state hands to `FINISH_OVERVIEW` and the anchor becomes the fixed lookback point behind the line.
  **Event two is over before that happens.** It is not a re-anchor.
- **Does the camera centre move?** **Yes, a great deal.** It travels 196 world px away from the subject
  and back again, peaking at 141 world px of movement in a single frame at the crossing.
- **Does the subject's offset within the frame move?** **Yes — that is the event.** From dead centre to
  973 px off it and back, with 336 px of that travel happening while the size holds.
- **Is it deliberate?** **No.** The run-in's own placement schedule — the one that walks the leader
  across the frame during the closing move — **is not running here at all**: this state is centred, so
  the schedule's forward fraction is 0.5 from start to finish and never moves. The lateral guarantee
  measures 0 shift on every frame of the window. **Nothing in the design asked for this movement.**

---

## 4. IS EVENT TWO SPECIFIC TO SEED 13? — NO, AND THAT IS THE FINDING

Eight races, all under the browser's own camera seeding: seed 13, §14's counter-case, four other late-step
races from §14's hit list, §14's tightening case, and `dirt-oval`'s own worst.

| race | width handed back from → to | **peak framing error** | at | back within 40 px | leader off canvas |
| --- | --- | --- | --- | --- | --- |
| **mountainstreet 20 seed 32** | 365 → 120 px | **1,011 px** | 0.10 s | 0.77 s | 14 frames |
| **river-run 20 seed 13** | 386 → 120 px | **973 px** | 0.10 s | 0.82 s | **21 frames** |
| **river-run 20 seed 49** — *§14's counter-case* | 372 → 120 px | **959 px** | 0.10 s | 0.77 s | 89 frames |
| seatrack 20 seed 7 | 379 → 120 px | 892 px | 0.10 s | 0.65 s | 9 frames |
| mountainstreet 20 seed 24 | 283 → 120 px | 869 px | 0.10 s | 0.75 s | 19 frames |
| **river-run 20 seed 13 — FROZEN** | **197 → 120 px** | **565 px** | 0.10 s | 0.78 s | **15 frames** |
| river-run 20 seed 18 | 170 → 120 px | 447 px | 0.08 s | 0.65 s | 37 frames |
| city-circuit 20 seed 7 | 268 → 120 px | 414 px | 0.10 s | 0.50 s | 0 frames |
| **dirt-oval 20 seed 171** | 161 → 120 px | **202 px** | 0.10 s | 0.60 s | 0 frames |

**Three things fall straight out of that table.**

**It is universal, and §14's counter-case is not a counter-case for it.** `river-run` seed 49 is the race
§14 named as the one that widens smoothly, with a largest step of 5%. Its swing at the crossing is
**959 px — within 2% of seed 13's.** Event two has nothing to do with whether the width stepped.

**It is governed by one quantity: how wide the shot is when the run-in hands it back.** The order of the
table is the order of that column. The frozen arm of seed 13 sits exactly where its 197 px hand-back
puts it, between two other races with similar hand-backs. **Nothing else needs to be invoked.**

**And on the track he watches most it is mild.** `dirt-oval` hands back from 161 px, swings 202 px, and is
home in 0.6 s with the leader never leaving the canvas. §14 already told him he would not see the width
step on dirt-oval; **he will not see much of this there either.** `river-run` is where both live.

The same eight races, measured for the part he actually described — the size holding while the picture
moves:

| race | duration | width across the window | the subject travels | worst single frame |
| --- | --- | --- | --- | --- |
| mountainstreet 20 seed 32 | 2.23 s | 122.8 → 120.0 px | **415 px** | 32.0 px |
| seatrack 20 seed 7 | 1.73 s | 122.9 → 120.0 px | 351 px | 28.6 px |
| mountainstreet 20 seed 24 | 1.83 s | 122.8 → 120.0 px | 350 px | 32.6 px |
| **river-run 20 seed 13** | **1.40 s** | 122.9 → 120.0 px | **336 px** | **32.1 px** |
| river-run 20 seed 49 | 1.37 s | 122.8 → 120.0 px | 324 px | 28.9 px |
| river-run 20 seed 18 | 1.65 s | 122.3 → 120.0 px | 242 px | 21.9 px |
| dirt-oval 20 seed 171 | 1.40 s | 122.3 → 120.0 px | 194 px | 13.7 px |
| city-circuit 20 seed 7 | 1.13 s | 122.3 → 120.0 px | 151 px | 14.0 px |

---

## 5. THE FRAME CLOCK — event one is immune to it, event two is not

Every instrument on the shared driver runs a fixed 60 Hz clock; the browser runs `requestAnimationFrame`.
Both events here are settling behaviours, so the honest question is whether they survive a different
clock at all. The driver's own `frameMs` seam was used to ask.

| clock | **event one** | **event two — peak framing error** |
| --- | --- | --- |
| 60 Hz (as measured throughout) | 0.67 ln, 197.7 → 386.3 px, u = 0.972, 0.150 s out, set 2→3 | 973 px |
| 50 Hz | 0.67 ln, 197.8 → 386.3 px, u = 0.971, 0.160 s out, set 2→3 | **1,163 px** |
| 90 Hz | 0.67 ln, 197.7 → 386.3 px, u = 0.971, 0.156 s out, set 2→3 | **655 px** |
| 60 Hz with ±6 ms wobble | 0.67 ln, 197.7 → 386.3 px, u = 0.972, 0.153 s out, set 2→3 | 1,029 px |

**Event one does not move at all.** The width is a pure geometric function of where the racers are and
it is delivered unsmoothed, so the frame clock has nothing to act on. Whatever machine he watches it
on, he sees the same cut.

**Event two grows as the frame rate falls, by a lot** — 655 px at 90 Hz against 1,163 px at 50 Hz. Each
frame's zoom step is larger at a lower frame rate, and the thrown aim is proportional to that step.
**So the swing the owner saw in his browser may well be larger than the 973 px measured here**, and it
will be worse on a slower machine. That is a property worth knowing before anyone tunes a lerp rate:
**the mismatch repair is frame-rate independent; a rate tune is not.**

---

## 6. WHAT COULD NOT BE ESTABLISHED

- **That the owner's second observation is the event described here.** He said he was unsure of it and
  could not describe it further, and this report has found a real, large, previously unnamed camera
  movement with the zoom flat, in the right place, in his race. **That is a strong match and it is not
  a confirmation.** The one thing that would confirm it is him watching seed 13 again and saying
  whether the swing after the crossing is what he meant. It cannot be settled from here.
- **The magnitude in HIS browser.** §5 shows the swing depends on the frame clock, which no harness
  reproduces. The measurement above is a 60 Hz figure and the browser's is not 60 Hz. **The existence
  and the mechanism are established; the size he actually saw is not.**
- **Whether the leader is visibly off-canvas to the eye or merely off-canvas in the arithmetic.** 21
  frames at 60 Hz is 0.35 s with the subject outside the frame. This report did not render a single
  pixel; it measured the camera. That distinction has bitten this project before and is stated rather
  than glossed.
- **What the shot would look like if the aim were re-stated at the drawn zoom.** §3 measures how much
  of the thrown target that removes — 90–97% — by arithmetic on the recorded values. **It does not
  replay the race with the correction applied**, because doing so is building, and this block was told
  to diagnose. The residual after correction is small but it is not zero, and only a run would say
  what the picture does with it.
- **Anything about the other 1,252 races in the sweep.** Eight races were traced frame by frame. The
  universality claim in §4 is a claim about those eight, chosen because §14 had already ranked them,
  and it includes the deliberately-chosen counter-case. **It is not a rate over the population.**

---

## 7. SOURCE HYGIENE, AND VERIFICATION

**The instrument.** `scripts/diag/runin-anatomy.mjs`, new on this branch. It runs on the shared
`raceDriver.mjs` like every other camera instrument, so the race it builds is the race the other
harnesses build. **Every value it reports is read off the director's own read-only probe or computed
from the racer objects the director was handed on that frame** — the per-racer width demands in §2 are
obtained by calling the shipped `contenderGuarantee` with one racer, which is that function's own
anchored arm with a single member, so no formula is re-derived here.

**Why a new instrument rather than `level-step-when.mjs`.** That script stores four numbers per frame
and reduces a race to one row. It could rank 29 races and it cannot say who joined the set or whether
the camera's placement moves while its width holds — which is the whole of what was asked.

**The counterfactual is a runtime override, not an edit.** `_levelContenders` is wrapped for the frozen
run so a racer who was not already a member cannot become one. **The shipped file is untouched**, and
the two arms are the same race because the camera is downstream of the physics.

**One correction made in the writing of this report.** The first counterfactual run latched the
membership one frame late — at the admit rather than before it — and therefore froze a set that already
contained Thunder, producing an identical trace and the false reading that freezing the set changes
nothing. Caught because a counterfactual that changes nothing is a result to distrust, not to report.
The latch was moved to frame 4168 and the arms then differ as §2 shows. **Recorded because the failure
mode is silent: a counterfactual can be wired to be a no-op and will not complain.**

**What was NOT run, and why.**

- **No fingerprints.** Nothing in this block touches a file the camera or the renderer reads, so there
  is nothing for a fingerprint to detect. Minting one here would also breach the ceremony's own rule
  that a visible change needs the owner's eye first, and there is no change.
- **No browser gate.** The task scoped this to a read-only diagnosis and excluded it. The limits that
  costs are stated in §6 rather than hidden: the frame clock is the one thing the harness fixes and
  the browser does not, so §5 measures the sensitivity to it instead of ignoring it.
- **No client suite.** No client source file was modified. The only new file is a diagnostic script
  that no test imports and no product code reaches.

**Machine.** 14 cores; read before launching. Nothing here needed a pool — eight races traced frame by
frame run in 5.2 s in one process.

---

## 8. CONFORMITY — what was asked against what was delivered

| the spec asked | delivered |
| --- | --- |
| Branch `diag/runin-seed13-anatomy-1` off master, code under study `feat/runin-level-set-1` | Yes — branched off master, feature merged in so the code under study is present |
| Diagnose only; change nothing, repair nothing, add no key | Yes — one new diagnostic script; no product file, no default, no key touched |
| Replay the way the BROWSER runs it; state the camera seed and why | Yes — §1, `cameraSeedForRace(13)` = 2246822502 |
| Frame-by-frame from u ≈ 0.90 to the crossing: width, anchor, members, offsets, binding term, camera position and heading | Yes — §2, §3; the trace runs from u = 0.90 and **past** the crossing, see the note below |
| Event one: who crosses, where he was, how far to the side, why it costs that much | §2 |
| Frame numbers and seconds before the line | §2 — frames 4168 → 4169, 0.150 s |
| Does the shot come back? | §2 — not before the line; it holds to the crossing |
| Replay with the level set frozen; both widths side by side | §2 — and where each racer lands on the canvas |
| Event two: find it or establish it is not there | §3 — found |
| Separate PLACEMENT from WIDTH explicitly | §3, the four questions asked one at a time |
| Anchor identity and whether it changes; camera centre path; subject offset; re-targeting events | §3 — identity unchanged, one re-target at 1.77 s, after the event |
| Name the mechanism; deliberate or side effect | §3 — a stale aim during a large zoom move; not deliberate, and the run-in's own placement schedule is not running in this state |
| Say whether event two is specific to this race, checking 2–3 other §14 late-step races | §4 — **seven** other races including §14's counter-case and dirt-oval's worst |
| Read the core count before launching | §7 — 14 |
| Read-only: no fingerprints, no browser gate, no client suite, with the reason | §7 |
| Report registered in the INDEX in the same commit | Yes |
| Plain-language explanations FIRST, then tables, then what could not be established, hygiene, conformity, proposals with ≥2 of my own | This document's order |
| Push the branch; merge the report only | Done |

**One deliberate departure, named rather than buried.** The spec asked for the trace to run **to the
crossing**. It runs to the end of the race. **The reason is event two:** the run-in's own window is
0.55 s wide, and the owner described something "nearer the line still". Had the trace stopped at the
crossing it would have caught the first 0.02 s of a 1.5 s event and reported that nothing was there.
**The window before the crossing is covered as asked; it was extended, not moved.**

---

## 9. PROPOSALS — none ordered, each with its cost

**Nothing here is recommended for building.** Two of these are the owner's decision about his own rule;
two are mine and are named as such.

### A — Ease the ADMIT the way the release is already eased *(the obvious one; it fails on the rule's own purpose)*

The release of a departing member is already eased over `runInOpenMs`. Easing the admit symmetrically
would turn the ×1.95 cut into a glide.

**Cost, and it is fatal as stated:** a racer arriving at the boundary would not be guaranteed for up to
`runInOpenMs`. §2 shows what that window contains — Thunder off the bottom of the screen for the whole
run to the line. **The rule exists precisely for the racer who arrives late, and this is the case it
exists for.** The shipped code says so in its own header when it explains why the set is live rather
than pinned. Listed because it is the first thing anyone will propose, and it should be refused with a
reason rather than not thought of.

### B — Admit on a PREDICTED arrival rather than an actual one

Widen when a racer is within, say, one and a half lengths **and closing**, so the width has begun to
move before the boundary is reached and can arrive smoothly at it.

**Cost:** it widens for racers who never arrive, which is width spent on nothing; and it needs a new
number — the look-ahead distance — in a project whose whole endgame is written without one. §2's own
measurement is the argument for it: Thunder's demand was fully formed 0.017 s before he was admitted,
so the information needed to start moving was already there.

### C — MINE: re-state the pan target at the drawn zoom on every path, not only while the schedule composes

The director already does this, and its scope is one frame too narrow. Removing the scope is the whole
change: no new key, no new number, and the same expression already in the file.

**What it buys, measured:** 90–97% of the thrown aim at the crossing (§3), and it is **frame-rate
independent**, which §5 shows matters — the alternative of tuning a lerp gets worse on slow machines
and this does not.

**Cost, and it is real.** This is the same shape of change as ZOOM-PIVOT-START-1, which removed a
similar scope for a similar reason and recorded what it costs: **it moves the camera fingerprint on
every race with a moving zoom, not only the endgame** — the start's field guarantee widens continuously
and would be touched too. So it is a ship-ceremony change and **needs his eye before anything is
minted**, not a quiet correctness fix. It is also the only proposal here that addresses the event he
actually could not name.

### D — MINE: carry the width home across the crossing instead of handing it back in one frame

Today the run-in hands the width to the state in a single frame: the target goes 386 px → 120 px
instantly and the ordinary lerp closes a three-fold gap over 0.4 s. **The gap is what creates the
excursion** — §4 orders every race by it. The endgame already owns a monotone schedule; letting it carry
the width for a few frames **past** the crossing would remove the gap rather than smooth its symptoms.

**Cost:** it borders on a requirement the owner has already ruled on — the shot at the crossing must be
the ordinary shot — and RUNIN-PACE-1 §3 measured a rate limit failing on exactly that, at an order of
magnitude. **This proposal is only tenable because it acts strictly AFTER the crossing**, where that
requirement has already been satisfied; if it drifted one frame earlier it would be the rejected
candidate again. That is a narrow line to build on and the reason this is a proposal and not a plan.

### E — MINE: bound what a single late member may cost, and report the cut rather than pay any price

Let the level guarantee widen to at most some multiple of the shot that would otherwise be, and when a
member cannot be held inside that bound, record him as cut in the diagnostics instead of opening the
shot arbitrarily.

**Cost, and it is a matter for him and not for me:** it makes his rule conditional, and his rule is not
written conditionally. What it buys is a bounded worst picture and a countable record of what the bound
costs in racers — which is the currency this project already prices camera decisions in. **It is a
decision about the rule, not about the code**, and it is listed so the option is on the record.

---

## WHAT OUTLIVES THIS REPORT

**Two things, and the second is bigger than the race it was found on.**

**The width step is the rule working, and its cost is a racer's presence.** Event one is not a bug in
the level guarantee; it is the guarantee paying for exactly what it promises, in one frame because
membership is a threshold and the delivery is unsmoothed. **Whether ×1.95 in one frame is too high a
price for Thunder being in the picture is a question about the rule, and it is his.**

**The camera loses its aim whenever the zoom moves a long way, and the repair for it is already written
and scoped to the wrong window.** That is not a seed-13 finding and not a level-set finding: it fires
at every crossing on every track measured, including the race §14 held up as the well-behaved one, and
it gets worse as the frame rate drops. **§14 named the width step as the one new cost of this build.
The larger disturbance at the finish is older than the build, has never been reported, and was found
only because the owner described something he could not name.**

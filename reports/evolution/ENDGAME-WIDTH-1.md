# ENDGAME-WIDTH-1 — which term buys the width, and what the owner's rule would cost

**2026-08-22 · branch `invest/endgame-width` off master `d2906ee1` · MEASUREMENT ONLY — no camera
change, no key, no fix; `CameraDirector.js` is untouched · nothing changes, so no fingerprint can
move and none was run**

## Question 1, in one sentence

**The tail is not paying for the width: the `line` term — the run-in's own bound, the one that keeps
the finish line in frame — binds 93–99 % of every endgame frame on all three tracks, and the two
tail terms (`field`, `company`) are `Infinity` at the widest moment on all of them.**

**The owner's hypothesis is REFUTED.** It is the finish line itself that is asking for the width,
because the shot has to hold the line and a leader who is still a long way from it.

---

## Question 1 — who sets the width, frame by frame

The five ceilings are `state`, `guarantee`, `company`, `field`, `line`, composed with `Math.min` in
`_setTargets`. The director already records all five, the delivered zoom and the term that produced
it on `_framingProbe` every frame, and nothing in the camera reads it — **so this is read, not
added.** The endgame window is the run-in's own: from `runInActive` becoming true to the crossing.

| track / field | arm | endgame frames | **binding share** | at the widest moment |
| --- | --- | --- | --- | --- |
| space-sprint · 100 | his | 169 | **line 99 %**, guarantee 1 % | width **1949 px**, binding `line` |
| space-sprint · 100 | shipped | 169 | **line 99 %**, guarantee 1 % | width 1944 px, binding `line` |
| dirt-oval · 40 | his | 269 | **line 93 %**, guarantee 7 % | width **1286 px**, binding `line` |
| dirt-oval · 40 | shipped | 269 | **line 93 %**, guarantee 7 % | width 1286 px, binding `line` |
| city-circuit · 40 | his | 256 | **line 94 %**, state 6 % | width **1207 px**, binding `line` |
| city-circuit · 40 | shipped | 256 | **line 94 %**, state 6 % | width 1207 px, binding `line` |

**What each term DEMANDS at the widest moment, in world px** (`—` is `Infinity`, i.e. the term is
asking for nothing):

| track | state | guarantee | company | **field (the tail)** | **line** | corridor-cap |
| --- | --- | --- | --- | --- | --- | --- |
| space-sprint · 100 · his | 213 | 152 | **—** | **—** | **1952** | 311 |
| dirt-oval · 40 · his | 338 | 74 | **—** | **—** | **1286** | — |
| city-circuit · 40 · his | 338 | — | 771 | **—** | **1207** | — |

**`field` — the term that keeps the trailing pack in shot — demands nothing at the widest moment on
any of the three.** It has already retired. `company` demands 771 px on city-circuit, which is well
inside the 1207 px the line is asking for, so it never binds either. The width is the line's, alone.

**His config and the shipped defaults give the same answer.** The binding shares are identical to the
percentage point; only the opening width differs (space-sprint opens at 800 px on his settings and
400 on the defaults). Whatever the two configurations do differently, it is not this.

---

## Question 2 — what counts as "in with a chance"

**A usable definition already exists and I did not invent one.** `_abreastContenders(ordered)` in
`CameraDirector.js` is the rule the run-in already uses to pin the photo-finish framing set. Two
conditions, both geometric and both built from quantities the race puts on a racer:

1. **Nearly level with the leader** — along-track gap no greater than `contactLength`, which is
   `pairContact`'s own touch distance (one body length between two equal racers). Not a lap fraction
   and not a new number.
2. **On a free lane** — no body overlapping his across the track ahead of him, by `pairContact`'s
   `contactWidth`.

It is invoked today only at the PHOTO_FINISH entry, and only when `contenderZoom` is on; it is **not**
consulted during the endgame framing. Nothing here changes that — the rule is simply evaluated on the
same live field the director is framing.

**How many it selects:** **2 racers** at nearly every measured moment, **3** on dirt-oval. Never more,
at any of the three moments, on any track, in either arm.

### The candidate shot

Computed with the director's own arithmetic — `contenderGuarantee` from `framingRule.js`, over
{finish line, leader, contenders}, with the frame size, axis, inner-frame fraction and body padding
the director used on that frame. Not a bounding box of my own.

| track / field | moment | **width today** | **candidate** | contenders |
| --- | --- | --- | --- | --- |
| **space-sprint · 100 · his** | opening | 800 | **1042** ← *wider* | 2 |
| | mid-endgame | **1908** | **603** | 2 |
| | crossing | 316 | 115 | 2 |
| **dirt-oval · 40** | opening | 338 | **710** ← *wider* | 3 |
| | mid-endgame | **1286** | **383** | 3 |
| | crossing | 195 | 92 | 2 |
| **city-circuit · 40 · his** | opening | 415 | **679** ← *wider* | 2 |
| | mid-endgame | **1207** | **357** | 2 |
| | crossing | 184 | 45 | 2 |

**Two things fall straight out of this table, and they are the whole finding.**

**At the OPENING the candidate is WIDER than today, on every track.** The rule would open the shot
*more*, because holding the line and a leader who is still far from it genuinely needs that width.
Today's shot is tighter there — **and loses the line, on all three tracks** (below).

**At MID-ENDGAME today's shot is 3.2–3.4× wider than the rule needs**, and that is where the
oversized racers live.

---

## Question 3 — what it would cost

### Racers in frame

| track / field | moment | **today (exact)** | **candidate (estimate)** |
| --- | --- | --- | --- |
| space-sprint · 100 · his | opening | 16/100 | 2/100 |
| | mid-endgame | 20/100 | 3/100 |
| | crossing | 5/100 | 2/100 |
| dirt-oval · 40 | opening | 12/40 | 4/40 |
| | mid-endgame | 31/40 | 4/40 |
| | crossing | 9/40 | 4/40 |
| city-circuit · 40 · his | opening | 7/40 | 2/40 |
| | mid-endgame | 23/40 | 2/40 |
| | crossing | 3/40 | 2/40 |

**This is the price and it is large.** At mid-endgame on dirt-oval the picture goes from 31 racers to
4. On space-sprint from 20 to 3. **His specification says the trailing field may fall out of the
picture behind them — this is what that looks like as a number.**

**Today's count is exact** (the pan is known). **The candidate's is an ESTIMATE**: the pan is not
modelled — the director would choose it — so the frame is centred on the midpoint of the subject
set's own extent, which is the most neutral assumption available. The guaranteed floor is the subject
set itself: line + leader + 2–3 contenders.

### Does the finish line stay in frame?

**TODAY IT DOES NOT.** Measured exactly, with the real pan:

| track / field | endgame frames losing the line | at the opening | at the crossing |
| --- | --- | --- | --- |
| **space-sprint · 100 · his** | **38 %** (65 of 169) | **NO** | **NO** |
| space-sprint · 100 · shipped | **42 %** (71 of 169) | **NO** | **NO** |
| dirt-oval · 40 | 22 % (58 of 269) | **NO** | yes |
| city-circuit · 40 · his | 21 % (55 of 256) | **NO** | yes |

**Today's endgame already fails his absolute requirement**, on every track measured, and worst
exactly where he was looking — space-sprint loses the line on 38 % of endgame frames including both
the opening and the crossing. That is not a consequence of the candidate; it is the current state.

**For the candidate: NOT ESTABLISHED.** The line is a member of the subject set, so the candidate
*zoom* is sufficient to contain it by construction — but this harness does not model the pan, and a
sufficient zoom with the wrong pan still loses the line. **His requirement is absolute, so a
candidate that cannot be shown to hold the line has not been shown to pass.** Settling it needs the
pan, which is the build, which is the next block.

### Sprite over-scale under the narrower widths

FLOOR-REACH-1's formula, `floor × worldPx ÷ (worldBody × 1280)`, at the widest moment:

| track / field | body | **over-scale today** | **under the candidate** |
| --- | --- | --- | --- |
| **space-sprint · 100** | 11.40 px | **4.33×** | **1.21×** |
| dirt-oval · 40 | 16.91 px | 1.92× | **0.78×** |
| city-circuit · 40 | 18.71 px | 1.63× | **0.66×** |

**Confirmed: the sprite problem is downstream of the width.** Under the candidate the floor stops
binding entirely on two of the three tracks (a factor below 1.0 means the proportional size is
already above the floor), and on space-sprint it falls from 4.33× to 1.21× — from grossly over-scaled
to very nearly honest. **Nothing about the floor changes; the width does.**

---

## What this decides

**"Narrow the endgame to the line, the leader and the contenders" is a coherent rule and the numbers
support it** — it fixes the over-scale as a side effect, and it would *widen* the opening, which is
what his specification asks for and what today's shot fails to do.

**The cost is the trailing field: 31 racers in frame becomes 4, and 20 becomes 3.** His
specification already accepts that. He should see those two numbers before deciding.

**Two things are not settled and should not be treated as though they were.** Whether the candidate
holds the finish line through the whole endgame is **not established** without the pan. And the
opening is *wider* under the rule, which no one has judged — the picture there would be a distant
leader and a distant line with very little else, and that may or may not read as the shot he wants.

---

## PROPOSALS

**1. Build the rule as a subject-set change, not a new ceiling.** The endgame's framing subjects
would become {finish line, leader, `_abreastContenders`}, and the existing `line` and `guarantee`
terms would then be computing over the right set instead of a wider one. **Nothing new is invented:**
the contender rule exists, `contenderGuarantee` exists, and the `line` term already knows where the
finish is. **Cost:** CAMERA and RENDER both move; it needs his eye on all three moments, and on the
*opening* in particular, because that is where the shot gets wider rather than tighter. **What it
gives:** mid-endgame width down 3.2–3.4×, over-scale 4.33× → 1.21× on space-sprint, and the line held
by construction rather than by luck.

**2. IF THE BINDING TERM HAD NOT BEEN THE TAIL — and it is not — the narrow fix is the `line` term's
own geometry.** It binds 93–99 % of frames and demands 1207–1952 px because it must hold a line the
leader is still far from. That demand is legitimate early and stops being legitimate as the leader
closes: at the crossing the same term needs only 45–115 px. **A `line` bound that tightened as the
gap closed would remove most of the width without touching the subject set at all**, and it is a
smaller change than proposal 1 — one term's arithmetic rather than the endgame's cast. **Cost:**
CAMERA and RENDER move; no new subject rule and no decision about who is in shot. **This is the
proposal to prefer if he does not want the trailing field to disappear.**

**3. Fix the line loss first, independently of either.** Today's endgame loses the finish line on
21–42 % of its frames, including the opening on all three tracks and the crossing on space-sprint.
That is a defect against a requirement he has already stated as absolute, it is measurable now, and
it does not depend on choosing between proposals 1 and 2. **Cost:** unknown until the cause is
found — this report establishes *that* it happens, not *why*. **What it prevents:** shipping a
narrower endgame that still loses the line, and calling the width fixed.

## Reproducing

```
node scripts/endgame-width-truth.mjs                      # all three tracks, both arms
node scripts/endgame-width-truth.mjs --tracks=space-sprint
node scripts/endgame-width-truth.mjs --json
```

**It changes nothing and measures the live director.** `_framingProbe` is written by the director
every frame and read by nothing in the camera; this harness reads it. The contender set is the
director's own `_abreastContenders`; the candidate width is the director's own `contenderGuarantee`.
The tree is clean and no fingerprint can move — no file under `client/src/` is touched by this block.

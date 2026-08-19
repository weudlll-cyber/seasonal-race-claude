# FLOOR-REACH-1 — on how many tracks does this actually look wrong?

**2026-08-22 · branch `invest/floor-reach` off master `9b24956a` · MEASUREMENT ONLY — no fix, no key,
no default changed; the floor stays at 0.045 throughout · nothing changes, so no fingerprint can move
and none was run · 4173 left alone**

## The answers, first

**1. Space-sprint is special, and the reason is arithmetic.** Over-scale is
`floor × worldPx ÷ (worldBody × 1280)`, and space-sprint is worst on **both** terms at once: the
**smallest world body of any track (9.50 px)** and the **widest shot any track reaches (1951 px)**.
Nothing else combines the two.

**2. Twenty racers is clean on all ten tracks.** The worst over-scale anywhere at 20 is **1.92×**
(dirt-oval), and he has never remarked on it. **That is why months of watching showed nothing** — the
field size is the discriminator, not the track alone.

**3. A floor change is a large hammer.** At his own settings it is **1 track of 10 at 40 racers and
2–3 of 10 at 60**, always in the approach to the finish. The floor is the term we found, not
necessarily the term to move — see the proposals.

**And one assumption in the brief is contradicted by the measurement:** his configuration is not the
worse case. **The shipped defaults reach wider shots and worse over-scale on almost every track** —
space-sprint at 60 racers is **5.20× on his settings and 10.66× on the defaults**. Whatever is
crowding his picture, his settings are damping it, not causing it.

---

## Why space-sprint — the mechanism, per track

The floor pins the drawn racer at 32.4 px. What varies is how much world that 32.4 px is standing
against, so over-scale is driven by two things and nothing else: how small the racer's body is **in
the world**, and how wide the shot is allowed to get. **The worst moment on every track that binds
falls exactly at the widest shot that track reaches.**

| track | racer | **world body** | **widest shot** | over-scale at 60, his config |
| --- | --- | --- | --- | --- |
| **space-sprint** | rocket | **9.50 px** | **1951 px** | **5.20×** |
| dirt-oval | horse | 11.27 | 1286 | 2.89× |
| city-circuit | motorbike | 12.47 | 1203 | 2.44× |
| seatrack | dolphin | 19.00 | 1516 | 2.02× |
| ice-track | snowmobile | 20.04 | 1285 | 1.62× |
| mountainstreet | boarder | 18.99 | 871 | 1.16× |
| luger-hill | luge | 23.76 | 1076 | 1.15× |
| garden-path | snail | — | 675 | **never binds** |
| river-run | duck | — | 800 | **never binds** |
| searound | manta | — | 931 | **never binds** |

`32.4 × 1951 ÷ (9.50 × 1280) = 5.20` — the table is the formula, not a correlation. Space-sprint's
rocket is the smallest body on the narrowest start width, and its open sprint layout lets the shot
open to nearly two thousand world px; every other track is worse on one term and better on the other.

---

## The ranked table — his configuration

Ten tracks, seed 9, his eleven config values. `bind%` is the share of frames where the floor is the
binding term; `longest` is the longest **unbroken** run in seconds — a tenth of a second is
invisible, three seconds is what he saw. `APPROACH` is from 85 % of the way to the finish until the
leader crosses.

### 60 racers

| rank | track | widest | bind % | longest | approach bind % | approach longest | **over-scale** | overlapping / on screen | where |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **space-sprint** | 1951 | **81 %** | **37.1 s** | **98 %** | **9.9 s** | **5.20×** | 14/14 | APPROACH |
| 2 | dirt-oval | 1286 | 31 % | 12.0 s | 63 % | 4.8 s | 2.89× | 56/58 | APPROACH |
| 3 | city-circuit | 1203 | 23 % | 7.7 s | 66 % | 7.7 s | 2.44× | 23/26 | APPROACH |
| 4 | seatrack | 1516 | 16 % | 4.7 s | 39 % | 3.5 s | 2.02× | 3/10 | APPROACH |
| 5 | ice-track | 1285 | 3 % | 2.0 s | 19 % | 2.0 s | 1.62× | 48/56 | APPROACH |
| 6 | mountainstreet | 871 | 11 % | 4.7 s | 11 % | 0.9 s | 1.16× | 2/25 | APPROACH |
| 7 | luger-hill | 1076 | 1 % | 0.3 s | 0 % | 0.0 s | 1.15× | 0/60 | race body |
| 8–10 | garden-path, river-run, searound | ≤931 | **0 %** | — | 0 % | — | — | — | — |

### 40 racers

| rank | track | bind % | longest | approach longest | **over-scale** |
| --- | --- | --- | --- | --- | --- |
| 1 | **space-sprint** | 18 % | 5.0 s | **4.0 s** | **3.47×** |
| 2 | seatrack | 29 % | 5.0 s | 3.2 s | 2.70× |
| 3 | dirt-oval | 16 % | 4.6 s | 3.0 s | 1.92× |
| 4 | city-circuit | 4 % | 2.7 s | 2.7 s | 1.63× |
| 5 | ice-track | 3 % | 2.1 s | 2.1 s | 1.62× |
| 6 | mountainstreet | 13 % | 5.0 s | 1.8 s | 1.56× |
| 7 | luger-hill | 1 % | 0.4 s | 0.0 s | 1.01× |
| 8–10 | garden-path, river-run, searound | 0 % | — | — | — |

### 20 racers

| rank | track | bind % | longest | **over-scale** |
| --- | --- | --- | --- | --- |
| 1 | dirt-oval | 15 % | 4.6 s | **1.92×** |
| 2 | space-sprint | 3 % | 1.7 s | 1.73× |
| 3 | city-circuit | 9 % | 4.8 s | 1.63× |
| 4 | ice-track | 3 % | 2.1 s | 1.62× |
| 5 | seatrack | 2 % | 1.5 s | 1.43× |
| 6 | luger-hill | 2 % | 1.0 s | 1.25× |
| 7–10 | garden-path, mountainstreet, river-run, searound | 0 % | — | — |

**Every worst moment on every binding track is in the APPROACH**, except luger-hill at 40 and 60,
where it is a single frame in the body of the race. That is exactly where he was looking.

---

## Where the line falls — and it needs a stated threshold

There is no measured threshold for "a viewer notices", so here is an explicit one, calibrated on his
own reactions: **over-scale ≥ 2.5× sustained for ≥ 3 s in the approach.** He reacted at 2.13× on a
sustained space-sprint shot and has never remarked on dirt-oval at 1.92× for 4.6 s.

| field size | tracks that cross | which |
| --- | --- | --- |
| **20 racers** | **0 of 10** | — |
| **40 racers** | **2 of 10** | space-sprint (3.47×, 4.0 s), seatrack (2.70×, 3.2 s) |
| **60 racers** | **2 of 10, plus one borderline** | space-sprint (5.20×, 9.9 s), dirt-oval (2.89×, 4.8 s); **city-circuit is 2.44× for 7.7 s** — under the ratio, well over the duration |

**Move the threshold to 2.0× and 60 racers becomes 4 of 10; hold it at 3.0× and it is 1 of 10.** The
ranking does not change, only where the line is drawn — and that is his judgement, not a
measurement's.

---

## His configuration versus the shipped defaults

The brief expected his `battleWeight: 0` to keep the camera wide where the defaults would cut to a
duel, so that the defaults would understate what he sees. **The measurement says the opposite**, on
almost every track:

| track, 60 racers | widest — his | widest — shipped | over-scale — his | over-scale — shipped |
| --- | --- | --- | --- | --- |
| space-sprint | 1951 | **4000** | 5.20× | **10.66×** |
| city-circuit | 1203 | 1928 | 2.44× | 3.91× |
| seatrack | 1516 | 2933 | 2.02× | 3.91× |
| searound | 931 | 2392 | **never binds** | 2.43× |
| river-run | 800 | 1972 | **never binds** | 1.75× |
| luger-hill | 1076 | 1701 | 1.15× | 1.81× |
| dirt-oval | 1286 | 1286 | 2.89× | 2.89× |
| garden-path | 675 | 675 | — | — |

**Two tracks that never bind at all on his settings — searound and river-run — do bind on the
defaults**, and space-sprint reaches twice the width. So this is not something his configuration
causes; **a viewer on the shipped defaults at 60 racers would see it on more tracks and worse.** His
`bind %` is often higher while his `over-scale` is lower, which is consistent: his camera sits at a
moderate width for longer, the default camera goes wider for shorter.

---

## What the owner must decide

**Whether 40+ racers is a supported field size for the wide shot, or whether this is a 60-racer
problem he can simply not have.** The field size is per event, not a shipped default, so it is his
choice race by race. At 20 the picture is clean on all ten tracks and the floor is doing its job
without cost.

If 60 racers must look right, the follow-up question is the one LABELS-AND-FLOOR-1 already put to
him and this report does not answer: **is a racer drawn at 15–25 px in a wide sixty-racer shot still
recognisable?** Only his eye settles that.

## PROPOSALS — and the floor may not be the right term

**1. Bound the SHOT, not the sprite.** The over-scale is `floor × worldPx ÷ (worldBody × 1280)`, and
on every binding track the worst moment is at the widest shot it reaches. Capping how wide the shot
may open — space-sprint reaches 1951 px on his settings and 4000 on the defaults — would remove the
cause rather than compensate for it, and would leave the readability floor doing exactly the job it
was written for. **Cost:** a camera change, so CAMERA and RENDER both move, and it needs his eye on
the widest shots. **Why it may be better than the floor:** it fixes the two tracks that bind only on
the defaults as well, and it does not make any racer smaller anywhere.

**2. Make the floor a fraction of the SHOT rather than of the frame.** Already proposed in
LABELS-AND-FLOOR-1 and this report strengthens it: a floor expressed against the shot's world width
is constant in apparent size, so it cannot be calibrated at 20 racers and then rot at 60. **Cost:**
one key, RENDER moves on every track. **Risk:** it makes racers smaller in the widest shots, which is
the thing the floor exists to prevent — so it needs the eye-test above first.

**3. Do nothing to the floor, and cap the field size for the wide shot instead.** At 20 racers
nothing crosses on any track; at 40, two do. If 40 is acceptable and 60 is his own preference, the
cheapest correct answer is a note in the Dev Screen rather than a change to the engine. **Cost:**
nothing. **What it gives up:** sixty-racer races look wrong on space-sprint, and he would be choosing
that knowingly.

## Reproducing

```
node scripts/floor-reach-truth.mjs                 # ten tracks x 20/40/60, both arms
node scripts/floor-reach-truth.mjs --racers=60
node scripts/floor-reach-truth.mjs --json
```

**It does not render, and that is exact rather than a shortcut.** `minDrawnFrameFrac` is
drawing-only — CAMERA-MIN-DRAW-1 pins every state zoom byte-identical with the floor off, at the
default and at an absurd 0.9 — so it cannot move the race, the camera, or any racer's screen
position. `computeRenderDisplayScale` reduces to `clamp(proportional, floor, ceiling)`, and the
world→screen scale is the renderer's own `effectiveZoom`, imported rather than retyped. Skipping the
draw call is what makes sixty races affordable; it changes no number.

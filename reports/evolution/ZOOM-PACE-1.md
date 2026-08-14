# ZOOM-PACE-1 — the pace is a STATE STEP, not an argmin corner

**Branch:** `feat/contender-zoom` @ `2adba27f`. **DIAGNOSIS ONLY — nothing changed, nothing minted,
4173 untouched.** Instrument: `scripts/zoom-pace-truth.mjs`.

**The owner, on ice-track seed 9:** the zoom goes in slowly, then stands still for a moment, then
travels very fast. How far it zooms is right; the varying speed is the objection.

**Both of the hypotheses I was given to test are REFUTED, and the real cause is a third thing.**

---

## 1. The trace — ice-track seed 9, this branch, 909 endgame frames

| # | what he sees | frames | ms | zoom | rate (zoom/s) | binding |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | the run-in opens wide | 66 | 1083 | 4.51 → 1.50 | −2.98 | line |
| 2 | **"goes in slowly"** | 216 | **3583** | 1.48 → 2.35 | **+0.23** | line |
| 3 | **the entry rush** | 29 | **467** | 2.44 → **9.50** | **+16.34** | line |
| 4 | **"stands still"** | 138 | **2283** | 9.50 → 8.96 | **−0.21** | line |
| 5 | **"travels very fast"** | 62 | **1017** | 8.98 → **16.97** | **+7.75** | line→**state** |
| 6 | the drama hold | 119 | 1967 | 17.05 → 17.06 | 0.000 | state |
| 7 | the zoom-out | 168 | 2783 | 17.00 → 4.59 | −4.86 | state |

**The three phases he describes are rows 2, 4 and 5.** The ratio between the slow stretch and the
fast one is **0.23 vs 7.75 zoom/s — 34×** — and row 3 is faster still at 16.34.

### What changes at each boundary

**Boundary 2→3 is a STATE CHANGE, and it is the big one.** At `ts 99467` the state is LEADER_ZOOM
with `stateZoom` **9.10** and the delivered zoom 2.41. One frame later, at `99667`, the state is
PHOTO_FINISH and `stateZoom` is **17.06** — a 1.87× step in a single frame. The camera's target steps
**2.47 → 9.74** with it and the zoom chases at 16.34/s.

**Boundary 4→5 is the argmin corner**, and it is the smaller one. The last `line` frame is
`103000` (zoom 15.10, target 16.93) and the first `state` frame is `103017` (zoom 15.38, target
17.06). The run-in ceiling releases at the crossing and `state` takes over. The zoom is continuous
across it — 15.10 → 15.38 — and the RATE is what jumps, exactly as an argmin corner predicts.

**Row 4, the stall, is the run-in ceiling holding the shot** at ~9 while the state has already asked
for 17. It is not a pause anyone authored; it is two authorities disagreeing for 2.3 seconds.

## 2. Which cause dominates — and the set collapse is refuted outright

| candidate | evidence | verdict |
| --- | --- | --- |
| the contender set's extent collapsing | extent **83 → 78** world px across 274 photo-finish frames (−6%); its ceiling is **Infinity on 0 of them** | **REFUTED** — it never releases |
| the argmin corner | the binding term changes **once** in 909 frames (`line → state`); it produces row 5 at +7.75/s | **real, secondary** |
| **a state-zoom STEP** | `stateZoom` **9.10 → 17.06** in one frame at LEADER_ZOOM → PHOTO_FINISH; produces row 3 at **+16.34/s** | **DOMINANT** |

**The step is roughly twice the corner** by peak rate (16.34 vs 7.75) and it arrives first, which is
why it reads as the shot "arriving" and then having to move again. My own reading in the brief — the
argmin corner plus a set collapse — was half right and half wrong, and the half that was wrong is the
half that would have been repaired first.

## 3. What this arm adds — mostly nothing, but one thing is 11× worse

Same race, `contenderZoom` off (byte-identical to master):

| | ON (this branch) | OFF (= master) |
| --- | --- | --- |
| entry into the photo finish | **2.44 → 9.50 in 467 ms, +16.34/s** | 3.53 → 5.81 in 1550 ms, **+1.42/s** |
| the plateau at ~9 | **138 frames, 2283 ms** | **does not exist** |
| the corner rush | 8.98 → 16.97, +7.75/s | 6.30 → 16.75, +6.09/s |
| the drama stall | 119 frames, 1967 ms | **128 frames, 2117 ms** |
| the zoom-out | −4.86/s | **−5.34/s** |
| binding changes | 1 | 1 |

**The stall and the final rush are PRE-EXISTING — master has both, slightly larger.** They are not a
regression of the contender work and a repair aimed at them belongs elsewhere.

**What IS new here is the entry: 16.34 against 1.42 zoom/s, 11×, and the 2.3-second plateau that
follows it.** Master climbs into the photo finish gradually over 1550 ms; this branch jumps in 467 ms
and then waits. That is the part of his complaint this arm owns.

## 4. river-run seed 2814 — why it is invisible there

| | ON | OFF |
| --- | --- | --- |
| zoom range over the endgame | 2.91 → **1.38**, peak **1.74** | 2.91 → 2.29, peak **4.00** |
| binding through the photo finish | **guarantee** | state |
| pinned set extent | **183** world px | 22 world px |

**The shot barely closes in because the contender guarantee is holding it open.** Three racers are
abreast and 183 world px apart, so the guarantee binds at ~1.7 for the whole photo finish and the
state's 4.00 is never reached. On master the pinned pair is nose-to-tail at 22 px, nothing holds the
shot, and it closes to 4.00 and stalls there for 2417 ms.

**So there is very little zoom travel to have a pace at all** — 0.36 of zoom against ice-track's 15.5.
The pace defect is not absent; there is simply almost no movement to see it in. This is also the
intended behaviour he already accepted ("how far it zooms is right").

## 5. The options — named, not built

**A · Give PHOTO_FINISH's state zoom a transition instead of a step.** Attacks the dominant cause.
The step is `stateZoom` 9.10 → 17.06 at the state change; every other state gets its zoom the same
way, so this is a general mechanism rather than a finish special case. **Cost:** it delays arrival at
the tight shot, and the crossing is where arrival is due — the same objection that closed the rate
limit. **Difference from that closed attempt:** a rate limit throttled the DELIVERED zoom against
every ceiling; this would ease only the state's own target, leaving the guarantees to bind
immediately. That distinction is real and is why this is worth revisiting, but it is a change to a
shared mechanism and would move every state's fingerprint.

**B · Let the run-in hand over instead of releasing.** Attacks row 4 and row 5 together — the plateau
exists because the run-in ceiling holds ~9 while the state asks 17, and the corner exists because it
then lets go at once. **Cost:** the run-in's whole design is that it hands the ordinary shot back
*exactly at the crossing* (RUNIN-1), and this would blur that by construction. It also cannot help
row 3, which happens before the run-in is anywhere near releasing.

**C · Do nothing about the stall and the zoom-out, and fix only the entry.** The measurement supports
this: rows 6 and 7 are master's, unchanged for months and never complained about until the entry
started drawing the eye to them. **Cost:** he may still see the stall once the entry is smooth; the
2.3-second plateau at row 4 would remain.

**D · Reconsider the closed "pace it to arrive at the line" variant.** Recorded as landing at zoom
3.77 against the ordinary 4.00. **On this branch that arithmetic changes**: on river-run 2814 the
ordinary shot is no longer what it was — the guarantee holds it at 1.74 rather than 4.00 — so a
variant that undershot the ordinary zoom by 6% is being measured against a target the contender work
has already moved. **Worth re-measuring before it stays closed**, and cheap to do, but the ice-track
numbers above suggest it addresses row 5 and not row 3.

**My recommendation, and it is a recommendation rather than a finding: A, scoped to the entry.** It
is the only option that touches the dominant cause. Nothing here should be built without deciding
first whether row 3 alone is worth moving a shared mechanism for.

---

**Nothing was changed. `feat/contender-zoom` still measures 3.2% contenders-not-whole, crossing zoom
median 99%, ice-track seed 9 and river-run seed 2814 both 0.0% / 0.0%. 4173 still serves `2adba27f`.**

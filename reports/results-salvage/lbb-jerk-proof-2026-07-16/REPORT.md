# LBB-JERK-PROOF — prove or kill the no-inertia diagnosis, frame by frame

Throwaway branch `trace/lbb-jerk` off `fix/lbb-launch-ramp`. Env-gated (`LBB_JERK=1`) per-frame capture of the
lateral integrator: itemised forces BEFORE damping/clamp, the damped velocity, every clamp/hard-sep event,
and the resulting `physicalY`/velocity. Observation only; nothing committed or pushed. Seed 1,
mountainstreet/boarder, 1 race, 60 s → 3601 frames, 139 508 rows.

**Verdict up front: the no-inertia MECHANISM is confirmed exactly; the no-inertia DIAGNOSIS ("many force
events × zero inertia = the jerk") is killed as stated.** The integrator is memoryless as claimed, but 99.6%
of force events produce no visible jerk. The jerk the Owner watches is a NARROW, specific thing — a pass-gate
decision instability at dodge ONSET (pass/soft/pass/soft flicker with ±0.27 target re-aims) plus the launch
ramp's own cap-steps — not a uniform property of the motion. And the largest non-cruise mover of lateral
PIXELS is hard separation (36%), which the earlier critiques did not weigh.

## LOCK 2 — the trace is inert ✓

`node scripts/fingerprint-default.mjs` with the instrumentation present prints **`62f7ebeb37880765`**
(unchanged). All capture is guarded by `_LBB_JERK_ON`; the physics is byte-identical when off.

## LOCK 1 — the model reproduces itself ✓

Recomputing from the itemised per-frame forces, on all **139 508** rows:
- **(A)** `0.16·(prevVel + springForce) == vAfterDamp`: **139 508 / 139 508** match.
- **(B)** reconstructed `velFinal` (apply cap → boundary-clamp → hard-sep zero) `== recorded velFinal`:
  **139 508 / 139 508** match.

The decomposition is complete — every lateral-writing source is accounted for (spring, damping, soft
repulsion, the per-step cap, the boundary clamp, and the hard-sep velocity-zero). Nothing is missing. This
is the sanity gate that lets the tables below be trusted.

## The Owner's case — first sustained pass dodge

Racer **20**, leader **24**, pass (`takeFreeLane`) sustained frames **442–537** (96 frames), net lateral
0.0357 physicalY = **5.4 px**. Qualifies: a run of pass-branch frames moving one direction past a slower
leader — what the Owner watches.

### Dodge table (frames 422–557; the informative rows — the 445–536 cruise is monotone-smooth, ~1e-5 jerk)

`JERK = Δ physicalYVelocity vs previous frame`. `px` = lateral pixels from centre (physicalY·150). `Δpx` =
this frame's on-screen lateral step. `spring`/`vDamp` = force before damping / damped velocity before cap.

| frame | py | vel | JERK | Δpx | branch | target | Δtgt | spring | cap? effV | event |
|---:|---:|---:|---:|---:|:--:|---:|---:|---:|:--:|:--|
| 434 | 0.7097 | +0.00073 | −0.00000 | +0.09 | soft | 0.8373 | −0.0000 | +0.00385 | · 0.028 | none |
| 435 | 0.7103 | +0.00073 | −0.00000 | +0.09 | soft | 0.8372 | −0.0001 | +0.00382 | · 0.028 | none |
| **436** | 0.7047 | **−0.00560** | **−0.00633** | **−0.84** | **pass** | **0.5606** | **−0.2766** | −0.07486 | Y 0.0056 | ONSET, REAIM |
| **437** | 0.7044 | −0.00031 | **+0.00529** | −0.05 | **soft** | **0.8264** | **+0.2658** | +0.00365 | · 0.028 | END, REAIM |
| **438** | 0.6932 | **−0.01120** | **−0.01089** | **−1.68** | **pass** | **0.5603** | **−0.2661** | −0.07204 | Y 0.0112 | ONSET, REAIM |
| **439** | 0.6921 | −0.00115 | **+0.01005** | −0.17 | **soft** | **0.8263** | **+0.2660** | +0.00399 | · 0.028 | END, REAIM |
| 440 | 0.6925 | +0.00046 | +0.00161 | +0.07 | soft | 0.8263 | +0.0000 | +0.00403 | · 0.028 | none |
| 441 | 0.6932 | +0.00072 | +0.00026 | +0.11 | soft | 0.8263 | −0.0000 | +0.00401 | · 0.028 | none |
| 442 | 0.6979 | +0.00464 | +0.00392 | +0.70 | pass | 0.7497 | −0.0765 | +0.02826 | · 0.017 | ONSET, SIDE-FLIP |
| 443 | 0.7027 | +0.00488 | +0.00025 | +0.73 | pass | 0.7496 | −0.0001 | +0.02587 | · 0.022 | none |
| 444 | 0.7072 | +0.00452 | −0.00036 | +0.67 | pass | 0.7495 | −0.0001 | +0.02336 | · 0.028 | none |
| … | (cruise 445–536: monotone smooth, jerk ~−1e-5, Δpx ≤ 0.5 shrinking to 0) | | | | pass | ↓ | −0.0001 | ↓ | · 0.028 | none |
| 537 | 0.7289 | +0.00094 | −0.00000 | −0.01 | pass | 0.7389 | −0.0001 | +0.00494 | · 0.028 | none |
| 538 | 0.7282 | +0.00020 | −0.00074 | −0.11 | soft | 0.7387 | −0.0002 | +0.00029 | · 0.028 | END |
| 539 | 0.7274 | +0.00008 | −0.00012 | −0.12 | soft | 0.7373 | −0.0014 | +0.00027 | · 0.028 | none |

**What the frames show:** the sustained pass (442–537) is **smooth** — the per-frame jerk is ~1e-5 and the
step shrinks monotonically as it approaches the target. The jerk is entirely at the **onset (436–439)**: the
pass gate fires (436), un-fires to soft (437), re-fires (438), un-fires (439) — a **pass/soft/pass/soft
flicker** — and each switch **re-aims the target by ±0.27** (0.56 on the pass frames, 0.83 on the soft
frames, opposite sides), so the velocity swings −0.0056 → +0.0053 → −0.0112 → +0.0100, **reversing sign every
frame** (Δpx −0.84 / −0.05 / −1.68 / −0.17). That sign-reversing onset is the "extremely fast left-right".
The launch ramp caps each flicker's amplitude (effV 0.0056 → 0.0112, and it correctly kept ramping across the
437 soft gap) but does not stop the flicker. The move only settles when the gate commits to a nearer target
(442, `0.7497`) and then glides.

## LOCK 3 — falsification (threshold |JERK| > 0.003; 293 big jerks in the race)

**(1) Is there any jerk WITHOUT a force event? Yes — 55 / 293 (18.8%), and they are the LAUNCH RAMP itself.**
Inspection: these frames are `branch=pass`, `prevVel=±0.0056`, `vel=±0.0112` — i.e. the ramp stepping the cap
from 1/5 to 2/5 of vLatMax, a jerk of `vLatMax/5 = 0.0056` per ramp frame. Plus a few uncapped spring-evolution
frames. So no jerk comes from nothing, but the ramp meant to smooth the onset **emits its own staircase of
per-frame jerks** — a source the critiques did not name.

**(2) Is there any force event WITHOUT a jerk? Overwhelmingly yes — 66 823 / 67 061 events (99.6%).** The
event population is dominated by hard-separation (it touches packed racers almost every frame), and those
produce jerk ~0 (relaxation 0.15 → tiny per-frame pushes). **This kills the "no inertia converts EVERY force
step into a jerk" reading:** the vast majority of force events cause no visible jerk. Only the large re-aims
and the onset flicker do.

**(3) Does the magnitude match `Δvel ≈ 0.16·Δforce`? Partly — and only when nothing clamps.** Of the 293 big
jerks, **124 are cap/boundary/hard-sep-limited** (velocity set by the clamp, NOT by 0.16·force — the onset
frames are here) and **169 are uncapped**. On the uncapped ones the relation holds tightly when the previous
velocity is small (ratios 1.00–1.01), but breaks when it is not (ratios 0.51, −7.5) because the true jerk is
`0.16·spring − 0.84·prevVel`, not `0.16·Δspring`. So the critiques' exact formula is **incomplete** (it drops
the 0.84·prevVel decay term) and **does not apply at the biggest events** (onsets), where the cap/ramp sets
the velocity. The direction (force step → velocity step) is right; the quantitative law as stated is not.

**(4) Ranking by visible PIXEL movement (whole race, all racers):**

| source | pixels | share |
|---|---:|---:|
| none (smooth cruise) | 6345 | **60.1%** |
| **hard separation** | 3775 | **35.7%** |
| target re-aim ≥0.05 | 279 | 2.6% |
| dodge onset | 135 | 1.3% |
| dodge end | 19 | 0.2% |
| side flip | 9 | 0.1% |

The dominant movers of lateral pixels are smooth cruise (60%) and **hard separation (36%)**; the gate/target
events the whole investigation has chased account for **~4% combined**. Hard-sep moves a lot of pixels but at
low jerk (many small pushes) — it is a large-amplitude, low-abruptness mover. So "amount of visible sideways
movement" and "jerk (abruptness)" are DIFFERENT quantities with different dominant sources: pixels → cruise +
hard-sep; abruptness → the onset flicker + ramp steps.

## The micro-twitches — CC's obstacle-churn reading is KILLED here

Selected the non-dodging racer with the most velocity-reversals: racer **11** (pass only 1.2% of frames, but
just **6 sign-reversals in 385 active frames**). **At those 6 reversal frames, the obstacle that set the soft
target (`ssObstacle`) changed from the previous frame in 0 (0.0%).**

### Twitch window (frames 2061–2101)

| frame | py | vel | Δvel | branch | ssObstacle | Δobst? | target | Δtgt |
|---:|---:|---:|---:|:--:|---:|:--:|---:|---:|
| 2065 | −0.2249 | −0.00107 | −0.00002 | soft | 26 | · | −0.4109 | +0.0000 |
| 2070 | −0.2302 | −0.00104 | +0.00001 | soft | 26 | · | −0.4108 | +0.0000 |
| **2071** | −0.2311 | **+0.00000** | **+0.00104** | soft | 26 | · | −0.4108 | +0.0000 |
| 2072–2083 | −0.23… | +0.00000 | +0.00000 | soft | 26 | · | −0.411 | ~0 |
| **2084** | −0.2391 | **−0.00085** | **−0.00085** | soft | 26 | · | −0.4149 | −0.0004 |
| 2088 | −0.2432 | −0.00101 | +0.00001 | soft | **—** | CHG | −0.4191 | +0.0008 |
| 2093–2099 | −0.24… | (ease to centre, Δtgt +0.05→+0.09, smooth) | | soft | — | · | ↑ | + |
| **2100** | −0.2459 | **−0.00560** | **−0.00697** | **pass** | — | · | **−0.3184** | **−0.3176** |

The obstacle (26) is **stable** across every reversal. The reversals are (i) the soft spring reaching its
target and the velocity DECAYING to exactly 0 for ~13 frames (2071–2083, a stop), then a fresh push (2084);
and (ii) a pass ONSET (2100, target re-aim −0.32 → the same onset mechanism as the dodge). **So on this race
the twitch is soft-spring settle-then-restart plus a pass onset, NOT obstacle-identity churn** — CC's
specific "the neighbour churns each frame" reading is not supported (0%). Caveat: this seed/track produced no
strongly-twitching non-dodging racer (the worst had 6 reversals in 60 s), so this is a clean falsification of
the obstacle-churn reading but weak evidence about the twitch phenomenon in general — a heavier-traffic race
may differ.

## What this proves and kills

- **Proven:** the integrator is memoryless exactly as claimed (`velFinal = 0.16·(prevVel + spring)`, verified
  on 139 508/139 508 frames); a force step does pass straight to velocity; the onset produces sign-reversing
  jerks; uncapped big jerks follow `0.16·spring` when prevVel is small.
- **Killed / refined:** "many force events × zero inertia = the jerk" — **99.6% of force events cause no
  jerk**. The visible jerk is a NARROW set: the **pass-gate onset flicker** (pass/soft/pass/soft with ±0.27
  target re-aims — a decision instability at dodge entry) and the **launch ramp's own cap-steps**. The exact
  `0.16·Δforce` magnitude law is incomplete and fails at the (capped) onsets. And the largest non-cruise
  mover of lateral pixels is **hard separation (36%)**, low-jerk but previously unweighed. The **obstacle-
  churn** micro-twitch reading is falsified here (0%).

## What I did NOT check (marked)

- **The onset flicker's root** — whether the pass/soft alternation is the nearest-leader selection oscillating
  between two leaders, or the free-side gate toggling. The frames show the target jumping between 0.56 (pass)
  and 0.83 (soft) then committing to 0.75 (a third value), consistent with a leader/candidate switch, but I
  did not capture the candidate leader identity per flicker frame to confirm it.
- **Generality across the field/seed** — one race, seed 1, mountainstreet. The pixel-share ranking and the
  scarcity of micro-twitchers are from this single race; a denser pack or different seed may shift the hard-sep
  share and surface real obstacle-churn twitches.
- **The browser render path** — this is the sim (physics parity). The physicalY trajectory is what the browser
  interpolates, so the jerk in `physicalY` is real on screen; I did not separately confirm the browser adds or
  removes anything (a prior read of the interpolation path found it faithful, not re-verified here).

## Hygiene (separate)

- The launch ramp (`LATERAL_LAUNCH_RAMP_FRAMES`) emits a per-frame jerk of `vLatMax/5` while ramping — a
  staircase, not a smooth acceleration — because it steps the cap in discrete 1/R increments. It is a jerk
  source in its own right (LOCK 3 answer 1), which is worth stating wherever the ramp is documented as a
  "smooth lean-in".
- The event classifier counts a hard-sep "event" on nearly every frame for packed racers; that inflates the
  event denominator in LOCK 3(2). The 99.6% figure is dominated by these near-noise hard-sep touches — the
  qualitative conclusion (most events don't jerk) is robust, but the exact percentage is definition-sensitive.

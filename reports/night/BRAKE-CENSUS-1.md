# BRAKE-CENSUS-1 — every brake on the leader, and what still acts after 60%

**Read-only.** No source file was changed. Nothing minted, nothing merged. Measured on master
`7eb65c82`; the branch replay named below ran on `feat/remove-prestaging-comebacker` `5c9e050e`.
Date: 2026-09-14.

---

## THE PLAIN ANSWER

**No. In the shipped default configuration nothing brakes a racer *for leading* after progress
0.60.** The one mechanism that does — the PULK contest director's leader brake in
`raceGovernor.js:170` — is structurally switched off at `pulkEnd`, and `pulkEnd` resolves to
**0.60** (`racePlanner.js:174-176` sets `pulkEnd = corridorStart = choreoOutcomeStart`, and
`choreoOutcomeStart` is 0.60 in `defaults.js:1070`). In both races measured below the leader's
`governorMult` is exactly **1.0000 in 100% of frames after 0.60** (N = 2579, N = 2186 and N = 2206
leader frames in the three races read below).

Two things do still act on a leader after 0.60, and neither is a leader brake:

- the **OUTCOME servo** (`racePlanner.js:1103`) steers him toward **his drawn rank**, not toward the
  field. A leader who is one rank ahead of his drawn place gets a flat **−5%**, and that was not
  enough in either race;
- the **gap-cap re-roll bias** (`racePlanner.js:1267`) can cut his next *draw* to the slow edge of
  the natural band, but only **at one of his own re-roll events**, and the re-rolls run out at
  95% of the realized duration with the bias window closing 3 s before that.

A purpose-built leader brake for exactly the missing range — window **[0.60, 0.92]** — exists in the
tree at `racePlanner.js:1130-1169` and **cannot fire in the browser**: its two config keys appear
nowhere in `defaults.js`.

---

## STEP 1 — HOW I SEARCHED

Scope: the whole master tree at `7eb65c82`, extracted with `git archive` — **2677 tracked files**,
not only `client/src`. All searches `rg -ni` (case-insensitive), uncapped.

**Term sweep** (patterns run verbatim; "live code" = `client/src`, `server`, `scripts`, `shared`,
`*.{js,mjs,jsx}`, excluding `*.test.*`):

| pattern | whole tree | live non-test code files | what it turned out to be |
|---|---|---|---|
| `brak` | 3883 | 55 | the avoidance brake + `pulkLeaderBrake` |
| `clamp` | 2444 | 120 | envelope clamps (mostly not brakes) |
| `governor` | 577 | 19 | ★ `raceGovernor.js` — the PULK director |
| `leash` | 242 | 4 | ★ the front distance leash, sim-only |
| `rubber.?band` | 105 | **0** | ★ deleted mechanism — docs/reports only |
| `catch.?up` | 758 | 9 | comments + the challenger boost |
| `spreadMax\|maxSpread\|spreadCap` | 42 | 3 | the natural band edges |
| `leadCap\|maxLead\|capLead\|leadLimit` | 175 | 8 | telemetry only (`maxLeadGapFrac`) |
| `speedCap\|maxSpeed\|speedLimit\|capSpeed` | 7 | 1 | not a brake |
| `throttle` | 26 | 4 | browser tab throttling, a comment |
| `pullBack\|pull.back\|reelIn` | 183 | 6 | the **camera** pull-back, not physics |
| `slipstream\|draft` | 443 | 115 | the drafting boost (helps followers) |
| `elastic` | 2 | **0** | prose only |
| `tether` | **0** | **0** | not present anywhere |
| `handicap` | 53 | **0** | prose only |
| `bunch`, `compress`, `converge`, `corridor`, `envelope`, `servo`, `ceiling` | — | — | resolved to the servo / camera / phase machinery |

**Absence claims, with their search text.** `rubber.?band` → `rg -ni "rubberband|rubber-band"
client/src server shared -g '*.{js,mjs,jsx}'` returns **zero** hits; its 105 whole-tree hits are all
in `docs/` and `reports/`. `elastic|tether|handicap` → the same search returns **zero** hits in
`client/src`, `server`, `shared`.

**The structural search that keyword searching cannot do.** Every brake must reach the race through
one expression: the complete per-frame speed chain at `raceStep.js:115-133` is
`baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult · governorMult · dt`, with a
finish clamp and nothing else. So I enumerated every **writer** of each factor rather than trusting
names:

- `governorMult =` → `raceGovernor.js:180` and `:360` only;
- `trajectoryMult =` → `raceCore.js:569` only, fed by `_setTarget` at `racePlanner.js:761, 785, 902, 925, 1104, 1165`;
- `areaBonusMult =` → `racePlanner.js:677, 688, 698, 721, 745`;
- `brake` / `boost` → `raceCore.js:653-661` (avoidance + drafting);
- `baseSpeed` → `raceCore.js:650` via `spreadFactor`, which the two re-roll transforms bias.

That enumeration is what found `raceGovernor.js` and the sim-only leash; neither was in the brief.

---

## STEP 2 — ONE ROW PER MECHANISM

Phase fractions are **measured live**, not read off the defaults: both races reported
`pulkStart 0.150 | pulkEnd 0.600 | corrStart 0.600 | corrEnd 1.000`.

### Reachable in the shipped default configuration

**1. PULK leader brake — `raceGovernor.js:170`, force applied at `:357` and `:368`.**
Acts on **the live rank-1 racer** (hero-inclusive) and on every dethroned ex-leader still in the
brake set. Window **[0.15, 0.60)** — `inWindow` at `raceGovernor.js:182-187` requires
`progress < pulkEndFrac`; outside it every racer is slewed back to 1.0 at `:190`. Decided by
`choreoOutcomeStart` (`defaults.js:1070`, 0.60), not a constant. Strength `−pulkLeaderBrake`:
**0.10 shipped** (`defaults.js:1030`), **0.10 at `quiet`**, **0.15 at `wild`**
(`defaults.js:1175-1183`); floored at `1 − max(maxEffect, leaderBrake)` (`:357`), slewed
0.01/frame, and additionally scaled by the phase-weight fade. To fire it needs a **750 ms hold**
after taking the lead (`pulkLeadRotationMinHoldMs`, `defaults.js:1134`); release is distance-based
at **8 lengths** behind the current leader (`pulkLeadRotationDropDepthLengths`, `defaults.js:1131`).
**Reachable and ON** — `enabled: racePlanEnabled` (`raceCore.js:352`).

**2. OUTCOME servo — `racePlanner.js:1103` (the target), applied at `:1104`. `rawTarget = clamp(1.0 + gain·(error/nActive) + noise, minMult, maxMult)`.**
Acts on **every racer**, toward **his own drawn rank** — it is not a leader mechanism and does not
know what a breakaway is. Window **[0.60, 1.00]** (`corrStart` → `corrEnd`), decided by the same
`choreoOutcomeStart` seam. Strength `gain` 2.0, clamped to `[minMult 0.85, maxMult 1.10]`
(`racePlanner.js:99-104`); **identical at `quiet` and `wild`** — the stage overrides only the two
`pulk*` keys. Needs no threshold or timer: it runs every frame in OUTCOME. **Reachable and ON.**
★ Its authority on a leader one rank ahead of his drawn place is `1 + 2.0·(−1/40)` = **0.95**.

**3. Gap-cap re-roll bias — `racePlanner.js:1267` (`computeGapBiasedTarget`), window test at `:1282`.**
Acts on **any racer who has opened a hole larger than G behind himself** — rank-blind, and it is the
only shipped mechanism that measures a *gap*. Window **[corrStart 0.60, lastRollDeadline −
reRollTransitionDuration]**; the lower bound is `phaseProgress < corrStartFrac → return rawSample`
(`:1282`) — ★ **this one STARTS at 0.60, it does not stop there**, contrary to the brief. Upper bound
`lastRollDeadline = realizedDurationSec × 0.95` (`raceCore.js:437-438`) minus
`reRollTransitionDuration` 3.0 s (`defaults.js:980`). Strength `frac = min(1, strength·(gap − G))`
with **G = 0.5 lengths, strength = 1.0** (`defaults.js:1116-1117`), `gapRerollMode: 'symmetric'`;
**identical at `quiet` and `wild`**. At full strength it moves a draw from the band max **1.0813** to
the band min **0.9187**. ★ **It needs a re-roll event for that racer** — it cannot act between rolls.
**Reachable and ON** (`gapRerollEnabled: true`, `defaults.js:1115`).

**4. Band-aim re-roll bias (FAIR-ARRIVAL-1 arm B) — `racePlanner.js:1202-1212`.**
Acts on **every racer out of his drawn band**, aiming the draw at the near band edge. Window
**[bandBiasR, end]** = **[0.60, end]** (`defaults.js:1011`). Gain **0.1** (`defaults.js:1012`),
clamped to the honest band; same at both stages. Needs a re-roll event and `bandErr ≠ 0`.
**Reachable and ON.** It takes precedence over the PULK cohesion bias at `:1202`. It is a
*band* mechanism: a leader whose drawn band is the front is aimed **faster**, not slower.

**5. PULK cohesion bias — `racePlanner.js:1227`, gain `pulkBiasGain` 2.0 (`defaults.js:1016`).**
Acts on **the three pulk racers only** (`:1220`), toward the pulk centroid. Window **PULK** —
`getPhase(...) !== 'PULK' → return rawSample` (`:1214`), i.e. [0.15, 0.60). Reachable and ON, but
**cannot reach the last third** and applies to 3 racers, not the leader as such.

**6. Avoidance speed brake — `raceCore.js:653-661`, set at `raceBehavior.js:858, 1192`.**
Acts on **the trailer of a physically close pair** — `speedBrakeSet.add(trailer.index)`. Rank-blind
and proximity-driven; it can only reach the race leader when *he* catches traffic. No phase window —
always on. Strength `speedBrakeFactor` **0.945** (`defaults.js:1274`), warmed in over 3 s on open
tracks (`computeEffectiveBrakeFactor`). Same at both stages. **Reachable and ON.**

**7. Drafting boost — `raceCore.js:653`, set at `raceBehavior.js:1294`.**
Not a brake: it boosts a **follower** in the wake cone by **1.04** (`defaults.js:1226`). Listed
because it is the only always-on catch-up term. **Reachable and ON.**

**8. The natural band itself — `defaults.js:70-73`, enforced at `raceCore.js:634-636`.**
Every `spreadFactor` draw is clamped to `[0.00096, 0.00113] / mean` = **[0.9187, 1.0813]**. This is
the ceiling on any racer's luck, always on, but it is a *band*, not a response to leading.

**9. Director ceiling cap — `raceGovernor.js:51-55, 375-376`, `NATURALNESS_CEILING` 1.20.**
Caps a *boosted* racer, never brakes an unboosted leader. Lives inside the governor, so it shares
window **[0.15, 0.60)**.

### Built but NOT reachable in the shipped configuration

**10. Front distance leash — `racePlanner.js:1130-1169`. ★ THE ONE THAT WOULD COVER THE END.**
Acts on **the live rank-1 racer**, latched the first frame the leader→P2 gap exceeds a maximum.
Window **[0.60, 0.92]** — hardcoded `LEASH_LO = 0.6`, `LEASH_HI = 0.92` (`:1131-1132`), with the
comment "window end (protect the run-out)". Strength `clamp(1 − gainFrac·(gap − max), 0.85, 1.0)`
(`:1164`) — a proportional brake floored at `minMult`. Releases on hysteresis 0.5 lengths, on the
leashed racer falling to rank 3, or on the gap closing to 1.0 length. ★ **It cannot fire in a
browser race**: it requires `plan._frontLeashMaxLengths != null` **and** a `leaderGapLen` argument,
and `frontLeashMaxLengths` / `frontLeashGainPct` appear **nowhere in `defaults.js`**
(`rg -n "frontLeash" client/src/modules/storage/defaults.js` → zero hits), so both stay null
(`racePlanner.js:378-382`). Confirmed empirically: `leashFrames = 0` in the BVGG8Z telemetry.

### Removed

**11. Rubber-band "cap the lead" — DELETED 2026-07-07, commit `ec06b92e`.**
`client/src/modules/raceRubberBand.js` (185 lines) bounded **the leader's maximum gap to the field
median** with a proportional brake. Its own header states the design: *"Eligibility is gap-based
(myGap > brakeThreshold), NOT 'is leader' — so braking two breakaway racers does not just shift the
runaway to the new 2nd place."* ★ That is the exact failure the owner described. The commit's
recorded reason for removal is **not** that it failed: *"Rubber-band was OFF in the winning config,
so removal is byte-identical."* Zero references remain in live code.

**12. Governor-family leader brakes — retired, recorded in `docs/DEAD-ENDS.md`.**
"progressive leader-brake, dead-zoned edge-limiter, ahead-median cohesion **leader-brake** (retired
Stage C 2026-07-05), TAIL-LIFT" — with the standing conclusion *"A limiter/cap cannot create a
contest (Lesson 160)."*

**13. `rubberBandMult`, `zoneMult` — `docs/FORCE-MAP.md` rows A9, A10, both marked REMOVED.**

---

## STEP 3 — WHAT COVERS THE END

Sorted by where each window closes:

| mechanism | window | still active after 0.60? | after 0.80? | after 0.90? |
|---|---|---|---|---|
| areaBonusMult | cut to 1.0 at 0.15 under choreo (`racePlanner.js:673-680`) | no | no | no |
| PULK cohesion bias | [0.15, 0.60) | no | no | no |
| **PULK leader brake** | **[0.15, 0.60)** | **NO** | **NO** | **NO** |
| director ceiling cap | [0.15, 0.60) | no | no | no |
| gap-cap re-roll bias | [0.60, 0.95·dur − 3 s] | **yes** | yes, while rolls remain | usually **no** |
| band-aim re-roll bias | [0.60, last roll] | **yes** | yes, while rolls remain | usually **no** |
| OUTCOME servo | [0.60, 1.00] | **yes** | **yes** | **yes** |
| avoidance brake | always (traffic) | incidental | incidental | incidental |
| front distance leash | [0.60, 0.92] | **unreachable** | unreachable | unreachable |

**After 0.60** exactly one mechanism acts on a leader continuously: the OUTCOME servo, and it serves
his **drawn rank**, so it does nothing about a gap. Two re-roll transforms can still act, but only at
a re-roll event.

**After 0.80**, same, with the re-roll doors closing.

**After 0.90**, in plain words: **nothing in the shipped configuration brakes a racer for leading,
and in both races measured the re-roll doors had already shut.** In BVGG8Z the gap-bias window
closed at 79.86 s of an 87.22 s race — **progress 0.929**, with re-rolls themselves ending at 0.965; in
seed 53 the same doors shut at **0.895** and **0.929**. The last
tenth of a race is held by the servo alone, at a drawn-rank error of typically one rank, which is
−5%. **That range is unprotected, and nothing in the record shows anyone decided it should be.**

---

## STEP 4 — THE TWO RACES, MECHANISM BY MECHANISM

Both replays were proven exact before anything was read out of them.

### Race 1 — `BVGG8Z` (dirt-oval, 40, seed 9, `quiet`, build `52be3ec4`)

**CONTROL: positions 40/40, finishing times 40/40 — exact** (`replay-stored-race.mjs`, and again in
the observer). N = 5664 frames.

Thunder (index 5) finished **1st**, drawn **2nd**, cast `comebacker [held]`. He took the lead at
p=0.838 and his gap grew to **202.2 px** at p=0.987.

| mechanism | what it did | numbers |
|---|---|---|
| PULK leader brake | **fired, then died** | braked the leader in **1848 of 2368 PULK frames (78%)**, `governorMult` down to **0.9000** (= 1 − 0.10 at `quiet`). From p=0.60: **0 of 2579 frames (0%)**, `governorMult` exactly 1.0000. Structural, not incidental — `raceGovernor.js:182-187` |
| OUTCOME servo | **fired, and was outgunned** | on the leader in 66% / 94% / 96% of frames in [.60,.80] / [.80,.90] / [.90,end]. On Thunder it sat at **0.9501** — one rank ahead of his drawn 2nd, `1 + 2.0·(−1/40)`. But his `spreadFactor` was pinned at the band **maximum 1.0813**, so his net factor was **1.0813 × 0.9501 × 1.0000 = 1.0273 — 2.7% ABOVE the field mean** for the whole breakaway |
| gap-cap re-roll bias | **could not reach him** | it hit the live leader **once in the race**, at p=0.6509, `delta` 0.0258. ★ Thunder's own re-rolls were at p=0.132, 0.253, 0.368 (all **before** `corrStart` 0.60) and p=0.951 / 81.7 s — **past the 79.86 s window close**. So during his entire breakaway the correction had **zero** opportunities on him. Field-wide: 44 down-tilts, of which **39 hit the pack**, 4 a chaser, **1 the leader** |
| band-aim re-roll bias | no effect on him | same door: his only post-0.60 roll was past the deadline |
| PULK cohesion bias | could not fire | 42 events, all inside PULK; ends at 0.60 |
| avoidance brake | **9 frames of 1020 after p=0.90 (1%)** | traffic on a lapped field, not a rank response |
| drafting | 2 frames of 1020 (0%) | — |
| areaBonus | 1.0 from 0.15 | 100% of PRE-PULK frames, 0% thereafter |
| front leash | **could not fire** | `leashFrames = 0`; keys absent from `defaults.js` |
| rubber band | **does not exist** | deleted 2026-07-07 |

**Why nothing held:** his last draw before the breakaway (p=0.368) put him at the band ceiling, the
governor switched off 0.24 of a race before he took the lead, the servo could only ask for −5%
against a +8.1% draw, and the one gap-aware mechanism had no re-roll left to act on.

### Race 2 — seed 53, master's fixture (city-circuit, 40, his roster, `wild`, master `7eb65c82`)

There is no stored record of this exact race, so the control is determinism: **two independent runs,
positions 40/40, times 40/40, frame counts equal.** N = 5036 frames (4807 before the first finish).

| mechanism | what it did | numbers |
|---|---|---|
| PULK leader brake | **fired, then died** | braked the leader in **1284 of 2166 PULK frames (59%)**, `governorMult` to **0.8500** (= 1 − 0.15 at `wild`). From p=0.60: **0 of 2186 frames (0%)** |
| OUTCOME servo | fired throughout | 87% / 100% / 98% of leader frames in the three OUTCOME bands; on Gale a flat **0.9501** |
| gap-cap re-roll bias | ★ **FIRED ON THE LEADER, AT FULL STRENGTH** | 2 leader down-tilts: p=0.6090 on Titan, `frac` 0.817 but **cut 0.0000** (his draw was already at the slow edge); and **p=0.8444 on Gale, `frac` 1.000, draw cut 0.2530** — `spreadFactorTarget` 1.0813 → **0.9187**, band max to band min |
| band-aim re-roll bias | acted | part of the same roll events |
| avoidance brake | 7 frames of 750 after p=0.90 (1%) | traffic |
| front leash / rubber band | could not fire / does not exist | as above |

**What the one real correction achieved, and what it did not.** Gale's net factor fell from
**1.0273** to **0.8728** (12.7% below the field mean) and his lead collapsed **93.5 px (p=0.764) →
81.2 (0.80) → 63.5 (0.85) → 44.9 (0.90) → 39.1 (0.95) → 6.4 (0.99)**. He was caught. He finished
2nd. **The brake worked on him.** And the race was won by somebody else who ran clear — see Step 5.

### Race 2b — `4B28H3`, the seed-53 race the owner actually has on his screen

While the services from the previous block were running, the owner raced and stored **`4B28H3`:
city-circuit, 40, seed 53, `wild`, build `5c9e050e`** — my removal branch, not master. Its roster is
**byte-identical** to master's fixture roster, so the two differ *only* by the hero-casting removal.
Replayed on master it reproduces **6 of 40 positions** (stored winner Orbit, master's winner Pixel);
replayed on `5c9e050e` it is **positions 40/40, times 40/40 — exact**, and that is the arm read here.
It is the race his description fits, so it is reported beside master's rather than instead of it.

---

## STEP 5 — THE HANDOVER EFFECT

### In master's seed 53

| leader | drawn | led | peak gap | correction on him | his net factor |
|---|---|---|---|---|---|
| Titan (31) | 18 | 0.600–0.638 | 52.3 px | p=0.609, **cut 0.0000** | 0.8999 |
| Nova (19) | 10 | 0.638–0.692 | 30.7 px | none | 0.9562 |
| **Gale (39)** | 3 | **0.692–0.992** | **93.5 px** | ★ **p=0.844, cut 0.2530** | 1.0273 → **0.8728** |
| **Pixel (23)** | 4 | **0.993–1.000** | 12.9 px | ★ **none** | **1.0392** |

Pixel won. His **last re-roll was at p=0.708 / 56.6 s** and it moved him **up** to **1.0813**, the
band maximum — the symmetric branch helping a racer who had dropped behind. He then took **no
further draw for the last 30% of the race**, because re-rolls stop at 73.95 s and the gap-bias
window at 70.95 s. He arrived at the front with the best draw in the band and nothing able to touch
it.

### In `4B28H3`, the race he watched — the same shape, larger

| leader | drawn | led | peak gap | correction on him | his net factor |
|---|---|---|---|---|---|
| Quasar (22) | 31 | 0.600–0.646 | 44.6 px | p=0.621, **cut 0.0000** | 0.9190 |
| **Gale (39)** | 3 | **0.646–0.838** | **117.4 px** | ★ **p=0.713, cut 0.1743** (`frac` 1.000) | **0.8815** |
| Thunder (5) | 5 | 0.838–0.872 | 23.5 px | none | 0.8713 |
| **Orbit (21)** | 2 | **0.872–1.000** | ★ **200.4 px** | ★ **none** | **1.0546** |

**This is the owner's sentence, in numbers.** Gale led by 117.4 px, was cut from 1.0813 to 0.9187 at
p=0.713, dropped below the field mean and was swallowed. Orbit then led from p=0.872 to the line and
opened **200.4 px — 1.7× the gap that had just been corrected** — running at `spreadFactor` **1.0813**
with **zero re-rolls during his entire spell**. His last draw was at **p=0.666 / 52.6 s**, and it had
moved him **up** to the ceiling.

### Design, or timing?

**Timing.** The mechanism is *not* rank-1-only, and the data says so directly: it hit Quasar and
Titan *while they led*, it hit Gale *while he led*, and it **helped** Pixel and Orbit *while they
trailed* — `gapRerollMode: 'symmetric'`. Across BVGG8Z's 44 down-tilts, **39 hit the pack**, 4 a
chaser, 1 the leader; it is a field-wide cohesion transform, not a leader brake.

What leaves leader B unprotected is that the correction can only act **at one of his own re-roll
events**, and by the time he inherits the lead his last draw is behind him and no further draw is
scheduled: re-rolls end at `realizedDuration × 0.95` and the bias window 3 s earlier. In both races
the incoming leader's final draw landed at the band **maximum** — Pixel at p=0.708, Orbit at p=0.666
— and then the door shut. **The correction pulls back the leader it can still reach; the next one it
cannot reach at all.** Not because it targets rank 1, but because it is a *draw* mechanism and the
draws stop before the race does.

---

## STEP 6 — THE HISTORY OF THE WINDOW

The PULK leader brake has no window of its own: it ends where PULK ends, and `pulkEnd` is set to
`choreoOutcomeStart` at `racePlanner.js:174-176`. The history of that value:

1. **Created `c7ef0773`, 2026-07-08** — *"feat(v4): Step 5 — collapse the dead PULK phase, OUTCOME
   steers from the chaos boundary"*. It introduced `directorV4OutcomeStart` and made
   `pulkEnd = corridorStart = outcomeStart`, **default 0.25**, valid range [0.25, 0.55]. Reason on
   record: the pack ran unsteered until `corridorStart` 0.55 and that half-race was "dead time".
2. **Raised to 0.5 in `fae494ef`** — *"CONFIG: default-flip to the swept+eye-tested v4 world"*.
3. **Renamed in `b5fda3d7`** — `directorV4*` → `choreo*`, behaviour-identical.
4. ★ **Last changed `5646d238`, 2026-07-17** — *"feat: set choreoOutcomeStart default 0.6, widen
   valid range to [0.25,0.60]"*. The recorded reason, verbatim from the commit body: *"SWEEP 2: 0.6
   gives +51% PULK action vs 0.5 with band-reach gate held on 3/4 tracks and more margin than 0.7."*

So the window's last move was **outward, and justified by PULK action** — more contest inside the
window. **Nothing on the record discusses what happens after the window closes.** The end-of-race
coverage question is not answered anywhere I searched; it is *not documented*, and I have not
reconstructed a motive for it.

One structural consequence worth stating: the validator at `raceDynamicsConfig.js:204-210` rejects
`choreoOutcomeStart > 0.6`, so **the shipped default sits exactly at the maximum the config allows.**
The window cannot be widened by configuration alone.

---

## WHAT I NOTICED AND DELIBERATELY LEFT ALONE

- **`docs/FORCE-MAP.md` has four stale windows**, including both leader brakes: **A13** says PULK is
  `[0.15,0.5)` (live: 0.60); **A7** says the controller is `OUTCOME 0.55–0.95` (live: 0.60–1.00);
  **A8** says the area bonus runs "until 0.75 then fade" (live: instant cut at 0.15 under choreo);
  **A2** says spreadFactor re-rolls run "until 80% race" (live: 95% of realized duration). The one
  document that inventories the forces understates where two of them stop. Not edited.
- **`racePlanner.js:1235-1237`** still describes the gap re-roll as *"SIM-ONLY … the browser never
  sets it"*. That is contradicted by the corrected comment 840 lines above it at `:388-395`, which
  records the 2026-09-13 correction. One of the two is stale; not edited.
- **`raceCore.js:578`** is commented `// PulkLeadRotation (default OFF → skipped)` while
  `pulkLeadRotationOn = racePlanEnabled` at `:352` makes it ON by default. Not edited.
- **`raceCore.js:679-683`** computes the diagnostic `r.vt` from the speed chain but **omits
  `governorMult`**, so `vt` understates a boosted racer and overstates a braked one while the
  governor is active. Diagnostic only — it does not feed `advanceRacerT`. Not edited.
- `_gapLeaderDownEvents` is readable only via `getGapLeaderDownEvents`, while `getGapLeaderDownCount`
  reads a counter that `collectTelemetry()` **resets**. My first run printed 0 for a race that had 1.
  Caller-side ordering issue; I fixed my own script, not the engine.

**If the reading points at a lever** — it points at `docs/CONCEPT-COHESION.md`, which already names
one: the **bounded brake, "fallback ONLY (D2) … dead-zoned, slew-limited, brake-only, faded before
the release"**, to be built only if the owner's eye still sees chasms after the re-roll correction is
tuned; the deleted rubber band (`ec06b92e`) is the previous implementation of that idea and was
removed for being off, not for failing.

---

## READ-ONLY PROOF — THE OWNER'S STORE

Opened with `better-sqlite3` `{ readonly: true, fileMustExist: true }`. Nothing was created, updated
or deleted there; the two exported JSON files were written to `C:/tmp/brakes/`, outside the repo and
outside `server/data`.

| | race count | size (bytes) | mtime | sha256 |
|---|---|---|---|---|
| **before** | 16 | 245760 | 2026-09-14 15:42:29.972346500 +0200 | `59785c09…b179f69e` |
| **after** | 16 | 245760 | 2026-09-14 15:42:29.972346500 +0200 | `59785c09…b179f69e` |

Unchanged — count, size, mtime and content hash all identical.

*(Note for the record: the API and both clients started at the end of the previous block were stopped
before this snapshot was taken, so nothing held the file open during the read. The two races stored
today at 15:39 and 15:42 — `NZA5NW` and `4B28H3` — were written by the owner through that running
server before it was stopped, not by this task.)*

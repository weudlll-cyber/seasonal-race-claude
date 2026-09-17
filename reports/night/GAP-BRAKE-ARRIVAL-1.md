# GAP-BRAKE-ARRIVAL-1 — the command arrives, and the in-window maximum falls on eight tracks

Branch `feat/gap-leader-brake`. **Shipped default stays OFF.** No merge, no tag, **nothing minted**.
Date: 2026-09-14. The owner's store was not opened.

---

## THE SHORT ANSWER

The brake now arrives. On the two witness races the commanded value is reached exactly
(`held − target` median **0.000000**, was 0.141085), and the leader is slower on the braked steps
instead of faster. Across ten tracks × 30 races the 0.600→finish maximum **falls on 8 tracks, is
unchanged on 2, and rises on none**; the pooled worst race goes **244.4 → 216.6 px (−11.6%)**.
**33 races improved, 1 got worse** — where before the fix it was 16 better and 18 worse.

The one that got worse is the first genuine **hand-over** this line of work has found.

---

## STEP 1 — THE FIX

**The fix is the omission of a restart, not a new mechanism.** While the brake is the binding
constraint on a racer, the target is moved and the transition clock is left alone
(`_retargetInFlight`, [racePlanner.js:706](../../client/src/modules/racePlanner.js#L706)). The ease
then runs to completion exactly as designed; once `elapsed` passes the transition duration,
[raceCore.js:565-574](../../client/src/modules/raceCore.js#L565-L574) returns the target itself and
the held value tracks the command step for step.

**What was reused:** the existing `easeInOutCubic` transition and its existing
`trajectoryTransitionDuration`. Nothing new smooths, slews or eases here. **No new number was
introduced** — the fix adds no rate, no threshold and no constant; it adds one integer of state
(`_gapBrakeBindingIdx`, the racer the brake was obeyed on last step) and one line that writes a
target without touching the clock.

**Scope, and how it is held.** The arrival path applies only when `gapBrake.target < rawTarget` —
only when the brake is the value actually being obeyed
([racePlanner.js:1255-1262](../../client/src/modules/racePlanner.js#L1255-L1262)). A racer the brake
is not acting on, and a racer whose own servo is already pulling harder than the gap warrants, both
keep the shipped `_setTarget` behaviour untouched. `TARGET_EPSILON` is unchanged, the ease is
unchanged, and **the pre-existing restart churn in the servo was not touched** — on ice-track seed 3
the servo still misses its own target on 214 of 535 leader steps with the brake OFF, exactly as
GAP-BRAKE-PARADOX-1 measured it. That was not this block's subject.

**Why it cannot raise a speed.** The written value is `Math.min(rawTarget, gapBrake.target)`
([racePlanner.js:1247-1251](../../client/src/modules/racePlanner.js#L1247-L1251)), so the commanded
target is never above what the servo alone would command; the arrival change alters only *how the
multiplier travels to that target*, never the target itself. Measured below, and pinned by a test
that goes red when the `min` is replaced by an override.

---

## STEP 2 — IT ARRIVES (the same two witnesses, the same instrument)

Restricted to the braked steps and the same step indices in the OFF run.

### ice-track seed 3

| | before the fix | **after** |
|---|---|---|
| `held − target`, median | 0.017373 | **0.000000** |
| ease restarts | 21.1% | **6.8%** |
| median `elapsed` into the 1000 ms transition | 48 ms | **1584 ms** |
| told `< 1.0` while holding `> 1.0` | 214 of 513 | **101 of 513** |
| leader `trajectoryMult`, median | 0.967433 | **0.945809** |
| steps where the ON leader advanced **more** | 362 of 535 | **0 of 513** |
| 0.600→finish maximum | 196.6 px | **169.0 px** |

Over 513 braked steps the ON leader **lost 60.8 world px** to the OFF leader.

### space-sprint seed 2

| | before the fix | **after** |
|---|---|---|
| `held − target`, median | 0.141085 | **0.000000** |
| ease restarts | 25.8% | **2.1%** |
| median `elapsed` into the 1000 ms transition | 16 ms | **1872 ms** |
| told `< 1.0` while holding `> 1.0` | 592 of 592 | **80 of 326** |
| leader `trajectoryMult`, median | 1.075235 | **0.949887** |
| steps where the ON leader advanced **more** | 503 of 562 | **4 of 326** |

Over 326 braked steps the ON leader **lost 7.6 world px**.

### The four steps that are not zero

The task requires this count to be zero and it is not. **4 of 326**, all within four steps of the
pull's onset, sized **+4.2e-9 to +1.06e-8** in `t` — about **6.5e-5 world px**. On every one of them
each other term in the chain is bit-identical and only `trajectoryMult` differs, by ~4e-5.

The cause is the two arms' eases being at different *phases* across the onset restart, not the brake
raising anything: at step 2790 the OFF target is 0.950141 and the ON target 0.949132, the ON arm
restarts once and then retargets in flight while the OFF arm keeps restarting, so for a few steps the
two multipliers are at different points of their respective curves. It is not zero, and it is
reported rather than rounded away.

★ **The number of braked steps also fell** — 592 → 326 on space-sprint, 535 → 513 on ice-track —
because a brake that arrives closes the gap, so the lead drops back under the allowance sooner.

---

## STEP 3 — THE SWEEP (ten tracks, seeds 1–30, 40 racers, wild, 124 px / 0.95)

**Same instrument as GAP-BRAKE-WINDOW-1**, so the columns compare directly. 600 races, 0 failed.
Window resolved to **0.600 – 0.95**.

### ★ The noise floor first, because it is the scope check

**221 of 300 race pairs never fired. All 221 are byte-identical** — same 40 names, same 40 finishing
times, window-restricted maximum equal to the last bit. Largest difference: **0.000000 px**.
**The fix did not leak outside its scope.**

### 0.600 → finish — the owner's question

| track | med OFF → ON | p90 OFF → ON | Δ p90 | max OFF → ON | Δ max | Δ% |
|---|---|---|---|---|---|---|
| city-circuit | 113.2 → 113.2 | 173.8 → 172.6 | −1.1 | 208.1 → **201.3** | **−6.8** | −3.3% |
| dirt-oval | 106.3 → 106.3 | 178.7 → 176.3 | −2.4 | 242.9 → **216.6** | **−26.4** | −10.8% |
| garden-path | 96.5 → 96.5 | 159.7 → 159.7 | +0.0 | 182.3 → 180.4 | −1.8 | −1.0% |
| ice-track | 81.0 → 81.0 | 177.5 → 169.0 | **−8.5** | 205.9 → **191.1** | **−14.8** | −7.2% |
| luger-hill | 99.9 → 99.9 | 162.0 → 160.6 | −1.3 | 244.4 → **216.0** | **−28.4** | −11.6% |
| mountainstreet | 73.1 → 73.1 | 133.0 → 133.0 | +0.0 | 160.2 → 160.2 | +0.0 | +0.0% |
| river-run | 66.7 → 66.7 | 150.3 → 150.3 | +0.0 | 157.5 → 157.5 | +0.0 | +0.0% |
| searound | 107.0 → 107.0 | 191.1 → 188.6 | −2.5 | 216.4 → **190.1** | **−26.3** | −12.2% |
| seatrack | 87.8 → 87.8 | 184.7 → 182.9 | −1.7 | 207.1 → **194.9** | **−12.2** | −5.9% |
| space-sprint | 112.3 → 112.3 | 170.3 → 172.1 | +1.8 | 196.5 → **185.4** | **−11.0** | −5.6% |

**No median moved.** That is expected and is the mechanism behaving: 73.7% of races never open a lead
above the allowance at all, so the median race is untouched by construction. The brake acts on the
tail, and the tail is where every movement is.

### 0.600 → 0.95 — the brake's authority

Identical to the above on every track except garden-path (−1.5 at p90), searound (p90 **184.2 →
170.6, −13.6**) and space-sprint (p90 −1.2). Worst race per track: the same figures as the
0.600→finish column — i.e. **every improved maximum was inside the brake's own window.**

### 0.95 → finish — the run-out

| track | med OFF → ON | p90 OFF → ON | max OFF → ON |
|---|---|---|---|
| city-circuit | 48.1 → 48.1 | 123.7 → **143.8 (+20.1)** | 164.3 → 160.3 (−4.0) |
| dirt-oval | 48.0 → 48.0 | 106.2 → 106.2 | 116.3 → 110.3 (−6.0) |
| garden-path | 47.6 → 47.6 | 138.1 → 138.1 | 169.3 → 166.9 (−2.3) |
| ice-track | 53.0 → 53.0 | 117.2 → **85.4 (−31.9)** | 138.9 → **117.4 (−21.5)** |
| luger-hill | 52.3 → 51.2 | 115.3 → 115.3 | 148.0 → 143.2 (−4.7) |
| mountainstreet | 38.6 → 38.6 | 133.0 → 133.0 | 160.2 → 160.2 |
| river-run | 43.7 → 43.7 | 80.5 → 80.5 | 134.2 → 134.2 |
| searound | 57.2 → 51.3 | 152.7 → 152.7 | 191.1 → 190.1 (−1.0) |
| seatrack | 41.9 → 41.9 | 94.1 → 94.1 | 172.2 → 172.2 |
| space-sprint | 65.2 → 64.2 | 157.0 → 157.0 | 163.0 → **181.6 (+18.6)** |

★ Two entries move the wrong way in the run-out — city-circuit's p90 (+20.1) and space-sprint's max
(+18.6). Both are past the window end, where the brake has no authority; the second is the
hand-over race described below.

### Canvas widths, secondary, with the px-per-width at each peak

| track | max px OFF → ON | px/width at the OFF peak | at the ON peak | max widths OFF → ON |
|---|---|---|---|---|
| city-circuit | 208.1 → 201.3 | 225.0 | 225.0 | 0.925 → 0.895 |
| dirt-oval | 242.9 → 216.6 | 165.0 | 165.0 | 1.472 → 1.313 |
| garden-path | 182.3 → 180.4 | 165.0 | 165.0 | 1.105 → 1.094 |
| ice-track | 205.9 → 191.1 | 165.0 | 165.0 | 1.248 → 1.158 |
| luger-hill | 244.4 → 216.0 | 165.0 | 165.0 | 1.481 → 1.309 |
| mountainstreet | 160.2 → 160.2 | 120.0 | 120.0 | 1.334 → 1.334 |
| river-run | 157.5 → 157.5 | 165.0 | 165.0 | 0.954 → 0.954 |
| searound | 216.4 → 190.1 | 165.0 | **225.0** | 1.311 → **0.845** |
| seatrack | 207.1 → 194.9 | 165.0 | 165.0 | 1.255 → 1.181 |
| space-sprint | 196.5 → 185.4 | 165.0 | 165.0 | 1.191 → 1.124 |

Nine of ten rows now agree in sign between the two units. **searound is the exception and the warning
kept from the earlier reports**: its −26.3 px reads as −0.466 canvas widths because the camera was
at 225 px/width at the ON peak against 165 at the OFF peak — a third of that apparent improvement is
the shot, not the race.

### Firing, and how deep

| | before the fix | after |
|---|---|---|
| races in which the brake fired | 79 of 300 | **79 of 300** |
| races with no in-window lead over the allowance | 221 | **221** |
| deepest correction commanded, per track median | 0.9497–0.9581 | **0.9393–0.9581** |
| tracks reaching the `minMult` 0.85 floor | 4 | **4** |

Episode counts are unchanged (80 across ten tracks); what changed is that the correction now lands.

### Outcome

**34 of 300 races moved beyond the 0-px floor: 33 better, 1 worse** (before the fix: 16 better, 18
worse). The largest improvements:

| track | seed | 0.600→finish max | holder | brake |
|---|---|---|---|---|
| luger-hill | 24 | 244.4 → **216.0** (−28.4) | 3 → 3 | 326 frames |
| ice-track | 3 | 196.6 → **169.0** (−27.6) | 16 → 16 | 513 frames |
| searound | 20 | 216.4 → **189.0** (−27.4) | 6 → 6 | 432 frames |
| dirt-oval | 7 | 242.9 → **216.6** (−26.4) | 39 → 39 | 610 frames |
| seatrack | 2 | 207.1 → **187.8** (−19.3) | 17 → 17 | 380 frames |
| searound | 11 | 184.2 → **165.0** (−19.2) | 5 → 5 | 458 frames |

★ **THE ONE THAT GOT WORSE IS A REAL HAND-OVER**, and the first one this line of work has found:

> **space-sprint seed 2 — 170.3 → 181.6 px (+11.3), holder 20 → 18 — a DIFFERENT racer.**
> The brake pulled racer 20 back for 326 frames, and racer 18 came through and opened a larger lead
> than the one that was corrected.

Every earlier "worse" race was the *same* racer outrunning the brake. This one is the effect the
owner described in July, and it appears only now that the brake actually works.

### The plain sentence

**The in-window maximum has improved substantially on the tail and not at all in the middle.** The
pooled worst race across all 300 falls **244.4 → 216.6 px (−11.6%)**; eight of ten tracks improve
their worst race, by 1.8 to 28.4 px; no track's worst race got worse; and the pooled median (88.3 px)
and p90 (163.0 px) are unchanged, because three-quarters of races never give the brake anything to
do.

---

## STEP 4 — IS IT VISIBLE

**No. It is still gentler than the steering already present, on every track.**

| track | biggest single-step move OFF: med / max | ON: med / max | ON worse? |
|---|---|---|---|
| city-circuit | 0.0100 / 0.0139 | 0.0100 / 0.0139 | no |
| dirt-oval | 0.0096 / 0.0197 | 0.0096 / 0.0197 | no |
| garden-path | 0.0114 / 0.0197 | 0.0114 / 0.0197 | no |
| ice-track | 0.0112 / 0.0166 | 0.0113 / 0.0166 | no |
| luger-hill | 0.0108 / 0.0197 | 0.0108 / 0.0197 | no |
| mountainstreet | 0.0112 / 0.0176 | 0.0112 / 0.0176 | no |
| river-run | 0.0096 / 0.0183 | 0.0096 / 0.0183 | no |
| searound | 0.0100 / 0.0204 | 0.0100 / 0.0204 | no |
| seatrack | 0.0092 / 0.0180 | 0.0092 / 0.0180 | no |
| space-sprint | 0.0085 / 0.0211 | 0.0085 / 0.0211 | no |

**Pooled over 300 races per arm: OFF max 0.0211, ON max 0.0211. 0 of 10 tracks are more abrupt with
the brake on.** The brake's own largest single-step move across all 80 episodes is **0.0137**, below
the servo's routine maximum of 0.0211 and close to its median of ~0.010. A correction still takes a
median 0.6–3.9 s to reach its deepest point.

★ **One honest caveat repeated from GAP-BRAKE-SWEEP-1:** this measures the multiplier, not the
picture. Whether the *camera*, following the leader, makes a now-genuine 5–15% slowdown legible is an
eye-test question and is his to judge. The corrections are deeper than before — four tracks now
actually reach the 0.85 floor rather than merely commanding it — so there is more to see than there
was, even though the per-step motion is unchanged.

---

## STEP 5 — REACH, FINGERPRINTS, VERIFY

`engine-reach --check` with all ten changed paths passed explicitly: **4 of 10 can change the race** —
`raceCore.js`, `raceDynamicsConfig.js`, `racePlanner.js`, `storage/defaults.js`.

**All four fingerprints measured with the key OFF. None moved. Nothing minted.**

| role | record | measured |
|---|---|---|
| world | `b35cf477c09a1116` | **identical** |
| world-off | `19ccb497041a0dae` | **identical** |
| camera | `3df640a42e934312` | **identical** |
| render | `6a84085e79535dd6` | **identical** |

`verify`: **PASS 21 / FAIL 1 / SKIP 12** on the first run. The failure was **`check-index`** — three
reports from the preceding blocks (`GAP-BRAKE-SWEEP-1`, `GAP-BRAKE-WINDOW-1`, `GAP-BRAKE-PARADOX-1`)
had never been added to `reports/night/INDEX.md`. That is class **(b), a real defect, and it is
mine** — an omission from my own earlier blocks, not a moved input. It is fixed in this block: the
three are indexed, this report with them, and `check-index` now reports **0 unindexed, 0 dangling**.
The re-run is reported below.

**Tests — both proven by sabotage:**

- *Arrival*: asserts the transition clock is not restarted while the brake pulls, and that the target
  tracks the commanded value. Sabotage (disable the retarget path) → **2 red**.
- *Never raises a speed*: two controllers in lockstep on identical states; the braked one must never
  write a higher target. Sabotage (replace `Math.min` with an override) → **1 red**, with
  `expected 0.9925 to be close to 0.85`.

★ **ONE FALSE GREEN FOUND AND FIXED.** The first version of the "never raises a speed" test stayed
green under the override sabotage. Its leader was the racer *drawn to win*, so the servo asks for
~1.0, the brake's command is always the lower of the two, and `min` and override are
indistinguishable there. The case that separates them is a leader **far ahead of his drawn place**:
the servo saturates at `minMult` 0.85 while a lead barely over the allowance asks for ~0.99, and an
override hands him 0.99 — faster. That case is now in the file, and it is what turns the sabotage red.

★ **AND FIXING THE FIXTURE SURFACED A BEHAVIOURAL FACT WORTH HIS ATTENTION:** the brake is **silent
whenever the servo is already pulling harder**. With a leader one rank ahead of his drawn place the
servo asks 0.95, so the brake only binds once its command drops below that — ramp > ⅓, i.e. a gap
above **4/3 of the allowance**. At 124 px that is about **165 px, not 124 px**. The allowance names
where the brake begins to *speak*; where it begins to *bite* is higher, and by how much depends on
how far ahead of his drawn rank the leader is.

---

## SOURCE HYGIENE REPORT

| file | before | after | Δ |
|---|---|---|---|
| `racePlanner.js` | 1645 | 1695 | +50 (**8 executable**, the rest comment) |
| `gapLeaderBrake.test.js` | 170 | 306 | +136 |
| `reports/night/INDEX.md` | 1442 | 1466 | +24 |

**Removed:** nothing. **Moved out:** nothing.

**Reused rather than written:** the existing `easeInOutCubic` transition and its
`trajectoryTransitionDuration`; `_setTarget`'s existing `TARGET_EPSILON`, unchanged; the `Math.min`
fold already in place; the sweep and frame-by-frame instruments from the two preceding blocks,
unmodified, so the columns compare. **No new smoothing, no new rate, no new constant.**

**Noticed and deliberately left alone:**

- **The servo's own restart churn.** Pre-existing, measured, explicitly out of scope by the brief.
  It is why `held − target` on ice-track seed 3 is 0.017 on the OFF arm rather than 0.
- **The dead front leash** ([racePlanner.js:1177-1216](../../client/src/modules/racePlanner.js#L1177-L1216))
  still carries the harder version of the same fault and is still unreachable.
- `raceCore.js:679-683` still omits `governorMult` from the diagnostic `vt`.
- `racePlanner.js` still calls the gap re-roll "SIM-ONLY" in one comment, contradicted by the
  corrected one above it; `raceCore.js:578` still says "default OFF" for a mechanism that is ON;
  `docs/FORCE-MAP.md` still carries four stale windows.
- **`scripts/sim-fairness.mjs` still cannot exercise this brake** — it reaches `createRacePlan` but
  never passes `pathLengthPx`. Parity holds while the key ships OFF; wiring it is a separate change.
- The two instruments sample differently — the frame-by-frame witness reads a **pre-step** gap on
  **every physics step**, the sweep reads a **post-step** gap on **render frames**
  ([raceDriver.mjs:565-569](../../scripts/lib/raceDriver.mjs#L565-L569) can step physics twice per
  render frame). Sweep-to-sweep figures are therefore comparable, and witness-to-sweep figures agree
  only to about half a pixel. Not unified: changing either would break comparability with the
  reports already written.

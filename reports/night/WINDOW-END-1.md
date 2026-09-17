# WINDOW-END-1 — a later window end does close the races that matter, and the finish does not pay for it

Branch `feat/gap-leader-brake`. Date: 2026-09-17. **Read-only: no shipped default changed, nothing
minted, nothing merged.** V1 OFF in every arm. The owner's store was not opened.

---

## ★ ONE LINE

**Yes: moving the window end from 0.95 to 0.98 takes the >124 px late-gap count from 12 races to 7
(shipped is 24), and the feared cost at the finish does not appear — contested finishes go 124 → 126,
back *towards* shipped's 129, and the brake is still pulling at the line in 0 of 300 races at every
value.**

---

## THE ARMS AND THE FIXTURE

Allowance **56 world px**, authority **13%** (his values, 2026-09-15), **V1 OFF** — fixed in every
braked arm. Only `gapBrakeWindowEnd` moves: **0.95 (his current value), 0.96, 0.97, 0.98**, plus
**SHIPPED (brake off)** as the reference in every table.

Ten tracks × seeds 1–30 = **300 races per arm, 1,500 races**, 40 racers, the owner's roster, `wild`,
the same seeds in every arm. 10 workers on 14 logical cores.

★ **One tree, not one checkout per arm.** The hazard named is "never two measurements writing one
tree"; nothing here writes — each arm's settings are passed as a `raceDynamicsConfig` override to
`buildRace`, in process, exactly as the dev screen supplies them. The noise floor below is the proof
that no arm contaminated another.

### ★★ The noise floor is exactly zero

> **239 races across all arms in which the brake never engaged. 239 byte-identical to SHIPPED.**

**Every difference in this report is real.** (Real is not the same as large — the counts are small
integers and are reported as such.)

---

## STEP 1 — WHAT IT CLOSES

### 1a — the largest gap, window start → the line (world px)

| arm | median | p90 | **MAX** | vs SHIPPED | vs 0.95 |
|---|---|---|---|---|---|
| SHIPPED (off) | 87.9 | 162.0 | **244.4** | — | +56.9 |
| **end 0.95** (his) | 86.3 | 130.1 | **187.5** | −56.9 | — |
| end 0.96 | 86.3 | 127.7 | **187.5** | −56.9 | **0.0** |
| end 0.97 | 86.3 | 127.7 | **187.5** | −56.9 | **0.0** |
| end 0.98 | 86.5 | 125.8 | **187.5** | −56.9 | **0.0** |

★ **On the whole window, 0.95 already takes everything there is to take.** The maximum is 187.5 px at
every window end — moving it buys nothing here, because that peak happens before 0.95.

### 1b — restricted to 0.95 → the line, the segment he asked about

| arm | median | p90 | **MAX** | vs SHIPPED | vs 0.95 |
|---|---|---|---|---|---|
| SHIPPED (off) | 47.6 | 113.3 | **191.1** | — | +21.0 |
| **end 0.95** | 47.6 | 108.5 | **170.1** | −21.0 | — |
| end 0.96 | 47.6 | 102.5 | **165.2** | −25.8 | −4.9 |
| end 0.97 | 47.6 | 102.5 | **164.5** | −26.5 | −5.6 |
| **end 0.98** | 47.6 | **96.8** | **143.5** | **−47.6** | **−26.6** |

★★ **Here the later window does work, and monotonically.** 0.98 more than doubles the reduction 0.95
achieves (−47.6 px against −21.0). In canvas widths against the settled LEADER_ZOOM of 225 px/width:
the worst late gap falls **0.849 → 0.638 widths**.
★ The median is 47.6 px on every arm including shipped — **the ordinary race is untouched at every
value.**

### ★ 1c — how many races open a gap after 0.95. The 124 px column is the one that matters

Every >124 px late-gap race measured so far is a win for the racer holding it — **36 of 36**
(LATE-GAP-1).

| arm | >56 px | >90 px | **>124 px** | vs SHIPPED | vs 0.95 |
|---|---|---|---|---|---|
| SHIPPED (off) | 114/300 | 48/300 | **24/300** | — | +12 |
| **end 0.95** (his) | 106/300 | 47/300 | **12/300** | **−12** | — |
| end 0.96 | 106/300 | 47/300 | **10/300** | −14 | −2 |
| end 0.97 | 106/300 | 46/300 | **8/300** | −16 | −4 |
| **end 0.98** | 106/300 | 45/300 | **7/300** | **−17 (−71%)** | **−5** |

★★★ **The extra window buys in the 124 px column and nowhere else.** The >56 px count is 106 at every
braked value — flat — and >90 px moves by three races across the whole range. **0.95 halves the
count that matters; 0.98 takes it down by 71% against shipped.**

### 1d — of the >56 px late-gap races: closed, or a win?

| arm | n | still >56 px at the line | that leader **wins** |
|---|---|---|---|
| SHIPPED (off) | 114 | 76 (66.7%) | **109 (95.6%)** |
| end 0.95 | 106 | 74 (69.8%) | 103 (97.2%) |
| end 0.96 | 106 | 74 (69.8%) | 103 (97.2%) |
| end 0.97 | 106 | 74 (69.8%) | 103 (97.2%) |
| end 0.98 | 106 | **77 (72.6%)** | 103 (97.2%) |

★ **No window end changes this.** When a gap past his allowance survives into the run-in, the leader
wins it ~97% of the time whatever the brake does, and 0.98 leaves slightly *more* of them open at the
line. **The brake reduces how often the big gap happens; it does not rescue the races where it does.**

### Per track — races with a >124 px gap after 0.95

| track | off | 0.95 | 0.96 | 0.97 | 0.98 |
|---|---|---|---|---|---|
| city-circuit | 2 | 2 | 1 | 1 | 1 |
| **dirt-oval** | **0** | **3** | **2** | **2** | **2** |
| garden-path | 4 | 2 | 2 | 1 | **0** |
| ice-track | 1 | 0 | 0 | 0 | 0 |
| luger-hill | 2 | 0 | 0 | 0 | 0 |
| mountainstreet | 3 | 0 | 1 | 0 | 0 |
| river-run | 1 | 1 | 0 | 0 | 0 |
| **searound** | 4 | 3 | 3 | 3 | **3** |
| seatrack | 2 | 0 | 0 | 0 | 0 |
| space-sprint | 5 | 1 | 1 | 1 | 1 |

★★ **dirt-oval is worse with the brake at every window end** — shipped has **zero** >124 px late gaps
there and every braked arm has two or three. A later window reduces but does not remove it.
★ **searound is barely helped** (4 → 3, and 3 at every value).

---

## ★★ STEP 2 — WHAT IT COSTS AT THE FINISH

### 2a — contested finishes (second racer within one body length at the winner's crossing)

| arm | contested | vs SHIPPED | vs 0.95 |
|---|---|---|---|
| SHIPPED (off) | **129/300** | — | +5 |
| end 0.95 (his) | 124/300 | −5 | — |
| end 0.96 | 124/300 | −5 | 0 |
| end 0.97 | **125/300** | −4 | **+1** |
| end 0.98 | **126/300** | −3 | **+2** |

★★★ **The feared cost does not appear.** Braking at all costs 5 contested finishes; **extending the
window recovers 2 of them.** A later end moves *towards* shipped on this metric, not away.
★ On 300 races these are single-digit counts and the arms are close together; what can be said
plainly is that **no window end in the range buys its gap reduction by taking close finishes away.**

### 2b — is the brake still pulling when the winner crosses?

| arm | races still binding at the line | strength at the line (max) |
|---|---|---|
| every arm, including 0.98 | **0 / 300** | **0.0000** |

★★ **Never, at any value.** `raceProgress` is the leader's own `t / finishT`
([raceCore.js:577](../../client/src/modules/raceCore.js#L577)), so the winner crosses at progress 1.0
and every window end in this range has already released. **The finish itself is never braked** — the
structural reassurance the question was asking for.

### ★ 2c — how abruptly does it stop?

| arm | releases at/after 0.95 | max strength at a late release | max at ANY release |
|---|---|---|---|
| end 0.95 (his) | 115 | **0.1300** | 0.1300 |
| end 0.96 | 124 | **0.1300** | 0.1300 |
| end 0.97 | 131 | **0.1300** | 0.1300 |
| end 0.98 | **141** | **0.1300** | 0.1300 |

★★ **The brake does release at its full 13% authority, and a later window means more such releases
deeper into the run-in** — 115 at 0.95, **141 at 0.98**. That is the one thing that genuinely gets
worse with the change, and it is the mechanism BRAKE-JERK-1 identified.

### 2d — and yet it is not abrupt, because V1 is off

| arm | largest single-step multiplier move | largest one-frame speed change |
|---|---|---|
| SHIPPED (off) | 0.011762 | 206.62 px/s |
| **every braked arm, 0.95 → 0.98** | **0.011762 (1.000×)** | **206.62 px/s (1.000×)** |

★★★ **Identical to six decimals at every window end.** A full-authority release is invisible because
the shipped `_setTarget` restarts the ease on it
([racePlanner.js:733-739](../../client/src/modules/racePlanner.js#L733-L739)) — the invariant
BRAKE-JERK-1 measured at 0 violations in 378 transitions.

★★ **The warning that follows from this**: those 141 full-strength releases are exactly what becomes a
**7.6× jump if V1 is ever switched on**. **A later window end makes the brake more dependent on V1
staying off, not less.** V1 ships off and has its own dev-screen switch; this is a reason to keep it
that way, not a reason against the window.

---

## STEP 3 — HIS OWN RACE, ice-track quick-test seed 3

| | SHIPPED | end 0.95 | end 0.96 | end 0.97 | end 0.98 |
|---|---|---|---|---|---|
| largest lead to the line | 213.1 px | **115.8** | 115.8 | 115.8 | 115.8 |
| winner | **Flare** | **Bolt** | Bolt | Bolt | Bolt |
| Flare finishes | 1st | **2nd — caught** | 2nd | 2nd | 2nd |
| margin to 2nd | 0.256 s | 0.528 s | 0.528 s | 0.528 s | 0.528 s |

**The brake engages once**, at progress 0.8161 on Flare at a 90.1 px gap, is obeyed for 9.94 s
(621 frames) and reaches 0.1259 of its 0.13 ceiling. It releases at progress 0.9434 with strength
0.0305 — **before any window end in this study matters**.

★ **His race is identical at all four window ends.** At 0.98 there is one extra release, at progress
0.98 with strength **0.0051** — a re-engagement that had almost faded. **On the race he watches, the
window end changes nothing at all.**

### How much the race moves

| arm | byte-identical to SHIPPED | winner changes | brake engaged in |
|---|---|---|---|
| end 0.95 | 145/300 | **57/300** | 238/300 |
| end 0.96 | 144/300 | **57/300** | 240/300 |
| end 0.97 | 141/300 | **57/300** | 240/300 |
| end 0.98 | **128/300** | **57/300** | 243/300 |

★ **The winner changes in exactly 57 races at every window end** — the extra window moves *how* races
run, not *who* wins them. But it does touch more races: byte-identical falls 145 → 128.

---

## STEP 4 — READING IT

**Which window ends reduce the 124 px count substantially?** 0.95 halves it (24 → 12). **Every further
step helps and the help is monotone**: 0.96 → 10, 0.97 → 8, 0.98 → 7. **0.98 is a 71% reduction
against shipped and a further 42% against his current value.**

**What each one costs at the finish.** 0.96: nothing measurable (contested identical to 0.95, 124).
0.97: **+1** contested against 0.95. 0.98: **+2** contested, **+13 races no longer byte-identical**,
and **+26 full-strength releases inside the run-in** (115 → 141).

**Where the trade begins.** **It does not begin anywhere in this range on the contested-finish
metric** — that number improves, slightly, as the window extends. The real cost is elsewhere and is
of a different kind: **more of the brake's full-authority releases land deeper in the run-in**, which
is safe while V1 is off and is exactly the interaction that is unsafe if it is ever switched on.

**Does any value buy the gap reduction without touching the contested finishes?** **Yes — every one of
them.** 0.96 and 0.97 buy 2 and 4 races out of the 124 px column at a contested count that is equal to
or better than 0.95's.

★ **If the measurement points anywhere it points at 0.97**: it takes the 124 px count from 12 to 8,
costs one contested finish *less* than 0.95 rather than more, moves only 4 more races off
byte-identical, and adds 16 late releases against 0.98's 26 — **and the value is his.**

★ **What I am not saying.** 0.98 is better on the gap column and I am not ruling it out; it simply
costs more of everything else for two more races. And on the incumbent's side: **0.95 is his current
value, and on his own race nothing above it changes anything.**

---

## STEP 5 — CHECKS

**All four fingerprints with the brake key at its shipped OFF:**

| role | record | measured |
|---|---|---|
| world | `b35cf477c09a1116` | **`b35cf477c09a1116`** |
| world-off | `19ccb497041a0dae` | **`19ccb497041a0dae`** |
| camera | `3df640a42e934312` | **`3df640a42e934312`** |
| render | `6a84085e79535dd6` | **`6a84085e79535dd6`** |

★ **Four of four on the record. The default really is off. Nothing was minted.**

**`verify`: 10 PASS / 0 FAIL, 24 skipped — no failures to classify, so no (a) and no (b).** It skipped
because **this task changed no source file at all**: `git diff --name-only edee568f..HEAD` excluding
`reports/` and `docs/` is **empty**, so the engine is byte-identical to the state that verified
**26 PASS / 0 FAIL** in full. `git status` is clean.

---

## WHAT I NOTICED AND DELIBERATELY LEFT ALONE

- **dirt-oval gets worse at every window end** — shipped has zero >124 px late gaps there and the
  brake creates two or three. That is a per-track effect worth its own look; I did not chase it.
- **searound is barely helped** (4 → 3 at every value) and carries the largest late gaps in the set.
- **The >56 px count is flat at 106** across all four braked arms. Whatever the window end does, it
  does not change how often a modest late gap appears — only how big the biggest get.
- **I did not touch `gapBrakeAllowedGapPx` or `gapBrakeMaxAuthority`**, which the previous chain
  settled at his values, and I did not re-open the question of whether the brake should ship at all.

---

## WHAT THIS DOES NOT SETTLE

- N = 300 races per arm. **The 124 px counts are 24 / 12 / 10 / 8 / 7** — differences of two to five
  races. The noise floor is zero so they are real, but they are small integers and no significance
  test is offered for the differences *between* braked arms.
- Contested finishes move by 1–2 races between braked arms; that is inside what a handful of races
  can do and is reported as "no cost found", not as "an improvement".
- Window ends above 0.98 were not measured, and neither was any value between the steps.
- **Fairness was not re-measured here.** FAIRNESS-SEED-1 established that the instrument must be given
  a positive seed; a later window end would need its own seeded fairness run before shipping.
- Both arms use the shipped world at action stage `wild`; the owner's store was not read.

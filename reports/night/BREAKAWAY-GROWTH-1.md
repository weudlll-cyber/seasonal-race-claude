# BREAKAWAY-GROWTH-1 — the gap grows because the racer BEHIND is held back, not because the leader runs away

Branch `feat/pursuer-rename`, commit 2. **Read-only: no source changed, nothing minted, nothing
merged, no shipped default touched.** Date: 2026-09-19. The owner's store was not opened.

---

## ★★★ THE ONE SENTENCE

> **Across the 242 races that open a lead bigger than the brake's own allowance, the leader's own
> acceleration accounts for −0.9% of the growth. The racer behind him slowing accounts for 59.5%,
> and a speed difference that was already there for the other 41.4%.**
>
> ★ **On average the leader is SLOWER while the gap grows than he was before it opened** — 84 of 234
> races are the other way, and the median race has him at **−0.249** of the growth, a negative
> contribution. The breakaway is not a leader accelerating away. It is the field, and above all the
> one racer who could close it, falling back.

---

## 1 · THE FIXTURE, AND THE TREE IT RAN ON

| | |
|---|---|
| tracks | all **ten**, each at its own `defaultRacerTypeId` |
| seeds | **1–30**, N = 30 per track = **300 races** |
| field | **40 racers**, the Quick-Test roster `QUICK_TEST_NAMES` (`client/src/modules/racerNames.js:39`) |
| world | the **`wild`** Race Action stage over the shipped defaults, via `worldForActionStage` (`scripts/lib/raceDriver.mjs:115`) |
| brake | **ON** at the shipped values — allowance, authority and window end all read from `client/src/modules/storage/defaults.js`, never typed here |
| tree | `feat/pursuer-rename` at **`d7ff2db9`** |

★ **Why the branch tree is the right tree for a race measurement.** PURSUER-RENAME-1 measured this
same fixture against master and found **300 of 300 races identical on finishing order and on all 40
finishing times**. The rename moves the camera, not the race. Every number below is therefore also a
number about master `fe12fa95`.

**The window is the brake's own**: `[corrStartFrac, gapBrakeWindowEnd]`, which the controller reports
itself as `getGapBrakeStats().windowStart` = **0.60** and the owner's window end. The gap is the
brake's own expression, `(leader.t − second.t) × pathLengthPx` (`racePlanner.js:901`), read on
**pre-step** positions — where the controller reads it.

★ **World px are primary here.** The only canvas-width figures are taken against the one fixed
divisor BREAKAWAY-RECOUNT-2 settled on: **225.0 world px per canvas width**, the settled `LEADER_ZOOM`
value. No figure uses a per-frame zoom.

---

## 2 · ★★ HOW IT IS MEASURED, AND THE CHECK THAT MAKES IT CREDIBLE

The race is driven by `stepRacePhysics` directly. **Every factor of the t-update is READ off the
live racer, never re-derived from a second copy of the law**: `baseSpeed`, `trajectoryMult`,
`areaBonusMult` and `governorMult` after the step that used them; the two behaviour flags
(`draftingBoostActive`, `avoidanceActive`) **before** it, because `applyRacerBehavior` rewrites them
after the advance (`raceCore.js:735`); `rowEnvMult` from the racer's own `_rowEnvSm`.

★★ **THE RECONSTRUCTION IS CHECKED ON EVERY RACER OF EVERY STEP.** The product

```
baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult · governorMult
```

(`raceStep.js:115-133`) must equal the realized advance. **52,024,526 racer-steps were checked and
13,377 failed** — 0.026%, and they are **not noise**. They are an eighth term, named below.

★ **And the peak is cross-checked against the controller's own counter.** The harness's in-window
maximum gap equals `getGapBrakeStats().maxGapPxInWindow` in **300 of 300 races**, to the bit. The
harness and the brake are reading the same number.

### ★★ THE EIGHTH TERM — AND IT CONTRIBUTES EXACTLY ZERO

The 13,377 failures are the **hard-separation push**: `applyRacerBehavior` writes `front.t += halfPushT;
back.t -= halfPushT;` directly (`client/src/modules/raceBehavior.js:1414-1415`), after the advance.
It is **additive**, so no multiplier can express it, and a decomposition that quietly averaged it in
would be describing something other than the race.

So it was measured instead of tolerated:

| | |
|---|---|
| where the failures are | **searound 13,369 of 4,957,906** (0.27%) and **luger-hill 8 of 4,500,265**; the other eight tracks are **exactly zero** |
| ★ its contribution to the growth this report decomposes | ★★ **0.0 px of 9,474.4 px** — **zero in all 234 races** |

★ **A second, independently written probe was run over the same sixty races to locate them**, and it
reproduces both counts to the unit — 13,369 and 8 — which is how we know the two are measuring the
same thing:

| | searound | luger-hill |
|---|---|---|
| pushes, whole race | 13,369 | 8 |
| ★ of those, **inside the brake's window** | ★ **52** | **0** |
| of those, on the **leader or the racer second** anywhere in the race | **2** | 0 |
| ★★ **in the window AND on one of those two** | ★★ **0** | ★★ **0** |
| races in which that ever happens | **0 of 30** | **0 of 30** |

★★ **The push never once lands where this decomposition looks.** It is a mid-pack, early-race
mechanism on one track.

★ **It is real, it is named, and it is not in the answer.** That is a stronger statement than "the
reconstruction agrees to 1e-7", which is what an earlier pass of this harness reported by checking
only two racers per step.

---

## 3 · ★★★ WHERE THE GROWTH COMES FROM — THE DECOMPOSITION

**242 of 300 races (80.7%)** open an in-window lead above the brake's allowance. **234** of those
yield both a baseline and growing frames and are decomposed; **8** have no baseline (the gap is
already open when the window starts) and are reported as such rather than guessed at.

**The two racers followed are fixed by INDEX at the frame of the peak gap** — the leader there, and
the racer second to him there — because following the *role* would compare different racers on
different frames.

**The baseline is "before the gap opened", taken literally:** the most recent run of steps at which
the gap was **no more than half the allowance**, capped at ten seconds. A fixed number of seconds
before the episode would have swallowed the opening of a slowly-growing gap and charged it to "never
closed"; a threshold cannot.

### The decomposition is EXACT, not a model

Over the `nG` growing steps the gap grows by `nG·(v̄L_G − v̄S_G)`, and that is **identically**

```
nG·(v̄L_G − v̄L_B)   +   nG·(v̄S_B − v̄S_G)   +   nG·(v̄L_B − v̄S_B)
"the leader got faster"  "the one behind got slower"  "a difference already there"
```

| term | pooled px | ★ share |
|---|---|---|
| the leader got faster | ★ **−83.9** | ★ **−0.9%** |
| **the one behind got slower** | **5,635.8** | ★★ **59.5%** |
| a difference never closed | 3,922.6 | **41.4%** |
| **total across growing frames** | **9,474.4** | 100% |

**Per-race median share** — so one enormous race cannot carry the table: leader **−0.249**, the one
behind **+0.739**, never-closed **+0.522**.

### ★ Faster or slower than his own baseline — the same answer, counted by races

| | of 234 |
|---|---|
| the **leader** is faster during the growth than before it | **84 (35.9%)** |
| the **racer behind** is slower than before | **145 (62.0%)** |
| the **whole field** is slower than before | **132 (56.4%)** |

★ **Relative to the field, BOTH fall back** — the leader from 1.1041× the field mean to 1.0823×, the
one behind from 1.0500× to 1.0242×. **The leader falls less.** That is the whole mechanism: nobody
speeds up, the man in second decays faster than the man in first, and the distance between them
grows.

---

## 4 · ★★ THE DISTRIBUTION HE ASKED FOR

| category | races | share | what it means |
|---|---|---|---|
| ★ **never closed** | **88** | **36.4%** | a difference already present at the baseline carries more than half the growth |
| ★★ **the field decelerates** | **78** | **32.2%** | the racer behind slowing carries more than half |
| **unattributed** | **38** | **15.7%** | no single term carries half — see below, and it is a real answer |
| ★ **the leader accelerates** | **30** | **12.4%** | the leader speeding up carries more than half |
| **no baseline** | **8** | **3.3%** | the gap was already open when the window began; not decomposed |

### ★ The unattributed 38, honestly

**36 of the 38 have a net growth of zero or less across their growing frames when measured on the two
followed racers.** The reason is named rather than smoothed over: **the racer second at the peak was
not the racer second when the episode began in 129 of 234 races.** On the frames where somebody else
holds second, the gap the race sees and the difference between these two racers are not the same
number. Their episodes are also the short ones — median growth **23.5 px** against **41.9 px** for
the rest, over **128** growing frames against **195**.

★ **They are counted as unattributed, not redistributed.** An honest "38 races the identity-following
cannot attribute" is the useful answer; the alternative is a decomposition that describes a racer
who was not there.

### Per track

| track | never closed | field decelerates | leader accelerates | unattributed | no baseline |
|---|---|---|---|---|---|
| city-circuit | 11 | 5 | 8 | 2 | 1 |
| dirt-oval | 9 | 9 | 3 | 6 | 1 |
| garden-path | 9 | 9 | 2 | 2 | 1 |
| ice-track | 12 | 5 | 3 | 5 | 0 |
| luger-hill | 9 | 11 | 3 | 3 | 1 |
| mountainstreet | 6 | 5 | 1 | 7 | 0 |
| river-run | 9 | 7 | 0 | 1 | 0 |
| searound | 5 | 12 | 3 | 4 | 2 |
| seatrack | 11 | 6 | 1 | 3 | 2 |
| space-sprint | 7 | 9 | 6 | 5 | 0 |

★ **No track is an exception to the shape** — "the leader accelerates" is the smallest or
second-smallest column on nine of ten, and on `river-run` it is **zero of seventeen breakaways**.

---

## 5 · ★★★ WHICH MULTIPLIER DIFFERS — AND IT IS AN EXACT SPLIT

Speed is a **product**, so `log(vL / vS)` is the **sum** of the seven log-ratios. Averaged over the
growing frames this is an exact additive split of the leader's speed advantage into the seven named
factors of `raceStep.js:115-133`.

**Mean `log(vL/vS)` = 0.05769 — the leader is 5.94% faster than the racer behind him.** Where that
comes from:

| factor | mean log-ratio | ★ share | nonzero in |
|---|---|---|---|
| ★ **`baseSpeed`** | **0.03838** | ★★ **66.5%** | 231/234 |
| ★ **`trajectoryMult`** | **0.02208** | ★★ **38.3%** | 231/234 |
| `brake` (avoidance) | 0.00727 | +12.6% | 102/234 |
| ★ `boost` (drafting) | ★ **−0.01004** | ★ **−17.4%** | 146/234 |
| `rowEnvMult` | 0.00001 | 0.0% | 9/234 |
| `areaBonusMult` | **0.00000** | 0.0% | **0/234** |
| `governorMult` | **0.00000** | 0.0% | **0/234** |

★★ **Two of the seven are identically inert in this window, and both for a stated reason.**
`areaBonusMult` is driven to 1.0 for every racer at the chaos boundary and stays there
(`racePlanner.js`, the `_choreoEnabled` block), and the window starts at 0.60. `governorMult` is the
PULK lead-rotation's channel and is **1.0000 on the leader at both the baseline and the growing
frames**. **The plan does not steer speed through the governor here.**

★★★ **`trajectoryMult` IS the plan's channel, and the brake's.** `_setTarget` (`racePlanner.js:736`)
writes `trajectoryMultTarget` and nothing else; the gap brake's command returns through the same
setter (`racePlanner.js:963`). So the 38.3% above **is** the race plan — and `baseSpeed`'s 66.5% is
his own drawn speed, with the caveat that the plan biases the **re-roll** that produces it
(`computePulkBiasedTarget` / `computeGapBiasedTarget`, `raceCore.js:631-655`). **It is not a clean
"plan versus his own legs" split, and it is not reported as one.**

★ **Drafting is the only factor working AGAINST the gap** — the racer behind gets the slipstream the
leader by definition cannot, worth −17.4% of the leader's advantage. It is not enough.

### ★★ What each of the two changed about HIMSELF

Mean log change from his own baseline to the growing frames:

| factor | the leader | the racer behind |
|---|---|---|
| `baseSpeed` | +0.01130 | ★ **−0.01491** |
| `trajectoryMult` | ★ **−0.06142** | ★ **−0.04312** |
| `brake` (avoidance) | +0.02992 | +0.02329 |
| `boost` (drafting) | −0.00636 | +0.00212 |

★★ **The plan is braking the LEADER HARDER than the racer behind him** — −0.061 against −0.043 — and
the gap grows anyway. The reason is the starting point: **at the baseline the leader's
`trajectoryMult` was already 0.0404 above the one behind's, and by the growing frames that has closed
to 0.0221.** The plan's steering advantage is **largest before the gap opens** and is being actively
reduced while it grows.

★ **`baseSpeed` moves the other way**: the leader minus the one behind goes **0.0122 → 0.0384**. The
racer behind's own drawn speed **falls** (−0.0149) while the leader's rises slightly. That is the
re-roll, and it is the single largest contributor to the whole picture.

★ **Both get a lighter avoidance brake as the field spreads** (+0.030 and +0.023) — clear air, not a
decision.

### By category, the same table separates cleanly

| category | `baseSpeed` | `trajectoryMult` | `brake` | `boost` | total |
|---|---|---|---|---|---|
| never closed (88) | 0.0465 | 0.0275 | 0.0047 | −0.0119 | 0.0667 |
| field decelerates (78) | 0.0351 | ★ **0.0587** | 0.0009 | −0.0112 | 0.0835 |
| leader accelerates (30) | ★ **0.0508** | 0.0338 | 0.0110 | −0.0062 | 0.0895 |
| unattributed (38) | 0.0166 | ★ **−0.0750** | 0.0235 | −0.0065 | −0.0414 |

★ **"The field decelerates" is a `trajectoryMult` story** — the plan pulling the racer behind down,
his own self-log at **−0.0999**, more than twice the leader's. ★ **"The leader accelerates" is a
`baseSpeed` story** — his own self-log at **+0.0569**, the only category where the leader's own drawn
speed rises materially. **The two named categories have different mechanisms, and the split finds
them.**

---

## 6 · ★★ HOW MUCH IS THE PLAN STEERING HIM THERE

| | of 234 |
|---|---|
| the leader's **DRAWN** rank is **1** | **101 (43.2%)** |
| the leader's **DRAWN** rank is **≤ 5** | ★★ **226 (96.6%)** |
| the racer behind's drawn rank is ≤ 5 | 181 (77.4%) |
| ★ the leader's drawn rank is **better than** the one behind's | ★ **167 (71.4%)** |
| his **live** rank on the growing frames | median **1.000**, mean **0.921** of frames leading |

★★ **The racer who holds the breakaway is almost always a racer the plan drew into the front group**
— 96.6% — and in 71% of races the plan drew him **ahead of** the man he is pulling away from. **The
steering is upstream of the frames, in the draw, more than it is in the frames themselves.**

**Roles at the peak** (`getHeroRoles()`, read after the race):

| | leader | the racer behind |
|---|---|---|
| no role at all | **109** | **133** |
| `comebacker` | 75 | 46 |
| `sovereign-lead` | 36 | 12 |
| `pursuer` (the renamed fall-back cast) | **8** | **24** |
| `attacker-b2` | 6 | 18 |
| `faller` | 0 | 1 |

★ **The breakaway's holder is an uncast racer in 109 of 234 races** — the plan's hero cast is not
where the gap comes from. ★ **And the `pursuer` sits BEHIND the gap three times as often as he holds
it** (24 against 8), which is exactly the picture PRESTAGING-WHY-1 measured when the name was chosen:
**a front-group pursuer, a median of one place behind the racer holding the gap.** Independent
agreement, from a different measurement.

---

## 7 · ★★ WHAT WAS ACTING AT THOSE FRAMES — INCLUDING THE BRAKE

The 56 px threshold is **the brake's own allowance**, so the brake's firing state at those frames is
part of the answer and not a neutral marker.

| | |
|---|---|
| breakaway races in which the brake **fired at all** | **240 of 242** |
| ★ share of growing frames with the brake **ENGAGED** | ★ **median 0.996, mean 0.896** |
| races engaged on **every** growing frame | **100 of 234** |
| races engaged on **none** | **1** |
| ★★ share of growing frames where the brake's command was the one **OBEYED** on the leader (`bindingIdx`) | ★★ **median 0.173, mean 0.229** |
| mean brake **strength** on growing frames | **0.0279**, against its ceiling of 0.13 |
| median hardest multiplier commanded in a breakaway race | **0.9195** |

★★★ **The brake is engaged on nine growing frames in ten and is the binding command on barely two in
ten.** On the other eight the **servo was already asking for less than the brake was** — the fold
takes the slower of the two. **The gap grows while the brake is on, at about a fifth of the authority
it is allowed, and mostly it is not even the thing holding the leader back.**

By category the picture is consistent rather than selective:

| category | engaged | binding on the leader | mean strength |
|---|---|---|---|
| never closed | 0.938 | 0.250 | 0.0310 |
| field decelerates | 0.889 | 0.234 | 0.0289 |
| ★ leader accelerates | ★ **0.744** | 0.211 | 0.0263 |
| unattributed | 0.932 | 0.182 | 0.0199 |

★ **The one category where the leader genuinely accelerates is also the one where the brake is
engaged least** — 0.744 against 0.938 — which is the expected direction and a small piece of evidence
that the brake's gate is reading what it is meant to read.

### The addresses, in the order they act in one step

| what | address |
|---|---|
| the plan's per-step target, including the brake's | `client/src/modules/racePlanner.js:736` (`_setTarget`) |
| the gap brake's law — gate, smoothing, authority | `client/src/modules/racePlanner.js:880-963` |
| the brake's own counters read here | `client/src/modules/racePlanner.js:1864` (`getGapBrakeStats`) |
| the controller pass that writes the target, then the `trajectoryMult` ease it moves through | `client/src/modules/raceCore.js:585-598` |
| the `baseSpeed` re-roll and its plan bias | `client/src/modules/raceCore.js:626-671` |
| the seven-factor advance | `client/src/modules/raceStep.js:115-133` |
| the eighth term, the hard-separation push | `client/src/modules/raceBehavior.js:1414-1415` |

---

## 8 · THE GAP ITSELF, FOR THE RECORD

| | world px | canvas widths at 225 px |
|---|---|---|
| in-window max, all 300 races — median | **81.4** | 0.362 |
| in-window max, all 300 races — p90 | **124.1** | 0.552 |
| peak of a breakaway race — median | **96.8** | 0.430 |
| peak of a breakaway race — p90 | **127.7** | 0.568 |
| ★ peak of a breakaway race — **max** | ★ **187.5** (luger-hill) | ★ **0.834** |
| growth within an episode — median | **41.9** | 0.186 |
| episode start / peak, in race progress | median **0.710** → **0.784** | |

★★ **187.5 px is the worst lead the gap brake's own mint recorded on the shipped path, and
COMEBACK-RERACE-1's separately written harness returned it again.** This one lands on
**187.54 px — luger-hill, seed 24** — a THIRD harness, written independently of both, agreeing to the
digit. The fixture is shared, so this is agreement about the METHOD and not about the sample; it is
the reason to trust the rest of the table.

---

## WHAT THIS DOES NOT SETTLE

- **One world.** Everything here is the `wild` stage. The shape may differ at `quiet`.
- **The baseline rule is a judgement**, stated in §3 and in the harness. A different "before the gap
  opened" would move the split between "never closed" and the other two, though not the size of
  the leader's term — he is slower than his own baseline in 150 of the 234 races.
- **38 races are unattributed and 8 have no baseline.** They are counted, not explained.
- **`baseSpeed` is not purely "his own speed"** — the plan biases the re-roll. Separating the drawn
  component from the biased one is a different measurement.
- **No camera was run** for the decomposition and none was needed; the physics never reads one.

---

# ★★ PART TWO — THE HANDOVER: WHERE TO LOOK AT THE RENAME

The rest of this report is not about the breakaway. It is the branch handover the chain asked for:
**two Quick-Test seeds where a comeback shot used to fire on the renamed racer and no longer does,
and one staged-comebacker control that must be unchanged.**

## The measurement behind the three seeds

Both arms were run from **unmodified checkouts** — master `fe12fa95` in a detached worktree, the
branch `d7ff2db9` in the real tree — over the **same 300-race fixture** as Part One, with the camera
running and the plan delivered the way the product delivers it. A `COMEBACK_ZOOM` shot's subject is
`cd.comebackLockedRacerIndex` (`CameraDirector.js:5491`). The fall-back cast is identified from the
plan itself: on master he is a `comebacker` who is neither **held** nor the **drawn winner**; on the
branch he is a `pursuer`.

| | master `fe12fa95` | branch `d7ff2db9` |
|---|---|---|
| `COMEBACK_ZOOM` shots, 300 races | **246** | **239** |
| ★★ of those, **on the renamed racer** | ★ **30** | ★★ **1** |
| races where such a shot **disappears** | — | ★ **29** |

★ **The one survivor is `luger-hill` seed 19**, which is exactly the single case
`PURSUER-RENAME-1`'s own commit message named — **found again here by a separately written probe, on
a different fixture size, without being looked for.** On master the shot is on **#39 Gale**; on the
branch it is on **#17 Surge**, also a `pursuer`, admitted through `_b1` rather than through the cast,
which is the route that commit message describes and deliberately did not close.

## ★★ THE TWO SEEDS TO LOOK AT

**Quick Test, 40 racers, the default roster, each track's own racer, 60 s, action stage `wild`.**
The browser derives the camera seed from the race seed, so typing the seed is the whole setup.

| | track | seed | on MASTER | ★ on THIS BRANCH |
|---|---|---|---|---|
| **1** | **city-circuit** | **10** | one comeback shot, on **#15 `Ridge`**, at progress **0.675** | ★ **no comeback shot at all** |
| **2** | **seatrack** | **27** | one comeback shot, on **#14 `Apex`**, at progress **0.615** | ★ **no comeback shot at all** |

★ **Both are the clean case**: master takes exactly one comeback shot in the race and it is on the
renamed racer, so on this branch the shot is simply not there. Nothing else replaces it.

## ★ THE CONTROL — a staged comebacker, and it must NOT move

| | track | seed | master | branch |
|---|---|---|---|---|
| **3** | **city-circuit** | **3** | one comeback shot on **#38 `Breeze`**, a **HELD** (staged) comebacker, at progress **0.645** | ★ **identical — same racer, same progress** |

★★ **If seed 3 looks different, the change is not the one it claims to be.** It is on the same track
as seed 1, so the two can be watched back to back. **169 of the 300 races carry a shot on a held
comebacker that is identical on both arms**; this is one of them, picked because its track pairs with
seed 1.

## ★ The services, and what answers what

| service | port | what it is |
|---|---|---|
| the API | **4000** | `server/` — the real backend, his data, his session |
| the dev server | **5173** | `cd client && npm run dev` — hot reload |
| ★ the production preview | **4173** | `node scripts/serve-production.mjs` — **a static file server. It answers NO API call**, and its SPA fallback returns 200 with the app's HTML for every unknown path, `/api/health` included (VERIFY-RULES R10) |

**The judgement is taken on 4173**, and 4000 must be up beside it or the page loads and nothing works.

### ★ What they were serving when this was written

| | |
|---|---|
| the API's own `/api/health` | `{"commit":"c4bf5a75","branch":"feat/pursuer-rename","dirty":false}` |
| the dev server's build badge (5173) | `c4bf5a75 · feat/pursuer-rename · clean` |
| ★ the **production** bundle on 4173 | **`assets/index-ojTzkqPx.js`** (with `assets/index-ucWHj0Wl.css`), read off the served page |
| the commit stamped INSIDE that bundle | ★ **`c4bf5a75` / `feat/pursuer-rename`**, verified by searching the built file — not taken from the build log |
| `audit-bundle-address` on `client/dist` | **3 files, no deployment address** — the build carries no host, as RUNTIME-API-URL-1 requires |

★ **The dev server had to be restarted, and it had been lying.** The one that was running reported
`build unknown` with `git rev-parse --short HEAD: exit 3221225794` — the 0xC0000142 failure — so its
badge named no commit at all. A file save does not clear it; the PROCESS has to go. It was restarted
and now reports the commit above. **Any eye test taken on 5173 before this restart was taken on a
build whose identity the badge could not state.**

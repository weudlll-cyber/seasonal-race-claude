# MORNING SHEET — 2026-09-19

## ★ TONIGHT'S CHAIN — `night/2026-09-18`, LIVE STATUS

Branched from **master `5b60b615`**. Nothing merged, nothing minted, no shipped default changed.
V1 (`servoNoiseBlindEnabled`) is off in every arm.

| piece | state | one line |
|---|---|---|
| **1 · settle the fairness verdict** | ★ **RUNNING** | Two further fixed seeds, **777** and **31337**, both arms, full pinned N. 8 workers of 14. ~3 h 45 m. |
| **2 · re-race the comebacker branch** | ★ **DONE — nothing merged, tagged or deleted** | → [COMEBACK-RERACE-1](../reports/night/COMEBACK-RERACE-1.md) — **it still costs breakaways** |
| **3 · show the doc changes** | **DONE** | → [DOC-DIFF-1](../reports/night/DOC-DIFF-1.md) — and **none of it was on master** |
| **4 · the D25 sign error** | **DONE — nothing changed in either document** | → [D25-SIGN-1](../reports/night/D25-SIGN-1.md) |
| **5 · the four verify-time points** | **DONE — two were already done, two I hand back** | → [VERIFY-POINTS-1](../reports/night/VERIFY-POINTS-1.md) |
| **6 · the six blind instruments** | open | not started |

---

### ★ PIECE 5 — TWO OF THE FOUR WERE ALREADY DONE; TWO I COULD NOT ACT ON

→ [VERIFY-POINTS-1](../reports/night/VERIFY-POINTS-1.md) · **Nothing was built, and nothing needed
to be.**

| point | verdict |
|---|---|
| **1 · the client build inside the check run** | ★ **DONE, on master** as `cae917c8`. Before: **nothing built the client** — zero matches for `vite build` or `npm run build` in `verify` or `ci.yml`. Now `verify` builds it and audits the bundle as step 2 of the same guard. ★ **It no longer covers nothing — this point ADDED coverage.** |
| **2 · separating the unit-suite environment** | ★ **DONE, on master** as `dd963859`. **232 s → 172 s**, 70 files of 261 carrying the opt-out at the tree tonight. Cost: those 70 no longer get a browser. |
| **3 · replacing the nine warm-up races** | ★ **I could not identify what this names.** The searches are listed in the report. The only warm-up in the tree is `phys-bench.mjs:70` — **300 physics STEPS, not nine races.** |
| **4 · the production arm for the check setup** | ★ **Two plausible readings, different work.** I did not pick one: acting on a guess changes what a gate covers. |

★★ **The brief's numbers for point 2 are the PROPOSAL'S, not what shipped.** It says *"137 files with
no browser, 176 → 86 s, one failed"*; what landed is **69 files and 232 → 172 s**. The larger set was
the candidate list — membership was then established **per file in two passes that both had to
agree**, the second requiring the **identical count of passing AND skipped** tests in both
environments, *"because a file going green because a global quietly vanished is worse than a slow
one"*. **Quoting the proposal's figures would overstate both the saving and the exposure.**

★ **The default did not move**: `environment: 'jsdom'` is still the default, so a file gets a browser
unless it has opted out by a deliberate line — a new test file is safe by construction.

**Both open points need one sentence from you**, and each is short work once named.

---

---

### ★★★ PIECE 2 — THE COMEBACKER BRANCH STILL COSTS BREAKAWAYS ON BRAKED MASTER

→ [COMEBACK-RERACE-1](../reports/night/COMEBACK-RERACE-1.md) · **Nothing merged, tagged or deleted.**
Master was merged into a **probe copy**; that merge was never pushed.

**Ten tracks, seeds 1–30, 300 races per arm, 40 racers, your roster, `wild`, shipped defaults with the
brake ON. No config override, and ★ no instrumentation in either tree** — the cast split is read from
the race plan's own accessors, so both arms ran from unmodified checkouts.

★ **The control reproduces the ship's own numbers to the digit** — 8 of 300 races over 124 px and a
worst lead of 187.5 px are exactly what the brake's mint recorded. That is how we know the harness is
honest before reading the branch column.

| | MASTER | BRANCH |
|---|---|---|
| comebackers per race | 1.72 | **1.32** |
|  from the drawn-winner site (**kept**) | 0.61 | 0.61 |
|  from the staged path (**kept**) | 0.70 | 0.72 |
|  ★ from the **removed** path | **0.41** | **0.00** |
| races with **no comebacker at all** | 13 (4.3%) | ★ **30 (10.0%)** |
| largest lead 0.6→line — median | 86.5 px | 88.3 px |
|  p90 | 127.7 px | **133.0 px** |
|  max | 187.5 px | **197.6 px** |
| ★ races with a **>124 px gap after 0.95** | **8 (2.7%)** | ★ **15 (5.0%)** |
| contested finishes | 125 | 124 |
| byte-identical races | — | **176 of 300 (58.7%)** |
| winner changes | — | **81 of 300 (27.0%)** |

★★ **THE ANSWER, PLAINLY: the reason it was not landed still holds.** Escapes nearly double and the
worst lead grows, by the brake's own signature running backwards — median untouched, tail up.

★★ **And the brake is not absorbing it.** It **fires 6% MORE often on the branch arm** (160,864 →
170,881 frames on the same window) and the tail still grows. It reaches its authority ceiling against
a bigger problem rather than cancelling it — consistent with what was already known: the brake never
reduced the escape *rate*, it cut the worst cases, so **more worst cases is the one thing it is least
able to offset.**

★ **In fairness to the branch, the brake IS doing real work against it.** Its own fixture showed the
worst lead growing by **107 px**; re-raced on braked master over ten tracks it grows by **10.1**. The
cost is far smaller than the branch's own numbers suggested — **it is just not zero, and not negative.**

**What the branch BUYS is not in this table**, and this report does not weigh it: it removes a casting
path you decided should go, and its `DEAD-ENDS.md` section S carries the correction to the three
figures that decision was taken on. **This supplies the cost, measured on the tree as it stands.**

---

---

### ★★★ PIECE 4 — THE DECISION SURVIVES; THE REASON IT READS AS COMFORTABLE DOES NOT

→ [D25-SIGN-1](../reports/night/D25-SIGN-1.md) · **I changed nothing in `BACKLOG.md` or
`FAIRNESS.md`. The correction is a proposal in the report.**

**The sentence** (`BACKLOG.md:2421`, restated at `FAIRNESS.md:156`): *"luger-hill IS THE SINGLE
EXCEPTION, AND ITS SIGN IS THE OPPOSITE OF THE WORRY … the **front** rows are slightly favoured, not
the back. Anyone reopening this on the assumption that the rear rows are advantaged should read that
sentence first."*

**The four sources, all pointing the other way:**

| source | address | what it says |
|---|---|---|
| the table D25 derives it from | `ROW-BONUS-TIMING-1.md:117` | luger-hill first row **58.211 s**, last row **57.924 s** — the rear finishes **sooner** |
| the other report D25 cites | `ROW-ADVANTAGE-1.md:24` | *"THE ADVANTAGE RUNS BACKWARDS. The BACK rows are the favoured ones"* |
| last night's measurement | `LUGER-BIAS-1.md:34` | front **13.0%**, back **25.0%**, even share 20.0% |
| the gate | `PINNED-GATE-1.md:230` | rows rise to the rear, **17.7 → 22.7%** |

Row 0 is the front row and **the one that gets no bonus**. A rear row that makes up its whole deficit
and still finishes sooner was given **more** than it lost — over-compensation, rear favoured.

### ★★ WHAT IT DOES TO D25 — AND THE ANSWER IS NOT "REVERSE IT"

**Your verdict was ACCEPTABLE, and that is a judgement about SIZE. No magnitude moves**: the deviation
is still 0.49% of a 58 s race, the worst start row still reaches its band far above the floor, the
front row's win share was always the one below par. **So the decision stands.**

**Three things in its reasoning change:**

1. ★ **"Flat on nine, one harmless exception" becomes "all ten lean the same way."** The same table
   says *"all ten differences are positive"* — which, read correctly, is a consistent hair of **rear**
   advantage across every track, not of under-compensation.
2. ★ **It stops disagreeing with the other report.** `ROW-ADVANTAGE-1` found *"all 10 tracks lean the
   same way"* by a different measure. D25 records the two as pointing opposite ways; corrected, **two
   independent measures over ten tracks agree.**
3. ★★ **The open question you parked gets harder, not easier.** D25 left the tilt unresolved because
   it appeared *"only in the one measure conditioned on band arrival"*. On luger-hill **both
   unconditioned measures now agree with it** — mean finishing rank (4.32 places) and mean finishing
   time (0.287 s). **A selection effect does not produce agreeing signals in two unconditioned
   measures.**

★ **So: re-affirm it on the magnitude, which holds — not on the sign, which does not.** The proposed
fix is two **appended, dated** lines (never an edit of your sentences); the exact wording is in the
report.

---

---

### ★★ PIECE 3 — THE CORRECTIONS EXIST TWICE AND ON MASTER NOT AT ALL

→ [DOC-DIFF-1](../reports/night/DOC-DIFF-1.md)

**The 17.9. pass wrote all of it. Neither commit is on master.** `fc4d4143` and `e29b428d` are
contained in `origin/night/2026-09-17` and nowhere else — checked per commit. ★ **So every one of the
named items was STILL WRONG on master tonight**, which is the answer to "re-check them": there was
nothing to re-check, only the same errors in the same places.

**I cherry-picked the two commits onto tonight's branch** rather than retyping corrections that were
already written and already proven inert — the option that changes less. **They are now on two
branches and still not on master.**

**The six statements, each with the evidence that made it wrong:**

| # | address | was | why wrong |
|---|---|---|---|
| 1 | `FORCE-MAP.md:459` | `OUTCOME 0.55–0.95` | **the upper bound is `corridorEnd`, and it is not 0.95** — `racePlanner.js:87` |
| 2 | `FORCE-MAP.md:465` | `PULK [0.15,0.5)` | **the upper bound is `choreoOutcomeStart`, and it is not 0.5** — `defaults.js:1070`; `:1125` says *"`pulkEnd` IS `choreoOutcomeStart`"* |
| 3 | `racePlanner.js:1594` | `SIM-ONLY … the browser never sets it` | `defaults.js` ships `gapRerollEnabled: true`; ★ **its own sibling at `:389-390` already said so** |
| 4 | `raceCore.js:372` | `PulkLeadRotation — default OFF` | **the next line is `pulkLeadRotationOn = racePlanEnabled`** (`:376`); `defaults.js:1017` heads it **SHIPPED ON** |
| 5 | `raceCore.js:598` | `(default OFF → skipped)` | same — **"skipped" described the opposite of the shipped build** |
| 6 | `check-runin-frame.mjs:161` | `until \`feat/finish-framed\` lands` | **that branch is not at origin**; it survives only as tag `archive/finish-framed`, and `finishLineFraming` is 0 times in `defaults.js` |

★ **A seventh change was CODE, and the summary did not say so.** `raceCore.js:700` — the diagnostic
`vt` omitted `governorMult` while `raceStep.js:131` multiplies by it and `:106` documents the chain
including it. **Proven inert at tonight's tree, not assumed from last night**: all four fingerprints
re-measured against the engine and **all four match the record, nothing written.**

★ **Two completeness gaps, which for a file claiming completeness are factual errors**: FORCE-MAP had
**no row for the gap brake** (now A14) and DEVSCREEN-INVENTORY omitted **five rendered controls**
while stating that every control appears in it.

★ **Two corrections to the brief itself.** Its addresses (`racePlanner.js:1235`, `raceCore.js:578`,
`:679-683`) are **stale** — the statements now sit at `:1594`, `:598` and `:700-704`. And FORCE-MAP's
**"four stale windows" is two** (A7 and A13) plus one missing row; I re-read the additive table and
found no others. **I am not going to invent a correction to reach a count.**

**★ NEEDS YOUR WORD:** master carries none of this. Two branches now hold the same corrections.

---


## ★★★ IT IS ON MASTER

The gap leader brake ships ON at your four values. **Merged, minted, tagged, branch deleted, CI
green.**

| | |
|---|---|
| merge commit | **`be7e6872`** — `--no-ff`, 72 commits |
| master head | `40f4b8f1` |
| archive tag | **`archive/gap-leader-brake-2026-09-17`**, pushed, registered in `docs/TAGS.md` |
| branch at origin | **deleted** — `git ls-remote` shows only `master`, `feat/remove-prestaging-comebacker`, `night/2026-09-14-history` |
| CI for the merge | **SUCCESS, 3m11s** — all three jobs (Server tests, Living-doc guards + script tests, Client checks) |
| `verify` on merged master | **26 PASS / 0 FAIL** |
| fingerprints | **all four minted and re-verified against the engine** |
| golden races | **not re-recorded, and they did not move** |

The values themselves are in `client/src/modules/storage/defaults.js`; this sheet points at them
rather than copying them.

---

## THE FAIRNESS RUN THAT GATED IT

→ [BRAKE-FAIRNESS-2](../reports/night/BRAKE-FAIRNESS-2.md)

Your own instrument, unmodified, at **two fixed seeds** — which matters, because its default seed is
`Math.random()` and every earlier verdict was one draw.

| seed | brake OFF | **new defaults** | blocks? |
|---|---|---|---|
| 12345 | 1 Holm-flagged: luger-hill 30 s | 1 Holm-flagged: **the same row** | **no — pre-existing** |
| 777 | 0 flagged (2 raw) | **0 flagged, 0 raw** | **no** |

**No row fails on the new defaults alone, at either seed.** The one flagged row is the luger-hill
rear bias you already have with the brake off: average rank agrees to within 0.05 on every start row
between the arms, and exactly **one race** moves. Band reach is the same on both arms to within half
a point.

**The brake was actually exercised**: 63,579 commands on 544,477 calls inside the fairness run.

★ **One honest limit: that run is SHORT of the pinned N.** It ran 120 races per track against the
pinned 300. The pinned N projected to about nine hours — measured, not guessed. Both arms ran at the
same N and the same seed, so the comparison that the decision rule needs is like for like; what is
lost is power, not validity. **It should not be quoted as the pinned gate.**

---

## THE BUILD, ON MASTER

**4173 production · 5173 dev · 4000 API.**

```
/api/health  {"build":{"commit":"40f4b8f1","branch":"master","dirty":false}}
```

Bundle read off the served page: **`dist/assets/index-BNLl7vvS.js`** (927.65 kB, gzip 277.03). All
five keys were read **out of that bundle** and match what `defaults.js` carries.

★ The dev server was stopped for several hours during the fairness run, at your suggestion — it
helped, throughput roughly doubled.

---

## WHAT IS STILL OPEN

- **Does V1 go in at all?** Still yours. It now has a switch and ships OFF; nothing in this line
  answered the question.
- **The luger-hill 30 s rear bias** fails your own fairness gate in the shipped game, at every seed I
  ran. Not caused by the brake, not chased.
- **Two branches left standing**, both carrying undecided product code: `feat/remove-prestaging-comebacker`
  and `night/2026-09-14-history` (which also needs one sentence from you about which `MORNING.md`
  survives).

---

## ★★★ YOUR FOUR VALUES ARE THE SHIPPED DEFAULTS

| key | change |
|---|---|
| gap brake | **off → ON** |
| allowed lead | **loosened to your value** (it was the wider one) |
| maximum authority | **raised to your value**, still under the engine's own braking limit |
| window end | **moved later, to your value** |
| the servo change (V1) | **off — unchanged, and it must stay off** |

The four numbers themselves live in `client/src/modules/storage/defaults.js` and in
[BRAKE-SHIP-1](../reports/night/BRAKE-SHIP-1.md), each with the evidence for it; this sheet points at
them rather than copying them.

→ [BRAKE-SHIP-1](../reports/night/BRAKE-SHIP-1.md)

**The shipped default reproduces the arm I measured for you, on 300 of 300 races byte-identically.**
That was the one thing that could have gone wrong — every earlier measurement drove the brake through
an override, and an override is not the same object as a default. It is here.

### What the race does now, measured with no override at all

| | before | **now** |
|---|---|---|
| largest lead (median / p90 / **worst**) | 87.9 / 162.0 / **244.4 px** | 86.3 / **127.7** / **187.5 px** |
| **races where a >124 px gap opens after 0.95** | **24/300** | **8/300** |
| contested finishes | 129/300 | 125/300 |
| winner changes | — | 57/300 |
| races completely unchanged | — | 141/300 |

The worst lead falls by **23%** — in your unit, **1.086 → 0.833 canvas widths**. The **median barely
moves**, which is the point: the brake works in the tail and leaves the ordinary race alone.

---

## THE BUILD, FOR YOUR EYE

**4173 production · 5173 dev · 4000 API**, all three restarted onto this commit.

```
/api/health  {"build":{"commit":"176d502b","branch":"feat/gap-leader-brake","dirty":false}}
```

Bundle **read off the served page**: `dist/assets/index-bGK8b6H1.js` (927.67 kB, gzip 277.04).

★ **And I read all five keys out of that bundle itself**, not out of the source — the master switch,
the allowance, the window end, the authority and the servo switch. **Every one matches what
`client/src/modules/storage/defaults.js` now carries** (the values live only there; this sheet does
not copy them, and `check-doc-facts` enforces that). **The build carries what it should.**

### ★ What to watch — three races where the brake decides the outcome

| track / quick-test seed | largest lead | winner |
|---|---|---|
| **seatrack, seed 2** | 207.1 → **107.8 px** | Phoenix → **Dash** |
| **dirt-oval, seed 7** | 242.9 → **153.9 px** | Turbo → **Gale** |
| **searound, seed 20** | 216.4 → **127.7 px** | Nitro → **Orbit** |

**And one control: city-circuit, seed 4.** The brake never engages there and the race is
byte-identical to the one you have always had — 60 of 300 races are like that.

### ★★ A correction to what you were told about ice-track seed 3

**It does NOT look unchanged.** On your own race the brake catches Flare: the largest lead goes
**196.6 → 115.8 px**, Flare finishes 2nd and **Bolt wins**. Watch it — it is a good demonstration.

What is unchanged on that race is **the window-end choice**: 0.95, 0.96, 0.97 and 0.98 are all
identical there, because the brake finishes its work at progress 0.9434, before any of them matter.
**So seed 3 shows you the brake, but it cannot tell you anything about 0.97 in particular.** The three
races above are the ones that can.

---

## THE CHECKS — THE REDS ARE EXPECTED, AND THERE ARE ONLY THREE

**`verify`: 22 PASS / 3 FAIL.** The three are the world, camera and render fingerprints, and they
fail because a race-changing default legitimately moved — **category (a), all of them. No (b).**
The client suite, the script suite and the golden races all pass.

**All four fingerprints moved and NOTHING WAS MINTED** — the values are in the report, the record in
`docs/fingerprints.json` is untouched, and the mint is yours to call.

★ **The golden races did not move and I did not re-record them.** That is by design, not luck: the
guard pins every input in its own fixture, so a change to `defaults.js` cannot reach them.

★ **Still owed before a merge:** a **seeded** fairness run at 56/13/0.97. FAIRNESS-SEED-1 showed the
instrument must be given a seed above zero or its start-row verdict is one draw; that run has not been
made for this configuration.

---

## ★★ THE AUTHORITY CEILING — YOUR RECOLLECTION IS CORRECT

You asked me to establish the engine's own maximum braking at the source before running anything,
and not to use your recollection or mine.

**The source says `minMult: 0.85`** — [racePlanner.js:103](../client/src/modules/racePlanner.js#L103),
in `DEFAULT_CONTROLLER_PARAMS`, which is the floor the outcome controller clamps every target to
([racePlanner.js:1423](../client/src/modules/racePlanner.js#L1423)). **So the engine's own maximum
braking is 1 − 0.85 = 15%, exactly as you remembered.** There is no discrepancy to report.

★ The grid therefore stops at 15% and **no value had to be dropped**. At 15% the brake would command
exactly `minMult`, so even the top row can never ask for a speed the steering could not already
produce — which is the argument already written at
[defaults.js:1186-1191](../client/src/modules/storage/defaults.js#L1186-L1191).

---

## STATE OF THE NIGHT

| piece | state |
|---|---|
| ceiling established | **DONE** — 15%, from the source |
| 1 — the two failure modes | **DONE** — defined and instrumented, see below |
| 2 — the grid (21 arms × 300 races) | **DONE** — 6,300 races |
| 3 — read the grid | **DONE**, pushed. → [BRAKE-GRID-1](../reports/night/BRAKE-GRID-1.md) |
| 4 — visibility | **DONE** — collected on every cell, not just the shortlist |
| 5 — the deep test (56 px / 13%) | **DONE** → [BRAKE-DEEP-1](../reports/night/BRAKE-DEEP-1.md). Fairness → [FAIRNESS-SEED-1](../reports/night/FAIRNESS-SEED-1.md) |
| 6 — a build for your eye | **SERVED** at 56 px / 13% — see below |

---

## ★ PIECE 1 — HOW I TURNED YOUR TWO SENTENCES INTO NUMBERS

**This scoring is my construction, not your criterion.** You gave two goals in words; everything
below is how this block measures them. **Every component is reported separately and never combined
into one score** — you decide from the columns.

### A — the escape ("a racer escapes and then wins without being challenged")
Measured as the **unopposed run-in**: find the **last lead change** of the race; after it nobody ever
took the lead again, so the leader through that stretch is the winner by construction. The race counts
as an escape if his gap in that stretch ever exceeded a reference.

★ The reference is **fixed at 90 px and 124 px for every cell**, not each cell's own allowance —
otherwise "escaped" would mean something different in every row and the rows could not be compared.

★ A first version asked for *no lead change after the gap first passed 90 px*. With about 38 lead
changes per race that is almost never true and it scored every race zero — it measured the wrong
thing rather than measuring nothing, which is worse. Corrected before any cell was run.

### B — the monotony ("not so much braking that even small gaps are closed")
Lead changes; distinct leaders; the share of the window the top leader holds; the field's spread as
the winner crosses; how many races end **contested** (second racer within one body length at the
line); and what the brake actually does — the share of in-window frames it is obeyed on, and how much
of its work lands on gaps **below 90 px** and **below 124 px**, which is braking a lead no viewer
would call a runaway.

**SHIPPED (brake off) is the reference for every one of these**, and it is an arm in every table.

---

## ★★★ THE ANSWER, AND IT IS NOT THE ONE ANYONE EXPECTED

**Recommended pair: 56 px / 13% — the one your own eye picked this morning.**

**What it buys:** the largest lead inside the brake's window falls **244.4 → 187.5 px (−23%)**, p90
**159.3 → 123.6 px**.
**What it costs:** nothing measurable — lead changes, distinct leaders, field spread, margin at the
line and both abruptness numbers are all unmoved.
**★ What it does NOT do, and no setting does:** it does not reduce the races won unopposed.

### The finding

I ran all twenty settings — 5 allowances × 4 authorities, **300 paired races each, 6,300 in total**.
The grid is paired, so I could test what each cell actually *changed* race by race rather than
comparing totals.

> **Not one of the twenty cells is distinguishable from SHIPPED on the escape count. Every p ≥ 0.077.**

And the brake **causes** escapes as well as fixing them — up to 8 races per cell that shipped did not
have, because slowing the leader reshuffles who leads and sometimes the racer who inherits it escapes
instead.

### ★★ Why — and this is the thing worth your attention

| | max lead **to the window end** | max lead **to the finish** |
|---|---|---|
| SHIPPED | 244.4 px | 279.6 px |
| 56 px / 13% | **187.5** (−23%) | **275.4** (−1.5%) |
| 40 px / 13% | **170.2** (−30%) | **284.3** (**+1.7%**) |

**The brake compresses the lead it can see, and the lead re-opens after it lets go.** The maximum to
the finish is *unchanged at 279.6 px on 13 of the 20 cells*, and the harder the brake works the larger
the gap between the two numbers becomes (35 px shipped → 114 px at 40 px / 13%).

**61.3% of your races already have their biggest lead after that boundary. With the brake on, 69–73%.**

**The runaway is completed after the brake's window end** (`gapBrakeWindowEnd`, whose value lives in
`client/src/modules/storage/defaults.js`). That is your value and I did not search
it — but it is the only lever in sight that could reach this, and every other lever in the grid has
now been shown not to.

### Two things the tables say that I want to say in words

- **No cell makes races monotonous.** Lead changes (40) and distinct leaders (37) are identical on
  every cell including shipped; the leader's hold actually *falls* with braking. On the numbers, your
  second worry does not materialise anywhere in the grid.
- **But at 40 px the brake commands in 289 of 300 races with 100% of its work on gaps below 90 px.**
  That is "so much braking that even small gaps are closed" in your own words — and my monotony
  metrics do not catch it. **A setting can breach your intent without my numbers noticing, and that is
  the case here**, which is why I am not recommending 40 px even though it has the best point estimate.

### Why 56 and not 40
40 px / 13% has the better point estimate (+8 races against +6) but the two are indistinguishable
from each other and from shipped, and your rule for that case is to prefer the one that brakes less.
56 px commands in 238 races against 289 and puts 54% of its work below 90 px against 100%.
**40 px / 15% is excluded outright**: it is the only cell in the grid that exceeds the shipped maximum
single-step move (1.039×).

---

## ★★★ I HAVE TO RETRACT SOMETHING I WROTE EARLIER TONIGHT — AND THE REASON MATTERS MORE

Earlier in this sheet I told you 56 px / 13% **fails your fairness gate** on one Holm-flagged row.
**That is withdrawn.** Before reporting it I ran a shipped control on the same track, and the control
did not behave the way a deterministic instrument must.

**`scripts/sim-fairness.mjs` has been running UNSEEDED.** It defaults to `--seed=0`, which its own
header defines as `Math.random()`, "exploration only", and which it **prints on every single run**:

```
Seed                   : 0 (Math.random, Exploration)
```

I never read that line. Three runs of the **shipped** configuration, same track, nothing changed
between them:

| run | 30 s | 60 s | 120 s |
|---|---|---|---|
| 1 | p = 0.00237 | p = 0.355 | p = 0.151 |
| 2 | p = 0.00227 | p = 0.049 | p = 0.421 |
| 3 | **p = 0.00013** | p = 0.276 | **p = 0.00002** |

**Run 3 of your shipped game produces TWO Holm-flagged rows. Runs 1 and 2 produce none.** So the
shipped game both passes and fails the gate depending on the run, and the row I found on the brake is
inside that spread.

**Two runs at `--seed=12345` are bit-identical in every field**, so the fix is one flag.

★★ **This reaches back past tonight.** Last night's "fairness is FAIR on both arms, 0 Holm-flagged of
30" was also unseeded — **one draw, not a property.** A correction now sits at the top of that report.
Band reach was stable across repeats and survives; the start-row chi-squared is the fragile number.

### ★★ And with a seed, the comparison finally works — and clears the brake

Both arms, ten tracks, fixed seed, **1,200 races each** (short of the pinned N, and labelled so):

| | band reach | **Holm-flagged rows** | the flagged row |
|---|---|---|---|
| SHIPPED | 89.2% | **1 of 30** | luger-hill 30 s |
| **56 px / 13%** | 88.9% | **1 of 30** | **luger-hill 30 s — the same one** |

**Both arms flag exactly one row, and it is the same row. The brake causes no fairness failure.**

★ **A separate thing you should know**: **your shipped game fails its own fairness gate on
luger-hill 30 s** — a rear bias, back rows winning too often, front row too seldom, in every run I
made of that combination. It is not caused by the brake and I did not chase it.

→ [FAIRNESS-SEED-1](../reports/night/FAIRNESS-SEED-1.md)

---

## ★★ THE DEEP TEST: TEN TIMES THE SAMPLE CHANGED THE ANSWER

**N = 3,000 paired races per arm.** → [BRAKE-DEEP-1](../reports/night/BRAKE-DEEP-1.md)

★ **The control passed first**: the grid's own seeds, re-run inside the big set, came back
**300/300 byte-identical**. The measuring track did not move, so the grid stands.

| | SHIPPED | **56 px / 13%** |
|---|---|---|
| races won after an unopposed run-in | 317 / 3000 | 313 / 3000 |
| fixed / **caused** | — | 43 / **39** |
| net | — | **+4**, McNemar **p = 0.74** |
| largest lead to the window end, MAX | 492.7 px | **258.5 px (−48%)** |
| largest lead to the finish, MAX | 492.7 px | **306.2 px (−38%)** |
| both abruptness measures | — | **1.000×, identical to six decimals** |

★★★ **At ten times the sample the escape effect vanishes** — +6 at p = 0.146 on 300 races becomes
**+4 at p = 0.74** on 3,000. **The bigger sample removed the effect rather than confirming it.**
★★ **But the worst lead nearly halves**, and at this N the lead to the finish falls too — which the
300-race grid did not show. That figure must be quoted from the deep run, not the grid.

**So the honest summary of the whole night:** the brake does not stop the runaway winning. It does
make the worst races visibly tighter at the front, for no measurable cost. Whether that is worth
switching on is your call, and the build below is there for it.

---

## ★ YOUR OWN RACE — ice-track, Quick Test seed 3

| | SHIPPED (brake off) | **56 px / 13%** |
|---|---|---|
| largest lead, to the window end | 196.6 px | **115.8 px** |
| largest lead, to the finish | 213.1 px | **115.8 px** |
| winner | **Flare** | **Bolt** |
| where Flare finishes | 1st | **2nd — caught** |
| margin to 2nd | 0.256 s | 0.528 s |

**The brake engaged once**, at progress 0.8161, on Flare, at a gap of **90.1 px**; it was the obeyed
value for **9.94 s (621 frames)** and reached a deepest strength of **0.1259** of its 0.13 ceiling.

★★ **On this race it does exactly what you asked for**: Flare's escape is caught and the race is
decided at the line instead of behind him. ★ **But this is one race**, and the grid above says it does
not happen reliably — that is the whole tension in tonight's result. ★ **The winner changes**, which
you should expect on any race the brake touches.

---

## PIECE 6 — THE BUILD, SERVING 56 px / 13%

**4173 production · 5173 dev · 4000 API.** The client bundle actually served, read off the page:
**`dist/assets/index-ogeemqcl.js`** (927.39 kB, gzip 276.92).

```
/api/health  {"build":{"commit":"a90bcfc4","branch":"feat/gap-leader-brake","dirty":false}}
```

★★ **HOW THIS BUILD CARRIES THE VALUES WITHOUT CHANGING A SHIPPED DEFAULT.** You told me never to
change a shipped default, and the brake's values live in `defaults.js`. So the client on 4173/5173 is
**built from a probe worktree** that carries the candidate pair, and **the repository's own defaults
are untouched** — `git status` on the branch is clean. The API badge above is the main tree's commit,
because the API serves data and not race config; the client bundle is the probe's.

**The two values this build carries: allowed lead 56 px, maximum authority 13%, window end unchanged,
and the brake switched ON.** V1 is OFF.

**If you want to compare against today's race**, the dev screen has both switches and both numbers:
untick **Gap leader brake enabled** to see the shipped race, or set the allowance and authority to
anything else and it persists in your browser. **Nothing has to be reverted and no build can be
lost** — there is no uncommitted source line anywhere in this.

### What to watch
1. **ice-track, Quick Test seed 3** — the table above. Flare is caught.
2. **The largest reduction** and **a control race the brake never touches** — named from the deep run
   below once it finishes.

---

## ★★ ADDED 2026-09-17 — HOW MANY RACES OPEN A REAL GAP AFTER 0.95

You asked how often a gap you would call too large actually opens after the window end — the grid
only said where the peak sits, which counts a 40 px peak the same as a 300 px one.
→ [LATE-GAP-1](../reports/night/LATE-GAP-1.md). N = 300 races per arm.

| | SHIPPED | 56 px / 13% |
|---|---|---|
| a gap **> 56 px** (your allowance) opens after 0.95 | **38.0%** of races | 35.3% |
| a gap **> 124 px** opens after 0.95 | **8.0%** (24 races) | **4.0% (12 races)** |
| of those, the leader of that gap **wins** | **24 of 24** | **12 of 12** |

★★★ **A late gap above 124 px is a guaranteed win — 36 of 36 across both arms, no exceptions — and
the brake halves how often it happens.** That is the clearest thing the brake does anywhere in this
week's work.

★★ **But the ordinary case is untouched**: at 56 px and 90 px the counts barely move, and **the leader
of a late gap wins 96–97% of the time in both arms.** The event you object to is common, and the
brake reaches only its largest instances. It is also **worse on four tracks of ten**, and produces
fewer contested finishes among these races (13.2% → 7.5%).

### ★ And the "late" gap is mostly not late

**Two thirds of these gaps (64%) are already above 56 px within 0.002 of the window end** — they are
gaps the brake was holding at 0.95 and released, not gaps that opened afterwards. Only a third open
genuinely later, at a median progress of 0.9786.

**What a later window end would REACH** (a lookup, not a sweep — I did not run the brake at any other
value): 0.96 → 70%, 0.97 → 75%, 0.98 → 83%, 0.99 → 93%. ★ **There is no knee in that curve**, so the
data singles out no value. The cheapest fact in it is that **0.952 would already cover 64%**.
★ Reach is not effect: this counts where the brake would still be *running*, not what it would close.
**The value is yours and I am not proposing one.**

---

## ★★ ADDED 2026-09-17 (2) — WHAT EACH WINDOW END ACTUALLY CLOSES

Reach was not effect, so I measured the effect. Five arms at your 56 px / 13%, V1 off, 300 races each.
→ [WINDOW-END-1](../reports/night/WINDOW-END-1.md). Noise floor **exactly zero**.

| | shipped | **0.95** (yours) | 0.96 | 0.97 | 0.98 |
|---|---|---|---|---|---|
| **races with a >124 px gap after 0.95** | 24/300 | **12** | 10 | **8** | **7** |
| contested finishes | 129/300 | 124 | 124 | **125** | **126** |
| brake still pulling at the line | 0/300 | **0** | **0** | **0** | **0** |
| both abruptness measures | — | **1.000×** | **1.000×** | **1.000×** | **1.000×** |

★★★ **Yes, a later end closes the races that matter.** Every >124 px late gap is a win for the racer
holding it, and the count falls from 24 (shipped) to 7 at 0.98 — a 71% reduction. **It is the only
column that moves**: gaps over 56 px stay flat at 106 in every braked arm.

★★ **And the finish does not pay for it.** I expected a later end to cost close finishes; it does the
opposite — braking at all costs 5, and extending the window gives 2 back. **The brake is never still
pulling when the winner crosses, at any value**, because the winner crosses at progress 1.0 and every
end has already released.

### ★ The real cost is a different one, and you should know it
**Full-authority releases inside the run-in rise from 115 to 141.** Today that is invisible — every
arm is 1.000× on both abruptness measures, because the shipped setter restarts the ease on a release.
**But those releases are exactly what becomes the 7.6× jump if V1 is ever switched on.** A later
window end makes the brake *more* dependent on V1 staying off, not less.

### On your own race
**ice-track seed 3 is identical at all four window ends** — the brake finishes its work at progress
0.9434, before any of them matter. Flare is caught in all four; Bolt wins.

★ **If the measurement points anywhere it points at 0.97**: 12 → 8 in the column that matters, one
contested finish *better* than 0.95 rather than worse, and 16 late releases against 0.98's 26.
**The value is yours.** ★ Two things against changing at all: **dirt-oval is worse with the brake at
every window end** (shipped has zero >124 px late gaps there, braked arms have two or three), and
0.95 is the incumbent.

---

## ★ WHAT I NOTICED AND DELIBERATELY LEFT ALONE

- **`gapBrakeWindowEnd`.** The grid says the runaway completes after it, and every other lever has now
  been shown not to reach. **It is your value and you did not ask me to search it**, so I did not.
- **The rear bias on luger-hill 30 s in the SHIPPED game.** Real, reproducible, and it fails your own
  gate. Not caused by the brake, and not this chain's business.
- **The unseeded default in `sim-fairness.mjs`.** I reported it and did not change it — it is a shipped
  instrument and the fix is a methodology decision, not a patch.
- **`report/brake-census-1` and the two branches left standing** from the night before: untouched, and
  `night/2026-09-14-history` still needs the one sentence from you about which `docs/MORNING.md`
  survives.

---

## CLEANUP — DONE, WITH ONE DELIBERATE EXCEPTION

Everything this chain created is gone **except `C:/tmp/win5613`, which is kept ON PURPOSE: the build
you are meant to judge is served from it.** Deleting it would kill the build — which is exactly how
you lost the last one.

★ It was checked with `dir /AL /S` before I relied on it: **0 junctions.** Its `node_modules` is a
real 328-package install of its own, not a link to yours, so it can be removed safely with `rm -rf`
whenever you are finished with the build. Your `node_modules` is intact (client 328, server 186).

The scratch output directories (`grid`, `deep`, `fair5`, `fairseed`) are deleted — about 6,300 + 6,000
+ 8,400 races' worth of JSON. **No test race and no data record was created, `server/data` is
untouched, and your store was never opened.** `git status` on the branch is clean.

---

# ── STILL TRUE, FROM THE NIGHT OF 15→16 ──

*Everything below this line is last night's sheet, kept because it is the standing state of the
branch and none of it has changed. Tonight's work is above.*

## ★★ THE BRANCH IS BACK ON THE RECORD

**With the shipped defaults, this branch is back to the record — byte for byte.**

**All four roles — world, world-off, camera, render — measure exactly what
[docs/fingerprints.json](fingerprints.json) records.** (The values live only there; this sheet does
not copy them, and `check-fingerprints` enforces that.) Reproduce with the `reproduce` command each
role carries in that file.

All four had been moved by V1. **There is nothing to mint.** A yes in the morning is cheap.

**Why they moved back: V1 now has a switch, and it is OFF.** V1 went into this branch's source on
2026-09-14 with **no key at all** — it could not be turned off in the dev screen and could not be kept
apart from the gap brake, so "never switch the two on together" was unenforceable. I added
`servoNoiseBlindEnabled: false` rather than reverting it, because **reverting would have answered a
question you have left open** ("does V1 go in at all?"). The switch forecloses nothing.

---

## STATE OF THE NIGHT

| piece | state |
|---|---|
| 1 — blind sites | **DONE**, pushed. → [BLIND-SITE-1](../reports/night/BLIND-SITE-1.md) |
| 1b — V1's switch | **DONE**, pushed (not in the plan; see above) |
| 1c — V1's switch reaches the dev screen | **DONE**, pushed |
| 2 — the fairness run | **DONE**, pushed. → [BRAKE-FAIRNESS-1](../reports/night/BRAKE-FAIRNESS-1.md) |
| 3 — the rate window | **DONE**, pushed. → [BRAKE-WINDOW-2](../reports/night/BRAKE-WINDOW-2.md) |
| 4 — merge readiness | **DONE** — `verify` is **26 PASS / 0 FAIL** |
| 5 — a build for your eye | **SERVED** — see below |
| 6 — branch tidy | **DONE** — see below |

---

## ★★ PIECE 2 — THE FAIRNESS RUN THE BRAKE HAD NEVER HAD

**Your own instrument, unmodified, at the full pinned N — and its verdict is the same on both arms:
FAIR.** → [BRAKE-FAIRNESS-1](../reports/night/BRAKE-FAIRNESS-1.md)

**3,000 races per arm, 6,000 in total** (10 tracks x 100 races x the three distance variants = the
pinned 300 races per track pooled). Each track ran its own default racer type. **This is the full
gate, not a short run.**

| | shipped (brake OFF) | **brake ON** |
|---|---|---|
| band reach, mean / worst track | 89.3% / 86.0% | **89.2% / 86.1%** |
| the gate: band reach (threshold in [FAIRNESS.md](FAIRNESS.md)) | passes 10/10 | **passes 10/10** |
| the gate: Holm-flagged start-row rows | **0 of 30** | **0 of 30** |

★ Band reach moves by at most **0.9 points** on any track, up on five and down on five. **The brake
neither buys fairness nor costs it.**

★ **Two rows sit at raw p<0.05 on the brake arm and one on the shipped arm** — in 30 comparisons you
expect about 1.5 by chance, none clears the Holm bar, and the gate is Holm. They are named in the
report so nobody later mistakes them for a finding.

★ **The brake demonstrably acted**, counted rather than assumed: a tally inside the brake itself, in
a repeat of one track at the identical settings, read **1,276,286 calls, enabled on 100%, and
117,597 commands issued**. Before last night's fix the same tally read **enabled 0, fired 0** — the
instrument could not fire the brake once in 2.26 million opportunities. And all **30 of 30**
combinations came out differently on the two arms, where before they would have been identical.

★ The world is **ASSUMED-DEFAULTS**, as the instrument itself labels it — no `--config`, your store
was not opened. And racer type cannot be separated from track here, because the methodology runs each
track's own type; the report says so rather than implying otherwise.

---

## ★★ PIECE 3 — THE BRAKE ALONE IS INVISIBLE, AND THIS IS THE NUMBER THAT MATTERS

Three arms, **300 races each**, your settings (90 px / 0.95 / 10%), **V1 OFF**.
→ [BRAKE-WINDOW-2](../reports/night/BRAKE-WINDOW-2.md)

| | worst race | largest single-step multiplier move | largest one-frame speed change |
|---|---|---|---|
| brake OFF (today) | 244.4 px | 0.011762 | 206.62 px/s |
| **brake ON, 1000 ms** | **227.6 px** | **0.011762** | **206.62 px/s** |
| **brake ON, 200 ms** | **208.3 px** | **0.011762** | **206.62 px/s** |

★★ **The two abruptness numbers are IDENTICAL on all three arms and on all ten tracks.** The gap
brake **alone** does not move either one. All week the worry has been "7.6x the shipped maximum" —
**that was the V1 pair. The brake by itself reaches 1.000x.** The danger was never the brake.

★ **The median race is untouched** (81.4 px on all three arms). The brake's whole effect is in the
tail, which is what a fallback brake should do. It **commands in 137 of 300 races and is OBEYED in
59–66** — the rest of the time your own servo is already pulling harder and `Math.min` keeps it
silent. A fallback, not a governor.

### Which window
**I would put 1000 ms in front of you**, because it IS `trajectoryTransitionDuration` — a quantity
the engine already holds — while **200 ms is a number with no home and no config key**: shipping it
needs a key, a dev-screen control, a validation rule and a default, which is a second decision bolted
onto the first.

**The other side, plainly: on the evidence 200 ms is simply better.** It wins on **10 of 10 tracks**,
is better on **56 races and worse on 0** (1000 ms: better on 40, worse on 1). The cost is the magic
number plus direction changes rising 0.29 → 0.44 per second. **The shipped default is untouched —
the value is yours.**

---

## PIECE 4 — WHAT A YES WOULD COST (prepared, not done)

**Nothing minted, nothing merged, nothing tagged.**

### What would be minted: **nothing**
All four fingerprint roles measure exactly what the record holds (top of this sheet). The brake ships
OFF and V1 now ships OFF, so the default race is the record's race. **If you switch the brake on and
keep it on, that is when a mint is owed** — not for the merge.

### `engine-reach --check`, with the changed paths passed EXPLICITLY
(Without paths it reads the worktree and reports "none of 0 paths", which is not a clearance.)
**8 of 37 changed paths can change the race:** `raceCore.js`, `raceDynamicsConfig.js`,
`racePlanner.js`, `storage/defaults.js`, `diag/acceptance-orders.mjs`, `diag/micro-divergence.mjs`,
`parity/goldenRunner.mjs`, `sim-fairness.mjs`. Every one of them is answered by the byte-identity
proof and the four unmoved fingerprints.

### ★ The brake's own tests — and one that did NOT hold
Five sabotages on the brake's law. **Four were caught. One was not**, and that is a finding:
replacing the whole shrinking-gap clause with "keep the strength" — a brake that never gives
authority back, never fades and never releases — left **all 18 tests green**. The give-back
assertion only checked that the new law surrenders LESS than the old size law did, and a law that
surrenders *nothing* surrenders less than anything.

Fixed by asserting the law's own identity, `dS/S = dGap/gap`, instead of a one-sided inequality.
**Sabotage is now 5 of 5 caught**, green either side of each. Test-only change; no product source
touched. This is the third time a test in this area has passed under its own sabotage, so I now run
the sabotage rather than trusting a green suite.

### ★★ `verify`: **26 PASS / 0 FAIL**
**There is nothing to classify, because nothing fails.** When this night began it was 20 PASS / 6
FAIL — all six were V1's moved inputs, and switching V1 off returned every one of them: the three
fingerprints, the golden race, the script suite and the four pinned-winner tests in the client suite.
**The branch is completely green against master `12fae1f3`, with 39 changed files.**

### So what a yes costs
Nothing to mint, nothing failing, all four fingerprints on the record. The merge is a merge.

---

## PIECE 5 — THE BUILD FOR YOUR EYE

**4173 production · 5173 dev · 4000 API**, all three restarted onto tonight's commit. CORS is set for
both client origins.

```
/api/health  {"build":{"commit":"edee568f","branch":"feat/gap-leader-brake","dirty":false}}
```

Bundle **read off the served page**, not assumed: `dist/assets/index-PUvWLe-u.js` (927.41 kB, gzip
276.92). `dirty: false` — the tree is clean, and all three services were restarted onto the final
commit after the last push.

### ★★ THE EYE-TEST SWITCH CANNOT BE LOST THIS TIME

Last night I reverted an uncommitted `gapBrakeEnabled: true` line and you lost the build you were
going to judge. **There is no line to revert now.** Both switches are real dev-screen checkboxes:

| what | where | shipped state |
|---|---|---|
| **Gap leader brake enabled** | Dev Screen → Dynamics Tuning | **OFF** — tick it to see the brake |
| **Servo ignores its own noise (V1)** | the checkbox directly below it | **OFF — leave it off** |

Ticking a box persists in your browser store and survives every rebuild. The group's **Reset** button
returns **both** to shipped, because the pair is what must not be on together — and the V1 box's
tooltip says so in plain words.

**So the build serves the shipped race by default**, byte-identical to the record. You turn the brake
on yourself, and you can turn it off mid-session to compare.

### What to watch

1. **ice-track, Quick Test seed 3** — your race, the one you have watched all week.
2. **searound, seed 20 — the largest improvement in 300 races: 216.4 → 173.7 px.**
3. **city-circuit, seed 4 — a control.** The brake never issues a command in it, so it must look
   exactly as it does today. (163 of 300 races are like this.)

★ Your own race, ice-track seed 3: **196.6 px today → 167.7 (1000 ms) → 157.9 (200 ms)**. At
1000 ms the brake commands on 659 frames there and is obeyed for 7.7 s.

---

## PIECE 6 — BRANCHES

**`report/brake-census-1` is merged and gone.** Its index line was the only thing missing, so I wrote
one and merged `--no-ff`; the branch was deleted at origin BEFORE master was pushed (the order
`check-tags` Rule B needs). **Master CI is GREEN for the merge SHA `12fae1f3`** — checked with
`gh run list --branch master`, 1m56s, not assumed from a local pass. `check-index`: 668 reports, 0
unindexed, 0 dangling.

**Nothing was deleted on containment grounds.** All three remaining branches were checked against
origin with `git ls-remote`, not the local cache, and none is contained in master — by commit or by
tree.

| branch | left standing because |
|---|---|
| **feat/gap-leader-brake** | this branch — product code, your decision |
| **feat/remove-prestaging-comebacker** | product code, removes a mechanism — your decision. 2 commits, touches `heroCurveGenerator.js` |
| **night/2026-09-14-history** | report-only in substance, but it rewrites **174 lines of `docs/MORNING.md`**. Merging it means choosing between two status documents, which is not a mechanical merge and is not mine to decide. It needs one sentence from you: keep the current sheet and take only `BREAKAWAY-HISTORY-1.md` + its index line, or take its sheet. Everything else about it is clean. |

**Nothing was tagged and nothing archived**, so no annotated tag was created and `TAGS.md` is
untouched.

---

## PIECE 1 — FIVE HARNESSES WERE RACING A WORLD NO PLAYER SEES

**Five blind sites found, five fixed, none left open.** Detail:
[BLIND-SITE-1](../reports/night/BLIND-SITE-1.md).

- The blindness was **entirely in the plan-config layer**. All 11 `createRaceFromIdentity` call sites
  already passed all 19 inputs; five plan-config builders did not. Without the gap brake's four keys
  the mechanism **cannot run at all** — it returns at its own guard before reading anything.
- ★★ **Both arms of the parity guard were blind**, not just the sim one. That is why the guard never
  reported it: the two agreed with each other and disagreed with the real browser core. This corrects
  what I told you in PARITY-CLOSE-1.
- ★★ **The two diagnostics under `scripts/diag/` were running a pre-COMBO15 world.** `chaosSteer` and
  `bandBias` ship ON; those files never passed them. Every finishing order
  `acceptance-orders.mjs` has printed is from a race no player runs — and its own header called them
  "canonical defaults". Neither file is in `verify` and neither has a pinned fixture, so nothing
  downstream is wrong; but do not compare an old printout against a new one.
- **★ THE PARITY BREAK IS CLOSED.** Brake on, all three arms now return the real browser core's
  hashes: `1ba41a20` (seed 1), `5ba78503` (seed 42). Before, the sim and browser-twin arms returned
  their **brake-OFF** hashes unchanged — switching the mechanism on changed nothing for them, because
  they did not have it. That is the defect in one sentence.
- **Proved inert before anything else:** 300/300 races byte-identical, 6/6 golden hashes, 4/4
  fingerprints.
- **Guarded:** `planConfigMirror.test.js` fails if any builder stops receiving what the browser passes.
  **7 sabotages across all 5 sites, 7 caught**, green either side of each.

---

## ★ WHAT YOU DECIDE

### 1. The gap brake, alone — this is what tonight is for
It is **OFF by default** and the branch is byte-identical to the record with it off. Switching it on
is a config change in the dev screen, not a code change. The fairness evidence (Piece 2) and the rate
window (Piece 3) land below as they finish.

### 2. Does V1 go in at all? — still yours, still open
Nothing tonight answers it. It now has a switch, so it can be judged on its own another day. What is
known: it buys the leader's servo arrival **55.8% → 79.7%** and costs **0 of 300** races
byte-identical, with **190 of 300** changing winner — a full re-baseline.

### 3. V1 and the brake must not be on together
Measured and explained: [BRAKE-JERK-1](../reports/night/BRAKE-JERK-1.md). The brake's window-end
release lands undamped in one 16 ms step (**0.089471** against a shipped maximum of **0.011762**),
because V1's restart gate tests a quantity that does not contain the brake. ★ But note that report's
own correction: **in world px/s the jerk is +16.35 px/s, which the shipped game already matches or
beats on one racer-step in 139** — the "7.6×" was a ratio of multiplier moves, not of anything a
viewer sees.

---

## DECISIONS I TOOK WITHOUT ASKING

- **A switch for V1 instead of a revert** (reason above): `servoNoiseBlindEnabled` in `defaults.js`,
  default `false`.
- **The two diagnostics were fixed rather than left blind**, even though that changes what
  `acceptance-orders.mjs` prints. Neither is in `verify`, neither has a pinned fixture, and
  `micro-divergence.mjs`'s documented "checkpoint diff of exactly zero" is unaffected because both its
  arms read the same builder.
- **The fairness run uses the shipped defaults, not `--config`** — your store was not opened. The
  instrument labels that world ASSUMED-DEFAULTS and so do I.

---

## ★ IF YOU SAY YES

Nothing is minted, nothing is merged, nothing is tagged — the branch is waiting for your word. What a
yes costs:

1. `verify` is already **26 PASS / 0 FAIL**.
2. All four fingerprints already measure what the record holds, so **no mint is owed**.
3. The merge is a `--no-ff` merge; delete the branch at origin BEFORE pushing master (the order
   `check-tags` Rule B needs), then check `gh run list --branch master` for the **merge SHA**, because
   green locally is not green in CI.
4. Nothing would be archived, so **no tag and no `TAGS.md` entry**.

**And if you say no to the brake, nothing has to be undone** — it ships OFF, and with it off this
branch is the record's race byte for byte.

---

## CLEANUP — DONE

Five worktrees were created this chain: `bs0`, `bson`, `bsoff`, `fairon`, `win200`. **Every one was
checked with `dir /AL /S` before removal — 0 junctions, and none had a `node_modules` of its own**, so
the hazard did not arise. All five are gone; `node_modules` is intact (client 328, server 186).

`bson`/`bsoff` carried an instrumented `racePlanner.js` (a call tally), `fairon` the brake switched
on, `win200` the 200 ms window — **all probe copies; the real tree was never patched.** One of them
was held open by a stray `sim-fairness.mjs` process I had started hours earlier; it was stopped and
the directory removed.

Scratch output directories (`fair`, `p3`, `b`, `fairtally`) are deleted. **No test race and no data
record was created, `server/data` is untouched, and your store was never opened.** The five stale
`.git/worktrees/` stubs refuse deletion with EPERM — the known OneDrive behaviour; `git worktree
list` already ignores them and they are harmless.

The three services are left running for you.

# MORNING SHEET — night of 2026-09-16

Branch `feat/gap-leader-brake`, pushed after every piece. **Nothing minted. Nothing merged. Nothing
tagged. No shipped default changed. Your store was never opened.** V1 (`servoNoiseBlindEnabled`) was
OFF for every measurement in this chain.

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

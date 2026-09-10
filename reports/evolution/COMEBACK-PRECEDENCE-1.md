# COMEBACK-PRECEDENCE-1 — the camera switches to the plan's comebacker, and two of the arm's four numbers do not reproduce

2026-09-10 · branch `night/2026-09-09` · commit `a57fc04b` · **SHIPPED as behaviour. No config key,
no default, no slider. Nothing minted — no minting permission was given. Not merged: his eye first.**

Predecessors live in `reports/night/`: [COMEBACK-SAME-RACER-1](../night/COMEBACK-SAME-RACER-1.md)
(the four arms), [COMEBACKER-ROLE-TRUTH-1](../night/COMEBACKER-ROLE-TRUTH-1.md) (what the role is),
[COMEBACK-CEILING-1](../night/COMEBACK-CEILING-1.md) (how often the camera looks at all).

---

## 0 · ★ THE FINDING FIRST, BECAUSE THE BRIEF ASKED FOR IT AS A STOP CONDITION

The brief said: re-measure the four numbers on the SHIPPED code, they must reproduce the arm's
**84 / 1.15 / 11.7 / 0**, and **if they do not, report both and STOP**.

**Two of the four reproduce. Two do not, and by a wide margin.**

| | arm D — MILD (COMEBACK-SAME-RACER-1) | ★ **shipped** | |
|---|---|---|---|
| shots on the cast comebacker | 84 | ★ **50** | **does NOT reproduce** |
| precedence firings per race | 1.15 | ★ **0.49** | **does NOT reproduce** |
| switches per minute | 11.7 | **11.44** | reproduces |
| lead changes cut short | 0 | **0** | reproduces |

★ **THE CAUSE IS ESTABLISHED, NOT GUESSED, AND IT IS NOT A DIFFERENCE BETWEEN THE ARM AND THE
SHIPPED PATH.** All four of COMEBACK-SAME-RACER-1's arms — including its baseline arm A — were
measured on races carrying a **temporary HOLD ARM in `client/src/modules/racePlanner.js`**
(`--hold=cast`, hold to rank 18, release at 0.70). That arm held a cast comebacker back and let him
go, **manufacturing a large, detectable climb in essentially every race**. Its own §6 records the arm
and its removal; `git log -S "setHoldArm" --all -- client/src/modules/racePlanner.js` returns
**nothing**, so the arm was never committed and cannot be re-run.

★ **So arm D's 84 and arm A's 35 were both measured on a race that no longer exists.** The shipped
precedence races the ordinary race, where a cast comebacker climbs only as far as the plan's servo
takes him. **The brief's stop condition is honoured here: both sets of numbers are reported, nothing
was tuned to close the gap, and the piece stops at the report.**

★ **AND THE ONE NUMBER THAT IS INSENSITIVE TO THE HOLD ARM CROSSES OVER EXACTLY**, which is what
makes the account above a measurement rather than an excuse. The arm's baseline switch rate was
**11.3/min**; the control below, on a race with no hold arm at all, is **11.34/min** — 0.04 apart. On
the number the hold arm cannot touch, the two worlds agree; on the two numbers that count climbs,
they cannot.

---

## 1 · ★ THE CONTROL, WHICH IS WHAT THE MEASUREMENT WAS MISSING

COMEBACK-SAME-RACER-1's own correction (§4b) was that **a number restating its selection rule is not
evidence**. So the shipped arm is reported only against a control: **the same 100 races, the
precedence removed and nothing else.**

**100 races — 10 tracks × seeds 41000–41009, 40 racers.** 96 cast a comebacker; 179 cast comebackers
in all, a mean of 1.86 per race.

| | control (precedence OFF) | ★ shipped (precedence ON) | |
|---|---|---|---|
| ★ **shots on the cast comebacker** | **11** | ★ **50** | **4.5×** |
| races with such a shot, of 96 | 11 | ★ **50** | |
| ★ **precedence firings** | 0 | **47**, in 47 races | max **1** in any one race |
| ★ **switches per minute** | **11.34** | **11.44** | **+0.10** |
| ★ **lead changes cut short** | **0** | **0** | |
| what a FORCED shot displaced | — | LEADER_ZOOM 24 · BATTLE_ZOOM 16 · OVERVIEW 7 · ★ **LEAD_CHANGE 0** | |

★ **The picture does not become restless.** +0.10 switches per minute is one extra cut roughly every
ten minutes of racing. Set against COMEBACK-SAME-RACER-1's own alternative — the shorter hold, at
**+3.3** — the precedence is the calm lever and that finding survives the change of race.

### ★ AND IT PUTS A COMEBACK SHOT ON FOUR TRACKS THAT NEVER HAD ONE

Forced shots (ON) against all comeback shots (control), per track:

| track | ★ forced | control |
|---|---|---|
| river-run | **7** | ★ **0** |
| searound | 6 | 1 |
| seatrack | 6 | 1 |
| dirt-oval | 5 | 2 |
| space-sprint | 5 | ★ **0** |
| garden-path | 4 | 3 |
| luger-hill | 4 | ★ **0** |
| mountainstreet | 4 | ★ **0** |
| city-circuit | 3 | 3 |
| ice-track | 3 | 3 |

**On four of ten tracks the control never cuts to a comebacker at all across ten races.** That is
the shape of what he will see change.

### THE CONTROL IS PROVEN TO BE TODAY'S BEHAVIOUR, not asserted to be

The control is the shipped `_comebackPrecedenceOffer` overridden to return `null` on one director
instance — the same wrapping idiom `--contest` and the outcome arm already use, touching no product
file. That it really reproduces today was **checked by running HEAD's own camera files** over the
same ten races (seed 41000, all tracks) and comparing:

```
★ ALL 10 RACES IDENTICAL: shot count, switch count and per-state frame counts
```

**The race side is identical between the two arms** — `raceMs`, `b1Size`, `heroCount`,
`outcomeOpensAt`, `deliveredAt`, `framesTotal` and the cast itself, over all 100 races:
`RACE-SIDE DIFFERENCES BETWEEN THE ARMS (must be none): NONE`. The camera cannot reach the physics,
and that is checkable here rather than assumed.

### When the forced shot fires

Race progress of the 47 forced shots: min **0.600** · p25 **0.600** · median **0.626** · p75 **0.649**
· max **0.724**. (This is `st.raceProgress`, the axis the plan's beats are written in; the window
opens on the plan's own OUTCOME phase, which arrives before the internal 0.75 fallback.)

### ★ WHAT THE ZERO DOES *NOT* SAY

**Three comeback shots still displaced a LEAD_CHANGE in the shipped arm** — and three did in the
control too. **None of them was forced**: all three are ordinary hold-elapsed shots on the untouched
path. "0 lead changes cut short" means *the precedence* never cuts one, not that a comeback shot
never follows a lead change. That distinction is the whole of the mild rule and it should not be read
wider than it is.

### One limit did not have to bind

**No race fired more than once**, although 70 of the 96 carry two or more cast comebackers. So in
this population "at most once per comebacker" was never the binding constraint — the ten-second
comeback cooldown and the width of the outcome window got there first. The limit is built and pinned
because it is part of the behaviour he asked for; it is **not** what produced the 0.49.

---

## 2 · ★ THE CASE THE MEASUREMENT DID NOT COVER — DECIDED, BUILT, AND VISIBLE IN THE DATA

The brief: in ~4 of 100 races the plan casts nobody, `_cast` is null, and `comebackDetector.js:157`
falls back to `_b1`, a wider population. **The precedence applies to a CAST comebacker only.**

Built that way, and it is stated in the source header of `_comebackPrecedenceOffer`. The four races
that cast nobody in this run are `luger-hill/41003`, `garden-path/41005`, `ice-track/41006`,
`luger-hill/41005` — the same four COMEBACK-SAME-RACER-1 found — and across them:

★ **forced shots = 0.** Nothing is forced where nobody was cast, and today's behaviour stands.

A director test pins the same thing from the other side: with a plan that casts no comebacker, the
detector still offers a climber from `_b1` and the precedence still forces nothing, while the
ordinary weighted path still produces the shot once the hold has elapsed.

---

## 3 · WHAT WAS BUILT, AND THE THREE THINGS RE-VERIFIED AT SOURCE FIRST

The brief said not to carry its three premises. Each was opened:

- **`comebackDetector.js:86`** — `if (h && h.role === 'comebacker' && Number.isInteger(h.index))`,
  the filter that builds `_cast`. Confirmed at the line.
- **`comebackDetector.js:157`** — `const candidates = this._cast && this._cast.size > 0 ? this._cast : this._b1;`
  Confirmed at the line: the cast is the population, `_b1` the fallback.
- **`transitionDecision.js`** — the lead-change interrupt is evaluated **before** the hold gate.
  Confirmed. **And COMEBACK-SAME-RACER-1's warning is confirmed too**: `_transition` calls
  `_pickNextState` and commits whatever comes back, so the interrupt alone only re-opens the draw.

### The precedence, in one place each

| file | what it gained |
|---|---|
| `comebackDetector.js` | `isCast(index)` — reads the set `:86` already builds. No second notion of the cast. |
| `CameraDirector.js` | `_comebackPrecedenceOffer()` — the whole precedence and both limits, evaluated **once per frame** in `update()`. |
| `CameraDirector.js` | **THE FORCE** — an early return in `_pickNextState`'s candidate pool. |
| `transitionDecision.js` | slot **3.5**: below the lead-change interrupt, above the hold gate. |

★ **WHY THE FORCE SITS IN `_pickNextState` AND NOT AT THE `_transition` CALL SITE**, which is where
the brief pointed. It returns COMEBACK_ZOOM **above `_weightedRandomPick` and above `_acceptsOffer`**,
so the re-opened draw is gone and the offer cannot be declined — which is the substance of "force,
do not re-ask". Placed one level up, at `_transition`, a force would also override the finish
sequence, the start window and the endgame, all three of which return **before** the candidate pool
and own the screen outright. Sitting inside the pool, the force **inherits** those gates instead of
restating them, and nothing is built twice. The pendency test in `update()` is deliberately a
**subset** of what the pool will accept, so an interrupt can never cut a hold short and then land
somewhere else.

★ **NO NUMBER WAS NEEDED.** Nothing here introduces a threshold, and the brief's stop condition for
that never triggered. Every value the offer reads already exists and is read, never restated:
`_comebackWeight`, `_comebackCooldownMs`, `_outcomePhaseThreshold`, `_endgameThreshold`,
`_startWindowMs`, and the three finish latches. `comebackMaxCurrentRankPct`, `comebackWindowSec`,
`comebackWeight` and every hold length are **untouched**, and the other three arms were **not built**.

**The two limits, as behaviour:**
- **once per comebacker** — `_comebackPrecedenceShown`, a per-race Set, burned on the **commit** and
  never on the offer, so a shot the finish sequence or the endgame overrules does not spend the turn;
- **never into a live LEAD_CHANGE** — the first line of the offer's body.

---

## 4 · ★ THE TWO SABOTAGES, EACH WATCHED RED

A test nobody has seen fail is not evidence, so both were applied to the real source and run.

### (a) make the precedence fire on the wrong racer

The unit fixture gives index **2** the cast role and index **3** — in the B1 roster, never cast — the
**larger** rank gain, so a precedence reading the wrong population has somebody to pick.

Widening the population alone (`best()` reading `_b1`) was **caught by the `isCast` gate before it
could choose** — five tests red, all of them "no shot at all". So the sabotage was deepened until it
genuinely fired on the wrong racer (the cast gate removed as well):

```
AssertionError: expected 3 to be 2
    114 |     expect(cd.comebackLockedRacerIndex).toBe(2);
```

★ **Red on identity — the camera locked onto racer 3.** Reverted.

### (b) let it cut into a live LEAD_CHANGE

The limit's one line removed from `_comebackPrecedenceOffer`:

```
AssertionError: expected 'COMEBACK_ZOOM' to be 'LEAD_CHANGE'
      Tests  1 failed | 14 passed (15)
```

★ **Exactly one test red, and it is the right one.** Reverted. No arm remains anywhere in the tree.

`client/src/modules/camera/comebackPrecedence.test.js` — **15 tests**, stable over three consecutive
runs, covering both limits, the cast-only population, the no-cast race, the endgame, the finish
sequence, a zero weight, and the per-race reset.

---

## 5 · ★ THE BROWSER TEST, AND ITS OWN CONTROL

`client/e2e/comeback-precedence.spec.js` runs a Quick Test race in real Chromium and reads the
camera state out of **the DOM the renderer produced** — `[data-testid="camera-state-hud"]`'s
`data-state`, sampled per animation frame. Nothing is re-derived, which is CAMERA-REPRO-1's own rule.

★ **WHAT MAKES A CUT *THE PRECEDENCE* AND NOT AN ORDINARY ONE, FROM OUTSIDE.** The hold gate for
LEADER_ZOOM and BATTLE_ZOOM is `max(minStateHold, maxStateDuration)` = **8000 ms**. Without an
interrupt the director cannot change state before it elapses. So **a COMEBACK_ZOOM entered out of one
of those two states in less than the gate could not have happened on the ordinary path**, and of the
interrupt slots only the precedence produces COMEBACK_ZOOM. That inequality is visible in the DOM.

**The race (garden-path, Quick Test seed 41000) — the trace, verbatim:**

```
[{"state":"OVERVIEW","t":1333},{"state":"LEADER_ZOOM","t":19589},{"state":"BATTLE_ZOOM","t":29161},
 {"state":"LEADER_ZOOM","t":37229},{"state":"LEAD_CHANGE","t":40942},{"state":"LEADER_ZOOM","t":48960},
 {"state":"BATTLE_ZOOM","t":52333},{"state":"LEADER_ZOOM","t":55473},{"state":"LEAD_CHANGE","t":55768},
 {"state":"LEADER_ZOOM","t":63863},{"state":"OVERVIEW","t":65490},{"state":"BATTLE_ZOOM","t":70499},
 {"state":"COMEBACK_ZOOM","t":73788},{"state":"LEADER_ZOOM","t":81864}, … ]

comeback entries: [{"from":"BATTLE_ZOOM","heldMs":3289,"at":73788}]
```

★ **COMEBACK_ZOOM entered 3289 ms into an 8000 ms hold.** That is the precedence, in the browser, in
the picture. **And three LEAD_CHANGEs ran in that same race and not one was cut into.**

### ★ THE BROWSER CONTROL — the same race with the precedence removed

```
comeback entries: []
    Error: the race never cut to a comeback at all
  1 failed
```

★ **The passing spec is evidence rather than decoration: without the precedence that race never cuts
to the comebacker at all.** (The two traces diverge beyond the comeback shot — once the state
sequence changes the director's own random stream diverges with it. Expected, and the reason the
control is a separate run rather than a diff.)

The spec deliberately does **not** assert "once per comebacker": the DOM cannot tell a forced shot
from an ordinary one, and counting them there would be a guess wearing an assertion. That limit is
pinned in the unit file, where it is visible.

---

## 6 · ★ FINGERPRINTS — ALL FOUR UNMOVED, AND THE CAMERA ONE FOR A REASON WORTH KNOWING

| role | record | measured | |
|---|---|---|---|
| world | `8a1977187e9c99b4` | `8a1977187e9c99b4` | **UNMOVED** |
| world-off | `aa09ed97a3a32689` | `aa09ed97a3a32689` | **UNMOVED** |
| ★ camera | `75aef5cd474c54e5` | ★ `75aef5cd474c54e5` | ★ **UNMOVED** |
| render | `40b2de6fcc5bafd8` | `40b2de6fcc5bafd8` | **UNMOVED** |

**Golden races: PASS** — 2 races, every finishing position and time as recorded. This changes no race.

★ **THE BRIEF EXPECTED THE CAMERA FINGERPRINT TO MOVE. IT DID NOT, AND NOT BECAUSE THE CHANGE IS
INERT.** The address: **`scripts/lib/raceDriver.mjs:373`** and `scripts/camera-fingerprint.mjs:201`
both call `cd.updateRacePlan(meta.rpPlanInfo.b1Indices)` with **no cameraPlan**, and **neither ever
calls `cd.setCameraPlan()`**. The mid-race delivery of the heroes is done by `comeback-beats.mjs`
itself, in its own frame callback, precisely because the shared driver does not do it. So on the
fingerprint harness `_cast` is null for the whole run, `isCast()` is false for every racer, and the
precedence **cannot fire**.

★ **The camera fingerprint is BLIND to this change by construction.** It is not evidence that the
picture is unchanged — the 47 forced shots and the browser trace are the evidence that it is changed.
This is the same class of hole as CAMERA-SEED-AND-LINE-1 (every harness pinned a camera seed the
browser never uses), found at a different address, and it is named here rather than left as a green
line somebody later reads as a guarantee. **Nothing was minted, and no minting permission was given.**

---

## 7 · CHECKS

| check | result |
|---|---|
| camera suite | **961 pass** (946 + the 15 new) |
| client suite, full | **4645 pass**, 255 files |
| `npm run verify`, plain | **PASS 24 / FAIL 0** after §8's stamp step; the first run failed only on it |
| golden races | **PASS** |
| all four fingerprints | **match the record** |
| browser spec | **PASS**; its control **FAILS**, which is the point |
| pre-commit guards | **PASS 9 FAIL 0** |

**`git stash` was not used. `--no-verify` was not used. No record was created by hand.**

---

## 8 · TWO MEASURED STAMPS, RE-MEASURED IN FULL RATHER THAN ARGUED

The pre-commit guard blocked on `docs/CAMERA_DIRECTOR.md` (tracking-lag) and `docs/ENDING-PHASES.md`
(straggler-truth). Both were **run**, and then **run a second time on HEAD's own camera files with
the change lifted out**, so the two could be compared to each other rather than to a table written on
an older tree.

★ **Every figure agrees to the digit** — all six tracking-lag frame counts (8415, 1509, 13133, 7573,
4005, 2089) and both percentiles on all six states; all four straggler-truth rows. The structural
reason is §6's: both scripts drive `raceDriver`, which delivers no cameraPlan, so no comebacker is
ever cast and the precedence cannot fire.

The stamp SHAs name the feature commit `a57fc04b`, written in the follow-up commit — the same
two-step [COMEBACK-CONNECT-1](../night/COMEBACK-CONNECT-1.md) used at `918423c8`, because a stamp
cannot name a commit that does not exist yet.

---

## 9 · WHAT IS OPEN, AND IT IS HIS

- **His eye.** Not merged; the branch is pushed and waits. Serve the production build on **4173** and
  watch a race.
- **Whether 50 shots in 96 races is the amount he wants.** The arm promised 84 on a race that had a
  hold arm in it; the shipped number is 50 against a control of 11. **That is a picture judgement and
  it is not made here.**
- **Nothing is minted.** The camera fingerprint did not move, so no guard is red — but §6 says why
  that is not the reassurance it looks like.


---

## APPENDIX, 2026-09-10 (appended, nothing above rewritten) — THE WALKTHROUGH WAS SERVED WRONG

§9 said "serve the production build on **4173**". **That sentence is incomplete and it cost him the
eye test.** What he got was the page on 4173 and **"The server is not answering"**.

**Established by asking the services, not by looking at processes:**

| port | `GET /` | `GET /api/health` | |
|---|---|---|---|
| **4000** | NO ANSWER | NO ANSWER | ★ **nothing was running** |
| 4173 | 200 | 200 **`text/html`** | ★ the SPA fallback, **not an API answer** |
| 5173 | NO ANSWER | NO ANSWER | not needed for a production judgement |

★ **THE DEFECT CLASS, CONFIRMED AT SOURCE.** Since RUNTIME-API-URL-1 the API address is resolved in
three steps in `client/src/services/api.js`: the runtime global injected by the server, then
`VITE_API_URL`, then `DEFAULT_API_BASE_URL` at `:84` — **`http://localhost:4000`**. The served
`index.html` was read back from the wire and carries **no `__RA_RUNTIME_CONFIG__`**, because
`server/src/runtimeConfig.js:104` returns null when `RA_PUBLIC_ORIGIN` is unset. **So the page falls
back to 4000, and 4000 was empty.** Confirmed live in the browser afterwards: the page on
`http://localhost:4173` issues its calls to `http://localhost:4000/api/...`.

★ **AND THE PROBE THAT WOULD HAVE HIDDEN IT.** 4173 answers **200 on every path**, `/api/health`
included, because the static server has an SPA fallback. Only the content type separates them —
`text/html` from the preview, `application/json` from the API. A "does it answer?" check reads green
on a stack that cannot work.

★ **A SECOND RULE WAS BROKEN AND IT MATTERED FOR THE JUDGEMENT ITSELF.** The first attempt served
`client/dist` **from inside OneDrive** via the server's own static handler. `docs/VERIFY-RULES.md`
**R10** exists precisely to stop that: `scripts/serve-production.mjs` copies the bundle to
`%LOCALAPPDATA%acearena-preview` because serving the synced tree produced a measured **1016 ms
frame**. An eye test taken on the first setup would have been unusable even with the API up.

★ **R10 ALREADY SAID ALL OF THIS.** It was not read. What R10 did NOT do was say it FIRST: it opened
*"One command, from the repo root:"* above a single code block, with the API and its `RA_CLIENT_ORIGIN`
paragraph below. That opening is amended in the same commit as this appendix to name **both**
services in a table before any command — the durable fix, in the rule's one home rather than here.

**The corrected environment, confirmed by asking:**

| what | answer |
|---|---|
| client build badge, from the served bundle | `[RA CAMERA LIVE TRUTH] commit=e7425f28 branch=night/2026-09-09` |
| `/api/health` on 4000 | `{"commit":"e7425f28","branch":"night/2026-09-09","dirty":false}` |
| signed-in page load | `{"username":"Weudl","role":"admin","team":"Seasonal Entertainment"}` on a page served by 4173 |
| CORS from the 4173 origin | `access-control-allow-origin: http://localhost:4173`, credentials `true` |
| stored camera config shadowing defaults | `hadStoredConfig=false` — he sees the shipped behaviour |

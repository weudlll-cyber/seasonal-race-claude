# PLANNED-COMEBACK-ONLY-1 — only a planned comeback is shown, and the racer who was never coming back gets his own name back

Branch `feat/planned-comeback-only`, commit 1. Date: 2026-09-19.
**Nothing merged, nothing minted, no shipped default touched.** The race does not move; the camera
does, on purpose.

> **OWNER DECISION, 2026-09-19:** *a comeback is shown when one was PLANNED, not when one happens.*
> **And his second sentence:** there are enough other camera states, so whatever the camera shows
> instead is acceptable — it simply must not be a comebacker. **Nothing was built to fill the gap.**

---

## ★★★ THE ONE LINE

> **Every unplanned comeback shot is gone — 43 of 153 over 200 races — and the racer whose comeback
> WAS planned gained 20 shots he had been losing to them.** Net: 153 → 130 shots, 47 → 70 races with
> no comeback shot at all, **179.8 s of freed screen time redistributed to four states that already
> existed**, and **the race is byte-identical**: 300 of 300 races, all 12,000 finishing times, worst
> delta **0 ms**.
>
> ★ **And the drawn winner is not a `pursuer`.** He is `sovereign-lead` — the name the other half of
> his own cast site already gave him. No new role name entered the tree; one branch left it.

---

## 1 · ★★ WHO THE `:616` RACER IS — MEASURED BEFORE HE WAS NAMED

The brief's preferred outcome was that he behaves like the `:688` racer, in which case he is a
`pursuer` and no new concept enters the tree. **He does not, and the measurement is not close.**

The owner's fixture: **ten tracks, seeds 1–30, 40 racers, his roster, action stage `wild`** — 300
races. Roles, drawn ranks and the hold map come from `raceCfg.racePlanController`; nothing was
instrumented. `holds peak gap` = he is the leader at the frame where the lead over second place is at
its maximum for the race. `rank@0.8` = his live rank at race progress 0.8, just after the outcome
phase opens at `outcomePhaseThreshold` 0.75 — **the first moment the camera is allowed to look**.

(Line numbers in this section are master's, the tree the measurement was taken on. After the change
the three cast sites are `:648`, `:688` and `:722`.)

| group | n | rank@cast | worst | ever leads | lead frac | **holds peak gap** | top-5 | wins | **rank@0.8** | **top-3 @0.8** |
|---|---|---|---|---|---|---|---|---|---|---|
| ★ **`:616` as `comebacker`** (what this renames) | **182** | 5 | 20 | **90.7%** | **16.7%** | ★ **30.2%** | 90.7% | **34.1%** | **2** | **83.0%** |
| `:616` as `sovereign-lead` (the other arm of the same site) | 103 | 1 | 24 | 100% | 21.1% | 40.8% | 90.3% | 21.4% | 2 | 81.6% |
| `:688` **`pursuer`** | 123 | 10 | 20 | 64.2% | 2.9% | ★ **8.9%** | 88.6% | 5.7% | 3 | 59.3% |
| `:657` **STAGED comebacker** | 209 | 7 | 20 | 59.3% | 1.7% | 5.7% | 86.6% | 16.7% | **7** | ★ **13.9%** |

### ★ HE IS NOT A `pursuer`

PRESTAGING-WHY-1 chose that name for a racer who *chases*: *"he leads in 66% of races but holds the
race's peak gap in only 10% … a front-group PURSUER, not a racer coming back from anywhere."* On the
same metrics, recomputed here for both racers off the same 300 races, **the `:616` racer is the
opposite of him on every one**: he leads in **90.7%** against 64.2%, holds the peak gap in **30.2%**
against 8.9%, wins **34.1%** against 5.7%, and is cast a median of **five** ranks back rather than
ten. Calling him a pursuer would put the wrong word on the racer who most often IS the race's leader.

★ **The pursuer's own numbers reproduce, which is the check on the METHOD rather than on the sample.**
Three of PRESTAGING-WHY-1's four figures come back to the point — leads 64.2% against its 66%, peak
gap 8.9% against 10%, top-5 88.6% against 89%. The fourth does not: it reports the pursuer a median
of ONE place behind the peak-gap holder and this measures **three**. The two definitions differ and
only this one's is written down, so **that is the figure to distrust, and it is named here rather
than quietly dropped**. It carries no weight in the decision; the three that agree do.

### ★★ HE IS THE OTHER ARM OF HIS OWN SITE, AND THE TWO ARE ONE RACER

`:616` is a single `if` over a single threshold: the drawn winner is `sovereign-lead` when he is
already inside the front cluster (`wr <= cr`, and `cr` starts at **2**) and was `comebacker` when he
was not — so a winner sitting **third** after chaos was labelled a comebacker. The two arms are the
same racer either side of that line, and where the camera looks they are indistinguishable:

- **median rank 2 at progress 0.8 in both arms**; top-3 there **83.0%** against 81.6%;
- **top-5 at the line 90.7% against 90.3%**; the same median finishing place (3);
- the `comebacker` arm actually **wins more often** — 34.1% against 21.4%.

So the pair collapses to one existing name. **No new role name enters the tree, and a branch leaves
it.**

### ★★★ AND THE BOTTOM ROW IS WHY THE OWNER'S DECISION HAS THE SHAPE IT HAS

**The STAGED comebacker is the only cast racer still outside the front group when the camera is first
allowed to look** — top-3 at progress 0.8 in **13.9%** of races, climbing to 62.7% by 0.9. The `:616`
racer is already there (83.0%). *He is not coming back at the moment the shot would be taken; he is
leading or second.* The staged racer is the one the shot is about, and he is the one the plan
authored it for.

---

## 2 · WHAT CHANGED, AND WHAT WAS REUSED RATHER THAN WRITTEN

| | address | change |
|---|---|---|
| the cast | `client/src/modules/heroCurveGenerator.js:648` | ★ the ternary that chose the ROLE is gone; the site emits `'sovereign-lead'` unconditionally |
| the camera | `client/src/modules/camera/comebackDetector.js:215` | ★ the `_b1` fall-back is gone; `best()` refuses when the cast is empty |

### ★ THE CURVE IS NOT TOUCHED, AND THAT IS THE WHOLE OF §4

The cast site had **two** ternaries on one line — one for the role, one for `peakRank`. **Only the
role one was removed.** `peakRank` keeps `wr <= cr ? Math.max(1, wr) : wr` exactly as written,
because that is the authored curve; `addSolo` reads the role only to store it, and `raceCore.js` /
`raceStep.js` never read a role at all.

### ★★ NO GUARD WAS ADDED AND NO CONFIG KEY, AS INSTRUCTED — CHECKED FIRST

The brief asked whether a guard or early return already existed. **It does, and it is what was
reused:** `best()` opens with `if (!this.active) return null;`, where `active` is a getter meaning
"a roster exists". The refusal is the same idiom three lines below it, over the set `setPlan` already
builds at `:110`. **There is no key**: with no cast comebacker there is no comeback shot, which is a
behaviour and not a setting.

★ **`_b1` is NOT dead and was deliberately left alive.** It is the RECORDING roster — `recordRanks`
tracks it, `active` is defined by it, the diagnostics `roster` getter returns it. History must still
be kept for every B1 racer, because the plan arrives **mid-race** and a racer cast then needs the
window that was recorded before he was named. What `_b1` stopped being is a *candidate pool*.

### The single entry point, established by reading rather than assumed

`best()` is the only source of a COMEBACK_ZOOM subject. Both paths into the state —
the precedence force (`CameraDirector.js:1818`) and the weighted candidate (`:1824`) — call
`_detectComebackRacer`, which is one line wrapping `this._comeback.best()`. So one refusal closes
both.

---

## 3 · ★★★ THE CAMERA LEDGER — N=200 PER ARM, MASTER AGAINST THE BRANCH

Ten tracks, seeds 1–20, 40 racers, `wild`. **Both arms were run from this session's own tree**: the
master arm before a line was edited, the branch arm after. The race is identical between them (§4),
so a racer INDEX means the same thing in both.

| | master | ★ branch |
|---|---|---|
| races | 200 | 200 |
| races whose plan casts a camera comebacker | 182 | **136** |
| **total COMEBACK_ZOOM shots** | **153** | ★ **130** |
| races with **no comeback shot at all** | 47 | ★ **70** |

### Shots by the cast site that named the subject

| cast site | master | ★ branch |
|---|---|---|
| `:648` **the drawn winner** | **29** | ★ **0** |
| `:688` **the STAGED comebacker** | 110 | ★ **130** |
| `:722` the pursuer (reached only via the fall-back) | 1 | ★ **0** |
| **uncast** — a racer the plan named in no role at all | **13** | ★ **0** |

★★ **43 unplanned shots removed, and the planned one gained 20.** That second number is not a side
effect to gloss over: the staged comebacker was being **crowded out**. The precedence fires at most
once per comebacker and the state carries a 10 s cooldown, so a shot spent on the drawn winner was a
shot the authored comeback did not get. The net is **−23**, not −43.

### ★★ WHERE THE FREED TIME WENT — AND NOTHING WAS BUILT TO CATCH IT

| camera state | master s | branch s | delta | share of the freed time |
|---|---|---|---|---|
| **BATTLE_ZOOM** | 2811.3 | 2885.7 | **+74.5** | **41.4%** |
| **LEAD_CHANGE** | 2805.5 | 2863.4 | **+58.0** | **32.2%** |
| **LEADER_ZOOM** | 5102.4 | 5128.2 | +25.8 | 14.4% |
| **OVERVIEW** | 994.6 | 1016.2 | +21.5 | 12.0% |
| ★ **COMEBACK_ZOOM** | 1220.9 | 1041.1 | ★ **−179.8** | — |
| FINISH | 300.0 | 300.0 | +0.0 | 0.0% |
| FINISH_OVERVIEW | 670.8 | 670.8 | +0.0 | 0.0% |
| PHOTO_FINISH | 459.4 | 459.4 | +0.0 | 0.0% |

★★★ **179.8 s freed, 179.8 s redistributed, across four states that already existed.** That is the
owner's second sentence measured rather than assumed. **The three finish states are identical to
0.1 s**, so the ending is untouched.

★ **Total screen time is 14364.9 s on BOTH arms**, to the tenth of a second — an independent
corroboration of §4 from a harness that was not measuring for it.

★ **This is a RECORD, not a gate.** Nothing here was compared against a threshold and nothing was
tuned to it.

---

## 4 · ★★★ THE RACE DOES NOT MOVE — THE STOP CONDITION, MEASURED

The owner's fixture, both arms: **ten tracks, seeds 1–30, 40 racers, his roster, `wild`.** Per race
the finishing ORDER and **all forty finishing times** in ms (`finishTimeMs`, the live field —
`finishTime` reads null here and fakes a clean noise floor).

```
races compared                  : 300
finishing ORDER identical       : 300 / 300
all finishing TIMES identical   : 300 / 300
individual finishing times      : 12000 (40 per race)
worst time delta (ms)           : 0
★ NO RACE MOVED — order and every finishing time byte-identical.
```

★ The mechanism is named rather than left to the number: `addSolo` stores the role string and nothing
else reads it on the physics path, so the only way this could have moved is if the `peakRank` ternary
had been collapsed with the role one. It was not (§2).

### The four fingerprints

All four were measured with each role's own `reproduce` command, `--check` against the record.
**★ NOTHING WAS MINTED.** The record still carries master's values and the two that moved are
recorded here only.

| role | record (master, minted at `c71b371b`) | before-control, this tree untouched | ★ after |
|---|---|---|---|
| **world** | `b6cfd1daf1756f61` | ★ `b6cfd1daf1756f61` | ★★ **unmoved** |
| **world-off** | `744bec11644978bb` | ★ `744bec11644978bb` | ★★ **unmoved** |
| **camera** | `49d4358e47f202f9` | — | **MOVED → `0102dd2eab95b71f`** |
| **render** | `6ccfeadb3a86335c` | — | **MOVED → `ec817639269a8a4e`** |

★★ **The two world fingerprints were measured BEFORE a line was edited as well as after**, so
"unmoved" is against a verified baseline on this machine and not against the record alone. The camera
and render pair are EXPECTED to move: both instruments deliver a `cameraPlan` (`cameraPlanDelivery.mjs`),
so both see the cast — which is the whole subject of this commit.

★ **The camera and render values are the owner's to mint, not mine.** They are written down here so
that a later reader can tell a deliberate move from a drift, and `docs/fingerprints.json` is
untouched.


---

## 5 · THE GUARDS, AND EVERY FAILURE CLASSIFIED

VERIFY_PLACEHOLDER

---

## 6 · ★★ THE TWO TESTS, AND BOTH SABOTAGES

New file: **`client/src/modules/camera/comebackDetector.plannedOnly.test.js`**, seven cases in two
parts. It is a new file rather than cases appended to `comebackDetector.pursuer.test.js` because that
file stayed **green under both sabotages below** — it owns the pursuer, and neither of these defects
is about him.

| sabotage | what it does | ★ red | green |
|---|---|---|---|
| **S1 — the detector accepts the renamed role again** | widen the match at `:110` to `['comebacker', 'sovereign-lead'].includes(h.role)` | **cases 2, 3, 6** | 1, 4, 5, 7 |
| **S2 — the refusal is deleted** | restore `this._cast && this._cast.size > 0 ? this._cast : this._b1` | **cases 5, 6** | 1, 2, 3, 4, 7 |

★★ **Each fixture separates the sabotage from correct behaviour, which was checked rather than
assumed** — the brief's warning that *a test in this area has passed under its own sabotage before*:

- **Every part has a POSITIVE CONTROL.** Case 1 (a staged comebacker IS cast) and case 4 (the same
  climb, cast, IS offered) stay green under both sabotages. Without them, a detector that had stopped
  casting anybody — or a `best()` that had stopped returning anybody — would satisfy every negative
  assertion in the file while being completely broken.
- **Case 4 is what proves the case-5 fixture reaches the gates at all.** The two differ in exactly one
  argument: whether the plan casts racer 7. A null answer in case 5 is therefore caused by the cast
  being empty and not by a fixture that never qualified.
- **The fixture was strengthened after the first draft.** Racer 8 is an UNCAST racer with a bigger
  climb than the cast racer 7 — gain 7 against gain 4 — so he wins the `bestGain` contest outright
  whenever he is a candidate. Under S2 case 5 does not merely fail: **it returns racer 8**, verified
  by reading the failure (`expected { index: 8, … } to be null`). In the first draft the two gains
  were equal and the case would have passed for the wrong reason.
- **Case 7 is the discriminator for a weaker repair.** Somebody replacing the fall-back with a UNION
  of cast and `_b1` would pass cases 5 and 6 and fail only here.
- **Case 6 is the discriminator for a weaker refusal.** An implementation testing `_cast == null` but
  not `_cast.size` passes case 5 and fails here.

### ★ A DEFECT OF MINE, CAUGHT BY LOOKING FOR EXACTLY THIS

`comebackDetector.test.js`'s own fixture passed `plan: null`. Its first case — *"offers a racer who
gained enough positions"* — was therefore **passing through the `_b1` fall-back**, and after the
change it went red for a reason that has nothing to do with what it asserts. Worse, its neighbour
*"offers nobody when the gain is too small"* would have gone **green for the wrong reason**: with no
cast, `best()` refuses before it ever looks at the gain, and the case would have stopped testing its
own subject. **Both now cast their racer explicitly, with the reason written in place.** This is the
exact failure mode the brief warned about, found in the tree rather than in my new file.

---

## 7 · ★★ THE FIVE QUICK-TEST SEEDS

★ **These are NOT the measurement fixture's seeds, and that matters.** The fixture is 40 racers at
action stage `wild`; **Quick Test is 20 racers at `quiet`** (`defaults.js:47`) with the Quick-Test
roster — a different race through the same seed. These were therefore chosen from a separate two-arm
sweep at **Quick Test's own parameters**, ten tracks by seeds 1-40.

★ **Closed tracks only.** The driver takes the lap count from the track record exactly as Quick Test
does, so a CLOSED track reproduces; an OPEN track's duration comes from a computed
`trackDefaultSeconds` that this driver does not reproduce at its default 60 s. The five closed tracks
are city-circuit, dirt-oval, garden-path, ice-track and searound.

| | track / seed | on master | ★ on the branch |
|---|---|---|---|
| **A1** | **dirt-oval, seed 6** | racer **18** (drawn 1, `comebacker`) takes a COMEBACK_ZOOM at progress **0.638** | ★ he is `sovereign-lead`; **no comeback shot at all** |
| **A2** | **dirt-oval, seed 35** | racer **19** (drawn 1, `comebacker`) takes it at **0.631** | ★★ he is `sovereign-lead`, and the shot goes instead to the **STAGED comebacker, racer 14, at 0.686** — the planned comeback shown in place of the unplanned one |
| **B1** | **garden-path, seed 7** | **no comebacker is cast on either arm**; the camera nevertheless shoots racer **9**, whom the plan named in **no role at all**, at **0.692** | ★ **no comeback shot** |
| **B2** | **ice-track, seed 13** | **no comebacker cast on either arm**; shot on uncast racer **7** at **0.733** | ★ **no comeback shot** |
| **C** | **city-circuit, seed 1** — ★ THE CONTROL | staged comebacker racer **0**, one shot at **0.622** | ★★ **identical** — same cast, same subject, same shot at **0.622** |

★★ **B1 and B2 isolate the detector change on its own.** In both, the cast is byte-identical between
the arms — the rename contributes nothing there — so the only thing separating them is the removed
`_b1` fall-back. They are the two races that show what "with nothing cast, no shot" looks like.

★ **One honest limit.** The cast is a PLAN fact and is deterministic, so "no comebacker is cast" and
"no shot is possible" hold through any door. The MASTER half of A1 and A2 — that a shot fired at all,
and when — depends on frame timing, and this harness runs a fixed 60 Hz clock while the browser runs
on wall-clock. The moment may differ in the browser; whether a shot can happen at all cannot.

---

## 8 · SOURCE HYGIENE

### Lines, before and after

| file | before | after | delta | what it is |
|---|---|---|---|---|
| `client/src/modules/heroCurveGenerator.js` | 849 | 883 | **+34** | ★ **one line of code REMOVED** (the role ternary); the rest is the measurement that justifies the name |
| `client/src/modules/camera/comebackDetector.js` | 230 | 264 | **+34** | ★ **one line of code replaced by two**; the rest is the account of what the fall-back was doing |
| `client/src/modules/camera/comebackDetector.plannedOnly.test.js` | — | 150 | **+150** | new — see §6 |
| `client/src/modules/camera/comebackDetector.test.js` | | | +24 / −13 | its fixture repaired (§6) |
| `client/src/modules/camera/comebackDetector.pursuer.test.js` | | | +8 / −5 | comment only — what an empty cast now MEANS |
| `client/src/modules/camera/CameraDirector.js` | | | +7 / −4 | ★ comment only, and `engine-reach` says so in its own words |
| `client/src/modules/stagedComeback.test.js` | | | +5 / −3 | comment only — its vacuity guard matters more now |
| `client/src/screens/RaceScreen/GovernorDiagHUD.jsx` | | | +1 / −1 | comment only — a line citation |
| `scripts/diag/comeback-band.mjs` | | | +8 / −1 | comment only — its "unstaged" arm narrowed |
| `scripts/diag/comeback-beats.mjs` | | | +1 / −1 | comment only — a line citation |
| `docs/GLOSSARY.md` | | | +16 / −7 | the three role entries |
| `docs/CAMERA_DIRECTOR.md` | | | +1 / −1 | the `COMEBACK_ZOOM` row of the state table |

★★ **The whole behavioural change is TWO lines**: a ternary collapsed to a literal, and a fall-back
replaced by a refusal. Everything else is the reason, the tests and the documents.

### What was REMOVED

- `heroCurveGenerator.js` — the `const role = ...` binding. The local is gone, not merely unused; the
  literal goes straight into the call.
- `comebackDetector.js` — the `: this._b1` arm of the candidate expression, and with it the last place
  in the shipped camera where a comeback subject could come from anywhere but the cast.

### What was REUSED rather than written

| needed | already existed | used |
|---|---|---|
| a way to refuse early in `best()` | the `active` test at the top of the same method | ★ the same idiom, three lines below it |
| the set to refuse on | `_cast`, built by `setPlan` at `:110` | read directly; no second notion of who is cast |
| a name for the drawn winner | `'sovereign-lead'`, already emitted by the other arm of the same `if` | ★ **no new role string entered the tree** |
| a population test for the director | `isCast()` | kept and re-documented, not rewritten |
| the shot-and-cast measurement | `reports/night/breakaway-growth-data/comeback-shots.mjs` | its shape and its `racePlanController` reads, extended with a camera-state ledger |
| the test fixture shape | the `GATES` and `field()` pair in `comebackDetector.test.js` | ★ copied verbatim into the new file, with a note saying why, so three files cannot drift into testing different detectors |

### ★ WHAT WAS NOTICED AND DELIBERATELY LEFT ALONE

1. **`arrivalShape.test.js:8`** — its header lists property **(b)** as *"once he has arrived he is
   neither pushed nor braked inside his block"*, which its own property (c) two lines below and its
   own `(b)` test case both contradict. It is the same stale claim commit 2 is about, in a file
   commit 2 does not touch. **Left**: it is a one-line doc fix in a node test, and putting it here
   would mix two subjects.
2. **`docs/BACKLOG.md`, the closed story-layer entry** — it describes `_cast` as the *"primary"*
   comeback candidates, which implied a secondary that no longer exists, and cites
   `comebackDetector.js:64`, now `:110`. **Left**: it is a dated record of a closure decision, and the
   brief says not to rewrite the word inside past decisions.
3. **★ `isInertChange` cannot judge a `.jsx` file.** `engine-reach --check` counted
   `GovernorDiagHUD.jsx` among the paths that can change the race; asked directly, the tool answers
   *"a version could not be tokenized — cannot decide"* — acorn is called without a JSX plugin, so it
   declines rather than deciding, and the conservative answer is a hit. The actual diff there is
   `:688` changed to `:722` inside a comment. **Left**: a real blind spot in a guard, worth its own
   piece, and not one to repair inside a commit that guard is judging.
4. **`reports/night/INDEX.md` and the dated reports** still say the three write sites emit the
   identical string. **Left, on purpose**: reports here are append-only by this directory's own rule
   and record what was true on the day they were written.
5. **`.claude/settings.json` is modified in the working tree and is in NEITHER commit.** The change is
   two permission entries added by this session's own tool prompts, not by the work. Leaving the
   grants in place is the owner's business; carrying them into a feature branch is not.

### Headers and inline comments

Every source file touched keeps its header comment; the two behavioural sites each carry the reason,
the measurement and the address inline. The new block in `heroCurveGenerator.js` holds the four-row
comparison table from §1 in full, so the name can be checked against its evidence without leaving the
file.

---

## 9 · COMMIT 2 — THE TEST THAT CONTRADICTED HIS OWN DECISION

`client/e2e/arrival-shape.spec.js` asserted that a released hero is **left alone inside his block**.
That is the behaviour of BAND steering (`strictness = 0`, which commands exactly 1.0 anywhere in the
block), and band steering after arrival was deleted by **`17193be6` ARRIVAL-STEERED-AGAIN-1 at 17:07
on 2026-09-13 — fifteen hours after this spec was written**. That commit turned the node test
`arrivalShape.test.js` around to assert the opposite and did not touch the browser spec; the browser
suite is night work, so nothing ran it for six days. ARRIVAL-BRAKE-1 established all of that and
deliberately repaired nothing, because which of the two readings should stand was the owner's call.

★ **His decision is recorded at `racePlanner.js:1400-1409`, in the engine's own words:** *"AFTER HE
ARRIVES HE IS STEERED, like any other racer … `strictness` therefore stays at the hero's 1.0 and the
blend below is exact-rank steering."* The spec now asserts that.

### ★★ THE QUANTITY AND THE BAR ARE UNCHANGED — ONLY THE DIRECTION IS

```js
-  expect((braked + pushed) / mults.length, 'he must be left alone inside his block').toBeLessThan(0.5);
+  expect((braked + pushed) / mults.length, 'he must be STEERED inside his block …').toBeGreaterThan(0.5);
```

★ **NOTHING WAS LOOSENED, AND THAT WAS THE POINT.** The threshold was never the problem; the claim it
was pointed at was. A `< 0.9` bar would have turned a true statement about a real disagreement into a
green line, which is exactly what ARRIVAL-BRAKE-1 refused to write.

★ **0.5 is on the right side of the measurement rather than chosen to fit it.** ARRIVAL-BRAKE-1
measured this fixture at **0.890 with `gapBrakeEnabled` on and 0.812 with it off**. Both readings are
far above the bar in the new direction and far above it in the old one, so a single measurement
decides between the two claims — it is one bar, not two.

### ★ NO NEW CLAIM WAS INVENTED, so the assertion did not have to be deleted

"The multiplier is not 1.0 on most in-block frames" is precisely "he is not on band steering", which
is the ONE thing `17193be6` changed. The node test asserts the same design at unit level — arrived
and leading, the commanded multiplier is below 1.0 — and this is that statement in a real browser
over a real race, which is what the file's header says it exists for.

**What the spec still proves, kept untouched:** the variant is live and he is released and climbs
(`expect(best).toBeLessThan(atRelease)`), and the shape was actually exercised
(`expect(mults.length).toBeGreaterThan(5)`).

### ★★ THE TWO PLACES THAT CARRIED THE SAME REVERSED CLAIM

Correcting the assertion alone would have left the file arguing with itself in two more places:

1. **The file header** said it asserts *"he is not braked for leading once he is inside his block"*.
2. ★★ **The test's own TITLE** said the shape *"leaves him unsteered in his block"*. **A test name is
   an assertion that travels** — it is what gets quoted in run transcripts, reports and commit
   messages by people who never open the file, and `reports/night/prod-browser-data/*.txt` and
   `PROD-BROWSER-1.md` both quote this one. That is how the contradiction survived six days. It now
   reads *"…and steers him back toward his drawn place inside his block"*.

★ **The quotations of the OLD name in `reports/` are left exactly as they are** — verbatim run
transcripts and dated diagnosis, append-only by this directory's rule, and correct about the day they
were written.

### THE RUN

`npx playwright test e2e/arrival-shape.spec.js`, the dev arm:

```
[arrival-shape] racer 0, drawn 4:
  rank when he is handed back: 8
  rank when the taper starts:  8
  pace when he reaches his place: 1.0324 — ON SCREEN 28 px/s of closing speed (untapered 1.100 is 85) (at progress 0.722)
  after arriving: best rank 1, worst rank 4, so he HELD his block
  while inside his block: 1871 frames, braked in 70%, pushed in 19%

  2 passed (2.5m)
```

★★ **1871 frames, 70% braked and 19% pushed — 0.89 against the 0.5 bar**, reproducing
ARRIVAL-BRAKE-1's headless 0.890 on this fixture to the digit from inside a real browser. ★ And
*"braked in 70%"* is the spec's own original comment — *"braking him for leading in about seven
frames in ten"* — which was **current and correct all along**. The comment was never the problem. The
assertion beneath it was.

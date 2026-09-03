# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** after piece 8. **THE CHAIN IS FINISHED — all eight pieces merged and pushed.**
Master is green after each. **Full-weight `verify --base=807b9171` on the finished master: PASS 21,
FAIL 0, SKIP 5**, including both suites, all four fingerprints, `check-runin-frame`, `check-tags` and
`check-ending-frame`. **17 commits, 8 merges, ZERO touching `docs/fingerprints.json`.** One branch
locally and at origin, zero worktree stubs, clean tree. **The previous chain (ENFORCE THE HYGIENE) is finished — all ten
pieces merged and pushed.** This chain is running; every piece is marked below.

---

## ★★ READ THIS FIRST — I FIRED THE GUN I HAD JUST DOCUMENTED

**Nothing is broken. Every affected file is byte-identical to HEAD and it was proved, not assumed.**

While writing up piece 2's finding that `crop-sprite-sheets.mjs` would destroy artwork if re-run, I
put backticks inside a double-quoted shell string. The shell treated them as a command and **ran
`node scripts/crop-sprite-sheets.mjs`.** It overwrote **nine tracked artwork files** —
`horse-trot`, `giraffe-walk`, `snake-crawl`, `rocket-fly`, `motorbike-walk`, `motorbike-walk-mask`,
`luge-slide`, `beetle`, `boarder-sprite` — before throwing `extract_area: bad extract area` on a
later entry.

**Restored with `git checkout --` and verified:** `git diff HEAD -- client/public/assets/` is empty,
and the PNG headers read back at their correct sizes (horse 1200×150, luge 2048×128, and so on).

**Two things this changes.**

1. **The hazard is no longer an argument, it is an observation.** And it is worse than piece 2's
   report described: for each sheet it corrupted it printed
   **`Verification: OK — no border clipping`**. It reports success while doing the damage, and it
   only stopped because a later entry's arithmetic went out of bounds.
2. **The mitigation I chose — a warning comment at the head of the table — is not enough**, and I am
   the proof. **This is the first item needing your word, below.** I did not change the script's
   behaviour unattended: two of the options are deletions and the others are new mechanisms.
3. **★ NOTHING WOULD HAVE GONE RED.** No guard declares `client/public/`; the five client tests that
   mention `assets/racers` all assert a URL *string*; the render fingerprint's own blind list says
   node has no `Image` so the sprite blit never happens. **A spritesheet is a race input with no
   machine-readable other side in this tree** — checked by hand twice and by no guard ever. That is
   the same shape as every defect this week has been about, one directory over.

---

## ★ THE THREE NUMBERS

### 1. How many controls could not represent their shipped value?

**ONE — the one you named, and no others.**

| | |
| --- | --- |
| Dev Screen controls resolved and checked | **96** |
| **could not represent their shipped value** | **1** — `choreoOutcomeStart` |
| needed a JUDGEMENT rather than a widening | **0** |
| not resolvable (printed every run, never counted as coverage) | 18 |

**Fixed, and the shipped value did not move.** `choreoOutcomeStart` is still `0.6`. The widget's
ceiling went 0.55 → **0.60**, its label to "(0.25–0.60)", its tip to "0.6 = shipped".

**The bound was not mine to choose — it was already written down three times.**
`DEVSCREEN-INVENTORY.md`, `PHASE-CONTRACT.md` and `defaults.js` all record the VALIDATED range as
**[0.25, 0.60]**. The widget stopped at 0.55, which is 0.05 short — **exactly one step, and exactly
where the shipped value lives.** The sibling control in the same card, `racePlanPulkStart`, already
keeps widget clamp == validated range [0.10, 0.60].

**It now sits at the top of its range with no headroom, and that is honest rather than comfortable.**
0.60 is where the measurement stops. Going higher needs a fairness run first — **your call, below.**

### 2. Is Rule A green without an exception list after the rename?

**YES — and it GATES.** 12 registry literals over 20 racer types and 22 discovered fields,
**0 disagree, no exception list, nothing told to look away.** It fails the build from today.

`crop-sprite-sheets.mjs`'s `frameWidth`/`frameHeight` are now
`preCropFrameWidth`/`preCropFrameHeight`. Rule A no longer DISCOVERS them — because the distinction
now exists in the tree, not because it was excepted.

**`frameCount` deliberately kept its live name.** Cropping does not change how many frames a sheet
has, so it is the SAME fact as the registry's and still agrees on all twelve entries. That is also
how you can tell the rule went **green** rather than **quiet**: it still finds twelve literals in
that file and still checks them.

**R18 is written**, in `docs/VERIFY-RULES.md` where project rules live: *a record of a past value
must not wear the live field's name.* The sentence that matters is why the discriminator has to live
in the source and not in the checker — every attempt to write it down *beside* the value reproduces
the defect one level up.

### 3. Piece 7's second-site rate over the larger sample

**36% before 2026-08-26, 0% after — and the number you were given had no "before" in it.**

SECOND-SITES-1 says the INDEX corrections block *"holds 9 entries"* and that its six-entry sweep was
*"a complete sweep of the block"*. **Counted at its own commit: 19.** The six it took are the six most
recent, **all dated 2026-08-31 or later** — so its "earlier sample" was its later one, and **every
correction inside the 52% was made after the practice change it was meant to test.**

| population | n | with a live second site | rate |
| --- | --- | --- | --- |
| INDEX-block corrections **before 2026-08-26** | 11 | 4 | **36%** |
| INDEX-block corrections **2026-08-31 and later** | 6 | 0 | **0%** |
| the applied DOC-TRUTH set (all 2026-09-02) | 15 | 11 | 73% |
| **honest combined** | **32** | **15** | **47%** |

**The direction is what you hoped for and I would not bank it yet:** n is 6 and 11; age is confounded
with practice (a two-day-old correction has had two days to acquire a second site); and the two groups
are different KINDS — the 73% set are document corrections, the INDEX-block entries correct a number
in an append-only report. **The 52% averaged them.**

**★ And all four earlier hits are in the SAME FILE as the correction that withdraws them.**
`reports/evolution/INDEX.md` states *"7 of 12 names collide"*, *"0 of 8 non-exempt names overlap"*,
*"still yields zero names"* and *"the camera moves 0.1 world px at the gun"* as present-tense fact in
its report summaries — thousands of lines below the corrections block that withdraws each one.
**SECOND-SITES-1 searched living documents and code and never looked in the lab journal's own map.**

**Five of five of its own filed second sites are still live a day later** — it was read-only, so that
is a control, not a criticism. The clearest of them: `VERIFY-RULES.md` says the browser suite is
"103/103 green" and `NIGHT-RUN.md` says it is 106, and neither knows about the other.

---

## ★ PIECE 3 — THE REMAINDER WAS SEVEN TIMES BIGGER THAN "TWO"

**15 non-drift corrections applied**, each verified at the tree, in nine documents and one source
file. The brief said "~54 are drift and 2 are not"; counted individually the non-drift half is
**fifteen** — including `ROADMAP.md`'s reason for existing (it says **eleven** documents link to it;
it is **five files, seven links, and exactly ONE is a report** — the report that filed the finding),
`ARCHITECTURE`'s `stateRatio` (**a symbol that occurs nowhere**), five `CAMERA_DIRECTOR`
call-signature claims, and a `SWEEP-HARNESS` paragraph that is **exactly inverted** — it warns that a
fix is missing which landed five weeks ago.

**★ ONE DEAD TAG WAS STANDING IN EIGHT LIVING DOCUMENTS**, and the sweep needed **three passes** to
find them all: each repair revealed sites the previous grep was not shaped to see. Tag
`pre/dead-mechanisms-cleanup` was named as the recovery route for deleted code in `SIM.md` (×2),
`SWEEP-HARNESS`, `BACKLOG` (×2), `DEVSCREEN-INVENTORY`, `LESSONS` and `ARCHITECTURE`. **It does not
exist** — 123 tags and none is that one. All eight now name commit `0555f9d`, which is reachable.

**★ THE 54 LINE CITATIONS WERE LEFT, AND THE REASON IS MEASURED.** Of 250 citations in `docs/*.md`,
**137 (55%) name no identifier at all**, so there is nothing to re-derive from; 31 name a bare
`index.jsx`, which is four different files; and where a symbol IS named it occurs 2–12 times in the
cited file. `getPhase`'s first hit in `racePlanner.js` is a **comment** at :165 while the definition
is at :524 — a mechanical rewrite would move a citation from one wrong line to a different wrong one.
**Exactly ONE was repaired**: `branding.md` cited `storage.js:158` in a 148-line file, which is the
only class a machine can call wrong today.

**★ AND FOUR FALSE NUMBERS ON THE OPERATOR'S SCREEN, from piece 5's census, fixed here.** The
gap-reroll card's three tooltips carried **G=0.75 and strength=0.5** — the values of the 2026-07-23
retune that you FLIPPED on 2026-07-26 to G=0.5 / strength=1.0. One of them also described the
opposite trade-off from the one the confirm gate found. **39 days stale, on the card an operator
reads while judging the mechanism.** Piece 5 is read-only and found them; piece 3 is the fix-piece
and applied them.

---

## ★ PIECE 8 — THE PUBLISH PATH IS SOUND; WHAT IT OMITTED WAS THREE PREREQUISITES

**21 claims checked at the tree — 17 true, 4 corrected. No document restructured, neither manual step
closed.** A stranger following the README from a clean clone reaches a running install; what they
were not told was what to install first.

1. **`npm run verify` needs a ROOT `npm install`, and `SETUP.md` never said so.** The root declares
   `acorn`, and `check-fingerprint-payload.mjs` PARSES the payload literal — without it that guard
   **fails rather than skips**. **CI has carried a step called "Install the parser the payload guard
   needs" all along**: the instruction existed in the workflow and not in the document a person reads.
2. **The README's project tree omitted `shared/`** — the directory holding the one module both halves
   import, and the reason the Docker build context is the repository root at all.
3. **It called CI "lint → test → audit". It is three jobs**, and the unmentioned one runs every guard
   this repository has.
4. **Neither entry point named `docker-compose.override.yml`**, which a fresh clone does not have.
   Everything works without it and the server says so — but *optional with a consequence* (you sign in
   again after every restart) **is a step, not an omission**.

**Also: the README handed a stranger `npm` and `docker compose` without naming Node 20+ and Docker.**

**Both manual steps are stated and neither is closed** — build the client before building the image,
and set `VITE_API_URL` for a real deployment. `VITE_API_URL` is deliberately absent from the two
LOCAL-install documents, which is correct: their reader must not set it.

**One confirmation worth the ink:** `raceActionStage` ships `quiet` at `defaults.js:40` — a line
citation still exactly true, on the night 54 others were found stale.

---

## ★ PIECE 6 — RULE A COVERS ONE GROUP OF TWELVE, AND ITS LIVE POPULATION IS TWELVE NUMBERS

**You were told four of six subtypes are catchable. This is the footnote you should have before
treating the class as closed.**

| | |
| --- | --- |
| Rule A's DOMAIN | **423 facts** — 20 racer types × 22 discovered fields, all scalar |
| its LIVE POPULATION today | **12** — twelve `frameCount` literals, one file, all agreeing |
| duplicated-fact groups it covers | **1 of 12 in full, plus HALF of a second** |

**Why the population is twelve: REGISTRY-LITERALS-1 removed the 214 copies before Rule A was built.**
`sim-fairness.mjs` and `goldenRunner.mjs` now call `racerFacts(id)` — they READ the registry. So Rule
A is a guard against RECURRENCE over an almost-empty population, and it has objected exactly twice in
its life: to the pre-crop table, and to sabotage I wrote to test it.

**★ The half it does not cover is the sharper half.** Group A2 is spritesheet frame geometry, and
**its source of truth is the PNG file.** Rule A checks copies against the REGISTRY. Nothing checks the
registry against the artwork — no guard declares `client/public/`, no test reads a spritesheet's
bytes, and the render fingerprint cannot blit a sprite in node. **That agreement has been verified by
hand twice and by a machine never**, which is also why tonight's accidental crop run would have
passed every check.

**Bounded inside the registry, open-ended outside it.** Inside: 423 facts and six enumerable blind
SHAPES. Outside: the uncovered set is "every duplicated fact whose home is not the racer registry",
and **nothing enumerates the homes** — the twelve groups were found by hand.

---

## ★ PIECE 5 — THE CLASS IS SIX, AND ONE CARD CAUSES ALL OF IT

Piece 1 asked how many controls could not REPRESENT their shipped value and the honest answer was
one. **That was the smallest of the four kinds a control claims about its value.**

| what the control claims | measured | false |
| --- | --- | --- |
| its BOUNDS contain the shipped value | 96 controls | **1** *(fixed, piece 1)* |
| its STEP can REACH the shipped value | 96 controls | **3** |
| its LABEL's stated range matches min/max | only 6 labels state one | **0** |
| its TOOLTIP names the shipped value | 22 pairable claims | **2** *(4 more fixed, piece 3)* |

**★ Every one of the six is in the same card.** `CameraAdvancedSection` interpolates the live value
in **24** of its tooltips and carries **zero** false claims. `DynamicsTuningSection` interpolates in
**zero** and carries **all six**. **A tooltip that reads the value it describes cannot drift** — one
card already does it, so the fix for that kind is to interpolate, not to check.

**Still false tonight, not fixed (this piece is read-only):** two tooltips say **"Default: 67%"**
where the keys ship **0.75** and **0.55**. The second is wrong twice — `racePlanCorridorStart` is
**overwritten at plan build** and never reaches a live race, so its tip names a wrong number for a
key that does nothing.

**And three controls ship a value that is off their own STEP GRID** — `maxLateralSpeedPerStep` ships
0.028 on a 0.005 grid starting at 0.005. One arrow-click lands on 0.025 or 0.030 and **cannot get
back to 0.028 by stepping.** That is piece 1's defect one level subtler, and Rule C declares itself
blind to exactly it.

---

## ★★ PIECE 4 — AN INSTRUMENT PRINTS A SENTENCE BESIDE THE NUMBER THAT REFUTES IT

Run `node scripts/camera-fingerprint.mjs` and read the last four lines of its output together:

    garden-path      a7d57478...   4916 frames  (300 after the last crossing)
    ...
    THE ENDING IS IN THIS HASH — 10 of 10 tracks contributed FINISHED frames.
    garden-path does not finish inside the 200 s ceiling, so it has no ending to sample.

**The first two are computed. The third is a hardcoded string, printed unconditionally.** It is
false, it is printed on every non-quiet run, and it sits two lines under the number that refutes it.
**This is the week's defect in its purest form and it is not in a document.**

**It is also load-bearing.** That sentence is the stated REASON the instrument's gate is "at least
ONE track produced a FINISHED frame" rather than "every track". With the premise dead, the tree
supports the stronger gate — which is the difference between noticing that a track stopped reaching
its ending and not noticing.

**Where the premise came from:** `d73ec6a9` (2026-08-25) changed garden-path's default racer
**snail → beetle** AND its default laps **4 → 2** in one commit. That single change killed BOTH
premises of `client/e2e/garden-path-finishes.spec.js` — its assertion now runs backwards, and its
own comment about "the track's own default is 4 laps" against a harness that hardcodes 2 describes a
mismatch that no longer exists.

**Three live sites of one dead premise. Nothing was applied** — the piece asked for the answer, not
the edit. The spec should be **deleted, not rewritten**; the replacement assertion belongs over all
ten tracks in `scripts/raceDriver.test.mjs`, which runs on every verify instead of when somebody
remembers.

**And the half that was INERT is not inert any more.** FP-COMPARE-2 gave all three fingerprint
instruments `--check` through one shared implementation on 2026-09-02. Piece 4 re-establishes that
rather than re-discovering it, and says so plainly.

---

## ★ THE FINDING PIECE 1 DID NOT GO LOOKING FOR

**The obvious version of that sweep — compare the STORED default against `min`/`max` — reports SIX
violations, and FIVE of them are false.**

| control | ships | its box shows | bounds |
| --- | --- | --- | --- |
| `racePlanBonusTransitionEnd` | 0.75 | **75** (× 100, "% race") | 30 – 95 |
| `racePlanCorridorStart` | 0.55 | **55** | 50 – 100 |
| `racePlanCorridorEnd` | 1.0 | **100** | 50 – 100 |
| `nameTagFrameFrac` | 0.022 | **2.2** (× 1000 / 10, "% of frame") | 1 – 5 |
| `nameTagAllUntilMs` | 8000 | **8** (/ 1000, seconds) | 0 – 30 |

**A control's bounds are a claim about the number it DISPLAYS, not the one it stores.** A guard that
cries wolf five times out of six gets turned off and takes the one real finding with it. Rule C
evaluates the value expression with the shipped default substituted in, and a test pins that.

---

## ★ TWO OLDER FOSSILS, NINE LIVE SITES BETWEEN THEM

**"`pulkStart` is 0.25" was standing at eight sites:** three code comments in `racePlanner.js`, one in
`defaults.js`, one in `sim-fairness.mjs`, three in `PHASE-CONTRACT.md`. **The root site is the worst
kind** — `PHASE-CONTRACT.md` did not merely quote a stale number, it *warned the reader* that the
shipped value differs from a "fallback literal 0.25". There is no literal:
`DEFAULT_PHASE_FRACTIONS.pulkStart` READS the config key. A correction written to protect against
drift had itself drifted.

**A ninth, same shape, one file over:** `camera/framingConfig.js` calls its
`DEFAULT_MIN_RACERS_VISIBLE` *"deliberately a literal rather than an import"* — **two lines above the
import** — and points at a file that no longer carries that wording. `719f6c51` converted 259
fallbacks to read the default and did not touch the paragraph explaining why they were copies.

**Every repair names the home instead of restating the number**, so the same sentence cannot rot
again.

---

## ★ WHAT IS ACTUALLY LEFT — SIX ITEMS, TWO OF WHICH REMOVE A FAULT CLASS

Built after the chain from this sheet and the backlog, **every item re-verified at the tree**. The
list is short and that is the answer; **no third class-removing item was invented.** Full reasoning in
[WHATS-LEFT-1](../reports/evolution/WHATS-LEFT-1.md).

1. **A rule comparing the racer registry to the PNG artwork** — the only item covering something
   covered by NOTHING, and the exposure was demonstrated tonight rather than argued. **Precondition
   measured: 20 agree, 0 disagree, 0 unresolvable.** It lands green with no exception list, inside a
   guard that already loads the registry.
2. **Interpolate `DynamicsTuningSection`'s tooltip values** — removes the producer, not the products.
   That card interpolates in **0** tooltips and carries **all six** of tonight's false claims; the
   camera card interpolates in **24** and carries none.
3. **The seven live second sites this chain filed and did not fix**, with line numbers — because the
   measured failure is that a filed second site stays standing.
4. Four withdrawn claims in `reports/evolution/INDEX.md`'s own report summaries.
5. Three open BACKLOG checkboxes whose own verdict already says ALREADY DONE.
6. One false sentence `camera-fingerprint.mjs` prints on every run.

**Seven more are NOT on that list because they need your word** — they are the section below.

---

## ★ WHAT NEEDS YOUR WORD

1. **`crop-sprite-sheets.mjs` — what happens to the spent list.** Its twelve entries describe sheets
   that no longer exist in that form; the tool overwrites in place; it prints "Verification: OK"
   while corrupting; and it is one stray command away at all times, as tonight demonstrated.
   Options: **delete the twelve entries** (git holds them, and `BACKLOG.md`'s 2026-06-03 row records
   every transition), **delete the script**, **add a refusal** that compares the PNG's actual frame
   width against `preCropFrameWidth` before touching anything, or — **the one I would pick** — a rule
   inside `check-fallback-agreement` (which already loads the racer registry) comparing every racer
   type's `frameWidth × frameCount` against its PNG's header. That one catches a corrupted sheet
   *however* it got corrupted, not just this script's way, and it closes the hole in item 3 above.
   It is a piece of its own and was not built tonight.

2. **Whether `choreoOutcomeStart` should be tunable above 0.60.** It now reaches the top of its
   validated range and stops there. Nothing above 0.60 has ever been measured.

3. **A backlog entry that should probably close, on evidence nobody had.**
   `BACKLOG.md`'s open *"Garden Path does not finish"* was re-verdicted **STILL TRUE** yesterday, on
   the evidence of the stale `camera-fingerprint.mjs` comment above. Its own closing note says
   *"no race was run for it"*. **One was run tonight: 300 frames after the last crossing on
   garden-path.** Closing a backlog entry is a verdict, so it was not taken.

4. **The camera fingerprint's gate, and the sentence under it.** Its printed line
   *"garden-path does not finish inside the 200 s ceiling"* is false and unconditional, and it is
   the reason its gate is "at least ONE track" rather than "every track". Deleting the sentence is
   trivial; **tightening the gate changes when the build goes red**, and that is yours. The
   measurement is in the piece 4 report.

5. **Still waiting from last night:** the `renderedBodyH` test's tolerance — titled ±5%, asserting
   0.05 px absolute (33× tighter), with `buggy` passing by floating-point dust. Both false statements
   are corrected; choosing the tolerance is yours.

---

## WHERE EVERY PIECE STANDS

| # | piece | state |
| --- | --- | --- |
| 1 | The slider that cannot show its own value | **DONE** — 1 of 96, fixed; Rule C built inside `check-config-keys` |
| 2 | Rename the pre-crop fields | **DONE** — Rule A gates, empty exception list; R18 written |
| 3 | The fifty-six remaining corrections | **DONE** — 15 non-drift applied, 1 line citation, 54 deliberately left |
| 4 | The inert guard half and the rotten spec | **DONE** — read-only; the inert half is repaired, the dead premise has THREE live sites |
| 5 | Where else does a control disagree with what ships? | **DONE** — read-only; the class is **SIX**, not one |
| 6 | What Rule A cannot see | **DONE** — read-only; it covers **1 of 12** groups, live population **12** |
| 7 | The second-site rate, as a baseline | **DONE** — read-only; the baseline had no "before"; **36% → 0%**, combined **47%** |
| 8 | The publish documentation | **DONE** — 21 claims checked, **17 true, 4 corrected**; neither manual step closed |

---

## ONE LIMIT, STATED PLAINLY

**Rule A gates on one file's worth of evidence.** It has objected exactly twice in its life: to the
pre-crop table, and to sabotage I wrote. On the live tree it has never found a real drifted copy —
because REGISTRY-LITERALS-1 had already removed them all. **It is a guard against recurrence, not a
detector with a track record**, and the first real thing it catches will be its first.

**And "96 controls checked" is not "96 controls correct".** Rule C asks one question. A control's
label, step and tooltip are claims about the same number; **piece 5 measures that class**, and its
first pass already shows the bounds question was the cleanest of the four.

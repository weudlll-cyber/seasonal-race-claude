# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-09-04, after the fifteenth and last piece. **Everything is merged.** Both
branches you were judging are in master and cleared from origin; origin holds `master` and nothing
else. Master green after every merge, step 12 done each time, clean tree.

---

## ★★ THE FOUR NUMBERS, IN YOUR ORDER

| | |
| --- | --- |
| **the second-site rate over the new work** | **3 of 32 — 9.4%**, against 47% historically and a 0% that was measured over SIX |
| **new copies three days of building created** | **2 harmful**, both mine from last night, plus 1 tolerated |
| **new guards that can actually fire** | **8 of 9.** The ninth could not be sabotaged safely and has field evidence instead |
| **claims written in the last three days already false** | **3.** All counts. Median age under a day. All corrected |

**THIS AUDITS WHAT CAN BE FOUND BY LOOKING. It does not prove there is nothing else** — the same
statement the census carried, and it is not modesty: every number above is what one method found in
one night, and §"what the numbers do not cover" at the foot of each report says where its method
stops.

---

## ★★ THE ONE THING THAT IS NOT ZERO, AND IT IS THE HEADLINE

**The second-site rate is 9.4%, not 0%. The sweep is being PERFORMED and is still missing things** —
which is a different problem from forgetting to sweep, and a harder one.

Three corrections made under the constraints left a live second site. **None was forgotten. Each was
missed for a reason about the SHAPE OF THE SEARCH:**

| | why the sweep missed it |
| --- | --- |
| `AUDIT.md` stated a config key that **occurs nowhere in the tree** | **nobody thinks to open it.** It reads as history, not as a spec |
| `ARCHITECTURE.md` said `smoothDt` feeds the **camera lerp** — the camera has been fed `rawDt` since June | **the token is legitimate 30+ times over.** A grep for the name drowns the one wrong use. It had ALREADY been contradicted in `CAMERA_DIRECTOR.md` and in a source comment, and stood anyway |
| `TRACK_LIFECYCLE.md`'s own diagram showed a file that **does not exist** as a live fallback | **it is a PICTURE.** An ASCII diagram is prose to a human and noise to a search for a sentence |

**All three corrected.** And **no rule at any earlier moment would have caught them** — a rule at the
keystroke is the same grep run sooner. What would help is a better SEARCH, not an earlier one, and
that is a habit with a checklist rather than a mechanism (`BUILD-TIME-RULES-1` §2).

---

## ★ THE TWO COPIES, AND WHY THEY ARE THE UNCOMFORTABLE FINDING

Constraint 3 — *invent no redundancy* — has been in every brief since 2026-09-01. **It was broken
twice, both times last night, both times inside the new work.**

1. **A guard that hardcodes a count it computes.** Rule F prints its own split on every run; the same
   numbers were hand-written into the guard's own `blind[]` **and** into VERIFY-RULES R19. **By the
   time the audit ran the true figure had already moved — because R19's own worked example added a
   citation.** The document that stated the count changed the count by being written.
2. **A test that hardcodes what it tests.** The board-portrait test declared its own copies of the
   column's four constants — so narrowing the column in the module would have left it **green while
   asserting the portraits fit a column that no longer exists.** The exact defect the test was written
   to prevent, reintroduced by the test.

**Both were built by someone who had written constraint 3 into two reports the same night.** Knowing
the rule is not the failure mode. **Applying it to the artefact you are currently building is** — and
I have no proposal for that.

---

## WHAT YOU STILL OWE A DECISION ON

**A. THE CLIENT SHIPS FIVE PICTURES THAT ARE NOT THE ONES ON SCREEN.**
`client/public/assets/tracks/backgrounds/` holds six images, 21.3 MB, and **all six share a name with
a seed background.** Measured at the pixels: **five are DIFFERENT PHOTOGRAPHS** (mean |diff| 30–63 of
255 — no re-encode does that), and two of those share a name **and** a format. The sixth,
`Mountainstreet.jpg`, is **byte-identical** to `mountainstreet.jpg` — 9.32 MB stored twice, differing
only in a capital, which is the same name to the OS and a different name to git.
**Nothing loads any of them**: the client fetches `/api/tracks/<id>/background` from the server, and
the only reference to the public path is a doc-comment example. **So the divergence is not live and
the 21.3 MB is dead weight in the bundle.** Which picture should appear where is a picture question
and it is yours. Nothing was reconciled.

**B. WHAT THE PRE-MERGE GATE RUNS.** `viewer-invariants` excludes garden-path from the gate's
scorable items on the ground that its race never finishes at seed 9. **That is false, measured on
that harness**: one race, 255 s, a full acceptance sheet — it reaches PHOTO_FINISH with the winner on
canvas and **IS graded, passing ten of twelve and FAILING TWO** (winner cut; walk). **So excluding it
does not cost nothing**, which is what the line claimed. **What the gate runs decides what reddens a
build and it is yours.** The nightly sweep still runs all ten, so those two failures are visible a
day later rather than never.

**C. THE OVER-CAPACITY BEHAVIOUR IS DECIDED AND BUILT** — a group that does not fit is refused whole,
with numbers and never names. Two things came out of building it and are yours:
**Quick Test is not covered** (it builds its own roster capped at 100 regardless of the track, so a
Quick Test at N=60 on a closed track still starts), and **the four maxima were three different limits
and one dead key**, now named for what each governs.

**D. A STORED 0.65 STILL LOADS.** The slider is back to 0.60 and the shipped value never moved, but
the LOADER still tolerates up to 0.70 **deliberately** — the slider stood at 0.70 for a day, and that
validator discards the WHOLE config on any rejection, so tightening it would cost an operator every
other tuning to correct one key they can no longer set. A stored 0.65 clamps the first time the
slider is touched. **No migration, by standing rule.**

**E. AN INSTRUMENT THAT HANGS INSTEAD OF FAILING.** The browser sweep's first run hung fifteen minutes
with no output: `client/dist-sweep` empty, nothing on its app port. The build it spawns is
`stdio: "ignore"`, so a build that produces nothing leaves **no trace at all**. Run by hand the same
build succeeds in 873 ms. **A hang looks like patience.** Filed, not fixed — it is a gating instrument.

---

## WHAT THE FIFTEEN PIECES DID

**PART A — the open work, and the only mint.**

| | | |
| --- | --- | --- |
| A1 | the board fix merged, **render MINTED** on your acceptance | world, world-off and camera re-measured on the MERGED tree and unmoved; `client/` proved byte-identical to the build you judged |
| A2 | a group that does not fit is **refused whole** | and the picker could not guard the only door — **two routes reach an over-cap field** without misusing a control, so Start checks too |
| A3 | player groups merged | A1 was brought INTO the branch first, so the combination was verified on the tree master would receive |
| A4 | the garden-path spec trimmed to one claim | 77 → 60 lines, and **the sweep's exclusion was refuted by running the race** |
| A5 | the slider bound back to **0.60** | with the missing line at the bound: *the top is the edge of what has been MEASURED, not a limit of the mechanism* |
| A6 | **61 citations converted to the paired form** | and **Rule F now checks the PAIR** — the symbol must be at the line the link points to, which closes its own declared blind spot |

**PART B — hygiene under correction authority.** B1 found its rule already existed (Rule D) and said
so rather than building a second; B2 watched the backgrounds and found the collision above; B3
established the four maxima and removed the dead key.

**PART C — did the constraints hold?** The four numbers, and three reports that answer *no, partly*
honestly: the rate is not zero, the copies were created under the rule, and the sabotages that test
the guards had bugs of their own.

---

## ★ THE THING I GOT WRONG TWICE, WORTH ONE LINE

**A check that verifies a check needs verifying too.** A6's first wiring test passed a sabotage that
had reverted the whole feature; C3's first sabotage batch reported two WORKING rules as inert. Both
were caught by reading what the guard PRINTED rather than its exit code. **Neither would have been
caught by running it again.**

---

## ★★ DOES THE ARTWORK GUARD CATCH ITS FOUNDING INCIDENT? — YES, AND IT NAMED ALL NINE FILES

**Reproduced faithfully, on COPIES, with the repository's own artwork never touched.** The deleted
crop tool was recovered from its archive tag, run over copies of all 31 sheets, and it behaved exactly
as it did on 2026-09-03 — `Verification: OK` and all.

| step | result |
| --- | --- |
| the guard against the corrupted copies | **exit 1**, naming **all nine** files the accident hit, each with its recorded and its measured digest |
| restore | **exit 0** |
| the real tree, throughout | **exit 0** |

**★ AND THE FINDING THAT DECIDED THE SHAPE.** The obvious cheap rule — registry frame size against
the PNG header — **would NOT have caught it**:

    scratch horse BEFORE: 1200x150   sha 223ee39c748dba50…
    scratch horse AFTER : 1200x150   sha 02be933d520abbe8…

**Same dimensions. Different pixels.** The bad run re-cropped an already-cropped sheet to the same
target size. Only a digest sees this, which is why the rule is a digest.

**Re-recording a legitimate artwork change is one command** — `node scripts/check-seed-versions.mjs
--record-artwork` — named in the failure message and asserted by a test, because a tripwire whose
reset is harder than deleting the tripwire gets deleted within a month.

**★ AND A CORRECTION I OWE YOU.** I told you *"nothing watches the artwork"*. **That is wrong about
the larger half.** What I actually verified was that no guard DECLARES `client/public/`; I then
generalised it. **`server/seeds/backgrounds/` — 10 files, 51.6 MB — has been covered all along** by
the seed version rule. The `client/public/` hole was real and is what the accident hit; the word
"nothing" was not.

**Still unwatched, named and costed rather than extended:** 6 files / 21.3 MB of client-side track
backgrounds (33 ms to digest — but four of the six share a name with a seed background in a different
format, and **whether they are the same pictures is a question nobody has asked**), and the two
favicons. **There are no fonts and no sounds** — measured, not assumed.

---

## ★★ WHAT IS PIECE 10 WAITING FOR? — YOUR EYE, AND NOTHING ELSE

**It is built, it is green, and it is not merged.** `feat/player-groups-1`, served on **4173** as a
production build with the API on 4000.

| the gate | result |
| --- | --- |
| all four fingerprints against the record | **all four MATCH.** The values are not restated here — `docs/fingerprints.json` is their one home |
| the full client suite | **4,391 / 4,391**, 27 of them new |
| `verify --base=master` | **PASS 12 FAIL 0 SKIP 14** |
| minted | **nothing, and nothing needed to be** |

**WHAT IT DOES.** Saved player groups already existed — on the server, managed from the Dev Screen —
but **only ONE could ever reach a race**, through a one-shot hand-off key. Running two groups against
each other meant retyping one. Now the Players tab opens with a chip per group, **any number can be
in the field at once**, and anything you type by hand runs under **“All”** and is untouched by every
group operation. The start bar says *(Reds 2 + Blues 2)*.

**THE MINIMUM FIELD SIZE, which the brief said to establish first or stop: it is ONE.** Three
expressions, all agreeing — `canStart`'s `players.length > 0`, the RaceScreen's empty-roster throw,
and the server's non-empty rule. A test pins it so this feature cannot quietly raise it. *(The
MAXIMA disagree across four files — 40/100, a dead 20, a server 200, and the track's own SOFT
`maxRacers`. Named, not reconciled; it is a real question and not this piece's.)*

★ **THE ENGINE-REACH ADVISORY FIRED AND WAS RIGHT TO.** `RandomHelper.js` is inside the hull — the
sim shuffles with it — because `assignRacers` had to stop rebuilding each player from its NAME
alone, which erased the group on every add, remove and reshuffle in three callers at once. The world
fingerprint was run rather than argued about: unchanged.

---

## ★★ WAS THE CAMERA GATE TIGHTENED? — YES, AND HERE IS THE NUMBER YOU ASKED FOR FIRST

**Your condition was binding and it was measured before the gate moved.** The instrument was run at
the **daily tip of each of the last twelve days**, in a shared clone, counting tracks with zero
ending frames:

| daily tip | tracks contributing NO ending frames |
| --- | --- |
| 2026-09-03 … 2026-08-25 | **0** — seven days green |
| 2026-08-24 … 2026-08-18 | **1 — garden-path**, every day |

**Five of twelve red. ZERO of them WITHOUT CAUSE.** On each of those five days garden-path genuinely
contributed nothing, so the gate would have been stating a true thing about a real gap — not crying
wolf. It could not have been satisfied then; the reason was the gap, and the gap closed on
2026-08-25.

**The margin, so "green" is not read as "just barely":** the ceiling allows 12,000 frames. The slowest
track uses 5,888 and garden-path 4,916 — **102 seconds of headroom**. A track would have to take
**twice as long as the slowest one does now** to trip it.

**So it was tightened, and what that costs is written into the guard**: a track that legitimately
cannot finish in 200 s WILL block the instrument, and the failure message says *fix the track or the
ceiling, not this gate*. Proven to fire by cutting one track's ceiling to 20 s.

**The false sentence is gone.** What replaces it is derived from the same rows, so there is nothing
left in it to go stale.

## ★★ HOW MANY TRUTH-PASS VERDICTS RESTED ON A CLAIM? — ONE, OF NINETY-NINE

And it is the one you already knew about. `BACKLOG.md`'s *"Garden Path does not finish"* was
re-verdicted **STILL TRUE** on 2026-09-02 on the evidence of that very comment — which had been false
for eight days. **The verdict said the question "cannot be established mechanically" and then
established it anyway**, from the nearest thing to hand. Its own closing note named the missing step:
*"no race was run for it"*. **The race takes 26 seconds**, and it was run: garden-path finishes,
4,916 frames, 300 after the last crossing. **Re-verdicted in place**, with the old verdict left
standing above the new one so the movement is visible.

**The audit behind that number:** all 99 `BACKLOG-VERDICTS-1` verdicts classified by what their
evidence IS. 64 name a file, a command or a count they ran; most of the remainder correctly say the
question is not a tree question at all (NEEDS HIS WORD, *"waiting on a spec"*); **exactly one cites a
document as evidence of a fact about the world.** The contamination was real and it was isolated.

---

## ★ PIECE 4 — BOTH RULES SHIPPED, AND THE COUNT OF CATCHABLE SUBTYPES DID NOT MOVE

| rule | what it compares | today |
| --- | --- | --- |
| **D** | the registry's frame geometry against the PNG's own header | **20 of 20, 0 disagree** |
| **E** | a control's STATED range against its actual bounds | **5 of 5, 0 disagree** |

Both discovered rather than listed, both sabotage-proven in both directions, both with a loud failure
that fires, **and neither needed an exception on day one** — so your condition for leaving one
unshipped never came up.

**Rule D closes the half nobody was holding.** CENSUS-DUPES-1 named the PNG as the source of truth
for frame geometry, recorded **"Guard: NONE"**, and checked it by hand. **In 88 days that agreement
had been checked by hand twice and by a machine never.**

**Rule E's sabotage is the repair CORRECTIONS-1 refused to make** — moving the label alone. That
report called it *"worse than the inconsistency"* and was right, and **nothing enforced it.**

**★ THE ANSWER YOU ASKED FOR, AND IT IS NOT THE FLATTERING ONE: the count does NOT move from four.**
Both rules close parts of subtype **S1**, which was already counted as catchable. S4 (a scope word in
a procedure) and S5 (a premise about a value's runtime identity) are untouched and remain
uncatchable. **Building two rules did not make more of the class catchable — it made more of the
already-catchable part actually caught.** *(Also: "four of six" counts INSTANCES. There are five
subtypes, not six.)*

---

## ★ PIECE 5 — THE CEILING IS 0.70, AND THE RECORDED RANGE WAS THE TOP OF WHAT WAS WRITTEN DOWN

**Your expectation was right and my ceiling last night was wrong.** The bound is now **0.70**, taken
from the neighbour rather than from feel. **The shipped value is untouched at 0.60.**

**`choreoResolveB3` is a fixed 0.70**, so B3's OUTCOME settling window is `[this, 0.70]` — 0.10 wide
at 0.60, 0.05 at 0.65, **zero at 0.70**. Past that a band is asked to be resolved before the phase
that resolves it has begun. A second wall agrees: the loader rejects a seam at or above
`contestWindowStart`, which ships 0.80.

**And SWEEP 2 had already measured it.** It ran FOUR points, not two:

| | 0.5 | 0.6 | **0.7** | 0.8 |
| --- | --- | --- | --- | --- |
| tracks passing the band-reach gate | 2 of 4 | **3 of 4** | **3 of 4** | **0 of 4** |
| mean lead changes in the PULK window | 6.47 | 9.86 | **13.41** | 17.08 |

**0.70 passes on exactly the same three tracks as the shipped 0.60, with 36% more lead changes.** So
"validated range [0.25, 0.60]" — which I quoted last night as the authority — was the top of what had
been **written down**, not measured. Corrected in all four places that carry it.

**★ AND RAISING THE WIDGET ALONE WOULD HAVE BEEN WORSE THAN THE DEFECT.** `raceDynamicsConfig.js`
rejected `choreoOutcomeStart > 0.6` and, on any rejection, **returns the whole default object.** A
slider position you could reach would have silently discarded every other tuning in that config —
your brake, your boost, your intensity, your attacker count — with no message. Validator and widget
moved together, with tests pinning both walls.

**★ A rule built two hours earlier caught a real fault I opened.** A blind `max: 0.6` replacement hit
`racePlanPulkStart` instead, leaving it labelled "(0.10–0.60)" over a max of 0.70. **Rule E names it
on the real tree.**

**The headroom is not free**: B3 on city-circuit goes 68% at 0.60 to **59% at 0.70**. The gate verdict
is unchanged; the margin is not.

---

## ★ THE CROP SCRIPT IS GONE

The owner's decision. **Both preconditions established first:** nothing invokes it (zero hits in every
`package.json`, `.github/`, `.githooks/`, `verify.mjs`, `routing.mjs`, and no import anywhere), and
**the sheets in the tree are provably its output — 12 of 12**, by running its own arithmetic over its
own recorded pre-crop geometry against each PNG's header.

**The knowledge is beside the artwork**, in `client/public/assets/racers/CREDITS.md` — where somebody
wondering why a sheet is 129 px wide is standing. **That file was itself lying**: it said
`horse-trot.png` is *"512×128 px, 4 × 128×128 frames"* against a real 1200×150 with **eight** 150×150
frames. The code is at `archive/crop-sprite-sheets`.

**And the deletion made a Lesson-187 hole visible.** Rule A's live population is now **ZERO**, so its
green line is byte-identical to what a broken discovery would print. Closed with the right
distinction: zero LITERALS is the goal; zero racer types, zero fields or zero files walked now FAIL —
both proven to fire.

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

`crop-sprite-sheets.mjs`'s `frameWidth`/`frameHeight` **were** renamed to
`preCropFrameWidth`/`preCropFrameHeight`, and Rule A stopped DISCOVERING them — because the
distinction existed in the tree, not because it was excepted. *(Past tense corrected 2026-09-04,
LEFT-BEHIND-1: **the file was deleted the following day** and is at `archive/crop-sprite-sheets`.
This paragraph described a live file, which is the only stale sentence the removals left behind.)*

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

**All four are CLOSED as of 2026-09-03** (INDEX-SUMMARIES-1), along with a fifth the sweep turned up
— *"all seven intrusions"*, the same inflated pass as the *"7 of 12"*. Each summary now carries the
withdrawal beside the claim rather than only thousands of lines above it. The reports themselves are
untouched: they are append-only, and the corrections block stays their home.

**Five of five of its own filed second sites were still live a day later** — it was read-only, so that
was a control, not a criticism. The clearest of them: `VERIFY-RULES.md` said the browser suite was
"103/103 green" while `NIGHT-RUN.md` said 106, and neither knew about the other.

**All seven are CLOSED as of 2026-09-03** (SECOND-SITES-LIVE-1). `VERIFY-RULES.md` no longer states
the count at all — `NIGHT-RUN.md` is its one home. Two more of the seven had already been corrected
at their own site and the copy left standing, which is the same shape one layer down: R10's prune
paragraph and `BACKLOG.md`'s `corridor-truth` line were both fixed on 2026-09-02, and the code
comment and the ceremony instruction that copied them were not.

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

### The three from 2026-09-04, and none of them can be closed by anybody else

**A. THE RENDER FINGERPRINT MOVED FOR THE BOARD FIX, AND IT IS UNMINTED.**
It moved on all ten tracks, because the board is one of the beats that instrument samples. **The
values are not written here** — `docs/fingerprints.json` is the record's one home, and the new one
is not in it precisely because nothing has minted it. **A visible board change MUST move it**, so this is the ceremony asking for
a deliberate mint rather than a fault — and **your word is the only thing that writes it.** World and
camera were re-run and are unmoved, which is the pairing R17 asks for. Nothing was minted.
*(`fix/board-portrait-fit-1`; `reports/evolution/BOARD-PORTRAIT-FIT-1.md`.)*

**B. THE OVER-CAPACITY BEHAVIOUR — truncation drops names the host cannot discover.**
When a group does not fit the field, the tail is silently cut. The names that go are **deterministic**
— the end of the group's saved order, after removing duplicates — and **there is no way to find out
who they were from anywhere on the screen**: the saved order is not on the Setup Screen, the roster
shows only who arrived, and the field is renumbered afterwards. The message says how many, never
which. **My own read, and it is a read rather than a recommendation you asked for:** refusing a
47-name group for a 40-cap track — *“this group has 47; the track holds 40”* — is simpler to build and
harder to get wrong than any list of the cut. **Nothing was built.**
*(`reports/evolution/CHIP-CONTRAST-1.md` §4.)*

**C. WHETHER `feat/player-groups-1` MERGES AS IT STANDS**, once you have judged the board. It is
green, all four fingerprints unmoved, and carries player groups, the contrast fix, the warning
treatment and the badge/shuffle removal. **It has not been merged and will not be without your word.**

---

0. ~~**★ PIECE 10, ON 4173.**~~ **DONE 2026-09-04 — you judged it, and four items came back.** Three
   are fixed on the branch (contrast, the warning, the badge and shuffle) and one, the STARTERS
   board, is on its own branch off master and is what 4173 now serves. Struck rather than deleted so
   the ask still reads as one that was asked and answered.

0b. **Whether piece 9 should finish the job** — delete `garden-path-finishes.spec.js` entirely, and
   with it the only browser evidence that the track finishes. I kept the crossing test; the argument
   for and against is in `reports/evolution/DROP-GP-SPEC-1.md` §3.

0c. **Whether the 107 link citations should get the R19 treatment** — symbol in the visible text,
   line in the href, so the link keeps working and the visible half becomes checkable. It is
   available to every one of them and was applied to none: it is a document-by-document edit with a
   judgement in each.

1. ~~**`crop-sprite-sheets.mjs` — what happens to the spent list.**~~ **CLOSED — and the option I
   recommended is the one that was built.** You chose DELETE THE SCRIPT on 2026-09-03; it is gone and
   archived at the annotated tag `archive/crop-sprite-sheets`, and its twelve entries went with it.
   The pre-crop geometry lives in `client/public/assets/racers/CREDITS.md`, which is now its only
   home. **And the rule I would have picked exists**: `check-fallback-agreement`'s **Rule D** compares
   every racer type's `frameWidth × frameCount` against the PNG's own IHDR header — 20 sheets, 0
   disagree, re-sabotaged 2026-09-04 on the REGISTRY with the artwork untouched, and it names both
   sides when it fires. Its blind half is covered too: **Rule D catches a registry that drifted from
   its art; the artwork DIGEST catches art that drifted from itself** (31 assets, 0 changed), which is
   the case a geometry check cannot see. *(Struck rather than deleted so the question still reads as
   one that was asked and answered.)*

2. **Whether `choreoOutcomeStart` should be tunable above 0.60.** It now reaches the top of its
   validated range and stops there. Nothing above 0.60 has ever been measured.

3. ~~**A backlog entry that should probably close, on evidence nobody had.**~~ **CLOSED 2026-09-03
   by piece 8** — the entry moved to PART TWO whole, verdicts and all, and the sweep found the same
   claim live in `CAMERA_DIRECTOR.md` twice. *(Kept struck rather than deleted so the question still
   reads as one that was asked.)* The original text:
   `BACKLOG.md`'s open *"Garden Path does not finish"* was re-verdicted **STILL TRUE** yesterday, on
   the evidence of the stale `camera-fingerprint.mjs` comment above. Its own closing note says
   *"no race was run for it"*. **One was run tonight: 300 frames after the last crossing on
   garden-path.** Closing a backlog entry is a verdict, so it was not taken.

4. ~~**The camera fingerprint's gate, and the sentence under it.**~~ **ANSWERED 2026-09-03 by piece
   3** — the sentence is gone and the gate was tightened on a 12-tip measurement (5 red, 0 without
   cause). The original text: Its printed line
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
| 1 | Delete the crop script | **DONE** — both preconditions proven; knowledge beside the artwork; `archive/crop-sprite-sheets` |
| 2 | Nothing watches the artwork | **DONE** — catches its founding incident, all nine files named |
| 3 | The instrument that refutes its own printed sentence | **DONE** — sentence removed, gate **TIGHTENED** on a measurement, audit **1 of 99** |
| 4 | The two rules that remove a fault class | **DONE** — both green, no exception list; **catchable count unchanged at four** |
| 5 | The slider needs headroom | **DONE** — bound 0.60 → **0.70**, taken from `choreoResolveB3`; shipped value unchanged |
| 6 | The four remaining instances | **DONE**, in three merges — 3 backlog boxes, 4 INDEX claims **+ a fifth the sweep found**, 7 filed second sites |
| 7 | The citation convention | **DONE** — adopted, guarded (**Rule F**) and written down (**R19**); **12 converted, not 113** |
| 8 | Close the garden-path entry | **DONE** — closed whole, and the claim was still live in **two more instruments** |
| 9 | Delete the rotten spec | **DONE, but only HALF of it** — see below; the other half is the only browser evidence there is |
| 10 | Player group selection — **the one you will look at** | **BUILT, GREEN, NOT MERGED** — on 4173 |

### The three places I did not do exactly what the brief said, each with its reason

1. **Piece 7 was asked to convert 113 citations. It converted 12.** Measured: **107 of the 246 are
   markdown deep links whose line number IS the link target** — CITATIONS-1's proposal said "nothing
   mechanical breaks" and had not counted them. A further **39 name a symbol that lives somewhere
   else in the cited file**, so converting moves the pointer silently, and **24 sit inside a dated
   verdict**. Converting at scale opens 107 dead links to close a stale-citation class. **The
   convention is adopted for NEW citations and is now guarded**, which is the durable half.
2. **Piece 9 was asked to delete `garden-path-finishes.spec.js`. It deleted one of its two tests.**
   The dead one is gone — it asserted the race exceeds the 200 s ceiling and the race now takes 82 s,
   which is the browser suite's one deterministic failure. **The other is the ONLY assertion anywhere
   that garden-path finishes in a browser**: no other e2e spec names the track, and the browser sweep
   *excludes* it on the very claim that test refutes. Deleting it the same night piece 8 called that
   exclusion doubtful would have left the tree less true. **One command to reverse if you read it the
   other way.**
3. **Piece 8 flagged a third harness rather than correcting it.** `viewer-invariants.mjs` and
   `SHIP-CEREMONY.md` drop garden-path at **seed 9**. Two other harnesses said the same and both are
   now measured false — but correcting a seed-9 browser sweep on a headless fingerprint's evidence is
   BACKLOG-VERDICTS-1's exact mistake with better manners. **Marked DOUBTFUL in place and filed open,
   with a `verify:` that is a race rather than a grep.**

--- | --- | --- |
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
label, step and tooltip are claims about the same number; **piece 5 measured that class**, and the
bounds question was the cleanest of the four.

**The same caution now applies to Rule F, one night old.** Its verdict line reads *"8 symbol
citations; 0 disagree"* — that is **8 of 246**, because the other 238 are line citations it cannot
see and never will. **It says so in its own output**, and it is worth reading twice: a count of
opt-ins looks exactly like a count of everything.

★ **AND ITS DECLARED BLIND SPOT ARRIVED WITHIN THE HOUR.** Converting one stale citation in piece 9,
I first named `renderInterpolation` — which IS in that file, and is a different feature entirely.
**Rule F would have passed it.** It asks whether the symbol is in the file, deliberately not whether
it is the right one, because CITATIONS-1 measured that guessing an occurrence manufactures confident
wrong answers. **Reading the line is what caught it**, and the blind spot is real rather than
theoretical.

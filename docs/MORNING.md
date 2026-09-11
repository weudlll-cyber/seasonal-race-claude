<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-11, after the whole chain — all four pieces are done and pushed.

**Where the code is.** Master is `04f40f17`, CI green. `night/2026-09-11` is branched off master and
is **NOT merged**. `night/2026-09-10` stays unmerged as a **record of its measurements** — its piece 2
cast from a new band and fired in 0–2 of 30 races, and you have replaced that approach.

---

## ★ THE CAMERA INSTRUMENTS WERE RUNNING A CAMERA THE BROWSER CANNOT PRODUCE

Every instrument handed the director `b1Indices` and **never the plan**. The product hands it over
once, mid-race, the moment the heroes are cast. So the detector's cast stayed empty, and **anything
that depends on a racer being CAST as a comebacker could not happen inside an instrument at all.**

★ **That is why the camera fingerprint stayed green through the precedence you shipped on Tuesday** —
a change that alters the picture in 47 of 96 races.

**Ten instruments build a camera. Nine were blind.** Three are fixed; six are named in the report
with their addresses and deliberately left for a separate piece.

### What it costs to see properly

★ **The CAMERA fingerprint moved on 9 of 10 tracks and the RENDER fingerprint on 7 of 10.** Both
old and new values, per track, are in
[CAMERA-PLAN-BLIND-1](../reports/evolution/CAMERA-PLAN-BLIND-1.md) — this sheet does not carry
fingerprint values, because they have one home and it is
[docs/fingerprints.json](fingerprints.json).

★ **THE RACE IS UNTOUCHED** — world fingerprint unmoved, golden races pass, and every per-track frame
count is identical. Only what the instruments *see* changed.

★ **NOTHING IS MINTED.** The two guards are red on purpose and wait for your word.

**Why each track moved, named rather than guessed:** the precedence genuinely fires on five tracks;
four more move because the candidate population switches from the wide fallback to the plan's cast.
**river-run did not move and I cannot explain it** — the obvious reason was checked and is false.

---

## ★ YOUR STAGING IDEA IS RIGHT, AND THE PLAN'S OWN BUDGET REFUSES IT

You said the director should **define** the comebacker and **hold him at the rank he should start
from**, then lead him into the top 5. First: your diagnosis of today is confirmed with numbers —
re-measured, not quoted. A racer drawn for the front is steered toward the front, so when the
director looks he is at **median rank 5 of 30 and 9 of 40**, and **today's comebacker LOSES places
after the release at every size from 30 up (−9, −17, −16)**.

### The staging mechanism already existed

A comebacker's curve is *anchor → peak → resolve*, and the **peak is his deepest point**. The code
already computed a deep peak for a front racer — it just called him a `sovereign-lead`. So staging is
choosing that peak. **No hold arm was rebuilt**; a cast hero already steers through the pulk phase.

### ★ AND IT IS REFUSED IN 8 OF 8 CANDIDATES, AT EVERY FIELD SIZE

`feasibleTiming` charges the **down leg at the same rate as the up leg**. A staged round trip needs
**1.63–1.88 of a race against a budget of 0.97** — refused by about a factor of two.

★ **THE SCISSORS, and this is the whole answer:**

| | |
|---|---|
| deepest staging the budget ALLOWS | **0.27–0.30 of the field** — near-constant at every size |
| what the grid measured at that depth | **−11 to +6 places** — no comeback at all |
| depth a real comeback needs | **0.50–0.60 of the field** — refused |

**The depth that would work is not allowed, and the depth that is allowed does nothing.**

★ **The same depth is affordable ONE WAY and refused as a ROUND TRIP.** A racer already at rank 20
may climb to the top 5; a front racer may not be sent to rank 20 and brought back — though the climb
he would then make is identical. **Falling back is not rate-limited the way overtaking is, but the
budget charges it as if it were.**

**Nothing was relaxed.** The build is in the tree and **inert** — world fingerprint unmoved, golden
races pass, a refused staging falls back to today byte for byte.

---

## ★ AND TWO MEASUREMENTS THAT ARE BIGGER THAN THE COMEBACK TOPIC

### 1 · luger-hill's start rows are unfair on master — and nothing of ours did it

3 000 races, 10 tracks, the canonical method. **One track of ten is Holm-unfair: luger-hill, χ²
23.100.** It reproduces an independent run on another branch **digit for digit**, which is what makes
"already unfair" a fact rather than a memory. **Band-reach is comfortable — 86.2% tightest against
the 70% line, every track ≥ 83.8%.**

★ **It also settles last night's attribution**: dirt-oval sits at its clean baseline here, so that
branch's dirt-oval result was genuinely its own doing and its luger-hill column was not.

### 2 · ★ THE FAIRNESS GATE IS A 40-RACER FACT, AND AT 100 RACERS IT IS HALF A POINT FROM FAILING

You asked whether the director steers weaker as the field grows. It does per RANK — but **measured
over 46 000 racer-rows it does not per FIELD**: the median racer lands a constant **5% of the field**
from his drawn place at 20, 40, 60 and 100 racers. **The controller is fine.**

★ **What is not fine is the band table.** `BAND_EDGES` is a fixed `[5, 15, 25, 40]` — a 40-racer
table used at every size. Band-reach against it:

| racers | 10 | 20 | 40 | 60 | **100** |
|---|---|---|---|---|---|
| tightest zone | 95.8% | 90.8% | 86.7% | 81.2% | ★ **70.5%** |

★ **The gate line is 70%.** At 100 racers you have half a point of margin, and the fifth band there
holds 60% of the field in one bucket and reads a meaningless 97.3%.

★ **AND `docs/FAIRNESS.md` NEVER SAYS WHICH FIELD SIZE IT DESCRIBES.** Every "N" in it counts RACES,
not racers. Its 70% gate and its 85–90% headline are 40-racer facts written as facts about the game.
**Nothing in it was edited — it is canonical and the correction is yours.**

---

## NEEDS HIS WORD

- ★ **Should `BAND_EDGES` scale with the field?** It is the reason band-reach falls while the
  director's accuracy does not, and it is why the gate nearly fails at 100 racers.
- ★ **Should the DOWN leg be priced differently from the UP leg?** That is the one change that makes
  your staging possible, and it is a design decision — nothing was touched.
- ★ **Or should the staging be shallower than a comeback needs?** 0.27–0.30 of the field is what the
  budget allows today.
- ★ **May the camera and render fingerprints be re-minted?** They moved because the instrument stopped
  being blind, not because the picture got worse. Until you say so, `verify` stays red on both.
- ★ **Your eye on the MILD precedence**, on master and still unwatched
  ([COMEBACK-PRECEDENCE-1](../reports/evolution/COMEBACK-PRECEDENCE-1.md)).
- **The e2e `Failed to fetch`** — harness or serving defect, unresolved on purpose.
<!-- END CHAIN STATUS -->

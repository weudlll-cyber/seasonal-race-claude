<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-11, after COMEBACK-STAGED-1 (chain 2026-09-11, pieces 4 and 1 done).
Pieces 2 and 3 are still running as this is written.

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

## NEEDS HIS WORD

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

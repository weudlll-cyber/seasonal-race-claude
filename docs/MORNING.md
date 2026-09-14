<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-13, after ARRIVAL-TAPER-SHIP-1.

**Where the code is.** Master is `b6d77637`. `night/2026-09-12b` is **NOT merged**, **nothing is
minted**, **no golden race is re-recorded**. The servo is reverted as you asked; the taper is what
ships.

---

## ★★ READ THIS BEFORE YOU APPROVE — THE TRADE IS NOT THE ONE YOU AGREED TO

You chose the taper on **"1.042 at arrival for about 0.6 points of band-reach"**. That half is true
and it is paid:

| | before | now |
|---|---|---|
| arrival pace | 1.100 | **1.029–1.076** |
| lands in his block | 84% baseline | **87.0%** (n=717) |
| the leader | — | **untouched, identical to every decimal** |

★★ **BUT THE COMEBACKER'S GAP ON SCREEN ROUGHLY TRIPLES AT SMALL FIELDS**, and that was never part of
the trade:

| racers | before | now |
|---|---|---|
| 20 | 0.107 widths | ★ **0.368** (3.4×) |
| 40 | 0.126 | ★ **0.307** (2.4×) |
| 60 | 0.172 | 0.139 (better) |
| 100 | 0.163 | 0.204 |

★ **AND IT IS NOT THE TAPER.** I split the races by whether the comebacker was ever in front. Where
he never leads, the two arms are **identical to every decimal**. The whole difference is in races
where he IS in front — because the shape leaves him **unsteered inside his block** once he arrives,
instead of braking him back toward his exact drawn place. That is the brake whose removal was already
costed at 2.7× the gap when it was variant B; I measure 3.4×.

> ★ **So: the taper costs what you agreed. The tripled gap is the price of the OTHER half of the
> shape — "free inside his block" — which was never put to you as a choice. It is also the half that
> produces the feel you asked for. It is yours to accept or not.**

★ One more thing, in your favour: the **0.066 widths baseline on record was never comparable.** It
came from an instrument with a narrower definition of "leading". Measured properly, the before-figure
is 0.107–0.172. So the picture is worse than it was, but not nearly as much worse as that number
would have implied.

---

## WHAT HAPPENS THE MOMENT YOU APPROVE

The branch merges in **one command**. `verify` plain is **PASS 24 · FAIL 6**:

| guard | why |
|---|---|
| world / camera / render fingerprints | ★ red **BY DESIGN** — the race changed |
| `client-suite` | the golden parity pins inside it |
| `check-runin-frame` | ★ **a real defect — see below** |

★★ **THE GOLDEN RACES PASS AND NEED NO RE-RECORDING.** Their fields are 12 and 6 racers, below the
staging minimum of 20, so no comebacker is cast and the shape never fires there. Both are
byte-identical to master.

**So approving needs exactly:** mint the **world / camera / render** fingerprints, and decide the
camera case below. **Nothing else.**

**New world fingerprint `defbce50092d965c`** (it was `bdf4a3c8ce6e0316` before this work).
Per track: city-circuit `a6892177f475` · dirt-oval `ab94bd3b6d88` · garden-path `9f86a644c95c` ·
ice-track `0246ecbe7a35` · luger-hill `41ba46864505` · mountainstreet `8a6bf377bcfe` · river-run
`29742c451ffa` · searound `1fe4a8074974` · seatrack `8b3f023f86d0` · space-sprint `edc1069a4dda`.

---

## ★ THE ONE THING STILL BLOCKING A CLEAN MERGE — AND IT IS NOT THIS BRANCH'S

**The camera loses the finish line** on `dirt-oval` at 40 racers (15 frames) and `luger-hill` at 100
(5 frames), at progress 0.950.

★★ **RE-MEASURED 2026-09-14 (RUNIN-FRAME-SHAPE-1), AND BOTH SENTENCES THAT STOOD HERE WERE WRONG.**

★ **It did not come from `983d9201`.** The camera module, `defaults.js` and the guard are
**byte-identical to master**, and that commit's only camera-adjacent change is a probe its own
comment marks INERT. Its reach is through the RACE alone. **The same 12-seed sweep on `dirt-oval`
n=40 loses the line on 1 seed of 12 on BOTH trees** — master on seed 11 (−210 px), the branch on
seed 9 (−289 px), same frame count, same progress, same mechanism. **The guard samples one seed per
track and says so in its own blind list. Green on master was the draw, not a property of master.**

★ **And the stated cause was wrong.** `_lineCeiling` returning Infinity is **not** what happens:
the demand is **FINITE on 15 of 15 and 5 of 5** failing frames. What actually happens is that the
schedule's widen completes at 0.9498 because `zoom 2.379 <= demand 2.374`, and the demand is measured
from where the framing rule **intends** the anchor rather than where the pan **is** — and the opening
glide (`runInOpenMs` 1250 ms) is still running at the deadline. **The floor reports satisfied while
the band is 289 px off the canvas.**

★★ **I did not fix it, and the rule says not to:** every available repair re-opens a closed decision
(ENDGAME-REPAIR-1's singularity) or breaks "the schedule is the sole author" — **changing the endgame
on every track and every race.** You judge that picture.

---

## WATCH IT

★ **http://localhost:4173** — the production build. API on 4000, dev on 5173.

★ **Check the pill before judging.** It is built from the **tip of `night/2026-09-12b`** and must read
that commit with **`dirty: false`**; `git rev-parse --short=8 HEAD` is the value it should match, and
`http://localhost:4000/api/health` must report the **same** commit. A hash is not written here on
purpose — every commit to this sheet would move it and the sheet would lie about itself.

★ **There is no repair to inspect** — nothing in this block changed product code. What is on screen is
the behaviour as it stands, on the branch and on master alike.

**Look at, in this order:**
1. ★★ `dirt-oval`, **40 racers, seed 9** — the failing case, your own field size. At about **95%** of
   the race the shot finishes its widen and turns into the close **while the line is still off the
   right edge** — 15 frames, about a quarter of a second, then it comes back on its own.
2. `dirt-oval`, 40 racers, **seed 1** — the control on the same track. Nothing should look different.
3. `luger-hill`, 100 racers, **seed 9** — the shallower case (82 px, 5 frames, 0.08 s). ★ **If you
   cannot see it, say so** — that is the cheaper half of the decision.
4. `luger-hill`, 100 racers, **seed 1** — the control there.

---

## FOR YOUR DECISION

1. ★ **The tripled on-screen gap at small fields** — accept it as the price of the feel, or put the
   brake back on an arrived comebacker (that is the "free inside his block" half, not the taper).
2. Whether the endgame's opening is repaired at all — **on master, where the defect actually lives** —
   knowing every option moves every shot. The four options and what each costs are in
   [RUNIN-FRAME-SHAPE-1](../reports/evolution/RUNIN-FRAME-SHAPE-1.md) §5.
3. Still open from earlier: `docs/FAIRNESS.md`'s 85–90% headline, and its "zero Holm-unfair" clause
   which **the shipped game already misses above forty racers** (seven of ten tracks at N=100).
4. Deployment: what terminates TLS · where the data lives · how often a backup is taken.

## ★★ ONE RACE IN YOUR HISTORY IS MINE — DELETE IT WHEN YOU LIKE

★ **Race `SF8GEZ`** (2026-09-13 17:19, winner **Nova**, your "40 Racer Testgroup") **was created by a
browser parity test of mine, not by you.** It was left in place rather than deleted, because deleting
from your store is itself an alteration and that was not mine to make. **It is yours to delete.**
Nothing else of yours was created, changed or removed; `QN3HDP` was read with a single `GET`.

---

## ★★ AND YOUR RACE NOW REPLAYS EXACTLY — 40 OF 40, TO THE MILLISECOND

The harness could not race any world but the shipped one, which is why it raced `quiet` while you
race `wild` and agreed with your stored race on only 10 of 40 positions. That is closed. Your race
`QN3HDP`, replayed from its own stored inputs, now matches your record on **every one of the forty
positions and every one of the forty finishing times in milliseconds**. ★ **The shipped world at
stage `wild` reproduces it too — so your sliders are the shipped defaults and the Race Action stage
was the whole difference.** ★ **Nothing the product does was changed**, and the four fingerprints are
unmoved against the branch tip before the piece. See
[HARNESS-WORLD-1](../reports/evolution/HARNESS-WORLD-1.md), which also lists which of this week's
conclusions describe `quiet` rather than the world you watch.

★ **The numbers higher up this sheet predate that piece** — the verify tally is now **PASS 25 ·
FAIL 5** and `check-runin-frame` has been **two** cases (dirt-oval at 40 as well as luger-hill at
100), not one. The report carries the current values.

---

## NOTICED AND LEFT ALONE

- `.claude/skills/dev-start/SKILL.md` is in German, against the language rule in `CLAUDE.md`.
- `sollBereich` — a German identifier — in the sim's raw fairness rows.
- `camera-replay.mjs` delivers the camera plan through its own inline copy of the shared rule.
- The end-to-end install walk has still not been performed; the ordered list of what it needs is in
  [NIGHT-2026-09-13](../reports/evolution/NIGHT-2026-09-13.md).
<!-- END CHAIN STATUS -->

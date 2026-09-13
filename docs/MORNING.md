<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-13, after the whole chain.

**Where the code is.** Master is `b6d77637`. `night/2026-09-12b` is **NOT merged** and **nothing is
minted**. ★ **The shipped race HAS CHANGED on this branch** — that is the point of the night, and it
is why several guards are red on purpose.

**I waited 19 minutes** for the previous block's arrival sweep before starting this chain, as
instructed. It ran 81.7 minutes.

---

## ★★ WATCH THIS FIRST: A RACER NOW ARRIVES AT HIS PLACE AT PACE

**http://localhost:4173** — the production build. The API is on 4000.

You asked why he crossed his drawn place still accelerating. It was never the arrival shape. **It was
the servo.** It drives a racer by `1 + gain × (error / nActive)`, dividing by the FIELD SIZE, so it
hits the +10% ceiling after `0.05 × n` ranks — **one rank at twenty racers**. There was no gradation
near the target at all: one rank out was driven exactly as hard as ten out, so the multiplier sat
pinned at the ceiling all the way in and had to fall the whole 0.10 the instant he arrived. It
cannot; the ease takes about a second.

**The proof is that the defect tracked the arithmetic exactly** (2 000 races):

| field | ranks of gradation | arrival pace before |
|---|---|---|
| 20 | **1.0** | **1.100** — the ceiling, exactly |
| 100 | 5.0 | 1.050 |

**Now:** the drive is counted in RANKS and reaches full power at one BLOCK (five ranks).

| | before | now |
|---|---|---|
| arrival pace | 1.084 | ★ **1.019** |
| arrived at pace | 9% | ★ **30%** |
| **at twenty racers** | **1.100 / 11%** | ★ **1.001 / 52%** |
| worst gap | 2.549% | ★ **1.704%** |
| lands in his block | 83% | 84% |

---

## ★ WHAT IT COST, AND THE ONE DECISION THAT IS YOURS

★★ **FIELD-WIDE BAND-REACH FALLS AT SMALL FIELDS** (44 000 racers per arm):

| N | before | now | change |
|---|---|---|---|
| 20 | 91.3% | **83.9%** | ★ **−7.4 pp** |
| 40 | 89.7% | 85.5% | −4.2 pp |
| 100 | 88.9% | 89.2% | +0.3 pp |

★ **YOUR GATE HOLDS** — it asks for ≥ 70% on every track and the worst cell is 76.3%. Nothing is
breached, so I did not stop. ★ **But `docs/FAIRNESS.md`'s own 85–90% HEADLINE does not hold at twenty
and forty racers any more.** I did not edit that document.

★ **AND THERE IS A CHEAPER VERSION ON THE TABLE**, which you should see before deciding:

| | arrival | at pace | worst gap | band-reach cost |
|---|---|---|---|---|
| the taper alone | 1.042 | 20% | 2.033% | **~0.6 pp** |
| ★ what is in the tree now | **1.019** | **30%** | **1.704%** | **~7 pp at N=20** |

The servo buys the last stretch and charges seven points of small-field fairness for it. **If you do
not want to spend that, the change to undo is commit `ec7130a0` — the taper alone still delivers most
of it.** The cost is the SERVO, not the taper: the taper touches one racer per race, worth −0.6 pp.

---

## WHAT MERGES THE MOMENT YOU SAY YES

The branch is **one command from mergeable**. `verify` was run plain: **PASS 23, FAIL 7**, and every
failure is accounted for:

| guard | why |
|---|---|
| world / golden / camera / render fingerprints | ★ **red BY DESIGN** — the race changed |
| client-suite (3 of 4 694) | the golden parity pins |
| script-suite | `check-golden-races` — a finishing time moved −1.664 s |
| **check-runin-frame** | ★ **a real defect — see below** |

**The new world fingerprint is `815b36cd5a9149ce`** (was `bdf4a3c8ce6e0316`). Per-track values are in
commit `1997498a`. ★ **Nothing is minted and nothing is merged — you look first.**

---

## ★ THE ONE THING I STOPPED ON

**The camera loses the finish line**, and tonight's change made it worse:

| | check-runin-frame |
|---|---|
| master | **PASS** |
| `983d9201` (the comebacker is held and released) | 1 failure — luger-hill at 100 |
| now | ★ **2 failures** — and garden-path at 40 is the new one |

Both are the same mechanism: at progress 0.950 in a leader shot, `_lineCeiling` returns **Infinity
when the line cannot be framed at all**, and an infinite ceiling never binds — so the shot zooms to
its own preference and the line leaves the canvas. **The guard's own ceiling goes quiet in exactly
the case it exists to catch.**

★ **I did not fix it.** The fix changes how the camera behaves on every track and every race, and you
judge the picture.

---

## THE FAIRNESS TABLE IS A 40-RACER TABLE (report only, nothing changed)

★ **The premise did not reproduce** — band-reach at a hundred racers is **88.9%, nineteen points
above your gate**, not 70.5%. ★ **But the worry was right and it lives in a different number.**
`BAND_EDGES` exhausts the field at exactly forty, so above that B5 becomes an unbounded catch-all:

> **At a hundred racers, three fifths of your field is drawn into one band that is 97% easy, and the
> four bands that mean anything deliver 76%.** The 88.9% headline is an average with a free band in
> it.

★ Bands that SCALE with the field **do** recover it (82.1% against 76.4%), and at forty racers the
scaled table reproduces the shipped one exactly — the control that says the scaling is honest.

★ **AND TODAY'S WORLD ALREADY FAILS THE GATE'S OTHER CLAUSE.** "Zero Holm-unfair start rows, every
track" is not met above forty racers: **seven of ten tracks at a hundred**. That is the shipped game,
not the new arm.

---

## THE SMALL ONES, DONE

- **The overrun banner is gone.** It compared WALL time against a RACE-duration threshold; a
  throttled background tab advances the race 50 ms per wall second, so a 60 s race tripped the 600 s
  banner with ~30 s raced — exactly the case you ruled correct. ★ *Your call, not built:* the same
  warning on the RACE clock would stay quiet for a throttled tab and still catch a stuck race.
- **`/api/health` names the commit in development again**, from the same git reader the badge uses.
- **`check-image-starts` is NOT wired into CI** — 4.1–4.75 min against a 3.8 min median whole run.
- **Three camera instruments are blind to the cast by construction** and now say so in their own
  headers, so nobody reads a green from them as a clearance.

## FOR YOUR DECISION (named, not built)

1. **The seven points of band-reach at twenty racers** — spend it, or take the taper alone?
2. Whether the camera's unframeable-line case should be fixed, knowing it moves every shot.
3. Whether `docs/FAIRNESS.md` should be restated: its 85–90% headline, and its "zero Holm-unfair"
   clause which the SHIPPED world already misses above forty racers.
4. Deployment: what terminates TLS · where the data lives · how often a backup is taken.

## NOTICED AND LEFT ALONE

- `.claude/skills/dev-start/SKILL.md` is in German, against the language rule in `CLAUDE.md`.
- `sollBereich` — a German identifier — is a field in the sim's raw fairness rows.
- `camera-replay.mjs` delivers the camera plan through its own inline copy of the shared rule. A swap
  broke the replay loop and was reverted — named, not fixed.
- **The end-to-end install walk was not performed** and is not claimed; the ordered list of what an
  install still needs is in [NIGHT-2026-09-13](../reports/evolution/NIGHT-2026-09-13.md).
<!-- END CHAIN STATUS -->

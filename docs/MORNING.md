<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-13, after piece 1 of the second 2026-09-13 chain (its fairness gate was
still running as this was written — see "what is still open").

**Where the code is.** Master is `b6d77637`. `night/2026-09-12b` is branched off it and is **NOT
merged**. **Nothing is minted. With nothing switched on, the shipped race is unchanged** — the world
fingerprint is `bdf4a3c8ce6e0316`, bit-identical to the instrument run on the commit before this
work began.

**I waited 19 minutes** for the previous block's arrival sweep to finish before starting this chain,
as instructed. It ran 81.7 minutes in total.

---

## ★★ THE THING TO LOOK AT: A RACER NOW ARRIVES AT HIS PLACE AT PACE

You asked why he crossed his drawn place still accelerating, and the answer turned out not to be the
shape of the arrival at all. **It is the servo.**

`racePlanner.js` drives a racer by `1 + gain × (error / nActive)`. Because it divides by the FIELD
SIZE, it reaches the +10% ceiling after `0.05 × n` ranks of error — **one rank at twenty racers**,
five at a hundred. At twenty racers there is therefore **no gradation near the target at all**: a
racer one rank from his place is driven exactly as hard as one ten ranks away. His multiplier sits
pinned at the ceiling for the whole approach and has to fall the entire 0.10 the instant he arrives.
It cannot, because the ease that moves it restarts every frame and takes about a second.

★ **THE PROOF IS THAT THE DEFECT TRACKS THE ARITHMETIC EXACTLY**, measured over 2 000 races:

| field | ranks of gradation the servo has | arrival pace today |
|---|---|---|
| 20 | **1.0** | **1.100** — the ceiling, exactly |
| 40 | 2.0 | 1.092 |
| 60 | 3.0 | 1.070 |
| 100 | 5.0 | 1.050 |

**The new response is one line:** `drive = (maxMult − 1) × error / BAND_EDGES[0]` — the error counted
in RANKS, full drive at one BLOCK (five ranks). One rank from your place then means the same thing in
a field of twenty and a field of a hundred. Neither clamp moves, no role is named, and it still
converges: five ranks out is the same full drive it always was.

★ **WHAT IT BUYS**, 228 comebackers per arm, ten tracks, four field sizes:

| | today | servo | taper only | ★ servo + taper |
|---|---|---|---|---|
| arrival pace | 1.084 | 1.040 | 1.042 | ★ **1.019** |
| arrived at pace | 9% | 13% | 20% | ★ **30%** |
| lands in his block | 83% | 81% | 87% | 84% |
| **worst gap** | 2.549% | 1.892% | 2.033% | ★ **1.704%** |

★★ **AT TWENTY RACERS, WHERE IT WAS WORST, IT IS NOW SOLVED**: arrival pace **1.100 → 1.001**, and
**11% → 52%** of comebackers arrive at pace.

★ **AND THE WORST CASE — the one you said you actually look at — IS A THIRD SMALLER** (2.549% →
1.704% of the race).

★ **THE SERVO ALONE IS NOT ENOUGH, so the taper stays.** You asked to be told if it were, because
then three days of arrival work would fall away. It is not: alone it reaches 1.040 and 13% at pace,
against 1.019 and 30% together. **Both stay, and only ONE arrival shape will be left in the tree.**

★ **THE COST, NOT AVERAGED AWAY.** At twenty racers the comebacker's block rate falls **93% → 81%**.
It shows in both servo arms and not in either arm without it, so it is real rather than one noisy
cell. Whether that trade is worth it is yours; **the field-wide fairness gate was still measuring
when this was written** and it is the thing that can veto the change outright.

---

## WHAT IS STILL OPEN TONIGHT

- **The fairness gate on the new servo.** Band-reach and the start-row Holm flag, both arms, ten
  tracks, four field sizes. ★ **If band-reach falls below 70% at any field size the change does not
  ship** — that is your own rule and it is not mine to spend. Not yet known.
- **Clearing the table** — deleting every arrival variant that lost, so one shape remains.
- **The camera losing the finish line at `luger-hill`, 100 racers.** No camera file changed on this
  branch, so the cause is the RACE changing, not the camera; `983d9201` (the comebacker is held and
  released) is the only commit here that moves the world by default. Not yet established.

---

## THE SMALL THINGS, DONE

**The overrun banner is gone, and it was wrong the way you suspected.** It compared **wall-clock**
time against a threshold derived from **race** duration, and the physics accumulator advances at most
50 ms per frame — so a backgrounded tab throttled to about one frame a second advances the race 50 ms
per second of wall clock. **A 60 s race would trip the 600 s banner with about 30 s raced.** It fired
in exactly the case you have ruled correct behaviour. Removed, with the reason written where the
number lives. ★ *Not built, your call:* the same warning reading the RACE clock would stay silent for
a throttled tab and still catch a genuinely stuck race.

**`/api/health` names the commit in development again.** It said `unknown` while the badge in the
same browser named a real one. The dev launcher now reads the identity from **the same git reader the
badge uses** — no second copy — and the dev-start skill uses `npm run dev:once` so it goes through
that launcher.

---

## FOR YOUR DECISION (named, not built)

1. Whether the taper should be expressed in **time** rather than ranks. One second is a flat 2 ranks
   at every field size, but four seconds is 3–6 ranks depending on it, so no single rank number is
   right everywhere.
2. Whether the **front-contest release at 0.97** stays where it is: at a hundred racers, **two
   arrivals in five** happen past it, where no taper can reach them.
3. Whether the twenty-racer block cost above is acceptable.

## NOTICED AND LEFT ALONE (outside what these pieces touch)

- `.claude/skills/dev-start/SKILL.md` is written in German, against the language rule in `CLAUDE.md`.
- `sollBereich` — a German identifier — is a field in the sim's `fairness-data.json` raw rows.
- `camera-replay.mjs` delivers the camera plan through its own inline copy of the four-line rule
  instead of the shared helper every other instrument uses.
<!-- END CHAIN STATUS -->

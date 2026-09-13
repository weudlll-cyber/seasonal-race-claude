<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-13, after pieces 1 and 4b of the 2026-09-13 chain. **Piece 2 (the
distance sweep) is still running as this is written** — this sheet will be rewritten when it lands.

**Where the code is.** Master is `b6d77637`. `night/2026-09-12b` is branched off it and is **NOT
merged**. **Nothing is minted and the shipped race is unchanged by default** — the world fingerprint
with no variant selected is `bdf4a3c8ce6e0316`, bit-identical to the same instrument run on the
commit before tonight's work.

---

## ★★ YOUR SHAPE IS BUILT, AND YOU WERE RIGHT THAT THE SAFETY NET ALREADY EXISTED

You described the arrival on 2026-09-13: two ranks out he begins to slow, he is at normal speed
before he gets there, and from then on he is unsteered unless he falls out of his block. **That shape
had never been tried.** It is now variant **E**, selected the same way A–D are:

> `localStorage['racearena:arrivalVariant'] = 'E2'` in the browser, `RA_ARRIVAL_VARIANT=E2` in node.
> The digit is the taper distance and it is **your own fallback order** — `E2`, `E1`, `E0`. Bare `E`
> means `E2`.

★★ **AND YOUR GUESS ABOUT THE NET WAS CORRECT, WITH ONE CORRECTION.** You thought "unsteered until he
falls out of his block" was a rule the project already has. The *expression* exists exactly as you
described — `bandError` is zero while a racer is inside his band and only speaks at its edge, so
steering on it means "left alone inside, corrected at the edge". **What did not exist is any
comebacker reaching it.** Heroes are pinned to exact-rank steering, so:

> ★ **A racer sitting comfortably 3rd inside his own top-5 block is steered today — to his exact
> drawn rank.** Being inside his block changes nothing. Nobody had asked this before.

So E builds **no new mechanism**. It puts the comebacker on band steering after the taper, which is
one assignment. Nothing releases the net: `bandError` returns to zero by itself the moment he is back
inside. And it **cannot** fire while he is ahead of his block — his band is [1,5] and the "ahead" arm
would need a rank better than 1st. **A racer drawn 2nd who wins is fair, and is not touched.**

## ★ THE FIRST NUMBER, AND IT IS NOT THE ONE YOU WERE HOPING FOR

A pilot on luger-hill says the taper **does not reach 1.0 before he arrives** — at any of the three
distances. He crosses his drawn place at **1.0998–1.1000**, which is the ceiling, the same as today.

**The cause is measured, not guessed: the last two ranks take 64–208 ms, and the ease that moves his
multiplier is 1.0 s.** The servo commands "stop pushing" in time; the multiplier physically cannot
get there. Your fallback order (2 → 1 → 0 ranks) makes the distance *shorter*, so it moves away from
the fix rather than towards it. **The full sweep is running and will say whether this holds across
all ten tracks and all four field sizes.** Nothing is being changed on the strength of one track.

---

## THE SMALL ONES

**The overrun banner is gone, and it was wrong in exactly the way you suspected.** It compared
**wall-clock** time against a threshold derived from **race** duration. Those two diverge without
limit: the physics accumulator advances by at most 50 ms per frame, so a backgrounded tab throttled
to roughly one frame a second advances the race 50 ms per second of wall clock. **A 60 s race would
trip the 600 s threshold with about 30 s of racing done** — you would be told a perfectly healthy
race was lost, in precisely the case you have ruled correct behaviour. Removed, with the reason
written where the number lives so nobody wires it back in.

★ **One thing for you, not built:** a version reading the RACE clock instead would stay quiet for a
throttled tab and *would* still catch a genuinely stuck race. Whether the browser should warn at all
is your call, so it is named rather than built.

**`/api/health` now names the commit in development.** It said `commit: unknown` while the badge in
the same browser named a real one. The dev launcher now reads the identity from **the same git reader
the badge uses** — no second copy — and the dev-start skill uses `npm run dev:once` so it actually
goes through that launcher. `npm start` bypassed it, which is why the variables were unset.

---

## WHAT IS STILL OPEN TONIGHT

- **Piece 2** — the distance sweep. Running.
- **Piece 4a** — `check-runin-frame` fails on `luger-hill` at 100 racers. No camera file changed on
  this branch, so the cause is the **race** changing, not the camera; `983d9201` (the comebacker is
  held and released) is the candidate. Not yet established — it needs runs, and the sweep has the
  machine.
- **Piece 3** — whether the fairness guarantee is a 40-racer fact. Two of its claims are already
  re-verified by reading: `docs/FAIRNESS.md` **never names a field size** (zero matches), and its
  "N" means *races* throughout.

## NOTICED AND LEFT ALONE (outside what these pieces touch)

- `.claude/skills/dev-start/SKILL.md` is written in German, against the language rule in `CLAUDE.md`.
  Only the lines this chain added are English.
- `sollBereich` — a German identifier — is a field in the sim's `fairness-data.json` raw rows.
<!-- END CHAIN STATUS -->

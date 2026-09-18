# D25-SIGN-1 — the luger-hill sentence has the sign backwards, and correcting it does not overturn the decision but does remove the reason it was comfortable

Branch `night/2026-09-18`, piece 4. Date: 2026-09-18.
**★ NOTHING WAS CHANGED IN `docs/BACKLOG.md` OR `docs/FAIRNESS.md`.** They carry a decision of the
owner's, and the correction below is a **proposal in this report only**.

---

## 1 · THE SENTENCE AS IT STANDS

**`docs/BACKLOG.md:2421`**, inside decision **D25** — *"The start-row advantage is ACCEPTABLE — the row
bonus, the row gap and the row count all stay · 2026-08-24"* (`docs/BACKLOG.md:2401`):

> **`luger-hill` IS THE SINGLE EXCEPTION, AND ITS SIGN IS THE OPPOSITE OF THE WORRY.** It carries nine
> start rows against the usual four, and its deviation is **UNDER-compensation** — so on that track the
> **front** rows are slightly favoured, not the back. **Anyone reopening this on the assumption that
> the rear rows are advantaged should read that sentence first.**

**`docs/FAIRNESS.md:156`**, restating it in the canonical fairness document:

> **On `luger-hill` the deviation is UNDER-compensation, so the FRONT rows are slightly favoured there
> — not the rear.** Anyone reopening this on the opposite assumption should start from D25.

★ **Both end by telling a reader who believes the rear is advantaged that they are the one who is
mistaken.** That is the reader who is right.

---

## 2 · THE FOUR SOURCES, EACH WITH ITS ADDRESS

### ★★ Source 1 — the table D25 derives the sentence FROM

[`reports/evolution/ROW-BONUS-TIMING-1.md:117`](../evolution/ROW-BONUS-TIMING-1.md), §3, which tests
the derivation against races: *"If the compensation is exact, mean finishing TIME must be flat across
start rows."*

| track | first row (s) | last row (s) | paired difference |
|---|---:|---:|---|
| **luger-hill** | **58.211** | **57.924** | **+0.287 ±0.137 \*** |

**Row 0 is the FRONT row and it is the row that receives NO bonus** — `rowLayout.js:99`
`computeSpeedBonus` gives every row *behind* the front a permanent multiplier; row 0 gets none. The
rear rows are the compensated ones.

★ **So read it: the front row takes 58.211 s, the rear row takes 57.924 s. The REAR row finishes
SOONER**, having already made up its whole starting deficit. A racer given more than it lost is
**OVER**-compensated, and the rear is the favoured end.

★★ **The report states the number correctly and then attaches the opposite word to it**, at
[`:125-126`](../evolution/ROW-BONUS-TIMING-1.md): *"the front row finishes LATER, i.e. luger-hill is
very slightly **under**-compensated, by 0.29 s in a 58 s race (0.49%)"*. **The observation is right;
the label inverts it — and it is the label, not the number, that reached D25.**

### ★ Source 2 — the other report D25 cites, in its headline

[`reports/evolution/ROW-ADVANTAGE-1.md:24`](../evolution/ROW-ADVANTAGE-1.md):

> **THE ADVANTAGE RUNS BACKWARDS. The BACK rows are the favoured ones, not the front.** That is true of
> the band position on 10 of 10 tracks, of **mean finishing rank wherever it separates**, and of the one
> win-rate gap large enough to see.

And on this track, at [`:27-28`](../evolution/ROW-ADVANTAGE-1.md) and [`:44`](../evolution/ROW-ADVANTAGE-1.md):

> the front row lands **4.18 ±1.14 places** further back inside its own band, finishes **4.32 ±2.09
> places** worse overall, and **wins 2 races in 100 where an even share would be 11.**

★ **D25 cites this report and the one above, and adopts the sign of neither.**

### Source 3 — last night's direct measurement

`reports/night/LUGER-BIAS-1.md:34` (on `origin/night/2026-09-17`, unmerged). Shipped tree, brake OFF,
one fixed seed, 100 races, 30 s variant:

| luger-hill | front row | back row | even share |
|---|---|---|---|
| win share | **13.0%** | **25.0%** | 20.0% |

### Source 4 — the pinned gate

`reports/night/PINNED-GATE-1.md:230` (same branch). 300 races/track, both arms: luger-hill's win share
by row rises monotonically toward the rear — **17.7 / 18.0 / 20.7 / 21.0 / 22.7%** against a flat 20.0.

---

## 3 · ★★ WHAT FOLLOWS FOR THE SIZE JUDGEMENT — THE PART THAT MATTERS

**D25 rests on three claims. The correction leaves the first intact, inverts the second, and turns the
third from a reassurance into a corroboration.**

### Claim 1 — "the compensation is exact, by derivation" — ★ UNAFFECTED

D25's algebra is untouched: the row deficit and the row bonus both scale with the row number, so the
catch-up point is the finish line and there is no leftover. **The sign error is in the empirical
check, not in the derivation.**

### Claim 2 — "the races agree, flat on 9 of 10 tracks" — ★★ THIS IS THE ONE THAT CHANGES

The same report says at [`:128`](../evolution/ROW-BONUS-TIMING-1.md):

> **All ten differences are positive**, so there is a consistent hair of under-compensation; only
> luger-hill's separates from zero.

★★ **All ten positive means the front row finishes later on ALL TEN TRACKS — a consistent hair of REAR
advantage, not of under-compensation.** So the picture is not *"nine flat, one exception with a
harmless sign"*. It is **ten tracks leaning the same way, one of them significantly.**

★ **And that is exactly what the other cited report found independently**, by a different measure:
*"All 10 tracks lean the same way"* on position-within-band (ROW-ADVANTAGE-1). **Two independent
measures, ten tracks each, same direction — and D25 records them as disagreeing.**

### Claim 3 — the open question D25 parked — ★★ THE CORRECTION MAKES IT HARDER, NOT EASIER

D25's own closing paragraph:

> **OPEN BUT NOT PURSUED** … Whether the position-within-band tilt is a real row advantage or a
> **selection effect** is not established. It appears **only in the one measure conditioned on band
> arrival**; the two unconditioned measures show nothing outside luger-hill.

★★ **The selection-effect escape depends on the unconditioned measures NOT agreeing with the tilt.
With the sign read the right way round, they do — on luger-hill, which is the track D25 itself
excepts.** Both unconditioned measures point rear there: **mean finishing rank**, 4.32 places worse
for the front row (ROW-ADVANTAGE-1:135), and **mean finishing time**, the rear row 0.287 s sooner
(ROW-BONUS-TIMING-1:117). A selection effect in a conditioned measure does not produce an agreeing
signal in two unconditioned ones.

**So the question D25 parked as cheap-but-non-actionable is now the question the evidence points at.**

### ★ DOES THE DECISION SURVIVE? — YES ON ITS OWN TERMS, AND FOR A NARROWER REASON THAN IT GIVES

**D25's verdict is "acceptable", and "acceptable" is a judgement about SIZE. The sign does not change
any magnitude:**

| | |
|---|---|
| the finishing-time deviation | **0.287 s in a 58 s race — 0.49%**, unchanged |
| the worst start row's band reach | **88–90%**, far above the floor, unchanged |
| the front row's win share | **13.0%** against 20.0% expected — unchanged, and it was always the rear that gained |

★ **So the decision can stand exactly where it is.** What does not survive is the *reason it reads as
comfortable*: D25 presents luger-hill as the one exception pointing the reassuring way, and it points
the other way. **A front-row advantage means the compensation is merely a little shy. A rear-row
advantage is the thing the line was opened about** — the same direction, on the same track, that the
gate and both night measurements keep returning.

★ **This is a decision to re-affirm, not to reverse.** But it should be re-affirmed on the magnitude,
which holds, rather than on the sign, which does not.

---

## 4 · ★ THE PROPOSED CORRECTION — APPEND, NEVER EDIT

**Two dated lines. Neither touches the existing sentences**, because editing the reasoning inside a
decision that has already been acted on rewrites the evidence for it.

**Under `docs/BACKLOG.md` D25:**

> **CORRECTION 2026-09-18 — the luger-hill paragraph above has the sign inverted.**
> `ROW-BONUS-TIMING-1` §3 measures luger-hill's first row at **58.211 s** and its last at **57.924 s**,
> and row 0 is the row that receives no bonus — so the REAR row finishes sooner, which is
> **OVER**-compensation and a **rear** advantage, not under-compensation and a front one. The same
> table's "all ten differences are positive" therefore reads as a consistent hair of **rear**
> advantage on all ten tracks. **The magnitude is unchanged (0.49% of a 58 s race) and the verdict
> ACCEPTABLE is a judgement about magnitude, so the decision stands** — but the sentence telling a
> reader who assumes a rear advantage to think again is withdrawn, and D25's open selection-effect
> question is strengthened rather than settled, because both unconditioned measures now agree with
> the conditioned one on this track.

**Under `docs/FAIRNESS.md:156`:** the same, in one line, pointing at D25 for the detail — because
`FAIRNESS.md` restates D25 and must not become a second home for the reasoning.

---

## WHAT THIS DOES NOT SETTLE

- ★ **I did not re-run ROW-BONUS-TIMING-1's finishing-time test.** This reads its published table;
  the reading needs no new races, but the table is trusted rather than reproduced.
- **Whether the 0.49% finishing-time gap and the 12-point win-share gap are the same effect** is not
  established — they agree in direction and were measured on different protocols and field sizes.
- **Nothing here proposes changing the compensation.** That is a shipped-race decision and it is not
  mine.
- **Sources 3 and 4 live on `origin/night/2026-09-17`, which is unmerged**, so a reader on master
  cannot open them at those addresses today.

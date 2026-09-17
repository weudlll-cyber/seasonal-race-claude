# FAIRNESS-SIGN-1 — the luger-hill sentence in D25 and FAIRNESS.md has the sign backwards, and every measurement in the record disagrees with it

Branch `night/2026-09-17`, found while verifying piece 5's open items. Date: 2026-09-18.
**NOTHING WAS CHANGED.** The sentence is inside the owner's own decision record; correcting it is
his call, not mine, and the piece-2 rule is explicit that anything needing a decision he has not
taken gets listed rather than fixed. **This report is the listing.**

---

## ★★ THE ONE LINE

`docs/FAIRNESS.md:156` and `docs/BACKLOG.md` D25 both tell a future reader that on **luger-hill the
FRONT rows are slightly favoured, not the back** — and instruct anyone who thinks otherwise to read
that sentence first. ★ **Three independent measurements in the record say the opposite, and one of
them is the table the sentence is derived from.**

---

## 1 · WHAT THE TWO DOCUMENTS SAY

`docs/BACKLOG.md`, decision **D25** (2026-08-24), which closed the start-row fairness line:

> **`luger-hill` IS THE SINGLE EXCEPTION, AND ITS SIGN IS THE OPPOSITE OF THE WORRY.** It carries nine
> start rows against the usual four, and its deviation is **UNDER-compensation** — so on that track the
> **front** rows are slightly favoured, not the back. **Anyone reopening this on the assumption that
> the rear rows are advantaged should read that sentence first.**

`docs/FAIRNESS.md:156`, in the canonical fairness document, restating it:

> **On `luger-hill` the deviation is UNDER-compensation, so the FRONT rows are slightly favoured there
> — not the rear.** Anyone reopening this on the opposite assumption should start from D25.

Added **2026-08-24** in `fe203444`, *"docs(D25): close the start-row fairness line as his decision"*.

---

## 2 · ★★ THE TABLE THE SENTENCE COMES FROM SAYS THE REAR IS FAVOURED

`reports/evolution/ROW-BONUS-TIMING-1.md` §3 — one of the two reports D25 cites as its evidence —
tests the derivation against races: *"If the compensation is exact, mean finishing TIME must be flat
across start rows."*

| track | first row (s) | last row (s) | paired difference |
|---|---:|---:|---|
| **luger-hill** | **58.211** | **57.924** | **+0.287 ±0.137 \*** |

**Row 0 is the FRONT row and it is the one that gets NO bonus** (`rowLayout.js:99` —
*"Row 0 gets none"*). The rear rows are the ones being compensated.

★ **So read the row: the front row takes 58.211 s and the last row takes 57.924 s. The REAR row
finishes SOONER — by 0.287 s in a 58 s race.** A rear row that overcomes its whole starting deficit
**and then arrives first** has been given **more** than its deficit. That is **OVER**-compensation of
the rear, and the rear is the favoured end.

★★ **The report states the data correctly and then labels it backwards** — *"the front row finishes
LATER, i.e. luger-hill is very slightly **under**-compensated"*. The observation is right; the word
attached to it inverts it, and **it is the word, not the number, that was carried into D25 and from
there into `FAIRNESS.md`.**

★ **The same inversion runs through the sentence underneath it**: *"All ten differences are positive,
so there is a consistent hair of under-compensation."* All ten differences positive means **the rear
row finishes sooner on all ten tracks** — a consistent hair of rear ADVANTAGE. Which is exactly what
the other cited report independently found.

---

## 3 · THE OTHER CITED REPORT SAYS REAR, IN ITS HEADLINE

`reports/evolution/ROW-ADVANTAGE-1.md`, D25's other named evidence, same date:

> **THE ADVANTAGE RUNS BACKWARDS. The BACK rows are the favoured ones, not the front.** That is true of
> the band position on 10 of 10 tracks, of mean finishing rank wherever it separates, and of the one
> win-rate gap large enough to see.

and on this track specifically:

> **On nine tracks it is small. On luger-hill it is large:** the front row lands **4.18 ±1.14 places**
> further back inside its own band, finishes **4.32 ±2.09 places** worse overall, and **wins 2 races in
> 100 where an even share would be 11.**

★ **D25 cites both reports and adopts the sign of neither.** Its luger-hill sentence contradicts the
headline of one and the arithmetic of the other.

---

## 4 · AND TONIGHT'S MEASUREMENT AGREES WITH THE REPORTS, NOT WITH THE SENTENCE

From [LUGER-BIAS-1](LUGER-BIAS-1.md), measured this evening on the shipped tree, brake OFF, one fixed
seed, 100 races, 30 s variant:

| luger-hill | front row | back row | even share |
|---|---|---|---|
| win share | **13.0%** | **25.0%** | 20.0% |

**The front row wins little more than half its fair share and the back row a quarter more than its
own.** χ² 9.4, p 0.051.

★ **That is four measurements on three different protocols, at two field sizes, on two different
metrics, across seven weeks — and all four point the same way.** The only artefact pointing the other
way is the interpretive clause in §1.

---

## 5 · WHY IT MATTERS ENOUGH TO PUT IN FRONT OF HIM

1. ★★ **It is load-bearing in a decision.** D25 closed the start-row fairness line. Its luger-hill
   paragraph is headed *"ITS SIGN IS THE OPPOSITE OF THE WORRY"* — the sign is doing work in the
   argument for closing, because a front-row advantage is the reassuring direction: it means the
   compensation is merely a little shy. **A rear advantage is the direction the line was opened about.**
2. ★ **It is booby-trapped against its own correction.** Both copies end by telling a reader who
   believes the rear is advantaged that they are the one who is wrong. **That is precisely the reader
   who is right**, and this is the second night this week that a chain has arrived at the rear-bias
   conclusion and had to work out whether the record contradicted it.
3. **It sits in the canonical document.** `docs/FAIRNESS.md` is one of the four files `CLAUDE.md` puts
   in a newcomer's reading order.

---

## 6 · ★ WHAT I DID NOT DO, AND WHY

**I changed nothing** — not `FAIRNESS.md`, not `BACKLOG.md`, not `ROW-BONUS-TIMING-1.md`.

- **`BACKLOG.md` D25 and the `FAIRNESS.md` restatement are a DECISION RECORD.** Editing the reasoning
  inside a decision the owner took, after it has been acted on, is rewriting evidence for a verdict —
  the same objection `CLAUDE.md` raises about the closed quotation list. **His word, not mine.**
- **`ROW-BONUS-TIMING-1.md` is a night report**, and `reports/night/INDEX.md` states those are
  **append-only**: *"a report records what was true on the day it was written and is never rewritten."*
- ★ **And there is a real question underneath that I cannot answer for him**: whether, with the sign
  read the right way round, **D25's conclusion still stands.** It may well — the magnitude is 0.49% of
  a 58 s race, and *"acceptable"* was a judgement about size, which the sign does not change. **But it
  is his judgement to re-make, not mine to assume.**

**What a fix would look like, if he wants one:** a dated correction line appended under D25 and under
`FAIRNESS.md:156` — not an edit of either sentence — saying the sign is inverted, naming the table,
and stating whether the acceptance stands. **Three lines, and no measurement needed.**

---

## WHAT THIS DOES NOT SETTLE

- **Whether the 0.49% finishing-time gap and the 12-point win-share gap are the same effect** is not
  established here. They are consistent in direction and were measured on different protocols.
- ★ **I have not re-run ROW-BONUS-TIMING-1's finishing-time test.** This report reads its published
  table; it does not re-race it. The reading needs no new races — first row 58.211 s against last row
  57.924 s is on the page — but the table itself is trusted, not reproduced.
- **Nothing here says the compensation should change.** That is the same shipped-race decision
  LUGER-BIAS-1 declines to propose.

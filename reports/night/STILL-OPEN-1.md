# STILL-OPEN-1 — the named open items, each checked against the tree tonight

Branch `night/2026-09-17`, piece 5. Date: 2026-09-18. **Verification only — nothing was changed,
merged or minted.** Each item below is marked **OPEN**, **ALREADY DONE** or **NO LONGER APPLIES AS
STATED**, with the evidence that decided it. Where an item's own premise turned out to be wrong, that
is said rather than smoothed over.

| # | item | verdict |
|---|---|---|
| 1 | the six blind instruments | ★ **ALREADY DONE** — and it was two jobs, not one |
| 2 | `BAND_EDGES` as a 40-racer table | ★ **OPEN**, but not for the reason the item states |
| 3 | the fairness start-row clause above 40 racers | ★ **OPEN** — and it is item 2's root, not a separate thing |
| 4 | the four verify-time points | **NOT IDENTIFIED** — my searches did not resolve what this names |
| 5 | the race-parameter extraction deleting two mirrored copies | **DONE, with its premise corrected** — and a named remainder |
| 6 | the delivery thread | ★ **ALREADY DONE** |

★ **One thing found while checking item 3 is more consequential than any item on this list** and has
its own report: [FAIRNESS-SIGN-1](FAIRNESS-SIGN-1.md).

---

## 1 · THE SIX BLIND INSTRUMENTS — ★ ALREADY DONE, on 2026-09-12

`INSTRUMENT-PLAN-2` split CAMERA-PLAN-BLIND-1's list of six into **three that could be fixed through
the shared helper and were, and three that structurally cannot.** Verified at the tree tonight by
reading the files:

| instrument | calls `makeCameraPlanDelivery`? |
|---|---|
| `scripts/check-ending-frame.mjs` | ★ **yes** |
| `scripts/finish-band-truth.mjs` | ★ **yes** |
| `scripts/exp-anchor-truth-ab.mjs` | ★ **yes** |
| `scripts/diag/start-formation.mjs` | no |
| `scripts/exp-camera-bisect.mjs` | no |
| `scripts/sim-race-visual.mjs` | no |

★ **And the three that do not are not silently blind** — each carries a header comment naming the
helper and the reason, which is what closes the item rather than leaving it half-done:

- `start-formation.mjs:32` — *"on a racer being CAST. See scripts/lib/cameraPlanDelivery.mjs."*
- `exp-camera-bisect.mjs:26` — *"See scripts/lib/cameraPlanDelivery.mjs for the hole this describes."*
- `sim-race-visual.mjs:25` — *"instrument is NOT a clearance for it. See scripts/lib/cameraPlanDelivery.mjs."*

**Verdict: not open.** The standing caution from the record still holds and is worth repeating —
*check the instrument, not the class*: three of these six see the cast and three do not, and nothing
about the category tells you which.

---

## 2 · ★ `BAND_EDGES` — OPEN, BUT THE ITEM'S PREMISE IS NOT WHAT IS WRONG

**The item says `BAND_EDGES` is "a 40-racer table". Read at the tree, it is not** —
`client/src/modules/racePlanner.js:56`:

```js
// Single-source band split points: ranks 1–5=B1, 6–15=B2, 16–25=B3, 26–40=B4, 41+=B5.
export const BAND_EDGES = [5, 15, 25, 40];
```

`rankToBandIndex` returns `BAND_EDGES.length` for any rank past 40, and `getAreaBounds` gives that
band `hi = Infinity`. ★ **So ranks above 40 are handled, not dropped**: B5 is an open-ended band and
the code is correct at any field size.

### ★ What IS wrong is that a band number means a different thing at a different field size

| field size | bands that exist | B4 spans | B5 spans |
|---|---|---|---|
| **40 racers** | **four** — B5 never occurs | ranks 26–40 (15 ranks) | ★ **does not exist** |
| **80 racers** | **five** | ranks 26–40 (15 ranks) | ★ **ranks 41–80 — 40 ranks** |

At 80 racers the top band is **2.7× the size of any other band**, and at 40 it is absent. **Band
reach is therefore not comparable between two runs at different field sizes**, and nothing in the
code is at fault for that — it is a documentation gap, which is item 3.

**Verdict: OPEN**, as a documentation item, not a code one.

---

## 3 · ★ THE START-ROW CLAUSE ABOVE 40 RACERS — OPEN, AND IT IS THE SAME HOLE

`docs/FAIRNESS.md:77` states the gate:

> **Layer 1 — start-row fairness:** band-reach ≥ 70% AND zero Holm-unfair start rows, every track

★ **`docs/FAIRNESS.md` names no field size anywhere in the document.** Checked directly tonight — a
search for any racer count, `racers=`, `nRacers` or `racerCount` across the whole file returns
**nothing**. The gate is stated in band terms, the bands change meaning with field size (item 2), and
the document that owns the threshold never says which field size it is stated at.

### ★ This is not hypothetical — it bit this week, twice

- **Tonight's piece 3** measured luger-hill with **5 start rows**; `ROW-ADVANTAGE-1` measured the same
  track with **9**. Both are right: that block ran **open tracks at 80 racers and closed at 40**,
  tonight's run used **40 everywhere**. Verified at the tree — luger-hill is OPEN and carries 5 rows
  at 40 racers and 9 at 80; searound is closed and carries 7 at 40 and 14 at 80.
- ★ **That difference is load-bearing enough to have produced a wrong sentence in the record.**
  `ROW-ADVANTAGE-1` concluded luger-hill had *"9 rows where the next-most has 7"* — true only under its
  own mixed protocol, and it used that to reason about why luger-hill is the extreme.

**Verdict: OPEN.** The cheapest honest fix is one sentence in `FAIRNESS.md` naming the field size the
threshold is stated at, and one naming what changes above it. **It is a threshold document, so the
number belongs there and nowhere else** — which also means I should not write it without his word on
what the answer is.

---

## 4 · THE FOUR VERIFY-TIME POINTS — ★ I COULD NOT IDENTIFY WHAT THIS NAMES

**Stated plainly rather than guessed at, because the rule for this chain is that an absence claim not
backed by the search text counts as not checked.**

**What I searched:** `verify.time` / `verify time` across `docs/*.md` and `reports/night/*.md`;
`four .*verify` and `verify.*four points` across `reports/` and `docs/`; and every time-bearing line
in `docs/VERIFY-RULES.md`.

**The one candidate the searches surfaced** is `docs/VERIFY-RULES.md:243`, in rule R8:

> Waiting costs three to four minutes per block of nobody doing anything. **That trade is only correct
> under those four conditions** — if any of them stops being true, this rule stops being safe.

The four conditions are named in the sentence before it: nothing is deployed; the dev server runs from
the working tree; there is no second developer; he is notified within minutes either way. ★ **That is
"four conditions on a timing rule", which is a plausible reading of "the four verify-time points" but
is a guess, and I am not going to report a verdict on an item I have matched by guess.**

**Verdict: unresolved. One word from him naming which four, and it is a short check.**

---

## 5 · THE RACE-PARAMETER EXTRACTION — DONE, PREMISE CORRECTED, REMAINDER NAMED

**It landed**: `client/src/modules/raceParams.js` was added in **`6df2994a`, 2026-09-08**, and the
commit is on `origin/master` — confirmed tonight with `git branch -r --contains`.

★ **The item's premise — "deleting two mirrored copies" — is the premise that did not survive**, and
the report that did the work says so in its own headline: **the derivation was mirrored THIRTEEN
times, not twice.** Found by searching for the derivation's *shape* rather than its name — 136
occurrences across 34 files, each opened and classified.

★ **And the copies were not copies.** The browser guards on `autoScale.enabled` and a `displaySize`
override; every harness derives unconditionally. **The two agree only because a default happens to be
`true`** — which is the kind of agreement that stops the day the default moves.

**Outcome: 8 mirrors deleted, 0 added. Six full mirrors remain and are named**, `sim-fairness.mjs`
among them. Verified tonight — it still mirrors, and it is honest about it:

- `sim-fairness.mjs:1129` — *"Body narrow/long references — mirror index.jsx W_REF + computeBodyNarrowRef call."*
- `sim-fairness.mjs:1131` — *"The cap is READ from its one home (`raceParams.js`), never re-typed"*, and
  the import at `:91` confirms it.

So the remaining mirrors carry the *derivation* but read the *constant* from its one home, and a guard
exists: `scripts/w-ref-one-home.test.mjs`.

**Verdict: the named work is DONE; a named, guarded remainder is open.** Nothing here needs a
decision — it needs somebody to spend the time on six files.

---

## 6 · THE DELIVERY THREAD — ★ ALREADY DONE

`scripts/lib/cameraPlanDelivery.mjs` exists at the tree and is the single home of the rule. **Seven
scripts import it** — `camera-fingerprint.mjs`, `render-fingerprint.mjs`, `raceDriver.mjs`,
`check-ending-frame.mjs`, `finish-band-truth.mjs`, `exp-anchor-truth-ab.mjs` and the helper's own
file — and the three that cannot use it point at it in comments instead (item 1).

★ **Nothing grew a second copy of the delivery rule**, which was the thread's whole purpose.

**Verdict: not open.**

---

## ★★ WHAT CAME OUT OF THIS PIECE THAT WAS NOT ON THE LIST

While checking item 3 I read `docs/FAIRNESS.md`'s documented-residuals section, which shelves the
start-row gradient under the owner's decision **D25**. ★ **Its luger-hill sentence has the sign
backwards, and it is the sentence a future reader is instructed to check themselves against.** Four
measurements across seven weeks — including the very table the sentence is derived from — say the
**rear** rows are favoured on that track; the sentence says the front rows are.

**It is in a decision record, so nothing was changed.** → [FAIRNESS-SIGN-1](FAIRNESS-SIGN-1.md)

---

## WHAT THIS DOES NOT SETTLE

- **Item 4 is unidentified, not closed.** It is the one thing on the list I am handing back unanswered.
- **Items 2 and 3 are documentation gaps whose fix is a threshold number**, and `FAIRNESS.md` is that
  number's one home — so writing it is a decision, not a correction, and it was left.
- **The six remaining race-param mirrors were counted from the record, not re-classified.** I verified
  that `sim-fairness.mjs` is still one of them and that the cap is imported; I did not re-open the
  other five.

# THREE-FAILING-SPECS-1 — why the three production-arm specs fail

**2026-09-25. Measurement and triage only.** Nothing was fixed, no assertion was changed, no spec was
added to any gate, and `playwright.prod.config.js` was not touched. Each spec was run **on its own**,
on the production arm, after a build — never as part of the suite.

They fail outside the gate's curated set, which is why nothing has been reporting them.

---

## 1 · `garden-path-finishes.spec.js`

**What it asserts, in one sentence.** That garden-path runs to the finish in a real browser — a
crossing puts a finish time on the scoreboard. Its own header says it is the only assertion anywhere
that says so.

**Where it fails — it doesn't, run alone.** Three runs, each the spec by itself:

| run | result | first crossing | finish times on the board |
|---|---|---|---|
| 1 | **passed** (1.8 m) | 100.5 s of wall clock | 3 |
| 2 | **passed** (1.9 m) | 105.7 s | 19 |
| 3 | **passed** (1.9 m) | 105.5 s | 16 |

BROWSER-GATE-COVERAGE-1 recorded it failing in **1.7 s**, which is its *first* assertion —
`expect(fieldSize, 'the scoreboard must be rendering a field').toBeGreaterThan(1)` at `:46`. Failing
there in under two seconds means the race never started at all, not that it failed to finish.

**Which case: (c) — it does not fail every time, and the difference is CONTEXT.** That measurement ran
the whole 19-spec suite on one worker; this ran the spec alone. Alone it passes 3/3 and the track
finishes comfortably inside a 720 s budget.

★ **What is NOT established:** that the suite-context failure has gone away. Passing alone three times
localises the failure to the suite, it does not disprove it. This repository has a recorded mechanism
for exactly that shape — the arms share one `e2e/.auth/state.json`, and a spec that disturbs it takes
later specs down with it.

**What it would take to settle it.** One full-suite run to reproduce (~40 min), then a bisect of the
specs that precede it to find which one disturbs the shared state.

**Has the owner been shown this behaviour?** **Yes, the claim — not the failure.** He ruled on this
file on 2026-09-04 (GP-SPEC-TRIM-1), revising his own earlier "delete the file" to "keep only what is
needed", which is why the file now carries exactly this one test.

---

## 2 · `arrival-shape.spec.js`

**What it asserts, in one sentence.** That the owner's arrival shape can be selected in a real
browser, and that a held hero who reaches his drawn place is **steered back toward that rank** inside
his block rather than left to run free in it.

**Where it fails.** `client/e2e/arrival-shape.spec.js:155`, three runs out of three, identically:

```
expect((braked + pushed) / mults.length).toBeGreaterThan(0.5)
  Expected: > 0.5
  Received:   0
  'he must be STEERED inside his block — the multiplier is 1.0 only under band steering,
   which was deleted on 2026-09-13'
```

**Received 0 is stronger than "less steering than expected".** It means that on **none** of the
in-block frames was the commanded multiplier anything other than 1.0 — he is not being steered at
all, rather than being steered too little.

**Which case: NOT (c), and whether it is (a) or (b) IS THE OWNER'S OPEN QUESTION — so this report
stops here.** The assertion was flipped into its present form on 2026-09-19 by `559d7521`, *"the
browser spec asserts the SHIPPED design — he IS steered inside his block"*, after `17193be6`
(ARRIVAL-STEERED-AGAIN-1, *"the brake comes back, on top of the eased ceiling"*). Measured today, the
product does the other thing.

The disagreement underneath it is already on record as a decision he owns, in two places:

- `docs/MORNING.md:33`, **item 1 under "WHAT NEEDS YOUR WORD"** — *after a held hero reaches his drawn
  place: steered to that exact rank, or free anywhere inside his block?*
- `reports/night/ARRIVAL-BRAKE-1.md` §5 — the servo says exact rank and gives its reason at
  `racePlanner.js:1407` (unsteered he opened 3.3× the pre-shape gap at twenty racers); the spec's
  earlier form said free in the block, for the reason recorded at `racePlanner.js:1403` (so he would
  not *"FEEL braked on arrival"*). **Both are the owner's own arguments, fifteen hours apart.**

Calling this (a) or (b) would be choosing between two of his positions, which is not this block's to
do.

**What it would take to settle it.** His ruling on that one question; the measurement behind it is
already done and the gap brake already exonerated by it.

**Has the owner been shown this behaviour?** **Yes.** It is item 1 on his current "what needs your
word" list, and an earlier sheet records it as *"a standing red on BOTH browser arms, found tonight,
not caused tonight, not diagnosed."*

---

## 3 · `comeback-precedence.spec.js`

**What it asserts, in one sentence.** That in a real browser the camera cuts to a comebacker
*through* a state hold — at least one COMEBACK_ZOOM entered out of LEADER_ZOOM or BATTLE_ZOOM after
less than the 7500 ms gate — and never cuts out of a LEAD_CHANGE.

**Where it fails.** `client/e2e/comeback-precedence.spec.js:111`, three runs out of three:

```
expect(forced.length).toBeGreaterThan(0)
  Expected: > 0
  Received:   0
  'no comeback cut happened inside the 7500 ms hold — entries:
   [{"from":"OVERVIEW","heldMs":4939,"at":73534}]'
```

**The mechanism, from the diagnostic the spec prints.** The race is not missing a comeback shot — it
has exactly one. It comes **from OVERVIEW**, held ~4.95 s, at ~73.5 s. The filter at `:104` counts
only entries whose `from` is LEADER_ZOOM or BATTLE_ZOOM, because those are the two states with a hold
to cut through; OVERVIEW has none, so a cut out of it cannot demonstrate precedence. **The signature
the spec looks for never occurs in this fixture.**

| run | entries | `from` | `heldMs` | `at` |
|---|---|---|---|---|
| 1 | 1 | OVERVIEW | 4939 | 73534 |
| 2 | 1 | OVERVIEW | 4966 | 73420 |
| 3 | 1 | OVERVIEW | 4962 | 73532 |

**Which case: NOT (c) — the same race three times, to within 30 ms.** Whether it is (a) or (b) cannot
be settled from the tree here, and the reason is specific: the spec's header says its fixture was
*"chosen from the headless sweep as a race whose plan casts a comebacker who climbs"*. If that seed's
plan still casts one, the precedence has stopped firing and it is (a); if the cast has moved, the
fixture no longer exercises the thing and it is (b).

**What it would take to settle it.** One headless plan dump on that seed to see whether it still casts
a climbing comebacker — minutes, not hours.

**Has the owner been shown this behaviour?** **No.** Nothing in `docs/` records the precedence being
put in front of him; the only mentions of this spec are the backlog row opened on 2026-09-25 and the
coverage measurement that found it.

---

## The three lines

- **`garden-path-finishes.spec.js` — (c).** Passes 3/3 alone; the failure belongs to suite context, not
  to the spec or the product.
- **`arrival-shape.spec.js` — (a) or (b), and which one is the owner's undecided design question.**
  Deterministic, 3/3, received 0 where > 0.5 was required.
- **`comeback-precedence.spec.js` — (a) or (b), undetermined.** Deterministic, 3/3; the race's only
  comeback cut comes from OVERVIEW, which carries no hold to cut through.

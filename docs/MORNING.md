# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** after piece 8. **ENFORCE THE HYGIENE IS FINISHED — all ten pieces merged and
pushed.** Master is green after each. One branch locally and at origin, zero worktree stubs, a clean
tree, and **no commit in this chain touches `docs/fingerprints.json`.**

---

## ★ THE FOUR NUMBERS

### 1. Are Rule A and Rule B live and green?

| | state |
| --- | --- |
| **Rule A** — a literal mirroring a machine-readable home must agree with it | **BUILT and RED at its founding instance — but NOT a gate** |
| **Rule B** — no branch may stand at origin whose tree master already holds | **LIVE AND GREEN**, empty keep list |

**Rule A does not gate, and that is the result rather than a shortfall.** Its only objection on
today's tree is **legitimate**: `crop-sprite-sheets.mjs` records the *pre-crop source geometry* a
one-shot run took as its input — same field names, a different fact. **No exception was added**, per
your rule. It prints, loudly, and waits for you.

**It is proven to catch what it was built for.** Run against the tree at `11093fff` (2026-06-03) it
finds **21 disagreements — 8 frameWidth, 8 frameHeight, 5 displaySize** — the same count
SPRITE-AUDIT-DERIVATION-1 reached independently and by hand. **It would have gone red the day that
table was written**, not 91 days later.

**Rule B gates — after I broke it and fixed it.** See below.

### 2. The corrected backlog count, beside last night's

| | last night | tonight |
| --- | --- | --- |
| open before | 128 | **128** |
| closed | 16 | **16** |
| still true | 105 | **105** |
| needs your word | 7 | **7** |

**No correction was needed: the file was never doubled.** Thirteen of the fourteen "duplicate"
sections are the file's own PART ONE (OPEN) / PART TWO (CLOSED) structure — a subject's open items
under its heading in one part, its closed items under the same heading in the other. **Merging them
would have destroyed the open/closed sort**, so they were left alone. This is *proven* rather than
re-adjudicated: the 280 lines the count is computed from are **byte-identical** before and after.

**One duplicate was real, and it was one night old** — my own BACKLOG-VERDICTS-1 moved entries into a
new CLOSED block keeping their `##` headings. Fixed by demoting five headings; no content moved.

### 3. Of the ninety document corrections: applied, and refuted

**34 applied. 0 refuted on verification.** Every one re-checked against the code, the command, or the
config module before being applied. **56 remain**, about 54 of them line-number drift — named as the
lowest-value class and deliberately not done as a batch of hand edits, since each needs a new line
number that will drift again and the real repair is structural.

### 4. Piece 9's second-site count

**11 of 21 corrections had left an identical false statement standing somewhere else — 16 live sites.
About one in two.**

And piece 3's own sweep found **5 more**, none previously filed — including a **code comment** outside
both censuses' scope, and `ARCHITECTURE:285`, which DOC-TRUTH-2 filed together with `:309` and where
**only `:309` was repaired last night**. I reproduced the very defect the same day I read its
measurement.

---

## ★ THE FAULT I OPENED, AND HOW IT WAS FOUND

**Rule B shipped comparing PATHS, and failed on the very next branch pushed after it — this chain's
own.** A branch that only MODIFIES files adds no path, so master's tree holds every path it holds:
that is what an ordinary work-in-progress branch looks like, and the guard called it deletable and
exited 1. The hook and CI would have gone red for anyone with work pushed.

**BUILD-RULE-B-1 recorded rejecting the stronger comparison deliberately. That reasoning weighed the
wrong risk.** The false negative it avoided is a branch that outlived the step meant to delete it; the
false positive it accepted fires on normal work, every time.

**The ceremony's shell is not wrong — it is used differently.** A person runs it on ONE branch at
merge time, having already decided that branch is finished. The guard runs on EVERY branch,
continuously, including ones nobody has finished. Matching the shell was the wrong thing to optimise
for.

Fixed to compare `(path, blob)`, re-proved in all three directions, with a regression test for the
exact false positive. **Constraint 2 caught it because I pushed the branch and then looked.**

---

## ★ TWO THINGS THAT NEED YOUR WORD

1. **`crop-sprite-sheets.mjs` and Rule A.** Except that table with a reason, delete it (it was a
   one-shot run and its inputs are in git), or rename its fields so they stop claiming to be registry
   facts. **Until then Rule A reports and does not gate.** No mechanical discriminator exists between
   "a table that copies the registry" and "a table that records what it used to hold" — that is the
   finding, not a gap in the work.

2. **A product defect the correction sweep turned up, which I did not touch.**
   `DynamicsTuningSection.jsx:1233-1237` labels the `choreoOutcomeStart` control **"(0.25–0.55)"**,
   sets `max: 0.55`, and its tip says **"0.5 = shipped"**. **The shipped value is 0.6 — outside the
   slider's own range.** An operator opening that card sees a control that cannot reach where the game
   actually runs. Changing a range is a product judgement; correcting only the label would put
   "0.6 = shipped" beside a slider that stops at 0.55, which is worse than the inconsistency.

**Also waiting, smaller:** the `renderedBodyH` test's tolerance. It is titled ±5% and asserts **0.05
px absolute — 33× tighter** — and `buggy` passes by **5.00e-2 against a 0.05 bound**, i.e.
floating-point dust. Both false statements are corrected; **the tolerance is deliberately not
loosened**, because choosing how much drift is acceptable in a race input is yours.

---

## WHERE EVERY PIECE STANDS — ALL TEN DONE

| # | piece | the headline |
| --- | --- | --- |
| 0 | The backlog's fourteen duplicates | **premise refuted** — thirteen are the OPEN/CLOSED structure |
| 1 | Build Rule A | red at its founding instance; **not gating**, and no exception added |
| 2 | Build Rule B | live and green — **after I broke it and fixed it** |
| 3 | The ninety corrections | **34 applied, 0 refuted, 5 second sites** |
| 4 | The two fingerprints that cannot gate | all three compare now, through **one** implementation |
| 5 | The prune step | added — the condition that blocked it is gone, reproduced on a fresh stub |
| 6 | Publish `fieldRetired` | published; **all four fingerprints byte-identical** |
| 7 | The rotten spec and the inert guard half | **delete the spec, do not rewrite it** |
| 8 | The homeless fact | it needed a **derivation**, not a home |
| 9 | One-site correcting | **52%** |

---

## ONE LIMIT, STATED PLAINLY

**This chain enforces what was already established. It does not prove there is nothing else.** Rule A
has never objected to a real copy on a live tree — only to the 2026-06-03 one — because
REGISTRY-LITERALS-1 had already removed them all. Rule B has never caught a real leftover branch, only
ones I pushed to make it object. Piece 9's 52% rests on twenty-one corrections, a small population
whose two halves behave very differently. And piece 3's second-site sweep searched by claim rather
than by string: **5 is a floor, not a total.**

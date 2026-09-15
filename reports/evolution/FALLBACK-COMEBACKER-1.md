# FALLBACK-COMEBACKER-1 — documented once, for one of its three triggers; and it is the OLDER path, not a new one

**Branch** `read/fallback-comebacker-1` · **READ-ONLY — no source changed, nothing minted, nothing
merged, nothing wired.** The owner's store was not opened.

---

## ★★ THE ONE SENTENCE

> **Partly — and less than it looks.** The path is described **twice**: in its own source comment at
> [heroCurveGenerator.js:662-669](../../client/src/modules/heroCurveGenerator.js#L662-L669) and in
> [COMEBACK-STAGED-1](COMEBACK-STAGED-1.md) §*"THE FALL-BACK, which is what makes this safe to leave
> in the tree"*. ★★ **But both describe only ONE of the three ways it fires — the refused staging —
> and that is the RAREST one.** The two that carry most of its work, and the one that casts the drawn
> winner, **are documented nowhere.**
>
> ★ **And the framing "fall-back" is itself misleading: this branch is the ORIGINAL casting path,
> unchanged since 2026-07-08. The staged path was inserted in front of it on 2026-09-11.**

---

## 1 · THE SEARCH — PATTERNS, PATHS, COUNTS

| where | patterns | result |
|---|---|---|
| `docs/`, `reports/` | `fall-back`, `fallback`, `addSolo`, `COMEBACK-STAGED`, `staged comebacker`, `second casting path`, `without a release`, `wantStaged` | 4 / 278 / 9 / 8 / 6 / **0** / **0** / **0** files |
| commit messages, **all refs + reflog — 2 923 commits** | `fall-back`, `fallback`, `addSolo`, `wantStaged`, `winnerIdx`, `second path`, `else-branch` | 9 / 221 / **1** / **0** / 4 / 2 / **0** commits |
| `docs/DEAD-ENDS.md` | all of the above | ★ **0 hits** |
| `docs/BACKLOG.md`, `docs/FORCE-MAP.md`, `docs/ARCHITECTURE.md` | all of the above | ★ **0 relevant** — every `fallback` hit is the offline track list, a geometry fallback or `check-fallback-agreement` |

### Every hit that is actually about this path

| address | describes THIS path? |
|---|---|
| ★ [heroCurveGenerator.js:662-669](../../client/src/modules/heroCurveGenerator.js#L662-L669) — its own source comment | ★★ **YES — the refused-staging case only.** *"AND IF THE STAGED CURVE IS REFUSED, TODAY'S CASTING RUNS FOR HIM UNCHANGED… `addSolo` refuses without marking the racer used, so an attempt that simply `continue`d would consume every pool member on a failed staging and cast NOBODY."* |
| ★ [COMEBACK-STAGED-1.md:72-78](COMEBACK-STAGED-1.md) — *"THE FALL-BACK, which is what makes this safe to leave in the tree"* | ★★ **YES — the same one case**, and framed as a safety property: *"a race whose staging is refused is byte-identical to today."* |
| `4ef59d33` commit message, 2026-09-11 | ★ **YES — the same one case**: *"A FALL-BACK keeps the tree safe: addSolo refuses without marking the racer used…"* |
| [INDEX.md:434-435](INDEX.md) | ★ **touches it** — repeats COMEBACK-STAGED-1's safety line and notes a false-green test. Same one case. |
| `reports/exp-archive/CONCEPT-REVIEW-CC-B2HEROES.md:19` | ❌ **same file, different subject** — `addSolo` in the B2-attacker/faller context. |
| the 8 other `fall-back` commits (2026-07-08…07-13) | ❌ **different mechanism** — PulkLeadRotation's *"dethroned leaders fall back"*, i.e. dropping places. |
| every `staged comebacker` hit | ❌ ★ **about the STAGED path**, and not allowed to stand in for this one. |

★★ **NOT DOCUMENTED ANYWHERE**: that the branch also runs (i) for **every pool member after the
first staged one**, and (ii) for the **drawn winner**, and that it carries **no `winnerIdx`
exclusion**. Searched as above; no hit describes either.

---

## 2 · ITS OWN HISTORY — IT IS THE OLDER PATH

| question | answer |
|---|---|
| which commit introduced the branch? | ★★ **`2a90c4cc`, 2026-07-08**, *"feat(v4): Step 2 — hero curve GENERATOR"* — **not** the staged commit |
| was it there from the start of the two-path structure? | ★★ **It PREDATES it.** The two-path structure was created by **`4ef59d33`, 2026-09-11**, which inserted the staged path **in front of** this one |
| did it ever have the `winnerIdx` exclusion? | ★★ **Never.** `git log --all --reflog -G"p.index !== winnerIdx"` first hits **`4ef59d33`** — the exclusion was **born with the staged path** and has only ever been on it |
| commits touching the loop | `2a90c4cc` (2026-07-08) · `3c4007bf` (2026-07-08) · `4ef59d33` (2026-09-11) · `983d9201` (2026-09-12) |

★ **The proof it is the original, from `4ef59d33~1`** — the whole loop, two months before the staged
path existed:

```js
for (const p of b1Pool) {
  if (cast.length >= drama.nHeroes) break;
  const cr = nextCluster();
  const peakRank = p.rank > cr ? p.rank : Math.min(n, cr + Math.round(drama.peakDepthFrac * (n - 1)));
  if (addSolo(p.index, p.rank > cr ? 'comebacker' : 'sovereign-lead', cr, peakRank)) b1Cluster++;
}
```

★★ **That is today's line 672, unchanged.** So there was never a decision to leave the exclusion off
this path — **there was nothing to leave off.** The exclusion is a property the newer path added for
itself.

★ **A reason for the second path IS on record** — the only one of this block's questions that is
documented: `4ef59d33`'s message and the source comment both say the fall-back exists so a refused
staging does not consume the pool and cast nobody. ★★ **A reason for it having no `winnerIdx`
exclusion is NOT DOCUMENTED**, and none is reconstructed here.

---

## 3 · WHEN IT ACTUALLY FIRES

### The condition, read at the site

[heroCurveGenerator.js:654-661](../../client/src/modules/heroCurveGenerator.js#L654-L661):

```js
const wantStaged = stagingRank != null && !staged && p.index !== winnerIdx;
if (wantStaged && addHeld(p.index, 'comebacker', cr, stagingRank)) { b1Cluster++; staged = true; continue; }
// …falls through to :672
```

★★ **The fall-back runs on FOUR conditions, and the documented one is last:**

| # | trigger | documented? |
|---|---|---|
| ★ **a** | ★ **`staged` is already true** — one staged comebacker per race, so **every later pool member falls through** | ❌ **no** |
| ★ **b** | ★ **`p.index === winnerIdx`** — the drawn winner, if `addSolo` at [:620](../../client/src/modules/heroCurveGenerator.js#L620) refused him and left him unused | ❌ **no** |
| c | `stagingRank == null` — `stagedComebackRank` returns null below `STAGED_COMEBACK.MIN_FIELD` ([:552-556](../../client/src/modules/heroCurveGenerator.js#L552-L556)); **not reachable at N=40** | ❌ no |
| d | `addHeld` refused the staged curve | ★ **YES — this is the one** |

### The count — his fixture, city-circuit, 40 racers, his `QN3HDP` roster, `wild`

| | N=30 | ★ **N=300** |
|---|---|---|
| comebackers per race | 1.67 | ★ **1.82** |
| — staged | 0.73 | **0.72** |
| — ★ **non-staged** | 0.93 | ★ **1.09** |
| races where the non-staged path fires | 73.3% | ★ **82.7%** |

★ **The two agree in direction and I trust N=300**; N=30 understates the non-staged rate by 9 points,
which is sampling, not a different picture. **All figures below are N=300.**

### Which trigger is doing the work — the races DO separate

| the race has… | races | share | which trigger |
|---|---|---|---|
| ★ **staged AND non-staged** | **170** | ★ **56.7%** | ★ **(a)** — the staged slot is taken and the rest fall through |
| non-staged ONLY | 78 | **26.0%** | (b) or (d) — staging never took |
| staged ONLY | 47 | 15.7% | — |
| no comebacker at all | 5 | 1.7% | — |

★★ **The documented trigger is not the main one.** In **56.7%** of races the fall-back fires simply
because **the staged slot is already used** — a structural consequence of *one staged comebacker per
race* meeting an `nHeroes` budget of 2–3, and **that is the case neither the comment nor the report
mentions.**

---

## 4 · WHAT THE FALL-BACK RACER ACTUALLY DOES — N=300

| | ★ **STAGED** | ★ **NON-STAGED** |
|---|---|---|
| racers | 217 | ★ **328** |
| median drawn rank | 3 | ★ **1** |
| median finishing rank | 3 | 3 |
| ★ **won the race** | **47 (21.7%)** | **56 (17.1%)** |
| ★ **held the biggest gap of the race** | **13 (6.0%)** | ★ **59 (18.0%)** — **3× more often** |
| ★ **drawn rank 1** | ★★ **0 (0.0%)** | ★★ **176 (53.7%)** |
| of those drawn 1st, won | — | **47 of 176** |

★★ **THE MEDIAN NON-STAGED COMEBACKER IS DRAWN FIRST.** More than half of them are the racer the
plan intends to win, cast into the role that is supposed to describe a racer climbing back.

★ **And they produce the breakaways three times as often** — 18.0% against the staged path's 6.0%.
**Races where a non-staged comebacker is drawn first: 176 of 300 (58.7%). Races where a staged one
is: 0.** The exclusion at [:654](../../client/src/modules/heroCurveGenerator.js#L654) works exactly
as written — on the path that has it.

---

## 5 · ★★ THE PUBLISHED CLAIM — CORRECT, AND MIS-SCOPED IN ITS WORDING

[INDEX.md:644](INDEX.md) publishes, from DRAWN-PLACE-TRUTH-1: **"0 OF 717 CAST COMEBACKERS ARE DRAWN
FIRST"**.

★★ **It is TRUE of the population it actually measured, and my count agrees with it exactly.** That
report's instrument is `scripts/exp-arrival-shape.mjs`, whose rows come from `_arrivalObs`
(`racePlanner.js:1391`), and `_arrivalObs` is populated **inside `if (heldFree)` at
[racePlanner.js:948](../../client/src/modules/racePlanner.js#L948)**, where `heldFree` requires
`heldReleaseAt != null` ([:941-942](../../client/src/modules/racePlanner.js#L941-L942)) — which is
non-null **only for HELD curves** ([:837-838](../../client/src/modules/racePlanner.js#L837-L838)).

> ★★ **So its 717 are 717 STAGED comebackers, not all cast comebackers.** My count on the staged
> population: ★ **0 of 217 drawn first — the claim holds, exactly.**

★★ **What does not hold is the WORDING.** "Cast comebackers" names a population **2.5× larger**, and
on that population:

| population | drawn first | N |
|---|---|---|
| ★ **staged** comebackers | ★ **0 of 217 — 0.0%** | 300 races |
| ★ **all cast** comebackers | ★★ **176 of 545 — 32.3%** | 300 races |
| (N=30 control) all cast | 18 of 50 — 36.0% | 30 races |

★ **Every one of the 176 is non-staged.** The claim is right about the path it measured and wrong
about the path it names. **The correction is registered beside the original, dated, not overwritten.**

---

## 6 · NOTICED, AND DELIBERATELY LEFT ALONE

- ★ **Three sites cast `comebacker`, not two**, and the third is not in this block's brief:
  [heroCurveGenerator.js:616](../../client/src/modules/heroCurveGenerator.js#L616), the drawn-winner
  site. ★ **From outside, `getHeldRelease` separates staged from non-staged but CANNOT separate :616
  from :672** — both go through `addSolo` and leave no mark. **So "non-staged" here pools the two**,
  and the drawn-rank-1 cases could come from either. **Said rather than glossed**; separating them
  would need an observable the planner does not expose, and adding one is a build.
- ★ **`stagedComebackRank` returns null below `STAGED_COMEBACK.MIN_FIELD`**
  ([:552-556](../../client/src/modules/heroCurveGenerator.js#L552-L556)) — trigger (c). **Not
  reachable at N=40** and not measured at smaller fields here; the brief named one fixture.
- The staged path's own refusal rate (trigger d) is not isolated from trigger (b) in the 78
  "non-staged only" races — **the instrument cannot tell them apart** and neither is claimed.
- **I did not add the exclusion, change the condition or remove the path.**

---

## 7 · THE LEVER, IN ONE SENTENCE, AND THEN I STOP

**The path that casts most comebackers is the one nobody designed as a comebacker path — it is the
pre-staging code still running underneath, and the lever is whether "one staged comebacker per race"
against a 2–3 hero budget is the intended shape at all.**

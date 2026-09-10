# COMEBACKER-ROLE-TRUTH-1 — the contradiction resolves against the brief's premise, and against two of my own sentences

2026-09-10 · branch `night/2026-09-09` · **REPORT ONLY. Nothing changed, nothing proposed, nothing
minted. The working tree is untouched.**

---

## THE ANSWER IN ONE LINE

★ **`heroCurveGenerator.js:412` is ONE OF TWO assignment sites, and it accounts for 37.4% of cast
comebackers.** The other 62.6% come from `:447`, whose gate is final rank **≤ 5**, not **= 1**. So
"comebacker is one of two forms of the assigned winner" is true of a third of them, and the 179 with a
median drawn place of 27 is **not** in contradiction with it.

★ **And the measurement counted the right population** — the same predicate the detector uses. But
**two sentences in COMEBACK-SAME-RACER-1 do not survive this check**, and neither was what the brief
suspected. They are in §4.

---

## 1 · EVERY ASSIGNMENT OF THE ROLE STRING, WHOLE TREE, UNCAPPED

Four search forms over every tracked non-test source file — `'comebacker'`, `"comebacker"`,
`` `comebacker` ``, and the bare word:

| address | what it assigns | final rank it implies |
|---|---|---|
| **`heroCurveGenerator.js:412`** | `const role = wr <= cr ? 'sovereign-lead' : 'comebacker';` — the ASSIGNED WINNER, cast deep | ★ **exactly 1** |
| **`heroCurveGenerator.js:447`** | `addSolo(p.index, p.rank > cr ? 'comebacker' : 'sovereign-lead', …)` — the B1-band pool | ★ **≤ 5** (`finalRanks.get(p.index) <= BAND_EDGES[0]`, `:439`; `BAND_EDGES = [5,15,25,40]`, `racePlanner.js:56`) |

**Those are the only two.** Everything else is a READ, not an assignment:

- `comebackDetector.js:86` — `h.role === 'comebacker'`, the filter that builds `_cast`.
- `framingRule.js:112` — `anchor: 'comebacker'`. ★ **Not a role at all**: it is a framing ANCHOR name
  in a different namespace, sitting beside `'pair-midpoint'` and `'leader'`. It was opened at that
  line to be sure.
- `racePlanner.js:728`/`:738`, `GovernorDiagHUD.jsx:60`, `comebackDetector.js:20-25` — comments and a
  diagnostics label.
- `scripts/diag/comeback-beats.mjs:242`/`441`/`626`/`670` — the harness's own reads.

### ★ AND THE MEASUREMENT SETTLES IT

Authored final rank of all **179** cast comebackers, from the 100-race run that produced the collision
table:

| authored final rank | count | share |
|---|---|---|
| **1** | **67** | **37.4%** ← site `:412`, the assigned winner |
| 2 | 29 | 16.2% |
| 3 | 42 | 23.5% |
| 4 | 21 | 11.7% |
| 5 | 20 | 11.2% |
| **> 5** | **0** | **0%** |

**112 of 179 (62.6%) are NOT the assigned winner.** They finish 2nd to 5th. **And not one of the 179
finishes outside the top 5** — which is `:439`'s gate, visible in the data.

★ **So the contradiction is not between the source and the measurement. It is between the source and a
reading of the source that stopped at the first of two sites.**

---

## 2 · WHAT THE PIECE ACTUALLY READ WHEN IT COUNTED 179

`scripts/diag/comeback-beats.mjs:242`:

```js
const cp = probe.meta.racePlanController?.getCameraPlan?.();
castIndices = (cp.heroes ?? [])
  .filter((h) => h.role === "comebacker" && Number.isInteger(h.index))
  .map((h) => h.index);
```

- `getCameraPlan()` is `racePlanner.js:1283` — `() => plan._cameraPlan ?? null`, the generator's own
  cameraPlan, retained unchanged at `racePlanner.js:745`.
- The filter is `h.role === 'comebacker' && Number.isInteger(h.index)`.

★ **That is byte-for-byte the predicate `comebackDetector.js:86` uses** to build `_cast`:

```js
if (h && h.role === 'comebacker' && Number.isInteger(h.index)) { set.add(h.index); … }
```

**It did NOT read `getHeroRoles()`, and it did NOT read the whole B1 cast.** Attackers (`attacker-b2`),
fallers and sovereign-leads were all excluded by the role filter. **The 179 is the plan's comebackers
and nothing else, and the collision table's heading is accurate about its population.**

---

## 3 · WHICH POPULATION THE CAMERA IS ACTUALLY OFFERED

`comebackDetector.js:157`:

```js
const candidates = this._cast && this._cast.size > 0 ? this._cast : this._b1;
```

- **`_cast`** — built at `:86` from `role === 'comebacker'`. **The same set the 179 counted.**
- **`_b1`** — the fallback, set at `:55` from the plan's `b1Indices`, used **only when the plan cast no
  comebacker at all** (`_cast` is set to `null` at `:92` when the set is empty).

★ **So for 96 of the 100 races measured, what the camera is offered IS what was counted.** In the
other **4** — `garden-path/41005`, `ice-track/41006`, `luger-hill/41003`, `luger-hill/41005` — the plan
cast no comebacker, `_cast` was null, and the detector fell back to `_b1`, **a wider population than
the role**. Those four races were excluded from the 179 and from every figure in the collision table.

**That exclusion is correct for a table about the role, and it means the table says nothing about how
the camera behaves in the 4% of races where the fallback is what is offered.** Named here; not
measured.

---

## 4 · ★ TWO SENTENCES OF MINE THAT DO NOT SURVIVE THIS CHECK

The brief expected the failure to be a wider population. It was not. It is worse in one place and
harmless in another, and both are stated plainly.

### 4a · ★ THE MECHANISM I GAVE FOR THE COLLISION IS WRONG

COMEBACK-SAME-RACER-1 says, and the morning sheet repeats:

> *"The plan casts comebackers from racers who START DEEP — that is what makes a comeback a
> comeback."*

**Neither assignment site reads the drawn place.** Both gate on **rank at the choreo boundary**:

- `:411` — `const wr = stateOf.get(winnerIdx)?.rank ?? 1;` then `wr <= cr`;
- `:447` — `p.rank > cr`, where `p` comes from the `postChaos` array built at `racePlanner.js:687-695`
  from the LIVE field one frame after the choreo boundary.

★ **"Post-chaos rank" and "drawn place" are two different axes, and the casting rule only ever looks at
the first.** The drawn-place figures — median 27, 1.1% inside the top 5 — **stand as measurements**;
the *explanation* attached to them was asserted, not established. **I did not record post-chaos rank**,
so this report cannot establish the link either. What can be said is only that the two correlate
enough to produce the observed distribution — and that is a hypothesis, not a finding.

**Consequence for the collision claim.** "The owner's top-5 rule and the plan's casting are
structurally opposed" overstates it. They are not opposed *by construction*, because the plan's rule
does not select on drawn place at all. What is measured is that **1.1% of the racers the camera is
offered were drawn inside the top 5** — an empirical fact about the population, with its mechanism
unexplained.

### 4b · ★ "REACHED THE TOP 5 IN 95 OF 96" IS NEAR-TAUTOLOGICAL

COMEBACK-SAME-RACER-1 reports, as evidence that the hold-and-release produces a real climb:

> *"★ reached the top 5 after release — 95 of 96 — best rank median 1"*

★ **Every cast comebacker has an authored final rank ≤ 5 by construction** — `:439`'s gate for site
`:447`, and final rank 1 for site `:412` — and the measurement above confirms it: **179 of 179, none
above 5.** The plan's servo steers him there. So "he reached the top 5" is close to a restatement of
the rule that selected him, **not evidence about the hold arm.**

★ **This is a false green of exactly the kind this chain keeps producing**, and it is the third in
four pieces. The number is not wrong; the inference drawn from it is. **What would have made it
evidence — a no-hold control on the SAME cast racer, showing what rank he reaches without the arm —
was never run.** So the hold arm's contribution to that outcome is, as of now, **unmeasured**.

### 4c · WHAT IS UNAFFECTED

- The **overlap, 96 of 96** — a fact about role membership, and §2 shows the predicate was right.
- The **35 shots on him, 81% of all comeback shots** — counted from the director's own lock index.
- The **four arms** in step 3 — switches per minute, precedence firings per race, the 30 lead changes
  arm C cuts and arm D's 0. None of those depends on the role's definition or on the drawn place; they
  are camera behaviour measured against a fixed race.

---

## 5 · METHOD

| | |
|---|---|
| search | 4 spellings × every tracked non-test file under `client/src`, `scripts`, `server`, `shared`; uncapped |
| addresses opened | `heroCurveGenerator.js:395-455`, `:439`; `comebackDetector.js:60-100`, `:157`; `framingRule.js:105-118`; `racePlanner.js:56`, `:687-695`, `:728-745`, `:1283`; `comeback-beats.mjs:242` |
| final-rank measurement | the 179 cast comebackers from the existing 100-race arm-A run — **no new races were run** |
| changed | **nothing.** `git status` clean before and after |

**Not reconciled by choosing one.** The brief's premise and the measurement are both partly right: the
premise describes site `:412` exactly and site `:447` not at all; the measurement describes the union
of both. Neither had to give way — what had to give way was the assumption that there was one site.

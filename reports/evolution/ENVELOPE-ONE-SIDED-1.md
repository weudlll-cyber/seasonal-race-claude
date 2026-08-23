# ENVELOPE-ONE-SIDED-1 — the ±20% naturalness envelope is enforced on one side

**Branch:** `docs/envelope-one-sided-1` off master `07956299`. **Documents only.** No source changed,
no default moved, no remedy proposed. **NIGHT-2026-08-23, piece 5.**

`RACE-ACTION.md` stated the naturalness envelope as symmetric and claimed the guarantee "holds across
all configurations". **Both halves were re-established at source rather than inherited from
BRAKE-CURVE-1 or from the night's brief, and the brief's own summary turned out to be too strong in
one direction and not strong enough in another.**

---

## 1. The finding

**THE FAST SIDE IS CLAMPED. THE SLOW SIDE IS NOT. AND THE FAST-SIDE CLAMP IS NARROWER THAN THE
DOCUMENT CLAIMED.**

| | fast side | slow side |
| --- | --- | --- |
| is there a bound on the realised speed factor? | **yes**, `NATURALNESS_CEILING` = 1.20 | **no — none exists** |
| can a configuration raise/lower it? | **no**, it is a code constant | the bound on `governorMult` **expands with the brake** |
| conditions on it | **two** — see below | — |
| does the shipped game approach it? | it sits just under the effective cap | **no — zero racer-frames at the floor** |

**And the brief's phrasing "hard-clamped in code at 1.20 regardless of configuration" is not exactly
right.** It is clamped at 1.20 *when the cap is switched on*, and what it clamps is *one product*, not
the racer's final speed. Both qualifications are stated below because a guarantee with unstated
conditions is how the document got wrong in the first place.

---

## 2. The fast side, at source

`raceGovernor.js:30` — `export const NATURALNESS_CEILING = 1.2;`

`raceGovernor.js:51-55` — `computeDirectorCeiling` returns
`Math.min(bandMax + Math.max(0, boostHeadroom || 0), NATURALNESS_CEILING)`. **No configuration can
raise this**: `boostHeadroom` is added first and the `min` discards whatever exceeds 1.20, and a wider
band raises `bandMax` while shrinking the headroom that fits underneath. **That much of the document
was correct.**

**CONDITION 1 — the clamp is skipped entirely when the cap is off.** Both engines compute the cap the
same way (`raceCore.js:345`, `sim-fairness.mjs:1597`):
`ceilingCap: (pulkCeilingCap ?? default) ? computeDirectorCeiling(...) : 0`
and the governor applies it at `raceGovernor.js:376` behind `if (ceilingCap > 0 && r.spreadFactor > 0)`.
**With `pulkCeilingCap` off the cap is `0`, the condition is false, and nothing bounds the product.**
What remains is the governor's own upper bound `1 + pulkEnvelopeMaxEffect` on `governorMult` alone —
which, multiplied by a spreadFactor at the top of the natural band, **exceeds 1.20**. `pulkCeilingCap`
is shipped ON, so this is a statement about what the key permits, not about the shipped game.

**CONDITION 2 — the clamp bounds a PRODUCT, not the racer's speed.** `raceGovernor.js:376-377` clamps
`target` so that `spreadFactor × governorMult ≤ ceilingCap`. But the realised speed factor the
naturalness instrument reads is
`spreadFactor × trajectoryMult × governorMult × areaBonusMult` (`sim-fairness.mjs:2197-2200`).
**`areaBonusMult` and `trajectoryMult` are applied outside the clamp's reach.** So the ceiling
guarantees the *director's* contribution, not every multiplier that lands on a racer.

**This is visible in today's numbers rather than merely arguable.** With the shipped band the effective
cap computes to **≈1.1813**, and WILD-STAGE-1's boost arms measured a peak realised speed factor of
**1.1816–1.1824** — *slightly above the cap*, which is exactly what condition 2 predicts and what a cap
on the whole speed would forbid. **Every arm measured stayed below 1.20**; nothing observed breached
the ceiling, and the arithmetic that could is not reached at shipped values.

---

## 3. The slow side, at source

`raceGovernor.js:357` — `const brakeLoBound = 1 - Math.max(maxEffect, leaderBrake);` and at `:369` a
braked racer takes `loBound = brakeLoBound`.

**The floor EXPANDS with the brake.** `max(maxEffect, leaderBrake)` means the ±`maxEffect` realism
clamp stops binding the moment `leaderBrake` becomes the larger of the two, and from there the brake
sets its own floor. **There is no `NATURALNESS_FLOOR` constant anywhere in the tree** — established by
`git grep -n "NATURALNESS_FLOOR\|naturalnessFloor\|MIN_SPEED_FACTOR"` over the whole repository,
returning nothing, on a pattern that would have matched had it existed.

**And there is no bound on the realised speed factor on this side at all** — the fast side has
`ceilingCap` applied to the product; the slow side has no counterpart in the governor or anywhere the
speed factor is assembled.

**What that permits, measured.** BRAKE-CURVE-1 measured the minimum realised speed factor at
**0.655** at a brake of 0.30 and **0.471** at 0.50 — a racer at 47% of its natural pace, with the
fairness gate raising no objection at any of those values.

---

## 4. What the shipped game actually does — stated as plainly as the gap

**Nothing shipped reaches the floor.** At the shipped leader brake, WILD-STAGE-1 measured
**0.0% of racer-frames at the brake's floor** on both tracks and **0 of 30 races** dipping below the
0.80 slow bound, on both tracks. The shipped minimum realised speed factor sits around **0.86–0.87**,
comfortably inside.

**So this is not a live defect and must not be read as one.** **The gap is in what the code would
PERMIT.** It becomes reachable only at brake values above the shipped one — and today's measurements
put half of all races below the slow bound already at the highest brake the key's own documented range
allows, which is why the asymmetry is worth having written down before a dial is designed on top of it.

---

## 5. What changed in the document

| file | change |
| --- | --- |
| `docs/RACE-ACTION.md` §2 | The sacred-property paragraph kept its promise but now says the two sides are not equally enforced and points at §6. **The promise is unchanged; only the claim about enforcement is corrected.** |
| `docs/RACE-ACTION.md` §6 | The sentence *"so the ±20 percent guarantee holds across all configurations"* is **removed** — it was the false claim. A new subsection states the fast side with its two conditions, the slow side with none, and that nothing shipped reaches the floor. |

**One home.** The asymmetry is now stated in exactly one place — `RACE-ACTION.md` §6 — and §2 points
at it. This report holds the evidence; the document holds the rule.

---

## 6. Source hygiene

**Documents only. No source file changed.** `git diff --stat master..HEAD` touches
`docs/RACE-ACTION.md`, this report and `reports/evolution/INDEX.md` — nothing else.

- **Lines before/after in `RACE-ACTION.md`:** 3 → 6 in §2; 5 → 27 in §6 (the five-line paragraph became
  a four-line paragraph plus a 23-line subsection).
- **Removed:** one sentence — *"As the band widens, the available headroom under the fixed ceiling
  automatically shrinks, so the ±20 percent guarantee holds across all configurations."* Its first
  clause was true and is **kept in the rewritten paragraph**; only the false conclusion is gone.
- **Extracted:** nothing. **No value was restated** — `pulkCeilingCap`, `pulkLeaderBrake`,
  `pulkEnvelopeMaxEffect` and `pulkBoostHeadroom` appear by NAME only, as CONFIG-TRUTH-1 requires.
  `NATURALNESS_CEILING`'s 1.20 is a code constant in `raceGovernor.js`, not a `defaults.js` value, and
  was already in the document.
- **Noticed but left alone:** §8's knob list describes `pulkBoostHeadroom` as *"hard-clamped so the
  resulting speed never exceeds 1.20"* — **the same over-claim in miniature**, since it is the product
  and not the resulting speed. It is left because §8 is a one-line-per-knob index that now points at a
  §6 which states the qualification, and because rewriting a second site risks the two drifting. **Named
  here so the next reader finds it deliberately left rather than missed.**
- **Absence claims re-established over the whole tree**, not inherited: `git grep` for a slow-side
  constant (three spellings) returned nothing; `git grep -n "ceilingCap"` found every consumer, and
  there are exactly two (`raceCore.js`, `sim-fairness.mjs`) plus the governor and its test.

---

## 7. Build-vs-spec conformity

1. **The piece said "propose nothing"; the chain says every report carries at least two proposals of my
   own. I did both, by reading them as different scopes.** No remedy for the asymmetry is proposed —
   whether the code gains a floor is explicitly left as the owner's question. The proposals below are
   about other things the piece turned up.
2. **The brief's own statement of the finding was corrected.** It said the fast side is clamped "at 1.20
   regardless of configuration". **Two conditions qualify that** (§2), and reproducing the brief's
   phrasing in the document would have replaced one over-claim with a smaller one. **Stated rather than
   quietly softened.**
3. **A second, unrequested finding is reported: the cap bounds a product, not the racer's speed.** It
   was not in the brief, and it is the explanation for a number already on the record — WILD-STAGE-1's
   peak of 1.1817 against an effective cap of 1.1813, which I had reported as "0.018 of headroom left"
   without noticing it sat *above* the cap.
4. **R15 — which checks were run, and why the others were not.** This change is **documents only**, so
   its gate set is the doc guards, which ran on commit (`GUARDS: PASS 7 FAIL 0`). **No fingerprint, no
   client suite and no race can have changed its answer**, because no file any of them reads was
   touched. **This is the documents-only rule the night's contention rule names**, and it is why this
   piece could be merged while the sweep ran.
5. **Ran alongside PIECE 1's sweep**, in the main tree while the sweep read its own worktree. **Every
   number in this report is either read from source or carried from a report; none was timed**, so
   machine load cannot have affected it.

---

## 8. Proposals

**P1 — THE NATURALNESS INSTRUMENT AND THE NATURALNESS CLAMP MEASURE DIFFERENT QUANTITIES, AND NOBODY
NOTICED UNTIL A NUMBER LANDED BETWEEN THEM.** `--brake-depth` and `amNatMax` read
`spreadFactor × trajectoryMult × governorMult × areaBonusMult`; the ceiling clamps
`spreadFactor × governorMult`. **A cap and its instrument that disagree about what they cover will
eventually produce a "breach" that is not one, or hide one that is.** Reporting both products side by
side — the clamped one and the realised one — would cost one extra field in an observer that already
runs. It matters most now, because the slow side is about to be measured at 80 racers for the first
time.

**P2 — `pulkCeilingCap` IS A BOOLEAN THAT SILENTLY REMOVES THE ONLY ENFORCED HALF OF A SACRED
PROPERTY.** It is shipped on and nothing here suggests changing it. But it is the single key whose
flip converts "naturalness is enforced on one side" into "naturalness is enforced on neither", and
**that consequence is written down nowhere** — `DEVSCREEN-INVENTORY.md` describes it as a cap toggle.
**A one-line note at the key, saying what it turns off, is the cheapest possible guard against a
future tuner switching it to see what happens.** Not proposed as code; proposed as a sentence.

**P3 — THE DOCUMENT DESCRIBED A GUARANTEE; THE CODE IMPLEMENTS A MECHANISM. THE GAP WAS THREE YEARS
OF PLAUSIBLE PROSE.** "The ±20 percent guarantee holds across all configurations" reads as something
someone verified. Nothing in the tree tested it, and the sentence survived because it was reasonable.
**A short convention — that a document sentence claiming an invariant names either the constant that
enforces it or the test that checks it — would have caught this one at writing time.** Offered as an
observation about how this defect was born, not as a process to adopt tonight.

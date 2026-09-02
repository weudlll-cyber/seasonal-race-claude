# B2-HOME-1 — it needed no home; it needed a derivation, and the credit is true for the first time

> **The precondition was met, so it was built.** Nothing the product reads at race time changed:
> both files are outside the engine hull, and `AUDIT_RENDERED_BODY_H` is read by **one test file and
> nothing else**. `verify` **PASS 9 FAIL 0**; the racer-types integration suite **21/21**.

---

## THE ONE PARAGRAPH THE BRIEF ASKED FOR

**B2's single home is that it does not get one.** `renderedBodyH` is `displaySize × bodyFillY` — the
**product** of two registry fields that each already have exactly one home in
`client/src/modules/racer-types/*RacerType.js`. Under R14 a derived value is owed a **derivation**,
not a home of its own; giving it one would create the second definition that rule forbids. So nothing
new is stored. What reads from it is `racer-types.integration.test.js`, and only that — twenty pinned
numbers that are a **frozen witness** to what the product was when it was taken, not a source of
truth. It can be established without changing anything the product reads at race time, and it was:
`AUDIT_RENDERED_BODY_H` appears in one test file, both changed files are outside the engine hull, and
no fingerprint is in reach.

---

## 1. THE CREDIT WAS FALSE, AND IS NOW TRUE

The test's comment read:

> *"Audit values (px) from `scripts/audit-sprite-crops.mjs` — measured post-crop."*

**That tool has never emitted this number.** It prints frame geometry and fill ratios; `grep` for
`renderedBodyH`, `RendBody`, `displaySize *` and `* bodyFillY` in it returned nothing.

**The repair is one column, not a new store.** Both factors were already in scope on the audit's own
print row, so the product is now shown there:

```
ID           Frame      Body       BBoxFill%   PxFill%   DispSz   RendBodyH  plain X/Y      vs REGISTRY
horse        150x150    53x120     28.3%       14.0%     47       37.60      0.353/0.800    both agree
duck         128x128    112x112    76.6%       27.4%     36       31.50      0.875/0.875    both agree
snail        128x128    93x120     68.1%       30.0%     35       32.83      0.727/0.938    both agree
```

Against the pins — horse **37.6**, duck **31.5**, snail **32.8**. **The credited tool now produces the
numbers it was credited with**, so the derivation can be re-run instead of trusted.

---

## 2. ★ THE DEFECT THAT MADE THIS WORTH DOING WAS NOT THE ONE FILED

The filed defect — a script credited with values it did not produce — is inert. What costing it turned
up is not.

**The test was titled `within ±5%` and asserts `toBeCloseTo(expected, 1)`, which is `|a−b| < 0.05`
ABSOLUTE.** For the `buggy` row, ±5% would allow **1.665 px**; the real bound is **33× tighter**.

**And buggy sits on it.** Measured today: computed `33.250000` against pinned `33.3` — a delta of
**5.00e-2 against a 0.05 bound**. It passes by floating-point dust.

**So this is a live tripwire on a race input**, and when the next rounding change fires it the reader
is misdirected twice: by a title promising a tolerance 33× looser than the one that failed, and by a
provenance line naming a tool that could not have produced the number.

### What was corrected, and what deliberately was not

- **The title is corrected**, because it was the false statement.
- **The provenance is corrected**, because it was the false statement.
- **The tolerance is NOT loosened.** Choosing how much drift is acceptable in a race input is a
  judgement about the product, and a new one — the brief's rule is to stop at the last honest step.
  The hazard is now written where the next reader meets it, with the measured margin, rather than
  discovered when it goes red. **On the morning sheet.**

---

## 3. WHAT MOVED, AND WHAT POINTED AT IT (constraint 2)

| what moved | what pointed at it | outcome |
| --- | --- | --- |
| `audit-sprite-crops.mjs` gained a column | `docs/RACER_DATA_MODEL.md:255` describes what the tool checks | still true — it says the tool checks the sheets against the registry, which is unchanged |
| the test's comment and title | nothing cites them | — |
| `AUDIT_RENDERED_BODY_H` | searched uncapped: **one test file** | nothing at race time reads it |
| both changed files | `engine-reach --check` | *"none of 2 path(s) can reach the race engine"* — outside the hull |

**One stale sentence found and deliberately not touched:** `docs/BACKLOG.md:787` says
`audit-sprite-crops.mjs` *"has NEVER agreed"*. That was true of its hardcoded geometry table and
SPRITE-AUDIT-DERIVATION-1 repaired it on 2026-09-02. It sits inside a closed entry recording what was
true when that entry was written, and piece 3 owns document corrections; it is named here so the next
reader does not take it as current.

---

## Limits

**This is not a guard.** The twenty pins still agree with the derivation, and nothing enforces that
they will — the test does, at a tolerance nobody chose deliberately. Rule A cannot help: it discovers
registry FIELDS, and `renderedBodyH` is not one, it is a product of two.

**The frozen witness is still twenty hand-written numbers.** Keeping them is the right call — they
record what the product was at a moment, which is what makes the test a regression check rather than a
tautology — but they are not derived at test time, so a re-measurement still has to be pasted in by
hand.

**Nothing was done about B3.** HOMELESS-HOMES-1 recommended dropping it: `surfaceClasses` in
`goldenRunner.mjs` agrees with no source, and its honest home is none. That recommendation was CC's
rather than the owner's, so it is left as a proposal, exactly as the brief instructed for B2's.

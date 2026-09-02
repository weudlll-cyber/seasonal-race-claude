# BODY-IS-THE-BOX-1 — the manta's tail is hers, the rule is written down, and the two rules differ in TWO ways

> **NOTHING ABOUT ANY RACE CHANGES.** No `bodyFillX` or `bodyFillY` was corrected, no default moved,
> no fingerprint moved. All four fingerprint guards report **`nothing changed`**, mechanically:
> every file this block touches is outside all four import closures.

**The owner, 2026-09-02: a racer's body is what is visible; the manta's trailing tail is part of
her.** So the plain opaque bounding box is the owning rule, and the forty pinned registry values
stand exactly as written. This block writes that rule where a person regenerating a sheet will meet
it, and makes the Racer Editor return it — because until today the editor would have written a
different number into a value the race reads.

---

## 1. THE DEFECT THAT IS NOW CLOSED

`measureBodyFill` (`client/src/screens/RacerEditor/canvasUtils.js`) called
`computeSpriteBoundingBox`, which sheds sparse edge strips. All forty registry values had been
produced by the **plain** box. So re-measuring any of five sheets — dragon, plane, beetle, koi,
manta — in the Racer Editor would silently have written a smaller number into `bodyFillX`/`bodyFillY`,
and those set the body's extents in `headlessRaceSimulator.js` and `RaceScreen/index.jsx` and lay out
start rows in `rowLayout.js`. **It would have changed who wins races.**
[SPRITE-AUDIT-DERIVATION-1](SPRITE-AUDIT-DERIVATION-1.md) established the disagreement; this closes it.

The editor now calls `computeOpaqueBoundingBox`. **One call site, one import.**

---

## 2. ★ THE FINDING THAT WAS NOT IN THE BRIEF: THE TWO RULES DIFFER IN TWO WAYS

The shedding is the known difference. **There is a second one, and it decides two of the twenty
types.** `computeSpriteBoundingBox` counts a pixel as opaque at `alpha > 10`. The rule that produced
the registry counts it at `alpha >= 10`.

Measured against the twenty shipped sheets, union over every frame, compared at the three decimals
the registry stores:

| threshold | reproduces the registry on |
| --- | --- |
| `alpha >= 10` | **20 of 20** |
| `alpha > 10` | **18 of 20** — beetle `0.398 → 0.383`, koi `0.578 → 0.574` |

**This was found by sabotage, not by reading.** The first attempt at this repair derived the plain
box by extracting `computeSpriteBoundingBox`'s own scan, which looked like the clean shape and was
wrong: the audit tool's output moved on beetle and koi the moment it was wired in. A repair that
changes two numbers is not a repair. **The two functions are therefore separate, each with its own
scan**, and the file says at the point of definition why they differ and why deriving either from
the other would be wrong in whichever direction it was done.

`computeSpriteBoundingBox` is **behaviourally untouched** — the only executable change to
`backgroundRemoval.js` is the addition of a new function; `git diff` on that file shows no removed
line of code.

---

## 3. THE TWO FINDINGS PUT UP FOR VERIFICATION, AT THE ARTWORK

### Finding 1 — "the pins were taken as a MAX across frames" — **REFUTED, twice**

They were taken as the **UNION** over frames, which is a different and larger thing. Union and max
coincide on 12 of 20 types — manta among them, which is why the max reading looked right there. On
the other **8** the union is strictly wider than any single frame, and on all 8 it is the **union**
that matches the registry:

| | union == registry | union == max-over-frames |
| --- | --- | --- |
| of 20 types | **20** | 12 |

The eight where they differ: giraffe, f1, buggy, luge, beetle, boarder, koi, snowmobile.

And the second half of the finding — that this part of the rule is *unwritten* — was also wrong.
`measureBodyFill`'s own doc comment has said "the union over all frames" since it was written. **What
was unwritten was which BOX rule, not which combination rule.**

### Finding 2 — "the shedding rule varies 0.578–0.680 over manta's sixteen frames" — **CONFIRMED, exactly**

Manta, 16 frames, 128×128, registry `0.633 / 0.805`:

| rule | `bodyFillY` per frame | spread |
| --- | --- | --- |
| plain | 0.766 – 0.805 | 0.039 |
| shedding | **0.578 – 0.680** | **0.102** |

`bodyFillX` is 0.633 on every frame under both rules — the tail moves in Y only, so the disagreement
is on exactly the axis the tail occupies. **The shedding rule sheds the tail when the tail is swept
thin and keeps it when the tail is broad.** A measure that tracks the wingbeat is measuring the pose,
not the body. This is written into `docs/RACER_DATA_MODEL.md` as the strongest argument for the
decision, as the brief asked.

### The generalisation of finding 2 — **REFUTED, and stated because it is tempting**

I tested whether the shedding rule is therefore generally more *fragile* at the level of the pinned
value, by withholding one frame at a time and measuring how far each rule's union moves. It is not:

| | shedding moves more | equal | plain moves more |
| --- | --- | --- | --- |
| of 20 types | **1** (manta) | 17 | 2 (beetle, koi) |

Mean worst one-frame-out move: plain **0.023**, shedding **0.024** — a ratio of 1.04×. **The
frame-dependence argument is a manta argument, not a general one.** It is exactly as strong as the
decision needs and no stronger.

---

## 4. ALL TWENTY AGREE WITH THE OWNING RULE

`node scripts/audit-sprite-crops.mjs` — **zero rows report `OWNING RULE DIFFERS`.** Five rows report
`shedding would differ`, which is the size of the tail the owner decided to keep and is reported so
the gap stays visible: dragon, plane, beetle, koi, manta. The tool's numbers are unchanged from
before this block; what changed is that its plain box now comes from the product module instead of a
hand-rolled copy, and its verdict labels no longer say "EDITOR WOULD DIFFER", which stopped being
true today.

**The full table is the tool's own output and is not copied here**, per the one-canonical-home rule.

---

## 5. `computeSpriteBoundingBox` WAS NOT DELETED, AND HERE IS WHAT ELSE USES IT

Established by search before touching it, as the brief required:

| caller | what for |
| --- | --- |
| `computeSpriteOffset` (same file, :151) | **CENTRING** — scales the box centre into canvas space |
| `SpriteGeneratorPanel.jsx:88, :205` | centring an uploaded sprite, and re-centring after background removal |
| `scripts/audit-sprite-crops.mjs` | reporting the gap between the two rules |

**Shedding is right for centring.** A few surviving background pixels at a border would drag the
centre off, and trimming them is the whole point. The honest shape was therefore a second function
beside it, not a replacement — and the alpha finding in §2 turned that from a preference into a
requirement.

---

## 6. THE SABOTAGE PROOF

`client/src/screens/RacerEditor/canvasUtils.bodyRule.test.js` is new and mocks nothing below the
canvas: real pixels go in, the real box functions run. Its fixture is manta's shape reduced to the
smallest thing that separates the rules — a solid block with a one-pixel-wide tail below it, where
the plain box reports 0.80 and the shedding box reports 0.62.

Pointing `measureBodyFill` back at `computeSpriteBoundingBox`:

```
× the tail is body — bodyFillY is the plain box, not the shed one
  AssertionError: expected 0.62 to be close to 0.8
```

**Red, with the predicted numbers.** Sabotage reverted; the file is byte-identical to before it.

Two further pins were added to `backgroundRemoval.test.js`: that the plain box keeps a sparse strip
the shedding box trims, and that **alpha exactly 10 is inside the body box and outside the shedding
box** — so §2's finding cannot be tidied away in either direction without going red.

---

## 7. THE PROOF THAT THIS SHIPS NOTHING

| claim | how it was established |
| --- | --- |
| no racer value changed | no `*RacerType.js` and no `defaults.js` in the diff |
| outside the engine hull | `node scripts/engine-reach.mjs --check` on all four paths → *"none of 4 path(s) carry a change that can reach the race engine"*, exit 1 |
| **no fingerprint can move** | all four fingerprint guards routed as **`nothing changed`** — world, world-off, camera, render. Mechanical, not an argument |
| guards green | `node scripts/verify.mjs` → **PASS 13 FAIL 0 SKIP 13**, client suite included |
| the audit's numbers did not move | its twenty rows are digit-for-digit what they were before the rewiring; only labels and derivation changed |

---

## Limits

**The editor path was not run against the real sheets.** `measureBodyFill` decodes through a browser
canvas; the twenty-of-twenty agreement was established through `sharp`. Both read the PNG alpha
channel and there is no premultiplication in either path, so they should agree — but I did not
demonstrate it, and if a decode difference existed it would show up exactly as a one-alpha-level
disagreement, which is the kind §2 just found. **What is proven is the algorithm and the artwork; the
browser decode is inferred.**

**Nothing establishes that the plain rule is the RIGHT measure of a body in general.** It is the rule
the owner chose and the rule that authored the values in the tree. Those are two good reasons and
neither is a proof about artwork nobody has drawn yet.

**No sprite was opened and looked at.** This block, like its predecessor, measures algorithms against
pixels. Whether manta's tail *looks* like body is the judgement that was made on 2026-09-02, and it
was made by the owner, not here.

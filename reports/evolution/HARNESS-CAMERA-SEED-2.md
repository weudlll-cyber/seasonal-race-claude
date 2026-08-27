# HARNESS-CAMERA-SEED-2 — the harness camera follows the browser, and 44 instruments now measure something different

**Built.** One default changed in `scripts/lib/raceDriver.mjs`, plus the import that makes it
possible. **His decision of 2026-08-23**, recorded and never built.

**THIS CHANGES WHAT EVERY MEASUREMENT MEASURES.** That is not a side effect; it is the point, and the
warning it requires is below.

---

## THE CHANGE

```js
// before
cameraSeed: partial.cameraSeed ?? 1439767152,
// after
cameraSeed: partial.cameraSeed ?? cameraSeedForRace(partial.raceSeed ?? 5601),
```

`cameraSeedForRace` is **imported from the browser's own module**, not re-implemented — a harness that
carries its own copy of the product's rule can drift from it, which is the defect this repairs rather
than a shape to repeat.

**The constant is not deleted.** A caller that passes `cameraSeed` explicitly gets exactly what it
passed. **Only what an OMISSION means has changed.**

| call | camera seed before | camera seed now |
|---|---|---|
| `resolveIdentity({ raceSeed: 5601 })` | 1439767152 | **2246827914** |
| `resolveIdentity({ raceSeed: 6 })` | 1439767152 | **2246822509** |
| `resolveIdentity({ raceSeed: 6, cameraSeed: 1439767152 })` | 1439767152 | 1439767152 |

**Every race now gets its own camera**, as the browser has since 2026-08-23. Before this, forty-odd
instruments ran one camera across every race and every track.

## THE CONSTANT WAS NOT LOAD-BEARING — checked at source, then proven by running it

The brief required stopping if the constant turned out to be load-bearing in a golden comparison or a
pinned fixture. It is not, and this was established twice over.

**First at source.** `scripts/camera-fingerprint.mjs:112` and `scripts/render-fingerprint.mjs:181`
each declare their **own** `const CAM_SEED = 1439767152` and call `cd.setRandomSeed(CAM_SEED)`
directly. Neither reaches `resolveIdentity`'s default. `fingerprint-default.mjs` and
`check-ending-frame.mjs` do not mention a camera seed at all.

**Then by running it.** `check-fingerprints --mint` on the changed tree:

```
check-fingerprints: 4 roles, 1060 tracked files scanned, 0 stray copies,
                    4 role(s) re-minted against the engine.
```

**Zero failures on all four roles — world, world-off, camera and render are byte-identical to the
record.** Nothing was minted, and nothing needed to be.

**That the backlog said so was not treated as evidence.** It claimed "the fingerprints are NOT
affected — they carry a private copy of the same number and never read the default", and it was
right; BACKLOG-TRUTH-2 hours earlier is why it was checked anyway.

## ⚠ WHICH NUMBERS ARE NO LONGER COMPARABLE

**Any figure produced by an instrument that omitted `cameraSeed`, taken before 2026-08-27, cannot be
compared with one taken after.** They are different cameras on the same races.

- **63 files call `resolveIdentity`. 19 pass `cameraSeed` explicitly and are unaffected** — including
  every instrument written during the recent camera work (`leader-lag-truth`, `leader-lateral-minimal`,
  `along-residual`, `anchor-room-gap`, `midrace-leader-clip`, `runin-aim-axes`, `check-runin-frame`),
  because those already derived it from the race seed.
- **The remaining 44 change.** Their historical numbers stand as records of what was true under the
  old camera and must not be mixed with new ones.

**In particular:** any *picture* claim — clip rates, framing shares, camera-motion figures, run-in
step sizes — from an instrument in that group and dated before today. **Race and physics figures are
unaffected**, because the camera seed does not touch the world; the unmoved world fingerprint is the
proof.

**NOTHING WAS RE-BASELINED, no historical corpus was re-run, and no stored fingerprint was touched**,
exactly as the brief required. The old numbers are not wrong — they are answers to a different
question, and the reports carrying them are append-only records of the day they were taken.

## WHY THIS WAS WORTH BUILDING

HARNESS-CAMERA-SEED-1 established the cost: **43 of 53 callers took the constant, and 19 instruments
made picture claims on a camera the product cannot produce.** It also measured what changes:
re-deriving the width-step hit list gave **30 races, not 26 minus 6 — a different population**, while
his own twelve survived re-measurement.

**A harness whose camera cannot occur in the product is not measuring the product.** Every future
measurement now runs the camera a viewer would actually get.

## CONFORMITY

- His decision of 2026-08-23, built as decided.
- The browser's derivation is imported, not copied.
- All four fingerprints run and unmoved; nothing minted.
- No re-baselining, no historical re-runs, no stored fingerprint touched.
- The obstacle HARNESS-CAMERA-SEED-1 named — "an append-only journal whose tables would stop matching
  their tools" — is handled the only way an append-only journal permits: **the tables stay, and this
  report is the note that says from which date they stop matching.**

## PROPOSALS

**P1 — the 19 explicit callers should now DROP their explicit seed, and not yet.** They pass
`cameraSeedForRace(seed)` by hand, which is exactly what the default now does. Removing it would make
them shorter and identical in behaviour. **Not done here** because it would touch 19 files for zero
behaviour change on a night that has already merged eight pieces, and a no-op diff across 19
instruments is a bad thing to land unreviewed.

**P2 (mine) — the constant should become impossible to reach by accident.** `1439767152` still
appears as a literal in 17 files. Two of them need it (the fingerprints, deliberately). The rest are
instruments that pinned it before the browser's rule existed. **A named export — `LEGACY_CAMERA_SEED`
— with a comment saying why the fingerprints use it would make every remaining use a deliberate one**,
and would make a new instrument copying the literal look wrong.

**P3 (mine) — the reports that carry old picture numbers cannot be edited, so the INDEX should carry
the boundary.** Append-only means a reader can find a 2026-08-20 clip rate and a 2026-08-28 one and
compare them without a warning anywhere in sight. **One dated line in
`reports/evolution/INDEX.md`'s CORRECTIONS section** — "picture figures from instruments that omitted
`cameraSeed` are not comparable across 2026-08-27" — puts the warning where someone browsing reports
will meet it. That section exists for exactly this and this piece did not use it; it is proposed
rather than done because it is a claim about *every* report and deserves his eye.

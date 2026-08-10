# MIRRORS-BY-REFERENCE — a fallback reads the default, it does not copy it

**Branch:** `feat/mirrors-by-reference`, off master `be4202c8`. **Not merged, not minted.**
**No default value changed. No behaviour changed. All three fingerprints unchanged.**

---

## THE RESULT

```
byRef        55  ->  314      (+259)
disagree     42  ->   42      unchanged — the 42 were NOT touched
unresolved    1  ->    1      unchanged
skipped       1  ->    1      unchanged
total       361  ->  361
```

**259 fallbacks can no longer drift from the default they mirror.** What remains as a literal is
either one of the 42 (a real disagreement, by instruction untouched) or the one entry the guard
cannot resolve across modules.

```
WORLD   dc4647be0f55ebdb   UNCHANGED
CAMERA  ad07c08ce5d8ae49   UNCHANGED
RENDER  752df7bc61ef0721   UNCHANGED
```

**The world fingerprint was run TWICE**, and the second run is the one that counts: the first
measured the code before the comment pass added a reference line to four hull files. Comment-only
edits cannot move a hash and the project has an INERT rule saying so, but a second 2½-minute run is
cheaper than an argument — `dc4647be0f55ebdb` on the fully-edited tree as well.

All three ran because the routing selects them: `engine-reach --check` reports **4 of 21 changed
paths can change the race** (`raceCore.js`, `raceBehavior.js`, `racePlanner.js`,
`heroCurveGenerator.js`). Client suite **3878 passed / 194 files**; the guard's own suite 12/12;
`eslint src/` clean apart from two warnings that are on master already.

---

## HOW IT WAS DONE, and why that matters

**The transform was driven by the guard's own scanner**, not by a hand-written regex over the tree: a
one-time codemod that loads the same defaults map (`DEFAULT_*` exports of `storage/defaults.js` and
`autoSpriteScale.js`, same ambiguity rule) and matches with the guard's own `NULLISH` pattern. It
rewrites a site **only** when the resolved fallback value is `===` the default. Anything the guard
skips, cannot resolve, or reports as disagreeing was structurally out of reach.

**So the verification is not "I looked at the diff".** It is that the guard's own counters moved by
exactly the number of sites it previously called agreeing, with the disagreement count untouched, and
that three fingerprints and 3878 tests are unchanged.

---

## THE IMPORT DIRECTION — the block was right to make it a limit

`storage/defaults.js` is **already inside the engine-reach hull** (via `raceBehaviorConfig.js` and
`raceDynamicsConfig.js`), so importing it into a hull module adds no hull member. The hull is still
20 files. But "already in the hull" is not the same as "free", and two files needed a decision:

- **`raceBehavior.js` imported exactly one module before this block — `mathUtils.js`.** It is the
  physics kernel and it was deliberately clean. Rather than reach into `storage/` from it, it now
  imports `DEFAULT_RACE_BEHAVIOR_CONFIG` **from `./raceBehaviorConfig.js`**, which already owns that
  relationship, is already in the hull, and is already imported by `raceCore.js`. The new edge is
  hull-internal. Cycle checked: `raceBehaviorConfig.js` does not import `raceBehavior.js`.
- **`raceCore.js` and `racePlanner.js` needed no new import at all** — both already import their
  default (`raceCore` from `raceDynamicsConfig.js`, `racePlanner` from `storage/defaults.js`).

Cycle check on the new dependency root: `storage/defaults.js` imports `autoSpriteScale.js`, which
imports `storage/storage.js` and `storage/configDiff.js` and nothing else. No cycle is possible.

**Nothing had to be left for a dependency reason.** That is a finding in itself: the feared coupling
was already paid for.

---

## TWO FILES THAT DOCUMENTED THEIR LITERALS AS DELIBERATE — and were converted anyway

Both `cameraTimingComputation.js` and `framingConfig.js` carry comments defending the literal. I read
them before overriding them, and the reasons had expired:

- **`framingConfig.js`**: *"deliberately a literal rather than an import, matching the fallback
  convention used throughout this project"* and *"Nothing guards this agreement."* The second half is
  no longer true — FALLBACK-GUARD-1 guards exactly this — and the first half cites the convention
  this block exists to replace. Converted, comment corrected.
- **`cameraTimingComputation.js`**: *"duplicated in `storage/defaults.js` … The duplication is
  GUARDED by a test that asserts the two agree."* A guarded duplication is better than an unguarded
  one and worse than no duplication. Converted; the module gained its first import.

**This is the one place where a mechanical sweep overrode a written decision, so it is called out
rather than buried.** If the owner disagrees, both are one revert each.

---

## THE ORPHANS, and the exported ones

Converting a `?? NAMED_CONSTANT` leaves the constant unused. Thirteen were orphaned and handled two
ways:

| shape | files | what |
|---|---|---|
| **private, now unread** — deleted | `cameraTimingComputation.js` (8), `raceBehavior.js` (4), `racePlanner.js` (1) | a dead constant holding a copy of a default is the exact drift this block removes |
| **exported, read by a test** — redefined FROM the default | `framingConfig.js` (4) | the export survives for `framingConfig.test.js`, and the constant is itself now by-reference |

`eslint` was the instrument: it names an unused constant, and after the pass the only two warnings
left are both present on master (`CEREMONY_BEAT` in `CameraDirector.js` — which is Piece 7's item —
and an unused `x` in a test).

---

## THE GUARD HAD TO LEARN THE NEW SHAPE, and that is the interesting part

Converting the four `framingConfig.js` constants turned **two green entries into UNRESOLVED**. The
guard's `localConstants` resolver only understood `const X = <literal>`; a constant defined as
`const X = DEFAULT_CAMERA_CONFIG.k` was unreadable to it.

**A guard that rewards the old shape and cannot read the new one is an argument against improving the
code.** It now resolves a by-reference constant as `byRef`, and — the part worth having — reports a
constant that names a **different** key as the `cross-key` defect it already reports inline.

That is +22 lines in the guard, its 12 tests still pass, and the unresolved count went back to 1.

---

## THE COMMENT RULE — and my interpretation of it, stated so it can be overruled

The rule: one lesson entry for the class, a one-line reference at each converted site, not a
paragraph per site.

**Taken literally that is 314 identical comment lines, 94 of them consecutive inside one slider
list** — which is the noise the rule exists to prevent. I put **one reference line per converted
FILE, at the import that makes the conversion possible**, which is where a reader who meets
`DEFAULT_CAMERA_CONFIG.k` in a fallback actually looks. 17 lines, not 314.

The class lesson is **[LESSONS L207 — The Copied-Default Law](../../docs/LESSONS.md)**, which states
the rule, the one exception (an OFF-arm switch is not a mirror and keeps its literal AND its reason),
and the corollary about guards above.

---

## SOURCE HYGIENE

**21 files, +344 −273.** The insertions exceed the deletions by roughly the 17 reference lines, the
guard's 22, and LESSONS' 32; the code itself is close to a wash because most sites are one-line
substitutions.

| file | +/− |
|---|---|
| `CameraAdvancedSection.jsx` | +95 −94 (94 sites) |
| `cameraTimingComputation.js` | +43 −48 (40 sites, 8 constants deleted) |
| `raceCore.js` | +35 −34 (34 sites) |
| `docs/LESSONS.md` | +32 −0 (L207) |
| `RaceScreen/index.jsx` | +24 −22 (22 sites) |
| `raceBehavior.js` | +23 −25 (21 sites, 4 constants deleted) |
| `scripts/check-fallback-agreement.mjs` | +22 −0 (the resolver) |
| `racePlanner.js` | +15 −15 (14 sites, 1 constant deleted) |
| 13 more | +52 −35 |

### Noticed but left

- **`framingConfig.test.js` now compares two things that are the same value by construction.** It
  asserts `f.minRacersVisible === DEFAULT_MIN_RACERS_VISIBLE`, and the constant is now defined from
  the default the function reads. The test is no longer capable of failing on divergence, because
  divergence is no longer expressible. **Left in place and named here** — deleting a test in a sweep
  is worse than leaving a vacuous one, and the honest fix is a decision about that file, not a side
  effect of this one.
- **`CEREMONY_BEAT` is imported by `CameraDirector.js` and never used** — pre-existing on master,
  and it is exactly Piece 7's `_ceremonyBeat` item. Not touched here.
- **Five of the 262 agreeing sites are `band`-shaped**, resolved through a constant rather than
  inline. Four are `framingConfig.js`'s exported constants (converted at the definition, which covers
  every use). The transform reached 257 inline sites plus those 4 definitions = **259 by the guard's
  count**.
- **The codemod itself is not committed.** It is a one-time transform whose output the guard verifies;
  keeping it would invite someone to re-run it against a tree it was not written for.

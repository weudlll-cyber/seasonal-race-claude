# PER-KEY-REJECT-1 — a bad key costs the key, not the config; and the accepted set did not move by one value in 160,004

> **The defect.** Five of the seven config stores answered any single bad value with
> `return { ...DEFAULTS }`. One key outside its range and the operator lost **every tuning in that
> store**, and was never told which key did it or that anything had happened.
>
> **Fixed, class-wide.** A failing key is rejected **alone** and falls back to **its default**; every
> other key survives; the operator is **told which key, what was stored, and what is being used**.
>
> ★ **The accepted set is bit-identical.** 160,004 randomized configs, the new rule lists against the
> old `||`-chains read out of `master`: **0 disagreements.** §4 — and the first run found **4,204**,
> which is why this section exists at all.
>
> **All four fingerprints unmoved.** No migration. Nothing rewrites a stored file.

---

## 1. THE CENSUS — WHICH OF THE SEVEN DISCARD WHOLESALE

The brief named the camera store as where LOADER-TOLERANCE-1 found this. **It is not there.** The
camera store validates **nothing at all**; the whole-object reject the tolerance comment was written
about lives in `raceDynamicsConfig.js`, which is also the store `choreoOutcomeStart` belongs to.
Stated plainly because the correction changes where a reader should look, not because it changes what
had to be done.

| store | before | after |
| --- | --- | --- |
| `raceDynamicsConfig` | **WHOLESALE** — ~40 keys behind one `return` | per key |
| `raceBehaviorConfig` | **WHOLESALE** — ~43 keys behind one `return` | per key |
| `rowLayoutConfig` | **WHOLESALE** — 3 keys | per key |
| `baseSpeedConfig` | **MIXED** — `min`/`max` wholesale; `normalSpeedPxPerSec` already per key | per key |
| `frameTimingConfig` | **MIXED** — `dtSmoothingAlpha` wholesale; `renderInterpolation` and `scoreboardIntervalMs` already per key | per key |
| `cameraConfig` | **no validation at all** | unchanged, deliberately |
| `autoSpriteScale` | **no validation at all** | unchanged, deliberately |

**FIVE discarded wholesale, two never validated anything.** And the two that do not are left alone
with the reason written where each loads: the camera store's header argues at length that its design
is *defaults underneath, stored on top, nothing else*, and `autoScale`'s five numbers have never had
a measured bound. **Giving either one rules now would mean inventing limits nobody has stated** —
which is the redundancy the standing constraints forbid, not the uniformity they ask for.

---

## 2. WHAT "REJECTED" MEANT PER KEY BEFORE — AND WHY THE REPAIR CHOSE THE DEFAULT

The brief asked which of three it was: **dropped, clamped, or replaced by its default.** All three
existed in the tree, and the answer decided itself:

- **Dropped** — never. The resolver walks the DEFAULT keys, so a key can never be absent from a
  resolved config.
- **Clamped** — **nowhere in a loader.** The only clamping is at the Dev Screen's own controls, on
  the way IN.
- **Replaced by its default** — **the three keys that were already per-key**
  (`normalSpeedPxPerSec`, `renderInterpolation`, `scoreboardIntervalMs`) all did exactly this, and
  so did the whole-object case, for every key at once.

**So this store set had already answered the question, twice, the same way.** A clamp would have been
a third answer — and worse than that, it invents a value nobody chose and then presents it as the
operator's own setting: a stored 0.65 silently becoming 0.60 is indistinguishable, afterwards, from
an operator who typed 0.60. The default is the value the product ships and the only one a reader can
predict without knowing the bound.

---

## 3. THE REPAIR, AND THE ONE PIECE THAT NEEDED A DECISION

`storage/configValidate.js` — pure, no imports beyond its sibling, one leaf on the engine hull and
not one new edge, for the same reason `configDiff.js` states.

Each store now declares its rules as data: `{ keys, ok, why }`. `applyKeyRules` runs them, and on a
failure reverts **only those of the rule's keys that DEVIATE FROM THEIR DEFAULT** — the ones the
operator actually set. A key already sitting at its default cannot be the cause, and reverting it
would report a loss that did not happen.

**CROSS-KEY RULES ARE WHY A RULE OWNS A SET.** `min < max`, the look-before-brake margin against the
brake-zone multiplier, and `outcomeStart < contestWindowStart < releaseProgress` each constrain two
or three keys jointly, and **nothing in a stored object says which one is the mistake**. So both
sides go back to default when both were set, and only the set one goes back when only one was. The
rules then re-run to a fixed point, because reverting one key can break another.

**Two shapes were flattened, for precision rather than tidiness.** The dynamics store's
`[releaseProgress, resolveB2..B5].some(...)` became **five** rules — as one it would have taken the
other four resolves down with a bad B4 — and `contestWindowStart` became **three**, so a bad value
there does not revert the two keys it is compared against. **And one clause was dropped as a
duplicate:** `trajectoryTransitionDuration <= 0` appeared **twice** in the old dynamics chain, at
positions 3 and 6. Two identical clauses in one `||` accept exactly what one does.

### The operator is told

`storage/configReport.js`, beside `configDiff` and `configValidate`. One line per key per store, for
the life of the page:

    [storage] "racearena:raceDynamicsConfig" → "choreoOutcomeStart" was REJECTED: you had 0.9
    stored, and it must be a number between 0.25 and 0.70. Using the shipped default 0.6 instead.
    EVERY OTHER KEY IN THIS CONFIG IS UNCHANGED.

**WHERE, AND WHY THAT AND NOT SOMETHING NEW.** This is the same fault class `storageGet`'s existing
warning covers — *something you had stored is NOT in effect and nothing on screen says so*
(QUIET-FAILURES-1) — so it takes that treatment rather than a second one. It also has to: **the
loaders run at race start and at module scope, outside any React tree**, so there is no component
here to raise a notice from. The screens' over-capacity notice is the right treatment for a decision
being **refused at a button the operator is looking at**; a value quietly dropped at load is the other
one. Silent under node, for the reason `storage.js` already states: the sim and all three fingerprint
harnesses import these loaders and store nothing.

**AND IT LIVES IN ITS OWN MODULE RATHER THAN IN `storage.js`.** Two reasons, and the second was
measured: it belongs to the config-resolution rule set (resolve → validate → report) rather than to
the key registry — and `storage.js` is **fully mocked by thirteen unrelated test files**, so a new
export there is a change every one of them has to learn about to keep testing something else. The
first attempt put it in `storage.js` and turned 44 green tests red; that is the signal, not an
inconvenience.

---

## 4. ★ THE ACCEPTED SET — AND THE 4,204 DISAGREEMENTS THE FIRST ATTEMPT SHIPPED

**The one thing this repair must not do is change WHICH configs are valid.** So the check was not a
reading of the diff: each store's new rule list was run against **the old `||`-chain extracted from
`master`'s own source** over a corpus built by perturbing the real defaults — negations, zeros,
scalings, wrong types, `NaN`.

**THE FIRST RUN FOUND 4,204 DISAGREEMENTS IN 60,003, AND EVERY ONE WAS `NaN`.**

The cause is a trap, and it is worth stating exactly because it survived being written by someone who
had just written *"tightening one here would be a behaviour change smuggled inside a repair"* into
the file's own header:

    old clause:   reject if (x <= 0)          →  NaN <= 0  is FALSE  →  NaN was ACCEPTED
    my rule:      accept if (x > 0)           →  NaN >  0  is FALSE  →  NaN was REJECTED

`!(x <= 0)` **is not** `x > 0`. It differs on exactly one value, and that value never appears in a
range check anyone reads twice. Every `ok` was rewritten as the **literal negation of the clause it
replaced** — `ok: (c) => !(c.rowGapMultiplier <= 0)` — which is uglier and is the point: it states
"exactly what the chain said, negated" rather than a fresh opinion about the range.

| | configs | disagreements |
| --- | --- | --- |
| `raceDynamicsConfig` | 20,001 | **0** |
| `raceBehaviorConfig` | 20,001 | **0** |
| `rowLayoutConfig` | 20,001 | **0** |
| `frameTimingConfig` (the one chained rule) | 20,001 | **0** |
| `baseSpeedConfig` rule[0], rule[1] | 40,000 | **0** |
| `frameTimingConfig` rule[1], rule[2] | 40,000 | **0** |
| **TOTAL** | **160,004** | **0** |

**A NOTE ON THE HOLE THIS PRESERVES, since preserving it was deliberate.** The old chains **accept**
`NaN` for every plain range check, and so do these. It is **unreachable through storage** —
`JSON.stringify(NaN)` is `null`, and `null <= 0` is true, so a `NaN` written to localStorage comes
back as `null` and is rejected identically by both. Left as it is, and filed rather than fixed:
tightening it is a behaviour change and belongs to its own decision, not to this one.

---

## 5. ★ HIS OWN STORED CONFIG — WHAT WAS PROVEN, AND WHAT COULD NOT BE READ

**I could not read his live `localStorage`.** Reading a browser profile from this environment is
blocked, and correctly so. Saying that plainly matters more than working around it, because the brief
asked for a before/after on the real thing.

**WHAT REPLACES IT IS STRICTLY STRONGER THAN READING ONE CONFIG.** These loaders are pure functions
of the stored object. §4 establishes that the new rule set accepts exactly what the old chain
accepted; and when no rule fails, `applyKeyRules` reverts nothing and returns the resolved config
untouched. **Therefore: any stored config that loaded correctly before loads identically now —
whatever it contains.** That is a statement about every possible config of his, not about one
snapshot of it.

Corroborated on the only real export in the tree (`reports/greenfield/owner-config/owner-world.json`,
2026-07-23 — stale, and used as a *shape*, not as current truth) and pinned in the suite:
**SABOTAGE B**, a config with no bad key, comes back **untouched and silent**, per store, including
the empty case.

**And the sabotage in the other direction is proved against the behaviour it replaces**, which is the
assertion that makes this a repair rather than a rearrangement — `configPerKeyReject.test.js`:

    expect(whatTheOldLoaderReturned[k]).not.toBe(v);   // the old loader DID lose it
    expect(loaded[k]).toBe(v);                          // this one does not

★ **AND A TEST THAT PROVED NOTHING, CAUGHT BY ITS OWN GUARD.** The first `others` list picked
`runoutZone: 0.05` as "a setting the operator has" — and 0.05 **is** the shipped default, so the
old-loader proof compared a value against itself and passed for the wrong reason. It is the project's
named failure mode (*a test that hardcodes what it tests*) in a test written to catch a silent reset.
A spec now asserts every one of those values differs from its default.

---

## 6. WHAT WAS RUN

| | |
| --- | --- |
| `client/src/modules` suite | **3,190 / 3,190**, 50 of them new |
| old-vs-new accepted set | **160,004 configs, 0 disagreements** |
| world · world-off · camera · render | **all four match `docs/fingerprints.json`** — run, not argued: `configValidate.js`, `configReport.js` and two of the five stores are inside the engine hull |
| minted | **nothing, and nothing needed to be** |

The equivalence instrument is **not checked in**: it reads the old chains out of `master`, which
stops existing the moment this merges, and a permanent copy of the code it replaces is exactly the
redundancy the constraints forbid. Its numbers are here; that is the record.

---

## 7. WHAT THIS DOES NOT COVER

- **It does not make a bad stored value impossible** — only survivable and visible.
- **It says nothing about the Dev Screen's own clamps.** A widget that can still write a value its
  loader rejects is a smaller fault than it was, and still a fault; the two bounds must move
  together, and the dynamics store says so where the bound is.
- **The `NaN` hole is preserved on purpose** (§4) and is not repaired here.
- **It is not a migration.** Nothing rewrites a stored file, by standing rule. A rejected key is
  rejected again on the next load — and announced again on the next page.

# BUILD-RULE-A-1 — it is built, it is red at its founding instance, and it does NOT gate: its one objection today is legitimate

> **THE RULE IS NOT A GATE, AND THAT IS THE RESULT RATHER THAN A SHORTFALL.** On its first run against
> today's tree it objected to exactly one file, and the objection is **correct** — that table is a
> different fact under the same field names. **No exception was added**, per the brief's decision
> rule. It prints, loudly, and does not fail the build until the owner has ruled.
>
> `verify` **PASS 6 FAIL 0**; script suite **452/452**; the guard's own tests **21/21**.

---

## 1. IT CATCHES ITS FOUNDING INSTANCE — RUN AT 2026-06-03, NOT ARGUED

The tree at `11093fff` — the commit that introduced the sprite audit's hardcoded table — was extracted
with `git archive` (no worktree; junctions are forbidden on this machine). **Today's rule engine,
imported unmodified, was run against that tree's registry and that tree's audit script:**

```
registry at 11093fff: 20 racers, 20 discovered fields
literals found in the audit table: 80
DISAGREEMENTS: 21
by field: {"frameWidth":8,"frameHeight":8,"displaySize":5}

VERDICT: RULE A IS RED AT ITS FOUNDING INSTANCE.
```

**That is the same count SPRITE-AUDIT-DERIVATION-1 reached independently and by hand** — *"disagreed
on eight frame geometries and five `displaySize` values from that day"*. Eight geometries is eight
widths and eight heights; plus five display sizes; **21**. Two methods, one number, arrived at
separately.

**It would have gone red on the day the table was written**, not 91 days later.

---

## 2. ★ THE PAIRS ARE DISCOVERED, AND THE TEST ASSERTS THAT RATHER THAN THE OUTPUT

Both halves come from the registry at run time — the racer ids from `RACER_TYPE_IDS`, the field names
from the union of the registry's own **scalar** config keys (**22 discovered today**). A field added
to a racer type is covered with no edit here; a field removed stops being scanned.

**A typed list of pairs would have been the same defect one level up** — a hand-kept copy of what the
registry holds, going stale exactly as the table it exists to catch did. So one test greps this guard
for a pair list and fails if one appears:

```js
assert.equal(/RACER_FIELDS\s*=|PAIR_LIST\s*=|const\s+FIELDS\s*=\s*\[/.test(self), false,
  "a typed list of pairs would be the same defect one level up");
```

The frozen `CONFIG_SNAPSHOT` is preferred over `.config` where it exists, because some fields are
Dev-Screen tunable and are mutated in place at module load — comparing against `.config` alone would
compare a copy against a developer's local tuning rather than against what the repository ships.

---

## 3. ★ IT IS RED ON SOMETHING LEGITIMATE, AND NO EXCEPTION WAS ADDED

| | |
| --- | --- |
| files scanned | **450** across `client/src/`, `scripts/`, `client/scripts/` |
| registry literals found | **36**, in **one** file |
| agree | **20** |
| disagree | **16** |
| distinct objecting sites | **1** |

Every one of the 16 is `scripts/crop-sprite-sheets.mjs`, whose `FLAGGED_TYPES` records the
**pre-crop source geometry** a one-shot cropping run took as its INPUT — `frameWidth: 128` for a horse
sheet the registry now describes at 150, because the sheet was cropped and resized after that run.

**Same field names, a different fact.** It is the `surfaceClasses` shape one file along.

### Why no exception, and why that is the finding rather than a caveat

An exception would be the guard learning to ignore the only thing it has ever objected to, on the
authority of whoever wrote the exception. And **there is no mechanical discriminator**: "a table that
copies the registry" and "a table that records what the registry used to hold" are the same shape, and
telling them apart is a judgement about intent.

**So the rule reports and does not fail**, and says so in its own output rather than letting a green
run imply it is protecting something:

```
  RULE A — NOT YET A GATE. 16 disagreement(s) in 1 file(s). It does not fail the build until the
  owner has ruled on them; see BUILD-RULE-A-1.
```

**The false-positive rate, stated both ways because one of them flatters:** 16 of 36 literals (44%) —
or **1 of 1 objecting sites (100%)**. The second is the honest one. The rule has never yet objected to
a real copy on today's tree, because REGISTRY-LITERALS-1 already removed them all.

**His decision, three options:** except that table with a reason, delete it (the crop was a one-shot
run and its inputs are recorded in git), or rename its fields so they stop claiming to be registry
facts. Until then the rule is a report.

---

## 4. TWO DEFECTS THE WORK FOUND IN ITSELF

**(a) I broke the guard's own test, and constraint 2 is what caught it.** `check-fallback-agreement.mjs`
executes at module top level, and its test file *imports* it. While the guard was green that
self-run exited 0 and looked like nothing; the moment Rule A found a real disagreement, importing the
module called `process.exit(1)` and took the whole test file down. **Found by running the test, not by
reasoning.** Fixed by making the module run only when it is the entry point — checked first that
nothing else imports it: the pre-commit hook, the CI job and `verify` all **spawn** it as a process,
so only the test was affected.

**(b) A template literal silently ate the pattern.** The key-form matcher was written as
`` new RegExp(`…(?:^|[{,\s])${id}\s*:\s*\{`) ``. Inside a template literal `\s` collapses to a bare
`s`, so the compiled pattern was `(?:^|[{,s])ducks*:s*{` — **the `horse: { … }` form was invisible and
the rule silently covered less than it claimed.** Caught by the test written for that form, which
asserts the FORM rather than whatever the code happened to produce. Now `String.raw`. Re-scanning the
tree with it fixed revealed **no additional sites**, so nothing was hiding behind it — but nothing was
guaranteeing that either until it was fixed and re-run.

---

## 5. SABOTAGE, BOTH DIRECTIONS

| direction | what was done | result |
| --- | --- | --- |
| **introduce** | a fake `{ id: "duck", displaySize: 999, frameCount: 3 }` row added to `exp-roster-matrix.mjs` | **both fields reported**, naming registry 36 and 8 |
| **remove** | `crop-sprite-sheets.mjs`'s horse `frameWidth`/`frameHeight` brought into step with the registry | **16 → 14**, and **zero** remaining horse objections |

Both files restored and verified **byte-identical** against `HEAD` by `git hash-object`.

---

## 6. WHAT THIS REPAIR MOVED, AND WHAT POINTED AT IT (constraint 2)

| what moved | what pointed at it | outcome |
| --- | --- | --- |
| the module now runs only as an entry point | its own test (imports it); hook, CI, `verify` (all spawn it) | test fixed and passing; spawners unaffected |
| `dirs` widened to `scripts/` and `client/scripts/` | `verify`'s routing reads the declaration | confirmed: a change under `scripts/` now selects this guard |
| `GUARD.covers` and `blind` extended | nothing asserts their text; `routing.mjs:51` mentions the old `dirs` in a **doc-comment example** only | no action |
| the guard's own doc example stated real registry values | Rule A matched its own documentation | example now uses placeholders |

Searched uncapped across `client/`, `server/`, `scripts/`, `.github/`, `.githooks/` for every consumer
before changing the module's run behaviour.

---

## Limits

**The rule sees only what NAMES its racer.** The object must carry the id as a value (`id: 'horse'`)
or hang from it as a key (`horse: { … }`). A table keyed by array position is invisible to it, and
`goldenRunner.mjs`'s ten-row roster was removed by REGISTRY-LITERALS-1 before this rule existed — so
**the rule has never been tested against a real copy on a live tree**, only against the 2026-06-03 one.

**Scalars only.** `surfaceClasses`, `coats` and `rteDefinitions` are arrays and out of reach.
`goldenRunner.mjs` carries a `surfaceClasses` table that is a different fact under the same name and
**this rule has not cleared it** — that is in the guard's `blind` list, not just here.

**Literals in comments are matched like any other.** A stripper was written and **reverted**: an
apostrophe in ordinary prose (`doesn't`) opens a fake string and desynchronises it, and a stripper
that can hide a real copy is worse than none. The one case it was fixing — this guard's own
documented example — was solved by writing the example with placeholders instead.

**It proves nothing about non-registry homes.** Rule A was designed for the racer-type registry.
Whether the same shape works for track seeds or camera defaults is untested.

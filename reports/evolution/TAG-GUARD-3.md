# TAG-GUARD-3 — the register backfilled, the guard complete in both directions

**Date:** 2026-08-05 · **Bases confirmed:** `tag-guard-2` @ **`76d3f051`**, master @ **`6179921c`** —
both exactly as the spec states.

---

## BUILD-VS-SPEC CONFORMITY

| Spec | Status |
|---|---|
| §1 reconcile the 48/49 disagreement | **DONE — neither was stale**, §1 |
| §1 decide whether a COUNT belongs in a comment | **DECIDED: no** — §1 |
| §2 backfill the legacy entries with shas from origin | **DONE — 18, not 17**, §2 |
| §2a any entry naming a tag that no longer exists? | **NO — all 18 exist at origin** |
| §2b any of them a BRANCH? | **NO — all 18 are tags** |
| §2 no parser change; stop if one is needed | **NO PARSER CHANGE** — but a second declaration form was found, §3 |
| §2 state both guard numbers | **66 and 66**, §4 |
| §3 CI green before merge, merge `--no-ff`, delete branch, master sole head | see §5 |
| §3 tag only if the phase warrants one | **NO TAG** — reason in §5 |
| §4 worktree stubs stay; backlog proposal in three lines | **DONE** |

---

## 1. THE 48/49 DISAGREEMENT — neither number was stale

**They counted different things.** The header said **48 distinct declared names**; the guard printed
**49 declaration lines**. `pre/anchor-truth` is declared twice — once in its own registration block,
and again in the CAMERA-COMPANY-ONLY-3 section restating that it stays valid after the merge. A
legitimate cross-reference inflated a line count.

**Fixed at the runtime end, not the comment end:** the guard now counts DISTINCT names, because a tag
restated in prose is still one tag. Both numbers now agree at 48 — and after the backfill, 66.

**Should a count live in a comment? No, and I have removed it.** A number in a comment ages silently,
which is the failure this project keeps paying for — *this block exists because two such numbers
disagreed*. But the fix is not "assert the count in a test" either: a test asserting "48 declarations"
would fail every time someone registers a tag, which is noise, and noise is how guards get ignored.

**The count is not the property; precision is.** The comment now describes the SHAPE and the hazard
(branch names are indistinguishable from tag names), and the guard prints its own counts every run
while the exit code enforces the property those counts express — *every declaration names a real tag*.
A number that is recomputed on every run cannot go stale.

---

## 2. THE BACKFILL — 18, not 17

**Both §2 checks passed for all of them:** every one exists at origin, and none is a branch. So the
hole was hypothetical, not realised — there was no phantom tag hiding in the register.

| tag | sha | where it was |
|---|---|---|
| `stable/pre-overlap-closed-20jun` | `712f334` | list item, `(commit \`sha\`)` form |
| `stable/pre-governor-04jul` | `d9c9cd3` | list item, `(commit \`sha\`)` form |
| `race-action-complete` | `7af058b` | list item, no sha |
| `v-cleanup-complete` | `8b98f0a` | list item, no sha |
| `backup/browser-seed-complete` | `869615b` | flat list, no sha |
| `backup/exp-runaway-baseline-complete` | `f40a7a6` | flat list, no sha |
| `pre/finale-compression` | `37971d6` | prose only |
| `pre/finale-devscreen` | `8d5e9fd` | prose only |
| `pre/finale-adaptive` | `98e9e5f` | prose only |
| `pre/finale-remove` | `197763d` | prose only |
| `backup/finale-closed-26b2c34` | `26b2c34` | prose only |
| `pre/aff-build` | `86e0d6d` | prose only |
| `pre/aff-remove` | `0fed3ee` | prose only |
| `backup/aff-closed-fc6afbf` | `fc6afbf` | prose only |
| `archive/handicap-pursuit-089c7d2` | `089c7d2` | prose only |
| `pre/hygiene` | `a4103bb` | had its sha, but mid-sentence |
| `pre/router-7` | `83f5c8d` | had its sha, but mid-sentence |
| `v-parity-complete` | `2e27850` | **prose, under a COLLAPSED heading** — §2.1 |

Every one was declared **in its own section**, so no entry's canonical home moved.

### 2.1 The one that needed a decision — and it exposed a trap in my own rule

**`v-parity-complete` is a LIVE tag at origin whose only mention sat under *"Parity phase —
COLLAPSED"*.** Declaring it there would have been worse than useless: my retired-section exclusion
would have skipped it, so it would have looked registered while remaining **unguarded in both
directions** — the precise condition this thread is about, reintroduced by the mechanism meant to
prevent it.

It is the surviving anchor the collapsed step-tags were collapsed *onto*, so its home by the
register's own taxonomy is **`v-*-complete` (phase endpoints, retained)** under Permanent anchors.
Declared there, with the reasoning written beside it so the next person does not helpfully "tidy" it
back into the collapsed section.

**The general trap, now stated in the register: never record a LIVE tag under a RETIRED/COLLAPSED
heading.**

---

## 3. A SECOND DECLARATION FORM — found, and resolved without touching the parser

The spec said: if the backfill needs a parser change, stop, because the form is not what we both
think it is. **It did not need one — but the form was not quite what we thought.** Two entries used
`` (commit `712f334`) `` rather than `` (`712f334`, date) ``, and two more (`pre/hygiene`,
`pre/router-7`) carried correct shas *inside a sentence* rather than at the start of a list item.

**I normalised the register rather than widening the regex**, deliberately: widening it to accept
"commit " would have admitted a second dialect and made the next variant easier to justify. One form,
stated once, is the thing that makes the guard cheap. **That is now written at the top of
`docs/TAGS.md`** — including the warning that an entry in any other shape is *silently unchecked*,
which is worse than a failure.

---

## 4. BOTH GUARD NUMBERS

```
check-tags: 66 origin tags checked, 0 unregistered; 66 declared in the register, 0 missing at origin.
```

**66 and 66.** Recall in direction 2 is now 100%, and the residual hole named at the end of
TAG-GUARD-2 — a legacy tag deleted from origin while its sha-less mention stayed, invisible to both
directions — **is closed by construction rather than by rule.**

Script suite **126/126**. Guards: 321 links / 0 dangling, 102 reports / 0 unindexed.

---

## 5. MERGE

See §7 for the CI run and merge commit — recorded after the fact rather than predicted.

**No tag minted, and that is a decision rather than an omission.** The lifecycle mints a phase
endpoint when a phase closes. This is a guard hardening plus a register backfill: no behaviour, no
fingerprint, no picture, and its return point is simply master. **Minting `v-tag-guard-complete` would
put an entry in the register whose only content is "a guard got better"** — and a register is worth
exactly as much as the proportion of its entries that mean something. It merges with full history, so
nothing is lost by not tagging it.

---

## 6. PROPOSALS

### 6.1 On your proposal 1 — the other one-directional guard, named not fixed

I went looking. **`scripts/check-index.mjs` is the same shape.** It walks `reports/evolution/*.md` and
asserts each is referenced from `INDEX.md` — reports → index. It never asks the reverse: **an INDEX
line pointing at a report file that does not exist is invisible to it.**

That is the identical failure mode one step sideways: `check-doc-links` would catch a *dangling
relative link*, so a `[NAME.md](NAME.md)` entry is covered — but an INDEX line that names a report in
prose without linking it, or links it with a typo'd path that happens to resolve elsewhere, is not.
The blast radius is smaller than the tag case (an index is a map, not an anchor you return to), which
is why I am naming it rather than fixing it here.

**`check-doc-links` is genuinely one-directional by design and correctly so** — it asks "does every
link resolve", and the reverse ("is every file linked") is `check-index`'s job. That pair is the
example of the property done right, and it is worth noticing that the two-guard split is what makes
each one honest.

### 6.2 On your proposal 2 — what I have been carrying

Two things, and neither is large:

**The `MAX_CAM_ZOOM` finding never got a backlog line.** It surfaced while inverting a test in
CAMERA-COMPANY-ONLY-3: at 0.25 corridors every track delivers 85.29 world px rather than the nominal
75, because the projection cap binds before any guarantee does. It is in that report and in the
camera-residuals backlog section — **so it is recorded, and I withdraw it as an open item.** Checking
rather than asserting is the point.

**The one genuinely unrecorded thing: the three measurement scripts still duplicate the race driver.**
`corridor-truth.mjs`, `edge-crossing.mjs`, `tracking-lag.mjs` and now `his-shot-truth.mjs` each carry
their own ~100-line copy — four, not three, since NIGHT-1 added one. I flagged it in
CAMERA-ANCHOR-TRUTH-1 as a deviation, NIGHT-1 stage D was chartered to fix it and never ran, and it
has never reached `docs/BACKLOG.md`. **It is the last item I am carrying that has no line anywhere**,
and the risk is specific: four copies of a driver that must stay identical for their numbers to be
comparable, with nothing asserting that they are.

### 6.3 (mine) The register now has a contract, and contracts belong next to their enforcement

The convention note I added to `docs/TAGS.md` and the regex in `check-tags.mjs` are two statements of
one rule, in two files, that must agree. **That is the shape this whole three-day thread has been
about** — one value, several readers. I do not think it warrants a mechanism today (the register is
edited by hand a few times a month and the guard fails loudly if the forms diverge), **but it is worth
noticing that closing a fan-out hole with prose created a small new one**, and saying so is cheaper
than pretending the fix was free.

### 6.4 (mine) The backfill's real value was the audit, not the shas

Adding eighteen shas took minutes. **What the exercise actually produced was §2.1** — the discovery
that a live tag was sitting under a COLLAPSED heading where my own exclusion rule would have hidden
it. That was invisible from the code, invisible from the guard's green output, and only appeared
because something forced a line-by-line pass over the register. **The general point: a backfill is a
cheap excuse to read a document you have been trusting**, and it is worth doing occasionally even
where no guard depends on it.

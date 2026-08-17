# DOCS-CATCH-UP-2 — the documents describe the state we actually have

**Branch:** `docs/catch-up-2`, off master `623a70ff`. **Documentation only.** No guard, no script, no
test, no product change — not even a comment, because the one false comment this week's work left
behind had already been corrected in the block that created it.

```
engine-reach --check docs/VERIFY-RULES.md docs/LESSONS.md docs/CAMERA_DIRECTOR.md
  ENGINE REACH: none of 3 path(s) can reach the race engine.
```

**MINTED NOTHING.** Nothing measured, because nothing measurable changed.

---

## THE RULES THAT WERE DECIDED THIS WEEK — EACH IN ONE HOME

### R14 — NO SECOND DEFINITION *(new, `docs/VERIFY-RULES.md`)*

The owner's ruling of 2026-08-19, in the numbered form that file uses: **a caller without a config
reads the one home; no literal stands beside a shipped default.** The reason is recorded because it
is what makes the rule unconditional — the fallbacks existed only so a function could be called with
no config at all, and the only callers that do that are tests and harnesses.

It carries the two traps we walked into first: **deleting a mirror can CREATE one** (`undefined` is
falsy, so a config-less caller runs the feature OFF), and **`?? 0` on a number is not the safe form**
(delete it and arithmetic yields `NaN`). And it names the enforcement: an **empty exception list** in
`check-fallback-agreement`, plus what that guard still cannot see.

### The ship order *(unchanged — `docs/SHIP-CEREMONY.md` already owns it)*

§ THE SHIP ORDER was corrected on 2026-08-18 and is accurate. **Nothing was restated.** `R8` gained a
five-line pointer saying where the order lives and that the one step which cannot work that way — a
commit naming its own hash — is settled in a follow-up.

### R8a — what "green for exactly this SHA" means *(new subsection, `docs/VERIFY-RULES.md`)*

What is skipped, when, and what green now means. **The mechanism is deliberately not repeated** —
`.github/workflows/ci.yml` owns it and `scripts/ci-docs-only.mjs` owns the predicate. R8a states the
three things a reader of the RULES needs: all three jobs still run and report a conclusion; a
docs-only push will not discover a failure unrelated to its diff; and a workflow-level `paths:`
filter is forbidden, because it produces no run at all and `gh run list --limit 1` then hands back
the previous commit's green.

---

## THE LESSON CANON — 3 EXTENDED, 3 ADDED

Each candidate was checked against the canon first (R13), and three of the six turned out to be
instances of laws that already exist.

| # | this week's incident | disposition |
| --- | --- | --- |
| 1 | deleting a mirror creates a definition by omission; a copy that AGREES is invisible | **EXTENDED L207** (The Copied-Default Law) — and its OFF-arm **exception is removed**, because the ruling closed it |
| 2 | `checkSeparation` failed 98 % of plans with nobody calling it | **EXTENDED L209** (The Inert-Enforcement Law) — fifth instance, and the sharpest: a check that CAN fail, DOES, and is called by nobody |
| 3 | unit tests reaching a live dev server | **EXTENDED L210** (The Blast-Radius Law) — third door, and the first in the UNIT suite |
| 4 | a correct table flattened into a wrong sentence | **NEW L214 — The Summary Law** |
| 5 | 153 became 19 when the in-module usage was checked | **NEW L215 — The Exclusion-Set Law** |
| 6 | narrowing a fraction is not monotonically more permissive | **NEW L216 — The Denominator Law** |

**L207's exception clause is the one deletion worth naming.** It said an OFF-arm switch was not a
mirror and kept its literal. The ruling did not narrow that exception, it removed the question it
rested on — so the clause is gone rather than qualified, and the lesson points at R14.

---

## THE COVERAGE CLAIM — THE SHAPE THIS WEEK WAS ABOUT

`docs/CAMERA_DIRECTOR.md`'s *"WHAT THE RENDER FINGERPRINT DOES NOT SEE"* list was honest but not wide
enough: it said sprites are hashed by identity, so **artwork** changes are invisible. The stronger
fact, measured this week, is that **`racer-types/` is inside no instrument's closure at all** — so the
drawing CODE is unwatched too, and no fingerprint would even be selected by a diff confined to it.

The list gains that entry and **points at `SHIP-CEREMONY.md`**, which already owns the measurement
(CENSUS-REST-1 removed "the racer types' `drawRacer`" from the three-fingerprint table and replaced
it with the reasoning). One home, one pointer — not a second copy.

---

## WHAT I READ, AND WHAT WAS ALREADY CORRECT

**Guards first — all green before and after**: `check-doc-facts` (55 living documents, 12
exemptions), `check-config-claims` (169 keys, 55 documents, **0 current claims**, 43 dated rows
allowed), `check-measured-stamps` (0 pending), `check-doc-links` (535 links, 0 dangling),
`check-index` (4 directories, 0 unindexed), `check-fingerprints` (958 files, 0 stray copies).

**Then the reading, which is the part no guard does:**

| document | verdict |
| --- | --- |
| `SHIP-CEREMONY.md` | **already correct** — ship order corrected 2026-08-18; racer-types corrected by CENSUS-REST-1 |
| `reports/README.md` | **already correct** — the four-indexed / seven-archived split landed with INDEX-COVERAGE-1 |
| `DEPLOYMENT.md` | **already correct** — its bootstrap line says to create the first admin via `POST /api/auth/setup`, which is true and now actually works; it makes no claim about the channel |
| `FAIRNESS.md` | **already correct** — it never described `checkSeparation`, so nothing was added; an unenforced criterion does not get a home it never had |
| `ARCHITECTURE.md` | **already correct** on this week's ground — its COMBO15 fingerprints are explicitly marked HISTORICAL and point at the record |
| `CAMERA_DIRECTOR.md` | **two corrections** — the render blind list (above) and one stale open item (below) |
| `VERIFY-RULES.md` | **three additions** — R14, R8a, the ship-order pointer |
| `LESSONS.md` | **3 extended, 3 added** |
| `docs/archive/AUTH.md` | **left alone** — see the open pair below |

### The one stale claim found by reading

`CAMERA_DIRECTOR.md` carried, as an open item: *"Two code fallbacks disagree with the shipped
defaults (`comebackMinStartGap`, `comebackMaxCurrentRankPct`)"*. **Both stopped disagreeing when
MIRRORS-BY-REFERENCE converted `cameraTimingComputation.js`**, and the guard now reports `0 disagree`
for the whole repository. The item is rewritten as resolved, with the dates, and points at R14.

**No code was touched to make a document true.** The document was the thing that was wrong.

---

## WHAT I BELIEVE IS WRONG AND DID NOT CHANGE

**`docs/archive/AUTH.md` is the named home of the authentication contract and it is unreachable as
one.** It sits in `archive/`, its own header says **"Status: DESIGN / not built"**, and it points at
an intended source of truth at `docs/AUTH.md` that does not exist. When SETUP-TOKEN-CHANNEL-1 needed
the contract, that document was silent on the channel and the answer came from the server's own
comment.

**Not changed here, and deliberately.** Promoting it, or marking it superseded, is a decision about
what the authentication documentation should BE — not a catch-up edit. It is on the owner's sheet
(item 4-class), and this report is where it is written down.

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `docs/VERIFY-RULES.md` | +R14, +R8a, +5-line ship-order pointer in R8 |
| `docs/LESSONS.md` | L207 / L209 / L210 extended; L214 / L215 / L216 added; **L207's exception clause removed** |
| `docs/CAMERA_DIRECTOR.md` | render blind list gains the racer-types entry; one stale open item rewritten as resolved |

**Nothing restated in two places.** Every addition either owns its rule or points at the document
that does: R8 → SHIP-CEREMONY, R8a → `ci.yml`, the camera blind list → SHIP-CEREMONY, L207 → R14.

---

## PROPOSALS

### Proposal A — the lesson canon needs a "what changed since" line more than it needs new entries

Three of this week's six lessons were instances of laws already written down — L207, L209 and L210 —
and in each case the existing entry was **correct and simply had not been visited**. The canon is 217
entries and growing; its risk is no longer that a law is missing, it is that nobody finds the one
that already applies.

**The cheap form is an index by symptom, not by law**: "a check went green and shouldn't have → L209";
"a number from a scan looks too big → L215". That is a page of pointers, it costs an afternoon, and
it is the difference between a canon that is written and one that is read. **Deliberately not a
guard** — R13's first question has no answer here, which is usually the sign that a thing is for
people.

### Proposal B — decide what `docs/AUTH.md` is, before the next auth question

The contract's named home is an archived design document that declares itself unbuilt. That cost
this week's setup work a detour, and it will cost the next one the same. **Two honest options and
both are small**: promote the built parts into a living `docs/AUTH.md`, or add one line to the
archived file saying *the built system is the contract; this records the design it came from*.

**What must not persist is the current state** — a pointer that reads authoritative and resolves
nowhere, which is the same shape as a document claiming coverage that does not exist. That shape is
what this whole week was about.

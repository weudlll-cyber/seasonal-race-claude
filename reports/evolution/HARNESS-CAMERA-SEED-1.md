# HARNESS-CAMERA-SEED-1 — nineteen instruments describe a picture no race can produce, and the fingerprints are not among them

**Date:** 2026-08-26 · **Branch:** `diag/harness-camera-seed-1` (off `master`) · **Piece 4 of
NIGHT-2026-08-25** · **Verdict:** DIAGNOSE ONLY. Nothing fixed, no default changed, no fingerprint
touched.

**The fault, from RUNIN-LEVEL-SET-BUILD-1 §15:** since the owner's decision of 2026-08-23 the browser
derives the camera's seed from the race seed (`RaceScreen/index.jsx:610`,
`cameraSeedForRace(racePlanSeed)`), while `resolveIdentity` still defaults to **1439767152** — a value
the product cannot produce for any race. Six of twenty-six measured width steps evaporated when the
browser's seeding was used.

**This piece establishes the blast radius. It is smaller than feared in one direction and larger in
another.**

---

## 1. WHO TAKES THE DEFAULT

| | count |
| --- | --- |
| files calling `resolveIdentity` | **53** |
| …that pass an explicit `cameraSeed` | **10** |
| **…that take the default `1439767152`** | **43** |

Of the 43, split by whether the camera can affect their answer at all — measured by whether the file
reads `cd.zoom`, `cd.offset*`, `_framingProbe`, `cd.state`, `hudState` or any other director field:

| | count |
| --- | --- |
| **camera-dependent** | **34** |
| camera-blind (pure physics/duration — the seed cannot move their answer) | **9** |

The nine camera-blind are `gp-defaults-table`, `gp-durations`, `gp-exit`, `gp-repro`,
`late-lead-axis-room`, `outcome-phase-window`, `pair-reach-census`, `phys-bench`,
`scoreboard-parity.test`. **Nothing they claim is affected and they are not discussed further.**

### THE TEN THAT PASS ONE — and only one of them is right

| instrument | passes | verdict |
| --- | --- | --- |
| **`check-runin-frame.mjs`** | **`cameraSeedForRace(LINE_SEED)`** | **correct — the browser's own derivation, and it is a VERIFY GUARD** |
| `his-shot-truth.mjs` | `882944666` | **correct in kind** — the owner's real camera seed from his own marker; a deliberate reproduction of a race he watched |
| `corridor-truth`, `edge-crossing`, `gun-window-truth`, `label-degrade-truth`, `label-occlusion-truth`, `tracking-lag` | `1439767152`, restated inline | the default, written out by hand — no better than taking it |
| `raceDriver.mjs`, `raceDriver.test.mjs` | the default / fixtures | the definition and its test |

**One instrument in fifty-three derives the camera seed the way the product does, and it is a gate.**
That is worth stating on its own: the correct pattern already exists in the tree, in the one place
that runs on every merge.

---

## 2. THE FINGERPRINTS ARE IMMUNE — and this corrects the brief's own premise

The brief says *"the fingerprints are pinned to the current one, so this is not a free edit."*
**Measured at source, they are not pinned to it — they do not read it.**

- `camera-fingerprint.mjs:112` — `const CAM_SEED = 1439767152;`
- `render-fingerprint.mjs:181` — `const CAM_SEED = 1439767152;`
- Neither imports `raceDriver.mjs`; neither calls `resolveIdentity`. The driver's own header says so
  deliberately: *"the fingerprint instruments … are deliberately NOT ported. They are the gate this
  refactor is measured against, and a tool that changes in the same commit it is meant to validate
  cannot validate it."*

**So changing `resolveIdentity`'s default moves no fingerprint.** The two constants happen to be the
same number; they are not the same constant. **The edit is free of the fingerprints entirely**, and
the thing that makes it non-free is something else — see §4.

---

## 3. WHICH CLAIMS ARE VOID

Among the 34 camera-dependent default-takers, the distinction the brief draws: an instrument that runs
**two arms under one fixed seed** has a valid answer, because the constant cancels; an instrument that
reports **an absolute property of the picture** does not, because the picture is one the product never
draws.

Split by whether the file builds more than one race per cell or loops over named arms:

### VALID — same-seed A/B, the constant cancels (13)

`company-bind-truth`, `company-spread-sweep`, `contender-truth`, `endgame-spec`,
`start-frame-capture`, `endgame-width-truth`, `finish-motion-truth`, `floor-reach-truth`,
`label-bench`, `line-visible-truth`, `pan-lag-account`, `sprite-size-truth`, `zoom-pace-truth`.

**These are not condemned.** A comparison of two arms under one camera is a statement about the
*difference*, and the difference survives a change of camera far better than either arm's absolute
value does. Their conclusions stand as conclusions about arms.

### VOID AS CLAIMS ABOUT A PICTURE (19)

`binding-census`, `late-lead-axis`, `late-lead-axis-geom`, `late-lead-hunt`, `line-ceiling-terms`,
`runin-contender-guarantee`, `runin-contender-guarantee-anchor`, `runin-contenders`,
`runin-forward-reach`, `runin-level-set`, `runin-line-schedule`, `runin-pin-drift`, `width-authority`,
`edge-slice-truth`, `finish-pair-truth`, `label-names-truth`, `resolve-converge-truth`,
`straggler-truth`, `zoom-rate-truth`.

**These report what races LOOK like** — how many races have the winner off frame, how wide the shot is
at the line, which term binds, how far the pan trails. **Every one of those numbers was measured on a
camera the product cannot produce for the race in question.**

**This is the whole recent camera line.** `late-lead-hunt` found the hit list; `late-lead-axis` sliced
it by direction; `runin-contenders`, `runin-contender-guarantee` and `runin-level-set` measured the
membership question through three reports; and RUNIN-LEVEL-SET-BUILD-1 §14's step table came from the
same corpus. **The chain of reports that produced the owner's twelve races and the width-step hit list
rests on this class.**

### HOW WRONG, MEASURED TWICE

Not asserted — this has now been quantified on two separate occasions:

| measurement | under the harness constant | under the browser's derivation |
| --- | --- | --- |
| RUNIN-LEVEL-SET-BUILD-1 §15 — width steps over 0.4 ln, 29 traced races | 26 | **20** (6 evaporate; §14's rank 1 goes ×4.34 → ×0.96) |
| RUNIN-CHANCE-SET-1 §5 — the same hit list re-derived over 1,140 races | 26 (§14's list) | **30** — *a different population, not a subset* |

**The second is the more alarming.** Re-deriving under the browser's seeding did not merely drop six
entries; it produced a list of thirty that overlaps §14's but is not the same set. **A void claim is
not a claim that is slightly off. It is a claim about a different set of races.**

**The twelve are the exception, and deliberately so.** RUNIN-CHANCE-SET-1 §6 re-measured all twelve
under browser seeding and all twelve still hold at 0 winner-off frames. **The owner's own cases
survive; the population statistics around them do not.**

---

## 4. WHAT THE DEFAULT SHOULD BE, AND WHAT WOULD BREAK

**It should be `cameraSeedForRace(raceSeed)`** — the browser's own derivation, which
`check-runin-frame` already uses. A default that no race can produce is not a defensible default for a
tool whose purpose is to measure races.

**What would break — established, not guessed:**

| | affected? | why |
| --- | --- | --- |
| the three fingerprints | **NO** | §2 — they carry their own `CAM_SEED` and never call `resolveIdentity` |
| `check-runin-frame` (a verify guard) | **NO** | already passes `cameraSeedForRace` explicitly |
| the 6 instruments that restate `1439767152` inline | **NO** | they pass it explicitly; a default change does not reach them |
| `his-shot-truth` | **NO** | passes the owner's own seed |
| the 9 camera-blind default-takers | **NO** | the camera cannot move their answer |
| **the 34 camera-dependent default-takers** | **YES** | every number they have ever printed would change |
| **every report quoting those numbers** | **YES, and this is the real cost** | ~19 instruments' worth of published tables become un-reproducible by re-running the tool |

**So the cost is not a broken gate. It is that the lab journal's numbers would stop matching the tools
that produced them** — and this project's reports are append-only by rule, so they cannot be updated
to match. **That is the genuine obstacle, and it is a documentation-integrity problem rather than a
technical one.**

**The `raceDriver.test.mjs` fixtures would also need review** — five `cameraSeed:` occurrences — but
that is a test-maintenance cost, not a claim.

---

## 5. PROPOSALS — none ordered, nothing built

### A — MINE: make the default an ERROR, not a different constant

Rather than swapping 1439767152 for `cameraSeedForRace(raceSeed)`, **remove the default entirely** and
require every caller to say which camera it wants: the browser's derivation, an explicit pin, or the
owner's own marker seed.

**What it buys over simply changing the default:** a silent change of default would quietly alter 34
instruments' output with nothing marking the boundary, so a number in a report and a number from a
re-run would differ with no way to tell which era either came from. **Forcing the choice makes every
instrument state its category** — the same categories §3 had to reconstruct by grepping.

**Cost:** it touches 43 files, which is the largest change in this report. It is also the only one
that cannot be half-done.

### B — MINE: label the instrument's output with the camera it ran, and stop there for now

Every harness already prints an identity line (`formatIdentity` includes `camSeed=`). **Make the
category explicit in it** — `camSeed=1439767152 (PINNED CONSTANT — not producible by any race)` versus
`camSeed=2246822502 (derived from race seed 13)`.

**Cost: one line in `formatIdentity`, and no behaviour change at all.** **What it buys:** every future
report carries its own warning, and the 19 void classes stop silently producing authoritative-looking
tables. **This is the cheapest item here and the only one safe to do while the reports it protects are
still being written.**

### C — MINE: re-derive the ONE population that is load-bearing, and leave the rest

Nineteen instruments is a large void class, but almost none of it is currently being acted on. **What
IS being acted on is the width-step hit list and the owner's twelve** — they are the basis of the
run-in work in flight. RUNIN-CHANCE-SET-1 has already re-derived both under browser seeding (30 races;
twelve still holding).

**So the practical repair is already done for the part that matters**, and the honest action is to say
so in the backlog rather than re-run 19 instruments nobody is reading. **Cost:** the remaining void
numbers stay in the journal, uncorrected, and someone will quote one. **That is exactly what proposal
B is for.**

### D — do NOT re-mint the fingerprints as part of this

Named to be refused. §2 shows they are unaffected. **Re-minting them "while we are here" would move a
gate for a reason unrelated to any behaviour change**, and a fingerprint that moves for a
non-behavioural reason is a gate nobody can read afterwards.

---

## 6. SOURCE HYGIENE, AND WHAT WAS NOT RUN (R15)

**Every count is from a re-runnable command**, not a reading: `resolveIdentity` callers and
`cameraSeed:` passers by `grep -rln` and `comm`; the camera-dependence split by grepping each file for
director field reads; the A/B-versus-absolute split by counting `buildRace(` calls and named-arm loops
per file. **The two splits are mechanical and therefore reproducible, and they are also approximations
— see below.**

**Two limits I did not paper over.**

- **The A/B split is a heuristic.** "More than one `buildRace` per cell, or a loop over named arms" is
  a good proxy for a comparison and not a proof of one. An instrument could compare two arms across
  two processes, or report an absolute number alongside a comparison. **The 13/19 split should be read
  as a first cut, not a verdict on each file.** Where a specific instrument's status matters, it must
  be read.
- **I did not re-run any of the 19.** The magnitude in §3 comes from two measurements already on the
  record. Re-running nineteen instruments under both seedings is the work proposal C argues against
  doing wholesale.

**Nothing was changed.** No default, no instrument, no fingerprint. This branch adds one report.

**Not run, and why:** no fingerprints (nothing they read was touched — and §2 establishes they cannot
be affected by this subject at all), no browser gate, no client suite, no server suite. Docs-only.

---

## 7. CONFORMITY

| the brief asked | delivered |
| --- | --- |
| ESTABLISH THE BLAST RADIUS, DO NOT FIX IT | Yes — nothing changed |
| every harness and instrument that takes the default | §1 — **43 of 53**, listed and split |
| what each has been used to claim | §3 — by category, with the recent camera line named |
| which claims are about WHAT A RACE LOOKS LIKE — the void ones | §3 — **19 instruments**, named |
| say which category each falls in rather than condemning all | §1 (9 camera-blind), §3 (13 valid A/B, 19 void), §1 (10 explicit passers, 2 of them correct) |
| same-seed A/B and the fingerprints pin on purpose | §2, §3 — and **the fingerprints turn out not to read the default at all** |
| what the default SHOULD be | §4 — `cameraSeedForRace(raceSeed)`, or better, no default (proposal A) |
| what would break if it changed — the fingerprints are pinned to it | §4 — **they are not**; the real cost is the append-only journal's numbers no longer matching their tools |
| propose, do not build | §5 — four, three of them mine, D named to be refused |

**Where this report contradicts its own brief, and it matters:** the brief's premise that the
fingerprints pin the current default is **wrong** — they carry a private copy of the same number.
That removes the obstacle the brief expected and replaces it with a different one (§4), which changes
what the right proposal looks like: the blocker is not a gate that would move, it is a lab journal
that cannot be rewritten.

# CONTROL-BOUNDS-1 — the slider now reaches where the game runs, and a rule inside an existing guard keeps it there

> **The shipped value did not move.** `choreoOutcomeStart` is still `0.6`. What moved is the control's
> ceiling, from 0.55 to the VALIDATED range's own top — a number two documents had already recorded.
> **All four fingerprints checked against the record and all four match.**

---

## THE NUMBER THE BRIEF ASKED FOR

**Exactly ONE Dev Screen control could not represent its shipped value, and it is the one you named.**

| | |
| --- | --- |
| controls resolved and checked | **96** |
| **could not represent their shipped value** | **1** — `choreoOutcomeStart` |
| needed a JUDGEMENT rather than a widening | **0** |
| not resolvable (reported, never counted as coverage) | 18 |

**96 is a mechanical count, not a reading.** Every control in `client/src/screens/DevScreen/` was
found by its shape, its key resolved against the defaults objects the Dev Screen itself imports, and
its bounds compared with the value that key ships. Nothing enumerates a control or a key, so the
sweep is repeatable and now runs on every `verify`.

---

## 1. ★ THE TRAP THAT DECIDED WHETHER THIS SWEEP WAS WORTH ANYTHING

The obvious sweep — compare the STORED default against `min`/`max` — reports **six** violations on
today's tree. **Five of them are false.**

| control | ships | the box shows | its bounds |
| --- | --- | --- | --- |
| `racePlanBonusTransitionEnd` | 0.75 | **75** (`× 100`, "% race") | 30 – 95 |
| `racePlanCorridorStart` | 0.55 | **55** | 50 – 100 |
| `racePlanCorridorEnd` | 1.0 | **100** | 50 – 100 |
| `nameTagFrameFrac` | 0.022 | **2.2** (`× 1000 / 10`, "% of frame") | 1 – 5 |
| `nameTagAllUntilMs` | 8000 | **8** (`/ 1000`, seconds) | 0 – 30 |

**A control's bounds are a claim about the number it DISPLAYS, not the one it stores.** So the value
expression is evaluated with the shipped default substituted into it, and the result is what must lie
inside the bounds. Comparing the stored number instead would have produced a guard that cries wolf
five times out of six — and a guard people learn to ignore takes the one real finding down with it
(R11).

**That is the whole reason this piece took as long as it did**, and it is pinned by a test whose
absence would let the next reader "simplify" it straight back.

---

## 2. THE BOUND, AND WHY IT IS 0.60 — NOT A NUMBER I CHOSE

The brief asked me not to simply raise `max` to the shipped value, since that leaves it on the edge.
**It is on the edge, and the edge is not mine to move.**

**The range was already established, twice, before tonight:**

- `docs/DEVSCREEN-INVENTORY.md` — *"its validated config range is [0.25, 0.60]"*
- `docs/PHASE-CONTRACT.md` — *"The owner may set `choreoOutcomeStart` anywhere in 0.25–0.60"*
- `client/src/modules/storage/defaults.js` — *"Range 0.25–0.60."*

**Three homes agreeing on 0.25–0.60, and a widget stopping at 0.55.** The defect was never that the
range was unknown; it was that the widget was **0.05 short of it at the top**, which is exactly the
width of one step — and the shipped value lives in that step.

**The rule this follows already exists in the same card.** The sibling control directly above,
`racePlanPulkStart`, has widget clamp `[0.10, 0.60]` and validated range `[0.10, 0.60]` — **the same
numbers**. So "the widget's clamp IS the validated range" is a convention the card already keeps in
one of its two surfaced controls and broke in the other. I did not invent a bound; I applied the one
the neighbour follows.

**Why not higher.** 0.60 is the top of what has ever been measured — `defaults.js` records the 2026-07-17
sweep that shipped it (band-reach still held on 3 of 4 tracks *at* 0.60). Above it there is no
measurement at all, and putting an unmeasured span behind a slider is a product judgement about the
fairness gate. **That one is yours; it is on the morning sheet.**

**Why not lower.** Below 0.25 the PULK window can be collapsed to zero width from the Dev Screen,
which `PHASE-CONTRACT.md` records as a deliberately closed door since COMBO15. Opening it would also
be a product change, and this piece changes nothing about the game.

**`step` divides the range exactly:** (0.60 − 0.25) / 0.05 = 7, so 0.60 is reachable by stepping, not
merely inside. The old range reached 0.55 in six steps and stopped one short.

---

## 3. THE TIP WAS WRONG TOO, AND FIXING ONLY THE LABEL WOULD HAVE BEEN WORSE

The control made **three** statements about its value and all three disagreed with `defaults.js`:

| | said | is |
| --- | --- | --- |
| label | `(0.25–0.55)` | `(0.25–0.60)` |
| `max` | `0.55` | `0.6` |
| tip | *"0.5 = shipped"* | *"0.6 = shipped"* |

CORRECTIONS-1 declined to correct the label alone, and was right to: *"0.6 = shipped"* printed beside
a slider that stops at 0.55 is worse than the inconsistency. All three move together or none does.

---

## 4. ★ WHAT THE REPAIR MOVED, AND WHAT ELSE POINTED AT IT (constraint 2)

**The claim I repaired had four live sites. I found a SECOND, older fossil underneath it with six.**

### 4a. The claim itself — 4 sites, all repaired

| site | what it said |
| --- | --- |
| `DynamicsTuningSection.jsx` | the control: label, `max`, tip |
| `docs/DEVSCREEN-INVENTORY.md:168` | the label, quoted in the control table |
| `docs/DEVSCREEN-INVENTORY.md:178` | *"the numeric range (0.25–0.55 in its label) is the input widget's clamp; its validated config range is [0.25, 0.60]"* |
| `docs/PHASE-CONTRACT.md` §2 | the label, plus last night's ★ note recording the defect as open |

**`DEVSCREEN-INVENTORY:178` is the interesting one.** It recorded the clamp and the validated range
as **two separate facts, side by side, visibly unequal** — and by writing them as two facts it made
the disagreement look like information rather than a defect. That is R16 exactly: two numbers side by
side share one identity. They are now stated once, as one number, with the reason.

### 4b. The fossil underneath — `pulkStart` is 0.25 — 6 live sites, all repaired

Establishing the bound meant reading the phase model, and the phase model still describes a world
that ended on 2026-07-29 (COMBO15 moved `racePlanPulkStart` from 0.25 to 0.15) and again on
2026-07-17 (`choreoOutcomeStart` 0.5 → 0.6):

| site | what it said | why it is false |
| --- | --- | --- |
| `defaults.js` (the `choreoOutcomeStart` comment) | *"At the default 0.25 (== racePlanPulkStart) PULK is zero-width … byte-identical to the shipped behaviour"* | the default is 0.6, `racePlanPulkStart` is 0.15, and PULK is **not** zero-width in the shipped game |
| `racePlanner.js` (the two-phase block) | *"At defaults it equals pulkStart (0.25) … steer-from-0.25"* | same fossil, in the engine file |
| `racePlanner.js` (the clamp-chain block) | *"the defaults (0.25/0.5/0.55/1.0) are unchanged"* | the first of the four moved |
| `racePlanner.js` (the pulkStart anchor) | *"No-op for the defaults (0.25)"* | same |
| `docs/PHASE-CONTRACT.md:20` | ``choreoPulkEnd = config.choreoOutcomeStart ?? 0.25`` | the code reads `?? phaseFractions.pulkStart` |
| `docs/PHASE-CONTRACT.md:11-13` | *"`pulkStart 0.25` … These are the raw fallback literals"* + *"not the `0.25` fallback literal above"* | **there is no literal**: `DEFAULT_PHASE_FRACTIONS.pulkStart` READS `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart` |
| `docs/PHASE-CONTRACT.md:38` | *"(shipped; fallback literal 0.25)"* | same |
| `scripts/sim-fairness.mjs:718` | *"pulkStartLive = choreo boundary 0.25"* | 0.15 |

**PHASE-CONTRACT:11-13 is the root.** It does not merely quote a stale number — it *warns the reader*
that the shipped value differs from a fallback literal that no longer exists. A correction written to
protect against drift, itself drifted. Every repair above replaces the number with the name of its
home rather than a fresh number, so the same sentence cannot rot again.

**Deliberately NOT touched:** `docs/archive/STAGE-CLEANUP.md` (an archive recording what was true when
it was written); `docs/SIM.md:976` (`--pulkStart=0.25` is still a valid slider position, so the claim
is true); `reports/evolution/CORRECTIONS-1.md` and `INDEX.md` (closed records of last night's state —
the repair belongs on the morning sheet, not inside a finished report).

---

## 5. THE RULE — INSIDE AN EXISTING GUARD, NOT A NEW SCRIPT

**RULE C now lives in `scripts/check-config-keys.mjs`.** That guard already reads exactly the two
things this rule needs — the Dev Screen's source and the defaults module — and already declares them
in `dirs`/`files`, so `verify` routes it correctly with no change. Constraint 3 forbids a second home
for a pairing that has one; a `check-control-bounds.mjs` would have been precisely that.

**The two rules are the same question one step apart:** does the key EXIST (the original rule), and
can the control REACH it (Rule C).

**Discovery, not a list.** Controls are found by shape, in the two forms the Dev Screen actually uses
(a JSX `<input type="number|range">`, and a `{ key, label, min, max, step, tip }` descriptor in an
array the section maps over). The defaults homes are found by following the Dev Screen's **own
imports** for anything exporting a `DEFAULT_*` object. A control added tomorrow is checked tomorrow.

**The sabotage.** Setting `max` back to `0.55` produces exactly one failure, naming the file, the
line, the bounds, the value, and both homes that carry it — and telling the reader which side to
change, because the opposite repair moves the game.

**Six tests**, including the two that matter most: the unit-conversion test (which fails if anyone
simplifies Rule C into the five-false-positives version) and the loud-failure pair (no Dev Screen, or
a Dev Screen with nothing resolvable, both break the build rather than printing a green line —
Lesson 187). **`check-config-keys` suite: 12/12.**

**Its blind spots are declared**, not discovered later: helper rows whose bounds are parameters (the
numbers live in the caller's descriptor and ARE checked there); value expressions that are not pure
arithmetic; keys with no shipped default at all; whether the LABEL's stated range matches `min`/`max`;
and `step` reachability. **The 18 unresolved controls are printed on every run with their reason**,
because an unresolved control that reads as a checked one is how coverage gets overstated.

---

## 6. NOTHING CHANGED THE GAME — PROVEN, NOT ASSERTED

| role | verdict |
| --- | --- |
| world | `check: WORLD matches the record for role "world" (8a1977187e9c99b4)` |
| world-off | `check: WORLD matches the record for role "world-off" (aa09ed97a3a32689)` |
| camera | `check: CAMERA matches the record (152cf295c4c9ff54)` |
| render | `check: RENDER matches the record (485b73d527602a0e)` |

**`racePlanner.js` is inside the engine hull**, so the world fingerprint was the one that had to be
run rather than argued about — three of the fossil repairs are comments in that file. Comments cannot
move a hash, but "cannot" is the word that precedes most of this repository's surprises.

**And verify said the same thing a second way, by a route I did not choose.** Its routing line reads:

> `world-fingerprint … 3 hull file(s) changed but are INERT (client/src/modules/racePlanner.js,`
> `client/src/modules/storage/defaults.js, scripts/sim-fairness.mjs): comments and whitespace only,`
> `identical tokens`

**That is a token-level comparison, not an opinion** — and it agrees with the 75-second run. Two
independent instruments, one of which I did not invoke.

**Full-weight `verify --base=807b9171`: PASS 20, FAIL 0, SKIP 6**, including `client-suite`,
`script-suite`, `camera-fingerprint`, `render-fingerprint`, `check-runin-frame` and
`check-ending-frame`.

**Nothing was minted.** `docs/fingerprints.json` is untouched by this piece.

---

## Limits

**"96 controls checked" is not "96 controls correct".** Rule C asks one question — can the control
represent its value — and 18 more controls it could not resolve are named on every run. The class of
statements a control makes is larger than its bounds: its label, its step and its tooltip are all
claims about the same number, and **piece 5 of this chain measures that class**. This piece fixed the
one control whose bounds were wrong, and its label and tip with it; it did not audit every label in
the screen.

**The bound is honest, not comfortable.** `choreoOutcomeStart` now sits at the top of its own slider
with no headroom, because that is where the measurement stops. If you want room above 0.60 the
measurement has to come first, and that is a night's sim work, not a hygiene pass.

**One convention was applied, not established.** "The widget's clamp IS the validated range" is a rule
I read off the sibling control and the three documents. It is now true of both surfaced controls in
the PULK card. Whether it should bind the whole Dev Screen — and be checked — is a decision nobody has
taken.

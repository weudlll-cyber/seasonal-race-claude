# DELIVERY-CLEAN-2 · ARC 4 — THE SOURCE: IS IT ALL NEEDED, AND IS IT STRUCTURED RIGHT

**From master `e6ff2117`, branch `audit/2026-09-27-source`.** ★★ **Nothing structural was performed.**
The owner judges the product by eye; every structural finding below is a proposal with its cost.

★ **The headline: the product source is clean of dead code, and the structural findings are about
SIZE and RESPONSIBILITY, not about waste.**

---

## §4.1 — DEAD CODE

### The product source is clean, measured with the repo's own instruments

`client/src` + `client/e2e` and `server/src`, run with `no-unused-vars` and `no-unreachable` forced
on, using each tree's own eslint (the client's binary in both cases — `server/` has none of its own,
and `npx` there fetches a copy that crashes):

| tree | unused variables | unreachable code |
| --- | ---: | ---: |
| `client/src` + `client/e2e` | **0** | **0** |
| `server/src` | **0** | **0** |

### ★ 77 unused locals in `scripts/` — and by the brief's own rule they are ROWS, not removals

`scripts/` had **never been linted** for this; §5 named that as its gap. Linted now: **77
`no-unused-vars` across 48 files.**

★★ **They are not removed, and the rule is the brief's own.** §4.4 authorises *"a dead variable **in
a region you already touched**"*. Arc 4 touched none of those 48 files, so removing 77 variables
across them is a tree-wide purge of hand-run tools, not the correctness-neutral cleanup that clause
describes. **Recorded with their addresses.**

★ **Two of the 48 are IN THE ENGINE HULL** and would be excluded even if the rule allowed it:
`scripts/sim-fairness.mjs` (11 warnings) and `scripts/camera-replay.mjs` (3) — `engine-reach`
reports both *"in the hull but INERT — byte-identical"*. An unused local cannot change behaviour,
but a 6,195-line parity-critical file is not where an unattended run should prove that.

★ **Four "parse errors" in that run were MY instrument, not the tree.** I passed
`ecmaVersion:2023`; `check-fallback-agreement.mjs:373` and `diag/camera-curve.mjs:63` use a trailing
comma in `import()`, which is newer. They parse correctly under the repo's own config. Reported so
the number 81 is not read as 81 defects.

### The 8 unimported exports — hand-verified, and the proof is now structural

C12 named 8. Each was checked against the four things a grep misses:

| check | result |
| --- | --- |
| appears in any file but its own | **no** — all 8 are single-file |
| referenced as a **string** (dynamic/keyed access) | **no** — 0 for all 8 |
| reachable by `await import()` or a template import | ★ **impossible** — `client/src`, `server/src` and `shared` contain **zero** dynamic imports |
| reachable by string-keyed call | ★ **impossible** — zero string-keyed call sites |

★★ **So "unimported" here is a structural certainty, not a search result** — there is no mechanism
in this codebase by which they could be reached without being named. **All 8 remain**, per the rule
that an unimported export may be a seam. Three are the auditor's own from RACE-SOURCE-1.

---

## §4.2 — DUPLICATED LOGIC

**jscpd 5.3.2**, `--min-lines 12 --min-tokens 80`, tests excluded, each tree separately.
★ **Both trees reproduce §6.1 exactly** — 15/312/0.47% and 7/145/2.73% — which is a useful check on
that earlier number as much as on the tree.

| tree | clones | duplicated lines | % |
| --- | ---: | ---: | ---: |
| `client/src` | 15 | 312 | 0.47% |
| `server/src` | 7 | 145 | 2.73% |

**Classified, all 22:**

| class | n | |
| --- | ---: | --- |
| **GENUINE** | 5 | the upload handler ×3 (`brands.js:314` ↔ `racers.js:281` ↔ `tracks.js:595`); the store preamble ×2 (`brands.js:90` ↔ `playerGroups.js:60`, `brands.js:181` ↔ `playerGroups.js:114`) |
| **PARALLEL BY DESIGN** | 3 | `cloud.js` ↔ `splash.js` ×2 — two particle generators driven by one registry schema; the dev-screen section preamble |
| **WITHIN ONE FILE** | 9 | `EditorShape.js:97/138`, `viewerProbe.js:625/755`, `spriteTinter.js` ×2, `racers.js:166/212`, `tracks.js:329/400` and `:347/424` |
| **COSMETIC (CSS)** | 5 | `DevScreen.module.css` ↔ `RacerEditor.module.css`, 136 lines together |

★ **The upload trio is already covered** — arc 1 added a test that fails if the three drift, and the
owner has commissioned the merge. Not re-proposed here.

---

## §4.5 — THE RANKED PROPOSALS

Each with its cost and **what the owner would see**. ★ **None was performed.**

### P1 · `CameraDirector.js` is 5,507 lines and carries at least three responsibilities

**Address:** `client/src/modules/camera/CameraDirector.js`. It holds the state machine, the
offer/weight arbitration (`_weightedRandomPick:742`, `_acceptsOffer:736`), the comeback precedence
branch (`:1816-1821`) and the per-state framing and timing. **Nearly three times the next-largest
engine file.**

**The split I would make:** lift the *arbitration* — the candidate pool, the weights and the accept
decision — into its own module, leaving the director to decide state and framing. That is the seam
the code already implies: the precedence branch returns **above** the arbitration rather than
participating in it, which is the shape of two concerns sharing a function.

**Cost:** high. It is the most fingerprint-sensitive file in the tree — the camera fingerprint is
computed from its decisions. Every change needs the camera and render fingerprints re-minted and an
eye-test. **What he would see: nothing, if done correctly** — and that is exactly why it is
dangerous: a silent regression here is invisible until a race looks wrong.

### P2 · The three upload handlers → one *(already his decision, listed for rank)*

**Address:** `brands.js:314`, `racers.js:281`, `tracks.js:595`. **Cost:** low — the bound is already
single-homed in `utils/imageUpload.js`; only the error response is triplicated. **What he would
see:** nothing. Arc 1's agreement test is the holding measure and **is expected to be deleted** when
this is done.

### P3 · The JSON-store preamble in `brands.js` and `playerGroups.js`

**Address:** `brands.js:90` ↔ `playerGroups.js:60` and `brands.js:181` ↔ `playerGroups.js:114`, 44
lines. Two implementations of one store pattern that must agree. **Cost:** moderate — live request
handling, two routes. **What he would see:** nothing.

### P4 · `RaceScreen/index.jsx` is 2,172 lines and mixes the frame loop with screen setup

**Address:** `client/src/screens/RaceScreen/index.jsx`. It holds the rAF loop and physics stepping
(`:1078` the catch-up cap), camera seeding (`:691`, `:701`), effect instantiation (`:476-481`) and
the ceremony. **Cost:** high, and it is in the hull. **What he would see:** nothing if correct.

### P5 · Two dev-screen sections are 2,118 and 1,730 lines

**Address:** `CameraAdvancedSection.jsx`, `DynamicsTuningSection.jsx`. These are the Dev Panel's
tuning surfaces and their length is mostly repeated slider blocks — the *"within one file"* clone
class. **Cost:** low and outside the hull. ★ **What he would see: the Dev Screen**, which is why
this is a proposal and not a cleanup — `B-UX2`, the dev screen's reorganisation, is already
commissioned and this belongs to it rather than to arc 4.

### P6 · The 77 unused locals in `scripts/`

**Cost:** trivial per file, 48 files. **What he would see:** nothing. Worth doing *as each file is
next touched*, which is the rule that kept them out of this arc.

---

## ARC 4 — UNKNOWN

- ★★ **"Structured right" was judged from size, clone density and responsibility read off the
  source. No profiling, no coupling metric, no dependency graph was built.** A 900-line file with
  one responsibility is fine and a 300-line file with four is not; I used size only as the signal
  for *where to look*.
- **The clone detector finds EXACT clones at ≥12 lines / ≥80 tokens.** Logic duplicated with
  renamed variables, or in 8-line pieces, is invisible to it. The 0.47% and 2.73% are floors.
- **`scripts/` was not clone-scanned in this arc** — §6.1 found 200 clones there and left them
  unclassified; that remains unanswered and is the largest unclassified block in the tree.
- **No proposal was costed by trying it.** P1's cost is inferred from the file's fingerprint
  sensitivity, not from a spike.
- **The 77 unused locals were not individually read.** They are eslint's scope analysis, which is
  authoritative for locals — but a few may be deliberate placeholders, and nobody checked.

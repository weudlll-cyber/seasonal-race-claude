# DOCS-1 — the complete written record (COMBO15 ship + closed-branch preservation)

**Base: `origin/master` @175a475 (the COMBO15 ship). Author: CC.** Docs / reports / tags only — no game-code
change of any kind. The purpose: after COMBO15 shipped and before the four experiment branches are deleted,
capture the whole written record on master so nothing is lost, every reference resolves, the lessons and
dead-ends are current, the owner's fairness definition is canonical, and the tags/branches are clean.

## VERDICT (read first): DONE. Record complete, links resolve, fingerprint untouched, origin is master-only.
Seven docs commits across five stages; 65 evolution report files preserved from the three closed branches;
LESSONS L184–L189 added; DEAD-ENDS section G + the F-wall wording made precise; docs/FAIRNESS.md created as
the canonical fairness definition; TAGS.md updated and the four exp branches archived-then-deleted (origin now
carries `master` only). The shipped fingerprint **`ded0a126048e4cdb` is asserted unchanged** (DOCS-1 touched
zero files under `client/src/` or `scripts/`).

---

## 1. Every file touched (by stage)

**STAGE 1 — closed-branch preservation (3 commits, `8c8eeb7` / `d3fbd6f` / `e39dc07`).** 65 files added under
`reports/evolution/` (fair-arrival's reports arrived earlier with the merge; these are the other three lines):
- from `exp/chain-choreo` (authoritative chain lineage): `ACTION-BUILD-1..7.md`, `ACTION-CONCEPT-CC.md`,
  `ACTION-NIGHT-1.md`, `CHAIN-SIM-1.md`, `CHAIN-INT-1.md`, `CHAIN-ABLATE-1.md`, `DRAMA-1.md`,
  `FRONT-AUTOPSY-1.md` + all `chain-ablate-data/`, `chain-int-data/`, `front-autopsy-data/`.
- from `exp/free-band` (unique): `ACTION-FREEBAND-1.md`, `ACTION-FREEBAND-2.md` + `freeband-*` data.
- from `exp/choreo-release` (unique): `CHOREO-RELEASE-1.md`, `CHOREO-RELEASE-2.md` + `choreo-release-*` data +
  the choreo-release battery JSONs.
- Shared chain files verified byte-identical across branches before copy (chain-choreo taken as authoritative).

**STAGE 2 — `docs/LESSONS.md`** (`4b5df62`): L184 Cliff Law · L185 Decidedness Law (+ partial-vs-full sort) ·
L186 proximity floor is a fairness asset · L187 whitelist trap + proof-of-live · L188 dual scoreboard +
three-window readout · L189 wrong-lever law. Each cites its report(s).

**STAGE 3 — `docs/DEAD-ENDS.md`** (`8da2dd8`): new **section G** (admission-only family / band-corridor /
choreo-release / boost-side cap / blind A/B viewer — each with what, why-dead, proof path) + the **F-wall
wording-precision fix**: the physical-force impossibility stands, but the enumeration of solution classes was
widened to include the actually-shipped one — make a breakaway *irrelevant to the fairness result* by biasing
the DRAW (not catching it).

**STAGE 4 — `docs/FAIRNESS.md` (new) + `docs/PROJECT-PRINCIPLES.md`** (`e06a6af`): the canonical fairness
definition — two layers (row-blind draw / in-race band-arrival promise), ABSOLUTE band arrival as the headline
number (85–90%/track on COMBO15), the v2 duration-relative PULK watchdog (`chaosGap ≤ ship×1.5`) as a
permanent gate line, the documented residuals (space-sprint ~1.6×, garden-path ceiling 86%). PROJECT-PRINCIPLES
§8 cross-links it as layer 1.

**STAGE 5 — `docs/TAGS.md`** (`c328578`): recorded `v-ship-combo15` (175a475) + `pre/ship-combo15` (215afde)
as permanent anchors and the four exp branches → archive tags; Branches section updated to master-only.

**STAGE 6 — `reports/evolution/DOCS-1.md`** (this file).

**Tags created + pushed + verified on origin (STAGE 5):**
`archive/chain-choreo-final` → `15c1d58` · `archive/free-band-final` → `aa21576` ·
`archive/choreo-release-final` → `109abd6` · `archive/fair-arrival-merged` → `215afde`.
(`v-ship-combo15` / `pre/ship-combo15` were already on origin from the ship.)

**Remote branches deleted (STAGE 5), each preserved first in a verified tag:**
`exp/chain-choreo`, `exp/free-band`, `exp/choreo-release`, `exp/fair-arrival`. Local copies also removed.
`exp/fair-arrival`'s tip `f1b2fde` (the ship commit) is preserved on master via the merge `175a475`, so
anchoring its archive tag at the pre-ship `215afde` loses nothing.

---

## 2. Link-check result

Ran a relative-link resolver over all tracked `.md` under `docs/`, `reports/evolution/`, `reports/parity/`
(251 links across 96 files). **Every reference introduced or preserved by DOCS-1 resolves** — the evolution
reports (26 cross-links), LESSONS L184–189's report citations, DEAD-ENDS section G + the FAIRNESS.md link, and
FAIRNESS.md's own links all check clean (0 dangling among DOCS-1 files).

**7 PRE-EXISTING dangling links** remain in unrelated docs, none touched by DOCS-1 — flagged here for honesty,
not fixed (out of scope): `CAMERA_DIRECTOR.md` → a RaceScreen line-anchor; `CAMERA_TUNING_DIAGNOSIS.md` → a
moved test file; `README.md` → `inventory-2026-05.md` + `handoff-notes.md`; `diag/render-smoothness-measurements.md`
→ `../HANDOFF.md` (the HANDOFF-not-maintained rule); `diagnose/README.md` → two `.ndjson` traces. Proposal 1
below offers to sweep these.

---

## 3. Fingerprint assertion

DOCS-1 changed **zero** files under `client/src/` or `scripts/` (`git diff --name-only 175a475..HEAD` → only
`docs/` + `reports/`), so the shipped-default behaviour is byte-identical to the ship. Re-minted on the final
state to assert it literally: **`fingerprint-default.mjs on` → `ded0a126048e4cdb`** (unchanged; OFF invariant
`f8f7d9c2fd3283e9`).

---

## THE FIVE SENTENCES
1. The full written record of the three closed lines (chain-choreo, free-band, choreo-release) is now on
   master — 65 evolution report files preserved before the branches were deleted — so every DEAD-ENDS and
   LESSONS reference resolves without a live branch.
2. Six new lessons (L184–L189) distil the fair-arrival/action arc into laws — correct the draw not the motion,
   the fight is the undecidedness, the proximity floor is a fairness asset, the whitelist trap, the dual/
   three-window scoreboards, and the wrong-lever gap — each anchored to its report.
3. DEAD-ENDS gained a section G naming the five retired arms with their proofs, and its deepest-wall claim was
   made precise: no continuous physical force catches a breakaway, but COMBO15 makes the breakaway irrelevant
   by biasing the draw — a third solution class the wall had under-enumerated.
4. docs/FAIRNESS.md is now the canonical definition — two layers, ABSOLUTE band arrival as the headline, the
   v2 duration-relative pulk watchdog as a permanent gate line, and the two documented residuals — cross-linked
   from PROJECT-PRINCIPLES §8.
5. The tags and branches are clean: four `archive/*` tags pushed and verified on origin, the four `exp/*`
   branches deleted (origin is master-only), and the shipped fingerprint `ded0a126048e4cdb` asserted untouched
   because DOCS-1 is docs/reports/tags only.

## PROPOSALS (≥2)
1. **Sweep the 7 pre-existing dangling doc links in a tiny follow-up `docs:` commit.** They are all trivial
   (a moved test path, two retired inventory/handoff notes, two `.ndjson` traces never committed, a stale
   RaceScreen line-anchor). A 20-minute pass either repoints or removes them, and then a link-check over the
   whole `docs/` tree passes clean — worth doing now that DOCS-1 established the checker, so the next doc audit
   starts from zero.
2. **Add the link-checker to CI (or a pre-push hook) scoped to `docs/` + `reports/`.** DOCS-1 wrote a
   throwaway resolver; promoting it to a committed `scripts/` tool run in CI would make "no dangling doc link"
   a standing invariant, catching the next moved report before it rots. Scope it to relative links only
   (skip `http(s):`) and allow an ignore-list for the known code-line-anchors.
3. **Fold the closed-line reports into a one-screen INDEX.** 65 evolution files now live on master with no map;
   a short `reports/evolution/README.md` (one line per report: line → verdict → lesson) would turn the archive
   from a pile into a navigable ledger, and is the natural place to record which archive tag each dead line
   sits on for recovery.

---
**Master @HEAD (after DOCS-1).** Docs/reports/tags only; game fingerprint `ded0a126048e4cdb` untouched.
Archive tags + ship anchors on origin; origin is master-only. Verification commands + output in the foot of
this task's chat report.

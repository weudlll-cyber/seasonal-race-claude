# DOC-SYNC-1 — bring every living document to the shipped world (COMBO15)

**Base: `origin/master` @c062add. Author: CC.** Historical reports left untouched (lab journal). The living
docs still described the pre-COMBO15 world — chaos window 0.25, no fair-arrival mechanism, a stale tag ledger,
and seven dangling links. This pass syncs them to the shipped COMBO15 world (`v-ship-combo15`, fingerprint
`ded0a126048e4cdb`) and answers the real-or-doc question about the pulk-window validation first.

## VERDICT (read first): SYNCED. STEP 0 = doc-only (no clamp). Fingerprint identical; docs 0-dangling.
Five doc commits, one per step. The pulk-window clamp turned out **not to exist** — no code change needed.
The shipped fingerprint re-mints **identical** (`ded0a126048e4cdb`) and the full suite is **3319/3319 green
with unchanged expectations**, so every edit — including the DevScreen JSX label fixes — is behavior-neutral.
Living-doc link check is now **0 dangling**.

---

## STEP 0 — the real-or-doc question: VERDICT = DOC-ONLY (no clamp exists)

**There is NO code clamp or validation of `racePlanPulkStart` to [0.25, 0.60].** Checked every candidate:

- `loadRaceDynamicsConfig` (`raceDynamicsConfig.js:26-79`) validates ~30 keys on load but **does not
  validate `racePlanPulkStart` at all** — the shipped 0.15 passes through untouched.
- The plan builder's phase-hardening clamp (`racePlanner.js:180`) is `clamp(pulkStart, 0, corridorEnd)` — a
  lower bound of **0**, not 0.25. 0.15 is not floored.
- There is **no DevScreen field** that writes `racePlanPulkStart` (it is a pinned config key, no live control).
- The **only** `[0.25, 0.60]` validation in the code (`raceDynamicsConfig.js:68-69`) clamps
  **`choreoOutcomeStart`** — the PULK-*end* / OUTCOME-start slider — which is a **different key**, is correctly
  ranged [0.25, 0.60], and is unrelated to the shipped `pulkStart=0.15`.

So the "[0.25, 0.60] on the pulk window" was a documentation artifact, not a live clamp. The `?? 0.25`
occurrences (`raceCore.js:229`, `racePlanner.js` `DEFAULT_PHASE_FRACTIONS`) are fallback-when-absent literals,
overridden by the shipped 0.15 config; the `[0.25, PULK end]` strings were stale DevScreen labels. **No STEP-0
code change was made** — the fixes flow to the docs (STEP 1/2/5). (Proposal 1 below addresses the `?? 0.25`
fallbacks.)

---

## Per-file change list

**STEP 1 — `docs/ARCHITECTURE.md`** (`e04c4de`): trajectory section now states `pulkStart` = config
`racePlanPulkStart`, shipped `0.15` since COMBO15 (raw `DEFAULT_PHASE_FRACTIONS` fallback literal still 0.25,
overridden by config). New subsection **(a.2) COMBO15 — fair-arrival**: chaos steer (gain 0.06) + band-aware
re-roll draw bias (R 0.60 / gain 0.10) + 0.15 window → arrival 85–90%; links [FAIRNESS.md](../../docs/FAIRNESS.md)
+ [MERGE-SHIP-1.md](MERGE-SHIP-1.md); shipped fingerprint `ded0a126048e4cdb`.

**STEP 2 — `docs/DEVSCREEN-INVENTORY.md` + `DynamicsTuningSection.jsx`** (`5f226bf`): inventory
`racePlanPulkStart` 0.25→**0.15** (chaos window `[0, 0.15]`), added the 5 COMBO15 pinned keys
(`chaosSteer`/`chaosSteerGain`/`bandBias`/`bandBiasR`/`bandBiasGain`), mid-race window `[0.25→0.15, PULK end]`.
**6 shipped DevScreen UI window labels** `[0.25, PULK end]`/`[0.25, this]` → `0.15` (render-only text; no test
asserts them; fingerprint-independent — re-minted identical below).

**STEP 3 — `docs/TAGS.md`** (`0a1f9a6`): reconciled the whole file against `git ls-remote --tags origin`.
Added the **3 tags on origin missing from the doc**: `pre/clean-sweep` (dad4077, ship section),
`backup/aff-closed-fc6afbf` (Act 1), `backup/finale-closed-26b2c34` (Act 2). Relabeled the stale
"25 tags, nothing else" snapshot as the dated 2026-07-25 set and appended a 16-tag additions block
(**current origin total: 41**). The ~250 doc-listed-but-absent tags are the intentional RETIRED ledger (correct).

**STEP 4 — the 7 pre-existing dangling living-doc links** (`7ae1599`):
- `CAMERA_DIRECTOR.md` → corrected `client/…index.jsx` path to `../client/…` (dropped the stale `#L1329` anchor).
- `CAMERA_TUNING_DIAGNOSIS.md` → de-linked the removed `CameraZoomTuningSection.test.jsx` (kept the two live tests).
- `README.md` → removed dead entries `inventory-2026-05.md` + `handoff-notes.md` (files never/no-longer exist).
- `diag/render-smoothness-measurements.md` → de-linked the unmaintained `HANDOFF.md`.
- `diagnose/README.md` → de-linked 2 gitignored `.ndjson` traces (marked "gitignored, not committed").

**STEP 5 — living phase docs synced** (`b32fb95`): `docs/PHASE-CONTRACT.md` (shipped `pulkStart` 0.15, phase
model CHAOS `[0, 0.15)` / PULK `[0.15, 0.5)`, PULK no longer DevScreen-collapsible; raw fallback literal 0.25
preserved and distinguished), `docs/RACE-ACTION.md` (chaos phase 0→0.15, hero cast at 0.15, + a COMBO15
chaos-steer/band-bias note), `KRAEFTE-LANDKARTE.md` (PULK window `[0.15, 0.5)`, two hits).

**Justified-not-fixed (historical / unrelated — verified, left intact):**
- `docs/STAGE-CLEANUP.md` (0.25/0.5 in a dated stage-cleanup changelog — accurate for the past commit it logs).
- `docs/SIM.md:817` (`--pulkStart=0.25` is the intentional *pre-combo15 reproduction* recipe, parity rule).
- `docs/ROADMAP.md` + `docs/TAGS.md` historical entries citing `7c70b1eae7d31e22` (that WAS the ON fingerprint
  at the experiments/tags they describe; the current ON print `ded0a126` is stated in SIM.md + the TAGS ship section).
- `docs/AUDIT.md` / `docs/BACKLOG.md` / `docs/ROADMAP.md` `0.25`/`25%` hits = `lateralDamping` and STUCK-mode
  `imbalance` — unrelated params in dated changelogs.
- No living doc presents `~72%` as the shipped *arrival* — `band-reach ≥70%` is the still-current fairness
  gate (layer 1), correct as written.

---

## VERIFY

- **Fingerprint re-minted IDENTICAL: `ded0a126048e4cdb`** — STEP 0 touched no code; the STEP-2 JSX label edits
  are render-only, so the shipped-default behaviour is byte-identical.
- **Full suite: 161 files / 3319 tests green, expectations unchanged.**
- **eslint** (`eslint src`) exit 0 · **build** (`npm run build`) exit 0.
- **Living-doc link check: 0 dangling** (186 relative links across 48 md files under `docs/` + top-level).

---

## THE FIVE SENTENCES
1. The pulk-window "[0.25, 0.60] clamp" does not exist in code — the only such validation is on the unrelated
   `choreoOutcomeStart` (PULK-end) key — so STEP 0 is doc-only and no code changed.
2. ARCHITECTURE and PHASE-CONTRACT now carry the shipped `pulkStart=0.15`, a COMBO15 fair-arrival paragraph
   (chaos steer + band-aware draw bias → 85–90% arrival), and the raw-fallback-literal distinction, so the
   phase model reads true.
3. DEVSCREEN-INVENTORY gained the 5 COMBO15 pinned keys and the shipped 0.15, and the 6 stale DevScreen UI
   window labels were corrected to 0.15 (behavior-neutral — fingerprint re-mints identical).
4. TAGS.md was reconciled against origin (added `pre/clean-sweep` + the two Act close anchors, current total 41
   tags), and the 7 pre-existing dangling living-doc links were fixed or removed so the living-doc link check is
   now 0-dangling.
5. Every seal passed — fingerprint `ded0a126048e4cdb` identical, 3319 tests green, eslint + build clean — with
   the historical reports untouched as the lab journal.

## PROPOSALS (≥2)
1. **Align the `?? 0.25` fallback literals to the shipped default (or to `DEFAULT_RACE_DYNAMICS_CONFIG`).**
   `raceCore.js:229` and `racePlanner.js` `DEFAULT_PHASE_FRACTIONS.pulkStart` still fall back to `0.25` when no
   config is passed — harmless today (the shipped path always passes 0.15) but a latent trap: a future direct
   caller would silently get the pre-combo15 window. A one-line change to read `?? DEFAULT_…racePlanPulkStart`
   (or `?? 0.15`) removes the inconsistency; it is behavior-neutral for the shipped game and should re-mint
   `ded0a126` identical, but is a code change so it wants its own tiny gated commit.
2. **Add the living-docs link-checker to CI as a standing gate.** DOC-SYNC-1 (like DOCS-1) used a throwaway
   resolver; promoting it to a committed `scripts/` tool scoped to `docs/` + top-level `*.md` (relative links
   only, with an ignore-list for code line-anchors) would keep "0 dangling living-doc links" an invariant and
   catch the next moved doc before it rots — the reports/ tree (307 dangling, lab journal) stays excluded by design.
3. **Make `pulkStart` a real DevScreen control or explicitly document it as pinned-by-design.** PHASE-CONTRACT's
   old text implied a "PULK begins here" slider that does not exist; the window start is now a shipped constant
   surfaced by no control. Either wire the slider (UI-configurable principle) or add a one-line "pinned, not
   surfaced" note next to it in DEVSCREEN-INVENTORY so the gap is intentional and visible, not a latent TODO.

---
**Master @HEAD (after DOC-SYNC-1).** Docs + one render-only JSX label change; shipped fingerprint
`ded0a126048e4cdb` unchanged. Return point `pre/clean-sweep` = dad4077 on origin.

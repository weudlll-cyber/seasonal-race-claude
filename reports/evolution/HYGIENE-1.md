# HYGIENE-1 — empty the hygiene list completely; nothing deferred

**Base: `origin/master` @a4103bb. Author: CC.** Six steps, one commit each, clearing every open hygiene item:
drifting phase-boundary literals, an unsurfaced config key, missing CI guards, OneDrive-thrashing scratch, a
stale major dependency with two moderate CVEs, and the last "open thread" markers in the docs. **The whole
point is behavior-neutrality**, so after every code-touching step the shipped fingerprint re-mints IDENTICAL.

## VERDICT (read first): DONE. Fingerprint identical; 3319 green; link-check + audit-gate pass; tree clean.
Every hygiene item is resolved with the shipped game byte-unchanged — `ded0a126048e4cdb` re-mints identical
after all six steps. react-router is on 7.18.2 (the 2 moderate GHSAs resolved); the one new high advisory is
non-applicable (client SPA, no RSC) and gated with a justified allowlist. Backup: `pre/hygiene` (a4103bb),
router return point `pre/router-7` (83f5c8d), both on origin.

---

## Per-step change list

**STEP 1 — single-source phase-boundary defaults** (`9a79ccf`). The `?? 0.25` fallbacks for
`racePlanPulkStart` had drifted from the shipped 0.15. Fixed to read the single source:
- `DEFAULT_PHASE_FRACTIONS.pulkStart` now derives from `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart` (was a
  raw `0.25`); `racePlanner.js` imports `storage/defaults.js` (no circular dep — defaults.js has no imports).
- `raceCore.js` browser `pulkStart` + `PHASE_CHAOS_END` fallbacks and the `goldenRunner.mjs` mirror:
  `?? 0.25` → `?? DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart`.
- The `choreoOutcomeStart ?? 0.25` PULK-collapse sentinel → `?? phaseFractions.pulkStart` (tracks pulkStart,
  no raw literal, collapse invariant preserved).
- **Grep-proof:** `?? 0.25` / raw `pulkStart: 0.25` in production code → **0 hits** (remaining `0.25` are an
  unrelated comeback-gap default and comments). 5 direct-caller unit tests re-pinned to the true shipped 0.15
  (each encoded the drifted 0.25; the shipped fingerprint is the neutrality guard). **fp identical.**

**STEP 2 — `racePlanPulkStart` surfaced as a DevScreen control** (`ddd9d6b`). New "PULK begin / CHAOS ends"
control in the PULK Phase card (range **[0.10, 0.60]**, step 0.05, default **0.15**). Honest validation added
to `loadRaceDynamicsConfig` (whole-object reject outside [0.10, 0.60]). Added to `reset-pulk` (now 6 keys,
Block-Placement Convention). It was already in the `raceDynamics` block, so the master **Reset All Defaults**
restores it and the HUD badge counts it race-relevant. `DEVSCREEN-INVENTORY.md` updated (moved from pinned to
control table). 307 config+DevScreen tests green; **fp identical.**

**STEP 3 — CI link-checker + documented audit policy** (`917a463`). New `scripts/check-doc-links.mjs` (no
deps; HTML comments + fenced code stripped) + a CI `docs` job that fails on any dangling relative link in the
living docs (`docs/` + repo-root `*.md`); `reports/` excluded as lab journal. Audit policy documented in
`ci.yml`: high/critical fail, moderate advisory.

**STEP 4 — local tooling + scratch off the OneDrive tree** (`83f5c8d`). New `scripts/audit-local.mjs` — the
CLEAN-SWEEP Stage-0 inventory as one read-only command (status / stash / non-master branches / local-only tags
/ untracked `*.md` / scratch+tmp size). `sim-fairness.mjs`: `--purge-tmp` wipes `OUT_DIR`; the default
`OUT_DIR` is now `$RA_SCRATCH_DIR` or `<os-tmp>/racearena-scratch` (absolute, OFF the OneDrive tree,
env-overridable; absolute `--out` honoured, relative still resolves under ROOT for back-compat).
`fingerprint-default.mjs` scratch moved to the same off-tree dir. Closes the BACKLOG `--out` item.
`--purge-tmp` smoke-tested; **fp identical** (via the new scratch path).

**STEP 5 — react-router 6.30.4 → 7.18.2** (`226de4b`; return point `pre/router-7`). The app already ran with
the v7 future flags (`v7_startTransition` + `v7_relativeSplatPath`) enabled, so v7 behavior was already in
effect — the official upgrade path was complete. **Only code change:** removed the now-default `future` prop
from `<BrowserRouter>`. All declarative-mode APIs (BrowserRouter/Routes/Route/Navigate/useNavigate/Link/
useSearchParams/MemoryRouter) re-export from v7 unchanged. **Breaking changes: none** — 3319 tests green with
UNCHANGED expectations (no snapshot updates). eslint + build clean.
- **Security:** resolves the **2 moderate** react-router GHSAs (open-redirect in `Link`/`useNavigate` +
  SSR `deserializeErrors`) → **0 moderate**. A NEW **high** advisory `GHSA-qwww-vcr4-c8h2` (RSC-mode CSRF)
  appears; it is **NOT-APPLICABLE** here (client-side Vite SPA, no RSC/SSR/framework mode) and has **no
  forward-fixed release** (vulnerable range 7.12.0–8.2.0; latest is 7.18.2; npm's only "fix" downgrades below
  7.12.0, reintroducing the moderates). New `scripts/audit-gate.mjs` fails CI on high/critical **except** a
  documented+justified allowlist (this one advisory, with a remove-when condition); CI now runs the gate.

**STEP 6 — record polish** (`dcde97c`). `reports/evolution/INDEX.md` — one-screen map of the ~45 evolution
reports (newest-arc-first: what-it-tried → verdict → lesson). **Runaway phase formally CLOSED** in `TAGS.md` +
`BACKLOG.md`: solved by the shipped gap-reroll (runaway 23.5%→8.3%), the Distance Leash REJECTED (made it
worse, Lesson 179), the v2 pulk watchdog is the permanent guard — the last dangling "open thread" marker is
gone. Also marked the `--out`-under-ROOT backlog item DONE.

## Owner smoke checklist (manual, 3 lines) — react-router 7
1. **Login** → land on `/setup` (redirect works; `Navigate` + `ProtectedRoute`).
2. **Setup → Race**: pick a series, start a race, watch it finish (route change + `useNavigate` mid-flow).
3. **Dev Screen**: open it, change **PULK begin / CHAOS ends**, "Reset All Defaults", confirm the badge reads
   grey "0 race" (the new control resets + counts race-relevant); back out to Setup (nested routes + `Link`).

## VERIFY
- **Fingerprint re-minted IDENTICAL: `ded0a126048e4cdb`** on the final committed state (all six steps).
- **Full suite: 161 files / 3319 tests green**, expectations unchanged except the 5 STEP-1 direct-caller
  re-pins (drifted-0.25 → shipped-0.15, each justified) — no router-forced snapshot updates were needed.
- **Living-doc link check: 0 dangling** (274 links / 51 files). **Audit-gate: PASS** (0 moderate; the one high
  allowlisted with justification). **eslint + build: clean.**
- **`git status --short`: empty · `git stash list`: empty.**

## THE FIVE SENTENCES
1. The `racePlanPulkStart` fallback literals no longer drift — they read the single source
   `DEFAULT_RACE_DYNAMICS_CONFIG`, grep-proven, with the shipped fingerprint identical as the neutrality guard.
2. `racePlanPulkStart` is now an honest DevScreen control ([0.10, 0.60], default 0.15) that resets with the
   race block and counts race-relevant, with validation on load.
3. CI gained a living-doc link-checker (reports/ excluded) and a documented audit-gate that fails on
   high/critical except a justified allowlist; local hygiene is now one command (`scripts/audit-local.mjs`) and
   sweep scratch defaults off the OneDrive tree with a `--purge-tmp` wipe.
4. react-router is upgraded 6→7 (7.18.2), resolving the 2 moderate GHSAs with zero breaking changes (the future
   flags were already on), while the one new high advisory is non-applicable RSC-mode and gated with a
   justified, remove-when-fixed allowlist.
5. The record is complete — an evolution INDEX maps the ~45 reports and the Runaway phase is formally closed
   (gap-reroll shipped the fix), so no open thread remains, and the shipped game is byte-for-byte unchanged.

## PROPOSALS (≥2)
1. **Watch for the react-router forward fix and remove the allowlist entry.** `GHSA-qwww-vcr4-c8h2` currently
   has no release above its 8.2.0 ceiling; when react-router ships a patched `>8.2.0` (or a 7.x backport), bump
   to it and delete the `ALLOWLIST` entry in `scripts/audit-gate.mjs` so the gate reverts to zero exceptions. A
   quarterly `npm outdated react-router-dom` check (or a Dependabot rule) would surface it automatically.
2. **Promote `audit-local.mjs` into a pre-push hook or `npm run` script.** It is read-only and fast; wiring it
   as `npm run audit:local` (and optionally a non-blocking pre-push reminder) would make the CLEAN-SWEEP
   Stage-0 inventory a habit rather than a spec, catching stray untracked docs or a ballooning scratch dir
   before they accumulate.
3. **Code-split the client bundle.** The production build warns the main chunk is >500 kB; a `React.lazy` split
   of the DevScreen + TrackEditor + RacerEditor routes (now that react-router 7 is in) would cut first-load
   size without touching the race path — a clean follow-up unblocked by this upgrade.

---
**Master @HEAD (after HYGIENE-1).** Shipped fingerprint `ded0a126048e4cdb` unchanged; hygiene list empty.
Return points on origin: `pre/hygiene` (a4103bb), `pre/router-7` (83f5c8d).

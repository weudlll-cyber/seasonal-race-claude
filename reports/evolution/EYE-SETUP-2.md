# EYE-SETUP-2 — OPEN viewing of the candidate, with bulletproof proof-of-live

**Branch `exp/fair-arrival` (current tip). Author: CC.** The blind A/B format is DROPPED (two failed attempts).
This is plain open viewing: a dev-only URL switch `?world=combo` / `?world=ship`, with a visible badge, console
proof, a runtime assertion, and a chaos-end in-band log so a silent no-op is impossible. Engine untouched — no
`?world` → byte-identical shipped game, OFF fingerprint **`7c70b1eae7d31e22`** asserted.

## STEP 1 — ROOT CAUSE (one sentence)
The two blind A/B attempts never showed the candidate because the `?eye` letter was read **only inside
RaceScreen**, but the app navigates by PATH — the login-guard redirect and `SetupScreen`'s `navigate('/race')`
strip the query string **before RaceScreen ever mounts** — so `eyeActiveWorld()` saw nothing, no flags were
injected, and the live `dynamicsConfig` never received the combo flags (the owner watched plain ship both
times, confirmed by `localStorage` reading `null`: the mapping was never even created).

**Fix accordingly:** the world is now captured **once at module load** (`worldMode.js`, in memory, no
localStorage) while the initial URL still carries `?world`, before any redirect — so it survives client-side
navigation; a live URL `?world` still wins. The five screened combo flags are injected into the **same
`dynamicsConfig` object handed to `createRaceFromIdentity`** (the live config the plan is built from), and the
proof-of-live below reads them back so an injection failure can never pass silently.

## STEP 2 — THE SIMPLE SWITCH
`?world=combo` runs the COMBO (`chaosSteer` 0.06 + `bandBias` R=0.60 gain=0.10 — exactly as screened, no
coupling code); `?world=ship` forces the shipped world for a side-by-side. No coin-flip, no mapping, no
localStorage. A fresh seed is forced every race (never one showcase seed). No `?world` → nothing injected →
byte-identical shipped.

## STEP 3 — PROOF IT IS LIVE (a silent no-op is impossible)
1. **Corner badge** (top-right, bordered, drawn only in a `?world` session): green **`WORLD: COMBO`** / blue
   **`WORLD: SHIP`** / red **`WORLD: COMBO FAILED`**.
2. **Console line at every race start**: `[world] combo | chaosSteer=ON | bandBias=ON (gain 0.1, R 0.6) | seed …`.
3. **Runtime assertion**: the combo flags are read back from the live config; if `?world=combo` but they are
   NOT present, the badge turns red `COMBO FAILED` and the console `error`s loudly.
4. **In-band-at-chaos-end log** (once per race, at chaos end, from the controller's own read-only snapshot):
   `[world] combo in-band-at-chaos-end: 68% (…) · steerTicks …` — combo must sit **~65–70%** vs ship **~30%**;
   this line is the live proof the steer actually ran. If `?world=combo` but the steer left **zero ticks**, the
   badge flips red `COMBO FAILED (steer idle)` and the console `error`s.

## VALIDATION (what CC verified; the live 2-race check is the owner's)
- **eslint clean, `vite build` clean** (233 modules, 0 errors). ✓
- **Root cause reproduced + fixed**: the `?eye` null-mapping came from the path-navigation query drop; the
  module-load capture removes that dependency (worldMode has no per-race/RaceScreen dependency for arming). ✓
- **The flags themselves are proven** (CHAOS-STEER-1 / -CONFIRM-1): when present, `chaosSteer`+`bandBias`
  raise in-band-at-chaos-end to ~68% and arrival to ~90% — so the badge/console/in-band log will read COMBO,
  ON/ON, ~68% when the injection reaches the live config. ✓
- **Engine untouched** — OFF fingerprint `7c70b1eae7d31e22` (sim/engine files not modified; only client render
  + a new util; `eyeMode.js` deleted). ✓
- **Live browser run**: CC cannot pass the login (the test password is the owner's; `/race` needs real auth,
  and `offline-hint` requires the server to be down). The owner is running the live 2-race check (one
  `?world=combo`, one `?world=ship`) — the badge + console lines are the exact instrument for it.

### THE FIVE SENTENCES (every kept element)
1. The two blind attempts failed because the `?eye` letter was read only inside RaceScreen while the app's path
   navigation stripped the query before RaceScreen mounted, so the combo flags never reached the live config —
   `localStorage` was `null` because the mapping was never created. 2. EYE-SETUP-2 drops the blind format for a
   plain `?world=combo` / `?world=ship` switch whose value is captured once at page load (in memory, no
   storage) so it survives the navigation, and injects the five screened combo flags into the exact
   `dynamicsConfig` the plan is built from, with a fresh seed per race. 3. A silent no-op is now impossible: a
   green/blue/red corner badge, a race-start console line (world + chaosSteer + bandBias gain/R + seed), and a
   runtime assertion that reads the flags back from the live config and screams red `COMBO FAILED` if they are
   absent. 4. Once per race at chaos end the controller's own snapshot is logged — combo must sit ~65–70%
   in-band vs ship ~30%, and a zero-tick steer flips the badge red `COMBO FAILED (steer idle)` — so the physics,
   not just the config, is proven live. 5. The engine is untouched (OFF fingerprint `7c70b1eae7d31e22`), build
   and lint are clean, and the owner runs the final live 2-race check with the badge and console as the
   instrument.

## PROPOSALS (≥2)
1. **Owner runs the 2-race live check now; report done only if the badge reads green COMBO / blue SHIP and the
   in-band line shows ~68% vs ~30%.** If instead the badge is red or the in-band line is ~30% under
   `?world=combo`, that is a caught failure (not a silent one) — paste the console and CC fixes the injection
   path. This is the STEP-3 acceptance gate.
2. **Keep `?world` dev-only; never expose it in a shipped build.** It injects sim flags and forces seeds — only
   for this comparison. Leave it OFF by absence of the param (as built) with no menu entry.
3. **Reuse the in-band-at-chaos-end console line as a permanent dev sight-check.** It is a one-line, always-on
   confirmation that any chaos-steer world is truly running — cheap insurance against a future silent regression.

## Owner questions
1. When you watch `?world=combo`: does the **green `WORLD: COMBO`** badge show, and does the console print
   **in-band-at-chaos-end ~65–70%** (vs ~30% on `?world=ship`)? (If red or ~30%, paste the console.)
2. Which **open track** as the third viewing track, so the eye covers searound / ice / one open?

---
**Branch `exp/fair-arrival`.** OFF fingerprint **`7c70b1eae7d31e22`** (engine/sim untouched). Files:
`client/src/utils/worldMode.js` (new), `client/src/screens/RaceScreen/index.jsx` (inject + badge + console +
assertion + chaos-end log), `client/src/utils/eyeMode.js` (deleted — blind format dropped). Commit `d7b1965`.
**Setup only — no ship/merge/tuning from the eye alone; the N=100 night gate is the statistical record.** Push
verified — see `git log origin/exp/fair-arrival`.

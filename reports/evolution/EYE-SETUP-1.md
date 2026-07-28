# EYE-SETUP-1 — the owner's blind browser viewing (setup + viewing plan)

**Branch `exp/fair-arrival` (tip after CONFIRM-1). Author: CC.** A dev-only, client-side blind A/B viewing
switch so the owner can watch races in the real browser and judge watchability with **no metrics, no labels, no
knowledge of which world is which**. READ-ONLY toward the engine — the default game is untouched. OFF fingerprint
**`7c70b1eae7d31e22`** asserted unchanged (engine + sim byte-identical; only browser-render code + a new util).

## 1. BUILD-vs-SPEC CONFORMANCE
- **Engine byte-identical; the COMBO is injected as config flags only, never new engine code.** The build touches
  only `client/src/utils/eyeMode.js` (NEW) and `client/src/screens/RaceScreen/index.jsx` (the browser renderer) —
  `racePlanner.js` / `raceCore.js` are unchanged. When `?eye` maps to the combo world, the SAME five screened
  flags are injected into the browser's `dynamicsConfig` (`chaosSteer` 0.06 + `bandBias` R=0.60 gain=0.10) — no
  coupling, no tuning. CONFORMS.
- **Dev-only URL switch, nothing shown in the UI.** `?eye=A` / `?eye=B`; on the first use of a session a single
  random coin-flip maps {A,B} → {ship, combo}, stored in the browser's local store (localStorage `ra_eye_map_v1`)
  and logged to the DEV CONSOLE only — never rendered in the game. `?eye=reveal` prints the mapping to the
  console; `?eye=reset` starts a fresh blind session. No `?eye` → every hook returns null/no-op → byte-identical
  shipped. CONFORMS. (Note: a browser page cannot write a filesystem file, so the "local file" is the local store
  + dev console; the reveal surfaces it. This is the only place the spec's wording bends to the platform.)
- **Fresh seed every race (never one showcase seed).** In a blind session RaceScreen forces a fresh random
  `racePlanSeed` on every race init, so each "next race" is a different draw — even if a seed was pinned upstream.
  CONFORMS.
- **No metrics overlay, no HUD additions.** Zero new rendered elements; the game is exactly what a player sees.
  CONFORMS.

## 2. VALIDATION (setup works; no eye verdict here — that is the owner's)
- **Blind mapping unit-checked** (mocked browser): no `?eye` → null; `?eye=A` establishes the map and returns its
  world; `?eye=B` returns the OTHER world; A≠B and the pair is exactly {ship, combo}; the map persists across
  reloads and `?eye=reset` clears it. ✓
- **Client builds** (`vite build`, 233 modules, 0 errors) and **eslint clean** on both files. ✓
- **OFF fingerprint `7c70b1eae7d31e22` unchanged** (engine/sim untouched by construction). ✓

## 3. VIEWING PLAN — instructions for the owner

**Start the dev browser** (client on port 5173): run the `dev-start` skill (or `npm run dev` in `client/`), open
`http://localhost:5173`.

**Enter a blind session.** Put **`?eye=A`** on the address bar (e.g. `http://localhost:5173/?eye=A`) and start a
race. The first `?eye=A`/`?eye=B` you open silently coin-flips the mapping for the whole session — from then on
**A is always one world and B is always the other**; you will not be told which. Watch the game exactly as a
player would.

**The plan (3 tracks):**
1. **searound**, 2. **ice-track**, 3. **one open track of your choice** (e.g. luger-hill, mountainstreet,
   river-run, seatrack, or space-sprint).
- Per track, watch **~8–10 races on A and ~8–10 on B**, alternating in whatever order you like (switch by editing
  the address bar between `?eye=A` and `?eye=B`). Each race auto-uses a **fresh seed**, so you are judging the
  world, not one lucky race.
- For each track, jot down **which letter felt better on**: (a) **front battle** — is P1 genuinely contested near
  the line? (b) **overall liveliness** — does the field feel alive or processional? (c) **anything odd** —
  anything that looked wrong, unfair, or on-rails.

**Reveal (only when all three tracks are done).** Open **`?eye=reveal`** and read the mapping in the browser dev
console (F12 → Console), or ask CC to print it. Your per-track notes, mapped to ship/combo, become the eye
verdict. To run another fully-blind session later, open `?eye=reset` first (re-randomizes the mapping).

**Guardrails.** The active letter is STICKY (sessionStorage): set `?eye=A` once and it holds through every
"start race" navigation — you do NOT need to keep the query in the address bar. To SWITCH worlds, put
`?eye=B` in the bar and press Enter (a full reload); to go back, `?eye=A`. The mapping is fixed per session,
so don't `?eye=reset` mid-viewing. (Fix `0c72930`: the app navigates by path, which drops the query, so the
letter is persisted rather than read only from the URL.)

### THE FIVE SENTENCES (every kept element)
1. A dev-only `?eye=A` / `?eye=B` switch coin-flips {A,B} → {ship, combo} once per session, stores the mapping in
   the local store + dev console (never on the game screen), and shows nothing about it in the UI, so the owner
   watches blind. 2. When a letter maps to the combo world the browser injects only the five screened flags
   (`chaosSteer` + `faB60` draw-bias) into `dynamicsConfig` — no new engine code, no coupling — and every race
   forces a fresh seed so no single showcase seed is ever reused. 3. With no `?eye` param every hook is a no-op
   and the game is the byte-identical shipped world, asserted by the unchanged OFF fingerprint `7c70b1eae7d31e22`
   and an engine that was not touched. 4. The viewing plan is three tracks (searound, ice, one owner-chosen open
   track), ~8–10 races per world per track, alternating A/B freely, with the owner noting per track which letter
   felt better on front battle, overall liveliness, and anything odd. 5. The mapping is revealed only afterwards
   (`?eye=reveal`), the notes become the eye verdict, and nothing ships, merges, or is tuned from the eye alone —
   the N=100 night gate remains the statistical record.

## PROPOSALS (≥2)
1. **Run the blind eye now, in parallel with scheduling the N=100 night gate.** The eye answers the one question
   the sim cannot — does the combo *watch* better, not just measure better — while the wide statistical gate runs
   separately. Neither gates the other; both feed the ship decision.
2. **If the eye is inconclusive between worlds, that is itself a positive result for the combo.** The combo's
   claim is "strictly fairer arrival + more front contest at no watchability cost"; a blind viewer who cannot
   reliably tell them apart confirms "no cost", which combined with the metric wins is a green light. Propose
   reading a null eye-result as pass-on-watchability, not as a failure.
3. **Keep the switch dev-only and flag-gated; never expose `?eye` in any shipped build.** It injects sim flags
   and forces seeds — useful only for this comparison. Propose a note in the dev docs and leaving it OFF by
   absence of the param (as built), with no menu/UI entry ever added.

## Owner questions
1. **Which open track** do you want as the third (luger-hill / mountainstreet / river-run / seatrack /
   space-sprint)?
2. After viewing, **do you want CC to print the mapping** (paste the `?eye=reveal` console line, or the
   `localStorage.ra_eye_map_v1` value), so the notes can be scored ship-vs-combo?

---
**Branch `exp/fair-arrival`.** OFF fingerprint **`7c70b1eae7d31e22`** (unchanged; engine/sim untouched). Files:
`client/src/utils/eyeMode.js` (new), `client/src/screens/RaceScreen/index.jsx` (inject + fresh seed). **Setup
only — no ship/merge/tuning from the eye alone; the N=100 night gate is the statistical record.** Push verified —
see `git log origin/exp/fair-arrival`.

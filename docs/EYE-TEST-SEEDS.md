# Eye-test seeds — what a seed does and does not mean

**Status: binding practice.** Written after a source-level verification showed that seed numbers had
been handed to the owner as if they identified a specific measured sim race. They do not. This
document is the honest replacement for that habit.

Doc-only: nothing here changes behaviour.

---

## The one-sentence rule

> **A typed browser seed is a browser-local replay handle. It is never a cross-tool race identifier.**

Typing `24` into the browser does **not** show you the sim's race `24`. It shows you *a* browser race
that happens to be exactly repeatable.

---

## What a typed Quick-Test seed DOES determine

Quick-Test writes the typed value to `racePlanSeed`
([SetupScreen.jsx](../client/src/screens/SetupScreen/SetupScreen.jsx)), and the race-init effect then
swaps the global generator: `Math.random = mulberry32(racePlanSeed)`
([RaceScreen/index.jsx](../client/src/screens/RaceScreen/index.jsx)).

So, **given an identical configuration**, the seed fixes:

- the start-row shuffle (`computeEvenRowLayout`),
- the initial `spreadFactor` draws,
- every scheduled re-roll target and its jitter,
- `createRacePlan`'s target-rank assignment (its own `mulberry32(seed)`),
- deterministic winner text.

**Consequence: the same seed replays the same browser race move-for-move.** That is genuinely useful —
it makes an eye-test repeatable and lets two people look at the same thing.

### Two hard caveats

1. **Quick-Test only.** The normal **"Start Race" path passes `racePlanSeed: 0`**, which leaves
   `Math.random` untouched — those races are unseeded and **not reproducible at all**.
2. **The seed is only meaningful together with the full config.** Change the field size, racer type,
   duration, or any dynamics value, and the same seed produces a different race. A seed without its
   configuration is not a reference to anything.

---

## Cross-tool seed equality — RESOLVED (parity steps 1 + 2a, 2026-07-23)

A typed browser seed `S` now maps to the sim race `--seed=S --races=1` (same track, racer count,
shipped default config). The three reasons this used to fail are all fixed:

1. **~~The target-rank assignment attaches to different racers.~~** Fixed: the sim now passes
   `planRacers` ordered by **racer index** (`.sort((x,y) => x.index - y.index)`), matching the browser,
   so `createRacePlan` pairs `rankPool[i]` with racer `i` on both sides — same designated winner, same
   pulk selection, same tier per racer.
2. **~~The sim's plan grid is not seeded by the race seed.~~** Fixed: the per-combo FNV
   `comboLayoutSeed` path is deleted; the plan grid is drawn per race from the shared physics stream
   (`makeRaceRng(seed)`), the same seed basis the browser uses.
3. **~~The sim uses two different grids internally.~~** Fixed: ONE per-race shuffle feeds both the plan
   and the physical start rows (parity step 2a / D-GRID).

Parity step 1 additionally isolated the physics RNG from render draws, so the browser race is
frame-rate independent. The remaining known gap before *guaranteed* frame-identity is the
speed/duration model (the next ship). Per-race seeds are typeable — a sweep `--seed=1 --races=100`
uses per-race seeds `1..100`, and `--seed=S --races=1` reproduces browser seed `S`.

---

## How to write an eye-test instruction (template)

Use this wording. It is honest and still gives the owner something repeatable:

> **Eye-test — Quick-Test, track `<track>`, config `<the setting under test, e.g. gap-reroll G=0.75>`,
> field `<N>` × `<racer type>`, duration `<D>`s.**
> Seeds **`<s1>` / `<s2>` / `<s3>`** — these replay identically in the browser and are a reproducible
> **sample of the configuration**. They are **not** the sim races of the same numbers; judge the
> configuration across all three, not any single race.

### The rules behind the template

- **Eye-tests judge a CONFIGURATION, not a race.** Always give several seeds and ask for a verdict on
  the setting, not on one race.
- **Always state the full config** alongside the seeds (track, racer type, field size, duration, and
  the setting under test). Seeds are meaningless without it.
- **Never pair an eye-test observation with a specific row of measured data.** "Seed 87 showed a duo
  escape, and the CSV says seed 87 had 5 lead changes" is comparing two different races.
- **Never call a browser observation an outlier of a sim distribution.** The browser race is not a
  draw from that distribution. State sim findings in sim-space and browser findings in browser-space.
- A browser eye-test *can* legitimately falsify a claim about how a configuration **looks** — that is
  its whole job, and it needs no seed correspondence to do it.

---

## If you genuinely need to watch a specific measured sim race

There is currently no supported way, and **seed translation is not one** — the mismatch is a different
mapping plus a different grid source, not an offset, so "translating" it would mean changing shipped
default behaviour and re-baselining every committed result.

The supported route, when it is built, is a **sim → browser race fixture**: the sim dumps the authored
inputs of a chosen race (grid assignment + target-rank map + seed + config) and a dev-only browser path
loads them, then runs the normal live engine. This is tracked in the backlog against the
browser↔sim parity item. It is not required for any ship decision.

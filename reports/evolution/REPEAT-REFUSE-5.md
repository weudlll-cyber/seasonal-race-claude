# REPEAT-REFUSE-5 — STOPPED at the establish step, and why

**Date:** 2026-09-06
**Branch:** `feat/team-races-1` — **no code was changed by this piece.** RACE-HISTORY-4's
behaviour is left exactly as it is.
**Outcome:** ★ **STOP AND REPORT.** The reference value the addendum names *can* reach the product,
but it does **not** mean what the requirement needs, and comparing it would refuse races that still
run identically — which the addendum defines as wrong.

> **A note on what I was given.** I received the **addendum only** — the section replacing
> "★ WHAT IS COMPARED". I do not have the rest of the REPEAT-REFUSE-5 brief, so this report covers
> the establish step the addendum defines and the STOP it gates. Nothing else was attempted.

---

## The requirement, as the measure

> A race is refused **ONLY WHEN A PROGRAM CHANGE WOULD ACTUALLY CHANGE HOW THE RACE RUNS.** … If the
> built solution refuses a race that would still run identically, it is wrong, however convenient
> the comparison was to build.

Everything below is measured against that sentence.

---

## 1. Can the world fingerprint reach the running product? **YES.**

The addendum asked me to establish this at source. It is not the blocker.

**How the build identity is stamped today.** The client's stamp comes from `virtual:ra-build`, a
Vite virtual module provided by `client/vite-plugin-ra-build.js`. That plugin resolves
`REPO_ROOT = client/..` (`:56`) and reads the working tree live — it already shells out to `git` and
stats `git rev-parse --git-path HEAD`/`index`. `docs/fingerprints.json` sits at exactly that root.
`raceIdentifierBuild.js` then turns the module into the `buildId` an identifier carries.

**The Docker question, which is the one that could have blocked it, does not.** `.dockerignore` is
an allow-list (`**` excluded at `:42`, then `!` re-includes) and `docs/` is **not** re-included — so
`docs/fingerprints.json` is absent from the image. That does not matter, because **the client is
not built inside the image**: `server/Dockerfile:53-59` copies a finished `client/dist` in through a
named build context, and the note there says so explicitly ("IT COPIES A BUILD, IT DOES NOT MAKE
ONE"). The client build therefore runs in the working tree, where the file is present.

**And the server never needs it.** The value would be stamped into the client bundle, stored with
the race by the client, and compared client-side on repeat. No new server path, no new file in the
image.

So the mechanism is available and would have been small. **I did not build it, for the reason
below.**

---

## 2. What the value actually is

`docs/fingerprints.json` → `roles.world`:

```
value:     8a1977187e9c99b4
covers:    the RACE: physics, plan, outcome
reproduce: node scripts/fingerprint-default.mjs
```

`scripts/fingerprint-default.mjs` hashes **ten standard tracks × each track's default racer**, with
`--seed=1 --races=3`, on **the shipped default config**, combined into one SHA-256.

---

## 3. ★ Why it does not satisfy the requirement — three findings, all from the project's own record

### (a) It has ALREADY moved without the game changing

On **2026-09-02** the world value moved `bc01b74fd4f3cfc8` → `8a1977187e9c99b4`. Its own mint note
says what that was:

> **★ THIS IS NOT A WORLD CHANGE, AND A READER IN SIX MONTHS MUST NOT CONCLUDE THAT IT IS.** The
> simulation is untouched: the diff contains no engine file, no default, no config, and no seed. …
> What moved is which race the instrument runs.

And it was demonstrated, not argued:

> **CONTROL B** — the OLD instrument on the NEW tree: `bc01b74fd4f3cfc8`, **equal to the record it
> replaces.** Nothing but the instrument changed.
> **CONTROL C** — the NEW instrument on the OLD tree: `8a1977187e9c99b4`, **equal to the new value.**

Under the proposed comparison, **every race stored before 2026-09-02 would be refused today**, and
every one of them would still run identically. That is not a hypothetical failure mode; it is a
change made four days ago, with controls proving the game did not move.

### (b) It moves on shipped-seed defaults that a stored race does not use

`fingerprint-default.mjs:182-196` reads each track's `defaultRacerTypeId` from
`server/seeds/tracks/<id>.json`. A **stored race carries its own `racerTypeId`** (RACE-STORE-2's
`races.racer_type_id`, and the identifier's `t`), so changing a track's *default* racer cannot alter
how a stored race runs.

GARDEN-PATH-DEFAULTS-1 is precisely that change, and the same mint note quantifies its reach:

> of the ten per-track hashes, **EXACTLY ONE MOVED**. garden-path `fc492a4f8a63` → `09df6c0a2f35`;
> city-circuit, dirt-oval, ice-track, luger-hill, mountainstreet, river-run, searound, seatrack and
> space-sprint are **byte-identical**.

One track's default changing moves the combined value, and would therefore refuse **every stored
race on the other nine tracks** — races the project's own measurement shows are unaffected.

### (c) It is also too NARROW to prove the opposite

The instrument declares its own blind spots (`GUARD.blind`, `fingerprint-default.mjs:67-70`):

> "configs other than the shipped default, and seeds outside its fixed sample"

A stored race carries its own roster, its own seed and its own **config world** — the very things
this hash does not vary. So two equal fingerprints would **not** establish that a stored race runs
identically either.

**The value is therefore wrong in both directions for this purpose:** too broad, so it refuses races
that are fine; too narrow, so its agreement proves less than it appears to.

---

## 4. What I did not do, and why

- **I did not fall back to comparing the build.** The addendum forbids it and gives the reason — it
  would kill every stored race at the next merge, including merges that cannot affect a race. I
  agree with the reasoning: `engine-reach` already shows most changes on this very branch are
  outside the engine hull.
- **I did not invent a third comparison**, and I am not proposing one here. The addendum rules that
  out, and a number invented tonight would carry no evidence that it moves when and only when a race
  moves — which is exactly the property the world value turned out not to have.
- **I changed no code.** RACE-HISTORY-4's warn-and-run stands, unmodified.

---

## 5. What this leaves for the owner

The honest position is that **the project does not currently hold a value that answers "would this
stored race run differently now?"** — and that is a fact about the tree, not a gap in tonight's
work. The three candidates all answer something else:

| value | what it actually tracks | why it is not this |
|---|---|---|
| **world fingerprint** | the shipped race across 10 tracks on default config | moves on instrument corrections and seed defaults; blind to custom configs (§3) |
| **camera / render fingerprints** | what the camera decides and what is drawn | the picture, not the outcome |
| **build commit** | every change to anything | refuses on documentation and interface changes |

**Three things are open, and all three are his:**

1. **Whether the warn-and-run of RACE-HISTORY-4 stays** — still needing his word, unchanged from
   that report.
2. **Whether a value with the property he wants should exist at all.** It would have to be a hash
   over *the engine's inputs and code*, evaluated per stored race rather than over a fixed sample —
   a real piece of work, and one I am deliberately not designing here.
3. **Whether refusing is the right shape at all**, given that the thing being protected against —
   an engine change altering an old race — is exactly what the fingerprints exist to *detect at
   ship time*, where a person is already looking.

---

## Checks

Nothing was built, so nothing was measured beyond the establish step. The working tree is unchanged
apart from this report and its INDEX line; the server suite, client suite and `verify` results in
[RACE-HISTORY-4.md](RACE-HISTORY-4.md) remain the branch's current state.

`engine-reach --check` was not run against source changes because there are none.

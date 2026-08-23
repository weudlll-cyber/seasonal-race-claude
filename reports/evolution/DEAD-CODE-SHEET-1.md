# DEAD-CODE-SHEET-1 — the verified set, re-established, as a sheet you can act on in two minutes

**Branch:** `docs/dead-code-sheet` off master `0eb6222f`. **Documents only. NOTHING WAS DELETED and no
deletion is proposed.** **NIGHT-2026-08-23, piece 6.**

DEAD-CODE-VERIFIED-1 reduced three candidate lists to a small verified set: **eight files with no
importer anywhere, and one default key with no reader.** This piece **re-establishes each of the nine
myself over the whole tree** — counting dynamic access, string-keyed reads, config round-trips,
test-only use, and the `scripts/` and `server/` trees as well as `client/src` — and turns them into a
decision sheet. **The blast radius is yours to judge; this is the list.**

---

## THE SHEET

**Read the middle column. It is the only one that matters for a decision.**

| # | what it is | what would break if it went | the one command that proves it unreferenced |
| --- | --- | --- | --- |
| 1 | `scripts/gen-scaled-sprites.mjs` — downscales three aquatic spritesheets **in place** (turtle 12544→2048, manta 13600→2048, dolphin 32000→2560 px) | **Nothing at runtime. You lose the only record of how three committed sprites reached their current size** — and because it overwrites in place, that record cannot be recovered by re-running it. **The most costly of the eight to lose.** | `git grep -n "gen-scaled-sprites" -- . ':!scripts/gen-scaled-sprites.mjs' ':!reports/'` |
| 2 | `scripts/gen-koi-patterns.mjs` — generates 4 koi mask PNGs (9040×565, 16 frames) | Nothing at runtime. **`KoiRacerType.js:9` names it in a comment as the masks' origin** — that comment becomes a pointer to a file that does not exist. The 4 masks are committed. | `git grep -n "gen-koi-patterns" -- . ':!scripts/gen-koi-patterns.mjs' ':!reports/'` |
| 3 | `scripts/gen-beetle-sprite.mjs` — generates `beetle.png` (1024×128, 8 frames) | Nothing at runtime. **`BeetleRacerType.js:9` names it in a comment.** `beetle.png` is committed. | `git grep -n "gen-beetle-sprite" -- . ':!scripts/gen-beetle-sprite.mjs' ':!reports/'` |
| 4 | `scripts/gen-snowmobile-sprite.mjs` — downscales `snowboard-ride.png` (17328×1083) | Nothing at runtime. **`SnowmobileRacerType.js:7` names it in a comment.** Output committed. | `git grep -n "gen-snowmobile-sprite" -- . ':!scripts/gen-snowmobile-sprite.mjs' ':!reports/'` |
| 5 | `scripts/gen-boarder-sprite.mjs` — generates `boarder-sprite.png` (1536×128, 12 frames) | Nothing. Output committed, no comment points at it. | `git grep -n "gen-boarder-sprite" -- . ':!scripts/gen-boarder-sprite.mjs' ':!reports/'` |
| 6 | `scripts/gen-luge-sprite.mjs` — generates `luge-slide.png` (1024×64, 16 frames) | Nothing. Output committed, no comment points at it. | `git grep -n "gen-luge-sprite" -- . ':!scripts/gen-luge-sprite.mjs' ':!reports/'` |
| 7 | `scripts/gen-aquatic-masks.mjs` — generates turtle / manta / dolphin mask PNGs | Nothing. Masks committed, no comment points at it. | `git grep -n "gen-aquatic-masks" -- . ':!scripts/gen-aquatic-masks.mjs' ':!reports/'` |
| 8 | `scripts/crop-dolphin-sprite.mjs` — crops `dolphin-swim.png` tightly | Nothing. Output committed, no comment points at it. | `git grep -n "crop-dolphin-sprite" -- . ':!scripts/crop-dolphin-sprite.mjs' ':!reports/'` |
| 9 | **`language: 'en'`** — a key in `DEFAULT_RACE_DEFAULTS` (`defaults.js:34`) | **Nothing reads it, and nothing has since the language selector was removed (B-13).** It is still WRITTEN — it rides inside `RACE_DEFAULTS` in every user's localStorage and in every backup file `exportAllStorage` produces. **Deleting it leaves that field in existing stored objects, unread.** | `git grep -n "language" -- client/src server scripts \| grep -v test` — the only hits are this definition, three prose uses of the English word, and the unrelated `check-language-closed` guard |

**All nine commands were RUN, not written from memory.** Every one returns what the row claims.

---

## WHAT MY RE-CHECK CHANGED

**Three of the eight are named in LIVING SOURCE, and last night's test could not have seen it.**

DEAD-CODE-VERIFIED-1's criterion for the final eight was *"named NOWHERE in any tracked `.md`"*. **That
test never looked at `.js`.** Re-run across the whole tree rather than the document set:

| generator | named in |
| --- | --- |
| `gen-koi-patterns.mjs` | `client/src/modules/racer-types/KoiRacerType.js:9` |
| `gen-beetle-sprite.mjs` | `client/src/modules/racer-types/BeetleRacerType.js:9` |
| `gen-snowmobile-sprite.mjs` | `client/src/modules/racer-types/SnowmobileRacerType.js:7` |

**All three are provenance COMMENTS, not invocations — nothing calls them and nothing imports them, so
the "no importer, no invoker" verdict stands unchanged.** What changes is the *consequence*: for
these three, deleting the script leaves a comment in shipped source pointing at a file that no longer
exists. **That is a small cost and a real one, and it was not on the previous sheet.**

**Nothing else moved.** No npm script, no CI workflow and no `package.json` in any of the three trees
names any of the eight — checked directly, not inherited.

---

## THE THING THAT IS NOT A DELETION QUESTION AT ALL

**All eight are one-shot ASSET GENERATORS whose output is committed.** I confirmed the outputs are in
the repository: `dolphin-swim.png`, `beetle.png`, `boarder-sprite.png`, `luge-slide.png` and the koi
and aquatic masks under `client/public/assets/racers/` are all tracked.

**So the question is not "is this code dead."** It is: **do you want to keep the provenance of a
committed binary asset?** Those scripts are the only record of how a 32000-px source became a 2560-px
spritesheet. **A repository that keeps the asset and discards the recipe cannot regenerate or correct
it later** — and for `gen-scaled-sprites.mjs` specifically, re-deriving the recipe is impossible from
the output alone, because the transform was destructive and in place.

**That is a judgement about the archive, not about dead code, and it is entirely yours.**

---

## THE `language` KEY — the one genuine unread config value

**Confirmed unreferenced**, and I checked the three shapes a config key hides in that a bare import
graph misses:

- **dot access** `cfg.language` — none.
- **string-keyed** `['language']`, `"language"` — none.
- **round-trip** — **this one is real and is why the row above says "still WRITTEN".** `language` sits
  inside `DEFAULT_RACE_DEFAULTS`, which is persisted whole under `racearena:raceDefaults`, exported
  whole by `exportAllStorage`, and restored whole by `importAllStorage`. **Nothing reads the field, but
  everything carries it.**
- **no UI** — `git grep -n "language" -- client/src/screens` returns nothing but two prose uses of the
  word. The selector was removed in **B-13** (the B-Wave, PR #25); **the key stayed behind.**

**The project already has a standing rule for this exact situation** and it is worth putting beside
the row: *NO SCHEMA. NO SCHEMA VERSION BUMPS. NO MIGRATIONS — change a config key like any other code:
rename it, add it, delete it.* **So if you want it gone, deleting the line is the whole job**; stored
objects keep an unread field and nothing objects, which is precisely what that rule anticipates.

**A trap worth naming, because it cost me a minute:** `git grep language` is noisy in this repo. The
guard `check-language-closed.mjs` is about the **no-German-text rule**, not this key, and several
comments use "language" in the sense of *visual language*. **A search that looks conclusive here is
mostly false positives** — which is why the row's command pipes through `grep -v test` and why the
verdict rests on the three access shapes rather than on a hit count.

---

## SOURCE HYGIENE

- **Nothing was deleted, nothing was edited outside `reports/`.** This piece adds one report and its
  INDEX line. **`git diff --name-only master` touches `reports/` only.**
- **Lines before/after:** no source or document file changed.
- **Removed / extracted:** nothing.
- **Re-established, not inherited:** all nine items, over `client/`, `server/`, `scripts/`, `.github/`
  and the three `package.json` files. **DEAD-CODE-VERIFIED-1 was used to name the candidates and for
  nothing else** — every verdict here comes from a command run tonight, which is how the three
  source-comment references surfaced.
- **Absence claims** carry their control: each `git grep` in the sheet is a pattern that demonstrably
  matches inside the file it excludes, so a null result is evidence rather than a typo.
- **Noticed but left alone:** DEAD-CODE-VERIFIED-1 also flagged **`overlayGeometry.js`** — production
  geometry whose only importer is its own test, and which SHIP-COORD-SYSTEM named as *the only thing
  covering the overlay layer.* **It is not on this sheet because it is not a deletion candidate**: a
  file whose test is its only importer is a coverage question, not dead code, and putting it on a
  two-minute decision sheet would invite exactly the wrong answer. **Named here so it is not lost.**

---

## BUILD VERSUS SPEC — conformity

1. **The brief said "roughly eight files and one default key" and that is what the previous report
   found. I re-established all nine and the count held** — but **three of the eight changed their
   consequence**, which is the value this piece added over re-reading the old one.
2. **DELETE NOTHING was honoured literally.** No file was removed, no key was removed, **and no
   deletion is recommended anywhere in this report** — including for the five generators nothing at
   all points at. §"not a deletion question" states why even those are a judgement rather than a
   cleanup.
3. **The sheet is one line per item with the three columns asked for**, and the commands are runnable
   as written rather than described.
4. **R15 — documents only; the gate set is the doc guards and nothing else.** No source file was
   touched, so no fingerprint, client suite, browser gate or race can have changed its answer. Merged
   beside PIECE 1's still-running sweep under the night's documents-only rule.
5. **Ran alongside the sweep. Nothing here was timed** — every result is a `git grep` or a file
   listing, so machine load cannot have affected any of it.

---

## PROPOSALS

**P1 — THE ASSET GENERATORS SHOULD BE MOVED, NOT DELETED, AND THE MOVE ANSWERS THE QUESTION.** Every
one of the eight is a one-shot recipe for a committed binary. **`scripts/` implies "a tool you run";
these are "how this asset was made once".** A `scripts/asset-provenance/` directory would take them
out of the live tool namespace — which is what makes them look dead to every audit — **without
throwing away the only record of how three sprites were downscaled.** It also fixes the three
comments in `racer-types/` by giving them a stable place to point at. **Cheap, reversible, and it
retires this question permanently instead of re-asking it every audit.**

**P2 — A "NAMED IN SOURCE" PASS BELONGS IN THE NEXT DEAD-CODE AUDIT, BECAUSE THE DOCUMENT PASS MISSED
THREE OF EIGHT.** DEAD-CODE-VERIFIED-1 cross-read its 73 candidates against every tracked `.md` and
correctly reduced them to 8. **The same cross-read against `.js`/`.mjs`/`.jsx` would have reduced it
to 5**, and the difference is exactly the items whose deletion has a visible consequence. **A comment
naming a file is a reference — weaker than an import, stronger than nothing** — and it is the class
of evidence a static import graph is structurally blind to. **One extra grep, and it is the same shape
of blindness that made LIST B wrong by a factor of sixteen.**

**P3 — `language` IS THE SECOND CONFIG KEY THIS MONTH TO OUTLIVE ITS UI, AND THAT IS A PATTERN WORTH
ONE GUARD.** The selector went in B-13; the key stayed. **PIECE 2 found the same shape in reverse**
(`B-5` advertised as "wiring missing" long after the wiring landed). **A key defined in
`defaults.js` with no reader anywhere is mechanically detectable** — LIST B's method already does it,
and it found exactly one true positive in 245 keys, so the guard would be quiet. **Not proposed as
tonight's work**, and it carries R11's usual caution: it must special-case keys that are deliberately
write-only, and I have not established whether any exist.

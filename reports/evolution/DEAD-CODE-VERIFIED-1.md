# DEAD-CODE-VERIFIED-1 — three candidate lists, turned into numbers you can act on

**Date:** 2026-08-23 · **Branch:** `docs/dead-code-verified` off master `6387b339`
**Piece 6 of NIGHT-2026-08-22.** **VERIFY ONLY. NOTHING WAS DELETED.**

---

## THE HEADLINE

| list | candidate said | **verified** | what the gap was |
| --- | ---: | ---: | --- |
| **A** — exports with no static caller | ~70 | **54 unreferenced**, 170 test-only, 649 referenced | close; the candidate over-counted by mistaking comment mentions for uses |
| **B** — default keys with no reader | ~79 | **1 unreferenced**, 4 test-only, 240 referenced | **off by a factor of ~16** — a config key is read through `cfg.KEY`, `['KEY']` and `set('KEY', …)`, none of which a static import graph sees |
| **C** — files with no importer | ~87 | **73 with no importer AND no invoker** — but only **8 named nowhere in any document** | **"no importer" is not "dead"**: a script invoked by npm, by CI, or by a human has no importer by design |

**The number that matters for a deletion decision is 8, not 87** — and even those eight are one-shot
asset generators whose committed output they are the provenance of. **A removal of the blast radius
the candidate list implies would have taken out live code.** Two concrete near-misses are in §3.

---

## §1 — WHY A CANDIDATE IS ONLY A CANDIDATE, demonstrated rather than asserted

A static import graph cannot see any of these, and every one of them occurs in this tree:

| mechanism | where it occurs here | what it hides |
| --- | --- | --- |
| **`import.meta.glob`** | `client/src/modules/track-effects/index.js:11` loads `./effects/*.js` by PATTERN | **five live visual effects** — bubbles, fireflies, rain, stars, wave |
| **`<script src>`** | `client/index.html:24` loads `/src/main.jsx` | **the application's entry point** |
| **npm scripts** | 17 files named in a `package.json` | `data-export.mjs`, `serve-production.mjs`, … |
| **CI** | 15 files named in `.github/workflows/` | `audit-gate.mjs`, `ci-docs-only.mjs`, … |
| **guard discovery** | `verify.mjs` scans `scripts/` for `check-*.mjs`, `*-fingerprint.mjs` | 19 guards |
| **spawning** | `execFile`/`spawn` by basename | 4 files, including how `engine-reach` asks a guard to `--declare` |
| **namespace import** | 2 specifiers (`authApi.js`, `track-effects/index.js`) | `ns.name` is invisible to a bare-name search |
| **config by filename** | `vite`/`vitest`/`playwright`/`eslint`/`knip` configs | 6 files a tool finds by convention |

**All eight routes are implemented in the verifier, and their yields are counted above** — this is
not a list of caveats, it is what the run actually did.

## §2 — MY OWN METHOD WAS WRONG TWICE, and both are recorded because they change the numbers

**First pass — matching inside COMMENTS.** It biases *both* ways, which is why it is worth naming:
a comment mentioning a dead export makes it look alive, and four dead `defaults.js` keys looked
"weakly referenced" when their only mentions were prose. **Every match in the final run is against
source with block and line comments stripped.**

**Second pass — a bare-name search cannot answer LIST B at all.** It said **0 of 245** keys were
unreferenced, which is not credible. The reason is that a config key is an ordinary word:

- `language` "matches" inside the string `"check-language-closed"` — a guard's own id
- `maxPlayers` matches a **JSX prop with its own default of 20** in `PlayerSetup.jsx:20`
- `tWeight` and `yWeight` match an **e2e spec's own `DEFAULT_CFG` literal**

So LIST B was re-run against **config-shaped reads only** — `something.KEY`, `['KEY']`,
`set('KEY', …)`, `KEY:` in another object literal, and `{ KEY } =` destructuring. That method finds
**1 unreferenced and 4 test-only**, and it agrees with the five I had already resolved by hand.

**A third thing that LOOKED like an error and was not**, kept because it is a good demonstration:
checking `runRaceHeadless` with a plain `git grep` shows three files, so it appears my list is wrong.
Both non-declaring mentions are **inside comments** (`goldenRunner.mjs:645`,
`racerNameIsLoadBearing.test.js:95`). The verifier was right and the hand-check was the loose one.

## §3 — THE TWO NEAR-MISSES, named because they are the argument for this piece existing

**1 · Five shipped visual effects.** `bubbles.js`, `fireflies.js`, `rain.js`, `stars.js`, `wave.js`
have **no static importer anywhere in the tree**. They are on screen in the shipped game, loaded by
`import.meta.glob(['./effects/*.js', '!./effects/*.test.js'])`. Any tool that trusts the import graph
lists all five as dead.

**2 · The application entry point.** `client/src/main.jsx` has no importer. It is loaded by a
`<script type="module" src="/src/main.jsx">` tag in `client/index.html`.

**Neither is exotic and both are ordinary Vite.** That is the point: the candidate list is not
careless, it is *structurally unable* to see these.

---

## §4 — LIST A — EXPORTS · 873 examined

| verdict | count |
| --- | ---: |
| **CONFIRMED UNREFERENCED** | **54** |
| TEST-ONLY (the only mentions are in test files) | 170 |
| REFERENCED by production code | 649 |
| CANNOT ESTABLISH | 0 |

**Where the 54 live**, because the shape matters more than the list:

| group | count | reading |
| --- | ---: | --- |
| inside `scripts/` — instrument internals | **34** | an observer or a lib exports helpers its own file uses; the export keyword is decoration. Harmless, and deleting the keyword is not deleting code |
| other `client/src` | 12 | the interesting ones — see below |
| the `pruneStored*Config` family | **6** | `pruneStoredAutoScaleConfig`, `…BaseSpeed…`, `…FrameTiming…`, `…RaceBehavior…`, `…RaceDynamics…`, `…RowLayout…` — **six identically-shaped functions across six config modules, none called by anything.** A family built once and never wired |
| `RaceScreen/drawing/*` | 2 | `fillTracked`, `drawFinishGate` |

**Worth naming individually:**

- **`runRaceHeadless`** — exported by `client/src/modules/raceCore.js`, the engine entry itself, and
  **called by nothing**. The two mentions elsewhere are both comments, one of which
  (`goldenRunner.mjs:645`) explains that it deliberately steps the core directly *instead of* using it.
- **`drawFinishGate`** in `trackRendering.js` — a draw function nothing draws with.
- **`SHIPPED_ANCHORS`**, **`RANK_TEXT_FALLBACK`**, **`RANK_BORDER_FALLBACK`** — constants naming
  shipped values, referenced only where they are declared.

## §5 — LIST B — DEFAULT KEYS · 245 examined

| verdict | key(s) |
| --- | --- |
| **CONFIRMED UNREFERENCED — 1** | **`language`** (`defaults.js:34`, `'en'`). Nothing reads it through any config-shaped access. Its only tree mentions are a guard's own `id: "check-language-closed"` and prose about German-language reports. |
| **TEST-ONLY — 4** | **`maxPlayers`** (`:28`) — and this one is a trap worth stating: `PlayerSetup.jsx:20` takes a **prop** named `maxPlayers` with **its own default of 20**, and the config key is also 20. **They agree today, which is the dangerous variant** — the same defect PIECE 7 is about. **`tWeight`/`yWeight`** (`:1107-1108`) — `raceBehavior.js:911` records that the metric using them was **replaced**; they survive only in an e2e spec's own literal. **`avoidanceDistance`** (`:1160`) — an e2e spec and one config test. |
| REFERENCED by production — 240 | |

**Values are not restated here; the addresses are** (CONFIG-TRUTH-1).

## §6 — LIST C — FILES · 416 non-test files examined

| verdict | count |
| --- | ---: |
| no importer **and** no invoker | 73 |
| TEST-ONLY | 11 |
| REFERENCED | 332 |

**But 73 is not the deletion candidate, and treating it as one is the error this piece prevents.**
Every one of the 73 is a `scripts/*.mjs` **instrument run by a human by name**. Cross-read against
every tracked `.md`:

| | count |
| --- | ---: |
| named in a **LIVING** document (`docs/`, `CLAUDE.md`, `README.md`) | **21** |
| named in a **REPORT** — i.e. a measurement in the record was taken with it | **62** |
| **named NOWHERE in any tracked `.md`** | **8** |

**The eight:** `crop-dolphin-sprite.mjs`, `gen-aquatic-masks.mjs`, `gen-beetle-sprite.mjs`,
`gen-boarder-sprite.mjs`, `gen-koi-patterns.mjs`, `gen-luge-sprite.mjs`, `gen-scaled-sprites.mjs`,
`gen-snowmobile-sprite.mjs`.

**All eight are one-shot ASSET GENERATORS**, and their output — the sprite sheets — is committed. So
even for these the question is not "is this dead" but **"do you want to keep the provenance of a
committed asset?"** That is a judgement about the archive, and it is yours.

**The 11 TEST-ONLY files include four that are deliberately test-only** (`test/fixtures/sampleTracks.js`,
`test/mockServerTracks.js`, `server/test/authAgent.js`, `parity/goldenCases.js`) and three generators
that verify's routing invokes by name. `overlayGeometry.js` is the one that stands out: it is
production geometry code whose only importer is its own test — **it is the module SHIP-COORD-SYSTEM
named as the ONLY thing covering the overlay layer**, which makes its status worth your eye.

---

## VERIFICATION

**R15 governs, and this piece changed no code at all** — the branch adds one report and its INDEX
line. Nothing else.

| instrument | ran? |
| --- | --- |
| the verifier itself | **RAN** — over 703 tracked code files, 287 of them tests |
| hand-verification | **RAN** on 11 individual candidates across all three lists (§2, §4, §5) |
| `npm run verify` | **RAN** — see the merge commit |
| fingerprints, browser gate, client suite | **NOT RUN, answer already determined:** the branch adds a `.md` and an INDEX line. No source file is touched, and nothing was deleted. |

## BUILD VERSUS SPEC — conformity

| the spec asked | what happened |
| --- | --- |
| per candidate, establish over the WHOLE tree | done — client, scripts, server, tests, plus `package.json`, workflows and HTML |
| count dynamic access, string-keyed reads, config round-trips, test-only use | done — eight routes, each with its yield counted (§1) |
| three lists with counts: CONFIRMED UNREFERENCED · REFERENCED · CANNOT ESTABLISH | done — §4, §5, §6 |
| **DELETE NOTHING** | **nothing was deleted, moved or renamed.** `git diff --stat` on this branch is one new report plus one INDEX line |
| if it will not finish, stop at a whole-list boundary and say which are done | **not needed — all three lists completed** |

## SOURCE HYGIENE

| | |
| --- | --- |
| shipped source changed | **none** |
| files deleted | **none** |
| added | this report + one INDEX line |

**NOTICED BUT LEFT:**

- **`client/knip.config.js` exists**, so a dead-code tool is already configured in this repo. I did
  not run it and did not read its configuration; whether its answer agrees with this one is worth
  knowing and is not established here.
- **170 test-only exports and 11 test-only files.** Some are legitimate seams; some are a symptom of
  the `RaceScreen` untestability finding from PIECE 1 (things exported so a test can reach them).
  Distinguishing the two needs per-item reading and is not attempted.

## PROPOSALS — for the owner, nothing done

1. **Delete the six `pruneStored*Config` functions, or wire them.** They are the cleanest finding in
   the piece: six identically-shaped exports across six config modules, none reachable from anything,
   almost certainly a family written once against a plan that changed. **Value:** it is a real,
   bounded reduction with a nil blast radius — nothing can call them. **Cost:** they may exist to be
   called by a storage-migration step nobody has written yet, in which case deleting them deletes the
   plan. Reading one of the six would settle that, and that reading is the piece, not this line.
2. **Run `knip` and diff its answer against this one.** It is already configured
   (`client/knip.config.js`) and it is a second, independent implementation of the same question.
   **Value:** where two methods disagree is exactly where a candidate list is wrong, and this report
   would rather be contradicted before you act on it than after. **Cost:** knip only sees
   `client/`, so it cannot speak about the 73 `scripts/` instruments, which is where the interesting
   half of LIST C lives.

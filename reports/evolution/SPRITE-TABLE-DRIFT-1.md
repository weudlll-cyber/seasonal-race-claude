# SPRITE-TABLE-DRIFT-1 — the absence claim was false, the parity result survives, and the cost is coverage

**Measure and one comment. No number changed, no golden re-pinned, nothing re-baselined, no mint.**

**THE CORRECTION FIRST.** SPRITE-PREMISE-1 (the report is named that, not SPRITE-ASPECT-TRUTH-1)
stated: *"There is no drift between a harness table and the runtime to report: no harness table
exists. Every instrument on this driver reads the racer-type registry directly."* **That is false.**
Two hardcoded tables exist, and one of them has drifted on five of its ten entries.

**How the false claim was produced, because the mechanism is the same one that produced the wrong
world numbers it was correcting.** The claim came from a `bodyFillX` grep over `scripts/` **capped at
ten results**, of which three were read (`camera-fingerprint.mjs`, `camera-replay.mjs`,
`check-ending-frame.mjs` — all genuinely registry-backed) and the conclusion was generalised to all
seventeen. **Two hardcoded literals were in that same output and were not followed.** An absence
claim was made from a truncated search, and it was presented as checked. A search that has been
capped cannot support "there is none"; it supports "here are some".

---

## 1. WHICH TABLE IS WRONG — established at the registry, not by assuming the odd one out

The brief was right to insist on this order. The authority is the racer-type registry
(`client/src/modules/racer-types/`), loaded and read at runtime rather than scraped:

| duck, per source | displaySize | bodyFillX | bodyFillY |
|---|---|---|---|
| **REGISTRY (`DuckRacerType.js`, the authority)** | **36** | **0.875** | **0.875** |
| `scripts/sim-fairness.mjs` | 36 | 0.875 | 0.875 | 
| `scripts/parity/goldenRunner.mjs` | 44 | 0.5 | 0.75 |

**The registry holds 36 / 0.875 / 0.875. `sim-fairness.mjs` agrees with it; `goldenRunner.mjs` is the
drifted copy** — and its own comment claimed it mirrored the file it disagrees with. That comment is
what made the stale table look authoritative, and it is the one thing this block repairs.

**goldenRunner is drifted on five of ten entries, not one:**

| type | goldenRunner | registry | |
|---|---|---|---|
| horse | 47 / 0.353 / 0.8 | 47 / 0.353 / 0.8 | agrees |
| rocket | 47 / 0.278 / 0.801 | 47 / 0.278 / 0.801 | agrees |
| manta | 56 / 0.633 / 0.805 | 56 / 0.633 / 0.805 | agrees |
| dolphin | 52 / 0.402 / 0.887 | 52 / 0.402 / 0.887 | agrees |
| snowmobile | 52 / 0.459 / 0.797 | 52 / 0.459 / 0.797 | agrees |
| **snail** | 44 / 0.75 / 0.5 | **35 / 0.727 / 0.938** | **DIFFERS** |
| **motorbike** | 44 / 0.35 / 0.8 | **42 / 0.4 / 0.8** | **DIFFERS** |
| **duck** | 44 / 0.5 / 0.75 | **36 / 0.875 / 0.875** | **DIFFERS** |
| **luge** | 50 / 0.3 / 0.85 | **80 / 0.313 / 0.641** | **DIFFERS** |
| **boarder** | 48 / 0.4 / 0.8 | **40 / 0.398 / 0.719** | **DIFFERS** |

**The five that agree carry precise values; the five that differ carry round hand-written ones.** The
table was refreshed in part and the refresh was never finished — which is a more useful diagnosis than
"it drifted", because it says the failure was an incomplete edit with nothing watching, not slow rot.

## 2. WHAT IT HAS COST THE PARITY INSTRUMENT — coverage, and not correctness

**The parity result is NOT corrupted, and the reason is structural rather than lucky.** Every consumer
of the table in `goldenRunner.mjs` is on **both** sides of the comparison. All six, mapped to their
functions rather than counted:

| line | function | side |
|---|---|---|
| 236 | `buildIdentity` | shared — builds the identity both arms run |
| 491 | `browserModel` | browser |
| 518 | `simModel` | sim |
| 547 | `browserArm` | browser |
| 601 | `realArm` | browser (real `raceCore`) |
| 708 | `simArm` | sim |

`goldenRunner.mjs` does not import the racer-type registry **at all** (zero references), so there is
no path by which one arm could get the registry's duck while the other gets the table's. **A wrong
value is handed identically to both sides**, so it can neither manufacture a divergence nor cancel a
real one. The golden assertions are `expect(a.hash).toBe(b.hash)` — a *relative* comparison of two
live-computed arms, not a comparison against a recorded hash.

**Was any pinned golden recorded through a wrong shape? No — checked, not hoped.** The only pinned
outcomes are `REAL_ARM_WINNERS` in `goldenCases.js`, asserted at `goldenRealArm.test.js:57`. They
belong to `realArmCase` = **searound / manta**, and **manta is one of the five entries that agree with
the registry**. No pinned value in this suite was recorded through a drifted body.

**So what HAS it cost.** The cases that run a drifted type — `river-run`/duck (in both `CASES` and
`SPREAD_CASES`) and `city-circuit`/motorbike (in `SPREAD_CASES`) — **prove parity for a racer the
product never draws.** river-run's duck is square in the product (0.875 × 0.875, aspect 1.000) and is
0.5 × 0.75 here (aspect 1.500). Body dimensions feed the speed-brake T, avoidance and overlap through
`drawnBodyLengthPx`, so a step-order divergence that only appears at the real aspect ratio would never
be reached by these cases. **That is a hole in what the guard covers, not an error in what it
reports** — the distinction the brief asked for, and it lands on the benign side of it.

## 3. THE SIZE OF IT — four files, not ten, and only two are tables

The brief's estimate of "at least ten files under `scripts/` carrying hardcoded bodyFill tables" is
high. Seventeen files mention `bodyFillX`/`bodyFillY`; **four carry hardcoded numbers**, and the other
thirteen read the registry or take the values as parameters. Scanned with a pattern that catches both
`bodyFillX: 0.5` and `bodyFillX = 0.5` — the earlier scan missed the second form, which is how two of
these were overlooked the first time.

| file | what it carries | agrees with registry? | action |
|---|---|---|---|
| `scripts/sim-fairness.mjs` | table, **20 types** (complete) | **all 20 agree** | none needed |
| `scripts/parity/goldenRunner.mjs` | table, 10 types | **5 differ** | **comment only — numbers LEFT** |
| `scripts/diag/acceptance-orders.mjs` | 3 consts (manta: 56 / 0.633 / 0.805) | agrees | none needed |
| `scripts/diag/micro-divergence.mjs` | 3 consts (manta: 56 / 0.633 / 0.805) | agrees | none needed |

Registry-backed, no literals: `lib/raceDriver.mjs`, `camera-fingerprint.mjs`, `render-fingerprint.mjs`,
`camera-replay.mjs`, `check-ending-frame.mjs`, `exp-anchor-truth-ab.mjs`, `finish-band-truth.mjs`,
`diag/start-formation.mjs`, `sprite-size-truth.mjs`, `endgame-width-truth.mjs`, `floor-reach-truth.mjs`,
`label-names-truth.mjs`, `line-visible-truth.mjs`.

**`sim-fairness.mjs` is complete as well as correct** — all twenty registry types present, none
missing. It is the table the Sim-Browser Parity Rule depends on, and it is in good standing.

## 4. WHAT WAS REPAIRED, AND WHAT WAS DELIBERATELY NOT

**REPAIRED: the false comment in `goldenRunner.mjs`, and nothing else.** It claimed the table mirrors
`sim-fairness`'s. It replaces with the measured divergence, the reason the numbers stay, and a warning
against fixing them as a drive-by. **Proved comment-only:** `git diff` shows no changed line matching
`displaySize|bodyFill[XY]|speedMultiplier`, and the module re-imports to the identical exported object
(10 entries, duck still `44 / 0.5 / 0.75`). The instrument measures exactly what it measured before.

**NOT REPAIRED: the five drifted entries. Left, with the reason, per the brief's own instruction.**
Correcting them changes the body every one of those cases runs — different `drawnBodyLengthPx`,
therefore different brake-T, avoidance and overlap, therefore different hashes on **both** arms. The
equality assertions would very likely still pass, since both sides move together, but **the races the
goldens compare would no longer be the races they were established on.** That is a re-baseline of a
recorded instrument, which is the owner's call and explicitly out of scope here. **STOPPED and
reported, as instructed.**

## 5. THE CLASS, NOT THE INSTANCE — and what a guard would have to compare

**A physical fact about a racer is copied into two tables and four files, and nothing compares them to
the registry.** The instance repaired itself into a comment; the class is that there is no mechanism
by which the next edit to `DuckRacerType.js` reaches — or even notices — `goldenRunner.mjs`. This
already had a consequence beyond a stale number: a careful reader took the stale table as the
product's and built a hypothesis on it, and the report correcting that hypothesis then made a false
absence claim about the same tables. **Two errors in two consecutive blocks, from one unguarded
duplication.**

**What a guard would have to compare.** For every hardcoded entry, three fields — `displaySize`,
`bodyFillX`, `bodyFillY` — against `getRacerTypeById(id).config`, for the two tables
(`sim-fairness.mjs`, `goldenRunner.mjs`) and the two constant sites. It would live in the existing
`check-*` family and run in CI's *Living-doc guards + script tests* job, where it costs milliseconds
and needs no race.

**The complication that makes it a proposal rather than a decision.** A guard that simply demanded
equality would fail on day one against `goldenRunner`'s five, and the correct response to that failure
is *not* to fix them — §4. So it needs an explicit **pinned-with-reason allowlist**, exactly the shape
`scripts/audit-gate.mjs`'s `ALLOWLIST` already uses: each frozen entry naming why it is frozen and what
would release it. That is the design; whether the freeze is permanent is the owner's, since it is the
same question as whether the goldens should be re-baselined onto the real bodies.

**Worth building?** My view: yes, and cheaply — but it is worth **one** guard over all four sites
rather than a check per file (R13), and it should be written only once the owner has said whether
`goldenRunner`'s five are frozen or due a re-baseline, because that answer decides whether the
allowlist is a permanent feature or a temporary one. Proposed, not decided.

## WHAT WAS NOT RUN, AND WHAT DETERMINED THE ANSWER (R15e)

**Client suite, browser gate, all four fingerprints, the 80-race sheet: NOT RUN.** The only
non-document change is a **comment** inside `goldenRunner.mjs`, proved above to leave the exported
object byte-identical in value — so no test that executes it can reach a different answer, and the
fingerprint instruments never read that file at all (they read the registry). No engine, config or
client source is in the diff. R15c and R15a.

## PROPOSALS

**P1 — the guard in §5, after the owner answers the freeze question.** One check, four sites, three
fields, with a justified pinned-list.

**P2 (mine) — decide whether `goldenRunner`'s five drifted types should be re-baselined.** The
argument for: the parity suite currently proves nothing about the duck the product actually draws, on
a track that is one of ten golden cases. The argument against: re-baselining a golden costs its
history, and the equality guarantee it exists for is unaffected. **This is a real coverage gap and it
should be recorded as one rather than closed quietly either way.**

**P3 (mine) — an absence claim needs an uncapped search, and this report is the second piece of
evidence for that in two days.** MARGIN-PER-TRACK-1 and SPRITE-PREMISE-1 were both measured carefully
and both carried one unmeasured sentence. The cheap discipline: when a report says *no such thing
exists*, the search that establishes it gets run without a result cap and its command is quoted.

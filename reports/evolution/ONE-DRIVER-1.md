# ONE-DRIVER-1 — one race driver, and the race identity becomes visible

**Date:** 2026-08-05 · **Branch:** `one-driver-1`, pushed · **Base:** master @ **`ea92181a`**, exactly
as the spec states.

---

## BUILD-VS-SPEC CONFORMITY

| Spec | Status |
|---|---|
| §1 all three fingerprints bit-identical | **HELD** — §4 |
| §2 capture each script's output BEFORE touching it | **DONE** — 7 captures |
| §2 each reproduces its own prior output exactly | **DONE — and one failed first**, §3 |
| §3 one driver, race identity as input, no hidden defaults | **BUILT** |
| §3 resolve the countdown divergence explicitly, reason in the header | **DONE** — §5 |
| §3 each script keeps its OWN identity | **RESPECTED** — n=40 and n=65 both preserved |
| §4 every script prints its identity, human + `--json` | **BUILT** |
| §4 test that the printed identity matches the run | **BUILT** |
| §5 tests for the module itself | **BUILT** — +10 |
| §5 fifth caller: fold in or say why not | **THREE more exist; all three excluded with reasons**, §6 |
| §5 per-file hygiene report | **§7** |
| §6 stop rules | one fired and was resolved as a port bug, §3 |

---

## 1. WHAT THE DELIVERABLE ACTUALLY WAS

Not deduplication. The four harnesses were never identical and were not meant to be: `his-shot-truth`
runs the **owner's** race context (n=65, boarder, camSeed 882944666) taken from his marker; the other
three run n=40 on each track's own default racer. **That is correct.** The defect was that nothing
said so where the numbers are read — NIGHT-1 put a figure measured at n=65 beside figures measured at
n=40.

So the driver's input is a **RACE IDENTITY with no hidden defaults**: a caller that omits a field gets
a value *and sees it in the identity that comes back*, so an omission can never silently differ
between two harnesses. Every script now prints it.

```
RACE IDENTITY: n=40 · raceSeed=5601 · camSeed=1439767152 · racer=track-default · 60s · 1280x720
               (the CAMERA-ANCHOR-TRUTH-1 measurement context)

RACE IDENTITY: n=65 · raceSeed=5601 · camSeed=882944666 · racer=boarder · 60s · 1280x720
               (the owner's own race context, from his marker)
```

**A fourth identity difference the spec did not name:** three scripts take each track's own
`defaultRacerTypeId`, `his-shot-truth` forces `boarder`. That is now the explicit `TRACK_DEFAULT_RACER`
sentinel rather than an inline `?? 'horse'` repeated four times.

---

## 2. THE EQUIVALENCE EVIDENCE

Seven outputs captured before anything was touched, and all seven reproduce **exactly**:

| run | diff against capture |
|---|---|
| `corridor-truth` | identity line added — **no number moved** |
| `corridor-truth --json` | identity object added to the payload |
| `edge-crossing` | identity line added — **no number moved** |
| `tracking-lag` | identity line added — **no number moved** |
| `tracking-lag --overview-tc=0.25,0.8` | identity line added — **no number moved** |
| `his-shot-truth` | identity line **REPLACED** its bespoke one-off line — **no number moved** |
| `his-shot-truth --owner-unit` | same replacement — **no number moved** |

`his-shot-truth` is the one honest asymmetry: it already printed an identity, in its own format
(`seed 5601, n=65, boarder, 60s, camSeed 882944666`). That line was replaced by the canonical one, so
its diff shows a *changed* line where the others show an *added* one. Same information, one format.

**Re-verified after Prettier reformatted two of the scripts**, rather than assuming whitespace is safe.

---

## 3. THE STOP RULE FIRED, AND THE ANSWER WAS "MY PORT", NOT "THE NUMBERS"

`edge-crossing` first came back **230 crossings of 90102 frames** against a captured **215 of 90237**.

Under the spec that is a stop: report before fixing. **The cause was my own mechanical surgery.** A
blanket `continue` → `return` conversion had turned a `continue` that skipped to the **next subject**
inside `for (const s of subs)` into a `return` that abandoned the whole frame — so every frame with a
centre-outside subject lost its remaining subjects.

**This is the entire argument for §2.** The refactor looked clean, the script ran without error, and
the numbers were wrong by 7%. Nothing but a before/after capture would have caught it, and I would
have shipped it.

I also nearly raised a *second*, false alarm: `corridor-truth` printed a Mountainstreet median of
0.463 where I remembered 0.999. I diffed instead of trusting the memory — the capture matched
exactly, and the 0.999 was a figure from a **pre-company-only** report. Comparing a number to a
memory instead of to its own capture is the same class of mistake this block exists to prevent, one
layer up.

**One more defect the port surfaced:** `his-shot-truth --owner-unit` set `referenceCorridorPx` *after*
`buildRace` had constructed the director, where it would have **silently done nothing**. `trackWidthOf()`
is now exported so the config can be shaped before the director is built.

---

## 4. THE HARD GATE

| | before | after | |
|---|---|---|---|
| camera | `7a33faf2ec131437` | `7a33faf2ec131437` | **bit-identical** |
| render | `73ba53ba9fea12c7` | `73ba53ba9fea12c7` | **bit-identical** |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **bit-identical** |

Script suite **136/136** (+10).

---

## 5. THE COUNTDOWN DIVERGENCE — decided, with the loser's reason recorded

Two harnesses read `DEFAULT_CAMERA_CONFIG.countdownDurationMs`; two read `cfg.countdownDurationMs`.

**The config being RUN wins.** A measurement harness exists to run a race under a *given* config, and
the countdown is part of that config: reading the shipped default while running a modified one would
desynchronise the warm-up from the thing under test. These scripts override camera settings routinely
— `--overview-tc`, the owner's settings, a per-track reference width — so the wrong source is a live
hazard rather than a theoretical one.

**Cosmetic today, load-bearing in principle:** no script currently overrides that key, which is
exactly why switching reproduces every prior number. It has not bitten only because nobody has yet
touched the one setting that would expose it. **A test now asserts a longer countdown actually delays
the race start**, so the choice cannot be silently reverted.

---

## 6. SEVEN CALLERS, NOT FOUR — and why three stay out

`grep -l createRaceFromIdentity scripts/*.mjs` returns **seven**. The three the spec did not name:

- **`camera-fingerprint.mjs` and `render-fingerprint.mjs` — deliberately NOT ported.** They are the
  gate this refactor is measured against. **A tool that changes in the same commit it is meant to
  validate cannot validate it**, and that circularity is precisely the failure the shared module's own
  header warns about. Folding them in would have made §4's table meaningless.
- **`camera-replay.mjs` — NOT ported.** It takes its identity from the owner's marker rather than from
  constants, so it has no drift to fix, and it is his live repro tool. The cost of touching it is
  higher than the benefit of one fewer copy.

**They keep their own copies of the loop, and that is a real residual** — three copies remain, down
from seven. It is on the noticed-but-left list rather than hidden.

---

## 7. HYGIENE, PER FILE

| file | lines | what changed |
|---|---|---|
| `scripts/lib/raceDriver.mjs` | **0 → 255** | new: identity, track loading, race construction, the frame loop |
| `scripts/corridor-truth.mjs` | 305 → **205** | prologue and loop removed; identity + `--json` identity added |
| `scripts/edge-crossing.mjs` | 241 → **135** | prologue and loop removed; identity added |
| `scripts/tracking-lag.mjs` | 253 → **142** | prologue and loop removed; identity added |
| `scripts/his-shot-truth.mjs` | 422 → **324** | prologue and loop removed; bespoke identity line canonicalised |
| `scripts/raceDriver.test.mjs` | **0 → 151** | new |

**Removed from every caller:** the `readFileSync`/`readdirSync` track loader, the racer-type import
with its stderr suppression, the layout/body-reference arithmetic, the `CameraDirector` construction,
the countdown loop and the race loop. **Lifted out:** `trackWidthOf`, `TRACK_DEFAULT_RACER`, and the
`median`/`p95` helpers stayed with their callers deliberately — they are reporting, not driving.

**Net: 1221 lines across four scripts → 806, plus 255 shared.** The saving is real but secondary; the
identity line is the deliverable.

### Noticed, and left

1. **Three fingerprint/replay scripts still carry their own driver copy** (§6). Named, with reasons.
2. **`his-shot-truth` is now four measurements in one script** (visible-world, B1 racer size, M3 road
   edge, the pair-fallback probe). It grew that way across two blocks. Splitting it would be a
   different refactor and would have muddied this one's equivalence proof.
3. **The identity does not include the camera CONFIG.** Two runs of the same script with
   `--company-only` and without produce the same identity line but different numbers. §8.1 is where
   that leads.

---

## 8. PROPOSALS

### 8.1 On your proposal 1 — hash it, and the reason is stronger than convenience

**Yes, and the argument is not "easier to compare".** Reading two identity lines carefully is a
*human* check, and this project has now been bitten three times by a human check that everyone
believed was being done: the frozen build value, the one-directional tag guard, and the n=65/n=40
figure that started this block. A hash makes "these came from different races" **mechanical**.

But it must hash **more than the identity currently holds** — and that is the finding in §7.3.
`corridor-truth` and `corridor-truth --company-only` would produce the *same* identity line and
different numbers, because the camera CONFIG is not in it. So a race-identity fingerprint should be
`sha(identity + canonical(cameraConfig))`, at which point it captures everything that can make two
runs incomparable, including the flags. That is a small addition and I did not make it here because
it changes what every script prints, and this block's value rests on nothing changing but the
identity line.

**The one caution:** a hash is only useful if it is *quoted*. A short hex that nobody copies into a
report is a dead instrument (Lesson 196). Which leads to your second proposal.

### 8.2 On your proposal 2 — a convention, but a narrow one

**A number in a report without its identity is the same hazard one layer up, and that is not
hypothetical** — NIGHT-1 is the instance. So yes, worth a convention.

**But not "every number carries its identity", which would be ceremony.** Most numbers in these
reports are qualitative or comparative within one table, where a shared header already covers them.
The narrow rule that catches the real failure: **when a report puts two numbers side by side, they
must either share one stated identity or carry different ones visibly.** That is a rule about
*juxtaposition*, not about every figure, and it is the only place the hazard actually lives — a
number alone can be wrong but it cannot mislead by comparison.

Concretely: a table gets one identity line above it; a table mixing arms gets an identity column.
NIGHT-1 would have needed the second and did not have it.

### 8.3 (mine) The equivalence capture should be the standing practice, not this block's method

§3 is the strongest evidence in this report: a refactor that ran clean and produced 7%-wrong numbers,
caught only because the output was captured first. **That is cheap enough to be routine** — four
commands and a `diff` — and it applies to any change to a measurement script, not just a shared-driver
extraction.

I would put it in the ship ceremony as a one-liner: *changing a measurement script means capturing its
output before and diffing after; a changed number is a finding, not a detail.* **I have not added
it** — the ceremony is the owner's document and it already carries the mint tripwire and the three
fingerprints, so a fourth ritual needs his agreement rather than my initiative.

### 8.4 (mine) The identity's `note` field is doing quiet work and should be kept honest

Each identity carries a free-text note — *"the owner's own race context, from his marker"* — printed
with the rest. It is the only part that says **why** an identity is what it is, and it is the part
most likely to rot: if `his-shot-truth`'s numbers are ever re-pointed at a different context, the note
is what a reader trusts and nothing checks it.

**It earns its place** — a bare `n=65` invites someone to "fix" it to 40 for consistency, and the note
is what stops them — **but it is prose next to machine-checked values, which is exactly the shape that
has failed here twice.** Worth knowing when reading it; not worth a mechanism today.

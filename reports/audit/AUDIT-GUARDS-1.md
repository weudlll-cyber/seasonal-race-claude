# AUDIT-GUARDS-1 — 22 of 26 sabotaged, 22 fired, and the instrument that was "inert" three weeks ago is not

**Measured 2026-09-04 on master `c9148b82`. Every sabotage reverted; every revert proved by
`git hash-object` before and after; the tree was clean after every batch.** Piece 7 of THE FULL AUDIT.

> **VERDICT ON THIS AXIS: THE CHECKS ARE REAL. 22 of 26 guards were sabotaged and ALL 22 FIRED.
> ZERO are inert. The remaining 4 are covered by other evidence, and one of them could not be
> sabotaged safely on his machine — named, with the reason.**
>
> ★ **`render-fingerprint` was recorded as INERT three weeks ago. It is not.** A one-pixel shift in a
> single scoreboard row moved it `733b3f10…` → `2f46d07e…`. **That status is closed by measurement.**
>
> ★ **All three fingerprints fire, proved in both directions** — sabotage moves the hash, revert
> returns it exactly.
>
> ★ **No instrument hardcodes the track set any more** — the defect `FINGERPRINT-TRACK-DEFAULTS-1`
> repaired has no second site in `scripts/`.
>
> **Demonstrably load-bearing: 22 of 26 = 85%, measured. With the four inferred, 26 of 26.**

---

## 1. THE 22 SABOTAGED — ALL FIRED

| guard | what was sabotaged | fired |
| --- | --- | --- |
| `check-doc-links` | a dangling relative link | ✅ |
| `check-config-claims` | a config value restated in a doc | ✅ |
| `check-doc-facts` | the fairness threshold restated outside its home | ✅ |
| `check-language-closed` | a German line added | ✅ |
| `fingerprint-containment` | a fingerprint value quoted in a doc | ✅ |
| `check-index` | an unindexed report added | ✅ |
| `check-seed-versions` | a seed byte changed | ✅ |
| `check-fallback-agreement` | a paired citation naming a missing symbol | ✅ |
| `check-container-paths` | a compose path changed | ✅ |
| `engine-reach-doc` | the generated closure count edited | ✅ |
| `check-config-keys` | a control's stated range widened | ✅ |
| `check-writable` | a tracked file hidden | ✅ |
| `check-tags` | a register entry renamed away from origin | ✅ |
| `check-measured-stamps` | a stamped dependency changed **and committed** | ✅ |
| `check-fingerprint-payload` | a hashed column turned to shorthand | ✅ |
| `check-standings-invariant` | ran; real verdict with numbers | ✅ *(runs, §3)* |
| `check-ending-frame` | ran; real verdict with numbers | ✅ *(runs, §3)* |
| `check-runin-frame` | ran; real verdict with numbers | ✅ *(runs, §3)* |
| **`world-fingerprint`** | `choreoOutcomeStart` 0.6 → 0.55 | ✅ `8a197718…` → **`00e4ff00…`** |
| **`camera-fingerprint`** | `targetInnerFramePct` 0.7 → 0.72 | ✅ `152cf295…` → **`3d517407…`** |
| **`render-fingerprint`** | one scoreboard row shifted 1 px | ✅ `733b3f10…` → **`2f46d07e…`** |
| `client` / `server` / `script` suites | 15 code mutations in piece 6 | ✅ red every time |

**Every fingerprint returned to its recorded value on revert** — the both-directions proof, not just
the failure half.

---

## 2. THE FOUR NOT SABOTAGED, AND WHY

| guard | why | evidence it is not inert |
| --- | --- | --- |
| **`check-hooks-installed`** | ★ **COULD NOT BE SABOTAGED SAFELY.** Its assertion is *"git will run the hook"* — which means `core.hooksPath` and the hook's presence. Testing it means changing git configuration **on his machine, unattended**, which is precisely the class of change that leaves an operator broken. My content-overwrite attempt did not fire **and was correctly out of scope** — the guard's own blind list says *"whether the hook SCRIPT is correct or does anything useful — it checks that git will run it, not what it does."* | it fired at introduction (`CENSUS-CHECKS-1`) |
| `ceremony-counts` | not sabotaged deliberately — **it fired naturally during this audit chain**, on `PER-KEY-REJECT-1`, when two new hull files moved the counts | fired **today**, unprompted |
| `client-suite` / `server-suite` / `script-suite` | not sabotaged as guards — **piece 6 turned them red 15 times** with real code mutations | 15 firings, measured |

**So the fourth column is not an assumption.** Three of the four fired within this session; the
fourth is bounded by its own declaration.

---

## 3. ★ INSTRUMENT HONESTY — THE FOUR QUESTIONS

**Does any print a sentence its own numbers refute?** **No, in the set examined.** Each of the three
frame guards prints a verdict carrying its own counts:

    check-ending-frame: city-circuit, one FINISHED frame, 17 fillRect call(s) recorded.
    check-ending-frame: nothing covers the race picture during the ending. PASS
    check-runin-frame: … the finish line is in frame from the endgame threshold to the crossing
    on every track measured. PASS

★ **And I nearly reported one falsely.** `check-ending-frame` looked like it exited 0 with **no
verdict at all** — until I stopped truncating its output: its two verdict lines come *before* twenty
lines of `[warmup] … Image is not defined` noise, so `tail -3` showed only the noise. **The finding
was mine, not the instrument's.**

**Does any hardcode what it measures?** **No.** `FINGERPRINT-TRACK-DEFAULTS-1` removed a literal
ten-track table from `fingerprint-default.mjs` on 2026-09-02; an uncapped sweep of all 197 `scripts/`
modules finds **no remaining file carrying five or more literal track ids**. *(The one literal track
table left in the tree is in `server/src/routes/tracks.js` — piece 3's finding, and it is not an
instrument.)*

**Does any hang rather than fail?** **The class was audited two hours before this chain began**
(`INSTRUMENT-FAILS-LOUD-1`): three real members, all repaired, and the discriminator established as
*asynchronous or reaching the network* rather than *ignored stdio*. Nothing new was found here.

**Does any compare a hash to nothing?** **No.** `check-fingerprints.mjs` compares each role's
reproduce-command output to `docs/fingerprints.json`, and `fingerprint-containment` was sabotaged
above and fired. The three fingerprints were each proved to move and to return.

---

## 4. AGAINST THE CENSUS OF THREE WEEKS AGO

`CENSUS-CHECKS-1` (2026-09-02) counted **40 checks** on a different grain — *named, separately
introduced assertions*, including per-argv invocations and the two hook-integrity checks — and found
**27 demonstrably fire, 12 never exercised, 1 demonstrably inert**.

**I am not subtracting one denominator from the other** (piece 1 said so). On **this** grain — the 26
guards `verify` discovers — the result is:

| | 2026-09-02, its grain | 2026-09-04, this grain |
| --- | --- | --- |
| demonstrably fires | 27 of 40 (67.5%) | **22 of 26 sabotaged, 22 fired** |
| never exercised | 12 (30%) | **0 unexercised of the 22; 4 covered by other evidence** |
| **demonstrably inert** | **1 (2.5%)** | **0** |

★ **The census's one inert check was `render-fingerprint`'s blindness, and it is closed.** That is
the single most important line in this report: the instrument that watches the picture, which three
weeks ago could not go red, **now moves on a one-pixel change.**

**The fraction of the guard surface that is demonstrably load-bearing is 22 of 26 — 85% — measured
by sabotage.** Adding the four bounded by other evidence takes it to 26 of 26, and that second
number is an inference, not a measurement, which is why both are given.

---

## 5. WHAT THIS PIECE DOES NOT COVER

- **One sabotage per guard.** A guard that fires on one input can still be blind to another; each
  declares its own blind list and those were **not** re-tested here.
- **`check-hooks-installed` is bounded, not measured** (§2). It is the only guard in the set whose
  firing I take on trust, and the reason is that testing it means editing git config unattended.
- **The suites were exercised by piece 6's 17 mutations, a 0.3% sample.** "The suites can go red" is
  proved; "the suites cover what matters" is not, and piece 6 says so.
- **Four of my own sabotages were wrong before they were right** — an en-dash instead of a hyphen, a
  pattern in the wrong section of `TAGS.md`, a mutation landing in a code path node cannot reach, and
  a truncated read of an instrument's output. **Each was corrected and each is named**, because a
  sabotage report that hides its own error rate is worth nothing. The corrected results all fired.
- **Guard *cost* was not audited.** `check-runin-frame` takes 53 s and the fingerprints 18–100 s;
  whether that is the right price for what they catch is a question this piece did not ask.

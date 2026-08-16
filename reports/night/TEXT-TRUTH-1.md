# TEXT-TRUTH-1 — three sentences that were false, and one test that could not fail

**Branch:** `fix/text-truth-1`, off master `b5fdb7ab`. **No default value changed. No behaviour
changed. No production logic changed** — the diff is comments and one test file.

---

## WHAT WAS REPAIRED, AND WHY EACH ONE WAS INVISIBLE

### 1. `SpriteRacerType.js` claimed to be unwired, and it is the registry's backbone

Three sentences, written 2026-04-26 and false since D3.5 part 2 landed:

> *"The three existing classes are NOT migrated in this PR."* · *"Migration is the next PR (D3.5
> part 2)."* · **"In this first PR, SpriteRacerType is not yet wired into the registry."**

`HorseRacerType.js`'s own header says *"Migrated from class to config object in D3.5 part 2"*.
**23 files construct `new SpriteRacerType({…})` and `racer-types/index.js` exports twenty types.**
Every racer the game ships is one.

**Why it matters more than a stale comment usually does:** this is the single most-used class in
`racer-types/`, and a reader who believed the third sentence would conclude the whole sprite path was
dead code. It is exactly the shape the night's sweep was told to hunt — a deadness claim contradicted
by the source, load-bearing in the wrong direction.

### 2. `fingerprint-default.mjs` marked a superseded world `← current`

Its header carried a table of eight worlds ending:

```
Speed-150 ship (owner pace pick):    ON 6fdfe851dbb4ca72  OFF f8f7d9c2fd3283e9  ← current
```

`6fdfe851dbb4ca72` stopped being current on **2026-07-31**, three worlds ago. The marker stayed.

**Nothing could catch it, and the two guards that look like they should are both behaving
correctly.** `check-config-claims` scans tracked `*.md` only — a script is out of scope by design.
`fingerprint-containment` matches every path but declares **superseded values** as its blind spot, on
purpose, so a living document may quote history. A superseded hash sitting in a script and labelled
`current` falls exactly through the gap between those two correct decisions.

The table is deleted rather than corrected: `docs/fingerprints.json` owns the current values and
`docs/SIM.md` owns the lineage (its chain already carries every hash that was in this table). This is
ONE-TRUTH-2 applied to a place it never reached. **A ninth row would have been the same defect with a
fresher date.**

### 3. `verify.mjs` told the reader to check a table that VERIFY-ROUTING-2 deleted

```js
remedy: [`check the route table in scripts/verify.mjs against what you changed`]
```

There is no route table. Routing is declared by each guard. The line survived because the branch it
sits in is **provably unreachable** — `fingerprint-containment` matches every path, so no changed
file can fail to select a guard — and the file says so two lines above. **An unreachable branch is
where text goes to rot**, and the one moment it would ever be read is the moment the catch-all is
narrowed, i.e. exactly when a reader needs the truth.

---

## 4. THE TEST THAT COULD NOT FAIL, AND THE PROOF THAT IT COULD NOT

`framingConfig.test.js` contains a block named **"every shipped value survives its own validation
band"**, whose comment states its purpose plainly: *"If DEFAULT_CAMERA_CONFIG ever drifts out of a
band, the shipped game silently runs on a code fallback instead of the value the owner set."*

It asserted six round trips of the form `resolveFramingConfig(DEFAULT)[k] === DEFAULT[k]`. **Four of
those six cannot fail**, and two of them lost their teeth to MIRRORS-BY-REFERENCE:

| assertion | fallback in the resolver | can it still fail? |
| --- | --- | --- |
| `referenceCorridorPx` | `DEFAULT_CAMERA_CONFIG.referenceCorridorPx` | **no** — an out-of-band default is replaced by itself |
| `glideDurationMs` | `DEFAULT_CAMERA_CONFIG.glideDurationMs` | **no** — same |
| `minRacersVisible` | same default (`??`, no band) | **no** — always was a tautology |
| `innerFramePct` | same default (`??`, no band) | **no** — always was a tautology |
| `leaderForwardFrac` | `null` | yes |
| `transitionGrammar` | `'legacy'` | yes |

**SABOTAGE, RUN RATHER THAN ARGUED.** `glideDurationMs` was set to `2000` — far outside its
`[300, 900]` band — and the suite re-run:

- the new **"every shipped value satisfies the band the resolver enforces"** — **FAILED**, which is
  what a guard is for;
- the old round-trip test — **PASSED**, on a shipped value two and a half times outside its band.

The sabotage was reverted and `defaults.js` is byte-identical to master.

The repair asserts the **rule** — the band itself, against the shipped number — which no change to a
fallback can defeat. Where there is no band (`minRacersVisible`, `targetInnerFramePct`) it asserts
existence and **says so**, rather than dressing a `??` up as a band it does not have. The round-trip
test is kept under an honest name.

**One further literal de-pinned.** `'glideDurationMs: 299 and 901 are REJECTED to 500…'` now names
`DEFAULT_CAMERA_CONFIG.glideDurationMs`. It still discriminates reject-from-clamp — a clamping
resolver returns 300 and 900, which are not the default — but it no longer goes red on an honest
change of the shipped duration, which is the re-blessing habit R7 names.

---

## WHAT WAS DELIBERATELY NOT TOUCHED

- **`exp-fairness-recheck.mjs` and `exp-camera-bisect.mjs`** each call `ded0a126048e4cdb` "the
  shipped fingerprint". It has not been shipped since 2026-07-31. **Left, and listed instead:** those
  headers record what an experiment asserted on the day it ran, which is the same claim `reports/`
  makes for itself and the same reason reports are append-only. Editing them rewrites evidence.
- **`framingConfig.test.js:60`, `expect(f.glideDurationMs).toBe(500)`** in the bare-caller test. The
  subject there is *what a caller with no config gets*, so naming the default would make it a
  tautology and keeping the literal makes it a re-blessing trap. **Neither is right; the honest fix
  is a decision about what that test is for**, and a sweep should not make it at one in the morning.
- **`docs/SIM.md`'s dated subsections** say "ON is now `7c70b1eae7d31e22`" and "the OFF invariant is
  now `f8f7d9c2fd3283e9`". Both are stale as written — and the section header above them already
  declares the whole block accreting history whose fingerprints were current on their date. Changing
  a living document that declares itself history is a rewrite of the record, not a repair.

---

## VERIFICATION

`npm run verify` on the branch, and its routing is the interesting part: `SpriteRacerType.js` lies
inside the RENDER closure, so a comment-only edit there selects the render fingerprint. That is the
INERT rule doing its job, and the measurement is the proof rather than the rule being quoted.

Result and the four hashes are in the merge commit.

# CAMERA-COMPANY-ONLY-3 — shipped: the road stops bounding the leader shot

**Date:** 2026-08-05 · **Merged to master with full history** at `bf74d6ec` · tags
`v-company-only-complete`, `archive/company-only`.

---

## READ THIS FIRST

**Your number now decides how much you see.** When you set LEADER to 1.0 you get 300 world px of
track, on every one of the ten tracks, all the way round — not 300 on searound and anything between
300 and 688 on Mountainstreet depending on which way the road happened to be turning. That swing was
the restlessness you described, and it is gone: on nine of ten tracks the leader shot is now flat.

**What the camera protects is the racers, not the road.** The old rule kept the full width of the
tarmac in frame and would overrule your setting to do it — on six tracks out of ten it was the thing
actually choosing your shot. It is gone from the leader, overview and comeback shots. What keeps the
picture honest instead is your own "min racers in frame", which was live in that shot the whole time
and could not be heard underneath the road rule.

**And the same number means the same amount of world everywhere**, which is what makes the camera
feel like it moves at one speed on every track — the thing you found when you tried the other unit
and it went restless. That property is now written into the tests, so it cannot quietly stop being
true.

The price, which you saw and accepted: the edge of the road leaves the frame more often in sharp
curves. It already did on 46% of Mountainstreet frames *with* the old rule fully active — the rule
was widening your shot without actually achieving what it widened for.

---

## BUILD-VS-SPEC CONFORMITY

| Spec | Status |
|---|---|
| §0 verify `d2ecc27c` carries the change | **DONE — IT DOES**, §1 |
| §1 fix the lying witness; verify the hypothesis first | **DONE — hypothesis CONFIRMED and worse than stated**, §2 |
| §1 add the assertion that the artefacts can never disagree | **BUILT** — 5 tests |
| §2 push both branches | **DONE** — both at origin |
| §3 fold in, remove the switch | **DONE**, §3 |
| §3 cross-check camera == `7a33faf2ec131437` | **PASSED EXACTLY**, §4 |
| §3 verify `corridorGuarantee` is not dead — report if otherwise | **VERIFIED, AND IT REPORTS OTHERWISE**, §3 |
| §3 `minRacersVisible` stays 5, stored values untouched | **RESPECTED** |
| §3 tests adjusted AND extended | **DONE — three inverted, not deleted**, §3 |
| §4 re-mint; world must be `dc4647be0f55ebdb` | **DONE — unmoved**, §4 |
| §4 CI green at origin before merging; report the run | **DONE** — run `30997930991`, §4 |
| §4 merge with history, never squashed | **DONE** — `bf74d6ec`, `--no-ff` |
| §4 tag, register in the same commit, archive the exp branch | **DONE** — `2a2e17d0` |
| §4 REBASELINE and SIM.md carry the new values | **DONE** — they carried neither before |
| §5 CAMERA_DIRECTOR, LESSONS ×3, DEAD-ENDS, BACKLOG | **DONE**, §6 |
| §6 stop rules | none fired |

---

## 1. THE COMMIT VERIFICATION — his pass is on the right build

| check | result |
|---|---|
| `d2ecc27c` is on `exp/company-only` | **yes** — it is the branch tip |
| carries `companyOnlyFraming` in `defaults.js` | **yes** |
| carries the guarantee-skip line in `CameraDirector.js` | **yes** |

His PASS is sound. The stop rule did not fire.

---

## 2. THE LYING WITNESS — hypothesis confirmed, and it was worse than stated

**The hypothesis was right**: the `[RA CAMERA LIVE TRUTH]` line still read the frozen `__RA_COMMIT__`
define while the HUD pill read the live git identity.

**It was not two consumers. It was three.** The camera marker's `build` field read it too — and the
marker is the artefact that started all of this, the one that reported `be649aa9` while the tree was
twenty-two hours ahead. **I diagnosed that in BUILD-TRUTH-1, fixed the pill, wrote tests for the
pill, and left the thing I had diagnosed still broken.**

That is why CAMERA-COMPANY-ONLY-2 halted a shippable, owner-approved block. **The stop was
procedurally right and the artefact it rested on was lying because of my own half-repair.** That is
the whole of Lesson 201.

**Fixed:** all three read `RA_BUILD`; the define is **removed from `vite.config.js` entirely** so it
cannot come back; the line now also carries branch and a DIRTY marker; the `: 'dev'` fallback is gone,
because a frozen value and a placeholder are both lies.

**The test is the relationship, not the artefact** — five assertions: no source file reads the define,
the define is not declarable, all three consumers read `RA_BUILD`, the three artefacts **cannot
disagree** (each derived the way the app derives it, compared to each other), and the identity is real
rather than a fallback they could agree on vacuously. Testing any one of the three would have passed
throughout.

---

## 3. THE FOLD

The switch is gone: config key, its resolution, the Dev Screen control, label and tooltip. When
something loses its value in the Dev Portal, the control goes with it.

The behaviour is one line — `if (kind !== GUARANTEE.PAIR) return Infinity;` — placed after the PAIR
branch, so the pair states are untouched.

### `corridorGuarantee` — verified, and the verification reports otherwise

The spec said it remains the PAIR states' fallback and to **verify rather than assume**. I did, using
the director's own probe across ten full races:

> **The PAIR fallback fired on 0 of 11,813 pair frames. 0.000%, on every track.**

So it is **defensive, not load-bearing**. I did not delete it — it is still the declared fallback, it
is still exported, and it is still directly covered by its own tests (68 of them, every heading, three
projections). But "it remains the fallback" is true in a weaker sense than the spec assumed, and that
belongs in the record rather than in my head. It is now documented in `CAMERA_DIRECTOR.md` **with the
measurement attached**, so the next reader is not misled about how load-bearing it is.

### Three tests inverted rather than deleted

They were the record of the old behaviour, so they became the record of the new one:

| was | is now |
|---|---|
| "a setting too tight for a WIDE corridor is widened" | "a tight setting is **DELIVERED** on a wide road, not widened to fit it" |
| "the guarantee scales with the REAL corridor, so a wider track demands more world" | "**THE SAME NUMBER MEANS THE SAME AMOUNT OF WORLD ON EVERY TRACK**" — his actual requirement |
| the outermost-lane failure proof, relying on the corridor with `minRacersVisible: 0` | the same worst case, kept in frame by the **COMPANY guarantee at his own 5** |

**And the inversion surfaced something nobody had written down:** at 0.25 corridors all three track
widths now deliver **85.29** world px, not the nominal 75, because **`MAX_CAM_ZOOM` (24.0) binds
first** — 720 / (24 × 720/2047). At the tightest end of the control the limiter is the projection's
zoom cap, not any guarantee. Named in the test rather than rounded away, and on the backlog.

### His observation corrects my measurement

I reported that the company guarantee binds ~0% at n = 65 and recommended raising his 5 to 15.
**That held for the PACK case only.** He watched a torn-apart field — leader alone in front, the five
nearest strung out behind — and the guarantee clearly binds and widens a lot there. **His value stays
at 5**, and the spread-field case across field sizes is on the backlog as a measurement owed *before*
anybody changes it.

---

## 4. FINGERPRINTS AND CI

| | before | after | |
|---|---|---|---|
| camera | `1db71e7fffc1c9f6` | **`7a33faf2ec131437`** | **exactly the probe value minted with his toggle ON** — the cross-check that nothing else moved with the fold |
| render | `ae7e9243bd2add8b` | **`73ba53ba9fea12c7`** | the build line and the HUD relayout, not the guarantee |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **UNMOVED** — no engine was touched all week |

**CI green at origin BEFORE the merge:** run **`30997930991`** at `bfe51bc7`, both jobs, every step
including the audit gate. A PR was opened purely to obtain it — `ci.yml` triggers only on push to
master or a PR targeting it, so pushing a branch runs nothing. **The merge itself was done locally
with `--no-ff`**, never through the GitHub button, because block-by-block attribution is what this
project is built on.

Suite at the merge: **3580 passed / 3580**, 177 files.

---

## 5. HIS PASS, AND ITS EVIDENCE

| | |
|---|---|
| build pill | `d2ecc27c · exp/company-only` (his screenshot) |
| toggle | ON, confirmed |
| track / seed | mountainstreet, seed 5601 |
| verdict | **"nein das passt"** |
| both regimes seen | a torn-apart field (guarantee opens the shot wide) **and** a tight pack (camera holds his 1.0) |

His live-truth line from the same session read `commit=77919708` — the frozen value, now fixed (§2).
**His approval also covers the `anchor-truth` work**: §4a, §4c and stages 1a/1b had never had an eye
test, and they were present in every build he ran. **That debt is closed.**

---

## 6. DOCUMENTATION

- **CAMERA_DIRECTOR.md** — the guarantee table now says the single-anchor states are limited by his
  setting and the company guarantee, with his reason recorded, and the corridor's surviving fallback
  documented *with its 0-of-11,813 measurement*.
- **LESSONS 199–201** — the Overrule Law, the Window Law, the Half-Repair Law. §7.1 argues with them.
- **DEAD-ENDS §I** — the rejected unit redefinition, recorded because it is the obvious proposal and
  its flaw is invisible from the code.
- **BACKLOG** — five named residuals, including the spread-field measurement owed before his 5 changes.

---

## 7. PROPOSALS

### 7.1 On the three lessons — I argued with them, and one changed

You asked me to argue rather than accept. Two I strengthened, one I would put differently:

**199 (a guarantee that overrules is steering)** — kept, and I gave it the missing test rather than
leaving it as a maxim: *any ceiling applied via `Math.min` against a user value should report its
bind rate*. Without that, "it only binds at the edges" is an assumption nobody checks. That is what
turns it from a slogan into something a future block can fail.

**200 (perceived speed comes from window size)** — kept and sharpened. The part worth keeping is not
that the eye was right; it is that **nothing in this project measures apparent speed**, so no amount
of harness-building would have found it. That is a statement about our instruments, not about his
taste.

**201 (one value, several readers, one fixed)** — this is the one I'd change. Your framing was "the
test covered the fixed one", which is true but reads as carelessness. The sharper and more useful
version is that **the fixed reader vouches for the broken ones by association** — the system is more
confidently wrong after a partial repair than before it, because now something authoritative agrees
with the lie. That is why it produced a *false halt* rather than a quiet bug.

### 7.2 (mine) The general shape behind your proposal 2 — it is fan-out, and it is greppable

You asked whether four instrument failures share a shape worth more than any single fix. Three of the
four were **one value with several readers**, and the shape is specific enough to catch mechanically:
**a value produced in one place and consumed in N, where the consumers do not derive from each
other.** The build identity had three; the guarantee ceiling had two (corridor and company, only one
audible); the tooltips CAMERA-HYGIENE-2 found had two (the constant and the default).

**The rule I would adopt:** when a value has more than one reader, the readers must derive from a
single named export, and there must be a test asserting *the readers agree* rather than one test per
reader. It is checkable — a lint could flag a literal that appears in both `defaults.js` and a
tooltip — and §2's test is the working template for the general case.

### 7.3 (mine) The switch was cheap and it should be the default shape for taste questions

This block cost one afternoon of code and settled a question that six measurements had failed to
settle, because it put the actual picture in front of the only instrument that can judge it. **The
pattern — build it behind a flag whose OFF state is provably today's behaviour, hard-gate that with
the fingerprints, let him look, then delete the flag — is repeatable and it worked first time.**

The thing that made it expensive was not the switch. It was that he had to *switch branches and
restart a dev server* to see it, and then run two races instead of one because the Dev Screen cannot
reach a running race. **Fix that one line and this pattern costs him ninety seconds instead of
twenty minutes**, which is the difference between asking his eye often and rationing it.

---

## 8. STATUS

Merged to master with full history at `bf74d6ec`, tagged and registered, `exp/company-only` archived
as `archive/company-only` before retirement. `minRacersVisible` still 5; no stored value of his was
touched; the world fingerprint has not moved all week.

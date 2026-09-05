# GATE-WIRED-AND-CAUSED-1 — the ship gate joins `verify`, learns an accepted cause from an unaccepted one, and stops describing tracks as "excluded"

**2026-09-05.** Branch `fix/gate-wired-and-caused-1` off master `89690185`.
**ALL THREE PARTS LANDED.** Tooling, measurement logic and documentation only.
**No camera behaviour, no default, no threshold, and no change to which tracks the gate runs.
NOTHING WAS MINTED** — `engine-reach --check` selects nothing; its line is quoted verbatim below.

---

## What was true before the work, re-verified at source against `89690185`

Every line of the brief's premise was re-read on the tree rather than trusted. **Four of five hold
exactly, including their line numbers; the fifth is wrong and is corrected here.**

| claim | verdict |
| --- | --- |
| `viewer-invariants.mjs` declares its own routing at ~52-67 | **HOLDS.** `GUARD` opens at **52**, `dirs` at **63**, `files` at **64**, `reach: []` at **65**, the `--declare` branch at **67**. |
| `routing.mjs:227-240` collects guard scripts BY FILENAME PATTERN, and `viewer-invariants.mjs` matches none | **HOLDS.** `guardScripts()` opens at **227**, the pattern is at **232-236**, `out.push` at **237**. |
| the gate is wired to nothing — no `verify`, no CI job, no hook, no npm script | **HOLDS.** `package.json` has five scripts and none is it; `.github/workflows/` returns zero hits for the name; the installed hooks do not name it. |
| `verify.mjs:218` builds the file set from `git diff --name-only <BASE>...HEAD` | **HOLDS.** Line 218 exactly. |
| `verify.mjs:9` states the constraint — a skipped guard is a visible decision | **HOLDS.** Line 9 exactly. |
| `--gate` = `GATE_TRACKS` `space-sprint,city-circuit`, seed 9, arm `shipped`, two races | **HOLDS.** `GATE_TRACKS` at **289**; seed at 93, arm at 133. |
| *"the file header states ~340 s. **THAT FIGURE IS NOT MEASURED**"* | ★ **WRONG, and the correction matters.** [SHIP-CEREMONY.md](../../docs/SHIP-CEREMONY.md) carries a measured cost table — **1 race 267 s, 2 races 340 s, 10 races 671-885 s** — under a heading that says the trade was measured rather than assumed. The header's `~340 s` traces to that 2-race row. What it lacked was not a measurement but a **stated method at the site**. It now has one, and a second independent sample (below) that agrees to within 1%. |

---

## PART 1 — the gate joins `verify`, once per branch

### The defect, stated plainly

`scripts/viewer-invariants.mjs` carried a **complete** routing declaration — two directories, two
files, a `covers` sentence and a five-entry `blind` list — and **nothing read it**. `guardScripts()`
collects by filename pattern (`check-*.mjs`, `*-fingerprint.mjs`, and three names), and
`viewer-invariants.mjs` matches none of them. So the declaration was never asked for, the guard never
appeared in a plan, and the only way the gate ran was a person typing it.

**That is the shape this project has now paid for four times** — a guard that looks exactly like a
guard. The three predecessors are named in `verify.mjs`'s own header and in `routing.mjs`'s: the
render fingerprint's window, the build badge's failure path, and `--cheap`.

### What was built

**1 · Named in the collector, not admitted by a looser pattern.** One alternative,
`^viewer-invariants\.mjs$`, added beside `gen-engine-reach-doc.mjs` and `gen-ceremony-costs.mjs`.
**The pattern was not widened for anything else**, which was the decision rule: widening to any
`.mjs` would enrol every harness in the directory, and `declarationOf` RUNS a file to ask it — asking
a sweep what it covers would run the sweep.

It earns the name on the same two conditions as the other two. **Both were checked, not assumed:**

- its `--declare` branch is the first statement after the declaration object and exits there —
  **measured at 0.28 s**, before it can build a bundle, boot a server or open a browser;
- `verify.mjs` gives it `--gate`, so `verify` can never invoke the forty-seed nightly sweep.

**2 · Two conditions, both necessary, neither sufficient.** `premergeDecision(touched, premerge)` —
pure, exported, tested directly as well as through `plan()`. `touched` comes from the **same matcher
every other guard uses**, so the gate has no private idea of what a camera change is.

**3 · The skip names which condition failed.** This is the half that is easy to leave out, and
leaving it out would break `verify.mjs:9`'s own stated constraint. The four outcomes:

```
--premerge given and a declared path changed
    ·  PRE-MERGE GATE: --premerge given and a declared path changed          → RUNS

--premerge given, nothing it declares changed
    ·  PRE-MERGE GATE NOT SELECTED — nothing it declares changed. It needs BOTH, …

a declared path changed, no --premerge
    ·  PRE-MERGE GATE NOT SELECTED — --premerge was not given. It needs BOTH, …

neither
    ·  PRE-MERGE GATE NOT SELECTED — --premerge was not given, and nothing it
       declares changed. It needs BOTH, …
```

The note is **appended** to the declaration line every other guard prints, so a reader still sees the
machine-checkable shape (`5 file(s) by import closure · dirs=… · names=1 path(s) it does not import`)
alongside the gate's own reason.

**4 · Invoked EXCLUSIVE, and that is measured rather than cautious.** `SHIP-CEREMONY.md` records what
sharing the machine with this harness has already cost **twice**: once with `npm run verify` alongside
it — Chromium killed mid-run, ten races lost, and vitest's workers timed out under the same
saturation, *which then read as a test failure* — and once with two measurement scripts alongside it,
64 of 80 races failed. Running it *inside* `verify` would be exactly that collision if it shared the
queue.

★ **What is NOT the reason, stated so a later reader does not repair the wrong thing:** its
*measurement* is contention-proof. The page runs on a fixed 1/60 s virtual clock, so what it grades
cannot change with machine load. **The schedule is the fragile part, not the number.**

### Decision rules honoured

- **Not wired into CI or the hook.** `verify` only.
- **`GATE_TRACKS`, the seed, the arm and every invariant are untouched.** `GATE_TRACKS` is
  byte-identical.
- The collector's pattern was **not** loosened for any other file, so nothing had to be reported as
  blocking.

### Sabotage — what caught each

| sabotage | caught by |
| --- | --- |
| **(a) selected unconditionally** (`if (true \|\| (touched && premerge))`) | **8 tests**, of which 6 are pre-existing and would have caught it without this block's own: `an EMPTY diff runs nothing at all`, `ROUTED NOWHERE`, `ROUTED TO THE SERVER SUITE`, `NOT ROUTED: the e2e suite is NIGHT WORK`, `CONSEQUENCE: a routing that selects zero guards`, `END TO END: verify exits non-zero when its plan is empty`, plus the two new ones. |
| **(b) never selected** (`if (false && touched && premerge)`) | **EXACTLY the two new tests**, and nothing else. ★ **That asymmetry is the finding, not an accident:** every other verify run in this repository is a run WITHOUT `--premerge`, where not selecting the gate is the correct answer. A gate wired never to fire is invisible to the whole existing suite. It is the reason those two tests exist and the reason they say so in their own comment. |

---

## PART 2 — the sheet computes the cause

### Why

Items 2 and 9 measure an ideal the owner **considered and rejected**: the closing zoom need not have
arrived by the crossing (ACCEPTED-FINISH-1, 2026-09-04; extended to item 2 by his decision of
2026-09-05, PART TWO D27). All of that was already established and written down — and it lived
**only as prose beside the items**. The sheet printed a plain `FAIL` either way, so a reader had to
know `endgame-sheet.mjs` existed, find it, and read four paragraphs before they could tell the
picture he asked for from a defect.

### What is computed, and from what

```js
export function acceptedCause(at) {
  if (!at) return null;
  if (!(at.camZoom > 0) || !(at.photoFinishZoom > 0)) return null;
  const shortLn = Math.log(at.photoFinishZoom / at.camZoom);
  return { accepted: at.binding === "level" && shortLn > FACTOR_TOL_LN, … };
}
```

Both conditions, in the sheet's own words: **the camera still on the `level` binding**, with **the
photo-finish zoom in flight**. "Short of" is on the wide side and in ln, against **item 2's own
existing `FACTOR_TOL_LN` (0.02)** — **no new number enters the file**. `PHOTO_FINISH` is the tightest
setting shipped (0.4 visible corridors against `LEADER_ZOOM`'s 0.75), so `photoFinishZoom > camZoom`
is exactly "still on its way in"; the direction was checked against the defaults **and** against the
measured values below, not reasoned about.

**ONE test serves both items**, because the head of `viewer-invariants.mjs` already records that item
2 and item 9 measure one behaviour under two names. Two copies could drift apart.

★ **Nothing needed adding to the product.** The probe already records `binding`, `camZoom`,
`leaderZoom` and `photoFinishZoom` on the crossing frame (`viewerProbe.js`, `_shotOf`). The brief's
stop-condition — *"if the cause cannot be computed from what the probe already records, STOP"* — was
tested before any code was written and did not fire.

### What the frames actually say — measured before the design was fixed

Three races, seed 9, arm `shipped`, 444 s. **All three crossings carry the accepted shape**, which is
what made one shared test the right design rather than a hopeful one:

| track | `binding` at the crossing | ln short of `photoFinishZoom` | item 2 | item 9 | item 10 |
| --- | --- | --- | --- | --- | --- |
| garden-path | `level` | **0.6151** | ok (0.0135) | **fail**, 4 cut | **fail**, 0.52 |
| dirt-oval | `level` | **0.5373** | **fail**, 0.0913 | ok | ok |
| luger-hill | `level` | **0.2585** | **fail**, 0.2585 | ok | ok |

Every one of those is far above the 0.02 ln tolerance, so the "in flight" half is not a marginal
call on any of them.

### Reporting

- the row prints **`ACC`** where a failure carries the accepted cause and **`FAIL`** where it does
  not — on the item-2 and item-9 columns, in the same four characters as before, so nothing else in
  the sheet's layout moves;
- a new summary line names the cause in full and counts the two outcomes apart:
  `item 2 — ACC n, FAIL n | item 9 — ACC n, FAIL n (ACC + FAIL = the failing counts above; nothing is muted)`;
- **the existing `FAILING RACES per item` line is untouched.** It counts what the items *measure*,
  and no threshold moved, so no count in it may move either.

★ **"A failure from that cause is not a gate failure" was ALREADY structurally true, and saying so
is more honest than claiming a change.** The twelve sheet items **do not feed the gate's exit code
at all** — `viewer-invariants.mjs` exits 1 on the five window invariants, the crossing check, or a
hard error, and on nothing else (established at source, its only `process.exit(1)`). The sheet is
reported, not gated. What changed is that **a reader can now tell the two apart without opening a
document**; what did not change is any exit code, anywhere.

### ★ Item 10 is out of scope, and the reason is a correction rather than an omission

Its supposed accepted cause was the sentence **ACCEPTED-FINISH-ATTRIBUTION-1 stripped of its
attribution on 2026-09-05**. What is established about a `BATTLE_ZOOM` in the window is a
**MEASUREMENT** — the shot frames the battle, so the leader is held forward and the walk does not
happen — **not** that the resulting failure is accepted. Whether such a fail is a defect is not
settled.

So item 10 keeps behaving exactly as it did: a plain `FAIL`, no cause logic, **no `i10_verdict`
field at all**. A test asserts that field is `undefined` *while the accepted cause is present on the
same row*, so it cannot pass by luck — it fails the moment somebody adds a verdict "for symmetry",
which is the likeliest way this comes back.

### Sabotage — what caught each

| sabotage | caught by |
| --- | --- |
| **(a) cause always true** | 3 of the 7 new tests: `THE ACCEPTED CAUSE NEEDS BOTH CONDITIONS`, `SABOTAGE (a) CATCHER: a failure from ANY OTHER cause still fails`, `THE CAUSE IS COMPUTED FROM THE FRAMES`. |
| **(b) cause always false** | 3 of the 7: `THE ACCEPTED CAUSE NEEDS BOTH CONDITIONS`, `SABOTAGE (b) CATCHER: the accepted case must NOT read as a regression`, and — usefully — the **item 10** test, which asserts the cause IS present on its row. |

Both restored and re-run green (7/7) before anything was committed.

---

## PART 3a — the tracks are not excluded

### Established at source FIRST, as the brief required

**There is no exclusion mechanism, and there never was.** The entire track selection is:

```js
const GATE_TRACKS = "space-sprint,city-circuit";
const trackArg = ARG("tracks", GATE ? GATE_TRACKS : null);
const ALL_GEOMETRIES = geometries();
const TRACKS = ALL_GEOMETRIES.filter((g) =>
  trackArg ? trackArg.split(",").includes(g.id) : true
);
```

`geometries()` reads **every** track JSON in `server/data/tracks`. `TRACKS` keeps the ones whose id
is on the named list. **It is an inclusion filter.** Searched for the alternative and found none: no
exclusion list, no exception mechanism, no skip, and no line anywhere in the file that treats one
track differently from another. The file's only track-related refusal is for an **unknown** name
(`--tracks=all`), which is the silent-zero guard and the opposite of an exclusion.

So eight tracks are simply not chosen — and **the three that get discussed have no standing the
other five lack.** Nobody ever wrote a paragraph about the other five, which is itself the tell.

### The full hit list, uncapped, before editing

Searched `scripts/viewer-invariants.mjs`, `scripts/endgame-sheet.mjs` and **every** file under
`docs/`, for `exclu`, `excepted`, `kept out`, `left out`, `the three`, `skipped track`. `excepted`
and `skipped track` return **zero** hits anywhere.

**CORRECTED — the invented status (6 sites):**

| site | what it said | what it says now |
| --- | --- | --- |
| `scripts/viewer-invariants.mjs` **160-288** | *"WHAT THE EXCLUSION ACTUALLY COSTS"*, *"THREE EXCLUDED TRACKS"*, *"WHERE EACH EXCLUDED TRACK STANDS"*, *"this exclusion now rests entirely on"*, *"BOTH exclusions lose their last reason"*, *"NONE MAY BE CHANGED"* — 19 lines carrying the word across three blocks of reasoning | rewritten whole. Two tracks are **chosen**, and why. What the sweep finds elsewhere is a **finding**, listed per track. What the scope costs is **a race, not a track**. Every measured fact kept; the correction paragraph records what it used to say so a reader of the reports that quote it can place them. |
| `docs/BACKLOG.md` **419** | *"**luger-hill's exclusion rests on it**"* | the item is marked answered and acted on; the second half is struck **with its reason**, and luger-hill's actual standing (a finding — item 2 at seed 9, carrying the accepted cause) put in its place. |
| `docs/BACKLOG.md` **2527-2530** (D27) | *"excluded from the SHIP gate"*, *"both exclusions now rest entirely on accepted behaviour"* | *"each fail item 2 alone at seed 9"*, *"both of those failures are accepted behaviour"*, plus the 2026-09-05 ln measurements — and a dated paragraph saying the correction is not cosmetic. |
| `docs/MORNING.md` **57** | *"two of the three **excluded tracks**, not one"* | *"two of the three tracks that fail something at seed 9"*, with the correction noted inline. |
| `docs/MORNING.md` **141-143** | *"luger-hill and dirt-oval are **excluded from the gate**"*, *"both exclusions lose their last reason"* | the NEEDS-HIS-WORD item is struck as **answered 2026-09-05**, restated as failures carrying the accepted cause, correction noted. |
| `docs/SHIP-CEREMONY.md` **650** | *"**excluding the track** does not cost nothing"* | *"not running the track does not cost nothing"*, correction noted. |

**CORRECTED — outside the brief's named search set, and reported because it is the same false idea:**

| site | what it said |
| --- | --- |
| `client/e2e/garden-path-finishes.spec.js:7` | *"`scripts/viewer-invariants.mjs` **EXCLUDES** garden-path from the browser sweep"*. Rewritten to *"`--gate` does not RUN garden-path — its `GATE_TRACKS` names space-sprint and city-circuit"*. The spec's reason for existing is unaffected. It was found while establishing the facts above; leaving a sentence I had just proved false would have defeated the point of the part. |

**EXAMINED AND DELIBERATELY LEFT, with the reason for each:**

| site | why it stays |
| --- | --- |
| `docs/BACKLOG.md` **396**, **631** | Both are **struck-through original wording** of closed items (`~~…the one real thing a track exclusion still hides~~`, `~~THE BROWSER SWEEP STILL EXCLUDES GARDEN-PATH…~~`). They are the record of what the item said, and the live prose beneath each is already correct. Editing struck text rewrites the evidence for a closure that has already been acted on — the same reason this repository keeps overtaken sentences annotated rather than edited. |
| `docs/BACKLOG.md` **638** | A **quotation**, correctly marked as one: *It said the exclusion "costs nothing while it stands"*. The sentence is about the quotation being wrong. |
| `docs/BACKLOG.md` **2626** | *"THE THREE-OF-TEN-TRACKS FRAMING IS RETIRED"* — this is **owner eye-test coverage**, not the gate. Different subject. |
| `docs/BACKLOG.md` **4083** | *"excluded by that property, not by a list of names"* — the **server suite's** bcrypt scheduling. Different subject, and already the correct framing. |
| `docs/TAGS.md` **237** | *"`garden-path` — excluded from every previous corpus because the harness could not finish it"*. This is a **tag-register entry recording a past ship's measurement corpus**, and that corpus genuinely did omit the track. It is not the gate, and TAGS.md is a record of what was true at each tag. |
| `docs/DEAD-ENDS.md` **3, 306, 389, 394, 423, 498** | DEAD-ENDS.md **is** an exclusion list, and says so in its own purpose line. A real mechanism, correctly named. |
| ~50 further hits across `docs/` | `exclusively`, vitest `exclude:` patterns, spread-with-exclusions, Lesson 215's "Exclusion-Set Law", warmup exclusions in SIM.md, and every *"the three"* that means three fingerprints, three clocks, three stages, three options or three sacred properties. None is about the gate's tracks. |

---

## PART 3b — three entries closed (PART TWO **D31**)

**1 · Coarser fairness bands — CLOSED, not traceable.** The entry asserted the owner "has raised" it
and carried no date, no source and no evidence.

**2 · The story layer (owner-cast narrative toolkit) — CLOSED; implemented by the director.**
★ **Both source facts were re-established at source before the closure line was written, exactly as
the brief required, and both hold:**

- `client/src/modules/racePlanner.js:728` — *"Retain the authored ROLE (sovereign-lead / comebacker /
  faller) the generator already produced"*, into `plan._heroRoles`, with `plan._cameraPlan` beside it.
  **Line 728 exactly.**
- `client/src/modules/camera/comebackDetector.js:64` — `setPlan(cameraPlan)` reads
  `h.role === 'comebacker'` and keeps those indices as the primary comeback candidates. **The roles
  are consumed, in the shipped camera.**

**What this does NOT close**, because it is a different question already recorded: the authored
**beats** are still discarded on arrival — PART TWO **D14**, unchanged and still his.

**3 · Camera block reset — CLOSED, not traceable.** The entry recorded that a symptom existed
without recording the symptom. **The `relative vs absolute camera weights` question sitting with it
is closed for the same reason** — no date, no source.

No successor item was opened and nothing was re-litigated.

## PART 3c — the pattern, recorded once

Added where a reader of that backlog section will meet it, under **THE SEVEN THAT ARE HIS**: three
of the four closed entries attributed a question to the owner with no date and no source, and one
contained no content at all. **Stated as a fact about how that set was assembled, not as a rule** —
no guard, no lesson, no new document.

---

## CONFIRMATIONS

### 1 · No camera change, no `--premerge` — gate not selected, skip line correct ✅

Method: a branch off master carrying **only** the Part 1 wiring (`routing.mjs`, `verify.mjs`,
`verify.test.mjs`) — three files, none of them in the gate's declared set. `--dry`, because the plan
is the only thing these changes can alter (R18).

```
VERIFY — 3 changed file(s) vs master
    viewer-invariants   nothing changed  ·  declares 5 file(s) by import closure ·
      dirs=client/src/modules/camera/,client/src/screens/RaceScreen/ · names=1 path(s) it does not
      import  ·  PRE-MERGE GATE NOT SELECTED — --premerge was not given, and nothing it declares
      changed. It needs BOTH, and runs once per branch before the merge: `npm run verify -- --premerge`.
```

**Both** missing conditions named, in order.

### 2 · Same branch WITH `--premerge` — still not selected, and the line names why ✅

```
    viewer-invariants   nothing changed  ·  declares … ·  PRE-MERGE GATE NOT SELECTED —
      nothing it declares changed. It needs BOTH, and runs once per branch before the merge: …
```

The `--premerge` clause is **gone** from the reason, because that condition is now met. Only the
unmet one is named.

### 3 · A camera change WITH `--premerge` — selected, ran, and MEASURED ✅

Method: same branch, plus a **comment-only** addition to `client/src/modules/camera/zoomUnit.js`, so
the gate is selected by its own declared `dirs` and no hash can move. Then the real
`npm run verify -- --premerge`, nothing else on the machine.

Selected for the right reason:

```
    viewer-invariants   1 changed (client/src/modules/camera/zoomUnit.js)  ·  declares … ·
      PRE-MERGE GATE: --premerge given and a declared path changed
```

Ran, and the whole run is green:

```
  PASS  client-suite        317.3s  (ran alone)
  PASS  viewer-invariants   336.9s  (ran alone)
  PASS  check-hooks-installed 0.3s
  PASS  check-config-keys   0.4s
  PASS  ceremony-counts     0.5s
  PASS  check-fallback-agreement 2.0s
  PASS  check-language-closed 2.0s
  PASS  check-measured-stamps 6.0s
  PASS  fingerprint-containment 14.2s
  PASS  check-writable      18.3s
  PASS  camera-fingerprint  136.3s
  PASS  render-fingerprint  141.0s
  PASS  script-suite        141.2s
  PASS  check-runin-frame   202.9s

  wall clock 857.2s — sequential would have been 1319.3s (1.5x)

  PASS 14   FAIL 0   SKIP 13
```

★ **THE MEASURED GATE TIME: 336.9 s, TWO RACES** (space-sprint and city-circuit, seed 9, arm
`shipped`), reported by `verify` itself and marked **`(ran alone)`** — the exclusive scheduling
working, and the reason the number is clean.

**THE METHOD, because the figure is worth only what its method is worth:** timed by `verify` around
the child process, on this machine, with the gate as the only thing running (`exclusive`, so nothing
shared the machine). **TWO samples were taken, not one** — this run and the branch's own pre-merge
run under confirmation 5:

| run | gate wall clock |
| --- | --- |
| confirmation 3 (camera change on a scratch branch) | **336.9 s** |
| confirmation 5 (this branch's own pre-merge run) | **369.0 s** |

**So: 337-369 s for two races, n = 2, same machine, same day, gate alone.** It is not an average of
anything larger and it moves with the machine. It **corroborates** `SHIP-CEREMONY.md`'s 2-race row
of **340 s**, which is the useful thing about it — independent samples taken on different harness
states agreeing. **The `~340 s` was right; what it lacked was a method at the site.** The header now
carries the figure with the method attached.

Also worth recording from this run: the gate is **39% of the whole run's wall clock** and the second
most expensive guard after the client suite. That is the cost the owner's once-per-branch cadence is
paying for, quantified.

### 4 · The three tracks at seed 9, OUTSIDE the gate — every expectation met ✅

`node scripts/viewer-invariants.mjs --tracks=luger-hill,dirt-oval,garden-path --seeds=9 --arm=shipped --jobs=3`.
Three races, all clean on the five invariants. **The rows in full, verbatim:**

```
══ THE ACCEPTANCE SHEET — today (arms shipped, seeds 9) ══
track            seed arm      | 1 line+winner |2 factor|3 turn/rate |4 widest|5 band min/med/0|6 worst step|7 cont|8 still|9 winner x,y cut|10 walk|11|12 pre
garden-path        9 shipped | ok   100 | ok 0.0135 |0.9501/ 0.188 | — 7.657 | ok   100/  100/  0 | ok 0.0415 | ok   0(0) | 40% 1617 | ACC 0.465,0.695   4 |FAIL  0.52 | ok | 5744
dirt-oval          9 shipped | ok   100 | ACC 0.0913 |0.9501/0.1967 | — 7.273 | ok   100/  100/  0 | ok 0.0114 | ok   0(0) | 42% 1267 | ok 0.566,0.684   0 | ok 0.344 | ok | 7059
luger-hill         9 shipped | ok   100 | ACC 0.2585 |0.9502/0.2428 | — 3.701 | ok  58.2/ 88.6/  0 | ok  0.013 | ok   0(0) | 32%  867 | ok 0.647, 0.47   0 | ok 0.362 | ok | 4937

  FAILING RACES per item —  1:0  2:2  4:0  5:0  6:0  7:0  9:1  10:1  11:0   of 3 races
  CAUSE (2 and 9) — the ACCEPTED cause is the closing zoom not yet arrived at the crossing: binding "level" AND camZoom short of photoFinishZoom by more than item 2's own 0.02 ln tolerance. Computed from the crossing FRAME — no track, seed or list.
    item 2 — ACC 2, FAIL 0   |   item 9 — ACC 1, FAIL 0   (ACC + FAIL = the failing counts above; nothing is muted)
```

**Every expectation the brief set is met, and nothing else moved:**

- **luger-hill item 2 → `ACC`** (0.2585) and **dirt-oval item 2 → `ACC`** (0.0913). Both were plain
  `FAIL` before this block; both are the owner's accepted behaviour under his decision of 2026-09-05.
- **garden-path item 9 → `ACC`**, and ★ **item 10 → a plain `FAIL` (0.52)** on the same row. **That
  is the expected result and it is the point of the part:** the two items sit side by side on one
  race, one accepted and one not, and the sheet distinguishes them without a human reading a
  document. Had item 10 been given the treatment "for symmetry", this row would read `ACC` twice and
  the withdrawn attribution would be back in the tree.
- **`FAILING RACES per item` is unchanged in meaning: `2:2  9:1  10:1`.** The items still count what
  they measure. `ACC + FAIL` reconciles to those counts exactly — 2 = 2 + 0, 1 = 1 + 0.
- Items 1, 4, 5, 6, 7, 11 and the reported 3, 8, 12 are untouched, and item 7 reads **0 failing of 3**
  as ITEM7-MEMBERSHIP-1 left it.

### 5 · `npm run verify` and the client suite on the branch ✅

**`npm run verify -- --premerge` on this branch** — the pre-merge run at its own cadence, which also
exercises the wiring end to end on the real diff. The gate is selected by the branch's own source
(`scripts/viewer-invariants.mjs` and `scripts/endgame-sheet.mjs` are in its import closure), which is
the correct answer:

```
VERIFY — 12 changed file(s) vs master
  PASS  viewer-invariants   369.0s  (ran alone)
  PASS  check-doc-facts     0.6s
  PASS  check-hooks-installed 0.5s
  PASS  check-doc-links     0.7s
  PASS  ceremony-counts     1.1s
  PASS  check-index         2.4s
  PASS  check-language-closed 2.5s
  PASS  check-config-claims 2.8s
  PASS  check-fallback-agreement 2.9s
  PASS  check-measured-stamps 5.0s
  PASS  fingerprint-containment 10.0s
  PASS  check-writable      13.9s
  PASS  script-suite        94.7s

  wall clock 463.9s — sequential would have been 506.2s (1.1x)

  PASS 13   FAIL 0   SKIP 14
```

**THE CLIENT SUITE IS NOT SELECTED HERE, AND THAT IS CORRECT** — the only `client/` path this branch
touches is `client/e2e/garden-path-finishes.spec.js`, and the suite declares `notDirs:
["client/e2e/"]` because Playwright specs are excluded from vitest. So it was **run separately**, as
the confirmation asks:

```
 Test Files  241 passed (241)
      Tests  4476 passed (4476)
   Duration  347.10s
```

**Green, both. No test was retried and no retry ledger line was printed.**

---

## SOURCE HYGIENE

| file | before | after | what moved |
| --- | --- | --- | --- |
| `scripts/lib/routing.mjs` | 416 | 436 | +1 alternative in the collector pattern; a paragraph on why this name earns its place; the `routing.test.mjs` claim corrected (below) |
| `scripts/verify.mjs` | 692 | 781 | `--premerge` flag + `KNOWN_BARE_FLAGS` entry; `GATE_GUARD`; `premergeDecision`; `plan()` gains a 5th parameter defaulting to the flag; `commandFor` gains the `--gate` + exclusive case; usage header line |
| `scripts/verify.test.mjs` | 891 | 975 | +4 tests: the gate is collected; all four condition combinations; `premergeDecision` directly; the invocation is `--gate` and exclusive |
| `scripts/endgame-sheet.mjs` | 340 | 453 | `acceptedCause`, `verdictOf`, `i2_verdict`, `i9_verdict`, three `cause_*` diagnostic fields, `okc` in the printer, one new summary line; the design block explaining all of it |
| `scripts/endgame-sheet.test.mjs` | 0 | 193 | **new.** 7 tests, all on synthetic probes naming no track and no seed |
| `scripts/viewer-invariants.mjs` | 1143 | 1129 | **−22 net.** 126 comment lines replaced by 104; the usage header gains the measured figure and its method. **`GATE_TRACKS` is byte-identical**, and so is every line of code in the file |
| `docs/BACKLOG.md` | 4386 | 4420 | item 5 corrected; D27's consequence paragraph corrected; four entries struck to D31; D31 added; the 3c note |
| `docs/MORNING.md` | 200 | 208 | two sites corrected |
| `docs/SHIP-CEREMONY.md` | 774 | 786 | the exclusion sentence; **and the "why it is HERE and not in `verify`" paragraph, which Part 1 made false** |
| `client/e2e/garden-path-finishes.spec.js` | 60 | 65 | the "EXCLUDES" sentence |

**Moved out of the repository: nothing.** **No scratch file entered the repository** — the splice
script, the block text, the probe JSON and all four run logs live in the session scratchpad.

### Noticed, and deliberately left or reported rather than built

- ★ **`routing.mjs:37` claimed a check that does not exist, and I corrected the claim rather than
  leaving it.** It said *"`routing.test.mjs` extracts every such literal from the guard's own source
  and fails if one is not inside the guard's resolved set"*. **THERE IS NO `routing.test.mjs`.**
  Established two ways: `git ls-files | grep -i routing` returns two diagnostics, two night reports
  and `routing.mjs` itself and no test; and no `*.test.mjs` under `scripts/` contains such an
  extraction. **The property it promises still HOLDS for the tree today** — checked by hand for
  `viewer-invariants.mjs`, whose three `await import(u(…))` literals resolve as
  `client/src/modules/storage/defaults.js` (declared in `files`),
  `client/src/modules/camera/framingConfig.js` (covered by the declared `camera/` dir) and
  `client/src/modules/racerNames.js` (**covered by `dataReach`**, which reads paths the guard's code
  names as string literals; `g.matches(…)` returns true for it). **But it holds by inspection, not by
  construction.** ★ **This is directly load-bearing for Part 1** — it is the difference between the
  gate's `reach: []` being an under-declaration and being correct, and it is correct. **Writing the
  missing check is a guard of its own and was NOT built here.**
- **`verify.mjs`'s empty-run message says "The seven skips above"**, a hardcoded count. The plan now
  lists 27 guards. Pre-existing, in a message this block did not touch, and correcting a count in a
  string is a different kind of change from what this block was opened for. **Left, and named.**
- **`docs/MORNING.md`'s NEEDS HIS WORD item 2 (`date-fns`) is also answered** — PART TWO D29 closes
  it. Only the exclusion language in item 1 was in scope here. **Left, and named.**
- **`docs/BACKLOG.md:45`** says the previous version's questions "are PART TWO's DECISIONS D10–D24",
  which now runs to D31. A range that goes stale on every decision. **Left, and named.**

### Superseded by this report

Reports are append-only and were not edited. These sentences in the lab journal keep their wording
and are superseded here:

- **BACKLOG-CORRECTIONS-2026-09-04** — *"it is now two of the three **excluded** tracks, not one"*.
  The measurement is right; there are no excluded tracks.
- **ACCEPTED-FINISH-ATTRIBUTION-1** — its INDEX line records *"no exclusion changed"* and *"the three
  per-track **exclusion** entries"*. The decisions it records stand entirely; the noun does not.
- **GATE-GARDEN-PATH-1**, **GP-SPEC-TRIM-1**, **DROP-GP-SPEC-1** — each describes the gate as
  excluding garden-path. Every measurement in them stands.

---

## FINGERPRINTS

Scripts, comments, tests and documents only, so none can move.
`node scripts/engine-reach.mjs --check` on the ten paths this branch changes, **verbatim**:

```
ENGINE REACH: none of 10 path(s) carry a change that can reach the race engine.
  10 outside the hull (cannot reach the engine at all): client/e2e/garden-path-finishes.spec.js, docs/BACKLOG.md, docs/MORNING.md, docs/SHIP-CEREMONY.md, scripts/endgame-sheet.mjs, scripts/endgame-sheet.test.mjs, scripts/lib/routing.mjs, scripts/verify.mjs, scripts/verify.test.mjs, scripts/viewer-invariants.mjs
```

It selects nothing. **It answers the WORLD question only.** The camera and render fingerprints were
run under confirmation 3 and both PASS against the record. **NOTHING WAS MINTED, and no minting
permission was given by this block.**

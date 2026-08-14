# BRANCH-CLEANUP-1 — the evidence moved first, and the branches went after

**Branch `docs/rescue-front-group`, off master `b2176dc7`.** Third piece of the source clean-up.
**Nothing was deleted before what it held was safe somewhere else**, which is the whole shape of this
piece.

---

## 1. What came onto master out of `feat/front-group`

| | |
| --- | --- |
| `reports/evolution/FRONT-GROUP-1.md` · `-2` · `-3` · `-7` | the whole measurement line, verbatim, with their INDEX entries |
| `scripts/endgame-width-truth.mjs` | 502 lines — the only fixed-yardstick endgame-width instrument |
| `docs/DEAD-ENDS.md` §N | what the floor was, why it failed, and what may not be re-proposed |

**The corridor-floor CODE did not come**, as instructed. It is at `archive/front-group`.

### The harness needed a change to be honest on master, and this is the important part

`endgame-width-truth.mjs` had four arms — `off`, `floor`, `extent`, `extent-drawn` — driven by
`endgameCorridorFloor` and `endgameFloorBindsExtent`. **Neither key exists on master, and neither does
the method they drove** (`_endgameCorridorCeiling` is absent from `CameraDirector.js`; checked, not
assumed).

**A config key the director does not read is inert.** So all four arms would have RUN, and all four
would have returned *the same numbers*, silently, under four different names. An instrument that
reports agreement because it changed nothing is worse than one that is missing — it manufactures a
null result and dresses it as a measurement.

So **the floor arms REFUSE**, exit 2, naming where the mechanism went:

```
FAIL: --arm=floor drove `endgameCorridorFloor`, which is NOT on master and never shipped.
      The mechanism is archived at the tag `archive/front-group`; FRONT-GROUP-7 measured it
      OFF and CONTENDER-ZOOM-1 superseded it. Running it here would report four identical
      arms under four names, because a key the director does not read changes nothing.
      The measurements this tool exists for do not need it: use --arm=master (the default).
```

**What survives is the part that never depended on the floor** — the slack, the diagonal's cost, and
the body-padding coverage are read off the race and the corridor's geometry. Run on master against
river-run seed 2814, the race the whole question came from:

| extent of the corridor used | diagonal cost | body coverage | a tighter shot would be |
| --- | --- | --- | --- |
| **50.0%** (p95 56.0%) | the angled corridor's ceiling is **58.8%** of the same width lying flat | **79.2%** of the drawn sprite | **1.84×** over the endgame, 1.71× through the photo finish |

**The diagnostic monkey-patch is deleted.** It re-implemented `_endgameCorridorCeiling` with the drawn
body as the pad; on master there is no such method, so it would have installed a function nothing
calls. Its FINDING is in FRONT-GROUP-7 and that is where it belongs — the hypothesis was refuted.

## 2. `feat/finish-framed` held exactly one thing master did not

Checked file by file rather than taken from the branch name:

| | |
| --- | --- |
| `pointGuarantee` in `framingRule.js` | **on master** (line 533) |
| `scripts/check-runin-frame.mjs` | **on master**, added separately at `2a7e1bdf`, and master's copy is the LATER one |
| `_finishLineWorldPoint` + the line as a run-in subject | **on master**, reached by the merged run-in work rather than by this branch's key |
| `finishLineFraming` (the key) | absent, superseded, **not rescued** |
| **`finishLineFraming.test.js`** | **absent — and this is the one** |

**`pointGuarantee` shipped with ZERO test coverage.** Grepping every camera test file for its name
returned nothing. It is not a minor function: ZOOM-PACE-2 and -3 established it is the **binding term
through the entire endgame** — the flat crawl and the leap into the photo finish are one monotone
curve, and that curve is this function.

**Six of the twelve tests are now on master** as `pointGuarantee.test.js`: monotonicity with distance,
`Infinity` at zero separation, the exact room-over-need arithmetic, `Infinity` on null inputs, an
anchor already outside the region constraining nothing rather than returning zoom 0, and why the pair
form was rejected.

**Two did not come, and were not re-pointed at something else.** They asserted `finishLineFraming`'s
value; a test for a key that does not exist would fail, and aiming it at a different key would be
inventing a test rather than rescuing one.

**Sabotage:** making `pointGuarantee` return `Infinity` unconditionally turns **3 of the 6 red**.

## 3. Why a tag rather than a branch

The instruction allowed me to object. **I do not object — a tag is the right instrument**, and for one
reason that is not just tidiness: a branch is mutable and anyone can delete it, while a registered
annotated tag is a permanent named pointer that also keeps the objects reachable, which is what an
archive has to guarantee. `archive/*` is already this repository's convention, with seventeen prior
entries.

Both are annotated, and both messages say what the thing was, why it is retired, and what reached
master separately. Registered in [TAGS.md](../../docs/TAGS.md); pushed with the merge in one push.

**One caveat worth stating rather than leaving implicit:** a tag preserves the code, not the ability
to *run* it. `archive/front-group` is nine commits off a master that has since shipped the contender
work; checking it out gives a tree whose camera is two ships behind. It is a record to read, not a
branch to resume.

## 4. What did not change

No default, no fingerprint, no engine file. `npm run verify` **PASS 13 FAIL 0** (routing selected the
client suite, `check-runin-frame`, the script suite and the doc guards). **Nothing minted.**

# CHECKS-FIRE-1 — eleven of the twelve fire, the twelfth's outward half cannot be fired without notifying you, and one guard's headline half is confirmed inert

> **NOTHING WAS FIXED AND NOTHING WAS KEPT.** Every sabotage was reverted, and the branch's **whole
> tree hash equals master's** — `5551ed9c38084d97fa5b018f310bea8344d7da09` on both. That is a
> stronger statement than nine identical files, and it is the one this piece owes.

CENSUS-CHECKS-1 classified 40 checks: 27 demonstrably fire, **12 never exercised**, 1 inert. This
piece put each of the twelve under load and watched.

**The bucket was mostly just RECENT, exactly as the census suspected.** Its own note said the five
newest guards are five of the twelve, and that the "12" was soft because a guard fixed before its
commit landed leaves no searchable trace. That reading is now confirmed: **ten of the twelve fire
outright, an eleventh fires on the half that carries a reachable assertion, and only one could not
be put under load at all — for a reason that is about you, not about the guard.**

---

## THE VERDICT TABLE

| # | check | verdict | what was sabotaged | result |
| --- | --- | --- | --- | --- |
| 3 | `check-container-paths` | **CAN FIRE** | an undeclared `COPY sabotage-dir/` appended to `server/Dockerfile` | exit **1**, named the directory and offered both fixes |
| 6 | `check-ending-frame` | **CAN FIRE** — twice over | (a) its own `--sabotage`; (b) **a real `fillRect(0,0,1280,720)` injected into `renderRaceFrame`'s own draw path** | exit **1** both times, same message; 17 fillRects → 18 |
| 8 | `check-fingerprint-payload` | **CAN FIRE** | `trackId: trackId` → `trackId` at `sim-fairness.mjs:4738` | exit **1**, named file, line and key |
| 10 | `check-hooks-installed` | **CAN FIRE** | `git config core.hooksPath .git/hooks` | exit **1**, named the wrong path and the one-command fix |
| 15 | `check-seed-versions` | **CAN FIRE** | garden-path's `name` edited, version left at 1 | exit **1**, `version 1 -> 1` |
| 16 | `check-standings-invariant` | **CAN FIRE — BOTH HALVES, separately** | (a) SOURCE: a `rank` prop added to `ScoreboardCardInner`; (b) MEASURED: `el.setAttribute('data-place', …)` beside the transform | exit **1** each; see §2 |
| 19 | `camera-fingerprint` | **SPLIT — gate CAN FIRE, headline CANNOT FIRE AS WRITTEN** | `endingOnRaceScreenMs()` forced to `0` | gate: exit **1**, "NOT ONE TRACK produced a FINISHED frame". Headline: see §3 |
| 27 | pre-commit hook self-check | **CAN FIRE** | a line appended to `.githooks/pre-commit`, unstaged, then a commit attempted | commit **refused**, exit 1 |
| 28 | pre-commit untracked-hooks check | **CAN FIRE** | `.githooks/post-commit-sabotage` created untracked, then a commit attempted | commit **refused**, exit 1, named the file |
| 35 | CI script-test input assertion | **CAN FIRE** | the step's own shell run against a `scripts/` holding no `*.test.mjs` | exit **1**; control on the real tree found **40** files, exit 0 |
| 36 | audit-schedule notification path | **COULD NOT BE SABOTAGED SAFELY** end to end — **but its decision logic was exercised in full** | five-case matrix against a stubbed `gh` | all five branches correct; see §4 |
| 40 | verify declared-path refusal | **CAN FIRE** | `check-tags` made to declare `docs/DOES-NOT-EXIST.md` | **exit 2**, control exit 0 |

**Ten CAN FIRE. One splits. One could not be fired.**

---

## 1. THE SABOTAGES THAT NEEDED TO BE REAL, NOT SYNTHETIC

Two of the twelve ship with a self-test, and using only that would have proved less than it looked.

**`check-ending-frame` has a `--sabotage` flag** that injects a full-canvas fill into the recording
context. That proves the *detector* works on a synthetic input. It does not prove the guard sees a
cover-up that arrives the way the real one did — through the product's own draw path. So the fill was
also injected directly into `renderRaceFrame` at `client/src/screens/RaceScreen/renderRaceFrame.js:76`,
the entry point of every frame the game draws. **Same failure, same message, recorded fill count 17 →
18.** The guard sees a real defect, not only its own.

**`check-standings-invariant` has two halves that are blind to different things**, and its own header
argues they are not redundant. So each was sabotaged with the thing the *other* half cannot see:

- **SOURCE half** — a `rank` prop added to `ScoreboardCardInner`. Caught: *"ScoreboardCard.jsx takes a
  prop `rank`. The card is racer-bound; nothing about a place may reach it."*
- **MEASURED half** — no prop at all. `scoreboardPositions.js:86` was made to write
  `data-place` beside the transform, which is the two-layer undo arriving *below* React where no
  prop is involved. The source half stays perfectly green on this. The measured half caught it:
  *"a rank change wrote something other than a card's `style`."*

**The file's claim that its two halves cover different halves is therefore demonstrated, not
asserted.** That was worth the second sabotage.

---

## 2. #40 — AND A NOTE ON HOW NOT TO MEASURE AN EXIT CODE

`check-tags` was made to declare a file that does not exist. `verify --dry` printed the refusal:

> `REFUSED: 1 declared path(s) do not resolve, so the routing cannot be trusted.`
> `does not exist — it can never match, so this guard is narrower than it declares`

**The first attempt at this measurement read the exit code as 0** — because the command was piped
into `head`, so `$?` was `head`'s. The real exit code, captured to a file instead, is **2**, and the
control on the unsabotaged tree is **0**. Recorded because this repository's whole regime rests on
exit 2 meaning *refused*, and a pipeline will quietly report the wrong one.

---

## 3. ★ #19 — THE GATE FIRES; THE HEADLINE HALF IS CONFIRMED INERT

CENSUS-CHECKS-1 classified `camera-fingerprint` as NEVER EXERCISED rather than inert, on the grounds
that it carries one reachable assertion. **That assertion fires.** Forcing
`endingOnRaceScreenMs()` to return `0` produced:

> `FAIL: NOT ONE TRACK produced a FINISHED frame, so this hash does not cover the ending at all`

**Its headline half is a different matter, and the census's reading of it is now confirmed
mechanically rather than by reading:**

| script | occurrences of `--check` |
| --- | --- |
| `scripts/fingerprint-default.mjs` | **4** |
| `scripts/camera-fingerprint.mjs` | **0** |
| `scripts/render-fingerprint.mjs` | **0** |

So two of the three fingerprints measure a hash and compare it to nothing. **NOT FIXED, per the
brief.** It is on the morning sheet as the one-line repair the census already described: give both a
`--check` and pass it from `commandFor()`, exactly as FP-COMPARE-1 did for the world.

**A second thing was found at this site and is not a defect — it is a cross-reference.** The
assertion's own comment says *"garden-path does not finish inside the harness's 200 s wall-clock
ceiling, so it has no ending to sample and never did"*. That is the same fact piece 11 of this chain
is diagnosing, and it is load-bearing here: it is precisely why this gate is written as *at least
one* track rather than *every* track. **A repair to the finish problem would let this gate be
tightened**, and nothing currently records that dependency in either direction.

---

## 4. #36 — THE ONE THAT COULD NOT BE FIRED, AND EXACTLY HOW FAR IT GOT

**The end-to-end path could not be exercised, and the reason is not technical.** `gh` is installed
here and authenticated. Firing the workflow's `drill` input would **create a real GitHub issue on
this repository and notify you.** This chain grants merge permission; it does not grant permission to
send you a notification at three in the morning to see whether notifications work. **A sabotage whose
effect is a message to a person outside this session is not one to perform on my own authority.**

**So the decision logic was lifted out and exercised offline against a stubbed `gh` that records its
calls and touches no network.** All five branches of `audit-schedule.yml:145-185`, and every one takes
the documented path:

| findings | issue open | previous body | result | `gh` calls made |
| --- | --- | --- | --- | --- |
| yes | no | — | **opens a new issue** | `issue list`, `issue create` |
| yes | yes | same set | **does not comment again** | `issue list`, `issue view` |
| yes | yes | different set | **comments once** | `issue list`, `issue view`, `issue comment` |
| no | yes | — | **comments and closes** | `issue list`, `issue comment`, `issue close` |
| no | no | — | **says nothing** | `issue list` |

The realistic CRLF case was included — the stored body ending `\r\n` against a local file ending
`\n`, same content — and the dedup correctly reported *"already states this exact set"*.

**What this establishes and what it does not.** It establishes that the branch a finding takes through
the shell is correct in all five states. **It establishes nothing about whether GitHub delivers the
notification**, which is the half the workflow's own comment calls the actual signal. That half needs
one click from you, and it is on the morning sheet.

---

## 5. WHAT WAS NOT FIXED, DELIBERATELY

Per the brief, these are written down and left alone.

1. **`camera-fingerprint.mjs` and `render-fingerprint.mjs` have no `--check`** (§3). Two of three
   fingerprints cannot gate on a moved hash. Confirmed by count, not by reading.
2. **`check-container-paths` and `check-seed-versions` are in the hook and in verify but not in CI**
   — carried forward unchanged from CENSUS-CHECKS-1. Both fire; a push whose only gate is CI still
   never runs them.
3. **`check-fingerprint-payload` still reports 1 blind spread** at `sim-fairness.mjs:4756`. It fires
   on what it can see; that element's keys come from elsewhere and it says so on every run.
4. **`check-container-paths`'s declared blindness is real and was demonstrated in passing** — the
   sabotage had to add a directory to ONE list to be caught. A directory missing from *both* lists is
   still invisible to it, which is its own first `blind` entry and the shape `utils/` had.

---

## 6. HOW THE REVERSION WAS PROVEN

Nine tracked files were modified and restored, one git config value was moved and restored, and one
untracked file was created and removed.

| proof | result |
| --- | --- |
| `git status --porcelain` | **empty** |
| **whole-tree hash vs master** | `5551ed9c38084d97fa5b018f310bea8344d7da09` — **equal** |
| each of the nine files, `git hash-object` vs `git rev-parse master:<path>` | **9 of 9 identical** |
| `git config --local core.hooksPath` | `.githooks` — restored |
| `git ls-files --others --exclude-standard -- .githooks/` | **empty** |
| stray commits from the two hook probes | **none** — both commits were refused, `git log -1` unchanged |

The tree-hash equality subsumes the per-file table; both are reported because the per-file list is
what a reader can check against the narrative.

---

## Limits

**"CAN FIRE" is a statement about one input, not about coverage.** Each guard was shown to have at
least one reachable failure. None of this says a guard catches everything in its remit — several
declare substantial blind spots and those are unaffected.

**#36's outward half is unproven and is the one thing this piece could not close.** The decision
logic is exercised; the notification is not.

**The two hook checks were exercised through `git commit --allow-empty`.** That runs the real hook by
the real path. It does not prove the behaviour under every commit shape, only that the self-checks
are reached before any work happens — which is where they sit in the file.

**No timing claim is made.** Several of these guards drive real races; the wall clock was not the
question and was not recorded except where it fell out of the run.

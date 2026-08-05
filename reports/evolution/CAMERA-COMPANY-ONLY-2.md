# CAMERA-COMPANY-ONLY-2 — HALTED at the stop rule, with the HUD defect fixed

**Date:** 2026-08-05 · **Branch:** `exp/company-only` @ `993fb0ed` · nothing pushed, nothing merged.
**Bases confirmed:** `exp/company-only` was `0dd638c6`, `anchor-truth` is `7fef0c92`.

---

## READ THIS FIRST

**I have not shipped anything, and I need you to look at one more race before I do.**

Your live-truth line says `commit=77919708`. **That build cannot contain the company-only change** —
it is from **00:37**, and the change was not written until **09:55**, nine and a quarter hours later.
On `77919708` the toggle did not exist in any form, so a race run there was showing you **today's
behaviour**, not the new one.

Your *screenshot* showed `0dd638c6`, and **that build does contain it**. So one of your two artefacts
is from the right build and one is not, and I cannot tell from here which one your PASS came from.
Neither artefact records whether the toggle was actually **ON**.

Your spec told me to stop in exactly this case, so I stopped. **What I need is small:** one race on
the current branch with the toggle ON, and the build line in the corner read back to me. If it says
`993fb0ed` or later, and the picture is the one you approved, I ship immediately — the whole rest of
this block is written and waiting.

**One thing I did fix, because you would otherwise re-look at a broken screen:** the build line was
sitting on top of your LAP counter. That was our defect, introduced by me two days ago. It is fixed
properly — see §3 — and it cannot come back.

---

## BUILD-VS-SPEC CONFORMITY

| Spec | Status |
|---|---|
| §0 verify `77919708` carries the change | **DONE — IT DOES NOT.** §2 |
| §0 bases confirmed with `git rev-parse` | **DONE** — `0dd638c6` / `7fef0c92` |
| §1 HUD overlap fixed as layout, no magic offsets, test that fails on overlap | **BUILT** — §3 |
| §2 fold company-only into `anchor-truth`, remove the switch | **HALTED** by the §5 stop rule |
| §3 ceremony: re-mint, push, CI, merge with history, tag, REBASELINE/SIM | **HALTED** |
| §4 documentation: CAMERA_DIRECTOR, LESSONS, DEAD-ENDS, BACKLOG | **HALTED** — they document a decision that is not yet safely established |
| §6 report | **THIS** |

**Nothing in §2–§4 was started.** A half-fold with the switch partly removed would be worse than
none, and every doc change in §4 asserts as settled the thing this report says is not yet verified.

---

## 1. WHY I STOPPED — the stop rule, quoted

> `77919708` not on the branch or not carrying the change: stop, report, he looks again.

---

## 2. THE COMMIT VERIFICATION

| commit | what it is | time | carries `companyOnlyFraming`? |
|---|---|---|---|
| **`77919708`** | *your live-truth line* — the BUILD-TRUTH-1 badge commit | **05.08 00:37** | **NO — 0 occurrences** |
| `efe9d28e` | the commit that INTRODUCED the switch | **05.08 09:55** | yes |
| **`0dd638c6`** | *your screenshot* — the branch tip at the time | 05.08 ~10:0x | **yes** |

Method: `git show <commit>:client/src/modules/storage/defaults.js | grep -c companyOnlyFraming`,
plus `git log -S` to confirm `efe9d28e` is the only commit that introduced the key.

`77919708` **is** an ancestor of `exp/company-only` — so it is "on the branch" in the git sense, which
is why the first half of the stop rule passes and the second half fails. It is on the branch the way
last week is on the calendar: it is in the history, but the change had not happened yet.

**What this does and does not prove:**

- It **proves** the quoted live-truth line came from a build with no company-only behaviour at all.
- It **does not prove** your pass was invalid. Your screenshot is from `0dd638c6`, which has the
  change. The most likely story is that the live-truth line is simply an older artefact from a
  different session than the races you judged.
- **It cannot be resolved from here**, and this is the part that matters: even on `0dd638c6`, the
  live-truth line records the build and the camera path but **says nothing about whether the toggle
  was ON**. So there is no artefact anywhere that ties your PASS to the company-only behaviour. That
  is a gap in what we record, not a doubt about your judgement — see §6.3.

**Your approval of `anchor-truth` is unaffected either way** and I want to say so plainly: §4a, §4c
and stages 1a/1b are all present in `77919708` *and* `0dd638c6`, so whichever build you were on, you
were looking at them. **That debt is closed** — the corridor-from-the-anchor repair and the OVERVIEW
tracking change have now had an eye on them.

---

## 3. §1 — THE HUD DEFECT, FIXED

**Confirmed at source before touching it.** The build pill sat at y 58–78 (`HUD_ROW2_BOTTOM` 54 plus a
4 px gap); `drawLapInfo` drew at y 66 with an 18 px font, occupying 66–89. Both right-aligned. A 12 px
overlap — exactly your screenshot.

**It could not have been prevented**: two right-aligned rows, in two different files, each with its
own hardcoded `y`, neither aware of the other.

**Fixed as layout.** New `hudLayout.js` is the single owner of the right-hand column. It stacks rows
in order and sizes every height, font and gap as a **fraction of the frame**, per the standing rule.
A row cannot overlap another because it is *placed after it*, not at a number somebody chose. No
magic offsets exist to drift.

`drawLapInfo` became `lapInfoText` — a pure label producer — and the drawing moved into the stack. It
keeps its own look (bold sans, blue glow) because it is game information, not diagnostics. On open
tracks there are no laps, so the row is absent and the stack closes up.

**Tests +12, and they are the regression**: no two rows overlap at six canvas sizes including a squat
1280×400, across **all sixteen** visibility combinations, plus the exact pair from your screenshot,
plus every row staying inside the frame and scaling with it. **Verified by sabotage** — removing the
stack advance fails ten of them.

---

## 4. FINGERPRINTS

| | before | after | |
|---|---|---|---|
| render | `b1c373da44de92f5` | **`be429d35571f0fbd`** | moved — the HUD moved, intended |
| camera | `1db71e7fffc1c9f6` | `1db71e7fffc1c9f6` | **unmoved**, as it must be for a render-only change |
| world | `dc4647be0f55ebdb` | — | **not re-run, and here is why**: nothing in this commit is under `client/src/modules/`, so the mint tripwire does not fire. Stated rather than skipped silently. |

The company-only probe value **`7a33faf2ec131437`** from CAMERA-COMPANY-ONLY-1 still stands as the
cross-check for §2's fold, whenever §2 becomes safe to do.

Suite: **3574 passed / 3574**, 176 files, exit 0.

---

## 5. YOUR LIVE-TRUTH LINE, VERBATIM

```
[RA CAMERA LIVE TRUTH] commit=77919708 resolvedGrammar=glide leaderForwardFrac=0.66
hadStoredConfig=true source{cameraTransitionGrammar}=stored source{leaderForwardFrac}=stored
cameraSeed=1565114703
```

Reading it: your stored config was found (`hadStoredConfig=true`) and two of your settings came from
it rather than from defaults, which is the loader behaving correctly. `leaderForwardFrac=0.66` and
`resolvedGrammar=glide` are the shipped values. **The one thing it does not say is which guarantee
ran** — §6.3.

---

## 6. PROPOSALS

### 6.1 On your proposal 1 — his eye beat the measurements, and the cheap fix is one line

This is the strongest pattern of the week and it deserves a blunt statement: **his eye found the root
cause twice where no measurement in this project would have.** The restlessness of a smaller window is
not in any harness, and it is the constraint that decided the whole design.

The cheap way to get his eye onto a change is **not** another harness — it is the one-line
`RaceScreen` defect I found yesterday. It reads the camera config **once at mount**
(`useState(() => loadCameraConfig())`, no setter), so a Dev Screen change never reaches a running
race. **Every A/B he has ever done has been two races when it could have been one race and a toggle.**
The director already supports live-apply. That is the highest-leverage thing on the list and it is
smaller than anything else on it.

### 6.2 On your proposal 2 — pushing WIP does not fix it; a smaller thing does

Being honest about my three failed predictions: they failed because I reasoned from source rather
than from measurement, not because the tree was stale. M1 is the clear case — I predicted the
corridor "never binds on narrow tracks" from *reading the code*, and it binds on 56% of frames on
garden-path. **Pushing the branch would not have changed that by one frame**, because I had the tree;
I just did not run it.

Where staleness *does* bite is your side: you cannot check my claims, which is why this block's
verification had to be done by me on the very evidence that questions it. **So: push WIP branches for
YOUR benefit, not for my correctness.** And for mine, the smaller fix is a rule I can hold myself to —
**a prediction in a spec gets measured before it gets written into a report**, which is what §2 of
CAMERA-COMPANY-ONLY-1 did and what my M1 did not.

### 6.3 On your proposal 3 — the line should name the behaviour, and today is the argument for it

You proposed this as moot once the toggle goes away. **This block is the counter-example**: the whole
halt exists because no artefact ties your pass to the behaviour you were judging. The line records
the build and the camera path and stops there.

**Proposal:** the live-truth line should name the FRAMING REGIME in one token — today
`guarantee=corridor+company`, after the fold `guarantee=company`. It is one string, it costs nothing,
and it converts "which build was he on" into "which camera was he judging". Had it existed yesterday
this report would have been a ship. **Not built** — it belongs with the fold, so that the token names
the regime that actually shipped.

### 6.4 (mine) The thing to fix is that a pass has no artefact

Generalising 6.3 rather than leaving it as a line-format tweak: **an owner's PASS is the single most
expensive input this project consumes, and it is currently recorded nowhere.** It arrives as prose in
a spec, and the build it refers to is reconstructed afterwards from screenshots and timestamps — which
is precisely what failed here. The cheapest honest fix is that an eye-test produces an **artefact he
can paste**: the live-truth line already exists for this, it just needs the regime token and a habit
of quoting it *with* the verdict. **A verdict without a build identity is not evidence, and we have
been treating it as if it were.**

### 6.5 (mine) The corridor guarantee's fallback must be verified, not assumed, before §2

Your §2 says `corridorGuarantee` remains the PAIR states' fallback and to verify rather than assume.
**I did not get to that verification** because the halt came first, so I am flagging it as owed rather
than done: when §2 resumes, the check is that a pair state with exactly one contender present still
reaches the corridor path, and it needs a test rather than a reading — the code path is one
`Number.isFinite(ceiling)` away from being silently dead.

---

## 7. WHAT HAPPENS NEXT

1. **One race on `exp/company-only` at `993fb0ed` or later, toggle ON.** Read back the build line.
2. If the picture is the one you approved, everything in §2–§4 is written and I ship it in one pass:
   fold, cross-check against `7a33faf2ec131437`, ceremony, merge with history, docs, LESSONS,
   DEAD-ENDS, BACKLOG.
3. If it is **not** the picture you approved, then the pass was given on `77919708` — today's
   behaviour — and the decision is genuinely open again. That is the outcome this stop rule exists to
   catch, and finding out now costs one race.

**Status:** nothing pushed, nothing merged, `master` at `c299fdf7` and `anchor-truth` at `7fef0c92`
untouched. The switch is still present and still defaults OFF.

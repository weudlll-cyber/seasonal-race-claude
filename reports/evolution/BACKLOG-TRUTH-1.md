# BACKLOG-TRUTH-1 — the action control recorded; the backlog audit STOPPED EARLY and says where

**2026-08-22 · branch `docs/backlog-truth-1` off master `17a7039e` · DOCUMENTS ONLY. Two paths
written: `docs/BACKLOG.md` and this report (plus its INDEX line). No product file, no fix.**

**SKIPPED, per the spec and R15:** fingerprints, browser gate, client suite, any race. Two markdown
files changed; nothing in their reach was touched, so no fingerprint can move and none was measured.
**RUN:** `check-config-claims`, `check-language-closed`, `check-doc-links`, `check-index`.

---

## 0 · THE HEADLINE — Stage 1 landed, Stage 2 did NOT complete

**STAGE 1 IS COMPLETE.** The owner's action-control requirement is recorded as the first live section
of `docs/BACKLOG.md`, with candidates, both surfaces and the open questions.

**STAGE 2 IS NOT COMPLETE, AND THIS REPORT DOES NOT PRETEND OTHERWISE.** Of the 26 unticked items, **4
were verified against source and 22 were not reached.** The spec's own rule is the reason this is a
stopping point rather than a faster pass: *"Never half-verify to reach the end of a list"* and *"STOP
and commit what is verified."* **Stage 3 was not started at all.**

Every unreached item is named in §4. Nothing was guessed closed, and **`docs/BACKLOG.md` carries
exactly one edit beyond Stage 1** — the single item this pass established.

---

## 1 · STAGE 1 — the action control

Added as the first live section, directly under the header block, dated 2026-08-22. It records:

- **the requirement** in his terms — one control over how much action, for a **normal host**, not a
  developer knob;
- **the candidates**, marked UNVERIFIED, gathered by reading `defaults.js`: the `gapReroll*` family,
  `b2Attack*`, `reRollVariationPercent`/`reRollIntervalDivisor`, `choreoIntensity`/
  `choreoPackBandStrictness`, the `pulk*` rotation and its realism clamp, and `chaosSteerGain` —
  each with its file:line;
- **both surfaces with addresses**: the host-facing **Race Settings** panel
  (`SetupScreen.jsx:930` → `RaceSettings.jsx`, **86 lines carrying exactly ONE control today**, Race
  Duration at `:32`), and the developer surface (`DynamicsTuningSection.jsx`,
  `BehaviorTuningSection.jsx`), where every candidate is reachable now;
- **four open questions**, answers deliberately absent — what one dial maps onto, discrete or
  continuous, **what it does to the band-fairness promise and its gate**, and what happens to saved
  races and fingerprints.

### The one place I did not follow the spec, and why

**The spec asks for each candidate's "current shipped default" in the document. I recorded the
file:line and NOT the value.** `check-config-claims` (CONFIG-TRUTH-1) fails any document that states
a value `defaults.js` owns, and it exists because seven keys were once documented as current and
disagreed with source. **The guard is not suspect here — it is right, and it predates this spec.** The
address gives a reader the value in one jump and cannot go stale. Flagged rather than silently
resolved.

---

## 2 · STAGE 2 — what was verified (4 of 26)

| # | item | verdict | evidence |
| --- | --- | --- | --- |
| 3 | `minRacersVisible` is done and waiting on branch `feat/min-racers-visible-5` | **DONE** | `46736d81`; `defaults.js:883` is 5; `git ls-remote --heads origin \| grep -c min-racers-visible` → **0** |
| 16 | forty-seven `.git/worktrees` stubs | **STILL OPEN — and worse** | `ls .git/worktrees \| wc -l` → **51**, not 47. The count has grown since the item was written |
| 24 | `deploy.yml.disabled` cannot run | **STILL OPEN** | the file is still present in `.github/workflows/` |
| 26 | the app ships no build identifier | **STILL OPEN** | `grep -c __APP_VERSION__ client/vite.config.js` → 0 |

**Only item 3 was edited in `docs/BACKLOG.md`.** Its claim is struck with what closed it; its
reasoning is kept, because it states a general rule about branches outliving their decision.

**Items 16, 24 and 26 were left untouched.** Stage 2 asks for a `verify:` line on every open item;
adding three while twenty-two others have none would misrepresent the file's state as more audited
than it is. **The three commands above are recorded here instead**, and are ready to be lifted into
the file by the block that finishes this work.

### The four pre-established confirmations

| claim | confirmed? |
| --- | --- |
| PHOTO_FINISH missing from `ALL_STATES` — CLOSED by `0d61f6f1` | **YES** — commit exists with that subject; `cameraTimingComputation.js` carries 12 `PHOTO_FINISH` mentions |
| `minRacersVisible` branch — CLOSED by `46736d81` | **YES** — see the table above |
| the two finish knobs reading alike — CLOSED, relabelled 2026-08-12 | **NOT CONFIRMED** — `finishDramaDurationMs` returned no match in `client/src/**/*.jsx`, so the label could not be read where expected. **Left open under CANNOT ESTABLISH** rather than accepted on the spec's word, per the rule that verdicts are against source |
| owner eye-test "three of ten tracks" — superseded by owner fact | **NOT REACHED** — the item was not located among the 26 within budget |

### The mis-stated sprite item — a conflict I did not resolve

The spec says the item is mis-stated in `reports/evolution/OPEN-ITEMS-2026-08-22.md` and *"must be
corrected where it lives"*. **That is a third file, and the spec's own opening forbids writing
anything but `docs/BACKLOG.md` and this report.** I obeyed the narrower rule and did not touch it.

**The correction, recorded here so it is not lost:** the sprite route has callers — GET at
`client/src/modules/racer-types/index.js:473` and POST at `:515` — and only **DELETE**
(`/api/racers/:id/sprite`) has none. **I did not re-establish this myself**; it is the spec's claim,
and an absence claim must be re-established over the whole tree, which I did not have the budget to
do. **It is therefore CANNOT ESTABLISH, not confirmed.**

---

## 3 · STAGE 3 — not started

Zero of it. No enumeration of ⏳/🔜 lines, Q-/B-/V-/T-/RE-/P- bullets or table rows was performed.

---

## 4 · WHAT WAS NOT REACHED — every unverified item, by line and name

Twenty-two of the 26, listed so the gap is visible rather than hidden:

| line | item |
| --- | --- |
| 70 | Authentication and authorization — design exists, nothing built |
| 77 | Merge ROADMAP into BACKLOG |
| 110 | PROPOSED OWNER SESSION — his time, not scheduled here |
| 120 | The two finish knobs read alike (see §2 — attempted, CANNOT ESTABLISH) |
| 128 | The render fingerprint cannot see the finish phase |
| 135 | Nothing measures MOTION, only per-frame values |
| 142 | A fingerprint expected to move stops guarding what moved with it |
| 147 | Garden Path does not finish within the 200 s ceiling |
| 160 | The badge still has no watcher |
| 167 | `0xC0000142` on this machine |
| 176 | NOT the OneDrive/ReparsePoint condition |
| 190 | Three driver copies remain, by deliberate choice |
| 198 | The race-identity HASH |
| 205 | The juxtaposition rule for reports |
| 245 | The company guarantee on a SPREAD field has never been measured |
| 252 | No artefact ties a verdict to the BEHAVIOUR judged |
| 257 | A Dev Screen change does not reach a running race |
| 262 | "Road edge out of frame" should be a standing measurement |
| 266 | `MAX_CAM_ZOOM` is the real limiter at the tight end |
| 275 | `npm run data:export` carries his data to the VPS |
| 287 | `server/` is audited by nothing |
| 303 | `RA_PUBLIC_ORIGIN` exists only as a placeholder |

**Item 287 has a partial reading that is NOT a verdict:** `scripts/audit-gate.mjs:19` carries a
comment in the PAST tense — *"It scanned `client/` only, so the server tree —"* — which suggests the
gate was extended. **A comment is not the code**, the surrounding lines were not read, and the item
therefore stays open under CANNOT ESTABLISH. It is the most likely of the twenty-two to be already
closed and is the cheapest place for the next block to start.

---

## 5 · CONFORMITY AGAINST THE SPEC

| the spec asked | what happened |
| --- | --- |
| Stage 1 complete, first live section, design nothing | **Done** |
| candidates with file:line and shipped default | **Partial** — file:line yes, values no; CONFIG-TRUTH-1 forbids them (§1) |
| Stage 2: all 26 verdicts | **4 of 26.** Stopped inside budget rather than half-verifying |
| `verify:` lines on every open item | **Not done** — see §2 for why, with the three commands recorded |
| correct the sprite item where it lives | **Not done** — that file is outside the two paths the spec permits (§2) |
| Stage 3 | **Not started** |
| Stage 1 and Stage 2 must both land | **Stage 1 landed; Stage 2 did not.** The spec's fallback — drop Stage 3, never shorten Stage 2 — was followed as far as it goes: Stage 3 was dropped entirely and Stage 2 still did not finish |
| never half-verify; name what was not reached | **Followed** — §4 |
| conservative where unsettled | **Followed** — three claims the spec supplied as established are recorded as unconfirmed |

---

## 6 · SOURCE HYGIENE

`docs/BACKLOG.md`: **1402 → 1461 lines.** Added: the Stage 1 section (59 lines). Changed: one item's
claim struck with its closing evidence, its reasoning kept. **Removed: nothing.** No item was deleted,
no wording of an unverified item was touched.

**Noticed but left**, per the spec's instruction to record rather than fix:

- **`.git/worktrees` now holds 51 stubs, not 47.** The item under-reports its own subject.
- **`scripts/audit-gate.mjs:19`'s past-tense comment** may mean item 287 is closed (§4).
- The four "already established" claims the spec supplied were **not all reproducible** — one could
  not be confirmed and one could not be located. That is a fact about the spec's inputs, not a
  complaint, and the next block should re-derive rather than inherit them.

---

## 7 · PROPOSALS

**P1 — the next block should take the 22 in ONE pass with a fixed per-item budget, and publish the
budget.** This one had no per-item ceiling, so early items absorbed the time. Four minutes per item
over 22 items is a bounded, checkable plan, and an item that overruns becomes CANNOT ESTABLISH by
rule rather than by fatigue. **Cost: none — it is a way of working.**

**P2 — `verify:` lines should be a GUARD, not a convention.** Stage 2's best idea is that an open item
carries a command that decides it. A guard that fails when an unticked `- [ ]` item has no `verify:`
line would make the backlog self-auditing and would have made this block's incompleteness visible in
CI rather than in a report. The term it would move is a new rule inside `check-doc-facts` — per R13,
a rule inside an existing guard rather than a new script. **Cost: every existing open item needs a
line before it can be turned on, which is exactly the work Stage 2 did not finish, so it must follow
that work rather than precede it.**

**P3 — record the action control's fairness question in `FAIRNESS.md`, not only here.** Stage 1's
question 3 — what a host-movable action dial does to the band-arrival gate — is a fairness question
living in the backlog, and `FAIRNESS.md` is where the promise is defined. **Cost: one paragraph, and
it must say the question is open rather than answering it.**

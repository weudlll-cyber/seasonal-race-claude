# BACKLOG-HONEST-1 — the census

**Date:** 2026-08-22/23 · **Branch:** `docs/backlog-honest` off master `465d49c5`
**Piece 5 of NIGHT-2026-08-22.** Documents only: no fingerprints, no browser gate, no client suite,
no race.

**THIS COMMIT IS STEP B ONLY — the census, with no verdicts.** Verdicts (STEP C), the edits
(STEP D) and the buckets (STEP E) land in later commits on this branch, so that the enumeration can
be checked against the file independently of any judgement made about it.

---

## THE OWNER'S CORRECTION, IN FORCE FROM THE START OF THIS PIECE

The brief's STEP C carried a hard four-minute-per-item budget under which an overrun became
`CANNOT ESTABLISH BY RULE`. **That instruction was withdrawn by the owner before this piece began.**

- **No item in this run was ever decided by a clock.** PIECE 5 had not started when the correction
  arrived, so there is nothing to re-decide and no follow-up commit is owed for it.
- **An item is finished when the EVIDENCE decides it.** `CANNOT ESTABLISH` means the evidence does
  not settle the question — never that time ran out — and every such verdict names what stopped it
  and the one command or measurement that would decide it.
- **An item that cannot be settled without starting a measurement, a race or a build is not a
  verdict item.** It is stopped there, recorded with its named next step, and carried to STEP E
  bucket (ii) or (iii). That work is not started inside PIECE 5.

---

## STEP A — THE EVIDENCE INDEX, gathered once

| source | size | what it answers |
| --- | --- | --- |
| `git log --oneline` over the whole history | **1857** commit subjects | did something ship that closes this? |
| tags at origin, cross-read with `docs/TAGS.md` | **112** tags | did a *ship* close it, and what did that ship claim? |
| titles in `reports/evolution/INDEX.md` | **244** report lines | was it investigated, and what was the verdict? |
| section headings of `docs/DEAD-ENDS.md` | **20** headings | was it tried and retired? |
| `reports/evolution/OWNER-DECISIONS-2026-08-19.md` | 148 lines | did he already decide it? |

**A report, tag or commit is a LEAD, never a verdict.** Each one's sha is taken and confirmed at
source in one command; a claim that does not confirm is recorded as a claim that did not confirm.

---

## STEP B — THE CENSUS

**105 claims present themselves as open.** The brief expected roughly 90–110; this is inside that
range and is reported as measured rather than adjusted toward the middle of it.

Enumerated mechanically over the whole of `docs/BACKLOG.md` (1509 lines) by the five rules the brief
states. A line matching more than one rule is counted once and carries both labels.

| rule | claims |
| --- | ---: |
| `id-bullet` — a `Q-`/`B-`/`V-`/`T-`/`RE-`/`P-` bullet with no ✅ | 46 |
| `waiting-mark` — a line carrying ⏳ or 🔜 and no ✅ | 28 |
| `unticked` — an unticked `- [ ]` | 26 |
| `posed-question` — an open question posed in prose | 6 |
| `table-row` — a table row whose status cell is not ✅ | 2 |
| **total distinct lines** | **105** |

**The 26 unticked matches the brief's own count of the unticked items**, which is the one number it
states independently — a useful agreement, since it was reached by a different route.

### THE ENUMERATION HAD TO BE REPAIRED THREE TIMES, and the third failure is the instructive one

Recorded because a census is only worth what its rules are worth, and one of these versions printed
a plausible total while being silently wrong.

| version of rule 5 | result |
| --- | --- |
| v1 — a `?` at END of line | **0 hits.** Every question here is mid-line. |
| v2 — a `?` inside the item's opening **bold** clause | 3 hits; missed action-control **Q4**, whose `?` falls outside the bold |
| v3 — split the line into sentences, look at the first | **caught NONE of the four action-control questions.** The sentence splitter fired on the LIST MARKER — `1.` ends in a period, so the "first sentence" was the string `1.`. The total still looked plausible (**101**) because two unrelated lines happened to match. |
| v4 — strip the list marker FIRST, then take the opening clause | all four found; **105** total |

**v3 is the failure worth naming**: a broken rule that returns a believable number is
indistinguishable from a working one. So rule 5 now carries a **self-asserting input** (L187): the
four action-control questions are known to sit at lines 52, 55, 57 and 61, and the census **exits
non-zero** if it stops finding them rather than printing a total.

### DUPLICATE HUNT

**Hunt A — a subject appearing twice among the OPEN claims: 2 pairs.**

| | |
| --- | --- |
| **L863** `🔜 D7d — 100-racer performance` | **L1152** `🔜 D7d — 100-racer performance` — the same item, twice, in two sections |
| **L938** `B-2 — TrackSelector: custom track behavior when geometry is missing` | **L1121** `V-2 — TrackSelector B-2 custom track behavior` — the work and its verification listed as two open items |

**Hunt B — an open claim whose subject also appears with a ✅ somewhere else: 0 pairs**, across
105 open claims × 174 lines carrying the done mark.

**That zero is evidence, because the hunt was proved able to match.** It is fed a synthetic pair —
the same D7d text, once open and once ticked — and asserts that it detects it; the census exits
non-zero if it does not. **So "done in one place and open in another" — the failure this piece
exists to end — does not currently occur in this document.** That is a better result than expected
and is reported as found.

*(Both hunts are lexical: a shared-keyword overlap of ≥42% with at least three shared terms after
stop-words. They can only find duplicates that share vocabulary. A subject written twice in genuinely
different words would be missed, and STEP C's per-item reading is the second net.)*

### THE 105, IN FILE ORDER

| line | how it presents | section | short name |
| ---: | --- | --- | --- |
| 52 | `posed-question` | HOW MUCH ACTION — a host-facing control (2026-08-22, | What does one dial map onto? The candidates are not independent: gapReroll* and the pulk |
| 55 | `posed-question` | 〃 | Is the range discrete or continuous? Race Duration beside it is discrete (four buttons). Whether |
| 57 | `posed-question` | 〃 | What does the dial do to the band-fairness promise and its gate? docs/FAIRNESS.md binds the |
| 61 | `posed-question` | 〃 | What happens to a saved race, a replay, and the fingerprints when the dial moves? Not |
| 70 | `unticked` | `RaceScreen` is not testable (2026-08-22, from CEREM | client/src/screens/RaceScreen/index.jsx cannot be mounted in a test, so the behaviour that |
| 118 | `unticked` | Documentation (2026-08-07, from DOC-ORDER-1) | Authentication and authorization — DESIGN EXISTS, nothing is built. The full v3.2 design |
| 125 | `unticked` | 〃 | Merge ROADMAP into BACKLOG — DECIDED, and deliberately NOT done here. The two documents |
| 161 | `unticked` | Owner eye-test coverage (2026-08-05, from CAMERA-DOC | PROPOSED OWNER SESSION — his time, not scheduled here. Writing §7.3 down made the gap |
| 171 | `unticked` | Dev Screen labels (2026-08-05, from FINISH-COMPANY-1 | The two finish knobs read alike and govern different moments. finishDramaDurationMs is |
| 179 | `unticked` | Instrument coverage residuals (2026-08-05, from FINI | THE RENDER FINGERPRINT CANNOT SEE THE FINISH PHASE — it did not confirm "no render change", |
| 186 | `unticked` | 〃 | NOTHING MEASURES MOTION, only per-frame VALUES. A 2708 px one-frame step was invisible to |
| 193 | `unticked` | 〃 | A FINGERPRINT EXPECTED TO MOVE STOPS GUARDING WHAT MOVED WITH IT. FINISH-MOTION-1 caught a |
| 198 | `unticked` | 〃 | Garden Path does not finish within the shared driver's 200 s ceiling at n=40 / 60 s |
| 211 | `unticked` | Build-identity residuals (2026-08-05, from BUILD-UNK | THE BADGE STILL HAS NO WATCHER — both of its failures were found by the owner's eye. |
| 218 | `unticked` | 〃 | 0xC0000142 on this machine — watch for a second occurrence before treating it as a |
| 227 | `unticked` | 〃 | NOT the OneDrive/ReparsePoint condition — recorded so it is not blamed by default. |
| 241 | `unticked` | Measurement and guard residuals (2026-08-05) | THREE DRIVER COPIES REMAIN, BY DELIBERATE CHOICE — meet the argument before "finishing the |
| 249 | `unticked` | 〃 | The race-identity HASH: sha(identity + canonical(cameraConfig)). Printing the identity |
| 256 | `unticked` | 〃 | The juxtaposition rule for reports. Not "every number carries its identity", which is |
| 279 | `unticked` | Worktree stubs — a helper that cleans up after itsel | FORTY-SEVEN .git/worktrees stubs exist and git worktree prune cannot remove them |
| 296 | `unticked` | Camera residuals after CAMERA-COMPANY-ONLY-3 (2026-0 | The company guarantee on a SPREAD field has never been measured. The owner approved the |
| 303 | `unticked` | 〃 | No artefact ties a verdict to the BEHAVIOUR judged. The [RA CAMERA LIVE TRUTH] line names |
| 308 | `unticked` | 〃 | A Dev Screen change does not reach a running race. RaceScreen reads the camera config |
| 313 | `unticked` | 〃 | Road edge out of frame should be a standing measurement. The control number is the |
| 317 | `unticked` | 〃 | MAX_CAM_ZOOM (24.0) is the real limiter at the tight end of the control. At 0.25 |
| 326 | `unticked` | Before the VPS migration | npm run data:export is what carries his data to the VPS, and the same comparison tells the |
| 338 | `unticked` | 〃 | server/ is audited by nothing. scripts/audit-gate.mjs hard-codes client/, and no CI |
| 345 | `unticked` | 〃 | deploy.yml.disabled cannot run — four independent blockers, and it is now DE-REGISTERED |
| 354 | `unticked` | 〃 | RA_PUBLIC_ORIGIN exists only as the placeholder racearena.example.com. It is the |
| 357 | `unticked` | 〃 | The app ships no build identifier. No __APP_VERSION__, no BUILD_ID, no build-time |
| 391 | `waiting-mark` | Evolution Act 1 — assignment-follows-field (CLOSED 2 | 🔜 Successor candidate (future act, not scheduled): finale-window / front-band contest that ADDS a |
| 464 | `waiting-mark` | Measurement infrastructure — next up (from the indep | 🔜 Paired per-seed delta evaluation in the gate driver. exp-gate-retune.mjs already runs |
| 516 | `waiting-mark` | Race-Action Arc (feat/race-action) — June 2026 | 🔜 / ⏳ Open |
| 520 | `waiting-mark` | 〃 | B2 — per-hero intensity budget 🔜 _(added 2026-07-14 reconciliation)_ — clampIntensityToBudget (heroC |
| 522 | `waiting-mark` | 〃 | Camera timing levers — comeback shot appears late (tune by eye, no code) 🔜 _(added 2026-07-15, from  |
| 523 | `waiting-mark` | 〃 | B4c — faller shot (now unblocked by B4) 🔜 _(added 2026-07-15)_ — a faller is cast front-post-chaos w |
| 525 | `waiting-mark` | 〃 | OUTCOME climb-capacity investigation (2026-07-17/18) — deep-band band-reach vs choreoOutcomeStart 🔜  |
| 561 | `waiting-mark+table-row` | Phase L — Local Backend | \| ⏳ L.8-Hybrid \| planned \| Hybrid concept: default tracks should work "offline-first" (without backe |
| 562 | `waiting-mark+table-row` | 〃 | \| ⏳ L.9-Status \| planned \| Server connection status visible in UI: display whether backend is reacha |
| 616 | `waiting-mark` | Hot — next PR | ### 2 — Player Group Selection 🔜 PRIORITY 1 after Camera Phase |
| 630 | `posed-question` | 〃 | Setup screen: selection filter "Which group races?" before race start |
| 638 | `waiting-mark` | 〃 | ### Race Duration Recalibration for Race End ⏳ Low Priority |
| 699 | `waiting-mark` | 〃 | TLH-3 — Code Fallback + Status Banner + Export (Sub-PR 3) ⏳ deferred until after Camera Phase |
| 733 | `waiting-mark` | Ready — spec exists, concept decided | Audit-gate policy for DEV dependencies. ⏳ OPEN. Today the gate is hard-blocking regardless of |
| 738 | `waiting-mark` | 〃 | body-parser LOW runtime advisory (GHSA-v422-hmwv-36x6) in server/. ⏳ OPEN. Below the |
| 751 | `waiting-mark` | 〃 | Seed for the normal "Start Race" path. ⏳ OPEN — owner decision. It still hardcodes |
| 755 | `waiting-mark` | 〃 | Seed persistence beyond the session. ⏳ OPEN — owner decision. Currently sessionStorage, so a |
| 805 | `id-bullet` | Completed Items (Phase Completions) | B-6 (speedMultiplier bug) — subsumed by D9. Was planned as a separate fix, |
| 863 | `waiting-mark` | Planned — needs spec | 🔜 D7d — 100-racer performance |
| 869 | `waiting-mark` | 〃 | ⏳ PARTIAL (2026-07-14 audit): basic racer editing already shipped — RacerManager.jsx |
| 875 | `id-bullet` | 〃 | B-UX1 — Name tag readability (iteration 1, to be implemented in PR-E of the camera phase) |
| 882 | `id-bullet` | 〃 | B-UX1-Iter2 — Name tags state-dependent strategy (iteration 2, after iteration 1) |
| 889 | `id-bullet` | 〃 | B-UX-Pause — Pause + resume race |
| 894 | `id-bullet` | 〃 | B-UX-ManualFocus — MANUAL_FOCUS: game master click on racer locks camera |
| 900 | `id-bullet` | 〃 | B-UX2 — Dev screen cleanup + help screen |
| 911 | `id-bullet` | 〃 | B-UX3 — Detailed variable documentation |
| 923 | `id-bullet` | 〃 | B-UX-MinMax — Dev panel min/max pairs UX: replace silent rejection with visual warning, consistent f |
| 926 | `id-bullet` | 〃 | B-UX4 — Sprite size system overhaul |
| 938 | `id-bullet` | 〃 | B-2 — TrackSelector: custom track behavior when geometry is missing |
| 939 | `id-bullet` | 〃 | B-4 — Apply branding profiles to race/result screen (UI exists, wiring missing) |
| 940 | `id-bullet` | 〃 | B-5 — System backup/restore/reset: end-to-end verified (UI-only so far) |
| 949 | `id-bullet` | 〃 | Q-19 — TrackEditor.effects.test.jsx flaky — intermittent in full-suite parallel run. Root cause: glo |
| 953 | `id-bullet` | 〃 | Q-8 — Watch list: TrackManager.jsx (535 LOC) and BrandingProfiles.jsx (330 LOC). |
| 955 | `id-bullet` | 〃 | Q-9 — Watch: racer-types/index.js growing to 286 LOC — candidate for splitting |
| 957 | `id-bullet` | 〃 | Q-10 — Watch: RacerEditModal.jsx at 302 LOC — already 75% of the 400-LOC threshold. |
| 959 | `id-bullet` | 〃 | Q-26 — Default tracks without backgrounds (fresh install) |
| 996 | `id-bullet` | 〃 | Q-27 — Background PNG compression _(Audit 2026-05-04, Severity: HIGH — deferred)_ |
| 1001 | `id-bullet` | 〃 | Q-11 — reader.onerror missing in handleBgUpload (TrackEditor.jsx) |
| 1004 | `id-bullet` | 〃 | Q-20 — Track editor load mode: background upload is now optional (F1-revised fix). But when a load-m |
| 1005 | `id-bullet` | 〃 | Q-12 — localStorage quota with large data-URL images |
| 1008 | `id-bullet` | 〃 | Q-16 — CORS wildcard on all backend endpoints |
| 1015 | `id-bullet` | 〃 | Q-17 — Missing reader.onerror handlers in SystemSettings.jsx and TrackEditor.jsx |
| 1022 | `id-bullet` | 〃 | Q-18 — RaceScreen integration test infrastructure |
| 1033 | `id-bullet` | 〃 | Q-20 — Server test backup cleanup not crash-resistant (TLH-1) |
| 1041 | `id-bullet` | 〃 | Q-21 — .json.tmp orphans on OneDrive EPERM fallback (TLH-1) |
| 1050 | `id-bullet` | 〃 | Q-22 — TrackEditor frontend draft snapshot |
| 1058 | `id-bullet` | 〃 | Q-24 — isDefault immutability via PUT explicitly tested |
| 1062 | `id-bullet` | 〃 | Q-23 — Two-step save: no differentiated error message on background upload failure |
| 1078 | `id-bullet` | 〃 | Q-13 — Sprite frame animation stutters with large sprites |
| 1091 | `id-bullet` | 〃 | Q-28 — Shared HTTP helper for API services _(Post-Phase-4 audit 2026-05-06, Severity: MEDIUM)_ |
| 1097 | `id-bullet` | 〃 | Q-29 — Shared RangeSliderSection component _(Post-Phase-4 audit 2026-05-06, Severity: LOW)_ |
| 1103 | `id-bullet` | 〃 | Q-30 — React 18 → 19 + react-router-dom 6 → 7 migration _(Post-Phase-4 audit 2026-05-06, Severity: M |
| 1120 | `id-bullet` | 〃 | V-1 — PlayerSetup B-1 loading-saved-lists bug |
| 1121 | `id-bullet` | 〃 | V-2 — TrackSelector B-2 custom track behavior |
| 1122 | `id-bullet+posed-question` | 〃 | V-3 — Result screen winner count B-3 (configurable?) |
| 1123 | `id-bullet` | 〃 | V-4 — Branding profiles B-4 (per old ROADMAP done, reality check says open) |
| 1124 | `id-bullet` | 〃 | V-5 — System backup/restore/reset B-5 (data loss risk) |
| 1125 | `id-bullet` | 〃 | V-6 — Multiple dev panel sections — visual verification |
| 1126 | `id-bullet` | 〃 | V-7 — Physics + collision behavior — smoke test |
| 1127 | `id-bullet` | 〃 | V-8 — localStorage persistence edge cases — stress test |
| 1128 | `id-bullet` | 〃 | V-9 — Fullscreen toggle — functionally unverified |
| 1135 | `id-bullet` | 〃 | T-1 — RaceDefaults fields |
| 1136 | `id-bullet` | 〃 | T-2 — TrackManager fields |
| 1137 | `id-bullet` | 〃 | T-3 — BrandingProfiles fields |
| 1138 | `id-bullet` | 〃 | T-4 — SystemSettings fields |
| 1152 | `waiting-mark` | Order of Next Steps | 🔜 D7d — 100-racer performance |
| 1165 | `waiting-mark` | 〃 | 🔜 Camera phase + RaceScreen refactor — revise CameraDirector, split RaceScreen (Q-7). Concept docume |
| 1278 | `waiting-mark` | Physics — Open Issues | ⏳ Dead-zone guard metric physSlot / trackWidth > avoidanceDistance — not yet added to sim. |
| 1479 | `waiting-mark` | 2026-07-31 — added (DOC-SYNC-2: long-term items, own | ⏳ Bundle code-split. The production client bundle exceeds the 500 kB warning threshold (the vite bui |
| 1483 | `waiting-mark` | 〃 | ⏳ Coarser fairness bands. A product-level simplification the owner has raised: reduce the number of |
| 1487 | `waiting-mark` | 〃 | ⏳ The story layer (owner-cast narrative toolkit). The banked owner-cast toolkit for authored race |
| 1493 | `waiting-mark` | 〃 | ⏳ CAMERA-GLIDE-PATH-1 — view-change detour. A camera view change travels fast but takes a visible |
| 1498 | `waiting-mark` | 〃 | ⏳ Camera block reset. Parked camera item (block reset) from the camera saga handoff — needs the owne |
| 1500 | `waiting-mark` | 〃 | ⏳ Camera-weights design question — relative vs absolute weighting (deferred). Whether the camera's |
| 1503 | `waiting-mark` | 〃 | ⏳ Start-row gradient project — SHELVED WITH DOCUMENTATION, opens only on the owner's explicit word.  |


---

## STEP C — THE VERDICTS

**No clock was applied to any item.** Every verdict below was decided by evidence, per the owner's
correction. Where the evidence does not settle a question, the verdict is `CANNOT ESTABLISH` and it
names what stopped it and the one command or measurement that would decide it — never that time ran
out. **Where settling an item would have required starting a measurement, a race or a build, it was
stopped there and carried to STEP E instead**, as the correction directs.

| verdict | count |
| --- | ---: |
| **ALREADY DONE** — closed at source, with the sha that closed it | **11** |
| **SUPERSEDED** — the subject moved on under another name | **3** |
| **ALREADY ANSWERED** — a decision or a fact about the owner retires it | **2** |
| **NEVER TRUE (as written today)** | **1** |
| **DUPLICATE** — one instance kept, the other pointed at it | **2** |
| **STILL OPEN** | **83** |
| **CANNOT ESTABLISH** | **3** |
| **total** | **105** |

**Eleven items closed, plus five more retired by supersession, answer or duplication — sixteen of
105.** Four of the eleven were closed by work whose report already said so; the document had simply
never been told.

---

### DUPLICATES FIRST, as ordered

**DUP-1 · `D7d — 100-racer performance` at L863 and L1152.** Verbatim the same item in two sections.
**L863 is the live one** — it carries the three sub-items (spatial grid, pack-overview camera, LOD).
L1152 is a status echo inside the numbered "Order of Next Steps" list, where every other line is ✅.
**KEEP L863; L1152 points at it.**

**And the subject itself is STILL OPEN**, established rather than assumed: `git grep -lni "spatial
grid\|spatialGrid\|uniform grid"` over `client/src/**` and `scripts/**` returns nothing, and so does
`\bLOD\b` over `client/src/**`. Neither of the two named mechanisms exists.

**DUP-2 · `B-2` at L938 and `V-2` at L1121.** Not a copy — **the work and its verification, listed as
two independent open items.** B-2 is "TrackSelector: custom track behavior when geometry is missing";
V-2 is "TrackSelector B-2 custom track behavior", in a section headed *systematic testing of
still-unverified areas*. V-2 cannot be done until B-2 is, so it is not independently open.
**KEEP B-2 as the live item; V-2 points at it and says it is downstream.**

*(This shape repeats across the whole V- block: V-1↔B-1, V-4↔B-4, V-5↔B-5. Those pairs did not trip
the lexical hunt because the B- and V- texts share too few words. They are handled in the file-order
pass below — and they are why the report says a lexical hunt is only the first net.)*

---

### THE ELEVEN CLOSED — each confirmed at source, not taken from the report that claimed it

| line | item | verdict and the evidence |
| ---: | --- | --- |
| **171** | the two finish knobs read alike | **ALREADY DONE** — `82a03eb7` (ENDING-HOLD-1). The labels today are **`1 · Hold on the winner, before the zoom-out (ms)`** and **`4 · Pause before the result screen (ms)`** (`CameraAdvancedSection.jsx:1491` and `:1635`), numbered by ending phase. The item's quoted labels — "Finish pause (ms)" and "Pause after last finisher" — exist nowhere in the tree. |
| **179** | the render fingerprint cannot see the finish phase | **ALREADY DONE** — `b9579f59` (FINISH-WINDOW-1 A). The item says `RUN_FRAMES = 3400`, sampling `[0, 90, 600, 1500, 2400, 3300]`. Today `render-fingerprint.mjs:265` is **`RUN_FRAMES = 5600`** and `SAMPLE_AT` carries **16** points running to 5450 — ten of them past frame 3400, covering the 3466–5218 finish window the item names. |
| **338** | `server/` is audited by nothing | **ALREADY DONE**, all three halves. `ci.yml:212` runs `audit-gate.mjs --tree=server`; the `Server tests` job (`ci.yml:151`) runs the server suite; and the two HIGH advisories the item lists are closed — `ci.yml:205-207` records `ip-address 10.2.0→10.5.0`, `nanoid`, `postcss`, all lockfile-only, and the gate now BLOCKS rather than reporting. |
| **1008** | **Q-16** — CORS wildcard on all backend endpoints | **NEVER TRUE as written today.** `server/src/auth/csrf.js:26` builds `corsOptions` as `{ origin: list.length ? list : false }` from `getAllowedClientOrigins()` — an explicit allow-list that **denies** when empty. `app.js:31-36` then stacks `csrfOriginGuard`, `requireAuth` and `requireAdmin` above every route. There is no `origin: '*'` and no bare `cors()` in the tree. |
| **1091** | **Q-28** — shared HTTP helper for API services | **ALREADY DONE.** `client/src/services/apiClient.js` exports `apiCall`, and **all seven** API services import it. `git grep -c "fetch(" -- 'client/src/services/*.js'` returns exactly one file: `apiClient.js`. *(My first search for this used `apiFetch\|httpClient\|request(` and found nothing — the helper is named `apiCall`. A negative from the wrong name is not a negative.)* |
| **1001** | **Q-11** — `reader.onerror` missing in `handleBgUpload` (TrackEditor.jsx) | **ALREADY DONE.** `TrackEditor.jsx` holds 1 `new FileReader` and **2** `onerror` handlers. |
| **959** | **Q-26** — default tracks without backgrounds (fresh install) | **ALREADY DONE.** All ten seed geometries carry `backgroundImageFile`, and all ten files exist in `server/seeds/backgrounds/`. |
| **939** | **B-4** — apply branding profiles to race/result screen | **ALREADY DONE.** Both screens resolve the active brand: `RaceScreen/index.jsx` and `ResultScreen/index.jsx` both use `resolveActiveBrandProfile`/`activeBrand`, and the race screen additionally draws `BrandLogoOverlay.jsx` and `CeremonyBrandCard.jsx`. |
| **1123** | **V-4** — branding profiles B-4 (*"per old ROADMAP done, reality check says open"*) | **ALREADY DONE**, with B-4. The parenthetical is the interesting part: the old ROADMAP was right and the reality check was wrong. |
| **118** | authentication and authorization — **"DESIGN EXISTS, nothing is built"** | **NEVER TRUE as written today.** `server/src/auth/` holds `authRouter.js`, `csrf.js`, `guards.js`, `paths.js` and their tests; **37 commits** touch that directory, from `d0a57d44` (routes + first-admin bootstrap) onward. The pointer to `archive/AUTH.md` is worth keeping; the sentence in front of it is false. |
| **1122** | **V-3** — result screen winner count B-3 *(configurable?)* | **ALREADY ANSWERED.** `defaults.js` owns `defaultWinners` and every seed track carries its own; the question mark has an answer in the config. The address is given rather than the value. |

**Three of these eleven are the failure this piece exists to end**, in its subtler form: not "done in
one place and open in another" — hunt B found none of those — but **done in the CODE and open in the
DOCUMENT**. L171, L179 and L338 were each closed by named, reported, merged work, and the backlog was
never told.

---

### SUPERSEDED — 3

| line | item | what superseded it |
| ---: | --- | --- |
| **875** | **B-UX1** — name tag readability (iteration 1, *"to be implemented in PR-E of the camera phase"*) | The whole LABEL arc: `nameTagLayout.js` exists with an occlusion test, and `reports/evolution/INDEX.md` carries LABEL-OVERLAP-3, LABEL-NAMES-2, LABEL-OVERLAP-FIX-1 and more. **The subject is live and the defects are real — but this line's framing (a PR-E task in a camera phase that has since closed) is not where the work is.** Point it at the arc. |
| **882** | **B-UX1-Iter2** — name tags state-dependent strategy | Same arc. `labelNamesWhenRoom` and the PHOTO_FINISH `exemptAll` path are exactly "state-dependent", and both are recorded in the CORRECTIONS block above with measured numbers. |
| **1103** | **Q-30** — React 18→19 **+ react-router-dom 6→7** | **HALF DONE, and the half that is done is not the half you would guess.** `client/package.json:9` is **`react-router-dom: ^7.18.2`** — the router migration shipped. `react`/`react-dom` are still `^18.3.0`. The item survives as the React half only. |

---

### CANNOT ESTABLISH — 3, each with what would decide it

**None of these means "time ran out".**

| line | item | why the evidence does not settle it, and what would |
| ---: | --- | --- |
| **949** | **Q-19** — `TrackEditor.effects.test.jsx` flaky, *"intermittent in full-suite parallel run"* | The file exists and **passes in isolation (11/11)**, and the **full client suite ran green three times tonight** (pieces 1, 2 and 4). **Three green runs cannot settle an intermittent failure.** *What would decide it:* repeated full-suite runs under the parallel configuration, counting failures — a MEASUREMENT, so by the owner's correction it is carried to STEP E rather than started here. |
| **198** | Garden Path does not finish within the driver's 200 s ceiling | Confirmed as a standing fact by three separate reports in the evidence index, and my own memory of the harness agrees. **But the item asks "why does a 60-second race exceed 200 seconds of simulation", and that is a question no grep answers.** *What would decide it:* a driven race on garden-path with the finish accounting instrumented — a measurement. Carried to STEP E. |
| **296** | the company guarantee on a SPREAD field has never been measured | **The absence is confirmed** — no report in the 244-line index measures it on a spread field. Whether it still MATTERS depends on a number nobody has. *What would decide it:* the measurement the item itself describes. Carried to STEP E. |

---

### THE REST — STILL OPEN, 83

Each was checked against today's tree. The ones whose recorded numbers have gone stale are listed
first, because a stale number in an open item is the same defect as a stale verdict.

#### Open, and the number in the item is now WRONG

| line | item | recorded | today |
| ---: | --- | --- | --- |
| **279** | `.git/worktrees` stubs | **47** (2026-08-22) | **51** — `ls .git/worktrees \| wc -l`. It has grown again since the count was taken, which is the third different number this line has carried. |
| **953** | **Q-8** — watch list | TrackManager **535** LOC, BrandingProfiles **330** | **654** and **559**. Both grew; both are past the 400-LOC threshold the watch exists to enforce. |
| **955** | **Q-9** — `racer-types/index.js` growing | **286** LOC | **540**. Nearly doubled. |
| **957** | **Q-10** — `RacerEditModal.jsx`, *"already 75% of the 400-LOC threshold"* | **302** LOC | **670** — 68% PAST the threshold, not 75% of the way to it. |

**Four "watch" items, and every watched file crossed further past its line while nothing happened.**
That is a finding about the watch, not about the files: a watch that produces no action is a comment.
Recorded here; **the four items stay open** and now carry a `verify:` line that recomputes the count
rather than restating it, so they can never be stale again.

#### Open, and confirmed not built

`B-UX-Pause` (L889, no `pauseRace`/`isPaused`/`resumeRace` anywhere in `client/src`), `B-UX-ManualFocus`
(L894, no `MANUAL_FOCUS` in the tree), `Q-29` shared `RangeSliderSection` (L1097 — six `type="range"`
across four Dev Screen files, so the duplication is real but small), the dual particle system (L948 —
both `dustParticles` and `surfaceParticles` still present), `L308` a Dev Screen change does not reach
a running race (`RaceScreen/index.jsx:220` is `const [cameraConfig] = useState(() => loadCameraConfig())`,
still no setter), `L345` `deploy.yml.disabled` (both named blockers hold: `branches: [main]` at line
51, and `scripts/deploy.sh` does not exist), and the remaining VPS, instrument, camera-residual and
"Planned — needs spec" items.

#### Open, and PARTLY closed — the split is the finding

| line | item | the split |
| ---: | --- | --- |
| **1015** | **Q-17** — missing `reader.onerror` in `SystemSettings.jsx` **and** `TrackEditor.jsx` | **TrackEditor.jsx is DONE** (1 FileReader, 2 handlers). **SystemSettings.jsx is not** (1 FileReader, 0 handlers). **And there is a THIRD site the item never named: `BrandingProfiles.jsx`, also 1 FileReader and 0 handlers.** The item is rewritten to name the two that remain. |
| **357** | the app ships no build identifier | **The build PILL exists and is drawn in the shipped race picture** — `renderRaceFrame.js:500` calls `formatBuildLabel(buildBadge)` from `modules/buildInfo.js`, fed by the `virtual:ra-build` module. **What is still true is the narrower half:** `__APP_VERSION__`/`BUILD_ID` do not exist, and **`/api/health` (`server/src/app.js:38`) returns only `{status, timestamp}`** — so "which build is live?" cannot be answered from OUTSIDE the browser, which is what a server needs. The item is rewritten to that. |

---

### THE CARRY-FORWARD FROM BACKLOG-TRUTH-1

**Its three recorded `verify:` commands are lifted into the file** by STEP D, as it asked — items 16
(worktree stubs), 24 (`deploy.yml.disabled`) and 26 (the build identifier). It declined to add three
while twenty-two others had none; STEP D gives every surviving open item one, so that objection is
answered rather than inherited.

**One of its CANNOT ESTABLISH verdicts is now closed.** It could not confirm the finish-knob relabel
because `finishDramaDurationMs` "returned no match in `client/src/**/*.jsx`". **It matches** — six
times in `CameraAdvancedSection.jsx` (1493, 1504, 1507 among them). The glob, not the tree, was the
problem. **Verdict corrected to ALREADY DONE** (L171 above).

**And its sprite-route correction is now established over the whole tree, which it explicitly could
not do.** BACKLOG-TRUTH-1 recorded the claim as *"CANNOT ESTABLISH, not confirmed"*. Established
tonight:

- **GET** `/api/racers/:id/sprite` (`server/src/routes/racers.js:252`) — **has a caller**:
  `client/src/modules/racer-types/index.js` builds `spriteUrl: ${API_BASE_URL}/api/racers/${cfg.id}/sprite`,
  which the browser fetches as an image source.
- **POST** (`racers.js:272`) — **has a caller**: `racerApi.js:66 uploadRacerSprite`, called from
  `racer-types/index.js` as `await uploadRacerSprite(config.id, file)`.
- **DELETE** (`racers.js:318`) — **TEST-ONLY.** `racerApi.js:80 deleteRacerSprite` is referenced by
  exactly one other file in the whole tree, `racerApi.test.js`. No production caller exists.

**So the spec's claim holds and BACKLOG-TRUTH-1's uncertainty is resolved: the sprite route has
callers; only its DELETE arm does not.** Written into the CORRECTIONS block of
`reports/evolution/INDEX.md` naming `OPEN-ITEMS-2026-08-22` as the report corrected, which is what
BACKLOG-TRUTH-1 was forbidden from doing by its own narrower spec.

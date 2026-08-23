# DECISIONS-2026-08-23 — sixteen owner decisions, written where they will be found

**Block:** PIECE 1 of the chain of 2026-08-23-B. **Branch:** `docs/decisions-2026-08-23` off master
`50286408`. **Scope:** documents, plus two source COMMENTS. No behaviour, no default, no fingerprint.

**What it delivers:** the owner's sixteen decisions of 2026-08-23 recorded with their date in
`docs/BACKLOG.md`'s DECISIONS section as **D10–D24**, every open item they settle closed or
rewritten, two new standing rules written into the document that binds future blocks, and one
comment in the engine corrected because it had become untrue.

---

## 1. The decisions, and where each one landed

Fifteen entries for sixteen items — 14 and 15 are one decision, taken together, because they are one
thing.

| # | the decision | recorded as | what it closed or rewrote |
| --- | --- | --- | --- |
| 1 | the action dial's MAPPING is decided by MEASUREMENT | **D10** | HOW MUCH ACTION question 1 — still open, no longer his to answer unaided |
| 2 | the dial is BOUND BY THE FAIRNESS GATE; each stage passes on its own or does not ship | **D11** | HOW MUCH ACTION question 3 — **answered** |
| 3 | the chosen stage is STORED WITH THE RACE, like the seed | **D12** | HOW MUCH ACTION question 4 — **half answered**; the fingerprint half stays open |
| 4 | the eye-test session is SUPERSEDED; **every acceptance is a sample** | **D13** | *Owner eye-test coverage* — closed and moved to PART TWO; the standing principle is now **VERIFY-RULES.md R5a** |
| 5 | a comeback is **storming from far back to the front** | **D14** | *camera timing levers (tune by eye)* — **replaced**, plus a new OPEN POINT with source evidence |
| 6 | the company guarantee on a SPREAD field: **his 5 stands** | **D15** | the camera-residuals item — stays open, but on a **measurement**, not on his word |
| 7 | the PULK→OUTCOME speed step is **intended dramaturgy** | **D16** | E3's remainder — closed; documented as design in **RACE-ACTION.md** |
| 8 | OUTCOME climb-capacity — **closed** | **D17** | the "deferred pending owner decision" status was wrong and is corrected; the lever is **not ordered** |
| 9 | 100-racer performance (`D7d`) is an **OBSERVATION** | **D18** | the item and its *Order of Next Steps* echo; all three mechanisms not ordered |
| 10 | the juxtaposition rule — **ADOPTED**, narrow form | **D19** | the proposal item — closed; the rule is now **VERIFY-RULES.md R16** |
| 11 | a re-minting block names invariants that must not move — **ADOPTED** | **D20** | the proposal item — closed; the rule is now **VERIFY-RULES.md R17** |
| 12 | audit gate: DEV dependencies **report**, they do not block | **D21** | the CI/dependency-hygiene item — policy closed, build not ordered |
| 13 | the `body-parser` LOW advisory — **no action** | **D22** | the same section's second item — closed |
| 14+15 | the seed for a normal race — **BUILD IT**, and make it outlive the session | **D23** | both browser-seed follow-ups — closed; built in PIECE 2, **unmerged** |
| 16 | merge ROADMAP into BACKLOG — **APPROVED as work** | **D24** | the Documentation item — approved, still open, gets its own piece |

**PART ONE's "NEEDS HIS WORD" index was rewritten rather than trimmed.** Every one of its thirteen
rows is now answered, so the table would have emptied. It carries two tables instead: what is still
his (two rows — the comeback beats, and his eye on the seed build), and every old row beside the
decision that took it. A question that vanishes from an index looks like a question nobody asked.

---

## 2. Item 5 — the finding behind the comeback definition, re-verified before it was written

Established at source and checked again in this block, not carried over from the brief.

- **The generator authors ROLE *and* BEATS.** `client/src/modules/heroCurveGenerator.js`,
  `buildCameraPlan` — every hero carries `{ index, role, finalRank, beats }`, and each beat is
  `{ progress, event }` where `event` is `anchor` for the first point, `resolve` for the last, and
  `peak` for everything between.
- **The FULL plan reaches the director.** `client/src/screens/RaceScreen/index.jsx:1002` —
  `camDirRef.current?.setCameraPlan(cp)`, fired once, mid-race, because the heroes are cast at the
  chaos boundary and the plan is null at race start.
- **`comebackDetector.setPlan` keeps the roles and DISCARDS the beats.** It walks
  `cameraPlan.heroes`, admits `h.role === 'comebacker'`, and stores `h.index`. Nothing else from a
  hero object is read anywhere in `client/src/modules/camera/`.
- **So the camera re-infers what it was told.** The detector keeps a rolling rank history and reports
  the best current climber that passes its gates — a reconstruction of timing information that was
  handed to it and dropped. **And the `resolve` beat never arrives at all**, which is precisely the
  moment the owner's definition is about.

**verify, and it is falsifiable:** `git grep -n "beats" -- client/src/modules/camera` returns exactly
two lines today, both JSDoc `@param` descriptions (`CameraDirector.js`, `comebackDetector.js`). No
code reads a beat. The day that command returns a third line, the point is answered.

**Nothing is proposed and nothing is built.** Filed as an OPEN POINT in D14 and cross-linked from the
replaced backlog item and from B4c, which needs the same channel.

---

## 3. The two source comments

**These are the only source edits in this piece.** Both are in
`client/src/modules/racePlanner.js`, and neither is reachable by the engine as a value — they are
comments, and the world fingerprint's inert-change rule is what says so.

1. **The `_cameraPlan` retention comment.** It said the plan is *"Delivered to the CameraDirector
   (setCameraPlan) but currently UNCONSUMED"*. That stopped being true when B4 landed. It now says
   exactly what is true: **the roles are consumed, the beats are not**, with the reason and a pointer
   to D14. The old wording is quoted inside the new comment so the correction is visible rather than
   silent.
2. **The `getCameraPlan` getter comment.** It said only *"Delivered to the CameraDirector"* — true,
   and the half that misleads by omission at the exact place a reader asks "and then what?". It now
   names the consumer and says the beats are discarded there.

**DEVIATION FROM THE BRIEF, and it is the one place this piece did not do what it was told
literally.** The brief said to correct the claim *"in both places the claim appears"*. **The claim
appears in exactly ONE place in the tree.** `git grep -in "unconsumed"` over the whole repository
returns one line, and no other comment or document asserts that the plan is unconsumed. Rather than
invent a second site or leave the instruction half-done, the second edit went to the nearest comment
that a reader would hit with the same question — the getter — and it is corrected by addition, not
by striking something false. **Conservative option at a fork, stated as required.**

---

## 4. Three corrections this piece made that it was not asked to make

Each is a sentence that was false in a file this piece was already editing. R11's rule is that a
guard is the first suspect when it disagrees with a sentence; the inverse also holds — a sentence
that disagrees with the source is corrected where it is found, not left because nobody asked.

- **`RaceSettings.jsx` carries THREE controls, not one.** The HOW MUCH ACTION section said the host
  surface *"is 86 lines and carries exactly ONE control today — Race Duration, at
  `RaceSettings.jsx:32`"*. The line number is right; the count is wrong — the same file renders a
  winners stepper and an event-name field below it. **The conclusion survives the correction** (three
  controls is still nearly empty beside the Dev Screen), and the correction is kept visible because a
  wrong count is a bad reason for a right conclusion.
- **`server/` is NOT audited by nothing.** The brief asked for that gap to be recorded as an open
  item. It is **already closed**: `scripts/audit-gate.mjs` takes `--tree=`, `.github/workflows/ci.yml`
  runs it with `--tree=server` on every push and pull request, and `audit-schedule.yml` runs both
  trees daily under `--report-only`. Writing it in as open would have re-opened a closed item on the
  strength of a stale premise. It is recorded as **closed, with the evidence**, in D21 and beside the
  CI questions where a reader meets them.
- **`docs/README.md` said VERIFY-RULES owns "the standing rules R0–R11".** It owned through R15
  before this piece and through R17 after it. The enumeration is removed rather than bumped — it has
  gone stale once and would again.

---

## 5. Verification

**Documents plus two comments. No fingerprint can be moved by this diff and none was run** — the
world fingerprint's own inert-change rule (a hull file whose edit is comments and whitespace only
does not select it) is what makes that a statement rather than a hope, and `npm run verify` reports
it as an INERT skip rather than silently.

| check | result |
| --- | --- |
| `npm run verify` (routing + everything it selected) | see the run block below |
| `check-config-claims` | **PASS** — 170 keys, 56 living documents, **0 current claims** |
| `check-language-closed` | **PASS** — 944 files, 27 with German, 27 frozen allowances, **0 failures** |
| `check-doc-links` | **PASS** — 581 relative links across 58 living-doc files, **0 dangling** |
| `check-index` | **PASS** — 5 directories, 354 reports, 0 unindexed, 354 links, 0 dangling |
| client suite | run because two source files gained comments — see below |

**R15e — WHAT WAS SKIPPED AND WHAT DETERMINED ITS ANSWER.** WORLD, CAMERA and RENDER fingerprints,
`check-runin-frame`, the 80-race acceptance sheet and the browser gate were all skipped. What
determined it: the only source diff is **comments**, which cannot move a hash (R15a's premise, and
`fingerprint-default.mjs`'s own standing rule); and R15c states that a documentation change pays
neither the browser gate nor the suite — the suite was run anyway here, because two source files were
touched at all, which is the narrower and more conservative reading.

**A DANGLING-LINK FORK, and the conservative option taken.** The backlog entries for D10 and D23
wanted to link the reports of PIECE 3 and PIECE 2. `check-doc-links` refused, correctly: neither
report exists on master when this piece merges, and **PIECE 2 is not going to merge at all** until
the owner has seen it. Both are named as plain paths in backticks instead of as links. PIECE 3 may
convert its own to a link when it merges; PIECE 2's must stay a name until he approves it.

---

## 6. What this piece did NOT do, by instruction

- **No dial was designed, no mapping proposed, no key wired.** D10 records that the question waits on
  a measurement; it does not answer it.
- **The ROADMAP/BACKLOG merge is approved and not started** (D24). It rewrites the file this piece is
  editing, and a dropped item would have been indistinguishable from an edited one in this diff.
- **The DEV-dependency audit split is decided and not built** (D21). What it needs is written down so
  the next block does not re-derive it, including the trap: `reachability UNKNOWN` must not become
  dev-only by default.
- **Nothing was proposed about the discarded beats** (D14). It is his call and it needs his eye.

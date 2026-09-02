# SECOND-SITES-1 — 11 of 21 corrections left an identical false statement standing elsewhere, at 16 live sites; the sharpest is a code comment written 28 minutes before the correction that fixed the document

**READ-ONLY.** Nothing was edited, staged, committed or branched. Tree: master at `c5b957d3`,
clean, 2026-09-02. No fix is proposed anywhere below.

---

## THE NUMBER

| | |
| --- | --- |
| corrections checked | **21** — 15 APPLIED by DOC-TRUTH-1 (8) and DOC-TRUTH-2 (7), plus **6 sampled** earlier corrections from the INDEX CORRECTIONS block |
| **with at least one LIVE second site** | **11** |
| **live second sites in total** | **16** |
| **the rate** | **11 of 21 = 52%.** On the applied set alone: **11 of 15 = 73%.** On the earlier sample alone: **0 of 6.** |

Collapsing the two pairs that correct one claim at two document sites (`#2`/`#3`, and `#1`/`#10`)
gives **9 of 19 distinct claims = 47%**. Both readings are stated because neither is obviously the
right denominator.

**Twelve of the sixteen sites were named by neither DOC-TRUTH report.** Four were: DOC-TRUTH-2 found
them and left them among its ~90 deliberately-unapplied corrections, so they are live but not
undiscovered.

**Four of the sixteen are in CODE, not documents** — outside both reports' declared scope (34
documents), which is why no document census could have found them.

---

## THE TABLE — the 15 applied corrections

| # | correction (what was fixed) | 2nd site? | where | case |
| --- | --- | --- | --- | --- |
| 1 | `reports/evolution/INDEX.md:5` — header quoted the dead world fingerprint `dc4647be0f55ebdb` in the present tense; replaced with a pointer | **YES ×2** | `docs/TAGS.md:1221` *"has since advanced … to **the current world** `dc4647be0f55ebdb`"*; `docs/TAGS.md:1294` *"RACER-MOTION-2 shipped **the current world** `dc4647be0f55ebdb`"* | **(a)** |
| 2 | `docs/BACKLOG.md:604` — `corridor-truth --company-only` → `his-shot-truth` | **YES ×1** | `scripts/lib/raceDriver.mjs:121-124` (code comment) | **(a)** |
| 3 | `docs/VERIFY-RULES.md:692` (R16) — same pair | **YES** (same site as #2) | `scripts/lib/raceDriver.mjs:121-124` | **(a)** |
| 4 | `docs/NIGHT-RUN.md:113` — browser suite *"103/103 green"* | **YES ×1** | `docs/VERIFY-RULES.md:509` — *"It was repaired over 2026-08-16/17 and is **103/103 green**"* | **(a)** |
| 5 | `docs/ARCHITECTURE.md:466` — garden-path *"is"* 282.8 s at the snail's 0.3 | no | `reports/parity/GOLDEN-SOAK.md:52,61,231`; `reports/BASELINE-INVALIDATED.md:71` | (b) |
| 6 | `docs/BACKLOG.md` action dial — *"requires the Dev Screen"* | no | — | — |
| 7 | `docs/TRACK_LIFECYCLE.md:32` + workflow section — `defaultTracks.js` asserted to exist | **YES ×2** | `docs/TRACK_EDITOR.md:129` and `:135`, § "Code-Bundle Fallback", present tense | **(a)** |
| 8 | `docs/VERIFY-RULES.md` R10 ×2 — *"`git worktree prune` cannot delete the stale stubs here"* | **YES ×1** | `docs/BACKLOG.md:647` — open entry: *"cannot be removed by `git worktree prune`"*, plus *"Do not add `prune` to the ship ceremony — it already fails here"* | **(a)** |
| 9 | `docs/CAMERA_DIRECTOR.md:980` — `racer-types/` in *"no instrument's closure at all … engine-reach reports it cannot reach the engine"* | **YES ×1** | `docs/BACKLOG.md:3832` — open entry: *"`engine-reach --check` returns 'cannot reach the engine at all' for … `client/src/modules/racer-types/*.js`"* | **(a)** |
| 10 | `docs/PROJECT-PRINCIPLES.md:86` — the dead world fingerprint (itself found as #1's second site) | **YES** (same sites as #1) | `docs/TAGS.md:1221`, `:1294` | **(a)** |
| 11 | `docs/FORCE-MAP.md` head — browser physics loop attributed to `RaceScreen/index.jsx` | **YES ×4** | `docs/ARCHITECTURE.md:646`, `:660`, `:1192`; `docs/DEVSCREEN-INVENTORY.md:233` | **(a)** |
| 12 | `docs/ARCHITECTURE.md` invariants 2/3/6 — `physicalYToPx`, `REFERENCE_TRACK_WIDTH`, `lateralScale` | **YES ×1** | `docs/ARCHITECTURE.md:285` — the "Conversion helpers" block, **24 lines above the correction, same file** | **(a)** |
| 13 | `docs/API.md:3` — *"every endpoint"* | no | — | — |
| 14 | `docs/TRACK_EDITOR.md:310` — `getCenterFrac` | no | — | — |
| 15 | `README.md:66` — race-action director *"optional … default OFF"* | **YES ×3** | `client/src/modules/raceCore.js:317`, `:543`; `client/src/modules/raceGovernor.js:135` | **(a)** |

## THE TABLE — the 6 sampled earlier corrections

**How they were chosen:** the CORRECTIONS block at the top of `reports/evolution/INDEX.md` holds 9
entries. Two are the DOC-TRUTH pair already in scope above and one (2026-08-23) is procedural. I took
**all six remaining** — i.e. every entry in the block that corrects a concrete, greppable factual
claim. That is a complete sweep of the block, not a subsample.

| correction | 2nd site? | where | case |
| --- | --- | --- | --- |
| GARDEN-PATH-DEFAULTS-1's *"every instrument runs all TEN tracks AT TRACK DEFAULTS"* | no | `docs/fingerprints.json:38,77` (`supersededMintedBy`, explicitly historical) | (b) |
| SPRITE-PREMISE-1's *"no harness racer table exists; every instrument reads the registry directly"* | no | `docs/BACKLOG.md:797` carries the sentence — but the verdict block directly below it (BACKLOG-VERDICTS-1, 2026-09-02) **withdraws that exact last sentence by name** | **(c)** |
| LEADER-LAG-TRUTH-1's *"space-sprint's sprite is 2.9× river-run's"* | no | `docs/BACKLOG.md:735` states the claim **already carrying the narrowing** | **(c)** |
| ALONG-RESIDUAL-1's 3,330-declined-frames framing | no | `scripts/diag/margin-both-axes.mjs:3`, `margin-both-axes-sum.mjs:12,60` — all three state the corrected reading (150 episodes / declined ≠ visible) | (c) |
| SEED-REDELIVERY-1's *"all 31 records"* → 30 | no | `reports/evolution/SEED-REDELIVERY-1.md:123`, `INDEX.md:1513` | (b) |
| SEED-SNAPSHOT-INVENTORY-1's *"exactly two fields"* | no | `reports/evolution/SEED-SNAPSHOT-INVENTORY-1.md:43` | (b) |

**Zero of six.** Two of the six had a living-document restatement that was **corrected in place at
the same time** — case (c) — which is the shape the applied corrections above did not have.

---

## ★ THE ONE WORTH READING TWICE: THE CORRECTION AND ITS SECOND SITE ARE 28 MINUTES APART

`scripts/lib/raceDriver.mjs:121-124` reads, today, on master:

```
// ★ THE CONFIG IS IN THE HASH, AND THAT IS THE WHOLE POINT. `corridor-truth` and
// `corridor-truth --company-only` print the SAME identity line and produce DIFFERENT numbers, so
// identity alone cannot answer the question. VERIFY-RULES R16 names that pair as the case where even
// a stated identity is insufficient.
```

That comment was written by **`6444a8b6`, 2026-09-02 20:05:11** — RACE-IDENTITY-HASH-1, whose own
commit subject is *"…and R16's own worked example names the wrong tool"*. It is the commit that
**discovered** the claim was false. Twenty-eight minutes later, `49fd9386` (DOC-TRUTH-1, 20:33:10)
corrected `docs/VERIFY-RULES.md:692` and `docs/BACKLOG.md:604`, crediting the discovery to
RACE-IDENTITY-HASH-1 — and left the comment that discovery had just written.

It is also false twice over: R16 **no longer names that pair**, so the comment's last sentence now
misdescribes the rule it cites.

**Control:** `git grep "corridor-truth"` returns 17 files, so the search is not blind; and
`scripts/corridor-truth.mjs`'s own flag set is `--json` alone.

---

## THE SECOND-SHARPEST: THE SAME FILE, 24 LINES APART

DOC-TRUTH-2 filed `docs/ARCHITECTURE.md` **`:285` and `:309` as ONE finding at two sites**. The
applied edit repaired `:309` (and `:317`). **`:285` still reads:**

```
Conversion helpers (raceBehavior.js, top of file):
  pxToPhysicalY(px, trackWidth)  = px  / (trackWidth / 2)
  physicalYToPx(phy, trackWidth) = phy * (trackWidth / 2)
```

followed by *"ALL lateral physicalY ↔ pixel conversions must go through **these helpers**."*

**Control:** `git grep "physicalYToPx" -- client server scripts shared` → **zero**;
`git grep -c "pxToPhysicalY" -- client` → `raceBehavior.js:8`. The grep works; the symbol is gone.
This is one of the seven invariants `docs/PROJECT-PRINCIPLES.md` fixed-point #5 sends a stranger to.

---

## EVERY NULL RESULT AND ITS CONTROL

A grep returning nothing is reported here only where a control returning something was run first.

| claim searched | control that DID return | verdict |
| --- | --- | --- |
| #5 garden-path 282.8 s / snail 0.3 as a CURRENT property | `"282.8"` → 8 files; `garden-path`+`snail` → 14 files | all live-doc sites already corrected; the rest are dated night-run reports at the retired 225 px/s baseline — **(b)** |
| #6 *"requires the Dev Screen"* | `"Dev Screen"` → 14 hits in `BACKLOG.md` alone | one site only |
| #13 *"every endpoint"* / *"all endpoints"* / *"complete API"* | the phrase itself returns `docs/MORNING.md:137` | `docs/README.md:63` says only *"The backend HTTP endpoints"* — a map row, not a completeness assertion. Judged **not** a second site; this is the one editorial call in the table |
| #14 `getCenterFrac` | sibling method `getActualTrackWidth` / `getPosition` → dozens of hits | never existed; one site only |
| earlier-sample *"all 31 records"* | `"30 records"` → 3 hits in `COMPOSE-SEEDS-MOUNT-1.md` | reports only — **(b)** |

**Two verdicts that a careless sweep would have got wrong, and did not:**

- **`docs/ARCHITECTURE.md:783`** — *"Implementation: `RaceScreen/index.jsx` (physics accumulator …)"*
  reads like a fifth instance of #11. It is **TRUE**: the rAF accumulator is still in `index.jsx`
  (`:852`, `:868`, `:879`), even though the t-update is not. Not counted.
- **`docs/FORCE-MAP.md:272,275,284`** use `lateralScale` in the present tense — but every one sits
  under a heading marked **REMOVED (Commit A)**, exactly as DOC-TRUTH-1 found. **(c)**, not counted.

---

## THE FOUR CODE SITES, PROVEN AT SOURCE

**#15 — three comments say the race-action director does not run. It runs.**

- `client/src/modules/raceCore.js:317` — *"Pre-OUTCOME contest-injector "director" (PulkLeadRotation
  — default OFF)"*, immediately above `const pulkLeadRotationOn = racePlanEnabled;`
- `client/src/modules/raceCore.js:543` — *"PulkLeadRotation (default OFF → skipped)."*
- `client/src/modules/raceGovernor.js:135` — *"PulkLeadRotation (SWEEP/opt-in, flag-gated; default
  OFF → not called → byte-identical)."*

**Control:** `pulkLeadRotationEnabled` has **no live occurrence** — only two test comments recording
that the gate *"was removed when it went unconditional"*, and
`reports/results-salvage/OPEN-ITEMS-RECONCILE.md:29` (*"0 hits — mechanism now unconditional"*).
`docs/PROJECT-PRINCIPLES.md:153-155` records PulkLeadRotation as shipped on master since 2026-07-14,
and `docs/RACE-ACTION.md` §5 documents it as the shipped mechanism. The comments describe a gate
that no longer exists.

**#9 — verified by running the tool, both directions:**

```
engine-reach --check client/src/modules/racer-types/SpriteRacerType.js
  → "is in the hull but INERT — byte-identical"          (exit 0)
engine-reach --check client/src/modules/racerNames.js     [CONTROL]
  → "1 outside the hull (cannot reach the engine at all)"
```

`docs/BACKLOG.md:3829-3835` names three subjects and says *"Two of those three verdicts are wrong."*
One of the three (`racer-types/`) stopped being a verdict at all on 2026-09-02 (`56b99a9d`,
REGISTRY-LITERALS-1). The other two — `server/seeds/tracks/*.json` and `racerNames.js` — hold.

---

## WHAT THE NUMBER MEANS

**One in two corrections in this repository has left the same false sentence somewhere else** — and
on the corrections that were actually applied this week, closer to three in four. The
`CAMERA_DIRECTOR.md:980` case that prompted this piece is **not an outlier. It is the median.**

Three properties recur across all eleven:

1. **The second site is usually in a DIFFERENT document from the one being corrected** (9 of 16
   sites). The exception, `ARCHITECTURE.md:285`, is worse rather than better: 24 lines from the fix,
   in the same file, in a finding that named both lines.
2. **Four sites are in code**, where neither document census looks by construction. Two of the four
   were written by the very piece that discovered the claim was false.
3. **The claim's second site is often phrased differently** — "the current world `dc4647be…`" vs
   "Shipped world: `dc4647be…`"; "cannot be removed by `git worktree prune`" vs "prune cannot delete
   the stale stubs here". A literal-string guard would find neither pair.

## WHAT IT DOES NOT MEAN

- **This is not a base rate for the repository's documents.** The 15 applied corrections come from a
  night explicitly hunting stale claims, so they are enriched for claims important enough to have
  been written down twice. A claim nobody restated cannot have a second site.
- **"Live" is not the same as "undiscovered."** Four of the sixteen (`TRACK_EDITOR.md:129/135`,
  `ARCHITECTURE.md:646`, `ARCHITECTURE.md:285`, `DEVSCREEN-INVENTORY.md:233`) are already written
  down in DOC-TRUTH-2 among its ~90 deliberately-unapplied corrections. They are standing, but they
  are on a sheet. The other twelve are named in no report.
- **The earlier-corrections sample is 6 and it is a complete sweep of its block, not a random
  draw.** Its zero is real but weak: those corrections were recorded in an append-only journal
  rather than applied to living text, and two of the six had their living-document restatement
  corrected in the same movement, which is a different practice from the one measured above. **I
  could not establish** whether the applied set's 73% or the sampled set's 0% is closer to the
  project's long-run behaviour — the two sets differ in how the correction was made, not only in
  when.
- **The count is a lower bound on second sites, not an upper one.** I searched by claim across
  documents, `.js/.jsx/.mjs/.cjs`, and reports. A claim restated as prose with no shared vocabulary
  — the shape that defeated the literal guards in the first place — is invisible to the method used
  here, exactly as DOC-TRUTH-1 said of its own 1-in-99.
- **One verdict is editorial, not mechanical:** whether `docs/README.md:63`'s *"The backend HTTP
  endpoints"* restates API.md's withdrawn "every endpoint" ownership claim. I judged not. If it
  counts, the number is 12 of 21.

## WHAT COULD NOT BE ESTABLISHED

- **Whether a second site was ever LOOKED for.** No correction commit in either chain records a
  second-site search, but absence of a note is not evidence of absence of a search.
- **Whether the four code sites would have been found by a wider brief.** DOC-TRUTH-2's scope was 34
  documents by declaration; the code comments were never in it.
- **`docs/TAGS.md`'s status as living vs. history.** I treated its explicitly present-tense sentences
  as live claims. That follows DOC-TRUTH-2's own precedent — it judged `TAGS.md:1781` false on
  exactly that reasoning (*"explicitly present-tense … so it is not history"*) — but it is a
  judgement, and the two `dc4647be` lines sit under dated ship headings.

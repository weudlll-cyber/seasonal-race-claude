<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-07, after PIECE 6 of the night chain of 2026-09-06.

**Where the code is.** Master is `554f348e` and CI is green on it. `feat/team-races-1` carries the
catch-up and pieces 1-3 and is pushed and **NOT MERGED** — it waits for your eye. `night/2026-09-06` is branched off master `554f348e` and carries pieces 4 and 6; also **NOT MERGED**.

**★ THE ONE THING TO KNOW FIRST — the packaged server could not start, and now it cannot fail
silently again.** `contentAddress.js` imported the canonical serialiser from `client/src/…`, which
the root `.dockerignore` deliberately keeps out of the server image, so the import could not resolve
in a container. Searching found **two more of the same shape**. All three are fixed by moving the
shared rules into `shared/`, above both packages. **Then the new check found a fourth**: those files
were allowed into the build context but never COPYed, so the container still died — the build
reported success either way. **Nothing about a race changed** anywhere in this: golden races pass,
all four fingerprints unmoved, nothing minted.

---

## TONIGHT'S CHAIN — 2026-09-06, six pieces on two branches

### DONE

**Catch-up · the team topic is up to date with master.** 14 files touched by both sides, 7
conflicted, 31 hunks — every code hunk the same shape: the topic changed the SEMANTICS, master had
only re-FORMATTED those lines. Both sides survive by construction: the topic's side inside each
conflict, then master's formatter over the result. One of master's lint fixes fell inside a conflict
region and was lost by that rule — **found by re-running eslint rather than by remembering** — and
re-applied. **Golden races PASS after the catch-up.**

**PIECE 1 · The shared rules belong to neither side** — `ba9801a1`.
★ **The search found FIVE crossings from server code into `client/src`, not the one that was known.**
Three ship and break the image and are fixed; four cannot reach a container and are **named and
left** (two contract tests, a dynamic import in a test, the server's eslint config — the contract
tests SHOULD read the client's copy, which is their point). `canonicalJson` moved **alone** (of eight
exports, only that one is read by the server); `raceShortKey.js` moved **whole**, because splitting
it would put the alphabet in one file and a function that tests against it in another. One version,
no copy, no shim. ★ **Output proven identical**, 18 exact strings captured from the pre-move
implementation recovered out of git — including a pinned quirk: integer-like keys serialise in
numeric order, not the lexicographic order the sort asks for. Two headers that argued FOR the
crossing are corrected: the "established pattern" they cited was this defect propagating.

**PIECE 2 · A check that the packaged image actually starts** — `de463da0`,
`scripts/check-image-starts.mjs`. ★ **It found a real defect on its first run** — piece 1's, one
commit earlier: `.dockerignore` decides only what enters the build CONTEXT; the Dockerfile COPYs
`shared/` **per file**, and the two new lines were missing, so the container died with
`Cannot find module '/shared/raceShortKey.mjs'` from a build that reported success. Both COPY lines
added. ★ **The container is not the image**: compose binds `./server/src` over the image's own copy,
so a container started that way proves nothing — this one runs `docker run` with **no bind mounts**.
★ **Its path declaration is derived from the Dockerfile's COPY lines**, not hand-written, and picked
up the two new modules by itself; `docs/` cannot select it. Sabotage went red as required.
**Cost, stated plainly: 121 s cold, 7.4 s warm, 55-67 s under verify's load.** Not wired into CI —
`ci.yml` untouched — but verify does select it, so **verify now needs a Docker daemon** when a
declared path changes, and says so loudly rather than passing.

**PIECE 3 · A repeat is recomputed first — ★ STOPPED, no code changed** — `2c938327`, report
`reports/evolution/REPEAT-RECOMPUTE-6.md`. ★ **That report is on `feat/team-races-1`, not on this
branch**, which is why it is named here rather than linked: piece 3 belongs to the team topic and
this sheet also has to be readable from the night branch. Everything it was asked to
establish, it established. ★ **The named stop condition PASSES**: the engine loads in a worker with
no engine change — of the 64 files in its closure only three touch the DOM, all at call time. The
comparison needs **no tolerance** (`finishTimeMs` is a strict FIXED_DT multiple, already stored), and
★ **the three doors already converge on one function**, `startRaceFromIdentifier`. ★ **What blocks it
is the params.** `createRaceFromIdentity` takes a ~60-line derivation that lives inside
`RaceScreen/index.jsx` — drawing code this piece may not change — which reads this machine's
overrides live and whose `physicalSpriteSize` drives `rowGapPx`/`rowCount`, i.e. physics. **It has
been mirrored twice already, knowingly**, both in `scripts/` and neither importable from the client.
A third mirror drifts, and a drifting recompute refuses races that still run identically — the exact
outcome REPEAT-REFUSE-5 established as wrong. **RACE-HISTORY-4's warn-and-run is deliberately left
running**: it is replaced, not layered over, and removing it first would leave you with neither.

**PIECE 4 · The plan's beats reach the camera — ★ BUILT, AND THE KEY IS OFF** — `918423c8`,
[COMEBACK-CONNECT-1](../reports/night/COMEBACK-CONNECT-1.md). `comebackUseBeats` ships **false**, so
nothing changes until you turn it on; there is a Dev Screen control for it. ★ **THE TWO COLUMNS over
40 races / 74 written comebackers: shots 11 → 0**, races with a comebacker and no shot 29/40 → 40/40,
COMEBACK_ZOOM frame share 3.07% → 0.00% with two thirds going to LEADER_ZOOM. The arms are **proven
to have run identical races** — 0 differences in every camera-independent field. ★ **Why it is zero
IS the finding:** candidate frames inside the offer window fall **7,510 (35 of 40 races) → 45 (2 of
40)**. The authored landing and the camera's admissible window barely overlap, because by the time
the climb lands the racer is near the front and the detector's own gate stops calling it a comeback.
★ **The other end is measured too:** gating on the PEAK beat changes NOTHING — every authored peak
(0.18–0.676) is behind the camera before the outcome phase opens at 0.75. ★ **Two defects in my own
instrument, both caught by disbelieving a zero**: the key was never carried into the timing config,
and the harness's gate read omitted the new argument. **No value is recommended.** Four fingerprints
unmoved, golden races pass, nothing minted.

**PIECE 6 · The identifier carries only what differs — ★ BUILT** — `dd6bea53`,
[IDENTIFIER-DIFF-1](../reports/night/IDENTIFIER-DIFF-1.md). `effectiveRacerTypes` was written in
full — all twenty types, every race — while the config block beside it was already a diff. Same
`diffFromDefaults`/`applyDiff` pair now, against `CONFIG_SNAPSHOT`, the registry's own frozen copy of
its code defaults: **no engine change and no new mechanism.** ★ **Re-measured here: 2,547 → 230 at 4
racers, 2,775 → 458 at 20, 3,068 → 751 at 40 — a CONSTANT 2,317 characters saved** (91% / 83.5% /
75.5%), reproducing Option A's predicted 739 independently. ★ **Old identifiers still work** — `ed`
means a diff, `e` means the old full form, and which key is present decides; **no version bump, no
migration**, because a bump would refuse every string you have already copied out. ★ **The cost,
stated and not solved: a diff means whatever the DECODING build's defaults say it means** — if a
shipped racer-type value moves, an old identifier silently describes a different race. Demonstrated
by a test, not argued. ★ **The existing reproduction test was green for the wrong reason** (it passed
no base, so the diff came out as the full object); fixed before the sabotage, which then went 2 of 13
red — but only once the catcher pinned an omitted value to a LITERAL, because a same-build round trip
is blind to a moved default by construction.

### RUNNING

Nothing is running. Piece 5 is next and is the last.

### OPEN — the one piece not yet started

- **PIECE 5** · what the harness camera's closed outcome window hides. Measurement only, nothing
  built, nothing minted.

### NEEDS HIS WORD

- **★ THE TEAM TOPIC MERGES ONCE, WHEN YOU HAVE LOOKED AT IT.** `feat/team-races-1` is pushed and
  nothing on it is merged. That is the standing instruction, not a blocker anyone hit.
- **★ THE ONE DECISION THAT UNBLOCKS PIECE 3, and it is worth taking on its own merits.** Extract
  the race-init derivation out of `RaceScreen/index.jsx` into a shared module — one function from
  (stored inputs, geometry, racer type, config world) to `createRaceFromIdentity` params. It would
  **DELETE the two existing mirrors** rather than add a third, and it is what a recompute needs. It
  is a piece of its own: it touches drawing code, it moves the path every race in the product runs
  through, and its proof is the parity suite plus the golden races plus your eye. **Not started.**
- **★ PIECE 4's KEY IS OFF BY DEFAULT AND THE POINT IS THAT YOU TRY IT BOTH WAYS.** The camera
  knowing when a comeback happens is contested behaviour and you have not seen it. The dev server is
  left on `night/2026-09-06` for exactly this — the switch is in Dev Screen → Camera (advanced),
  *"Let the race plan say WHEN a comeback is shown"*. ★ **Read the two columns before you flick it:**
  ON, the measurement says every comeback shot disappears. That is a real result, not a bug, and it
  is why nothing is recommended.
- **Wiring the image check into CI is a decision, not an oversight.** It needs a Docker daemon and
  costs ~2 minutes cold. IMAGE-STARTS-1 built and verified it and stopped there, as instructed.
- **Carried over, still true:** re-recording a golden race needs your word, per occurrence. Nothing
  in this chain has asked for it.
<!-- END CHAIN STATUS -->


## EARLIER — the night of 2026-09-05, for context

**★ THE NIGHT OF 2026-09-05 — five pieces on `night/2026-09-05`, none merged.**

**1 · What it would cost to show the comebacks** —
[COMEBACK-WEIGHT-1](../reports/night/COMEBACK-WEIGHT-1.md). One lever over the same 40 races.
Comeback shots rise **11 → 19 of 74** as the weight goes 0.6 → 8; races with no comeback at all fall
29 → 21 of 40. **The cost is +2.24 points of frame share, two thirds of it paid by the battle shot.**
★ **The shots stay EARLY at every setting — never once late** — so this lever buys MORE comebacks and
does not move them to the moment the plan wrote. ★ **And it flattens:** a thirteen-fold rise still
leaves 55 of 74 comebackers unshown. **No weight is proposed — the table is there for you to choose
from, and nothing was changed.**

**2 · What each shorter identifier would cost** —
[IDENTIFIER-LENGTH-1](../reports/night/IDENTIFIER-LENGTH-1.md). Re-measured: **3,487 / 3,715 /
4,008** characters at 4 / 20 / 40 racers. ★ **One field is four-fifths of it** — `effectiveRacerTypes`
is carried in full for every racer type whether the race uses it or not, while the config diff the
identifier exists to carry is **two characters** on a default machine. Carrying that field as a diff
instead would give **218 / 446 / 739 and cost nothing**; lossless compression gives ~1,494; a
server-stored key gives a handful but makes repeating a race need the server. ★ **And the opposite
direction is priced: carrying a track's SHAPE would add ~26,400 characters per track.** Nothing was
built and nothing is recommended.

**3 · The ceremony's cost table was wrong by a factor of forty** —
[GATE-COST-TRUTH-1](../reports/night/GATE-COST-TRUTH-1.md). It said a build, two servers and a
browser cost ~200 s before any race runs. **Measured with timestamps: 5.2 s — 2% setup, 98% racing.**
What makes extra races cheap is CONCURRENCY (six at a time), not setup. ★ **Four tracks would stay
bounded by the slowest race rather than doubling — that bound is measured, the four-track figure is
NOT, and no four-track run was made.** `GATE_TRACKS` untouched; widening the gate is still yours.

**4 · The server had no linter at all** — [SERVER-LINT-1](../reports/night/SERVER-LINT-1.md). Both
scripts built, reusing the CLIENT'S configuration and installing nothing, and wired into `verify`.
**It is red — see the second thing to know, above.** Not one line of server source was changed.

**5 · A player was told to run `docker compose up`** —
[PLAYER-WORDS-1](../reports/night/PLAYER-WORDS-1.md). Five search forms, uncapped: five sites, **one
reaches the player** — the setup screen's "Saved groups could not be loaded (…)" printed the
developer instruction verbatim. It now points at the status banner; the developer detail moved to
the console. The two Dev Screen strings were left alone, because developers read those.
**CANCEL RACE — built, and the premise was half wrong** — PLAYABLE-FOUR-1 piece B, on
`feat/playable-four-1`, UNMERGED. There is no `cancelRace` in the client (0 hits, every spelling),
but **a control that ends the race and returns to Setup already existed** in the race HUD. What it
did not do was leave **FULLSCREEN** — and this is the only screen with a control that can, so you
landed back on Setup in a fullscreen browser with no way out. Everything else the race sets up was
already released on unmount; the start path was read to establish that rather than guessed. One
control, one effect: no confirmation, no countdown, no undo, no shortcut. It is now called **Cancel
Race** while the race runs and **← Setup** once everyone is home — calling it "← Setup" always is
why the leak went unnoticed, because it read as navigation.

**THE SERVER IS GONE AND YOU ARE NOW TOLD** — piece C, UNMERGED. Every failure was already handled
and every one was announced **to the console**, so the screen looked exactly like a working one
while the track list was stale or empty. ★ **The offline FALLBACK was already in the tree** — the
track list falls back to its cache, the geometry to localStorage, the results to sessionStorage, the
built-in racers need nothing — so only the banner was built, and nothing was invented to fill the
piece. It never polls: it records what the app's own requests already found out. And **an HTTP
error means the server is THERE** — a 500 says so and does not claim it is down, which would send
you to restart a backend that is running.

**A RACE IDENTIFIER — built, and ONE DECISION IS YOURS** — piece D, UNMERGED. It encodes all nine
engine inputs exactly, so the same string is the same race on another machine — which a seed never
was, because the config came from whichever machine pressed Start. It REFUSES rather than guesses:
a foreign build, a damaged string, a track this device does not have. ★ **IT IS NOT TYPABLE:**
**210 characters for 4 racers, 450 for 20, 743 for 40.** The brief said not to make it lossy to
shorten it, so it is exact and it is a copy-and-paste value. **The options are laid out for you in
the report** — leave it copy-only, shorten it by keeping the payload on the server (which makes
repeating a race need the server), or a short form that refuses to exist when it would lie.

**★ THE CAMERA CATCHES THE RIGHT RACER AND THE WRONG MOMENT — measured, nothing changed** —
[COMEBACK-BEATS-1](../reports/night/COMEBACK-BEATS-1.md), on `feat/playable-four-1`, UNMERGED.
N=40, ten tracks x seeds 1-4, race plan ON, shipped defaults. The plan named **74 comebackers** and
wrote **215 beats**; the camera showed **11 comebacks**. **The subject is never wrong — 0 of 11 were
on a racer the plan had not named**, and it cannot be, because the cast REPLACES the candidate pool.
**The moment is always early: 11 of 11, a median 9.90 s before the beat where the authored climb
lands** — the camera catches the climb in flight and is never there for the arrival. **63 of 74
written comebackers were never shown at all; 29 of 40 races held no comeback shot.** The beats do
NOT die at the detector (a candidate existed in 40 of 40 races) nor for want of an offer window
(35 of 40): they lose the director's weighted contest, and across the 7,510 frames a named comeback
was live and offerable the camera was on BATTLE 34%, LEADER 21%, LEAD_CHANGE 13%. ★ **A method
finding came with it:** the shared harness hands the director a hard-coded `isOutcomePhase: false`
where the browser hands it the plan's own OUTCOME phase — 11 shots against 1, so the harness path
alone would have given a confident wrong answer. **The camera fingerprint is taken with that window
closed.** Recorded; nothing changed and nothing minted. **The decision is yours and the measurement
does not judge it.**

**★ CI was red on master from 2026-09-02 to 2026-09-05 — one cause, now fixed** —
CI-RED-3e6c0b87 *(that piece reported in the session and filed no report of its own; its findings
are re-established and superseded where they were wrong by
[CI-MERGE-RACE-1](../reports/evolution/CI-MERGE-RACE-1.md))*.
Last green push run: `1640fbdf` at 21:47 on 2026-09-02. First red: `f6e98767`, **twelve minutes
later** — the merge that added the first of two Rule B tests. **24 consecutive red push runs, same
job, same step, same two assertions.** `git commit-tree` refuses without an author identity; a
developer machine has one globally and a GitHub runner has none, so the tests were green for whoever
wrote them and red on every runner. The identity now travels with the test. **No guard disabled, no
exception, no allowlist widened.** Proved both ways with the identity suppressed: before, exactly the
two CI failures; after, 532/532.

**The ship gate is wired into `verify`, and the sheet now tells an accepted failure from a defect** —
[GATE-WIRED-AND-CAUSED-1](../reports/evolution/GATE-WIRED-AND-CAUSED-1.md).
`viewer-invariants.mjs` declared its routing to **nobody** — it matched no pattern in the collector,
so it was wired to no verify run, no CI job, no hook, no npm script. It now runs from
**`npm run verify -- --premerge`**, selected only when the flag is given **and** a declared path
changed, with the skip line naming whichever condition failed. **Measured: 337–369 s for two races,
running alone.** And `endgame-sheet.mjs` now computes the accepted cause **from the crossing frame** —
no track name, no seed, no list — printing **`ACC`** where the closing zoom had not arrived and
**`FAIL`** for anything else, on items 2 and 9. **Item 10 deliberately keeps a plain FAIL**, and a
test enforces it: its supposed acceptance was a sentence stripped of its attribution.

**The gate CHOOSES two tracks — it excludes nothing** (same report). `GATE_TRACKS` names
space-sprint and city-circuit; the harness keeps the geometries on that list. **There is no exclusion
list, no exception mechanism and no skip anywhere in that file.** Six sites that gave three tracks a
standing of their own are rewritten. Which tracks the gate runs did not change.

**Item 7 was failing on a grading artefact, not a picture defect** —
[ITEM7-MEMBERSHIP-1](../reports/evolution/ITEM7-MEMBERSHIP-1.md).
It graded `_abreastContenders`, whose fallback to the top two is a framing device and says nothing
about who can win. **It was never specific to dirt-oval** — the same artefact failed 10 races of 80
across four tracks. Item 7 now grades the racers who can still win and reads **0 of 80**.

**The battle sentence goes back to being a measurement** —
[ACCEPTED-FINISH-ATTRIBUTION-1](../reports/evolution/ACCEPTED-FINISH-ATTRIBUTION-1.md).
A second acceptance had been attributed to you — *"a battle shot may take the frame near the finish"*
— and you said that wording is not yours. It is a **measurement**, attributed to nobody. Behaviour
(i) is untouched. Recorded with it: **D27–D30**.

**Ten open items checked against the tree; one was already built** —
[OPEN-LIST-TRUTH-1](../reports/evolution/OPEN-LIST-TRUTH-1.md).
★ **Your closing-phase instruction of 2026-08-24 is IN THE TREE.** `CameraDirector.js:1663` forces
`LEADER_ZOOM` past the endgame threshold, bypassing the cooldown, with `LEAD_CHANGE` the only
exception — closed as **D32**. It lands at the running shot's next decision point, and its boundary
is the endgame threshold while the run-in begins composing earlier, which is why four different
phases were seen at the cut. The render-fingerprint count two records disagreed on is settled:
**three declared fields absent, two behaviours blind.** **D33** records three decisions of 2026-09-05.

**The merge race was investigated and NOTHING was built** —
[CI-MERGE-RACE-1](../reports/evolution/CI-MERGE-RACE-1.md).
The claim was "every merge has this window". **It is 1 merge in 28.** The window is real and measured
at ~13 s, and the single failure is the one merge whose sweep was delayed past it. The piece's own
gate stopped it before any change — a fix for a race that does not happen is worse than the mails.

**The ceremony now says what already works** — `docs/SHIP-CEREMONY.md` step 12. Followed in list
order the ceremony **could not** produce a green push run: CI reaches Rule B ~13 s after the push
while step 10 waits minutes. Step 12's wording now says the sweep happens **immediately after the
push in step 9**. Nothing moved, nothing renumbered — the numbers are load-bearing in five
`check-tags.mjs` sites.

**Everything the recent runs named and left is cleared** —
[LEFTOVERS-1](../reports/evolution/LEFTOVERS-1.md). Twelve stale code addresses in `docs/`, the two
remaining ship-order drifts, the two-lists-both-reach-12 trap, the `workflow_dispatch` caveat, the
three gaps between a green branch and a green CI, and the open list below.

---

## RUNNING

**Nothing.** Every sweep is finished and no measurement is in flight. The dev server is on
`night/2026-09-05`.

---

## OPEN

**Checked against the tree on 2026-09-05 before being listed. The full version with source addresses
is in [BACKLOG.md § WHAT IS ACTUALLY OPEN](BACKLOG.md); this is the short form.**

- ~~**Cancel Race**~~ — **DONE and MERGED.**
- ~~**TLH-3**~~ — **BANNER DONE and MERGED.** The fallback was already in the tree; `defaultTracks.js`
  still does not exist and was not created.
- ~~**A short race identifier to replace the seed**~~ — **BUILT and MERGED. One decision is still
  yours: it is not typable** — 4,008 characters at 40 racers, and piece 2 now prices every way of
  shortening it. The seed fixed the plan but not the world; that is closed.
- **The comeback BEATS reaching the camera** — **MEASURED (piece A above); the decision is now
  yours.** Passing the beats through was deliberately NOT built. What the measurement gives you: the
  camera never picks the wrong racer, and is early every single time by a median 9.90 s.
- **★ NEW, from piece A: the harness camera is not the browser camera for the comeback shot.** The
  shared driver hard-codes `isOutcomePhase: false`; only `camera-replay.mjs` does it the browser's
  way. **The camera fingerprint is taken with that window closed.** Nothing was changed — it is
  recorded so it is not re-discovered.
- **Deployment** — see NEEDS HIS WORD.
- **★ NEW, from the night: the server does not lint.** 9 errors across 7 files, 35 unformatted
  files. The guards are wired and `verify` is red on the night branch because of it. **A server-wide
  cleanup is its own decision and was not taken.**
- **★ NEW: `effectiveRacerTypes` is four-fifths of the race identifier**, carried in full whether the
  race uses it or not. Carrying it as a diff would cost nothing and cut 4,008 to 739.

**Struck above, and struck for a reason:** the three crossed-out items are BUILT and pushed, not
merged. They leave this list when you have looked at them and they land — not before.

**Not on this list, because the tree says they are done:** the item-7 gap — closed by
ITEM7-MEMBERSHIP-1, item 7 reads 0 of 80. The **closing-phase cut** — already built, D32. The
**deployed client's API address** — decided, D30 chose runtime resolution; the *build* is part of
deployment below. **The render fingerprint's blind spot** — minted on your order. **The missing
`routing.mjs` guard** — built, proved inert against the tree, and DELETED: `dataReach` already
guarantees the property by construction. **`lint` and `format:check` in `verify`** — both now run for
the client, and the server declares neither script, so there is nothing there to run.

---

## NEEDS HIS WORD

**One item — and one branch.**

★ **THE BRANCH FIRST: `feat/playable-four-1` is at origin, unmerged, and pieces B, C and D on it
change what you see.** They are built for your eye before anything lands. At the end of the chain
the dev server is put on that branch so you can look at all three without doing anything.

~~**MAY THE RENDER FINGERPRINT BE RE-MINTED?**~~ **ANSWERED — you ordered it, and it is minted.**
MINT-RENDER-1 re-measured the value on the tree master took before writing anything, and the other
three roles were re-measured in the same pass and are unmoved. The value lives in
[fingerprints.json](fingerprints.json) and nowhere else. What the mint did **not** close is written
beside it: text measurement in the recorder is synthetic, so the hash pins the tag-layout RULE and
not the name-versus-number count you actually see on screen.

**★ AND THREE THE NIGHT PUT IN FRONT OF YOU, each with its numbers and no recommendation:**

- **The comeback weight.** The table in [COMEBACK-WEIGHT-1](../reports/night/COMEBACK-WEIGHT-1.md)
  is there to choose from. What a comeback shot is worth against a battle shot is your eye's
  question — the measurement will not answer it, and it does not try.
- **The identifier's length.** [IDENTIFIER-LENGTH-1](../reports/night/IDENTIFIER-LENGTH-1.md) prices
  four ways down and one way up. The cheapest is free and cuts it by 80%.
- **Whether the server's 9 lint errors get cleaned up**, and when.

**And one question stands from before, and it is the one that was already here. Every other item that stood in
this section has been answered.**

1. **Deployment — a domain, which reverse proxy terminates TLS, and where the data lives.**
   **The server has no TLS at all** — searched for, not assumed — and that is a design decision
   rather than an omission: it sets `trust proxy` and issues `__Host-` Secure cookies, expecting a
   terminator in front. **D30 already chose HOW the client finds the API** (resolve at start time,
   so one image works at any address) **and that change is not built** — it is its own block, and it
   waits on these three answers.

**Answered since this sheet was last written, and struck for that reason:**
~~Does the acceptance reach gate item 2?~~ **D27 — yes**, and the sheet now says so itself.
~~Is 27 MB of `date-fns` worth it?~~ **D29 — it stays.**
~~What should the deployed client's API address be?~~ **D30 — resolved at start time.**
~~Does the closing phase end a battle shot too?~~ **D28 — yes**, and the premise it rested on was
withdrawn; the cut itself turned out to be **already in the tree** (D32).

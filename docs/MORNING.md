<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-09, after PIECE 2 of the 2026-09-08 chain. Pieces 3-6 follow.

**Where the code is.** Master is `c5e0cb8b` and carries the merged night of 2026-09-07.
`night/2026-09-08` is branched off it and pushed; it will NOT be merged — pieces 3 to 6 are
measurements and the decisions are yours. `night/2026-09-07` is merged and **deleted at origin**.

**★ THE ONE THING TO KNOW FIRST — CI IS RED ON MASTER, AND THE MERGE DID NOT CAUSE IT.**
The `c5e0cb8b` push run fails on the **security audit gate** in both trees: three HIGH
**production** advisories against `multer` (GHSA-wc9g-mqfw-jrwm, GHSA-qfvm-cv95-jqjf,
GHSA-535w-7cp7-47q4) and one HIGH dev-only against `js-yaml` (GHSA-2883-xcg3-v3hh). `fe4e111c` was
green earlier the same day and the scheduled audit passed on it, so these advisories were published
in between. **No code change can turn this green** — it is the known class where the per-push gate
reddens master on its own. Everything else in that run passed; "Living-doc guards + script tests"
is green. **Left for you**: bumping a production dependency is a shipped change, not a night task.

---

## TONIGHT'S CHAIN — 2026-09-08

### DONE

**PIECE 1 · The camera record now describes the product's picture, and the two guards that raced** —
merge `c5e0cb8b`.

*The mint* (`8ace43ec`, your decision of 2026-09-08). The camera fingerprint moved. **An instrument
correction, not a camera change**: `CameraDirector.js` is untouched by the branch, established by
diff. The harness handed the director a hard-coded "the outcome window is shut", so every camera
hash ever taken was measured with the race plan's OUTCOME window permanently closed. The browser
derives it from the plan, and that derivation was checked **at source** before the mint — same
signature, thresholds from one `plan._phases`, and the identical predicate the plan itself steers by.
**Four tracks move; six show ZERO differing frames.** On dirt-oval, ice-track and space-sprint the
game takes an **8.0 s COMEBACK_ZOOM** the instrument could not see. On city-circuit no comeback shot
is taken in either arm — a losing candidate in the pool re-rolls the closing stretch, which is a
different finding and is recorded as one. World, world-off and render were run in the same pass and
are **unmoved**. Values live in `docs/fingerprints.json`, which is their one home.
★ **Every camera figure older than that mint is not comparable across it on those four tracks.**

*The guard race* (`a0ee9585`). `check-image-starts` builds the image from a named `client` build
context while `check-client-build` runs vite, whose first act is to empty `client/dist` — and
`verify` ran up to 14 guards at once with nothing between them. **The root was a declaration that
did not describe what the guard reads**: the parser skips every `COPY --from=` line, so the one path
read outside the repo context was the one path never declared. **The window is ~0.3 s** — BuildKit
ingests the context at build START — which is why it read as flake and why one green run produced a
wrong diagnosis first time round. Fixed in three parts (declaration, `check-client-build` made
exclusive, and the consumer pulling in its producer). All three `--premerge` runs green from
`dist` present / absent / fresh.
★ **THE SABOTAGE DID NOT REPRODUCE — 4 of 4 passed with the fix reverted.** The mechanism is proven
on demand, but the exclusivity is **not** demonstrated to be what repaired the original 3-in-5
failure rate, and that rate stays unexplained. The fix is kept because it closes a real mechanism at
a cost of 2 seconds. **Reported, not claimed.**
★ **A SECOND DEFECT IS NAMED AND NOT FIXED**: `invalid file request dist/assets/racers/*` — BuildKit
rejecting a just-written file under parallel load, an adjacency this fix created. It passes in
isolation. Yours to decide.

**PIECE 2 · Branch for the night.** `night/2026-09-08` off `c5e0cb8b`, pushed.

### RUNNING

**PIECE 3 · Which release point.** Ten tracks, five release points (0.50-0.70), N=30 per cell as the
screen, with the corrected hold arm — held deep at rank 18, drawn for place 3. Smoke-checked before
launch: rank at release 16-19 and places 1,1,3,3,5, so the hold genuinely holds and these are not
races he led all along. **N is derived, not picked**: from the within-cell spread of the previous
run (sigma about 1.9 places), 57 races per cell resolve a one-place difference at 80% power, and
that is stage two — run only where the columns are too close to call.

### OPEN — pieces not yet started

**PIECE 4** the camera at the chosen release point · **PIECE 5** how wide the engine hull really is
· **PIECE 6** the render instrument's own outcome window, prepared and stopped at the fork.

### NEEDS HIS WORD

1. ★ **The `multer` advisories on master.** Three HIGH, production, and CI stays red until a
   dependency moves. Not a night task.
2. ★ **The release point** piece 3 chooses. It is chosen by your stated rule — when the numbers are
   similar, take the latest point — not recommended. Overrule it freely.
3. **The comeback camera key** (`comebackUseBeats`). Piece 4 turns it on **inside the measurement
   only**; its shipped default stays off.
4. **The render mint.** Piece 6 builds and measures the fix and stops. No minting permission given.
5. **The hull.** Piece 5 reports how far `engine-reach` under- or over-reports. Not fixed — a wrong
   widening costs every future run.
6. **`check-image-starts` still is not wired into CI**, and its own blind list says so.

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

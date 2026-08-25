# GARDEN-PATH-DEFAULTS-1 — beetle, and two laps

**Date:** 2026-08-25 · **Branch:** `feat/garden-path-defaults-1` (off `master` at `8834d7fc`) ·
**BUILT AND MINTED, NOT MERGED. His eye decides.**

**THE OWNER'S DECISION of 2026-08-25:** on `garden-path` the default racer becomes **BEETLE** and the
default lap count becomes **2**. He named the racer; nothing here chose it.

**`beetle` is a legal default on this track** — established at source, not assumed: garden-path's
`surfaceClasses` include `earth`, the beetle's own classes are `["asphalt","cobble","earth"]`, and
running the setup screen's exact filter (`filterRacerTypesForTrack` over
`listAllRacerTypes().filter(isActive)` with `getSurfaceClasses()`) returns a list containing
`beetle`. So the block proceeded rather than stopping.

---

## 1. THE DURATION TABLE — what the setup screen would state

The figures below are `meta.realizedDurationSec`, the same number the screen renders as
`closed-track-estimated-duration`. **The snail row cross-checks exactly against the live UI reading
GARDEN-PATH-NO-FINISH-1 took from the running app** (106 / 212 / 318 / 424), which is what makes the
beetle row trustworthy from the same method.

| racer | 1 lap | **2 laps** | 3 laps | **4 laps** |
| --- | --- | --- | --- | --- |
| **snail** — today | 106 s | 212 s | 318 s | **424 s ← today's default** |
| **beetle** — shipped here | 35 s | **71 s ← the new default** | 106 s | 141 s |

### Beside the other closed tracks, at each one's own defaults

| track | racer | laps | duration |
| --- | --- | --- | --- |
| searound | manta | 2 | 62 s |
| **garden-path — after this change** | **beetle** | **2** | **71 s** |
| ice-track | snowmobile | 2 | 74 s |
| city-circuit | motorbike | 2 | 78 s |
| dirt-oval | horse | 2 | 87 s |
| *garden-path — before this change* | *snail* | *4* | ***424 s*** |

**THIS IS THE THING TO LOOK AT BEFORE ANYTHING ELSE.** garden-path was **4.9× the longest** of the
other four closed tracks. After both changes it is **the second SHORTEST**, 16 s under dirt-oval. It
does not merely stop being an outlier — it crosses to the other side of the group.

**And the record still calls it a snail.** The icon is 🐌 and the description reads *"A leisurely (yet
surprisingly competitive) crawl through the roses."* **Neither was changed**, because the owner named
two changes and these are not among them — but a beetle track called a crawl is a loose end, and a
test now pins both so a later block cannot quietly tidy them.

---

## 2. WHAT EACH CHANGE CONTRIBUTES ON ITS OWN

**This is the section that matters if the combination goes too far.**

| | duration | × today | inside the harness's 200 s ceiling? |
| --- | --- | --- | --- |
| **TODAY** — snail, 4 laps | 424 s | ×1.00 | **NO** |
| **one change** — BEETLE, 4 laps | **141 s** | ×0.33 | **YES** |
| **one change** — snail, **2 LAPS** | 212 s | ×0.50 | **NO — still over, by 12 s** |
| **BOTH** — BEETLE, 2 LAPS | **71 s** | **×0.17** | **YES** |

**THE TWO CHANGES ARE NOT INTERCHANGEABLE, and only one of them is sufficient on its own.**

- **The racer change alone does the work.** Beetle at the track's existing 4 laps gives **141 s** —
  comfortably finishing, and still **the longest closed track by a clear margin** (dirt-oval 87 s).
  If the owner wants garden-path to keep being *the long one* while still being watchable, **this is
  the single change that delivers it.**
- **The lap change alone does not.** Snail at 2 laps is **212 s** — it halves the race and still does
  not fit the ceiling, because the snail is what makes the track slow.
- **Together they take it to 71 s**, roughly a **sixth** of today, and past the other closed tracks.

**Nothing here argues against his decision.** Both changes are shipped exactly as he gave them. This
table exists so that, if the shot no longer reads as his track, he can see at a glance that **dropping
the lap change and keeping the beetle** returns a 141-second race without reopening the question.

---

## 3. WHAT WAS CHANGED, AND WHERE

**TWO LINES, ONE FILE.**

```
server/seeds/tracks/garden-path.json
-  "defaultRacerTypeId": "snail",     +  "defaultRacerTypeId": "beetle",
-  "defaultLaps": 4                   +  "defaultLaps": 2
```

**THAT IS THE ONE PLACE THAT OWNS THESE VALUES, established rather than assumed.** `.gitignore` says
it outright — *"server/data is a pure runtime dir (gitignored). Shipped defaults live in
`server/seeds/`"* — and `client/src/modules/storage/defaults.js` holds camera and world CONFIG KEYS,
not per-track records; it contains no garden-path value of any kind. **No new key was added**:
`defaultLaps` is the field `trackDefaultLaps` reads first, and the other four closed seeds already
carry it at 2. **No other track was touched.**

**THE OWNER'S LIVE RECORD WAS ALSO UPDATED, and it is NOT part of the diff.**
`server/data/tracks/garden-path.json` is his instance's runtime copy, gitignored, and it had drifted:
it still carried the **legacy** `defaultDuration: 120` with no `defaultLaps` at all, so his data dir
predates the seed's move to the modern field. It was brought to the same shape as the seed —
`defaultRacerTypeId: "beetle"`, `defaultLaps: 2`, legacy field removed — **because the eye-test would
otherwise have shown him the old track.** The pre-change copy is at `c:/tmp/garden-path-live-before.json`.
**This is the one thing in this block that touches state outside git, and it is said out loud rather
than left to be discovered.**

---

## 4. THE TESTS, AND THEIR SABOTAGES

`scripts/track-defaults.test.mjs`, six tests, run by `script-suite`. They live in the script suite
because what shipped is a **track record**, and only a node test can read the shipped file.

| the test | its sabotage |
| --- | --- |
| garden-path ships BEETLE | the record as it was, asserted not to satisfy it |
| garden-path ships 2 laps, **through `trackDefaultLaps`** rather than the raw field | `defaultLaps: 4` resolves to 4; and the **legacy** route (`defaultDuration: 120`, no `defaultLaps`) also resolves to 4 — the exact shape his live record had |
| BEETLE is genuinely selectable here | strip `earth` from the track's surface classes and the beetle disappears from the filtered list |
| **no other track is touched** — nine tracks asserted by name | `dirt-oval` asserted not to be beetle |
| garden-path is no longer the outlier; **and the icon/description are pinned unchanged** | every closed seed asserted at 2 laps; the legacy field asserted absent |
| an explicit racer or lap count still overrides | 1, 3 and 4 laps each resolve to themselves and not to 2; the snail is asserted **still choosable** on his own track |

**THE SABOTAGE WAS RUN, NOT ONLY WRITTEN.** Reverting the two shipped lines and re-running:

```
✖ garden-path ships BEETLE as its default racer
✖ garden-path ships a DEFAULT LAP COUNT of 2 …
✔ BEETLE is actually selectable on garden-path …
✔ NO OTHER TRACK is touched …
✖ garden-path is no longer the outlier it was …
✖ an explicitly chosen racer or lap count still overrides the default
```

**Four of six go red; two stay green — and the two that stay green are exactly the two that should.**
Beetle's selectability and the other nine tracks do not depend on garden-path's own default, so a
test of them passing under the sabotage is the test being honest about its own scope. Restoring the
two lines returns **6 of 6**.

---

## 5. FINGERPRINTS — all four moved, all four expected, all four re-minted

| role | recorded before | **now** | verdict |
| --- | --- | --- | --- |
| **world** | `dc4647be0f55ebdb` | **`bc01b74fd4f3cfc8`** | **MOVED — expected** |
| **world-off** | `854018ee5d3d83e1` | **`daf78ff18eca83c6`** | **MOVED — expected** |
| camera | `0434cd0385eacc7b` | **`c6033c1f5c4d67f2`** | **MOVED — expected** |
| render | `57b2eb101d806b22` | **`1f55627fe213a31c`** | **MOVED — expected** |

**WHY ALL FOUR, AND WHY THAT IS RIGHT.** Every one of the four instruments runs **all ten tracks at
each track's own defaults**. Changing which racer one track defaults to changes the RACE there (world
and world-off), the director's view of that race (camera), and the frames drawn from it (render). A
change of this shape that moved only some of them would be the surprising outcome.

**THIS IS A MINT, AND IT IS STATED PLAINLY.** All four roles in
[docs/fingerprints.json](../../docs/fingerprints.json) were re-minted **on the branch
`feat/garden-path-defaults-1`, unmerged**, from the tree carrying the two-line seed change.
`mintedOn` names the **parent** commit `8834d7fc` and the entry says so; **it must be corrected to the
merge commit if and when he merges.** Nothing was minted quietly: the values are above, the reason is
here, and the branch is not merged.

**AND `verify`'s ROUTING SKIPPED ALL FOUR — which is a finding, not a convenience.** It selected six
guards and skipped eighteen, the fingerprints among them. The cause is structural: **the instruments
read `server/data/tracks` (gitignored runtime state) via `loadTracks()`, while the shipped change is
in `server/seeds/tracks`**, so routing has no path from the changed file to the instrument that
measures it. **Every one of the four was therefore run by hand**, and the record now says so. §8
proposes the repair.

| guard | result |
| --- | --- |
| `check-hooks-installed` · `check-language-closed` · `check-writable` · `fingerprint-containment` · `script-suite` | **PASS** |
| `server-suite` | **PASS on re-run — a load flake, evidenced below** |
| the four fingerprints | **SKIPPED by routing; run by hand — §5** |

**THE `server-suite` FAILURE WAS CHASED, NOT WAVED PAST.** It failed three times and **on a different
test each time** — `sessionInvalidation`, then `usersStore` hashPassword/verifyPassword, then
`recoverAdmin` promote — every one a **password-hashing test timing out at 5000 ms**. Password hashing
is deliberately CPU-expensive; the machine was running a preview server, an e2e instance and a
fingerprint sweep. Each failing file passes alone, and the whole `src/auth/` suite passes 276/276.
**A track record cannot reach password hashing**, and the failures do not reproduce on a quiet
machine. Recorded as a pre-existing flake, with its evidence, rather than as a pass.

---

## 6. DOES GARDEN-PATH NOW FINISH INSIDE THE HARNESS CEILING?

**Yes — and it is a consequence, not the purpose.** At beetle and 2 laps the race is **71 s** against
the harness's 200 s ceiling, so `scripts/lib/raceDriver.mjs` will now run it to a finishing order and
garden-path can appear in sweeps for the first time.

**THE HARNESS'S OWN DEFECTS ARE UNFIXED AND STAY NAMED.** Nothing here touched the ceiling or the
hardcoded lap count, as instructed:

- **The 200 s ceiling is still a stuck-race backstop that fires on healthy input.** It has simply
  stopped biting on the one track that exceeded it. A slower racer or a longer closed track would
  put another track over it and the symptom would again be silence.
- **`laps: shape.isOpen ? 1 : 2` is still hardcoded** — and this change makes it *accidentally*
  correct for garden-path, where it was wrong before. That is luck, not a repair: the harness still
  ignores `trackDefaultLaps` and would be wrong again on any track whose default is not 2.
- **The loud-failure rule for empty sweep cells is still not built**, per instruction. It remains the
  owner's open item and the single thing that would make the next silence audible.

---

## 7. SOURCE HYGIENE

**THE SHIPPED DIFF IS TWO LINES.** Everything else is a report, an INDEX line, a test file, one
read-only diagnostic, and the fingerprint record.

**A first reconstruction of the surface-class filter was WRONG and was discarded rather than
believed.** It returned an empty selectable list — which would have implied even the snail was not
selectable on its own track, an obviously false answer. The cause was calling `listRacerTypes()` and
reading `config.surfaceClasses` instead of the setup screen's actual `listAllRacerTypes().filter(isActive)`
and `getSurfaceClasses()`. **The real call site was used instead**, and the test now pins it. Recorded
because a diagnostic that quietly agrees with a wrong reconstruction is the failure this project
keeps meeting.

**Machine:** `os.cpus().length` = **14 logical cores**. **No worker pool was used and none was
needed** — the duration table is arithmetic over ten track records and the fingerprints are
single-process instruments.

**A `git stash` used to compare against master left a duplicate entry** after `pop` reported an error
while having already restored the files. It was verified byte-identical to the working tree before
being dropped, and the working tree was re-checked field by field afterwards. Noted because a stash
that looks applied and is still listed is exactly how a change gets committed twice or not at all.

---

## 8. BUILD VS SPEC — conformity

| the spec asked | status |
| --- | --- |
| (a) both changes, in the one place that owns them | **done** — two lines in `server/seeds/tracks/garden-path.json`; §3 establishes why that is the one place |
| (a) no second copy, no new key, no other track | **done** — `defaultLaps` already existed and the other four closed seeds already carry it; nine tracks asserted untouched by test |
| (a) establish at source that `beetle` is valid here, or STOP | **done** — the setup screen's own filter, run; `earth` is the class that admits it |
| (b) the resulting duration at 1–4 laps, beside today and beside the other closed tracks | **done** — §1, and the snail row cross-checks against the live UI reading |
| (c) what each change contributes on its own | **done** — §2: **the racer change alone is sufficient; the lap change alone is not** |
| do not touch the harness, its ceiling, or its 2-lap assumption | **done** — untouched, and all three still named in §6 |
| say whether it now finishes inside the ceiling as a CONSEQUENCE | **done** — §6, yes, and framed as a side effect |
| do not add the loud-failure rule | **done** — not added; named as still open |
| world and world-off EXPECTED to move; report as expected; do not re-mint quietly | **done** — §5, both moved, both stated with the reason |
| camera and render may follow; say so | **done** — both moved |
| let `verify`'s routing decide; report every value against the record | **done** — §5, **and routing SKIPPED the fingerprints; that is reported as a finding** |
| this is a mint: state which stamps, on what tree | **done** — §5: all four roles, on the branch, from the tree carrying the seed change, `mintedOn` = parent `8834d7fc` |
| tests: default racer, default laps, other tracks untouched, overrides still work | **done** — §4, six tests |
| prove each can fail by sabotage and record the sabotages | **done** — §4, the sabotage was **run**: four of six go red, and the two that stay green are the two that should |
| dev server on this branch as a production build; report the badge | **done** — §9 |
| DO NOT MERGE; push the branch | **done** |
| report, INDEX in the same commit, duration table FIRST, per-change breakdown, tests, fingerprints, hygiene, conformity, proposals | **this document** |

**What this block did NOT do, and owes at merge time.** The ship ceremony's merge steps —
the paired fairness measurement, the REBASELINE top block, the tag — are not done here, because this
does not merge. **They are owed by whoever merges it**, and the fairness gate in particular now has
something new to say: garden-path becomes measurable for the first time, so the pooled gate will
include a tenth track it has never seen.

---

## 9. HAND-OFF

**THE DEV SERVER IS RUNNING THIS BRANCH AS A PRODUCTION BUILD.**

| | |
| --- | --- |
| where | **`http://localhost:4173`** — serving, confirmed |
| API | `http://localhost:4000`, already up |
| **the badge** | **`d73ec6a9`** · branch `feat/garden-path-defaults-1` · **`dirty: false`** |

A real production bundle (`vite build`, then `vite preview`), not the dev server: the identity is read
once at build time and ships with the bundle, so it cannot go stale under him (BUILD-TRUTH-1).
**`dirty: false` means the bundle was built from a clean tree at exactly the commit this report names.**

**THIS REPLACES THE EARLIER EYE-TEST BUILD.** `feat/runin-level-set-1` was on 4173 for
RUNIN-LEVEL-SET-BUILD-1; that branch is pushed and unmerged and can be rebuilt whenever he wants it
back. **Two things are now waiting on his eye and only one can be served at a time.**

**WHAT HE IS JUDGING: does garden-path still feel like the track he designed?** It was his long, slow
one by authorship — the snail, the 🐌 icon, "a leisurely crawl through the roses". These two changes
together take it from 424 s to **71 s**, from **4.9× the longest** closed track to the **second
shortest**. Nothing measured here can tell him whether that is still his track.

**If it is not, §2 is the answer he needs:** the **beetle alone, at the existing 4 laps, gives 141 s**
— finishing, watchable, and still clearly the longest of the closed tracks. That is one line back, not
a reopened question.

---

## 10. PROPOSALS — none ordered

**1. The routing gap is worth more than this track.** (Mine.) §5: `verify` skipped all four
fingerprints for a change that moved all four, because the instruments read the gitignored
`server/data/` while the shipped record lives in `server/seeds/`. **Any future track edit — a new
track, a changed default, a geometry tweak — has the same blind spot**, and the symptom is a green
verify on a tree whose world has moved. The instruments could read `server/seeds/` when no data dir
is present, or routing could map `server/seeds/tracks/**` into their closures. **Cost: none to the
picture; it is a routing table and an instrument's source of truth.**

**2. The icon and the description should follow the racer, or deliberately not.** (Mine.) The track
is now a beetle track called *"a leisurely crawl through the roses"* under a 🐌. Neither was in his
two changes so neither was touched, and a test pins them — but it is a loose end that will read as an
oversight to the next person. **Cost: two strings, and his word on whether the snail is the track's
identity or just its old default.**

**3. His live data dir had drifted from the shipped seed, and nothing notices.** His record carried
the legacy `defaultDuration` where the seed had moved to `defaultLaps` — so his instance had been
running a *different* default lap count from a fresh install for as long as that seed field has
existed. **A guard comparing each live track record against its seed, reporting differences rather
than enforcing them**, would have caught it. **Cost: one guard; it must REPORT and never overwrite,
because a live record is allowed to differ once he edits a track.**

**4. `trackDefaultLaps` should be the harness's answer too.** Named here rather than built, since the
harness is out of scope: `laps: shape.isOpen ? 1 : 2` is now accidentally right for garden-path and
still structurally wrong. **Cost: it moves the camera and render fingerprints, so it is a ship, not a
tidy-up.**

**5. The fairness gate has a tenth track to meet.** garden-path has never been measurable, so no
fairness figure this project holds includes it. When it is merged it enters the pooled gate for the
first time — with a 198-px road, a closed shape and, now, a mid-pack racer. **That is a new input to
a gate whose thresholds were set without it**, and it should be run before the merge rather than
discovered by it.

**6. 71 s may be the wrong end of the range even if the direction is right.** (Mine.) The owner asked
for two changes and got them; the measurement says they overshoot the group he was an outlier from —
he lands second shortest rather than in the middle. **Beetle at 3 laps is 106 s**, which would sit
just above dirt-oval's 87 s and keep him the longest without being five times so. **Not proposed as a
correction** — he named 2 — but it is the number he would want if "still the long one" turns out to
matter more than "no longer the outlier".

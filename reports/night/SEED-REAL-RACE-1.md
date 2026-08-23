# SEED-REAL-RACE-1 — a real race gets a real seed

**Block:** PIECE 2 of the chain of 2026-08-23-B. **Branch:** `feat/race-seed` off master `e69af154`.
**Owner decision it builds:** `docs/BACKLOG.md` PART TWO **D23**.

**NOT MERGED. It waits for his eye**, and nothing here is minted.

---

## 1. What it does

Until today the normal **"Start Race"** path wrote `racePlanSeed: 0` — the unseeded value — so **no
race the owner watched was reproducible, including the ones he judged.** Quick Test had drawn a seed
since July.

- **A normal race draws a seed**, through the module Quick Test already uses. An empty field draws
  one fresh seed per race, before the race exists, so the race stays a pure function of it. A typed
  number fixes the race. `0` cannot be reached from the field.
- **He can read it off without hunting.** It is shown on the **Result screen** beside track and time
  — the screen he already looks at after every race — and the race HUD's existing seed pill now
  carries a real number on this path instead of `unseeded`.
- **It is stored with the race, and the storage outlives the session.** The race-history entry
  (localStorage, kept for 100 races) gains the seed, so it is in the record he already keeps and in
  the CSV that record exports. Separately, the seed the **last** race ran with is written under its
  own key, and the setup panel offers it back as *"Last race: N — run it again"*.
- **A typed seed still wins**, on every start, so two races in a row are the same race.

**His flow works end to end:** start a normal race, read the seed off the result screen (or come back
and read "Last race"), close the browser, return, press *run it again*, start — the same race.

---

## 2. The two design forks, and the conservative option taken at each

**FORK 1 — adopt the Quick-Test model, or invent one for the normal path?** The brief said adopt, and
that is what happened: `resolveQuickTestSeed` / `sanitizeQuickTestSeedInput` serve both paths
unchanged. Two sets of semantics for the same idea would have drifted the first time one of them was
fixed.

**FORK 2 — rename `quickTestSeed.js` to `raceSeed.js`, since the name now under-describes it?**
**No, and the reason is in the file's header so it is not re-proposed.** The path is quoted as an
ADDRESS in the append-only lab journal — `reports/parity/DIVERGENCE-AUDIT.md` cites it with line
numbers, `reports/parity/STEP-ORDER-ARC.md` names it — and those reports are never rewritten. A
rename trades a stale name here for a broken address there.

**FORK 3 — what happens to a stored race with no seed?** **The fallback is 0 = unseeded, and it is
never back-filled.** A race stored before today keeps its old meaning and loads exactly as it did.
Giving it a fresh seed would hand it a number that reproduces a *different* race, which is a worse
lie than "not reproducible" — so the result screen and the history entry both test `> 0` rather than
`!= null`, and a legacy race is shown as having no seed rather than as "Seed 0".

---

## 3. Two storage keys, because they answer two different questions

| key | holds | why it is not the other one |
| --- | --- | --- |
| `racearena:raceSeed` | what the operator TYPED into the field | Empty is a real state ("draw"), so the key is REMOVED rather than set to `''` |
| `racearena:lastRaceSeed` | the seed the last race actually RAN with | A DRAWN seed is deliberately never written back into the field — otherwise every later race would replay the first draw — so without this key a drawn seed would have no record at all |

**Both are `localStorage`, and that is the change rather than a detail of it.** The brief named
`sessionStorage` as the thing to fix (item 15), and his case — watch a race, close the browser, come
back, re-run it — is precisely what a session store cannot serve.

---

## 4. Tests, and the sabotage that proves each can fail

`client/src/screens/SetupScreen/raceSeed.test.jsx` — **13 tests, all green.** The four properties the
brief asked for, each with the sabotage that turns it red:

| property | sabotage | result |
| --- | --- | --- |
| a started race carries a seed | put the literal `racePlanSeed: 0` back | **RED** — see the table below |
| an explicitly given seed wins | ignore the field and always draw | **RED** |
| the seed outlives the session | persist the field in `sessionStorage` | **RED** |
| a race stored before this change still loads | make `validateActiveRace` require the key | **RED** |

**THE SABOTAGE RUN WAS TAKEN TWICE, AND THE FIRST ATTEMPT WAS INVALID — recorded because the failure
mode is easy to repeat and hard to see.** The first script reverted each sabotage with
`git checkout -- <file>`, which restores the file from HEAD. The implementation was not committed
yet, so the first revert discarded the implementation itself, and every later "sabotage" was applied
to a file that no longer had the feature in it. Four runs went red and **only the first one meant
anything.** The run below is taken against the COMMITTED implementation, so each revert restores the
feature rather than removing it, and the control run at the end proves the tree came back green.

**The valid run.** Control green, five sabotages red, control green again. Every revert is a
`git checkout` against a COMMITTED implementation, and each sabotage asserts its own anchor is
present before it edits — a sabotage that silently fails to apply is the failure this table exists to
rule out.

| | what was broken | result |
| --- | --- | --- |
| control | nothing — the committed tree | **13 passed** |
| S1 | `racePlanSeed: startSeed` → the literal `0` again | **8 failed** / 5 passed |
| S2 | resolve the seed from `''` instead of the field, so a typed value is ignored | **2 failed** / 11 passed |
| S3 | persist the seed field in `sessionStorage` instead of `localStorage` | **1 failed** / 12 passed |
| S4 | `validateActiveRace` requires `racePlanSeed`, so a legacy race is rejected | **1 failed** / 12 passed |
| S5 | draw the last-race record's seed separately from the race's | **2 failed** / 11 passed |
| control | reverted | **13 passed** |

**S3 and S4 fail ONE test each, and that is the intended shape rather than thin cover.** Each of
those properties has exactly one thing that can be wrong with it — where the value is written, and
whether an absent key is fatal — so one assertion is what R7 asks for. S1 fails eight because a
missing seed invalidates almost everything downstream of it, which is the correct blast radius for
removing the feature entirely.

**WHAT IS DELIBERATELY NOT TESTED HERE (R7).** *"The same seed reproduces the same race"* is a
property of the ENGINE, not of the start screen, and it is already held byte-identically across a
600-identity soak by the golden parity harness plus `RaceScreen/seedDeterminism.test.js`. What this
path owes is that the seed ARRIVES. The one new way this change could lie about reproducibility is
the race and the last-race record disagreeing about which number was drawn — so that is asserted
directly, and nothing else is duplicated.

---

## 5. Verification, and what the fingerprints did

Routing was left to decide, as instructed.

**`npm run verify -- --jobs=1` — PASS 17 · FAIL 0 · SKIP 7.**

**ALL THREE FINGERPRINTS WERE RUN, AND NONE MOVED.** The brief warned that a
drawn seed on a path that had a constant is new behaviour and that a fingerprint fed by the default
config *may* move; it did not, and the reason is worth stating rather than treating as luck.

| instrument | why it ran | value | against the record |
| --- | --- | --- | --- |
| `world-fingerprint` | `client/src/modules/storage/storage.js` is inside the engine's import closure — the pre-commit reach check named it, and routing agreed | `COMBINED dc4647be0f55ebdb` | **unmoved** |
| `camera-fingerprint` | same closure, 38 declared files | `CAMERA 0434cd0385eacc7b` | **unmoved** |
| `render-fingerprint` | same closure, 58 declared files | `RENDER 57b2eb101d806b22` | **unmoved** |
| `client-suite` | `client/` changed | 4186 passed, 217 files | green |

*(Every value in this table comes from the one `--jobs=1` run quoted above — R16.)*

**WHY NOTHING MOVED, and it is structural rather than fortunate.** The three fingerprint harnesses
drive the engine directly: they build an identity, hand it a seed of their own (`seed=1` for the
world, `seed=5601` for camera and render) and step it. **None of them goes through `SetupScreen`**,
so the value that used to be a constant there was never one of their inputs. What this diff added to
the engine's closure is a pair of `KEYS` entries — two string constants in a registry — and a string
constant nothing reads at race time cannot move a hash. **The reach check was still right to fire:**
that file *is* reachable, and "reachable but inert" is a conclusion a measurement is allowed to
reach, not one a reader should have to assume.

**Nothing was minted.** No value in `docs/fingerprints.json` is touched, and none needed to be.

**R15e — the skips.** Seven guards skipped, each printed with its own reason by `verify` itself:
`check-ending-frame`, `check-runin-frame` and `check-standings-invariant` (nothing in their declared
directories changed), `check-fingerprint-payload` and `check-tags` (no change in their closure),
`script-suite` and `server-suite` (nothing under `scripts/` or `server/`). The 80-race acceptance
sheet did not run: **R15a's condition is a fingerprint MOVING, and none did** — but note its second
condition, *before a build the owner is going to judge*, and see §7.

**The concurrency note from PIECE 1 applies again and is why `--jobs=1` is not decoration.** A fully
concurrent run of this same tree is competing three heavy instruments against a 200-second jsdom
suite on one machine; PIECE 1 lost three tests to 5-second timeouts that way, all of which pass in
isolation. That is D9's watch pattern, and R15a already says the heavy measurements run alone.

**R15e — what was skipped and what determined its answer:** see the routing block quoted in the
verify section; `npm run verify` prints every skip with its reason, and this report does not
paraphrase them.

---

## 6. What was NOT touched

- **No race dynamics, no camera, no other stored value.** The only value this piece adds to the race
  payload is the seed that used to be the constant `0`.
- **The HUD pill was not changed.** It already prints `seed:N` when the race plan is on; what changed
  is that N is now non-zero on this path. Leaving the drawing code alone is also why the render
  fingerprint had no reason to move.
- **The third browser-seed follow-up — replaying a browser seed in the sim — is untouched** and stays
  open exactly as written.
- **Nothing is minted and nothing is merged.**

# WHATS-LEFT-1 — six items, of which TWO remove a fault class and four are instances; the list is short and that is the answer

> **READ-ONLY. Nothing edited.** Built by reading `docs/MORNING.md` and `docs/BACKLOG.md` as they
> stand after the eight-piece chain, and **re-verifying every item at the tree tonight** rather than
> trusting the report that filed it. Items needing a new judgement from the owner are listed
> separately at §3 and are NOT on the list.

---

## 0. THE LIST IS SHORT, AND THAT IS THE FINDING

**Six items.** Two remove a fault class; four are instance repairs of falsehoods this chain measured
and deliberately did not fix. **There is no third class-removing item**, and I did not invent one:
every remaining candidate either needs the owner's word (§3) or has already been established as
uncatchable (PATTERN-CATCHABILITY-1's S4 and S5, RULE-A-REACH-1's open-ended set).

**The two class-removing items are both BUILDS, not sweeps**, and both have a verified precondition:
each would land green today, with no exception list and no value changed.

---

## 1. THE LIST, SORTED BY WHAT REMOVES A FAULT CLASS

### ★ 1 — A rule comparing the racer registry to the PNG artwork

**What:** inside `check-fallback-agreement` (which already loads the racer registry for Rule A), assert
for every racer type that `frameWidth × frameCount === pngWidth` and `frameHeight === pngHeight`,
reading the PNG's IHDR directly.

**Why it is first.** **A spritesheet is a race input with no machine-readable other side.** No guard
declares `client/public/`; the five client tests that mention `assets/racers` all assert a URL
*string*; the render fingerprint's own blind list says node has no `Image`, so the sprite blit never
happens. **That agreement has been verified BY HAND twice — CENSUS-DUPES-1 group A2, and again
tonight — and by a machine never.**

**The exposure is not theoretical.** Tonight a stray shell expansion ran `crop-sprite-sheets.mjs`; it
overwrote **nine tracked artwork files**, printed `Verification: OK — no border clipping` for each,
and **nothing in this repository would have gone red.** This rule is the thing that would have.

**Precondition MEASURED tonight:** `20 agree, 0 disagree, 0 unresolvable (of 20)`. It lands green,
with no exception list and no judgement — it asserts an agreement that already holds.

**Cost:** ~30 lines in a guard that already exists (R13 satisfied, no new script). The PNG side is a
24-byte header read — `scripts/lib/pngFrame.mjs` is an *encoder* and does not help, so this is three
lines of `readUInt32BE`, not a dependency.

**It also closes the other half of RULE-A-REACH-1's finding:** Rule A covers group A2's *copies* and
not group A2's *source of truth*. This is that half.

---

### ★ 2 — Make `DynamicsTuningSection`'s tooltips READ their values instead of typing them

**What:** convert its typed value claims to the interpolated form the camera card already uses —
`Currently: ${config.x ?? DEFAULT_X.x}` — and fix the two that are false while doing it.

**Why it is second: it removes the MECHANISM, not the instances.** CONTROL-CLAIMS-1 measured:

| | `CameraAdvancedSection` | `DynamicsTuningSection` |
| --- | --- | --- |
| tooltips interpolating the live value | **24** | **0** |
| false value claims found tonight | **0** | **6** |

**A tooltip that reads the value it describes cannot drift.** One card in this repository already
proves the form works; the other has never used it and carries every defect. **This is the rare case
where the fix is structural and needs no guard** — which matters, because CONTROL-CLAIMS-1 also
established that a guard here is not buildable: a value claim has four spellings, and *"2000 was the
calmest value on the measurement; 1200 is what your eye asked for"* contains a shipped value and a
measurement with no mechanical way to separate them.

**Still false today, both re-verified tonight:** `DynamicsTuningSection.jsx:831` and `:881` say
**"Default: 67%"** where the keys ship **0.75** and **0.55**. The second is wrong twice —
`PHASE-CONTRACT` records `racePlanCorridorStart` as overwritten at plan build and never reaching a
live race.

**No value changes**, so no fingerprint is in reach.

---

### ★ 3 — The seven live second sites this chain FILED and did not fix

**Why it is third, and not lower.** It is an instance sweep, not a class removal. But
SECOND-SITES-2's whole finding is that **a filed second site stays standing** — five of five of
SECOND-SITES-1's claim groups were still live a day after it filed them, and it filed them because it
was read-only. **Leaving them again is the exact behaviour both nights measured.**

Re-confirmed at the tree tonight, with line numbers:

| site | says | truth |
| --- | --- | --- |
| `docs/TAGS.md:1221`, `:1294` | *"the **current** world `dc4647be0f55ebdb`"* | the current world is `8a1977187e9c99b4` |
| `docs/VERIFY-RULES.md:509` | the browser suite *"is **103/103 green**"* | `docs/NIGHT-RUN.md` says **106**, in another file |
| `docs/TRACK_EDITOR.md:129`, `:135` | `defaultTracks.js` as a live fallback | `ARCHITECTURE.md` says it *"does not exist"*; `TRACK_LIFECYCLE.md` says *"neither … exists today"* |
| `scripts/lib/raceDriver.mjs:122` | `corridor-truth --company-only` | that flag is `his-shot-truth`'s; R16 was corrected for this on 2026-09-02 |
| `docs/BACKLOG.md:654` | *"Do not add `prune` to the ship ceremony — it already fails here"* | **PRUNE-STEP-1 added it on 2026-09-02** after proving the condition gone |

**The `VERIFY-RULES` / `NIGHT-RUN` pair is the whole class in miniature:** one document carries the
correction, another carries the claim, and neither knows about the other.

---

### 4 — The four withdrawn claims in `reports/evolution/INDEX.md`'s own report summaries

`INDEX.md` states *"7 of 12 names collide"* (`:4917`), *"0 of 8 non-exempt names overlap"* (`:4935`),
*"still yields zero names"* (`:5030`) and *"the camera moves 0.1 world px at the gun"* (`:3887`) as
present-tense fact — **thousands of lines below the corrections block, in the same file, that
withdraws each one.** The corrections block exists because reports are append-only; the INDEX's own
summaries are not reports, and nothing corrected them.

**No judgement needed: the correcting text is already in the file, forty lines from the top.**

---

### 5 — Three open BACKLOG checkboxes whose own verdict says ALREADY DONE

Each verified at the tree tonight, not taken from the verdict:

| entry | verdict's claim | checked |
| --- | --- | --- |
| `:3818` *"two files still document the flag that commit removed"* | closed by GATE-SERIAL-BCRYPT-1 | `server/package.json`'s `test` is `vitest run`; both `verify.mjs:257` and `ci.yml:187` carry corrected comments |
| `:3861` *"a shipped track change still reaches nobody"* | closed by SEED-REDELIVERY-1 | — |
| `:3905` *"garden-path still wears the snail"* | closed by GARDEN-PATH-BEETLE-SKIN-1 | the seed's icon is **🪲** and its description reads *"…scuttle through the roses"* |

**The judgement was made on 2026-09-02 with source verification; the checkbox simply never moved.**

**Not on the list, and it looked like it should be:** `:3958` *"A Dev Screen change does not reach a
running race"* carries its own `verify:` command, and running it tonight returns
`const [cameraConfig] = useState(() => loadCameraConfig());` — **no setter. Correctly open.** A first
pass mis-attributed a neighbouring verdict to it; the command settled it.

---

### 6 — Delete one false sentence `camera-fingerprint.mjs` prints on every run

> *"garden-path does not finish inside the 200 s ceiling, so it has no ending to sample."*

Hardcoded, unconditional, and printed **two lines below its own computed "10 of 10 tracks contributed
FINISHED frames"** and three below `garden-path … (300 after the last crossing)`.

**Deleting the sentence needs no judgement. TIGHTENING THE GATE IT JUSTIFIES DOES**, and that half is
at §3.

---

## 2. WHY THE TOP THREE ARE ON TOP

1. **The registry↔PNG rule is first because it is the only item that covers something covered by
   nothing at all.** Every other item repairs a statement; this one puts a check where there has
   never been one, on an input the product actually renders. And its exposure was demonstrated
   tonight rather than argued.
2. **The tooltip interpolation is second because it removes a producer rather than a product.** Six
   defects came out of one card tonight; converting it means the seventh cannot happen. The
   neighbouring card is the existence proof, so this is adopting a convention the repository already
   keeps, not inventing one.
3. **The seven filed second sites are third because leaving them is the measured failure.** They are
   instance repairs and rank below a class removal — but they were filed, dated, and left, twice, and
   SECOND-SITES-2 exists because that is what happens to a filed second site.

---

## 3. NOT ON THE LIST — these need a new judgement, and are the owner's

- **`crop-sprite-sheets.mjs`'s spent list** — delete the twelve entries, delete the script, or add a
  refusal. Three of the four options are destructive or new mechanisms.
- **Whether `choreoOutcomeStart` may be tuned above 0.60** — needs a fairness measurement first.
- **Tightening `camera-fingerprint`'s gate from "at least one track" to "every track"** — changes
  when the build goes red.
- **The citation convention** (symbol instead of line) — PROPOSED ONLY by CITATIONS-1; 113 citations
  convertible with review and **137 needing a human**.
- **The `renderedBodyH` test's tolerance** — choosing acceptable drift in a race input.
- **Closing `BACKLOG.md`'s "Garden Path does not finish"** — the premise is now measured false, but
  closing a backlog entry is a verdict, not a search.
- **Deleting `client/e2e/garden-path-finishes.spec.js`** — two reports recommend it; deleting a test
  is still his.

---

## Limits

**This list is bounded by what the chain looked at.** It was built from `MORNING.md` and
`BACKLOG.md`, not from a fresh census of the tree. **An item nobody has filed is not on it**, and
RULE-A-REACH-1's finding — that the uncovered set is open-ended outside the racer registry — applies
to this list too.

**"Needs no new judgement" is itself a judgement.** I placed the spec deletion and the backlog
closure in §3 because both change something a person authored; someone else would say two reports
recommending a deletion IS the judgement, and would move them onto the list.

**Items 3, 4 and 5 are fourteen line-level repairs between them.** That is a night's tail-end work,
not a piece — and doing them as one batch of hand edits is the shape this chain has twice named as
the thing that produces the next defect. **They should be done with the same discipline as any other
correction: verified individually, swept individually.**

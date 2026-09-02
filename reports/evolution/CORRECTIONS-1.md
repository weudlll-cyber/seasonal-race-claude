# CORRECTIONS-1 — 34 of the ninety applied, 0 refuted, and the second-site sweep found 5 more plus a product defect

> **Every one verified at the tree before it was applied.** DOC-TRUTH-2's proposed text was treated as
> a draft, not an authority: each claim was re-checked against the code, the command, or the config
> module that settles it. `verify` **PASS 15 FAIL 0** throughout; nothing minted.

---

## THE THREE NUMBERS THE BRIEF ASKED FOR

| | |
| --- | --- |
| **applied** | **34** |
| **refuted on verification** | **0** — but two needed relocating, and one proposal was superseded |
| **second sites found** | **5**, all live, none previously filed — **plus one product defect** |

**Fifty-six of the ninety remain unapplied**, and they are named in §5 rather than left implied.

---

## 1. WHAT WAS APPLIED, BY CLASS

### Values a document copied from `defaults.js` (10)

**The dangerous class, and the guard is not looking at it.** `check-config-claims` exists to stop a
document copying a config value; its own declared blind spot is *"config objects other than the CAMERA
one"*. **Every wrong value found is in another object**, which is how four of them sat in
`FORCE-MAP.md` for 63 days under a header promising that file *"states STRUCTURE, never values"*.

| what it said | what is true | stale for |
| --- | --- | --- |
| `reRollVariationPercent` **58**, `reRollTransitionDuration` **5.0**, `reRollIntervalDivisor` **15**, `reRollLastPositionPercent` **80** | **75 / 3.0 / 10 / 95** | 63 days |
| `racePlanCorridorEnd` **0.95** | **1.0** — and `PHASE-CONTRACT` had it right, so the two disagreed | 68 days |
| `choreoOutcomeStart` **0.5**, at **four sites in two documents** | **0.6** | 47 days |
| `preOverlapFreeLane` **false**, at three sites incl. a dead-mechanisms table | **the key exists nowhere** | 66 days |

**Where the value WAS the claim, no new number replaces it** — the line now points at `defaults.js`.
That is what `FORCE-MAP`'s own header already promises, and the only form that cannot rot again.

### Things that do not exist (9)

`defaultClasses.js` (**never existed on any branch**, twice), `surface-effects/index.js` (never),
`surface-effects/surfaceClassApi.js` (never — it is under `services/`),
`racer-types/canvasUtils.js` (never), `priorityModeOverlay.js` (deleted 2026-06-28, twice),
`racerTypeStorage.js` + its `racearena:racerTypes` key (removed 2026-06-18, in two documents),
`computeBereichsBonusMap` (nowhere — and German, which the language rule forbids),
`physicalYToPx` (removed 2026-06-28).

**Every absence was proved against a control** that returns something: `surface-effects/` really holds
`defaults.js` and `registry.js`; `createTrajectoryController` really is in `raceCore.js`;
`storage.js` really has 27 `racearena:` keys.

### Documents contradicting themselves or each other (4)

- **`ENDING-PHASES.md`** said *"the ~2.9 s figure is UNVERIFIED — see the note under the phase
  table"*, while that note, **at `:198` of the same document**, says the figure *"was wrong"* and gives
  the measurement. The commit that wrote the correcting note did not update its own back-reference —
  15 days of a document disagreeing with itself.
- **`BACKLOG.md`** said ROADMAP *"is a phase-status table"* while **line 3 of the same file** says it
  is a redirect owning nothing.
- `FORCE-MAP` vs `PHASE-CONTRACT` on `racePlanCorridorEnd`, and on which value
  `governorPhaseWeight` fades to — one said **1.0 (no effect)**, the other **exactly 0**.
  `raceGovernor.js:95` returns **0.0**; a scale factor of 1.0 is not "no effect".

### Counts, commands and shapes (11)

`/api/health`'s response gained `build` and the table did not follow; React Router **v6 → v7**;
ROADMAP described as *"a table"* when it is a 31-line redirect; the manual `docker build` command
built the wrong context; the image described as **"not standalone … closing that is separate work"**
when both missing pieces are `COPY`ed in and I ran it with no mounts at all; R1's **19 / 103**
closure figures; *"the two suite guards"* when there are three; *"why ONE generator is named
individually"* when two are.

---

## 2. ★ THE SECOND-SITE SWEEP — 5 found, and every one was invisible to the census

For each correction, the whole tree was searched uncapped, code comments included.

| the correction | its second site | why no report had it |
| --- | --- | --- |
| ROADMAP is "a table" (`README`) | **`BACKLOG.md:813`** | a different file, contradicting its own line 3 |
| R1's "19 files" closure count | **`client/src/modules/autoSpriteScale.js:54`** — a **code comment** | outside both censuses' declared 34-**document** scope |
| `choreoOutcomeStart` 0.5 (`FORCE-MAP`) | **`PHASE-CONTRACT.md`, three sites** | filed as a separate document's finding, not as one claim |
| `defaultClasses.js` (`ARCHITECTURE:82`) | **`ARCHITECTURE:821`** | same file, 739 lines apart |
| `physicalYToPx` (invariant #2) | **`ARCHITECTURE:285`** | DOC-TRUTH-2 filed `:285` and `:309` as ONE finding and **only `:309` was repaired last night** — the exact defect SECOND-SITES-1 measured at 52% |

**Ruled out, with controls, because a null result needs one:** `AUTH.md:175` lists `GET /api/health`
but states no response shape; `docker-compose.yml:45` says the context *"was `./server`"*, correct
history; three test files naming "19 files" all do so as history, and two exist to say the count must
be **derived, never typed**; `BACKLOG.md:1031`'s "0.5" is a per-frame cap, a different number.

---

## 3. ★ A PRODUCT DEFECT THE SWEEP TURNED UP, AND I DID NOT TOUCH IT

Correcting `choreoOutcomeStart`'s value led to the control that sets it.
`client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx:1233-1237`:

```js
label: 'PULK end / OUTCOME begins (0.25–0.55)',
min: 0.25,
max: 0.55,
tip: "… 0.5 = shipped.",
```

**The shipped value is 0.6 — outside the slider's own maximum.** An operator opening that card sees a
control that cannot reach where the game actually runs, beside a tip naming a value that is not
shipped.

**Not corrected, deliberately.** Changing a control's range is a product judgement and a new one.
Correcting only the label would put *"0.6 = shipped"* beside a slider stopping at 0.55, which is worse
than the inconsistency. **On the morning sheet.**

---

## 4. NOTHING WAS REFUTED, BUT TWO PROPOSALS NEEDED WORK

**Zero of the 34 turned out to be wrong on verification** — DOC-TRUTH-2's evidence held everywhere it
was checked. Two needed adjusting rather than accepting:

- **`API.md:97`** — the line number had drifted; the claim was real and is at `:106`. **Relocated, not
  trusted.**
- **`PROJECT-PRINCIPLES.md:86`** — DOC-TRUTH-2 proposed replacing a superseded fingerprint with the
  current one. **Already applied last night as a POINTER instead**, because a corrected copy rots at
  the next mint. The proposal was right about the defect and wrong about the repair.

---

## 5. WHAT REMAINS — 56, and they are not equally worth doing

**Line-number drift is the bulk of it: ~54 sites** across `FORCE-MAP` (27 + 5),
`PHASE-CONTRACT` (22). Every one points at the wrong line in a file that has grown. **They are false
claims and they are the lowest-value ones**: each correction requires verifying a new line number that
will drift again, and the underlying repair is structural — the citations want a symbol name, not a
line. **Deliberately not done as a batch of 54 hand edits**; that is how a repair becomes the next
defect, which is this chain's own lesson.

**Still worth doing, and not done:** `docs/README.md`'s claim to list **every** maintained document
(six living documents appear nowhere in it); `ROADMAP.md`'s "eleven documents link here" (**never
true**; it is 4 files / 5 links); `ARCHITECTURE`'s DevScreen "10 sections" (16), the `BATTLE_ZOOM`
key named `…Px` when it is a lap fraction `…T`, and the `stateRatio` block naming a symbol that
exists nowhere; `CAMERA_DIRECTOR`'s five call-signature claims; `SIM.md`'s `client/tmp` default and
its reference to a tag that no longer exists.

---

## Limits

**34 of 90 is a third, and the third was chosen by value, not by order.** Values, existence claims and
self-contradictions first; line numbers last. That ordering is a judgement and someone else might
rank it differently.

**Every correction here names what it was and what made it false**, which makes the documents longer.
That is deliberate — a corrected sentence that hides its own movement is how the next reader repeats
the mistake — but it is a cost, and a reader who wants only the current truth now reads past more.

**The second-site sweep is only as good as the phrasings I searched.** I searched by claim rather than
by string, but a claim worded in a way I did not anticipate would not have been found. **5 is a floor,
not a total.**

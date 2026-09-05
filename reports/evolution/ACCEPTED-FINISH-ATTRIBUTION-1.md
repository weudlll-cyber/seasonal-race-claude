# ACCEPTED-FINISH-ATTRIBUTION-1 — one attribution corrected, four decisions recorded

**Date:** 2026-09-05. Branch `fix/accepted-finish-attribution-1` off master `6953722d`.

**COMMENTS, PRINTED TEXT AND DOCUMENTS ONLY.** No logic, no threshold, no default, no gate exclusion,
no camera behaviour. **Nothing minted** — text cannot move a fingerprint, and `engine-reach` selects
nothing.

---

## 1. The correction

ACCEPTED-FINISH-1 (2026-09-04) recorded a **measured** cause for item 10's failure — a `BATTLE_ZOOM`
in the endgame window holds the leader forward — and elsewhere in the same document stated it as a
**behaviour the owner accepted**. On 2026-09-05 he said that wording is not his. The sentence goes
back to being what it is: a measurement.

**Behaviour (i) is unchanged and was not reworded:** the closing zoom need not have arrived by the
crossing.

**No substitute was put in place.** "He accepted the photo finish instead" would be the same mistake
with another noun. Each site now says in one line that **what he accepted beyond behaviour (i) is not
established**, and stops.

### Sites corrected

| file | site | what it said | what it says now |
| --- | --- | --- | --- |
| `endgame-sheet.mjs` | head block | "TWO BEHAVIOURS … ARE ACCEPTED", listing (ii) a battle shot | **ONE** accepted behaviour, (i) only, plus a dated note recording what was removed and why |
| `endgame-sheet.mjs` | "names a cause and not an item" | "a blanket *9 and 10 may fail*" | "a blanket *9 may fail*" |
| `endgame-sheet.mjs` | item 10's cause lines | "ACCEPTED CAUSE: a `BATTLE_ZOOM` in the window" | "**MEASURED CAUSE, attributed to nobody**", naming ACCEPTED-FINISH-1's 16 races, and stating that whether such a fail is a defect is **not settled** |
| `endgame-sheet.mjs` | the `R.i10` comment | "NOT a defect … the owner's accepted behaviour (ii)" | the same measurement, with the defect question left open |
| `endgame-sheet.mjs` | the printed `console.log` | "9 and 10 encode an ideal the owner CONSIDERED AND REJECTED … a battle shot may take the frame" | 9 alone encodes that ideal; 10's usual cause is printed as **measured, not accepted** |
| `viewer-invariants.mjs` | the acceptance paragraph | "the closing zoom … **and a battle shot may take the frame near the finish**" | behaviour (i) only, plus a dated correction paragraph |
| `viewer-invariants.mjs` | the three per-track exclusion entries | "the two accepted items", "NOT one of the two he named" | reworded to one accepted item, and to D27 for item 2 |

### Two sites re-verified and deliberately left

- **`viewer-invariants.mjs:181`** — *"Item 10 fails when a `BATTLE_ZOOM` sits in the endgame window: a
  battle shot frames the battle, so the leader is held forward"*. **Already a measurement with no
  attribution.** It was on the piece's site list; re-reading it showed nothing to correct.
- **`viewer-invariants.mjs:782`** — *"if a battle or a comeback shot runs after 95%, his rule applies
  to it there like any other"*. **About his RULE, not the acceptance**, so the correction does not
  touch it — and **D28 below makes it more right, not less.**

**A search of both files for every remaining "battle shot" and "behaviour (ii)" finishes the list:**
the only survivors are the two correction notes themselves (which quote the removed wording on
purpose) and two plain measurement statements.

**No test asserts the old printed wording** — searched across the tree before editing.

---

## 2. The four decisions of 2026-09-05, recorded as D27–D30

Filed in `docs/BACKLOG.md`'s decision register, which is their canonical home. **None is acted on.**

| | decision | recorded where | what was NOT done |
| --- | --- | --- | --- |
| **D27** | the acceptance of 2026-09-04 **reaches gate item 2** | D27, beside item 2 in `endgame-sheet.mjs`, and in the `GATE_TRACKS` comment | **no exclusion changed.** luger-hill and dirt-oval are excluded on item 2 alone, so both now rest entirely on accepted behaviour — recorded, not taken |
| **D28** | the closing phase **will end a `BATTLE_ZOOM` too** | D28, and in the backlog's closing-phase section with CLOSING-CUT-1's measured fact beside it | **nothing built.** Nothing in `CameraDirector.js` ends a running phase at that boundary today; the rebuild is its own block |
| **D29** | **`date-fns` stays**; the 27.1 MB is accepted | D29 | nothing removed, no dependency changed, no Dockerfile line written |
| **D30** | the deployed client's API address moves **from build time to start time** | D30, marking DEPLOY-NOTES §2's options **A and B closed** and **C chosen** | **nothing built**; it is its own block |

**The measured fact recorded with D28**, from CLOSING-CUT-1 (ten tracks, seed 9, one race each):
**four camera phases occur at the cut** — `LEADER_ZOOM` 4, `OVERVIEW` 3, `LEAD_CHANGE` 2,
`BATTLE_ZOOM` 1, ten of ten — and **`PHOTO_FINISH` is not among them.**

### ⚠ One decision could not be recorded where the piece asked

**D30's stated home, `docs/DEPLOY-NOTES.md`, does not exist on master.** It was written on the night
of 2026-09-04 and lives on the **unmerged** `night/2026-09-04` branch, along with the CLOSING-CUT-1
and IMAGE-DATE-FNS-1 reports that D28 and D29 rest on.

**What was done instead:** the decision is filed in the register, which is its proper home anyway, and
**D30 states that §2 of that document should point at D30 rather than restate it when that branch
merges.** The three reports are **named rather than linked**, so no relative link dangles on master —
`check-doc-links` reports 0 dangling.

---

## 3. Source hygiene

| file | before | after | what changed |
| --- | --- | --- | --- |
| `scripts/endgame-sheet.mjs` | 322 | 340 | +18 net. Comments and one printed string; **no computation touched** |
| `scripts/viewer-invariants.mjs` | 1,023 | 1,044 | +21 net. Comments only; **`GATE_TRACKS` itself is byte-identical** |
| `docs/BACKLOG.md` | 4,156 | 4,271 | +115. D27–D30 (102 lines) and the closing-phase note (13) |

`git diff --stat` against `6953722d`: **202 insertions, 48 deletions, 3 files.**

**Nothing was removed** except the wording being corrected, and it is quoted in place at both
correction notes so a later reader can see exactly what was struck.

**Noticed and deliberately left:**

- `viewer-invariants.mjs:186` — *"The two behaviours are picture questions and went to the owner."*
  Historical and accurate: two questions did go to him. Not an attribution of an acceptance.
- The `night/2026-09-04` branch's own copies of these two files carry the same corrected passages'
  ancestors plus that night's additions. **This branch is off master, so a merge of both will touch
  both files** — the changes are in different regions and should merge cleanly, but it is named here
  rather than discovered.

**`node scripts/engine-reach.mjs --check scripts/endgame-sheet.mjs scripts/viewer-invariants.mjs docs/BACKLOG.md`**, verbatim:

```
ENGINE REACH: none of 3 path(s) carry a change that can reach the race engine.
  3 outside the hull (cannot reach the engine at all): scripts/endgame-sheet.mjs, scripts/viewer-invariants.mjs, docs/BACKLOG.md
```

**No fingerprint can move** — the change is comments, one printed string, and a document.

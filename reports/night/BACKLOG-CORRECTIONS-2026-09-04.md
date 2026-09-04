# BACKLOG-CORRECTIONS-2026-09-04 — three document corrections, each established at source first

**Block:** PIECE K of the night chain of 2026-09-04. Branch `night/2026-09-04`, off master `6953722d`.

**Nothing in the picture, the race, a default or a threshold moved. No fingerprint was minted.**
Reports are append-only and none was edited; only living documents were corrected. No backlog section
was opened, nothing was re-ordered, nothing was deleted — one entry moved between PART ONE and PART
TWO and that is all.

---

## K1 · Player Group Selection was unbuilt on 2026-09-02 and shipped on 2026-09-03

**The claim to check.** `docs/BACKLOG.md` PART ONE carried *"### 2 — Player Group Selection 🔜
PRIORITY 1 after Camera Phase"* with a verdict dated 2026-09-02: *"unbuilt. `SetupScreen.jsx` consumes
an ACTIVE_GROUP handed to it by the Dev Panel (`:139-146`) and has no 'which group races?' filter."*

**Verified at source, all three parts of the piece's test:**

| | what the tree says |
| --- | --- |
| **the picker** | `client/src/screens/SetupScreen/PlayerGroupPicker.jsx`, 198 lines, header dated 2026-09-03, project tag PLAYER-GROUPS-1. **Mounted** at `client/src/screens/SetupScreen/SetupScreen.jsx:803` — it is not an orphan. |
| **multiple groups** | `addGroup` appends a group's players to the roster; `removeGroup` takes back exactly the ones it put there; which groups are "on" is DERIVED from the roster (`new Set(players.map(p => p.group))`) rather than owned by the component. Any number can be in the field at once. Its header states the before-state the verdict described: previously "only ONE could reach a race, through a one-shot hand-off key (`KEYS.ACTIVE_GROUP`)". |
| **the refusal of an oversized field** | `addGroup` returns without adding when `players.length + incoming.length > maxPlayers`, and says by how many. That is REFUSE-OVERSIZED-1, the owner's decision of **2026-09-04**, and the comment records why truncation was rejected: the dropped names were the tail of an order shown on no screen. |

**And the verdict's own evidence is gone:** `git grep ACTIVE_GROUP` finds it in `storage.js`, the Dev
Screen's `PlayerGroupsManager` and their tests — **not in `SetupScreen.jsx` at all.**

**Shipped by** `aea89b22` *feat(PLAYER-GROUPS-1)* (2026-09-03), with `210697d1` (REFUSE-OVERSIZED-1),
`648fd223` (DROP-RACER-NUMBER-1) and `a4e38b54` (CHIP-CONTRAST-1) the same day. All are ancestors of
`master` (`git merge-base --is-ancestor`). **So the verdict was true when written and was overtaken
the next day.**

**What was done.** The entry moved whole from PART ONE's *"Hot — next PR"* to PART TWO's mirrored
section of the same name, headed `✅ SHIPPED 2026-09-03`, with the source-established account above
and the original entry preserved verbatim inside a `<details>`.

**★ AND ONE THING THAT DID NOT HOLD, named rather than covered by the tick mark.** The entry asked for
a **filter** — *"selection filter 'Which group races?'"* — and what shipped is **additive selection**:
picking a group *fills* the roster, it does not *narrow* a field. For both use cases the entry lists
(one group per tournament round; an ad-hoc mixed field) additive selection does the same work and
more, which is presumably why it was built that way. If the filter reading was the wanted one, that
is a fresh entry, not this one. It is recorded in the moved entry.

---

## K2 · Gate item 2 still measures accepted behaviour under a different name — TRUE, and now stated once

**The claim to check.** That gate item 2 measures the owner's accepted target behaviour under a
different name, and that luger-hill's exclusion hangs on it.

**Verified at source, both ends:**

- `scripts/endgame-sheet.mjs:98-103`, the sheet's own words: *"ITEM 2 MEASURES BEHAVIOUR (i)
  DIRECTLY — it asks whether the shot is at one of the director's two named factors AT THE CROSSING,
  and 'the closing zoom has not arrived yet' is precisely how that question gets the answer no. His
  acceptance names two behaviours and two items; item 2 was not among them… it is left to him whether
  the acceptance formally reaches it."*
- The acceptance itself, at the same file's head: behaviour **(i)** is *"THE CLOSING ZOOM NEED NOT
  HAVE ARRIVED by the moment the leader crosses"*, and the two items named are **9 and 10**.
- Item 9's ACCEPTED CAUSE, same file: *"the camera is still on the `level` binding with the
  photo-finish zoom in flight"*. **That is the same event item 2 fails on.**
- `scripts/viewer-invariants.mjs` — luger-hill: *"item 2 ONLY, and item 2 is NOT one of the two he
  named"*; dirt-oval, corrected 2026-09-04 by ITEM7-MEMBERSHIP-1: *"DIRT-OVAL'S EXCLUSION NOW RESTS
  ON ITEM 2 ALONE — the same standing as luger-hill."*

**So: still true, and it now covers TWO of the three excluded tracks, not one.**

**What was done.** The `GATE_TRACKS` comment gained one block stating the doubling plainly — that
items 2 and 9 measure the same behaviour under different names, that the acceptance reaches 9 and 10
but not 2, and that luger-hill and dirt-oval are excluded on item 2 alone and on nothing else. It was
already derivable from three scattered per-track entries; it is now said once.

**NO EXCLUSION WAS CHANGED, and the comment says none may be changed on this observation.** Whether
the acceptance formally reaches item 2 is his word and has not been given, and widening the gate
would still make it red on day one for behaviour he has accepted — the trap GATE-GARDEN-PATH-1
avoided.

**NEEDS HIS WORD:** does the acceptance of 2026-09-04 reach item 2? If yes, luger-hill's and
dirt-oval's exclusions lose their last reason on the same day.

---

## K3 · The `--tracks=all` silent zero, added as the next occurrence

Added to the existing entry *"A SWEEP CELL THAT ASKS FOR 60 RACES AND RETURNS 0 STILL PRINTS A NUMBER
AND EXITS CLEAN"* — the class entry from the night of 2026-08-25 — rather than as a new item.

**The date:** 2026-09-04. **What it cost, re-measured tonight rather than taken from the account:**
the run exits **0** in **43 s** and prints *"Every frame of every race swept satisfied all five
invariants. PASS"*. It does not merely fail to answer; it answers PASS over zero races. The mechanism
and the guard are [SILENT-ZERO-TRACKS-1](SILENT-ZERO-TRACKS-1.md).

**Why it belongs on that entry and not as a new one, stated in the entry:** it is the same class and
a *different instance* — this one loses the races before any race is driven, so `runRace`'s return
value, which the parent entry is about, could not have caught it either.

---

## Source hygiene

| file | before | after | what changed |
| --- | --- | --- | --- |
| `docs/BACKLOG.md` | 4,156 | 4,202 | `git diff --stat` against `6953722d`: **73 insertions, 27 deletions**. K1 removed 26 lines from PART ONE and inserted 56 into PART TWO (the entry, plus the source-established account; the original text is carried across verbatim, which is why the two counts do not cancel). K3 added 11 lines to the existing silent-zero entry, later extended by 5 when the re-measurement replaced the inherited figure. One blank line was collapsed where the entry had been. |
| `scripts/viewer-invariants.mjs` | *(see [SILENT-ZERO-TRACKS-1](SILENT-ZERO-TRACKS-1.md))* | | K2: +23, one comment block above `GATE_TRACKS`. No code. |

**Nothing was deleted.** The moved entry keeps its full original text including its superseded
verdict, per PART TWO's own rule that a struck claim with its cause is what stops the same proposal
arriving again.

No scratch file entered the repository; the move was performed by a script in `C:/tmp` with
assertions that the block carried its verdict and had not swallowed a neighbouring entry.

`node scripts/engine-reach.mjs --check docs/BACKLOG.md docs/MORNING.md scripts/viewer-invariants.mjs`,
verbatim:

```
ENGINE REACH: none of 3 path(s) carry a change that can reach the race engine.
  3 outside the hull (cannot reach the engine at all): scripts/viewer-invariants.mjs, docs/BACKLOG.md, docs/MORNING.md
```

# MAX-FIELD-1 — it was never a disagreement: three different limits and one dead key, wearing names close enough to look like four answers

> **The question B3 asked has a clean answer.** They are not the same fact in four places. They are
> **one field cap (in two values), one storage limit, one soft recommendation that has never fired,
> and one key nothing reads.**
>
> **No limit's VALUE moved.** All four fingerprints unmoved.
>
> ★ **And Rule F caught my own edit within hours of shipping.** §5.

---

## 1. WHAT EACH ACTUALLY GOVERNS

| | value | governs | kind |
| --- | --- | --- | --- |
| `maxPlayersClosed` / `maxPlayersOpen` | 40 / 100 | how many racers **one race** may hold | **HARD — the only field cap there is.** Two values because a closed track's lap geometry holds fewer than an open track's length |
| `SAVED_GROUP_MAX_NAMES` *(was `PLAYER_MAX`)* | 200 | how many names a **saved group** may hold | HARD, a **storage** limit. A group of 200 may be saved; whether it fits a race is a different question |
| `track.maxRacers` | — | a per-track **recommendation** | **SOFT**, and **`null` on every shipped track**, so it has never fired once |
| ~~`maxPlayers`~~ | ~~20~~ | **nothing. Read by no code at all** | **removed** |

**So the four numbers were never four answers to one question.** They were three different questions
and one dead key, named closely enough that a reader had to open four files to learn they did not
conflict.

---

## 2. THE DEAD KEY, ESTABLISHED RATHER THAN ASSUMED

`DEFAULT_RACE_DEFAULTS.maxPlayers = 20` was read by **nothing**. Searched uncapped across `client/`,
`server/`, `scripts/` and `shared/`: every other `maxPlayers` in the tree is a **local variable or a
prop of that name** — `PlayerGroupsManager` reads `maxPlayersOpen`, `PlayerSetup` and
`PlayerGroupPicker` take it as a prop, and `SetupScreen` passes the track's cap at both call sites.

**It survived because it LOOKED like the field cap and sat between two keys that are.** A reader
counting "the maximum field size" found three numbers where there are two.

**A fourth lookalike went with it:** `PlayerSetup`'s `maxPlayers = 20` **default parameter**, which no
production caller ever reached. The prop is required now. A magic 20 in a signature is a number that
looks like a limit and is not one.

---

## 3. THE RENAME, AND THE RECONCILIATION THAT WOULD HAVE BEEN WRONG

`PLAYER_MAX` → `SAVED_GROUP_MAX_NAMES`. Three lines, one file, and the comment says why: **beside
`maxPlayersClosed` it read as a third opinion about the same thing.**

**The tempting move was to reconcile.** Four numbers, pick one, give it a home. **That would have
capped saved groups at 40 or fields at 200** — and either would have been a real defect introduced
in the name of tidiness.

> **Do not reconcile limits that are not the same fact.** The work is establishing what each governs,
> and then saying so in its name.

That is **R20**, written into `VERIFY-RULES.md`. It has **no guard and could not easily have one** —
*"do these two names describe the same thing"* is a question about meaning — so it is enforced at
review time, by whoever adds the fifth number.

---

## 4. A2 WAS READING THE RIGHT ONE

The refusal built earlier tonight reads `effectiveMaxPlayers`, which is
`maxPlayersOpen ?? DEFAULT` / `maxPlayersClosed ?? DEFAULT` — **the authoritative field cap.**

**No finding.** REFUSE-OVERSIZED-1's own Limits section flagged this as an open question against B3's
answer; the answer is that it was correct.

---

## 5. ★ RULE F CAUGHT MY OWN EDIT, HOURS AFTER IT SHIPPED

Removing one key from `defaults.js` shifted every line below it — and two paired citations in
`FORCE-MAP.md` pointed below it:

```
FAIL: RULE F — 2 citation(s) name a symbol their file does not contain.
    docs/FORCE-MAP.md: cites `defaults.js` → `endgameThreshold` at L313-L316, and
      endgameThreshold is NOT in those lines (it IS elsewhere in the file — the LINK
      points somewhere else)
    docs/FORCE-MAP.md: cites `defaults.js` → `leadChangeDebounceMs` at L375-L376, …
```

**This is exactly the drift the paired form was built for**, caught on the night the form shipped, on
a change that had nothing to do with citations and by someone who was not thinking about them. Both
re-anchored (L322-L325, L382-L383).

**Under the old bare form neither would have been noticed** — both symbols are still in the file.

---

## 6. ★ A TEST THAT REQUIRES ITS SUBJECT TO BE COMMITTED, IN A REPO THAT VERIFIES BEFORE COMMITTING

`engine-reach.test.mjs` has a test whose comment describes this exact trap and whose fix does not
close it:

> *"`--base=HEAD` IS LOAD-BEARING … Without a base, `--check` reads the WORKING TREE … so
> `defaults.js` counts as CHANGED on any branch that legitimately edits a default."*

**`--base=HEAD` only helps once the edit is committed.** With `defaults.js` edited and unstaged, it is
changed *against HEAD too*, the tool answers 0, and the assertion reads that as a regression. The
test went red on this branch and **green the moment the same content was committed, nothing else
touched** — `PASS 19 FAIL 1` → `PASS 20 FAIL 0`.

**Not fixed here.** It is a gating instrument and the fix is a design question — probably pinning to
the merge-base rather than to HEAD. **Filed for the morning sheet.** The practical cost today is that
a branch editing a default cannot get a clean `verify` until it commits, which inverts the project's
own order.

---

## Limits

**"Read by nothing" is a text search over four trees.** A dynamically-built key access would be
invisible to it; none exists in this code and the key is now gone, so a later reader gets a loud
`undefined` rather than a quiet 20.

**`track.maxRacers` was checked on two tracks, not ten.** Both are `null`; the claim that it has never
fired rests on that plus `showCapacityWarn` requiring a non-null value. **A track file could carry
one** and this did not enumerate all ten.

**No VALUE moved and that was the constraint.** 40, 100 and 200 are exactly what they were. The only
number that disappeared is one nothing read.

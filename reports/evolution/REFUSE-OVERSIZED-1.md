# REFUSE-OVERSIZED-1 — a group that does not fit is refused whole, and the field can no longer reach the start line over the cap by ANY route

> **His decision, 2026-09-04, option (b).** Truncation told the host how many were cut and gave them
> no way to learn which; he would rather be told it does not fit and choose himself.
>
> ★ **The refusal at the picker was not enough, and the reason is the finding.** Two routes reach an
> over-cap field without misusing any control, and neither goes through the picker. §3.
>
> **All four fingerprints unmoved. 134 tests green.** `verify --base=master`: **PASS 15 FAIL 0.**

---

## 1. WHAT TRUNCATION WAS, AND WHY THE COUNT WAS USELESS

```js
const admitted = room > 0 ? incoming.slice(0, room) : [];
```

The names that went were **the tail of the group's saved order after de-duplication**. That order is
on no screen: the chip shows a name and a count, the roster shows only who arrived, and the field
was renumbered afterwards. So *"7 did not fit"* was **true and unusable** — the host knew the size of
the loss and nothing about its shape.

**Now the group is refused whole**, and the message is at the moment of selection:

> ⚠️ **"Reds" does not fit.** It would put 47 racers in the field and this track allows 40. Nothing
> was added — remove 7 from the field, or clear a group, and try again.

---

## 2. THE FOUR DECISION RULES, EACH ANSWERED

| the rule | what was built |
| --- | --- |
| **a selection over the cap cannot be started, and says so AT SELECTION, not at launch** | the picker refuses at the click; **and** `canStart` gains the cap, because the picker cannot see every route (§3) |
| **the message names the NUMBERS, not individuals** | how many the selection would hold, how many the track allows, how many to remove. A test asserts the notice contains **no player name** — naming who would be cut is the truncation defect wearing a better coat, since it is still the screen deciding |
| **two groups that each fit but together exceed the cap follow the same rule** | the second is refused; **the first stands untouched**. The way out is deselecting either one, and the notice clears when it is acted on |
| **deselecting must always work** | `removeGroup` has no guard and never refuses. It is the way out of every refusal, so a guard on it — however reasonable-looking — would strand a host inside a field they cannot shrink. Said at the implementation, not only here |
| **hand-typed names under "All" are untouched** | as by every other group operation; pinned by its own test |

---

## 3. ★ THE PICKER CANNOT GUARD THE ONLY DOOR, AND THAT IS WHY START CHECKS TOO

Refusing at the picker looks sufficient: the Add button has always stopped at the cap, so an over-cap
field ought to be unreachable. **It is not. Two routes reach it and neither misuses a control:**

1. **THE TRACK CHANGES UNDER THE ROSTER.** An open track allows 100, a closed one 40, and
   *switching tracks does not touch the players.* Pick open → add 60 → pick closed. The field is now
   60 against a cap of 40, by two ordinary clicks.
2. **THE DEV SCREEN'S "LOAD TO SETUP".** It writes the roster straight into state through
   `KEYS.ACTIVE_GROUP`, and **there is no cap check anywhere on that path** — the Setup Screen reads
   the key and calls `setPlayers`.

**Without the Start-side check, both would have delivered their refusal at the start line** — which
is the thing his decision is against. `canStart` now carries `players.length <= effectiveMaxPlayers`,
the Start button's tooltip says the numbers and the way out, and a bordered notice sits above the
button in the **same warning treatment CHIP-CONTRAST-1 established** rather than a third
presentation invented for it.

*(The brief called that treatment "BOARD-CHIPS-1". There is no report of that name; the treatment it
describes — ⚠️ plus `--color-accent`, a warning and not an error — is CHIP-CONTRAST-1's, and that is
what was reused. Recorded rather than silently resolved.)*

**Route 2 is what the test drives**, because it needs no second track and pins the same claim: the
screen refuses, whatever the roster came through.

---

## 4. IT IS A WARNING SITTING ABOVE A DIFFERENT WARNING, AND THEY SAY DIFFERENT THINGS

The start bar already had `capacity-warning`: *"This track recommends a maximum of N racers … the
race will still start but may feel cramped."* That is the **track's own soft** `maxRacers`.

The new notice is the **hard** cap and says the race **cannot start**. Two claims, one above the
other, in the same visual language — which is right, because both are warnings and neither is an
error — but they must not be read as one. The soft one still appears when it applies.

---

## 5. SABOTAGE, BOTH HALVES

| what was broken | result |
| --- | --- |
| the refusal disabled, so an oversized group is simply admitted | **5 tests red** |
| the Start-side cap check removed (`canStart = canStartBase`) | **1 test red**, naming the route |

Restored: **134 tests green** across the Setup Screen. Both sabotages were run against the real tree,
not a fixture.

---

## 6. NOTHING CHANGED THE GAME

| role | |
| --- | --- |
| world · world-off · camera · render | **all four unmoved**, each re-measured |

Setup screen only. `handleStartRace` is untouched, the race payload is unchanged, and nothing in
`client/src/modules` was opened.

---

## 7. ONE FAULT OPENED AND CAUGHT INSIDE THE PIECE

Writing the "no player name in the notice" assertions, a shell heredoc collapsed `` into the
BACKSPACE control character, so two regexes read `/Anna/` and matched nothing at all —
**two assertions that would have passed against any notice, including one naming every player.**

**The pre-commit hook caught it** (`no-control-regex`), refused the commit and reverted the staged
state; the push that followed pushed the previous HEAD, not a broken tree. The word boundaries were
dropped rather than repaired — these are distinctive names and the claim is simply that the notice
contains none of them.

**Recorded because a test that cannot fail is the exact shape this fortnight keeps finding**, and
this one was mine, opened while pinning a rule about not doing that.

---

## Limits

**The two over-cap routes were reasoned from the code and only one was driven.** Route 2
(`ACTIVE_GROUP`) is exercised by a test; route 1 (the track switch) is read from `effectiveMaxPlayers`
depending on `trackIsOpen` while `players` does not, and was not driven through two tracks in a
browser. **The Start-side check does not care which route was taken**, which is why one test is
enough to pin the behaviour — but the claim that route 1 exists is a reading, not a run.

**Quick Test is not covered by the refusal.** `handleQuickTest` builds its own roster from
`quickTestCount`, whose input is capped at 100 independently of the track. A Quick Test on a closed
track at N=60 is over the closed cap and starts. **Reported, not built:** it is a different control
with a different cap, and changing what Quick Test does is not what the decision asked for.

**No limit's VALUE moved.** 40 closed, 100 open, both from `defaults.js`. The refusal reads
`effectiveMaxPlayers`, which is the same expression the Add button and the picker already used —
**whether that is the authoritative one is B3's question**, and if B3 finds it is not, this refusal
is reading the wrong number and that is a finding rather than a rebuild.

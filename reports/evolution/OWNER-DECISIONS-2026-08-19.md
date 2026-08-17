# OWNER-DECISIONS-2026-08-19 — everything left that needs you

**Nothing on this sheet has been touched.** Every item changes behaviour, however small, so each one
is yours to decide. Items that share an answer are grouped: **you can answer a whole batch with one
sentence.**

**Ordered by whether you could ever SEE it**, not by where the code lives.

Each item has exactly five lines: **what is wrong · can you see it · what changes if fixed · what it
costs · what happens if left forever.**

---

# BATCH 1 — THE ONLY THINGS YOU COULD EVER SEE

*Answer this batch first. Everything below it is invisible to you by construction.*

## 1.1 — Three Dev Screen controls could show a number the game is not running

1. Three controls in the Dynamics section fall back to a hard-coded number if their setting is ever missing, and two of those hard-coded numbers are wrong — the checkbox would read *off* while the game runs *on*, and the bonus strength would read **1.0×** where the game runs **2.0×**.
2. Shipped path yes, but the fallback is unreachable today: the panel loads settings through the resolver, which always supplies every key. You would see it only if that resolver ever stopped doing so — never, so far.
3. Fixed, the controls would be incapable of showing anything but the live value; today they are merely unlikely to.
4. About 20 minutes for a test that renders the panel with empty storage and asserts the shipped values. No eye test needed — it changes nothing you can see today.
5. It stays a landmine of exactly the shape that already caught us once (MIN-RACERS-5, where an untouched control showed a value the game was not running).

## 1.2 — A change to how a racer is drawn is checked by nothing but your eye

1. The three automatic picture checks do not look at the racer artwork at all — not the sprites, not the drawing code for them.
2. Shipped path yes, every race. You would see a mistake here immediately and it would be the only thing that catches it.
3. Fixed, a change to a racer's drawing would move a recorded number and fail loudly before it reached you.
4. Hours, not minutes — the render check runs without a browser, so it cannot see a sprite at all; widening it means a different kind of instrument. **Your eye afterwards either way.**
5. Nothing changes: your eye keeps doing this job, as it always has. The documents now say so plainly instead of implying an instrument covers it.

---

# BATCH 2 — ONE CONVENTION, ASKED TEN TIMES

*These ten items are the same question. **One sentence from you settles all of them.***

> **When a setting is missing, should the game run that feature OFF, or run the shipped value?**
> Today the code says OFF. A reader expects the shipped value.

## 2.1 — Five physics settings fall back to "off" instead of their real value

1. Five race settings — the lateral-acceleration cap, the steering margin, and the three pulk contest strengths — are written so that if the setting were ever missing, that part of the physics would silently switch off rather than use the shipped number.
2. Shipped path yes; **unreachable today** — every caller was read and all nine supply a complete set. You could never see it.
3. Fixed, a missing setting would give you the real race instead of a partly disabled one. Visible only in a situation that has never occurred.
4. About 15 minutes plus a world-fingerprint measurement to prove nothing moved. No eye test.
5. Nothing happens. They stay documentation defects — a reader sees `0` beside a setting whose real value is `0.0005`.

## 2.2 — The B2-attacker settings do the same thing, in three places

1. The "attack and fall" feature's count and target rank fall back to values that mean *cast no attackers*, and one of them is simply an old number that was never updated.
2. Shipped path yes; unreachable today for the same reason as 2.1. You could never see it.
3. Fixed, the same as 2.1 — a missing setting would give the shipped feature rather than the pre-feature game.
4. Included in 2.1's 15 minutes if answered together. No eye test.
5. Nothing happens, except that the module's header and the shipped defaults keep disagreeing in writing.

## 2.3 — Two more copies of the same setting that our checker cannot see

1. One setting's value is written out by hand in two more places in the hero-curve module, and the automatic checker is blind to that shape, so it never counted them.
2. Shipped path yes; unreachable today, and the two copies currently agree with the real value. You could never see it.
3. Fixed, there would be one copy of that value instead of four.
4. About 10 minutes if answered with 2.1 and 2.2, since it is the same module and the same decision.
5. They drift the day somebody changes the real value and misses these two — which is what happened to the two copies we already found and fixed.

---

# BATCH 3 — THE TOOLS. INVISIBLE TO YOU, BUT THEY GUARD YOUR GAME

*You cannot see any of these. They decide whether we would notice a problem before you do.*

## 3.1 — Our own checker can pass having run zero tests

1. If the command that finds our test files ever fails, it quietly reports "no tests" and the check runs nothing, then reports success — the automated build guards against exactly this and our local tool does not.
2. No shipped path; it is our tooling. You would never see it, except as us telling you something is fine when nothing was checked.
3. Fixed, that situation would stop the check loudly instead of passing it.
4. About 10 minutes, but it must be proved on the build server first because the tool cannot check itself. No eye test.
5. The one mechanism whose entire purpose is "a check that examined nothing must not pass" keeps an exception in the tool we run most.

## 3.2 — A timer is left running after every settings load

1. Each time the game loads settings from the server it starts a three-second timer and never cancels it, even when the answer arrives immediately.
2. Shipped path yes, on every load. You could never see it — it costs nothing and does nothing.
3. Fixed, nothing you can see changes. It is tidiness with one real consequence: it is the mechanism that let test work outlive its test and take a build down.
4. About 10 minutes, three lines, plus a fingerprint measurement because it is a shipped file. No eye test.
5. Nothing you would notice. It stays a small trap for whoever next writes a test that touches a loader.

## 3.3 — One checker cannot see a whole shape of copied setting

1. Our copied-settings checker only recognises simple values, so a setting copied as a small block of text is invisible to it.
2. No shipped path; it is a checker. You would never see it.
3. Fixed, the checker would count every copy instead of most of them — it reported "two" recently where the true number was four.
4. About 45 minutes, and it is the riskiest item here: it means changing how the checker reads code, which must be proved in both directions.
5. We keep undercounting copied settings, and every future report of that number is quietly low.

---

# BATCH 4 — HOUSEKEEPING. NO EFFECT ON ANYTHING, BUT THEY NEED A YES OR NO

## 4.1 — An empty `reports/audit/` folder with no decision attached

1. The folder that once held the only copy of a critical finding is now empty, and the next audit written there would fail the build with only an error message for guidance.
2. No shipped path. You would see it only if you wrote an audit into that folder.
3. Fixed either way, the next audit lands somewhere with a decision behind it instead of hitting a red build.
4. About 2 minutes: either delete the empty folder so audits land with the other reports, or give it an index. **Deleting is probably right** — the two audits that lived there are now filed with the rest.
5. The next person to use that folder hits a red build and has to make this decision under time pressure instead of now.

## 4.2 — Two tests that pin a number instead of the rule

1. Two camera tests check that a value equals a specific number rather than that it obeys the rule the number came from, so they go red on an honest change and green on a real drift.
2. No shipped path; they are tests. You would never see it.
3. Fixed, they would stop crying wolf when you change a camera value and start catching the case they were written for.
4. About 20 minutes, but each needs a decision about what that test is FOR before it can be rewritten — which is why they were left rather than guessed at.
5. They keep being re-blessed whenever a value changes, which is the habit that turns a test suite into a formality.

---

## HOW TO ANSWER THIS

**Batch 2 is ten items and one sentence.** If the answer is *"a missing setting should give the
shipped value"*, all ten are a single afternoon with one measurement. If it is *"missing means off,
that is deliberate"*, all ten close permanently and the checker's exception list becomes a record of
a decision rather than a to-do list.

**Batch 1 is the only one where your eye is involved**, and 1.2 is the only item on the whole sheet
that is genuinely expensive.

**Batch 3 items are independent of each other** and can be answered yes/no individually.

---

## PROPOSALS

### Proposal A — answer Batch 2 first, because it is 10 of the 13 items

Ten of the thirteen items here are one convention asked repeatedly. **Nothing else on this sheet
unlocks as much for as little.** Answering it also empties most of a checker's exception list, which
today reads like outstanding work and would become a record of a decision — and that distinction
matters, because an exception list nobody has ruled on gets longer every time somebody is unsure.

### Proposal B — treat 1.2 as a documentation decision, not an engineering one

Widening the picture check to cover racer artwork is the one expensive item here, and it may not be
worth it: the check runs without a browser, so covering sprites means a genuinely different
instrument. **The cheap answer is to accept it and say so once** — your eye is the instrument for
artwork, which is already true and now written down. That converts the only expensive item on the
sheet into a sentence, and leaves the budget for Batch 2.

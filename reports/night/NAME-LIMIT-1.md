# NAME-LIMIT-1 — one name-length limit, enforced where names enter

**Branch** `feat/name-limit-1` off master `b05b3b6e` · 2026-08-07 · **not merged**

**Your data is safe and untouched: zero stored names exceed 32 characters. The longest anywhere in
`server/data` is 22.** So the migration question this block was told to stop short of does not arise.

---

## 1. Conformity, element by element

| the spec asked                                                    | done | note                                                             |
| -------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| Branch off master, FORMAT → MEASURE → COMMIT                           | yes  | Built in a worktree — §8.                                         |
| (a) one limit, one home, read by every validating path                 | yes  | `shared/nameLimits.mjs`. §3.                                      |
| (b) enforced where names ENTER, not in an input attribute              | yes  | Three entry points wired. §4.                                     |
| (b) report which entry points exist and which were wired               | yes  | §4, including one left unwired and why.                           |
| (c) say what happens to an over-length name; choose and justify         | yes  | **Rejected with a visible reason, never trimmed.** §5.            |
| (c) make the two paths consistent                                      | yes  | All three behave identically.                                     |
| **EXISTING DATA — first report whether any stored name exceeds 32**     | yes  | **0 of 304.** §2, run before any edit.                            |
| Do NOT truncate / rewrite / migrate existing data                       | held | Nothing written. The audit opens no file for writing.             |
| State what the renderer does with a legacy over-length name             | yes  | §6 — nothing. It draws it at full width.                          |
| Propose a display guard; do not build it here                           | yes  | §9.1. Not built — it is not the only thing standing in the way.   |
| No fingerprint may move                                                 | held | §7. Proved two ways.                                              |
| Test: fails if the limit is bypassed at a wired entry point             | yes  | §5, proved by sabotage.                                           |
| Test: pins the single home                                              | yes  | §5 — it caught me being vague about scope.                        |
| Two proposals of my own                                                 | yes  | §9.                                                               |
| Planner proposal 1 (report holes rather than widen)                     | **taken** | §4 — one entry point reported, not widened into.             |
| Planner proposal 2 (what does 32 characters measure in px)              | **taken** | §10.                                                          |

---

## 2. Your existing data — read-only, run first

| | |
| --- | --- |
| JSON files scanned | 239 (all of `server/data`) |
| name strings found | 304 |
| **over 32 characters** | **0** |
| length range | 3–22 |
| longest observed | 22 characters (one), then 21, 19, 18 |

**Nothing needs migrating and nothing was touched.** The audit script only ever reads.

**One honest limit on that statement:** it covers server-side state. Player names also live in the
browser's `localStorage`, which I cannot read from here. Given the server's longest is 22 and the
same names flow through both, I would be surprised by a long one — but I have not proved it, and the
spec asked me to be exact about this.

---

## 3. One home

**`shared/nameLimits.mjs`**, at the repo root. It exports the limit, a validity check, an
offender-finder, and the message both sides show.

**Why the root and not inside `client/` or `server/`.** The limit must be identical on both sides of
an HTTP boundary, and neither package can import from the other: the server is not part of the
client's build, and a server importing from a UI package has its layering backwards. A constant that
must match in two runtimes has to live above both of them, or it is two constants with a promise
attached — the shape this project already paid for once, when `QUICK_TEST_NAMES` was duplicated
between a screen and the parity runner.

**Why `.mjs`.** The root `package.json` has no `"type": "module"`, so a `.js` file there makes Node
warn and reparse on every server start. Adding `"type": "module"` to the root would silently
reinterpret every `.js` under `scripts/` — a much larger change than this block should make. The
extension solves it in one character.

---

## 4. The entry points — found, and which were wired

| # | entry point | before | now |
| - | ----------- | ------ | --- |
| 1 | `SetupScreen/PlayerSetup.jsx` — the Players field | `maxLength={32}` attribute **only** | checked in `handleAdd`; the attribute now READS the shared constant |
| 2 | `DevScreen/PlayerGroupsManager.jsx` — the comma-separated group editor | **nothing at all** — the textarea has no `maxLength` | checked before save |
| 3 | `server/src/routes/playerGroups.js` — group create/update | `PLAYER_NAME_MAX = 100` | reads the shared limit |
| 4 | `storage/playerGroupMigration.js` — local groups → server | — | covered: it posts through #3 |
| 5 | loading a group into the active roster (`KEYS.ACTIVE_GROUP`) | — | **not wired, deliberately** — see below |

**#2 was the real hole.** The Players field at least stopped typing. The group editor had no guard of
any kind on the client, so before this block the only thing between a 500-character name and stored
state was the server's 100.

**#5 is reported, not wired — planner proposal 1.** Loading a saved group is not a name *entering*
the system; it is stored data being read back. Guarding it would mean deciding what to do with a
legacy name that is already there — reject the whole group, drop one player, or trim — and that is
exactly the owner's call the spec told me not to pre-empt. It is empty today (§2), so it guards
nothing. **If a long name ever does get stored, this is the path it comes back through.**

**Out of scope, and stated because a test caught me being vague:** this is the PLAYER name — the
string that becomes a racer's label. The **group** name (client 40 / server 100) and the **brand and
event** names (100) are different objects, never drawn as labels, and the 32 rationale does not apply
to them. They keep their limits. §9.2 proposes what to do about them.

---

## 5. Rejected, never trimmed — and the tests

**The choice: an over-length name is REJECTED with a visible reason. It is never silently trimmed.**
All three wired paths behave identically.

**Why.** A name is a person at the event. A trimmed name is a label that person does not recognise,
on a screen in front of a room — while the operator, who could have fixed it in one keystroke, is
never told anything happened. Rejection costs one correction and is obvious immediately; trimming
costs nothing now and is discovered by the wrong person later. The message names the offenders,
because the operator has to know *which* one to shorten.

**Tests added — `nameLimits.test.js`, eight.** Both R7 questions per test in the file.

- **fails if the limit is bypassed** — at the limit passes, one past fails, whitespace cannot smuggle
  length past a `trim()`, and a non-string is rejected outright rather than coerced (the server takes
  arbitrary JSON; coercion puts `[object Object]` on the starting grid). **Proved by sabotage:**
  relaxing the check to `typeof name === 'string'` fails two of the eight.
- **pins the single home** — reads all three sources and fails if any stops importing the shared
  module or restates a player limit as a literal. **This test earned its place immediately:** its
  first version was too broad, matched the group's `NAME_MAX = 100`, and forced me to decide the
  scope question in §4 explicitly instead of leaving it implicit.

**Deleted or merged: none.**

---

## 6. What the renderer does with a legacy over-length name

**Nothing.** `drawNameTag` draws whatever string it is given, at full width. There is no truncation,
no ellipsis, no clipping and no measurement against the frame anywhere in the drawing path.

A 100-character name — which the server permitted until this block — would draw a label box of
roughly **750 screen px**, over half the frame width.

**Do I think it needs a display-side guard? Yes, eventually — but not here, and not yet.** The
condition it would protect against is now unreachable through every wired entry point, and it is
empty in your data. Building it here would be adding a second, silent policy (a visual truncation)
next to the one you just chose (rejection) — which is how a product ends up with three answers again.
§9.1 is the proposal.

---

## 7. Fingerprints — none moved, proved two ways

1. **`engine-reach --check` on the actual diff**: _"none of 5 path(s) can reach the race engine."_
2. **`npm run verify` skipped all three fingerprint guards on its own reach rules** — world, camera
   and render each reported "nothing matched".

The five changed files are one shared constant, one server route, two screens and a test. Nothing
touches the engine, the director or the drawing.

`npm run verify`: **PASS 2, FAIL 0, SKIP 5.** Server suite **615/615**. Client suite green.

---

## 8. How this was done without touching 5173

Your eye test on `feat/label-shrink-1` has not been released, so R10 says the dev server owns the
tree. All of this was built in a **git worktree at `C:/ra-wt-limit`**, with `node_modules` junctioned
from the main checkout. **The main tree was never switched and the server was never restarted.**

---

## 9. Proposals of my own

**9.1 — A display-side guard, once, as a last line rather than a policy.** The renderer should refuse
to draw a label wider than some fraction of the frame — not by truncating the name, but by treating
it the way the layout already treats an unplaceable label: drop it and let decluttering deal with it.
That keeps one policy for over-long names (they are rejected, not silently altered) and still means
no single name can ever eat half the screen. Worth doing when the roll-call work touches the label
path anyway, so it costs one render-fingerprint move instead of two.

**9.2 — Give the group, brand and event names the same treatment, in one small block.** They are
three more limits in three more places (40, 100, 100) with the same attribute-only enforcement
pattern the player name had. None of them is drawn as a racer label so none is urgent, but the shared
module now exists and the pattern is established, so the second block is far cheaper than the first
was. Doing them together avoids a fourth answer appearing later.

---

## 10. Planner proposal 2 — what 32 characters actually measures

At the shipped label size (15.84 px on a 720-px frame), box = text + 8 px padding:

| case                                | box width | share of a 1280-px frame |
| ----------------------------------- | --------- | ------------------------ |
| 32 × `W` — the absolute worst string | 486 px    | **38.0%**                |
| 32 × `m`                             | 459 px    | 35.8%                    |
| 32 × `n` — a typical letter          | 318 px    | 24.8%                    |
| **realistic mixed-case 32**          | **283 px** | **22.1%**               |
| 22 — the longest you actually have   | 188 px    | 14.7%                    |

**The number the roll-call design should start from is ~283 px, with 486 px as the pathological
ceiling.** The realistic figure is the one to design against: a worst case of 32 capital Ws is not a
name anyone types, but it is what a hostile or accidental paste produces, and it is why §9.1 exists.

For comparison, the current roster's mean label is **55 px**. So the limit you chose permits a label
**five times** the width every measurement in this project has so far assumed.

---

## 11. What I did NOT do, and why

- **Did not touch a single byte of stored data.** The audit only reads. Nothing was migrated,
  trimmed or rewritten — and nothing needed to be.
- **Did not wire entry point #5** (loading a saved group). §4 — it is stored data being read back,
  and guarding it means deciding the legacy-name policy, which is yours.
- **Did not change the group, brand or event name limits.** §4 scope note, §9.2 proposal.
- **Did not build the display-side guard.** §6 — it is not the only thing standing between a stored
  name and a broken picture, because no stored name is over the limit and every entry point is now
  closed.
- **Did not add `"type": "module"` to the root package.json.** It would reinterpret every `.js` under
  `scripts/`; the `.mjs` extension solved the same problem in one character.
- **Did not touch 5173.** §8.

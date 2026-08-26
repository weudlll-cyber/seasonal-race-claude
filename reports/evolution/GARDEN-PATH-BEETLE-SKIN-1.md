# GARDEN-PATH-BEETLE-SKIN-1 — the track wears the beetle it races, and no existing installation will ever see it

**Date:** 2026-08-26 · **Branch:** `feat/garden-path-beetle-skin-1` (off `master`) · **Piece 5 of
NIGHT-2026-08-25** · **Verdict:** BUILT AND MERGED. Two fields in one file. No other track, no
default, no config key, no live record hand-edited.

---

## 1. WHAT CHANGED

`server/seeds/tracks/garden-path.json`, two lines:

```diff
-  "icon": "🐌",
-  "description": "A leisurely (yet surprisingly competitive) crawl through the roses.",
+  "icon": "🪲",
+  "description": "A leisurely (yet surprisingly competitive) scuttle through the roses.",
```

**The track has run a beetle since the owner's decision of 2026-08-25** (`defaultRacerTypeId: "beetle"`,
`defaultLaps: 2`). Only the skin still described a snail.

**His sentence is otherwise untouched.** The parenthetical, the rhythm and the roses are his writing
and none of it was improved. **One word moved: the verb that named the snail's motion.** A snail
crawls; a beetle scuttles. "Leisurely" stays because it describes the track's mood, not the animal,
and it is still true — this is the gentlest track in the set.

**The icon is not chosen, it is looked up.** `Beetle 🪲` is the racer type's own label
(`racer-types/beetle.test.js:77` asserts it), so the track now carries the same glyph the racer
carries. **One place owns that emoji and this file follows it.**

---

## 2. THE ONE PLACE THAT OWNS IT — and why it is `seeds`, not `data`

There are two copies of this record on this machine and they are not equals:

```
.gitignore:29   server/data/**
```

**`server/data/tracks/garden-path.json` is gitignored.** It is the live runtime record — a working
file of one installation, not a source of truth for the product. **`server/seeds/tracks/garden-path.json`
is the only copy the repository owns**, so it is the only one this change touches.

**THE LIVE RECORD WAS NOT HAND-EDITED, DELIBERATELY.** The brief is explicit that doing so *"is what
made yesterday's change look delivered when it was not"*, and TRACK-DEFAULTS-REACH-1 diagnosed exactly
that failure: an edit that appears to work because someone reached into the running instance, while
the shipped artefact and every other installation stay unchanged. **This change is therefore invisible
on this machine until its data directory is emptied** — which is the honest state and is reported
rather than papered over.

---

## 3. WOULD AN EXISTING INSTALLATION EVER SEE THIS? — NO

**Not by any supported mechanism.** `server/src/seedRuntime.js`:

```js
* Existing destination files are never overwritten.          // :22
…
if (existsSync(dest)) continue;                              // :36
```

The seed is copied **only into a destination that does not yet exist**. An installation that has ever
booted has `server/data/tracks/garden-path.json`, so the loop skips it forever. There is no migration
step, no version check, no merge — TRACK-DEFAULTS-REACH-1 established that `.tlh1-defaults-migrated`
is *"written and never read"*.

**So the honest scope of this change is: new installations only.** The owner's own instance will keep
showing 🐌 and "crawl" until its data directory is deleted.

**This is not a defect introduced here and it is not repaired here.** It is the same undelivered-track-
change defect his beetle decision already hit, one layer up, and it is on the morning sheet as a
question for him rather than a thing I chose. **What this piece guarantees is only that the artefact
the product ships is now correct.**

---

## 4. FINGERPRINTS — none move, and it was established rather than assumed

**Verdict: NO fingerprint moves, for two independent reasons. That is the right answer, and one of
the two reasons is a defect.**

**Reason one — the fields are presentation.** `icon` and `description` are read by the setup screen.
Grepping `world-fingerprint.mjs`, `camera-fingerprint.mjs` and `render-fingerprint.mjs` for either
field returns **one hit, and it is an unrelated comment** about frame descriptions in
`render-fingerprint.mjs:418`. Nothing any fingerprint hashes can be reached from a track's icon or
its prose. **This reason alone is sufficient and it is the reason the answer is correct.**

**Reason two — the instruments would not have seen the change anyway, and that is the defect.** All
three fingerprints resolve their track directory as:

```js
const dir = existsSync(join(ROOT, "server/data/tracks"))
  ? join(ROOT, "server/data/tracks")
  : join(ROOT, "server/seeds/tracks");
```

`server/data/tracks` **exists on this machine**, so every fingerprint reads the gitignored live record
— the copy this change deliberately did not touch. **Had this change moved the engine, the
fingerprints would have reported it unmoved.** That is PIECE 6's subject and it is recorded here
because this change is a live instance of it.

**The gate's own routing said so out loud**, which is the cleanest evidence available:

```
SKIPPED, and why:
  camera-fingerprint    nothing changed  ·  declares 38 file(s) by import closure
  render-fingerprint    nothing changed  ·  declares 58 file(s) by import closure
  world-fingerprint     nothing changed  ·  declares 38 file(s) by import closure
  engine-reach-doc      nothing changed  ·  declares 25 file(s) by import closure
```

**"nothing changed" is the wrong reason for the right verdict.** Something did change; the instruments
cannot see the path it changed on, because a JSON data file is in no import closure. **Here the
correct answer arrives by accident.**

**Nothing was re-minted**, and there was nothing to re-mint.

---

## 5. THE GATE

```
npm run verify   →   exit 0     PASS 5   FAIL 0   SKIP 19
```

**`server-suite` RAN and PASSED in 31.9 s.** This is the first piece of the night whose diff is not
docs-only, so the routing engaged it (`1 changed (server/seeds/tracks/garden-path.json) · dirs=server/`).

**Stated explicitly, per the night's operating rule: NO bcrypt timeout was forgiven, because none
occurred.** PIECE 1 established that the suite sits 21 ms from its limit at default concurrency on an
idle machine; on this run it passed cleanly. **That is luck, not a fix** — GATE-RED-1's finding stands
unchanged and the flag is still absent from `server/package.json`.

**Nineteen jobs were skipped**, each with a stated reason, and §4 records that four of those reasons
are correct verdicts reached by a broken route.

---

## 6. R15 — WHAT WAS RUN, AND WHAT WAS NOT

| check | run? | why |
| --- | --- | --- |
| `server-suite` | **YES** | the diff is under `server/`; the routing engaged it and it passed |
| `check-writable`, `check-hooks-installed`, `check-language-closed`, `fingerprint-containment` | **YES** | always-on |
| the three fingerprints | **NO — skipped by routing** | correct verdict (§4 reason one), wrong reason (§4 reason two) |
| `engine-reach-doc` | **NO — skipped by routing** | same |
| client suite, browser gate | **NO** | nothing under `client/` was touched; a track's icon cannot reach a client test's assertions |

**One thing I did not do and want on the record:** I did not force the fingerprints to run against
`server/seeds/tracks` to prove they would come back unmoved. It would have required pointing them at
a different tree than the one they choose, which is a change to an instrument in the same commit as a
behaviour change — the circularity `raceDriver.mjs`'s own header warns about. **§4's reason one is
established by reading what they hash, which is the stronger argument anyway.**

---

## 7. PROPOSALS — none ordered

### A — MINE: the seed and the live record should be comparable, and today they are not

Nothing in the tree can answer *"does this installation's `server/data/tracks` match the shipped
seed?"* — which is precisely the question the owner had on 2026-08-25 and could not get an answer to.

**A read-only report — per track, seed versus live, field by field — costs nothing and delivers
nothing.** It does not fix the undelivered change; it makes the gap *visible*, so an operator can see
that his instance is running a record the product no longer ships.

**Cost:** it is a new script, and it is one more thing that must not drift. **What it buys:** the
answer to "why does my track still say snail" becomes one command instead of a diagnosis report.

### B — MINE: presentation fields and engine fields should not live in one undifferentiated record

`icon` and `description` cannot reach the engine; `defaultRacerTypeId` and `defaultLaps` decide the
race. **They sit in the same file with nothing marking the difference**, which is why a change to
either gets the same "cannot reach the engine" verdict from the arbiter — right for one, wrong for the
other.

**Cost:** splitting the record is a migration, and this project has good reasons to avoid those.
**Cheaper variant:** leave the file alone and let the arbiter classify *fields*, not files. That is
PIECE 6's territory and is left to it.

### C — do NOT hand-edit the live record to make this appear

Named to be refused, because it is the obvious next step and it is a trap. It would make the owner's
screen correct tonight and destroy the only evidence that the delivery mechanism does not work — which
is the finding that outlives the icon. **If he wants his own instance updated, the honest route is to
say so as a decision about delivery**, not to reach into `server/data` and call it shipped.

---

## 8. CONFORMITY

| the brief asked | delivered |
| --- | --- |
| change both icon and description, in the one place that owns them | §1, §2 — `server/seeds/tracks/garden-path.json`; `server/data/**` is gitignored |
| touching no other track and no default | `git diff --stat`: **1 file, 2 insertions, 2 deletions** |
| keep the description's tone — it is his writing; adjust what is now untrue and nothing else | §1 — one verb; the parenthetical, rhythm and roses untouched |
| say whether an existing installation would ever see the change | §3 — **no, never**, with the line of code that decides it |
| DO NOT hand-edit any live record | §2 — not done, and §7 C explains why it stays not done |
| fingerprints: establish which move, report as expected with what moved and why | §4 — **none**, for two independent reasons, one of which is a defect |
| never re-mint quietly | §4 — nothing minted; there was nothing to mint |
| if none moves, say why that is right | §4 — icon and description are presentation and no fingerprint hashes them |
| report + INDEX in the same commit, source hygiene, conformity, PROPOSALS with ≥2 of your own | this file; §7 has three, two of them mine and one named to be refused |

---

## WHAT OUTLIVES THIS REPORT

**A two-line change to a shipped artefact is correct, merged, and will never reach the machine that
needed it.** That is not a fault of this piece and it is the more important half of it: the product
now ships a track whose skin matches its racer, and the owner's own instance still shows a snail,
because there is no supported mechanism that delivers a changed track record to an installation that
has already booted once.

**And the gate agreed with this change for the wrong reason.** Four instruments reported "nothing
changed" about a commit that changed something, because the thing it changed is a data file no import
closure contains. **This time the verdict was right anyway. The next track change may move the engine,
and the arbiter will say the same words.**

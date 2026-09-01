# REACH-ADVISORY-1 — the line a human reads now agrees with the routing that was already right

**The two questions turned out to be the same question**, so the decision rule's STOP condition was
not reached. The advisory consults `dataReach` — the module that already owns the answer — rather
than acquiring a second notion of reach.

---

## WHAT WAS WRONG, AND HOW WRONG

`engine-reach --check` walks IMPORT edges. **A JSON file has no imports**, so nothing that ships as
data can ever be in an import closure, and the human-facing line said so in the strongest possible
terms:

```
ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  2 outside the hull (cannot reach the engine at all): server/seeds/tracks/garden-path.json, …
```

**"Cannot reach the engine at all" was false.** `scripts/sim-fairness.mjs` is a declared reach entry
of the world fingerprint — precisely because it drives the engine and emits the rows that get hashed
— and it reads `server/seeds/tracks`. A change to a track record can and does move that hash.

**Twice on the record, both times on this exact path:**

- **2026-08-25, GARDEN-PATH-DEFAULTS-1.** A two-line edit to `server/seeds/tracks/garden-path.json`
  **moved all four fingerprints.** The arbiter called it unreachable.
- **2026-08-31, SEED-SNAPSHOT-1.** The same file again, in the seed snapshot. Same wrong sentence.

**And that matters more than a wrong sentence usually would, because every spec written for this
repository names that line as the decider.** A reader who trusts it skips a fingerprint run.

**The routing side was never wrong.** `ENGINE-REACH-DATA-FIX-1` closed this months ago for guard
selection: `scripts/lib/dataReach.mjs` walks the same closure and reports every tracked repository
path the files in it **name**. Over this script's own entry points it returns exactly one thing:

```
server/seeds/tracks   <- scripts/sim-fairness.mjs
```

**The machine path was right; the sentence beside it was not.**

---

## THE DECISION RULE, ANSWERED

The brief said to stop and report if the two rest on genuinely different questions. **They do not.**

Both ask *what can change the race*. The hull answers it for code, by following imports.
`dataReach` answers it for data, by following the paths that same code names. They are two halves of
one question that had one implementation each and only one consumer wired up. **Nothing was designed
here** — the advisory now calls `dataReach(entryPoints())`, uses the same matching rule routing uses
(`f === p || f.startsWith(p + "/")`), and reports the answer.

The import is circular — `dataReach` imports `importSpecifiers` from `engine-reach` — and it is safe
because both bindings are hoisted function declarations used only at call time, never during module
evaluation. Stated rather than left for someone to worry about.

---

## A SECOND DEFECT, FOUND BY RUNNING THE MATRIX RATHER THAN READING

The first working version reported an **unchanged** seed record as "can change the race". That is
over-selection, and it is the mirror of the original defect: a hull file that is unchanged is
correctly reported as carrying no change, and a data file must be held to the same standard. The
command answers whether **the paths it was given carry a reaching change**, not whether they could in
principle.

So a data path now counts only when its bytes differ from the base — with an unreadable or absent
base version counting as changed, the safe direction. **Token-level inertness is still not applied**:
`isInertChange` decides that a JS diff is comments and whitespace, and a data file has no such
notion; inventing one would be the second notion this repair exists to avoid.

**That produces a third distinct fact, which the output now names:**

| the fact | what it prints |
| --- | --- |
| in the hull, really changed | `N of M path(s) can change the race` |
| in the hull, comments only | `IN the hull but inert against <base>` |
| **data the engine reads, unchanged** | **`DATA read by the engine but unchanged against <base>`** |
| genuinely unreachable | `outside the hull (cannot reach the engine at all)` |

The third row is new and is the one that stops the fix from becoming a nuisance.

---

## PROVEN, BOTH DIRECTIONS

The same file, against two bases:

```
$ node scripts/engine-reach.mjs --check server/seeds/tracks/garden-path.json
ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 DATA read by the engine but unchanged against master: server/seeds/tracks/garden-path.json
EXIT=1

$ node scripts/engine-reach.mjs --check server/seeds/tracks/garden-path.json --base=37a67b9c~1
ENGINE REACH: 1 of 1 path(s) can change the race:
  server/seeds/tracks/garden-path.json   (DATA — read by scripts/sim-fairness.mjs)
EXIT=0
```

The second is the answer it got wrong on 2026-08-31, taken against the commit where that file
actually changed. **It also says HOW it reaches** — named by `sim-fairness.mjs`, not imported by
anything — because that is the fact the line was wrong about for months.

**It does not over-select.** A matrix across six representative paths: the track record reaches;
`server/seeds/player-groups/…`, `docker-compose.yml`, `server/Dockerfile` and a non-hull client
component do not. **The eight "selected nothing" answers this chain has seen were mostly correct** —
compose files and Dockerfiles genuinely cannot move a hash. Only the seed-record case was ever wrong,
and it is the one this fixes.

### Sabotage, both directions

**A — the advisory stops asking.** `dataPrefixes = []`:

```
✖ a CHANGED seed track record is reported as reaching, and named as DATA
✖ an UNCHANGED seed record is neither a hit nor 'cannot reach at all'
```

**B — the advisory over-asks.** `dataPrefixes = ["server", "docker-compose.yml"]`:

```
✖ data reach does NOT over-select: compose and Dockerfile stay outside
   AssertionError: The input did not match /cannot reach the engine at all/
```

**The first attempt at sabotage B was ineffective and is recorded rather than hidden:** an empty-string
prefix matches nothing (`"docker-compose.yml".startsWith("/")` is false), so it merely repeated
sabotage A. A sabotage that does not fail the test it targets has proved nothing, and it was redone
with a prefix that genuinely over-matches.

Restored, 14/14.

---

## CHECKS

**The routing side is untouched, verified rather than assumed.** `verify.test.mjs` — 44 tests,
44 pass — and `verify --dry` against the seed-change commit still selects `camera-fingerprint` and
`check-ending-frame` for `server/seeds/tracks/garden-path.json`, exactly as before. This piece changes
the human-facing line and nothing about which guards run.

*(Note for whoever runs it next: `verify.test.mjs` uses `node:test`, so `npx vitest run` on it reports
"No test suite found" while the node runner underneath prints 44 passing. The right command is
`node --test scripts/verify.test.mjs`.)*

**All four fingerprints run by hand and all four UNMOVED.** `engine-reach.mjs` is a script and is not
in its own hull; they were run because the chain says to.

## CONFORMITY

- The advisory consults `dataReach`; no second notion of reach was invented, and the STOP condition
  was correctly not triggered because the two rest on one question.
- Both directions sabotage-proven, with the failed first attempt at one of them recorded.
- Routing behaviour unchanged, checked.
- Four fingerprints run by hand and unmoved; nothing minted.

## PROPOSALS

**P1 — `dataReach`'s own stated limit is now the advisory's limit too.** It records a dynamically
imported module's names but not its statically-imported descendants, because doing so took
`script-suite` from 8 entries to 109. The advisory inherits that ceiling exactly, and a reader should
know the line is now *right about what it can see* rather than *right about everything*.

**P2 (mine) — the same wiring is missing from the pre-commit hook's advisory text.** The hook prints
`engine-reach --check` output when a hull file is staged, and that path is now correct; but the hook
decides *whether to print anything at all* by its own staged-file test. A staged seed record with no
staged hull file may still print nothing. Not fixed here because it is the hook's logic rather than
this script's, and this piece was scoped to the line the script prints.

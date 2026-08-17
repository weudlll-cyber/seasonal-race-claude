# DECLARED-HOLES-1 — two holes closed, one declared permanent with evidence

**Branch:** `fix/declared-holes`, off master `249d81e8`. **No product file changed.** Two guards,
one shared test file, no routing library change.

---

## THE TALLY

| hole | verdict |
| --- | --- |
| `check-measured-stamps` — a **test-only edit** trips a production stamp | **CLOSED** |
| `check-doc-links` + `check-measured-stamps` — repo-root `*.md` **scanned but not routed** | **CLOSED** (both guards) |
| `check-fallback-agreement` — **object-literal fallbacks** invisible | **DECLARED PERMANENT**, with the evidence |
| `check-index` — its own holes | closed yesterday by INDEX-COVERAGE-1 |

**Three holes examined, two closed, one declared with a reason and a measurement behind it.**

---

## CLOSED 1 — the staged test file that blocked a commit

The guard has excluded `*.test.*` from its committed-history query since VERIFY-COST-3, for a reason
written in the source: *a measurement script imports the code it measures, never that code's tests.*

**`stagedUnder()` never got the same treatment** — and that is the `--staged` form, the **pre-commit
position, the one that actually blocks a commit**. So the exclusion existed exactly where it was
cheap and was missing exactly where it hurt.

Not hypothetical: on 2026-08-18 staging `client/src/modules/camera/framingConfig.test.js` blocked a
commit with *"the tracking-lag stamp will be STALE the moment this commit lands"*, and the answer was
a deliberate re-stamp that proved nothing. **A stamp re-pointed to silence a guard is a stamp that
means nothing** — which is the whole mechanism this guard exists to protect.

One argument added to one `git diff --cached` call.

### Proved in both directions, against the real tree

| sabotage | expected | result |
| --- | --- | --- |
| stage `camera/framingConfig.**test**.js` | must NOT block | **exit 0** — reported as PENDING only |
| stage `camera/framingConfig.js` (production) | must STILL block | **FAIL: … will be STALE the moment this commit lands** |

The second is the one that matters: the fix narrows the guard without blunting it.

---

## CLOSED 2 — two guards that scanned the repo root and did not route on it

Both declare they cover *"docs/ + repo-root `*.md`"*. Both routed on `dirs` alone, and **`dirs`
matches by PREFIX — the repo root is the prefix of every path in the tree**, so it cannot be
expressed there without selecting everything.

They now name the tracked root documents in `files`. Proved by running it: appending one blank line
to `README.md` selects **both** guards, where before it selected only the three declared always-on.

```
check-doc-links        2 changed (README.md, …)
check-measured-stamps  2 changed (README.md, …)
```

### The list is a hand-maintained copy of something git already knows, so a test keeps it honest

A named list closes today's hole and opens tomorrow's: add `AGENTS.md` at the root and it is
unrouted again, silently. So `scripts/verify.test.mjs` now asserts that **every tracked root `*.md`
is matched by both guards**.

**WHAT BREAKS IF THAT TEST IS DELETED:** a new repo-root document becomes silently unrouted — the
exact hole this closed, restored the first time somebody adds one. Proved by sabotage: dropping
`CLAUDE.md` from one guard's `files` fails the test with
`check-doc-links scans the repo-root living docs, so it must ROUTE on CLAUDE.md`.

**R13 was applied rather than skipped:** this is a rule inside `verify.test.mjs`, which already reads
every declaration, not a new guard script.

---

## DECLARED PERMANENT — object-literal fallbacks, and what the hand search found

`NULLISH` matches a scalar or a `SCREAMING_CASE` name, so `?? { start: 0.4, end: 0.7 }` is a mirror
the guard has never counted.

**Closing it means teaching `literal()` to parse an object and compare structurally — a change to the
resolution engine, which must be proved in both directions.** Against that: the only class it would
surface is already known and already exempt. So it is declared, not closed — and the declaration now
carries the measurement instead of an abstraction.

**The hand search found FOUR copies of `b2AttackProgress`, not two.** MIRROR-CENSUS-1 converted the
two it could see; **two are still live in `heroCurveGenerator.js`** — the `GENERATOR_CONFIG` entry at
line 89 and the `?? { start: 0.4, end: 0.7 }` at the cast site, line 225. Both sit inside the module
whose header declares its literals a deliberate direct-call default set, so they are consistent with
a written decision — but MIRROR-CENSUS-1 reported "two" and the true number was four. **That is what
an uncounted class costs: not a wrong fix, a wrong count.**

**Every other `?? {}` in the tree is an empty-object guard** on a key with no default — `.data ?? {}`,
`.diff ?? {}` — which is not a mirror at all. Checked, so the declaration is not guessing at its own
size.

---

## VERIFICATION

**No fingerprint is owed**, by closure walk: `scripts/` and `scripts/lib/` are inside none of the
three instruments (36, 36, 55). No product file is in the diff.

All four guards green on the real tree; `verify.test.mjs` **44 tests**, `check-index.test.mjs` 9,
`check-measured-stamps` 2 stamps / 0 stale, `check-fallback-agreement` 14 disagree / 0 new / 0 stale.

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `scripts/check-measured-stamps.mjs` | `TEST_FILE_EXCLUDE` applied to `stagedUnder`; `files` gains the root docs; two blind entries removed as CLOSED, one rewritten |
| `scripts/check-doc-links.mjs` | `files` gains the root docs; blind entry rewritten |
| `scripts/check-fallback-agreement.mjs` | blind entry rewritten with the four-copy finding |
| `scripts/verify.test.mjs` | +1 test, +`fileURLToPath` import |

Tests added: 1. Tests deleted: 0. Tests re-blessed: 0.

### Noticed but left

- **`heroCurveGenerator.js`'s two live `b2AttackProgress` copies** are now named in the guard's blind
  list and on the owner's sheet. They agree with the default today.
- **The `--staged` exclusion inherits the same limit as the committed one**: a measurement that reads
  a test file as a fixture must name that file directly in `depends=` rather than the directory. No
  script does that today; the guard says so in both places now.

---

## PROPOSALS

### Proposal A — count the object-literal mirrors before deciding whether to parse them

The blind entry is now backed by one hand search that found four copies where the last report said
two. **Before spending the resolution-engine change, run the cheap version:** a throwaway grep-based
count of `?? {` sites whose key has an object default, printed once. If the answer is still "four,
all in one module with a written decision", the hole stays declared and nobody spends the risk. If it
is twenty across five modules, that is the argument for doing the work properly.

**Why this order:** the expensive fix is only worth it if the class is bigger than the exception, and
right now nobody knows which.

### Proposal B — make `files` unnecessary by giving routing a root-glob

Both closures here worked around the same limitation: `dirs` is a prefix match, so "the repo root,
but not everything under it" is inexpressible. Two guards now carry a hand-maintained list plus a
test to keep it honest — which is a workaround with a guard on it, not a fix.

**A `rootFiles: true` flag in `scripts/lib/routing.mjs`** — match `*.md` with no `/` — would remove
both lists and the test that watches them. It touches the shared selector every guard runs through,
which is why it is a proposal and not tonight's work: a mistake there silently changes which guards
run, and that is the one failure mode this whole sequence has been about.

# BUILD-PILL-TRUTH — the watch that never fired

**Branch:** `feat/build-pill-truth`, off master `be4202c8`. **Not merged, not minted.**
Dev-server only; no engine file, no default, no fingerprint.

---

## WHAT I FOUND, and it is worse than a race condition

**`server.watcher.add(['.git/HEAD', '.git/index'])` has never fired. Not once.**

Vite's dev watcher is configured with `ignored: ['**/.git/**', …]`, and chokidar applies `ignored`
to paths added later exactly as it does to the initial globs. **Adding a file inside an ignored
directory adds nothing.** The plugin's header stated those two watches were what made a commit or a
branch switch visible; they were decoration.

**It looked like it worked**, because a branch switch normally rewrites source files and Vite's own
watcher reports those. The reload arrived — for a completely different reason than the one written
down. So the mechanism was correct exactly when it was not needed, and absent exactly when it was.

---

## THE REPRODUCTION, before any fix

### Attempt 1 — the obvious one, and it failed to reproduce

Switch between two branches with very different trees, watch the HMR socket:

```
--- git checkout feat/mirrors-by-reference ---
events: full-reload@2517ms, update@2527ms, …24 events
FULL-RELOAD RECEIVED
```

It works. **This is why the bug survived**: the everyday case is fine.

### Attempt 2 — the case with NO file churn

Switch between two branches pointing at the SAME commit (`feat/build-pill-truth` and `master` were
both at `be4202c8`), so the working tree does not change and only `.git/HEAD` moves:

```
--- git checkout master ---
events during+after switch: 0
NO FULL-RELOAD  <<< the badge would stay stale
```

**Zero events.** Not a throttled event, not a late one — the watcher never saw `.git/HEAD` at all.

### And the served value really does go stale

An HTTP fetch of the virtual module re-runs `load()`, so it always looks right — that is a trap, and
it is why the first attempt at an instrument proved nothing. What a browser holds is the module it
was last given, which only changes after an invalidation. Populating the cache first shows it:

```
fetch 1 (populates the cache):        be4202c8 feat/build-pill-truth
git now:                              be4202c8 master
fetch 2 after same-commit switch:     be4202c8 feat/build-pill-truth   <<< STALE
```

**Which step did not happen: the watcher never delivered an event, so `recheck()` never ran, so the
module was never invalidated and no reload was ever sent.** Everything downstream was correct.

### The two real-world shapes of this

- **A branch switch whose tree happens not to change** what the running server has loaded.
- **A COMMIT.** It moves `HEAD` and `index` and touches no working file — so committing leaves the
  badge naming the previous commit until something else happens to change a file.

---

## THE FIX, both halves

### 1. The served value follows a branch switch

The two files are **polled** rather than watched — a 500 ms `statSync` of each, and `readBuildInfo()`
runs only when a mtime actually moved. Two stat calls a second are not measurable; re-running
`git status --porcelain` a second would be, on this repo.

```
BEFORE   git checkout master → events: 0            → served stays feat/build-pill-truth
AFTER    git checkout master → full-reload@640ms    → served becomes master
```

**The poll BYPASSES `recheck()`'s throttle, and it has to.** That throttle is leading-edge with no
trailing call: inside a burst only the first event is served and the rest are dropped for good. A
branch switch *is* a burst, so the poll's call would land in the middle of one and be dropped — and
nothing would call again, because a mtime only changes once. This was a second latent bug sitting
behind the first, and it would have made the fix work only when the fix was not needed.

### 2. The terminal line stops vouching for a commit it no longer serves

`start-up: serving build X` was printed once and never corrected, so a terminal left open across two
switches asserted a commit the server had stopped serving hours before. Every identity CHANGE is now
announced, so the terminal is a record instead of a snapshot:

```
[ra-build] start-up: serving build be4202c8 · feat/build-pill-truth +dirty
[ra-build] changed:  serving build be4202c8 · master +dirty
[ra-build] changed:  serving build be4202c8 · feat/build-pill-truth +dirty
```

---

## TESTS — what is testable, and what is not

**Testable, and the fix was shaped to be:** `makeMtimePoll` is a pure function of an injected `stat`,
so everything that decides whether a switch is noticed can be tested without git, a server or a
clock. **7 tests**, including the two that matter — it reports the change exactly ONCE (the reason
the throttle bypass exists), and it does not fire on construction (a poll seeded with nulls would
force a reload every time the dev server starts).

**Not testable here, and I am not going to fake it:** that Vite's watcher ignores `.git`, and that a
full-reload reaches a browser. That needs a running server, a real checkout and an HMR socket. It was
proved that way — the transcripts above are the evidence — and a unit test with a mocked watcher
would only assert that my mock matches my belief about chokidar, which is precisely the belief that
was wrong. Said in the test file's header rather than left as a gap.

33 tests pass across the four build-identity test files.

---

## SOURCE HYGIENE

| file | before → after | +/− | what |
|---|---|---|---|
| `client/vite-plugin-ra-build.js` | 219 → 297 | +82 −4 | `makeMtimePoll` + `mtimeOf` + `GIT_POLL_MS`; the dead `watcher.add` replaced by the poll; `recheck(force)`; the identity-change log line; header corrected |
| `client/src/modules/buildPillPoll.test.js` | — → 84 | new | 7 tests |

`engine-reach --check`: result in the reply — a Vite plugin cannot reach the race.

### Noticed but left

- **The watcher hooks stay.** The poll alone would be enough, but the watcher is still the faster
  signal when source files do change, and `recheck` is idempotent — both firing costs one compare.
- **`GIT_POLL_MS` is not UI-configurable**, which is a deliberate exception to the project principle:
  it is dev-server plumbing that never reaches a shipped build, and a setting nobody would ever move
  is worse than a constant with a reason at it.
- **The same blind spot may exist elsewhere.** Anything that calls `server.watcher.add()` on a path
  under `.git`, `node_modules` or `dist` is silently a no-op. This plugin was the only caller I
  found, but the pattern is worth remembering: **a watcher that accepts a path it will never report
  on is an instrument that cannot fail loudly.**

# INSTRUMENT-FAILS-LOUD-1 — fifteen minutes of silence becomes 1.7 seconds and a sentence, and the class turns out to be three

> **The incident.** The browser sweep's first run hung for **fifteen minutes** with `client/dist-sweep`
> empty and nothing on its app port. The build it spawns ran with `stdio: "ignore"`, so a build that
> produced nothing left **no trace at all**. By hand the same build succeeds in 873 ms.
>
> **Fixed.** The build's output is live on the console, and an empty or failed build **stops the run**
> naming what was expected and what was found. Measured: **1.7 s** instead of fifteen minutes.
>
> ★ **The old promise is shown to hang, not argued to** — §3. And **three faults were in those four
> lines**, any one of which is enough on its own.
>
> ★ **The class, one level up, is SMALLER than it looks and its worst member was not the one I was
> sent for** — §4.

---

## 1. WHAT WAS ACTUALLY WRONG — THREE FAULTS IN FOUR LINES

```js
const build = spawn("npx", ["vite", "build", "--outDir", "dist-sweep"], { …, stdio: "ignore" });
await new Promise((res, rej) => {
  build.on("exit", (c) => (c === 0 ? res() : rej(new Error(`the sweep build exited ${c}`))));
});
```

| | the fault | on its own it means |
| --- | --- | --- |
| 1 | `stdio: "ignore"` | a build that printed an error printed it into a void. **A failure and a slow success look identical from outside.** |
| 2 | `exit` is the **only** listener | a child that fails to **start** emits `error`, and on that path may never emit `exit` — so **the promise can never settle**. There is no timeout above it, so "never" is literal. |
| 3 | nothing checks the build **produced** anything | exit 0 was taken as "the bundle is there", and the next step was a 60-second wait on a preview server with nothing to serve. |

**A HANG LOOKS LIKE PATIENCE.** That is why this is worth the lines: a run that fails in two seconds
costs two seconds; a run that hangs costs however long it takes a person to lose confidence in it,
which on 2026-09-03 was fifteen minutes of his evening.

---

## 2. ★ I COULD NOT REPRODUCE THE ORIGINAL HANG

Said plainly rather than dressed as a diagnosis: **the build succeeds here every time it is run.**
The symptom will not come back on demand, so there is no way to point at which of the three faults
fired that night.

**So the repair is of the CLASS — every way that spawn can fail silently — rather than of the
instance.** That is the only honest repair available when the symptom will not return, and it has the
useful property of not depending on my guess being right.

---

## 3. THE SABOTAGES — AND THE PROOF THE OLD CODE HANGS

Three ways the build can fail. Each **must** produce a message and an exit; none may produce a wait.

| sabotage | before | after |
| --- | --- | --- |
| **A — exits 0, writes nothing** *(the state on the night it was filed)* | 60 s wait on a preview server with nothing to serve, then an anonymous timeout | **1.7 s**, naming the expected path and that the directory does not exist |
| **B — fails and prints why** | `the sweep build exited 1` and nothing else | **1.6 s**, with the build's own error text quoted back |
| **C — cannot be STARTED at all** | **the promise never settles** | **1.5 s**, `the sweep build could not be started: … ENOENT` |

Sabotage A's message, verbatim, because naming what was found is the half that was missing:

    Error: the sweep build exited 0 but produced no bundle.
      expected: …\client\dist-sweep\index.html
      found:    …\client\dist-sweep does not exist
      (the sweep build said nothing at all, which is itself the finding)

**★ AND THE OLD PROMISE IS DEMONSTRATED TO HANG.** Master's promise was extracted verbatim and run
against a child that cannot start:

    STILL WAITING after 8.0 s — the promise never settles, and there is no timeout above it

That is fault 2, reproduced on demand. It is not the same as proving it was what happened that night
— see §2 — but it does prove the mechanism exists.

---

## 4. ★ THE CLASS, ONE LEVEL UP — AND THE ONE IT TURNED UP THAT I WAS NOT SENT FOR

The question was: how many other instruments in `scripts/` spawn a child with its output discarded,
or wait on a condition with no timeout? **Every child process in `scripts/` was enumerated, not
sampled.**

| | what it is | verdict |
| --- | --- | --- |
| **`viewer-invariants.mjs` × 3** — build, API, preview | the only **asynchronous** spawns in the tree with discarded output | **FIXED.** Output captured on all three; the build's is echoed live |
| **`verify.mjs`** — the format step | `stdio: "ignore"` on `execFileSync`, and the catch prints *"format: FAILED"* and nothing else | **FIXED.** The same fault one severity down: it fails rather than hangs, but **anonymously** — it threw away the one thing the operator needs, which file prettier choked on. Captured, printed on the failure path only, so a passing run is exactly as quiet as before |
| **`check-tags.mjs` × 2** — `git ls-remote --tags/--heads origin` | **the only two children in `scripts/` that touch the NETWORK** | **FIXED — and this is the one I was not sent for.** `execSync` has **no default timeout**, and git will sit on a credential prompt or a dead connection forever. A gating gu*ard that can block indefinitely is the same defect as the build, arrived at from the other direction. Bounded at 45 s; the existing catch already fails loudly (Lesson 187) |
| **`scripts/diag/*-run.mjs` × 5** | async spawns, but with `["ignore","pipe","pipe"]` — they capture stderr and report the exit code | **REPORTED, NOT FIXED.** They have no `error` handler, but Node emits `close` after `error`, so they **terminate** — reporting `exit=null` rather than hanging. Adding a handler would improve the message, not remove a hang, and these are diagnostic one-offs rather than gating instruments |
| **everything else** — ~14 sites across `check-*`, `engine-reach`, `routing`, `prove-changed` | **synchronous** (`execSync` / `execFileSync` / `spawnSync`) | **NOT MEMBERS.** A synchronous child cannot hang on a promise that never settles; it returns, throws, or blocks the run visibly. All are local `git` or `node` calls that can only wait on the disk. `routing.mjs` already carries an explicit 20 s timeout |

**So the class is three real members and one honest near-miss, not the dozen the grep suggests** — and
the discriminator is not "ignored stdio", which is what the brief's wording points at. It is
**asynchronous, or reaching the network.** Those are the two ways a child can wait forever.

### The loops

The other half of the question — waits with no timeout — has a cleaner answer. Every `for(;;)` and
`while(true)` in `scripts/` was read: they are **work-queue drains** (`verify.mjs`, `exp-gate-retune`,
`exp-speed-candidates`, the sweep's own worker) or a **Bresenham line** (`sim-race-visual`). All
terminate by construction. The sweep's in-page race loop already carries a stall detector — 200 ticks
of an unchanging frame counter — and both `wait()` helpers are bounded at 60 s.

---

## 5. ★ TWO DEFECTS IN MY OWN FIX, BOTH FOUND BY RUNNING IT

Worth recording because neither would have been found by reading the diff, and the first one shipped
a *crash* into a repair for a *hang*:

1. **`spawn` was not in scope.** The new `runBuild` sits at module level; `spawn` is imported
   dynamically **inside** `startStack`. Sabotage A's first run died with `ReferenceError: spawn is not
   defined` — a repair that turns a hang into an immediate crash technically satisfies the brief and
   is obviously not what was asked. It is passed in now.
2. **A failed build leaked the API server.** Every failure in `startStack` happens with the API
   **already running**, and the original code had no teardown on that path. So a loud failure would
   leave a node process holding port 4361, and the **next** run would fail at the login with a timeout
   that reads like a product defect — which is, word for word, the failure this file's own teardown
   comment already describes. **An instrument that fails loudly and then poisons the next attempt has
   only moved the confusion.** Both children are now killed on every boot-path failure, through the
   same `kill()` the teardown uses, and the account-setup step was moved inside the guard because it
   can refuse too.

---

## 6. WHAT WAS RUN

| | |
| --- | --- |
| three sabotages | each fails in **under 2 s** with a named cause; before, one hung and two were anonymous |
| the old promise, extracted from `master` | **never settles** |
| the happy path | a full `--tracks=garden-path --seeds=9` race through the fixed harness, build and both servers, end to end |
| `check-tags.mjs` | 124 origin tags, Rule B clean, 1.4 s — unchanged behaviour with the timeout in place |

---

## 7. WHAT THIS DOES NOT COVER

- **It does not explain the original fifteen minutes** (§2). It makes every path that could have
  caused them impossible to repeat silently.
- **The three-minute build timeout is a patience limit, not a performance budget.** The build takes
  ~1 s warm and ~40 s cold on this machine. `--build-timeout-ms=` overrides it.
- **The five diag runners are still without an `error` handler** (§4). They terminate; their message
  on a failed spawn reads `exit=null`.
- **Nothing here watches the harness's own wall clock.** A run that is genuinely slow rather than
  stuck still looks the same from outside — except that now it is printing build output while it
  happens.

# GUARD-CONTEXT-RACE-1 — two guards share `client/dist`, and nothing knew it

Night chain 2026-09-08, piece 1 · branch `night/2026-09-07` · **nothing minted here** (piece 1 lands
MINT-CAMERA-1's already-decided camera mint, which is a separate commit).

---

## THE DEFECT, RE-VERIFIED BEFORE IT WAS FIXED

`check-image-starts` builds the server image passing `--build-context client=./client`, because
[`server/Dockerfile:68`](../../server/Dockerfile#L68) is `COPY --from=client dist/ ./client-dist/`.
`check-client-build` runs the vite build, whose first act is `emptyDir(client/dist)`. `verify` runs
up to 14 guards at once and nothing serialised them.

**Its root is a declaration that did not describe what the guard reads.**
`scripts/check-image-starts.mjs` derives `GUARD.dirs` from `copySources()`, which **skips every
`COPY --from=` line** — so the one path it reads outside the repository context was the one path it
never declared. Its own header said the client build was *"named separately below"*. It was not: it
was named as `CLIENT_CONTEXT_DIR`, a constant for the docker command line, which never reached the
declaration.

### ★ The window is ~0.3 s, and that is why it looked like flake

Measured from the guard's own build output:

```
#4 transferring context: 7.91kB 0.2s done
#6 [context client] transferring client: 3.15kB 0.1s done
```

BuildKit ingests the named context **at the start of the build**, not at the `COPY` step — step
12/13 is merely where the copy is *used*. Against a **warm** Docker cache the whole image build is
~5 s and the ingest closes before vite starts; against a **cold** one the build is 155–216 s but the
ingest is still only a few hundred milliseconds. So the collision needs `emptyDir` to fire inside a
sub-second window at the head of a cold build.

**Reproduced deterministically** by launching both guards simultaneously against a cold cache:

| method | result |
|---|---|
| both launched simultaneously, cold cache | **EPERM 2 of 2** |
| build guard looped every ~6 s through a cold image build | **failed on attempt 1 only** (t≈0–6 s), 25 later attempts passed |
| build guard alone, same placeheld `dist` present | **PASS 2.0 s** |

The third row is what overturned the first diagnosis of this failure (MINT-CAMERA-1 called it a
OneDrive placeholder EPERM and withdrew it): the placeholder is present in both arms, so it is not
what fails the guard.

---

## THE FIX — three parts, each with its reason

### 1 · The declaration says what the guard reads

`GUARD.dirs` gains the named build context. **Two attempts, and the first was wrong:**

- `client/dist/` — chosen to avoid routing a cold image build onto every client edit. **`verify`
  REFUSED it** (exit 2, not a guard failure): *"a declaration that names something gone is a guard
  whose coverage has silently shrunk — which looks exactly like coverage."* `client/dist` is
  gitignored and absent whenever nobody has built. The refusal is correct.
- `client/` with `notDirs: ['client/e2e/']` — the honest declaration. The exclusion is not
  cosmetic: `verify.test.mjs`'s *"NOT ROUTED: the e2e suite is NIGHT WORK"* failed when `client/`
  was declared whole, because Playwright specs are never bundled and cannot reach the image.
  `check-client-build` already excludes `client/e2e/` for the same reason.

**What it costs:** routing now selects a ~7 s warm / up to 216 s cold image build on any change under
`client/` outside `e2e/`. That is the honest cost of the honest declaration.

### 2 · `check-client-build` runs alone

`exclusive: true` in `commandFor`. **This guard and not `check-image-starts`**, for two reasons, the
second better than the first: it is **cheaper to serialise** (measured 1.9–2.2 s against the image
guard's 202–216 s cold), and exclusive tasks run to completion **before** the parallel queue, so the
guard that WRITES `client/dist` now always precedes the guard that READS it.

### 3 · The consumer pulls in its producer

Routing could select `check-image-starts` without `check-client-build`; with `client/dist` absent the
image build then fails `"/dist": not found` through no fault of the diff. That dependency is
**pre-existing** — it predates this block — but it made "green from a tree with no build" impossible.
`plan()` now pulls the producer in and **says so in the guard's own reason line**, per the
constraint at the head of `verify.mjs` that nothing is selected or skipped silently.

**Neither guard is weakened.** Both still build; the image guard still starts a real container with
no bind mounts and still fails on its own subject. Only *when* they run changed.

---

## THE PROOF — and ★ THE SABOTAGE DID NOT REPRODUCE

`verify` and `verify -- --premerge`, three times each, from `dist` present / absent / fresh, with the
Docker build cache pruned before every run so the image build is COLD — the only condition in which
the race can bite. A warm-cache pass proves nothing, which is the trap that produced the first wrong
diagnosis.

| mode | state | exit | result | wall | check-client-build | check-image-starts |
|---|---|---|---|---|---|---|
| plain | present | 0 | 8 PASS / 0 FAIL | 159.7 s | PASS 2.0 s (ran alone) | PASS 157.7 s |
| plain | absent | 1 | 7 PASS / **1 FAIL** | 64.9 s | PASS 1.9 s (ran alone) | **FAIL 24.0 s** |
| plain | fresh | 0 | 8 PASS / 0 FAIL | 159.4 s | PASS 2.0 s (ran alone) | PASS 157.4 s |
| premerge | present | 0 | **31 PASS / 0 FAIL** | 621.8 s | PASS 1.9 s (ran alone) | PASS 209.2 s |
| premerge | absent | 0 | **31 PASS / 0 FAIL** | 617.9 s | PASS 1.9 s (ran alone) | PASS 202.4 s |
| premerge | fresh | 0 | **31 PASS / 0 FAIL** | 622.7 s | PASS 2.1 s (ran alone) | PASS 205.6 s |

**All three `--premerge` runs — the gate the merge depends on — are green from all three states.**

### ★ THE SABOTAGE, REPORTED AGAINST MYSELF

The brief asked for one sabotage run. I ran **four**, because the first passed:

```
sabotage run 1: exit=0  PASS check-client-build 15.1s  0 EPERM lines
sabotage run 2: exit=0  PASS check-client-build 15.8s  0 EPERM lines
sabotage run 3: exit=0  PASS check-client-build 14.9s  0 EPERM lines
sabotage run 4: exit=0  PASS check-client-build 13.3s  0 EPERM lines
```

With `exclusive` reverted to `false` and the Docker cache pruned each time, **the race did not
return in 4 of 4 runs.**

**What that does and does not license me to say.** The MECHANISM is real and reproducible on demand
(2 of 2 by simultaneous launch). What is NOT demonstrated is that the exclusivity is what fixed the
originally observed failures. Under `verify`'s own scheduler both guards are spawned into the same
queue at t≈0, but `check-client-build` spawns node, which spawns vite, and that startup latency
usually carries `emptyDir` past a sub-second ingest window.

★ **So the original failure RATE is not fully explained.** MINT-CAMERA-1 recorded
`check-client-build` failing in **3 of 5** runs, which is far too often for a ~0.3 s window. One
condition present then and absent now is that `client/dist` was a stale, OneDrive-placeheld tree
carried over from an earlier session, repeatedly deleted and rebuilt since. **I could not
reconstruct that state**, so whether it contributed is open.

**The fix is kept anyway**, and the reason is stated rather than assumed: it closes a proven
mechanism, it costs 2 s, and the declaration and pull-in are correct on their own terms independent
of the race. It is defence against something real, not a demonstrated repair of the observed rate.

---

## ★ A SECOND, DIFFERENT DEFECT — NAMED, NOT FIXED

The one red cell above is **not** the EPERM race:

```
#5 ERROR: invalid file request dist/assets/racers/beetle.png
ERROR: failed to build: failed to solve: invalid file request dist/assets/racers/beetle.png
```

(and `dist/assets/racers/CREDITS.md` on the previous run). BuildKit rejects a file inside a
`client/dist` written seconds earlier. **My ordering fix created this adjacency** — the consumer now
runs immediately after the producer, where before they overlapped.

Characterised rather than guessed: rebuild-then-ingest **passes in isolation**, both immediately and
after a 30 s settle. It appears only under the parallel guard load of a full run. `plain-absent` has
never been green — before this block it failed `"/dist": not found` instead.

**Not fixed**, deliberately: the remedy touches the image guard's docker invocation, which is past
"the smallest fix" and risks weakening the one guard that proves the package starts. It is the
owner's call.

---

## CHECKS

```
node scripts/engine-reach.mjs --check scripts/check-image-starts.mjs scripts/verify.mjs scripts/verify.test.mjs

ENGINE REACH: none of 3 path(s) carry a change that can reach the race engine.
  3 outside the hull (cannot reach the engine at all): scripts/check-image-starts.mjs,
  scripts/verify.mjs, scripts/verify.test.mjs
```

| | |
|---|---|
| `script-suite` | **458 pass, 0 fail** |
| `verify.test.mjs` routing tests | **51 pass, 0 fail** |
| `npm run verify -- --premerge` | **31 PASS / 0 FAIL**, all three `dist` states |

`verify.test.mjs` was edited, and only to follow behaviour the change makes true — in the voice of
the test's own rule: *"a set that stopped growing when a guard was added would be asserting that the
guard is not wired."*

## SOURCE HYGIENE

Three files changed: `scripts/check-image-starts.mjs`, `scripts/verify.mjs`, `scripts/verify.test.mjs`.
No engine, camera or drawing code. No config key, no default. The sabotage edit was made from a kept
copy and restored byte-for-byte (`SABOTAGE` marker count 0).

**Noticed and left, outside what this piece touched:** the `invalid file request` defect above, and
`check-image-starts` remaining un-wired in CI (its own `blind` list already says so).

`git stash` was not used. No scratch file entered the repository.
